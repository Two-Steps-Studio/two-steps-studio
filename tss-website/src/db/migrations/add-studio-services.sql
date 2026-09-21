-- Studio services shop (/services): catalogue + paid orders.
-- Idempotent - safe to re-run. Run manually in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS studio_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    category TEXT, -- 'graphics', 'coding', 'discord', 'music', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- user_id is TEXT like every other profiles FK in this repo (and like the
-- table already is if an earlier version of this migration ran); policies
-- compare via ::text so it works whatever type profiles.id/auth.uid() are.
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES studio_services(id) ON DELETE SET NULL,
    stripe_session_id TEXT UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'completed', 'cancelled'
    custom_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_orders_user_id ON service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_service_id ON service_orders(service_id);

-- RLS: all writes go through the service-role key in API routes (which
-- bypasses RLS). Without RLS the anon key could read every order.
ALTER TABLE studio_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active services" ON studio_services;
CREATE POLICY "Anyone can view active services" ON studio_services
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Users can view their own service orders" ON service_orders;
CREATE POLICY "Users can view their own service orders" ON service_orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Initial catalogue, only when the table is empty.
INSERT INTO studio_services (name, description, price, category)
SELECT * FROM (VALUES
    ('Konfiguracja Serwera Discord', 'Kompletna konfiguracja profesjonalnego serwera Discord z botami, rolami i uprawnieniami.', 100.00, 'discord'),
    ('Logo Design', 'Profesjonalne projektowanie logo dopasowane do identyfikacji Twojej marki.', 150.00, 'graphics'),
    ('Custom Illustration', 'Wysokiej jakości cyfrowa ilustracja do Twojego projektu.', 100.00, 'graphics'),
    ('Custom Discord Bot', 'Tworzenie dedykowanych botów Discord z konkretnymi funkcjami i integracjami API.', 300.00, 'coding'),
    ('Website Optimization', 'Audyt wydajności i optymalizacja szybkości dla Twojej strony Next.js.', 200.00, 'coding')
) AS seed(name, description, price, category)
WHERE NOT EXISTS (SELECT 1 FROM studio_services);
