export function cleanStaffName(name?: string): string {
  if (!name || !name.trim()) return 'Staff';
  const clean = name.trim();
  const parenthesisIndex = clean.indexOf('(');
  if (parenthesisIndex > 0) {
    const namePart = clean.substring(0, parenthesisIndex).trim();
    return namePart.split(' ')[0] || namePart;
  }
  return clean.split(' ')[0] || clean;
}

export function toPesos(amount: any): number {
  if (amount === null || amount === undefined) return 0;
  const num = Number(amount);
  return isNaN(num) ? 0 : num;
}

export function formatPhp(amount: number = 0): string {
  return Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function padLine(left: string, right: string, cols: number = 48): string {
  const spaceCount = Math.max(1, cols - left.length - right.length);
  return left + ' '.repeat(spaceCount) + right + '\n';
}

export function divider(char: string = '-', cols: number = 48): string {
  return char.repeat(cols);
}

export function formatDateTime(val?: string | Date): string {
  if (!val) return new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const d = new Date(val);
  return isNaN(d.getTime())
    ? String(val)
    : d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function sanitizeForEscPos(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[·•]/g, '-')
    .replace(/₱/g, 'PHP ')
    .replace(/[^\x20-\x7E\n]/g, ''); // strip any byte outside printable ASCII range
}

export function formatModifierLine(rawMod: any, cols: number = 48): string {
  try {
    if (!rawMod) return '';
    let mod = '';
    if (typeof rawMod === 'string') {
      mod = rawMod.trim();
    } else if (typeof rawMod === 'object') {
      const name = rawMod.name || rawMod.label || rawMod.modifier_name || '';
      const delta = rawMod.priceDelta || rawMod.price_delta || rawMod.price || 0;
      mod = delta > 0 ? `${name} (+${formatPhp(delta)})` : name;
    } else {
      mod = String(rawMod).trim();
    }

    if (!mod) return '';
    if (mod.startsWith('+')) {
      mod = mod.substring(1).trim();
    }

    // Detect embedded price delta like (+₱50.00), (+PHP 50.00), (+50.00), or (+50)
    const priceMatch = mod.match(/\(\+?(?:₱|PHP\s*)?([0-9.,]+)\)$/i);
    const prefix = '  + ';
    const indent = '    ';

    if (priceMatch && priceMatch.index !== undefined) {
      const namePart = sanitizeForEscPos(mod.substring(0, priceMatch.index).trim());
      const rawPrice = priceMatch[1].replace(/,/g, '');
      const pricePart = `+${rawPrice}`;

      // If it fits on 1 line with the price right-aligned (matching item prices)
      if (prefix.length + namePart.length + pricePart.length + 1 <= cols) {
        const spaces = Math.max(1, cols - prefix.length - namePart.length - pricePart.length);
        return `${prefix}${namePart}${' '.repeat(spaces)}${pricePart}\n`;
      }
    }

    const clean = sanitizeForEscPos(mod);
    const fullStr = `${prefix}${clean}`;
    if (fullStr.length <= cols) {
      return `${fullStr}\n`;
    }

    // Word-wrap across lines without truncating or splitting words mid-token
    const words = clean.split(' ');
    const lines: string[] = [];
    let cur = prefix;
    for (const w of words) {
      const spaceNeeded = cur === prefix ? 0 : 1;
      if (cur.length + spaceNeeded + w.length <= cols) {
        cur += (cur === prefix ? '' : ' ') + w;
      } else {
        lines.push(cur);
        cur = indent + w;
      }
    }
    if (cur.trim()) {
      lines.push(cur);
    }
    return lines.join('\n') + '\n';
  } catch (err) {
    return `  + ${sanitizeForEscPos(String(rawMod || ''))}\n`;
  }
}

export function formatItemLine(
  qtyStr: string,
  rawName: string,
  priceStr: string,
  cols: number = 48
): string {
  try {
    const name = sanitizeForEscPos(rawName || 'Item');
    const safeQty = String(qtyStr || '1x').trim();
    const safePrice = String(priceStr || '0.00').trim();
    const leftPrefix = `${safeQty} `;
    const reservedRight = safePrice.length;
    const maxFirstLine = cols - leftPrefix.length - reservedRight - 1;

    if (name.length <= maxFirstLine) {
      const spaceCount = Math.max(1, cols - leftPrefix.length - name.length - safePrice.length);
      return `${leftPrefix}${name}${' '.repeat(spaceCount)}${safePrice}\n`;
    }

    // Find natural word boundary or delimiter before maxFirstLine
    let splitPos = -1;
    for (let i = maxFirstLine; i > 0; i--) {
      if (name[i] === ' ' || name[i] === '(' || name[i] === '-') {
        splitPos = name[i] === ' ' ? i : i;
        break;
      }
    }

    if (splitPos <= 0) {
      splitPos = maxFirstLine;
    }

    const firstLineName = name.slice(0, splitPos).trimEnd();
    let remainingName = name.slice(splitPos).trimStart();

    const spaceCount = Math.max(
      1,
      cols - leftPrefix.length - firstLineName.length - safePrice.length
    );
    let result = `${leftPrefix}${firstLineName}${' '.repeat(spaceCount)}${safePrice}\n`;

    const indent = '   ';
    const availRemaining = cols - indent.length;
    while (remainingName.length > 0) {
      if (remainingName.length <= availRemaining) {
        result += `${indent}${remainingName}\n`;
        break;
      }

      let wrapPos = -1;
      for (let i = availRemaining; i > 0; i--) {
        if (remainingName[i] === ' ' || remainingName[i] === '-' || remainingName[i] === ')') {
          wrapPos = remainingName[i] === ' ' ? i : i + 1;
          break;
        }
      }

      if (wrapPos <= 0) {
        wrapPos = availRemaining;
      }

      result += `${indent}${remainingName.slice(0, wrapPos).trimEnd()}\n`;
      remainingName = remainingName.slice(wrapPos).trimStart();
    }

    return result;
  } catch (err) {
    return padLine(`${qtyStr} ${rawName}`, priceStr, cols);
  }
}
