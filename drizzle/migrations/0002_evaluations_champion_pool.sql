
CREATE TABLE public.player_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  coach_id uuid,
  coach_name text,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  comments jsonb NOT NULL DEFAULT '{}'::jsonb,
  macro_avg numeric(3,2), micro_avg numeric(3,2), teamplay_avg numeric(3,2), knowledge_avg numeric(3,2), mental_avg numeric(3,2),
  overall numeric(3,2),
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX player_evaluations_player_idx ON public.player_evaluations (player_id, evaluated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_evaluations TO authenticated;
GRANT ALL ON public.player_evaluations TO service_role;
ALTER TABLE public.player_evaluations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.compute_evaluation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE cat text; v numeric; avgs numeric[] := '{}'; a numeric;
BEGIN
  FOREACH cat IN ARRAY ARRAY['macro','micro','teamplay','knowledge','mental'] LOOP
    SELECT avg((value)::numeric) INTO a FROM jsonb_each_text(NEW.scores) WHERE key LIKE cat || '.%' AND value ~ '^[1-5]$';
    IF cat = 'macro' THEN NEW.macro_avg := a;
    ELSIF cat = 'micro' THEN NEW.micro_avg := a;
    ELSIF cat = 'teamplay' THEN NEW.teamplay_avg := a;
    ELSIF cat = 'knowledge' THEN NEW.knowledge_avg := a;
    ELSE NEW.mental_avg := a; END IF;
    IF a IS NOT NULL THEN avgs := avgs || a; END IF;
  END LOOP;
  IF array_length(avgs, 1) IS NULL THEN NEW.overall := NULL;
  ELSE SELECT avg(x) INTO v FROM unnest(avgs) x; NEW.overall := round(v, 2); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER player_evaluations_compute BEFORE INSERT OR UPDATE ON public.player_evaluations FOR EACH ROW EXECUTE FUNCTION public.compute_evaluation();

CREATE POLICY "Coaches manage evaluations" ON public.player_evaluations FOR ALL TO authenticated
  USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared evaluations" ON public.player_evaluations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'player') AND player_id = public.my_player_id() AND visibility IN ('player','team'));

CREATE TABLE public.champion_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  champion_id text NOT NULL CHECK (char_length(champion_id) <= 40),
  champion_name text NOT NULL CHECK (char_length(champion_name) <= 40),
  position public.lol_position NOT NULL,
  rating smallint NOT NULL DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  mastery_notes text CHECK (mastery_notes IS NULL OR char_length(mastery_notes) <= 1000),
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, champion_id, position)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.champion_pool TO authenticated;
GRANT ALL ON public.champion_pool TO service_role;
ALTER TABLE public.champion_pool ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER champion_pool_updated_at BEFORE UPDATE ON public.champion_pool FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Coaches manage champion pool" ON public.champion_pool FOR ALL TO authenticated
  USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared champion pool" ON public.champion_pool FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'player') AND player_id = public.my_player_id() AND visibility IN ('player','team'));
