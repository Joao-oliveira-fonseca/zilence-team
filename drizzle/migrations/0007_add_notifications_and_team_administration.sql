CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('evaluation_shared', 'champion_pool_shared', 'task_assigned', 'task_due_soon', 'event_created', 'event_updated', 'vod_shared', 'scrim_shared', 'draft_shared')),
  entity_type text NOT NULL CHECK (entity_type IN ('evaluation', 'champion_pool', 'task', 'event', 'vod', 'scrim', 'draft')),
  entity_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX notifications_recipient_kind_entity_unique ON public.notifications (user_id, kind, entity_type, entity_id);
CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE POLICY "Users read own authorized notifications" ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid() AND (
    (entity_type = 'evaluation' AND EXISTS (SELECT 1 FROM public.player_evaluations e WHERE e.id = entity_id))
    OR (entity_type = 'champion_pool' AND EXISTS (SELECT 1 FROM public.champion_pool c WHERE c.id = entity_id))
    OR (entity_type = 'task' AND EXISTS (SELECT 1 FROM public.team_tasks t WHERE t.id = entity_id))
    OR (entity_type = 'event' AND EXISTS (SELECT 1 FROM public.calendar_events e WHERE e.id = entity_id))
    OR (entity_type = 'vod' AND EXISTS (SELECT 1 FROM public.vod_reviews v WHERE v.id = entity_id))
    OR (entity_type = 'scrim' AND EXISTS (SELECT 1 FROM public.scrim_sessions s WHERE s.id = entity_id))
    OR (entity_type = 'draft' AND EXISTS (SELECT 1 FROM public.draft_analyses d WHERE d.id = entity_id))
  )
);
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid,
  _kind text,
  _entity_type text,
  _entity_id uuid,
  _name text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, kind, entity_type, entity_id, data)
  VALUES (_user_id, _kind, _entity_type, _entity_id, jsonb_build_object('name', left(coalesce(_name, ''), 160)))
  ON CONFLICT (user_id, kind, entity_type, entity_id) DO NOTHING;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_recipients(
  _visibility public.visibility_level,
  _player_id uuid,
  _participant_ids uuid[],
  _kind text,
  _entity_type text,
  _entity_id uuid,
  _name text,
  _team_all boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _recipient uuid;
BEGIN
  IF _visibility = 'private' THEN RETURN; END IF;
  FOR _recipient IN
    SELECT p.user_id
    FROM public.players p
    WHERE p.user_id IS NOT NULL
      AND (
        (_visibility = 'team' AND (_team_all OR p.id = _player_id))
        OR (
          _visibility = 'player'
          AND (p.id = _player_id OR (_participant_ids IS NOT NULL AND p.id = ANY(_participant_ids)))
        )
      )
  LOOP
    PERFORM public.notify_user(_recipient, _kind, _entity_type, _entity_id, _name);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_recipients(public.visibility_level, uuid, uuid[], text, text, uuid, text, boolean) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_task_deadline_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _task record; _player_id uuid := public.my_player_id();
BEGIN
  IF auth.uid() IS NULL OR _player_id IS NULL THEN RETURN; END IF;
  FOR _task IN
    SELECT t.id, t.title
    FROM public.team_tasks t
    WHERE t.status <> 'completed'
      AND t.due_at >= now()
      AND t.due_at <= now() + interval '48 hours'
      AND (
        (t.visibility = 'team' AND t.player_id IS NULL)
        OR (t.visibility IN ('player', 'team') AND t.player_id = _player_id)
      )
  LOOP
    PERFORM public.notify_user(auth.uid(), 'task_due_soon', 'task', _task.id, _task.title);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.sync_task_deadline_notifications() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_task_deadline_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_evaluation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    DELETE FROM public.notifications WHERE entity_type = 'evaluation' AND entity_id = NEW.id AND kind = 'evaluation_shared';
    PERFORM public.notify_recipients(NEW.visibility, NEW.player_id, '{}', 'evaluation_shared', 'evaluation', NEW.id, (SELECT nickname FROM public.players WHERE id = NEW.player_id), false);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_evaluation AFTER INSERT OR UPDATE ON public.player_evaluations FOR EACH ROW EXECUTE FUNCTION public.notify_evaluation_change();

CREATE OR REPLACE FUNCTION public.notify_champion_pool_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    DELETE FROM public.notifications WHERE entity_type = 'champion_pool' AND entity_id = NEW.id AND kind = 'champion_pool_shared';
    PERFORM public.notify_recipients(NEW.visibility, NEW.player_id, '{}', 'champion_pool_shared', 'champion_pool', NEW.id, NEW.champion_name, false);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_champion_pool AFTER INSERT OR UPDATE ON public.champion_pool FOR EACH ROW EXECUTE FUNCTION public.notify_champion_pool_change();

CREATE OR REPLACE FUNCTION public.notify_task_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM NEW.visibility OR OLD.player_id IS DISTINCT FROM NEW.player_id THEN
    DELETE FROM public.notifications WHERE entity_type = 'task' AND entity_id = NEW.id AND kind = 'task_assigned';
    PERFORM public.notify_recipients(NEW.visibility, NEW.player_id, '{}', 'task_assigned', 'task', NEW.id, NEW.title, NEW.player_id IS NULL);
  END IF;
  IF NEW.status = 'completed' OR NEW.due_at IS NULL OR NEW.due_at < now() OR NEW.due_at > now() + interval '48 hours' THEN
    DELETE FROM public.notifications WHERE entity_type = 'task' AND entity_id = NEW.id AND kind = 'task_due_soon';
  ELSE
    PERFORM public.notify_recipients(NEW.visibility, NEW.player_id, '{}', 'task_due_soon', 'task', NEW.id, NEW.title, NEW.player_id IS NULL);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_task AFTER INSERT OR UPDATE ON public.team_tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_change();

CREATE OR REPLACE FUNCTION public.notify_event_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _kind text := CASE WHEN TG_OP = 'INSERT' THEN 'event_created' ELSE 'event_updated' END;
BEGIN
  DELETE FROM public.notifications WHERE entity_type = 'event' AND entity_id = NEW.id AND kind = _kind;
  PERFORM public.notify_recipients(NEW.visibility, NEW.related_player_id, NEW.participant_ids, _kind, 'event', NEW.id, NEW.title, true);
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_event AFTER INSERT OR UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.notify_event_change();

CREATE OR REPLACE FUNCTION public.notify_vod_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    DELETE FROM public.notifications WHERE entity_type = 'vod' AND entity_id = NEW.id AND kind = 'vod_shared';
    PERFORM public.notify_recipients(NEW.visibility, NEW.player_id, '{}', 'vod_shared', 'vod', NEW.id, NEW.title, true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_vod AFTER INSERT OR UPDATE ON public.vod_reviews FOR EACH ROW EXECUTE FUNCTION public.notify_vod_change();

CREATE OR REPLACE FUNCTION public.notify_draft_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    DELETE FROM public.notifications WHERE entity_type = 'draft' AND entity_id = NEW.id AND kind = 'draft_shared';
    PERFORM public.notify_recipients(NEW.visibility, NEW.player_id, '{}', 'draft_shared', 'draft', NEW.id, NEW.title, true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_draft AFTER INSERT OR UPDATE ON public.draft_analyses FOR EACH ROW EXECUTE FUNCTION public.notify_draft_change();

CREATE OR REPLACE FUNCTION public.notify_scrim_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    DELETE FROM public.notifications WHERE entity_type = 'scrim' AND entity_id = NEW.id AND kind = 'scrim_shared';
    PERFORM public.notify_recipients(NEW.visibility, NULL, NEW.participant_ids, 'scrim_shared', 'scrim', NEW.id, NEW.opponent, true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_scrim AFTER INSERT OR UPDATE ON public.scrim_sessions FOR EACH ROW EXECUTE FUNCTION public.notify_scrim_change();

CREATE OR REPLACE FUNCTION public.notify_scrim_game_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _session public.scrim_sessions;
BEGIN
  SELECT * INTO _session FROM public.scrim_sessions WHERE id = NEW.session_id;
  IF _session.id IS NOT NULL AND NEW.result IS NOT NULL THEN
    DELETE FROM public.notifications WHERE entity_type = 'scrim' AND entity_id = _session.id AND kind = 'scrim_shared';
    PERFORM public.notify_recipients(_session.visibility, NULL, _session.participant_ids, 'scrim_shared', 'scrim', _session.id, _session.opponent, true);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notify_scrim_game AFTER INSERT OR UPDATE OF result ON public.scrim_games FOR EACH ROW EXECUTE FUNCTION public.notify_scrim_game_change();

CREATE OR REPLACE FUNCTION public.assign_coach_role(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_coach(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'account_not_found'; END IF;
  IF public.has_role(_user_id, 'player') OR EXISTS (SELECT 1 FROM public.players WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'account_is_player';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'coach') ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_coach_role(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_coach(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT public.has_role(_user_id, 'coach') THEN RAISE EXCEPTION 'not_coach'; END IF;
  IF (SELECT count(*) FROM public.user_roles WHERE role = 'coach') <= 1 THEN RAISE EXCEPTION 'last_coach'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'coach';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assign_coach_role(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.remove_coach_role(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_coach_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_coach_role(uuid) TO authenticated;