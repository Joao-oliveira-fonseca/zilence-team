CREATE TYPE public.coach_note_category AS ENUM ('player_notes', 'individual_performance', 'scrim_analysis', 'draft_analysis', 'team_strategy', 'mental_behavior', 'general_notes');
CREATE TYPE public.vod_category AS ENUM ('macro', 'micro', 'teamfight', 'positioning', 'draft', 'objectives', 'communication', 'other');

CREATE TABLE public.coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 30000),
  category public.coach_note_category NOT NULL DEFAULT 'general_notes',
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT false,
  author_name text NOT NULL DEFAULT 'Coach',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_notes TO authenticated;
GRANT ALL ON public.coach_notes TO service_role;
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage private coach notes" ON public.coach_notes FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE INDEX coach_notes_updated_idx ON public.coach_notes (pinned DESC, updated_at DESC);
CREATE INDEX coach_notes_player_idx ON public.coach_notes (player_id);

CREATE TABLE public.vod_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  match_label text CHECK (match_label IS NULL OR char_length(match_label) <= 160),
  opponent text CHECK (opponent IS NULL OR char_length(opponent) <= 100),
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  video_url text NOT NULL CHECK (video_url ~ '^https?://' AND char_length(video_url) <= 2000),
  category public.vod_category NOT NULL DEFAULT 'other',
  description text CHECK (description IS NULL OR char_length(description) <= 10000),
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  coach_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vod_reviews TO authenticated;
GRANT ALL ON public.vod_reviews TO service_role;
ALTER TABLE public.vod_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage VOD reviews" ON public.vod_reviews FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared VOD reviews" ON public.vod_reviews FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'player') AND (
    visibility = 'team' OR
    (visibility = 'player' AND player_id = public.my_player_id())
  )
);
CREATE INDEX vod_reviews_date_idx ON public.vod_reviews (review_date DESC);
CREATE INDEX vod_reviews_player_idx ON public.vod_reviews (player_id);

CREATE TABLE public.vod_timestamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.vod_reviews(id) ON DELETE CASCADE,
  seconds integer NOT NULL CHECK (seconds >= 0 AND seconds <= 604800),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  category public.vod_category NOT NULL DEFAULT 'other',
  comment text CHECK (comment IS NULL OR char_length(comment) <= 5000),
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vod_timestamps TO authenticated;
GRANT ALL ON public.vod_timestamps TO service_role;
ALTER TABLE public.vod_timestamps ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_vod_review(_review_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vod_reviews v
    WHERE v.id = _review_id
      AND public.has_role(auth.uid(), 'player')
      AND (
        v.visibility = 'team' OR
        (v.visibility = 'player' AND v.player_id = public.my_player_id())
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_read_vod_review(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_read_vod_review(uuid) TO authenticated;
CREATE POLICY "Coaches manage VOD timestamps" ON public.vod_timestamps FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared VOD timestamps" ON public.vod_timestamps FOR SELECT TO authenticated USING (public.can_read_vod_review(review_id));
CREATE INDEX vod_timestamps_review_idx ON public.vod_timestamps (review_id, seconds);

CREATE TABLE public.draft_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  opponent text CHECK (opponent IS NULL OR char_length(opponent) <= 100),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  team_composition text[] NOT NULL DEFAULT '{}' CHECK (cardinality(team_composition) <= 5),
  opponent_composition text[] NOT NULL DEFAULT '{}' CHECK (cardinality(opponent_composition) <= 5),
  strategy text CHECK (strategy IS NULL OR char_length(strategy) <= 10000),
  matchups text CHECK (matchups IS NULL OR char_length(matchups) <= 10000),
  win_conditions text CHECK (win_conditions IS NULL OR char_length(win_conditions) <= 10000),
  positives text CHECK (positives IS NULL OR char_length(positives) <= 10000),
  problems text CHECK (problems IS NULL OR char_length(problems) <= 10000),
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  coach_name text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.draft_analyses TO authenticated;
GRANT ALL ON public.draft_analyses TO service_role;
ALTER TABLE public.draft_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage draft analyses" ON public.draft_analyses FOR ALL TO authenticated USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared draft analyses" ON public.draft_analyses FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'player') AND (
    visibility = 'team' OR
    (visibility = 'player' AND player_id = public.my_player_id())
  )
);
CREATE INDEX draft_analyses_date_idx ON public.draft_analyses (analysis_date DESC);
CREATE INDEX draft_analyses_player_idx ON public.draft_analyses (player_id);

CREATE TRIGGER set_coach_notes_updated_at BEFORE UPDATE ON public.coach_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_vod_reviews_updated_at BEFORE UPDATE ON public.vod_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_vod_timestamps_updated_at BEFORE UPDATE ON public.vod_timestamps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_draft_analyses_updated_at BEFORE UPDATE ON public.draft_analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();