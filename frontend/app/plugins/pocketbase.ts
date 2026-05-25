import PocketBase from "pocketbase";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const pb = new PocketBase(config.public.pocketbaseUrl as string);

  // Restore auth from cookie/localStorage
  if (import.meta.client) {
    const stored = localStorage.getItem("pb_auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        pb.authStore.save(parsed.token, parsed.record);
      } catch {
        localStorage.removeItem("pb_auth");
      }
    }

    pb.authStore.onChange(() => {
      if (pb.authStore.isValid) {
        localStorage.setItem(
          "pb_auth",
          JSON.stringify({
            token: pb.authStore.token,
            record: pb.authStore.record,
          })
        );
      } else {
        localStorage.removeItem("pb_auth");
      }
    });
  }

  return {
    provide: {
      pb,
    },
  };
});
