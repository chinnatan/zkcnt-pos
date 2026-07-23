import * as XLSX from "xlsx";
import type { Category, Product } from "~/lib/types";

export type SpreadsheetFormat = "csv" | "xlsx";

export interface ProductImportRow {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  unit: string;
  track_inventory: boolean;
  is_active: boolean;
  initial_quantity: number;
}

export type ImportRowStatus = "valid" | "skipped" | "error" | "warning";

export interface ValidatedImportRow {
  index: number;
  row: ProductImportRow;
  status: ImportRowStatus;
  messages: string[];
  categoryId: string;
}

export interface BulkValidationResult {
  rows: ValidatedImportRow[];
  validCount: number;
  skippedCount: number;
  errorCount: number;
}

export const PRODUCT_IMPORT_HEADERS_TH = [
  "ชื่อสินค้า",
  "SKU",
  "บาร์โค้ด",
  "รายละเอียด",
  "ราคาขาย",
  "ต้นทุน",
  "หมวดหมู่",
  "หน่วย",
  "ติดตามสต็อก",
  "เปิดใช้งาน",
  "จำนวนสต็อกเริ่มต้น",
] as const;

const COLUMN_ALIASES: Record<keyof ProductImportRow, string[]> = {
  name: ["ชื่อสินค้า", "name", "product", "product_name"],
  sku: ["sku", "รหัสสินค้า"],
  barcode: ["barcode", "บาร์โค้ด", "bar code"],
  description: ["description", "รายละเอียด", "desc"],
  price: ["price", "ราคาขาย", "ราคา", "selling_price"],
  cost: ["cost", "ต้นทุน"],
  category: ["category", "หมวดหมู่", "cat"],
  unit: ["unit", "หน่วย"],
  track_inventory: ["track_inventory", "ติดตามสต็อก", "track stock", "track_inventory"],
  is_active: ["is_active", "เปิดใช้งาน", "active", "status"],
  initial_quantity: ["initial_quantity", "จำนวนสต็อกเริ่มต้น", "initial stock", "stock", "quantity", "จำนวน"],
};

const EXAMPLE_ROW: ProductImportRow = {
  name: "กาแฟเย็น",
  sku: "CF-001",
  barcode: "8850000000001",
  description: "กาแฟเย็นหวานน้อย",
  price: 45,
  cost: 20,
  category: "เครื่องดื่ม",
  unit: "แก้ว",
  track_inventory: true,
  is_active: true,
  initial_quantity: 50,
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function mapHeaders(headers: string[]): Partial<Record<keyof ProductImportRow, number>> {
  const mapping: Partial<Record<keyof ProductImportRow, number>> = {};
  const normalized = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [keyof ProductImportRow, string[]][]) {
    const aliasSet = new Set(aliases.map(normalizeHeader));
    const idx = normalized.findIndex((h) => aliasSet.has(h));
    if (idx >= 0) mapping[field] = idx;
  }

  return mapping;
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  const str = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "ใช่", "เปิด"].includes(str)) return true;
  if (["false", "0", "no", "n", "ไม่", "ปิด"].includes(str)) return false;
  return defaultValue;
}

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : null;
}

