"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, apiPaths } from "@/lib/api-client";
import { Button, Card, Input } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth-provider";
import type { AdminUser } from "@/lib/types";

type LoginResponse = {
  token?: string;
  accessToken?: string;
  data?: { token?: string; user?: AdminUser };
  user?: AdminUser;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { pushToast } = useToast();
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post<LoginResponse>(apiPaths.auth.login, {
        email,
        password,
      });
      const token =
        response.token ?? response.accessToken ?? response.data?.token ?? "";
      if (!token) {
        throw new Error("Missing token from login response");
      }
      await signIn(token, response.user ?? response.data?.user ?? null);
      pushToast("Welcome back!", "success");
      const nextPath = searchParams.get("next") ?? "/";
      router.replace(nextPath);
    } catch {
      pushToast("Login failed. Please check your credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <Card className="w-full max-w-lg">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            WorkO Admin Login
          </h1>
          <p className="text-sm text-slate-500">
            Sign in to manage countries, services, pricing, providers, and jobs.
          </p>
        </div>
        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <Input
            label="Email"
            type="email"
            placeholder="admin@worko.africa"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
