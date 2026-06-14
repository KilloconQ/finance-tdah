import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PhoneShellProps {
  children: ReactNode;
  bg?: "bg" | "surface" | "bg-alt";
  /**
   * `app` (default): mobile-first column that WIDENS on tablet/desktop to use the
   * available space inside the app shell. `narrow`: a slim centered column for
   * focused forms (auth / onboarding) where a wide layout adds nothing.
   */
  variant?: "app" | "narrow";
  className?: string;
}

const BG_CLASS = {
  bg: "bg-bg",
  surface: "bg-surface",
  "bg-alt": "bg-bg-alt",
} as const;

const VARIANT_CLASS = {
  // Phone: full-bleed. md+: grows to a comfortable reading width, centered in
  // the content area next to the sidebar. No device frame.
  app: "w-full max-w-3xl",
  // Slim centered column at every size, with a hairline on desktop so the form
  // reads as an intentional card rather than floating text.
  narrow: "max-w-[420px] md:border-x md:border-line",
} as const;

export function PhoneShell({
  children,
  bg = "bg",
  variant = "app",
  className,
}: PhoneShellProps) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-dvh w-full flex-col overflow-hidden",
        VARIANT_CLASS[variant],
        BG_CLASS[bg],
        className,
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
