const LOCALE_KEY = "zkcnt-locale";

export default defineNuxtPlugin({
  name: "i18n-locale-persistence",
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n as {
      setLocale: (locale: string) => void;
      locale: string | Ref<string>;
    };

    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "th" || saved === "en") {
      i18n.setLocale(saved);
    }

    watch(
      () => unref(i18n.locale),
      (value) => {
        localStorage.setItem(LOCALE_KEY, value);
      },
    );

    useHead({
      htmlAttrs: {
        lang: computed(() => unref(i18n.locale)),
      },
    });
  },
});
