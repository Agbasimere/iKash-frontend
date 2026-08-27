"use client";

import {
    createContext,
    useCallback,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { ToastContainer } from "../components/ToastContainer";
import {
    applyMaxVisible,
    createDeduplicator,
    createNotificationId,
    defaultDuration,
    FALLBACK_TITLES,
} from "../utils/notification-deduplication";
import type {
    NotificationContextValue,
    NotificationType,
    NotifyFn,
    NotifyOptions,
    Toast,
} from "../types/notification.types";

const VALID_TYPES: NotificationType[] = ["success", "error", "warning", "info"];

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const dedupeRef = useRef(createDeduplicator());

    const dismiss = useCallback((id: string) => {
        const timer = timersRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }

        setToasts((prev) => {
            const removed = prev.find((toast) => toast.id === id);
            if (removed?.dedupeKey) dedupeRef.current.remove(removed.dedupeKey);
            return prev.filter((toast) => toast.id !== id);
        });
    }, []);

    const dismissAll = useCallback(() => {
        for (const timer of timersRef.current.values()) clearTimeout(timer);
        timersRef.current.clear();
        dedupeRef.current.clear();
        setToasts([]);
    }, []);

    const scheduleDismiss = useCallback(
        (id: string, duration: number) => {
            if (!duration) return;
            const existing = timersRef.current.get(id);
            if (existing) clearTimeout(existing);
            timersRef.current.set(id, setTimeout(() => dismiss(id), duration));
        },
        [dismiss],
    );

    const enqueue = useCallback(
        (options: NotifyOptions): string => {
            try {
                const type: NotificationType = VALID_TYPES.includes(options.type)
                    ? options.type
                    : "info";
                const duration = defaultDuration(type, options.duration);
                const title = options.title?.trim() || FALLBACK_TITLES[type];
                const message = options.message?.trim() ? options.message : undefined;
                const id = options.id || createNotificationId();
                const dedupeKey = options.dedupeKey;

                if (dedupeKey && dedupeRef.current.has(dedupeKey)) {
                    const existingId = dedupeRef.current.getId(dedupeKey)!;
                    setToasts((prev) =>
                        prev.map((toast) =>
                            toast.id === existingId
                                ? {
                                      ...toast,
                                      type,
                                      title,
                                      message,
                                      action: options.action,
                                      duration,
                                      createdAt: Date.now(),
                                  }
                                : toast,
                        ),
                    );
                    scheduleDismiss(existingId, duration);
                    return existingId;
                }

                if (dedupeKey) dedupeRef.current.set(dedupeKey, id);

                const toast: Toast = {
                    id,
                    type,
                    title,
                    message,
                    action: options.action,
                    dedupeKey,
                    duration,
                    createdAt: Date.now(),
                };

                setToasts((prev) => {
                    const next = applyMaxVisible([...prev, toast]);
                    if (next.length < prev.length + 1) {
                        const removedCount = prev.length + 1 - next.length;
                        for (let i = 0; i < removedCount; i += 1) {
                            const evicted = prev[i];
                            if (evicted.dedupeKey) dedupeRef.current.remove(evicted.dedupeKey);
                            const timer = timersRef.current.get(evicted.id);
                            if (timer) clearTimeout(timer);
                            timersRef.current.delete(evicted.id);
                        }
                    }
                    return next;
                });

                scheduleDismiss(id, duration);
                return id;
            } catch {
                return "";
            }
        },
        [scheduleDismiss],
    );

    const notify = useCallback(
        (arg: NotifyOptions | NotificationType, message?: string, duration?: number): string => {
            const options: NotifyOptions =
                typeof arg === "string"
                    ? { type: arg, title: message ?? "", message: undefined, duration }
                    : arg;
            return enqueue(options);
        },
        [enqueue],
    ) as NotifyFn;

    const value = useMemo<NotificationContextValue>(
        () => ({ notify, dismiss, dismissAll }),
        [notify, dismiss, dismissAll],
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </NotificationContext.Provider>
    );
}