"use client";

import { useContext } from "react";
import { NotificationContext } from "../context/NotificationContext";
import type { NotificationContextValue } from "../types/notification.types";

export function useNotifications(): NotificationContextValue {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return ctx;
}