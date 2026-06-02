<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">

        <div class="text-center">
            <div
                aria-hidden="true"
                class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-16"
            >
                <u-icon class="size-8 text-white" name="i-lucide-keyboard" />
            </div>
            <h1 class="font-bold font-display text-3xl text-highlighted">
                {{ $t('room.join_title') }}
            </h1>
            <p class="max-w-xs mt-2 mx-auto text-muted text-sm">
                {{ $t('room.join_description') }}
            </p>
        </div>

        <div class="max-w-sm w-full">
            <u-card :ui="{ body: 'flex flex-col gap-5 p-6' }">

                <u-form-field :label="$t('room.code_label')">
                    <u-input
                        v-model="code"
                        autocapitalize="characters"
                        autocomplete="off"
                        class="w-full"
                        :disabled="resolving"
                        maxlength="8"
                        :placeholder="$t('room.code_placeholder')"
                        size="xl"
                        spellcheck="false"
                        @keyup.enter="handleResolve"
                    />
                </u-form-field>

                <u-button
                    block
                    :disabled="resolving || normalized.length !== 6"
                    icon="i-lucide-arrow-right"
                    :label="resolving ? $t('room.resolving') : $t('room.go_button')"
                    :loading="resolving"
                    size="xl"
                    @click="handleResolve"
                />

                <p v-if="resolveError" class="text-center text-error-500 text-sm">
                    {{ resolveError }}
                </p>

            </u-card>
        </div>

        <nuxt-link
            class="font-semibold hover:underline text-primary-500 text-sm"
            :to="newRoomPath"
        >
            {{ $t('room.create_instead') }}
        </nuxt-link>

    </div>
</template>

<script setup lang="ts">

    import { normalizeRoomCode } from '#shared/utils/room-code';

    const { t } = useI18n()
          , localePath = useLocalePath()
          , toast = useToast()
          , code = ref( '' )
          , resolving = ref( false )
          , resolveError = ref<string | null>( null )
          , normalized = computed( () => normalizeRoomCode( code.value ) )
          , newRoomPath = computed( () => localePath( '/new' ) );

    /**
     *
     */
    async function handleResolve() {

        const value = normalized.value;

        if( resolving.value || value.length !== 6 ) return;

        resolving.value = true;
        resolveError.value = null;

        try {

            const data = await $fetch<ResolvedRoomResponse>( '/api/rooms/resolve', { query: { code: value } } );

            await navigateTo( localePath( `/${ data.venueSlug }/table/${ data.qrToken }` ) );

        } catch( exception: unknown ) {

            const fetchError = exception as { data?: { message?: string } };

            resolveError.value = fetchError.data?.message ?? t( 'room.not_found' );
            toast.add( {
                color: 'error',
                description: resolveError.value,
                duration: 4000,
                icon: 'i-lucide-circle-alert',
            } );

        } finally {

            resolving.value = false;

        }

    }

    useHead( { title: computed( () => t( 'room.join_page_title' ) ) } );

</script>
