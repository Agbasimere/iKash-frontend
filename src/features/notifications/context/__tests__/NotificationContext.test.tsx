import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { NotificationProvider } from "../NotificationContext";
import { useNotifications } from "../../hooks/useNotifications";

function Harness() {
    const { notify, dismiss, dismissAll } = useNotifications();

    return (
        <div>
            <button
                type="button"
                onClick={() =>
                    notify({
                        type: "success",
                        title: "Escrow funded",
                        message: "The escrow was funded successfully.",
                    })
                }
            >
                success
            </button>
            <button
                type="button"
                onClick={() =>
                    notify({
                        type: "error",
                        title: "Transaction failed",
                        message: "Please try again.",
                    })
                }
            >
                error
            </button>
            <button
                type="button"
                onClick={() =>
                    notify({
                        type: "warning",
                        title: "Wrong Stellar network detected",
                    })
                }
            >
                warning
            </button>
            <button
                type="button"
                onClick={() =>
                    notify({
                        type: "info",
                        title: "New message received",
                        message: "Hello!",
                    })
                }
            >
                info
            </button>
            <button
                type="button"
                data-testid="dupe"
                onClick={() =>
                    notify({
                        type: "info",
                        title: "New message received",
                        message: "Hello!",
                        dedupeKey: "chat-message:msg-1",
                    })
                }
            >
                dupe
            </button>
            <button
                type="button"
                data-testid="action"
                onClick={() =>
                    notify({
                        type: "success",
                        title: "Order funded",
                        action: { label: "View order", href: "/p2p/orders/order-1" },
                    })
                }
            >
                action
            </button>
            <button
                type="button"
                data-testid="legacy"
                onClick={() => notify("error", "Legacy message")}
            >
                legacy
            </button>
            <button type="button" data-testid="dismiss" onClick={() => dismissAll()}>
                dismiss-all
            </button>
        </div>
    );
}

function renderHarness() {
    return render(
        <NotificationProvider>
            <Harness />
        </NotificationProvider>,
    );
}

describe("NotificationProvider", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("displays a success notification with title and message", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));

        const toast = screen.getByRole("status");
        expect(within(toast).getByText("Escrow funded")).toBeDefined();
        expect(within(toast).getByText("The escrow was funded successfully.")).toBeDefined();
        expect(within(toast).getByText("Success")).toBeDefined();
    });

    it("displays an error notification with an assertive live region", () => {
        renderHarness();
        fireEvent.click(screen.getByText("error"));

        const toast = screen.getByRole("alert");
        expect(within(toast).getByText("Transaction failed")).toBeDefined();
        expect(toast.getAttribute("aria-live")).toBe("assertive");
    });

    it("supports all notification variants", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));
        fireEvent.click(screen.getByText("error"));
        fireEvent.click(screen.getByText("warning"));
        fireEvent.click(screen.getByText("info"));

        expect(screen.getAllByRole("status")).toHaveLength(2);
        expect(screen.getAllByRole("alert")).toHaveLength(2);
        expect(screen.getByText("Wrong Stellar network detected")).toBeDefined();
        expect(screen.getByText("New message received")).toBeDefined();
    });

    it("supports the legacy positional notify signature", () => {
        renderHarness();
        fireEvent.click(screen.getByTestId("legacy"));

        const toast = screen.getByRole("alert");
        expect(within(toast).getByText("Legacy message")).toBeDefined();
    });

    it("automatically dismisses a toast after the configured duration", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));
        expect(screen.getByRole("status")).toBeDefined();

        act(() => {
            vi.advanceTimersByTime(4000);
        });

        expect(screen.queryByRole("status")).toBeNull();
    });

    it("keeps error notifications visible longer than success ones", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));
        fireEvent.click(screen.getByText("error"));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(screen.queryByText("Escrow funded")).toBeNull();
        expect(screen.getByText("Transaction failed")).toBeDefined();

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(screen.queryByText("Transaction failed")).toBeNull();
    });

    it("allows manual dismissal", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));

        const toast = screen.getByRole("status");
        fireEvent.click(within(toast).getByLabelText("Dismiss notification"));

        expect(screen.queryByRole("status")).toBeNull();
    });

    it("stacks multiple notifications", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));
        fireEvent.click(screen.getByText("warning"));
        fireEvent.click(screen.getByText("info"));

        expect(screen.getAllByRole("status")).toHaveLength(2);
        expect(screen.getAllByRole("alert")).toHaveLength(1);
        expect(screen.getAllByRole("status").length + screen.getAllByRole("alert").length).toBe(3);
    });

    it("limits the number of visible notifications and removes the oldest", () => {
        renderHarness();
        for (let i = 0; i < 6; i += 1) {
            fireEvent.click(screen.getByText("success"));
        }

        const visible = screen.getAllByRole("status");
        expect(visible).toHaveLength(4);
    });

    it("does not create duplicate toasts for the same event key", () => {
        renderHarness();
        fireEvent.click(screen.getByTestId("dupe"));
        fireEvent.click(screen.getByTestId("dupe"));
        fireEvent.click(screen.getByTestId("dupe"));

        const toasts = screen.getAllByText("New message received");
        expect(toasts).toHaveLength(1);
    });

    it("renders an action link that navigates to the relevant page", () => {
        renderHarness();
        fireEvent.click(screen.getByTestId("action"));

        const link = screen.getByRole("link", { name: "View order" });
        expect(link.getAttribute("href")).toBe("/p2p/orders/order-1");
    });

    it("dismisses a toast when the escape key is pressed", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));
        expect(screen.getByRole("status")).toBeDefined();

        act(() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        });

        expect(screen.queryByRole("status")).toBeNull();
    });

    it("does not crash when given an invalid type or a missing title", () => {
        render(
            <NotificationProvider>
                <InvalidTypeHarness />
            </NotificationProvider>,
        );

        fireEvent.click(screen.getByTestId("invalid"));

        const toast = screen.getByRole("status");
        expect(toast).toBeDefined();
        expect(within(toast).getByText("Notification")).toBeDefined();
    });

    it("does not render the container when there are no notifications", () => {
        renderHarness();
        expect(screen.queryByRole("region", { name: "Notifications" })).toBeNull();
    });

    it("dismisses all notifications", () => {
        renderHarness();
        fireEvent.click(screen.getByText("success"));
        fireEvent.click(screen.getByText("error"));

        fireEvent.click(screen.getByTestId("dismiss"));

        expect(screen.queryByRole("status")).toBeNull();
        expect(screen.queryByRole("alert")).toBeNull();
    });
});

function InvalidTypeHarness() {
    const { notify } = useNotifications();
    return (
        <button
            type="button"
            data-testid="invalid"
            onClick={() =>
                notify({
                    type: "bogus" as "success",
                    title: " ",
                })
            }
        >
            invalid
        </button>
    );
}