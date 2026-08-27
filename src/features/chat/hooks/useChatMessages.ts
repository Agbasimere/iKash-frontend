import { useState } from "react";
import { Message } from "../models/message";
import { CreateMessage } from "../models/createMessage";
import { apiFetch } from "@/lib/api";

export function useChatMessages() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [message, setMessage] = useState<Message | null>(null);

    const getMessages = async (orderId: string) => {
        try {
            const data = await apiFetch<Message[]>(`/chat-messages?orderId=${orderId}`);
            setMessages(data);
        } catch (error) {
            console.error(error);
        }
    }

    const getMessage = async (messageId: string) => {
        try {
            const data = await apiFetch<Message>(`/chat-messages/${messageId}`);
            setMessage(data);
        } catch (error) {
            console.log(error);
        }
    }

    const createMessage = async (newMessage: CreateMessage) => {
        try {
            const data = await apiFetch<Message>("/chat-messages", {
                method: "POST",
                body: newMessage,
            });
            setMessage(data);
        } catch (error) {
            console.log(error);
        }
    }

    const deleteMessage = async (messageId: string) => {
        try {
            const data = await apiFetch<Message>(`/chat-messages/${messageId}`, {
                method: "DELETE",
            });
            setMessage(data);
        } catch (error) {
            console.log(error);
        }
    }

    return { messages, message, getMessages, getMessage, createMessage, deleteMessage }
}