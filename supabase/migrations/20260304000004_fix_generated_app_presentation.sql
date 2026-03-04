-- Generated apps (state contains _code) must always have presentation='window'.
-- The create route previously assigned presentation='card' for unknown types,
-- so any existing generated app entity needs to be corrected.
UPDATE public.entities
SET    presentation = 'window',
       updated_at  = now()
WHERE  archived     = false
  AND  presentation = 'card'
  AND  (state->>'_code') IS NOT NULL;
