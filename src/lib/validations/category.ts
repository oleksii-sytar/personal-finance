import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().max(10).optional(),
  type: z.enum(['income', 'expense']),
  workspace_id: z.string().uuid('Invalid workspace ID'),
  is_default: z.boolean().default(false),
})

export const createCategorySchema = categorySchema.omit({ 
  workspace_id: true 
})

export const updateCategorySchema = categorySchema.partial().omit({
  workspace_id: true,
  is_default: true, // Prevent changing default status through updates
})

export const mergeCategoriesSchema = z.object({
  fromCategoryId: z.string().uuid('Invalid source category ID'),
  toCategoryId: z.string().uuid('Invalid target category ID'),
})

export type CategoryInput = z.infer<typeof categorySchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type MergeCategoriesInput = z.infer<typeof mergeCategoriesSchema>