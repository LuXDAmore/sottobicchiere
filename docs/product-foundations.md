# Sottobicchiere — Product Foundations v0

## UX direction (light + dark, casual but premium)

- Visual tone: playful social gaming, not childish.
- Core mood: rounded geometry, strong contrast CTAs, soft glass cards, micro-animations.
- Accessibility baseline: AA contrast for all text, 44px touch targets, motion-reduced fallbacks.

## Palette candidates

### Palette A (default launch)
- Primary: `#5B5FEF`
- Secondary: `#14B8A6`
- Accent/Reward: `#F59E0B`
- Success: `#22C55E`
- Danger: `#EF4444`
- Neutral light bg: `#F8FAFC`
- Neutral dark bg: `#0B1020`

### Palette B (night bar)
- Primary: `#7C3AED`
- Secondary: `#06B6D4`
- Accent: `#F43F5E`
- Light bg: `#F9FAFB`
- Dark bg: `#09090B`

## Interaction patterns

1. Table onboarding
- QR on physical table + direct link fallback on all screens.
- Nickname + optional group name in one compact card.
- Session banner explaining anonymous temporary data.

2. Lobby
- Live players chips with color identity.
- Game cards: players needed, duration, tone (party/strategy/family).
- Host action buttons pinned at bottom on mobile.

3. Game loop template
- Waiting room → round phase → reveal phase → results → replay.
- Keep round timer optional for each game mode.

## First game (already in progress): Thumbs

- Type: async opinion voting game.
- Rounds: 5 default.
- Score: points for majority alignment (party mode) or minority bonus (hard mode in future).
- Realtime sync via table websocket channel.

## Suggested next games backlog

1. "Guess Who Drank" (party)
2. "Mini Briscola" (cards)
3. "Word Blitz" (family)
4. "Table Tactics" (light strategy)

## Venue admin roadmap

- QR/table management dashboard by venue domain.
- Custom challenges with rewards and expiration.
- Privacy-safe analytics (aggregated, non-identifying).

