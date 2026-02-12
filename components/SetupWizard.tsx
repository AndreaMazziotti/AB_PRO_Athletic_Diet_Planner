import React, { useState } from 'react';
import { SettimanaConfig, TipologiaGiornataConfig, MacroSplit } from '../types';
import { calculateMacrosFromPercentages } from '../utils';
import { TIPOLOGIE_GIORNATA } from '../constants';

const TOTAL_STEPS = 12;
const progressPercent = (step: number) => (step / TOTAL_STEPS) * 100;

function TrophyIcon({ className }: { className?: string }) {
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

function MeditationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M5.64 5.64l1.42 1.42" />
      <path d="M16.94 16.94l1.42 1.42" />
      <path d="M5.64 18.36l1.42-1.42" />
      <path d="M16.94 7.06l1.42-1.42" />
      <path d="M12 8a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.5" />
    </svg>
  );
}

interface SetupWizardProps {
  onComplete: (weeks: SettimanaConfig[], tipologie: TipologiaGiornataConfig[]) => void;
  initialWeeks?: SettimanaConfig[];
  initialTipologie?: TipologiaGiornataConfig[];
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, initialWeeks, initialTipologie }) => {
  const [step, setStep] = useState(1);

  const [weeks, setWeeks] = useState<SettimanaConfig[]>(() => {
    if (initialWeeks && initialWeeks.length > 0) return [...initialWeeks];
    return Array.from({ length: 5 }, (_, i) => ({
      numero: i + 1,
      giorniON: { calorieTotal: 2500, macros: calculateMacrosFromPercentages(2500, 40, 30, 30) },
      giorniOFF: { calorieTotal: 2000, macros: calculateMacrosFromPercentages(2000, 30, 35, 35) }
    }));
  });

  const [tipologie, setTipologie] = useState<TipologiaGiornataConfig[]>(() => {
    if (initialTipologie && initialTipologie.length > 0) return [...initialTipologie];
    return TIPOLOGIE_GIORNATA;
  });

  const handleKcalChange = (index: number, type: 'giorniON' | 'giorniOFF', value: number) => {
    setWeeks(prev => {
      const newWeeks = [...prev];
      const target = { ...newWeeks[index][type] };
      target.calorieTotal = value;
      target.macros = calculateMacrosFromPercentages(target.calorieTotal, 40, 30, 30);
      newWeeks[index][type] = target;
      return newWeeks;
    });
  };

  const handleMacroChange = (index: number, type: 'giorniON' | 'giorniOFF', macro: 'carboidrati' | 'proteine' | 'grassi', grams: number) => {
    setWeeks(prev => {
      const newWeeks = [...prev];
      const target = { ...newWeeks[index][type] };
      const newMacros = { ...target.macros };

      if (macro === 'carboidrati') newMacros.carboidrati = { grammi: grams, kcal: grams * 4 };
      if (macro === 'proteine') newMacros.proteine = { grammi: grams, kcal: grams * 4 };
      if (macro === 'grassi') newMacros.grassi = { grammi: grams, kcal: grams * 9 };

      target.macros = newMacros;
      target.calorieTotal = newMacros.carboidrati.kcal + newMacros.proteine.kcal + newMacros.grassi.kcal;

      newWeeks[index][type] = target;
      return newWeeks;
    });
  };

  const handleDistributionChange = (typeIndex: number, mealIndex: number, macro: 'carboidrati' | 'proteine' | 'grassi', value: number) => {
    setTipologie(prev => {
      const next = [...prev];
      const dists = [...next[typeIndex].distribuzioni];
      dists[mealIndex] = {
        ...dists[mealIndex],
        percentuali: {
          ...dists[mealIndex].percentuali,
          [macro]: value
        }
      };
      next[typeIndex] = { ...next[typeIndex], distribuzioni: dists };
      return next;
    });
  };

  const getDayTypeTotals = (typeIndex: number) => {
    const dists = tipologie[typeIndex].distribuzioni;
    return dists.reduce((acc, curr) => ({
      carboidrati: acc.carboidrati + curr.percentuali.carboidrati,
      proteine: acc.proteine + curr.percentuali.proteine,
      grassi: acc.grassi + curr.percentuali.grassi,
    }), { carboidrati: 0, proteine: 0, grassi: 0 });
  };

  const currentWeekIndex = step - 1;
  const currentTypeIndex = step - 6;

  if (step <= 5) {
    return (
      <div className="setup-wizard max-w-2xl mx-auto rounded-xl md:rounded-2xl transition-colors">
        <div className="setup-wizard-inner px-3 sm:px-4 md:px-10 pb-24 md:pb-12">
          {/* Header + progress bar */}
          <div className="mb-5 md:mb-8">
            <span className="text-brand-primary font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] block mb-1">FASE 1: ENERGIA E MACRO</span>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-white tracking-tight">Settimana {step}</h1>
            <div className="setup-progress-track mt-2 h-1.5 w-full rounded-full bg-[var(--background-main)] overflow-hidden">
              <div
                className="setup-progress-fill h-full rounded-full bg-brand-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent(step)}%` }}
              />
            </div>
          </div>

          <div key={step} className="setup-step-content space-y-4 md:space-y-6 animate-fade-in">
            <WeekSetupCard
              type="on"
              value={weeks[currentWeekIndex].giorniON.calorieTotal}
              macros={weeks[currentWeekIndex].giorniON.macros}
              onKcalChange={(val) => handleKcalChange(currentWeekIndex, 'giorniON', val)}
              onMacroChange={(macro, val) => handleMacroChange(currentWeekIndex, 'giorniON', macro, val)}
            />
            <WeekSetupCard
              type="off"
              value={weeks[currentWeekIndex].giorniOFF.calorieTotal}
              macros={weeks[currentWeekIndex].giorniOFF.macros}
              onKcalChange={(val) => handleKcalChange(currentWeekIndex, 'giorniOFF', val)}
              onMacroChange={(macro, val) => handleMacroChange(currentWeekIndex, 'giorniOFF', macro, val)}
            />
          </div>
        </div>

        {/* Sticky footer: safe area + AVANTI */}
        <div className="setup-footer fixed left-0 right-0 bottom-0 z-10 px-3 sm:px-4 md:relative md:left-auto md:right-auto md:bottom-auto md:px-0 md:mt-8 flex gap-2 md:gap-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-0 bg-[var(--background-main)] border-t border-[var(--border-color)] md:border-t-0 md:bg-transparent">
          <button
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3.5 md:py-4 border border-[var(--border-color)] rounded-2xl font-bold text-[var(--text-secondary)] hover:bg-[var(--background-secondary)] transition-all uppercase tracking-wider disabled:opacity-30 text-xs md:text-sm"
          >
            Indietro
          </button>
          <button
            onClick={() => setStep(step + 1)}
            className="setup-btn-next flex-1 py-3.5 md:py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary-hover shadow-lg transition-all uppercase tracking-wider text-xs md:text-sm"
          >
            {step < 5 ? 'Avanti' : 'Prossima fase'}
          </button>
        </div>
      </div>
    );
  }

  if (step >= 6 && step <= 12) {
    const currentType = tipologie[currentTypeIndex];
    const totals = getDayTypeTotals(currentTypeIndex);
    const isInvalid = totals.carboidrati !== 100 || totals.proteine !== 100 || totals.grassi !== 100;

    return (
      <div className="setup-wizard max-w-4xl mx-auto rounded-xl md:rounded-2xl transition-colors">
        <div className="setup-wizard-inner px-3 sm:px-4 md:px-10 pb-24 md:pb-12">
          <div className="mb-5 md:mb-8">
            <span className="text-brand-primary font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] block mb-1">FASE 2: DISTRIBUZIONE PASTI</span>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-white tracking-tight truncate">{currentType.label}</h1>
            <div className="setup-progress-track mt-2 h-1.5 w-full rounded-full bg-[var(--background-main)] overflow-hidden">
              <div
                className="setup-progress-fill h-full rounded-full bg-brand-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent(step)}%` }}
              />
            </div>
          </div>

          <div key={step} className="setup-step-content overflow-hidden border border-[var(--border-color)] rounded-xl md:rounded-2xl mb-6 bg-[var(--background-main)] animate-fade-in">
            <table className="w-full text-left table-fixed md:table-auto">
              <thead className="bg-[var(--background-secondary)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="pl-3 md:pl-6 py-2.5 md:py-4 text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider w-1/4 md:w-auto">Pasto</th>
                  <th className="px-1 md:px-4 py-2.5 md:py-4 text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase text-center tracking-wider">Carbs %</th>
                  <th className="px-1 md:px-4 py-2.5 md:py-4 text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase text-center tracking-wider">Prot %</th>
                  <th className="px-1 md:px-4 py-2.5 md:py-4 text-[10px] md:text-xs font-bold text-[var(--text-secondary)] uppercase text-center tracking-wider">Fat %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {currentType.distribuzioni.map((dist, idx) => (
                  <tr key={dist.pasto} className="hover:bg-[var(--background-secondary)]/50 transition-colors">
                    <td className="pl-3 md:pl-6 py-2 md:py-4 font-bold text-[var(--text-primary)] uppercase text-xs md:text-sm tracking-wider truncate pr-1">{dist.pasto}</td>
                    <td className="px-1 md:px-4 py-2 md:py-4 text-center">
                      <SetupInput value={dist.percentuali.carboidrati} onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'carboidrati', val)} />
                    </td>
                    <td className="px-1 md:px-4 py-2 md:py-4 text-center">
                      <SetupInput value={dist.percentuali.proteine} onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'proteine', val)} />
                    </td>
                    <td className="px-1 md:px-4 py-2 md:py-4 text-center">
                      <SetupInput value={dist.percentuali.grassi} onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'grassi', val)} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--background-secondary)] border-t border-[var(--border-color)]">
                <tr>
                  <td className="pl-3 md:pl-6 py-2.5 md:py-4 font-bold uppercase text-[10px] md:text-xs tracking-wider text-[var(--text-secondary)]">Totale</td>
                  <td className={`px-1 md:px-4 py-2.5 md:py-4 text-center font-bold text-sm md:text-xl tabular-nums ${totals.carboidrati === 100 ? 'text-[var(--text-primary)]' : 'text-brand-primary'}`}>
                    {totals.carboidrati}%
                  </td>
                  <td className={`px-1 md:px-4 py-2.5 md:py-4 text-center font-bold text-sm md:text-xl tabular-nums ${totals.proteine === 100 ? 'text-[var(--text-primary)]' : 'text-brand-primary'}`}>
                    {totals.proteine}%
                  </td>
                  <td className={`px-1 md:px-4 py-2.5 md:py-4 text-center font-bold text-sm md:text-xl tabular-nums ${totals.grassi === 100 ? 'text-[var(--text-primary)]' : 'text-brand-primary'}`}>
                    {totals.grassi}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {isInvalid && (
            <div className="bg-brand-primary/10 text-brand-primary text-xs md:text-sm font-bold mb-4 p-3 md:p-4 rounded-xl border border-brand-primary/30 flex items-center gap-2 uppercase tracking-wide">
              <span className="text-lg">⚠️</span> La somma deve essere 100%.
            </div>
          )}
        </div>

        <div className="setup-footer fixed left-0 right-0 bottom-0 z-10 px-3 sm:px-4 md:relative md:left-auto md:right-auto md:bottom-auto md:px-0 md:mt-6 flex gap-2 md:gap-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-0 bg-[var(--background-main)] border-t border-[var(--border-color)] md:border-t-0 md:bg-transparent">
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3.5 md:py-4 border border-[var(--border-color)] rounded-2xl font-bold text-[var(--text-secondary)] hover:bg-[var(--background-secondary)] transition-all uppercase tracking-wider text-xs md:text-sm touch-manipulation"
          >
            Indietro
          </button>
          <button
            disabled={isInvalid}
            onClick={() => {
              if (step === 12) onComplete(weeks, tipologie);
              else setStep(step + 1);
            }}
            className="setup-btn-next flex-1 py-3.5 md:py-4 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary-hover shadow-lg transition-all uppercase tracking-wider disabled:opacity-50 disabled:bg-gray-600 text-xs md:text-sm touch-manipulation"
          >
            {step === 12 ? 'Finalizza' : 'Prossimo'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const WeekSetupCard: React.FC<{
  type: 'on' | 'off';
  value: number;
  macros: MacroSplit;
  onKcalChange: (v: number) => void;
  onMacroChange: (macro: 'carboidrati' | 'proteine' | 'grassi', v: number) => void;
}> = ({ type, value, macros, onKcalChange, onMacroChange }) => {
  const isOn = type === 'on';
  const title = isOn ? 'GIORNI ON' : 'GIORNI OFF';

  return (
    <div className="p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] bg-[var(--background-secondary)] border border-[var(--border-color)]">
      <div className="flex items-center gap-2 mb-4 md:mb-5">
        {isOn ? (
          <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary shrink-0" />
        ) : (
          <MeditationIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-secondary)] shrink-0" />
        )}
        <h3 className="font-bold uppercase tracking-wider text-xs md:text-sm text-white">{title}</h3>
      </div>
      <div className="space-y-4 md:space-y-5">
        <div>
          <label className="block text-[10px] font-bold uppercase mb-1.5 tracking-wider text-[var(--text-secondary)]">Calorie totali</label>
          <div className="w-full setup-kcal-box rounded-xl md:rounded-2xl px-4 py-3 md:py-4 flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-bold text-white tabular-nums">{Math.round(value)}</span>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">kcal</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <MacroInput
            label="CARB (G)"
            value={macros.carboidrati.grammi}
            onChange={(v) => onMacroChange('carboidrati', v)}
          />
          <MacroInput
            label="PROT (G)"
            value={macros.proteine.grammi}
            onChange={(v) => onMacroChange('proteine', v)}
          />
          <MacroInput
            label="FAT (G)"
            value={macros.grassi.grammi}
            onChange={(v) => onMacroChange('grassi', v)}
          />
        </div>
      </div>
    </div>
  );
};

const MacroInput: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="setup-macro-input w-full bg-[var(--background-main)] border border-[var(--border-color)] rounded-lg px-2 py-2 md:py-2.5 text-center font-bold text-sm md:text-base text-[var(--text-primary)] outline-none transition-colors touch-manipulation"
      />
    </div>
  );
};

const SetupInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className="setup-macro-input w-12 md:w-20 bg-[var(--background-main)] border border-[var(--border-color)] rounded-lg px-1 md:px-2 py-2 text-center font-bold text-sm md:text-base text-[var(--text-primary)] outline-none transition-colors touch-manipulation mx-auto block"
    />
  );
};

export default SetupWizard;
