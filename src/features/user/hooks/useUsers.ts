'use client';

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "../models/users";
import { CreateUser } from "../models/createUser";
import { SetupAccountPayload } from "../models/setupAccount";
import { useUser } from "../presentation/context/UserContext";
import { useApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useUsers() {
    const { setAccessToken, setCurrentUser } = useUser();
    const { apiFetch } = useApi();
    const queryClient = useQueryClient();

    const [userFound, setUserFound] = useState<Record<string, Users>>({});

    const { data: users = [] } = useQuery<Users[]>({
        queryKey: queryKeys.users.all,
        queryFn: () => apiFetch('/users')
    });

    const getUser = useCallback(async (userId: string) => {
        try {
            const data = await queryClient.fetchQuery({
                queryKey: queryKeys.users.detail(userId),
                queryFn: () => apiFetch(`/users/${userId}`)
            });
            setUserFound(prev => ({ ...prev, [userId]: data }));
            return data;
        } catch (error) {
            console.error(error);
        }
    }, [queryClient, apiFetch]);

    const { mutateAsync: createUserMutation } = useMutation({
        mutationFn: (user: CreateUser) => apiFetch('/users', {
            method: "POST",
            body: JSON.stringify(user)
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
        }
    });

    const createUser = async (user: CreateUser) => {
        try {
            await createUserMutation(user);
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    const { mutateAsync: updateUserMutation } = useMutation({
        mutationFn: ({ userId, userData }: { userId: string, userData: Partial<Users> }) => apiFetch(`/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify(userData)
        }),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.userId) });
            setCurrentUser(data);
        }
    });

    const updateUser = async (userId: string, userData: Partial<Users>): Promise<Users | null> => {
        try {
            return await updateUserMutation({ userId, userData });
        } catch (error) {
            console.error('Error updating user:', error);
            return null;
        }
    };

    const { mutateAsync: uploadProfilePictureMutation } = useMutation({
        mutationFn: ({ userId, file }: { userId: string, file: File }) => {
            const formData = new FormData();
            formData.append("profileImage", file);
            return apiFetch(`/users/${userId}/profile-picture`, {
                method: "PATCH",
                body: formData
            });
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.userId) });
            setCurrentUser(data);
        }
    });

    const uploadProfilePicture = async (userId: string, file: File): Promise<Users | null> => {
        try {
            return await uploadProfilePictureMutation({ userId, file });
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            return null;
        }
    };

    const getOrCreateByWallet = async (publicKey: string): Promise<Users | null> => {
        try {
            return await apiFetch(`/users/account?publicKey=${publicKey}`);
        } catch (error) {
            console.error('Error in getOrCreateByWallet:', error);
            return null;
        }
    };

    const checkAliasAvailable = async (alias: string): Promise<{ available: boolean }> => {
        try {
            return await apiFetch(`/users/validate-alias?alias=${alias}`);
        } catch (error) {
            console.error('Error in checkAliasAvailable:', error);
            return { available: false };
        }
    };

    const setupAccount = async (userId: string, payload: SetupAccountPayload): Promise<Users | null> => {
        try {
            const data = await apiFetch(`/users/${userId}/setup`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            setCurrentUser(data.user);
            setAccessToken(data.access_token);
            return data.user;
        } catch (error) {
            console.error('Error in setupAccount:', error);
            return null;
        }
    };

    return { 
        users, 
        user: null, 
        getUser, 
        createUser, 
        updateUser, 
        uploadProfilePicture, 
        userFound, 
        getOrCreateByWallet, 
        checkAliasAvailable, 
        setupAccount 
    };
}
