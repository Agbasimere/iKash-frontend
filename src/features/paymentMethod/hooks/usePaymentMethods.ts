import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod } from "../models/paymentMethod";
import { CreatePaymentMethod } from "../models/createPaymentMethod";
import { UpdatePaymentMethod } from "../models/updatePaymentMethod";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function usePaymentMethods() {
    const queryClient = useQueryClient();

    const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
        queryKey: queryKeys.paymentMethods.all,
        queryFn: () => apiFetch<PaymentMethod[]>('/payment-methods')
    });

    const getPaymentMethod = async (methodId: string) => {
        return await queryClient.fetchQuery({
            queryKey: queryKeys.paymentMethods.detail(methodId),
            queryFn: () => apiFetch<PaymentMethod>(`/payment-methods/${methodId}`)
        });
    };

    const { mutateAsync: createPaymentMethod } = useMutation({
        mutationFn: (paymentMethod: CreatePaymentMethod) => apiFetch<PaymentMethod>('/payment-methods', {
            method: "POST",
            body: paymentMethod
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
        }
    });

    const { mutateAsync: updateMethod } = useMutation({
        mutationFn: ({ methodId, update }: { methodId: string, update: UpdatePaymentMethod }) => apiFetch<PaymentMethod>(`/payment-methods/${methodId}`, {
            method: "PATCH",
            body: update
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
        }
    });

    const { mutateAsync: deleteMethod } = useMutation({
        mutationFn: (methodId: string) => apiFetch<void>(`/payment-methods/${methodId}`, {
            method: "DELETE"
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
        }
    });

    const wrappedUpdateMethod = (methodId: string, update: UpdatePaymentMethod) => updateMethod({ methodId, update });
    const wrappedDeleteMethod = (methodId: string) => deleteMethod(methodId);

    return { 
        methods, 
        method: null, 
        getPaymentMethod, 
        createPaymentMethod, 
        updateMethod: wrappedUpdateMethod, 
        deleteMethod: wrappedDeleteMethod,
        isLoading
    };
}