import { useState } from 'react';
import { ArrowRight, Compass, Search, ShieldCheck, Sparkles } from 'lucide-react';
import type { DashboardStats, ItemRecord, PageView } from '../types';
import { CategoryIcon, StatusLabel } from './StatusIndicator';

interface HomePageProps {
  stats: DashboardStats | null;
  recentFound: ItemRecord[];
  loading: boolean;
  onNavigate: (page: PageView) => void;
  onInspectItem: (item: ItemRecord) => void;
}

export function HomePage({
  stats,
  recentFound,
  loading,
  onNavigate,
  onInspectItem,
}: HomePageProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [flatlayFailed, setFlatlayFailed] = useState(false);

  const kpis = [
    {
      label: 'Total Lost Items',
      value: stats?.totalLost ?? 0,
      note: `${stats?.activeLost ?? 0} currently active`,
    },
    {
      label: 'Total Found Items',
      value: stats?.totalFound ?? 0,
      note: `${stats?.availableFound ?? 0} awaiting claim`,
    },
    {
      label: 'Items Returned',
      value: stats?.itemsReturned ?? 0,
      note: 'Verified handovers',
    },
    {
      label: 'Pending Claims',
      value: stats?.pendingClaims ?? 0,
      note: 'Under admin review',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <p className="text-sm font-semibold text-[#0D9488] tracking-wide">
                Campus Lost &amp; Found Management System
              </p>
              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#0F294A] leading-[1.12] [text-wrap:balance]">
                Lost Something? Find It. Found Something? Return It.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                CampusFind connects students and campus staff through a centralized recovery portal.
                Report missing belongings, register found items, compare rule-based match scores,
                and track verified ownership claims in one place.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('report-lost')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0F294A] hover:bg-[#163A66] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Report Lost Item</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('report-found')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Report Found Item</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('browse')}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#0F294A] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>Browse Items</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_campus_commons_1795419076806.jpg"
                    alt="Modern university student commons and study atrium"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-blue-50">
                    <Compass className="w-12 h-12 text-[#0F294A] mb-3" />
                    <p className="font-display font-semibold text-[#0F294A]">
                      Central Campus Recovery Desk
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-Column Live Statistics Strip */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5"
              >
                <p className="text-xs font-medium text-slate-600">{kpi.label}</p>
                {loading && !stats ? (
                  <div className="h-8 w-16 bg-slate-200 rounded mt-2 animate-pulse" />
                ) : (
                  <p className="font-mono tabular-nums text-3xl font-bold text-[#0F294A] mt-1">
                    {kpi.value}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">{kpi.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Reported Found Items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F294A]">
              Recently Reported Found Items
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Live records retrieved from campus recovery storage. Inspect any item to verify or claim.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('browse')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F294A] hover:text-blue-700 cursor-pointer whitespace-nowrap"
          >
            <span>View all items</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {loading && recentFound.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 animate-pulse"
              >
                <div className="h-5 w-2/3 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : recentFound.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="font-display font-semibold text-slate-800">
              No found items have been registered yet.
            </p>
            <p className="text-sm text-slate-600 mt-1">
              If you found a misplaced item on campus, register it so its owner can claim it.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('report-found')}
              className="mt-4 px-4 py-2 text-sm font-semibold bg-[#0D9488] text-white rounded-lg hover:bg-[#0F766E] cursor-pointer"
            >
              Register Found Item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentFound.slice(0, 4).map((item) => (
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

                  <h3 className="font-display text-base font-semibold text-[#0F294A] line-clamp-1">
                    {item.itemName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.category} <span aria-hidden="true">·</span>{' '}
                    <span className="font-mono tabular-nums">{item.itemId}</span>
                  </p>
                  <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 truncate">
                    <span>{item.location}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono tabular-nums">{item.date}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspectItem(item)}
                    className="text-xs font-semibold text-[#0F294A] hover:text-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* How It Works & Smart Matching Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F294A]">
                How CampusFind Works
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                A transparent three-step workflow designed to protect student privacy while making
                campus recoveries fast and verifiable.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-[#0D9488] pt-0.5 shrink-0">
                  01.
                </span>
                <div>
                  <h3 className="font-display font-semibold text-[#0F294A]">
                    Report Lost or Found Belongings
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Students log lost items or turn in found belongings with location, date, and
                    category metadata. Sensitive ID cards and personal contact details are masked
                    from public listings.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-[#0D9488] pt-0.5 shrink-0">
                  02.
                </span>
                <div>
                  <h3 className="font-display font-semibold text-[#0F294A]">
                    Rule-Based Smart Item Matching
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Our weighted C matching engine compares item names (30 pts), categories (20 pts),
                    description keywords (20 pts), campus locations (20 pts), and date proximity
                    (10 pts) to highlight likely matches out of 100.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <span className="font-mono text-sm font-semibold text-[#0D9488] pt-0.5 shrink-0">
                  03.
                </span>
                <div>
                  <h3 className="font-display font-semibold text-[#0F294A]">
                    Submit Claim &amp; Admin Verification
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Owners submit ownership proof for a found item. A CampusFind Administrator
                    verifies the proof before approving pickup and marking the item Returned.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F294A] border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
                <span>About Project &amp; Architecture</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('claims')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F294A] rounded-lg hover:bg-[#163A66] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Submit or Track a Claim</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3]">
              {!flatlayFailed ? (
                <img
                  src="/src/assets/images/campus_belongings_flatlay_1795419076610.jpg"
                  alt="Common student essentials including laptop, notebook, water bottle, glasses, and keys"
                  referrerPolicy="no-referrer"
                  onError={() => setFlatlayFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <Search className="w-10 h-10 text-[#0F294A] mb-2" />
                  <p className="text-sm font-medium text-slate-700">
                    Structured Matching Across 8 Campus Categories
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
