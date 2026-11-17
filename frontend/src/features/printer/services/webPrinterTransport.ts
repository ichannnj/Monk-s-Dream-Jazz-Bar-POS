export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
  type?: 'bridge' | 'usb' | 'serial';
  deviceName?: string;
  manufacturerName?: string;
  serialNumber?: string;
  interfaceNumber?: number;
  endpointOut?: number;
}

export interface BoundPrinterDevice {
  vendorId?: number;
  productId?: number;
  serialNumber?: string;
  deviceName?: string;
  manufacturerName?: string;
  transport: 'usb' | 'serial' | 'bridge';
}

export const BRIDGE_URL = 'http://127.0.0.1:12111';

// Standard USB Class Codes
export const USB_CLASS_AUDIO = 0x01;
export const USB_CLASS_HID = 0x03; // Keyboards, mice
export const USB_CLASS_PRINTER = 0x07; // USB Thermal & document printers
export const USB_CLASS_MASS_STORAGE = 0x08; // Flash drives
export const USB_CLASS_CDC = 0x02; // Communications / Virtual COM
export const USB_CLASS_VENDOR_SPEC = 0xff; // Vendor-specific protocols

export async function checkHardwareBridge(): Promise<boolean> {
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

export interface UsbEndpointResult {
  endpointOut: number;
  interfaceNumber: number;
  isPrinterClass: boolean;
}

/**
 * Robustly inspects USB device configurations and interfaces.
 * Prioritizes standard USB Printer Class (0x07) interfaces and bulk OUT endpoints.
 * Explicitly skips HID (mouse/keyboard: 0x03) and Mass Storage (0x08) to isolate the printer.
 */
export function findUsbOutEndpoint(device: any): UsbEndpointResult {
  let targetInterfaceNumber = 0;
  let endpointOut = 1;
  let foundEndpoint = false;

  const interfaces = device.configuration?.interfaces || [];

  // Pass 1: Seek strict USB Printer Class (Class 7) Bulk OUT endpoint
  for (const iface of interfaces) {
    for (const alt of iface.alternates || []) {
      if (alt.interfaceClass === USB_CLASS_PRINTER) {
        for (const ep of alt.endpoints || []) {
          if (ep.direction === 'out' && ep.type === 'bulk') {
            return {
              endpointOut: ep.endpointNumber,
              interfaceNumber: iface.interfaceNumber,
              isPrinterClass: true,
            };
          }
        }
      }
    }
  }

  // Pass 2: Fall back to bulk OUT endpoint on non-HID, non-MassStorage interfaces (e.g. Vendor Specific 0xFF)
  for (const iface of interfaces) {
    for (const alt of iface.alternates || []) {
      // Strictly skip keyboards, mice, and flash storage
      if (alt.interfaceClass === USB_CLASS_HID || alt.interfaceClass === USB_CLASS_MASS_STORAGE) {
        continue;
      }

      for (const ep of alt.endpoints || []) {
        if (ep.direction === 'out') {
          if (!foundEndpoint || ep.type === 'bulk') {
            endpointOut = ep.endpointNumber;
            targetInterfaceNumber = iface.interfaceNumber;
            foundEndpoint = true;
            if (ep.type === 'bulk') {
              return { endpointOut, interfaceNumber: targetInterfaceNumber, isPrinterClass: false };
            }
          }
        }
      }
    }
  }

  return { endpointOut, interfaceNumber: targetInterfaceNumber, isPrinterClass: false };
}

/**
 * Checks whether a given USB device has Printer Class interfaces or printer naming
 */
export function isPrinterDevice(device: any): boolean {
  if (!device) return false;

  const interfaces = device.configuration?.interfaces || [];
  for (const iface of interfaces) {
    for (const alt of iface.alternates || []) {
      if (alt.interfaceClass === USB_CLASS_PRINTER) {
        return true;
      }
    }
  }

  const name = `${device.productName || ''} ${device.manufacturerName || ''}`.toLowerCase();
  return (
    name.includes('print') ||
    name.includes('pos') ||
    name.includes('receipt') ||
    name.includes('thermal') ||
    name.includes('epson') ||
    name.includes('xprinter') ||
    name.includes('star') ||
    name.includes('rongta')
  );
}

/**
 * Compares an active USB/Serial device against saved hardware identifiers
 */
export function matchesSavedPrinter(device: any, saved: BoundPrinterDevice | null): boolean {
  if (!device || !saved) return false;

  const devVid = device.vendorId ?? device.usbVendorId;
  const devPid = device.productId ?? device.usbProductId;
  const devSerial = device.serialNumber;

  if (saved.vendorId !== undefined && devVid !== undefined && saved.vendorId !== devVid) {
    return false;
  }
  if (saved.productId !== undefined && devPid !== undefined && saved.productId !== devPid) {
    return false;
  }
  if (saved.serialNumber && devSerial && saved.serialNumber !== devSerial) {
    return false;
  }

  // If vendorId and productId matched (or matched when serialNumber was omitted)
  return saved.vendorId === devVid && saved.productId === devPid;
}
