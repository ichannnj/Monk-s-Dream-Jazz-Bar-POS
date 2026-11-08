export interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
  type?: 'bridge' | 'usb' | 'serial';
  deviceName?: string;
  manufacturerName?: string;
  serialNumber?: string;
}

export const BRIDGE_URL = 'http://127.0.0.1:12111';

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

export function findUsbOutEndpoint(device: any): { endpointOut: number; interfaceNumber: number } {
  let targetInterfaceNumber = 0;
  let endpointOut = 1;
  let foundEndpoint = false;

  const interfaces = device.configuration?.interfaces || [];
  let isBulkFound = false;
  for (const iface of interfaces) {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === 'out') {
          if (!foundEndpoint || ep.type === 'bulk') {
            endpointOut = ep.endpointNumber;
            targetInterfaceNumber = iface.interfaceNumber;
            foundEndpoint = true;
            if (ep.type === 'bulk') {
              isBulkFound = true;
              break;
            }
          }
        }
      }
      if (isBulkFound) break;
    }
    if (isBulkFound) break;
  }

  return { endpointOut, interfaceNumber: targetInterfaceNumber };
}
