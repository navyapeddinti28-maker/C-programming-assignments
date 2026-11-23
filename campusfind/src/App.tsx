import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { AboutPage } from './components/AboutPage';
import { AdminPage } from './components/AdminPage';
import { BrowsePage } from './components/BrowsePage';
import { ClaimsPage } from './components/ClaimsPage';
import { HomePage } from './components/HomePage';
import { Navbar } from './components/Navbar';
import { ReportItemPage } from './components/ReportItemPage';
import type { DashboardStats, ItemRecord, PageView } from './types';

export default function App() {
  const [page, setPage] = useState<PageView>('home');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentFound, setRecentFound] = useState<ItemRecord[]>([]);
  const [loadingHome, setLoadingHome] = useState(true);

  // Cross-page handoffs
  const [inspectItem, setInspectItem] = useState<ItemRecord | null>(null);
  const [claimItemId, setClaimItemId] = useState<string>('');

  // Admin Bearer token kept strictly in React memory (never localStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);

  const refreshHomeData = useCallback(async () => {
    setLoadingHome(true);
    try {
      const [s, f] = await Promise.all([api.getStats(), api.getFoundItems()]);
      setStats(s);
      setRecentFound(f);
    } catch {
      /* handled gracefully by empty/loading states */
    } finally {
      setLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    refreshHomeData();
  }, [refreshHomeData]);

  const handleStartClaim = (itemId: string) => {
    setClaimItemId(itemId);
    setPage('claims');
  };

  const handleInspectItem = (item: ItemRecord) => {
    setInspectItem(item);
    setPage('browse');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        currentPage={page}
        onNavigate={setPage}
        adminUsername={adminUsername}
      />

      <main className="flex-1">
        {page === 'home' && (
          <HomePage
            stats={stats}
            recentFound={recentFound}
            loading={loadingHome}
            onNavigate={setPage}
            onInspectItem={handleInspectItem}
          />
        )}

        {page === 'browse' && (
          <BrowsePage
            initialItem={inspectItem}
            onClearInitialItem={() => setInspectItem(null)}
            onStartClaim={handleStartClaim}
          />
        )}

        {page === 'report-lost' && (
          <ReportItemPage
            mode="lost"
            onSubmitted={refreshHomeData}
            onStartClaim={handleStartClaim}
          />
        )}

        {page === 'report-found' && (
          <ReportItemPage
            mode="found"
            onSubmitted={refreshHomeData}
            onStartClaim={handleStartClaim}
          />
        )}

        {page === 'claims' && (
          <ClaimsPage
            prefillItemId={claimItemId}
            onClaimSubmitted={refreshHomeData}
          />
        )}

        {page === 'about' && <AboutPage />}

        {page === 'admin' && (
          <AdminPage
            token={adminToken}
            username={adminUsername}
            onAuthenticated={(tok, user) => {
              setAdminToken(tok);
              setAdminUsername(user);
            }}
            onLoggedOut={() => {
              setAdminToken(null);
              setAdminUsername(null);
            }}
            onDataChanged={refreshHomeData}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[#0F294A]">CampusFind</span>
            <span aria-hidden="true">·</span>
            <span>Campus Lost &amp; Found Management System</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setPage('browse')}
              className="hover:text-[#0F294A] cursor-pointer"
            >
              Browse Items
            </button>
            <button
              type="button"
              onClick={() => setPage('report-lost')}
              className="hover:text-[#0F294A] cursor-pointer"
            >
              Report Lost
            </button>
            <button
              type="button"
              onClick={() => setPage('claims')}
              className="hover:text-[#0F294A] cursor-pointer"
            >
              My Claims
            </button>
            <button
              type="button"
              onClick={() => setPage('about')}
              className="hover:text-[#0F294A] cursor-pointer"
            >
              About &amp; Documentation
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
