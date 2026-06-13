<template>
    <u-badge
        :color="meta.color"
        size="sm"
        variant="soft"
    >
        {{ meta.icon }} {{ $t(`lobby.game_category_${ category }`) }}
    </u-badge>
</template>

<script setup lang="ts">

    // Badge categoria gioco: fonte unica per icona + colore token "Notte Italiana",
    // usata sia nelle card della lobby sia nella modale regole.
    const props = defineProps<{ category: GameCategory }>()

          , categoryMeta: Record<GameCategory, { color: 'primary' | 'secondary' | 'success' | 'warning'; icon: string }> = {
              preserata: {
                  color: 'warning',
                  icon: '🍹',
              },
              board: {
                  color: 'primary',
                  icon: '🎲',
              },
              solo: {
                  color: 'secondary',
                  icon: '🧍',
              },
              both: {
                  color: 'success',
                  icon: '✨',
              },
          }

          , meta = computed( () => categoryMeta[ props.category ] );

</script>
