'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  DollarSign, 
  Home, 
  CreditCard, 
  Target, 
  BarChart3, 
  Settings,
  LogOut 
} from 'lucide-react';
import supabase from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Transactions', href: '/transactions', icon: CreditCard },
  { name: 'Budget', href: '/budget', icon: Target },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (!user) {
        router.push('/auth/login');
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          router.push('/auth/login');
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-peat-charcoal flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="animate-pulse flex items-center space-x-4">
            <div className="rounded-full bg-single-malt/20 h-12 w-12"></div>
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded w-32"></div>
              <div className="h-3 bg-white/5 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-peat-charcoal">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 sidebar-leather border-r border-white/5">
        {/* Logo */}
        <div className="flex h-20 items-center px-8 border-b border-white/5">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-single-malt/20">
              <DollarSign className="h-6 w-6 text-single-malt" />
            </div>
            <span className="ml-3 text-lg font-space-grotesk font-semibold text-white">
              Personal Finance
            </span>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 px-6">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center px-4 py-3 text-sm font-medium text-white/70 rounded-glass hover:text-white hover:bg-white/5 transition-all duration-300"
              >
                <item.icon className="mr-4 h-5 w-5 group-hover:text-single-malt transition-colors" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 w-full p-6 border-t border-white/5">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate font-inter">
                  {user.email}
                </p>
                <p className="text-xs text-white/50 font-inter">Executive Account</p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-3 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-72">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}