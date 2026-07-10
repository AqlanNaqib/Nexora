"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/services/auth-service";
import { fetchAlerts } from "@/services/dashboard-service";
import { AVATAR_COLORS } from "@/lib/avatar-colors";

function getInitials(name: string, email: string | undefined) {
  const source = name || email || "";
  return source.slice(0, 2).toUpperCase() || "??";
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].value);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!ignore && data.user) {
        setEmail(data.user.email);
        const meta = data.user.user_metadata || {};
        setDisplayName(meta.display_name || "");
        setAvatarColor(meta.avatar_color || AVATAR_COLORS[0].value);
      }
    });

    fetchAlerts()
      .then((alerts) => {
        if (!ignore) setAlertCount(alerts.length);
      })
      .catch(() => {
        if (!ignore) setAlertCount(0);
      });

    return () => {
      ignore = true;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6">
      <div>{/* Reserved for breadcrumbs / page title later */}</div>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/alerts">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {alertCount > 0 && (
              <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-danger text-[9px] font-medium text-white flex items-center justify-center">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(displayName, email)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {(displayName || email) && (
              <>
                <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                  {displayName || email}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
