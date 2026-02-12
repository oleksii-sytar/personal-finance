# DeleteAccountDialog Component

## Overview

The `DeleteAccountDialog` component provides a confirmation dialog for deleting accounts with built-in transaction checking. It implements all requirements from the Accounts Management specification (Requirements 4.1-4.5).

## Features

- ✅ **Transaction Check**: Automatically validates if account has transactions via server action
- ✅ **Error Prevention**: Displays clear error message when account has transactions
- ✅ **Confirmation Dialog**: Shows confirmation for accounts without transactions
- ✅ **Loading States**: Displays loading indicator during deletion
- ✅ **Executive Lounge Styling**: Uses glass effects and warm colors
- ✅ **Accessible**: Keyboard navigation and ARIA labels

## Usage

```tsx
import { DeleteAccountDialog } from '@/components/accounts'
import { deleteAccount } from '@/actions/accounts'

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const handleConfirm = async () => {
    if (!selectedAccount) return { success: false }
    
    const result = await deleteAccount(selectedAccount.id)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    setDialogOpen(false)
    return { success: true }
  }

  return (
    <>
      <Button onClick={() => {
        setSelectedAccount(account)
        setDialogOpen(true)
      }}>
        Delete Account
      </Button>

      <DeleteAccountDialog
        account={selectedAccount}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
      />
    </>
  )
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `account` | `Account \| null` | The account to delete |
| `open` | `boolean` | Whether the dialog is open |
| `onOpenChange` | `(open: boolean) => void` | Callback when dialog open state changes |
| `onConfirm` | `() => Promise<{ success: boolean; error?: string }>` | Callback to handle deletion |

## Behavior

1. **When opened**: Shows confirmation dialog
2. **On confirm**: Calls `onConfirm` callback which should call the server action
3. **If server action returns error**: Shows error dialog with the error message
4. **If successful**: Dialog closes via `onOpenChange(false)`

## Server Action Integration

The component expects the `onConfirm` callback to return a result object:

```typescript
{
  success: boolean
  error?: string  // Error message if deletion failed
}
```

The `deleteAccount` server action already implements transaction checking and returns appropriate errors.

## Demo

Run the demo to see all scenarios:

```bash
# View the demo file
src/components/accounts/__demo__/delete-account-dialog-demo.tsx
```

The demo shows:
- Account without transactions (successful deletion)
- Account with transactions (error message)
- Loading states
- Error handling
