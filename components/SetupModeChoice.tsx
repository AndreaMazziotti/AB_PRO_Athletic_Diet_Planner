
import React from 'react';

function ProIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function EasyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

export type SetupModeChoice = 'pro' | 'facile';

interface SetupModeChoiceProps {
  selected: SetupModeChoice | null;
  onSelect: (mode: SetupModeChoice) => void;
  onConfirm: () => void;
}

const SetupModeChoiceScreen: React.FC<SetupModeChoiceProps> = ({ selected, onSelect, onConfirm }) => {
  return (
    <div className="setup-mode-choice max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">Scegli il tuo percorso</h2>
        <p className="text-[var(--text-secondary)] font-medium max-w-md mx-auto leading-relaxed">
          Seleziona la modalità che preferisci per configurare il tuo piano alimentare.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <button
          type="button"
          onClick={() => onSelect('pro')}
          className={`setup-mode-card group relative p-6 md:p-8 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-4 ${
            selected === 'pro'
              ? 'border-[var(--brand-primary)] bg-[var(--background-secondary)] shadow-[0_0_0_1px_var(--brand-primary)]'
              : 'border-[var(--border-color)] bg-[var(--background-secondary)] hover:border-[var(--text-secondary)] hover:bg-[var(--background-main)]'
          }`}
          style={{ borderRadius: 16 }}
        >
          {selected === 'pro' && (
            <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-[var(--brand-primary)]" aria-hidden />
          )}
          <div className="flex items-center gap-3">
            <ProIcon className={`w-10 h-10 shrink-0 ${selected === 'pro' ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'}`} />
            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">PRO</h3>
          </div>
          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
            Controllo totale su calorie, macro e progressioni settimanali. Ideale per esperti.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect('facile')}
          className={`setup-mode-card group relative p-6 md:p-8 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-4 ${
            selected === 'facile'
              ? 'border-[var(--brand-primary)] bg-[var(--background-secondary)] shadow-[0_0_0_1px_var(--brand-primary)]'
              : 'border-[var(--border-color)] bg-[var(--background-secondary)] hover:border-[var(--text-secondary)] hover:bg-[var(--background-main)]'
          }`}
          style={{ borderRadius: 16 }}
        >
          {selected === 'facile' && (
            <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-[var(--brand-primary)]" aria-hidden />
          )}
          <div className="flex items-center gap-3">
            <EasyIcon className={`w-10 h-10 shrink-0 ${selected === 'facile' ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'}`} />
            <h3 className="text-xl font-black text-[var(--text-primary)] tracking-tight">FACILE</h3>
          </div>
          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
            Imposta il tuo obiettivo e lascia che l&apos;app calcoli la distribuzione ideale dei pasti per te. Ideale per chi inizia.
          </p>
        </button>
      </div>

      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selected}
          className="py-4 px-10 rounded-2xl font-black uppercase tracking-widest text-sm bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 disabled:bg-[var(--ui-disabled-bg)] transition-all shadow-lg"
          style={{ borderRadius: 16 }}
        >
          Continua
        </button>
      </div>
    </div>
  );
};

export default SetupModeChoiceScreen;
