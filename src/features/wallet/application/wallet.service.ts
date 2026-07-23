import { freighterAdapter } from "../infrastructure/freighter.adapter";
import { lobstrAdapter } from "../infrastructure/lobstr.adapter";
import type { WalletProvider } from "../domain/wallet.types";

// recupera la ultima wallet usada
const PROVIDER_KEY = "wallet:provider";
const PUBLICKEY_KEY = "wallet:publicKey";

interface ChallengeResponse {
    challenge: string;
    expiresAt?: string;
}

interface LoginResponse {
    access_token?: string;
    token?: string;
    jwt?: string;
}

function getApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
}

function normalizeSignature(signature: string): string {
    return signature.trim();
}

function isExpiredChallengeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    const lower = message.toLowerCase();
    return lower.includes("expired") || lower.includes("401") || lower.includes("unauthorized");
}

let authInFlight: Promise<string> | null = null;

async function requestChallenge(publicKey: string): Promise<ChallengeResponse> {
    const res = await fetch(`${getApiBaseUrl()}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Could not request authentication challenge.");
    }

    return (await res.json()) as ChallengeResponse;
}

async function requestLogin(publicKey: string, challenge: string, signature: string): Promise<string> {
    const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, challenge, signature }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Could not complete login.");
    }

    const data = (await res.json()) as LoginResponse;
    return data.access_token || data.token || data.jwt || "";
}

async function signChallenge(challenge: string): Promise<string> {
    const provider = localStorage.getItem(PROVIDER_KEY) as WalletProvider | null;
    if (!provider) throw new Error("No wallet connected");

    if (provider === "freighter") {
        const signed = await freighterAdapter.signMessage(challenge);
        return normalizeSignature(signed);
    }

    const signed = await lobstrAdapter.signMessage(challenge);
    return normalizeSignature(signed);
}

export const walletService = {
    //Restaura la sesión desde localStorage sin llamadas a las extensiones
    async restoreSession(): Promise<{ publicKey: string; provider: WalletProvider } | null> {
        const savedProvider = localStorage.getItem(PROVIDER_KEY) as WalletProvider | null;
        const savedPublicKey = localStorage.getItem(PUBLICKEY_KEY);

        // Si no hay datos guardados, no hay sesión que restaurar
        if (!savedProvider || !savedPublicKey) return null;

        // Validar que el proveedor esté instalado (sin pedir autorización)
        if (savedProvider === "freighter") {
            const installed = await freighterAdapter.isInstalled();
            if (!installed) {
                // Limpiar si la extensión no está instalada
                this.clearSession();
                return null;
            }
            return { publicKey: savedPublicKey, provider: "freighter" };
        }

        if (savedProvider === "lobstr") {
            const installed = await lobstrAdapter.isInstalled();
            if (!installed) {
                // Limpiar si la extensión no está instalada
                this.clearSession();
                return null;
            }
            return { publicKey: savedPublicKey, provider: "lobstr" };
        }

        return null;
    },

    //Conecta la wallet indicada
    async connect(provider: WalletProvider): Promise<string> {
        let publicKey: string;

        if (provider === "freighter") {
            const installed = await freighterAdapter.isInstalled();
            if (!installed) throw new Error("Freighter no está instalado. Instálalo en https://freighter.app");
            publicKey = await freighterAdapter.requestAccess();
        } else {
            const installed = await lobstrAdapter.isInstalled();
            if (!installed) throw new Error("LOBSTR no está instalado. Instálalo en https://lobstr.co/signer-extension");
            const key = await lobstrAdapter.getPublicKey();
            if (!key) throw new Error("Could not get public key. Make sure you have the LOBSTR app linked.");
            publicKey = key;
        }

        // Guardar tanto el provider como el publicKey
        localStorage.setItem(PROVIDER_KEY, provider);
        localStorage.setItem(PUBLICKEY_KEY, publicKey);
        return publicKey;
    },

    async signTransaction(xdr: string, network = "TESTNET"): Promise<string> {
        const provider = localStorage.getItem(PROVIDER_KEY) as WalletProvider | null;
        if (!provider) throw new Error("No wallet connected");

        if (provider === "freighter") {
            return await freighterAdapter.signTransaction(xdr, network);
        } else {
            return await lobstrAdapter.signTransaction(xdr);
        }
    },

    async authenticate(publicKey: string): Promise<string> {
        if (authInFlight) {
            return authInFlight;
        }

        authInFlight = (async () => {
            let currentChallenge = "";

            try {
                const challengeResponse = await requestChallenge(publicKey);
                currentChallenge = challengeResponse.challenge;

                for (let attempt = 0; attempt < 2; attempt += 1) {
                    try {
                        const signature = await signChallenge(currentChallenge);
                        const token = await requestLogin(publicKey, currentChallenge, signature);
                        if (!token) {
                            throw new Error("Authentication response did not include a JWT.");
                        }
                        return token;
                    } catch (error) {
                        if (attempt === 0 && isExpiredChallengeError(error)) {
                            const freshChallenge = await requestChallenge(publicKey);
                            currentChallenge = freshChallenge.challenge;
                            continue;
                        }

                        if (isSignatureCancelled(error)) {
                            throw new Error("Wallet signature is required to verify ownership and complete login.");
                        }

                        throw error;
                    }
                }

                throw new Error("Could not complete login.");
            } catch (error) {
                if (isSignatureCancelled(error)) {
                    throw new Error("Wallet signature is required to verify ownership and complete login.");
                }
                throw error;
            }
        })();

        try {
            return await authInFlight;
        } finally {
            authInFlight = null;
        }
    },

    clearSession() {
        localStorage.removeItem(PROVIDER_KEY);
        localStorage.removeItem(PUBLICKEY_KEY);
    },
};

export function isSignatureCancelled(error: unknown): boolean {
    if (typeof error === "object" && error !== null) {
        const err = error as Record<string, unknown>;

        // Primary detection: Freighter returns { code: -4, message: "The user rejected this request." }
        if (err.code === -4) return true;

        // Fallback: message-based matching for wallets without a reliable numeric code
        // (e.g. LobSTR, or older SDK versions). This is a known limitation — text matching
        // is fragile but necessary where no structured signal is available.
        const msg = err.message;
        if (typeof msg === "string") {
            const lower = msg.toLowerCase();
            if (lower.includes("cancel") || lower.includes("reject") || lower.includes("declined")) {
                return true;
            }
        }
    }

    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        return msg.includes("cancel") || msg.includes("reject") || msg.includes("declined");
    }

    return false;
}