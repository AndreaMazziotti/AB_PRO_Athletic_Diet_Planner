
import React, { useState, useMemo } from 'react';
import { Alimento, AlimentoSelezionato } from '../types';
import { calculateMacroFromAlimento } from '../utils';

interface MealComposerProps {
  target: { carboidrati: number; proteine: number; grassi: number; kcal: number };
  pastoLabel: string;
  alimenti: Alimento[];
  onSave: (selezionati: AlimentoSelezionato[]) => void;
  onCancel: () => void;
  initialSelection?: AlimentoSelezionato[];
}

const MealComposer: React.FC<MealComposerProps> = ({ target, pastoLabel, alimenti, onSave, onCancel, initialSelection = [] }) => {
  const [selezionati, setSelezionati] = useState<AlimentoSelezionato[]>(initialSelection);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

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
    setSelezionati(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantita = (index: number, q: number) => {
    setSelezionati(prev => prev.map((item, i) => i === index ? { ...item, quantita: q } : item));
  };

  const totals = useMemo(() => {
    return selezionati.reduce((acc, curr) => {
      const a = alimenti.find(x => x.id === curr.alimentoId);
      if (!a) return acc;
      const m = calculateMacroFromAlimento(a.per100g, curr.quantita);
      return {
        carboidrati: acc.carboidrati + m.carboidrati,
        proteine: acc.proteine + m.proteine,
        grassi: acc.grassi + m.grassi,
        kcal: acc.kcal + m.kcal,
      };
    }, { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 });
  }, [selezionati, alimenti]);

  const diffs = {
    carboidrati: totals.carboidrati - target.carboidrati,
    proteine: totals.proteine - target.proteine,
    grassi: totals.grassi - target.grassi,
    kcal: totals.kcal - target.kcal,
  };

  return (
    <div className="max-w-3xl mx-auto bg-[var(--background-secondary)] rounded-[3rem] border-4 border-[var(--border-color)] shadow-2xl overflow-hidden">
      <div className="p-8 bg-brand-primary text-white flex justify-between items-center">
        <h2 className="text-3xl font-black uppercase tracking-tight">{pastoLabel}</h2>
        <button onClick={onCancel} className="bg-white/20 hover:bg-white/40 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-3xl transition-colors">&times;</button>
      </div>

      <div className="p-8 space-y-8">
        {/* Targets Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-[var(--background-main)] rounded-3xl border-2 border-[var(--border-color)]">
          <TargetItem label="CARBS" val={target.carboidrati} unit="g" />
          <TargetItem label="PROT" val={target.proteine} unit="g" />
          <TargetItem label="FAT" val={target.grassi} unit="g" />
          <TargetItem label="KCAL" val={target.kcal} unit="" highlight />
        </div>

        {/* Selected List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
          {selezionati.map((item, idx) => {
            const a = alimenti.find(x => x.id === item.alimentoId);
            if (!a) return null;
            const m = calculateMacroFromAlimento(a.per100g, item.quantita);
            return (
              <div key={idx} className="p-6 bg-[var(--background-main)] border-2 border-[var(--border-color)] rounded-3xl flex flex-col sm:flex-row justify-between sm:items-center gap-6 group">
                <div className="space-y-1">
                  <div className="text-xl font-black text-[var(--text-primary)]">{a.nome}</div>
                  <div className="flex gap-4 text-xs font-bold text-[var(--text-secondary)]">
                    <span>C: {m.carboidrati}g</span>
                    <span>P: {m.proteine}g</span>
                    <span>G: {m.grassi}g</span>
                    <span className="text-brand-primary">{Math.round(m.kcal)} kcal</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" 
                    value={item.quantita}
                    onChange={(e) => updateQuantita(idx, parseFloat(e.target.value) || 0)}
                    className="w-24 bg-[var(--background-secondary)] border-4 border-transparent focus:border-brand-primary rounded-2xl px-3 py-2 text-center font-black text-xl outline-none text-[var(--text-primary)]"
                  />
                  <button onClick={() => removeAlimento(idx)} className="text-rose-500 text-3xl font-black">&times;</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Cerca alimento..."
            value={searchTerm}
            onFocus={() => setShowResults(true)}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-16 bg-[var(--background-main)] border-4 border-transparent focus:border-brand-primary rounded-2xl px-6 font-black text-xl outline-none transition-all text-[var(--text-primary)]"
          />
          {showResults && searchTerm.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-4 bg-[var(--background-secondary)] border-4 border-[var(--border-color)] rounded-3xl shadow-2xl z-50 max-h-64 overflow-y-auto">
              {filtered.map(a => (
                <button key={a.id} onClick={() => addAlimento(a)} className="w-full text-left px-6 py-4 hover:bg-[var(--background-main)] border-b last:border-0 border-[var(--border-color)] font-bold text-lg text-[var(--text-primary)]">
                  {a.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Diffs */}
        <div className="p-8 bg-gray-900 dark:bg-black text-white rounded-[3rem] space-y-6">
          <div className="flex justify-between items-center text-sm font-black text-gray-400 uppercase tracking-widest">
            <span>Totali Attuali</span>
            <span className="text-2xl text-white">{Math.round(totals.kcal)} <span className="text-sm opacity-50">/ {target.kcal} kcal</span></span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <ComparisonStat label="CARBS" actual={totals.carboidrati} target={target.carboidrati} diff={diffs.carboidrati} />
            <ComparisonStat label="PROT" actual={totals.proteine} target={target.proteine} diff={diffs.proteine} />
            <ComparisonStat label="FAT" actual={totals.grassi} target={target.grassi} diff={diffs.grassi} />
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-5 border-4 border-[var(--border-color)] rounded-3xl font-black text-[var(--text-secondary)] uppercase tracking-widest text-sm">Annulla</button>
          <button onClick={() => onSave(selezionati)} className="flex-1 py-5 bg-brand-primary text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-brand-primary-hover">Salva Pasto</button>
        </div>
      </div>
    </div>
  );
};

const TargetItem: React.FC<{ label: string; val: number; unit: string; highlight?: boolean }> = ({ label, val, unit, highlight }) => (
  <div className={`p-4 rounded-2xl flex flex-col items-center ${highlight ? 'bg-brand-primary text-white' : 'bg-[var(--background-secondary)] border-2 border-[var(--border-color)]'}`}>
    <span className="text-[10px] font-black opacity-60 mb-1">{label}</span>
    <div className="text-2xl font-black">{val}<span className="text-sm ml-1 opacity-50">{unit}</span></div>
  </div>
);

const OVER_TARGET_THRESHOLD = 1.05; // 5% oltre il target = stato allerta

const ComparisonStat: React.FC<{ label: string; actual: number; target: number; diff: number }> = ({ label, actual, target, diff }) => {
  const isOk = Math.abs(diff) < 5;
  const isOverTarget = target > 0 && actual > target * OVER_TARGET_THRESHOLD;
  const diffColor = diff > 0 ? 'text-rose-400' : 'text-brand-primary';
  return (
    <div className="flex flex-col items-center space-y-2">
      <span className="text-[10px] font-black opacity-50 tracking-widest">{label}</span>
      <div className="text-2xl font-black tabular-nums">
        <span style={isOverTarget ? { color: 'var(--brand-primary)' } : undefined}>{Math.round(actual)}</span>
        <span className="text-xs opacity-20">/{target}</span>
      </div>
      <div className={`text-xs font-black px-2 py-1 rounded-xl border-2 border-current ${isOk ? 'text-emerald-400' : diffColor} bg-white/5`}>
        {diff > 0 ? `+${Math.round(diff)}` : Math.round(diff)}g
      </div>
    </div>
  );
};

export default MealComposer;
