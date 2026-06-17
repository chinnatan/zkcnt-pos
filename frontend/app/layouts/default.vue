<template>
  <div class="flex h-screen overflow-hidden bg-gray-50">
    <LayoutSidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <LayoutHeader />
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <slot />
      </main>
    </div>
    <LayoutPwaInstallBanner />
  </div>
</template>
