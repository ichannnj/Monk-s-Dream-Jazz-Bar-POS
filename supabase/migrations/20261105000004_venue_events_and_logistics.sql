-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Venue Events & Logistics Calendar
-- Migration: 20261105000004_venue_events_and_logistics.sql
-- ==============================================================================

-- 1. Create table public.venue_events
CREATE TABLE IF NOT EXISTS public.venue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  poster_url TEXT,
  poster_storage_path TEXT,
  performer_name TEXT,
  genre TEXT,
  description TEXT,
  sound_check_time TIME,
  gear_requirements TEXT,
  reserved_tables TEXT,
  special_requests TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast date range lookups and calendar rendering
CREATE INDEX IF NOT EXISTS idx_venue_events_date ON public.venue_events (event_date);
CREATE INDEX IF NOT EXISTS idx_venue_events_status ON public.venue_events (status);
CREATE INDEX IF NOT EXISTS idx_venue_events_date_status ON public.venue_events (event_date, status);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.venue_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access so the live shared calendar link (?mode=events) works without authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'venue_events' AND policyname = 'Public Read Venue Events'
  ) THEN
    CREATE POLICY "Public Read Venue Events"
      ON public.venue_events FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'venue_events' AND policyname = 'Allow Manage Venue Events'
  ) THEN
    CREATE POLICY "Allow Manage Venue Events"
      ON public.venue_events FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 3. Configure Supabase Storage Bucket for Event Hero Posters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-posters',
  'event-posters',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage object policies for event-posters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Event Posters'
  ) THEN
    CREATE POLICY "Public Access for Event Posters"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'event-posters');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Manage Event Posters'
  ) THEN
    CREATE POLICY "Staff Manage Event Posters"
      ON storage.objects FOR ALL
      USING (bucket_id = 'event-posters')
      WITH CHECK (bucket_id = 'event-posters');
  END IF;
END $$;

-- 4. Enable Supabase Realtime publication on venue_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'venue_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_events;
    END IF;
  END IF;
END $$;

-- 5. Seed initial jazz bar events across current week and upcoming dates
INSERT INTO public.venue_events (
  title,
  event_date,
  start_time,
  end_time,
  poster_url,
  performer_name,
  genre,
  description,
  sound_check_time,
  gear_requirements,
  reserved_tables,
  special_requests,
  status
) VALUES
(
  'The Monk''s Dream Quintet: Round Midnight Tribute',
  CURRENT_DATE,
  '20:30:00',
  '23:30:00',
  'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=1200&q=80',
  'The Monk''s Dream Quintet',
  'Hard Bop / Bebop',
  'A classic exploration of Thelonious Monk, Miles Davis, and Wayne Shorter masterworks. Two intense sets with an open late-night jam.',
  '18:00:00',
  'Yamaha Baby Grand Piano tuned to 440Hz, 1x Ampeg Bass Amp, 1x Fender Twin Reverb, 4x Shure SM58, Drum Kit (20" kick, snare, 2 toms, cymbals).',
  'Tables T1, T2, T3 reserved for artist guests and VIP press.',
  'Sparkling water and dark roast espresso backstage before Set 1.',
  'scheduled'
),
(
  'Blue Note Acoustic Trio feat. Maya Rivera',
  CURRENT_DATE + INTERVAL '2 days',
  '19:30:00',
  '22:00:00',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  'Maya Rivera Trio',
  'Vocal Jazz / Latin Jazz',
  'Sensuous bossa nova rhythms, soulful jazz standards, and modern boleros accompanied by upright bass and Spanish nylon-string guitar.',
  '17:30:00',
  '2x Vocal Condenser Mics (Neumann KMS 104 or Shure KSM9), Upright Bass DI + Mic, 1x Guitar DI Box.',
  'Tables T4, T5 reserved for guest list.',
  'Hot honey lemon tea and room temperature water on stage.',
  'scheduled'
),
(
  'Late Night Bebop Jam Session',
  CURRENT_DATE + INTERVAL '4 days',
  '22:00:00',
  '02:00:00',
  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?auto=format&fit=crop&w=1200&q=80',
  'Monk''s Dream House Trio & Guest Cats',
  'Post-Bop / Free Jam',
  'Our signature Saturday night open jam session! House rhythm section holds the groove down while visiting horn players and vocalists sit in.',
  '20:30:00',
  'Standard jazz club backline provided. Musicians bring their own horns and sticks.',
  'Bar counter seating prioritized for participating musicians.',
  'Pitchers of craft beer and bar snacks backstage.',
  'scheduled'
),
(
  'Midnight Brass & Bourbon Tasting',
  CURRENT_DATE + INTERVAL '8 days',
  '20:00:00',
  '23:00:00',
  'https://images.unsplash.com/photo-1525994886773-080587e161c2?auto=format&fit=crop&w=1200&q=80',
  'New Orleans Heritage Horns',
  'Dixieland / Brass Fusion',
  'An immersive pairing experience featuring hand-selected Kentucky single barrel bourbons and blistering New Orleans street brass jazz.',
  '17:00:00',
  'Wireless horn clip mics (3x Shure Beta 98H/C), Sousaphone DI, 2x Stage monitors.',
  'Whole dining room booked for ticketed tasting experience.',
  'Glencairn tasting glasses arranged on table runners prior to 19:30 door opening.',
  'scheduled'
)
ON CONFLICT DO NOTHING;

