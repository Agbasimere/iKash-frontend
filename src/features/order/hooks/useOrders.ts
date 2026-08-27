import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Order } from "../models/order";
import { CreateOrder } from "../models/createOrder";
import { UpdateOrder } from "../models/updateOrder";
import { useApi, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export { ApiError };

export function useOrders() {
    const { apiFetch } = useApi();
    const queryClient = useQueryClient();

    const [userId, setUserId] = useState<string | null>(null);

    const { data: orders = [] } = useQuery<Order[]>({
        queryKey: userId ? queryKeys.orders.user(userId) : queryKeys.orders.all,
        queryFn: () => apiFetch(userId ? `/orders?userId=${userId}` : `/orders`),
        enabled: !!userId,
    });

    const fetchUserOrders = useCallback(async (id: string) => {
        setUserId(id);
    }, []);

    const getOrder = async (orderId: string) => {
        return await queryClient.fetchQuery({
            queryKey: queryKeys.orders.detail(orderId),
            queryFn: () => apiFetch(`/orders/${orderId}`),
        });
    };

    const { mutateAsync: createOrder } = useMutation({
        mutationFn: (newOrder: CreateOrder) => apiFetch('/orders', {
            method: "POST",
            body: JSON.stringify(newOrder)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
        }
    });

    const { mutateAsync: updateOrder } = useMutation({
        mutationFn: ({ orderId, update }: { orderId: string, update: UpdateOrder }) => apiFetch(`/orders/${orderId}`, {
            method: "PATCH",
            body: JSON.stringify(update)
        }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(variables.orderId) });
        }
    });

    const { mutateAsync: cancelOrder } = useMutation({
        mutationFn: (orderId: string) => apiFetch(`/orders/${orderId}/cancel`, {
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
        createOrder, 
        getOrder, 
        updateOrder: wrappedUpdateOrder, 
        cancelOrder: wrappedCancelOrder, 
        fetchUserOrders 
    };
}
