import { useCallback } from "react";
import { useUser } from "../features/user/presentation/context/UserContext";
import { ApiError } from "./api/errors";

export {
    apiFetch,
    getApiBaseUrl,
    setTokenProvider,
    setUnauthorizedHandler,
    setRefreshTokenHandler,
    resetCsrfToken,
} from "./api/client";
export type { ApiFetchOptions } from "./api/client";
export { ApiError } from "./api/errors";

export function useApi() {
    const { accessToken, logout } = useUser();

    const apiFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
        // endpoint is expected to start with a slash, e.g., '/orders'
        const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
        
        const headers = new Headers(options.headers);
        if (!headers.has("Content-Type")) {
            // Only set default if it's not FormData
            if (!(options.body instanceof FormData)) {
                headers.set("Content-Type", "application/json");
            }
        } else if (headers.get("Content-Type") === "multipart/form-data") {
             // fetch handles multipart boundary automatically if content-type is omitted
             headers.delete("Content-Type");
        }

        if (accessToken) {
            headers.set("Authorization", `Bearer ${accessToken}`);
        }

        const res = await fetch(url, { ...options, headers });

        if (res.status === 401) {
            logout();
            throw new ApiError("Sesión expirada. Por favor, inicia sesión nuevamente.", 401);
        }

        if (!res.ok) {
            let errData: { message?: string | string[], error?: string } = {};
            try {
                // If it's empty, json() throws. So we try/catch or check content-length
                const text = await res.text();
                if (text) {
                    errData = JSON.parse(text);
                }
            } catch {
                // ignore
            }
            const msg = errData.message ? (Array.isArray(errData.message) ? errData.message.join(', ') : errData.message) : 'API Error';
            throw new ApiError(msg, res.status, errData.error);
        }

        return res.json();
    }, [accessToken, logout]);

    return { apiFetch };
}
