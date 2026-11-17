import { describe, it, expect } from 'vitest';
import {
  findUsbOutEndpoint,
  isPrinterDevice,
  matchesSavedPrinter,
  type BoundPrinterDevice,
} from '../webPrinterTransport';

describe('webPrinterTransport USB Endpoint and Device Detection', () => {
  it('identifies standard USB Printer Class (Class 7) Bulk OUT endpoint', () => {
    const mockPrinterDevice = {
      productName: 'POS-80 Thermal Printer',
      vendorId: 0x0416,
      productId: 0x5011,
      configuration: {
        interfaces: [
          {
            interfaceNumber: 0,
            alternates: [
              {
                interfaceClass: 7, // USB Printer Class
                interfaceSubclass: 1,
                interfaceProtocol: 2,
                endpoints: [
                  { endpointNumber: 1, direction: 'out', type: 'bulk' },
                  { endpointNumber: 2, direction: 'in', type: 'bulk' },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = findUsbOutEndpoint(mockPrinterDevice);
    expect(result.endpointOut).toBe(1);
    expect(result.interfaceNumber).toBe(0);
    expect(result.isPrinterClass).toBe(true);
    expect(isPrinterDevice(mockPrinterDevice)).toBe(true);
  });

  it('prioritizes Printer Class interface over HID / Mouse interface on composite devices', () => {
    const mockCompositeDevice = {
      productName: 'Composite POS Hub with Printer',
      configuration: {
        interfaces: [
          {
            interfaceNumber: 0,
            alternates: [
              {
                interfaceClass: 3, // HID (e.g. Mouse / Keypad)
                interfaceSubclass: 1,
                interfaceProtocol: 1,
                endpoints: [{ endpointNumber: 1, direction: 'out', type: 'interrupt' }],
              },
            ],
          },
          {
            interfaceNumber: 1,
            alternates: [
              {
                interfaceClass: 7, // Printer Class
                interfaceSubclass: 1,
                interfaceProtocol: 2,
                endpoints: [{ endpointNumber: 2, direction: 'out', type: 'bulk' }],
              },
            ],
          },
        ],
      },
    };

    const result = findUsbOutEndpoint(mockCompositeDevice);
    // Should skip interface 0 (HID) and select interface 1 (Printer Class)
    expect(result.interfaceNumber).toBe(1);
    expect(result.endpointOut).toBe(2);
    expect(result.isPrinterClass).toBe(true);
  });

  it('selects Vendor-Specific (Class 255) bulk out endpoint if not Class 7, but skips HID', () => {
    const mockVendorSpecificPrinter = {
      productName: 'Custom Mini 58mm Thermal',
      configuration: {
        interfaces: [
          {
            interfaceNumber: 0,
            alternates: [
              {
                interfaceClass: 3, // HID interface to skip
                endpoints: [{ endpointNumber: 1, direction: 'out', type: 'interrupt' }],
              },
            ],
          },
          {
            interfaceNumber: 2,
            alternates: [
              {
                interfaceClass: 255, // Vendor Specific bulk
                endpoints: [{ endpointNumber: 3, direction: 'out', type: 'bulk' }],
              },
            ],
          },
        ],
      },
    };

    const result = findUsbOutEndpoint(mockVendorSpecificPrinter);
    expect(result.interfaceNumber).toBe(2);
    expect(result.endpointOut).toBe(3);
  });

  it('matchesSavedPrinter accurately compares bound hardware identifiers', () => {
    const bound: BoundPrinterDevice = {
      vendorId: 0x04b8,
      productId: 0x0202,
      serialNumber: 'EP123456',
      deviceName: 'Epson TM-T88',
      transport: 'usb',
    };

    const matchingDevice = {
      vendorId: 0x04b8,
      productId: 0x0202,
      serialNumber: 'EP123456',
    };

    const differentDevice = {
      vendorId: 0x046d, // Logitech Mouse
      productId: 0xc52b,
      serialNumber: 'LOGI001',
    };

    expect(matchesSavedPrinter(matchingDevice, bound)).toBe(true);
    expect(matchesSavedPrinter(differentDevice, bound)).toBe(false);
  });

  it('matchesSavedPrinter matches by vendorId and productId when serialNumber is omitted', () => {
    const bound: BoundPrinterDevice = {
      vendorId: 0x0416,
      productId: 0x5011,
      transport: 'usb',
    };

    const matchingDevice = {
      vendorId: 0x0416,
      productId: 0x5011,
      serialNumber: undefined,
    };

    expect(matchesSavedPrinter(matchingDevice, bound)).toBe(true);
  });
});
