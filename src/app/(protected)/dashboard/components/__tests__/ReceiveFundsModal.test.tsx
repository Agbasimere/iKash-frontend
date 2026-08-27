import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { ReceiveFundsModal } from "../ReceiveFundsModal";

const walletMock = vi.hoisted(() => ({
    publicKey: "GCONNECTEDWALLETADDRESS",
}));

vi.mock("@/features/wallet", () => ({
    useWallet: () => ({ publicKey: walletMock.publicKey }),
}));

vi.mock("@/features/user/presentation/context/UserContext", () => ({
    useUser: () => ({ currentUser: null }),
}));

vi.mock("qrcode.react", () => ({
    QRCodeSVG: () => <svg data-testid="mock-qr" />,
}));

vi.mock("next/dynamic", () => {
    const React = require("react");
    return {
        __esModule: true,
        default: (importFn: () => Promise<any>) => {
            const DynamicComponent = (props: any) => {
                const [Component, setComponent] = React.useState<any>(null);
                React.useEffect(() => {
                    importFn().then((mod) => {
                        setComponent(() => mod?.default ?? mod);
                    });
                }, []);
                if (!Component) return null;
                return React.createElement(Component, props);
            };
            return DynamicComponent;
        },
    };
});

describe("ReceiveFundsModal", () => {
    beforeEach(() => {
        walletMock.publicKey = "GCONNECTEDWALLETADDRESS";
        document.body.innerHTML = "";
    });

    it("renders a dialog labelled Receive funds when a wallet is connected", async () => {
        render(<ReceiveFundsModal onClose={vi.fn()} />);

        const dialog = screen.getByRole("dialog", { name: "Receive funds" });
        expect(dialog.getAttribute("aria-modal")).toBe("true");
        await waitFor(() => {
            expect(screen.getByTestId("mock-qr")).toBeTruthy();
        });
    });

    it("moves initial focus to the first focusable control", () => {
        render(<ReceiveFundsModal onClose={vi.fn()} />);

        const dialog = screen.getByRole("dialog");
        expect(document.activeElement).toBe(within(dialog).getAllByRole("button")[0]);
    });

    it("closes via Escape and restores focus to the trigger", () => {
        const onClose = vi.fn();
        const trigger = document.createElement("button");
        trigger.textContent = "Open Receive";
        document.body.appendChild(trigger);
        trigger.focus();

        render(<ReceiveFundsModal onClose={onClose} />);

        fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(trigger);
    });

    it("renders the no-wallet variant and closes via Escape", () => {
        walletMock.publicKey = null;
        const onClose = vi.fn();

        render(<ReceiveFundsModal onClose={onClose} />);

        const dialog = screen.getByRole("dialog", { name: "Receive funds" });
        expect(within(dialog).getByText(/no wallet connected/i)).toBeTruthy();

        fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
