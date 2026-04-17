-- =============================================================================
-- Fase 2 (opcional): soporte persistente, eventos de producto, monetización
-- NO se ejecuta automáticamente en el arranque de la app.
-- Revisar docs/admin-phase2-data.md antes de aplicar en producción.
-- =============================================================================

-- Mensajes recibidos por formulario de contacto (histórico + cola de soporte)
CREATE TABLE IF NOT EXISTS support_contact_messages (
    message_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    visitor_name VARCHAR(200) NOT NULL,
    visitor_email VARCHAR(254) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
    assigned_to VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_support_contact_created ON support_contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_contact_status ON support_contact_messages (status);

-- Tickets formales (opcional: enlazar hilos o escalaciones)
CREATE TABLE IF NOT EXISTS support_tickets (
    ticket_id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(user_id),
    subject VARCHAR(255) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(32) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed'))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status);

-- Eventos de producto (clickstream / embudos)
CREATE TABLE IF NOT EXISTS product_events (
    event_id BIGSERIAL PRIMARY KEY,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(user_id),
    anon_session_id VARCHAR(64),
    event_name VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_product_events_time ON product_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_name_time ON product_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_user_time ON product_events (user_id, occurred_at DESC);

-- Monetización: planes y suscripción
CREATE TABLE IF NOT EXISTS billing_plans (
    plan_id SERIAL PRIMARY KEY,
    plan_key VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    interval_unit VARCHAR(20) NOT NULL CHECK (interval_unit IN ('month', 'year', 'lifetime')),
    price_cents INT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id),
    plan_id INT NOT NULL REFERENCES billing_plans(plan_id),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP,
    external_ref VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

CREATE TABLE IF NOT EXISTS payment_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(user_id),
    amount_cents INT NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    provider VARCHAR(40) NOT NULL,
    provider_payment_id VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    raw_payload JSONB
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions (user_id, created_at DESC);

-- Auditoría de acciones administrativas
CREATE TABLE IF NOT EXISTS admin_audit_log (
    audit_id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_user_id INT NOT NULL REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(64),
    target_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_time ON admin_audit_log (created_at DESC);
