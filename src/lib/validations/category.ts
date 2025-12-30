import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  icon: z.string().min(1, 'Icon is required'),
  type: z.enum(['income', 'expense']),
  workspace_id: z.string().uuid('Invalid workspace ID'),
})

export const createCategorySchema = categorySchema.omit({ 
  workspace_id: true 
})

export const updateCategorySchema = categorySchema.partial()

export type CategoryInput = z.infer<typeof categorySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>