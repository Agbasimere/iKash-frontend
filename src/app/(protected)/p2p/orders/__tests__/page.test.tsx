import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrdersPage from "../page";
import type { Order } from "@/features/order/models/order";
import type { Users } from "@/features/user/models/users";
import * as UserContextModule from "@/features/user/presentation/context/UserContext";

const mockPush = vi.fn();
const CURRENT_USER_ID = "user-1";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => "/p2p/orders",
}));

vi.mock("@/app/components/Aside", () => ({
    Aside: () => <aside data-testid="aside" />,
}));

vi.mock("@/app/components/Header", () => ({
    Header: () => <header data-testid="header" />,
}));

vi.mock("../../components/OrderNavbar", () => ({
    OrderNavbar: () => <nav data-testid="order-navbar" />,
}));

vi.mock("@/features/user/presentation/context/UserContext", () => ({
    useUser: vi.fn(),
}));

const mockedUseUser = vi.mocked(UserContextModule.useUser);

function makeUser(overrides: Partial<Users> = {}): Users {
    return {
        userId: CURRENT_USER_ID,
        publicKey: "G".padEnd(56, "A"),
        alias: "Tester",
        notificationsEnabled: false,
        pendingAccountInfo: false,
        kycStatus: "approved",
        totalVolume: "0",
        createdAt: "2026-01-01T00:00:00.000Z",
        ...overrides,
    };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        orderId: "order-1",
        offerId: "offer-1",
        buyerId: CURRENT_USER_ID,
        sellerId: "seller-1",
        assetAmount: "10",
        fiatAmount: "10",
        orderStatus: "pending",
        expiresAt: null,
        createdAt: "2026-08-01T00:00:00.000Z",
        assetCode: "USDC",
        seller: makeUser({ userId: "seller-1", alias: "Alice" }),
        buyer: makeUser({ userId: CURRENT_USER_ID, alias: "Tester" }),
        ...overrides,
    };
}

function mockFetchResponse(status: number, body: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response;
}

function orderRows() {
    return document.querySelectorAll("[data-order-id]");
}

describe("OrdersPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => {});
        mockedUseUser.mockReturnValue({
            currentUser: makeUser(),
            accessToken: "test-token",
            logout: vi.fn(),
            setCurrentUser: vi.fn(),
            setAccessToken: vi.fn(),
            isLoading: false,
            setIsLoading: vi.fn(),
        } as unknown as ReturnType<typeof UserContextModule.useUser>);
        vi.stubGlobal("fetch", vi.fn());
    });

    it("shows loading skeletons while the orders request is in flight", () => {
        (fetch as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

        render(<OrdersPage />);

        expect(screen.getByTestId("orders-skeleton")).toBeTruthy();
        expect(screen.queryByText("You do not have any orders yet.")).toBeNull();
        expect(orderRows()).toHaveLength(0);
    });

    it("shows the empty state when the API returns zero orders", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockFetchResponse(200, []));

        render(<OrdersPage />);

        expect(await screen.findByText("You do not have any orders yet.")).toBeTruthy();
        expect(screen.queryByTestId("orders-skeleton")).toBeNull();
        expect(screen.queryByText("CryptoKing_99")).toBeNull();
        expect(screen.queryByText("StellarWhale")).toBeNull();
        expect(screen.queryByText("OxDeFi_Master")).toBeNull();
        expect(screen.queryByText("Nova_Trader")).toBeNull();
        expect(orderRows()).toHaveLength(0);
    });

    it("renders a single API order", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            mockFetchResponse(200, [makeOrder({ orderId: "order-1" })]),
        );

        render(<OrdersPage />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        expect(orderRows()).toHaveLength(1);
        expect(orderRows()[0].getAttribute("data-order-id")).toBe("order-1");
        expect(screen.queryByText("You do not have any orders yet.")).toBeNull();
        expect(screen.queryByText("CryptoKing_99")).toBeNull();
    });

    it("renders multiple API orders", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            mockFetchResponse(200, [
                makeOrder({ orderId: "order-1", seller: makeUser({ userId: "seller-1", alias: "Alice" }) }),
                makeOrder({
                    orderId: "order-2",
                    buyerId: "buyer-2",
                    sellerId: CURRENT_USER_ID,
                    buyer: makeUser({ userId: "buyer-2", alias: "Bob" }),
                    seller: makeUser({ userId: CURRENT_USER_ID, alias: "Tester" }),
                    orderStatus: "completed",
                }),
            ]),
        );

        render(<OrdersPage />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        expect(screen.getByText("Bob")).toBeTruthy();
        expect(orderRows()).toHaveLength(2);
        expect(Array.from(orderRows()).map((row) => row.getAttribute("data-order-id"))).toEqual([
            "order-1",
            "order-2",
        ]);
    });

    it("displays only orders that belong to the authenticated user", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            mockFetchResponse(200, [
                makeOrder({ orderId: "mine", seller: makeUser({ userId: "seller-1", alias: "Alice" }) }),
                makeOrder({
                    orderId: "someone-else",
                    buyerId: "other-buyer",
                    sellerId: "other-seller",
                    buyer: makeUser({ userId: "other-buyer", alias: "Intruder" }),
                    seller: makeUser({ userId: "other-seller", alias: "Stranger" }),
                }),
            ]),
        );

        render(<OrdersPage />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        expect(screen.queryByText("Intruder")).toBeNull();
        expect(screen.queryByText("Stranger")).toBeNull();
        expect(orderRows()).toHaveLength(1);
        expect(orderRows()[0].getAttribute("data-order-id")).toBe("mine");
    });

    it("requests orders for the authenticated user", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockFetchResponse(200, []));

        render(<OrdersPage />);

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining(`/orders?userId=${CURRENT_USER_ID}`),
                expect.anything(),
            );
        });
    });

    it("shows an error state with retry instead of mock orders when the API fails", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            mockFetchResponse(500, { message: "Orders not found" }),
        );

        render(<OrdersPage />);

        expect(await screen.findByRole("alert")).toBeTruthy();
        expect(screen.getByText("Could not load your orders.")).toBeTruthy();
        expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
        expect(screen.queryByText("CryptoKing_99")).toBeNull();
        expect(orderRows()).toHaveLength(0);
    });

    it("retries the orders request from the error state", async () => {
        (fetch as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(mockFetchResponse(500, { message: "Orders not found" }))
            .mockResolvedValueOnce(
                mockFetchResponse(200, [makeOrder({ orderId: "order-1" })]),
            );

        render(<OrdersPage />);

        expect(await screen.findByRole("button", { name: /retry/i })).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: /retry/i }));

        expect(await screen.findByText("Alice")).toBeTruthy();
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("shows a filter empty state without mock orders when filters hide results", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            mockFetchResponse(200, [makeOrder({ orderId: "order-1", orderStatus: "pending" })]),
        );

        render(<OrdersPage />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "COMPLETED" }));

        expect(screen.getByText("No orders match selected filters.")).toBeTruthy();
        expect(screen.queryByText("You do not have any orders yet.")).toBeNull();
        expect(orderRows()).toHaveLength(0);
    });

    it("navigates to the real order detail page when a row is clicked", async () => {
        (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            mockFetchResponse(200, [makeOrder({ orderId: "order-42" })]),
        );

        render(<OrdersPage />);

        expect(await screen.findByText("Alice")).toBeTruthy();
        fireEvent.click(orderRows()[0]);

        expect(mockPush).toHaveBeenCalledWith("/p2p/orders/order-42");
        expect(mockPush).not.toHaveBeenCalledWith("/p2p/orders/demo");
    });
});
