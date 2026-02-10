
import React, { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'theme';

function getTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  localStorage.setItem(THEME_KEY, theme);
}

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  isConfigured: boolean;
}

const LOGO_SRC = '/AB_Nutrition_logo.png';

const Header: React.FC<HeaderProps> = ({ currentTab, setTab, isConfigured }) => {
  const [logoError, setLogoError] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }, [theme]);

  return (
    <header
      className={`app-header sticky top-0 z-50 ${scrolled ? 'is-scrolled' : ''}`}
    >
      {/* Row 1: Logo (left) + Theme Toggle (right) */}
      <div className="max-w-4xl mx-auto px-3 pl-3 pr-3 md:px-4 md:pr-6 py-3 flex items-center justify-between gap-3 min-h-[52px] md:min-h-[60px]">
        <h1
          className="flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer select-none shrink-0"
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
        <div className="flex items-center shrink-0 ml-auto">
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn p-2 rounded-full text-[var(--text-primary)] transition-colors min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center touch-manipulation"
            aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* Row 2: Navigation (sotto, discreta) */}
      {isConfigured && (
        <div className="max-w-4xl mx-auto px-3 pb-2 pt-0 md:px-4">
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

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
