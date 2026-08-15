'use client';

import { useCallback, useEffect, useState } from "react";
import { Users } from "../models/users";
import { CreateUser } from "../models/createUser";
import { SetupAccountPayload } from "../models/setupAccount";
import { useUser } from "../presentation/context/UserContext";
import { apiFetch } from "@/lib/api";

export function useUsers() {
    const [users, setUsers] = useState<Users[]>([]);
    const [user, setUser] = useState<Users | null>(null);
    const [userFound, setUserFound] = useState<Record<string, Users>>({})
    const { setAccessToken, setCurrentUser } = useUser();

    useEffect(() => {
        apiFetch<Users[]>("/users", { authenticated: false })
            .then((data) => {
                setUsers(data);
            })
            .catch(err => console.error(err));
    }, []);

    const getUser = useCallback(async (userId: string) => {
        try {
            const data = await apiFetch<Users>(`/users/${userId}`, { authenticated: false });
            setUserFound(prev => ({ ...prev, [userId]: data }));
        } catch (error) {
            console.error(error)
        }
    }, [])

    const createUser = async (user: CreateUser) => {
        try {
            const data = await apiFetch<Users>("/users", {
                method: "POST",
                body: user,
                authenticated: false,
            });
            setUser(data);
        } catch (error) {
            console.error('Error creating user:', error);
        }
    }

    const updateUser = async (userId: string, userData: Partial<Users>): Promise<Users | null> => {
        try {
            const data = await apiFetch<Users>(`/users/${userId}`, {
                method: "PATCH",
                body: userData,
            });
            setUser(data);
            setCurrentUser(data);
            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            return null;
        }
    }

    const uploadProfilePicture = async (userId: string, file: File): Promise<Users | null> => {
        try {
            const formData = new FormData();
            formData.append("profileImage", file);

            const data = await apiFetch<Users>(`/users/${userId}/profile-picture`, {
                method: "PATCH",
                body: formData,
            });
            setUser(data);
            setCurrentUser(data);
            return data;
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            return null;
        }
    }

    const getOrCreateByWallet = async (publicKey: string): Promise<Users | null> => {
        try {
            const data = await apiFetch<Users>(`/users/account?publicKey=${publicKey}`, { authenticated: false });
            setUser(data);
            return data;
        } catch (error) {
            console.error('Error in getOrCreateByWallet:', error);
            return null;
        }
    }

    const checkAliasAvailable = async (alias: string): Promise<{ available: boolean }> => {
        try {
            return await apiFetch<{ available: boolean }>(`/users/validate-alias?alias=${alias}`);
        } catch (error) {
            console.error('Error in checkAliasAvailable:', error);
            return { available: false };
        }
    }

    const setupAccount = async (userId: string, payload: SetupAccountPayload): Promise<Users | null> => {
        try {
            const data = await apiFetch<{ user: Users; access_token: string }>(`/users/${userId}/setup`, {
                method: "POST",
                body: payload,
            });

            // Update context with final user and token
            setCurrentUser(data.user);
            setAccessToken(data.access_token);

            return data.user;
        } catch (error) {
            console.error('Error in setupAccount:', error);
            return null;
        }
    }

    return { users, user, getUser, createUser, updateUser, uploadProfilePicture, userFound, getOrCreateByWallet, checkAliasAvailable, setupAccount };
}