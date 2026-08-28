'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarRange, Plus } from 'lucide-react';
import { adInstantToAd } from '@ca-firm/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { formatDate } from '@/lib/format';
import { BsDateInput } from '@/components/bs-date-input';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  Label,
  Modal,
  PageHeader,
  Spinner,
  Switch,
} from '@/components/ui';
import type { FiscalYear } from '@/lib/types';

export default function FiscalYearsPage() {
  const { user } = useAuth();

  const [years, setYears] = useState<FiscalYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.get<FiscalYear[]>('/fiscal-years');
      setYears(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fiscal years');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reload]);

  if (user?.role !== 'ADMIN') {
    return <ErrorBanner message="You are not authorized to view this page." />;
  }

  return (
    <div>
      <PageHeader
        title="Fiscal Years"
        description="Nepali fiscal years used to organise documents"
        action={<FiscalYearModalTrigger onSaved={() => setReload((n) => n + 1)} />}
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-600" />
        </div>
      ) : years.length === 0 ? (
        <Card>
          <EmptyState
            title="No fiscal years yet"
            description="Create a fiscal year to start organising documents."
            action={<FiscalYearModalTrigger onSaved={() => setReload((n) => n + 1)} />}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Start</th>
                <th className="px-4 py-3 font-medium">End</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {years.map((year) => (
                <FiscalYearRow
                  key={year.id}
                  year={year}
                  onChanged={() => setReload((n) => n + 1)}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function FiscalYearRow({
  year,
  onChanged,
}: {
  year: FiscalYear;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const toast = useToast();

  async function handleToggleActive() {
    if (toggling) return;
    setToggling(true);
    try {
      await api.patch(`/fiscal-years/${year.id}`, {
        isActive: !year.isActive,
      });
      onChanged();
      toast.success(`Fiscal year "${year.label}" ${!year.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/fiscal-years/${year.id}`);
      setConfirmOpen(false);
      onChanged();
      toast.success(`Fiscal year "${year.label}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
              <CalendarRange className="h-4 w-4" />
            </div>
            <p className="font-medium text-gray-900">{year.label}</p>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-700">
          {formatDate(year.startDate)}
        </td>
        <td className="px-4 py-3 text-gray-700">
          {formatDate(year.endDate)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={year.isActive}
              onChange={() => void handleToggleActive()}
              disabled={toggling}
              label={`Toggle ${year.label} active status`}
            />
            <span className="text-xs text-gray-500">
              {year.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(true)}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>

      {editing && (
        <FiscalYearModal
          year={year}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Delete fiscal year"
        message={`Are you sure you want to delete "${year.label}"? This cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}

function FiscalYearModal({
  year,
  onClose,
  onSaved,
}: {
  year?: FiscalYear;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(year);
  const [open, setOpen] = useState(true);
  const [label, setLabel] = useState(year?.label ?? '');
  const [startDate, setStartDate] = useState(
    year ? toDateInput(year.startDate) : '',
  );
  const [endDate, setEndDate] = useState(year ? toDateInput(year.endDate) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !isEdit || (
    label !== (year?.label ?? '') ||
    startDate !== (year ? toDateInput(year.startDate) : '') ||
    endDate !== (year ? toDateInput(year.endDate) : '')
  );
  const toast = useToast();

  function close() {
    if (onClose) onClose();
    else setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    if (startDate && endDate && startDate > endDate) {
      const msg = 'Start date must be before the end date';
      setError(msg);
      toast.error(msg);
      setSaving(false);
      return;
    }
    const body = {
      label,
      startDate,
      endDate,
    };
    try {
      if (isEdit) {
        await api.patch(`/fiscal-years/${year!.id}`, body);
        toast.success(`Fiscal year "${label}" updated`);
      } else {
        await api.post('/fiscal-years', body);
        toast.success(`Fiscal year "${label}" created`);
      }
      onSaved();
      close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'Edit fiscal year' : 'New fiscal year'}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="fylabel">Label</Label>
          <Input
            id="fylabel"
            required
            pattern="\d{4}/\d{2}"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. 2083/84"
          />
          <p className="mt-1 text-xs text-gray-500">
            Format: YYYY/YY, e.g. 2083/84
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fystart">Start date</Label>
            <BsDateInput
              id="fystart"
              value={startDate}
              onChange={setStartDate}
            />
          </div>
          <div>
            <Label htmlFor="fyend">End date</Label>
            <BsDateInput id="fyend" value={endDate} onChange={setEndDate} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty}>
            {isEdit ? 'Save changes' : 'Create fiscal year'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FiscalYearModalTrigger({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add fiscal year
      </Button>
      {open && (
        <FiscalYearModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onSaved();
          }}
        />
      )}
    </>
  );
}

function toDateInput(iso: string): string {
  const ad = adInstantToAd(new Date(iso));
  const month = String(ad.month).padStart(2, '0');
  const day = String(ad.day).padStart(2, '0');
  return `${ad.year}-${month}-${day}`;
}
