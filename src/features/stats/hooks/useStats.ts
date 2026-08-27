import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Stats } from "../models/stats";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export type TimeWindow = "7d" | "2s" | "1m" | "all";

export function useStats() {
    const [timeWindow, setTimeWindow] = useState<string | undefined>(undefined);

    const { data: stats = null, isLoading } = useQuery<Stats | null>({
        queryKey: queryKeys.stats.window(timeWindow),
        queryFn: () => {
            const params = timeWindow && timeWindow !== "7d" ? `?window=${timeWindow}` : "";
            return apiFetch<Stats>(`/stats${params}`);
        }
    });

    const getStats = useCallback(async (window?: string) => {
        setTimeWindow(window);
    }, []);

    return { stats, getStats, isLoading };
}