// Public production configuration. Keys are publishable and protected by RLS.
// A local integration test must opt in explicitly; production cannot use it.
const localTestUrl = process.env.NODE_ENV === 'development'
  ? process.env.NEXT_PUBLIC_FORMA_TEST_SUPABASE_URL
  : undefined
const localTestKey = process.env.NEXT_PUBLIC_FORMA_TEST_SUPABASE_KEY
if (localTestUrl && (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(localTestUrl) || !localTestKey)) {
  throw new Error('Local Forma tests require a loopback Supabase URL and a test key')
}
export const SUPABASE_URL = localTestUrl || 'https://tamvhrnbdrojiooasafx.supabase.co'
export const SUPABASE_PUBLIC_KEY = localTestUrl
  ? localTestKey!
  : 'sb_publishable_ld78hgyBiy2rti1vgJ5BqQ_nZ7X84Zj'
