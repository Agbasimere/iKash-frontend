import { stellarWalletKitService } from "./stellar-wallet-kit.service";

// Última wallet usada
const WALLET_ID_KEY = "wallet:provider";
const PUBLICKEY_KEY = "wallet:publicKey";

export const walletService = {
    // Restaura sesión desde localStorage. Nunca asume que una wallet
    // previamente seleccionada sigue conectada: vuelve a pedir la dirección
    // y la compara contra lo guardado antes de confiar en la sesión.
    async restoreSession(): Promise<{ publicKey: string; walletId: string } | null> {
        const savedWalletId = localStorage.getItem(WALLET_ID_KEY);
        const savedPublicKey = localStorage.getItem(PUBLICKEY_KEY);

        if (!savedWalletId || !savedPublicKey) return null;

        try {
            stellarWalletKitService.setWallet(savedWalletId);
            const address = await stellarWalletKitService.getAddress();

            if (!address || address !== savedPublicKey) {
                this.clearSession();
                return null;
            }

            return { publicKey: address, walletId: savedWalletId };
        } catch {
            this.clearSession();
            return null;
        }
    },

    // Conecta la wallet indicada a través de Stellar Wallets Kit
    async connect(walletId: string): Promise<string> {
        const publicKey = await stellarWalletKitService.connect(walletId);

        localStorage.setItem(WALLET_ID_KEY, walletId);
        localStorage.setItem(PUBLICKEY_KEY, publicKey);
        return publicKey;
    },

    async signTransaction(xdr: string): Promise<string> {
        const walletId = localStorage.getItem(WALLET_ID_KEY);
        const address = localStorage.getItem(PUBLICKEY_KEY);
        if (!walletId) throw new Error("No wallet connected");

        stellarWalletKitService.setWallet(walletId);
        return await stellarWalletKitService.signTransaction(xdr, address ?? undefined);
    },

    clearSession() {
        localStorage.removeItem(WALLET_ID_KEY);
        localStorage.removeItem(PUBLICKEY_KEY);
        void stellarWalletKitService.disconnect();
    },
};

export function isSignatureCancelled(error: unknown): boolean {
    if (typeof error === "object" && error !== null) {
        const err = error as Record<string, unknown>;

        // Primary detection: Freighter/kit-style rejection { code: -4, message: "..." }
        if (err.code === -4) return true;

        // Fallback: message-based matching for wallets without a reliable numeric code.
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
