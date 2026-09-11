-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'responder', 'community');
CREATE TYPE public.risk_level AS ENUM ('NORMAL', 'WATCH', 'WARNING', 'CRITICAL');

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  district text DEFAULT 'Devraan',
  home_location_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "claim own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ LOCATIONS ============
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL DEFAULT 'Devraan',
  state text NOT NULL DEFAULT 'Himvat',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  elevation double precision NOT NULL DEFAULT 0,
  population integer NOT NULL DEFAULT 0,
  vulnerability_score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rainfall (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  rainfall_15m double precision NOT NULL DEFAULT 0,
  rainfall_1h double precision NOT NULL DEFAULT 0,
  rainfall_3h double precision NOT NULL DEFAULT 0,
  rainfall_6h double precision NOT NULL DEFAULT 0,
  rainfall_24h double precision NOT NULL DEFAULT 0,
  rainfall_intensity double precision NOT NULL DEFAULT 0,
  forecast_rainfall double precision NOT NULL DEFAULT 0,
  rainfall_change_rate double precision NOT NULL DEFAULT 0
);

CREATE TABLE public.sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id text NOT NULL UNIQUE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  sensor_type text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  status text NOT NULL DEFAULT 'ONLINE',
  connectivity text NOT NULL DEFAULT 'GOOD',
  battery integer NOT NULL DEFAULT 100,
  last_update timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  value double precision NOT NULL,
  unit text NOT NULL,
  quality text NOT NULL DEFAULT 'GOOD',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.historical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  latitude double precision,
  longitude double precision,
  rainfall double precision NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'LOW',
  flood_occurred boolean NOT NULL DEFAULT false,
  landslide_occurred boolean NOT NULL DEFAULT false,
  affected_area double precision NOT NULL DEFAULT 0,
  affected_population integer NOT NULL DEFAULT 0,
  infrastructure_damage text,
  historical_water_level double precision NOT NULL DEFAULT 0
);

CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  flood_probability double precision NOT NULL DEFAULT 0,
  risk_level public.risk_level NOT NULL DEFAULT 'NORMAL',
  severity text NOT NULL DEFAULT 'LOW',
  lead_time_minutes integer,
  confidence double precision NOT NULL DEFAULT 0,
  uncertainty double precision NOT NULL DEFAULT 0,
  model_version text NOT NULL DEFAULT 'aivora-sim-0.9',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  population integer NOT NULL DEFAULT 0,
  houses integer NOT NULL DEFAULT 0,
  schools integer NOT NULL DEFAULT 0,
  hospitals integer NOT NULL DEFAULT 0,
  bridges integer NOT NULL DEFAULT 0,
  roads integer NOT NULL DEFAULT 0,
  shelters integer NOT NULL DEFAULT 0,
  critical_infrastructure integer NOT NULL DEFAULT 0,
  vulnerability_score integer NOT NULL DEFAULT 0
);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  risk_level public.risk_level NOT NULL DEFAULT 'WATCH',
  probability double precision NOT NULL DEFAULT 0,
  lead_time integer,
  message text NOT NULL,
  recommended_action text,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz
);

CREATE TABLE public.roads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_lat double precision NOT NULL,
  start_lng double precision NOT NULL,
  end_lat double precision NOT NULL,
  end_lng double precision NOT NULL,
  accessibility text NOT NULL DEFAULT 'OPEN',
  flood_risk text NOT NULL DEFAULT 'LOW',
  landslide_risk text NOT NULL DEFAULT 'LOW',
  status text NOT NULL DEFAULT 'OPEN',
  shelter_connection text
);

CREATE TABLE public.shelters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  capacity integer NOT NULL DEFAULT 0,
  occupied integer NOT NULL DEFAULT 0,
  available_capacity integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  accessibility text NOT NULL DEFAULT 'ROAD ACCESSIBLE'
);

