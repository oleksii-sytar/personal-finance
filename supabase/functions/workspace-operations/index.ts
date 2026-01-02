import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WorkspaceOperationRequest {
  operation: 'get_members' | 'get_invitations' | 'create_invitation'
  workspace_id: string
  email?: string // for create_invitation
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { operation, workspace_id, email }: WorkspaceOperationRequest = await req.json()

    // Verify user is a member of the workspace
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Access denied: Not a member of this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (operation) {
      case 'get_members': {
        // Get all workspace members first
        const { data: members, error: membersError } = await supabaseAdmin
          .from('workspace_members')
          .select(`
            id,
            user_id,
            workspace_id,
            role,
            joined_at
          `)
          .eq('workspace_id', workspace_id)

        if (membersError) {
          console.error('Members query error:', membersError)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch members' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!members || members.length === 0) {
          return new Response(
            JSON.stringify({ data: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user profiles for all members
        const userIds = members.map(m => m.user_id)
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .in('id', userIds)

        if (profilesError) {
          console.error('Profiles query error:', profilesError)
          return new Response(
            JSON.stringify({ error: 'Failed to fetch member profiles' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Combine members with their profiles
        const membersWithProfiles = members.map(member => ({
          ...member,
          user_profiles: profiles?.find(p => p.id === member.user_id) || null
        }))

        return new Response(
          JSON.stringify({ data: membersWithProfiles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_invitations': {
        // Only owners can view invitations
        if (membership.role !== 'owner') {
          return new Response(
            JSON.stringify({ error: 'Only workspace owners can view invitations' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: invitations, error: invitationsError } = await supabaseAdmin
          .from('workspace_invitations')
          .select('*')
          .eq('workspace_id', workspace_id)
          .is('accepted_at', null)

        if (invitationsError) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch invitations' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ data: invitations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_invitation': {
        // Only owners can create invitations
        if (membership.role !== 'owner') {
          return new Response(
            JSON.stringify({ error: 'Only workspace owners can create invitations' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Generate invitation token
        const token = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

        const { data: invitation, error: invitationError } = await supabaseAdmin
          .from('workspace_invitations')
          .insert({
            workspace_id,
            email: email.toLowerCase().trim(),
            invited_by: user.id,
            token,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single()

        if (invitationError) {
          if (invitationError.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'User is already invited to this workspace' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          return new Response(
            JSON.stringify({ error: 'Failed to create invitation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ data: invitation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})