import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope, ShieldCheck, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && user) {
      // redirect to app once signed in
      window.location.href = "/app";
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg grid place-items-center text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
              <Stethoscope className="size-5" />
            </div>
            <span className="font-display font-semibold text-lg">ZorgRapport</span>
          </div>
          <a href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Inloggen
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <span className="size-1.5 rounded-full bg-accent" /> Voor thuiszorgteams
            </span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] text-foreground">
              Rapporteer zorg.<br />
              <span className="text-accent">Helder en veilig.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Schrijf dagelijkse rapportages per cliënt, vind eerdere notities razendsnel terug en houd je team altijd op de hoogte.
            </p>
            <div className="mt-8 flex gap-3">
              <a href="/login" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-soft">
                Aan de slag
              </a>
              <a href="/login" className="rounded-md border bg-card px-6 py-3 text-sm font-medium hover:bg-secondary">
                Account aanmaken
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                { icon: ClipboardList, label: "Dagrapportages" },
                { icon: ShieldCheck, label: "AVG-veilig" },
                { icon: Stethoscope, label: "Per cliënt" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center text-center gap-2">
                  <div className="size-10 rounded-lg bg-secondary grid place-items-center text-accent">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl opacity-30 blur-3xl" style={{ background: "var(--gradient-brand)" }} />
            <div className="relative rounded-2xl border bg-card shadow-soft p-6">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div>
                  <p className="font-display font-semibold">Mevr. de Vries</p>
                  <p className="text-xs text-muted-foreground">Kamer 12 · 78 jaar</p>
                </div>
                <span className="text-xs rounded-full bg-accent/10 text-accent px-2 py-1">Medicatie</span>
              </div>
              <div className="space-y-3">
                {[
                  { t: "09:15", c: "Ochtendmedicatie toegediend, goed verlopen." },
                  { t: "12:30", c: "Lunch genuttigd, vocht 200ml. Stemming opgewekt." },
                  { t: "16:00", c: "Korte wandeling in de tuin met dochter." },
                ].map(r => (
                  <div key={r.t} className="flex gap-3 text-sm">
                    <span className="font-mono text-xs text-muted-foreground pt-0.5">{r.t}</span>
                    <p className="text-foreground">{r.c}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ZorgRapport · Gemaakt voor zorgteams
      </footer>
    </div>
  );
}

// Keep supabase import used (for type) — also useful if we extend later
void supabase;
void redirect;
void useState;
