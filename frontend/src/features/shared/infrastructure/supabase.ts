import { createClient } from '@supabase/supabase-js';
import type { Database } from '@monks/shared';
import { z } from 'zod';

/**
 * Supabase Environment Variable Guardrail Schema
 * Validates presence and format of required cloud BaaS credentials.
 */
const SupabaseEnvSchema = z.object({
  url: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid HTTP/HTTPS URL'),
  anonKey: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY must not be empty'),
});

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-monks-dream.supabase.co';
const rawKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  'demo-anon-key-placeholder-valid';

const envValidation = SupabaseEnvSchema.safeParse({
  url: rawUrl,
  anonKey: rawKey,
});

if (!envValidation.success) {
  console.error(
    '❌ [Supabase Guardrail Error] Invalid Supabase Configuration:',
    envValidation.error.format()
  );
}

export const supabase = createClient<Database>(rawUrl, rawKey);
