import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Alimento, AlimentoSelezionato } from '../types';
import { calculateMacroFromAlimento } from '../utils';
import { solveMeal, getSuggestionFoodForMacro, type MealSolverResult, type SolverResultItem, type MissingMacro } from '../services/MealSolverService';

interface MealComposerProps {
  target: { carboidrati: number; proteine: number; grassi: number; kcal: number };
  pastoLabel: string;
  alimenti: Alimento[];
  onSave: (selezionati: AlimentoSelezionato[]) => void;
  onCancel: () => void;
  initialSelection?: AlimentoSelezionato[];
}

/** Animazione conteggio rapido (counter up) per i grammi. */
const AnimatedGramCounter: React.FC<{ value: number; durationMs?: number }> = ({ value, durationMs = 600 }) => {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      const current = Math.round(start + (value - start) * eased);
      setDisplay(current);
      if (t >= 1) prevRef.current = value;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, durationMs]);
  return <span className="tabular-nums">{display}</span>;
};

const MealComposer: React.FC<MealComposerProps> = ({ target, pastoLabel, alimenti, onSave, onCancel, initialSelection = [] }) => {
  const [selezionati, setSelezionati] = useState<AlimentoSelezionato[]>(initialSelection);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showSolverModal, setShowSolverModal] = useState(false);
  const [solverResult, setSolverResult] = useState<MealSolverResult | null>(null);
  const [lockedQuantities, setLockedQuantities] = useState<Record<string, number>>({});
  const [solverLoading, setSolverLoading] = useState(false);
  const [suggestedAlimenti, setSuggestedAlimenti] = useState<Alimento[]>([]);
  const [pinnedForSolver, setPinnedForSolver] = useState<Set<string>>(new Set());

  const filtered = useMemo(() =>
    alimenti.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [alimenti, searchTerm]);

  const addAlimento = (alimento: Alimento) => {
    setSelezionati(prev => [...prev, { alimentoId: alimento.id, quantita: 100 }]);
    setSearchTerm('');
    setShowResults(false);
  };

  const removeAlimento = (index: number) => {
    const id = selezionati[index]?.alimentoId;
    if (id) setPinnedForSolver(prev => { const n = new Set(prev); n.delete(id); return n; });
    setSelezionati(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantita = (index: number, q: number) => {
    const id = selezionati[index]?.alimentoId;
    if (id) setPinnedForSolver(prev => new Set(prev).add(id));
    setSelezionati(prev => prev.map((item, i) => i === index ? { ...item, quantita: q } : item));
  };

  const togglePin = (alimentoId: string) => {
    setPinnedForSolver(prev => {
      const next = new Set(prev);
      if (next.has(alimentoId)) next.delete(alimentoId);
      else next.add(alimentoId);
      return next;
    });
  };

  const unlockAll = () => setPinnedForSolver(new Set());

  const allAlimentiForDisplay = useMemo(() => [...alimenti, ...suggestedAlimenti], [alimenti, suggestedAlimenti]);

  const runSolverWithList = useCallback((list: AlimentoSelezionato[], locks: Record<string, number>, extraAlimenti: Alimento[] = []) => {
    const allAlimenti = [...alimenti, ...suggestedAlimenti, ...extraAlimenti];
    const foods: { alimento: Alimento; fixedGrams?: number }[] = [];
    for (const item of list) {
      const a = allAlimenti.find(x => x.id === item.alimentoId);
      if (!a) continue;
      const fixedGrams = locks[a.id] !== undefined ? locks[a.id] : undefined;
      foods.push({ alimento: a, fixedGrams });
    }
    return solveMeal(
      { kcal: target.kcal, carboidrati: target.carboidrati, proteine: target.proteine, grassi: target.grassi },
      foods
    );
  }, [alimenti, suggestedAlimenti, target]);

  const runSolver = useCallback((locksFromModal: Record<string, number> = {}) => {
    setSolverLoading(true);
    const locks: Record<string, number> = { ...locksFromModal };
    selezionati.forEach(item => {
      if (pinnedForSolver.has(item.alimentoId)) locks[item.alimentoId] = item.quantita;
    });
    const tick = () => {
      const result = runSolverWithList(selezionati, locks);
      setSolverResult(result);
      setLockedQuantities(locks);
      setShowSolverModal(true);
      setSolverLoading(false);
    };
    requestAnimationFrame(() => requestAnimationFrame(tick));
  }, [selezionati, runSolverWithList, pinnedForSolver]);

  const handleAddSuggestion = useCallback((macro: MissingMacro) => {
    const suggested = getSuggestionFoodForMacro(macro, alimenti);
    if (!suggested) return;
    const newList = [...selezionati, { alimentoId: suggested.id, quantita: 100 }];
    setSelezionati(newList);
    const isInDb = alimenti.some(a => a.id === suggested.id);
    if (!isInDb) setSuggestedAlimenti(prev => (prev.some(a => a.id === suggested.id) ? prev : [...prev, suggested]));
    const result = runSolverWithList(newList, {}, isInDb ? [] : [suggested]);
    setSolverResult(result);
    setLockedQuantities({});
    setShowSolverModal(true);
  }, [selezionati, alimenti, runSolverWithList]);

  const handleLockToggle = (alimentoId: string, currentGrams: number, locked: boolean) => {
    const nextLocks = { ...lockedQuantities };
    if (locked) {
      delete nextLocks[alimentoId];
    } else {
      nextLocks[alimentoId] = currentGrams;
    }
    runSolver(nextLocks);
  };

  const applySolverToSelection = () => {
    if (!solverResult?.success || !solverResult.items.length) return;
    const newSelezionati: AlimentoSelezionato[] = solverResult.items.map(item => ({
      alimentoId: item.alimentoId,
      quantita: item.quantita,
    }));
    setSelezionati(newSelezionati);
    setShowSolverModal(false);
    setSolverResult(null);
    setLockedQuantities({});
  };

  const totals = useMemo(() => {
    const raw = selezionati.reduce((acc, curr) => {
      const a = allAlimentiForDisplay.find(x => x.id === curr.alimentoId);
      if (!a) return acc;
      const m = calculateMacroFromAlimento(a.per100g, curr.quantita);
      return {
        carboidrati: acc.carboidrati + m.carboidrati,
        proteine: acc.proteine + m.proteine,
        grassi: acc.grassi + m.grassi,
        kcal: acc.kcal + m.kcal,
      };
    }, { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 });
    const derivedKcal = 4 * raw.carboidrati + 4 * raw.proteine + 9 * raw.grassi;
    return { ...raw, kcal: derivedKcal };
  }, [selezionati, allAlimentiForDisplay]);

  const diffs = {
    carboidrati: totals.carboidrati - target.carboidrati,
    proteine: totals.proteine - target.proteine,
    grassi: totals.grassi - target.grassi,
    kcal: totals.kcal - target.kcal,
  };

  const canAutoCompose = selezionati.length >= 3;

  const selectionWarning = useMemo(() => {
    let proteinSources = 0;
    let carbSources = 0;
    selezionati.forEach(item => {
      const a = allAlimentiForDisplay.find(x => x.id === item.alimentoId);
      if (!a) return;
      const p = a.per100g;
      if (p.proteine >= p.carboidrati && p.proteine >= p.grassi) proteinSources++;
      if (p.carboidrati >= p.proteine && p.carboidrati >= p.grassi) carbSources++;
    });
    if (proteinSources >= 2 && carbSources === 0) return 'Nota: Proteine elevate inevitabili con questa selezione.';
    return null;
  }, [selezionati, allAlimentiForDisplay]);

  return (
    <div className="max-w-3xl mx-auto bg-[var(--background-secondary)] rounded-2xl sm:rounded-[2rem] border border-[var(--border-color)] shadow-xl overflow-hidden">
      <div className="px-2.5 py-4 sm:px-6 sm:py-5 bg-brand-primary text-white flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">{pastoLabel}</h2>
        <button onClick={onCancel} className="bg-white/20 hover:bg-white/40 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl transition-colors" aria-label="Chiudi">&times;</button>
      </div>

      <div className="px-2.5 sm:px-4 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Obiettivo e totali – riga compatta, label 10px, numero/target in evidenza */}
        <div className="p-3 sm:p-4 bg-gray-900 dark:bg-black text-white rounded-xl sm:rounded-2xl border border-[var(--border-color)]">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <UnifiedStat label="KCAL" actual={Math.round(totals.kcal)} target={target.kcal} diff={diffs.kcal} unit="" highlight />
            <UnifiedStat label="CARBS" actual={Math.round(totals.carboidrati)} target={target.carboidrati} diff={diffs.carboidrati} unit="g" />
            <UnifiedStat label="PROT" actual={Math.round(totals.proteine)} target={target.proteine} diff={diffs.proteine} unit="g" />
            <UnifiedStat label="FAT" actual={Math.round(totals.grassi)} target={target.grassi} diff={diffs.grassi} unit="g" />
          </div>
        </div>

        {/* Componi Automaticamente – pulsante solido, stato disabilitato con testo sotto */}
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[var(--background-main)] border border-[var(--border-color)]">
          {canAutoCompose ? (
            <button
              type="button"
              onClick={() => runSolver({})}
              disabled={solverLoading}
              className="composer-btn-auto w-full py-3.5 sm:py-4 px-4 rounded-xl font-semibold text-white text-sm sm:text-base flex items-center justify-center gap-2 relative overflow-hidden disabled:opacity-80"
            >
              {solverLoading ? (
                <>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  <MagicWandIcon className="w-5 h-5 animate-spin-slow shrink-0" />
                  <span>Calcolo in corso...</span>
                </>
              ) : (
                <>
                  <MagicWandIcon className="w-5 h-5 shrink-0" />
                  Componi automaticamente
                </>
              )}
            </button>
          ) : (
            <>
              <button type="button" disabled className="w-full py-3.5 sm:py-4 px-4 rounded-xl font-semibold text-gray-400 bg-gray-700/80 text-sm sm:text-base flex items-center justify-center gap-2 cursor-not-allowed" aria-disabled>
                <MagicWandIcon className="w-5 h-5 shrink-0 opacity-60" />
                Componi automaticamente
              </button>
              <p className="text-[10px] sm:text-xs text-[var(--text-secondary)] mt-1.5 text-center">Aggiungi almeno 3 ingredienti per attivare</p>
            </>
          )}
        </div>

        {selectionWarning && (
          <div className="px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            {selectionWarning}
          </div>
        )}

        {/* Cerca alimento – bordo 1px accento */}
        <div className="relative group">
          <input
            type="text"
            placeholder="Cerca alimento..."
            value={searchTerm}
            onFocus={() => setShowResults(true)}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="composer-search-input w-full h-12 sm:h-14 bg-[var(--background-main)] border border-[var(--border-color)] focus:border-brand-primary rounded-xl px-4 text-base sm:text-lg font-semibold outline-none transition-colors text-[var(--text-primary)]"
          />
          {showResults && searchTerm.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
              {filtered.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-[var(--background-main)] border-b last:border-0 border-[var(--border-color)]"
                >
                  <span className="flex-1 font-medium text-sm text-[var(--text-primary)] truncate min-w-0">
                    {a.nome}
                  </span>
                  <button
                    type="button"
                    onClick={() => addAlimento(a)}
                    className="shrink-0 py-1.5 px-2.5 rounded-lg bg-brand-primary text-white text-[10px] font-bold uppercase tracking-wider hover:bg-brand-primary-hover"
                  >
                    Aggiungi
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista ingredienti – righe sottili, X rossa minimale */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Ingredienti ({selezionati.length})
            </h3>
            {pinnedForSolver.size > 0 && (
              <button type="button" onClick={unlockAll} className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] hover:text-brand-primary transition-colors">
                Sblocca tutti
              </button>
            )}
          </div>
          <div className="space-y-1 max-h-[280px] overflow-y-auto no-scrollbar">
            {selezionati.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--text-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
                Cerca sopra e aggiungi gli alimenti.
              </p>
            ) : (
              selezionati.map((item, idx) => {
                const a = allAlimentiForDisplay.find(x => x.id === item.alimentoId);
                if (!a) return null;
                const m = calculateMacroFromAlimento(a.per100g, item.quantita);
                const isPinned = pinnedForSolver.has(item.alimentoId);
                return (
                  <div
                    key={idx}
                    className={`composer-ingredient-row flex items-center gap-2 px-3 py-2 rounded-lg border min-w-0 ${
                      isPinned ? 'bg-[var(--background-secondary)] border-brand-primary/40' : 'bg-[var(--background-main)] border-[var(--border-color)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => togglePin(item.alimentoId)}
                      className={`shrink-0 p-1.5 rounded-md transition-colors ${isPinned ? 'text-brand-primary bg-brand-primary/10' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary)]'}`}
                      title={isPinned ? 'Sblocca' : 'Fissa quantità'}
                      aria-label={isPinned ? 'Sblocca' : 'Fissa'}
                    >
                      <LockIcon locked={isPinned} className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{a.nome}</div>
                      <div className="flex gap-2 text-[10px] text-[var(--text-secondary)]">
                        <span>{m.carboidrati}g C</span>
                        <span>{m.proteine}g P</span>
                        <span>{m.grassi}g G</span>
                        <span className="text-brand-primary/90">{Math.round(m.kcal)} kcal</span>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={item.quantita}
                      onChange={(e) => updateQuantita(idx, parseFloat(e.target.value) || 0)}
                      className={`min-w-[4.5rem] w-20 rounded-lg px-2 py-1.5 text-center text-sm font-bold tabular-nums outline-none border border-transparent focus:border-brand-primary bg-[var(--background-secondary)] text-[var(--text-primary)] [&::-webkit-inner-spin-button]:opacity-100 ${isPinned ? 'text-brand-primary' : ''}`}
                    />
                    <button onClick={() => removeAlimento(idx)} className="composer-remove-btn shrink-0 w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" aria-label="Rimuovi">×</button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-3.5 sm:py-4 border border-[var(--border-color)] rounded-xl font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-sm">Annulla</button>
          <button onClick={() => onSave(selezionati)} className="flex-1 py-3.5 sm:py-4 bg-brand-primary text-white rounded-xl font-semibold uppercase tracking-wider text-sm shadow-lg hover:bg-brand-primary-hover">Salva Pasto</button>
        </div>
      </div>

      {/* Modal anteprima risultati solver */}
      {showSolverModal && solverResult && (
        <SolverPreviewModal
          result={solverResult}
          onClose={() => {
            setShowSolverModal(false);
            setSolverResult(null);
            setLockedQuantities({});
          }}
          onLockToggle={handleLockToggle}
          onApply={applySolverToSelection}
          onAddSuggestion={handleAddSuggestion}
        />
      )}
    </div>
  );
};

function LockIcon({ locked, className }: { locked: boolean; className?: string }) {
  return (
    <svg className={`w-5 h-5 shrink-0 ${className ?? ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {locked ? (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      ) : (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 5.5-5 5 5 0 0 1 4.5 5" />
        </>
      )}
    </svg>
  );
}

function MagicWandIcon({ className }: { className?: string } = {}) {
  return (
    <svg className={`w-6 h-6 shrink-0 ${className ?? ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 4V2" />
      <path d="M15 16v-2" />
      <path d="M8 9h2" />
      <path d="M20 9h2" />
      <path d="M17.8 11.8L19 13" />
      <path d="M15 9h0" />
      <path d="M17.8 6.2L19 5" />
      <path d="m3 21 9-9" />
      <path d="M12.2 6.2 10 8.4" />
    </svg>
  );
}

interface SolverPreviewModalProps {
  result: MealSolverResult;
  onClose: () => void;
  onLockToggle: (alimentoId: string, currentGrams: number, currentlyLocked: boolean) => void;
  onApply: () => void;
  onAddSuggestion: (macro: MissingMacro) => void;
}

const SUGGESTION_LABELS: Record<NonNullable<MissingMacro>, string> = {
  carboidrati: 'Mancano carboidrati. Aggiungi Riso/Pasta?',
  proteine: 'Mancano proteine. Aggiungi Pollo/Tonno?',
  grassi: 'Mancano grassi. Aggiungi Olio/Avocado?',
};

const SolverPreviewModal: React.FC<SolverPreviewModalProps> = ({ result, onClose, onLockToggle, onApply, onAddSuggestion }) => {
  if (!result.success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-[var(--background-secondary)] rounded-3xl border-4 border-[var(--border-color)] shadow-2xl max-w-md w-full p-8 text-center" onClick={e => e.stopPropagation()}>
          <p className="text-[var(--text-primary)] font-bold text-lg mb-6">{result.message || 'Impossibile calcolare le quantità.'}</p>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Aggiungi una fonte proteica o di carboidrati per bilanciare il pasto.</p>
          <button onClick={onClose} className="py-4 px-8 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest">Chiudi</button>
        </div>
      </div>
    );
  }

  const { items, actual, precisionScore, matchScore, message, missingMacro, suggestions } = result;
  const score = typeof matchScore === 'number' ? matchScore : precisionScore;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--background-secondary)] rounded-3xl border-4 border-[var(--border-color)] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <h3 className="text-xl font-black uppercase text-[var(--text-primary)]">Anteprima quantità</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--background-main)] flex items-center justify-center text-2xl text-[var(--text-secondary)] hover:text-brand-primary">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <div className="flex justify-between text-sm font-bold text-[var(--text-secondary)] mb-2">
              <span>Precisione target</span>
              <span className={score < 80 ? 'text-amber-500' : 'text-brand-primary'}>{score}%</span>
            </div>
            <div className="h-3 bg-[var(--background-main)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-primary to-[#7C3AED]"
                style={{ width: `${Math.min(100, score)}%` }}
              />
            </div>
          </div>
          {message && <p className="text-sm text-[var(--text-secondary)] mb-4">{message}</p>}
          {suggestions && suggestions.length > 0 && (
            <ul className="mb-4 text-sm text-amber-600 dark:text-amber-400 space-y-1 list-disc list-inside">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {missingMacro && score < 80 && (
            <button
              type="button"
              onClick={() => onAddSuggestion(missingMacro)}
              className="w-full mb-4 py-3 px-4 rounded-2xl border-2 border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED] font-bold flex items-center justify-center gap-2 hover:bg-[#7C3AED]/20 transition-colors"
            >
              <MagicWandIcon className="w-5 h-5" />
              {SUGGESTION_LABELS[missingMacro]}
            </button>
          )}
          <ul className="space-y-4">
            {items.map((item: SolverResultItem) => (
              <li key={item.alimentoId} className="flex items-center justify-between gap-4 p-4 bg-[var(--background-main)] rounded-2xl border-2 border-[var(--border-color)]">
                <span className="font-bold text-[var(--text-primary)] truncate flex-1">{item.nome}</span>
                <span className="text-xl font-black text-brand-primary min-w-[3rem] text-right">
                  <AnimatedGramCounter value={item.quantita} />g
                </span>
                <LockToggle
                  locked={item.locked}
                  onToggle={() => onLockToggle(item.alimentoId, item.quantita, item.locked)}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 p-4 bg-gray-900 rounded-2xl text-white text-sm">
            <div className="flex justify-between font-bold">
              <span>Totale</span>
              <span>{Math.round(actual.kcal)} kcal · C {Math.round(actual.carboidrati)} · P {Math.round(actual.proteine)} · G {Math.round(actual.grassi)}</span>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-[var(--border-color)] flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 border-2 border-[var(--border-color)] rounded-2xl font-black text-[var(--text-secondary)] uppercase tracking-widest">Annulla</button>
          <button onClick={onApply} className="flex-1 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-brand-primary-hover">Aggiungi al diario</button>
        </div>
      </div>
    </div>
  );
};

const LockToggle: React.FC<{ locked: boolean; onToggle: () => void }> = ({ locked, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    title={locked ? 'Sblocca quantità e ricalcola' : 'Blocca quantità e ricalcola il resto'}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${locked ? 'bg-brand-primary text-white' : 'bg-[var(--background-secondary)] border-2 border-[var(--border-color)] text-[var(--text-secondary)] hover:border-brand-primary hover:text-brand-primary'}`}
  >
    <LockIcon locked={locked} />
    {locked ? 'Bloccato' : 'Blocca'}
  </button>
);

const OVER_TARGET_THRESHOLD = 1.05;

const UnifiedStat: React.FC<{
  label: string;
  actual: number;
  target: number;
  diff: number;
  unit: string;
  highlight?: boolean;
}> = ({ label, actual, target, diff, unit, highlight }) => {
  const isOk = Math.abs(diff) < (unit ? 5 : 15);
  const isOverTarget = target > 0 && actual > target * OVER_TARGET_THRESHOLD;
  const diffColor = diff > 0 ? 'text-rose-400' : 'text-emerald-400';
  const diffLabel = unit ? `${diff > 0 ? '+' : ''}${Math.round(diff)}${unit}` : `${diff > 0 ? '+' : ''}${Math.round(diff)} kcal`;
  return (
    <div className={`flex flex-col items-center justify-center min-w-0 py-1.5 px-1 rounded-lg ${highlight ? 'bg-brand-primary/90 text-white' : 'bg-white/5'}`}>
      <span className="text-[10px] font-medium opacity-60 uppercase tracking-wider">{label}</span>
      <div className="text-sm sm:text-base font-bold tabular-nums mt-0.5 leading-tight">
        <span style={isOverTarget && !highlight ? { color: 'var(--brand-primary)' } : undefined}>{actual}</span>
        <span className="text-[10px] font-normal opacity-70"> / {target}{unit ? unit : ''}</span>
      </div>
      <span className={`text-[9px] font-semibold mt-0.5 ${isOk ? 'text-emerald-400' : diffColor}`}>{diffLabel}</span>
    </div>
  );
};

export default MealComposer;
