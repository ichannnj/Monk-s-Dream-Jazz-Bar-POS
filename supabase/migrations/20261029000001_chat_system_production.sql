-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Production Database-Backed Team Chat System
-- Migration: 20261029000001_chat_system_production.sql
-- ==============================================================================

-- 1. CHAT CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  type TEXT NOT NULL CHECK (type IN ('channel', 'dm')),
  avatar_text TEXT NOT NULL,
  pinned_author TEXT,
  pinned_text TEXT,
  pinned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow POS operations for chat_conversations"
  ON public.chat_conversations
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. CHAT PARTICIPANTS TABLE (For 1-on-1 DMs and read status tracking)
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chat_participant UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow POS operations for chat_participants"
  ON public.chat_participants
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow POS operations for chat_messages"
  ON public.chat_messages
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. REALTIME REPLICA IDENTITY & PUBLICATION
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- 5. SEED INITIAL OPERATIONAL CHANNELS & SERVICE ANNOUNCEMENTS
INSERT INTO public.chat_conversations (id, slug, title, subtitle, type, avatar_text, pinned_author, pinned_text, pinned_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'foh',
    'Front of House',
    'Front of House · Floor Staff & Cashier',
    'channel',
    'FH',
    'Miles (Manager)',
    'Mid-shift briefing at 2 PM by the host stand. Keep high-top tables clean.',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'bar',
    'Bar Station',
    'Bar Station · Cocktails & Draft',
    'channel',
    'BS',
    'Thelonious (Bartender)',
    'Craft IPA keg tapped and ready. Restocked clean glassware.',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'cafe',
    'Cafe Station',
    'Cafe Station · Espresso & Pour-overs',
    'channel',
    'CS',
    'Bill (Barista)',
    'Oat milk shipment verified and refrigerated. Batch brew ready.',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'kitchen',
    'Kitchen Line',
    'Kitchen Line · Hot Pass & Food Prep',
    'channel',
    'KL',
    'Chet (Head Chef)',
    'Small plates mise-en-place completed. Notify line on seafood allergens.',
    now()
  )
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    avatar_text = EXCLUDED.avatar_text,
    pinned_author = EXCLUDED.pinned_author,
    pinned_text = EXCLUDED.pinned_text;

-- Seed initial welcome service messages
INSERT INTO public.chat_messages (conversation_id, sender_name, sender_role, message, is_system, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Miles (Manager)', 'Manager', 'Welcome to evening service! Let us make tonight swinging.', false, now() - INTERVAL '15 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'System', 'POS Dispatcher', 'Service floor opened. All terminals synchronized.', true, now() - INTERVAL '10 minutes'),
  ('00000000-0000-0000-0000-000000000002', 'Thelonious (Bartender)', 'Bartender', 'Bar inventory verified. Lime juice and syrups prepped.', false, now() - INTERVAL '20 minutes'),
  ('00000000-0000-0000-0000-000000000003', 'Bill (Barista)', 'Barista', 'Espresso grinder dial-in finished at 24s extraction.', false, now() - INTERVAL '18 minutes'),
  ('00000000-0000-0000-0000-000000000004', 'Chet (Head Chef)', 'Kitchen Chef', 'Appetizer pass line is active and ready for orders.', false, now() - INTERVAL '25 minutes')
ON CONFLICT DO NOTHING;
