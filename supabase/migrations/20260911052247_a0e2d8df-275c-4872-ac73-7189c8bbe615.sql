CREATE TABLE public.evacuation_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  location_name text NOT NULL,
  risk_level public.risk_level NOT NULL DEFAULT 'CRITICAL',
  risk_score integer NOT NULL DEFAULT 0,
  probability double precision NOT NULL DEFAULT 0,
  lead_time_minutes integer,
  exposed_population integer NOT NULL DEFAULT 0,
  total_population integer NOT NULL DEFAULT 0,
  primary_shelter_name text,
  primary_shelter_distance_km double precision,
  primary_shelter_walk_minutes integer,
  primary_shelter_drive_minutes integer,
  primary_shelter_accessibility text,
  primary_shelter_available integer,
  primary_shelter_lat double precision,
  primary_shelter_lng double precision,
  alternate_shelters jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.evacuation_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evacuation_orders TO authenticated;
GRANT ALL ON public.evacuation_orders TO service_role;

ALTER TABLE public.evacuation_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read evacuation orders"
  ON public.evacuation_orders FOR SELECT USING (true);

CREATE POLICY "authenticated manage evacuation orders"
  ON public.evacuation_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_evacuation_orders_updated_at
  BEFORE UPDATE ON public.evacuation_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.evacuation_orders;