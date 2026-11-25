ALTER TABLE public.player_evaluations ALTER COLUMN visibility SET DEFAULT 'player'::public.visibility_level;
ALTER TABLE public.champion_pool ALTER COLUMN visibility SET DEFAULT 'player'::public.visibility_level;
ALTER TABLE public.calendar_events ALTER COLUMN visibility SET DEFAULT 'team'::public.visibility_level;