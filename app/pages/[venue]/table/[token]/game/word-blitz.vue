<template>
    <div class="flex flex-col h-screen overflow-hidden">
        <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0">
            <div class="flex gap-2 items-center">
                <span class="text-2xl">⚡</span>
                <p class="font-bold font-display text-highlighted">
                    {{ $t('game.word_blitz.title') }}
                </p>
            </div>

            <u-button
                color="neutral"
                icon="i-lucide-arrow-left"
                :label="$t('game.thumbs.back_lobby')"
                size="sm"
                variant="ghost"
                @click="goBack"
            />
        </header>

        <main class="flex flex-1 flex-col gap-6 items-center justify-center p-4">
            <u-card
                class="max-w-md w-full"
                :ui="{ body: 'p-6 flex flex-col gap-4' }"
            >
                <p class="font-semibold text-highlighted">
                    {{ $t('game.word_blitz.prompt') }}
                </p>
                <p class="font-bold font-display text-4xl text-primary-500">
                    {{ currentLetter }}
                </p>
                <u-input
                    v-model="myWord"
                    :placeholder="$t('game.word_blitz.input_placeholder')"
                    maxlength="20"
                    @keyup.enter="submitWord"
                />
                <u-button
                    :disabled="! myWord.trim()"
                    :label="$t('game.word_blitz.submit')"
                    @click="submitWord"
                />
                <p class="text-muted text-sm">
                    {{ $t('game.word_blitz.local_note') }}
                </p>
            </u-card>

            <u-card
                class="max-w-md w-full"
                :ui="{ body: 'p-6' }"
            >
                <p class="font-semibold mb-2 text-highlighted">
                    {{ $t('game.word_blitz.history') }}
                </p>
                <ul class="flex flex-col gap-1 text-sm">
                    <li
                        v-for="( word, index ) in words"
                        :key="`${ word }-${ index }`"
                    >
                        {{ index + 1 }}. {{ word }}
                    </li>
                    <li
                        v-if="words.length === 0"
                        class="text-muted"
                    >
                        —
                    </li>
                </ul>
            </u-card>
        </main>
    </div>
</template>

<script setup lang="ts">

    definePageMeta( { layout: 'game' } );

    const route = useRoute()
          , localePath = useLocalePath()
          , playerStore = usePlayerStore()

          , { open, close } = useTableSocket()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split( '' )
          , currentLetter = useState<string>(
              `word-blitz-letter:${ venueSlug }:${ qrToken }`,
              () => 'A'
          )
          , myWord = ref( '' )
          , words = useState<string[]>(
              `word-blitz-history:${ venueSlug }:${ qrToken }`,
              () => []
          );

    onMounted( () => {

        if( ! playerStore.isJoined || playerStore.isExpired ) {

            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }` ) );
            return;

        }

        currentLetter.value = letters[ Math.floor( Math.random() * letters.length ) ] ?? 'A';
        open();

    } );

    onUnmounted( () => close() );

    function submitWord() {

        const value = myWord.value.trim();

        if( ! value || ! value.toUpperCase().startsWith( currentLetter.value ) ) return;

        words.value = [ value, ... words.value ].slice( 0, 12 );
        myWord.value = '';
        currentLetter.value = letters[ Math.floor( Math.random() * letters.length ) ] ?? 'A';

    }

    function goBack() {

        navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    }

</script>
