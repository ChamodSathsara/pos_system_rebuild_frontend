"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  ShieldCheck,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { getUserFacingError } from "@/lib/errors";
// import companyLogo from "@/assets/company.png";
import companyLogo from "@/assest/company.png";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const user = await login(values.username, values.password);
      router.replace(
        user.roleName === "InventoryClerk" ? "/main-warehouse" : "/dashboard",
      );
    } catch (err) {
      const friendly = getUserFacingError(err, {
        title: "Sign-in failed",
        description: "Check your username and password, then try again.",
      });
      toast.error(friendly.title, { description: friendly.description });
    }
  };

  return (
    <div className="flex h-screen max-h-screen overflow-hidden bg-background">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-sidebar via-sidebar to-[#0d1526] p-10 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sidebar-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
            <Image
              src="/vpos-icon.png"
              alt="Vantage POS"
              width={22}
              height={22}
              className="object-contain"
              priority
            />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Vantage POS
          </span>
        </div>

        <div className="relative max-w-md">
          <span className="mb-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
            Trusted by retail teams
          </span>
          <h2 className="text-4xl font-bold leading-[1.15] tracking-tight text-white">
            Run every branch, register, and receipt from one place.
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-sidebar-foreground/70">
            Sales, inventory, purchasing and cash management — built for retail
            teams that move fast.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
                <Zap className="h-4 w-4 text-white/80" />
              </div>
              <span className="text-sm text-white/70">
                Real-time sales &amp; inventory sync
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
                <BarChart3 className="h-4 w-4 text-white/80" />
              </div>
              <span className="text-sm text-white/70">
                Unified reporting across branches
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/10">
                <ShieldCheck className="h-4 w-4 text-white/80" />
              </div>
              <span className="text-sm text-white/70">
                Role-based access &amp; audit trails
              </span>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-6 text-xs text-sidebar-foreground/50">
          <span>© {new Date().getFullYear()} Vantage POS</span>
          <span className="h-1 w-1 rounded-full bg-sidebar-foreground/30" />
          <span>All rights reserved</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-background to-muted/30 p-6 lg:w-1/2">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <Image
              src="/vpos-icon.png"
              alt="Vantage POS"
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg object-contain"
              priority
            />
            <span className="text-lg font-bold">Vantage POS</span>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-8 shadow-xl shadow-black/[0.03] backdrop-blur-sm">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue to your workspace.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    autoFocus
                    autoComplete="username"
                    className="h-11 pl-9 transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30"
                    placeholder="e.g. admin"
                    {...register("username")}
                  />
                </div>
                {errors.username && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-11 pl-9 pr-9 transition-shadow focus-visible:ring-2 focus-visible:ring-primary/30"
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="mt-2 h-11 w-full font-medium shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Developer credit footer */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-6 pt-4">
          <div className="h-px w-16 bg-border" />
          <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-card/80 px-4 py-2 shadow-sm backdrop-blur-sm">
            <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border/50">
              <Image
                src={companyLogo}
                alt="Gestetner of Ceylon PLC"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-medium text-foreground/80">
                Gestetner of Ceylon PLC
              </span>
              <span className="text-[10px] text-muted-foreground">
                Developed by Digital Department
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
