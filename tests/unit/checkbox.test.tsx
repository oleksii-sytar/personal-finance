import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
import {Checkbox} from '@/components/ui/checkbox'
describe('Checkbox',()=>{
 it('keeps a labelled native input and toggles through its label',()=>{
  const onChange=vi.fn()
  render(<Checkbox checked={false} onChange={onChange}>Обрати операцію</Checkbox>)
  fireEvent.click(screen.getByText('Обрати операцію'))
  expect(onChange).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('checkbox',{name:'Обрати операцію'})).toHaveAttribute('type','checkbox')
 })
 it('exposes mixed selection and resets the native indeterminate flag',()=>{
  const {rerender}=render(<Checkbox checked={false} indeterminate onChange={()=>{}}>Усі</Checkbox>)
  const input=screen.getByRole('checkbox') as HTMLInputElement
  expect(input.indeterminate).toBe(true)
  expect(input).toHaveAttribute('aria-checked','mixed')
  rerender(<Checkbox checked onChange={()=>{}}>Усі</Checkbox>)
  expect(input.indeterminate).toBe(false)
  expect(input).toBeChecked()
 })
 it('preserves native disabled behavior',()=>{
  render(<Checkbox disabled checked={false} onChange={()=>{}}>Заборонено</Checkbox>)
  expect(screen.getByRole('checkbox')).toBeDisabled()
 })
})