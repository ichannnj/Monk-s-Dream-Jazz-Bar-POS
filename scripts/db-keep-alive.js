#!/usr/bin/env node

/**
 * Monk's Dream Jazz Bar POS - Database Keep-Alive Daemon
 *
 * Periodically pings Supabase PostgREST endpoint every 5 minutes to prevent
 * free-tier inactivity timeouts / sleeping.
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to parse key-value lines from .env files
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, '../frontend/.env'),
    path.resolve(__dirname, '../.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[db:keep-alive] Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment or frontend/.env'
  );
  process.exit(1);
}

const intervalMs = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '300000', 10); // default: 5 minutes (300,000 ms)

function pingDatabase() {
  const timestamp = new Date().toISOString();
  try {
    const url = new URL('/rest/v1/venue_settings?select=id&limit=1', supabaseUrl);

    const options = {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'User-Agent': 'MonksDream-KeepAlive/1.0',
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(
            `[${timestamp}] [db:keep-alive] Ping OK (${res.statusCode}) - Database active.`
          );
        } else {
          console.warn(
            `[${timestamp}] [db:keep-alive] Ping returned status ${res.statusCode}: ${data}`
          );
        }
      });
    });

    req.on('error', (err) => {
      console.error(`[${timestamp}] [db:keep-alive] Ping request error:`, err.message);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.warn(`[${timestamp}] [db:keep-alive] Request timed out after 10s.`);
    });

    req.end();
  } catch (err) {
    console.error(`[${timestamp}] [db:keep-alive] Ping execution error:`, err);
  }
}

console.log(`[db:keep-alive] Starting database anti-sleeping service.`);
console.log(`[db:keep-alive] Target: ${supabaseUrl}`);
console.log(`[db:keep-alive] Interval: ${intervalMs / 1000}s (${intervalMs / 60000} mins)`);

// Initial immediate ping
pingDatabase();

// Continuous interval pinging
setInterval(pingDatabase, intervalMs);