function cellValue(row: unknown[], index: number | undefined): string {
  if (index === undefined) return "";
  const val = row[index];
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function rawRowsToImportRows(rawRows: unknown[][]): ProductImportRow[] {
  if (rawRows.length === 0) return [];

  const headerRow = (rawRows[0] ?? []).map((h) => String(h ?? "").trim());
  const mapping = mapHeaders(headerRow);
  const hasHeader = mapping.name !== undefined;
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

  return dataRows
    .map((row) => {
      const get = (field: keyof ProductImportRow) => {
        if (hasHeader) return cellValue(row as unknown[], mapping[field]);
        const idx = Object.keys(COLUMN_ALIASES).indexOf(field);
        return cellValue(row as unknown[], idx >= 0 ? idx : undefined);
      };

      const price = parseNumber(get("price"));
      const cost = parseNumber(get("cost"));
      const initialQty = parseNumber(get("initial_quantity"));

      return {
        name: get("name"),
        sku: get("sku"),
        barcode: get("barcode"),
        description: get("description"),
        price: price ?? 0,
        cost: cost ?? 0,
        category: get("category"),
        unit: get("unit"),
        track_inventory: parseBoolean(get("track_inventory"), false),
        is_active: parseBoolean(get("is_active"), true),
        initial_quantity: initialQty !== null && initialQty >= 0 ? initialQty : 0,
      };
    })
    .filter((row) => Object.values(row).some((v) => v !== "" && v !== 0 && v !== false));
}

export function createEmptyImportRow(): ProductImportRow {
  return {
    name: "",
    sku: "",
    barcode: "",
    description: "",
    price: 0,
    cost: 0,
    category: "",
    unit: "",
    track_inventory: false,
    is_active: true,
    initial_quantity: 0,
  };
}

export function createDefaultImportRows(count = 5): ProductImportRow[] {
  return Array.from({ length: count }, () => createEmptyImportRow());
}

export async function parseSpreadsheetFile(file: File): Promise<ProductImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  return rawRowsToImportRows(rawRows);
}

export function parseClipboardTsv(text: string): ProductImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const rawRows = lines.map((line) => line.split("\t"));
  const firstRow = rawRows[0] ?? [];
  const mapping = mapHeaders(firstRow.map(String));
  const hasHeader = mapping.name !== undefined;

  if (hasHeader) {
    return rawRowsToImportRows(rawRows);
  }

  return rawRows.map((cells) => ({
    name: cells[0]?.trim() ?? "",
    sku: cells[1]?.trim() ?? "",
    barcode: cells[2]?.trim() ?? "",
    description: cells[3]?.trim() ?? "",
    price: parseNumber(cells[4]) ?? 0,
    cost: parseNumber(cells[5]) ?? 0,
    category: cells[6]?.trim() ?? "",
    unit: cells[7]?.trim() ?? "",
    track_inventory: parseBoolean(cells[8], false),
    is_active: parseBoolean(cells[9], true),
    initial_quantity: Math.max(0, parseNumber(cells[10]) ?? 0),
  }));
}

