/**
 * Build version utility
 * Generates version string from build timestamp
 */

// Injected at build time by Vite
declare const __BUILD_TIME__: string;

/**
 * Get the current build version
 * Format: v2025.10.19.1430 (timestamp-based)
 */
export function getBuildVersion(): string {
  try {
    const buildTime = typeof __BUILD_TIME__ !== 'undefined' 
      ? __BUILD_TIME__ 
      : new Date().toISOString();
    
    const date = new Date(buildTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    const version = `v${year}.${month}.${day}.${hours}${minutes}`;
    
    // Add environment suffix in dev mode
    if (import.meta.env.DEV) {
      return `${version} (dev)`;
    }
    
    return version;
  } catch (error) {
    console.error('Error generating build version:', error);
    return 'v0.0.0';
  }
}

/**
 * Get the full build timestamp
 */
export function getBuildTimestamp(): string {
  try {
    return typeof __BUILD_TIME__ !== 'undefined' 
      ? __BUILD_TIME__ 
      : new Date().toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}
