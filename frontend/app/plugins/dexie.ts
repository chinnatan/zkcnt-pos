import { db } from "~/lib/db";

export default defineNuxtPlugin(() => {
  return {
    provide: {
      db,
    },
  };
});
