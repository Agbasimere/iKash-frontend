import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MobileBottomNav } from "../MobileBottomNav";
import { OrderNavbar } from "../../(protected)/p2p/components/OrderNavbar";
import { Aside } from "../Aside";
import { Navbar } from "../../welcome/components/Navbar";
import { LayoutGrid, ArrowLeftRight, Database } from "lucide-react";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/features/wallet/presentation/components/ConnectButton", () => ({
  ConnectButton: () => <button>Mock Connect Button</button>,
}));

vi.mock("@/features/wallet/config/wallet-options", () => ({
  walletOptions: [],
}));

// Mock wallet and user contexts
vi.mock("@/features/wallet", () => ({
  useWallet: () => ({
    disconnect: vi.fn(),
    isConnected: true,
    isLoading: false,
  }),
}));

vi.mock("@/features/user/presentation/context/UserContext", () => ({
  useUser: () => ({
    currentUser: {
      userId: "user-1",
      publicKey: "GB6NVYUA5UXCPJHQ3BB5MIP4T6L24GZ6BCK772BPQ3G7W6M6V465XQ2",
      alias: "TestUser",
    },
    setCurrentUser: vi.fn(),
    setAccessToken: vi.fn(),
  }),
}));

describe("Semantic Landmarks and ARIA Roles ([IKSH-39] #98)", () => {
  it("renders MobileBottomNav as a semantic <nav> landmark with aria-label", () => {
    const mockLinks = [
      { href: "/dashboard", label: "Home", icon: LayoutGrid },
      { href: "/p2p", label: "P2P", icon: ArrowLeftRight },
      { href: "/transactions", label: "Transactions", icon: Database },
    ];

    render(<MobileBottomNav links={mockLinks} />);

    const nav = screen.getByRole("navigation", { name: "Mobile Bottom Navigation" });
    expect(nav).toBeDefined();
    expect(nav.tagName.toLowerCase()).toBe("nav");
  });

  it("renders OrderNavbar as a semantic <nav> landmark with aria-label", () => {
    render(<OrderNavbar />);

    const nav = screen.getByRole("navigation", { name: "P2P Order Navigation" });
    expect(nav).toBeDefined();
    expect(nav.tagName.toLowerCase()).toBe("nav");
    expect(screen.getByRole("link", { name: "Market" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Orders" })).toBeDefined();
  });

  it("renders Aside with semantic <aside> and distinctly labeled <nav> landmarks", () => {
    render(<Aside />);

    const aside = screen.getByRole("complementary", { name: "Sidebar Navigation" });
    expect(aside).toBeDefined();
    expect(aside.tagName.toLowerCase()).toBe("aside");

    const mainNav = screen.getByRole("navigation", { name: "Main Navigation" });
    expect(mainNav).toBeDefined();

    const secondaryNav = screen.getByRole("navigation", { name: "Secondary Navigation" });
    expect(secondaryNav).toBeDefined();
  });

  it("renders public Navbar as a semantic <nav> landmark with aria-label", () => {
    render(<Navbar />);

    const nav = screen.getByRole("navigation", { name: "Public Navigation" });
    expect(nav).toBeDefined();
    expect(nav.tagName.toLowerCase()).toBe("nav");
  });
});
