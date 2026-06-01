-- Vincolo UNIQUE su (table_session_id, user_id): garantisce che lo stesso
-- utente Supabase anonimo non possa accumulare più righe nella stessa sessione
-- (refresh, multi-tab, rientro). La join diventa idempotente.
--
-- `ADD CONSTRAINT IF NOT EXISTS` non è sintassi Postgres valida: usiamo un DO
-- block con check su pg_constraint per rendere la migration idempotente.
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'player_sessions_table_session_id_user_id_key'
          and conrelid = 'public.player_sessions'::regclass
    ) then
        alter table public.player_sessions
        add constraint player_sessions_table_session_id_user_id_key
        unique ( table_session_id, user_id );
    end if;
end
$$;
