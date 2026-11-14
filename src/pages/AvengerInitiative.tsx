import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAvengerAccess } from "@/hooks/useAvengerAccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, ExternalLink, Pencil, Plus, Shield, Trash2 } from "lucide-react";

type Entry = {
  id: string; category: string; title: string; url: string | null; username: string | null;
  secret: string | null; notes: string | null; updated_at: string; updated_by_email: string | null;
};
const CATEGORIES = ["Start Here", "Hosting & Domain", "Database (Supabase)", "Email & Text (Resend / Twilio)", "Code & Lovable", "Yearly Tasks", "Emergency Contacts", "General"];
const empty = { category: "Start Here", title: "", url: "", username: "", secret: "", notes: "" };
const table = () => (supabase as any).from("avenger_entries");

export default function AvengerInitiative() {
  const { isAvenger, loading } = useAvengerAccess();
  const { toast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<(typeof empty & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await table().select("*").order("category").order("title");
    if (error) setLoadError(error.message); else { setLoadError(null); setEntries(data || []); }
  };
  useEffect(() => { if (isAvenger) load(); }, [isAvenger]);

  const grouped = useMemo(() => {
    const order = [...CATEGORIES, ...entries.map(e => e.category).filter(c => !CATEGORIES.includes(c))];
    return [...new Set(order)].map(c => [c, entries.filter(e => e.category === c)] as const).filter(([, l]) => l.length);
  }, [entries]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!isAvenger) return <Navigate to="/home" replace />;

  const save = async () => {
    if (!editing?.title.trim()) { toast({ title: "Please add a title", variant: "destructive" }); return; }
    setSaving(true);
    const row = {
      category: editing.category.trim() || "General", title: editing.title.trim(),
      url: editing.url.trim() || null, username: editing.username.trim() || null,
      secret: editing.secret || null, notes: editing.notes.trim() || null,
    };
    const { error } = editing.id ? await table().update(row).eq("id", editing.id) : await table().insert(row);
    setSaving(false);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    setEditing(null); load();
  };
  const remove = async (e: Entry) => {
    if (!confirm(`Delete "${e.title}"?`)) return;
    const { error } = await table().delete().eq("id", e.id);
    if (error) toast({ title: "Could not delete", description: error.message, variant: "destructive" }); else load();
  };
  const copy = (v: string) => { navigator.clipboard.writeText(v); toast({ title: "Copied" }); };

  return (
    <div className="container mx-auto max-w-4xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Avenger Initiative</h1>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1" />Add entry</Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Private to Richard and Sam. Everything needed to keep CabinBuddy running: accounts, logins, links, and step-by-step instructions.
        Passwords stay hidden until you press the eye button.
      </p>
      {loadError && <Card><CardContent className="p-4 text-destructive text-sm">Could not load entries: {loadError}</CardContent></Card>}
      {!loadError && entries.length === 0 && (
        <Card><CardContent className="p-6 text-muted-foreground text-sm">No entries yet. Start with a "Start Here" note for Sam explaining what to do first.</CardContent></Card>
      )}
      {grouped.map(([cat, list]) => (
        <Card key={cat}>
          <CardHeader className="pb-2"><CardTitle className="text-lg">{cat}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {list.map(e => (
              <div key={e.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{e.title}</div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => setEditing({ id: e.id, category: e.category, title: e.title, url: e.url || "", username: e.username || "", secret: e.secret || "", notes: e.notes || "" })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(e)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 break-all">{e.url}<ExternalLink className="h-3 w-3" /></a>}
                {e.username && <div className="text-sm flex items-center gap-1"><span className="text-muted-foreground">Login:</span> <span className="break-all">{e.username}</span><Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Copy login" onClick={() => copy(e.username!)}><Copy className="h-3 w-3" /></Button></div>}
                {e.secret && (
                  <div className="text-sm flex items-center gap-1">
                    <span className="text-muted-foreground">Password:</span>
                    <span className="font-mono break-all">{shown[e.id] ? e.secret : "••••••••"}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={shown[e.id] ? "Hide password" : "Show password"} onClick={() => setShown(s => ({ ...s, [e.id]: !s[e.id] }))}>{shown[e.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Copy password" onClick={() => copy(e.secret!)}><Copy className="h-3 w-3" /></Button>
                  </div>
                )}
                {e.notes && <div className="text-sm whitespace-pre-wrap">{e.notes}</div>}
                <div className="text-xs text-muted-foreground">Updated {new Date(e.updated_at).toLocaleDateString()}{e.updated_by_email ? ` by ${e.updated_by_email}` : ""}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit entry" : "Add entry"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Section</Label>
                <Input list="avenger-cats" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value })} />
                <datalist id="avenger-cats">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div><Label>Title</Label><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Supabase account" /></div>
              <div><Label>Link</Label><Input value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} placeholder="https://" /></div>
              <div><Label>Login / username</Label><Input value={editing.username} onChange={e => setEditing({ ...editing, username: e.target.value })} /></div>
              <div><Label>Password or key</Label><Input type="password" autoComplete="new-password" value={editing.secret} onChange={e => setEditing({ ...editing, secret: e.target.value })} /></div>
              <div><Label>Notes & instructions</Label><Textarea rows={6} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
