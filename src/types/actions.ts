/**
 * Standard result type for Server Actions following code-quality.md guidelines
 */
export type ActionResult<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string | ZodFlattenedError }

/**
 * Zod flattened error type for better type safety
 */
export type ZodFlattenedError = {
  formErrors: string[]
  fieldErrors: Record<string, string[] | undefined>
}

/**
 * Error types for better error handling
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message)
    this.name = 'AuthorizationError'
  }
}