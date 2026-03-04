-- presentation='hidden' is only valid for the 4 built-in window apps
-- (chat, calendar, settings, sounds) which minimise to hidden.
-- Everything else with presentation='hidden' was intended to be deleted.
-- Archive all of them.
UPDATE public.entities
SET    archived    = true,
       updated_at = now()
WHERE  presentation = 'hidden'
  AND  archived     = false
  AND  type NOT IN ('chat', 'calendar', 'settings', 'sounds');
