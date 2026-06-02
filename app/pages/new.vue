<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">

        <!-- Create form -->
        <template v-if="! room">

            <div class="text-center">
                <div
                    aria-hidden="true"
                    class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-16"
                >
                    <u-icon class="size-8 text-white" name="i-lucide-plus-circle" />
                </div>
                <h1 class="font-bold font-display text-3xl text-highlighted">
                    {{ $t('room.new_title') }}
                </h1>
                <p class="max-w-xs mt-2 mx-auto text-muted text-sm">
                    {{ $t('room.new_description') }}
                </p>
            </div>

            <div class="max-w-sm w-full">
                <u-card :ui="{ body: 'flex flex-col gap-5 p-6' }">

                    <u-form-field :label="$t('room.name_label')">
                        <u-input
                            v-model="name"
                            autocomplete="off"
                            :disabled="creating"
                            maxlength="40"
                            :placeholder="$t('room.name_placeholder')"
                            size="xl"
                            @keyup.enter="handleCreate"
                        />
                    </u-form-field>

                    <u-button
                        block
                        :disabled="creating"
                        icon="i-lucide-plus-circle"
                        :label="$t('room.create_button')"
                        :loading="creating"
                        size="xl"
                        @click="handleCreate"
                    />

                    <p v-if="createError" class="text-center text-error-500 text-sm">
                        {{ createError }}
                    </p>

                </u-card>
            </div>

            <p class="max-w-xs text-center text-muted text-xs">
                <u-icon class="inline-block mr-1 size-3" name="i-lucide-shield-check" />
                {{ $t('room.privacy_note') }}
            </p>

        </template>

        <!-- Share panel -->
        <template v-else>

            <div class="text-center">
                <div
                    aria-hidden="true"
                    class="bg-success-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-16"
                >
                    <u-icon class="size-8 text-white" name="i-lucide-party-popper" />
                </div>
                <h1 class="font-bold font-display text-3xl text-highlighted">
                    {{ $t('room.share_title') }}
                </h1>
                <p class="max-w-xs mt-2 mx-auto text-muted text-sm">
                    {{ $t('room.share_description') }}
                </p>
            </div>

            <!-- QR — always white bg for scanner compatibility -->
            <div class="bg-white p-5 rounded-3xl shadow-[var(--shadow-lift)]">
                <qrcode
                    black-color="#111"
                    :height="200"
                    :value="joinUrl"
                    white-color="#fff"
                    :width="200"
                />
            </div>
            <p class="max-w-xs text-center text-muted text-sm">
                {{ $t('room.share_qr_hint') }}
            </p>

            <div class="max-w-sm space-y-4 w-full">

                <!-- Code -->
                <div>
                    <p class="font-semibold mb-2 text-highlighted text-sm">
                        {{ $t('room.share_code_label') }}
                    </p>
                    <div class="flex gap-2 items-center">
                        <span class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] flex-1 font-bold font-mono py-3 rounded-xl text-2xl text-center text-highlighted tracking-[0.3em]">
                            {{ room.shortCode }}
                        </span>
                        <u-button
                            :aria-label="$t('room.copy_code')"
                            color="neutral"
                            icon="i-lucide-copy"
                            size="xl"
                            variant="soft"
                            @click="copyText(room.shortCode)"
                        />
                    </div>
                </div>

                <!-- Link -->
                <div>
                    <p class="font-semibold mb-2 text-highlighted text-sm">
                        {{ $t('room.share_link_label') }}
                    </p>
                    <div class="flex gap-2 items-center">
                        <span class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] break-all flex-1 px-3 py-3 rounded-xl text-muted text-xs">
                            {{ joinUrl }}
                        </span>
                        <u-button
                            :aria-label="$t('room.copy_link')"
                            color="neutral"
                            icon="i-lucide-copy"
                            size="xl"
                            variant="soft"
                            @click="copyText(joinUrl)"
                        />
                    </div>
                </div>

                <u-button
                    block
                    color="primary"
                    icon="i-lucide-arrow-right"
                    :label="$t('room.enter_table')"
                    size="xl"
                    :to="enterPath"
                />

            </div>

        </template>

    </div>
</template>

<script setup lang="ts">

    const { t } = useI18n()
          , localePath = useLocalePath()
          , toast = useToast()
          , { origin } = useRequestURL()
          , { copy } = useClipboard()
          , name = ref( '' )
          , creating = ref( false )
          , createError = ref<string | null>( null )
          , room = ref<RoomCreatedResponse | null>( null )
          , joinUrl = computed( () => ( room.value ? `${ origin }${ room.value.joinPath }` : '' ) )
          , enterPath = computed( () => ( room.value ? localePath( room.value.joinPath ) : localePath( '/' ) ) );

    /**
     *
     */
    async function handleCreate() {

        if( creating.value ) return;

        creating.value = true;
        createError.value = null;

        const loadingToastId = 'create-room-loading';

        toast.add( {
            id: loadingToastId,
            color: 'primary',
            description: t( 'room.create_pending_toast' ),
            duration: 0,
            icon: 'i-lucide-loader-2',
        } );

        try {

            const data = await $fetch<RoomCreatedResponse>( '/api/rooms', {
                method: 'POST',
                body: { name: name.value.trim() || undefined },
            } );

            room.value = data;

            toast.remove( loadingToastId );
            toast.add( {
                color: 'success',
                description: t( 'room.create_success_toast' ),
                duration: 2500,
                icon: 'i-lucide-check-circle-2',
            } );

        } catch( exception: unknown ) {

            toast.remove( loadingToastId );

            const fetchError = exception as { data?: { message?: string } };

            createError.value = fetchError.data?.message ?? t( 'room.create_error' );
            toast.add( {
                color: 'error',
                description: createError.value,
                duration: 4500,
                icon: 'i-lucide-circle-alert',
            } );

        } finally {

            creating.value = false;

        }

    }

    /**
     *
     * @param value
     */
    async function copyText( value: string ) {

        await copy( value );
        toast.add( {
            color: 'success',
            description: t( 'room.copied_toast' ),
            duration: 1500,
            icon: 'i-lucide-check',
        } );

    }

    useHead( { title: computed( () => t( 'room.new_page_title' ) ) } );

</script>
