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

select cron.schedule(
    'cleanup-expired-sessions',
    '0 6 * * *',
    $$ select public.cleanup_expired_sessions(); $$
);
