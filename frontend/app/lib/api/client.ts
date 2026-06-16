import { resolveApiBaseUrl, resolveUploadsBaseUrl } from "./url";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  created: string;
  updated: string;
}

export interface AuthState {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface SyncDelta {
  categories: Record<string, unknown>[];
  products: Record<string, unknown>[];
  customers: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  discounts: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  order_items: Record<string, unknown>[];
  inventory_transactions: Record<string, unknown>[];
}

type SendOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
};

const AUTH_KEY = "api_auth";

export class ApiClient {
  private baseUrl: string;
  private uploadsBase: string;
  private authState: AuthState | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = resolveApiBaseUrl(baseUrl);
    this.uploadsBase = resolveUploadsBaseUrl(this.baseUrl);
    if (import.meta.client) {
      this.restoreAuth();
    }
  }

  get isAuthenticated(): boolean {
    return !!this.authState?.token;
  }

  get user(): AuthUser | null {
    return this.authState?.user ?? null;
  }

  get token(): string | null {
    return this.authState?.token ?? null;
  }

  restoreAuth() {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return;
    try {
      this.authState = JSON.parse(raw) as AuthState;
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  private persistAuth() {
    if (!import.meta.client) return;
    if (this.authState) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(this.authState));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  async send<T = unknown>(path: string, options: SendOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, auth = true } = options;
    const reqHeaders: Record<string, string> = { ...headers };

    if (auth && this.authState?.token) {
      reqHeaders.Authorization = `Bearer ${this.authState.token}`;
    }

    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      reqHeaders["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const url = path.startsWith("http")
      ? path
      : `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const res = await fetch(url, { method, headers: reqHeaders, body: payload });

    if (res.status === 401 && auth && this.authState?.refreshToken) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        return this.send<T>(path, options);
      }
    }

    if (!res.ok) {
      let message = res.statusText;
      try {
        const err = await res.json();
        message = err.message ?? message;
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  private async tryRefresh(): Promise<boolean> {
    if (!this.authState?.refreshToken) return false;
    try {
      const result = await this.send<AuthState>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: this.authState.refreshToken },
        auth: false,
      });
      this.authState = result;
      this.persistAuth();
      return true;
    } catch {
      this.logout();
      return false;
    }
  }

  async login(email: string, password: string) {
    const result = await this.send<AuthState>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    this.authState = result;
    this.persistAuth();
    return result;
  }

  async register(email: string, password: string, name: string) {
    const result = await this.send<AuthState>("/auth/register", {
      method: "POST",
      body: { email, password, name },
      auth: false,
    });
    this.authState = result;
    this.persistAuth();
    return result;
  }

  async refreshAuth() {
    if (!this.authState?.refreshToken) return null;
    const ok = await this.tryRefresh();
    return ok ? this.authState : null;
  }

  logout() {
    this.authState = null;
    this.persistAuth();
  }

  async getMe() {
    return this.send<AuthUser>("/auth/me");
  }

  getFileUrl(relativePath: string, thumb?: string): string {
    if (!relativePath) return "";
    if (relativePath.startsWith("http")) return relativePath;
    const base = `${this.uploadsBase}/${relativePath.replace(/^\//, "")}`;
    return thumb ? `${base}?thumb=${thumb}` : base;
  }

  async syncDelta(storeId: string, since: string): Promise<SyncDelta> {
    return this.send<SyncDelta>(
      `/stores/${storeId}/sync?since=${encodeURIComponent(since)}`,
    );
  }

  // Collection helpers for sync engine
  async collectionCreate(
    storeId: string,
    collection: string,
    data: Record<string, unknown>,
  ) {
    return this.sendRecord(storeId, collection, "POST", data);
  }

  async collectionUpdate(
    storeId: string,
    collection: string,
    id: string,
    data: Record<string, unknown> | FormData,
  ) {
    return this.sendRecord(storeId, collection, "PATCH", data, id);
  }

  async collectionDelete(storeId: string, collection: string, id: string) {
    return this.sendRecord(storeId, collection, "DELETE", {}, id);
  }

  async uploadProductImage(
    storeId: string,
    productId: string,
    form: FormData,
  ) {
    return this.send(`/stores/${storeId}/products/${productId}/image`, {
      method: "POST",
      body: form,
    });
  }

  private async sendRecord(
    storeId: string,
    collection: string,
    method: string,
    data: Record<string, unknown> | FormData,
    id?: string,
  ) {
    const pathMap: Record<string, string> = {
      categories: `/stores/${storeId}/categories`,
      products: `/stores/${storeId}/products`,
      customers: `/stores/${storeId}/customers`,
      discounts: `/stores/${storeId}/discounts`,
      inventory: `/stores/${storeId}/inventory`,
      orders: `/stores/${storeId}/orders`,
      order_items: `/stores/${storeId}/order-items`,
      inventory_transactions: `/stores/${storeId}/inventory-transactions`,
    };

    const base = pathMap[collection];
    if (!base) throw new Error(`Unknown collection: ${collection}`);

    const path = id ? `${base}/${id}` : base;

    if (collection === "orders" && method === "POST") {
      return this.send(path, { method, body: { order: data, items: [] } });
    }

    if (collection === "order_items" && method === "POST") {
      return this.send(path, { method, body: data });
    }

    return this.send(path, { method, body: data });
  }

  async listStores() {
    return this.send<Record<string, unknown>[]>("/stores");
  }

  async listMemberships() {
    return this.send<Array<Record<string, unknown> & { expand?: { store?: unknown } }>>(
      "/stores/memberships",
    );
  }
}

export function createApiClient(baseUrl?: string) {
  return new ApiClient(baseUrl);
}
