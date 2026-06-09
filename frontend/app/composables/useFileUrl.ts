export function useFileUrl() {
  const { $pb } = useNuxtApp();

  function getFileUrl(
    record: { id: string; collectionId?: string },
    filename: string | undefined | null,
    options?: { thumb?: string },
  ): string | null {
    if (!filename) return null;
    return $pb.files.getUrl(record, filename, options);
  }

  return { getFileUrl };
}
