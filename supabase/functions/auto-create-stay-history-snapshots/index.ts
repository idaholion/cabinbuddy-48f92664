import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrganizationSettings {
  id: string;
  name: string;
  stay_history_snapshot_frequency: string;
  stay_history_snapshot_retention: number;
}

// Calculate if a snapshot is due based on frequency and last snapshot date
function isSnapshotDue(frequency: string, lastSnapshotDate: Date | null): boolean {
  if (!lastSnapshotDate) return true; // No previous snapshot, always create one
  
  const now = new Date();
  const hoursSinceLastSnapshot = (now.getTime() - lastSnapshotDate.getTime()) / (1000 * 60 * 60);
  
  switch (frequency) {
    case 'daily':
      return hoursSinceLastSnapshot >= 23; // Allow 1 hour tolerance
    case 'weekly':
      return hoursSinceLastSnapshot >= 167; // 7 days - 1 hour tolerance
    case 'biweekly':
      return hoursSinceLastSnapshot >= 335; // 14 days - 1 hour tolerance
    case 'monthly':
      // Check if it's been at least 28 days
      return hoursSinceLastSnapshot >= 671; // 28 days - 1 hour tolerance
    default:
      return false;
  }
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

    console.log('Starting automatic stay history snapshot job...');

    // Get all organizations with auto-snapshots enabled
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, stay_history_snapshot_frequency, stay_history_snapshot_retention')
      .neq('stay_history_snapshot_frequency', 'off')
      .not('stay_history_snapshot_frequency', 'is', null);

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      throw orgError;
    }

    if (!organizations || organizations.length === 0) {
      console.log('No organizations with auto-snapshots enabled');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No organizations with auto-snapshots enabled',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${organizations.length} organizations with auto-snapshots enabled`);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const results: { org_id: string; org_name: string; years_processed: number[]; snapshots_created: number; snapshots_cleaned: number }[] = [];

    for (const org of organizations as OrganizationSettings[]) {
      console.log(`Processing organization: ${org.name} (${org.id}), frequency: ${org.stay_history_snapshot_frequency}`);
      
      // Determine which years to process
      // Current year always, plus previous year if we're in Jan or Feb (for year-end cleanup)
      const yearsToProcess = [currentYear];
      if (currentMonth <= 2) {
        yearsToProcess.push(currentYear - 1);
      }

      let snapshotsCreated = 0;
      let snapshotsCleaned = 0;

      for (const year of yearsToProcess) {
        // Check the last AUTO snapshot for this year
        const { data: lastSnapshot, error: snapshotError } = await supabase
          .from('backup_metadata')
          .select('created_at')
          .eq('organization_id', org.id)
          .eq('backup_type', `stay_history_${year}`)
          .eq('snapshot_source', 'auto')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastSnapshotDate = lastSnapshot ? new Date(lastSnapshot.created_at) : null;
        
        // Check if a new snapshot is due
        if (isSnapshotDue(org.stay_history_snapshot_frequency, lastSnapshotDate)) {
          console.log(`Creating auto snapshot for ${org.name}, year ${year}`);
          
          // Call the create-stay-history-snapshot function
          const { data: snapshotResult, error: createError } = await supabase.functions.invoke('create-stay-history-snapshot', {
            body: {
              organization_id: org.id,
              season_year: year,
              snapshot_type: 'auto',
              snapshot_source: 'auto'
            }
          });

          if (createError) {
            console.error(`Error creating snapshot for ${org.name}, year ${year}:`, createError);
          } else {
            console.log(`Auto snapshot created for ${org.name}, year ${year}`);
            snapshotsCreated++;
          }
        } else {
          console.log(`Snapshot not due yet for ${org.name}, year ${year} (last: ${lastSnapshotDate?.toISOString()})`);
        }

        // Cleanup old AUTO snapshots beyond retention limit
        // IMPORTANT: Only delete AUTO snapshots, never MANUAL ones
        const retention = org.stay_history_snapshot_retention || 4;
        
        const { data: autoSnapshots, error: listError } = await supabase
          .from('backup_metadata')
          .select('id, file_path, created_at')
          .eq('organization_id', org.id)
          .eq('backup_type', `stay_history_${year}`)
          .eq('snapshot_source', 'auto')
          .order('created_at', { ascending: false });

        if (!listError && autoSnapshots && autoSnapshots.length > retention) {
          // Delete snapshots beyond retention limit
          const snapshotsToDelete = autoSnapshots.slice(retention);
          console.log(`Cleaning up ${snapshotsToDelete.length} old auto snapshots for ${org.name}, year ${year}`);
          
          for (const snapshot of snapshotsToDelete) {
            // Delete from storage
            const { error: storageError } = await supabase.storage
              .from('organization-backups')
              .remove([snapshot.file_path]);
            
            if (storageError) {
              console.error(`Error deleting snapshot file ${snapshot.file_path}:`, storageError);
              continue;
            }

            // Delete metadata
            const { error: deleteError } = await supabase
              .from('backup_metadata')
              .delete()
              .eq('id', snapshot.id);

            if (deleteError) {
              console.error(`Error deleting snapshot metadata ${snapshot.id}:`, deleteError);
            } else {
              snapshotsCleaned++;
            }
          }
        }
      }

      results.push({
        org_id: org.id,
        org_name: org.name,
        years_processed: yearsToProcess,
        snapshots_created: snapshotsCreated,
        snapshots_cleaned: snapshotsCleaned
      });
    }

    const totalCreated = results.reduce((sum, r) => sum + r.snapshots_created, 0);
    const totalCleaned = results.reduce((sum, r) => sum + r.snapshots_cleaned, 0);

    console.log(`Auto snapshot job complete. Created: ${totalCreated}, Cleaned: ${totalCleaned}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: organizations.length,
        snapshots_created: totalCreated,
        snapshots_cleaned: totalCleaned,
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto snapshot job error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
