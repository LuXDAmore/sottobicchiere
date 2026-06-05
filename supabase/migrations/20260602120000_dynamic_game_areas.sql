-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — Tavoli & Aree di gioco dinamici (F1: modello dati)        ║
-- ║                                                                            ║
-- ║ Estende lo schema esistente per permettere a chiunque di creare al volo    ║
-- ║ una "stanza" di gioco (a casa, al parco, al circoletto) e farci aggregare  ║
-- ║ gli altri tramite QR, link o codice breve. Riusa il flusso esistente:      ║
-- ║  • stanza dinamica  = venue kind='adhoc' + un tavolo generato              ║
-- ║  • aree di gioco     = nuova tabella `areas` (zone dentro una sessione)    ║
-- ║  • squadre           = `groups` già esistenti (per-tavolo)                 ║
-- ║ Tutto resta anonimo ed effimero: le venue ad-hoc hanno un TTL e vengono    ║
-- ║ rimosse dal cleanup pg_cron (cascade su tables → sessions → ...).          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Venues: tipo (bar preimpostato vs stanza ad-hoc), creatore e TTL ──────────
alter table public.venues
    add column if not exists kind                text not null default 'venue',
    add column if not exists created_by_user_id  uuid references auth.users( id ) on delete set null,
    add column if not exists expires_at          timestamptz;

-- Vincolo sul tipo (idempotente: aggiunto solo se non già presente).
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'venues_kind_check'
          and conrelid = 'public.venues'::regclass
    ) then
        alter table public.venues
            add constraint venues_kind_check check ( kind in ( 'venue', 'adhoc' ) );
    end if;
end $$;

-- Indice per il cleanup delle stanze ad-hoc scadute.
create index if not exists idx_venues_expires_at
    on public.venues ( expires_at )
    where expires_at is not null;

-- ── Tables: codice breve condivisibile e creatore ─────────────────────────────
alter table public.tables
    add column if not exists short_code          text,
    add column if not exists created_by_user_id  uuid references auth.users( id ) on delete set null;

-- Unico tra i tavoli che lo valorizzano (i tavoli preimpostati dei bar restano null).
create unique index if not exists idx_tables_short_code
    on public.tables ( short_code )
    where short_code is not null;

-- ── Areas (zone di gioco dentro una sessione) ─────────────────────────────────
-- Livello opzionale tra la sessione e le squadre: es. "Salotto" e "Cucina" a casa,
-- oppure due tavolini al parco. Un giocatore può stare in un'area (player.area_id).
create table if not exists public.areas (
    id                uuid primary key default gen_random_uuid(),
    table_session_id  uuid not null references public.table_sessions( id ) on delete cascade,
    name              text not null,
    color             text not null,
    ordinal           integer not null default 0,
    created_at        timestamptz not null default now()
);
create index if not exists idx_areas_table_session_id on public.areas ( table_session_id );

-- ── Player Sessions: appartenenza a un'area (oltre al gruppo/squadra) ──────────
alter table public.player_sessions
    add column if not exists area_id uuid references public.areas( id ) on delete set null;

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Come le altre tabelle di dominio: RLS attiva, nessuna policy client → l'accesso
-- passa solo dalle API server (service role). I client non leggono/scrivono `areas`.
alter table public.areas enable row level security;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Cleanup: rimuove anche le stanze ad-hoc scadute                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create or replace function public.cleanup_expired_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    deleted_count integer;
begin
    delete from public.table_sessions where expires_at < now();
    get diagnostics deleted_count = row_count;

    -- Stanze create al volo: alla scadenza si rimuove l'intera venue ad-hoc,
    -- il cascade elimina tavolo, sessioni e dati correlati.
    delete from public.venues
    where kind = 'adhoc'
      and expires_at is not null
      and expires_at < now();

    return deleted_count;
end;
$$;
