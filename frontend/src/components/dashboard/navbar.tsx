"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/services/auth-service";

function getInitials(email: string | undefined) {
  if (!email) return "??";
  return email.slice(0, 2).toUpperCase();
}

export function Navbar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email);
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6">
      <div>
        {/* Reserved for breadcrumbs / page title later */}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(email)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {email && (
              <>
                <div className="px-2 py-1.5 text-sm text-muted-foreground truncate">
                  {email}
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              Profile
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
