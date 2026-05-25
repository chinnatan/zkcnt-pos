import PocketBase from "pocketbase";

let pb: PocketBase | null = null;

export function usePocketBase(): PocketBase {
  if (pb) return pb;

  const config = useRuntimeConfig();
  pb = new PocketBase(config.public.pocketbaseUrl as string);

  return pb;
}

export function getPocketBase(): PocketBase {
  if (!pb) {
    throw new Error("PocketBase not initialized. Call usePocketBase() first.");
  }
  return pb;
}
