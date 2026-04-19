export interface ApiErrorPayload {
  code?: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown> | null;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details ?? null;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "http://localhost:4000";
const ACCESS_TOKEN_KEY = "accessToken";

const buildUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
};

const getToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

const parseErrorPayload = (fallbackMessage: string, data: unknown): ApiErrorPayload => {
  if (data && typeof data === "object") {
    const maybeEnvelope = data as { error?: unknown; message?: unknown };

    if (maybeEnvelope.error && typeof maybeEnvelope.error === "object") {
      const payload = maybeEnvelope.error as {
        code?: unknown;
        message?: unknown;
        details?: unknown;
      };

      return {
        code: typeof payload.code === "string" ? payload.code : undefined,
        message: typeof payload.message === "string" ? payload.message : fallbackMessage,
        details: (payload.details as Record<string, unknown> | null | undefined) ?? null
      };
    }

    if (typeof maybeEnvelope.message === "string") {
      return {
        message: maybeEnvelope.message
      };
    }
  }

  return { message: fallbackMessage };
};

const request = async <TResponse>(url: string, init: RequestInit): Promise<TResponse> => {
  const token = getToken();

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(url), {
    ...init,
    headers
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const payload = parseErrorPayload(`Request failed with status ${response.status}`, data);
    throw new ApiClientError(response.status, payload);
  }

  return data as TResponse;
};

export const get = async <TResponse>(url: string): Promise<TResponse> => {
  return request<TResponse>(url, { method: "GET" });
};

export const post = async <TResponse, TBody = unknown>(url: string, body: TBody): Promise<TResponse> => {
  return request<TResponse>(url, {
    method: "POST",
    body: JSON.stringify(body)
  });
};
