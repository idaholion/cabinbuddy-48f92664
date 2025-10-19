import { useState, useEffect } from "react";
import { getBuildVersion } from "@/lib/version";

/**
 * Displays the current build version
 * Useful for troubleshooting deployment and cache issues
 * Updates every minute in dev mode
 */
export function VersionIndicator() {
  const [version, setVersion] = useState(getBuildVersion());
  
  // In dev mode, update version every minute to show it's live
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    
    const interval = setInterval(() => {
      setVersion(getBuildVersion());
    }, 60000); // Update every minute in dev
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="text-base font-semibold text-foreground select-none">
      {version}
    </div>
  );
}
