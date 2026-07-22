"use client";

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
  return (
    <section className="border border-brand/15 bg-[#F8FBFE] sm:border-0 sm:bg-transparent">
      <details className="mobile-section-details" open={defaultOpen}>
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
