import { supabase } from '../supabase';

export const tableUuidCache = new Map<string, string>();

export function clearTableUuidCache(): void {
  tableUuidCache.clear();
}

/**
 * Resolves a table ID or display code (e.g., 'tbl-b1', 'Bar 1', 'Cafe 2')
 * to the actual Supabase UUID from the physical `tables` table.
 */
export async function resolveTableUuid(
  tableIdOrCode?: string | null,
  fallbackCode?: string | null
): Promise<string | null> {
  if (!tableIdOrCode && !fallbackCode) return null;
  const input = (tableIdOrCode || '').trim();
  const fallback = (fallbackCode || '').trim();

  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  if (isUuid(input)) return input;
  if (tableUuidCache.has(input)) return tableUuidCache.get(input)!;
  if (fallback && tableUuidCache.has(fallback)) return tableUuidCache.get(fallback)!;

  try {
    // 1. Direct match on table_number (e.g. "Bar 1", "Cafe 2")
    const searchTargets = [fallback, input].filter(Boolean);
    for (const target of searchTargets) {
      const { data } = await supabase
        .from('tables')
        .select('id')
        .ilike('table_number', target)
        .limit(1);
      if (data && data.length > 0) {
        tableUuidCache.set(input, data[0].id);
        if (fallback) tableUuidCache.set(fallback, data[0].id);
        return data[0].id;
      }
    }

    // 2. Parse common slugs like "tbl-b1" -> "Bar 1", "tbl-c2" -> "Cafe 2", "tbl-t3" -> "Table 3"
    const slug = input.replace(/^tbl-/, '');
    const match = slug.match(/^([a-z]+)(\d+)$/i);
    if (match) {
      const prefix = match[1].toLowerCase();
      const num = match[2];
      const zoneName = prefix === 'b' ? 'Bar' : prefix === 'c' ? 'Cafe' : 'Table';
      const candidateCode = `${zoneName} ${num}`;

      const { data } = await supabase
        .from('tables')
        .select('id')
        .or(`table_number.ilike.${candidateCode},table_number.ilike.%${num}%`)
        .limit(1);
      if (data && data.length > 0) {
        tableUuidCache.set(input, data[0].id);
        return data[0].id;
      }
    }

    // 3. Fallback: fuzzy number search
    const cleanNum = input.replace(/\D/g, '');
    if (cleanNum) {
      const { data } = await supabase
        .from('tables')
        .select('id')
        .ilike('table_number', `%${cleanNum}%`)
        .limit(1);
      if (data && data.length > 0) {
        tableUuidCache.set(input, data[0].id);
        return data[0].id;
      }
    }

    return null;
  } catch (err) {
    console.warn('resolveTableUuid error:', err);
    return null;
  }
}
