<template>
  <div class="flex h-dvh overflow-hidden bg-gray-50">
    <LayoutSidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <LayoutHeader />
      <main class="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <slot />
      </main>
    </div>
    <LayoutMobileBottomNav />
    <LayoutPwaInstallBanner />
  </div>
</template>
