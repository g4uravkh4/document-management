'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarRange,
  FileText,
  HardDrive,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDateTime, formatFileSize } from '@/lib/format';
import {
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  Spinner,
  statusBadgeColor,
} from '@/components/ui';
import type { DashboardOverview, RecentUpload } from '@/lib/types';

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof FileText;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await api.get<DashboardOverview>('/dashboard');
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBanner message={error ?? 'No data available'} />;
  }

  const isAdminOverview = isAdmin && 'totalClients' in data;
  const recent = data.recentUploads;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name ?? ''}`}
        description={
          isAdminOverview
            ? `Active fiscal year: ${data.activeFiscalYearLabel ?? 'Not set'}`
            : 'Your document overview'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdminOverview && (
          <KpiCard
            label="Active clients"
            value={String(data.totalClients)}
            icon={Building2}
            hint={`+${data.newClientsThisMonth} this month`}
          />
        )}
        <KpiCard
          label="Documents"
          value={String(data.totalDocuments)}
          icon={FileText}
          hint={`${data.documentsThisMonth} this month`}
        />
        {isAdminOverview && (
          <KpiCard
            label="New clients (month)"
            value={String(data.newClientsThisMonth)}
            icon={UserPlus}
          />
        )}
        <KpiCard
          label="Storage used"
          value={formatFileSize(data.storageUsedBytes)}
          icon={HardDrive}
        />
        {isAdminOverview && (
          <KpiCard
            label="Active fiscal year"
            value={data.activeFiscalYearLabel ?? 'Not set'}
            icon={CalendarRange}
          />
        )}
      </div>

      {!isAdminOverview && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CategoryBreakdown
            title="Documents by category"
            items={data.documentsByCategory.map((c) => ({
              label: c.name ?? 'Uncategorized',
              count: c.count,
            }))}
          />
          {data.documentsThisMonth > 0 && (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-8">
              <TrendingUp className="mr-2 h-5 w-5 text-indigo-600" />
              <p className="text-sm text-gray-600">
                {data.documentsThisMonth} document
                {data.documentsThisMonth === 1 ? '' : 's'} uploaded this month
              </p>
            </div>
          )}
        </div>
      )}

      {isAdminOverview && (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CategoryBreakdown
            title="Documents by category"
            items={data.documentsByCategory.map((c) => ({
              label: c.name ?? 'Uncategorized',
              count: c.count,
            }))}
          />
          <CategoryBreakdown
            title="Documents by fiscal year"
            items={data.documentsByFiscalYear.map((f) => ({
              label: f.label,
              count: f.count,
            }))}
          />
        </div>
      )}

      <RecentUploads items={recent} isAdmin={isAdmin} />
    </div>
  );
}

function CategoryBreakdown({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No documents yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-medium text-gray-900">{item.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentUploads({
  items,
  isAdmin,
}: {
  items: RecentUpload[];
  isAdmin: boolean;
}) {
  return (
    <Card className="mt-6">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">Recent uploads</h2>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No recent uploads" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-md bg-gray-100 p-2 text-gray-500">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/documents?q=${encodeURIComponent(item.title)}`}
                    className="truncate text-sm font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {item.title}
                  </Link>
                  <p className="truncate text-xs text-gray-500">
                    {item.clientName} · {formatFileSize(item.sizeBytes)} ·{' '}
                    {formatDateTime(item.uploadedAt)}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Badge color={statusBadgeColor(item.status)}>{item.status}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
