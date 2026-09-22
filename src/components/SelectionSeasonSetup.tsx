import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, CheckCircle2, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";
import { useRotationOrder } from "@/hooks/useRotationOrder";
import { useToast } from "@/hooks/use-toast";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const toDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface PlannedTurn {
  familyGroup: string;
  startDate: string;
  endDate: string;
}

export const SelectionSeasonSetup = () => {
  const { organization } = useOrganization();
  const { rotationData, calculateRotationForYear, getSelectionRotationYear } = useRotationOrder();
  const { toast } = useToast();

  const { isAdmin } = useOrgAdmin();

  const [existingTurns, setExistingTurns] = useState<PlannedTurn[] | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [leadDays, setLeadDays] = useState(10);
  const [savingAuto, setSavingAuto] = useState(false);

  const targetYear = rotationData ? getSelectionRotationYear() : new Date().getFullYear() + 1;
  const selectionYear = targetYear - 1;

  const plannedTurns: PlannedTurn[] = useMemo(() => {
    if (!rotationData?.rotation_order?.length) return [];

    const order = calculateRotationForYear(
      rotationData.rotation_order,
      rotationData.rotation_year,
      targetYear,
      rotationData.first_last_option || "first"
    );

    const selectionDays = rotationData.selection_days || 14;
    const startMonthIndex = Math.max(0, MONTHS.indexOf(rotationData.start_month || "October"));

    let cursor = new Date(selectionYear, startMonthIndex, 1);

    return order.map((familyGroup) => {
      const end = new Date(cursor);
      end.setDate(end.getDate() + selectionDays - 1);
      const turn = {
        familyGroup,
        startDate: toDateString(cursor),
        endDate: toDateString(end),
      };
      cursor = new Date(end);
      cursor.setDate(cursor.getDate() + 1);
      return turn;
    });
  }, [rotationData, targetYear, selectionYear, calculateRotationForYear]);

  const loadExisting = useCallback(async () => {
    if (!organization?.id) return;
    setChecking(true);
    try {
      const { data } = await supabase
        .from("reservation_periods")
        .select("current_family_group, selection_start_date, selection_end_date")
        .eq("organization_id", organization.id)
        .eq("rotation_year", targetYear)
        .order("selection_start_date");

      setExistingTurns(
        data && data.length > 0
          ? data.map((p) => ({
              familyGroup: p.current_family_group,
              startDate: p.selection_start_date,
              endDate: p.selection_end_date,
            }))
          : null
      );
    } finally {
      setChecking(false);
    }
  }, [organization?.id, targetYear]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  useEffect(() => {
    const loadAutoSettings = async () => {
      if (!organization?.id) return;
      const { data } = await (supabase as any)
        .from("organizations")
        .select("auto_create_selection_season, selection_season_lead_days")
        .eq("id", organization.id)
        .maybeSingle();
      if (data) {
        setAutoEnabled(data.auto_create_selection_season !== false);
        setLeadDays(Number(data.selection_season_lead_days ?? 10));
      }
    };
    loadAutoSettings();
  }, [organization?.id]);

  const handleSaveAutoSettings = async () => {
    if (!organization?.id) return;
    setSavingAuto(true);
    try {
      const { error } = await (supabase as any)
        .from("organizations")
        .update({
          auto_create_selection_season: autoEnabled,
          selection_season_lead_days: Math.max(1, Math.min(180, Math.round(leadDays) || 10)),
        })
        .eq("id", organization.id);
      if (error) throw error;
      toast({ title: "Automatic setup saved" });
    } catch (error: any) {
      toast({
        title: "Could not save the setting",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAuto(false);
    }
  };


  const handleCreateSeason = async () => {
    if (!organization?.id || plannedTurns.length === 0) return;
    setSaving(true);
    try {
      const order = plannedTurns.map((t) => t.familyGroup);

      // 1. Season record (who picks in what order, when it starts, whose turn it is)
      const seasonRecord = {
        organization_id: organization.id,
        rotation_year: targetYear,
        rotation_order: order,
        start_month: rotationData?.start_month || "October",
        selection_days: rotationData?.selection_days || 14,
        first_last_option: rotationData?.first_last_option || "first",
        current_primary_turn_family: order[0],
        max_time_slots: rotationData?.max_time_slots ?? 2,
        max_nights: rotationData?.max_nights ?? 7,
        start_day: rotationData?.start_day || null,
        start_time: rotationData?.start_time || null,
        enable_secondary_selection: rotationData?.enable_secondary_selection ?? false,
        secondary_max_periods: rotationData?.secondary_max_periods ?? 1,
        secondary_selection_days: rotationData?.secondary_selection_days ?? 7,
      };

      const { data: existingSeason } = await supabase
        .from("rotation_orders")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("rotation_year", targetYear)
        .maybeSingle();

      const seasonResult = existingSeason
        ? await supabase.from("rotation_orders").update(seasonRecord).eq("id", existingSeason.id)
        : await supabase.from("rotation_orders").insert(seasonRecord);

      if (seasonResult.error) throw seasonResult.error;

      // 2. Dated turns
      const { error: periodsError } = await supabase.from("reservation_periods").insert(
        plannedTurns.map((turn, index) => ({
          organization_id: organization.id,
          rotation_year: targetYear,
          current_family_group: turn.familyGroup,
          current_group_index: index,
          selection_start_date: turn.startDate,
          selection_end_date: turn.endDate,
          reservations_completed: false,
        }))
      );

      if (periodsError) throw periodsError;

      // 3. Each group's allowance for the year, so turns can advance
      const { data: existingUsage } = await supabase
        .from("time_period_usage")
        .select("family_group")
        .eq("organization_id", organization.id)
        .eq("rotation_year", targetYear);

      const alreadyTracked = new Set((existingUsage || []).map((u) => u.family_group));
      const newUsage = order
        .filter((group) => !alreadyTracked.has(group))
        .map((group) => ({
          organization_id: organization.id,
          rotation_year: targetYear,
          family_group: group,
          time_periods_used: 0,
          time_periods_allowed: rotationData?.max_time_slots ?? 2,
          secondary_periods_used: 0,
          secondary_periods_allowed: rotationData?.secondary_max_periods ?? 1,
          turn_completed: false,
        }));

      if (newUsage.length > 0) {
        const { error: usageError } = await supabase.from("time_period_usage").insert(newUsage);
        if (usageError) throw usageError;
      }

      toast({
        title: `${targetYear} selection season created`,
        description: `${plannedTurns.length} selection turns scheduled, starting ${formatDate(plannedTurns[0].startDate)}.`,
      });

      await loadExisting();
    } catch (error: any) {
      console.error("Error creating selection season:", error);
      toast({
        title: "Could not create the season",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!rotationData?.rotation_order?.length) return null;

  const turnsToShow = existingTurns || plannedTurns;

  const firstStart = turnsToShow[0]?.startDate;
  let autoCreateDate: string | null = null;
  if (firstStart) {
    const [y, m, d] = firstStart.split("-").map(Number);
    const trigger = new Date(y, m - 1, d);
    trigger.setDate(trigger.getDate() - (Math.round(leadDays) || 10));
    autoCreateDate = toDateString(trigger);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          {targetYear} Selection Season
          {existingTurns && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Set up
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-muted-foreground">
          {existingTurns
            ? `The ${targetYear} selection season is set up. These are the turns automatic notifications will follow.`
            : `Create the ${targetYear} selection season so automatic turn notifications and "your turn ends tomorrow" reminders can go out. Review the order and dates below before creating it.`}
        </p>

        <div className="rounded-lg border divide-y">
          {turnsToShow.map((turn, index) => (
            <div key={`${turn.familyGroup}-${turn.startDate}`} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <span className="font-medium w-6 text-muted-foreground">{index + 1}.</span>
                <span className="text-base">{turn.familyGroup}</span>
              </div>
              <span className="text-base text-muted-foreground">
                {formatDate(turn.startDate)} – {formatDate(turn.endDate)}
              </span>
            </div>
          ))}
        </div>

        {!existingTurns && (
          <Button onClick={handleCreateSeason} disabled={saving || checking} className="w-full">
            {saving ? "Creating..." : `Start the ${targetYear} selection season`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
