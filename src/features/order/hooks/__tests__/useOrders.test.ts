import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ApiError } from "@/lib/api";
import { useOrders } from "../useOrders";
import * as api from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/api")>();
    return {
        ...actual,
        apiFetch: vi.fn(),
    };
});

const mockedApiFetch = vi.mocked(api.apiFetch);

describe("useOrders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("cancelOrder", () => {
        it("calls apiFetch with the cancel endpoint and returns the updated order", async () => {
            const updatedOrder = { orderId: "order-1", orderStatus: "cancelled" };
            mockedApiFetch.mockResolvedValueOnce(updatedOrder);

            const { result } = renderHook(() => useOrders());

            let response: unknown;
            await act(async () => {
                response = await result.current.cancelOrder("order-1");
            });

            expect(mockedApiFetch).toHaveBeenCalledWith(
                "/orders/order-1/cancel",
                expect.objectContaining({
                    method: "POST",
                }),
            );
            expect(response).toEqual(updatedOrder);
            expect(result.current.order).toEqual(updatedOrder);
        });

        it("throws an ApiError carrying the HTTP status and backend error code on 409", async () => {
            mockedApiFetch.mockRejectedValueOnce(
                new ApiError("cannot cancel", 409, "ORDER_CANCELLATION_NOT_ALLOWED"),
            );

            const { result } = renderHook(() => useOrders());

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
                new ApiError("not a participant", 403, "UNAUTHORIZED_ACTION"),
            );

            const { result } = renderHook(() => useOrders());

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

        it("propagates the 401 ApiError thrown by the api client", async () => {
            mockedApiFetch.mockRejectedValueOnce(new ApiError("Sesión expirada.", 401));

            const { result } = renderHook(() => useOrders());

            await act(async () => {
                await expect(result.current.cancelOrder("order-1")).rejects.toThrow();
            });
        });
    });
});