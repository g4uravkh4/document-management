'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Tags } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
} from '@/components/ui';
import type { DocumentCategory } from '@/lib/types';

export default function CategoriesPage() {
  const { user } = useAuth();

  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await api.get<DocumentCategory[]>('/document-categories'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
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
        title="Document Categories"
        description="Categories used to organise documents"
        action={<CategoryModalTrigger onSaved={() => setReload((n) => n + 1)} />}
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-600" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            title="No categories yet"
            description="Create a category to organise documents by type."
            action={<CategoryModalTrigger onSaved={() => setReload((n) => n + 1)} />}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
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

function CategoryRow({
  category,
  onChanged,
}: {
  category: DocumentCategory;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/document-categories/${category.id}`);
      setConfirmOpen(false);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
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
              <Tags className="h-4 w-4" />
            </div>
            <p className="font-medium text-gray-900">{category.name}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
            {category.slug}
          </code>
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
        <CategoryModal
          category={category}
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
        title="Delete category"
        message={`Are you sure you want to delete "${category.name}"? Documents in this category will become uncategorized.`}
        loading={deleting}
      />
    </>
  );
}

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category?: DocumentCategory;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(category);
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(category?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (onClose) onClose();
    else setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await api.patch(`/document-categories/${category!.id}`, { name });
      } else {
        await api.post('/document-categories', { name });
      }
      onSaved();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={isEdit ? 'Edit category' : 'New category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="catname">Name</Label>
          <Input
            id="catname"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Income Tax"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModalTrigger({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add category
      </Button>
      {open && (
        <CategoryModal
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
