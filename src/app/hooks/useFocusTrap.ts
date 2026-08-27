"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

interface UseFocusTrapOptions {
    active?: boolean;
    onClose?: () => void;
    initialFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
].join(", ");

// Elements hidden with display:none / visibility:hidden are not keyboard
// reachable even though they still match the selector above.
function isFocusable(element: HTMLElement): boolean {
    if (window.getComputedStyle(element).visibility === "hidden") return false;
    const rects = element.getClientRects();
    if (rects.length > 0) return true;
    // jsdom (unit tests) reports no rects for rendered nodes, so only treat
    // an element as hidden when its computed display style says so.
    return window.getComputedStyle(element).display !== "none";
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter(isFocusable);
}

// Focus trap for modal dialogs. Returns a ref to attach to the dialog
// container. While `active`, focus is moved inside the container on activation
// and Tab / Shift+Tab are cycled within it. Escape restores focus to the
// element that opened the dialog before invoking `onClose`.
export function useFocusTrap<T extends HTMLElement>({
    active = true,
    onClose,
    initialFocusRef,
}: UseFocusTrapOptions = {}): RefObject<T | null> {
    const containerRef = useRef<T | null>(null);
    const onCloseRef = useRef(onClose);
    const initialFocusRefRef = useRef(initialFocusRef);

    // Keep the latest onClose / initialFocusRef available to the trap handler
    // without re-running the trap effect (which would steal focus again).
    useLayoutEffect(() => {
        onCloseRef.current = onClose;
        initialFocusRefRef.current = initialFocusRef;
    });

    useLayoutEffect(() => {
        if (!active) return;

        const container = containerRef.current;
        if (!container) return;

        const previouslyFocused = document.activeElement;

        const focusFirst = () => {
            const initial = initialFocusRefRef.current?.current;
            const target =
                (initial && container.contains(initial) ? initial : null) ??
                getFocusableElements(container)[0] ??
                container;
            target.focus();
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                const close = onCloseRef.current;
                if (close) {
                    event.stopPropagation();
                    if (
                        previouslyFocused instanceof HTMLElement &&
                        previouslyFocused !== document.body &&
                        previouslyFocused.isConnected
                    ) {
                        previouslyFocused.focus();
                    }
                    close();
                }
                return;
            }

            if (event.key !== "Tab") return;

            const focusables = getFocusableElements(container);
            if (focusables.length === 0) {
                event.preventDefault();
                return;
            }

            const current = document.activeElement as HTMLElement | null;
            const currentIndex = current ? focusables.indexOf(current) : -1;

            if (event.shiftKey) {
                if (currentIndex <= 0) {
                    event.preventDefault();
                    focusables[focusables.length - 1].focus();
                }
            } else if (currentIndex === -1 || currentIndex === focusables.length - 1) {
                event.preventDefault();
                focusables[0].focus();
            }

            event.stopPropagation();
        };

        document.addEventListener("keydown", handleKeyDown);
        focusFirst();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [active]);

    return containerRef;
}
