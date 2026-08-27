import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { useRef, type RefObject } from "react";
import { useFocusTrap } from "../useFocusTrap";

function TrapHost({
    active = true,
    onClose,
    initialFocusRef,
}: {
    active?: boolean;
    onClose?: () => void;
    initialFocusRef?: RefObject<HTMLElement | null>;
}) {
    const ref = useFocusTrap<HTMLDivElement>({ active, onClose, initialFocusRef });
    return (
        <div>
            <button type="button">Outside</button>
            <div ref={ref}>
                <button type="button">First</button>
                <button type="button" disabled>
                    Disabled
                </button>
                <button type="button" style={{ display: "none" }}>
                    Hidden
                </button>
                <button type="button">Last</button>
            </div>
        </div>
    );
}

function TrapHostWithInitial() {
    const inputRef = useRef<HTMLInputElement>(null);
    const ref = useFocusTrap<HTMLDivElement>({ initialFocusRef: inputRef });
    return (
        <div ref={ref}>
            <button type="button">First</button>
            <input ref={inputRef} />
        </div>
    );
}

describe("useFocusTrap", () => {
    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("moves focus to the first focusable element on activation", () => {
        render(<TrapHost />);

        expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    });

    it("prefers the initialFocusRef element when it is inside the container", () => {
        render(<TrapHostWithInitial />);

        expect(document.activeElement).toBe(screen.getByRole("textbox"));
    });

    it("cycles Tab through focusable elements, skipping disabled and hidden ones", () => {
        render(<TrapHost />);

        const first = screen.getByRole("button", { name: "First" });
        const last = screen.getByRole("button", { name: "Last" });

        last.focus();
        fireEvent.keyDown(last, { key: "Tab" });
        expect(document.activeElement).toBe(first);

        fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
        expect(document.activeElement).toBe(last);
    });

    it("pulls focus back inside when Tab is pressed while focus is outside", () => {
        render(<TrapHost />);

        const outside = screen.getByRole("button", { name: "Outside" });
        outside.focus();
        expect(document.activeElement).toBe(outside);

        fireEvent.keyDown(outside, { key: "Tab" });
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    });

    it("calls onClose and restores focus to the previously focused element on Escape", () => {
        const onClose = vi.fn();
        const trigger = document.createElement("button");
        trigger.textContent = "Trigger";
        document.body.appendChild(trigger);
        trigger.focus();

        render(<TrapHost onClose={onClose} />);
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));

        fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(document.activeElement).toBe(trigger);
    });

    it("ignores Escape when no onClose is provided", () => {
        const propagateSpy = vi.fn();
        window.addEventListener("keydown", propagateSpy);

        render(<TrapHost />);
        fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });

        expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
        expect(propagateSpy).toHaveBeenCalledTimes(1);

        window.removeEventListener("keydown", propagateSpy);
    });

    it("stops propagation of handled Tab and Escape keys", () => {
        const onClose = vi.fn();
        const propagateSpy = vi.fn();
        window.addEventListener("keydown", propagateSpy);

        render(<TrapHost onClose={onClose} />);

        fireEvent.keyDown(document.activeElement as Element, { key: "Tab" });
        expect(propagateSpy).not.toHaveBeenCalled();

        fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
        expect(propagateSpy).not.toHaveBeenCalled();

        window.removeEventListener("keydown", propagateSpy);
    });

    it("does not trap while inactive", () => {
        const onClose = vi.fn();
        render(<TrapHost active={false} onClose={onClose} />);

        expect(document.activeElement).toBe(document.body);

        fireEvent.keyDown(document.body, { key: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
    });

    it("removes the keydown listener when the trap unmounts", () => {
        const onClose = vi.fn();
        const { unmount } = render(<TrapHost onClose={onClose} />);
        unmount();

        fireEvent.keyDown(document.body, { key: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
    });
});
