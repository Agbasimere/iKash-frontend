import type { Order } from "../models/order";
import type { Users } from "../../user/models/users";

/**
 * Fabricated order used to preview the trade page during design validation.
 *
 * Demo-only (IKSH-46): imported exclusively from
 * `src/app/(protected)/p2p/orders/[orderId]/page.tsx` inside a
 * `DEMO_MODE && ...` guarded branch, so it is tree-shaken out of production
 * bundles. Keep this file free of side effects.
 */
export function createDemoOrder(currentUser: Users): Order {
    return {
        orderId: "mock-uuid-1",
        offerId: "offer-1",
        buyerId: currentUser.userId,
        sellerId: "seller-123",
        assetAmount: "0.05",
        fiatAmount: "3250.00",
        orderStatus: "pending",
        createdAt: "2026-10-24T12:00:00.000Z",
        expiresAt: "2026-10-24T13:00:00.000Z",
        buyer: {
            userId: currentUser.userId,
            alias: currentUser.alias || "Buyer",
            publicKey: currentUser.publicKey || "G_BUYER_KEY_MOCK...",
            kycStatus: currentUser.kycStatus || "approved",
            notificationsEnabled: false,
            pendingAccountInfo: false,
            totalVolume: "0",
            createdAt: "2026-01-01T00:00:00.000Z",
        },
        seller: {
            userId: "seller-123",
            alias: "CryptoKing_99",
            publicKey: "G_SELLER_KEY_MOCK...",
            kycStatus: "approved",
            notificationsEnabled: false,
            pendingAccountInfo: false,
            totalVolume: "15000",
            createdAt: "2026-01-01T00:00:00.000Z",
        },
        offer: {
            offerId: "offer-1",
            creatorId: "seller-123",
            price: "65000",
            assetCode: "USDC",
            type: "sell",
            minAmount: "10",
            maxAmount: "10000",
            status: "active",
            payment_methods: [
                {
                    payment_id: "pm-1",
                    bankName: "Bank Transfer SEPA",
                    account_identifier: "ES12 3456 7890 1234 5678",
                    beneficiary_name: "QuantVortex_LP",
                    payment_provider: {
                        name: "Bank Transfer SEPA",
                        type: "bank",
                    },
                },
            ],
            paymentMethods: [
                {
                    paymentId: "pm-1",
                    bankName: "Bank Transfer SEPA",
                    accountDetails: "ES12 3456 7890 1234 5678",
                    beneficiaryName: "QuantVortex_LP",
                    type: "bank",
                },
            ],
        },
        escrow: {
            escrowId: "escrow-mock-1",
            orderId: "mock-uuid-1",
            escrowStatus: "pending" as const,
            buyerAddress: currentUser.publicKey || "G_BUYER_KEY_MOCK...",
            sellerAddress: "G_SELLER_KEY_MOCK...",
            amount: "0.05",
            evidenceUrl: null,
        },
    };
}
