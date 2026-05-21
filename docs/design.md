# Design System — Sottobicchiere "Notte Italiana"

Ispirato da: Jackbox Games, Kahoot, Among Us, Gartic Phone.
Estetica: aperitivo chic. Non discoteca, non sala giochi anni '80. Bar moderno, all-ages.

## Principi di design

1. **Privacy visibile**: comunicare "nessun account necessario" nella landing
2. **Onboarding ≤ 30 secondi**: QR → nickname → vedi gli altri → gioca
3. **Touch-first**: tap target minimi 52×52px (mani instabili nei bar = realtà)
4. **Contrasto elevato**: minimo 4.5:1, ideale 7:1 — luci bar possono essere difficili
5. **Icon + label**: mai azione solo icon su elementi primari
6. **Feedback istantaneo**: ogni tap deve rispondere in ≤ 16ms (un frame)
7. **Confetti con parsimonia**: solo su vittorie/completamenti, mai su ogni click

## Palette colori

### Notte Italiana — Light Mode

| Token | Hex | Uso |
|-------|-----|-----|
| Primary | `#4F46E5` (Indigo-600) | CTA, pulsanti, highlight |
| Secondary | `#8B5CF6` (Violet-500) | Azioni secondarie, player colors |
| Accent | `#F59E0B` (Amber-500) | Reward, premi, gamification, monete |
| Success | `#10B981` (Emerald-500) | Risposta corretta, vittoria |
| Error | `#EF4444` (Red-500) | Risposta sbagliata, errore |
| BG | `#FAFAF9` (Stone-50) | Sfondo pagina — caldo, non freddo |
| Surface | `#FFFFFF` | Card, modal |
| Text | `#44403C` (Stone-700) | Testo principale |
| Text muted | `#78716C` (Stone-500) | Testo secondario |

### Notte Italiana — Dark Mode

| Token | Hex | Uso |
|-------|-----|-----|
| Primary | `#818CF8` (Indigo-400) | CTA in dark |
| Secondary | `#A78BFA` (Violet-400) | Azioni secondarie in dark |
| Accent | `#FCD34D` (Amber-300) | Reward in dark |
| Success | `#34D399` (Emerald-400) | |
| Error | `#F87171` (Red-400) | |
| BG | `#1C1917` (Stone-900) | Sfondo caldo near-black |
| Surface | `#292524` (Stone-800) | Card surface |
| Text | `#E7E5E4` (Stone-200) | Testo principale |
| Text muted | `#A8A29E` (Stone-400) | Testo secondario |

**Perché Stone dark invece di Slate/Navy**: il warm near-black (stone) è più accogliente nell'ambiente bar con luci calde rispetto al freddo navy. Riduce l'affaticamento visivo in sessioni lunghe.

### Palette colori giocatori (identità)

8 colori assegnati automaticamente al join (pattern Among Us):

```
#6366F1  Indigo    #8B5CF6  Violet
#EC4899  Pink      #F59E0B  Amber
#10B981  Emerald   #06B6D4  Cyan
#F97316  Orange    #EF4444  Red
```

Ogni giocatore ha UN colore usato ovunque: avatar, riga punteggio, etichetta azione.

## Tipografia

| Font | Uso | Peso |
|------|-----|------|
| **Fredoka** | Titoli, punteggi, game titles, logo | 700 |
| **Nunito** | Body UI, pulsanti, label, form | 400, 600 |
| **Space Grotesk** | Room code, numeri punteggio, timer | 400, 700 |

Tutti Google Fonts (free, inclusi via `@nuxt/fonts`).

`Space Grotesk` con `font-variant-numeric: tabular-nums` per evitare jitter sui punteggi in aggiornamento.

Dimensione minima body: **16px**.

## Motion & Animazioni

Principio: ogni azione ottiene feedback entro 16ms (un frame).

### Tabella animazioni

| Trigger | Animazione | Durata | Libreria |
|---------|-----------|--------|----------|
| Tap pulsante | Scale 0.96 → spring | 50ms | CSS |
| Risposta corretta | Pulse verde + expand | 400ms | CSS |
| Risposta sbagliata | Flash rosso + shake orizzontale | 300ms | CSS |
| Punteggio aggiornato | Odometer roll | 500ms | `@vueuse/motion` |
| Giocatore entra lobby | Slide-in basso + bounce | 350ms | `@vueuse/motion` |
| Timer ultimi 5s | Rosso + ring pulsante | per tick | CSS |
| Vittoria round | Confetti burst | 2s, poi clear | canvas-confetti |
| Entrata pagina | Fade + slide-up | 200ms | Vue transitions |
| Badge/achievement | Scale 0→1.1→1 spring | 400ms | `@vueuse/motion` |

### Regole motion

- `prefers-reduced-motion`: ogni animazione deve rispettarla
- Mai bloccare input durante animazione
- `@vueuse/motion` per component entrance e reward sequences
- CSS spring per micro-interactions (più performante)
- Lenis per smooth scroll (già configurato)
- Confetti SOLO su vittorie/completamenti

## Componenti UI pattern

### Lobby screen
- Grid avatar con pop-in animato al join
- Ring countdown circolare (non barra lineare)
- Indicatore "X di N pronti" con progress animato
- Pulsante "Inizia" (evidenziato solo quando tutti pronti, o dopo timeout)

### Game screen
- UNA azione primaria per schermo (Jackbox pattern)
- HUD mini-punteggi collassabile durante il gioco
- Full-screen durante gameplay (layout `game.vue`)
- Timer prominente con urgency animation

### Player card
- Avatar circolare con colore identità prominent
- Nickname in Fredoka bold
- Punteggio in Space Grotesk tabular

### Room code
- Font Space Grotesk grande e bold
- Lettera per lettera con leggero tracking
- Bottone copia accanto

## Iconografia

Set Lucide (già configurato in Nuxt UI). Stile: outline, consistent stroke width.

Icone chiave per gaming:
- `i-lucide-qr-code` — scan QR
- `i-lucide-users` — lobby giocatori
- `i-lucide-trophy` — vittoria/premi
- `i-lucide-dice-6` — giochi
- `i-lucide-timer` — countdown
- `i-lucide-zap` — challenge venue

## Accessibilità

- Nuxt UI è accessibility-first by default (ARIA, keyboard navigation)
- Focus-visible visibile con outline indigo
- Skip link per screen reader
- Testi alternativi per avatar e icone decorative
