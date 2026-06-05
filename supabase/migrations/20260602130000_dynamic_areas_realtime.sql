-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — Realtime per Aree dinamiche (F4)                          ║
-- ║                                                                            ║
-- ║ Quando cambiano le aree o le iscrizioni dei giocatori (es. qualcuno entra  ║
-- ║ in un'area), invia un segnale leggero `lobby:changed` sul channel del      ║
-- ║ tavolo. I client rifanno il fetch di aree/membri dal server: NON inviamo   ║
-- ║ righe (niente user_id o dati nel payload), coerente con la privacy-first.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function public.notify_lobby_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    sid uuid;
begin
    sid := coalesce( new.table_session_id, old.table_session_id );

    if sid is not null then
        perform realtime.send(
            jsonb_build_object( 'table_session_id', sid ),
            'lobby:changed',
            'table:' || sid::text,
            true
        );
    end if;

    return null;
end;
$$;

drop trigger if exists trg_notify_lobby_areas on public.areas;
create trigger trg_notify_lobby_areas
after insert or update or delete on public.areas
for each row execute function public.notify_lobby_changes();

-- Solo INSERT (join) e UPDATE (es. assegnazione area): le uscite "vive" sono gestite
-- dalla presence, non da DELETE di riga. Le righe player_sessions vengono cancellate
-- solo dal cleanup pg_cron (cascade), quando nessuno è in ascolto: includere DELETE
-- genererebbe solo una raffica inutile di broadcast durante la pulizia.
drop trigger if exists trg_notify_lobby_players on public.player_sessions;
create trigger trg_notify_lobby_players
after insert or update on public.player_sessions
for each row execute function public.notify_lobby_changes();
