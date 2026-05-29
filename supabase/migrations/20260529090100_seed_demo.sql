-- Seed del tavolo demo pubblico (path /demo/table/demo-001).
-- Con Supabase sempre raggiungibile non serve più il fallback in-memory:
-- la demo passa dal flusso normale come una qualunque sessione di tavolo.

insert into public.venues ( id, slug, name )
values ( '00000000-0000-4000-8000-0000000000d0', 'demo', 'Demo Venue' )
on conflict ( slug ) do nothing;

insert into public.tables ( id, venue_id, table_number, qr_token )
values (
    '00000000-0000-4000-8000-0000000000d1',
    '00000000-0000-4000-8000-0000000000d0',
    1,
    'demo-001'
)
on conflict ( qr_token ) do nothing;
