import { describe, it, expect, afterEach, vi } from "vitest";

async function loadDemoMode(envValue: string | undefined) {
    vi.resetModules();
    if (envValue === undefined) {
        delete process.env.NEXT_PUBLIC_DEMO_MODE;
    } else {
        process.env.NEXT_PUBLIC_DEMO_MODE = envValue;
    }
    const mod = await import("../demo-mode");
    return mod.DEMO_MODE;
}

describe("demo-mode flag (IKSH-46)", () => {
    afterEach(() => {
        delete process.env.NEXT_PUBLIC_DEMO_MODE;
    });

    it("is disabled when NEXT_PUBLIC_DEMO_MODE is unset", async () => {
        expect(await loadDemoMode(undefined)).toBe(false);
    });

    it("is disabled when NEXT_PUBLIC_DEMO_MODE=false", async () => {
        expect(await loadDemoMode("false")).toBe(false);
    });

    it("is disabled for any value other than the exact string \"true\"", async () => {
        expect(await loadDemoMode("0")).toBe(false);
        expect(await loadDemoMode("1")).toBe(false);
        expect(await loadDemoMode("TRUE")).toBe(false);
    });

    it("is enabled only when NEXT_PUBLIC_DEMO_MODE=true", async () => {
        expect(await loadDemoMode("true")).toBe(true);
    });
});
