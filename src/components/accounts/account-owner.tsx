'use client'
import {useMembers} from '@/hooks/use-finance'
import {accountOwner} from '@/lib/money/entry'
import type {Account} from '@/types/domain'
export function AccountOwner({account}:{account:Account}){const {data:members=[]}=useMembers();return <span className="block break-words text-xs text-muted">{accountOwner(account,members)}</span>}