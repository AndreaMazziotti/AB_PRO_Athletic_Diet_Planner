
import React from 'react';

interface HeaderProps {
  currentTab: string;
  setTab: (tab: string) => void;
  isConfigured: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentTab, setTab, isConfigured }) => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <h1
          className="text-lg md:text-2xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setTab('dashboard')}
        >
          <span className="text-2xl md:text-3xl">🍽️</span>
          <span className="tracking-tight leading-none">AB PRO Athletic Diet Planner</span>
        </h1>
        {isConfigured && (
          <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            <TabButton active={currentTab === 'dashboard'} onClick={() => setTab('dashboard')}>Dashboard</TabButton>
            <TabButton active={currentTab === 'diary'} onClick={() => setTab('diary')}>Diario</TabButton>
            <TabButton active={currentTab === 'foods'} onClick={() => setTab('foods')}>Alimenti</TabButton>
            <TabButton active={currentTab === 'config'} onClick={() => setTab('config')}>Setup</TabButton>
          </nav>
        )}
      </div>
    </header>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
        : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-800'
      }`}
  >
    {children}
  </button>
);

export default Header;
