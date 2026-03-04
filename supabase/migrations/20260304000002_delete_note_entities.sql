-- Notes are card-only entities with no app registration and no reopen path.
-- Existing notes (including 12 with presentation='hidden') are orphaned data.
DELETE FROM public.entities WHERE type = 'note';
