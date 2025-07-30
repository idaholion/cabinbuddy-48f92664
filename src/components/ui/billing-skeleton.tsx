import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
};

export const CardSkeleton = () => (
  <div className="rounded-lg border bg-card p-6 space-y-3">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

export const BillingUserSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
    <div className="flex items-center space-x-3 sm:space-x-4">
      <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
      <div className="text-right space-y-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  </div>
);

export const BillSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
    <div className="flex-1 min-w-0 space-y-3">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
    <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 sm:ml-4">
      <div className="text-right space-y-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  </div>
);

export const BillingDashboardSkeleton = () => (
  <div className="space-y-4 sm:space-y-6">
    {/* Summary Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>

    {/* User Balances Skeleton */}
    <div className="rounded-lg border bg-card">
      <div className="p-6 space-y-2">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="p-6 pt-0 space-y-3 sm:space-y-4">
        <BillingUserSkeleton />
        <BillingUserSkeleton />
        <BillingUserSkeleton />
        <BillingUserSkeleton />
      </div>
    </div>

    {/* Recent Bills Skeleton */}
    <div className="rounded-lg border bg-card">
      <div className="p-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="p-6 pt-0 space-y-3 sm:space-y-4">
        <BillSkeleton />
        <BillSkeleton />
      </div>
    </div>
  </div>
);