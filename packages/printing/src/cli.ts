import { PrinterStationDaemon } from './daemon.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || '';
const devicePath = process.env.PRINTER_DEVICE || '/dev/usb/lp0';

if (!supabaseUrl || !supabaseKey) {
  console.error('[PrinterDaemon] Missing SUPABASE_URL or SUPABASE_KEY environment variables.');
  process.exit(1);
}

console.log(`[PrinterDaemon] Connecting to ${supabaseUrl}`);
console.log(`[PrinterDaemon] Printer device path: ${devicePath}`);

const daemon = new PrinterStationDaemon({
  supabaseUrl,
  supabaseKey,
  devicePath,
  columns: 48,
  useMock: false,
});

daemon.start().catch((err) => {
  console.error('[PrinterDaemon] Failed to start daemon:', err);
  process.exit(1);
});
