import {useState} from 'react'
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {Dialog} from '@/components/ui/dialog'
import {ToastProvider,useToast} from '@/components/ui/toast'
function Controls(){
 const toast=useToast(),[open,setOpen]=useState(false)
 return <><button onClick={()=>setOpen(true)}>Open form</button><button onClick={()=>toast.success('Saved')}>Success</button><button onClick={()=>toast.error('Не вдалося зберегти',{code:'42501',message:'permission denied for table finance_transactions'})}>Error</button>
 <Dialog open={open} onClose={()=>setOpen(false)} title="Form"><input aria-label="Draft" defaultValue="Keep me"/><button onClick={()=>toast.error('Не вдалося зберегти',new TypeError('Failed to fetch'))}>Fail inside form</button><button onClick={()=>setOpen(false)}>Close form</button></Dialog></>
}
afterEach(()=>vi.useRealTimers())
describe('Notifications above modals',()=>{
 it('moves alerts into the active dialog without losing the draft and back after closing',async()=>{
  render(<ToastProvider><Controls/></ToastProvider>)
  fireEvent.click(screen.getByText('Open form'));fireEvent.click(screen.getByText('Fail inside form'))
  const dialog=screen.getByRole('dialog')
  await waitFor(()=>expect(within(dialog).getByRole('alert')).toBeInTheDocument())
  expect(screen.getByLabelText('Draft')).toHaveValue('Keep me')
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Перевірте з’єднання')
  fireEvent.click(screen.getByText('Close form'))
  await waitFor(()=>expect(screen.getByRole('alert').closest('[data-dialog-root]')).toBeNull())
 })
 it('keeps errors until explicit dismissal and does not steal focus',()=>{
  vi.useFakeTimers();render(<ToastProvider><Controls/></ToastProvider>)
  const trigger=screen.getByText('Error');trigger.focus();fireEvent.click(trigger)
  act(()=>vi.advanceTimersByTime(60000))
  expect(screen.getByRole('alert')).toBeInTheDocument();expect(trigger).toHaveFocus()
  fireEvent.click(screen.getByLabelText('Закрити повідомлення'));expect(screen.queryByRole('alert')).not.toBeInTheDocument()
 })
 it('deduplicates repeated errors',()=>{
  render(<ToastProvider><Controls/></ToastProvider>);fireEvent.click(screen.getByText('Error'));fireEvent.click(screen.getByText('Error'));expect(screen.getAllByRole('alert')).toHaveLength(1)
 })
 it('pauses timed messages while reading',()=>{
  vi.useFakeTimers();render(<ToastProvider><Controls/></ToastProvider>);fireEvent.click(screen.getByText('Success'))
  act(()=>vi.advanceTimersByTime(2000));fireEvent.mouseEnter(screen.getByRole('status'));act(()=>vi.advanceTimersByTime(8000));expect(screen.getByRole('status')).toBeInTheDocument()
  fireEvent.mouseLeave(screen.getByRole('status'));act(()=>vi.advanceTimersByTime(3000));expect(screen.queryByRole('status')).not.toBeInTheDocument()
 })
 it('dismisses a focused toast with Escape without closing its dialog',async()=>{
  render(<ToastProvider><Controls/></ToastProvider>);fireEvent.click(screen.getByText('Open form'));fireEvent.click(screen.getByText('Fail inside form'))
  await waitFor(()=>expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeInTheDocument())
  fireEvent.keyDown(screen.getByLabelText('Закрити повідомлення'),{key:'Escape'})
  expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.queryByRole('alert')).not.toBeInTheDocument()
 })
})