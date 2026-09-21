import { InMemoryRepository } from '@/lib/data/mock/in-memory-repository'
import { SupabaseRepository } from '@/lib/data/supabase-repository'
import { PREVIEW_NO_AUTH } from '@/lib/auth/preview'
import type { Repository } from '@/lib/data/repository'

let instance: Repository | null = null
export function getRepository(): Repository {
  if (!instance) instance = PREVIEW_NO_AUTH ? new InMemoryRepository() : new SupabaseRepository()
  return instance
}
export function resetRepository(): void { instance = null }
export type { Repository } from '@/lib/data/repository'