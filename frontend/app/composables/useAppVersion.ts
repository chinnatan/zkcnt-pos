export interface HealthResponse {
  status: string;
  version: string;
  build: string;
}

export function useAppVersion() {
  const config = useRuntimeConfig();
  const { $api } = useNuxtApp();

  const appVersion = computed(() => String(config.public.appVersion || "0.0.0"));
  const buildId = computed(() => String(config.public.buildId || "dev"));
  const displayVersion = computed(() => `v${appVersion.value}`);
  const shortBuildId = computed(() => {
    const id = buildId.value;
    return id.length > 7 ? id.slice(0, 7) : id;
  });

  const apiVersion = ref<string | null>(null);
  const apiBuild = ref<string | null>(null);
  const apiLoading = ref(false);

  const versionMatches = computed(() => {
    if (apiVersion.value == null) return null;
    return apiVersion.value === appVersion.value;
  });

  async function fetchApiVersion() {
    apiLoading.value = true;
    try {
      const res = await $api.send<HealthResponse>("/health", { auth: false });
      apiVersion.value = res.version;
      apiBuild.value = res.build;
    } catch {
      apiVersion.value = null;
      apiBuild.value = null;
    } finally {
      apiLoading.value = false;
    }
  }

  return {
    appVersion,
    buildId,
    displayVersion,
    shortBuildId,
    apiVersion: readonly(apiVersion),
    apiBuild: readonly(apiBuild),
    apiLoading: readonly(apiLoading),
    versionMatches,
    fetchApiVersion,
  };
}
