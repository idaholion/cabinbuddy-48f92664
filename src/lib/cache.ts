// Cache utility for reducing API calls
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class Cache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  // Enhanced validation for user-specific data
  getUserSpecificData<T>(key: string, userId: string): T | null {
    const data = this.get<T>(key);
    if (!data) return null;
    
    // Validate the cached data belongs to the current user
    if (typeof data === 'object' && data !== null && '_cached_user_id' in data) {
      if ((data as any)._cached_user_id !== userId) {
        console.warn('🚨 Cache contamination detected - clearing invalid cache entry:', key);
        this.invalidate(key);
        return null;
      }
    }
    
    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new Cache();

// Helper to generate cache keys
export const cacheKeys = {
  userOrganizations: (userId: string) => `user_organizations_${userId}`,
  primaryOrganization: (userId: string) => `primary_organization_${userId}`,
  organization: (orgId: string) => `organization_${orgId}`,
  familyGroups: (orgId: string) => `family_groups_${orgId}`,
  reservationSettings: (orgId: string) => `reservation_settings_${orgId}`,
  financialData: (orgId: string, year: number) => `financial_data_${orgId}_${year}`,
};