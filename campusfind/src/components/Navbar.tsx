import { useState } from 'react';
import { Compass, Menu, X } from 'lucide-react';
import type { PageView } from '../types';

interface NavbarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  adminUsername: string | null;
}

const NAV_LINKS: { id: PageView; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'browse', label: 'Browse Items' },
  { id: 'report-lost', label: 'Report Lost' },
  { id: 'report-found', label: 'Report Found' },
  { id: 'claims', label: 'My Claims' },
  { id: 'about', label: 'About' },
];

export function Navbar({ currentPage, onNavigate, adminUsername }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: PageView) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Clean Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F294A] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-[#0F294A] text-white flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-[#0F294A] whitespace-nowrap">
            CampusFind
          </span>
        </button>

        {/* Zone 2: Clean Typography Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => {
            const active = currentPage === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNav(link.id)}
                className={`py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                  active
                    ? 'text-[#0F294A] border-[#0F294A]'
                    : 'text-slate-600 border-transparent hover:text-[#0F294A] hover:border-slate-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('admin')}
            className={`hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              currentPage === 'admin'
                ? 'bg-[#0D9488] text-white'
                : 'bg-[#0F294A] text-white hover:bg-[#163A66]'
            }`}
          >
            {adminUsername ? `Admin: ${adminUsername}` : 'Login / Admin'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNav(link.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                currentPage === link.id
                  ? 'bg-blue-50 text-[#0F294A]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNav('admin')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold bg-[#0F294A] text-white mt-2 cursor-pointer"
          >
            {adminUsername ? `Admin Dashboard (${adminUsername})` : 'Login / Admin'}
          </button>
        </div>
      )}
    </header>
  );
}
