import {
    isConnected,
    isAllowed,
    requestAccess,
    getAddress,
    signTransaction,
    signMessage as freighterSignMessage,
} from "@stellar/freighter-api";

export const freighterAdapter = {
    // Verifica si Freighter ya está instalado
    async isInstalled(): Promise<boolean> {
        try {
            const res = await isConnected();
            return res.isConnected ?? false;
        } catch {
            return false;
        }
    },

    // Verifica si ya tiene permisos previamente
    async isAllowed(): Promise<boolean> {
        try {
            const res = await isAllowed();
            return res.isAllowed ?? false;
        } catch {
            return false;
        }
    },

    // Se solicita acceso al usuario
    // Retorna la publicKey
    async requestAccess(): Promise<string> {
        const res = await requestAccess();
        if (res.error) throw new Error(res.error);
        return res.address;
    },

    // Obtiene el publicKey si ya está conectado
    async getAddress(): Promise<string | null> {
        try {
            const res = await getAddress();
            if (res.error || !res.address) return null;
            return res.address;
        } catch {
            return null;
        }
    },

    async signMessage(message: string): Promise<string> {
        const res = await freighterSignMessage(message);

        if (typeof res === "object" && res !== null && "error" in res && res.error) {
            const msg = typeof res.error === "string" ? res.error : (res.error?.message ?? JSON.stringify(res.error));
            throw new Error(msg);
        }

        const signedMessage = typeof res === "string"
            ? res
            : res?.signedMessage;

        if (typeof signedMessage === "string") {
            return signedMessage.trim();
        }

        if (signedMessage && typeof signedMessage === "object" && "byteLength" in signedMessage) {
            const bytes = signedMessage as Uint8Array;
            return Buffer.from(bytes).toString("base64");
        }

        throw new Error("No se pudo obtener la firma del mensaje.");
    },

    // Firma una transacción XDR con Freighter
    async signTransaction(xdr: string, network: string = "TESTNET"): Promise<string> {
        type SignResult = string | { signedTxXdr?: string; signedTransaction?: string; signedXDR?: string; error?: string | { message: string } };
        const res: SignResult = await signTransaction(xdr, {
            networkPassphrase:
                network.toUpperCase() === "PUBLIC"
                    ? "Public Global Stellar Network ; September 2015"
                    : "Test SDF Network ; September 2015",
        });
        if (typeof res !== "string" && res?.error) {
            const msg = typeof res.error === "string" ? res.error : (res.error?.message ?? JSON.stringify(res.error));
            throw new Error(msg);
        }
        return typeof res === "string"
            ? res
            : res.signedTxXdr || res.signedTransaction || res.signedXDR || (res as unknown as string);
    }
};