import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Search, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../api';
import {
  CAMPUS_LOCATIONS,
  ITEM_CATEGORIES,
  type ItemRecord,
  type MatchResultRecord,
} from '../types';
import { StatusLabel } from './StatusIndicator';

interface ReportItemPageProps {
  mode: 'lost' | 'found';
  onSubmitted: () => void;
  onStartClaim: (itemId: string) => void;
}

export function ReportItemPage({
  mode,
  onSubmitted,
  onStartClaim,
}: ReportItemPageProps) {
  const isLost = mode === 'lost';

  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>(ITEM_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-11-22');
  const [location, setLocation] = useState<string>(CAMPUS_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [contact, setContact] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdItem, setCreatedItem] = useState<ItemRecord | null>(null);
  const [autoMatches, setAutoMatches] = useState<MatchResultRecord[]>([]);

  // My Lost Reports lookup
  const [lookupId, setLookupId] = useState('');
  const [myReports, setMyReports] = useState<ItemRecord[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupDone, setLookupDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedItem(null);
    setAutoMatches([]);

    const finalLocation =
      location === '__custom__' ? customLocation.trim() : location;

    if (itemName.trim().length < 2) {
      setError('Please enter an item name (at least 2 characters).');
      return;
    }
    if (description.trim().length < 8) {
      setError('Please provide a clear description (at least 8 characters).');
      return;
    }
    if (!finalLocation || finalLocation.length < 2) {
      setError('Please specify the campus location.');
      return;
    }
    if (studentName.trim().length < 2) {
      setError(
        isLost ? 'Please enter your full name.' : 'Please enter the finder name.'
      );
      return;
    }
    if (studentId.trim().length < 3) {
      setError('Please enter a valid Student ID.');
      return;
    }
    if (contact.trim().length < 5) {
      setError('Please enter a valid campus email or phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        itemName: itemName.trim(),
        category,
        description: description.trim(),
        date,
        location: finalLocation,
        studentName: studentName.trim(),
        studentId: studentId.trim(),
        department: department.trim() || 'General Campus',
        contact: contact.trim(),
      };

      if (isLost) {
        const res = await api.createLostItem(payload);
        setCreatedItem(res.item);
        setAutoMatches(res.matches || []);
        setLookupId(res.item.studentId || studentId.trim());
      } else {
        const res = await api.createFoundItem(payload);
        setCreatedItem(res.item);
        setAutoMatches(res.possibleLostMatches || []);
      }

      setItemName('');
      setDescription('');
      setCustomLocation('');
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupMyReports = async (e: FormEvent) => {
    e.preventDefault();
    if (lookupId.trim().length < 2) {
      setLookupError('Enter your Student ID to view your submitted lost reports.');
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookupDone(true);
    try {
      const rows = await api.getMyLostReports(lookupId.trim());
      setMyReports(rows);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Could not fetch your reports.'
      );
      setMyReports([]);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#0F294A]">
          {isLost ? 'Report a Lost Item' : 'Register a Found Item'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {isLost
            ? 'Submit details of your missing belonging to save in lost.dat and check for immediate smart matches.'
            : 'Register a belonging found on campus to save in found.dat. Personal contact details stay private.'}
        </p>
      </div>

      {!isLost && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-[#0F294A]">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-blue-700" aria-hidden="true" />
          <p>
            <strong>Privacy Notice:</strong> For sensitive items such as Student ID Cards, public
            listings automatically hide description details and contact numbers until an
            Administrator verifies ownership.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-sm text-rose-800"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {createdItem && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display font-bold text-teal-900">
                {isLost ? 'Lost Report Saved Successfully' : 'Found Item Registered Successfully'}
              </h2>
              <p className="text-sm text-teal-800 mt-1">
                Assigned Record ID:{' '}
                <strong className="font-mono tabular-nums">{createdItem.itemId}</strong> — saved to{' '}
                <span className="font-mono">{isLost ? 'lost.dat' : 'found.dat'}</span>.
              </p>
            </div>
          </div>

          {autoMatches.length > 0 && (
            <div className="bg-white border border-teal-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F294A]">
                <Sparkles className="w-4 h-4 text-[#0D9488]" />
                <span>
                  {isLost
                    ? 'Possible Found Matches Detected by C Engine'
                    : 'Possible Matching Lost Reports Detected'}
                </span>
              </div>
              <div className="space-y-2">
                {autoMatches.map((m) => (
                  <div
                    key={m.item.itemId}
                    className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-lg p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#0F294A]">
                        {m.item.itemName}{' '}
                        <span className="font-mono text-slate-500">({m.item.itemId})</span>
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        {m.item.location} · {m.reasons}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums font-bold text-[#0F294A]">
                        {m.totalScore}/100 ({m.tier})
                      </span>
                      {isLost && m.item.status === 'Available' && (
                        <button
                          type="button"
                          onClick={() => onStartClaim(m.item.itemId)}
                          className="px-3 py-1.5 font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md cursor-pointer"
                        >
                          Claim Item
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Item Name *
            </label>
            <input
              type="text"
              required
              maxLength={90}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder={
                isLost
                  ? 'e.g., Casio fx-991EX Calculator'
                  : 'e.g., Silver Insulated Water Bottle'
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            >
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Detailed Description *
            </label>
            <textarea
              required
              rows={3}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brand, color, stickers, engravings, or distinguishing features..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isLost ? 'Lost Date *' : 'Found Date *'}
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isLost ? 'Lost Location *' : 'Found Location *'}
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            >
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="__custom__">Other Campus Location...</option>
            </select>
          </div>

          {location === '__custom__' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Specify Campus Location *
              </label>
              <input
                type="text"
                required
                maxLength={90}
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="e.g., Physics Lab Corridor"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
              />
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isLost ? 'Student Name *' : 'Finder Name *'}
            </label>
            <input
              type="text"
              required
              maxLength={90}
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Student ID *
            </label>
            <input
              type="text"
              required
              maxLength={22}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g., CS2026041"
              className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Department
            </label>
            <input
              type="text"
              maxLength={60}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g., Computer Science"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contact Information *
            </label>
            <input
              type="text"
              required
              maxLength={75}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Campus email or phone number (kept private)"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60 ${
              isLost
                ? 'bg-[#0F294A] hover:bg-[#163A66]'
                : 'bg-[#0D9488] hover:bg-[#0F766E]'
            }`}
          >
            {submitting
              ? 'Saving to C Backend...'
              : isLost
              ? 'Submit Lost Report'
              : 'Submit Found Item'}
          </button>
        </div>
      </form>

      {/* View My Submitted Lost Reports (Module 2 requirement) */}
      {isLost && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-[#0F294A]">
                View Your Submitted Lost Reports
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Enter your Student ID (for example <span className="font-mono">CS2026041</span>) to
                inspect reports stored under your ID.
              </p>
            </div>
            <form onSubmit={handleLookupMyReports} className="flex items-center gap-2">
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Student ID"
                className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg w-40"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lookupLoading ? 'Loading...' : 'View Reports'}</span>
              </button>
            </form>
          </div>

          {lookupError && <p className="text-xs text-rose-700">{lookupError}</p>}

          {lookupDone && !lookupLoading && (
            <div>
              {myReports.length === 0 ? (
                <p className="text-sm text-slate-600 py-2">
                  No lost reports found for Student ID{' '}
                  <span className="font-mono font-semibold">{lookupId}</span>.
                </p>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                  {myReports.map((r) => (
                    <div
                      key={r.itemId}
                      className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[#0F294A]">
                          {r.itemName}{' '}
                          <span className="font-mono text-xs text-slate-500">({r.itemId})</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {r.category} · {r.location} ·{' '}
                          <span className="font-mono tabular-nums">{r.date}</span>
                        </p>
                      </div>
                      <StatusLabel status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
