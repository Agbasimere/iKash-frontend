import { useState, useCallback } from "react";
import { Order } from "../models/order";
import { CreateOrder } from "../models/createOrder";
import { UpdateOrder } from "../models/updateOrder";
import { apiFetch } from "@/lib/api";

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [order, setOrder] = useState<Order | null>(null);

    const fetchUserOrders = useCallback(async (userId: string) => {
        try {
            const data = await apiFetch<Order[]>(`/orders?userId=${userId}`, { defaultError: "Orders not found" });
            setOrders(data);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const getOrder = async (orderId: string) => {
        try {
            const data = await apiFetch<Order>(`/orders/${orderId}`, { defaultError: "Get order error" });
            setOrder(data);
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const createOrder = async (newOrder: CreateOrder) => {
        try {
            const data = await apiFetch<Order>("/orders", {
                method: "POST",
                body: newOrder,
                defaultError: "Creation order error",
            });
            setOrder(data);
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const updateOrder = async (updateOrder: UpdateOrder, orderId: string) => {
        try {
            const data = await apiFetch<Order>(`/orders/${orderId}`, {
                method: "PATCH",
                body: updateOrder,
                defaultError: "Update order error",
            });
            setOrder(data);
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const cancelOrder = async (orderId: string) => {
        try {
            const data = await apiFetch<Order>(`/orders/${orderId}/cancel`, {
                method: "POST",
                defaultError: "Cancel order error",
            });
            setOrder(data);
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return { orders, order, createOrder, getOrder, updateOrder, cancelOrder, fetchUserOrders };
}