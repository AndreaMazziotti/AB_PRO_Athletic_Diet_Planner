
import React, { useState, useMemo, useEffect } from 'react';

import { AppState, NomePasto, AlimentoSelezionato, PastoStatus } from '../types';
import { PASTI_4, PASTI_5 } from '../constants';
import { computeTotalsFromItems, formatDateIT } from '../utils';
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

function TrophyBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function MeditationBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

interface DailyPlannerProps {
  state: AppState;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaveMeal: (date: string, week: number, type: string, meal: NomePasto, items: AlimentoSelezionato[], status?: PastoStatus) => void;
  onManualDayTypeChange?: (date: string, type: 'ON' | 'OFF') => void;
  onGenerateWeekPlan?: () => void;
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ state, selectedDate, onDateChange, onSaveMeal, onManualDayTypeChange, onGenerateWeekPlan }) => {
  const isFacileMode = state.setupMode === 'facile' && state.easy_mode_targets && state.facilePreferences;

  const isOnDayForDate = useMemo(() => {
    if (!isFacileMode || !state.facilePreferences) return true;
    const d = new Date(selectedDate + 'T12:00:00');
    const weekday = d.getDay();
    return state.facilePreferences.onDays.includes(weekday);
  }, [isFacileMode, selectedDate, state.facilePreferences]);

  const manualOverride = state.manualDayTypeOverrides?.[selectedDate];
  const effectiveIsOn = manualOverride !== undefined ? manualOverride === 'ON' : isOnDayForDate;

  const dayTypeForFacile = useMemo(() => {
    if (!isFacileMode || !state.tipologie.length) return state.tipologie[0]?.tipo ?? '';
    const onT = state.tipologie.find(t => t.categoria === 'ON')?.tipo;
    const offT = state.tipologie.find(t => t.categoria === 'OFF')?.tipo;
    return (effectiveIsOn ? onT ?? offT : offT ?? onT) ?? state.tipologie[0].tipo;
  }, [isFacileMode, effectiveIsOn, state.tipologie]);

  const facileDailyMacroConfig = useMemo(() => {
    if (!isFacileMode || !state.easy_mode_targets) return null;
    const profile = effectiveIsOn ? state.easy_mode_targets.ON : state.easy_mode_targets.OFF;
    let calorieTotal = 0;
    let carbTotal = 0;
    let protTotal = 0;
    let fatTotal = 0;
    for (const key of Object.keys(profile) as NomePasto[]) {
      const m = profile[key];
      if (m) {
        calorieTotal += m.kcal;
        carbTotal += m.carboidrati;
        protTotal += m.proteine;
        fatTotal += m.grassi;
      }
    }
    return {
      calorieTotal,
      macros: {
        carboidrati: { grammi: carbTotal, kcal: carbTotal * 4 },
        proteine: { grammi: protTotal, kcal: protTotal * 4 },
        grassi: { grammi: fatTotal, kcal: fatTotal * 9 },
      },
    };
  }, [isFacileMode, effectiveIsOn, state.easy_mode_targets]);

  const dailySetup = useMemo(() => {
    const found = state.dailySetups.find(s => s.date === selectedDate);
    if (found) return found;
    return {
      settimana: 1,
      tipologiaGiornata: (isFacileMode ? dayTypeForFacile : state.tipologie[0]?.tipo) || state.tipologie[0]?.tipo || ''
    };
  }, [state.dailySetups, selectedDate, state.tipologie, isFacileMode, dayTypeForFacile]);

  const [selectedWeek, setSelectedWeek] = useState(dailySetup.settimana);
  const [selectedDayType, setSelectedDayType] = useState<string>(dailySetup.tipologiaGiornata);
  const [activeMealComposer, setActiveMealComposer] = useState<NomePasto | null>(null);

  useEffect(() => {
    setSelectedWeek(dailySetup.settimana);
    setSelectedDayType(dailySetup.tipologiaGiornata);
  }, [dailySetup]);

  useEffect(() => {
    if (isFacileMode && dayTypeForFacile) setSelectedDayType(dayTypeForFacile);
  }, [isFacileMode, dayTypeForFacile]);

  const currentWeek = state.settimane.find(w => w.numero === selectedWeek) ?? state.settimane[0];
  const dayTypeConfig = state.tipologie.find(t => t.tipo === selectedDayType) ?? state.tipologie[0];
  const dayTypeConfigSafe = dayTypeConfig ?? state.tipologie[0];
  const isON = dayTypeConfig?.categoria === 'ON';
  const weekMacroConfig = currentWeek ? (isON ? currentWeek.giorniON : currentWeek.giorniOFF) : { calorieTotal: 0, macros: { carboidrati: { grammi: 0 }, proteine: { grammi: 0 }, grassi: { grammi: 0 } } };
  const effectiveMacroConfig = facileDailyMacroConfig ?? weekMacroConfig;

  const mealsToShow = useMemo(() => {
    if (isFacileMode && state.facilePreferences) {
      return state.facilePreferences.mealFrequency === 5 ? [...PASTI_5] : [...PASTI_4];
    }
    return (dayTypeConfigSafe?.distribuzioni?.map(d => d.pasto) ?? PASTI_4) as NomePasto[];
  }, [isFacileMode, state.facilePreferences, dayTypeConfigSafe]);

  const getMealTarget = (meal: NomePasto) => {
    if (isFacileMode && state.easy_mode_targets) {
      const profile = effectiveIsOn ? state.easy_mode_targets.ON : state.easy_mode_targets.OFF;
      const t = profile[meal];
      if (t) return { carboidrati: t.carboidrati, proteine: t.proteine, grassi: t.grassi, kcal: t.kcal };
    }
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
    return computeTotalsFromItems(state.alimenti, items);
  };

  const dailyActualTotals = useMemo(() => {
    return mealsToShow.reduce((acc, pasto) => {
      const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === pasto);
      if (!mealData || mealData.status === 'skipped') return acc;
      const totals = calculateItemsTotals(mealData.alimenti);
      return {
        carboidrati: acc.carboidrati + totals.carboidrati,
        proteine: acc.proteine + totals.proteine,
        grassi: acc.grassi + totals.grassi,
        kcal: acc.kcal + totals.kcal,
      };
    }, { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 });
  }, [state.pastiSalvati, selectedDate, mealsToShow, state.alimenti]);

  if (activeMealComposer) {
    const target = getMealTarget(activeMealComposer);
    const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === activeMealComposer);
    return (
      <div className="composer-wrapper -mx-3 px-[10px] sm:mx-0 sm:px-0 max-w-3xl mx-auto">
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
      </div>
    );
  }

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    onDateChange(d.toISOString().split('T')[0]);
  };

  return (
    <div
      className="w-full max-w-4xl mx-auto space-y-4 md:space-y-8 pb-32 animate-in fade-in duration-300"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      {/* Genera Piano Settimanale - solo modalità Facile */}
      {isFacileMode && onGenerateWeekPlan && (
        <div className="bg-[var(--background-secondary)] p-4 md:p-6 rounded-xl md:rounded-[2rem] border border-[var(--border-color)] shadow-card flex flex-col items-center">
          <button
            type="button"
            onClick={onGenerateWeekPlan}
            className="w-[90%] max-w-[400px] py-4 md:py-5 px-4 rounded-xl md:rounded-2xl bg-[var(--brand-primary)] text-white font-black text-sm md:text-base uppercase tracking-widest shadow-lg hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-center"
            style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
          >
            <span className="leading-tight hyphens-auto" style={{ wordBreak: 'break-word' }}>COSTRUISCI PIANO SETTIMANALE</span>
          </button>
          <p className="text-[10px] md:text-xs text-[var(--text-secondary)] mt-2 text-center font-medium">
            Genera i pasti da oggi alla domenica con modelli certificati
          </p>
        </div>
      )}

      {/* Date Navigation - 3 colonne equidistanti: freccia | data | freccia */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center justify-items-center gap-2 md:gap-4 bg-[var(--background-secondary)] p-3 md:p-6 rounded-xl md:rounded-[2rem] border border-[var(--border-color)] shadow-card">
        <button
          onClick={() => navigateDate(-1)}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-[var(--text-primary)] opacity-70 hover:opacity-100 transition-opacity touch-manipulation justify-self-end"
          aria-label="Data precedente"
        >
          <ChevronLeftIcon />
        </button>
        <div className="flex flex-col items-center justify-center min-w-0">
          <div className="relative w-[140px] md:w-[180px] min-h-[44px] flex items-center justify-center">
            <span className="text-lg md:text-xl font-black text-[var(--brand-primary)] pointer-events-none tabular-nums">
              {formatDateIT(selectedDate)}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Seleziona data"
            />
          </div>
          <p className="text-xs md:text-sm font-bold uppercase text-[var(--text-secondary)] tracking-widest mt-1">Seleziona Data</p>
          {isFacileMode && onManualDayTypeChange && (
            <div
              role="group"
              aria-label="Tipo giornata"
              className="inline-flex rounded-xl overflow-hidden border-2 border-[var(--border-color)] bg-[var(--background-main)]"
            >
              <button
                type="button"
                onClick={() => onManualDayTypeChange(selectedDate, 'ON')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                  effectiveIsOn
                    ? 'bg-brand-primary text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary)]'
                }`}
              >
                <TrophyBadgeIcon className="w-4 h-4" />
                <span>Allenamento</span>
              </button>
              <button
                type="button"
                onClick={() => onManualDayTypeChange(selectedDate, 'OFF')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                  !effectiveIsOn
                    ? 'bg-[#374151] text-white'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary)]'
                }`}
              >
                <MeditationBadgeIcon className="w-4 h-4" />
                <span>Riposo</span>
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => navigateDate(1)}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-[var(--text-primary)] opacity-70 hover:opacity-100 transition-opacity touch-manipulation justify-self-start"
          aria-label="Data successiva"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Selector Section - nascosto in modalità Facile (valori costanti) */}
      {!isFacileMode && (
      <div className="bg-[var(--background-secondary)] p-3 md:p-8 rounded-xl md:rounded-[2rem] border border-[var(--border-color)] shadow-card overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
      )}

      {/* Main Stats Header - Riepilogo Giornaliero */}
      <div className="p-3 md:p-8 rounded-xl md:rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--background-secondary)] shadow-card transition-all overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-10">
            <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="bg-[var(--background-main)] p-2.5 md:p-5 rounded-xl md:rounded-3xl border border-[var(--border-color)] shrink-0 flex items-center justify-center">
                {(isFacileMode ? effectiveIsOn : isON) ? <FlameIcon /> : <RestIcon />}
              </div>
              <div className="space-y-1 md:space-y-1.5">
                <span className="text-xs md:text-sm font-bold uppercase tracking-tight text-[var(--text-secondary)]">Riepilogo Giornaliero</span>
                <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
                  <div className="flex items-baseline gap-1.5 md:gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white">
                    <span className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter text-white">
                      {Math.round(dailyActualTotals.kcal)}
                    </span>
                    <span className="text-sm md:text-base font-semibold text-white/95">
                      / {effectiveMacroConfig.calorieTotal} Kcal
                    </span>
                  </div>
                  <span className={`text-sm md:text-base font-bold tabular-nums self-center ${Math.round(dailyActualTotals.kcal - effectiveMacroConfig.calorieTotal) > 0 ? 'text-[var(--diff-over)]' : Math.round(dailyActualTotals.kcal - effectiveMacroConfig.calorieTotal) < 0 ? 'text-[var(--diff-ok)]' : 'text-[var(--text-secondary)]'}`}>
                    {(() => {
                      const d = Math.round(dailyActualTotals.kcal - effectiveMacroConfig.calorieTotal);
                      return d > 0 ? `+${d}` : d === 0 ? '0' : `${d}`;
                    })()}{' '}kcal
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-full lg:w-auto min-w-0">
            <HeaderMacroBox label="Carbs" actual={dailyActualTotals.carboidrati} target={effectiveMacroConfig.macros.carboidrati.grammi} />
            <HeaderMacroBox label="Prot" actual={dailyActualTotals.proteine} target={effectiveMacroConfig.macros.proteine.grammi} />
            <HeaderMacroBox label="FAT" actual={dailyActualTotals.grassi} target={effectiveMacroConfig.macros.grassi.grammi} />
          </div>
        </div>
      </div>

      {/* Meals Grid - ordine cronologico (4 o 5 pasti in base a facilePreferences) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
        {mealsToShow.map(pasto => {
          const target = getMealTarget(pasto);
          const mealData = state.pastiSalvati.find(p => p.data === selectedDate && p.nomePasto === pasto);
          const actual = calculateItemsTotals(mealData?.status === 'regular' ? mealData.alimenti : []);
          const status = mealData?.status || 'regular';
          const isAutoGen = mealData?.isAutoGenerated ?? false;

          return (
            <div key={pasto} className={`bg-[var(--background-secondary)] rounded-xl md:rounded-[2.5rem] border shadow-card flex flex-col transition-all relative overflow-hidden ${status === 'skipped' ? 'border-[var(--border-color)] grayscale opacity-70' :
              status === 'cheat' ? 'border-purple-500/60' :
                'border-[var(--border-color)] hover:border-brand-primary'
              }`}>
              {status === 'cheat' && <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">Cheat Meal</div>}
              {status === 'skipped' && <div className="absolute top-0 right-0 bg-gray-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest z-10">Saltato</div>}
              {isAutoGen && status !== 'skipped' && (
                <div className="absolute top-2 right-2 md:top-3 md:right-3 w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center text-[10px] font-black z-10" title="Generato automaticamente">A</div>
              )}

              <div className="px-3 md:px-8 py-3 md:py-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-main)]/40">
                <span className="font-black text-brand-primary uppercase tracking-widest text-base md:text-lg truncate mr-2">{pasto}</span>
                <div className="flex items-baseline gap-1.5 shrink-0 px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] text-white">
                  <span className="text-xl md:text-2xl font-black tabular-nums text-white">{status === 'skipped' ? 0 : Math.round(actual.kcal)}</span>
                  <span className="text-sm md:text-base font-semibold text-white/90">/ {target.kcal} Kcal</span>
                </div>
              </div>

              <div className="p-3 md:p-8 space-y-4 md:space-y-8 flex-1">
                <div className="grid grid-cols-3 gap-1.5 min-w-0">
                  <MealMacroBox label="Carbs" actual={status === 'skipped' ? 0 : actual.carboidrati} target={target.carboidrati} />
                  <MealMacroBox label="Prot" actual={status === 'skipped' ? 0 : actual.proteine} target={target.proteine} />
                  <MealMacroBox label="Fat" actual={status === 'skipped' ? 0 : actual.grassi} target={target.grassi} />
                </div>

                <div className="pt-4 md:pt-6 border-t md:border-t-2 border-[var(--border-color)]">
                  {status === 'regular' && mealData && mealData.alimenti.length > 0 ? (
                    <div className="space-y-2">
                      {mealData.alimenti.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] md:text-sm font-medium bg-[var(--background-main)] p-2 md:p-4 rounded-lg border border-[var(--border-color)]">
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
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, pasto, [], status === 'skipped' ? 'regular' : 'skipped')}
                    className={`h-11 md:h-12 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${status === 'skipped' ? 'bg-gray-600 border-gray-600 text-white' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--background-main)] bg-transparent'
                      }`}
                  >
                    {status === 'skipped' ? 'Ripristina' : 'Salta'}
                  </button>
                  <button
                    onClick={() => onSaveMeal(selectedDate, selectedWeek, selectedDayType, pasto, mealData?.alimenti || [], status === 'cheat' ? 'regular' : 'cheat')}
                    className={`h-11 md:h-12 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 touch-manipulation ${status === 'cheat' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--background-main)] bg-transparent'
                      }`}
                  >
                    Cheat
                  </button>
                </div>
              </div>

              <button
                disabled={status === 'skipped'}
                onClick={() => setActiveMealComposer(pasto)}
                className="btn-componi-pasto w-full h-14 md:h-16 text-white font-black text-lg md:text-xl uppercase tracking-widest rounded-b-xl md:rounded-b-[2.5rem] disabled:opacity-50 touch-manipulation flex items-center justify-center"
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
    <div className="relative p-2 md:p-5 rounded-lg md:rounded-2xl flex flex-col items-center justify-center border border-[var(--border-color)] bg-[var(--background-secondary)] h-full min-h-0 min-w-0">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-lg md:rounded-t-2xl bg-[var(--border-color)] overflow-hidden">
        <div
          className="h-full bg-brand-primary transition-all duration-300"
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>
      <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-1 mt-0.5">{label}</span>
      <div className="flex flex-col items-center gap-0.5 min-w-0 w-full">
        <div className="flex items-baseline gap-0.5 md:gap-1 whitespace-nowrap">
          <span
            className="text-base md:text-3xl font-black tabular-nums leading-none text-[var(--text-primary)]"
            style={isOverTarget ? { color: 'var(--brand-primary)' } : undefined}
          >
            {Math.round(actual)}
          </span>
          <span className="text-[10px] md:text-sm font-medium text-[var(--text-secondary)]">/ {target}g</span>
        </div>
        <span className="text-[9px] md:text-xs font-medium text-[var(--text-secondary)] tabular-nums truncate max-w-full">
          {diff > 0 ? `+${diff}g` : diff === 0 ? '—' : `−${Math.abs(diff)}g`}
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
    <div className="pt-2 px-1.5 pb-1.5 md:pt-4 md:px-3 md:pb-3 rounded-lg md:rounded-xl border border-[var(--border-color)] bg-[var(--background-main)] flex flex-col items-center justify-center min-w-0 w-full">
      <span className="text-[9px] md:text-[11px] font-bold uppercase mb-1 tracking-widest text-[var(--text-secondary)]">{label}</span>

      <div className="flex flex-col items-center gap-0.5 w-full min-w-0">
        <div className="flex items-baseline gap-0.5 md:gap-1 whitespace-nowrap">
          <span className={`text-base md:text-2xl font-black tabular-nums leading-none ${isOverTarget ? 'text-brand-primary' : 'text-[var(--text-primary)]'}`}>
            {Math.round(actual)}
          </span>
          <span className="text-[10px] md:text-sm font-medium text-[var(--text-secondary)]">/ {target}g</span>
        </div>
        <span className="text-[9px] md:text-xs font-medium text-[var(--text-secondary)] tabular-nums">
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
