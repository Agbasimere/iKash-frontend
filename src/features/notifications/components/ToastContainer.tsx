"use client";

import { useEffect } from "react";
import type { Toast } from "../types/notification.types";
import { ToastItem } from "./ToastItem";

interface ToastContainerProps {
    toasts: Toast[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && toasts.length > 0) {
                const newest = toasts[toasts.length - 1];
                onDismiss(newest.id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toasts, onDismiss]);

    if (toasts.length === 0) return null;

    return (
        <div
            role="region"
            aria-label="Notifications"
            className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-center gap-3 sm:left-auto sm:right-4 sm:items-end sm:w-[400px] sm:max-w-[calc(100vw-2rem)]"
        >
            <ul className="flex w-full flex-col gap-3">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </ul>
        </div>
    );
}