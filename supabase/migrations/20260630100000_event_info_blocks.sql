-- Migration: Create event_info_blocks table for dynamic guest info
-- Also drop gift_iban and gift_iban_holder columns (now dynamic)
-- Run this in Supabase Web Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS event_info_blocks (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_info_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own event info blocks
CREATE POLICY "Users can manage own event info blocks"
  ON event_info_blocks
  FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE user_id = auth.uid()));

-- Policy: Anyone can read info blocks (for guest view)
CREATE POLICY "Anyone can read event info blocks"
  ON event_info_blocks
  FOR SELECT
  USING (true);

-- Drop IBAN columns that are no longer dedicated fields
ALTER TABLE events DROP COLUMN IF EXISTS gift_iban;
ALTER TABLE events DROP COLUMN IF EXISTS gift_iban_holder;
