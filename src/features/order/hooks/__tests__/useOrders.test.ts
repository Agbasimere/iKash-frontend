import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOrders } from "../useOrders";
import { apiFetch, ApiError } from "@/lib/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/lib/api", () => ({
    apiFetch: vi.fn(),
    ApiError: class extends Error {
        status: number;
        code?: string;

        constructor(message: string, status: number, code?: string) {
            super(message);
            this.name = "ApiError";
            this.status = status;
            this.code = code;
        }
    },
}));

const mockedApiFetch = vi.mocked(apiFetch);

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
});

export function createWrapper() {
    const testQueryClient = createTestQueryClient();
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: testQueryClient }, children);
    };
}

describe("useOrders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("cancelOrder", () => {
        it("calls POST /orders/:id/cancel and returns the updated order", async () => {
            const updatedOrder = { orderId: "order-1", orderStatus: "cancelled" };
            mockedApiFetch.mockResolvedValueOnce(updatedOrder);

            const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });

            let response: unknown;
            await act(async () => {
                response = await result.current.cancelOrder("order-1");
            });

            expect(mockedApiFetch).toHaveBeenCalledWith("/orders/order-1/cancel", { method: "POST" });
            expect(response).toEqual(updatedOrder);
        });

        it("throws an ApiError carrying the HTTP status and backend error code on 409", async () => {
            mockedApiFetch.mockRejectedValueOnce(
                new ApiError(
                    'Order order-1 cannot be cancelled because it is already "released"',
                    409,
                    "ORDER_CANCELLATION_NOT_ALLOWED",
                ),
            );

            const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });

            let caught: unknown;
            await act(async () => {
                try {
                    await result.current.cancelOrder("order-1");
                } catch (err) {
                    caught = err;
                }
            });

            expect(caught).toBeInstanceOf(ApiError);
            expect((caught as ApiError).status).toBe(409);
            expect((caught as ApiError).code).toBe("ORDER_CANCELLATION_NOT_ALLOWED");
        });

        it("throws an ApiError with status 403 when the user is not a participant", async () => {
            mockedApiFetch.mockRejectedValueOnce(
                new ApiError("Only the buyer or seller on this order can cancel it", 403, "UNAUTHORIZED_ACTION"),
            );

            const { result } = renderHook(() => useOrders(), { wrapper: createWrapper() });

            let caught: unknown;
            await act(async () => {
                try {
                    await result.current.cancelOrder("order-1");
                } catch (err) {
                    caught = err;
                }
            });

            expect(caught).toBeInstanceOf(ApiError);
            expect((caught as ApiError).status).toBe(403);
            expect((caught as ApiError).code).toBe("UNAUTHORIZED_ACTION");
        });
    });
});
