"use client";

import { useEffect } from "react";
import { useOrders } from "../hooks/useOrders";
import { useUser } from "@/features/user/presentation/context/UserContext";
import { ActiveOrderCard } from "./ActiveOrderCard";

export function ActiveOrdersSection() {
    const { currentUser } = useUser();
    const { orders, fetchUserOrders } = useOrders();

    useEffect(() => {
        if (currentUser?.userId) {
            fetchUserOrders(currentUser.userId);
        }
    }, [currentUser?.userId, fetchUserOrders]);

    // Only live orders belong in the "Active Orders" feed — cancelled and
    // completed orders have their own views.
    const activeOrders = orders.filter(
        (o) => o.orderStatus !== "cancelled" && o.orderStatus !== "completed"
    );

    if (activeOrders.length === 0) return null;

    return (
        <section className="w-full">
            <div className="flex items-center justify-between mb-5 px-1">
                <h2 className="text-white font-bold text-base tracking-wide">
                    Active Orders
                </h2>
            </div>

            {/* Desktop: 3-column grid | Mobile: horizontal scroll */}
            <div
                className="
                    flex gap-4
                    overflow-x-auto pb-2
                    sm:overflow-x-visible sm:pb-0
                    sm:grid sm:grid-cols-2
                    lg:grid lg:grid-cols-3
                "
                style={{ scrollbarWidth: "none" }}
            >
                {activeOrders.map((order) => (
                    <ActiveOrderCard
                        key={order.orderId}
                        order={order}
                        currentUserId={currentUser?.userId}
                    />
                ))}
            </div>
        </section>
    );
}
