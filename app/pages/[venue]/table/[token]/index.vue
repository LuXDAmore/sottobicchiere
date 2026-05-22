<template>
    <div class="flex flex-col gap-6 items-center justify-center min-h-screen px-4 py-12">

        <!-- Loading state -->
        <template v-if="pending">
            <u-icon
                class="animate-spin size-10 text-primary-500"
                name="i-lucide-loader-2"
            />
        </template>

        <!-- Error state -->
        <template v-else-if="tableError">
            <div class="max-w-sm text-center w-full">
                <u-icon
                    class="mb-4 size-12 text-error-500"
                    name="i-lucide-qr-code-off"
                />
                <h1 class="font-bold font-display text-2xl text-highlighted">
                    {{ $t('table.invalid_qr_title') }}
                </h1>
                <p class="mt-2 text-muted text-sm">
                    {{ $t('table.invalid_qr_description') }}
                </p>
            </div>
        </template>

        <!-- Join form -->
        <template v-else-if="tableInfo">

            <!-- Header -->
            <div class="text-center">
                <div
                    aria-hidden="true"
                    class="bg-primary-500 flex items-center justify-center mb-4 mx-auto rounded-3xl shadow-[var(--shadow-lift)] size-16"
                >
                    <u-icon
                        class="size-8 text-white"
                        name="i-lucide-dice-6"
                    />
                </div>

                <p class="font-semibold text-muted text-sm tracking-wide uppercase">
                    {{ tableInfo.venueName }}
                </p>
                <h1 class="font-bold font-display text-4xl text-highlighted">
                    {{ $t('table.table_number', { n: tableInfo.tableNumber }) }}
                </h1>
            </div>

            <!-- Form card -->
            <div class="max-w-sm w-full">
                <u-card :ui="{ body: 'flex flex-col gap-5 p-6' }">

                    <div class="text-center">
                        <p class="font-semibold text-highlighted">
                            {{ $t('table.join_title') }}
                        </p>
                        <p class="mt-1 text-muted text-sm">
                            {{ $t('table.join_description') }}
                        </p>
                    </div>

                    <u-form-group :label="$t('table.nickname_label')">
                        <u-input
                            v-model="nickname"
                            autocomplete="off"
                            :disabled="joining"
                            maxlength="20"
                            :placeholder="$t('table.nickname_placeholder')"
                            size="xl"
                            spellcheck="false"
                            @keyup.enter="handleJoin"
                        />
                    </u-form-group>

                    <u-form-group
                        :hint="$t('table.group_hint')"
                        :label="$t('table.group_label')"
                    >
                        <u-input
                            v-model="groupName"
                            autocomplete="off"
                            :disabled="joining"
                            maxlength="30"
                            :placeholder="$t('table.group_placeholder')"
                            size="xl"
                            spellcheck="false"
                            @keyup.enter="handleJoin"
                        />
                    </u-form-group>

                    <u-button
                        block
                        :disabled="! nickname.trim() || joining"
                        :label="joining ? $t('table.joining') : $t('table.join_button')"
                        :loading="joining"
                        size="xl"
                        @click="handleJoin"
                    />

                    <p
                        v-if="joinError"
                        class="text-center text-error-500 text-sm"
                    >
                        {{ joinError }}
                    </p>

                </u-card>
            </div>

            <!-- Privacy note -->
            <p class="max-w-xs text-center text-muted text-xs">
                <u-icon
                    class="inline-block mr-1 size-3"
                    name="i-lucide-shield-check"
                />
                {{ $t('welcome.privacy_note') }}
            </p>

        </template>

    </div>
</template>

<script setup lang="ts">

    import type { JoinResponse } from '../../../../../shared/types';

    const route = useRoute()
          , { t } = useI18n()
          , playerStore = usePlayerStore()
          , localePath = useLocalePath()

          , venueSlug = route.params.venue as string
          , qrToken = route.params.token as string

          , nickname = ref( '' )
          , groupName = ref( '' )
          , joining = ref( false )
          , joinError = ref<string | null>( null )

          , { data: tableInfo, error: tableError, pending } = await useFetch(
              `/api/${ venueSlug }/table/${ qrToken }`,
              { lazy: false }
          );

    // If already joined this exact table's session, redirect to lobby
    onMounted( () => {

        if(
            playerStore.isJoined
            && ! playerStore.isExpired
            && playerStore.venueSlug === venueSlug
            && playerStore.qrToken === qrToken
        )
            navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

    } );

    /**
     *
     */
    async function handleJoin() {

        const trimmed = nickname.value.trim();

        if( ! trimmed || joining.value ) return;

        joining.value = true;
        joinError.value = null;

        try {

            const data = await $fetch<JoinResponse>( `/api/${ venueSlug }/table/${ qrToken }/join`, {
                body: {
                    groupName: groupName.value.trim() || undefined,
                    nickname: trimmed,
                },
                method: 'POST',
            } );

            playerStore.join( data );
            await navigateTo( localePath( `/${ venueSlug }/table/${ qrToken }/lobby` ) );

        } catch( exception: unknown ) {

            const fetchError = exception as { data?: { message?: string } };

            joinError.value = fetchError.data?.message ?? t( 'table.join_error_generic' );

        } finally {

            joining.value = false;

        }

    }

    useHead( {
        meta: [
            {
                content: computed( () => t( 'app.description' ) ),
                name: 'description',
            },
        ],
        title: computed( () => ( tableInfo.value
            ? t( 'table.page_title', {
                n: tableInfo.value.tableNumber,
                venue: tableInfo.value.venueName,
            } )
            : t( 'app.name' ) ) ),
    } );

</script>
