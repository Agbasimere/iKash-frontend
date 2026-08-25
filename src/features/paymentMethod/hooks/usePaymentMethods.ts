import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentMethod } from "../models/paymentMethod";
import { CreatePaymentMethod } from "../models/createPaymentMethod";
import { UpdatePaymentMethod } from "../models/updatePaymentMethod";
import { useApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function usePaymentMethods() {
    const { apiFetch } = useApi();
    const queryClient = useQueryClient();

    const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
        queryKey: queryKeys.paymentMethods.all,
        queryFn: () => apiFetch('/payment-methods')
    });

    const getPaymentMethod = async (methodId: string) => {
        return await queryClient.fetchQuery({
            queryKey: queryKeys.paymentMethods.detail(methodId),
            queryFn: () => apiFetch(`/payment-methods/${methodId}`)
        });
    };

    const { mutateAsync: createPaymentMethod } = useMutation({
        mutationFn: (paymentMethod: CreatePaymentMethod) => apiFetch('/payment-methods', {
            method: "POST",
            body: JSON.stringify(paymentMethod)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
        }
    });

    const { mutateAsync: updateMethod } = useMutation({
        mutationFn: ({ methodId, update }: { methodId: string, update: UpdatePaymentMethod }) => apiFetch(`/payment-methods/${methodId}`, {
            method: "PATCH",
            body: JSON.stringify(update)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
        }
    });

    const { mutateAsync: deleteMethod } = useMutation({
        mutationFn: (methodId: string) => apiFetch(`/payment-methods/${methodId}`, {
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