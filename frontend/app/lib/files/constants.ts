export const PRODUCT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateProductImage(file: File): string | null {
  if (!PRODUCT_IMAGE_MIMES.includes(file.type as (typeof PRODUCT_IMAGE_MIMES)[number])) {
    return "productsPage.imageInvalidType";
  }
  if (file.size > PRODUCT_IMAGE_MAX_SIZE) {
    return "productsPage.imageTooLarge";
  }
  return null;
}
