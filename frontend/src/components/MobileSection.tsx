"use client";

import { useEffect, useState } from "react";

export function MobileSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    function sync(e?: MediaQueryList | MediaQueryListEvent) {
      const matches = "matches" in (e || media) ? (e || media).matches : media.matches;
      // Desktop: always expanded. Mobile: keep the chosen default.
      if (matches) setOpen(true);
      else setOpen(defaultOpen);
    }
    sync(media);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [defaultOpen]);

  return (
    <section className="border border-brand/15 bg-[#F8FBFE] sm:border-0 sm:bg-transparent">
      <details
        className="mobile-section-details"
        open={open}
        onToggle={(e) => {
          const next = e.currentTarget.open;
          if (window.matchMedia("(min-width: 640px)").matches) {
            e.currentTarget.open = true;
            setOpen(true);
            return;
          }
          setOpen(next);
        }}
      >
        <summary>
          <span>
            <span className="block">{title}</span>
            {subtitle && <span className="mt-0.5 block text-xs font-normal text-ink/55">{subtitle}</span>}
          </span>
          <span className="font-mono text-xs text-brand sm:hidden" aria-hidden>
            ▼
          </span>
        </summary>
        <div className="mobile-section-panel">
          <div className="hidden sm:block mb-4">
            <h2 className="font-medium">{title}</h2>
            {subtitle && <p className="text-xs text-ink/55 mt-0.5">{subtitle}</p>}
          </div>
          {children}
        </div>
      </details>
    </section>
  );
}
