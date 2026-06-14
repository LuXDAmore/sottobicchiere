<template>
    <!-- Pill giocatore con pallino colorato: fonte unica usata nelle liste di
         lobby e giochi (prima duplicata ~7 volte). Lo slot trailing serve a casi
         come il voto svelato (👍/👎) accanto al nome. -->
    <span
        class="flex items-center rounded-full transition-all"
        :class="[ sizeClass, ring ? 'ring-2' : '' ]"
        :style="{ backgroundColor: color + '22', color }"
    >
        <span
            class="block rounded-full shrink-0"
            :class="size === 'sm' ? 'size-2' : 'size-2.5'"
            :style="{ backgroundColor: color }"
        />
        <span
            class="font-semibold"
            :class="truncate ? 'max-w-[100px] truncate' : ''"
        >
            {{ nickname }}
        </span>
        <span
            v-if="you"
            class="opacity-60 text-xs"
        >
            {{ $t('lobby.you') }}
        </span>
        <slot />
    </span>
</template>

<script setup lang="ts">

    const props = withDefaults(
              defineProps<{
                  color: string;
                  nickname: string;
                  size?: 'md' | 'sm';
                  you?: boolean;
                  ring?: boolean;
                  truncate?: boolean;
              }>(),
              {
                  size: 'md',
                  you: false,
                  ring: false,
                  truncate: false,
              }
          )

          , sizeClass = computed( () => ( props.size === 'sm'
              ? 'gap-1.5 px-2.5 py-1 text-xs'
              : 'gap-2 px-3 py-2 text-sm' ) );

</script>
