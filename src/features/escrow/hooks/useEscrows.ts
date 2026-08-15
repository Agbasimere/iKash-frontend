import { useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface OpenEscrowParams {
    orderId: string;
    sellerAddress: string;
    buyerAddress: string;
    amount: number;
    title: string;
    assetCode?: string;
}

export interface FundEscrowParams {
    escrowId: string;
    signerAddress: string;
    amount: number;
}

export interface SyncEscrowParams {
    escrowId: string;
    action: "initialize" | "fund" | "fiat_sent" | "release";
    signedXdr: string;
}

export interface FiatSentParams {
    buyerAddress: string;
    evidence?: string;
}

export interface ReleaseEscrowParams {
    escrowId: string;
    releaseSigner: string;
}

export interface EscrowTransactionResponse {
    unsignedFundTransaction?: string;
    unsignedTransaction?: string;
}

export interface EvidenceUploadResponse {
    url: string;
}

export function useEscrows() {
    const openEscrow = useCallback(async (params: OpenEscrowParams) => {
        return apiFetch<unknown>(`/escrows/open`, {
            method: "POST",
            body: params,
            defaultError: "Error al abrir el contrato de escrow",
        });
    }, []);

    const fundEscrow = useCallback(async (params: FundEscrowParams) => {
        return apiFetch<EscrowTransactionResponse>(`/escrows/fund`, {
            method: "POST",
            body: params,
            defaultError: "Error al preparar la transacción de fondeo",
        });
    }, []);

    const syncEscrow = useCallback(async (params: SyncEscrowParams) => {
        return apiFetch<unknown>(`/escrows/sync`, {
            method: "POST",
            body: params,
            defaultError: "Error al sincronizar la transacción en blockchain",
        });
    }, []);

    const markFiatSent = useCallback(async (escrowId: string, params: FiatSentParams) => {
        return apiFetch<EscrowTransactionResponse>(`/escrows/${escrowId}/fiat-sent`, {
            method: "POST",
            body: params,
            defaultError: "Error al confirmar el envío de pago",
        });
    }, []);

    const releaseEscrow = useCallback(async (params: ReleaseEscrowParams) => {
        return apiFetch<EscrowTransactionResponse>(`/escrows/release`, {
            method: "POST",
            body: params,
            defaultError: "Error al liberar los fondos del escrow",
        });
    }, []);

    const uploadEvidence = useCallback(async (escrowId: string, file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        return apiFetch<EvidenceUploadResponse>(`/escrows/${escrowId}/evidence`, {
            method: "POST",
            body: formData,
            defaultError: "Error al subir el comprobante de pago",
        });
    }, []);

    return { openEscrow, fundEscrow, syncEscrow, markFiatSent, releaseEscrow, uploadEvidence };
}