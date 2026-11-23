import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, Search } from 'lucide-react';
import { api } from '../api';
import type { ClaimRecord, ItemRecord } from '../types';
import { StatusLabel } from './StatusIndicator';

interface ClaimsPageProps {
  prefillItemId?: string;
  onClaimSubmitted: () => void;
}

export function ClaimsPage({
  prefillItemId,
  onClaimSubmitted,
}: ClaimsPageProps) {
  const [availableFound, setAvailableFound] = useState<ItemRecord[]>([]);
  const [itemId, setItemId] = useState(prefillItemId || '');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [contact, setContact] = useState('');
  const [ownershipProof, setOwnershipProof] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdClaim, setCreatedClaim] = useState<ClaimRecord | null>(null);

  // Claim tracker state
  const [trackStudentId, setTrackStudentId] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (prefillItemId) setItemId(prefillItemId);
  }, [prefillItemId]);

  useEffect(() => {
    api
      .getFoundItems()
      .then((list) => {
        setAvailableFound(list.filter((i) => i.status !== 'Returned'));
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const handleClaimSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreatedClaim(null);

    if (itemId.trim().length < 4) {
      setFormError('Please select or enter a valid Found Item ID (e.g., FND-1001).');
      return;
    }
    if (studentName.trim().length < 2 || studentId.trim().length < 3) {
      setFormError('Please provide your full Student Name and Student ID.');
      return;
    }
    if (contact.trim().length < 5) {
      setFormError('Please provide valid contact information.');
      return;
    }
    if (ownershipProof.trim().length < 10) {
      setFormError(
        'Please provide specific ownership proof (at least 10 characters) for Admin verification.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const claim = await api.submitClaim({
        itemId: itemId.trim(),
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        department: department.trim() || 'General Campus',
        contact: contact.trim(),
        ownershipProof: ownershipProof.trim(),
      });
      setCreatedClaim(claim);
      setOwnershipProof('');
      setTrackStudentId(claim.studentId);
      onClaimSubmitted();

      // Auto-refresh tracker for this student
      setHasSearched(true);
      const updatedClaims = await api.getStudentClaims(claim.studentId, statusFilter);
      setClaims(updatedClaims);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Claim submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchClaims = async (sid: string, st: string) => {
    if (sid.trim().length < 2) {
      setTrackingError('Please enter your Student ID to track your claims.');
      return;
    }
    setTrackingLoading(true);
    setTrackingError(null);
    setHasSearched(true);
    try {
      const rows = await api.getStudentClaims(sid.trim(), st);
      setClaims(rows);
    } catch (err) {
      setTrackingError(
        err instanceof Error ? err.message : 'Failed to fetch claims.'
      );
      setClaims([]);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleTrackSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchClaims(trackStudentId, statusFilter);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#0F294A]">
          Claim &amp; Recovery Management
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit an ownership claim for a found belonging or track the verification status of your
          existing requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submit Claim Form */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-[#0D9488]" aria-hidden="true" />
            <h2 className="font-display text-xl font-bold text-[#0F294A]">
              Submit Recovery Claim
            </h2>
          </div>

          {formError && (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 flex items-center gap-2.5 text-xs sm:text-sm text-rose-800"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {createdClaim && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start gap-2.5 text-xs sm:text-sm text-teal-900">
              <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Claim Submitted (<span className="font-mono">{createdClaim.claimId}</span>)
                </p>
                <p className="mt-0.5">
                  Status is currently <strong>Pending</strong>. An Administrator will review your
                  ownership proof before approval.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleClaimSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Found Item ID *
              </label>
              {availableFound.length > 0 && (
                <select
                  value={
                    availableFound.some((i) => i.itemId === itemId) ? itemId : ''
                  }
                  onChange={(e) => {
                    if (e.target.value) setItemId(e.target.value);
                  }}
                  aria-label="Choose from available found items"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 mb-2"
                >
                  <option value="">-- Select a Found Item or type ID below --</option>
                  {availableFound.map((it) => (
                    <option key={it.itemId} value={it.itemId}>
                      {it.itemId} — {it.itemName} ({it.location})
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                placeholder="e.g., FND-1001"
                className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Student ID *
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g., CS2026041"
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Department"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact Information *
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Campus email or phone"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Ownership Proof / Unique Identifiers *
              </label>
              <textarea
                required
                rows={3}
                value={ownershipProof}
                onChange={(e) => setOwnershipProof(e.target.value)}
                placeholder="Describe hidden markings, initials, lock screen, contents, or serial details only the owner would know..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Submitting Claim...' : 'Submit Claim Request'}
            </button>
          </form>
        </section>

        {/* Track Claims Panel */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F294A]">
              Track My Claim Status
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Enter your Student ID to view Pending, Approved, Rejected, or Completed claims.
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="flex flex-wrap gap-2">
            <input
              type="text"
              value={trackStudentId}
              onChange={(e) => setTrackStudentId(e.target.value)}
              placeholder="Enter Student ID (e.g., CS2026041)"
              className="flex-1 min-w-[180px] px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              disabled={trackingLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{trackingLoading ? 'Checking...' : 'Track Claims'}</span>
            </button>
          </form>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {['All', 'Pending', 'Approved', 'Rejected', 'Completed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  if (trackStudentId.trim().length >= 2) {
                    fetchClaims(trackStudentId, st);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-[#0F294A] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {trackingError && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {trackingError}
            </p>
          )}

          {!hasSearched ? (
            <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-sm text-slate-500">
              Enter your Student ID above to load your claim history from{' '}
              <span className="font-mono">claims.dat</span>.
            </div>
          ) : trackingLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-600">
              No claims matching your filter were found for Student ID{' '}
              <span className="font-mono font-semibold">{trackStudentId}</span>.
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((c) => (
                <div
                  key={c.claimId}
                  className="border border-slate-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold text-sm text-[#0F294A]">
                        {c.itemName}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {c.claimId} · Item {c.itemId} · {c.createdAt}
                      </p>
                    </div>
                    <StatusLabel status={c.claimStatus} />
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Submitted Proof:</strong> {c.ownershipProof}
                  </p>
                  <p className="text-xs text-slate-700 bg-slate-50 rounded p-2">
                    <strong>Admin Note:</strong> {c.adminNotes}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
