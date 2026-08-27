import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Order } from "../models/order";
import { CreateOrder } from "../models/createOrder";
import { UpdateOrder } from "../models/updateOrder";
import { apiFetch, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export { ApiError };

export function useOrders() {
    const queryClient = useQueryClient();

    const [userId, setUserId] = useState<string | null>(null);

    const {
        data: orders = [],
        isLoading,
        isFetched,
        isError,
        error: queryError,
        refetch,
    } = useQuery<Order[]>({
        queryKey: userId ? queryKeys.orders.user(userId) : queryKeys.orders.all,
        queryFn: () => apiFetch<Order[]>(userId ? `/orders?userId=${userId}` : `/orders`),
        enabled: !!userId,
    });

    const error = isError
        ? (queryError instanceof Error ? queryError.message : "Orders not found")
        : null;

    const fetchUserOrders = useCallback(async (id: string) => {
        setUserId(id);
    }, []);

    const getOrder = async (orderId: string) => {
        return await queryClient.fetchQuery({
            queryKey: queryKeys.orders.detail(orderId),
            queryFn: () => apiFetch<Order>(`/orders/${orderId}`),
        });
    };

    const { mutateAsync: createOrder } = useMutation({
        mutationFn: (newOrder: CreateOrder) => apiFetch<Order>('/orders', {
            method: "POST",
            body: newOrder
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        }
    });

    const { mutateAsync: updateOrder } = useMutation({
        mutationFn: ({ orderId, update }: { orderId: string, update: UpdateOrder }) => apiFetch<Order>(`/orders/${orderId}`, {
            method: "PATCH",
            body: update
        }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
        }
    });

    const { mutateAsync: cancelOrder } = useMutation({
        mutationFn: (orderId: string) => apiFetch<Order>(`/orders/${orderId}/cancel`, {
            method: "POST"
        }),
        onSuccess: (_, orderId) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
        }
    });

    const wrappedUpdateOrder = (update: UpdateOrder, orderId: string) => updateOrder({ orderId, update });
    const wrappedCancelOrder = (orderId: string) => cancelOrder(orderId);

    return { 
        orders, 
        order: null,
        isLoading: isLoading || (!!userId && !isFetched && !isError),
        hasFetched: isFetched,
        error,
        refetch,
        createOrder, 
        getOrder, 
        updateOrder: wrappedUpdateOrder, 
        cancelOrder: wrappedCancelOrder, 
        fetchUserOrders 
    };
}
