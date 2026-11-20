import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/site-shell";
import { supabase } from "@/integrations/supabase/client";
import { isLocalDevHost, setLocalDevSession, type LocalDevRoleKey } from "@/lib/local-store";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      ...pageHead("Sign in", "Sign in to your Rabata mentor, student or administrator account.")
        .meta,
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email.").max(255),
  password: z.string().min(10, "Use at least 10 characters.").max(72),
  name: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showLocalDev, setShowLocalDev] = useState(false);

  useEffect(() => {
    setShowLocalDev(isLocalDevHost());
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");
    setOk(false);
    const v = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? "Please check your details.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { display_name: parsed.data.name ?? "" },
          },
        });
        if (error) setStatus(error.message);
        else {
          setOk(true);
          setStatus("Check your email and click the confirmation link, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) {
          setStatus("Email or password is incorrect, or the email is not confirmed yet.");
        } else {
          setLocalDevSession(null);
          navigate({ to: "/account" });
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function enterLocalRole(key: LocalDevRoleKey) {
    setLocalDevSession(key);
    navigate({ to: key === "admin" ? "/admin" : "/account" });
  }

  return (
    <>
      <PageHeading
        eyebrow="Rabata accounts"
        title={mode === "signin" ? "Sign in" : "Create an account"}
        description="For Rabata mentors, students and administrators. New accounts are reviewed before they can see any records."
      />
      <section className="section">
        <div className="container" style={{ maxWidth: 540 }}>
          <form className="form-panel" onSubmit={submit}>
            {status && (
              <div
                role={ok ? "status" : "alert"}
                className={`form-status ${ok ? "" : "form-error"}`}
              >
                {status}
              </div>
            )}
            <div className="form-grid">
              {mode === "signup" && (
                <label className="field wide">
                  Full name
                  <input name="name" maxLength={120} autoComplete="name" />
                </label>
              )}
              <label className="field wide">
                Email *
                <input name="email" type="email" required autoComplete="email" />
              </label>
              <label className="field wide">
                Password *
                <input
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </label>
            </div>
            <Button type="submit" className="w-full mt-6" size="lg" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              className="text-link mt-4"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setStatus("");
              }}
            >
              {mode === "signin"
                ? "New to Rabata? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </form>

          {showLocalDev && (
            <div className="form-panel mt-6">
              <div className="eyebrow">
                <ShieldCheck size={13} /> Local Preview Access (localhost only)
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Test the Administrator Dashboard, Mentor isolation, and Student portal right away on
                localhost without needing to apply remote Cloud migrations first.
              </p>
              <div className="grid gap-2">
                <Button variant="secondary" onClick={() => enterLocalRole("admin")}>
                  Enter as Central Admin (rabataofficial111@gmail.com)
                </Button>
                <Button variant="outline" onClick={() => enterLocalRole("mentor1")}>
                  Enter as Mentor 1 (Ananya Sharma)
                </Button>
                <Button variant="outline" onClick={() => enterLocalRole("mentor2")}>
                  Enter as Mentor 2 (Rohan Verma — verify isolation)
                </Button>
                <Button variant="outline" onClick={() => enterLocalRole("student")}>
                  Enter as Approved Student (Aarav)
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
