import {LayoutDashboard,Wallet,ArrowLeftRight,PieChart,Tags,Settings,CalendarDays,type LucideIcon} from 'lucide-react'
import type {Permission} from '@/lib/auth/permissions'
export interface NavItem {label:string;href:string;icon:LucideIcon;permission?:Permission;primary?:boolean}
export const NAV_ITEMS:NavItem[]=[
 {label:'Статистика',href:'/reports',icon:PieChart,primary:true},
 {label:'Транзакції',href:'/transactions',icon:ArrowLeftRight,primary:true},
 {label:'Огляд',href:'/dashboard',icon:LayoutDashboard,primary:true},
 {label:'Рахунки',href:'/accounts',icon:Wallet,primary:true},
 {label:'Гроші наперед',href:'/forecast',icon:CalendarDays},
 {label:'Кредити та борги',href:'/loans',icon:Wallet},
 {label:'Категорії',href:'/categories',icon:Tags,permission:'category.manage'},
 {label:'Налаштування',href:'/settings',icon:Settings},
]