import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) window.location.href = "/app";
  }, [user]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    window.location.href = "/app";
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/app",
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account aangemaakt! Bekijk je e-mail om te bevestigen.");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Branding side */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground relative overflow-hidden" style={{ background: "var(--gradient-brand)" }}>
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-white/15 grid place-items-center backdrop-blur">
            <Stethoscope className="size-5" />
          </div>
          <span className="font-display font-semibold text-lg">ZorgRapport</span>
        </div>
        <div className="relative z-10">
          <h2 className="font-display text-4xl leading-tight">
            Eén plek voor<br />alle rapportages.
          </h2>
          <p className="mt-4 text-primary-foreground/80 max-w-sm">
            Veilig, snel en gemaakt voor de praktijk van thuiszorg.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} ZorgRapport</p>
        <div className="absolute -right-32 -bottom-32 size-96 rounded-full bg-white/5 blur-2xl" />
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">← terug</a>
          <h1 className="mt-4 text-2xl font-semibold">Welkom terug</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in of maak een account aan om te rapporteren.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Inloggen</TabsTrigger>
              <TabsTrigger value="signup">Registreren</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mailadres</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Wachtwoord</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Bezig…" : "Inloggen"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Volledige naam</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">E-mailadres</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Wachtwoord</Label>
                  <Input id="password2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Bezig…" : "Account aanmaken"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
