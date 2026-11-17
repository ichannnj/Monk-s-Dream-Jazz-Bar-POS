/**
 * Unified Hardware Printer Driver
 * Communicates directly with USB/Serial thermal receipt printers and RJ11 cash drawers.
 * Isolates thermal printers from general USB devices (mice, keyboards, dongles).
 */

import { buildCashDrawerKickBytes } from './escposBuilder';
import {
  type SerialPortInfo,
  type BoundPrinterDevice,
  BRIDGE_URL,
  checkHardwareBridge,
  findUsbOutEndpoint,
  isPrinterDevice,
  matchesSavedPrinter,
} from './webPrinterTransport';

export * from './webPrinterTransport';

export class WebSerialPrinterService {
  private static BOUND_DEVICE_KEY = 'monks_bound_printer_device';

  private serialPort: any = null;
  private serialWriter: any = null;
  private usbDevice: any = null;
  private usbEndpointOut: number = 1;
  private usbInterfaceNumber: number = 0;
  private isConnecting: boolean = false;
  private baudRate: number = 9600;
  private connectionType: 'none' | 'bridge' | 'serial' | 'usb' = 'none';

  // Hotplug watchdog callbacks
  private onDisconnectListener: (() => void) | null = null;
  private onConnectListener: (() => void) | null = null;
  private hotplugAttached: boolean = false;

