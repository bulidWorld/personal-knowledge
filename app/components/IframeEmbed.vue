<template>
  <div class="relative w-full aspect-video my-3">
    <iframe
      :src="src"
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
      title="Embedded content"
      class="absolute inset-0 w-full h-full rounded-lg border border-slate-200"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ src: string }>()
</script>
