# Forma - Issue Resolution & Lessons Learned

## Overview

This document captures recurring issues, their solutions, and patterns to avoid. **When you encounter an issue more than once, document it here.** This prevents the team (and AI) from making the same mistakes repeatedly.

## How to Use This Document

1. **When you encounter an issue**: Check here first for known solutions
2. **After solving a new recurring issue**: Add it to this document
3. **During code review**: Reference this for common pitfalls
4. **Before implementing features**: Review relevant sections

---

## Supabase Issues

### Issue: RLS Policy Blocking Access
**Symptom**: Query returns empty results or "permission denied" error despite data existing.

**Solution**:
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Common fix: Ensure policy includes the user
CREATE POLICY "Users can view own data" ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Prevention**: Always test RLS policies in Supabase Studio before deploying.

---

### Issue: Migration Fails on Production
**Symptom**: `supabase db push` fails with constraint or dependency errors.

**Solution**:
1. Run with dry-run first: `supabase db push --dry-run`
2. Check for data that violates new constraints
3. Create data migration before schema migration if needed

**Prevention**:
```sql
-- Always make new columns nullable or provide defaults
ALTER TABLE transactions ADD COLUMN new_field TEXT DEFAULT '';

-- Add constraints in a separate migration after data is fixed
ALTER TABLE transactions ALTER COLUMN new_field SET NOT NULL;
```

---

### Issue: Realtime Subscription Not Updating
**Symptom**: Changes in database don't trigger realtime updates.

**Solution**:
1. Verify realtime is enabled for the table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
   ```
2. Check RLS allows SELECT for the subscription user
3. Ensure the channel is subscribed correctly:
   ```typescript
   const channel = supabase
     .channel('transactions')
     .on('postgres_changes', 
       { event: '*', schema: 'public', table: 'transactions' },
       (payload) => console.log(payload)
     )
     .subscribe()
   ```

**Prevention**: Test realtime in development before deploying.

---

### Issue: Supabase Auth Session Lost on Refresh
**Symptom**: User is logged out after page refresh.

**Solution**:
```typescript
// Ensure you're using the correct client
// For Server Components:
import { createClient } from '@/lib/supabase/server'

// For Client Components:
import { createClient } from '@/lib/supabase/client'

// Make sure middleware is handling auth:
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(/* config */)
  await supabase.auth.getSession() // Refreshes token if needed
  return response
}
```

---

## Next.js Issues

### Issue: Hydration Mismatch
**Symptom**: "Text content does not match server-rendered HTML" error.

**Solution**:
1. Check for browser-only values (window, localStorage, Date):
   ```typescript
   // ❌ Bad - different on server vs client
   const time = new Date().toLocaleTimeString()
   
   // ✅ Good - use useEffect for client-only values
   const [time, setTime] = useState<string>()
   useEffect(() => {
     setTime(new Date().toLocaleTimeString())
   }, [])
   ```

2. Ensure consistent rendering:
   ```typescript
   // Use suppressHydrationWarning for intentional differences
   <time suppressHydrationWarning>{time}</time>
   ```

---

### Issue: Server Action Returns Redirect Error
**Symptom**: `redirect()` doesn't work in try/catch blocks.

**Solution**:
```typescript
// redirect() throws an error intentionally - don't catch it
export async function createTransaction(formData: FormData) {
  try {
    // ... create transaction
  } catch (error) {
    // Only catch specific errors
    if (error instanceof ValidationError) {
      return { error: error.message }
    }
    throw error // Re-throw redirect and other errors
  }
  
  redirect('/transactions') // This throws, must be outside try/catch
}
```

---

### Issue: "useEffect Dependency Array" Warning
**Symptom**: ESLint warns about missing dependencies in useEffect.

**Solution**:
```typescript
// Option 1: Add the dependency (usually correct)
useEffect(() => {
  fetchData(userId)
}, [userId])

// Option 2: Use useCallback for stable function reference
const fetchData = useCallback(() => {
  // ...
}, [userId])

useEffect(() => {
  fetchData()
}, [fetchData])

