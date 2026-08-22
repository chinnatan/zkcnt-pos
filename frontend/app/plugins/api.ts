import { createApiClient, type ApiClient } from "~/lib/api/client";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const api = createApiClient(
    config.public.apiUrl as string,
    config.public.uploadsUrl as string,
  );
  api.setClientInfo(
    String(config.public.appVersion || "0.0.0"),
    String(config.public.buildId || "dev"),
  );

  return {
    provide: {
      api,
    },
  };
});

declare module "#app" {
  interface NuxtApp {
    $api: ApiClient;
  }
}

declare module "vue" {
  interface ComponentCustomProperties {
    $api: ApiClient;
  }
}
