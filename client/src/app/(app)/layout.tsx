'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarRange,
  FileStack,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Settings,
  Tags,
  Users as UsersIcon,
  Building2,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Avatar, Badge, Spinner, avatarSrc } from '@/components/ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/clients', label: 'Clients', icon: Building2, adminOnly: true },
  { href: '/users', label: 'Users', icon: UsersIcon, adminOnly: true },
  {
    href: '/fiscal-years',
    label: 'Fiscal Years',
    icon: CalendarRange,
    adminOnly: true,
  },
  { href: '/categories', label: 'Categories', icon: Tags, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: UserRound },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (status === 'guest' || !user) {
    return null;
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === 'ADMIN',
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-gray-200 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <FileStack className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">CA Doc Manager</p>
            <p className="text-xs text-gray-500">Fiscal year aware</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <Link
              href="/profile"
              className="flex min-w-0 items-center gap-3 rounded-md hover:opacity-80"
              title="Edit profile"
            >
              <Avatar
                name={user.name}
                src={user.avatarKey ? avatarSrc(user.id, user.avatarKey) : null}
                size={36}
              />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5">
            <Badge color={user.role === 'ADMIN' ? 'indigo' : 'green'}>
              {user.role}
            </Badge>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-2 md:hidden">
            <FileStack className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-semibold text-gray-900">
              CA Doc Manager
            </span>
          </div>
          <p className="hidden text-sm text-gray-500 md:block">
            Signed in as{' '}
            <span className="font-medium text-gray-900">{user.name}</span>
          </p>
          <Avatar
            name={user.name}
            src={user.avatarKey ? avatarSrc(user.id, user.avatarKey) : null}
            size={32}
            className="md:hidden"
          />
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
