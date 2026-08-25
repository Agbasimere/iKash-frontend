import { useState } from "react";
import { Stats } from "../models/stats";
import { apiFetch } from "@/lib/api";

export type TimeWindow = "7d" | "2s" | "1m" | "all";

export function useStats() {
    const [stats, setStats] = useState<Stats | null>(null);

    const getStats = async (timeWindow?: string) => {
        try {
            const params = timeWindow && timeWindow !== "7d" ? `?window=${timeWindow}` : "";
            const data = await apiFetch<Stats>(`/stats${params}`, { authenticated: false });
            setStats(data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    }

    return { stats, getStats };
}