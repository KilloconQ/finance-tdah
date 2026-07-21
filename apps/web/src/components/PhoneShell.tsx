import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PhoneShellProps {
  children: ReactNode;
  bg?: "bg" | "surface" | "bg-alt";
  /**
   * `app` (default): a responsive page container. Full-bleed on phones, growing
   * with the viewport up to a comfortable max on desktop — left-aligned inside
   * the app shell, NOT a phone-width column. `narrow`: a slim centered column
   * for focused forms (auth / onboarding) where a wide layout adds nothing.
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
  // Responsive page container: grows with the viewport, generous gutters on
  // desktop. Left-aligned next to the sidebar (mx-auto only centers once the
  // viewport exceeds the max width).
  app: "mx-auto w-full max-w-[1080px] px-4 sm:px-6 lg:px-8",
  // Slim centered column at every size for focused forms. On md+ it also
  // vertically centers its content so the form sits as a centered card instead
  // of stranded at the top (mobile stays top-aligned).
  narrow: "mx-auto w-full max-w-[440px] px-4 sm:px-6 md:justify-center",
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
        "flex min-h-dvh w-full flex-col",
        VARIANT_CLASS[variant],
        BG_CLASS[bg],
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col",
          // Shrink to content on md+ so the outer `md:justify-center` can center
          // the focused form vertically; mobile keeps flex-1 (top-aligned).
          variant === "narrow" && "md:flex-none",
        )}
      >
        {children}
      </div>
    </div>
  );
}
