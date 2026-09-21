'use client'
// Supabase already synchronizes sessions across tabs with BroadcastChannel.
// Do not rebroadcast SIGN_IN on mount: that causes endless cross-tab reloads.
export function AuthSyncManager(){return null}