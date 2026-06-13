<template>
    <div class="flex flex-col h-screen overflow-hidden">

        <!-- Header (pattern condiviso con thumbs/word-blitz) -->
        <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0">
            <div class="flex gap-2 items-center min-w-0">
                <span class="text-2xl">
                    ⚡
                </span>
                <p class="font-bold font-display text-highlighted truncate">
                    {{ $t('game.reflex.title') }}
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

        <!-- Arena: l'intera area è il bersaglio tattile -->
        <main class="flex flex-1 flex-col overflow-hidden">
            <button
                class="flex flex-1 flex-col gap-4 items-center justify-center px-6 text-center transition-colors"
                :class="arenaClass"
                type="button"
                @pointerdown.prevent="onTap"
            >
                <template v-if="phase === 'idle'">
                    <span class="text-6xl">
                        ⚡
                    </span>
                    <p class="font-bold font-display text-2xl text-white">
                        {{ $t('game.reflex.tap_to_start') }}
                    </p>
                    <p class="max-w-xs text-sm text-white/80">
                        {{ $t('game.reflex.hint') }}
                    </p>
                </template>

                <template v-else-if="phase === 'waiting'">
                    <u-icon class="animate-pulse size-12 text-white" name="i-lucide-hourglass" />
                    <p class="font-bold font-display text-2xl text-white">
                        {{ $t('game.reflex.waiting') }}
                    </p>
                </template>

                <template v-else-if="phase === 'go'">
                    <span class="text-6xl">
                        👆
                    </span>
                    <p class="font-black font-display text-5xl text-white tracking-wide">
                        {{ $t('game.reflex.go') }}
                    </p>
                </template>

                <template v-else-if="phase === 'tooSoon'">
                    <span class="text-6xl">
                        🙈
                    </span>
                    <!-- Testo scuro su amber per contrasto AA (bianco su amber è poco leggibile) -->
                    <p class="font-bold font-display text-2xl text-stone-900">
                        {{ $t('game.reflex.too_soon') }}
                    </p>
                    <p class="text-sm text-stone-900/80">
                        {{ $t('game.reflex.again') }}
                    </p>
                </template>

                <template v-else>
                    <p class="font-black font-display text-6xl text-white">
                        {{ $t('game.reflex.result_unit', { ms: lastTime }) }}
                    </p>
                    <p class="text-sm text-white/80">
                        {{ $t('game.reflex.again') }}
                    </p>
                </template>
            </button>

            <!-- Statistiche personali (record + ultimo + tentativi) -->
            <div class="border-[var(--ui-border)] border-t flex items-center justify-around px-4 py-4 shrink-0">
                <div class="text-center">
                    <p class="font-medium text-muted text-xs tracking-wide uppercase">
                        {{ $t('game.reflex.best') }}
                    </p>
                    <p class="font-bold font-display text-highlighted text-xl">
                        {{ ! isMounted || bestTime === null ? '—' : $t('game.reflex.result_unit', { ms: bestTime }) }}
                    </p>
                </div>
                <div class="text-center">
                    <p class="font-medium text-muted text-xs tracking-wide uppercase">
                        {{ $t('game.reflex.last') }}
                    </p>
                    <p class="font-bold font-display text-highlighted text-xl">
                        {{ lastTime === null ? '—' : $t('game.reflex.result_unit', { ms: lastTime }) }}
                    </p>
                </div>
                <div class="text-center">
                    <p class="font-medium text-muted text-xs tracking-wide uppercase">
                        {{ $t('game.reflex.attempts', { n: attempts }) }}
                    </p>
                </div>
            </div>
        </main>

        <game-rules-modal v-model:open="rulesOpen" :game="reflexDefinition" />
    </div>
</template>

<script setup lang="ts">

    definePageMeta( { layout: 'game' } );

    type ReflexPhase = 'go' | 'idle' | 'result' | 'tooSoon' | 'waiting';

    const route = useRoute()
          , localePath = useLocalePath()
          , playerStore = usePlayerStore()
          , { t } = useI18n()

          , { open, close, gameLaunch } = useTableSocket()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , reflexDefinition = getGameDefinition( 'reflex' )
          , rulesOpen = ref( false )

          , phase = ref<ReflexPhase>( 'idle' )
          , lastTime = ref<number | null>( null )
          , attempts = ref( 0 )
          // Record personale persistito localmente (privacy-first: resta sul dispositivo).
          , bestTime = useLocalStorage<number | null>( 'sottobicchiere:reflex-best', null )
          // Il valore di localStorage non esiste in SSR: finché non siamo montati sul
          // client mostriamo il placeholder, evitando l'hydration mismatch del record.
          , isMounted = useMounted()

          , arenaClass = computed( () => {

              switch( phase.value ) {
                  case 'go': {

                      return 'bg-emerald-500 active:bg-emerald-600';

                  }
                  case 'waiting': {

                      return 'bg-error-500';

                  }
                  case 'tooSoon': {

                      return 'bg-amber-500';

                  }
                  case 'result': {

                      return 'bg-primary-500';

                  }
                  default: {

                      return 'bg-primary-600 active:bg-primary-700';

                  }
              }

          } );

    // Timer dell'attesa (verde) e marca temporale di partenza per misurare la reazione.
    let goTimer: ReturnType<typeof setTimeout> | null = null
        , startedAt = 0;

    /**
     * Avvia un nuovo tentativo: fase rossa di attesa, poi verde dopo un ritardo
     * casuale (1.2–4s) così non è prevedibile e non si può anticipare a memoria.
     */
    function startAttempt() {

        phase.value = 'waiting';
        clearGoTimer();

        const delay = 1200 + Math.floor( Math.random() * 2800 );

        goTimer = setTimeout( () => {

            startedAt = performance.now();
            phase.value = 'go';

        }, delay );

    }

    /**
     *
     */
    function clearGoTimer() {

        if( goTimer ) {

            clearTimeout( goTimer );
            goTimer = null;

        }

    }

    /**
     * Un solo gesto guida tutta la macchina a stati: parti, anticipa (fallo),
     * misura la reazione, o ricomincia dopo un risultato.
     */
    function onTap() {

        switch( phase.value ) {
            case 'idle':
            case 'result':
            case 'tooSoon': {

                startAttempt();
                break;

            }
            case 'waiting': {

                // Anticipo: ha toccato prima del verde.
                clearGoTimer();
                phase.value = 'tooSoon';
                break;

            }
            case 'go': {

                const elapsed = Math.round( performance.now() - startedAt );

                lastTime.value = elapsed;
                attempts.value += 1;

                if( bestTime.value === null || elapsed < bestTime.value ) bestTime.value = elapsed;

                phase.value = 'result';
                break;

            }
        // No default
        }

    }

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }

        open();

    } );

    onUnmounted( () => {

        clearGoTimer();
        close();

    } );

    // L'host ha lanciato un gioco DIVERSO mentre eravamo qui: seguilo.
    watch( () => gameLaunch.value, signal => {

        if( signal && signal.game !== 'reflex' )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/game/${ signal.game }` ) );

    } );

    /**
     *
     */
    function goBack() {

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    }

    useHead( { title: computed( () => t( 'game.reflex.title' ) ) } );

</script>
