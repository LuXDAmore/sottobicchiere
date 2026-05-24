<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">
        <template v-if="pending"><u-icon class="animate-spin size-10 text-primary-500" name="i-lucide-loader-2" /></template>
        <template v-else-if="tableError"><div class="max-w-sm text-center w-full"><u-icon class="mb-4 size-12 text-error-500" name="i-lucide-qr-code-off" /><h1 class="font-bold font-display text-2xl text-highlighted">{{ $t('table.invalid_qr_title') }}</h1><p class="mt-2 text-muted text-sm">{{ $t('table.invalid_qr_description') }}</p></div></template>
        <template v-else-if="tableInfo">
            <div class="text-center"><p class="font-semibold text-muted text-sm tracking-wide uppercase">{{ tableInfo.venueName }}</p><h1 class="font-bold font-display text-4xl text-highlighted">{{ $t('table.table_number', { n: tableInfo.tableNumber }) }}</h1></div>
            <div class="max-w-sm w-full"><u-card :ui="{ body: 'flex flex-col gap-5 p-6' }">
                <u-form-group :label="$t('table.nickname_label')"><u-input v-model="nickname" :disabled="joining" /></u-form-group>
                <u-form-group :label="$t('table.group_label')"><u-input v-model="groupName" :disabled="joining" /></u-form-group>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <u-button block :disabled="!nickname.trim() || joining" :label="$t('table.create_table_button')" :loading="joining" size="xl" @click="handleJoin(true)" />
                    <u-button block color="neutral" :disabled="!nickname.trim() || joining" :label="$t('table.join_button')" :loading="joining" size="xl" variant="soft" @click="handleJoin(false)" />
                </div>
                <p v-if="joinError" class="text-center text-error-500 text-sm">{{ joinError }}</p>
            </u-card></div>
        </template>
    </div>
</template>
<script setup lang="ts">
import type { JoinResponse } from '../../../../../shared/types';
const route = useRoute(), { t } = useI18n(), playerStore = usePlayerStore(), localePath = useLocalePath();
const venueSlug = route.params.venue as string, qrToken = route.params.token as string;
const nickname = ref(''), groupName = ref(''), joining = ref(false), joinError = ref<string | null>(null);
const { data: tableInfo, error: tableError, pending } = await useFetch(`/api/${venueSlug}/table/${qrToken}`, { lazy: false });
async function handleJoin(createSession: boolean) {
 if (!nickname.value.trim() || joining.value) return;
 joining.value = true; joinError.value = null;
 try { const data = await $fetch<JoinResponse>(`/api/${venueSlug}/table/${qrToken}/join`, { method:'POST', body:{ nickname:nickname.value.trim(), groupName:groupName.value.trim()||undefined, createSession } }); playerStore.join(data); await navigateTo(localePath(`/${venueSlug}/table/${qrToken}/lobby`)); }
 catch (e: any) { joinError.value = e.data?.message ?? t('table.join_error_generic'); } finally { joining.value = false; }
}
</script>
