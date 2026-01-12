import { z } from 'zod'

// Simplified checkpoint schema matching the new database structure
export const checkpointSchema = z.object({
  id: z.string().uuid('Invalid checkpoint ID'),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  account_id: z.string().uuid('Invalid account ID'),
  date: z.coerce.date(),
  actual_balance: z.number(),
  expected_balance: z.number(),
  gap: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
})

// Schema for creating checkpoints (omits server-managed fields)
export const createCheckpointSchema = checkpointSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// Schema for updating checkpoints
export const updateCheckpointSchema = createCheckpointSchema.partial()

// Schema for checkpoint input from user (simplified)
export const checkpointInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID'),
  date: z.coerce.date(),
  actual_balance: z.number(),
  workspace_id: z.string().uuid('Invalid workspace ID'),
})

// Type exports
export type CheckpointInput = z.infer<typeof checkpointSchema>
export type CreateCheckpointInput = z.infer<typeof createCheckpointSchema>
export type UpdateCheckpointInput = z.infer<typeof updateCheckpointSchema>
export type CheckpointUserInput = z.infer<typeof checkpointInputSchema>