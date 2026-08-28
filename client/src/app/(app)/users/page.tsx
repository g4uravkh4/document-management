'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { formatDate } from '@/lib/format';
import { validatePassword, PASSWORD_HINT } from '@/lib/password';
import {
  Avatar,
  avatarSrc,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Switch,
} from '@/components/ui';
import type { Client, PublicUser, Role } from '@/lib/types';

export default function UsersPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.get<PublicUser[]>('/users'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
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
        title="Users"
        description="Manage login accounts and their roles"
        action={<UserModalTrigger onSaved={() => setReload((n) => n + 1)} />}
      />

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8 text-indigo-600" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <EmptyState
            title="No users yet"
            description="Create a user account to get started."
            action={<UserModalTrigger onSaved={() => setReload((n) => n + 1)} />}
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <UserRow
                  key={u.id}
                  u={u}
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

function UserRow({
  u,
  onChanged,
}: {
  u: PublicUser;
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
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      onChanged();
      toast.success(`User "${u.name}" ${!u.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/users/${u.id}`);
      setConfirmOpen(false);
      onChanged();
      toast.success(`User "${u.name}" deleted`);
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
            <Avatar name={u.name} src={u.avatarKey ? avatarSrc(u.id, u.avatarKey) : null} size={36} />
            <div>
              <p className="font-medium text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge color={u.role === 'ADMIN' ? 'indigo' : 'green'}>{u.role}</Badge>
        </td>
        <td className="px-4 py-3 text-gray-700">{u.clientId ? 'Linked' : '—'}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={u.isActive}
              onChange={() => void handleToggleActive()}
              disabled={toggling}
              label={`Toggle ${u.name} login access`}
            />
            <span className="text-xs text-gray-500">
              {u.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-700">
          {formatDate(u.createdAt)}
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
        <UserModal
          user={u}
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
        title="Delete user"
        message={`Are you sure you want to delete "${u.name}"? This cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}

function UserModal({
  user,
  onClose,
  onSaved,
}: {
  user?: PublicUser;
  onClose?: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(user);
  const [open, setOpen] = useState(true);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(user?.role ?? 'CLIENT');
  const [clientId, setClientId] = useState(user?.clientId ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !isEdit || (
    name.trim() !== (user?.name ?? '').trim() ||
    role !== (user?.role ?? 'CLIENT') ||
    clientId !== (user?.clientId ?? '') ||
    password !== '' ||
    avatarFile !== null
  );
  const toast = useToast();

  useEffect(() => {
    api
      .get<Client[]>('/clients')
      .then(setClients)
      .catch(() => {
        // Ignore.
      });
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function onPickAvatar(file: File | null) {
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  function close() {
    if (onClose) onClose();
    else setOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) {
        setError(pwError);
        toast.error(pwError);
        return;
      }
    } else if (!isEdit) {
      const msg = 'Password is required';
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        role,
      };
      if (!isEdit) {
        body.email = email.trim();
        body.password = password;
        if (role === 'CLIENT' && clientId) body.clientId = clientId;
      } else {
        if (password) body.password = password;
        // Always send clientId for edit to allow clearing/unlinking
        body.clientId = role === 'CLIENT' ? (clientId || null) : null;
      }
      let savedId: string;
      if (isEdit) {
        await api.patch(`/users/${user!.id}`, body);
        savedId = user!.id;
      } else {
        const created = await api.post<{ id: string }>('/users', body);
        savedId = created.id;
      }
      if (avatarFile) {
        const form = new FormData();
        form.append('file', avatarFile);
        await api.upload(`/users/${savedId}/avatar`, form);
      }
      toast.success(isEdit ? `User "${name}" updated` : `User "${name}" created`);
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
    <Modal open={open} onClose={close} title={isEdit ? 'Edit user' : 'New user'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="flex items-center gap-4">
          <Avatar
            name={name || '?'}
            src={avatarPreview ?? (user?.avatarKey ? avatarSrc(user.id, user.avatarKey) : null)}
            size={56}
          />
          <div className="flex-1">
            <Label htmlFor="uavatar">Profile picture</Label>
            <input
              id="uavatar"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP or GIF, up to 2 MB.</p>
          </div>
        </div>
        <div>
          <Label htmlFor="uname">Name</Label>
          <Input
            id="uname"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="uemail">Email</Label>
          <Input
            id="uemail"
            type="email"
            required
            value={email}
            disabled={isEdit}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="upassword">
            {isEdit ? 'New password (leave blank to keep)' : 'Password'}
          </Label>
          <Input
            id="upassword"
            type="password"
            required={!isEdit}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? '••••••••' : 'At least 8 characters'}
          />
          <p className="mt-1 text-xs text-gray-500">{PASSWORD_HINT}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="urole">Role</Label>
            <Select
              id="urole"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="CLIENT">CLIENT</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="uclient">Client</Label>
            <Select
              id="uclient"
              value={clientId}
              disabled={role === 'ADMIN'}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">
                {role === 'CLIENT' ? 'Select client' : 'Not applicable'}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function UserModalTrigger({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add user
      </Button>
      {open && (
        <UserModal
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
