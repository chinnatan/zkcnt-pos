import type { Store } from "~/lib/types";
import { createLogger } from "~/lib/logger";

const logger = createLogger("use-promptpay-qr");

export function usePromptPayQr() {
  function normalizePromptPayId(id: string): string {
    return id.trim().replace(/[-\s]/g, "");
  }

  function isValidPromptPayId(id: string): boolean {
    const cleaned = normalizePromptPayId(id);
    if (!cleaned) return false;
    if (/^0\d{9}$/.test(cleaned)) return true;
    if (/^\d{13}$/.test(cleaned)) return true;
    if (/^\d{15}$/.test(cleaned)) return true;
    return /^\d{10,15}$/.test(cleaned);
  }

  function resolvePromptPayId(store: Store | null | undefined): string {
    if (!store) return "";

    const explicit = store.settings?.promptpay_id?.trim();
    if (explicit && isValidPromptPayId(explicit)) {
      return normalizePromptPayId(explicit);
    }

    const taxId = normalizePromptPayId(store.tax_id ?? "");
    if (/^\d{13}$/.test(taxId)) return taxId;

    const phone = normalizePromptPayId(store.phone ?? "");
    if (/^0\d{9}$/.test(phone)) return phone;

    return explicit ? normalizePromptPayId(explicit) : "";
  }

  async function generateQrDataUrl(
    promptPayId: string,
    amount: number,
  ): Promise<string | null> {
    const id = normalizePromptPayId(promptPayId);
    if (!id || amount <= 0) return null;

    try {
      const [{ default: generatePayload }, QRCodeModule] = await Promise.all([
        import("promptpay-qr"),
        import("qrcode"),
      ]);

      if (typeof generatePayload !== "function") {
        logger.error("promptpay-qr default export is not a function");
        return null;
      }

      const payload = generatePayload(id, { amount });
      const QRCode = QRCodeModule.default ?? QRCodeModule;

      return await QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      });
    } catch (error) {
      logger.error("Failed to generate PromptPay QR:", error);
      return null;
    }
  }

  return {
    normalizePromptPayId,
    isValidPromptPayId,
    resolvePromptPayId,
    generateQrDataUrl,
  };
}
