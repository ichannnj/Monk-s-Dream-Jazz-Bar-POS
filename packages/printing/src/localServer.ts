import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const PORT = 12111;
const IS_WINDOWS = process.platform === 'win32';
const DEFAULT_DEVICE = process.env.PRINTER_DEVICE || '/dev/usb/lp0';

function findLinuxPrinterDevice(): string {
  if (fs.existsSync(DEFAULT_DEVICE)) return DEFAULT_DEVICE;
  for (let i = 0; i < 5; i++) {
    const dev = `/dev/usb/lp${i}`;
    if (fs.existsSync(dev)) return dev;
  }
  return DEFAULT_DEVICE;
}

let cachedWindowsPrinter: string | null = null;

async function findWindowsPrinter(): Promise<string | null> {
  if (process.env.PRINTER_NAME) return process.env.PRINTER_NAME;
  if (cachedWindowsPrinter) return cachedWindowsPrinter;

  try {
    const psScript = `
      $printers = Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PortName;
      $thermal = $printers | Where-Object { $_.Name -match 'POS|80|58|57|Thermal|Receipt|Xprinter|Epson|Rongta|Star' -or $_.PortName -match 'USB' } | Select-Object -First 1;
      if ($thermal) { $thermal.Name } else { ($printers | Where-Object { $_.Default -eq $true } | Select-Object -First 1).Name }
    `;
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript,
    ]);
    const name = stdout.trim();
    if (name) {
      cachedWindowsPrinter = name;
      return name;
    }
  } catch (err) {
    console.warn('[LocalPrinterBridge] Could not enumerate Windows printers:', err);
  }
  return null;
}

async function writeRawWindows(printerName: string, buffer: Buffer): Promise<void> {
  const tempFile = path.join(
    os.tmpdir(),
    `monks_escpos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.bin`
  );
  await fs.promises.writeFile(tempFile, buffer);

  const escapedPrinter = printerName.replace(/'/g, "''");
  const escapedFile = tempFile.replace(/'/g, "''");

  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

  public static void SendBytesToPrinter(string szPrinterName, string filePath) {
    byte[] bytes = File.ReadAllBytes(filePath);
    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
    IntPtr hPrinter = IntPtr.Zero;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "Monks Dream ESC/POS Job";
    di.pDataType = "RAW";
    try {
      if (!OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) {
        throw new Exception("OpenPrinter failed with code " + Marshal.GetLastWin32Error());
      }
      if (!StartDocPrinter(hPrinter, 1, di)) {
        throw new Exception("StartDocPrinter failed with code " + Marshal.GetLastWin32Error());
      }
      if (!StartPagePrinter(hPrinter)) {
        throw new Exception("StartPagePrinter failed with code " + Marshal.GetLastWin32Error());
      }
      int written = 0;
      if (!WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out written)) {
        throw new Exception("WritePrinter failed with code " + Marshal.GetLastWin32Error());
      }
      EndPagePrinter(hPrinter);
      EndDocPrinter(hPrinter);
    } finally {
      if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
      Marshal.FreeCoTaskMem(pUnmanagedBytes);
    }
  }
}
"@
[RawPrinterHelper]::SendBytesToPrinter('${escapedPrinter}', '${escapedFile}')
`;

  try {
    await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript]);
  } finally {
    fs.promises.unlink(tempFile).catch(() => {});
  }
}

async function sendRawBytes(buffer: Buffer): Promise<void> {
  if (IS_WINDOWS) {
    const printerName = await findWindowsPrinter();
    if (!printerName) {
      throw new Error(
        'No Windows printer found. Set PRINTER_NAME env var or install a default printer.'
      );
    }
    await writeRawWindows(printerName, buffer);
    return;
  }

  const device = findLinuxPrinterDevice();
  await fs.promises.writeFile(device, buffer);
}

const server = http.createServer(async (req, res) => {
  // CORS + Chrome Private Network Access headers so web-hosted HTTPS pages can reach 127.0.0.1
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check & status
  if (req.method === 'GET' && req.url === '/status') {
    if (IS_WINDOWS) {
      const printerName = await findWindowsPrinter();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: printerName ? 'CONNECTED' : 'OFFLINE',
          device: printerName || 'No Windows Printer Detected',
          platform: 'win32',
          version: '1.1.0',
        })
      );
      return;
    }

    const device = findLinuxPrinterDevice();
    const isOnline = fs.existsSync(device);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: isOnline ? 'CONNECTED' : 'OFFLINE',
        device,
        platform: process.platform,
        version: '1.1.0',
      })
    );
    return;
  }

  // Raw byte stream print
  if (req.method === 'POST' && req.url === '/print') {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      try {
        await sendRawBytes(buffer);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err: any) {
        console.error('[PrinterServer] Failed to write to device:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Cash drawer kick endpoint (pulse both Pin 2 and Pin 5)
  if (req.method === 'POST' && req.url === '/kick') {
    const kickCommand = Buffer.from([0x1b, 0x70, 0x00, 0x3c, 0xff, 0x1b, 0x70, 0x01, 0x3c, 0xff]);
    try {
      await sendRawBytes(kickCommand);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, kicked: true }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`[LocalPrinterBridge] Listening on http://127.0.0.1:${PORT}`);
  if (IS_WINDOWS) {
    const winPrinter = await findWindowsPrinter();
    console.log(`[LocalPrinterBridge] Windows target printer: ${winPrinter || 'None detected'}`);
  } else {
    console.log(`[LocalPrinterBridge] Active device: ${findLinuxPrinterDevice()}`);
  }
});
