import { getBuildVersion } from "@/lib/version";

/**
 * Displays the current build version
 * Useful for troubleshooting deployment and cache issues
 */
export function VersionIndicator() {
  const version = getBuildVersion();
  
  return (
    <div className="text-sm font-medium text-muted-foreground select-none">
      {version}
    </div>
  );
}
