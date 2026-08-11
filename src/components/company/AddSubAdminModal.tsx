import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Check, Mail, X } from 'lucide-react';
import { companiesService } from '../../services/companies.service';
import { getApiErrorMessage } from '../../utils/validation';

type ActionCol = 'view' | 'create' | 'edit' | 'delete';

type PermissionArea = {
  id: string;
  label: string;
  description: string;
  sidebar: string;
  keys: Partial<Record<ActionCol, string>>;
};

/**
 * One-page matrix aligned with Company Admin sidebar.
 * "Admins" is intentionally excluded — only the primary company admin manages sub-admins.
 */
export const SUB_ADMIN_PERMISSION_AREAS: PermissionArea[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview metrics',
    sidebar: 'Dashboard',
    keys: { view: 'analytics:read' },
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Company reports',
    sidebar: 'Reports',
    keys: {
      view: 'reports:read',
      create: 'reports:write',
      edit: 'reports:write',
    },
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    description: 'Fleet vehicle records',
    sidebar: 'Vehicles',
    keys: {
      view: 'vehicles:read',
      create: 'vehicles:write',
      edit: 'vehicles:write',
      delete: 'vehicles:delete',
    },
  },
  {
    id: 'drivers',
    label: 'Drivers',
    description: 'Driver profiles',
    sidebar: 'Drivers',
    keys: {
      view: 'drivers:read',
      create: 'drivers:write',
      edit: 'drivers:write',
      delete: 'drivers:delete',
    },
  },
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Expense records',
    sidebar: 'Expenses',
    keys: {
      view: 'expenses:read',
      create: 'expenses:write',
      edit: 'expenses:write',
    },
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Company users & owners',
    sidebar: 'Users',
    keys: {
      view: 'users:read',
      create: 'users:write',
      edit: 'users:write',
      delete: 'users:delete',
    },
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'Plan & billing view',
    sidebar: 'Subscription',
    keys: { view: 'subscriptions:read' },
  },
  {
    id: 'wallet',
    label: 'Wallet',
    description: 'Wallet balance & history',
    sidebar: 'Wallet',
    keys: { view: 'payments:read' },
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Company profile settings',
    sidebar: 'Settings',
    keys: {
      view: 'settings:read',
      edit: 'settings:write',
    },
  },
];

const ACTION_COLUMNS: { id: ActionCol; label: string }[] = [
  { id: 'view', label: 'View' },
  { id: 'create', label: 'Create' },
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete' },
];

export const COMPANY_SUB_ADMIN_PERMISSIONS = SUB_ADMIN_PERMISSION_AREAS.flatMap(
  (area) =>
    ACTION_COLUMNS.flatMap((col) => {
      const value = area.keys[col.id];
      if (!value) return [];
      if (col.id === 'edit' && area.keys.create === value) return [];
      const actionLabel =
        col.id === 'view'
          ? 'View'
          : col.id === 'create'
            ? 'Create / Edit'
            : col.id === 'edit'
              ? 'Edit'
              : 'Delete';
      return [{ value, label: `${actionLabel} ${area.label}` }];
    }),
);

export function permissionLabel(key: string) {
  const fromList = COMPANY_SUB_ADMIN_PERMISSIONS.find((p) => p.value === key)?.label;
  if (fromList) return fromList;
  const [resource, action] = key.split(':');
  if (!resource || !action) return key;
  const area = SUB_ADMIN_PERMISSION_AREAS.find(
    (a) =>
      a.id === resource ||
      Object.values(a.keys).includes(`${resource}:${action}`),
  );
  const name = area?.label ?? resource;
  if (action === 'read') return `View ${name}`;
  if (action === 'write') return `Create / Edit ${name}`;
  if (action === 'delete') return `Delete ${name}`;
  return key;
}

/** Map sidebar route → permission needed to see the nav item. */
export const COMPANY_SIDEBAR_PERMISSION: Record<string, string> = {
  dashboard: 'analytics:read',
  reports: 'reports:read',
  vehicles: 'vehicles:read',
  drivers: 'drivers:read',
  expenses: 'expenses:read',
  users: 'users:read',
  subscription: 'subscriptions:read',
  wallet: 'payments:read',
  settings: 'settings:read',
  // Admins: primary company admin only (no sub-admin grant)
};

