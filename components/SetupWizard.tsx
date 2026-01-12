
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
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-gray-200 dark:border-gray-800 transition-colors">
        <div className="mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-6">
          <div>
            <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-[0.3em] mb-2 block">Fase 1: Energia e Macro</span>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Settimana {step}</h2>
          </div>
          <span className="text-gray-500 dark:text-gray-400 text-xs font-black bg-gray-50 dark:bg-gray-800 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 uppercase tracking-widest self-start sm:self-auto">Passo {step} / 12</span>
        </div>

        <div className="space-y-10">
          <WeekSetupCard 
            title="🏋️ GIORNI ON (Allenamento)" 
            value={weeks[currentWeekIndex].giorniON.calorieTotal}
            macros={weeks[currentWeekIndex].giorniON.macros}
            onKcalChange={(val) => handleKcalChange(currentWeekIndex, 'giorniON', val)}
            onMacroChange={(macro, val) => handleMacroChange(currentWeekIndex, 'giorniON', macro, val)}
            color="indigo"
          />
          <WeekSetupCard 
            title="🧘 GIORNI OFF (Riposo)" 
            value={weeks[currentWeekIndex].giorniOFF.calorieTotal}
            macros={weeks[currentWeekIndex].giorniOFF.macros}
            onKcalChange={(val) => handleKcalChange(currentWeekIndex, 'giorniOFF', val)}
            onMacroChange={(macro, val) => handleMacroChange(currentWeekIndex, 'giorniOFF', macro, val)}
            color="emerald"
          />
        </div>

        <div className="mt-12 flex flex-col sm:flex-row justify-between gap-4">
          <button 
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex-1 px-10 py-5 border-4 border-gray-100 dark:border-gray-800 rounded-3xl font-black text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase tracking-widest disabled:opacity-20"
          >
            Indietro
          </button>
          <button 
            onClick={() => setStep(step + 1)}
            className="flex-1 px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all uppercase tracking-widest"
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
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-gray-200 dark:border-gray-800 transition-colors">
        <div className="mb-10 flex flex-col sm:flex-row justify-between sm:items-end gap-6">
          <div>
            <span className="text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-[0.3em] mb-2 block">Fase 2: Distribuzione Pasti</span>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight">{currentType.label}</h2>
          </div>
          <span className="text-gray-500 dark:text-gray-400 text-xs font-black bg-gray-50 dark:bg-gray-800 px-6 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 uppercase tracking-widest self-start sm:self-auto">Passo {step} / 12</span>
        </div>

        <div className="overflow-hidden border-2 border-gray-100 dark:border-gray-800 rounded-[2.5rem] shadow-sm mb-10 bg-white dark:bg-black/20">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/80 border-b-2 border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-8 py-6 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Pasto</th>
                <th className="px-4 py-6 text-xs font-black text-indigo-500 uppercase text-center tracking-widest">Carbs %</th>
                <th className="px-4 py-6 text-xs font-black text-rose-500 uppercase text-center tracking-widest">Prot %</th>
                <th className="px-4 py-6 text-xs font-black text-amber-600 uppercase text-center tracking-widest">Grassi %</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50 dark:divide-gray-800">
              {currentType.distribuzioni.map((dist, idx) => (
                <tr key={dist.pasto} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors">
                  <td className="px-8 py-6 font-black text-gray-800 dark:text-gray-200 uppercase text-sm tracking-wider">{dist.pasto}</td>
                  <td className="px-4 py-6 text-center">
                    <SetupInput 
                      value={dist.percentuali.carboidrati} 
                      onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'carboidrati', val)} 
                      color="indigo" 
                    />
                  </td>
                  <td className="px-4 py-6 text-center">
                    <SetupInput 
                      value={dist.percentuali.proteine} 
                      onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'proteine', val)} 
                      color="rose" 
                    />
                  </td>
                  <td className="px-4 py-6 text-center">
                    <SetupInput 
                      value={dist.percentuali.grassi} 
                      onChange={(val) => handleDistributionChange(currentTypeIndex, idx, 'grassi', val)} 
                      color="amber" 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-900 dark:bg-black text-white">
              <tr>
                <td className="px-8 py-8 font-black uppercase text-xs tracking-[0.2em] text-gray-500">Somma Totale</td>
                <td className={`px-4 py-8 text-center font-black text-2xl ${totals.carboidrati === 100 ? 'text-emerald-400' : 'text-rose-500 underline decoration-4'}`}>
                  {totals.carboidrati}%
                </td>
                <td className={`px-4 py-8 text-center font-black text-2xl ${totals.proteine === 100 ? 'text-emerald-400' : 'text-rose-500 underline decoration-4'}`}>
                  {totals.proteine}%
                </td>
                <td className={`px-4 py-8 text-center font-black text-2xl ${totals.grassi === 100 ? 'text-emerald-400' : 'text-rose-500 underline decoration-4'}`}>
                  {totals.grassi}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {isInvalid && (
          <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-sm font-black mb-10 p-6 rounded-3xl border-2 border-rose-100 dark:border-rose-900/50 flex items-center gap-4 uppercase tracking-widest">
            <span className="text-3xl">⚠️</span> La somma di ogni colonna deve essere 100 per procedere.
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <button 
            onClick={() => setStep(step - 1)}
            className="flex-1 px-10 py-5 border-4 border-gray-100 dark:border-gray-800 rounded-3xl font-black text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase tracking-widest"
          >
            Indietro
          </button>
          <button 
            disabled={isInvalid}
            onClick={() => {
              if (step === 12) onComplete(weeks, tipologie);
              else setStep(step + 1);
            }}
            className="flex-1 px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all uppercase tracking-widest disabled:opacity-20"
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
    <div className={`p-8 rounded-[2.5rem] border-2 ${borderClass} ${bgClass}`}>
      <h3 className={`font-black uppercase tracking-widest text-sm mb-6 ${textClass}`}>{title}</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-[11px] font-black opacity-50 uppercase mb-2 tracking-widest">CALORIE TOTALI (Ricalcolate dai macro)</label>
          <div className="w-full bg-white dark:bg-gray-950 border-4 border-transparent rounded-3xl px-8 py-5 text-3xl font-black text-gray-900 dark:text-white shadow-inner">
             {Math.round(value)} <span className="text-sm opacity-40">kcal</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <MacroInput 
            label="Carboidrati (g)" 
            value={macros.carboidrati.grammi} 
            onChange={(v) => onMacroChange('carboidrati', v)} 
            color="indigo" 
          />
          <MacroInput 
            label="Proteine (g)" 
            value={macros.proteine.grammi} 
            onChange={(v) => onMacroChange('proteine', v)} 
            color="rose" 
          />
          <MacroInput 
            label="Grassi (g)" 
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
    indigo: 'focus:border-indigo-500 text-indigo-600',
    rose: 'focus:border-rose-500 text-rose-600',
    amber: 'focus:border-amber-600 text-amber-600'
  };
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black opacity-50 uppercase tracking-tight text-center">{label}</label>
      <input 
        type="number" 
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`w-full bg-white dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-center font-black text-xl outline-none transition-all ${colorMap[color]}`}
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
      className={`w-24 bg-gray-100 dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-center font-black text-xl outline-none transition-all ${colorMap[color]}`}
    />
  );
};

export default SetupWizard;
