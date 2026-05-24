INSERT INTO "venues" ("slug", "name", "config")
VALUES
  ('bar-roma-centro', 'Bar Roma Centro', '{}'::jsonb),
  ('demo', 'Demo Venue', '{}'::jsonb)
ON CONFLICT ("slug") DO UPDATE SET "name" = excluded."name";

INSERT INTO "tables" ("venue_id", "table_number", "qr_token")
SELECT v.id, t.table_number, t.qr_token
FROM "venues" v
JOIN (
  VALUES
    ('bar-roma-centro', 1, 'roma-001'),
    ('bar-roma-centro', 2, 'roma-002'),
    ('bar-roma-centro', 3, 'roma-003'),
    ('demo', 1, 'demo-001')
) AS t(venue_slug, table_number, qr_token)
  ON v.slug = t.venue_slug
ON CONFLICT ("qr_token") DO NOTHING;
