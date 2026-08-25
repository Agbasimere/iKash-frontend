import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveOrdersSection } from "../ActiveOrdersSection";
import type { Order } from "../../models/order";
import type { Users } from "../../../user/models/users";

const mockFetchUserOrders = vi.fn();
const mockOrders: Order[] = [];

vi.mock("../../hooks/useOrders", () => ({
    useOrders: () => ({
        orders: mockOrders,
        fetchUserOrders: mockFetchUserOrders,
    }),
}));

vi.mock("@/features/user/presentation/context/UserContext", () => ({
    useUser: () => ({
        currentUser: { userId: "user-1" } as Users,
    }),
}));

// Mock the ActiveOrderCard to keep tests focused on the section
vi.mock("../ActiveOrderCard", () => ({
    ActiveOrderCard: ({ order }: { order: Order }) => (
        <div data-testid="active-order-card" data-order-id={order.orderId}>
            {order.orderId}
        </div>
    ),
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        orderId: "order-1",
        offerId: "offer-1",
        buyerId: "user-1",
        sellerId: "seller-1",
        assetAmount: "0.05",
        fiatAmount: "3250.00",
        orderStatus: "pending",
        expiresAt: null,
        createdAt: "2026-10-24T12:00:00.000Z",
        ...overrides,
    };
}

describe("ActiveOrdersSection", () => {
    beforeEach(() => {
        mockOrders.length = 0;
        mockFetchUserOrders.mockClear();
    });

    it("fetches the current user's orders on mount", () => {
        render(<ActiveOrdersSection />);
        expect(mockFetchUserOrders).toHaveBeenCalledWith("user-1");
    });

    it("renders only active (non-cancelled, non-completed) order cards", () => {
        mockOrders.push(
            makeOrder({ orderId: "order-active-1" }),
            makeOrder({ orderId: "order-active-2", orderStatus: "pending" }),
            makeOrder({ orderId: "order-completed", orderStatus: "completed" }),
            makeOrder({ orderId: "order-cancelled", orderStatus: "cancelled" }),
        );

        render(<ActiveOrdersSection />);
        const cards = screen.getAllByTestId("active-order-card");
        const ids = cards.map((c) => c.getAttribute("data-order-id"));
        expect(ids).toEqual(["order-active-1", "order-active-2"]);
    });

    it("renders the section heading", () => {
        mockOrders.push(makeOrder());
        render(<ActiveOrdersSection />);
        expect(screen.getByRole("heading", { name: /active orders/i })).toBeDefined();
    });

    it("renders nothing when there are no active orders", () => {
        mockOrders.push(
            makeOrder({ orderId: "order-completed", orderStatus: "completed" }),
            makeOrder({ orderId: "order-cancelled", orderStatus: "cancelled" }),
        );

        const { container } = render(<ActiveOrdersSection />);
        expect(screen.queryAllByTestId("active-order-card")).toHaveLength(0);
        expect(container.firstChild).toBeNull();
    });

    it("renders nothing when there are no orders at all", () => {
        const { container } = render(<ActiveOrdersSection />);
        expect(container.firstChild).toBeNull();
    });
});
