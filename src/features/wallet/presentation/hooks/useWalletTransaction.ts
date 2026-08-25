"use client";

import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export interface Transaction {
    id: string;
    hash: string;
    created_at: string;
    memo_type: string;
    memo?: string;
    successful: boolean;
    fee_charged: string;
    source_account: string;
}

interface TransactionsState {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
}

export function useWalletTransactions(publicKey: string | null): TransactionsState {
    const { apiFetch } = useApi();

    const { data: transactions = [], isLoading, error } = useQuery<Transaction[], Error>({
        queryKey: queryKeys.wallet.transactions(publicKey),
        queryFn: () => apiFetch(`/stellar/transactions/${publicKey}`),
        enabled: !!publicKey,
        refetchInterval: 10000,
    });

    return {
        transactions,
        isLoading,
        error: error?.message || null,
    };
}