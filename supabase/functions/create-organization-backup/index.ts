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

    // Get organization ID from request or generate for all organizations
    const { organization_id, backup_type = 'scheduled' } = await req.json().catch(() => ({}));
    
    console.log(`Starting backup process for organization: ${organization_id || 'all organizations'}`);

    let organizationsToBackup: any[] = [];

    if (organization_id) {
      // Backup specific organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organization_id)
        .single();
      
      if (orgError || !org) {
        console.error('Organization not found:', orgError);
        return new Response(
          JSON.stringify({ error: 'Organization not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      organizationsToBackup = [org];
    } else {
      // Backup all organizations (for scheduled backups)
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*');
      
      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch organizations' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      organizationsToBackup = orgs || [];
    }

    const backupResults = [];

    for (const org of organizationsToBackup) {
      try {
        console.log(`Creating backup for organization: ${org.name} (${org.id})`);

        // Fetch all organization data
        const backupData: BackupData = {
          metadata: {
            organization_id: org.id,
            organization_name: org.name,
            backup_date: new Date().toISOString(),
            backup_type: backup_type
          },
          data: {
            organizations: [org],
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

        // Fetch all related data for this organization
        const tables = [
          'family_groups',
          'reservations', 
          'receipts',
          'rotation_orders',
          'time_period_usage',
          'reservation_settings',
          'recurring_bills',
          'checkin_sessions',
          'survey_responses',
          'notification_log'
        ];

        for (const table of tables) {
          const { data } = await supabase
            .from(table)
            .select('*')
            .eq('organization_id', org.id);
          
          if (data) {
            backupData.data[table as keyof typeof backupData.data] = data;
          }
        }

        // Get user profiles for this organization
        const { data: userOrgs } = await supabase
          .from('user_organizations')
          .select('user_id')
          .eq('organization_id', org.id);

        if (userOrgs && userOrgs.length > 0) {
          const userIds = userOrgs.map(uo => uo.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in('user_id', userIds);
          
          if (profiles) {
            backupData.data.profiles = profiles;
          }
        }

        // Create backup file name
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${org.id}/${org.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup_${timestamp}.json`;

        // Convert to JSON string
        const backupJson = JSON.stringify(backupData, null, 2);
        const fileSize = new Blob([backupJson]).size;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('organization-backups')
          .upload(fileName, backupJson, {
            contentType: 'application/json',
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload backup for ${org.name}:`, uploadError);
          continue;
        }

        // Create backup metadata record
        const { error: metadataError } = await supabase
          .from('backup_metadata')
          .insert({
            organization_id: org.id,
            backup_type: backup_type,
            file_path: fileName,
            file_size: fileSize,
            status: 'completed'
          });

        if (metadataError) {
          console.error(`Failed to create metadata for ${org.name}:`, metadataError);
        }

        // Clean up old backups (keep only 3 most recent)
        const { data: oldBackups } = await supabase
          .from('backup_metadata')
          .select('id, file_path')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false })
          .range(3, 100); // Skip first 3, get the rest

        if (oldBackups && oldBackups.length > 0) {
          for (const oldBackup of oldBackups) {
            // Delete from storage
            await supabase.storage
              .from('organization-backups')
              .remove([oldBackup.file_path]);
            
            // Delete metadata record
            await supabase
              .from('backup_metadata')
              .delete()
              .eq('id', oldBackup.id);
          }
          console.log(`Cleaned up ${oldBackups.length} old backups for ${org.name}`);
        }

        backupResults.push({
          organization_id: org.id,
          organization_name: org.name,
          status: 'success',
          file_path: fileName,
          file_size: fileSize
        });

        console.log(`Backup completed for ${org.name}: ${fileName}`);

      } catch (error) {
        console.error(`Error creating backup for ${org.name}:`, error);
        backupResults.push({
          organization_id: org.id,
          organization_name: org.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        backups_created: backupResults.filter(r => r.status === 'success').length,
        results: backupResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Backup function error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
