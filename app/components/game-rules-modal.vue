<template>
    <u-modal
        :open="open"
        :title="game ? `${ game.icon } ${ $t(game.labelKey) }` : ''"
        @update:open="value => emit('update:open', value)"
    >
        <template #body>
            <div v-if="game" class="space-y-5">

                <!-- Meta: giocatori, durata, categoria -->
                <div class="flex flex-wrap gap-3 items-center">
                    <span class="flex gap-1.5 items-center text-muted text-sm">
                        <u-icon class="size-4" name="i-lucide-users" />
                        {{ game.maxPlayers
                            ? $t('lobby.game_players_range', { min: game.minPlayers, max: game.maxPlayers })
                            : $t('lobby.game_min_players', { n: game.minPlayers }) }}
                    </span>
                    <span class="flex gap-1.5 items-center text-muted text-sm">
                        <u-icon class="size-4" name="i-lucide-clock" />
                        {{ $t('lobby.game_duration', { n: game.avgDurationMinutes }) }}
                    </span>
                    <u-badge
                        :color="game.category === 'preserata' ? 'warning' : game.category === 'board' ? 'primary' : 'success'"
                        :label="$t(`lobby.game_category_${ game.category === 'both' ? 'both' : game.category }`)"
                        size="sm"
                        variant="soft"
                    />
                </div>

                <!-- Descrizione breve -->
                <p class="text-highlighted text-sm">
                    {{ $t(game.descriptionKey) }}
                </p>

                <!-- Regole estese -->
                <div>
                    <p class="font-semibold mb-2 text-highlighted text-sm">
                        {{ $t('game.rules_heading') }}
                    </p>
                    <p class="text-muted text-sm whitespace-pre-line">
                        {{ $t(game.rulesKey) }}
                    </p>
                </div>

            </div>
        </template>
    </u-modal>
</template>

<script setup lang="ts">

    defineProps<{
        game: GameDefinition | null;
        open: boolean;
    }>();

    const emit = defineEmits<( e: 'update:open', value: boolean ) => void>();

</script>