function resolveCategoryId(
  categoryName: string,
  categories: readonly Category[],
): { id: string; warning?: string } {
  if (!categoryName.trim()) return { id: "" };
  const match = categories.find(
    (c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase(),
  );
  if (match) return { id: match.id };
  return { id: "", warning: "categoryNotFound" };
}

export function validateImportRows(
  rows: ProductImportRow[],
  existingProducts: readonly Product[],
  categories: readonly Category[],
): BulkValidationResult {
  const existingSkus = new Set(
    existingProducts
      .map((p) => p.sku?.trim().toLowerCase())
      .filter((sku) => sku),
  );
  const seenSkus = new Set<string>();
  const validated: ValidatedImportRow[] = [];

  rows.forEach((row, index) => {
    const messages: string[] = [];
    let status: ImportRowStatus = "valid";

    if (!row.name.trim()) {
      status = "error";
      messages.push("missingName");
    }

    const price = parseNumber(row.price);
    if (price === null || price < 0) {
      status = "error";
      messages.push("invalidPrice");
    }

    const initialQty = parseNumber(row.initial_quantity);
    if (initialQty !== null && initialQty < 0) {
      status = "error";
      messages.push("invalidInitialStock");
    }

    if (!row.track_inventory && (initialQty ?? row.initial_quantity) > 0) {
      row.initial_quantity = 0;
    }

    const skuKey = row.sku.trim().toLowerCase();
    if (skuKey) {
      if (existingSkus.has(skuKey)) {
        status = "skipped";
        messages.push("duplicateSkuExisting");
      } else if (seenSkus.has(skuKey)) {
        status = "skipped";
        messages.push("duplicateSkuFile");
      } else {
        seenSkus.add(skuKey);
      }
    }

    const { id: categoryId, warning } = resolveCategoryId(row.category, categories);
    if (warning && status === "valid") {
      status = "warning";
      messages.push(warning);
    }

    if (
      !row.name.trim() &&
      !row.sku.trim() &&
      !row.barcode.trim() &&
      row.price === 0
    ) {
      return;
    }

    validated.push({
      index,
      row: { ...row, price: price ?? 0 },
      status,
      messages,
      categoryId,
    });
  });

  return {
    rows: validated,
    validCount: validated.filter((r) => r.status === "valid" || r.status === "warning").length,
    skippedCount: validated.filter((r) => r.status === "skipped").length,
    errorCount: validated.filter((r) => r.status === "error").length,
  };
}

function productToExportRow(product: Product, categories: readonly Category[]): Record<string, string | number | boolean> {
  const cat = categories.find((c) => c.id === product.category);
  return {
    [PRODUCT_IMPORT_HEADERS_TH[0]]: product.name,
    [PRODUCT_IMPORT_HEADERS_TH[1]]: product.sku ?? "",
    [PRODUCT_IMPORT_HEADERS_TH[2]]: product.barcode ?? "",
    [PRODUCT_IMPORT_HEADERS_TH[3]]: product.description ?? "",
    [PRODUCT_IMPORT_HEADERS_TH[4]]: product.price,
    [PRODUCT_IMPORT_HEADERS_TH[5]]: product.cost ?? 0,
    [PRODUCT_IMPORT_HEADERS_TH[6]]: cat?.name ?? "",
    [PRODUCT_IMPORT_HEADERS_TH[7]]: product.unit ?? "",
    [PRODUCT_IMPORT_HEADERS_TH[8]]: product.track_inventory ? "ใช่" : "ไม่",
    [PRODUCT_IMPORT_HEADERS_TH[9]]: product.is_active ? "ใช่" : "ไม่",
    [PRODUCT_IMPORT_HEADERS_TH[10]]: "",
  };
}

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename);
}

function buildWorkbook(rows: Record<string, string | number | boolean>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
  return workbook;
}

export function exportProductsToFile(
  products: readonly Product[],
  categories: readonly Category[],
  format: SpreadsheetFormat,
) {
  const rows = products.map((p) => productToExportRow(p, categories));
  const ext = format === "csv" ? "csv" : "xlsx";
  const workbook = buildWorkbook(rows);
  downloadWorkbook(workbook, `products-export.${ext}`);
}

export function downloadProductTemplate(format: SpreadsheetFormat) {
  const example = productToExportRow(
    {
      id: "",
      store: "",
      created: "",
      updated: "",
      image: "",
      ...EXAMPLE_ROW,
      category: "",
    },
    [{ id: "", store: "", name: EXAMPLE_ROW.category, created: "", updated: "", description: "", image: "", sort_order: 0, is_active: true }],
  );
  example[PRODUCT_IMPORT_HEADERS_TH[6]] = EXAMPLE_ROW.category;
  example[PRODUCT_IMPORT_HEADERS_TH[10]] = EXAMPLE_ROW.initial_quantity;

  const workbook = buildWorkbook([example]);
  const ext = format === "csv" ? "csv" : "xlsx";
  downloadWorkbook(workbook, `products-template.${ext}`);
}

export function toProductInput(
  validated: ValidatedImportRow,
  storeId: string,
): Partial<Product> & { store: string } {
  return {
    store: storeId,
    name: validated.row.name.trim(),
    sku: validated.row.sku.trim(),
    barcode: validated.row.barcode.trim(),
    description: validated.row.description.trim(),
    price: validated.row.price,
    cost: validated.row.cost,
    category: validated.categoryId,
    unit: validated.row.unit.trim(),
    track_inventory: validated.row.track_inventory,
    is_active: validated.row.is_active,
  };
}
