
import React, { useState } from 'react';
import { Alimento } from '../types';
import { CERTIFIED_ALIMENTO_IDS } from '../constants';

interface FoodManagerProps {
  alimenti: Alimento[];
  onAdd: (alimento: Alimento) => void;
  onUpdate: (alimento: Alimento) => void;
  onDelete: (id: string) => void;
}

const FoodManager: React.FC<FoodManagerProps> = ({ alimenti, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Alimento>>({
    nome: '',
    per100g: { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 }
  });

  const filteredAlimenti = alimenti.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const handleSave = () => {
    if (!form.nome || !form.per100g) return;
    const calcKcal = Math.round(form.per100g.carboidrati * 4 + form.per100g.proteine * 4 + form.per100g.grassi * 9);
    const isNew = !editingId;
    const alimentoData: Alimento = {
      id: editingId || Date.now().toString(),
      nome: form.nome,
      per100g: { ...form.per100g, kcal: calcKcal },
      isCustom: isNew ? true : (form.isCustom ?? true)
    };
    if (editingId) onUpdate(alimentoData);
    else onAdd(alimentoData);
    resetForm();
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ nome: '', per100g: { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 } });
  };

  const startEdit = (alimento: Alimento) => {
    setEditingId(alimento.id);
    setForm(alimento);
    setIsAdding(true);
  };

  return (
    <div className="food-manager max-w-5xl mx-auto space-y-4 md:space-y-6 px-3 md:px-0 pb-[max(5rem,env(safe-area-inset-bottom))] transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-4 md:p-6 bg-[var(--background-secondary)] rounded-xl md:rounded-2xl border border-[var(--border-color)] shadow-card">
        <h2 className="text-xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight">Archivio Alimenti</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto min-h-[44px] bg-brand-primary text-white px-6 py-3 md:py-4 rounded-2xl font-black hover:bg-brand-primary-hover shadow-lg transition-all text-sm md:text-base uppercase tracking-widest"
        >
          ➕ AGGIUNGI ALIMENTO
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Cerca per nome alimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="food-manager-search w-full min-h-[44px] bg-[var(--background-secondary)] border border-[var(--border-color)] focus:border-brand-primary rounded-xl md:rounded-2xl pl-10 pr-4 py-3 text-[var(--text-primary)] font-semibold text-base outline-none transition-colors"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-[var(--text-secondary)] pointer-events-none" aria-hidden>🔍</span>
      </div>

      {isAdding && (
        <div className="bg-[var(--background-secondary)] p-4 md:p-8 rounded-2xl md:rounded-3xl border border-[var(--border-color)] shadow-card space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-lg md:text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{editingId ? '✏️ MODIFICA' : '✨ NUOVO'} ALIMENTO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="col-span-full">
              <label className="block text-[10px] md:text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 tracking-wider">NOME ALIMENTO</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full min-h-[44px] bg-[var(--background-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 font-bold text-[var(--text-primary)] outline-none focus:border-brand-primary transition-colors"
              />
            </div>
            <FormMacroInput label="CARBOIDRATI (100g)" val={form.per100g?.carboidrati} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, carboidrati: v } }))} />
            <FormMacroInput label="PROTEINE (100g)" val={form.per100g?.proteine} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, proteine: v } }))} />
            <FormMacroInput label="GRASSI (100g)" val={form.per100g?.grassi} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, grassi: v } }))} />
            <div>
              <label className="block text-[10px] md:text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 tracking-wider">KCAL (AUTO)</label>
              <input
                type="number"
                disabled
                value={Math.round((form.per100g?.carboidrati || 0) * 4 + (form.per100g?.proteine || 0) * 4 + (form.per100g?.grassi || 0) * 9)}
                className="w-full min-h-[44px] bg-[var(--background-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 font-bold text-[var(--text-secondary)]"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button onClick={resetForm} className="min-h-[44px] px-6 py-3 border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--background-main)] transition-all uppercase tracking-wider text-sm">ANNULLA</button>
            <button onClick={handleSave} className="min-h-[44px] px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover shadow-lg transition-all uppercase tracking-wider text-sm">SALVA ALIMENTO</button>
          </div>
        </div>
      )}

      <ul className="space-y-2 md:space-y-3" role="list">
        {filteredAlimenti.map(alimento => (
          <FoodCard
            key={alimento.id}
            alimento={alimento}
            onEdit={() => startEdit(alimento)}
            onDelete={() => onDelete(alimento.id)}
            canEdit={!CERTIFIED_ALIMENTO_IDS.has(alimento.id)}
          />
        ))}
      </ul>
    </div>
  );
};

const FoodCard: React.FC<{
  alimento: Alimento;
  onEdit: () => void;
  onDelete: () => void;
  canEdit: boolean;
}> = ({ alimento, onEdit, onDelete, canEdit }) => {
  const { nome, per100g } = alimento;
  const isCertified = !canEdit;
  return (
    <li className="food-card bg-[var(--background-secondary)] rounded-xl border border-[var(--border-color)] shadow-card overflow-hidden transition-colors">
      <div className="p-3 md:p-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[var(--text-primary)] text-base md:text-lg truncate">{nome}</span>
            {isCertified && (
              <span className="food-card-verified shrink-0 inline-flex items-center justify-center" title="Alimento verificato AB Nutrition" aria-label="Verificato">
                <VerifiedBadgeIcon className="w-5 h-5" />
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <span className="food-card-macro text-[11px] md:text-xs font-semibold text-[var(--text-secondary)]">C {per100g.carboidrati}g</span>
            <span className="food-card-macro text-[11px] md:text-xs font-semibold text-[var(--text-secondary)]">P {per100g.proteine}g</span>
            <span className="food-card-macro text-[11px] md:text-xs font-semibold text-[var(--text-secondary)]">F {per100g.grassi}g</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-black text-brand-primary text-lg md:text-xl tabular-nums">{per100g.kcal}</span>
          <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">kcal</span>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="food-manager-btn-edit min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--background-main)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] transition-colors"
                aria-label="Modifica"
              >
                <PencilIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="food-manager-btn-delete min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--background-main)] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                aria-label="Elimina"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
};

/** Spunta blu stile profilo verificato (social) – compatto, niente a capo */
function VerifiedBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#3B82F6" />
      <path d="M8 12l3 3 5-6" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

const FormMacroInput: React.FC<{ label: string; val: number | undefined; onChange: (v: number) => void }> = ({ label, val, onChange }) => (
  <div>
    <label className="block text-[10px] md:text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 tracking-wider">{label}</label>
    <input
      type="number"
      value={val}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full min-h-[44px] bg-[var(--background-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 font-bold text-[var(--text-primary)] outline-none focus:border-brand-primary transition-colors"
    />
  </div>
);

export default FoodManager;
