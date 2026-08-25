import type { Message } from "@/features/chat/models/message";

/**
 * Demo-only chat fixtures (IKSH-46).
 *
 * Imported exclusively from `Chat.tsx` inside `DEMO_MODE && ...` guarded
 * branches so this module is tree-shaken out of production bundles. Keep this
 * file free of side effects.
 */
export const DEMO_SELLER_ID = "seller-123";
export const DEMO_SELLER_ALIAS = "CryptoKing_99";

/** Initial fabricated conversation matching the design screenshots. */
export function initialMockMessages(orderId: string, currentUserId: string): Message[] {
    return [
        {
            messageId: "msg-mock-1",
            orderId,
            senderId: DEMO_SELLER_ID,
            content:
                "Hello! I am online and ready to confirm. Please include the order ID in the transfer notes.",
            timestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
            senderAlias: DEMO_SELLER_ALIAS,
        },
        {
            messageId: "msg-mock-2",
            orderId,
            senderId: currentUserId,
            content:
                "Understood. Just initiated the transfer from my mobile app. Will upload the receipt in a moment.",
            timestamp: new Date(Date.now() - 200000).toISOString(), // 3 min ago
            senderAlias: "Buyer",
        },
        {
            messageId: "msg-mock-3",
            orderId,
            senderId: DEMO_SELLER_ID,
            content: "Perfect. I'll be monitoring the incoming transactions.",
            timestamp: new Date(Date.now() - 100000).toISOString(), // 1 min ago
            senderAlias: DEMO_SELLER_ALIAS,
        },
    ];
}

/** A fabricated message representing the current user sending a demo message. */
export function createDemoUserMessage(
    orderId: string,
    senderId: string,
    senderAlias: string,
    content: string,
): Message {
    return {
        messageId: `user-msg-${Date.now()}`,
        orderId,
        senderId,
        content,
        timestamp: new Date().toISOString(),
        senderAlias,
    };
}

/** Fabricated counterparty reply used to simulate a conversation in demo mode. */
export function createDemoSellerReply(orderId: string, content: string): Message {
    return {
        messageId: `seller-reply-${Date.now()}`,
        orderId,
        senderId: DEMO_SELLER_ID,
        content,
        timestamp: new Date().toISOString(),
        senderAlias: DEMO_SELLER_ALIAS,
    };
}

/** Smart-response text used by the simulated counterparty in demo mode. */
export function demoReplyFor(inputText: string): string {
    return inputText.toLowerCase().includes("receipt") || inputText.toLowerCase().includes("uploaded")
        ? "Awesome, checking the payment proof now! Give me a minute to verify on my SEPA portal."
        : "No problem, please let me know when you lock the funds on-chain.";
}
