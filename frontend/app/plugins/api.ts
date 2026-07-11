import { createApiClient, type ApiClient } from "~/lib/api/client";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const api = createApiClient(
    config.public.apiUrl as string,
    config.public.uploadsUrl as string,
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
