
import React, { useState } from 'react';
import { SettimanaConfig, TipologiaGiornataConfig, MacroSplit } from '../types';
import { calculateMacrosFromPercentages } from '../utils';
import { TIPOLOGIE_GIORNATA } from '../constants';

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
      <div className="max-w-2xl mx-auto bg-[var(--background-secondary)] p-4 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-[var(--border-color)] transition-colors">
        <div className="mb-6 md:mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-3 md:gap-6">
          <div>
            <span className="text-brand-primary font-black text-xs md:text-sm uppercase tracking-[0.3em] mb-1 md:mb-2 block">Fase 1: Energia e Macro</span>
            <h2 className="text-2xl md:text-4xl font-black text-[var(--text-primary)] tracking-tighter">Settimana {step}</h2>
          </div>
          <span className="text-[var(--text-secondary)] text-[10px] md:text-xs font-black bg-[var(--background-main)] px-4 py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-[var(--border-color)] uppercase tracking-widest self-start sm:self-auto">Passo {step} / 12</span>
        </div>

        <div className="space-y-6 md:space-y-10">
          <WeekSetupCard
            title="🏋️ GIORNI ON"
            value={weeks[currentWeekIndex].giorniON.calorieTotal}
            macros={weeks[currentWeekIndex].giorniON.macros}
            onKcalChange={(val) => handleKcalChange(currentWeekIndex, 'giorniON', val)}
            onMacroChange={(macro, val) => handleMacroChange(currentWeekIndex, 'giorniON', macro, val)}
            color="indigo"
          />
          <WeekSetupCard
            title="🧘 GIORNI OFF"
            value={weeks[currentWeekIndex].giorniOFF.calorieTotal}
            macros={weeks[currentWeekIndex].giorniOFF.macros}
            onKcalChange={(val) => handleKcalChange(currentWeekIndex, 'giorniOFF', val)}
            onMacroChange={(macro, val) => handleMacroChange(currentWeekIndex, 'giorniOFF', macro, val)}
            color="emerald"
          />
        </div>

        <div className="mt-8 md:mt-12 flex gap-3 md:gap-4">
          <button
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex-1 py-4 md:py-5 border-2 md:border-4 border-[var(--border-color)] rounded-2xl md:rounded-3xl font-black text-[var(--text-secondary)] hover:bg-[var(--background-main)] transition-all uppercase tracking-widest disabled:opacity-20 text-xs md:text-base"
          >
            Indietro
          </button>
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 py-4 md:py-5 bg-brand-primary text-white rounded-2xl md:rounded-3xl font-black hover:bg-brand-primary-hover shadow-xl transition-all uppercase tracking-widest text-xs md:text-base"
          >
            Continua
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
      <div className="max-w-4xl mx-auto bg-[var(--background-secondary)] p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-[var(--border-color)] transition-colors">
        <div className="mb-8 md:mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-4 md:gap-6">
          <div>
            <span className="text-brand-primary font-black text-sm uppercase tracking-[0.2em] mb-2 block">Fase 2: Distribuzione Pasti</span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tighter leading-tight truncate">{currentType.label}</h2>
          </div>
          <span className="text-[var(--text-secondary)] text-xs font-black bg-[var(--background-main)] px-4 py-2 rounded-xl border border-[var(--border-color)] uppercase tracking-widest self-start sm:self-auto">Passo {step} / 12</span>
        </div>

        <div className="overflow-hidden border-2 border-[var(--border-color)] rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm mb-6 md:mb-10 bg-[var(--background-main)]">
          <table className="w-full text-left table-fixed md:table-auto">
            <thead className="bg-[var(--background-secondary)] border-b-2 border-[var(--border-color)]">
              <tr>
                <th className="pl-3 md:pl-8 py-3 md:py-6 text-[10px] md:text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest w-1/4 md:w-auto">Pasto</th>
                <th className="px-0.5 md:px-4 py-3 md:py-6 text-[10px] md:text-xs font-black text-indigo-600 uppercase text-center tracking-widest">Carbs %</th>
                <th className="px-0.5 md:px-4 py-3 md:py-6 text-[10px] md:text-xs font-black text-rose-600 uppercase text-center tracking-widest">Prot %</th>
                <th className="px-0.5 md:px-4 py-3 md:py-6 text-[10px] md:text-xs font-black text-amber-600 uppercase text-center tracking-widest">Fat %</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[var(--border-color)]">
              {currentType.distribuzioni.map((dist, idx) => (
                <tr key={dist.pasto} className="hover:bg-[var(--background-main)] transition-colors">
                  <td className="pl-3 md:pl-8 py-2 md:py-6 font-black text-[var(--text-primary)] uppercase text-xs md:text-base tracking-wider truncate pr-1">{dist.pasto}</td>
                  <td className="px-0.5 md:px-4 py-2 md:py-6 text-center">
                    <SetupInput
                      value={dist.percentuali.carboidrati}
                      onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'carboidrati', val)}
                      color="indigo"
                    />
                  </td>
                  <td className="px-0.5 md:px-4 py-2 md:py-6 text-center">
                    <SetupInput
                      value={dist.percentuali.proteine}
                      onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'proteine', val)}
                      color="rose"
                    />
                  </td>
                  <td className="px-0.5 md:px-4 py-2 md:py-6 text-center">
                    <SetupInput
                      value={dist.percentuali.grassi}
                      onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'grassi', val)}
                      color="amber"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#1A1A1A] text-white dark:bg-black">
              <tr>
                <td className="pl-3 md:px-8 py-3 md:py-8 font-black uppercase text-[10px] md:text-xs tracking-[0.2em] text-gray-300">Totale</td>
                <td className={`px-0.5 md:px-4 py-3 md:py-8 text-center font-black text-base md:text-2xl ${totals.carboidrati === 100 ? 'text-emerald-400' : 'text-rose-500 underline decoration-4'}`}>
                  {totals.carboidrati}%
                </td>
                <td className={`px-0.5 md:px-4 py-3 md:py-8 text-center font-black text-base md:text-2xl ${totals.proteine === 100 ? 'text-emerald-400' : 'text-rose-500 underline decoration-4'}`}>
                  {totals.proteine}%
                </td>
                <td className={`px-0.5 md:px-4 py-3 md:py-8 text-center font-black text-base md:text-2xl ${totals.grassi === 100 ? 'text-emerald-400' : 'text-rose-500 underline decoration-4'}`}>
                  {totals.grassi}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {isInvalid && (
          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs md:text-sm font-bold mb-6 p-4 md:p-6 rounded-2xl border-2 border-rose-200 dark:border-rose-900/50 flex items-center gap-2 md:gap-3 uppercase tracking-wide leading-relaxed">
            <span className="text-xl md:text-2xl">⚠️</span> Somma != 100.
          </div>
        )}

        <div className="flex gap-3 md:gap-6">
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3 md:py-5 border-2 md:border-4 border-[var(--border-color)] rounded-xl md:rounded-3xl font-black text-[var(--text-secondary)] hover:bg-[var(--background-main)] transition-all uppercase tracking-widest text-xs md:text-sm touch-manipulation"
          >
            Indietro
          </button>
          <button
            disabled={isInvalid}
            onClick={() => {
              if (step === 12) onComplete(weeks, tipologie);
              else setStep(step + 1);
            }}
            className="flex-1 py-3 md:py-5 bg-brand-primary text-white rounded-xl md:rounded-3xl font-black hover:bg-brand-primary-hover shadow-xl transition-all uppercase tracking-widest disabled:opacity-50 disabled:bg-gray-500 text-xs md:text-sm touch-manipulation"
          >
            {step === 12 ? 'FINALIZZA' : 'PROSSIMO'}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

