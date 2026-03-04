-- Migration 20260304000003 incorrectly archived all presentation='hidden' entities
-- except the 4 built-in window apps. This was wrong: agent memory entities
-- (conversation_turn, fact) are always stored as presentation='hidden' and must
-- never be treated as "orphaned hidden cards".
-- Restore all memory entities archived by that migration today.
UPDATE public.entities
SET    archived   = false,
       updated_at = now()
WHERE  archived   = true
  AND  type IN ('conversation_turn', 'fact')
  AND  updated_at >= '2026-03-04';
