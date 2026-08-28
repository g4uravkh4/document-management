'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
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
  logoSrc,
} from '@/components/ui';
import type { Client } from '@/lib/types';

export default function ClientsPage() {
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setClients(await api.get<Client[]>('/clients'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
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
        title="Clients"
        description="Manage client records linked to user accounts"
        action={<ClientModalTrigger onSaved={() => setReload((n) => n + 1)} />}
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-600" />
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <EmptyState
            title="No clients yet"
            description="Create your first client record to get started."
            action={<ClientModalTrigger onSaved={() => setReload((n) => n + 1)} />}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">PAN</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
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

function ClientRow({
  client,
  onChanged,
}: {
  client: Client;
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
      await api.patch(`/clients/${client.id}`, {
        isActive: !client.isActive,
      });
      onChanged();
      toast.success(`Client "${client.name}" ${!client.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/clients/${client.id}`);
      setConfirmOpen(false);
      onChanged();
      toast.success(`Client "${client.name}" deleted`);
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-indigo-50 text-indigo-600">
              {client.logoKey ? (
                <img
                  src={logoSrc(client.id)}
                  alt={client.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">{client.name}</p>
              <p className="text-xs text-gray-500">{client.address ?? '—'}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-700">{client.email}</td>
        <td className="px-4 py-3 text-gray-700">{client.pan ?? '—'}</td>
        <td className="px-4 py-3 text-gray-700">{client.phone ?? '—'}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={client.isActive}
              onChange={() => void handleToggleActive()}
              disabled={toggling}
              label={`Toggle ${client.name} active status`}
            />
            <span className="text-xs text-gray-500">
              {client.isActive ? 'Active' : 'Inactive'}
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
        <ClientModal
          client={client}
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
        title="Delete client"
        message={`Are you sure you want to delete "${client.name}"? This cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}

function ClientModal({
  client,
  onClose,
  onSaved,
}: {
  client?: Client;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(client);
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(client?.name ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [phone, setPhone] = useState(client?.phone ?? '');
  const [pan, setPan] = useState(client?.pan ?? '');
  const [address, setAddress] = useState(client?.address ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !isEdit || (
    name !== (client?.name ?? '') ||
    email !== (client?.email ?? '') ||
    phone !== (client?.phone ?? '') ||
    pan !== (client?.pan ?? '') ||
    address !== (client?.address ?? '') ||
    logoFile !== null
  );
  const toast = useToast();

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  function onPickLogo(file: File | null) {
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  }

  function close() {
    if (onClose) onClose();
    else setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      name,
      email,
      ...(phone ? { phone } : {}),
      ...(pan ? { pan } : {}),
      ...(address ? { address } : {}),
    };
    try {
      let savedId: string;
      if (isEdit) {
        await api.patch(`/clients/${client!.id}`, body);
        savedId = client!.id;
      } else {
        const created = await api.post<{ id: string }>('/clients', body);
        savedId = created.id;
      }
      if (logoFile) {
        const form = new FormData();
        form.append('file', logoFile);
        await api.upload(`/clients/${savedId}/logo`, form);
      }
      toast.success(isEdit ? `Client "${name}" updated` : `Client "${name}" created`);
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
      title={isEdit ? 'Edit client' : 'New client'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-indigo-50 text-indigo-600">
            {logoPreview || (client?.logoKey ? logoSrc(client.id) : null) ? (
              <img
                src={logoPreview || (client?.logoKey ? logoSrc(client.id) : undefined)}
                alt={name || 'Logo'}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-6 w-6" />
            )}
          </div>
          <div className="flex-1">
            <Label htmlFor="clogo">Company logo</Label>
            <input
              id="clogo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP or GIF, up to 2 MB.</p>
          </div>
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Himalayan Traders Pvt. Ltd."
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pan">PAN</Label>
            <Input
              id="pan"
              value={pan}
              onChange={(e) => setPan(e.target.value)}
              placeholder="e.g. 605123456"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Kathmandu, Nepal"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty}>
            {isEdit ? 'Save changes' : 'Create client'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ClientModalTrigger({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add client
      </Button>
      {open && (
        <ClientModal
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
