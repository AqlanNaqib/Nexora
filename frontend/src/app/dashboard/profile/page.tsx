"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { updateProfile } from "@/services/auth-service";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Check } from "lucide-react";
import { AVATAR_COLORS } from "@/lib/avatar-colors";
import { cn } from "@/lib/utils";

interface UserInfo {
  email: string;
  created_at: string;
  display_name: string;
  avatar_color: string;
}

function getInitials(name: string, email: string) {
  const source = name || email;
  return source.slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!ignore && data.user) {
        const meta = data.user.user_metadata || {};
        const info: UserInfo = {
          email: data.user.email || "",
          created_at: data.user.created_at,
          display_name: meta.display_name || "",
          avatar_color: meta.avatar_color || AVATAR_COLORS[0].value,
        };
        setUser(info);
        setDisplayName(info.display_name);
        setSelectedColor(info.avatar_color);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(displayName, selectedColor);
      setUser((prev) =>
        prev
          ? { ...prev, display_name: displayName, avatar_color: selectedColor }
          : prev
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="border-b border-border pb-5">
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account information
        </p>
      </div>

      <Card className="border-border bg-surface mt-6 max-w-md">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: selectedColor }}
            >
              {getInitials(displayName, user.email)}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {user.email}
              </p>
              <p className="text-xs text-muted-foreground">
                Member since{" "}
                {new Date(user.created_at).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Avatar color</Label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-transform",
                    selectedColor === color.value &&
                      "ring-2 ring-offset-2 ring-offset-surface ring-foreground scale-105"
                  )}
                  style={{ backgroundColor: color.value }}
                >
                  {selectedColor === color.value && (
                    <Check className="h-4 w-4 text-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
