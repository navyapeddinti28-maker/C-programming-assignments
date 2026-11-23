import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { api } from '../api';
import {
  CAMPUS_LOCATIONS,
  ITEM_CATEGORIES,
  type ItemRecord,
  type MatchResultRecord,
} from '../types';
import { CategoryIcon, StatusLabel } from './StatusIndicator';

interface BrowsePageProps {
  initialItem?: ItemRecord | null;
  onClearInitialItem: () => void;
  onStartClaim: (itemId: string) => void;
}

export function BrowsePage({
  initialItem,
  onClearInitialItem,
  onStartClaim,
}: BrowsePageProps) {
  const [recordType, setRecordType] = useState<'found' | 'lost'>('found');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Item Detail modal state
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(
    initialItem || null
  );
  const [detailMatches, setDetailMatches] = useState<MatchResultRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Smart Matching Analyzer state
  const [lostReports, setLostReports] = useState<ItemRecord[]>([]);
  const [selectedLostId, setSelectedLostId] = useState('');
  const [smartMatches, setSmartMatches] = useState<MatchResultRecord[]>([]);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartSearched, setSmartSearched] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItem) {
      openItemDetail(initialItem);
      onClearInitialItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItem]);

  useEffect(() => {
    api
      .getLostItems()
      .then((list) => {
        setLostReports(list);
        if (list.length > 0 && !selectedLostId) {
          setSelectedLostId(list[0].itemId);
        }
      })
      .catch(() => {
        /* Handled gracefully */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .searchItems({
        type: recordType,
        q: query.trim(),
        category,
        location,
        sort: sortOrder,
      })
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Search failed.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recordType, query, category, location, sortOrder]);

  const openItemDetail = async (item: ItemRecord) => {
    setSelectedItem(item);
    setDetailMatches([]);
    if (item.itemId.startsWith('FND-')) {
      setDetailLoading(true);
      try {
        const res = await api.getFoundDetail(item.itemId);
        setSelectedItem(res.item);
        setDetailMatches(res.possibleLostMatches || []);
      } catch {
        /* keep basic item */
      } finally {
        setDetailLoading(false);
      }
    } else if (item.itemId.startsWith('LOST-')) {
      setDetailLoading(true);
      try {
        const res = await api.getMatchesForLost(item.itemId);
        setDetailMatches(res.matches || []);
      } catch {
        /* ignore */
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const runSmartMatch = async (lostIdToRun?: string) => {
    const targetId = lostIdToRun || selectedLostId;
    if (!targetId) return;
    setSmartLoading(true);
    setSmartError(null);
    setSmartSearched(true);
    try {
      const res = await api.getMatchesForLost(targetId);
      setSmartMatches(res.matches || []);
    } catch (err) {
      setSmartError(
        err instanceof Error ? err.message : 'Could not calculate matches.'
      );
      setSmartMatches([]);
    } finally {
      setSmartLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header & Record Type Switch */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#0F294A]">
            Browse &amp; Search Campus Items
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Search live records stored in binary files or run the weighted C smart item matcher.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setRecordType('found')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              recordType === 'found'
                ? 'bg-white text-[#0F294A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Found Items
          </button>
          <button
            type="button"
            onClick={() => setRecordType('lost')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              recordType === 'lost'
                ? 'bg-white text-[#0F294A] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lost Reports
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by item name, keyword, or ID (e.g., Calculator)..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
          />
        </div>

        <div className="lg:col-span-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
          >
            <option value="All">All Categories</option>
            {ITEM_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            aria-label="Filter by location"
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-[#0F294A]"
          >
            <option value="All">All Locations</option>
            {CAMPUS_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
            }
            className="w-full h-full px-3 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Results Grid */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-sm text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white border border-slate-200 rounded-xl p-5 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="font-display font-semibold text-slate-800">
            No matching {recordType === 'found' ? 'found items' : 'lost reports'} found
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Try clearing your filters or searching with a broader keyword.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('All');
              setLocation('All');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-[#0F294A] bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <article
              key={item.itemId}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <CategoryIcon category={item.category} />
                  </span>
                  <StatusLabel status={item.status} />
                </div>

                <h2 className="font-display text-lg font-semibold text-[#0F294A]">
                  {item.itemName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {item.category} <span aria-hidden="true">·</span>{' '}
                  <span className="font-mono tabular-nums">{item.itemId}</span>
                </p>
                <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.location}</span>
                  </span>
                  <span className="font-mono tabular-nums shrink-0">{item.date}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openItemDetail(item)}
                    className="px-3.5 py-2 text-xs font-semibold text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    View Details
                  </button>

                  {recordType === 'found' && item.status === 'Available' && (
                    <button
                      type="button"
                      onClick={() => onStartClaim(item.itemId)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Claim Item
                    </button>
                  )}

                  {recordType === 'lost' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLostId(item.itemId);
                        runSmartMatch(item.itemId);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Run Smart Match
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Smart Item Matching System Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#0D9488] text-xs font-semibold">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Rule-Based C Matching Engine</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-[#0F294A] mt-1">
              Smart Item Matching Analyzer
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Select a lost item report to compare against all available found belongings using our
              100-point weighted algorithm (Name 30, Category 20, Description 20, Location 20, Date
              10).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedLostId}
              onChange={(e) => setSelectedLostId(e.target.value)}
              aria-label="Select lost report"
              className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white min-w-[240px]"
            >
              {lostReports.length === 0 ? (
                <option value="">No lost reports available</option>
              ) : (
                lostReports.map((l) => (
                  <option key={l.itemId} value={l.itemId}>
                    {l.itemId} — {l.itemName}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              disabled={!selectedLostId || smartLoading}
              onClick={() => runSmartMatch()}
              className="px-4 py-2.5 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] disabled:opacity-50 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {smartLoading ? 'Matching...' : 'Find Matches'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
          Note: Similarity scores are automated suggestions only and do not constitute proof of
          ownership. All claims require Administrator verification.
        </p>

        {smartError && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {smartError}
          </div>
        )}

        {smartSearched && !smartLoading && (
          <div>
            {smartMatches.length === 0 ? (
              <p className="text-sm text-slate-600 py-4">
                No candidate matches scored 25 points or higher for this lost report.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {smartMatches.map((m) => (
                  <div
                    key={m.item.itemId}
                    className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display font-semibold text-[#0F294A]">
                          {m.item.itemName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {m.item.category} <span aria-hidden="true">·</span> {m.item.location}{' '}
                          <span aria-hidden="true">·</span>{' '}
                          <span className="font-mono tabular-nums">{m.item.itemId}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono tabular-nums text-xl font-bold text-[#0F294A]">
                          {m.totalScore}/100
                        </p>
                        <p
                          className={`text-xs font-semibold ${
                            m.totalScore >= 80
                              ? 'text-teal-700'
                              : m.totalScore >= 50
                              ? 'text-blue-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {m.tier}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center bg-slate-50 rounded-lg p-2.5 text-xs">
                      <div>
                        <span className="block text-slate-500">Name</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {m.nameScore}/30
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Category</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {m.categoryScore}/20
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Keywords</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {m.descriptionScore}/20
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Location</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {m.locationScore}/20
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Date</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-800">
                          {m.dateScore}/10
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600">
                        <strong className="text-slate-800">Reasons:</strong> {m.reasons}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openItemDetail(m.item)}
                          className="px-3 py-1.5 font-semibold text-[#0F294A] bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                        >
                          View Details
                        </button>
                        {m.item.status === 'Available' && (
                          <button
                            type="button"
                            onClick={() => onStartClaim(m.item.itemId)}
                            className="px-3 py-1.5 font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md cursor-pointer"
                          >
                            Claim
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  {selectedItem.itemId} · {selectedItem.category}
                </p>
                <h2
                  id="detail-modal-title"
                  className="font-display text-2xl font-bold text-[#0F294A] mt-1"
                >
                  {selectedItem.itemName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close item details"
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 pb-3 border-b border-slate-200">
              <StatusLabel status={selectedItem.status} />
              <span>Location: {selectedItem.location}</span>
              <span className="font-mono tabular-nums">Date: {selectedItem.date}</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500">Description</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selectedItem.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
              <div>
                <span className="text-slate-500 block">Department</span>
                <span className="font-medium text-slate-800">{selectedItem.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Visibility</span>
                <span className="font-medium text-slate-800">{selectedItem.contact}</span>
              </div>
            </div>

            {/* Possible Matches from C Engine */}
            <div className="space-y-2">
              <h3 className="font-display text-sm font-semibold text-[#0F294A]">
                {selectedItem.itemId.startsWith('FND-')
                  ? 'Possible Matching Lost Reports'
                  : 'Possible Matching Found Items'}
              </h3>
              {detailLoading ? (
                <p className="text-xs text-slate-500">Checking C matching engine...</p>
              ) : detailMatches.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No strong matching reports found yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {detailMatches.map((dm) => (
                    <div
                      key={dm.item.itemId}
                      className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#0F294A]">
                          {dm.item.itemName}{' '}
                          <span className="font-mono text-slate-500">({dm.item.itemId})</span>
                        </p>
                        <p className="text-slate-600 mt-0.5">{dm.reasons}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono tabular-nums font-bold text-[#0F294A]">
                          {dm.totalScore}/100
                        </p>
                        <p className="text-slate-500">{dm.tier}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Close
              </button>
              {selectedItem.itemId.startsWith('FND-') &&
                selectedItem.status === 'Available' && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedItem.itemId;
                      setSelectedItem(null);
                      onStartClaim(id);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg cursor-pointer"
                  >
                    Submit Recovery Claim
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
