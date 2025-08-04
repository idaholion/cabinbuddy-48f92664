import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupData {
  metadata: {
    organization_id: string;
    organization_name: string;
    backup_date: string;
    backup_type: string;
  };
  data: {
    organizations: any[];
    family_groups: any[];
    reservations: any[];
    receipts: any[];
    rotation_orders: any[];
    time_period_usage: any[];
    reservation_settings: any[];
    recurring_bills: any[];
    checkin_sessions: any[];
    survey_responses: any[];
    notification_log: any[];
    profiles: any[];
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { backup_file_path, confirm_restore } = await req.json();
    
    if (!backup_file_path) {
      return new Response(
        JSON.stringify({ error: 'backup_file_path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting restore process for backup: ${backup_file_path}`);

    // Download the backup file
    const { data: backupFile, error: downloadError } = await supabase.storage
      .from('organization-backups')
      .download(backup_file_path);

    if (downloadError) {
      console.error('Error downloading backup file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download backup file' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the backup data
    const backupText = await backupFile.text();
    const backupData: BackupData = JSON.parse(backupText);
    const orgId = backupData.metadata.organization_id;

    console.log(`Parsed backup for organization: ${backupData.metadata.organization_name}`);

    if (!confirm_restore) {
      // Return preview of what will be restored
      const preview = {
        organization: backupData.metadata.organization_name,
        backup_date: backupData.metadata.backup_date,
        backup_type: backupData.metadata.backup_type,
        data_summary: {
          family_groups: backupData.data.family_groups?.length || 0,
          reservations: backupData.data.reservations?.length || 0,
          receipts: backupData.data.receipts?.length || 0,
          rotation_orders: backupData.data.rotation_orders?.length || 0,
          time_period_usage: backupData.data.time_period_usage?.length || 0,
          reservation_settings: backupData.data.reservation_settings?.length || 0,
          recurring_bills: backupData.data.recurring_bills?.length || 0,
          checkin_sessions: backupData.data.checkin_sessions?.length || 0,
          survey_responses: backupData.data.survey_responses?.length || 0,
          profiles: backupData.data.profiles?.length || 0
        }
      };

      return new Response(
        JSON.stringify({ 
          preview: true,
          data: preview,
          message: 'This is a preview. Call again with confirm_restore: true to proceed.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create current backup before restore
    console.log('Creating backup of current state before restore...');
    const currentBackupName = `${orgId}/pre_restore_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    // Get current organization data for backup
    const currentBackupData: BackupData = {
      metadata: {
        organization_id: orgId,
        organization_name: backupData.metadata.organization_name,
        backup_date: new Date().toISOString(),
        backup_type: 'pre_restore'
      },
      data: {
        organizations: [],
        family_groups: [],
        reservations: [],
        receipts: [],
        rotation_orders: [],
        time_period_usage: [],
        reservation_settings: [],
        recurring_bills: [],
        checkin_sessions: [],
        survey_responses: [],
        notification_log: [],
        profiles: []
      }
    };

    // Fetch current data
    const tables = [
      'family_groups', 'reservations', 'receipts', 'rotation_orders',
      'time_period_usage', 'reservation_settings', 'recurring_bills',
      'checkin_sessions', 'survey_responses', 'notification_log'
    ];

    for (const table of tables) {
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('organization_id', orgId);
      
      if (data) {
        currentBackupData.data[table as keyof typeof currentBackupData.data] = data;
      }
    }

    // Save current backup
    await supabase.storage
      .from('organization-backups')
      .upload(currentBackupName, JSON.stringify(currentBackupData, null, 2));

    // Now perform the restore
    console.log('Starting data restoration...');

    // Delete current data (in reverse order of dependencies)
    const deleteOrder = [
      'survey_responses', 'checkin_sessions', 'notification_log',
      'time_period_usage', 'receipts', 'reservations', 'recurring_bills',
      'reservation_settings', 'rotation_orders', 'family_groups'
    ];

    for (const table of deleteOrder) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', orgId);
      
      if (error) {
        console.error(`Error deleting from ${table}:`, error);
      }
    }

    // Restore data from backup
    let restoredCounts: Record<string, number> = {};

    for (const table of tables) {
      const tableData = backupData.data[table as keyof typeof backupData.data];
      if (tableData && Array.isArray(tableData) && tableData.length > 0) {
        const { error } = await supabase
          .from(table)
          .insert(tableData);
        
        if (error) {
          console.error(`Error restoring ${table}:`, error);
        } else {
          restoredCounts[table] = tableData.length;
          console.log(`Restored ${tableData.length} records to ${table}`);
        }
      }
    }

    // Create restore metadata record
    await supabase
      .from('backup_metadata')
      .insert({
        organization_id: orgId,
        backup_type: 'restore_operation',
        file_path: backup_file_path,
        status: 'completed'
      });

    console.log('Restore completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Data restored successfully',
        restored_from: {
          backup_date: backupData.metadata.backup_date,
          backup_type: backupData.metadata.backup_type
        },
        restored_counts: restoredCounts,
        pre_restore_backup: currentBackupName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Restore function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});