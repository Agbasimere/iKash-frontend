export interface Message {
    messageId: string;
    orderId: string;
    senderId: string;
    content: string;
    timestamp: string;
    senderAlias?: string;
}
