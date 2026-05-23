import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import {
  Shield,
  Users,
  ClipboardList,
  Stethoscope,
  ArrowLeft,
  Trash2,
  Pencil,
  Search,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRole, type AppRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type ProfileRow = {
  id: string;
  full_name: string | null;
  created_at: string;
  role: AppRole;
};
type ClientRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
};
type ReportRow = {
  id: string;
  client_id: string;
  author_id: string;
  report_date: string;
  report_time: string;
  category: string;
  content: string;
  created_at: string;
};

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();

  useEffect(() => {
    if (!authLoading && !user) window.location.href = "/login";
  }, [user, authLoading]);

  if (authLoading || roleLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        Laden…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="text-center max-w-md">
          <Shield className="size-12 mx-auto text-muted-foreground/50" />
          <h1 className="mt-4 text-2xl font-semibold">Geen toegang</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Je hebt geen beheerdersrechten. Vraag een admin om je rol aan te passen.
          </p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="size-4" /> Terug naar app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg grid place-items-center text-primary-foreground"
              style={{ background: "var(--gradient-brand)" }}>
              <Shield className="size-5" />
            </div>
            <div>
              <p className="font-display font-semibold leading-tight">Admin backend</p>
              <p className="text-xs text-muted-foreground">Beheer gebruikers, cliënten en rapportages</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/app"
              className="inline-flex items-center gap-2 text-sm rounded-md border bg-card px-3 py-2 hover:bg-secondary"
            >
              <ArrowLeft className="size-4" /> App
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><UserCog className="size-4 mr-1.5" />Gebruikers</TabsTrigger>
            <TabsTrigger value="clients"><Users className="size-4 mr-1.5" />Cliënten</TabsTrigger>
            <TabsTrigger value="reports"><ClipboardList className="size-4 mr-1.5" />Rapportages</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <UsersTab currentUserId={user.id} />
          </TabsContent>
          <TabsContent value="clients" className="mt-6">
            <ClientsTab />
          </TabsContent>
          <TabsContent value="reports" className="mt-6">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ------------------------------- USERS ------------------------------- */

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const roleMap = new Map<string, AppRole>();
    (roles ?? []).forEach((r) => {
      const cur = roleMap.get(r.user_id);
      const nr = r.role as AppRole;
      if (!cur || nr === "admin") roleMap.set(r.user_id, nr);
    });
    setRows((profs ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "medewerker" })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter((r) => (r.full_name ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  async function setRole(userId: string, newRole: AppRole) {
    // wipe other roles, insert new one
    const other: AppRole = newRole === "admin" ? "medewerker" : "admin";
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", other);
    if (delErr) return toast.error(delErr.message);
    // upsert via insert ignoring conflict
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error && !/duplicate/i.test(error.message)) return toast.error(error.message);
    toast.success("Rol bijgewerkt");
    load();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Zoek medewerker…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} medewerker(s)</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Naam</th>
              <th className="text-left font-medium px-4 py-3">Aangemaakt</th>
              <th className="text-left font-medium px-4 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Laden…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Geen medewerkers gevonden.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-medium">
                  {r.full_name ?? "—"}
                  {r.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(jij)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(r.created_at), "d MMM yyyy", { locale: nl })}
                </td>
                <td className="px-4 py-3">
                  <Select value={r.role} onValueChange={(v) => setRole(r.id, v as AppRole)} disabled={r.id === currentUserId}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="medewerker">Medewerker</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ------------------------------- CLIENTS ------------------------------- */

function ClientsTab() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("clients").select("*").order("full_name");
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Cliënt verwijderen? Alle rapportages blijven bewaard maar verwijzen naar een verwijderde cliënt.")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cliënt verwijderd");
    load();
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter((r) => r.full_name.toLowerCase().includes(s) || (r.location ?? "").toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Zoek cliënt…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} cliënt(en)</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-3">Naam</th>
              <th className="text-left font-medium px-4 py-3">Geboortedatum</th>
              <th className="text-left font-medium px-4 py-3">Locatie</th>
              <th className="text-right font-medium px-4 py-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Laden…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Geen cliënten.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-medium">{r.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {r.date_of_birth ? format(new Date(r.date_of_birth), "d MMM yyyy", { locale: nl }) : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.location ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label="Bewerken">
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Verwijderen" className="text-destructive hover:text-destructive">
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditClientDialog
        client={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </section>
  );
}

function EditClientDialog({ client, onClose, onSaved }: {
  client: ClientRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.full_name);
      setDob(client.date_of_birth ?? "");
      setLocation(client.location ?? "");
      setNotes(client.notes ?? "");
    }
  }, [client]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setBusy(true);
    const { error } = await supabase.from("clients").update({
      full_name: name.trim(),
      date_of_birth: dob || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    }).eq("id", client.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cliënt bijgewerkt");
    onSaved();
  }

  return (
    <Dialog open={!!client} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cliënt bewerken</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ename">Volledige naam</Label>
            <Input id="ename" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edob">Geboortedatum</Label>
              <Input id="edob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eloc">Locatie</Label>
              <Input id="eloc" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enotes">Bijzonderheden</Label>
            <Textarea id="enotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Annuleren</Button>
            <Button type="submit" disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- REPORTS ------------------------------- */

function ReportsTab() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [authorMap, setAuthorMap] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: reports }, { data: clients }, { data: profiles }] = await Promise.all([
      supabase.from("reports").select("*").order("report_date", { ascending: false }).order("report_time", { ascending: false }).limit(500),
      supabase.from("clients").select("id, full_name"),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setClientMap(Object.fromEntries((clients ?? []).map((c) => [c.id, c.full_name])));
    setAuthorMap(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name ?? ""])));
    setRows(reports ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Rapportage definitief verwijderen?")) return;
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rapportage verwijderd");
    load();
  }

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!s) return true;
      return (clientMap[r.client_id] ?? "").toLowerCase().includes(s) || r.content.toLowerCase().includes(s);
    });
  }, [rows, q, category, clientMap]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Zoek in rapportages…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle categorieën</SelectItem>
            <SelectItem value="algemeen">Algemeen</SelectItem>
            <SelectItem value="medicatie">Medicatie</SelectItem>
            <SelectItem value="voeding">Voeding</SelectItem>
            <SelectItem value="hygiene">Hygiëne</SelectItem>
            <SelectItem value="sociaal">Sociaal</SelectItem>
            <SelectItem value="medisch">Medisch</SelectItem>
            <SelectItem value="incident">Incident</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} rapportage(s)</p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Laden…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl">
            <ClipboardList className="size-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">Geen rapportages gevonden.</p>
          </div>
        ) : filtered.map((r) => (
          <article key={r.id} className="bg-card border rounded-xl p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">{r.category}</Badge>
                <span className="font-medium">{clientMap[r.client_id] ?? "Onbekende cliënt"}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {format(new Date(r.report_date), "d MMM yyyy", { locale: nl })} {r.report_time.slice(0, 5)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{authorMap[r.author_id] ?? "Onbekend"}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="text-destructive hover:text-destructive" aria-label="Verwijderen">
                <Trash2 className="size-4" />
              </Button>
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap leading-relaxed">{r.content}</p>
          </article>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        <Stethoscope className="inline size-3 mr-1" />
        Maximaal 500 meest recente rapportages worden geladen.
      </p>
    </section>
  );
}
