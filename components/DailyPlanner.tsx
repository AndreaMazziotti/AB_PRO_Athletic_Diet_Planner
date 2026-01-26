
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, NomePasto, AlimentoSelezionato, PastoStatus } from '../types';
import { calculateMacroFromAlimento } from '../utils';
import MealComposer from './MealComposer';

interface DailyPlannerProps {
  state: AppState;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaveMeal: (date: string, week: number, type: string, meal: NomePasto, items: AlimentoSelezionato[], status?: PastoStatus) => void;
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ state, selectedDate, onDateChange, onSaveMeal }) => {
  // Trova il setup per la data selezionata o usa il default
  const dailySetup = useMemo(() =>
    state.dailySetups.find(s => s.date === selectedDate) || { settimana: 1, tipologiaGiornata: state.tipologie[0].tipo },
    [state.dailySetups, selectedDate, state.tipologie]);

  const [selectedWeek, setSelectedWeek] = useState(dailySetup.settimana);
  const [selectedDayType, setSelectedDayType] = useState<string>(dailySetup.tipologiaGiornata);
  const [activeMealComposer, setActiveMealComposer] = useState<NomePasto | null>(null);

  // Sincronizza lo stato locale quando cambia la data
  useEffect(() => {
    setSelectedWeek(dailySetup.settimana);
    setSelectedDayType(dailySetup.tipologiaGiornata);
  }, [dailySetup]);

  const currentWeek = state.settimane.find(w => w.numero === selectedWeek)!;
  const dayTypeConfig = state.tipologie.find(t => t.tipo === selectedDayType)!;
  const isON = dayTypeConfig.categoria === 'ON';
  const weekMacroConfig = isON ? currentWeek.giorniON : currentWeek.giorniOFF;

  const getMealTarget = (meal: NomePasto) => {
    const dist = dayTypeConfig.distribuzioni.find(d => d.pasto === meal)!;
    const carbs = (weekMacroConfig.macros.carboidrati.grammi * dist.percentuali.carboidrati) / 100;
    const prot = (weekMacroConfig.macros.proteine.grammi * dist.percentuali.proteine) / 100;
    const fat = (weekMacroConfig.macros.grassi.grammi * dist.percentuali.grassi) / 100;
    return {
      carboidrati: Math.round(carbs),
      proteine: Math.round(prot),
      grassi: Math.round(fat),
      kcal: Math.round(carbs * 4 + prot * 4 + fat * 9)
    };
  };

  const calculateItemsTotals = (items: AlimentoSelezionato[]) => {
    return items.reduce((acc, curr) => {
      const a = state.alimenti.find(x => x.id === curr.alimentoId);
      if (!a) return acc;
      const m = calculateMacroFromAlimento(a.per100g, curr.quantita);
      return {
        carboidrati: acc.carboidrati + m.carboidrati,
        proteine: acc.proteine + m.proteine,
        grassi: acc.grassi + m.grassi,
        kcal: acc.kcal + m.kcal,
      };
    }, { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 });
  };

  const dailyActualTotals = useMemo(() => {
    return dayTypeConfig.distribuzioni.reduce((acc, dist) => {
      const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === dist.pasto);
      if (!mealData || mealData.status === 'skipped') return acc;
      const totals = calculateItemsTotals(mealData.alimenti);
      return {
        carboidrati: acc.carboidrati + totals.carboidrati,
        proteine: acc.proteine + totals.proteine,
        grassi: acc.grassi + totals.grassi,
        kcal: acc.kcal + totals.kcal,
      };
    }, { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 });
  }, [state.pastiSalvati, selectedDate, dayTypeConfig, state.alimenti]);

  if (activeMealComposer) {
    const target = getMealTarget(activeMealComposer);
    const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === activeMealComposer);
    return (
      <MealComposer
        target={target}
        pastoLabel={activeMealComposer.toUpperCase()}
        alimenti={state.alimenti}
        initialSelection={mealData ? mealData.alimenti : []}
        onSave={(items) => {
          onSaveMeal(selectedDate, selectedWeek, selectedDayType, activeMealComposer, items, 'regular');
          setActiveMealComposer(null);
        }}
        onCancel={() => setActiveMealComposer(null)}
      />
    );
  }

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 pb-32 animate-in fade-in duration-300 px-4 md:px-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-lg">
        <button onClick={() => navigateDate(-1)} className="w-12 h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl md:rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-black touch-manipulation text-xl text-gray-700 dark:text-gray-300">←</button>
        <div className="text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-lg md:text-xl font-black text-indigo-700 dark:text-indigo-400 outline-none cursor-pointer text-center max-w-[160px] h-11"
          />
          <p className="text-xs md:text-sm font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest mt-1">Seleziona Data</p>
        </div>
        <button onClick={() => navigateDate(1)} className="w-12 h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl md:rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-black touch-manipulation text-xl text-gray-700 dark:text-gray-300">→</button>
      </div>

      {/* Selector Section */}
      <div className="bg-white dark:bg-gray-900 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 pl-1">Settimana</h3>
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar touch-pan-x">
              {[1, 2, 3, 4, 5].map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`flex-1 min-w-[3.5rem] h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-lg md:text-xl transition-all border-2 md:border-4 shrink-0 touch-manipulation ${selectedWeek === w
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400 pl-1">Tipo Giornata</h3>
            <div className="relative">
              <select
                value={selectedDayType}
                onChange={(e) => setSelectedDayType(e.target.value)}
                className="w-full h-12 md:h-14 bg-gray-100 dark:bg-gray-800 border-2 md:border-4 border-transparent focus:border-indigo-500 rounded-xl md:rounded-2xl px-5 md:px-6 font-bold text-base md:text-lg text-gray-800 dark:text-white outline-none cursor-pointer appearance-none"
              >
                {state.tipologie.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Header */}
      <div className={`p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 md:border-4 shadow-2xl transition-all overflow-hidden ${isON
        ? 'bg-indigo-50 dark:bg-[#080a15] border-indigo-200 dark:border-indigo-600'
        : 'bg-emerald-50 dark:bg-[#08150c] border-emerald-200 dark:border-emerald-600'
        }`}>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-10">
          <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl md:rounded-3xl shadow-lg border border-transparent dark:border-gray-700 shrink-0">
                <span className="text-3xl md:text-5xl">{isON ? '🔥' : '🛌'}</span>
              </div>
              <div className="space-y-1 md:space-y-1.5">
                <span className="text-xs md:text-sm font-bold uppercase tracking-tight text-gray-600 dark:text-gray-400">Riepilogo Giornaliero</span>
                <div className="flex items-baseline gap-1.5 md:gap-2">
                  <span className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter">
                    {Math.round(dailyActualTotals.kcal)}
                  </span>
                  <span className="text-sm md:text-2xl font-bold text-gray-500 dark:text-gray-400">
                    / {weekMacroConfig.calorieTotal} <span className="hidden md:inline text-base">kcal</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <HeaderMacroBox label="Carbs" actual={dailyActualTotals.carboidrati} target={weekMacroConfig.macros.carboidrati.grammi} color="indigo" />
            <HeaderMacroBox label="Prot" actual={dailyActualTotals.proteine} target={weekMacroConfig.macros.proteine.grammi} color="rose" />
            <HeaderMacroBox label="Grassi" actual={dailyActualTotals.grassi} target={weekMacroConfig.macros.grassi.grammi} color="amber" />
          </div>
        </div>
      </div>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {dayTypeConfig.distribuzioni.map(dist => {
          const target = getMealTarget(dist.pasto);
          const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === dist.pasto);
          const actual = calculateItemsTotals(mealData?.status === 'regular' ? mealData.alimenti : []);
          const status = mealData?.status || 'regular';

          return (
            <div key={dist.pasto} className={`bg-white dark:bg-gray-900 rounded-[2rem] md:rounded-[2.5rem] border-2 md:border-4 shadow-xl flex flex-col transition-all relative overflow-hidden ${status === 'skipped' ? 'border-gray-300 dark:border-gray-700 grayscale opacity-70' :
              status === 'cheat' ? 'border-purple-400 dark:border-purple-600' :
                'border-gray-100 dark:border-gray-800 hover:border-indigo-500'
              }`}>
              {status === 'cheat' && <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">Cheat Meal</div>}
              {status === 'skipped' && <div className="absolute top-0 right-0 bg-gray-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">Saltato</div>}

              <div className="px-6 md:px-8 py-4 md:py-6 border-b-2 md:border-b-4 border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/30 dark:bg-black/20">
                <span className="font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-base md:text-lg truncate mr-2">{dist.pasto}</span>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-xl md:text-2xl font-black tabular-nums">{status === 'skipped' ? 0 : Math.round(actual.kcal)}</span>
                  <span className="text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">/ {target.kcal}</span>
                </div>
              </div>

              <div className="p-5 md:p-8 space-y-6 md:space-y-8 flex-1">
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  <MealMacroBox label="Carbs" actual={status === 'skipped' ? 0 : actual.carboidrati} target={target.carboidrati} color="indigo" />
                  <MealMacroBox label="Prot" actual={status === 'skipped' ? 0 : actual.proteine} target={target.proteine} color="rose" />
                  <MealMacroBox label="Fat" actual={status === 'skipped' ? 0 : actual.grassi} target={target.grassi} color="amber" />
                </div>

                <div className="pt-4 md:pt-6 border-t md:border-t-2 border-gray-100 dark:border-gray-800">
                  {status === 'regular' && mealData && mealData.alimenti.length > 0 ? (
                    <div className="space-y-2">
                      {mealData.alimenti.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] md:text-sm font-medium bg-gray-50 dark:bg-gray-800/60 p-2 md:p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <span className="truncate pr-2 text-gray-800 dark:text-gray-200 min-w-0 flex-1" title={state.alimenti.find(a => a.id === item.alimentoId)?.nome}>
                            {state.alimenti.find(a => a.id === item.alimentoId)?.nome}
                          </span>
                          <span className="text-indigo-700 dark:text-indigo-400 font-bold whitespace-nowrap text-xs md:text-sm pl-2">{item.quantita}g</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 md:py-6 text-gray-400 dark:text-gray-600 font-bold uppercase tracking-tight text-xs md:text-sm italic opacity-60">
                      {status === 'skipped' ? 'Pasto Saltato' : status === 'cheat' ? 'Pasto Libero' : 'Nessun alimento aggiunto'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, dist.pasto, [], status === 'skipped' ? 'regular' : 'skipped')}
                    className={`h-11 md:h-12 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border-2 transition-all active:scale-95 touch-manipulation ${status === 'skipped' ? 'bg-gray-600 border-gray-600 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400 bg-transparent'
                      }`}
                  >
                    {status === 'skipped' ? 'Ripristina' : 'Salta'}
                  </button>
                  <button
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, dist.pasto, mealData?.alimenti || [], status === 'cheat' ? 'regular' : 'cheat')}
                    className={`h-11 md:h-12 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest border-2 transition-all active:scale-95 touch-manipulation ${status === 'cheat' ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none' : 'border-purple-200 dark:border-purple-800/60 text-purple-500 hover:border-purple-400 bg-purple-50/50 dark:bg-transparent'
                      }`}
                  >
                    Cheat
                  </button>
                </div>
              </div>

              <button
                disabled={status === 'skipped'}
                onClick={() => setActiveMealComposer(dist.pasto)}
                className="w-full h-14 md:h-16 bg-indigo-600 text-white font-black text-lg md:text-xl uppercase tracking-widest hover:bg-indigo-700 transition-all rounded-b-[2rem] md:rounded-b-[2.5rem] shadow-inner disabled:opacity-50 disabled:bg-gray-400 touch-manipulation flex items-center justify-center active:bg-indigo-800"
              >
                Componi Pasto
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// COMPONENTI ATOMICI
// Use stricter sizing and text-clamping to prevent breaks

const HeaderMacroBox: React.FC<{ label: string; actual: number; target: number; color: string }> = ({ label, actual, target, color }) => {
  const diff = Math.round(actual - target);
  const colorMap: any = {
    indigo: 'bg-indigo-600 text-white border-indigo-400',
    rose: 'bg-rose-600 text-white border-rose-400',
    amber: 'bg-amber-600 text-white border-amber-400'
  };
  return (
    <div className={`p-2 md:p-5 rounded-3xl flex flex-col items-center justify-center shadow-lg border-2 ${colorMap[color]} h-full`}>
      <span className="text-[10px] md:text-sm font-black uppercase opacity-90 mb-1 tracking-tight">{label}</span>
      <div className="flex flex-row items-center justify-center gap-1 md:gap-2 w-full flex-wrap">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl md:text-4xl font-black tabular-nums tracking-tighter leading-none">{Math.round(actual)}</span>
          <span className="text-sm md:text-base font-bold opacity-80">/ {target}</span>
        </div>
        <div className={`text-sm md:text-lg font-black px-1.5 md:px-3 py-0.5 rounded-lg bg-black/20 border border-white/20 whitespace-nowrap`}>
          {diff > 0 ? `+${diff}` : diff}
        </div>
      </div>
    </div>
  );
};

const MealMacroBox: React.FC<{ label: string; actual: number; target: number; color: string }> = ({ label, actual, target, color }) => {
  const diff = Math.round(actual - target);

  const colorMap: any = {
    indigo: 'dark:bg-[#0c1230] dark:border-indigo-600 bg-indigo-100 border-indigo-300 text-indigo-950 dark:text-white',
    rose: 'dark:bg-[#200810] dark:border-rose-600 bg-rose-100 border-rose-300 text-rose-950 dark:text-white',
    amber: 'dark:bg-[#201508] dark:border-amber-600 bg-amber-100 border-amber-300 text-amber-950 dark:text-white'
  };

  const badgeColor = diff > 0 ? 'bg-rose-600 text-white' : 'bg-indigo-700 text-white';

  return (
    <div className={`p-2 md:p-3 rounded-xl border-2 md:border-4 flex flex-col items-center justify-center transition-all shadow-md ${colorMap[color]} min-w-0 w-full`}>
      <span className="text-[9px] md:text-[11px] font-black uppercase mb-1 tracking-widest opacity-60">{label}</span>

      <div className="flex flex-row items-center justify-center gap-1.5 w-full my-0.5 flex-wrap md:flex-nowrap">
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl md:text-3xl font-black tabular-nums leading-none">{Math.round(actual)}</span>
          <span className="text-xs md:text-base font-bold opacity-60">/{target}</span>
        </div>

        <div className={`text-xs md:text-base font-black px-1.5 md:px-2 py-0.5 rounded-md border border-white/20 shadow-sm ${badgeColor}`}>
          {diff > 0 ? `+${diff}` : diff}
        </div>
      </div>
    </div>
  );
};

export default DailyPlanner;