const WeekSetupCard: React.FC<{
  title: string;
  value: number;
  macros: MacroSplit;
  onKcalChange: (v: number) => void;
  onMacroChange: (macro: 'carboidrati' | 'proteine' | 'grassi', v: number) => void;
  color: string
}> = ({ title, value, macros, onKcalChange, onMacroChange, color }) => {
  const accent = color === 'indigo' ? 'indigo' : 'emerald';
  const borderClass = accent === 'indigo' ? 'border-indigo-100 dark:border-indigo-900/40' : 'border-emerald-100 dark:border-emerald-900/40';
  const bgClass = accent === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20';
  const textClass = accent === 'indigo' ? 'text-indigo-900 dark:text-indigo-200' : 'text-emerald-900 dark:text-emerald-200';

  return (
    <div className={`p-4 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 ${borderClass} ${bgClass}`}>
      <h3 className={`font-black uppercase tracking-widest text-xs md:text-sm mb-4 md:mb-6 ${textClass}`}>{title}</h3>
      <div className="space-y-4 md:space-y-6">
        <div>
          <label className="block text-[10px] md:text-[11px] font-black opacity-60 uppercase mb-1 md:mb-2 tracking-widest text-[var(--text-secondary)]">CALORIE TOTALI (Ricalcolate)</label>
          <div className="w-full bg-[var(--background-main)] border-4 border-transparent rounded-2xl md:rounded-3xl px-4 md:px-6 py-3 md:py-4 text-2xl md:text-3xl font-black text-[var(--text-primary)] shadow-sm">
            {Math.round(value)} <span className="text-xs md:text-sm opacity-40 font-bold">kcal</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <MacroInput
            label="Carb (g)"
            value={macros.carboidrati.grammi}
            onChange={(v) => onMacroChange('carboidrati', v)}
            color="indigo"
          />
          <MacroInput
            label="Prot (g)"
            value={macros.proteine.grammi}
            onChange={(v) => onMacroChange('proteine', v)}
            color="rose"
          />
          <MacroInput
            label="Fat (g)"
            value={macros.grassi.grammi}
            onChange={(v) => onMacroChange('grassi', v)}
            color="amber"
          />
        </div>
      </div>
    </div>
  );
};

