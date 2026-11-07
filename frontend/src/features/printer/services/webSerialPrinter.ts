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
    return true;
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
        type: 'bridge',
      };
    }
    if (this.connectionType === 'usb' && this.usbDevice) {
      return {
        usbVendorId: this.usbDevice.vendorId,
        usbProductId: this.usbDevice.productId,
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
   * Attempt silent connection
   */
  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (this.isConnected() || this.isConnecting) {
      return this.isConnected();
    }

    try {
      this.isConnecting = true;

      // 1. Check local hardware bridge first (Linux native /dev/usb/lp0)
      const bridgeConnected = await this.checkBridge();
      if (bridgeConnected) {
        this.connectionType = 'bridge';
        console.log('[WebPrinter] Connected via Local Hardware Bridge (/dev/usb/lp0)');
        return true;
      }

      // 2. Try WebUSB
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const usbDevices = await (navigator as any).usb.getDevices();
          if (usbDevices.length > 0) {
            await this.openUsbDevice(usbDevices[0]);
            return true;
          }
        } catch {
          // Silent fallback if USB unavailable
        }
      }

      // 3. Try Web Serial
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

      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Connect to device
   */
  public async requestAndConnect(baudRate: number = 9600): Promise<boolean> {
    try {
      this.isConnecting = true;

      // 1. Check local hardware bridge
      const bridgeConnected = await this.checkBridge();
      if (bridgeConnected) {
        this.connectionType = 'bridge';
        return true;
      }

      // 2. Try WebUSB
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const device = await (navigator as any).usb.requestDevice({ filters: [] });
          if (device) {
            await this.openUsbDevice(device);
            return true;
          }
        } catch (usbErr: any) {
          if (usbErr.name !== 'NotFoundError') {
            console.warn('[WebPrinter] WebUSB error:', usbErr);
          }
        }
      }

      // 3. Try Web Serial
      if (typeof navigator !== 'undefined' && 'serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await this.openSerialPort(port, baudRate);
        return true;
      }

      throw new Error('Printer hardware bridge or device not available.');
    } finally {
      this.isConnecting = false;
    }
  }

  private async openUsbDevice(device: any): Promise<void> {
    await this.disconnect();
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    let interfaceNumber = 0;
    let endpointOut = 1;

    for (const iface of device.configuration.interfaces) {
      for (const alt of iface.alternates) {
        for (const ep of alt.endpoints) {
          if (ep.direction === 'out') {
            endpointOut = ep.endpointNumber;
            interfaceNumber = iface.interfaceNumber;
            break;
          }
        }
      }
    }

    await device.claimInterface(interfaceNumber);
    this.usbDevice = device;
    this.usbEndpointOut = endpointOut;
    this.connectionType = 'usb';
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
