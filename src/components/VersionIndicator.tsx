import { getBuildVersion } from "@/lib/version";

/**
 * Displays the current build version
 * Useful for troubleshooting deployment and cache issues
 */
export function VersionIndicator() {
  const version = getBuildVersion();
  
  return (
    <div className="text-xs text-muted-foreground/60 select-none">
      {version}
    </div>
  );
}