  public isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    return 'usb' in navigator || 'serial' in navigator;
  }

  public isConnected(): boolean {
    if (this.connectionType === 'bridge') return true;
    if (this.connectionType === 'usb') {
      return this.usbDevice !== null && this.usbDevice.opened === true;
    }
    if (this.connectionType === 'serial') {
      return this.serialPort !== null && this.serialWriter !== null;
    }
    return false;
  }

  public getBoundPrinter(): BoundPrinterDevice | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(WebSerialPrinterService.BOUND_DEVICE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public saveBoundPrinter(device: BoundPrinterDevice): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(WebSerialPrinterService.BOUND_DEVICE_KEY, JSON.stringify(device));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  public clearBoundPrinter(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(WebSerialPrinterService.BOUND_DEVICE_KEY);
    } catch {
      // Ignore
    }
  }

  public getPortInfo(): SerialPortInfo | null {
    if (this.connectionType === 'bridge') {
      return {
        usbVendorId: 0x0483,
        usbProductId: 0x070b,
        deviceName: 'Local Hardware Bridge (/dev/usb/lp0)',
        manufacturerName: "Monk's Dream Linux Daemon",
        type: 'bridge',
      };
    }
    if (this.connectionType === 'usb' && this.usbDevice) {
      return {
        usbVendorId: this.usbDevice.vendorId,
        usbProductId: this.usbDevice.productId,
        deviceName: this.usbDevice.productName || 'USB Thermal Printer',
        manufacturerName: this.usbDevice.manufacturerName,
        serialNumber: this.usbDevice.serialNumber,
        interfaceNumber: this.usbInterfaceNumber,
        endpointOut: this.usbEndpointOut,
        type: 'usb',
      };
    }
    if (
      this.connectionType === 'serial' &&
      this.serialPort &&
      typeof this.serialPort.getInfo === 'function'
    ) {
      const info = this.serialPort.getInfo();
      return {
        ...info,
        deviceName: 'Serial Thermal Printer',
        type: 'serial',
      };
    }
    return null;
  }

  public async checkBridge(): Promise<boolean> {
    return checkHardwareBridge();
  }

  /**
   * Set hotplug callbacks to reactively update station state when devices are plugged/unplugged
   */
  public setHotplugCallbacks(callbacks: {
    onDisconnect?: () => void;
    onConnect?: () => void;
  }): void {
    this.onDisconnectListener = callbacks.onDisconnect || null;
    this.onConnectListener = callbacks.onConnect || null;
    this.attachHotplugListeners();
  }

  private attachHotplugListeners(): void {
    if (this.hotplugAttached || typeof navigator === 'undefined') return;

    if ('usb' in navigator) {
      (navigator as any).usb.addEventListener('disconnect', this.handleUsbDisconnect);
      (navigator as any).usb.addEventListener('connect', this.handleUsbConnect);
    }

    if ('serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', this.handleSerialDisconnect);
      (navigator as any).serial.addEventListener('connect', this.handleSerialConnect);
    }

    this.hotplugAttached = true;
  }

  private handleUsbDisconnect = (event: any) => {
    const disconnectedDev = event.device;
    if (
      this.usbDevice &&
      disconnectedDev &&
      disconnectedDev.vendorId === this.usbDevice.vendorId &&
      disconnectedDev.productId === this.usbDevice.productId
    ) {
      console.warn(
        `[WebPrinter] Bound USB printer disconnected: ${disconnectedDev.productName || 'USB Device'}`
      );
      this.disconnect();
      if (this.onDisconnectListener) {
        this.onDisconnectListener();
      }
    }
  };

  private handleUsbConnect = (event: any) => {
    const connectedDev = event.device;
    const bound = this.getBoundPrinter();
    // Only auto-reconnect if connected device matches bound printer (ignore mice, keyboards, dongles)
    if (bound && bound.transport === 'usb' && matchesSavedPrinter(connectedDev, bound)) {
      console.info(
        `[WebPrinter] Bound USB printer re-attached: ${connectedDev.productName || 'Printer'}. Auto-connecting...`
      );
      this.autoConnect(this.baudRate).then((connected) => {
        if (connected && this.onConnectListener) {
          this.onConnectListener();
        }
      });
    }
  };

  private handleSerialDisconnect = () => {
    if (this.connectionType === 'serial') {
      console.warn('[WebPrinter] Serial printer disconnected');
      this.disconnect();
      if (this.onDisconnectListener) {
        this.onDisconnectListener();
      }
    }
  };

  private handleSerialConnect = () => {
    const bound = this.getBoundPrinter();
    if (bound && bound.transport === 'serial') {
      console.info('[WebPrinter] Serial printer re-attached. Auto-connecting...');
      this.autoConnect(this.baudRate).then((connected) => {
        if (connected && this.onConnectListener) {
          this.onConnectListener();
        }
      });
    }
  };

  /**
   * Silently reconnect to authorized devices, filtering for the bound printer
   */
  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (this.isConnected() || this.isConnecting) {
      return this.isConnected();
    }

    try {
      this.isConnecting = true;
      this.baudRate = baudRate;
      this.attachHotplugListeners();

      const bound = this.getBoundPrinter();

      // 1. Try WebUSB authorized devices
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const usbDevices = await (navigator as any).usb.getDevices();
          if (usbDevices.length > 0) {
            // Sort/filter: prioritize device matching bound printer or printer class
            let targetDevices: any[] = [];
            if (bound && bound.transport === 'usb') {
              const matched = usbDevices.filter((d: any) => matchesSavedPrinter(d, bound));
              if (matched.length > 0) {
                targetDevices = matched;
              }
            }

            if (targetDevices.length === 0) {
              // Fallback to devices recognized as printers
              targetDevices = usbDevices.filter((d: any) => isPrinterDevice(d));
            }

            // If still no filter matches, try devices sequentially
            const candidates = targetDevices.length > 0 ? targetDevices : usbDevices;
            for (const candidate of candidates) {
              try {
                await this.openUsbDevice(candidate);
                console.info(
                  `[WebPrinter] Silently reconnected to authorized USB device: ${candidate.productName || 'USB Printer'}`
                );
                return true;
              } catch (devErr) {
                console.warn(
                  `[WebPrinter] Candidate USB device ${candidate.productName || 'Device'} failed to open:`,
                  devErr
                );
              }
            }
          }
        } catch (err) {
          console.warn('[WebPrinter] WebUSB silent auto-connect failed:', err);
        }
      }

      // 2. Try WebSerial authorized ports
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        try {
          const serialPorts = await (navigator as any).serial.getPorts();
          if (serialPorts.length > 0) {
            for (const port of serialPorts) {
              try {
                await this.openSerialPort(port, baudRate);
                console.info('[WebPrinter] Silently reconnected to authorized Serial port');
                return true;
              } catch {
                // Try next
              }
            }
          }
        } catch {
          // Silent fallback
        }
      }

      // 3. Local bridge check
      const isBridgeEnabled =
        typeof window !== 'undefined' &&
        (localStorage.getItem('monks_enable_bridge_daemon') === 'true' ||
          window.location?.search?.includes('mode=printer'));

      if (isBridgeEnabled) {
        const bridgeConnected = await this.checkBridge();
        if (bridgeConnected) {
          this.connectionType = 'bridge';
          console.info('[WebPrinter] Connected via Local Hardware Bridge (/dev/usb/lp0)');
          return true;
        }
      }

      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Request pairing with a user prompt, supporting explicit transport choice
   */
  public async requestAndConnect(
    baudRate: number = 9600,
    preferredTransport: 'auto' | 'usb' | 'serial' = 'auto'
  ): Promise<boolean> {
    try {
      this.isConnecting = true;
      this.baudRate = baudRate;
      this.attachHotplugListeners();

      const isBridgeEnabled =
        typeof window !== 'undefined' &&
        (localStorage.getItem('monks_enable_bridge_daemon') === 'true' ||
          window.location?.search?.includes('mode=printer'));

      if (isBridgeEnabled && preferredTransport === 'auto') {
        const bridgeConnected = await this.checkBridge();
        if (bridgeConnected) {
          this.connectionType = 'bridge';
          return true;
        }
      }

      // Explicit Serial requested
      if (preferredTransport === 'serial') {
        if (typeof navigator !== 'undefined' && 'serial' in navigator) {
          const port = await (navigator as any).serial.requestPort();
          await this.openSerialPort(port, baudRate);
          return true;
        }
        throw new Error('WebSerial is not supported in this browser.');
      }

      // Explicit USB requested
      if (preferredTransport === 'usb') {
        if (typeof navigator !== 'undefined' && 'usb' in navigator) {
          const device = await (navigator as any).usb.requestDevice({ filters: [{}] });
          if (device) {
            await this.openUsbDevice(device);
            return true;
          }
        }
        throw new Error('WebUSB is not supported in this browser.');
      }

      // Auto mode: Try WebUSB first, fall back to WebSerial
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const device = await (navigator as any).usb.requestDevice({ filters: [{}] });
          if (device) {
            await this.openUsbDevice(device);
            return true;
          }
        } catch (usbErr: any) {
          if (usbErr.name === 'NotFoundError') {
            console.info('[WebPrinter] USB pairing cancelled by user');
            throw usbErr;
          }
          // If WebUSB fails with SecurityError or NetworkError, attempt WebSerial fallback if available
          if ('serial' in navigator) {
            console.warn(
              '[WebPrinter] WebUSB failed, attempting WebSerial fallback:',
              usbErr.message
            );
            const port = await (navigator as any).serial.requestPort();
            await this.openSerialPort(port, baudRate);
            return true;
          }
          throw usbErr;
        }
      } else if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await this.openSerialPort(port, baudRate);
        return true;
      } else {
        throw new Error(
          'WebUSB / WebSerial is not supported in this browser. Please use Chrome or Edge.'
        );
      }

      throw new Error('Printer hardware bridge or device not available.');
    } finally {
      this.isConnecting = false;
    }
  }

  private async openUsbDevice(device: any): Promise<void> {
    await this.disconnect();

    try {
      await device.open();
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('Access denied')) {
        throw new Error(
          `Access denied to USB device "${device.productName || 'Printer'}". Another program or OS driver may be using it.`,
          { cause: err }
        );
      }
      throw err;
    }

    if (device.configuration === null) {
      try {
        await device.selectConfiguration(1);
      } catch (err: any) {
        console.warn(
          '[WebPrinter] Could not select configuration 1, using active configuration:',
          err
        );
      }
    }

    const { endpointOut, interfaceNumber } = findUsbOutEndpoint(device);

    try {
      await device.claimInterface(interfaceNumber);
    } catch (claimErr: any) {
      console.warn(
        '[WebPrinter] Primary claimInterface failed, attempting device reset & retry:',
        claimErr
      );

      let retrySuccess = false;
      try {
        if (typeof device.reset === 'function') {
          await device.reset();
          await device.claimInterface(interfaceNumber);
          retrySuccess = true;
        }
      } catch (retryErr) {
        console.warn('[WebPrinter] Retry after reset failed:', retryErr);
      }

      if (!retrySuccess) {
        if (
          claimErr.name === 'NetworkError' ||
          claimErr.message?.includes('Unable to claim interface') ||
          claimErr.name === 'SecurityError'
        ) {
          throw new Error(
            `Unable to claim USB interface for "${device.productName || 'Printer'}". The OS kernel module (usblp) or another process is holding it. Run 'sudo bash scripts/fix-thermal-printer-permissions.sh' to release it permanently.`,
            { cause: claimErr }
          );
        }
        throw claimErr;
      }
    }

    this.usbDevice = device;
    this.usbEndpointOut = endpointOut;
    this.usbInterfaceNumber = interfaceNumber;
    this.connectionType = 'usb';

    // Persist hardware binding
    this.saveBoundPrinter({
      vendorId: device.vendorId,
      productId: device.productId,
      serialNumber: device.serialNumber,
      deviceName: device.productName || 'USB Thermal Printer',
      manufacturerName: device.manufacturerName,
      transport: 'usb',
    });

    console.info(
      `[WebPrinter] Connected to USB printer: ${device.productName || 'Device'} (VID: 0x${device.vendorId?.toString(16)}, PID: 0x${device.productId?.toString(16)}) on ep ${endpointOut} (interface ${interfaceNumber})`
    );
  }

  private async openSerialPort(port: any, baudRate: number): Promise<void> {
    await this.disconnect();
    this.baudRate = baudRate;
    await port.open({
      baudRate: this.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
    });
    this.serialPort = port;
    this.serialWriter = port.writable.getWriter();
    this.connectionType = 'serial';

    const info = typeof port.getInfo === 'function' ? port.getInfo() : {};
    this.saveBoundPrinter({
      vendorId: info.usbVendorId,
      productId: info.usbProductId,
      deviceName: 'Serial Thermal Printer',
      transport: 'serial',
    });
  }

  public async writeBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected()) {
      const bridgeConnected = await this.checkBridge();
      if (bridgeConnected) {
        this.connectionType = 'bridge';
      } else {
        throw new Error('Thermal printer is not connected.');
      }
    }

    if (this.connectionType === 'bridge') {
      const res = await fetch(`${BRIDGE_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes as any,
      });
      const data = await res.json();
      return data.success === true;
    }

    if (this.connectionType === 'usb' && this.usbDevice) {
      await this.usbDevice.transferOut(this.usbEndpointOut, bytes);
      return true;
    }

    if (this.connectionType === 'serial' && this.serialWriter) {
      await this.serialWriter.write(bytes);
      return true;
    }

    return false;
  }

  public async kickCashDrawer(): Promise<boolean> {
    if (this.connectionType === 'bridge') {
      try {
        const res = await fetch(`${BRIDGE_URL}/kick`, { method: 'POST' });
        const data = await res.json();
        return data.success === true;
      } catch {
        // Silent fallback
      }
    }
    const kickBytes = buildCashDrawerKickBytes();
    return this.writeBytes(kickBytes);
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.serialWriter) {
        try {
          this.serialWriter.releaseLock();
        } catch {
          // Ignore
        }
        this.serialWriter = null;
      }
      if (this.serialPort) {
        try {
          await this.serialPort.close();
        } catch {
          // Ignore
        }
        this.serialPort = null;
      }
      if (this.usbDevice) {
        try {
          await this.usbDevice.close();
        } catch {
          // Ignore
        }
        this.usbDevice = null;
      }
    } finally {
      this.connectionType = 'none';
    }
  }

  public async forgetDevice(): Promise<void> {
    await this.disconnect();
    this.clearBoundPrinter();
    console.info('[WebPrinter] Printer device pairing forgotten');
  }
}

export const webSerialPrinter = new WebSerialPrinterService();
