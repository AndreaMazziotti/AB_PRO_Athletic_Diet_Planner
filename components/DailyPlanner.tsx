
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, NomePasto, AlimentoSelezionato, PastoStatus } from '../types';
import { calculateMacroFromAlimento } from '../utils';
import MealComposer from './MealComposer';

function ChevronLeftIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

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
      <div className="flex items-center justify-between bg-[var(--background-secondary)] p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-[var(--border-color)] shadow-lg">
        <button
          onClick={() => navigateDate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-primary)] opacity-70 hover:opacity-100 transition-opacity touch-manipulation"
          aria-label="Data precedente"
        >
          <ChevronLeftIcon />
        </button>
        <div className="text-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-lg md:text-xl font-black text-brand-primary outline-none cursor-pointer text-center max-w-[160px] h-11"
          />
          <p className="text-xs md:text-sm font-bold uppercase text-[var(--text-secondary)] tracking-widest mt-1">Seleziona Data</p>
        </div>
        <button
          onClick={() => navigateDate(1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-primary)] opacity-70 hover:opacity-100 transition-opacity touch-manipulation"
          aria-label="Data successiva"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Selector Section */}
      <div className="bg-[var(--background-secondary)] p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-[var(--border-color)] shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] pl-1">Settimana</h3>
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar touch-pan-x">
              {[1, 2, 3, 4, 5].map(w => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`flex-1 min-w-[3.5rem] h-12 md:h-14 rounded-xl md:rounded-2xl font-black text-lg md:text-xl transition-all border-2 md:border-4 shrink-0 touch-manipulation ${selectedWeek === w
                    ? 'bg-brand-primary border-brand-primary text-white shadow-lg hover:bg-brand-primary-hover'
                    : 'bg-[var(--background-main)] border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)]'
                    }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)] pl-1">Tipo Giornata</h3>
            <div className="relative">
              <select
                value={selectedDayType}
                onChange={(e) => setSelectedDayType(e.target.value)}
                className="w-full h-12 md:h-14 bg-[var(--background-main)] border-2 md:border-4 border-transparent focus:border-brand-primary rounded-xl md:rounded-2xl px-5 md:px-6 font-bold text-base md:text-lg text-[var(--text-primary)] outline-none cursor-pointer appearance-none"
              >
                {state.tipologie.map(t => <option key={t.tipo} value={t.tipo}>{t.label}</option>)}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">▼</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Header - Riepilogo Giornaliero */}
      <div className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--background-secondary)] shadow-xl transition-all overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-10">
          <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-4">
              <div className="bg-[var(--background-main)] p-4 md:p-5 rounded-2xl md:rounded-3xl border border-[var(--border-color)] shrink-0 flex items-center justify-center">
                {isON ? <FlameIcon /> : <RestIcon />}
              </div>
              <div className="space-y-1 md:space-y-1.5">
                <span className="text-xs md:text-sm font-bold uppercase tracking-tight text-[var(--text-secondary)]">Riepilogo Giornaliero</span>
                <div className="flex items-baseline gap-1.5 md:gap-2">
                  <span className="text-4xl md:text-6xl font-black text-[var(--text-primary)] tabular-nums tracking-tighter">
                    {Math.round(dailyActualTotals.kcal)}
                  </span>
                  <span className="text-sm md:text-base font-medium text-[var(--text-secondary)]">
                    / {weekMacroConfig.calorieTotal} Kcal
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
            <HeaderMacroBox label="Carbs" actual={dailyActualTotals.carboidrati} target={weekMacroConfig.macros.carboidrati.grammi} />
            <HeaderMacroBox label="Prot" actual={dailyActualTotals.proteine} target={weekMacroConfig.macros.proteine.grammi} />
            <HeaderMacroBox label="FAT" actual={dailyActualTotals.grassi} target={weekMacroConfig.macros.grassi.grammi} />
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
            <div key={dist.pasto} className={`bg-[var(--background-secondary)] rounded-[2rem] md:rounded-[2.5rem] border shadow-xl flex flex-col transition-all relative overflow-hidden ${status === 'skipped' ? 'border-[var(--border-color)] grayscale opacity-70' :
              status === 'cheat' ? 'border-purple-500/60' :
                'border-[var(--border-color)] hover:border-brand-primary'
              }`}>
              {status === 'cheat' && <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">Cheat Meal</div>}
              {status === 'skipped' && <div className="absolute top-0 right-0 bg-gray-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">Saltato</div>}

              <div className="px-6 md:px-8 py-4 md:py-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-main)]/40">
                <span className="font-black text-brand-primary uppercase tracking-widest text-base md:text-lg truncate mr-2">{dist.pasto}</span>
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-xl md:text-2xl font-black tabular-nums text-[var(--text-primary)]">{status === 'skipped' ? 0 : Math.round(actual.kcal)}</span>
                  <span className="text-sm md:text-base font-medium text-[var(--text-secondary)]">/ {target.kcal} Kcal</span>
                </div>
              </div>

              <div className="p-5 md:p-8 space-y-6 md:space-y-8 flex-1">
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  <MealMacroBox label="Carbs" actual={status === 'skipped' ? 0 : actual.carboidrati} target={target.carboidrati} />
                  <MealMacroBox label="Prot" actual={status === 'skipped' ? 0 : actual.proteine} target={target.proteine} />
                  <MealMacroBox label="Fat" actual={status === 'skipped' ? 0 : actual.grassi} target={target.grassi} />
                </div>

                <div className="pt-4 md:pt-6 border-t md:border-t-2 border-[var(--border-color)]">
                  {status === 'regular' && mealData && mealData.alimenti.length > 0 ? (
                    <div className="space-y-2">
                      {mealData.alimenti.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] md:text-sm font-medium bg-[var(--background-main)] p-2 md:p-4 rounded-xl border border-[var(--border-color)]">
                          <span className="truncate pr-2 text-[var(--text-primary)] min-w-0 flex-1" title={state.alimenti.find(a => a.id === item.alimentoId)?.nome}>
                            {state.alimenti.find(a => a.id === item.alimentoId)?.nome}
                          </span>
                          <span className="text-brand-primary font-bold whitespace-nowrap text-xs md:text-sm pl-2">{item.quantita}g</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 md:py-6 text-[var(--text-secondary)] font-bold uppercase tracking-tight text-xs md:text-sm italic opacity-60">
                      {status === 'skipped' ? 'Pasto Saltato' : status === 'cheat' ? 'Pasto Libero' : 'Nessun alimento aggiunto'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, dist.pasto, [], status === 'skipped' ? 'regular' : 'skipped')}
                    className={`h-11 md:h-12 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${status === 'skipped' ? 'bg-gray-600 border-gray-600 text-white' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--background-main)] bg-transparent'
                      }`}
                  >
                    {status === 'skipped' ? 'Ripristina' : 'Salta'}
                  </button>
                  <button
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, dist.pasto, mealData?.alimenti || [], status === 'cheat' ? 'regular' : 'cheat')}
                    className={`h-11 md:h-12 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${status === 'cheat' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--background-main)] bg-transparent'
                      }`}
                  >
                    Cheat
                  </button>
                </div>
              </div>

              <button
                disabled={status === 'skipped'}
                onClick={() => setActiveMealComposer(dist.pasto)}
                className="btn-componi-pasto w-full h-14 md:h-16 text-white font-black text-lg md:text-xl uppercase tracking-widest rounded-b-[2rem] md:rounded-b-[2.5rem] disabled:opacity-50 touch-manipulation flex items-center justify-center"
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

function FlameIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: 'var(--brand-primary)' }} aria-hidden>
      <path d="M12 10.941c2.333-3.308.167-7.823-1-8.941c0 3.395-2.235 5.299-3.667 6.706-1.43 1.408-2.333 3.294-2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7-3.002 7-6.706c0-1.712-1.232-4.403-2.333-5.588c-2.084 3.353-3.257 3.353-4.667 2.235" />
    </svg>
  );
}
function RestIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-secondary)]" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const OVER_TARGET_THRESHOLD = 1.05;

const HeaderMacroBox: React.FC<{ label: string; actual: number; target: number }> = ({ label, actual, target }) => {
  const diff = Math.round(actual - target);
  const isOverTarget = target > 0 && actual > target * OVER_TARGET_THRESHOLD;
  const progressPct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;

  return (
    <div className="relative p-3 md:p-5 rounded-[1.25rem] md:rounded-2xl flex flex-col items-center justify-center border border-[var(--border-color)] bg-[var(--background-secondary)] h-full min-h-0">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-[1.25rem] md:rounded-t-2xl bg-[var(--border-color)] overflow-hidden">
        <div
          className="h-full bg-brand-primary transition-all duration-300"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
      <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2 mt-0.5">{label}</span>
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-baseline gap-1">
          <span
            className="text-xl md:text-3xl font-black tabular-nums leading-none text-[var(--text-primary)]"
            style={isOverTarget ? { color: 'var(--brand-primary)' } : undefined}
          >
            {Math.round(actual)}
          </span>
          <span className="text-xs md:text-sm font-medium text-[var(--text-secondary)]">/ {target}g</span>
        </div>
        <span className="text-[10px] md:text-xs font-medium text-[var(--text-secondary)] tabular-nums">
          {diff > 0 ? `+${diff}g` : diff === 0 ? '—' : `Mancanti: ${diff}g`}
        </span>
      </div>
    </div>
  );
};

const MealMacroBox: React.FC<{ label: string; actual: number; target: number }> = ({ label, actual, target }) => {
  const diff = Math.round(actual - target);
  const isOverTarget = target > 0 && actual > target * OVER_TARGET_THRESHOLD;
  const progressPct = target > 0 ? Math.min(100, (actual / target) * 100) : 0;

  return (
    <div className="pt-3 px-2 pb-2 md:pt-4 md:px-3 md:pb-3 rounded-xl border border-[var(--border-color)] bg-[var(--background-main)] flex flex-col items-center justify-center min-w-0 w-full">
      <span className="text-[9px] md:text-[11px] font-bold uppercase mb-2 tracking-widest text-[var(--text-secondary)]">{label}</span>

      <div className="flex flex-col items-center gap-0.5 w-full">
        <div className="flex items-baseline gap-1">
          <span className={`text-lg md:text-2xl font-black tabular-nums leading-none ${isOverTarget ? 'text-brand-primary' : 'text-[var(--text-primary)]'}`}>
            {Math.round(actual)}
          </span>
          <span className="text-xs md:text-sm font-medium text-[var(--text-secondary)]">/ {target}g</span>
        </div>
        <span className="text-[10px] md:text-xs font-medium text-[var(--text-secondary)] tabular-nums">
          {diff > 0 ? `+${diff}g` : `${diff}g`}
        </span>
        <div className="w-full h-1 rounded-full bg-[var(--border-color)] mt-1.5 overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${isOverTarget ? 'bg-brand-primary' : 'bg-[var(--text-secondary)]'}`}
            style={{ width: `${Math.min(100, progressPct)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default DailyPlanner;
