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
