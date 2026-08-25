import type { NotificationType, Toast } from "../types/notification.types";

export const DEFAULT_MAX_VISIBLE_TOASTS = 4;

export const DEFAULT_DURATIONS: Record<NotificationType, number> = {
    success: 4000,
    info: 4000,
    warning: 6000,
    error: 8000,
};

export const FALLBACK_TITLES: Record<NotificationType, string> = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Notification",
};

export function defaultDuration(type: NotificationType, duration?: number): number {
    if (typeof duration === "number" && duration > 0) return duration;
    if (typeof duration === "number" && duration === 0) return 0;
    return DEFAULT_DURATIONS[type];
}

export function createNotificationId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export interface Deduplicator {
    has: (key: string) => boolean;
    getId: (key: string) => string | undefined;
    set: (key: string, id: string) => void;
    remove: (key: string) => void;
    clear: () => void;
}

export function createDeduplicator(): Deduplicator {
    const keyToId = new Map<string, string>();

    return {
        has: (key) => keyToId.has(key),
        getId: (key) => keyToId.get(key),
        set: (key, id) => {
            keyToId.set(key, id);
        },
        remove: (key) => {
            keyToId.delete(key);
        },
        clear: () => {
            keyToId.clear();
        },
    };
}

export function applyMaxVisible(toasts: Toast[], max: number = DEFAULT_MAX_VISIBLE_TOASTS): Toast[] {
    if (toasts.length <= max) return toasts;
    return toasts.slice(toasts.length - max);
}