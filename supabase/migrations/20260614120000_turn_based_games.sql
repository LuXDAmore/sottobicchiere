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
