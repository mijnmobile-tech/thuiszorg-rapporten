import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import {
  Stethoscope,
  Plus,
  Search,
  LogOut,
  Calendar as CalendarIcon,
  User as UserIcon,
  MapPin,
  ClipboardList,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({ component: AppPage });

type Client = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  location: string | null;
  notes: string | null;
};

type Report = {
  id: string;
  client_id: string;
  author_id: string;
  report_date: string;
  report_time: string;
  category: string;
  content: string;
  created_at: string;
  author_name?: string | null;
};

const CATEGORIES = [
  { value: "algemeen", label: "Algemeen" },
  { value: "medicatie", label: "Medicatie" },
  { value: "voeding", label: "Voeding" },
  { value: "hygiene", label: "Hygiëne" },
  { value: "sociaal", label: "Sociaal" },
  { value: "medisch", label: "Medisch" },
  { value: "incident", label: "Incident" },
] as const;

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    algemeen: "bg-secondary text-secondary-foreground",
    medicatie: "bg-accent/15 text-accent",
    voeding: "bg-success/15 text-success",
    hygiene: "bg-secondary text-secondary-foreground",
    sociaal: "bg-primary/10 text-primary",
    medisch: "bg-accent/15 text-accent",
    incident: "bg-destructive/15 text-destructive",
  };
  return map[cat] ?? map.algemeen;
}

function AppPage() {
  const { user, loading } = useAuth();
  const { isAdmin } = useRole();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      setProfileName(data?.full_name ?? user.email ?? "");
    })();
    loadClients();
  }, [user]);

  async function loadClients() {
    const { data, error } = await supabase.from("clients").select("*").order("full_name");
    if (error) return toast.error(error.message);
    setClients(data ?? []);
    if (data && data.length > 0 && !selectedId) setSelectedId(data[0].id);
  }

  useEffect(() => {
    if (!selectedId) return;
    loadReports(selectedId);
  }, [selectedId]);

  async function loadReports(clientId: string) {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("client_id", clientId)
      .order("report_date", { ascending: false })
      .order("report_time", { ascending: false });
    if (error) return toast.error(error.message);

    // fetch author names
    const ids = Array.from(new Set((data ?? []).map((r) => r.author_id)));
    let nameMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      nameMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name ?? ""]));
    }
    setReports((data ?? []).map((r) => ({ ...r, author_name: nameMap[r.author_id] })));
  }

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) => c.full_name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q));
  }, [clients, search]);

  const selectedClient = clients.find((c) => c.id === selectedId);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Laden…</div>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-80 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-white/10 grid place-items-center">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <p className="font-display font-semibold">ZorgRapport</p>
              <p className="text-xs text-sidebar-foreground/60 truncate max-w-[180px]">{profileName}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 border-b border-sidebar-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-sidebar-foreground/50" />
            <Input
              placeholder="Zoek cliënt…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
            />
          </div>
          <NewClientDialog
            userId={user.id}
            onCreated={(id) => { loadClients().then(() => setSelectedId(id)); }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredClients.length === 0 && (
            <p className="text-sm text-sidebar-foreground/50 text-center mt-8 px-4">
              Nog geen cliënten. Voeg je eerste cliënt toe.
            </p>
          )}
          {filteredClients.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "w-full text-left rounded-md px-3 py-2.5 mb-1 transition-colors",
                selectedId === c.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent text-sidebar-foreground/90",
              )}
            >
              <p className="font-medium text-sm">{c.full_name}</p>
              {c.location && (
                <p className={cn("text-xs mt-0.5", selectedId === c.id ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/50")}>
                  {c.location}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-sidebar-border space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent text-sidebar-foreground"
            >
              <Shield className="size-4" /> Admin backend
            </Link>
          )}
          <div className="flex items-center gap-1">
            <Button variant="ghost" onClick={handleLogout} className="flex-1 justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <LogOut className="size-4 mr-2" /> Uitloggen
            </Button>
            <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {selectedClient ? (
          <div className="max-w-4xl mx-auto p-8">
            <header className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b">
              <div>
                <h1 className="text-3xl font-semibold">{selectedClient.full_name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  {selectedClient.date_of_birth && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon className="size-3.5" />
                      {format(new Date(selectedClient.date_of_birth), "d MMMM yyyy", { locale: nl })}
                    </span>
                  )}
                  {selectedClient.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {selectedClient.location}
                    </span>
                  )}
                </div>
                {selectedClient.notes && (
                  <p className="mt-3 text-sm text-muted-foreground max-w-xl bg-secondary rounded-md px-3 py-2">
                    {selectedClient.notes}
                  </p>
                )}
              </div>
              <NewReportDialog
                clientId={selectedClient.id}
                userId={user.id}
                onCreated={() => loadReports(selectedClient.id)}
              />
            </header>

            <section className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Rapportages ({reports.length})
                </h2>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                  <ClipboardList className="size-10 mx-auto text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">Nog geen rapportages voor deze cliënt.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <article key={r.id} className="bg-card border rounded-xl p-5 shadow-soft">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 text-sm">
                          <Badge className={cn("font-medium border-0", categoryColor(r.category))}>
                            {CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}
                          </Badge>
                          <span className="text-muted-foreground">
                            {format(new Date(r.report_date), "EEE d MMM yyyy", { locale: nl })} · {r.report_time.slice(0, 5)}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserIcon className="size-3" />
                          {r.author_name || "Onbekend"}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{r.content}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="h-full grid place-items-center text-center p-8">
            <div>
              <Stethoscope className="size-12 mx-auto text-muted-foreground/40" />
              <h2 className="mt-4 text-xl font-semibold">Selecteer een cliënt</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Kies links een cliënt of voeg er een nieuwe toe om te beginnen.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NewClientDialog({ userId, onCreated }: { userId: string; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: name.trim(),
        date_of_birth: dob || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
        created_by: userId,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cliënt toegevoegd");
    setOpen(false);
    setName(""); setDob(""); setLocation(""); setNotes("");
    if (data) onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-foreground border-0">
          <Plus className="size-4 mr-2" /> Nieuwe cliënt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe cliënt</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Volledige naam *</Label>
            <Input id="cname" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cdob">Geboortedatum</Label>
              <Input id="cdob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cloc">Kamer / locatie</Label>
              <Input id="cloc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnotes">Bijzonderheden</Label>
            <Textarea id="cnotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? "Bezig…" : "Toevoegen"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewReportDialog({
  clientId,
  userId,
  onCreated,
}: {
  clientId: string;
  userId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("algemeen");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(() => format(new Date(), "HH:mm"));
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      client_id: clientId,
      author_id: userId,
      report_date: date,
      report_time: time + ":00",
      category: category as "algemeen",
      content: content.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Rapportage opgeslagen");
    setOpen(false);
    setContent("");
    setCategory("algemeen");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTime(format(new Date(), "HH:mm"));
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-soft">
          <Plus className="size-4 mr-2" /> Nieuwe rapportage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nieuwe rapportage</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rdate">Datum</Label>
              <Input id="rdate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtime">Tijd</Label>
              <Input id="rtime" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rcontent">Rapportage *</Label>
            <Textarea
              id="rcontent"
              rows={6}
              required
              minLength={3}
              placeholder="Beschrijf zorghandelingen, observaties, bijzonderheden…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