// Option 3: If you truly only want to run once, document why
useEffect(() => {
  initializeOnce()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // Intentionally empty - initialization should only run once
```

---

## Tailwind CSS Issues

### Issue: Styles Not Applying
**Symptom**: Tailwind classes don't work for dynamically generated class names.

**Solution**:
```typescript
// ❌ Bad - Tailwind can't detect dynamic classes
const color = isError ? 'red' : 'green'
<div className={`text-${color}-500`} />

// ✅ Good - Use complete class names
<div className={isError ? 'text-red-500' : 'text-green-500'} />

// ✅ Good - Or add to safelist in tailwind.config.ts
safelist: ['text-red-500', 'text-green-500']
```

---

### Issue: Custom Colors Not Working
**Symptom**: Custom theme colors defined in config don't apply.

**Solution**:
```typescript
// tailwind.config.ts - extend, don't replace
export default {
  theme: {
    extend: { // ← Important: use extend
      colors: {
        'peat-charcoal': '#1C1917',
        'deep-leather': '#2A1D15',
      }
    }
  }
}
```

---

## TypeScript Issues

### Issue: Type Import Causing Bundle Size Increase
**Symptom**: Types are being included in runtime bundle.

**Solution**:
```typescript
// ❌ Bad - imports the value and type
import { Transaction } from '@/types'

// ✅ Good - only imports the type (removed at compile time)
import type { Transaction } from '@/types'
```

---

### Issue: Generic Type Inference Failing
**Symptom**: TypeScript can't infer types in generic functions.

**Solution**:
```typescript
// Provide explicit type parameter when inference fails
const result = useQuery<Transaction[]>({
  queryKey: ['transactions'],
  queryFn: fetchTransactions,
})

// Or add type to the result variable
const result: UseQueryResult<Transaction[]> = useQuery({
  queryKey: ['transactions'],
  queryFn: fetchTransactions,
})
```

---

## NBU API Issues

### Issue: Exchange Rate Not Found for Date
**Symptom**: API returns empty result for specific date.

**Solution**:
```typescript
// NBU doesn't have rates for weekends/holidays
// Fall back to the previous business day
async function getExchangeRate(currency: string, date: Date) {
  let attempts = 0
  let currentDate = date
  
  while (attempts < 5) {
    const rate = await fetchRate(currency, currentDate)
    if (rate) return rate
    
    // Try previous day
    currentDate = subDays(currentDate, 1)
    attempts++
  }
  
  throw new Error('Unable to find exchange rate')
}
```

---

### Issue: NBU API Timeout
**Symptom**: Request takes too long or times out.

**Solution**:
```typescript
// Add timeout and retry logic
async function fetchNBURate(currency: string, date: Date) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal 
    })
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      // Use cached rate
      return getCachedRate(currency, date)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
```

---

## Common Patterns to Avoid

### Pattern: Fetching Data in Components (Instead of Server)
**Problem**: Unnecessary client-side loading states, slower initial load.
**Solution**: Use Server Components for initial data fetch.

### Pattern: Not Handling Loading States
**Problem**: Users see broken UI while data loads.
**Solution**: Always provide Suspense boundaries and skeleton components.

### Pattern: Hardcoding User ID
**Problem**: Security risk and breaks with multiple users.
**Solution**: Always get user ID from auth context.

### Pattern: Not Validating Server-Side
**Problem**: Client-side validation can be bypassed.
**Solution**: Always validate in Server Actions with Zod.

### Pattern: Mixing Concerns in Components
**Problem**: Components become hard to test and maintain.
**Solution**: Separate data fetching, business logic, and presentation.

---

## Adding New Issues

When adding a new issue to this document, include:

1. **Clear title** describing the issue
2. **Symptom** - what the developer observes
3. **Root cause** (if known)
4. **Solution** - step-by-step fix with code examples
5. **Prevention** - how to avoid this in the future

### Template
```markdown
### Issue: [Descriptive Title]
**Symptom**: [What you observe]

**Root Cause**: [Why this happens]

**Solution**:
\`\`\`typescript
// Code example showing the fix
\`\`\`

**Prevention**: [How to avoid this in the future]

---
```
