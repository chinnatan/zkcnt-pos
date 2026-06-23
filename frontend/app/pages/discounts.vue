<script setup lang="ts">
definePageMeta({ middleware: "auth" });

await navigateTo("/promotions", { replace: true });
</script>
