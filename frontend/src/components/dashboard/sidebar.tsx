"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSearch,
  FolderOpen,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Investigations",
    href: "/dashboard/investigations",
    icon: FileSearch,
  },
  { label: "Documents", href: "/dashboard/documents", icon: FolderOpen },
  { label: "Entities", href: "/dashboard/entities", icon: Users },
  { label: "Alerts", href: "/dashboard/alerts", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="h-16 flex items-center gap-3 px-6">
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-primary/30 blur-md rounded-lg" />
          <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10.5" cy="10.5" r="6.5" stroke="white" strokeWidth="2" />
              <path
                d="M19 19L15 15"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="10.5" cy="10.5" r="2.5" fill="white" />
            </svg>
          </div>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
            Nexora
          </span>
          <span className="text-[10px] text-sidebar-foreground/50 tracking-wider uppercase mt-0.5">
            Investigation Workspace
          </span>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      <div className="p-3">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
