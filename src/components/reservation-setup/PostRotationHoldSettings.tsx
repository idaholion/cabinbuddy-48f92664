import { useEffect, useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { secureSelect, secureUpdate, createOrganizationContext } from "@/lib/secure-queries";
import { addDays, DEFAULT_OPEN_TIME, formatOpening, mountainDate, mountainToInstant } from "@/lib/post-rotation-hold";

const TIMES = [
  { value: "12:00", label: "12:00 PM (noon)" },
  { value: "17:00", label: "5:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "00:00", label: "12:00 AM (midnight)" },
];

/** Hold period before free selection; saves only its own fields so active-season settings are never re-saved. */
export interface PostRotationLimits { minNights: string; maxConsecutiveNights: string; maxWeeks: string }

/** One save for the whole post-rotation section: hold, opening, and free-selection booking limits. */
export function PostRotationHoldSettings({ organizationId, rotationYear, limits, children }: { organizationId: string; rotationYear: number; limits: PostRotationLimits; children?: React.ReactNode }) {
  const { toast } = useToast();
  const ctx = createOrganizationContext(organizationId);
  const [rowId, setRowId] = useState<string | null>(null);
  const [installed, setInstalled] = useState(true);
  const [holdDays, setHoldDays] = useState("7");
  const [openTime, setOpenTime] = useState(DEFAULT_OPEN_TIME);
  const [openDate, setOpenDate] = useState("");
  const [savedOpensAt, setSavedOpensAt] = useState<string | null>(null);
  const [announcedAt, setAnnouncedAt] = useState<string | null>(null);
  const [notifyNow, setNotifyNow] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const { data, error } = await secureSelect("rotation_orders", ctx)
        .select("id, post_rotation_hold_days, post_rotation_open_time, post_rotation_opens_at, post_rotation_announced_at")
        .eq("rotation_year", rotationYear).maybeSingle();
      if (!live) return;
      if (error) { setInstalled(false); return; }
      const row = data as any;
      setInstalled(true);
      setRowId(row?.id ?? null);
      setHoldDays(row?.post_rotation_hold_days != null ? String(row.post_rotation_hold_days) : "7");
      setOpenTime(row?.post_rotation_open_time || DEFAULT_OPEN_TIME);
      setSavedOpensAt(row?.post_rotation_opens_at ?? null);
      setOpenDate(row?.post_rotation_opens_at ? mountainDate(new Date(row.post_rotation_opens_at)) : "");
      setAnnouncedAt(row?.post_rotation_announced_at ?? null);
    })();
    return () => { live = false; };
  }, [organizationId, rotationYear]);

  if (!installed) {
    return <p className="text-sm text-muted-foreground">The hold period needs a one-time database update before it can be used.</p>;
  }

  const opensAt = openDate ? mountainToInstant(openDate, openTime) : null;
  const dateChanged = (opensAt?.toISOString() ?? null) !== (savedOpensAt ? new Date(savedOpensAt).toISOString() : null);
  const canNotify = !!opensAt && opensAt > new Date() && (!announcedAt || dateChanged);

  const save = async () => {
    if (!rowId) { toast({ title: "Save the rotation order first", variant: "destructive" }); return; }
    const minNights = parseInt(limits.minNights);
    if (!Number.isFinite(minNights) || minNights < 1) { toast({ title: "Minimum nights must be at least 1", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        post_rotation_hold_days: Math.max(0, parseInt(holdDays) || 0),
        post_rotation_open_time: openTime,
        post_rotation_opens_at: opensAt?.toISOString() ?? null,
        enable_post_rotation_selection: true,
        post_rotation_min_nights: minNights,
        post_rotation_max_consecutive_nights: limits.maxConsecutiveNights ? parseInt(limits.maxConsecutiveNights) : null,
        post_rotation_max_weeks: limits.maxWeeks ? parseInt(limits.maxWeeks) : null,
      };
      if (dateChanged) { update.post_rotation_announced_at = null; update.post_rotation_reminder_sent_at = null; }
      const { error } = await secureUpdate("rotation_orders", update, ctx).eq("id", rowId);
      if (error) throw error;
      setSavedOpensAt(opensAt?.toISOString() ?? null);
      if (dateChanged) setAnnouncedAt(null);
      let notified = false;
      if (notifyNow && canNotify && opensAt) {
        const when = formatOpening(opensAt);
        const { error: sendErr } = await supabase.functions.invoke("send-message", { body: {
          organizationId, recipientGroup: "all_users", messageType: "both", urgent: false,
          subject: `${rotationYear} free selection opens ${when}`,
          message: `The ${rotationYear} selection rounds are complete. The calendar is on hold so every family has an equal chance, and free selection opens ${when}, first come, first served.`,
        } });
        if (sendErr) throw new Error("Settings saved, but the announcement could not be sent. It will be retried by the daily check.");
        const stamp = new Date().toISOString();
        await secureUpdate("rotation_orders", { post_rotation_announced_at: stamp }, ctx).eq("id", rowId);
        setAnnouncedAt(stamp);
        notified = true;
      }
      toast({ title: "Post rotation selection updated", description: notified ? "Everyone has been emailed and texted the opening time." : opensAt ? `Free selection opens ${formatOpening(opensAt)}.` : "The opening date will be set automatically when the rounds finish." });
    } catch (e) {
      toast({ title: "Could not update post rotation selection", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h4 className="text-base font-medium">Hold period before free selection</h4>
      <p className="text-sm text-muted-foreground">Time period to lock reservations so everyone has an equal opportunity to make post rotation selections. Everyone is emailed and texted the opening time, with a reminder the day before.</p>
      <div className="flex flex-wrap items-center gap-2 text-base">
        <span>Lock the calendar for</span>
        <Input type="number" min="0" max="60" value={holdDays} onChange={(e) => setHoldDays(e.target.value)} className="w-20" />
        <span>days, opening at</span>
        <Select value={openTime} onValueChange={setOpenTime}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{TIMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <span>Mountain Time</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-base">
        <Label htmlFor="freeSelectionOpenDate">Opening date:</Label>
        <Input id="freeSelectionOpenDate" type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} className="w-44" />
        <Button type="button" variant="outline" size="sm" onClick={() => setOpenDate(addDays(mountainDate(new Date()), Math.max(0, parseInt(holdDays) || 0)))}>
          {holdDays || 0} days from today
        </Button>
        {openDate && <Button type="button" variant="ghost" size="sm" onClick={() => setOpenDate("")}>Clear</Button>}
      </div>
      <p className="text-sm text-muted-foreground">
        {opensAt ? `Free selection opens ${formatOpening(opensAt)}.` : "Leave the date blank to set it automatically when the last family finishes."}
        {announcedAt && !dateChanged ? " Announcement already sent." : ""}
      </p>
      {canNotify && (
        <div className="flex items-center space-x-2">
          <Checkbox id="notifyFreeSelection" checked={notifyNow} onCheckedChange={(c) => setNotifyNow(c === true)} />
          <Label htmlFor="notifyFreeSelection">Email and text everyone the opening time when I save</Label>
        </div>
      )}
      {children}
      <Button type="button" onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Update Post Rotation Selection"}</Button>
    </div>
  );
}
