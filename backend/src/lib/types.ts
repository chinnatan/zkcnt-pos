export type RecordWithMeta<T> = T & {
  collectionId: string;
  collectionName: string;
};

export interface StoreSettings {
  currency: string;
  vat_rate: number;
  receipt_header: string;
  receipt_footer: string;
  member_invite_mode?: "direct" | "email";
  promptpay_id?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  currency: "THB",
  vat_rate: 7,
  receipt_header: "",
  receipt_footer: "",
  member_invite_mode: "direct",
};
