<template>
    <!-- Banner stato connessione realtime: visibile solo quando NON si è connessi.
         Condiviso da lobby e pagine di gioco (prima duplicato). -->
    <div
        v-if="status !== 'OPEN'"
        class="flex gap-2 items-center justify-between px-4 py-2 shrink-0 text-sm"
        :class="status === 'CONNECTING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-error-500/10 text-error-500'"
    >
        <div class="flex gap-2 items-center">
            <u-icon
                class="size-4"
                :class="status !== 'CLOSED' ? 'animate-spin' : ''"
                name="i-lucide-loader-2"
            />
            {{ status === 'CONNECTING' ? $t('lobby.connecting') : $t('lobby.disconnected') }}
        </div>
        <u-button
            v-if="status === 'CLOSED'"
            color="neutral"
            icon="i-lucide-refresh-cw"
            :label="$t('lobby.reconnect')"
            size="xs"
            variant="ghost"
            @click="emit('reconnect')"
        />
    </div>
</template>

<script setup lang="ts">

    defineProps<{ status: 'CLOSED' | 'CONNECTING' | 'OPEN' }>();

    const emit = defineEmits<( e: 'reconnect' ) => void>();

</script>
