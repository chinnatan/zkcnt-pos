export function useFileUrl() {
  const { $api } = useNuxtApp();

  function getFileUrl(
    record: { id: string; image?: string; logo?: string; updated?: string },
    filename?: string,
    options?: { thumb?: string },
  ): string {
    const path = filename ?? record.image ?? record.logo ?? "";
    return $api.getFileUrl(path, options?.thumb, record.updated);
  }

  return { getFileUrl };
}
