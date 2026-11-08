/**
 * Unified Hardware Printer Driver
 * Communicates directly with USB/Serial thermal receipt printers and RJ11 cash drawers.
 */

import { buildCashDrawerKickBytes } from './escposBuilder';
import {
  type SerialPortInfo,
  BRIDGE_URL,
  checkHardwareBridge,
  findUsbOutEndpoint,
} from './webPrinterTransport';

export * from './webPrinterTransport';

export class WebSerialPrinterService {
  private serialPort: any = null;
  private serialWriter: any = null;
  private usbDevice: any = null;
  private usbEndpointOut: number = 1;
  private isConnecting: boolean = false;
  private baudRate: number = 9600;
  private connectionType: 'none' | 'bridge' | 'serial' | 'usb' = 'none';

  public isSupported(): boolean {
    if (typeof navigator === 'undefined') return false;
    return 'usb' in navigator || 'serial' in navigator;
  }

  public isConnected(): boolean {
    if (this.connectionType === 'bridge') return true;
    if (this.connectionType === 'usb')
      return this.usbDevice !== null && this.usbDevice.opened === true;
    if (this.connectionType === 'serial')
      return this.serialPort !== null && this.serialWriter !== null;
    return false;
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

  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (this.isConnected() || this.isConnecting) {
      return this.isConnected();
    }

    try {
      this.isConnecting = true;

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

      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        try {
          const serialPorts = await (navigator as any).serial.getPorts();
          if (serialPorts.length > 0) {
            await this.openSerialPort(serialPorts[0], baudRate);
            return true;
          }
        } catch {
          // Silent fallback
        }
      }

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

  public async requestAndConnect(baudRate: number = 9600): Promise<boolean> {
    try {
      this.isConnecting = true;

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
          console.warn('[WebPrinter] WebUSB error:', usbErr);
          throw usbErr;
        }
      } else if (typeof navigator !== 'undefined' && 'serial' in navigator) {
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
}

export const webSerialPrinter = new WebSerialPrinterService();
