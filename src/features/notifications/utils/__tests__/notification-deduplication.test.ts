import { describe, it, expect } from "vitest";
import {
    applyMaxVisible,
    createDeduplicator,
    createNotificationId,
    defaultDuration,
    DEFAULT_MAX_VISIBLE_TOASTS,
} from "../notification-deduplication";
import type { Toast } from "../../types/notification.types";

function makeToast(overrides: Partial<Toast> = {}): Toast {
    return {
        id: createNotificationId(),
        type: "success",
        title: "Title",
        duration: 4000,
        createdAt: Date.now(),
        ...overrides,
    };
}

describe("notification-deduplication", () => {
    it("tracks keys to toast ids and prevents duplicates", () => {
        const dedupe = createDeduplicator();

        expect(dedupe.has("message-1")).toBe(false);
        dedupe.set("message-1", "toast-abc");
        expect(dedupe.has("message-1")).toBe(true);
        expect(dedupe.getId("message-1")).toBe("toast-abc");
    });

    it("removes keys on removal", () => {
        const dedupe = createDeduplicator();
        dedupe.set("event-1", "toast-1");
        dedupe.remove("event-1");
        expect(dedupe.has("event-1")).toBe(false);
    });

    it("clears all keys", () => {
        const dedupe = createDeduplicator();
        dedupe.set("a", "1");
        dedupe.set("b", "2");
        dedupe.clear();
        expect(dedupe.has("a")).toBe(false);
        expect(dedupe.has("b")).toBe(false);
    });

    it("generates unique notification ids", () => {
        const ids = new Set(Array.from({ length: 100 }, () => createNotificationId()));
        expect(ids.size).toBe(100);
    });

    it("returns the per-type default duration when none is provided", () => {
        expect(defaultDuration("success")).toBe(4000);
        expect(defaultDuration("info")).toBe(4000);
        expect(defaultDuration("warning")).toBe(6000);
        expect(defaultDuration("error")).toBe(8000);
    });

    it("keeps an explicit duration when provided", () => {
        expect(defaultDuration("error", 2500)).toBe(2500);
    });

    it("treats a zero duration as persistent (no auto-dismiss)", () => {
        expect(defaultDuration("success", 0)).toBe(0);
    });

    it("caps the number of visible toasts and drops the oldest", () => {
        const toasts = [
            makeToast({ id: "1" }),
            makeToast({ id: "2" }),
            makeToast({ id: "3" }),
            makeToast({ id: "4" }),
            makeToast({ id: "5" }),
        ];

        const limited = applyMaxVisible(toasts, 3);
        expect(limited).toHaveLength(3);
        expect(limited.map((t) => t.id)).toEqual(["3", "4", "5"]);
    });

    it("uses the default maximum when none is provided", () => {
        const toasts = Array.from({ length: DEFAULT_MAX_VISIBLE_TOASTS + 3 }, (_, i) =>
            makeToast({ id: String(i) }),
        );
        expect(applyMaxVisible(toasts)).toHaveLength(DEFAULT_MAX_VISIBLE_TOASTS);
    });

    it("does not cap when within the limit", () => {
        const toasts = [makeToast(), makeToast()];
        expect(applyMaxVisible(toasts, 5)).toHaveLength(2);
    });
});