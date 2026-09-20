-- Create studio_services table
CREATE TABLE IF NOT EXISTS studio_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category TEXT, -- 'graphics', 'coding', 'discord', 'music', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create service_orders table to track purchases
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES studio_services(id) ON DELETE SET NULL,
    stripe_session_id TEXT UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'completed', 'cancelled',
    custom_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some initial services for testing
INSERT INTO studio_services (name, description, price, category) VALUES
('Konfiguracja Serwera Discord', 'Kompletna konfiguracja profesjonalnego serwera Discord z botami, rolami i uprawnieniami.', 100.00, 'discord'),
('Logo Design', 'Profesjonalne projektowanie logo dopasowane do identyfikacji Twojej marki.', 150.00, 'graphics'),
('Custom Illustration', 'Wysokiej jakości cyfrowa ilustracja do Twojego projektu.', 100.00, 'graphics'),
('Custom Discord Bot', 'Tworzenie dedykowanych botów Discord z konkretnymi funkcjami i integracjami API.', 300.00, 'coding'),
('Website Optimization', 'Audyt wydajności i optymalizacja szybkości dla Twojej strony Next.js.', 200.00, 'coding');
