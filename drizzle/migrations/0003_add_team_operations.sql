CREATE TYPE public.scrim_type AS ENUM ('BO3', 'BO5', 'SOLO_GAME', 'TEAM_PRACTICE', 'DRAFT_PRACTICE');
CREATE TYPE public.scrim_result AS ENUM ('WIN', 'LOSS');

CREATE TABLE public.scrim_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opponent text NOT NULL,
  starts_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  planned_games integer NOT NULL DEFAULT 1 CHECK (planned_games > 0 AND planned_games <= 50),
  scrim_type public.scrim_type NOT NULL DEFAULT 'TEAM_PRACTICE',
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrim_sessions TO authenticated;
GRANT ALL ON public.scrim_sessions TO service_role;
ALTER TABLE public.scrim_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage scrim sessions" ON public.scrim_sessions FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared scrim sessions" ON public.scrim_sessions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'player') AND (
    visibility = 'team' OR
    (visibility = 'player' AND public.my_player_id() = ANY(participant_ids))
  )
);

CREATE TABLE public.scrim_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scrim_sessions(id) ON DELETE CASCADE,
  game_number integer NOT NULL CHECK (game_number > 0),
  result public.scrim_result,
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  zilence_composition text[] NOT NULL DEFAULT '{}',
  opponent_composition text[] NOT NULL DEFAULT '{}',
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  observations text,
  positives text,
  improvements text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, game_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrim_games TO authenticated;
GRANT ALL ON public.scrim_games TO service_role;
ALTER TABLE public.scrim_games ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_scrim_session(_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.scrim_sessions s
    WHERE s.id = _session_id
      AND public.has_role(auth.uid(), 'player')
      AND (
        s.visibility = 'team' OR
        (s.visibility = 'player' AND public.my_player_id() = ANY(s.participant_ids))
      )
  )
$$;

CREATE POLICY "Coaches manage scrim games" ON public.scrim_games FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared scrim games" ON public.scrim_games FOR SELECT TO authenticated USING (public.can_read_scrim_session(session_id));

CREATE TABLE public.calendar_event_private_notes (
  event_id uuid PRIMARY KEY REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_event_private_notes TO authenticated;
GRANT ALL ON public.calendar_event_private_notes TO service_role;
ALTER TABLE public.calendar_event_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage calendar private notes" ON public.calendar_event_private_notes FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));

CREATE TABLE public.scrim_private_notes (
  session_id uuid PRIMARY KEY REFERENCES public.scrim_sessions(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrim_private_notes TO authenticated;
GRANT ALL ON public.scrim_private_notes TO service_role;
ALTER TABLE public.scrim_private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage scrim private notes" ON public.scrim_private_notes FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));

ALTER TABLE public.calendar_events ADD COLUMN participant_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.calendar_events ADD COLUMN scrim_session_id uuid REFERENCES public.scrim_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_scrim_session_id_key UNIQUE (scrim_session_id);

DROP POLICY "Players read shared events" ON public.calendar_events;
CREATE POLICY "Players read shared events" ON public.calendar_events FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'player') AND (
    visibility = 'team' OR
    (visibility = 'player' AND (related_player_id = public.my_player_id() OR public.my_player_id() = ANY(participant_ids)))
  )
);

INSERT INTO public.calendar_event_private_notes (event_id, notes, created_by)
SELECT id, coach_notes, created_by FROM public.calendar_events WHERE coach_notes IS NOT NULL;
UPDATE public.calendar_events SET coach_notes = NULL WHERE coach_notes IS NOT NULL;
COMMENT ON COLUMN public.calendar_events.coach_notes IS 'DEPRECATED: private notes moved to calendar_event_private_notes to prevent player reads.';

CREATE TRIGGER set_scrim_sessions_updated_at BEFORE UPDATE ON public.scrim_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_scrim_games_updated_at BEFORE UPDATE ON public.scrim_games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_calendar_event_private_notes_updated_at BEFORE UPDATE ON public.calendar_event_private_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_scrim_private_notes_updated_at BEFORE UPDATE ON public.scrim_private_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();