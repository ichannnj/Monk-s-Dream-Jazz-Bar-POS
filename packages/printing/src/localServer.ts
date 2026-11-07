import http from 'http';
import fs from 'fs';

const PORT = 12111;
const DEFAULT_DEVICE = process.env.PRINTER_DEVICE || '/dev/usb/lp0';

function findPrinterDevice(): string {
  if (fs.existsSync(DEFAULT_DEVICE)) return DEFAULT_DEVICE;
  for (let i = 0; i < 5; i++) {
    const dev = `/dev/usb/lp${i}`;
    if (fs.existsSync(dev)) return dev;
  }
  return DEFAULT_DEVICE;
}

const server = http.createServer((req, res) => {
  // CORS headers for browser requests from localhost:8081 or any port
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check & status
  if (req.method === 'GET' && req.url === '/status') {
    const device = findPrinterDevice();
    const isOnline = fs.existsSync(device);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: isOnline ? 'CONNECTED' : 'OFFLINE',
        device,
        version: '1.0.0',
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
      const device = findPrinterDevice();

      try {
        await fs.promises.writeFile(device, buffer);
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

  // Cash drawer kick endpoint
  if (req.method === 'POST' && req.url === '/kick') {
    const kickCommand = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    const device = findPrinterDevice();

    fs.writeFile(device, kickCommand, (err) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, kicked: true }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[LocalPrinterBridge] Listening on http://127.0.0.1:${PORT}`);
  console.log(`[LocalPrinterBridge] Active device: ${findPrinterDevice()}`);
});
