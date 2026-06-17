-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — BOOTSTRAP completo del database (tutte le migration)       ║
-- ║ NON è una migration: concatenazione (ordinata) di supabase/migrations/.     ║
-- ║ Idempotente. SQL Editor → incolla → Run. La via canonica resta db:push.     ║
-- ║ Dopo: Auth → Anonymous sign-ins ON; Realtime → no public access.            ║
-- ║                                                                            ║
-- ║ GENERATO — non modificare a mano: `node scripts/build-bootstrap-sql.mjs`.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260529090000_init_realtime_backend.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — backend Supabase (schema + RLS + Realtime + cleanup)      ║
-- ║                                                                            ║
-- ║ Architettura realtime:                                                     ║
-- ║  • Le API server (service role) scrivono lo stato su Postgres.             ║
-- ║  • Trigger su games / table_sessions / dating_messages chiamano            ║
-- ║    realtime.broadcast_changes() → i client ricevono l'evento sul channel   ║
-- ║    privato "table:<table_session_id>".                                     ║
-- ║  • La presence (chi è online al tavolo) è gestita lato client sullo        ║
-- ║    stesso channel: sostituisce il vecchio registro in-memory dei peer.     ║
-- ║  • I voti restano segreti fino al reveal: i client ascoltano solo il       ║
-- ║    broadcast della riga `games`, mai la tabella `votes`.                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Estensioni ────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto;      -- gen_random_uuid()
create extension if not exists pg_cron;        -- pulizia sessioni scadute

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Schema                                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── Venues ──────────────────────────────────────────────────────────────────
create table if not exists public.venues (
    id          uuid primary key default gen_random_uuid(),
    slug        text not null unique,
    name        text not null,
    config      jsonb not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

-- ── Tables (tavoli fisici per venue) ──────────────────────────────────────────
create table if not exists public.tables (
    id            uuid primary key default gen_random_uuid(),
    venue_id      uuid not null references public.venues( id ) on delete cascade,
    table_number  integer not null,
    qr_token      text not null unique,
    created_at    timestamptz not null default now(),
    unique ( venue_id, table_number )
);

-- ── Table Sessions (sessioni effimere, TTL 8h) ────────────────────────────────
create table if not exists public.table_sessions (
    id              uuid primary key default gen_random_uuid(),
    table_id        uuid not null references public.tables( id ) on delete cascade,
    started_at      timestamptz not null default now(),
    expires_at      timestamptz not null default ( now() + interval '8 hours' ),
    selected_game   text,
    game_mode       text,
    session_mode    text not null default 'board',
    locked_at       timestamptz,
    host_player_id  uuid,
    dating_enabled  boolean not null default false
);
create index if not exists idx_table_sessions_expires_at on public.table_sessions ( expires_at );
create index if not exists idx_table_sessions_table_id on public.table_sessions ( table_id );

-- ── Groups (squadre all'interno di una sessione) ──────────────────────────────
create table if not exists public.groups (
    id                uuid primary key default gen_random_uuid(),
    table_session_id  uuid not null references public.table_sessions( id ) on delete cascade,
    name              text not null,
    color             text not null,
    created_at        timestamptz not null default now()
);

-- ── Player Sessions (giocatori anonimi, effimeri) ─────────────────────────────
-- user_id collega il giocatore all'utente anonimo Supabase (auth.uid): serve sia
-- per le policy RLS sia per autorizzare il channel realtime privato del tavolo.
create table if not exists public.player_sessions (
    id                uuid primary key default gen_random_uuid(),
    table_session_id  uuid not null references public.table_sessions( id ) on delete cascade,
    group_id          uuid references public.groups( id ),
    user_id           uuid references auth.users( id ) on delete set null,
    nickname          text not null,
    color             text not null,
    is_host           boolean not null default false,
    joined_at         timestamptz not null default now()
);
create index if not exists idx_player_sessions_table_session_id on public.player_sessions ( table_session_id );
create index if not exists idx_player_sessions_user_id on public.player_sessions ( user_id );

-- ── Games (stato partita corrente per sessione) ───────────────────────────────
-- Una riga per sessione. Sostituisce lo stato di gioco in-memory: phase, round,
-- domande, punteggi e (solo al reveal) i voti svelati. `voted_count`/`total_count`
-- pilotano la UI durante la votazione senza svelare le scelte.
create table if not exists public.games (
    id                uuid primary key default gen_random_uuid(),
    table_session_id  uuid not null unique references public.table_sessions( id ) on delete cascade,
    kind              text not null default 'thumbs',
    phase             text not null default 'voting',  -- voting | reveal | finished
    round_index       integer not null default 0,
    total_rounds      integer not null default 10,
    questions         jsonb not null default '[]'::jsonb,
    current_question  jsonb,
    scores            jsonb not null default '{}'::jsonb,
    voted_count       integer not null default 0,
    total_count       integer not null default 0,
    revealed_votes    jsonb,                            -- valorizzato solo in fase reveal
    host_player_id    uuid not null,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- ── Votes (segreti: nessun accesso client, solo service role) ─────────────────
create table if not exists public.votes (
    game_id      uuid not null references public.games( id ) on delete cascade,
    round_index  integer not null,
    player_id    uuid not null,
    vote         text not null check ( vote in ( 'up', 'down' ) ),
    created_at   timestamptz not null default now(),
    primary key ( game_id, round_index, player_id )
);

-- ── Dating Messages (messaggi tra tavoli in dating mode) ──────────────────────
create table if not exists public.dating_messages (
    id                     uuid primary key default gen_random_uuid(),
    from_table_session_id  uuid not null references public.table_sessions( id ) on delete cascade,
    to_table_session_id    uuid not null references public.table_sessions( id ) on delete cascade,
    body                   text not null,
    created_at             timestamptz not null default now()
);
create index if not exists idx_dating_messages_to on public.dating_messages ( to_table_session_id, created_at desc );

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Row Level Security                                                         ║
-- ║                                                                            ║
-- ║ Tutto l'accesso ai dati passa dalle API server (service role, bypassa      ║
-- ║ RLS). I client NON leggono/scrivono direttamente le tabelle, tranne la     ║
-- ║ propria riga in player_sessions, necessaria per autorizzare il channel.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.venues          enable row level security;
alter table public.tables          enable row level security;
alter table public.table_sessions  enable row level security;
alter table public.groups          enable row level security;
alter table public.player_sessions enable row level security;
alter table public.games           enable row level security;
alter table public.votes           enable row level security;
alter table public.dating_messages enable row level security;

-- Un utente autenticato può leggere SOLO la propria iscrizione: questo abilita la
-- verifica di appartenenza usata dalle policy del channel realtime qui sotto.
drop policy if exists "own player session is readable" on public.player_sessions;
create policy "own player session is readable"
on public.player_sessions for select to authenticated
using ( user_id = (select auth.uid()) );

grant select on public.player_sessions to authenticated;

-- Nessun'altra policy: con RLS abilitata e nessuna policy, anon/authenticated non
-- possono toccare le altre tabelle via Data API. Il service role lato server sì.

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Realtime Authorization (channel privati)                                   ║
-- ║                                                                            ║
-- ║ Le policy su realtime.messages decidono chi può ricevere/inviare su un     ║
-- ║ topic. realtime.topic() = nome del channel a cui ci si connette.           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Abilita esplicitamente RLS su realtime.messages prima di definire le policy:
-- senza questa istruzione, in ambienti dove RLS non fosse attiva di default,
-- le policy non avrebbero effetto e i channel privati sarebbero accessibili a tutti.
alter table realtime.messages enable row level security;

-- Riceve broadcast + presence sul channel del proprio tavolo ("table:<id>").
drop policy if exists "table members can read channel" on realtime.messages;
create policy "table members can read channel"
on realtime.messages for select to authenticated
using (
    realtime.messages.extension in ( 'broadcast', 'presence' )
    and exists (
        select 1 from public.player_sessions ps
        where ps.user_id = (select auth.uid())
          and 'table:' || ps.table_session_id::text = (select realtime.topic())
    )
);

-- Invia SOLO presence sul channel del proprio tavolo (serve a track()). I broadcast
-- di stato provengono esclusivamente dai trigger DB: vietare l'insert di broadcast
-- ai client impedisce lo spoofing di eventi (es. falsi UPDATE su games).
drop policy if exists "table members can write channel" on realtime.messages;
create policy "table members can write channel"
on realtime.messages for insert to authenticated
with check (
    realtime.messages.extension = 'presence'
    and exists (
        select 1 from public.player_sessions ps
        where ps.user_id = (select auth.uid())
          and 'table:' || ps.table_session_id::text = (select realtime.topic())
    )
);

-- Lobby dating: qualsiasi utente autenticato può solo ASCOLTARE. Gli annunci di
-- disponibilità provengono dal trigger DB; nessun insert lato client (niente spam
-- né eventi falsi). Trasporta solo id di tavoli disponibili, nessun dato sensibile.
drop policy if exists "dating lobby is readable" on realtime.messages;
create policy "dating lobby is readable"
on realtime.messages for select to authenticated
using (
    (select realtime.topic()) = 'dating:lobby'
    and realtime.messages.extension = 'broadcast'
);

drop policy if exists "dating lobby is writable" on realtime.messages;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Broadcast da Database (trigger → client)                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- games: ogni cambio della partita viene spinto sul channel del tavolo.
create or replace function public.broadcast_game_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform realtime.broadcast_changes(
        'table:' || coalesce( new.table_session_id, old.table_session_id )::text,
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
    );
    return null;
end;
$$;

drop trigger if exists trg_broadcast_game_changes on public.games;
create trigger trg_broadcast_game_changes
after insert or update or delete on public.games
for each row execute function public.broadcast_game_changes();

-- table_sessions: cambi di sessione (gioco selezionato/lock/modalità) sul channel
-- del tavolo; se cambia dating_enabled lo si annuncia anche sulla lobby dating.
create or replace function public.broadcast_table_session_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform realtime.broadcast_changes(
        'table:' || new.id::text,
        tg_op, tg_op, tg_table_name, tg_table_schema, new, old
    );

    if tg_op = 'UPDATE' and new.dating_enabled is distinct from old.dating_enabled then
        perform realtime.send(
            jsonb_build_object(
                'table_session_id', new.id,
                'available', new.dating_enabled
            ),
            'dating:availability',
            'dating:lobby',
            true
        );
    end if;

    return null;
end;
$$;

drop trigger if exists trg_broadcast_table_session_changes on public.table_sessions;
create trigger trg_broadcast_table_session_changes
after update on public.table_sessions
for each row execute function public.broadcast_table_session_changes();

-- dating_messages: consegnato sul channel del destinatario e del mittente.
create or replace function public.broadcast_dating_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    perform realtime.broadcast_changes(
        'table:' || new.to_table_session_id::text,
        'dating:message', 'INSERT', tg_table_name, tg_table_schema, new, null
    );
    perform realtime.broadcast_changes(
        'table:' || new.from_table_session_id::text,
        'dating:message', 'INSERT', tg_table_name, tg_table_schema, new, null
    );
    return null;
end;
$$;

drop trigger if exists trg_broadcast_dating_message on public.dating_messages;
create trigger trg_broadcast_dating_message
after insert on public.dating_messages
for each row execute function public.broadcast_dating_message();

-- Mantiene games.updated_at coerente ad ogni update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_games_touch_updated_at on public.games;
create trigger trg_games_touch_updated_at
before update on public.games
for each row execute function public.touch_updated_at();

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Pulizia sessioni scadute (pg_cron, ogni giorno alle 06:00 UTC)             ║
-- ║ Sostituisce il Nitro Scheduled Task, che su Vercel serverless non gira.    ║
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
    return deleted_count;
end;
$$;

-- Idempotente: se la migration viene riapplicata (reset locale, restore, ecc.)
-- rimuove l'eventuale job con lo stesso nome prima di rischedularlo.
select cron.unschedule( 'cleanup-expired-sessions' )
where exists ( select 1 from cron.job where jobname = 'cleanup-expired-sessions' );

select cron.schedule(
    'cleanup-expired-sessions',
    '0 6 * * *',
    $$ select public.cleanup_expired_sessions(); $$
);


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260529090100_seed_demo.sql
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260530120000_player_sessions_unique_user.sql
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260602120000_dynamic_game_areas.sql
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260602130000_dynamic_areas_realtime.sql
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260602140000_adhoc_cleanup_guard.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — Cleanup stanze ad-hoc: guardia sessioni attive            ║
-- ║                                                                            ║
-- ║ Correzione: una venue ad-hoc ha un TTL fisso (creazione + 8h), ma nel suo  ║
-- ║ tavolo può essere creata una sessione PIÙ TARDI (scadenza oltre il TTL     ║
-- ║ della venue). Eliminando la venue scaduta si farebbe cascade su una        ║
-- ║ sessione/partita ancora attiva. Ora la venue ad-hoc viene rimossa solo se  ║
-- ║ scaduta E senza sessioni ancora attive.                                    ║
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

    -- Stanze create al volo: rimuovi la venue ad-hoc scaduta solo se non ha più
    -- sessioni attive, per non interrompere una partita ancora in corso.
    delete from public.venues v
    where v.kind = 'adhoc'
      and v.expires_at is not null
      and v.expires_at < now()
      and not exists (
          select 1
          from public.tables t
          join public.table_sessions s on s.table_id = t.id
          where t.venue_id = v.id
            and s.expires_at >= now()
      );

    return deleted_count;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260603090000_harden_function_grants.sql
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260611090000_games_host_player_index.sql
-- ════════════════════════════════════════════════════════════════════════════

-- FK senza indice segnalata in review: le query che risalgono ai giochi
-- dell'host (e le delete a cascata su player_sessions) farebbero full scan.
create index if not exists idx_games_host_player_id on public.games ( host_player_id );


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260613120000_indexes_and_votes_fk.sql
-- ════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260614120000_turn_based_games.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — giochi a turni interattivi (categorie, dares)             ║
-- ║                                                                            ║
-- ║ I giochi "passa il telefono" diventano multi-dispositivo: lo stato dei     ║
-- ║ turni vive sulla riga `games` (come thumbs) e viene propagato ai client    ║
-- ║ dal trigger di broadcast esistente. Una sola colonna nuova:                ║
-- ║   turn_state = { order: uuid[], turnIndex: int, deckIndex: int }           ║
-- ║     • order      → giocatori in ordine di turno (snapshot all'avvio)        ║
-- ║     • turnIndex  → puntatore al giocatore di turno (mod order.length)       ║
-- ║     • deckIndex  → puntatore nel mazzo `questions` (carta/categoria)        ║
-- ║                                                                            ║
-- ║ Nessuna nuova policy né trigger: la colonna è inclusa automaticamente nel  ║
-- ║ broadcast di `games` (la trigger function spinge l'intera riga new/old).   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.games
    add column if not exists turn_state jsonb;


-- ════════════════════════════════════════════════════════════════════════════
-- ▶ 20260617120000_cleanup_cadence_and_phase_check.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ Sottobicchiere — Cadenza cleanup + vincolo su games.phase                  ║
-- ║                                                                            ║
-- ║ Audit fix:                                                                 ║
-- ║  • M2 — il cleanup pg_cron girava 1 volta al giorno (06:00 UTC) ma le      ║
-- ║    sessioni durano 8h: dati scaduti (sessioni, voti, dating_messages via   ║
-- ║    cascade) restavano fino a ~24h. Passa a cadenza ORARIA: la ritenzione   ║
-- ║    post-scadenza scende da ~24h a ~1h (mitiga anche M4, ritenzione         ║
-- ║    messaggi dating). La funzione di cleanup resta invariata.               ║
-- ║  • E6 — `games.phase` non aveva CHECK: un typo non veniva intercettato.    ║
-- ║    Si fissa l'enum reale: voting | reveal | finished | turn.               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ── M2: cleanup ogni ora (idempotente) ────────────────────────────────────────
select cron.unschedule( 'cleanup-expired-sessions' )
where exists ( select 1 from cron.job where jobname = 'cleanup-expired-sessions' );

select cron.schedule(
    'cleanup-expired-sessions',
    '0 * * * *',
    $$ select public.cleanup_expired_sessions(); $$
);

-- ── E6: vincolo sulle fasi di gioco reali (idempotente) ───────────────────────
-- 'turn' è la fase dei giochi a turni (categorie/dares), aggiunta in
-- 20260614120000_turn_based_games; le altre sono di thumbs.
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'games_phase_check'
          and conrelid = 'public.games'::regclass
    ) then
        alter table public.games
            add constraint games_phase_check
            check ( phase in ( 'voting', 'reveal', 'finished', 'turn' ) );
    end if;
end $$;
