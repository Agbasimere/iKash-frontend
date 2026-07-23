import { beforeEach, describe, expect, it, vi } from "vitest";
import { isSignatureCancelled, walletService } from "../wallet.service";
import { freighterAdapter } from "../../infrastructure/freighter.adapter";
import { lobstrAdapter } from "../../infrastructure/lobstr.adapter";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

vi.mock("../../infrastructure/freighter.adapter", () => ({
    freighterAdapter: {
        isInstalled: vi.fn(),
        isAllowed: vi.fn(),
        requestAccess: vi.fn(),
        getAddress: vi.fn(),
        signTransaction: vi.fn(),
        signMessage: vi.fn(),
    },
}));

vi.mock("../../infrastructure/lobstr.adapter", () => ({
    lobstrAdapter: {
        isInstalled: vi.fn(),
        getPublicKey: vi.fn(),
        signTransaction: vi.fn(),
        signMessage: vi.fn(),
    },
}));

describe("isSignatureCancelled", () => {
    it("detects Freighter rejection via code -4", () => {
        const err = { code: -4, message: "The user rejected this request." };
        expect(isSignatureCancelled(err)).toBe(true);
    });

    it("detects Error with 'cancel' in message", () => {
        const err = new Error("User canceled the request");
        expect(isSignatureCancelled(err)).toBe(true);
    });

    it("returns false for unrelated error with code !== -4", () => {
        const err = { code: 1, message: "Network error" };
        expect(isSignatureCancelled(err)).toBe(false);
    });
});

describe("walletService.authenticate", () => {
    beforeEach(() => {
        localStorage.clear();
        fetchMock.mockReset();
        vi.clearAllMocks();
        localStorage.setItem("wallet:provider", "freighter");
    });

    it("requests a challenge, signs it, and logs in with the returned token", async () => {
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "abc123", expiresAt: "2026-07-14T15:00:00.000Z" }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "jwt-token" }) });
        vi.mocked(freighterAdapter.signMessage).mockResolvedValueOnce("signed-message");

        const token = await walletService.authenticate("G123");

        expect(token).toBe("jwt-token");
        expect(vi.mocked(freighterAdapter.signMessage)).toHaveBeenCalledWith("abc123");
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenNthCalledWith(2, "http://localhost:3000/auth/login", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ publicKey: "G123", challenge: "abc123", signature: "signed-message" }),
        }));
    });

    it("stops authentication when the wallet signature is rejected", async () => {
        fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "abc123" }) });
        vi.mocked(freighterAdapter.signMessage).mockRejectedValueOnce({ code: -4, message: "The user rejected this request." });

        await expect(walletService.authenticate("G123")).rejects.toThrow("Wallet signature is required to verify ownership and complete login.");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("prevents duplicate authentication requests while one is in flight", async () => {
        fetchMock
            .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: "abc123" }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "jwt-token" }) });
        vi.mocked(freighterAdapter.signMessage).mockResolvedValueOnce("signed-message");

        const [first, second] = await Promise.all([walletService.authenticate("G123"), walletService.authenticate("G123")]);

        expect(first).toBe("jwt-token");
        expect(second).toBe("jwt-token");
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});
