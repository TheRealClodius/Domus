-- Monthly spending cap (in euros) for the 'extra' (PAYG) plan.
-- NULL means no cap set by the user.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS extra_budget numeric(10, 2);
