import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { secureSelect, createOrganizationContext } from "@/lib/secure-queries";

interface RotationOrderData {
  id: string;
  organization_id: string;
  rotation_year: number;
  rotation_order: string[];
  max_time_slots?: number;
  max_nights?: number;
  start_day?: string;
  start_time?: string;
  first_last_option?: string;
  start_month?: string;
  enable_secondary_selection?: boolean;
  secondary_max_periods?: number;
  secondary_selection_days?: number;
  selection_days?: number;
  enable_post_rotation_selection?: boolean;
  // Virtual weeks system configuration
  use_virtual_weeks_system?: boolean;
  total_nights_allowed_primary?: number;
  total_weeks_allowed_primary?: number;
  total_weeks_allowed_secondary?: number;
  min_nights_per_booking?: number;
  max_consecutive_nights_primary?: number;
  max_consecutive_nights_secondary?: number;
  post_rotation_min_nights?: number;
  post_rotation_max_consecutive_nights?: number | null;
  post_rotation_max_weeks?: number | null;
}

interface DatabaseRotationOrder {
  id: string;
  organization_id: string;
  rotation_year: number;
  rotation_order: any;
  max_time_slots?: number;
  max_nights?: number;
  start_day?: string;
  start_time?: string;
  first_last_option?: string;
  start_month?: string;
}

export const useRotationOrder = () => {
  const [rotationData, setRotationData] = useState<RotationOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();

  const calculateRotationForYear = (baseOrder: string[], startYear: number, targetYear: number, firstLastOption: string): string[] => {
    if (!baseOrder.length || targetYear < startYear) return baseOrder;
    
    const yearsDiff = targetYear - startYear;
    if (yearsDiff === 0) return baseOrder;
    
    let currentOrder = [...baseOrder];
    
    for (let i = 0; i < yearsDiff; i++) {
      if (firstLastOption === "first") {
        // Move first person to last position (1,2,3,4,5 → 2,3,4,5,1)
        const first = currentOrder.shift();
        if (first) currentOrder.push(first);
      } else {
        // Move last person to first position (1,2,3,4,5 → 5,1,2,3,4)
        const last = currentOrder.pop();
        if (last) currentOrder.unshift(last);
      }
    }
    
    return currentOrder;
  };

  const getRotationForYear = (year: number): string[] => {
    if (!rotationData) return [];
    
    return calculateRotationForYear(
      rotationData.rotation_order,
      rotationData.rotation_year,
      year,
      rotationData.first_last_option || "first"
    );
  };

  const getSelectionRotationYear = (): number => {
    if (!rotationData || !rotationData.start_month) {
      return new Date().getFullYear();
    }
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Parse rotation start month (e.g., "October" -> 9, zero-indexed)
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    const startMonthIndex = monthNames.findIndex(m => m === rotationData.start_month);
    
    // Create rotation start date for current year (use 1st of month for year calculation)
    const rotationStartThisYear = new Date(currentYear, startMonthIndex, 1);
    
    return today >= rotationStartThisYear ? currentYear + 1 : currentYear;
  };

  const isValidRotationOrder = (order: any): boolean => {
    if (!Array.isArray(order) || order.length === 0) return false;
    // Filter out mode markers
    const filtered = order.filter((item: string) => 
      item !== 'static_weeks_mode' && item !== 'manual_mode'
    );
    return filtered.length > 0;
  };

  const fetchRotationOrder = async (year?: number) => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const orgContext = createOrganizationContext(organization.id);
      const targetYear = year || new Date().getFullYear();
      
      const { data, error } = await secureSelect('rotation_orders', orgContext)
        .eq('rotation_year', targetYear)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching rotation order:', error);
        return;
      }
      
      // Check if data has valid rotation order (not mode markers)
      const hasValidData = data && isValidRotationOrder(data.rotation_order);
      
      if (hasValidData) {
        const filteredOrder = (data.rotation_order as string[]).filter(
          (item: string) => item !== 'static_weeks_mode' && item !== 'manual_mode'
        );
        setRotationData({
          ...data,
          rotation_order: filteredOrder.map(String)
        });
      } else {
        // No valid data - find most recent year with valid rotation data
        const { data: allYears, error: allError } = await secureSelect('rotation_orders', orgContext)
          .order('rotation_year', { ascending: false });
        
        if (allError) {
          console.error('Error fetching all rotation orders:', allError);
          return;
        }
        
        // Find the most recent year with valid rotation data
        const validBaseData = allYears?.find(row => isValidRotationOrder(row.rotation_order));
        
        if (validBaseData) {
          const baseOrder = (validBaseData.rotation_order as string[]).filter(
            (item: string) => item !== 'static_weeks_mode' && item !== 'manual_mode'
          );
          
          // Calculate rotated order for target year if it's after base year
          let finalOrder = baseOrder;
          if (targetYear > validBaseData.rotation_year) {
            finalOrder = calculateRotationForYear(
              baseOrder,
              validBaseData.rotation_year,
              targetYear,
              validBaseData.first_last_option || 'first'
            );
          }
          
          setRotationData({
            ...validBaseData,
            rotation_year: targetYear,
            rotation_order: finalOrder.map(String)
          });
        }
      }
    } catch (error) {
      console.error('Error fetching rotation order:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRotationOrder();
  }, [organization?.id]);

  return {
    rotationData,
    loading,
    getRotationForYear,
    calculateRotationForYear,
    getSelectionRotationYear,
    refetchRotationOrder: fetchRotationOrder
  };
};