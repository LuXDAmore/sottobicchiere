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
            <u-card :ui="{ body: 'p-6' }">
                <u-form
                    class="flex flex-col gap-5"
                    :schema="codeSchema"
                    :state="state"
                    @submit="handleResolve"
                >
                    <u-form-field :label="$t('room.code_label')" name="code">
                        <u-input
                            v-model="state.code"
                            autocapitalize="characters"
                            autocomplete="off"
                            class="w-full"
                            :disabled="resolving"
                            maxlength="8"
                            :placeholder="$t('room.code_placeholder')"
                            size="xl"
                            spellcheck="false"
                        />
                    </u-form-field>

                    <u-button
                        block
                        :disabled="resolving"
                        icon="i-lucide-arrow-right"
                        :label="$t('room.go_button')"
                        :loading="resolving"
                        size="xl"
                        type="submit"
                    />

                    <p v-if="resolveError" class="text-center text-error-500 text-sm">
                        {{ resolveError }}
                    </p>
                </u-form>
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

    import { z } from 'zod';

    import { isValidRoomCode, normalizeRoomCode } from '#shared/utils/room-code';

    const { t } = useI18n()
          , localePath = useLocalePath()
          , toast = useToast()
          // Normalizza (maiuscolo, scarta caratteri estranei) e valida lato client:
          // l'eventuale errore appare sotto il campo tramite UForm/UFormField.
          , codeSchema = z.object( { code: z.string().transform( normalizeRoomCode ).refine( isValidRoomCode, t( 'room.invalid_code' ) ) } )
          , state = reactive( { code: '' } )
          , resolving = ref( false )
          , resolveError = ref<string | null>( null )
          , newRoomPath = computed( () => localePath( '/new' ) );

    /**
     *
     * @param event
     * @param event.data
     * @param event.data.code
     */
    async function handleResolve( event: { data: { code: string } } ) {

        if( resolving.value ) return;

        resolving.value = true;
        resolveError.value = null;

        try {

            const data = await $fetch<ResolvedRoomResponse>( '/api/rooms/resolve', { query: { code: event.data.code } } );

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
