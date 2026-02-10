
import React from 'react';
import { AppState, PastoComposto } from '../types';
import { calculateMacroFromAlimento } from '../utils';

interface DiaryProps {
  state: AppState;
  onDateSelect: (date: string) => void;
}

const Diary: React.FC<DiaryProps> = ({ state, onDateSelect }) => {
  const today = new Date();
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (89 - i));
    return d.toISOString().split('T')[0];
  });

  const getDayPrecision = (date: string) => {
    const dailySetup = state.dailySetups.find(s => s.date === date);
    if (!dailySetup) return 'empty';

    const dayType = state.tipologie.find(t => t.tipo === dailySetup.tipologiaGiornata);
    const week = state.settimane.find(w => w.numero === dailySetup.settimana);
    if (!dayType || !week) return 'empty';

    const isON = dayType.categoria === 'ON';
    const target = isON ? week.giorniON : week.giorniOFF;
    const targets = target.macros;

    const meals = state.pastiSalvati.filter(p => p.data === date);
    if (meals.length === 0) return 'empty';

    const hasCheat = meals.some(m => m.status === 'cheat');
    const allSkipped = meals.length > 0 && meals.every(m => m.status === 'skipped');

    if (allSkipped) return 'skipped';
    if (hasCheat) return 'cheat';

    const actuals = meals.reduce((acc, meal) => {
      if (meal.status === 'skipped') return acc;
      const itemsTotals = meal.alimenti.reduce((iAcc, curr) => {
        const a = state.alimenti.find(x => x.id === curr.alimentoId);
        if (!a) return iAcc;
        const m = calculateMacroFromAlimento(a.per100g, curr.quantita);
        return {
          carbs: iAcc.carbs + m.carboidrati,
          prot: iAcc.prot + m.proteine,
          fat: iAcc.fat + m.grassi,
          kcal: iAcc.kcal + m.kcal
        };
      }, { carbs: 0, prot: 0, fat: 0, kcal: 0 });
      
      return {
        carbs: acc.carbs + itemsTotals.carbs,
        prot: acc.prot + itemsTotals.prot,
        fat: acc.fat + itemsTotals.fat,
        kcal: acc.kcal + itemsTotals.kcal
      };
    }, { carbs: 0, prot: 0, fat: 0, kcal: 0 });

    // Calcolo scostamento percentuale medio tra i 3 macro
    const diffCarbs = Math.abs(actuals.carbs - targets.carboidrati.grammi) / targets.carboidrati.grammi;
    const diffProt = Math.abs(actuals.prot - targets.proteine.grammi) / targets.proteine.grammi;
    const diffFat = Math.abs(actuals.fat - targets.grassi.grammi) / targets.grassi.grammi;
    
    const avgDiff = (diffCarbs + diffProt + diffFat) / 3;

    if (avgDiff <= 0.05) return 'perfect';
    if (avgDiff <= 0.15) return 'good';
    if (avgDiff <= 0.30) return 'fair';
    return 'poor';
  };

  const getColorClass = (precision: string) => {
    switch (precision) {
      case 'perfect': return 'bg-emerald-600 dark:bg-emerald-500 shadow-sm';
      case 'good': return 'bg-emerald-400 dark:bg-emerald-600 opacity-80';
      case 'fair': return 'bg-amber-400 dark:bg-amber-600';
      case 'poor': return 'bg-rose-500 dark:bg-rose-700';
      case 'cheat': return 'bg-purple-600 dark:bg-purple-500';
      case 'skipped': return 'bg-gray-400 dark:bg-gray-600';
      default: return 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-10 bg-[var(--background-secondary)] p-4 md:p-10 rounded-xl md:rounded-[3rem] border border-[var(--border-color)] shadow-card">
      <div className="flex items-center gap-6">
        <span className="text-5xl">📅</span>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Diario Aderenza</h2>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Ultimi 90 giorni di precisione nutrizionale</p>
        </div>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-15 gap-2 sm:gap-4 justify-items-center">
        {days.map(date => {
          const precision = getDayPrecision(date);
          const isToday = date === today.toISOString().split('T')[0];
          return (
            <div key={date} className="relative group">
              <button
                onClick={() => onDateSelect(date)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all transform hover:scale-125 hover:z-10 ${getColorClass(precision)} ${isToday ? 'ring-4 ring-brand-primary ring-offset-4 ring-offset-[var(--background-main)]' : ''}`}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[var(--text-primary)] text-[var(--background-main)] text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20 shadow-xl">
                {date} {precision !== 'empty' && ` - ${precision.toUpperCase()}`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-10 border-t border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6">
        <LegendItem color="bg-emerald-600" label="Ottimo (±5%)" />
        <LegendItem color="bg-emerald-400" label="Buono (±15%)" />
        <LegendItem color="bg-amber-400" label="Discreto (±30%)" />
        <LegendItem color="bg-rose-500" label="Scarso (>30%)" />
        <LegendItem color="bg-purple-600" label="Cheat Meal" />
        <LegendItem color="bg-gray-400" label="Saltato" />
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div className="flex items-center gap-3">
    <div className={`w-4 h-4 rounded ${color}`} />
    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{label}</span>
  </div>
);

export default Diary;
