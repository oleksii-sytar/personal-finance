-- Seed data for development environment
-- Following testing.md and structure.md patterns

-- Insert exchange rates for testing (sample data)
INSERT INTO exchange_rates (currency, date, rate) VALUES
('USD', CURRENT_DATE, 41.25),
('EUR', CURRENT_DATE, 44.80),
('GBP', CURRENT_DATE, 52.30),
('PLN', CURRENT_DATE, 10.15),
('USD', CURRENT_DATE - INTERVAL '1 day', 41.20),
('EUR', CURRENT_DATE - INTERVAL '1 day', 44.75),
('GBP', CURRENT_DATE - INTERVAL '1 day', 52.25),
('PLN', CURRENT_DATE - INTERVAL '1 day', 10.12)
ON CONFLICT (currency, date) DO NOTHING;