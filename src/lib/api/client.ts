import { ApiError } from "./errors";

// Token/auth middleware is registered by UserContext through setters to avoid
// circular imports (UserContext -> api client -> UserContext).
let tokenProvider: (() => string | null) | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;
let refreshTokenHandler: (() => Promise<string | null>) | null = null;

export function getApiBaseUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("Backend API URL is not configured.");
    return apiUrl;
}

export function setTokenProvider(provider: (() => string | null) | null): void {
    tokenProvider = provider;
}

export function setUnauthorizedHandler(handler: (() => void | Promise<void>) | null): void {
    unauthorizedHandler = handler;
}

export function setRefreshTokenHandler(handler: (() => Promise<string | null>) | null): void {
    refreshTokenHandler = handler;
}

export interface ApiFetchOptions extends Omit<RequestInit, "headers" | "body"> {
    /** Whether to inject the Authorization header (defaults to true). */
    authenticated?: boolean;
    headers?: Record<string, string>;
    /** JSON-serializable payload or FormData. JSON bodies are stringified. */
    body?: unknown;
    /** Fallback message used when the backend error has no `message`. */
    defaultError?: string;
}

function isFormData(body: unknown): body is FormData {
    return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseError(res: Response, defaultError: string): Promise<ApiError> {
    const errData = await res.json().catch(() => ({}));
    const message = Array.isArray(errData.message)
        ? errData.message.join(", ")
        : errData.message || defaultError;
    return new ApiError(message, res.status, errData.error);
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const { authenticated = true, headers = {}, body, defaultError = "Request failed", ...init } = options;

    const buildRequest = (tokenOverride?: string | null): RequestInit => {
        const requestHeaders: Record<string, string> = { ...headers };
        const token = authenticated ? tokenOverride ?? tokenProvider?.() ?? null : null;
        if (token) {
            requestHeaders["Authorization"] = `Bearer ${token}`;
        }
        let requestBody: BodyInit | null | undefined;
        if (body !== undefined) {
            if (isFormData(body)) {
                requestBody = body;
            } else {
                const hasContentType = Object.keys(requestHeaders).some(
                    (key) => key.toLowerCase() === "content-type",
                );
                if (!hasContentType) {
                    requestHeaders["Content-Type"] = "application/json";
                }
                requestBody = JSON.stringify(body);
            }
        }
        return { ...init, headers: requestHeaders, body: requestBody };
    };

    let res = await fetch(`${getApiBaseUrl()}${path}`, buildRequest(tokenProvider?.()));

    if (res.status === 401 && authenticated) {
        const newToken = refreshTokenHandler ? await refreshTokenHandler() : null;
        if (newToken) {
            res = await fetch(`${getApiBaseUrl()}${path}`, buildRequest(newToken));
        } else {
            await unauthorizedHandler?.();
            throw new ApiError("Sesión expirada. Por favor, inicia sesión nuevamente.", 401);
        }
    }

    if (!res.ok) {
        throw await parseError(res, defaultError);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return (await res.json()) as T;
}