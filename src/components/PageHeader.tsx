import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  subtitle,
  crumbs = [],
  actions,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav className="mb-1 flex items-center gap-1 text-label-sm text-outline">
          <Link href="/dashboard" className="hover:text-content-variant">
            Início
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={12} />
              {c.href ? (
                <Link href={c.href} className="hover:text-content-variant">
                  {c.label}
                </Link>
              ) : (
                <span className="text-content-variant">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="text-headline-lg text-content">{title}</h1>
        {subtitle && <p className="mt-1 text-body-md text-content-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
