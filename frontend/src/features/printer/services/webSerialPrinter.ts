/**
 * Web Serial Hardware Printer Driver
 * Communicates directly with USB/Serial thermal receipt printers and RJ11 cash drawers.
 */

import { buildCashDrawerKickBytes } from './escposBuilder';

export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export class WebSerialPrinterService {
  private port: any = null;
  private writer: any = null;
  private isConnecting: boolean = false;
  private baudRate: number = 9600;

  /**
   * Check if Web Serial API is supported in the current browser
   */
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Check if the printer port is currently opened and ready for writing
   */
  public isConnected(): boolean {
    return this.port !== null && this.port.readable !== null && this.writer !== null;
  }

  /**
   * Get USB Vendor/Product information for the active port if available
   */
  public getPortInfo(): SerialPortInfo | null {
    if (!this.port || typeof this.port.getInfo !== 'function') return null;
    return this.port.getInfo();
  }

  /**
   * Get previously paired ports that the user granted permission to in prior sessions
   */
  public async getPairedPorts(): Promise<any[]> {
    if (!this.isSupported()) return [];
    try {
      return await (navigator as any).serial.getPorts();
    } catch (err) {
      console.warn('[WebSerialPrinter] Failed to query paired ports:', err);
      return [];
    }
  }

  /**
   * Attempt to silently reconnect to a previously paired port without showing browser picker
   */
  public async autoConnect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported() || this.isConnected() || this.isConnecting) {
      return this.isConnected();
    }

    try {
      this.isConnecting = true;
      const ports = await this.getPairedPorts();
      if (ports.length > 0) {
        await this.openPort(ports[0], baudRate);
        console.log('[WebSerialPrinter] Silently reconnected to previously authorized port');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[WebSerialPrinter] Silent auto-connect failed:', err);
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Prompt user gesture to pick a Serial/USB device and open connection
   */
  public async requestAndConnect(baudRate: number = 9600): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error(
        'Web Serial API is not supported in this browser. Please use Chrome or Edge.'
      );
    }

    try {
      this.isConnecting = true;
      const port = await (navigator as any).serial.requestPort();
      await this.openPort(port, baudRate);
      return true;
    } catch (err: any) {
      console.error('[WebSerialPrinter] Connection request failed:', err);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Open port stream and acquire writer
   */
  private async openPort(port: any, baudRate: number): Promise<void> {
    if (this.port) {
      await this.disconnect();
    }

    this.baudRate = baudRate;
    await port.open({
      baudRate: this.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
    });

    this.port = port;
    this.writer = port.writable.getWriter();
  }

  /**
   * Write raw binary ESC/POS byte array to the thermal printer
   */
  public async writeBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected()) {
      throw new Error('Thermal printer is not connected. Please pair device first.');
    }

    try {
      await this.writer.write(bytes);
      return true;
    } catch (err) {
      console.error('[WebSerialPrinter] Write failed:', err);
      // If writer stream encountered a fatal error, close and release
      await this.disconnect();
      throw err;
    }
  }

  /**
   * Kick the physical cash drawer solenoid via RJ11/RJ12 port on thermal printer
   */
  public async kickCashDrawer(): Promise<boolean> {
    const kickCommand = buildCashDrawerKickBytes();
    return this.writeBytes(kickCommand);
  }

  /**
   * Close port and release writer lock safely
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer.releaseLock();
      }
    } catch (err) {
      console.warn('[WebSerialPrinter] Error closing writer:', err);
    } finally {
      this.writer = null;
    }

    try {
      if (this.port) {
        await this.port.close();
      }
    } catch (err) {
      console.warn('[WebSerialPrinter] Error closing port:', err);
    } finally {
      this.port = null;
    }
  }
}

export const webSerialPrinter = new WebSerialPrinterService();