export type SubAdminEditTarget = {
  name: string;
  email: string;
  permissions: string[];
};

export function AddSubAdminModal({
  open,
  onClose,
  onSuccess,
  editTarget = null,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTarget?: SubAdminEditTarget | null;
}) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState({ name: '', email: '' });
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setForm({ name: editTarget.name, email: editTarget.email });
      setSelected(new Set(editTarget.permissions));
    } else {
      setForm({ name: '', email: '' });
      setSelected(new Set());
    }
  }, [open, editTarget]);

  const selectedCount = selected.size;

  const allToggleableKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const area of SUB_ADMIN_PERMISSION_AREAS) {
      for (const col of ACTION_COLUMNS) {
        const k = area.keys[col.id];
        if (k) keys.add(k);
      }
    }
    return Array.from(keys);
  }, []);

  if (!open) return null;

  const isChecked = (key: string | undefined) => !!key && selected.has(key);

  const toggleKey = (key: string | undefined) => {
    if (!key) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        const area = SUB_ADMIN_PERMISSION_AREAS.find(
          (a) =>
            a.keys.create === key ||
            a.keys.edit === key ||
            a.keys.delete === key,
        );
        if (area?.keys.view) next.add(area.keys.view);
      }
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const permissions = Array.from(selected);
    if (permissions.length === 0) {
      toast.error('Select at least one permission');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && editTarget) {
        await companiesService.updateSubAdmin(editTarget.email, {
          name: form.name.trim(),
          permissions,
        });
        toast.success('Sub-admin permissions updated');
      } else {
        await companiesService.addSubAdmin({
          name: form.name.trim(),
          email: form.email.trim(),
          permissions,
        });
        toast.success(
          'Sub-admin created. Login email and temporary password were sent to their inbox.',
        );
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          isEdit ? 'Failed to update sub-admin' : 'Failed to add sub-admin',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Edit Sub-Admin Permissions' : 'Create Sub-Admin'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Permissions match Company Admin sidebar areas (except Admins).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="e.g. Payal Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  readOnly={isEdit}
                  placeholder="e.g. payal@abc.com"
                  value={form.email}
                  onChange={(e) => {
                    if (!isEdit) setForm({ ...form, email: e.target.value });
                  }}
                  className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-fleet-500 focus:ring-2 focus:ring-fleet-500/20 ${
                    isEdit ? 'bg-slate-50 text-slate-500' : ''
                  }`}
                />
              </div>
            </div>

            {!isEdit ? (
              <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-semibold">Password is sent by email</p>
                  <p className="mt-0.5 text-sky-800/90">
                    A temporary password is emailed with the login link. Ask them
                    to change it after first login.
                  </p>
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Set permissions
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    One table for all sidebar areas.
                    {selectedCount > 0
                      ? ` ${selectedCount} selected.`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(allToggleableKeys))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Sidebar area</th>
                      {ACTION_COLUMNS.map((col) => (
                        <th key={col.id} className="px-2 py-3 text-center">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SUB_ADMIN_PERMISSION_AREAS.map((area) => (
                      <tr
                        key={area.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {area.sidebar}
                          </p>
                          <p className="text-xs text-slate-500">
                            {area.description}
                          </p>
                        </td>
                        {ACTION_COLUMNS.map((col) => {
                          const key = area.keys[col.id];
                          const available = !!key;
                          const checked = isChecked(key);
                          return (
                            <td key={col.id} className="px-2 py-3 text-center">
                              {available ? (
                                <button
                                  type="button"
                                  onClick={() => toggleKey(key)}
                                  aria-pressed={checked}
                                  aria-label={`${col.label} ${area.label}`}
                                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                                    checked
                                      ? 'border-fleet-500 bg-fleet-500 text-white'
                                      : 'border-slate-200 bg-white text-transparent hover:border-fleet-300'
                                  }`}
                                >
                                  <Check className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[1.4] rounded-lg bg-fleet-500 py-2.5 text-sm font-semibold text-white hover:bg-fleet-600 disabled:opacity-60"
            >
              {loading
                ? isEdit
                  ? 'Saving…'
                  : 'Sending invite…'
                : isEdit
                  ? 'Save Permissions'
                  : 'Add Sub-Admin & Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
