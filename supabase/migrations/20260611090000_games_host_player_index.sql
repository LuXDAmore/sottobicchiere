-- FK senza indice segnalata in review: le query che risalgono ai giochi
-- dell'host (e le delete a cascata su player_sessions) farebbero full scan.
create index if not exists idx_games_host_player_id on public.games ( host_player_id );
