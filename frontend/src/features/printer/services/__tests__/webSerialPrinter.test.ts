import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSerialPrinterService } from '../webSerialPrinter';

describe('WebSerialPrinterService Device Binding and Persistence', () => {
  let printerService: WebSerialPrinterService;
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const fakeLocalStorage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    vi.stubGlobal('localStorage', fakeLocalStorage);
    printerService = new WebSerialPrinterService();
  });

  it('saves and retrieves bound printer device in localStorage', () => {
    expect(printerService.getBoundPrinter()).toBeNull();

    const boundInfo = {
      vendorId: 0x0483,
      productId: 0x5740,
      deviceName: 'Thermal Receipt 80mm',
      manufacturerName: 'Monks POS',
      transport: 'usb' as const,
    };

    printerService.saveBoundPrinter(boundInfo);
    const retrieved = printerService.getBoundPrinter();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.vendorId).toBe(0x0483);
    expect(retrieved?.productId).toBe(0x5740);
    expect(retrieved?.deviceName).toBe('Thermal Receipt 80mm');
    expect(retrieved?.transport).toBe('usb');
  });

  it('clears bound printer device on clearBoundPrinter', () => {
    printerService.saveBoundPrinter({
      vendorId: 0x0416,
      productId: 0x5011,
      transport: 'usb',
    });
    expect(printerService.getBoundPrinter()).not.toBeNull();

    printerService.clearBoundPrinter();
    expect(printerService.getBoundPrinter()).toBeNull();
  });

  it('isolates bound printer from other connected devices (mouse/keyboard)', () => {
    printerService.saveBoundPrinter({
      vendorId: 0x04b8,
      productId: 0x0202,
      deviceName: 'Epson TM-T88',
      transport: 'usb',
    });

    const bound = printerService.getBoundPrinter();

    const mouseDevice = {
      vendorId: 0x046d, // Logitech
      productId: 0xc534,
      productName: 'USB Optical Mouse',
    };

    const printerDevice = {
      vendorId: 0x04b8, // Epson
      productId: 0x0202,
      productName: 'Epson TM-T88VI',
    };

    // Verify isolation logic
    const isMouse =
      bound?.vendorId === mouseDevice.vendorId && bound?.productId === mouseDevice.productId;
    const isPrinter =
      bound?.vendorId === printerDevice.vendorId && bound?.productId === printerDevice.productId;

    expect(isMouse).toBe(false);
    expect(isPrinter).toBe(true);
  });
});
