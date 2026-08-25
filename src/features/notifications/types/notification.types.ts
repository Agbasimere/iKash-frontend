export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationAction {
    label: string;
    href?: string;
    onAction?: () => void;
}

export interface NotifyOptions {
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
    action?: NotificationAction;
    dedupeKey?: string;
    id?: string;
}

export interface Toast {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    action?: NotificationAction;
    dedupeKey?: string;
    duration: number;
    createdAt: number;
}

export type NotifyFn = {
    (options: NotifyOptions): string;
    (type: NotificationType, message: string, duration?: number): string;
};

export interface NotificationContextValue {
    notify: NotifyFn;
    dismiss: (id: string) => void;
    dismissAll: () => void;
}