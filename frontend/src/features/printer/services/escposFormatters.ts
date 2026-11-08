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

export function formatItemLine(
  qtyStr: string,
  name: string,
  priceStr: string,
  cols: number = 48
): string {
  const leftPrefix = `${qtyStr}  `;
  const reservedRight = priceStr.length + 2;
  const maxNameLen = cols - leftPrefix.length - reservedRight;

  if (name.length <= maxNameLen) {
    const spaceCount = Math.max(1, cols - (leftPrefix.length + name.length) - priceStr.length);
    return `${leftPrefix}${name}${' '.repeat(spaceCount)}${priceStr}\n`;
  }

  const firstLineName = name.slice(0, maxNameLen);
  const remainingName = name.slice(maxNameLen).trim();
  const spaceCount = Math.max(
    1,
    cols - (leftPrefix.length + firstLineName.length) - priceStr.length
  );
  return (
    `${leftPrefix}${firstLineName}${' '.repeat(spaceCount)}${priceStr}\n` + `    ${remainingName}\n`
  );
}