const MacroInput: React.FC<{ label: string, value: number, onChange: (v: number) => void, color: string }> = ({ label, value, onChange, color }) => {
  const colorMap: any = {
    indigo: 'focus:border-indigo-500 text-indigo-700',
    rose: 'focus:border-rose-500 text-rose-700',
    amber: 'focus:border-amber-600 text-amber-700'
  };
  return (
    <div className="space-y-1 md:space-y-2">
      <label className="block text-[10px] md:text-[11px] font-black opacity-60 uppercase tracking-tight text-center text-[var(--text-secondary)]">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`w-full bg-[var(--background-main)] border-2 border-[var(--border-color)] rounded-xl md:rounded-2xl px-1 md:px-4 py-2 md:py-3 text-center font-black text-lg md:text-xl outline-none transition-all ${colorMap[color]} touch-manipulation`}
      />
    </div>
  );
}

const SetupInput: React.FC<{ value: number; onChange: (v: number) => void; color: 'indigo' | 'rose' | 'amber' }> = ({ value, onChange, color }) => {
  const colorMap = {
    indigo: 'focus:border-indigo-500 text-indigo-700 dark:text-indigo-300',
    rose: 'focus:border-rose-500 text-rose-700 dark:text-rose-300',
    amber: 'focus:border-amber-500 text-amber-700 dark:text-amber-300'
  };

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className={`w-12 md:w-24 bg-[var(--background-main)] border-2 border-[var(--border-color)] rounded-lg md:rounded-2xl px-0 md:px-3 py-2 md:py-3 text-center font-black text-base md:text-xl outline-none transition-all ${colorMap[color]} touch-manipulation`}
    />
  );
};

export default SetupWizard;
