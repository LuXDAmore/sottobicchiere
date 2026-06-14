-- Hardening allineato agli advisor Supabase + integrità referenziale dei voti.
-- Migration additiva e idempotente: solo indici e una FK con cleanup preventivo,
-- nessuna modifica distruttiva di dati validi.

-- ── Integrità: votes.player_id deve puntare a un giocatore reale ──────────────
-- Senza FK un voto poteva restare orfano (giocatore uscito/cleanup) e gonfiare
-- voted_count in recomputeAndMaybeReveal, falsando/bloccando l'auto-reveal del
-- quorum. Si ripuliscono prima eventuali orfani, poi si aggiunge la FK con cascade
-- (un leave/cleanup del giocatore rimuove anche i suoi voti).
delete from public.votes v
where not exists (
    select 1 from public.player_sessions p where p.id = v.player_id
);

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'votes_player_id_fkey'
    ) then
        alter table public.votes
            add constraint votes_player_id_fkey
            foreign key ( player_id ) references public.player_sessions ( id ) on delete cascade;
    end if;
end
$$;

-- Indice di copertura sulla nuova FK (richiesto per il cascade e per i filtri per giocatore).
create index if not exists idx_votes_player_id on public.votes ( player_id );

-- ── Indici su FK non indicizzate (advisor "unindexed foreign keys") ──────────
-- dating_messages: il rate-limit (message.post) e rooms.get filtrano anche su from_*.
create index if not exists idx_dating_messages_from
    on public.dating_messages ( from_table_session_id, created_at desc );

-- venues/tables.created_by_user_id: FK verso auth.users con on delete set null.
create index if not exists idx_venues_created_by
    on public.venues ( created_by_user_id ) where created_by_user_id is not null;

create index if not exists idx_tables_created_by
    on public.tables ( created_by_user_id ) where created_by_user_id is not null;

-- table_sessions: la query più calda del join risolve la sessione attiva più recente
-- per tavolo (eq table_id + order started_at desc + limit 1).
create index if not exists idx_table_sessions_table_started
    on public.table_sessions ( table_id, started_at desc );
