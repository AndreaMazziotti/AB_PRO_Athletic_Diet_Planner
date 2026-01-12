
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
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-[2rem] border-2 border-gray-100 dark:border-gray-800 shadow-lg">
        <button onClick={() => navigateDate(-1)} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-black">←</button>
        <div className="text-center">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-xl font-black text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer text-center"
          />
          <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mt-1">Seleziona Data</p>
        </div>
        <button onClick={() => navigateDate(1)} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-black">→</button>
      </div>

      {/* Selector Section */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border-2 border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Settimana</h3>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`flex-1 h-14 rounded-2xl font-black text-xl transition-all border-4 ${
                    selectedWeek === w 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' 
                      : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Tipo Giornata</h3>
            <select
              value={selectedDayType}
              onChange={(e) => setSelectedDayType(e.target.value)}
              className="w-full h-14 bg-gray-100 dark:bg-gray-800 border-4 border-transparent focus:border-indigo-500 rounded-2xl px-5 font-black text-lg outline-none cursor-pointer"
            >
              {state.tipologie.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Stats Header */}
      <div className={`p-8 rounded-[2.5rem] border-4 shadow-2xl transition-all ${
        isON 
          ? 'bg-indigo-50 dark:bg-[#080a15] border-indigo-300 dark:border-indigo-500' 
          : 'bg-emerald-50 dark:bg-[#08150c] border-emerald-300 dark:border-emerald-500'
      }`}>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-lg border-2 border-transparent dark:border-gray-700">
              <span className="text-5xl">{isON ? '🔥' : '🛌'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-bold uppercase tracking-tight text-gray-600 dark:text-gray-400">Riepilogo Giornaliero</span>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-gray-900 dark:text-white tabular-nums">
                  {Math.round(dailyActualTotals.kcal)}
                </span>
                <span className="text-2xl font-semibold text-gray-500 dark:text-gray-300">
                  / {weekMacroConfig.calorieTotal} <span className="text-sm">kcal</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 w-full lg:w-auto">
            <HeaderMacroBox label="CARBS" actual={dailyActualTotals.carboidrati} target={weekMacroConfig.macros.carboidrati.grammi} color="indigo" />
            <HeaderMacroBox label="PROT" actual={dailyActualTotals.proteine} target={weekMacroConfig.macros.proteine.grammi} color="rose" />
            <HeaderMacroBox label="FAT" actual={dailyActualTotals.grassi} target={weekMacroConfig.macros.grassi.grammi} color="amber" />
          </div>
        </div>
      </div>

      {/* Meals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {dayTypeConfig.distribuzioni.map(dist => {
          const target = getMealTarget(dist.pasto);
          const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === dist.pasto);
          const actual = calculateItemsTotals(mealData?.status === 'regular' ? mealData.alimenti : []);
          const status = mealData?.status || 'regular';
          
          return (
            <div key={dist.pasto} className={`bg-white dark:bg-gray-900 rounded-[2.5rem] border-4 shadow-xl flex flex-col transition-all relative overflow-hidden ${
              status === 'skipped' ? 'border-gray-300 dark:border-gray-700 grayscale opacity-60' : 
              status === 'cheat' ? 'border-purple-400 dark:border-purple-600' : 
              'border-gray-100 dark:border-gray-800 hover:border-indigo-500'
            }`}>
              {status === 'cheat' && <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">Cheat Meal</div>}
              {status === 'skipped' && <div className="absolute top-0 right-0 bg-gray-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">Saltato</div>}

              <div className="px-8 py-5 border-b-4 border-gray-50 dark:border-gray-800 flex justify-between items-center bg-gray-50/20 dark:bg-black/20">
                <span className="font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-lg">{dist.pasto}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black tabular-nums">{status === 'skipped' ? 0 : Math.round(actual.kcal)}</span>
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-300">/ {target.kcal} kcal</span>
                </div>
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                <div className="grid grid-cols-3 gap-3">
                  <MealMacroBox label="CARBS" actual={status === 'skipped' ? 0 : actual.carboidrati} target={target.carboidrati} color="indigo" />
                  <MealMacroBox label="PROT" actual={status === 'skipped' ? 0 : actual.proteine} target={target.proteine} color="rose" />
                  <MealMacroBox label="GRASSI" actual={status === 'skipped' ? 0 : actual.grassi} target={target.grassi} color="amber" />
                </div>

                <div className="pt-6 border-t-2 border-gray-100 dark:border-gray-800">
                  {status === 'regular' && mealData && mealData.alimenti.length > 0 ? (
                    <div className="space-y-2">
                      {mealData.alimenti.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-sm font-semibold bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <span className="truncate pr-4 text-gray-700 dark:text-gray-200">
                            {state.alimenti.find(a => a.id === item.alimentoId)?.nome}
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap">{item.quantita}g</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400 font-bold uppercase tracking-tight text-sm italic opacity-40">
                      {status === 'skipped' ? 'Pasto Saltato' : status === 'cheat' ? 'Pasto Libero' : 'Pasto non composto'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, dist.pasto, [], status === 'skipped' ? 'regular' : 'skipped')}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                      status === 'skipped' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400'
                    }`}
                  >
                    {status === 'skipped' ? 'Pasto Inserito' : 'Pasto Saltato'}
                  </button>
                  <button 
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, dist.pasto, mealData?.alimenti || [], status === 'cheat' ? 'regular' : 'cheat')}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                      status === 'cheat' ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-none' : 'border-purple-100 dark:border-purple-900/50 text-purple-400 hover:border-purple-400'
                    }`}
                  >
                    Cheat Meal
                  </button>
                </div>
              </div>

              <button 
                disabled={status === 'skipped'}
                onClick={() => setActiveMealComposer(dist.pasto)}
                className="w-full py-6 bg-indigo-600 text-white font-black text-xl uppercase tracking-widest hover:bg-indigo-700 transition-all rounded-b-[2rem] shadow-inner disabled:opacity-50 disabled:bg-gray-400"
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

// COMPONENTI ATOMICI OTTIMIZZATI PER CONTRASTO E LEGGIBILITÀ

const HeaderMacroBox: React.FC<{ label: string; actual: number; target: number; color: string }> = ({ label, actual, target, color }) => {
  const diff = Math.round(actual - target);
  const colorMap: any = {
    indigo: 'bg-indigo-600 text-white border-indigo-400',
    rose: 'bg-rose-600 text-white border-rose-400',
    amber: 'bg-amber-600 text-white border-amber-400'
  };
  return (
    <div className={`p-5 rounded-3xl flex flex-col items-center shadow-2xl border-2 ${colorMap[color]}`}>
      <span className="text-xs font-black uppercase opacity-90 mb-1 tracking-tight">{label}</span>
      <div className="text-3xl font-black tabular-nums tracking-tighter">
        {Math.round(actual)}
      </div>
      <div className="text-sm font-bold text-white/90 bg-black/20 px-3 py-0.5 rounded-full mt-1 border border-white/20">
        / {target}g
      </div>
      <div className={`mt-3 text-sm font-black px-4 py-1.5 rounded-xl shadow-lg border-2 border-white/40 ${diff === 0 ? 'bg-emerald-500' : 'bg-black/60'}`}>
        {diff > 0 ? `+${diff}` : diff}g
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
    <div className={`p-4 rounded-2xl border-4 flex flex-col items-center justify-center transition-all shadow-lg ${colorMap[color]}`}>
      <span className="text-[10px] font-black uppercase mb-1 tracking-widest opacity-60">{label}</span>
      <div className="text-2xl font-black tabular-nums leading-none">
        {Math.round(actual)}
      </div>
      <div className="text-sm font-medium text-gray-700 dark:text-gray-100 mt-2 mb-2 bg-white/50 dark:bg-white/10 px-2 rounded-lg border border-current/10">
        / {target}g
      </div>
      <div className={`text-[11px] font-black px-3 py-1 rounded-lg border-2 border-white/20 shadow-md ${badgeColor}`}>
        {diff > 0 ? `+${diff}` : diff}
      </div>
    </div>
  );
};

export default DailyPlanner;
