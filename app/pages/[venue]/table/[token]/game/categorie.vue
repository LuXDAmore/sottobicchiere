<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <game-header
            icon="🗂️"
            :title="$t('game.categorie.title')"
            @back="goBack"
            @rules="rulesOpen = true"
        />

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

                <!-- Timer (UProgress: colore dinamico in base al tempo residuo) -->
                <div class="w-full">
                    <u-progress
                        :color="timerColor"
                        :max="turnDuration"
                        :model-value="remaining"
                        size="lg"
                    />
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

    // Istante di scadenza del turno corrente (performance.now() + durata): dichiarato
    // prima del blocco reattivo perché la callback dell'intervallo lo legge.
    let endTime = 0;

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
          , secondsLeft = computed( () => Math.ceil( remaining.value / 1000 ) )
          // Colore token per UProgress in base al tempo residuo (verde→ambra→rosso).
          , timerColor = computed<'error' | 'success' | 'warning'>( () => {

              const ratio = remaining.value / turnDuration;

              if( ratio > 0.5 ) return 'success';
              if( ratio > 0.25 ) return 'warning';
              return 'error';

          } )

          // Tick a 100ms guidato da `performance.now()`: il tempo residuo è la
          // differenza reale dall'istante di scadenza, così non deriva quando il
          // browser limita/sospende i timer (mobile o scheda in background).
          , { pause, resume } = useIntervalFn( () => {

              remaining.value = Math.max( 0, Math.round( endTime - performance.now() ) );

              if( remaining.value <= 0 ) {

                  pause();
                  phase.value = 'timeUp';

              }

          }, 100, { immediate: false } );

    /**
     * Arma il timer del turno: fissa la scadenza e riempie il residuo. Idempotente
     * su `resume()` (no-op se già attivo).
     */
    function armTimer() {

        endTime = performance.now() + turnDuration;
        remaining.value = turnDuration;
        resume();

    }

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

        phase.value = 'play';
        armTimer();

    }

    /**
     * Passa il telefono: stessa categoria, timer riarmato per il prossimo giocatore.
     */
    function pass() {

        armTimer();

    }

    /**
     * Cambia categoria a metà giro (timer riarmato): utile se è troppo difficile.
     */
    function changeCategory() {

        pickCategory();
        armTimer();

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
