"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormValues } from "@/features/auth/schema";
import { signIn } from "@/services/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConfirmed = searchParams.get("confirmed") === "true";

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      router.push("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout heading="Welcome back" subheading="Sign in to your workspace">
      {justConfirmed && (
        <div className="flex items-start gap-2 bg-success/10 border border-success/20 rounded-md px-3 py-2 mb-4">
          <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
          <p className="text-sm text-success">
            Email confirmed — you can now sign in.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-danger">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-danger">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-danger">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
