-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — Hardening funzioni (Supabase advisors)                    ║
-- ║                                                                            ║
-- ║ Le funzioni di dominio non devono essere invocabili via PostgREST RPC dai  ║
-- ║ ruoli anon/authenticated:                                                  ║
-- ║  • le trigger function (broadcast_*, notify_lobby_changes, touch_updated)  ║
-- ║    sono pensate solo per i trigger e i trigger scattano comunque (non       ║
-- ║    dipendono dal privilegio EXECUTE del ruolo chiamante);                   ║
-- ║  • cleanup_expired_sessions gira da pg_cron (ruolo owner) e non deve essere ║
-- ║    chiamabile da un client.                                                 ║
-- ║ In più fissiamo search_path su touch_updated_at e aggiungiamo un indice di  ║
-- ║ copertura sulla FK groups.table_session_id (interrogata da /groups).        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- search_path esplicito anche su touch_updated_at (coerente con le altre funzioni).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Chiude l'esposizione RPC: l'owner mantiene EXECUTE (trigger + pg_cron continuano a funzionare).
revoke execute on function
    public.broadcast_game_changes(),
    public.broadcast_table_session_changes(),
    public.broadcast_dating_message(),
    public.notify_lobby_changes(),
    public.touch_updated_at(),
    public.cleanup_expired_sessions()
from public, anon, authenticated;

-- Indice di copertura sulla FK groups.table_session_id (filtrata da GET /groups e dal cascade).
create index if not exists idx_groups_table_session_id on public.groups ( table_session_id );
