/**
 * Unified Hardware Printer Driver
 * Communicates directly with USB/Serial thermal receipt printers and RJ11 cash drawers.
 *
 * Hierarchy:
 * 1. Local Hardware Bridge (http://127.0.0.1:12111) - Direct zero-prompt access to Linux /dev/usb/lp0
 * 2. WebUSB (navigator.usb) - for unlocked browser USB devices
 * 3. Web Serial (navigator.serial) - for virtual COM ports
 */

import { buildCashDrawerKickBytes } from './escposBuilder';

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
  type?: 'bridge' | 'usb' | 'serial';
  deviceName?: string;
  manufacturerName?: string;
  serialNumber?: string;
}

const BRIDGE_URL = 'http://127.0.0.1:12111';

export class WebSerialPrinterService {
  private serialPort: any = null;
  private serialWriter: any = null;
  private usbDevice: any = null;
  private usbEndpointOut: number = 1;
  private isConnecting: boolean = false;
  private baudRate: number = 9600;
  private connectionType: 'none' | 'bridge' | 'serial' | 'usb' = 'none';

  /**
   * Check if any driver mode is supported in the current environment
   */
  public isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    return 'usb' in navigator || 'serial' in navigator;
  }

  /**
   * Check if the printer port is currently opened and ready for writing
   */
  public isConnected(): boolean {
    if (this.connectionType === 'bridge') {
      return true;
    }
    if (this.connectionType === 'usb') {
      return this.usbDevice !== null && this.usbDevice.opened === true;
    }
    if (this.connectionType === 'serial') {
      return this.serialPort !== null && this.serialWriter !== null;
    }
    return false;
  }

  /**
   * Get USB Vendor/Product information for the active port if available
   */
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

  /**
   * Check if the local OS hardware bridge is reachable
   */
  public async checkBridge(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${BRIDGE_URL}/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return data.status === 'CONNECTED';
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Attempt silent connection to previously authorized device
   */
  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (this.isConnected() || this.isConnecting) {
      return this.isConnected();
    }

    try {
      this.isConnecting = true;

      // 1. Try WebUSB with previously authorized devices first (zero-prompt, no network errors)
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const usbDevices = await (navigator as any).usb.getDevices();
          if (usbDevices.length > 0) {
            await this.openUsbDevice(usbDevices[0]);
            console.info(
              `[WebPrinter] Silently reconnected to authorized USB device: ${usbDevices[0].productName || 'USB Printer'}`
            );
            return true;
          }
        } catch (err) {
          console.warn('[WebPrinter] WebUSB silent auto-connect failed:', err);
        }
      }

      // 2. Fallback to Web Serial if previously paired
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        try {
          const serialPorts = await (navigator as any).serial.getPorts();
          if (serialPorts.length > 0) {
            await this.openSerialPort(serialPorts[0], baudRate);
            return true;
          }
        } catch {
          // Silent fallback if Serial unavailable
        }
      }

      // 3. Check local hardware bridge ONLY if explicitly enabled or on hardware station screen
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
   * Connect to USB device via browser chooser (wildcard filter so ANY device can be selected)
   */
  public async requestAndConnect(baudRate: number = 9600): Promise<boolean> {
    try {
      this.isConnecting = true;

      // 1. Check local hardware bridge ONLY if explicitly enabled
      const isBridgeEnabled =
        typeof window !== 'undefined' &&
        (localStorage.getItem('monks_enable_bridge_daemon') === 'true' ||
          window.location?.search?.includes('mode=printer'));

      if (isBridgeEnabled) {
        const bridgeConnected = await this.checkBridge();
        if (bridgeConnected) {
          this.connectionType = 'bridge';
          return true;
        }
      }

      // 2. Primary: Direct WebUSB Device Chooser
      // Filters with empty object [{}] matches ANY connected USB device without port prompts
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const device = await (navigator as any).usb.requestDevice({ filters: [{}] });
          if (device) {
            await this.openUsbDevice(device);
            return true;
          }
        } catch (usbErr: any) {
          if (usbErr.name === 'NotFoundError') {
            // User cancelled device chooser - do NOT fall into serial prompt
            console.info('[WebPrinter] USB pairing cancelled by user');
            throw usbErr;
          }
          console.warn('[WebPrinter] WebUSB error:', usbErr);
          throw usbErr;
        }
      } else if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        // Fallback for browsers that only support Web Serial
        const port = await (navigator as any).serial.requestPort();
        await this.openSerialPort(port, baudRate);
        return true;
      } else {
        throw new Error('WebUSB is not supported in this browser. Please use Chrome or Edge.');
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

    let targetInterfaceNumber = 0;
    let endpointOut = 1;
    let foundEndpoint = false;

    // Scan all interfaces and alternates to find an OUT bulk/interrupt endpoint
    const interfaces = device.configuration?.interfaces || [];
    for (const iface of interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out') {
            endpointOut = ep.endpointNumber;
            targetInterfaceNumber = iface.interfaceNumber;
            foundEndpoint = true;
            if (ep.type === 'bulk') {
              break;
            }
          }
        }
        if (foundEndpoint) break;
      }
      if (foundEndpoint) break;
    }

    try {
      await device.claimInterface(targetInterfaceNumber);
    } catch (claimErr: any) {
      console.warn(
        '[WebPrinter] Primary claimInterface failed, attempting device reset & retry:',
        claimErr
      );

      // If the interface was locked by previous session, try resetting device and retrying
      let retrySuccess = false;
      try {
        if (typeof device.reset === 'function') {
          await device.reset();
          await device.claimInterface(targetInterfaceNumber);
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
    this.connectionType = 'usb';
    console.info(
      `[WebPrinter] Connected to USB printer: ${device.productName || 'Device'} (VID: 0x${device.vendorId?.toString(16)}, PID: 0x${device.productId?.toString(16)}) on ep ${endpointOut}`
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
  }

  public async writeBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected()) {
      // Try fast auto-connect via bridge before failing
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
        // Silent fallback to local byte pulse
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
          // Ignore release error
        }
        this.serialWriter = null;
      }
      if (this.serialPort) {
        try {
          await this.serialPort.close();
        } catch {
          // Ignore close error
        }
        this.serialPort = null;
      }
      if (this.usbDevice) {
        try {
          await this.usbDevice.close();
        } catch {
          // Ignore close error
        }
        this.usbDevice = null;
      }
    } finally {
      this.connectionType = 'none';
    }
  }
}

export const webSerialPrinter = new WebSerialPrinterService();
