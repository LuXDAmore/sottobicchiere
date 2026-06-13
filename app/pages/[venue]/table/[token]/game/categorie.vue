<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0">
            <div class="flex gap-2 items-center min-w-0">
                <span class="text-2xl">
                    🗂️
                </span>
                <p class="font-bold font-display text-highlighted truncate">
                    {{ $t('game.categorie.title') }}
                </p>
            </div>

            <div class="flex gap-2 items-center shrink-0">
                <u-button
                    :aria-label="$t('lobby.game_rules_aria')"
                    color="neutral"
                    icon="i-lucide-circle-help"
                    size="sm"
                    variant="ghost"
                    @click="rulesOpen = true"
                />
                <table-invite>
                    <u-button
                        :aria-label="$t('invite.trigger_label')"
                        color="neutral"
                        icon="i-lucide-user-plus"
                        size="sm"
                        variant="ghost"
                    />
                </table-invite>
                <u-button
                    color="neutral"
                    icon="i-lucide-arrow-left"
                    :label="$t('game.thumbs.back_lobby')"
                    size="sm"
                    variant="ghost"
                    @click="goBack"
                />
            </div>
        </header>

        <main class="flex flex-1 flex-col items-center justify-center overflow-y-auto p-6">

            <!-- Intro -->
            <div v-if="phase === 'intro'" class="flex flex-col gap-5 items-center max-w-sm text-center">
                <span class="text-6xl">
                    🗂️
                </span>
                <p class="font-bold font-display text-2xl text-highlighted">
                    {{ $t('game.categorie.title') }}
                </p>
                <p class="text-muted">
                    {{ $t('game.categorie.intro') }}
                </p>
                <u-button
                    icon="i-lucide-play"
                    :label="$t('game.categorie.start')"
                    size="xl"
                    @click="start"
                />
            </div>

            <!-- In gioco -->
            <div v-else-if="phase === 'play' && currentCategory" class="flex flex-col gap-8 items-center max-w-sm w-full">
                <div class="text-center">
                    <p class="font-semibold mb-2 text-muted text-sm tracking-wide uppercase">
                        {{ $t('game.categorie.category_heading') }}
                    </p>
                    <p class="font-bold font-display leading-tight text-4xl text-highlighted">
                        {{ locale === 'it' ? currentCategory.it : currentCategory.en }}
                    </p>
                </div>

                <!-- Timer -->
                <div class="w-full">
                    <div class="bg-[var(--ui-border)] h-3 overflow-hidden rounded-full w-full">
                        <div
                            class="duration-100 h-full rounded-full transition-all"
                            :class="timerColor"
                            :style="{ width: `${ timerPercent }%` }"
                        />
                    </div>
                    <p class="font-mono mt-2 text-center text-muted text-sm">
                        {{ secondsLeft }}s
                    </p>
                </div>

                <u-button
                    block
                    icon="i-lucide-arrow-right"
                    :label="$t('game.categorie.pass')"
                    size="xl"
                    trailing
                    @click="pass"
                />
                <u-button
                    color="neutral"
                    icon="i-lucide-shuffle"
                    :label="$t('game.categorie.change_category')"
                    size="sm"
                    variant="ghost"
                    @click="changeCategory"
                />
            </div>

            <!-- Tempo scaduto -->
            <div v-else class="flex flex-col gap-5 items-center max-w-sm text-center">
                <span class="text-6xl">
                    ⏰
                </span>
                <p class="font-bold font-display text-2xl text-highlighted">
                    {{ $t('game.categorie.time_up') }}
                </p>
                <p class="text-muted">
                    {{ $t('game.categorie.time_up_hint') }}
                </p>
                <u-button
                    icon="i-lucide-rotate-ccw"
                    :label="$t('game.categorie.new_category')"
                    size="xl"
                    @click="start"
                />
            </div>
        </main>

        <game-rules-modal v-model:open="rulesOpen" :game="categorieDefinition" />
    </div>
