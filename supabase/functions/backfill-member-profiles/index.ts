import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Starting member profile backfill...');

    // Get all family groups with their members
    const { data: familyGroups, error: groupsError } = await supabase
      .from('family_groups')
      .select('id, name, organization_id, lead_name, lead_email, lead_phone, host_members');

    if (groupsError) throw groupsError;

    // Get all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    // Get existing profile claims
    const { data: existingClaims, error: claimsError } = await supabase
      .from('member_profile_links')
      .select('claimed_by_user_id, organization_id, family_group_name, member_name');

    if (claimsError) throw claimsError;

    const results = {
      processed: 0,
      claimed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const group of familyGroups || []) {
      // Process group lead
      if (group.lead_email) {
        const user = users.find(u => u.email?.toLowerCase() === group.lead_email?.toLowerCase());
        
        if (user) {
          const alreadyClaimed = existingClaims?.some(
            c => c.claimed_by_user_id === user.id && 
                 c.organization_id === group.organization_id &&
                 c.family_group_name === group.name
          );

          if (!alreadyClaimed && group.lead_name) {
            try {
              console.log(`📝 Processing group lead: ${group.lead_name} (${group.lead_email})`);
              
              const nameParts = group.lead_name.split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.slice(1).join(' ') || '';

              // Create/update profile
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  user_id: user.id,
                  organization_id: group.organization_id,
                  first_name: firstName,
                  last_name: lastName,
                  display_name: group.lead_name,
                  family_group: group.name,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,organization_id' });

              if (profileError) throw profileError;

              // Create profile claim
              const { error: claimError } = await supabase
                .from('member_profile_links')
                .insert({
                  organization_id: group.organization_id,
                  family_group_name: group.name,
                  member_name: group.lead_name,
                  member_type: 'group_lead',
                  claimed_by_user_id: user.id,
                  claimed_at: new Date().toISOString()
                });

              if (claimError) throw claimError;

              results.claimed++;
              results.details.push({
                type: 'group_lead',
                name: group.lead_name,
                email: group.lead_email,
                familyGroup: group.name,
                status: 'claimed'
              });
              console.log(`✅ Claimed profile for group lead: ${group.lead_name}`);
            } catch (error) {
              results.errors++;
              results.details.push({
                type: 'group_lead',
                name: group.lead_name,
                email: group.lead_email,
                familyGroup: group.name,
                status: 'error',
                error: error.message
              });
              console.error(`❌ Error claiming profile for ${group.lead_name}:`, error);
            }
          } else if (alreadyClaimed) {
            results.skipped++;
            results.details.push({
              type: 'group_lead',
              name: group.lead_name,
              email: group.lead_email,
              familyGroup: group.name,
              status: 'already_claimed'
            });
          }
          results.processed++;
        }
      }

      // Process host members
      if (group.host_members && Array.isArray(group.host_members)) {
        for (const member of group.host_members) {
          if (member.email) {
            const user = users.find(u => u.email?.toLowerCase() === member.email?.toLowerCase());
            
            if (user) {
              const alreadyClaimed = existingClaims?.some(
                c => c.claimed_by_user_id === user.id && 
                     c.organization_id === group.organization_id &&
                     c.family_group_name === group.name
              );

              if (!alreadyClaimed && member.name) {
                try {
                  console.log(`📝 Processing member: ${member.name} (${member.email})`);
                  
                  const firstName = member.firstName || member.name.split(' ')[0] || '';
                  const lastName = member.lastName || member.name.split(' ').slice(1).join(' ') || '';

                  // Create/update profile
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                      user_id: user.id,
                      organization_id: group.organization_id,
                      first_name: firstName,
                      last_name: lastName,
                      display_name: member.name,
                      family_group: group.name,
                      updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id,organization_id' });

                  if (profileError) throw profileError;

                  // Create profile claim
                  const { error: claimError } = await supabase
                    .from('member_profile_links')
                    .insert({
                      organization_id: group.organization_id,
                      family_group_name: group.name,
                      member_name: member.name,
                      member_type: 'host_member',
                      claimed_by_user_id: user.id,
                      claimed_at: new Date().toISOString()
                    });

                  if (claimError) throw claimError;

                  results.claimed++;
                  results.details.push({
                    type: 'host_member',
                    name: member.name,
                    email: member.email,
                    familyGroup: group.name,
                    status: 'claimed'
                  });
                  console.log(`✅ Claimed profile for member: ${member.name}`);
                } catch (error) {
                  results.errors++;
                  results.details.push({
                    type: 'host_member',
                    name: member.name,
                    email: member.email,
                    familyGroup: group.name,
                    status: 'error',
                    error: error.message
                  });
                  console.error(`❌ Error claiming profile for ${member.name}:`, error);
                }
              } else if (alreadyClaimed) {
                results.skipped++;
                results.details.push({
                  type: 'host_member',
                  name: member.name,
                  email: member.email,
                  familyGroup: group.name,
                  status: 'already_claimed'
                });
              }
              results.processed++;
            }
          }
        }
      }
    }

    console.log('✅ Backfill complete:', results);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        processed: results.processed,
        claimed: results.claimed,
        skipped: results.skipped,
        errors: results.errors
      },
      details: results.details
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Backfill error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
