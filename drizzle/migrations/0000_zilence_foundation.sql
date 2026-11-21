
-- Enums
CREATE TYPE public.app_role AS ENUM ('coach', 'player');
CREATE TYPE public.lol_position AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');
CREATE TYPE public.player_status AS ENUM ('active', 'substitute', 'trial', 'inactive');
CREATE TYPE public.visibility_level AS ENUM ('private', 'player', 'team');
CREATE TYPE public.event_type AS ENUM ('championship', 'official_match', 'scrim', 'training', 'team_meeting', 'draft_review', 'other');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.task_category AS ENUM ('individual_training', 'champion_study', 'vod_review', 'macro_study', 'mechanics', 'team_objective', 'other');

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  language text NOT NULL DEFAULT 'pt' CHECK (language IN ('pt', 'es')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_coach(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'coach')
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_coach(auth.uid()));

CREATE POLICY "Users read own profile, coaches read all" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_coach(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Signup: create profile, first account becomes coach
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'coach') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'coach') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Team settings (single team)
CREATE TABLE public.team_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'ZILENCE',
  slogan text NOT NULL DEFAULT 'BUILT TO COMPETE.',
  game text NOT NULL DEFAULT 'League of Legends',
  logo_url text,
  about text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.team_settings TO authenticated;
GRANT ALL ON public.team_settings TO service_role;
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER team_settings_updated_at BEFORE UPDATE ON public.team_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Members read team" ON public.team_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coach') OR public.has_role(auth.uid(), 'player'));
CREATE POLICY "Coaches update team" ON public.team_settings FOR UPDATE TO authenticated
  USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
INSERT INTO public.team_settings (id) VALUES (1);

-- Players
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 40),
  real_name text CHECK (real_name IS NULL OR char_length(real_name) <= 100),
  avatar_url text,
  main_position public.lol_position NOT NULL,
  secondary_position public.lol_position,
  elo text CHECK (elo IS NULL OR char_length(elo) <= 40),
  region text CHECK (region IS NULL OR char_length(region) <= 20),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  status public.player_status NOT NULL DEFAULT 'active',
  user_id uuid UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX players_nickname_unique ON public.players (lower(nickname));
CREATE INDEX players_main_position_idx ON public.players (main_position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.my_player_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Coaches manage players" ON public.players FOR ALL TO authenticated
  USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read own record" ON public.players FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Link / unlink accounts (coach only)
CREATE OR REPLACE FUNCTION public.link_player_account(_player_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_coach(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF public.is_coach(_user_id) THEN
    RAISE EXCEPTION 'account_is_coach';
  END IF;
  IF EXISTS (SELECT 1 FROM public.players WHERE user_id = _user_id AND id <> _player_id) THEN
    RAISE EXCEPTION 'account_already_linked';
  END IF;
  UPDATE public.players SET user_id = _user_id WHERE id = _player_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'player') ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_player_account(_player_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_coach(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT user_id INTO _uid FROM public.players WHERE id = _player_id;
  UPDATE public.players SET user_id = NULL WHERE id = _player_id;
  IF _uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = _uid AND role = 'player';
  END IF;
END;
$$;

-- Accounts waiting for approval (coach only)
CREATE OR REPLACE FUNCTION public.pending_accounts()
RETURNS TABLE (id uuid, email text, display_name text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_coach(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.display_name, p.created_at
    FROM public.profiles p
    WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id)
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_player_account(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.unlink_player_account(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.pending_accounts() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.link_player_account(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_player_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pending_accounts() TO authenticated;

-- Calendar events
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  event_type public.event_type NOT NULL DEFAULT 'other',
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  location text,
  external_link text,
  related_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  coach_notes text,
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX calendar_events_starts_at_idx ON public.calendar_events (starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Coaches manage events" ON public.calendar_events FOR ALL TO authenticated
  USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared events" ON public.calendar_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'player') AND (
      visibility = 'team'
      OR (visibility = 'player' AND related_player_id = public.my_player_id())
    )
  );

-- Team tasks
CREATE TABLE public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description text,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  category public.task_category NOT NULL DEFAULT 'other',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  visibility public.visibility_level NOT NULL DEFAULT 'private',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_tasks_player_idx ON public.team_tasks (player_id);
CREATE INDEX team_tasks_status_idx ON public.team_tasks (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_tasks TO authenticated;
GRANT ALL ON public.team_tasks TO service_role;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER team_tasks_updated_at BEFORE UPDATE ON public.team_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Coaches manage tasks" ON public.team_tasks FOR ALL TO authenticated
  USING (public.is_coach(auth.uid())) WITH CHECK (public.is_coach(auth.uid()));
CREATE POLICY "Players read shared tasks" ON public.team_tasks FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'player') AND (
      (visibility = 'team' AND player_id IS NULL)
      OR (visibility IN ('player', 'team') AND player_id = public.my_player_id())
    )
  );
