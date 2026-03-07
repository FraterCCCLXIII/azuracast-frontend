import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * GlassCard — a Card with a real liquid-glass backdrop effect.
 *
 * Why the backdrop-filter chain order matters:
 *
 *   `backdrop-filter: url(#glass-filter) blur(16px) saturate(180%)`
 *
 *   1. url(#glass-filter) — feDisplacementMap runs on the RAW, sharp
 *      page content behind the card. Displacing sharp pixels produces
 *      visible glass refraction (lens-like warping of edges and text).
 *
 *   2. blur(16px) — softens the displaced result into the classic
 *      frosted-glass look without completely erasing the distortion.
 *
 *   3. saturate(180%) — enriches colour, typical of iOS-style glass.
 *
 *   Putting blur() BEFORE url() (the old ordering) is wrong: the
 *   displacement map then only sees featureless smeared pixels and
 *   produces no perceptible effect.
 *
 *   The two-layer approach (filter: url() on a parent wrapping a
 *   backdrop-filter child) is also wrong: CSS filter creates an
 *   isolated stacking context, so the child's backdrop-filter can no
 *   longer reach through to the page content — nothing to displace.
 *
 * Card content (text, images) is NOT affected by backdrop-filter;
 * it only touches the pixels behind the element.
 */
export function GlassCard({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <div className="relative">
      {/* Displaced + blurred backdrop layer */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
        style={{
          backdropFilter: "url(#glass-filter) blur(16px)",
          // Safari / Firefox don't support url() in backdrop-filter; fall back
          // to plain blur so the frosted look still works there.
          WebkitBackdropFilter: "blur(16px)",
        }}
        aria-hidden="true"
      />

      {/* Card: semi-transparent tint + bevel rim-light highlights */}
      <Card
        className={cn(
          "relative border-transparent bg-white/[0.08] shadow-none dark:bg-white/[0.05]",
          className
        )}
        style={{
          boxShadow: [
            // "inset 0 0 0 1px rgba(255,255,255,0.12)",
            // "inset 1.8px 3px 0px -2px rgba(255,255,255,0.85)",
            // "inset -2px -2px 0px -2px rgba(255,255,255,0.75)",
            // "inset -3px -8px 1px -6px rgba(255,255,255,0.55)",
            // "inset -0.3px -1px 4px 0px rgba(0,0,0,0.12)",
            // "inset -1.5px 2.5px 0px -2px rgba(0,0,0,0.18)",
            // "inset 0px 3px 4px -2px rgba(0,0,0,0.18)",
            // "inset 2px -6.5px 1px -4px rgba(0,0,0,0.09)",
            "0px 1px 5px 0px rgba(0,0,0,0.1)",
            "0px 6px 16px 0px rgba(0,0,0,0.08)",
          ].join(", "),
          ...style,
        }}
        {...props}
      >
        {children}
      </Card>
    </div>
  );
}
