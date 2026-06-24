export type CraftCardVariant =
  | "paper"
  | "tag"
  | "polaroid"
  | "stitched"
  | "kraft"
  | "canvas"
  | "ticket"
  | "label";

export const CRAFT_CARD_VARIANTS: CraftCardVariant[] = [
  "tag",
  "stitched",
  "polaroid",
  "kraft",
  "canvas",
  "ticket",
  "label",
  "paper",
];

export function craftCardVariant(index: number): CraftCardVariant {
  return CRAFT_CARD_VARIANTS[index % CRAFT_CARD_VARIANTS.length]!;
}
