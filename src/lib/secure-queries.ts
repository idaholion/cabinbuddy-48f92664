import { supabase } from '@/integrations/supabase/client';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { toast } from '@/hooks/use-toast';

/**
 * Organization Context for Secure Queries
 * Ensures all queries are scoped to the correct organization
 */
export interface OrganizationContext {
  organizationId: string;
  isTestOrganization?: boolean;
  allocationModel?: string;
}

/**
 * Query Options for additional security checks
 */
export interface SecureQueryOptions {
  /** Skip organization isolation (only for supervisors or specific cases) */
  skipIsolation?: boolean;
  /** Show warning toast for test organization operations */
  showTestWarning?: boolean;
  /** Custom audit log message */
  auditMessage?: string;
}

/**
 * Security Error thrown when organization context is missing or invalid
 */
export class OrganizationContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrganizationContextError';
  }
}

/**
 * Validates organization context before executing queries
 */
function validateContext(context: OrganizationContext | null | undefined): asserts context is OrganizationContext {
  if (!context || !context.organizationId) {
    throw new OrganizationContextError(
      'Organization context is required. Ensure you are using useOrganizationContext() and have an active organization.'
    );
  }
}

/**
 * Logs a warning if operating on test organization data
 */
function checkTestOrganization(context: OrganizationContext, options?: SecureQueryOptions) {
  if (context.isTestOrganization && options?.showTestWarning !== false) {
    console.warn('[SECURE QUERY] Operating on TEST organization data:', context.organizationId);
  }
}

/**
 * Secure SELECT query builder
 * Automatically filters by organization_id
 */
export function secureSelect(
  tableName: string,
  context: OrganizationContext | null | undefined,
  options?: SecureQueryOptions
) {
  validateContext(context);
  checkTestOrganization(context, options);

  const query = (supabase as any).from(tableName).select();

  // Auto-inject organization_id filter unless explicitly skipped
  if (!options?.skipIsolation) {
    return query.eq('organization_id', context.organizationId);
  }

  return query;
}

/**
 * Secure INSERT operation
 * Automatically injects organization_id
 */
export function secureInsert(
  tableName: string,
  data: any | any[],
  context: OrganizationContext | null | undefined,
  options?: SecureQueryOptions
) {
  validateContext(context);
  checkTestOrganization(context, options);

  // Inject organization_id into data
  const enhancedData = Array.isArray(data)
    ? data.map(item => ({ ...item, organization_id: context.organizationId }))
    : { ...data, organization_id: context.organizationId };

  // Mark test data if applicable
  if (context.isTestOrganization) {
    const withTestFlag = Array.isArray(enhancedData)
      ? enhancedData.map(item => ({ ...item, is_test_data: true }))
      : { ...enhancedData, is_test_data: true };
    return (supabase as any).from(tableName).insert(withTestFlag);
  }

  return (supabase as any).from(tableName).insert(enhancedData);
}

/**
 * Secure UPDATE operation
 * Automatically filters by organization_id
 */
export function secureUpdate(
  tableName: string,
  data: any,
  context: OrganizationContext | null | undefined,
  options?: SecureQueryOptions
) {
  validateContext(context);
  checkTestOrganization(context, options);

  const query = (supabase as any).from(tableName).update(data);

  // Auto-inject organization_id filter unless explicitly skipped
  if (!options?.skipIsolation) {
    return query.eq('organization_id', context.organizationId);
  }

  return query;
}

/**
 * Secure DELETE operation
 * Automatically filters by organization_id
 */
export function secureDelete(
  tableName: string,
  context: OrganizationContext | null | undefined,
  options?: SecureQueryOptions
) {
  validateContext(context);
  checkTestOrganization(context, options);

  const query = (supabase as any).from(tableName).delete();

  // Auto-inject organization_id filter unless explicitly skipped
  if (!options?.skipIsolation) {
    return query.eq('organization_id', context.organizationId);
  }

  return query;
}

/**
 * Secure RPC call with organization context validation
 */
export async function secureRpc(
  functionName: string,
  params: Record<string, any>,
  context: OrganizationContext | null | undefined,
  options?: SecureQueryOptions
) {
  validateContext(context);
  checkTestOrganization(context, options);

  // Inject organization_id into params if not explicitly skipped
  const enhancedParams = options?.skipIsolation
    ? params
    : { ...params, p_organization_id: context.organizationId };

  return (supabase.rpc as any)(functionName, enhancedParams);
}

/**
 * Checks if a query is attempting to access data from a different organization
 * Used for audit logging and security monitoring
 */
export async function auditCrossOrganizationAccess(
  attemptedOrgId: string,
  currentContext: OrganizationContext,
  tableName: string,
  operationType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
) {
  if (attemptedOrgId !== currentContext.organizationId) {
    console.error('[SECURITY] Cross-organization access attempt detected:', {
      attemptedOrgId,
      currentOrgId: currentContext.organizationId,
      tableName,
      operationType,
    });

    // Log to audit table
    await supabase.from('organization_access_audit').insert({
      attempted_organization_id: attemptedOrgId,
      user_organization_id: currentContext.organizationId,
      table_name: tableName,
      operation_type: operationType,
      access_type: 'cross_org_attempt',
      success: false,
      error_message: 'Attempted cross-organization data access',
    });

    toast({
      title: 'Security Warning',
      description: 'Attempted to access data from a different organization. This action has been blocked and logged.',
      variant: 'destructive',
    });

    return false;
  }
  return true;
}

/**
 * Type guard to check if data belongs to the current organization
 */
export function assertOrganizationOwnership<T extends { organization_id?: string }>(
  data: T | T[],
  context: OrganizationContext
): boolean {
  validateContext(context);

  const items = Array.isArray(data) ? data : [data];
  
  for (const item of items) {
    if (item.organization_id && item.organization_id !== context.organizationId) {
      throw new OrganizationContextError(
        `Data belongs to organization ${item.organization_id}, but current context is ${context.organizationId}`
      );
    }
  }

  return true;
}

/**
 * Wrapper for queries that explicitly allow supervisor cross-organization access
 * Should only be used in supervisor-specific components
 */
export function supervisorQuery(
  tableName: string,
  targetOrganizationId?: string
) {
  const query = (supabase as any).from(tableName).select();
  
  if (targetOrganizationId) {
    return query.eq('organization_id', targetOrganizationId);
  }
  
  return query;
}

/**
 * Hook helper to create organization context from useOrganizationContext
 */
export function createOrganizationContext(
  organizationId: string | undefined,
  isTestOrganization?: boolean,
  allocationModel?: string
): OrganizationContext | null {
  if (!organizationId) return null;

  return {
    organizationId,
    isTestOrganization,
    allocationModel,
  };
}
