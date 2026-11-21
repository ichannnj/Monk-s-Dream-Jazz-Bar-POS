import { printHtmlElement } from '../../shared/utils/printHelpers';

let cachedLogoSrc: string | null = null;
function getMonksLogoSrc(): string | null {
  if (cachedLogoSrc !== null) return cachedLogoSrc;
  try {
    const asset = require('../../../../assets/monks-dream-logo-lockup.png');
    if (typeof asset === 'string') {
      cachedLogoSrc = asset;
    } else if (asset && typeof asset.uri === 'string') {
      cachedLogoSrc = asset.uri;
    } else if (asset && typeof asset.default === 'string') {
      cachedLogoSrc = asset.default;
    } else {
      cachedLogoSrc = '';
    }
  } catch {
    cachedLogoSrc = '';
  }
  return cachedLogoSrc || null;
}

/**
 * Strips binary ESC/POS control sequences (raster images, QR payloads, drawer kicks, formatting)
 * and extracts clean printable ASCII text lines for browser spooler printing.
 */
export function extractPrintableTextFromEscPos(bytes: Uint8Array): string {
  const chars: string[] = [];
  let i = 0;

  while (i < bytes.length) {
    const b = bytes[i];

    // GS (0x1D)
    if (b === 0x1d && i + 1 < bytes.length) {
      const cmd = bytes[i + 1];
      // GS v 0 m xL xH yL yH [bitmap]
      if (cmd === 0x76 && i + 7 < bytes.length && bytes[i + 2] === 0x30) {
        const xL = bytes[i + 4];
        const xH = bytes[i + 5];
        const yL = bytes[i + 6];
        const yH = bytes[i + 7];
        const dataLen = (xL + xH * 256) * (yL + yH * 256);
        i += 8 + dataLen;
        continue;
      }
      // GS ( k pL pH [payload]
      if (cmd === 0x28 && i + 4 < bytes.length && bytes[i + 2] === 0x6b) {
        const pL = bytes[i + 3];
        const pH = bytes[i + 4];
        const dataLen = pL + pH * 256;
        i += 5 + dataLen;
        continue;
      }
      // 3-byte GS commands: GS ! n, GS V n, GS B n
      if ((cmd === 0x21 || cmd === 0x56 || cmd === 0x42) && i + 2 < bytes.length) {
        i += 3;
        continue;
      }
      i += 2;
      continue;
    }

    // ESC (0x1B)
    if (b === 0x1b && i + 1 < bytes.length) {
      const cmd = bytes[i + 1];
      // ESC p m t1 t2 (cash drawer kick)
      if (cmd === 0x70 && i + 4 < bytes.length) {
        i += 5;
        continue;
      }
      // ESC @ (init)
      if (cmd === 0x40) {
        i += 2;
        continue;
      }
      // 3-byte ESC commands: ESC a n, ESC E n, ESC - n, ESC M n, ESC t n
      if (
        (cmd === 0x61 || cmd === 0x45 || cmd === 0x2d || cmd === 0x4d || cmd === 0x74) &&
        i + 2 < bytes.length
      ) {
        i += 3;
        continue;
      }
      i += 2;
      continue;
    }

    if (b === 0x0a) {
      chars.push('\n');
    } else if (b >= 0x20 && b <= 0x7e) {
      chars.push(String.fromCharCode(b));
    }

    i += 1;
  }

  return chars.join('').replace(/^\n+|\n+$/g, '');
}

function hasDrawerKickSequence(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0x1b && bytes[i + 1] === 0x70) {
      return true;
    }
  }
  return false;
}

/**
 * Plug-and-play browser fallback: prints any ESC/POS ticket through Chrome/OS Print Spooler
 * without requiring Zadig WinUSB drivers or local background daemons.
 */
export function printEscPosViaBrowser(
  bytes: Uint8Array,
  paperWidth: '80mm' | '58mm' | '57mm' = '58mm'
): boolean {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return false;
  }

  let text = extractPrintableTextFromEscPos(bytes);
  const isPureDrawerKick = !text.trim() && hasDrawerKickSequence(bytes);
  if (isPureDrawerKick) {
    // Trigger a minimal spooler print job so Windows thermal drivers configured with
    // "Open Cash Drawer before/after printing" kick the drawer.
    text = `--- CASH DRAWER OPEN ---\n${new Date().toLocaleTimeString()}`;
  }
  if (!text.trim()) {
    return false;
  }

  const targetId = 'monks-browser-thermal-print-target';
  const existing = document.getElementById(targetId);
  if (existing) {
    existing.remove();
  }

  const container = document.createElement('div');
  container.id = targetId;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.background = '#ffffff';
  container.style.color = '#000000';
  container.style.fontFamily = "'Courier New', Courier, monospace";
  container.style.padding = '4px';

  const logoSrc = getMonksLogoSrc();
  if (logoSrc) {
    const imgWrap = document.createElement('div');
    imgWrap.style.textAlign = 'center';
    imgWrap.style.marginBottom = '6px';
    const img = document.createElement('img');
    img.src = logoSrc;
    img.alt = "Monk's Dream";
    img.style.maxWidth = paperWidth === '80mm' ? '48mm' : '38mm';
    img.style.height = 'auto';
    imgWrap.appendChild(img);
    container.appendChild(imgWrap);
  }

  const pre = document.createElement('pre');
  pre.style.margin = '0';
  pre.style.fontFamily = "'Courier New', Courier, monospace";
  pre.style.fontSize = paperWidth === '80mm' ? '11px' : '10px';
  pre.style.lineHeight = '1.35';
  pre.style.whiteSpace = 'pre-wrap';
  pre.style.wordBreak = 'break-word';
  pre.style.color = '#000000';
  pre.textContent = text;
  container.appendChild(pre);

  document.body.appendChild(container);

  const printed = printHtmlElement(targetId, {
    isThermal: true,
    pageSize: paperWidth === '80mm' ? '80mm' : '57mm',
    title: "Monk's Dream Thermal Receipt",
  });

  setTimeout(() => {
    container.remove();
  }, 1500);

  return printed;
}
