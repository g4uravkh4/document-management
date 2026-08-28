'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api, downloadFile, viewFile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { formatDate, formatDateTime, formatFileSize } from '@/lib/format';
import {
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
  Textarea,
  logoSrc,
  statusBadgeColor,
} from '@/components/ui';
import type {
  Client,
  DocumentCategory,
  DocumentItem,
  DocumentStatus,
  FiscalYear,
  FolderNode,
  Paginated,
} from '@/lib/types';

const STATUSES: DocumentStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const PAGE_SIZE = 100;

interface FlatFolder {
  id: string;
  label: string;
}

function flattenFolders(nodes: FolderNode[], depth = 0): FlatFolder[] {
  const out: FlatFolder[] = [];
  for (const node of nodes) {
    out.push({ id: node.id, label: `${'— '.repeat(depth)}${node.name}` });
    out.push(...flattenFolders(node.children, depth + 1));
  }
  return out;
}

function findPath(nodes: FolderNode[], id: string): FolderNode[] {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const found = findPath(node.children, id);
    if (found.length > 0) return [node, ...found];
  }
  return [];
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const toast = useToast();

  const [years, setYears] = useState<FiscalYear[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [fiscalYearId, setFiscalYearId] = useState('');
  const [clientId, setClientId] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);

  const [documents, setDocuments] = useState<Paginated<DocumentItem> | null>(null);
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createFolder, setCreateFolder] = useState<{
    parentId: string | null;
  } | null>(null);
  const [renameFolder, setRenameFolder] = useState<FolderNode | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderNode | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const effectiveClientId = isAdmin ? clientId : (user?.clientId ?? '');
  const scopeReady = Boolean(effectiveClientId && fiscalYearId);

  const loadDocs = useCallback(async () => {
    if (!scopeReady) {
      setDocuments(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (search) params.set('search', search);
      if (fiscalYearId) params.set('fiscalYearId', fiscalYearId);
      if (categoryId) params.set('categoryId', categoryId);
      if (isAdmin && clientId) params.set('clientId', clientId);
      if (currentFolderId) params.set('folderId', currentFolderId);
      const data = await api.get<Paginated<DocumentItem>>(
        `/documents?${params.toString()}`,
      );
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [
    scopeReady,
    page,
    search,
    fiscalYearId,
    categoryId,
    isAdmin,
    clientId,
    currentFolderId,
  ]);

  const loadTree = useCallback(async () => {
    if (!effectiveClientId || !fiscalYearId) {
      setTree([]);
      return;
    }
    setTreeLoading(true);
    try {
      const nodes = await api.get<FolderNode[]>(
        `/folders?clientId=${effectiveClientId}&fiscalYearId=${fiscalYearId}`,
      );
      setTree(nodes);
    } catch {
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, [effectiveClientId, fiscalYearId]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<FiscalYear[]>('/fiscal-years'),
      api.get<DocumentCategory[]>('/document-categories'),
      isAdmin ? api.get<Client[]>('/clients') : Promise.resolve([] as Client[]),
    ])
      .then(([yearsData, categoriesData, clientsData]) => {
        if (cancelled) return;
        setYears(yearsData);
        setCategories(categoriesData);
        setClients(clientsData);
        setFiscalYearId(
          (prev) =>
            prev ||
            (yearsData.find((y) => y.isActive)?.id ?? '') ||
            (yearsData[0]?.id ?? ''),
        );
      })
      .catch(() => {
        // Filters are optional; the manager can still render.
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  function openFolder(id: string | null) {
    setCurrentFolderId(id);
    setPage(1);
  }

  const crumbs = currentFolderId ? findPath(tree, currentFolderId) : [];
  const currentFolderNode = crumbs[crumbs.length - 1];
  const folderChildren = currentFolderId
    ? (currentFolderNode?.children ?? [])
    : tree;

  async function handleDeleteFolder() {
    if (!deleteFolder) return;
    setDeletingFolder(true);
    try {
      await api.delete(`/folders/${deleteFolder.id}`);
      if (currentFolderId === deleteFolder.id) openFolder(null);
      setDeleteFolder(null);
      await loadTree();
      toast.success(`Folder "${deleteFolder.name}" deleted successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      setDeleteFolder(null);
    } finally {
      setDeletingFolder(false);
    }
  }

  async function moveDoc(docId: string, targetFolderId: string | null) {
    try {
      await api.patch(`/documents/${docId}`, {
        folderId: targetFolderId ?? '',
      });
      await loadDocs();
      toast.success('Document moved successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Move failed');
    }
  }

  async function uploadFilesIntoFolder(files: File[], folderId: string | null) {
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append(
        'title',
        file.name.replace(/\.[^/.]+$/, '') || file.name,
      );
      form.append('fiscalYearId', fiscalYearId);
      if (folderId) form.append('folderId', folderId);
      if (isAdmin && effectiveClientId) form.append('clientId', effectiveClientId);
      try {
        await api.upload('/documents', form);
      } catch (err) {
        toast.error(
          `Failed to upload ${file.name}: ${
            err instanceof Error ? err.message : 'error'
          }`,
        );
        return;
      }
    }
    await loadDocs();
    toast.success(files.length === 1 ? `Uploaded "${files[0].name}"` : `Uploaded ${files.length} documents`);
  }

  function handleMainDrop(event: DragEvent<HTMLDivElement>) {
    if (!scopeReady) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      event.preventDefault();
      void uploadFilesIntoFolder(files, currentFolderId);
    }
  }

  const dropFolder = (targetFolderId: string | null) => (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropTargetId(null);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      void uploadFilesIntoFolder(files, targetFolderId);
      return;
    }
    const docId = event.dataTransfer.getData('text/plain');
    if (docId) {
      void moveDoc(docId, targetFolderId);
    }
  };

  const showClientPicker = isAdmin && !clientId;
  const showYearPicker = !fiscalYearId;
  const insideFiles = !showClientPicker && !showYearPicker;

  const scopeClientName = isAdmin
    ? (clients.find((c) => c.id === clientId)?.name ?? '')
    : (clients.find((c) => c.id === user?.clientId)?.name ??
      (user?.clientId ? 'Your firm' : '—'));
  const scopeYearLabel = years.find((y) => y.id === fiscalYearId)?.label ?? '';

  function goToClientPicker() {
    setClientId('');
    setFiscalYearId('');
    setCurrentFolderId(null);
    setPage(1);
    setDropTargetId(null);
  }

  function goToYearPicker() {
    setFiscalYearId('');
    setCurrentFolderId(null);
    setPage(1);
    setDropTargetId(null);
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Client-wise file manager. Pick a client and fiscal year, then browse folders and documents."
      />

      {showClientPicker && (
        <ClientPicker
          clients={clients}
          loading={loadingMeta}
          onSelect={(id) => {
            setClientId(id);
            setFiscalYearId('');
            setCurrentFolderId(null);
            setPage(1);
            setDropTargetId(null);
          }}
        />
      )}

      {!showClientPicker && showYearPicker && (
        <YearPicker
          years={years}
          loading={loadingMeta}
          clientName={scopeClientName}
          isAdmin={isAdmin}
          onSelect={(id) => {
            setFiscalYearId(id);
            setCurrentFolderId(null);
            setPage(1);
            setDropTargetId(null);
          }}
          onBack={goToClientPicker}
        />
      )}

      {insideFiles && (
        <>
          <div className="mb-4">
            <ScopeBreadcrumb
              clientName={scopeClientName}
              fiscalYearLabel={scopeYearLabel}
              folderCrumbs={crumbs}
              isAdmin={isAdmin}
              onClientsClick={goToClientPicker}
              onYearClick={() => openFolder(null)}
              onFolderClick={(id) => openFolder(id)}
            />
          </div>

          <Card className="w-full min-w-0 overflow-hidden p-4">
            {/* Toolbar: filter + search + add folder + upload — single row, same width as folder grid, stays inside wrapper */}
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search this view..."
                  className="h-9 w-full pl-9"
                />
              </div>
              <Select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-40 shrink-0"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              {(search || categoryId) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setCategoryId('');
                    setPage(1);
                  }}
                  title="Clear search and filters"
                  className="h-9 shrink-0 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setCreateFolder({ parentId: currentFolderId })}
                className="h-9 shrink-0"
              >
                <FolderPlus className="h-4 w-4" />
                New folder
              </Button>
              <Button
                onClick={() => setUploadOpen(true)}
                title="Upload into the current folder"
                className="h-9 shrink-0"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            </div>

            <div
              className="mt-4 w-full min-w-0"
              onDragOver={(e) => {
                if (scopeReady && e.dataTransfer.types.includes('Files')) {
                  e.preventDefault();
                }
              }}
              onDrop={handleMainDrop}
            >
              {error && <ErrorBanner message={error} />}
              {treeLoading && folderChildren.length === 0 ? (
                <div className="flex h-48 items-center justify-center">
                  <Spinner className="h-8 w-8 text-indigo-600" />
                </div>
              ) : (
                <>
                  {folderChildren.length > 0 && (
                    <div
                      className={`grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
                        documents && documents.items.length > 0 ? 'mb-4' : ''
                      }`}
                    >
                      {folderChildren.map((folder) => (
                        <FolderTile
                          key={folder.id}
                          folder={folder}
                          isDropTarget={dropTargetId === folder.id}
                          setDropTargetId={setDropTargetId}
                          onOpen={openFolder}
                          onNewSubfolder={() =>
                            setCreateFolder({ parentId: folder.id })
                          }
                          onRename={() => setRenameFolder(folder)}
                          onDelete={() => setDeleteFolder(folder)}
                          onDrop={dropFolder(folder.id)}
                        />
                      ))}
                    </div>
                  )}

                  {loading ? (
                    <div className="flex h-48 items-center justify-center">
                      <Spinner className="h-8 w-8 text-indigo-600" />
                    </div>
                  ) : documents && documents.items.length > 0 ? (
                    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {documents.items.map((doc) => (
                        <DocumentTile
                          key={doc.id}
                          doc={doc}
                          isAdmin={isAdmin}
                          showFolder={currentFolderId === null}
                          onChanged={() => void loadDocs()}
                        />
                      ))}
                    </div>
                  ) : folderChildren.length === 0 ? (
                    <EmptyState
                      title={
                        currentFolderId
                          ? 'This folder is empty'
                          : 'No documents yet'
                      }
                      description={
                        currentFolderId
                          ? 'Drop files here or use the Upload button to add documents to this folder.'
                          : 'Upload a document or create a folder to get started.'
                      }
                      action={
                        <Button
                          onClick={() => setUploadOpen(true)}
                          title="Upload into the current folder"
                        >
                          <Upload className="h-4 w-4" />
                          Upload
                        </Button>
                      }
                    />
                  ) : (
                    <p className="px-5 py-8 text-center text-sm text-gray-500">
                      No documents in this folder. Drop files here or use the
                      Upload button.
                    </p>
                  )}
                </>
              )}
            </div>
            {documents && documents.totalPages > 1 && (
              <div className="mt-4 flex w-full min-w-0 flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-500">
                  Page {documents.page} of {documents.totalPages} (
                  {documents.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={page >= documents.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {createFolder && (
        <FolderFormModal
          mode="create"
          clientId={effectiveClientId}
          fiscalYearId={fiscalYearId}
          parentId={createFolder.parentId}
          onClose={() => setCreateFolder(null)}
          onSaved={() => {
            setCreateFolder(null);
            void loadTree();
          }}
        />
      )}

      {renameFolder && (
        <FolderFormModal
          mode="rename"
          clientId={effectiveClientId}
          fiscalYearId={fiscalYearId}
          folder={renameFolder}
          onClose={() => setRenameFolder(null)}
          onSaved={() => {
            setRenameFolder(null);
            void loadTree();
          }}
        />
      )}

      <ConfirmDialog
        open={deleteFolder !== null}
        onClose={() => setDeleteFolder(null)}
        onConfirm={() => void handleDeleteFolder()}
        title="Delete folder"
        message={`Delete "${deleteFolder?.name ?? ''}" and everything inside it? Documents in this folder will become unfiled.`}
        loading={deletingFolder}
      />

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        isAdmin={isAdmin}
        years={years}
        categories={categories}
        clientId={effectiveClientId}
        fiscalYearId={fiscalYearId}
        folderId={currentFolderId}
        onCreated={() => void loadDocs()}
      />
    </div>
  );
}

function formatRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function ClientLogo({
  client,
  size = 40,
}: {
  client: Client;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (client.logoKey && !failed) {
    return (
      <img
        src={logoSrc(client.id)}
        alt=""
        onError={() => setFailed(true)}
        className="shrink-0 rounded-md bg-gray-100 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md bg-indigo-100 font-semibold text-indigo-700"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {client.name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function ClientPicker({
  clients,
  loading,
  onSelect,
}: {
  clients: Client[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-gray-900">
        Select a client
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Choose a client, then a fiscal year, to open its file manager.
      </p>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="Create a client to get started."
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelect(client.id)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              <ClientLogo client={client} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">
                  {client.name}
                </p>
                <p className="truncate text-xs text-gray-500">{client.email}</p>
              </div>
              {!client.isActive && <Badge color="gray">Inactive</Badge>}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function YearPicker({
  years,
  loading,
  clientName,
  isAdmin,
  onSelect,
  onBack,
}: {
  years: FiscalYear[];
  loading: boolean;
  clientName: string;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-indigo-50 p-2 text-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{clientName}</h2>
            <p className="text-sm text-gray-500">Choose a fiscal year</p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Button>
        )}
      </div>
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-6 w-6 text-indigo-600" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {years.map((year) => (
            <button
              key={year.id}
              type="button"
              onClick={() => onSelect(year.id)}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-gray-100 p-2 text-gray-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{year.label}</p>
                  <p className="text-xs text-gray-500">
                    {formatRange(year.startDate, year.endDate)}
                  </p>
                </div>
              </div>
              {year.isActive && <Badge color="green">Active</Badge>}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ScopeBreadcrumb({
  clientName,
  fiscalYearLabel,
  folderCrumbs,
  isAdmin,
  onClientsClick,
  onYearClick,
  onFolderClick,
}: {
  clientName: string;
  fiscalYearLabel: string;
  folderCrumbs: FolderNode[];
  isAdmin: boolean;
  onClientsClick: () => void;
  onYearClick: () => void;
  onFolderClick: (id: string) => void;
}) {
  const segments: { key: string; label: string; onClick: () => void }[] = [
    ...(isAdmin
      ? [{ key: 'clients', label: 'Clients', onClick: onClientsClick }]
      : []),
    { key: 'client', label: clientName, onClick: onYearClick },
    { key: 'year', label: fiscalYearLabel, onClick: onYearClick },
    ...folderCrumbs.map((folder) => ({
      key: folder.id,
      label: folder.name,
      onClick: () => onFolderClick(folder.id),
    })),
  ];

  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      {segments.map((segment, index) => {
        const last = index === segments.length - 1;
        return (
          <span
            key={segment.key}
            className="flex min-w-0 items-center gap-1"
          >
            {index > 0 && (
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
            )}
            {last ? (
              <span className="max-w-56 truncate rounded-md px-2 py-1 font-semibold text-indigo-700">
                {segment.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={segment.onClick}
                className="max-w-48 truncate rounded-md px-2 py-1 font-medium text-gray-700 transition-colors hover:bg-gray-100"
              >
                {segment.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function FolderTile({
  folder,
  isDropTarget,
  setDropTargetId,
  onOpen,
  onNewSubfolder,
  onRename,
  onDelete,
  onDrop,
}: {
  folder: FolderNode;
  isDropTarget: boolean;
  setDropTargetId: (id: string | null) => void;
  onOpen: (id: string) => void;
  onNewSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const subCount = folder.children.length;
  return (
    <div
      className={`group rounded-lg border bg-white p-4 transition-colors ${
        isDropTarget
          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200'
          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDropTargetId(folder.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragLeave={(e) => {
        const related = e.relatedTarget;
        if (related instanceof Node && e.currentTarget.contains(related)) return;
        setDropTargetId(null);
      }}
      onDrop={(e) => {
        setDropTargetId(null);
        onDrop(e);
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(folder.id)}
        className="flex w-full min-w-0 items-center gap-3 text-left"
      >
        <FolderIcon className="h-8 w-8 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {folder.name}
          </p>
          <p className="text-xs text-gray-500">
            {subCount === 0
              ? 'Empty'
              : `${subCount} ${subCount === 1 ? 'subfolder' : 'subfolders'}`}
          </p>
        </div>
      </button>
      <div className="mt-3 hidden items-center justify-end gap-1 border-t border-gray-100 pt-2 group-hover:flex">
        <button
          type="button"
          onClick={onNewSubfolder}
          title="New subfolder"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRename}
          title="Rename folder"
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete folder"
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}


function FolderFormModal({
  mode,
  clientId,
  fiscalYearId,
  parentId,
  folder,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'rename';
  clientId: string;
  fiscalYearId: string;
  parentId?: string | null;
  folder?: FolderNode;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(folder?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isDirty = mode === 'create' || name !== (folder?.name ?? '');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === 'rename' && folder) {
        await api.patch(`/folders/${folder.id}`, { name });
        toast.success('Folder renamed successfully');
      } else {
        await api.post('/folders', {
          name,
          clientId,
          fiscalYearId,
          ...(parentId ? { parentId } : {}),
        });
        toast.success('Folder created successfully');
      }
      onSaved();
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
      open
      onClose={onClose}
      title={mode === 'rename' ? 'Rename folder' : 'New folder'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="foldername">Folder name</Label>
          <Input
            id="foldername"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === 'create' ? 'e.g. VAT returns' : undefined}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty}>
            {mode === 'rename' ? 'Save' : 'Create folder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DocumentTile({
  doc,
  isAdmin,
  showFolder,
  onChanged,
}: {
  doc: DocumentItem;
  isAdmin: boolean;
  showFolder: boolean;
  onChanged: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadFile(`/documents/${doc.id}/download`, doc.originalName);
      toast.success(`Downloaded "${doc.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  }

  async function handleView() {
    setViewing(true);
    try {
      await viewFile(`/documents/${doc.id}/view`, doc.originalName);
      toast.success(`Opened "${doc.title}" in new tab`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'View failed');
    } finally {
      setViewing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/documents/${doc.id}`);
      setConfirmOpen(false);
      onChanged();
      toast.success(`Deleted "${doc.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', doc.id);
          e.dataTransfer.effectAllowed = 'move';
          setDragging(true);
        }}
        onDragEnd={() => setDragging(false)}
        className={`group rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-indigo-300 hover:shadow-sm ${
          dragging ? 'opacity-40' : ''
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="shrink-0 rounded-md bg-indigo-50 p-2 text-indigo-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900" title={doc.title}>
              {doc.title}
            </p>
            <p className="truncate text-xs text-gray-500" title={doc.description ?? doc.originalName}>
              {doc.description ?? doc.originalName}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge color={statusBadgeColor(doc.status)}>{doc.status}</Badge>
          {showFolder && (
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
              <FolderIcon className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="truncate">{doc.folderPath ?? 'Unfiled'}</span>
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-400">
          {doc.categoryName ?? 'Uncategorized'} · {formatFileSize(doc.sizeBytes)}{' '}
          · {formatDateTime(doc.uploadedAt)}
        </p>

        <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
          <Button
            variant="ghost"
            onClick={() => void handleView()}
            loading={viewing}
            title="View in new tab"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => void handleDownload()}
            loading={downloading}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                onClick={() => setEditing(true)}
                title="Edit status or folder"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                title="Delete"
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <EditDocumentModal
          doc={doc}
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
        title="Delete document"
        message={`Are you sure you want to delete "${doc.title}"? This cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}

function UploadModal({
  open,
  onClose,
  isAdmin,
  years,
  categories,
  clientId,
  fiscalYearId,
  folderId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  years: FiscalYear[];
  categories: DocumentCategory[];
  clientId: string;
  fiscalYearId: string;
  folderId: string | null;
  onCreated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('PENDING');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = years.find((y) => y.id === fiscalYearId);
  const toast = useToast();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      const msg = 'Please choose a file';
      setError(msg);
      toast.error(msg);
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    form.append('fiscalYearId', fiscalYearId);
    if (description) form.append('description', description);
    if (categoryId) form.append('categoryId', categoryId);
    if (isAdmin && clientId) form.append('clientId', clientId);
    if (folderId) form.append('folderId', folderId);
    if (isAdmin && status !== 'PENDING') form.append('status', status);

    setUploading(true);
    setError(null);
    try {
      await api.upload('/documents', form, setProgress);
      toast.success(`Document "${title}" uploaded successfully`);
      onClose();
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Upload document" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
          <div>
            <Label htmlFor="docfile">File</Label>
            <input
              id="docfile"
              type="file"
              required
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const picked = e.target.files?.[0] ?? null;
                setFile(picked);
                if (picked && !title) {
                  setTitle(picked.name.replace(/\.[^/.]+$/, '') || picked.name);
                }
              }}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>
          <div>
            <Label htmlFor="doctitle">Title</Label>
            <Input
              id="doctitle"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. FY 2083/84 audit working papers"
            />
          </div>
          <div>
            <Label htmlFor="docdesc">Description</Label>
            <Textarea
              id="docdesc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="docfy">Fiscal year</Label>
              <div className="flex h-9 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                {currentYear?.label ?? '—'}
              </div>
            </div>
            <div>
              <Label htmlFor="doccat">Category</Label>
              <Select
                id="doccat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="docfolder">Folder</Label>
              <div className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                <FolderIcon className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="truncate">
                  {folderId ? 'Current folder' : 'No folder (unfiled)'}
                </span>
              </div>
            </div>
            {isAdmin && (
              <div>
                <Label htmlFor="docstatus">Status</Label>
                <Select
                  id="docstatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DocumentStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {uploading && progress > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={uploading} disabled={!file}>
              Upload
            </Button>
          </div>
        </form>
      </Modal>
  );
}

function EditDocumentModal({
  doc,
  onClose,
  onSaved,
}: {
  doc: DocumentItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<DocumentStatus>(doc.status);
  const [folderId, setFolderId] = useState(doc.folderId ?? '');
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = status !== doc.status || folderId !== (doc.folderId ?? '');
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    api
      .get<FolderNode[]>(
        `/folders?clientId=${doc.clientId}&fiscalYearId=${doc.fiscalYearId}`,
      )
      .then((nodes) => {
        if (!cancelled) setFolderTree(nodes);
      })
      .catch(() => {
        // Folder picker is optional.
      });
    return () => {
      cancelled = true;
    };
  }, [doc.clientId, doc.fiscalYearId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/documents/${doc.id}`, {
        status,
        folderId,
      });
      toast.success(`Document "${doc.title}" updated`);
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Edit: ${doc.title}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="editstatus">Status</Label>
          <Select
            id="editstatus"
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="editfolder">Folder</Label>
          <Select
            id="editfolder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">No folder</option>
            {flattenFolders(folderTree).map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!isDirty}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
