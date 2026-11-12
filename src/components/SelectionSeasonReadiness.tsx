import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelectionPreflight } from "@/hooks/useSelectionPreflight";
import type { PreflightCheck } from "@/lib/selection-preflight";

const STATUS_ICON = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
} as const;

const STATUS_LABEL = {
  pass: "Ready",
  warn: "Review",
  fail: "Blocking",
} as const;

const STATUS_TEXT = {
  pass: "text-green-600",
  warn: "text-amber-600",
  fail: "text-destructive",
} as const;

export const SelectionSeasonReadiness = () => {
  const { result, loading, error, refresh, year } = useSelectionPreflight();

  if (!year) return null;

  const summary = result?.summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {year} Season Readiness
          {summary && (
            <Badge
              variant="outline"
              className={summary.fail > 0 ? "border-destructive text-destructive" : ""}
            >
              {summary.fail > 0
                ? `${summary.fail} blocking`
                : summary.warn > 0
                  ? `${summary.warn} to review`
                  : "All clear"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base text-muted-foreground">
          A read-only check of the {year} selection season: the pick order, dated turns, saved pick
          counts, Round 2 state, free-selection settings and booking limits. Nothing here changes
          reservations, turns, or who has already picked.
        </p>

        {error && (
          <p className="text-base text-destructive">{error}</p>
        )}

        {!result && !error && (
          <p className="text-base text-muted-foreground">Checking the season…</p>
        )}

        {result && (
          <>
            <div className="rounded-lg border divide-y">
              {result.checks.map((check: PreflightCheck) => {
                const Icon = STATUS_ICON[check.status];
                return (
                  <div key={check.id} className="flex items-start gap-3 p-3">
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${STATUS_TEXT[check.status]}`} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium">{check.label}</span>
                        <span className={`text-sm ${STATUS_TEXT[check.status]}`}>
                          {STATUS_LABEL[check.status]}
                        </span>
                      </div>
                      <p className="text-base text-muted-foreground">{check.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-base text-muted-foreground">
                {result.summary.pass} ready · {result.summary.warn} to review ·{" "}
                {result.summary.fail} blocking
              </span>
              <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Checking…" : "Check again"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
