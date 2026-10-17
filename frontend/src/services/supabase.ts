import { createClient } from '@supabase/supabase-js';
import type { Database } from '@monks/shared';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-monks-dream.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  'demo-anon-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
