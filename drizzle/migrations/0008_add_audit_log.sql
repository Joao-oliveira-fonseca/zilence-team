CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_name text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_actor_idx ON public.audit_log (actor_id);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.is_coach(auth.uid()));

CREATE POLICY "Coaches can record audit log" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (public.is_coach(auth.uid()) AND actor_id = auth.uid());