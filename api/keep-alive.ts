export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qlflnuvqsqwbfzyziwoz.supabase.co';
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_r3pJ1Jy4THvii8N7rByZhQ_MNWDY4jf';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/venue_settings?select=id&limit=1`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'User-Agent': 'Vercel-KeepAlive/1.0',
      },
    });

    const status = res.status;
    const body = await res.text();

    return new Response(
      JSON.stringify({
        ok: res.ok,
        status,
        timestamp: new Date().toISOString(),
        body: JSON.parse(body || '[]'),
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || 'Failed to ping Supabase',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          'content-type': 'application/json',
        },
      }
    );
  }
}