</template>

<script setup lang="ts">

    import type { LocalizedText } from '#shared/utils/party';

    import { CATEGORY_PROMPTS, shuffle } from '#shared/utils/party';

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , localePath = useLocalePath()
          , playerStore = usePlayerStore()
          , { t, locale } = useI18n()

          , { open, close, gameLaunch } = useTableSocket()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , categorieDefinition = getGameDefinition( 'categorie' )
          , rulesOpen = ref( false )

          , turnDuration = 8000
          , phase = ref<'intro' | 'play' | 'timeUp'>( 'intro' )
          , deck = ref<LocalizedText[]>( [] )
          , deckIndex = ref( 0 )
          , remaining = ref( turnDuration )

          , currentCategory = computed<LocalizedText | null>( () => deck.value[ deckIndex.value ] ?? null )
          , timerPercent = computed( () => Math.max( 0, ( remaining.value / turnDuration ) * 100 ) )
          , secondsLeft = computed( () => Math.ceil( remaining.value / 1000 ) )
          , timerColor = computed( () => {

              const ratio = remaining.value / turnDuration;

              if( ratio > 0.5 ) return 'bg-emerald-500';
              if( ratio > 0.25 ) return 'bg-amber-500';
              return 'bg-error-500';

          } )

          // Tick a 100ms: alla scadenza ferma il conteggio e mostra "tempo scaduto".
          , { pause, resume } = useIntervalFn( () => {

              remaining.value -= 100;

              if( remaining.value <= 0 ) {

                  remaining.value = 0;
                  pause();
                  phase.value = 'timeUp';

              }

          }, 100, { immediate: false } );

    /**
     * Pesca la prossima categoria dal mazzo mescolato; a mazzo esaurito rimescola
     * così non finiscono mai le categorie durante una serata. Al rimescolo evita
     * che la prima carta del nuovo mazzo coincida con l'ultima appena mostrata.
     */
    function pickCategory() {

        if( deck.value.length === 0 || deckIndex.value + 1 >= deck.value.length ) {

            const lastShown = currentCategory.value;

            let reshuffled = shuffle( CATEGORY_PROMPTS );

            // Niente ripetizione sul confine tra un mazzo e l'altro (se possibile).
            if( lastShown && reshuffled.length > 1 && reshuffled[ 0 ] === lastShown )
                reshuffled = [ ... reshuffled.slice( 1 ), reshuffled[ 0 ]! ];

            deck.value = reshuffled;
            deckIndex.value = 0;
            return;

        }

        deckIndex.value += 1;

    }

    /**
     * Avvia un nuovo giro su una categoria fresca: timer pieno e conteggio attivo.
     */
    function start() {

        if( deck.value.length === 0 ) {

            deck.value = shuffle( CATEGORY_PROMPTS );
            deckIndex.value = 0;

        } else pickCategory();

        remaining.value = turnDuration;
        phase.value = 'play';
        resume();

    }

    /**
     * Passa il telefono: stessa categoria, timer ripieno per il prossimo giocatore.
     * `resume()` è idempotente (no-op se già attivo): rende la funzione robusta
     * anche se in futuro la si chiamasse da uno stato in cui il timer è fermo.
     */
    function pass() {

        remaining.value = turnDuration;
        resume();

    }

    /**
     * Cambia categoria a metà giro (timer ripieno): utile se è troppo difficile.
     */
    function changeCategory() {

        pickCategory();
        remaining.value = turnDuration;
        resume();

    }

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }

        open();

    } );

    onUnmounted( () => {

        pause();
        close();

    } );

    // L'host ha lanciato un gioco DIVERSO mentre eravamo qui: seguilo.
    watch( () => gameLaunch.value, signal => {

        if( signal && signal.game !== 'categorie' )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    /**
     *
     */
    function goBack() {

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    }

    useHead( { title: computed( () => t( 'game.categorie.title' ) ) } );

</script>
