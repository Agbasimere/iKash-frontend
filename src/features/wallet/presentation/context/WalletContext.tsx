"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { walletService } from "../../application/wallet.service";
import type { WalletContext, WalletState, WalletProvider } from "../../domain/wallet.types";
import { useRouter } from "next/navigation";
import { useUsers } from "../../../user/hooks/useUsers";
import { useUser } from "../../../user/presentation/context/UserContext";

const Context = createContext<WalletContext | null>(null);

const initialState: WalletState = {
    publicKey: null,
    provider: null,
    isConnected: false,
    isLoading: true,
    error: null,
};

async function readApiError(response: Response, fallback: string): Promise<string> {
    try {
        const body = await response.json() as { message?: string };
        return body.message ?? fallback;
    } catch {
        return fallback;
    }
}

async function authenticateWallet(publicKey: string): Promise<string> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) throw new Error("Backend API URL is not configured");

    const challengeRes = await fetch(`${apiUrl}/auth/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey }),
    });
    if (!challengeRes.ok) {
        throw new Error(await readApiError(challengeRes, "Unable to create wallet challenge"));
    }

    const { challenge } = await challengeRes.json() as { challenge?: string };
    if (!challenge) throw new Error("Backend returned an invalid wallet challenge");

    const signature = await walletService.signMessage(challenge);
    const loginRes = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, challenge, signature }),
    });
    if (!loginRes.ok) {
        throw new Error(await readApiError(loginRes, "Wallet authentication failed"));
    }

    const { access_token } = await loginRes.json() as { access_token?: string };
    if (!access_token) throw new Error("Backend did not return an access token");
    return access_token;
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<WalletState>(initialState);

    const router = useRouter();
    const { getOrCreateByWallet } = useUsers();
    const { setCurrentUser, setAccessToken, logout } = useUser();

    // Use refs to avoid stale closures in useEffect without triggering re-runs
    const getOrCreateRef = useRef(getOrCreateByWallet);
    const setCurrentUserRef = useRef(setCurrentUser);
    useEffect(() => { getOrCreateRef.current = getOrCreateByWallet; }, [getOrCreateByWallet]);
    useEffect(() => { setCurrentUserRef.current = setCurrentUser; }, [setCurrentUser]);

    // Restaura sesión al montar (runs once)
    useEffect(() => {
        let cancelled = false;
        walletService.restoreSession().then(async (session) => {
            if (cancelled || !session?.publicKey) {
                if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
                return
            };

            setState((s) => ({
                ...s,
                publicKey: session.publicKey,
                provider: session.provider,
                isConnected: true,
                isLoading: false,
            }));

            try {
                const userAccount = await getOrCreateRef.current(session.publicKey);
                if (!cancelled && userAccount) {
                    setCurrentUserRef.current(userAccount);
                }
            } catch {
                // Backend might not be running yet; user data stays from localStorage
            }
        });
        return () => { cancelled = true; };
    }, []);

    const connect = useCallback(async (provider: WalletProvider) => {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        try {
            // 1. Validaciones previas de RED / Mainnet (Frontend Checks)
            if (provider === "lobstr") {
                throw new Error("LOBSTR is configured for Mainnet. Please join the waitlist instead.");
            }
            if (provider === "freighter") {
                try {
                    const { getNetwork } = await import("@stellar/freighter-api");
                    const activeNet = await getNetwork();
                    const activeNetStr = activeNet.network || "TESTNET";
                    if (activeNetStr.toUpperCase() !== "TESTNET") {
                        throw new Error("Active network is Mainnet. Please switch your wallet configuration to TESTNET.");
                    }
                } catch (e: unknown) {
                    // Ignore missing freighter errors here, handled by walletService
                    if (e instanceof Error && e.message.includes("Mainnet")) {
                        throw e;
                    }
                }
            }

            const publicKey = await walletService.connect(provider);

            // 2. Environment Check (Horizon Testnet Account existence)
            const horizonRes = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
            if (!horizonRes.ok) {
                walletService.clearSession();
                throw new Error("Account not funded or active on Testnet. Please fund your account via Friendbot before connecting.");
            }

            setState({ publicKey, provider, isConnected: true, isLoading: false, error: null });
            
            // Prove wallet ownership before requesting the user-scoped JWT.
            const accessToken = await authenticateWallet(publicKey);
            setAccessToken(accessToken);

            // Onboarding logic
            const userAccount = await getOrCreateByWallet(publicKey);
            if (userAccount) {
                setCurrentUser(userAccount);
                if (userAccount.pendingAccountInfo) {
                    router.push("/setupAccount");
                } else {
                    router.push("/dashboard");
                }
            } else {
                router.push("/dashboard");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Error desconocido";
            walletService.clearSession();
            setState({ ...initialState, isLoading: false, error: msg });
            throw err; // Re-throw to be caught by the UI component
        }
    }, [getOrCreateByWallet, setCurrentUser, setAccessToken, router]);

    const disconnect = useCallback(() => {
        walletService.clearSession();
        logout();
        setState(initialState);
    }, [logout]);

    const signTransaction = useCallback(async (xdr: string, network?: string) => {
        return await walletService.signTransaction(xdr, network);
    }, []);

    return (
        <Context.Provider value={{ ...state, connect, disconnect, signTransaction }}>
            {children}
        </Context.Provider>
    );
}

export function useWalletContext(): WalletContext {
    const ctx = useContext(Context);
    if (!ctx) throw new Error("useWalletContext debe usarse dentro de WalletProvider");
    return ctx;
}
