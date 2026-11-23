import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileCheck2,
  Lock,
  LogOut,
  Package,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../api';
import {
  ITEM_CATEGORIES,
  type AdminReports,
  type ClaimRecord,
  type DashboardStats,
  type ItemRecord,
} from '../types';
import { StatusLabel } from './StatusIndicator';

interface AdminPageProps {
  token: string | null;
  username: string | null;
  onAuthenticated: (token: string, username: string) => void;
  onLoggedOut: () => void;
  onDataChanged: () => void;
}

type AdminTab = 'overview' | 'found' | 'lost' | 'claims';

export function AdminPage({
  token,
  username,
  onAuthenticated,
  onLoggedOut,
  onDataChanged,
}: AdminPageProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [authModeLoading, setAuthModeLoading] = useState(true);

  // Login / Setup form fields
  const [formUser, setFormUser] = useState('admin');
  const [formPass, setFormPass] = useState('');
  const [formPassConfirm, setFormPassConfirm] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Dashboard data
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reports, setReports] = useState<AdminReports | null>(null);
  const [foundList, setFoundList] = useState<ItemRecord[]>([]);
  const [lostList, setLostList] = useState<ItemRecord[]>([]);
  const [claimsList, setClaimsList] = useState<ClaimRecord[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashMsg, setDashMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Item Modal
  const [editingItem, setEditingItem] = useState<{
    type: 'found' | 'lost';
    item: ItemRecord;
  } | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'found' | 'lost';
    item: ItemRecord;
  } | null>(null);

  // Claim action notes
  const [claimNoteMap, setClaimNoteMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setAuthModeLoading(true);
    api
      .getAdminStatus(token)
      .then((st) => {
        setConfigured(st.configured);
      })
      .catch(() => setConfigured(true))
      .finally(() => setAuthModeLoading(false));
  }, [token]);

  const loadDashboard = async (activeToken: string) => {
    setDashLoading(true);
    try {
      const [s, r, f, l, c] = await Promise.all([
        api.getStats(),
        api.getAdminReports(activeToken),
        api.getFoundItems(activeToken),
        api.getLostItems(activeToken),
        api.getAllClaimsAdmin(activeToken),
      ]);
      setStats(s);
      setReports(r);
      setFoundList(f);
      setLostList(l);
      setClaimsList(c);
    } catch (err) {
      setDashMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load admin data.',
      });
    } finally {
      setDashLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard(token);
    }
  }, [token]);

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (formPass.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (formPass !== formPassConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await api.setupAdmin({
        username: formUser.trim(),
        password: formPass,
      });
      setFormPass('');
      setFormPassConfirm('');
      onAuthenticated(res.token, res.username);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Setup failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const res = await api.loginAdmin({
        username: formUser.trim(),
        password: formPass,
      });
      setFormPass('');
      onAuthenticated(res.token, res.username);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await api.logoutAdmin(token);
      } catch {
        /* ignore */
      }
    }
    onLoggedOut();
  };

  const openEditModal = (type: 'found' | 'lost', item: ItemRecord) => {
    setEditingItem({ type, item });
    setEditName(item.itemName);
    setEditCategory(item.category);
    setEditLocation(item.location);
    setEditStatus(item.status);
    setEditDesc(item.description);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !editingItem) return;
    try {
      await api.updateItemAdmin(token, editingItem.type, editingItem.item.itemId, {
        itemName: editName.trim(),
        category: editCategory,
        location: editLocation.trim(),
        status: editStatus,
        description: editDesc.trim(),
      });
      setDashMsg({
        type: 'ok',
        text: `Updated ${editingItem.item.itemId} in binary storage.`,
      });
      setEditingItem(null);
      await loadDashboard(token);
      onDataChanged();
    } catch (err) {
      setDashMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Update failed.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      await api.deleteItemAdmin(
        token,
        deleteTarget.type,
        deleteTarget.item.itemId
      );
      setDashMsg({
        type: 'ok',
        text: `Deleted ${deleteTarget.item.itemId} from ${deleteTarget.type}.dat.`,
      });
      setDeleteTarget(null);
      await loadDashboard(token);
      onDataChanged();
    } catch (err) {
      setDashMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Delete failed.',
      });
    }
  };

  const handleClaimDecision = async (
    claimId: string,
    newStatus: 'Approved' | 'Rejected' | 'Completed'
  ) => {
    if (!token) return;
    const note = claimNoteMap[claimId] || '';
    try {
      await api.updateClaimStatus(token, claimId, newStatus, note);
      setDashMsg({
        type: 'ok',
        text: `Claim ${claimId} marked as ${newStatus}.`,
      });
      await loadDashboard(token);
      onDataChanged();
    } catch (err) {
      setDashMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Claim update failed.',
      });
    }
  };

  // Auth Gate View
  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0F294A] flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0F294A]">
              {configured === false
                ? 'Initialize Administrator Account'
                : 'Administrator Login'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {configured === false
                ? 'First-run setup: create your local CampusFind administrator credentials. Credentials are salted, SHA-256 hashed, and saved to admin.dat.'
                : 'Sign in to verify claims, edit or delete item records, and view campus recovery analytics.'}
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authModeLoading ? (
            <div className="h-36 bg-slate-100 rounded-lg animate-pulse" />
          ) : configured === false ? (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={formUser}
                  onChange={(e) => setFormUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Create Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formPass}
                  onChange={(e) => setFormPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formPassConfirm}
                  onChange={(e) => setFormPassConfirm(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg cursor-pointer"
              >
                {authSubmitting ? 'Saving to admin.dat...' : 'Create Admin Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formUser}
                  onChange={(e) => setFormUser(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formPass}
                  onChange={(e) => setFormPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg cursor-pointer"
              >
                {authSubmitting ? 'Verifying...' : 'Sign In to Dashboard'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const filterBySearch = (list: ItemRecord[]) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        i.itemId.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        (i.studentName || '').toLowerCase().includes(q)
    );
  };

  const sidebarItems: { id: AdminTab; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Overview & Reports', icon: BarChart3 },
    { id: 'claims', label: 'Claim Requests', icon: FileCheck2 },
    { id: 'found', label: 'Found Items', icon: Package },
    { id: 'lost', label: 'Lost Reports', icon: ClipboardList },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Admin Sidebar */}
        <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="pb-3 border-b border-slate-200">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="font-display font-bold text-[#0F294A]">{username}</p>
          </div>

          <nav className="space-y-1" aria-label="Admin dashboard sections">
            {sidebarItems.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#0F294A] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Admin Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {dashMsg && (
            <div
              className={`border rounded-xl p-4 flex items-center justify-between gap-3 text-sm ${
                dashMsg.type === 'ok'
                  ? 'bg-teal-50 border-teal-200 text-teal-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {dashMsg.type === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{dashMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setDashMsg(null)}
                aria-label="Dismiss notification"
                className="p-1 hover:opacity-70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Total Lost</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-[#0F294A] mt-1">
                    {stats?.totalLost ?? 0}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Total Found</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-[#0F294A] mt-1">
                    {stats?.totalFound ?? 0}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Pending Claims</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">
                    {stats?.pendingClaims ?? 0}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500">Returned Items</p>
                  <p className="font-mono tabular-nums text-2xl font-bold text-teal-700 mt-1">
                    {stats?.itemsReturned ?? 0}
                  </p>
                </div>
              </div>

              {reports && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display font-bold text-[#0F294A]">
                        Category-Wise Item Counts
                      </h2>
                      <span className="font-mono tabular-nums text-xs font-semibold text-teal-700">
                        Recovery: {reports.recoveryRatePercent}%
                      </span>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="text-left py-2 font-semibold">Category</th>
                          <th className="text-right py-2 font-semibold">Lost</th>
                          <th className="text-right py-2 font-semibold">Found</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reports.categoryBreakdown.map((row) => (
                          <tr key={row.category}>
                            <td className="py-2 text-slate-700">{row.category}</td>
                            <td className="py-2 text-right font-mono tabular-nums text-slate-800">
                              {row.lostCount}
                            </td>
                            <td className="py-2 text-right font-mono tabular-nums text-slate-800">
                              {row.foundCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h2 className="font-display font-bold text-[#0F294A]">
                      Recent Campus Activity
                    </h2>
                    {reports.recentActivity.length === 0 ? (
                      <p className="text-xs text-slate-500">No activity recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {reports.recentActivity.map((act, idx) => (
                          <div
                            key={`${act.id}-${idx}`}
                            className="py-2.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0F294A] truncate">
                                {act.title}
                              </p>
                              <p className="text-slate-500">
                                {act.type} · <span className="font-mono">{act.id}</span> ·{' '}
                                <span className="font-mono tabular-nums">{act.timestamp}</span>
                              </p>
                            </div>
                            <StatusLabel status={act.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Claims Verification Tab */}
          {activeTab === 'claims' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <h2 className="font-display text-xl font-bold text-[#0F294A]">
                Claim Requests Verification Queue
              </h2>
              {dashLoading ? (
                <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
              ) : claimsList.length === 0 ? (
                <p className="text-sm text-slate-600 py-4">
                  No student claim requests have been submitted yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {claimsList.map((cl) => (
                    <div
                      key={cl.claimId}
                      className="border border-slate-200 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-display font-semibold text-[#0F294A]">
                            {cl.itemName}{' '}
                            <span className="font-mono text-xs text-slate-500">
                              ({cl.itemId})
                            </span>
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Claimant: <strong>{cl.studentName}</strong> (
                            <span className="font-mono">{cl.studentId}</span>) · {cl.department} ·{' '}
                            {cl.contact}
                          </p>
                          <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                            {cl.claimId} · Submitted {cl.createdAt}
                          </p>
                        </div>
                        <StatusLabel status={cl.claimStatus} />
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-700">
                        <strong>Ownership Proof:</strong> {cl.ownershipProof}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={claimNoteMap[cl.claimId] ?? ''}
                          onChange={(e) =>
                            setClaimNoteMap((prev) => ({
                              ...prev,
                              [cl.claimId]: e.target.value,
                            }))
                          }
                          placeholder="Optional verification note..."
                          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleClaimDecision(cl.claimId, 'Approved')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClaimDecision(cl.claimId, 'Completed')}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg cursor-pointer"
                        >
                          Mark Returned
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClaimDecision(cl.claimId, 'Rejected')}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manage Found or Lost Records Tab */}
          {(activeTab === 'found' || activeTab === 'lost') && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-[#0F294A]">
                  {activeTab === 'found'
                    ? 'Manage Found Items (found.dat)'
                    : 'Manage Lost Reports (lost.dat)'}
                </h2>
                <div className="relative">
                  <Search
                    className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter records..."
                    className="pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="text-left py-2.5 pr-3 font-semibold">ID</th>
                      <th className="text-left py-2.5 pr-3 font-semibold">Item</th>
                      <th className="text-left py-2.5 pr-3 font-semibold">Location &amp; Date</th>
                      <th className="text-left py-2.5 pr-3 font-semibold">Reporter Contact</th>
                      <th className="text-left py-2.5 pr-3 font-semibold">Status</th>
                      <th className="text-right py-2.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filterBySearch(
                      activeTab === 'found' ? foundList : lostList
                    ).map((it) => (
                      <tr key={it.itemId} className="hover:bg-slate-50">
                        <td className="py-3 pr-3 font-mono tabular-nums font-medium text-slate-700 whitespace-nowrap">
                          {it.itemId}
                        </td>
                        <td className="py-3 pr-3">
                          <p className="font-semibold text-[#0F294A]">{it.itemName}</p>
                          <p className="text-slate-500">{it.category}</p>
                        </td>
                        <td className="py-3 pr-3 text-slate-600">
                          <p>{it.location}</p>
                          <p className="font-mono tabular-nums text-slate-500">{it.date}</p>
                        </td>
                        <td className="py-3 pr-3 text-slate-600">
                          <p>{it.studentName || '—'}</p>
                          <p className="text-slate-500">{it.contact}</p>
                        </td>
                        <td className="py-3 pr-3">
                          <StatusLabel status={it.status} />
                        </td>
                        <td className="py-3 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(activeTab, it)}
                            aria-label={`Edit ${it.itemId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ type: activeTab, item: it })}
                            aria-label={`Delete ${it.itemId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-[#0F294A]">
                Edit Record <span className="font-mono">{editingItem.item.itemId}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {ITEM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {editingItem.type === 'found' ? (
                    <>
                      <option value="Available">Available</option>
                      <option value="Claimed">Claimed</option>
                      <option value="Returned">Returned</option>
                    </>
                  ) : (
                    <>
                      <option value="Active">Active</option>
                      <option value="Matched">Matched</option>
                      <option value="Resolved">Resolved</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                required
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-[#0F294A]">
              Confirm Record Deletion
            </h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently remove{' '}
              <strong>{deleteTarget.item.itemName}</strong> (
              <span className="font-mono">{deleteTarget.item.itemId}</span>) from{' '}
              <span className="font-mono">{deleteTarget.type}.dat</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
