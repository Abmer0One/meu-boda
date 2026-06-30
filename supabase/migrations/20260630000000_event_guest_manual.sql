-- Migration: Add guest manual & important info fields to events table
-- Run this in Supabase Web Dashboard SQL Editor

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS dress_code_style       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dress_code_colors      TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gift_suggestions       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gift_iban              TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gift_iban_holder       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kids_restriction_note  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instagram_host_1       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instagram_host_2       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rsvp_deadline          DATE DEFAULT NULL;
