import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-05-01",
  devtools: { enabled: true },

  modules: ["@vite-pwa/nuxt", "@nuxtjs/i18n"],

  i18n: {
    locales: [
      { code: "th", name: "ไทย", file: "th.json" },
      { code: "en", name: "English", file: "en.json" },
    ],
    defaultLocale: "th",
    strategy: "no_prefix",
    langDir: "locales",
    detectBrowserLanguage: false,
    experimental: {
      // Prerender locale JSON as static files so offline cold start works
      prerenderMessages: true,
    },
  },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["promptpay-qr", "qrcode", "crc"],
    },
  },

  dir: {
    app: "app",
  },

  future: {
    compatibilityVersion: 4,
  },

  // Avoid Vite pre-transform error for dead #app-manifest import
  // https://github.com/nuxt/nuxt/issues/30461
  experimental: {
    appManifest: false,
  },

  app: {
    head: {
      title: "zKCNT POS",
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
        },
        { name: "description", content: "Offline-First POS System" },
        { name: "theme-color", content: "#4f46e5" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-title", content: "zKCNT POS" },
        { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        },
      ],
    },
  },

  pwa: {
    registerType: "autoUpdate",
    injectRegister: "auto",
    registerWebManifestInRouteRules: true,
    strategies: "injectManifest",
    srcDir: "sw",
    filename: "sw.ts",
    injectManifest: {
      globPatterns: [
        "**/*.{js,css,html,png,svg,ico,woff2,json,webmanifest}",
      ],
    },
    manifest: {
      name: "zKCNT POS - Offline-First Point of Sale",
      short_name: "zKCNT POS",
      description: "Offline-First POS System",
      start_url: "/",
      scope: "/",
      theme_color: "#4f46e5",
      background_color: "#f9fafb",
      display: "standalone",
      orientation: "any",
      icons: [
        {
          src: "/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      shortcuts: [
        {
          name: "Open POS",
          short_name: "POS",
          description: "Open the point of sale screen",
          url: "/pos",
          icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

  devServer: {
    port: Number(process.env.NUXT_DEV_PORT || 4000),
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || "",
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:4000",
      logLevel: process.env.NUXT_PUBLIC_LOG_LEVEL || "",
    },
  },

  ssr: false,

  nitro: {
    // Precache app shell + common entry routes for PWA offline cold start
    prerender: {
      routes: ["/", "/pos", "/login"],
    },
  },
});
