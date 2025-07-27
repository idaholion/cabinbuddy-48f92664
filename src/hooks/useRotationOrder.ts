import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

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

  const fetchRotationOrder = async (year?: number) => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rotation_orders')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('rotation_year', year || new Date().getFullYear())
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching rotation order:', error);
        return;
      }
      
      // If no data for the requested year, try to find the base rotation data
      if (!data && year && year !== new Date().getFullYear()) {
        const { data: baseData, error: baseError } = await supabase
          .from('rotation_orders')
          .select('*')
          .eq('organization_id', organization.id)
          .order('rotation_year', { ascending: false })
          .limit(1)
          .single();
        
        if (baseError && baseError.code !== 'PGRST116') {
          console.error('Error fetching base rotation order:', baseError);
          return;
        }
        
        if (baseData) {
          setRotationData({
            ...baseData,
            rotation_order: Array.isArray(baseData.rotation_order) ? baseData.rotation_order.map(String) : []
          });
        }
      } else if (data) {
        setRotationData({
          ...data,
          rotation_order: Array.isArray(data.rotation_order) ? data.rotation_order.map(String) : []
        });
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
    refetchRotationOrder: fetchRotationOrder
  };
};