<template>
    <!-- Header condiviso delle pagine di gioco locali (reflex/duello/dares/
         categorie/word-blitz): icona + titolo a sinistra, regole + invito + back
         a destra. Lo slot `meta` ospita extra come il contatore carte. -->
    <header class="border-[var(--ui-border)] border-b flex items-center justify-between px-4 py-3 shrink-0">
        <div class="flex gap-2 items-center min-w-0">
            <span class="text-2xl">
                {{ icon }}
            </span>
            <p class="font-bold font-display text-highlighted truncate">
                {{ title }}
            </p>
        </div>

        <div class="flex gap-2 items-center shrink-0">
            <slot name="meta" />
            <u-button
                :aria-label="$t('lobby.game_rules_aria')"
                color="neutral"
                icon="i-lucide-circle-help"
                size="sm"
                variant="ghost"
                @click="emit('rules')"
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
                @click="emit('back')"
            />
        </div>
    </header>
</template>

<script setup lang="ts">

    defineProps<{
        icon: string;
        title: string;
    }>();

    const emit = defineEmits<{
        back: [];
        rules: [];
    }>();

</script>
