import { useEffect, useState, useCallback, useRef } from "react";
import { Offer } from "../models/offer";
import { CreateOffer } from "../models/createOffer";
import { UpdateOffer } from "../models/updateOffer";
import { apiFetch } from "@/lib/api";

export function useOffers(filters?: Record<string, string>) {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [offer, setOffer] = useState<Offer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Tracks the AbortController for the most recent in-flight fetch so that
    // stale responses from earlier requests cannot overwrite newer results.
    const abortRef = useRef<AbortController | null>(null);

    const fetchOffers = useCallback(async (currentFilters?: Record<string, string>) => {
        // Cancel any previous in-flight request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        try {
            let url = "/offers";
            if (currentFilters) {
                const params = new URLSearchParams(currentFilters);
                const queryString = params.toString();
                if (queryString) {
                    url += `?${queryString}`;
                }
            }
            const data = await apiFetch<Offer[]>(url, { signal: controller.signal, authenticated: false });
            setOffers(data);
        } catch (err: unknown) {
            // Ignore intentional aborts (stale request cancelled by newer one)
            if (err instanceof Error && err.name === "AbortError") return;
            console.error(err);
        } finally {
            // Only clear loading if this controller is still the active one
            if (abortRef.current === controller) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchOffers(filters);
    }, [filters, fetchOffers]);

    const getOffer = async (offerId: string) => {
        try {
            const data = await apiFetch<Offer>(`/offers/${offerId}`, { authenticated: false });
            setOffer(data);
        } catch (error) {
            console.error(error)
        }
    }

    const createOffer = async (newOffer: CreateOffer) => {
        try {
            return await apiFetch<Offer>("/offers", {
                method: "POST",
                body: newOffer,
                defaultError: "Create offer error",
            });
        } catch (error) {
            console.error('Error', error);
            throw error;
        }
    }

    const updateOffer = async (offerId: string, updateOffer: UpdateOffer) => {
        try {
            const data = await apiFetch<Offer>(`/offers/${offerId}`, {
                method: "PATCH",
                body: updateOffer,
                defaultError: "Update offer error",
            });
            setOffer(data);
        } catch (error) {
            console.error('Error updating offer:', error);
            throw error;
        }
    }

    const deleteOffer = async (offerId: string) => {
        try {
            const data = await apiFetch<Offer>(`/offers/${offerId}`, {
                method: "DELETE",
            });
            setOffer(data);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    return { offers, offer, fetchOffers, getOffer, createOffer, updateOffer, deleteOffer, isLoading };
}