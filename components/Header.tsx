
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  isConfigured: boolean;
}

const LOGO_SRC = '/AB_Nutrition_logo.png';

const Header: React.FC<HeaderProps> = ({ currentTab, setTab, isConfigured }) => {
  const [logoError, setLogoError] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`app-header sticky top-0 z-50 ${scrolled ? 'is-scrolled' : ''}`}
    >
      {/* Row 1: Logo (left) + Icon (right) */}
      <div className="max-w-4xl mx-auto px-4 pl-4 pr-5 md:pr-6 py-3 flex items-center justify-between gap-3">
        <h1
          className="flex items-center min-h-[44px] min-w-[44px] cursor-pointer select-none shrink-0"
          onClick={() => setTab('dashboard')}
          role="button"
          aria-label="Torna alla Dashboard"
        >
          {!logoError ? (
            <div className="logo-header-wrap flex items-center">
              <img
                src={LOGO_SRC}
                alt="AB Nutrition"
                className="logo-header logo-header-simplified w-auto"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <span className="text-xl md:text-2xl font-black text-brand-primary" aria-hidden>AB</span>
          )}
        </h1>
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            type="button"
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Profilo"
          >
            <ProfileIcon />
          </button>
        </div>
      </div>

      {/* Row 2: Navigation (sotto, discreta) */}
      {isConfigured && (
        <div className="max-w-4xl mx-auto px-4 pb-2 pt-0">
          <nav className="nav-bar flex items-center gap-0 overflow-x-auto no-scrollbar pt-3">
            <TabButton active={currentTab === 'dashboard'} onClick={() => setTab('dashboard')}>
              Dashboard
            </TabButton>
            <TabButton active={currentTab === 'diary'} onClick={() => setTab('diary')}>
              Diario
            </TabButton>
            <TabButton active={currentTab === 'foods'} onClick={() => setTab('foods')}>
              Alimenti
            </TabButton>
            <TabButton active={currentTab === 'config'} onClick={() => setTab('config')}>
              Setup
            </TabButton>
          </nav>
        </div>
      )}
    </header>
  );
};

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20v-2a5 5 0 0 1 10 0v2" />
    </svg>
  );
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`nav-tab whitespace-nowrap ${active ? 'is-active' : ''}`}
  >
    {children}
  </button>
);

export default Header;
