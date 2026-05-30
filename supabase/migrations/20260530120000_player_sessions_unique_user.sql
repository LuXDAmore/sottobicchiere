-- Vincolo UNIQUE su (table_session_id, user_id): garantisce che lo stesso
-- utente Supabase anonimo non possa accumulare più righe nella stessa sessione
-- (refresh, multi-tab, rientro). La join diventa idempotente: basta restituire
-- la riga esistente invece di inserirne una nuova.
alter table public.player_sessions
add constraint if not exists player_sessions_table_session_id_user_id_key
unique ( table_session_id, user_id );