CREATE TABLE public.evacuation_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_location uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  shelter_id uuid REFERENCES public.shelters(id) ON DELETE CASCADE,
  distance_km double precision NOT NULL DEFAULT 0,
  estimated_time_minutes integer NOT NULL DEFAULT 0,
  flood_risk text NOT NULL DEFAULT 'LOW',
  landslide_risk text NOT NULL DEFAULT 'LOW',
  route_safety_score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE public.emergency_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 1,
  action text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ GRANTS + RLS (simulated prototype data: public read) ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['locations','rainfall','sensors','sensor_readings','historical_events','predictions','vulnerabilities','alerts','roads','shelters','evacuation_routes','emergency_actions']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "public read simulated data" ON public.%I FOR SELECT USING (true)', t);
    EXECUTE format('CREATE POLICY "authenticated write simulated data" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

CREATE INDEX ON public.sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX ON public.predictions (location_id, timestamp DESC);
CREATE INDEX ON public.alerts (status, created_at DESC);

-- ============ SEED: LOCATIONS ============
INSERT INTO public.locations (id, name, district, state, latitude, longitude, elevation, population, vulnerability_score) VALUES
('a0000000-0000-4000-8000-000000000001','Kanora Village','Devraan','Himvat',30.4210,78.5120,1180,8400,88),
('a0000000-0000-4000-8000-000000000002','Bhimtal Ward','Devraan','Himvat',30.4405,78.5390,1310,5200,74),
('a0000000-0000-4000-8000-000000000003','Sarnau Village','Devraan','Himvat',30.4028,78.4870,980,3900,81),
('a0000000-0000-4000-8000-000000000004','Devli Khet','Devraan','Himvat',30.4612,78.5011,1440,2600,58),
('a0000000-0000-4000-8000-000000000005','Rathaura','Devraan','Himvat',30.3902,78.5555,1050,4700,69),
('a0000000-0000-4000-8000-000000000006','Nauli Ward','Devraan','Himvat',30.4487,78.4702,1520,6100,52),
('a0000000-0000-4000-8000-000000000007','Tirsu Village','Devraan','Himvat',30.4155,78.5701,1120,3100,64),
('a0000000-0000-4000-8000-000000000008','Ghansera','Devraan','Himvat',30.3808,78.5090,910,2200,77),
('a0000000-0000-4000-8000-000000000009','Malund Ridge','Devraan','Himvat',30.4703,78.5442,1680,1500,34),
('a0000000-0000-4000-8000-00000000000a','Chopta Basti','Devraan','Himvat',30.4302,78.4955,1240,5600,71);

-- ============ SEED: VULNERABILITIES ============
INSERT INTO public.vulnerabilities (location_id, population, houses, schools, hospitals, bridges, roads, shelters, critical_infrastructure, vulnerability_score)
SELECT id, population, (population/4.2)::int, 2 + (vulnerability_score % 4), 1 + (vulnerability_score % 2), 1 + (vulnerability_score % 3),
       3 + (vulnerability_score % 5), 1 + (vulnerability_score % 3), 2 + (vulnerability_score % 6), vulnerability_score
FROM public.locations;
INSERT INTO public.vulnerabilities (location_id, population, houses, schools, hospitals, bridges, roads, shelters, critical_infrastructure, vulnerability_score)
SELECT id, (population*0.42)::int, (population/9.0)::int, 1, 0, 1, 2, 1, 2, GREATEST(vulnerability_score - 12, 10)
FROM public.locations;

-- ============ SEED: RAINFALL ============
INSERT INTO public.rainfall (location_id, timestamp, rainfall_15m, rainfall_1h, rainfall_3h, rainfall_6h, rainfall_24h, rainfall_intensity, forecast_rainfall, rainfall_change_rate)
SELECT l.id, now() - (g.i || ' minutes')::interval,
       3 + random()*4, 12 + random()*10, 30 + random()*18, 48 + random()*26, 90 + random()*40,
       14 + random()*10, 20 + random()*15, -1 + random()*3
FROM public.locations l, generate_series(0, 110, 10) AS g(i);

-- ============ SEED: SHELTERS ============
INSERT INTO public.shelters (id, name, latitude, longitude, capacity, occupied, available_capacity, status, accessibility) VALUES
('c0000000-0000-4000-8000-000000000001','Kanora Community Shelter 01',30.4288,78.5185,500,280,220,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000002','Bhimtal Higher Secondary School',30.4451,78.5432,420,110,310,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000003','Sarnau Panchayat Hall',30.4075,78.4912,260,60,200,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000004','Devli Ridge Relief Camp',30.4655,78.5060,180,0,180,'STANDBY','FOOT ACCESS ONLY'),
('c0000000-0000-4000-8000-000000000005','Rathaura Health Centre Annexe',30.3948,78.5590,150,95,55,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000006','Nauli Sports Complex',30.4520,78.4749,650,140,510,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000007','Tirsu Forest Rest House',30.4192,78.5745,120,10,110,'STANDBY','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000008','Ghansera Upper School',30.3850,78.5130,300,180,120,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-000000000009','Malund Ridge Safe Zone',30.4740,78.5480,400,20,380,'OPEN','ROAD ACCESSIBLE'),
('c0000000-0000-4000-8000-00000000000a','Chopta Basti Municipal Hall',30.4340,78.4995,350,205,145,'OPEN','ROAD ACCESSIBLE');

-- ============ SEED: SENSORS ============
INSERT INTO public.sensors (sensor_id, location_id, sensor_type, latitude, longitude, status, connectivity, battery, last_update) VALUES
('R01','a0000000-0000-4000-8000-000000000001','Rain Gauge',30.4215,78.5128,'ONLINE','GOOD',94, now()),
('R02','a0000000-0000-4000-8000-000000000002','Rain Gauge',30.4410,78.5395,'ONLINE','GOOD',88, now()),
('R03','a0000000-0000-4000-8000-000000000003','Rain Gauge',30.4030,78.4875,'ONLINE','LIMITED',61, now()),
('R04','a0000000-0000-4000-8000-000000000005','Rain Gauge',30.3910,78.5560,'ONLINE','GOOD',77, now()),
('R05','a0000000-0000-4000-8000-00000000000a','Rain Gauge',30.4308,78.4960,'ONLINE','GOOD',82, now()),
('S01','a0000000-0000-4000-8000-000000000001','Soil Moisture',30.4222,78.5140,'ONLINE','GOOD',72, now()),
('S02','a0000000-0000-4000-8000-000000000002','Soil Moisture',30.4415,78.5402,'ONLINE','GOOD',66, now()),
('S03','a0000000-0000-4000-8000-000000000004','Soil Moisture',30.4620,78.5019,'WARNING','LIMITED',28, now()),
('S04','a0000000-0000-4000-8000-000000000007','Soil Moisture',30.4160,78.5710,'ONLINE','GOOD',91, now()),
('S05','a0000000-0000-4000-8000-000000000008','Soil Moisture',30.3812,78.5098,'ONLINE','GOOD',58, now()),
('W01','a0000000-0000-4000-8000-000000000001','Water Level',30.4198,78.5102,'ONLINE','GOOD',86, now()),
('W02','a0000000-0000-4000-8000-000000000003','Water Level',30.4020,78.4860,'ONLINE','GOOD',74, now()),
('W03','a0000000-0000-4000-8000-000000000005','Water Level',30.3895,78.5548,'ONLINE','LIMITED',49, now()),
('W04','a0000000-0000-4000-8000-000000000008','Water Level',30.3800,78.5082,'OFFLINE','NONE',12, now() - interval '4 minutes'),
('W05','a0000000-0000-4000-8000-00000000000a','Water Level',30.4295,78.4948,'ONLINE','GOOD',80, now()),
('T01','a0000000-0000-4000-8000-000000000002','Temperature/Humidity',30.4400,78.5385,'ONLINE','GOOD',95, now()),
('T02','a0000000-0000-4000-8000-000000000006','Temperature/Humidity',30.4490,78.4708,'ONLINE','GOOD',89, now()),
('T03','a0000000-0000-4000-8000-000000000009','Temperature/Humidity',30.4708,78.5448,'ONLINE','GOOD',93, now()),
('WX1','a0000000-0000-4000-8000-000000000001','Weather Station',30.4230,78.5150,'ONLINE','GOOD',99, now()),
('WX2','a0000000-0000-4000-8000-000000000006','Weather Station',30.4495,78.4715,'ONLINE','GOOD',97, now()),
('WX3','a0000000-0000-4000-8000-000000000004','Weather Station',30.4608,78.5005,'ONLINE','LIMITED',44, now()),
('R06','a0000000-0000-4000-8000-000000000006','Rain Gauge',30.4482,78.4695,'ONLINE','GOOD',85, now()),
('R07','a0000000-0000-4000-8000-000000000009','Rain Gauge',30.4698,78.5435,'ONLINE','GOOD',90, now()),
('S06','a0000000-0000-4000-8000-000000000003','Soil Moisture',30.4035,78.4880,'ONLINE','GOOD',70, now()),
('W06','a0000000-0000-4000-8000-000000000007','Water Level',30.4148,78.5695,'ONLINE','GOOD',68, now()),
('T04','a0000000-0000-4000-8000-000000000005','Temperature/Humidity',30.3906,78.5551,'ONLINE','GOOD',87, now()),
('W07','a0000000-0000-4000-8000-000000000002','Water Level',30.4398,78.5378,'ONLINE','GOOD',79, now());

INSERT INTO public.sensor_readings (sensor_id, timestamp, value, unit, quality)
SELECT s.sensor_id, now() - (g.i || ' minutes')::interval,
  CASE s.sensor_type
    WHEN 'Rain Gauge' THEN 10 + random()*12
    WHEN 'Soil Moisture' THEN 45 + random()*18
    WHEN 'Water Level' THEN 2.4 + random()*0.8
    WHEN 'Temperature/Humidity' THEN 18 + random()*8
    ELSE 12 + random()*10 END,
  CASE s.sensor_type
    WHEN 'Rain Gauge' THEN 'mm/hr' WHEN 'Soil Moisture' THEN '%' WHEN 'Water Level' THEN 'm'
    WHEN 'Temperature/Humidity' THEN 'degC' ELSE 'mixed' END,
  'GOOD'
FROM public.sensors s, generate_series(0, 110, 10) AS g(i);

-- ============ SEED: HISTORICAL EVENTS ============
INSERT INTO public.historical_events (event_date, location_id, latitude, longitude, rainfall, severity, flood_occurred, landslide_occurred, affected_area, affected_population, infrastructure_damage, historical_water_level)
SELECT (date '2019-06-01' + (g.i * 47))::date,
  l.id, l.latitude, l.longitude,
  45 + (g.i * 7 % 120),
  CASE WHEN (g.i * 7 % 120) > 90 THEN 'SEVERE' WHEN (g.i * 7 % 120) > 55 THEN 'MODERATE' ELSE 'LOW' END,
  (g.i % 3) <> 2, (g.i % 4) = 0,
  1.2 + (g.i % 9), 300 + (g.i * 137 % 4200),
  CASE g.i % 5 WHEN 0 THEN 'Bridge approach washed out' WHEN 1 THEN 'Link road blocked by debris'
    WHEN 2 THEN 'Culvert damage, minor' WHEN 3 THEN 'School boundary wall collapse' ELSE 'No major damage reported' END,
  2.9 + (g.i % 7) * 0.28
FROM public.locations l
JOIN generate_series(0, 3) AS g(i) ON (l.vulnerability_score + g.i) % 1 = 0;

-- ============ SEED: PREDICTIONS ============
INSERT INTO public.predictions (location_id, timestamp, flood_probability, risk_level, severity, lead_time_minutes, confidence, uncertainty)
SELECT l.id, now() - (g.i || ' minutes')::interval,
  LEAST(96, l.vulnerability_score * 0.7 + g.i * 0.4 + random()*6),
  CASE WHEN l.vulnerability_score >= 80 THEN 'WARNING'::public.risk_level
       WHEN l.vulnerability_score >= 65 THEN 'WATCH'::public.risk_level
       ELSE 'NORMAL'::public.risk_level END,
  CASE WHEN l.vulnerability_score >= 80 THEN 'HIGH' WHEN l.vulnerability_score >= 65 THEN 'MODERATE' ELSE 'LOW' END,
  40 + (l.vulnerability_score % 40), 84 + random()*10, 5 + random()*6
FROM public.locations l, generate_series(0, 45, 15) AS g(i);

-- ============ SEED: ROADS ============
INSERT INTO public.roads (name, start_lat, start_lng, end_lat, end_lng, accessibility, flood_risk, landslide_risk, status, shelter_connection) VALUES
('R17 Kanora Riverside Link',30.4210,78.5120,30.4288,78.5185,'RESTRICTED','HIGH','MEDIUM','OPEN','Kanora Community Shelter 01'),
('R02 Kanora Ridge Road',30.4210,78.5120,30.4302,78.5210,'OPEN','LOW','LOW','OPEN','Kanora Community Shelter 01'),
('R03 Bhimtal School Approach',30.4405,78.5390,30.4451,78.5432,'OPEN','LOW','LOW','OPEN','Bhimtal Higher Secondary School'),
('R04 Sarnau Nala Crossing',30.4028,78.4870,30.4075,78.4912,'RESTRICTED','HIGH','HIGH','OPEN','Sarnau Panchayat Hall'),
('R05 Devli Upper Track',30.4612,78.5011,30.4655,78.5060,'FOOT ONLY','LOW','MEDIUM','OPEN','Devli Ridge Relief Camp'),
('R06 Rathaura Bypass',30.3902,78.5555,30.3948,78.5590,'OPEN','MEDIUM','LOW','OPEN','Rathaura Health Centre Annexe'),
('R07 Nauli Main Road',30.4487,78.4702,30.4520,78.4749,'OPEN','LOW','LOW','OPEN','Nauli Sports Complex'),
('R08 Tirsu Forest Road',30.4155,78.5701,30.4192,78.5745,'OPEN','LOW','HIGH','OPEN','Tirsu Forest Rest House'),
('R09 Ghansera Low Bridge',30.3808,78.5090,30.3850,78.5130,'RESTRICTED','HIGH','LOW','OPEN','Ghansera Upper School'),
('R10 Malund Ridge Highway',30.4703,78.5442,30.4740,78.5480,'OPEN','LOW','LOW','OPEN','Malund Ridge Safe Zone'),
('R11 Chopta Basti Feeder',30.4302,78.4955,30.4340,78.4995,'OPEN','MEDIUM','MEDIUM','OPEN','Chopta Basti Municipal Hall'),
('R12 Kanora-Chopta Connector',30.4210,78.5120,30.4302,78.4955,'OPEN','MEDIUM','LOW','OPEN','Chopta Basti Municipal Hall'),
('R13 Sarnau Hill Detour',30.4028,78.4870,30.4155,78.4930,'OPEN','LOW','MEDIUM','OPEN','Nauli Sports Complex'),
('R14 Bhimtal River Road',30.4405,78.5390,30.4300,78.5300,'RESTRICTED','HIGH','LOW','CLOSED','Kanora Community Shelter 01'),
('R15 Ghansera Ridge Path',30.3808,78.5090,30.3902,78.5200,'FOOT ONLY','LOW','MEDIUM','OPEN','Ghansera Upper School');

-- ============ SEED: EVACUATION ROUTES ============
INSERT INTO public.evacuation_routes (origin_location, shelter_id, distance_km, estimated_time_minutes, flood_risk, landslide_risk, route_safety_score, status) VALUES
('a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',2.1,7,'HIGH','MEDIUM',46,'OPEN'),
('a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000009',4.2,12,'LOW','LOW',92,'OPEN'),
('a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-00000000000a',3.4,11,'MEDIUM','LOW',71,'OPEN'),
('a0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000002',1.4,5,'LOW','LOW',88,'OPEN'),
('a0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000006',5.6,16,'LOW','LOW',90,'OPEN'),
('a0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000003',1.9,8,'HIGH','HIGH',38,'OPEN'),
('a0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000006',6.3,19,'LOW','MEDIUM',79,'OPEN'),
('a0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000004',1.1,14,'LOW','MEDIUM',68,'OPEN'),
('a0000000-0000-4000-8000-000000000005','c0000000-0000-4000-8000-000000000005',1.6,6,'MEDIUM','LOW',72,'OPEN'),
('a0000000-0000-4000-8000-000000000006','c0000000-0000-4000-8000-000000000006',1.2,4,'LOW','LOW',95,'OPEN'),
('a0000000-0000-4000-8000-000000000007','c0000000-0000-4000-8000-000000000007',1.5,7,'LOW','HIGH',57,'OPEN'),
('a0000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000008',1.8,9,'HIGH','LOW',49,'OPEN'),
('a0000000-0000-4000-8000-000000000009','c0000000-0000-4000-8000-000000000009',0.9,3,'LOW','LOW',97,'OPEN'),
('a0000000-0000-4000-8000-00000000000a','c0000000-0000-4000-8000-00000000000a',1.3,5,'MEDIUM','MEDIUM',74,'OPEN');

-- ============ SEED: ALERTS ============
INSERT INTO public.alerts (location_id, alert_type, risk_level, probability, lead_time, message, recommended_action, status, created_at) VALUES
('a0000000-0000-4000-8000-000000000001','FLASH FLOOD WATCH','WATCH',52,95,'Rainfall intensity rising over Kanora catchment.','Monitor river level and keep response team on standby.','ACTIVE', now() - interval '22 minutes'),
('a0000000-0000-4000-8000-000000000003','LANDSLIDE WATCH','WATCH',48,120,'Saturated slope conditions near Sarnau Nala crossing.','Advise caution on R04 crossing.','ACTIVE', now() - interval '48 minutes'),
('a0000000-0000-4000-8000-000000000008','SENSOR FAILURE','WARNING',0,NULL,'Water Level sensor W04 offline for 4 minutes.','Dispatch field technician; use last known reading.','ACTIVE', now() - interval '4 minutes'),
('a0000000-0000-4000-8000-000000000002','HEAVY RAINFALL','WATCH',41,150,'6-hour rainfall accumulation above seasonal normal.','Prepare shelter readiness at Bhimtal school.','ACKNOWLEDGED', now() - interval '2 hours');

-- ============ SEED: EMERGENCY ACTIONS ============
INSERT INTO public.emergency_actions (location_id, priority, action, reason, status)
SELECT l.id, a.priority, a.action, a.reason, a.status
FROM public.locations l
JOIN (VALUES
  (1,'Issue local warning to affected wards','Rising flood probability in catchment','PENDING'),
  (2,'Pre-position evacuation support for vulnerable households','High exposure population identified','RECOMMENDED')
) AS a(priority, action, reason, status) ON true;
INSERT INTO public.emergency_actions (location_id, priority, action, reason, status) VALUES
('a0000000-0000-4000-8000-000000000001',3,'Restrict traffic on R17 Kanora Riverside Link','Flood risk HIGH on riverside segment','RECOMMENDED'),
('a0000000-0000-4000-8000-000000000001',4,'Deploy emergency response team to Kanora','Highest hazard-exposure product in district','PENDING'),
('a0000000-0000-4000-8000-000000000003',3,'Inspect Sarnau Nala crossing','Combined flood and landslide risk','PENDING');

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensors;