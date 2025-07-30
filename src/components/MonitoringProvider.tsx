import React from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { useEnhancedErrorTracking } from '@/hooks/useEnhancedErrorTracking';

interface MonitoringProviderProps {
  children: React.ReactNode;
}

export const MonitoringProvider = ({ children }: MonitoringProviderProps) => {
  // Initialize monitoring and analytics hooks
  usePerformanceMonitoring();
  useProductionAnalytics();
  useEnhancedErrorTracking();

  return <>{children}</>;
};