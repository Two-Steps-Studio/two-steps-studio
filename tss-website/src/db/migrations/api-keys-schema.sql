-- ============================================
-- API Keys & Request Logs Schema for TSS
-- Universal API system for external agents and integrations
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

-- API Key Type
CREATE TYPE api_key_type AS ENUM ('live', 'test');

-- API Key Status
CREATE TYPE api_key_status AS ENUM ('active', 'revoked', 'expired');

-- ============================================
-- 2. API KEYS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_id TEXT UNIQUE NOT NULL,                    -- Public identifier (e.g., "tss_live_abc123...")
    key_hash TEXT NOT NULL,                        -- Secure hash of the full API key
    name VARCHAR(100) NOT NULL,                     -- User-defined name (e.g., "Hermes", "Claude Code")
    description TEXT,                                -- Optional description
    owner_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    key_type api_key_type NOT NULL DEFAULT 'live', -- 'live' or 'test'
    status api_key_status NOT NULL DEFAULT 'active',
    scopes TEXT[] NOT NULL DEFAULT '{}',            -- Array of scopes (e.g., ["projects:read", "tasks:read"])
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,            -- Optional expiration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT api_keys_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT api_keys_key_id_format CHECK (key_id ~ '^tss_(live|test)_[a-zA-Z0-9]{32}$'),
    CONSTRAINT api_keys_expires_after_created CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- ============================================
-- 3. API REQUEST LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS api_request_logs (
    id SERIAL PRIMARY KEY,
    api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    method VARCHAR(10) NOT NULL,                    -- HTTP method (GET, POST, etc.)
    endpoint TEXT NOT NULL,                         -- API endpoint (e.g., "/api/v1/projects")
    status_code INTEGER NOT NULL,                   -- HTTP status code
    response_time_ms INTEGER,                        -- Response time in milliseconds
    ip_address TEXT,                                -- Client IP address (sanitized)
    user_agent TEXT,                                -- User agent string
    error_message TEXT,                             -- Error message if request failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT api_request_logs_status_code_range CHECK (status_code >= 100 AND status_code <= 599),
    CONSTRAINT api_request_logs_response_time_positive CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner_id ON api_keys(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_type ON api_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- API Request Logs indexes
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_id ON api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_status_code ON api_request_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_endpoint ON api_request_logs(endpoint);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_api_request_logs_key_created ON api_request_logs(api_key_id, created_at DESC);

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view their own API keys"
ON api_keys FOR SELECT
USING (owner_id = auth.uid()::text);

CREATE POLICY "Users can create their own API keys"
ON api_keys FOR INSERT
WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Users can update their own API keys"
ON api_keys FOR UPDATE
USING (owner_id = auth.uid()::text);

CREATE POLICY "Users can delete their own API keys"
ON api_keys FOR DELETE
USING (owner_id = auth.uid()::text);

-- API Request Logs policies
CREATE POLICY "Users can view their own API request logs"
ON api_request_logs FOR SELECT
USING (user_id = auth.uid()::text);

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to generate a secure API key
CREATE OR REPLACE FUNCTION generate_api_key(p_key_type api_key_type)
RETURNS TEXT AS $$
DECLARE
    random_part TEXT;
    full_key TEXT;
BEGIN
    -- Generate 32-character random string
    random_part := encode(gen_random_bytes(24), 'base64');
    -- Remove non-alphanumeric characters and take first 32
    random_part := regexp_replace(random_part, '[^a-zA-Z0-9]', '', 'g');
    random_part := substring(random_part, 1, 32);
    
    -- Format: tss_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    full_key := 'tss_' || p_key_type || '_' || random_part;
    
    RETURN full_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hash an API key (using bcrypt)
CREATE OR REPLACE FUNCTION hash_api_key(p_api_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Note: This uses pgcrypto's crypt function with bcrypt
    -- In production, you might want to use a more sophisticated hashing
    RETURN crypt(p_api_key, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify an API key hash
CREATE OR REPLACE FUNCTION verify_api_key_hash(p_api_key TEXT, p_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (p_hash = crypt(p_api_key, p_hash));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if an API key is valid (active, not expired)
CREATE OR REPLACE FUNCTION is_api_key_valid(p_key_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    key_status api_key_status;
    key_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT status, expires_at INTO key_status, key_expires_at
    FROM api_keys
    WHERE key_id = p_key_id;
    
    -- Key not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Key is revoked
    IF key_status = 'revoked' THEN
        RETURN FALSE;
    END IF;
    
    -- Key is expired
    IF key_expires_at IS NOT NULL AND key_expires_at < CURRENT_TIMESTAMP THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log API request
CREATE OR REPLACE FUNCTION log_api_request(
    p_api_key_id INTEGER,
    p_user_id TEXT,
    p_method VARCHAR(10),
    p_endpoint TEXT,
    p_status_code INTEGER,
    p_response_time_ms INTEGER,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_request_logs (
        api_key_id,
        user_id,
        method,
        endpoint,
        status_code,
        response_time_ms,
        ip_address,
        user_agent,
        error_message
    ) VALUES (
        p_api_key_id,
        p_user_id,
        p_method,
        p_endpoint,
        p_status_code,
        p_response_time_ms,
        p_ip_address,
        p_user_agent,
        p_error_message
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_used_at timestamp
CREATE OR REPLACE FUNCTION update_api_key_last_used(p_key_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE api_keys
    SET last_used_at = CURRENT_TIMESTAMP
    WHERE key_id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Update updated_at timestamp on api_keys
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_api_keys_update ON api_keys;
CREATE TRIGGER on_api_keys_update
BEFORE UPDATE ON api_keys
FOR EACH ROW
EXECUTE FUNCTION update_api_keys_updated_at();

-- ============================================
-- 8. CLEANUP FUNCTION (for expired/revoked keys)
-- ============================================

-- Function to mark expired keys as expired status
CREATE OR REPLACE FUNCTION mark_expired_keys()
RETURNS INTEGER AS $$
DECLARE
    marked_count INTEGER;
BEGIN
    UPDATE api_keys
    SET status = 'expired'
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS marked_count = ROW_COUNT;
    RETURN marked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- END OF SCHEMA
-- ============================================
