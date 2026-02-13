"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  LayoutDashboard,
  Eye,
  Quote,
  Users,
  BarChart3,
  Tags,
  Lightbulb,
  Settings,
  CreditCard,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/visibility", label: "Visibility", icon: Eye },
  { href: "/dashboard/citations", label: "Citations", icon: Quote },
  { href: "/dashboard/competitors", label: "Competitors", icon: Users },
  { href: "/dashboard/traffic", label: "Traffic", icon: BarChart3 },
  { href: "/dashboard/keywords", label: "Keywords", icon: Tags },
  { href: "/dashboard/optimize", label: "Optimize", icon: Lightbulb },
];

const settingsItems = [
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/settings/integrations", label: "Integrations", icon: Link2 },
  { href: "/dashboard/settings/billing", label: "Billing", icon: CreditCard },
];

const adminFetcher = (url: string) => fetch(url).then(r => r.json());

export function Sidebar() {
  const pathname = usePathname();
  const { data: adminCheck } = useSWR('/api/admin/check', adminFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });
  const isAdmin = adminCheck?.isAdmin === true;

  return (
    <aside className="hidden md:flex h-full w-56 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
        <Link href="/dashboard" className="relative flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">R</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Rangefinder</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/5 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-l-2 border-transparent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-3">
          <div className="h-px bg-border" />
        </div>

        {settingsItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/5 text-primary border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-l-2 border-transparent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3">
              <div className="h-px bg-border" />
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors border-l-2 border-transparent"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
