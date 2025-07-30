import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupervisor } from "@/hooks/useSupervisor";
import { supabase } from "@/integrations/supabase/client";

interface BulkOperationOptions {
  operationType: string;
  organizationId: string;
  organizationName: string;
  estimatedRecords: number;
  onConfirm: () => Promise<void>;
}

export const useBulkOperationProtection = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<BulkOperationOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isSupervisor } = useSupervisor();

  const requestBulkOperation = (options: BulkOperationOptions) => {
    if (!isSupervisor) {
      toast({
        title: "Access Denied",
        description: "Bulk operations require supervisor privileges.",
        variant: "destructive",
      });
      return;
    }

    setCurrentOperation(options);
    setIsDialogOpen(true);
  };

  const executeBulkOperation = async () => {
    if (!currentOperation) return;

    setLoading(true);
    try {
      // First, verify supervisor status and get confirmation
      const { data, error } = await supabase.rpc('supervisor_bulk_update_family_groups', {
        p_organization_id: currentOperation.organizationId,
        p_confirmation_code: 'CONFIRM_BULK_UPDATE'
      });

      if (error) {
        throw error;
      }

      // Log the operation attempt
      await supabase.from('bulk_operation_audit').insert({
        operation_type: currentOperation.operationType,
        organization_id: currentOperation.organizationId,
        performed_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        details: {
          organization_name: currentOperation.organizationName,
          estimated_records: currentOperation.estimatedRecords
        },
        records_affected: currentOperation.estimatedRecords
      });

      // Execute the actual operation
      await currentOperation.onConfirm();

      toast({
        title: "Bulk Operation Completed",
        description: `Successfully executed ${currentOperation.operationType} affecting ${currentOperation.estimatedRecords} records.`,
      });

      setIsDialogOpen(false);
      setCurrentOperation(null);
    } catch (error: any) {
      console.error('Bulk operation failed:', error);
      
      // Log the failed attempt
      await supabase.from('bulk_operation_audit').insert({
        operation_type: `FAILED_${currentOperation.operationType}`,
        organization_id: currentOperation.organizationId,
        performed_by_user_id: (await supabase.auth.getUser()).data.user?.id,
        details: {
          organization_name: currentOperation.organizationName,
          error_message: error.message,
          estimated_records: currentOperation.estimatedRecords
        },
        records_affected: 0
      });

      toast({
        title: "Bulk Operation Failed",
        description: error.message || "An unexpected error occurred during the bulk operation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelOperation = () => {
    setIsDialogOpen(false);
    setCurrentOperation(null);
    setLoading(false);
  };

  return {
    requestBulkOperation,
    executeBulkOperation,
    cancelOperation,
    isDialogOpen,
    currentOperation,
    loading,
    isSupervisor,
  };
};