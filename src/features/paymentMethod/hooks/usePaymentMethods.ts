import { useEffect, useState } from "react";
import { PaymentMethod } from "../models/paymentMethod";
import { CreatePaymentMethod } from "../models/createPaymentMethod";
import { UpdatePaymentMethod } from "../models/updatePaymentMethod";
import { apiFetch } from "@/lib/api";

export function usePaymentMethods() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [method, setMethod] = useState<PaymentMethod | null>(null);

    useEffect(() => {
        apiFetch<PaymentMethod[]>("/payment-methods", { authenticated: false })
            .then(data => {
                setMethods(data);
            })
            .catch(err => console.error("Failed to load payment methods:", err));
    }, []);

    const getPaymentMethod = async (methodId: string) => {
        try {
            const data = await apiFetch<PaymentMethod>(`/payment-methods/${methodId}`);
            setMethod(data);
        } catch (error) {
            console.error(error);
        }
    }

    const createPaymentMethod = async (paymentMethod: CreatePaymentMethod) => {
        try {
            const data = await apiFetch<PaymentMethod>("/payment-methods", {
                method: "POST",
                body: paymentMethod,
                authenticated: false,
            });
            setMethod(data);
        } catch (error) {
            console.error(error);
        }
    }

    const updateMethod = async (methodId: string, update: UpdatePaymentMethod) => {
        try {
            const data = await apiFetch<PaymentMethod>(`/payment-methods/${methodId}`, {
                method: "PATCH",
                body: update,
            });
            setMethod(data);
        } catch (err) {
            console.error(err);
        }
    }

    const deleteMethod = async (methodId: string) => {
        try {
            const data = await apiFetch<PaymentMethod>(`/payment-methods/${methodId}`, {
                method: "DELETE",
            });
            setMethod(data);
        } catch (error) {
            console.error(error);
        }
    }

    return { methods, method, getPaymentMethod, createPaymentMethod, updateMethod, deleteMethod }
}