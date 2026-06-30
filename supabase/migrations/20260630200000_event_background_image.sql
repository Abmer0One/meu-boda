-- Migration: Add background_image column to events table
-- Run this in Supabase Web Dashboard SQL Editor

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS background_image TEXT DEFAULT NULL;
