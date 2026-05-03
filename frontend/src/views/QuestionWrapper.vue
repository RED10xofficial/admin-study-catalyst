<template>
    <div>
        <RouterView />
    </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import { useUnitStore } from '@/stores/unit';
import { onUnmounted } from 'vue';
const unitStore = useUnitStore();
onUnmounted(() => {
    if (unitStore.selectedUnitForQuestion) {
        unitStore.setSelectedUnitForQuestion(null);
    }
});
</script>