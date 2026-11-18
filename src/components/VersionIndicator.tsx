import { getBuildTimestamp } from "@/lib/version";
import { changelog, currentVersion } from "@/lib/changelog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/** Shows "v2.4.1 • 11.18"; version comes from CHANGELOG.md, date from the build. Click to read the changelog. */
export function VersionIndicator() {
  const d = new Date(import.meta.env.DEV ? new Date().toISOString() : getBuildTimestamp());
  const stamp = `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const label = `v${currentVersion} • ${stamp}${import.meta.env.DEV ? " (dev)" : ""}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-base font-semibold text-foreground hover:underline" title="See what's changed">
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>What's new in CabinBuddy</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="space-y-5">
            {changelog.map((e) => (
              <div key={e.version}>
                <h3 className="font-semibold text-foreground">v{e.version} <span className="text-sm font-normal text-muted-foreground">— {e.date}</span></h3>
                {e.sections.map((s, i) => (
                  <div key={i} className="mt-2">
                    {s.heading && <p className="text-sm font-medium text-muted-foreground">{s.heading}</p>}
                    <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                      {s.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
