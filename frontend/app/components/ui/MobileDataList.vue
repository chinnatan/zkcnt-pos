<template>
  <div>
    <div class="hidden md:block">
      <slot name="table" />
    </div>
    <div class="flex flex-col gap-3 p-4 md:hidden">
      <slot name="cards" />
    </div>
  </div>
</template>
