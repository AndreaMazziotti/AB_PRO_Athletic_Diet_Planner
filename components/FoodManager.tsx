
import React, { useState } from 'react';
import { Alimento } from '../types';

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
    const alimentoData: Alimento = {
      id: editingId || Date.now().toString(),
      nome: form.nome,
      per100g: { ...form.per100g, kcal: calcKcal }
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
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-8 pb-20 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 bg-[var(--background-secondary)] p-4 md:p-8 rounded-xl md:rounded-[2.5rem] border border-[var(--border-color)] shadow-card">
        <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Archivio Alimenti</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-brand-primary text-white px-10 py-5 rounded-[2rem] font-black hover:bg-brand-primary-hover shadow-lg transition-all text-base uppercase tracking-widest"
        >
          ➕ AGGIUNGI ALIMENTO
        </button>
      </div>

      <div className="relative group">
        <input 
          type="text" 
          placeholder="Cerca per nome alimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--background-secondary)] border-4 border-transparent focus:border-brand-primary rounded-[2rem] px-16 py-6 shadow-md text-[var(--text-primary)] font-black text-xl outline-none transition-all"
        />
        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl text-[var(--text-secondary)] group-focus-within:text-brand-primary transition-colors">🔍</span>
      </div>

      {isAdding && (
        <div className="bg-[var(--background-secondary)] p-10 rounded-[3rem] border-4 border-[var(--border-color)] shadow-2xl space-y-10 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tight">{editingId ? '✏️ MODIFICA' : '✨ NUOVO'} ALIMENTO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="col-span-full">
              <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-3 tracking-[0.2em]">NOME ALIMENTO</label>
              <input 
                type="text" 
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full bg-[var(--background-main)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 font-black text-[var(--text-primary)] outline-none focus:border-brand-primary transition-all text-xl"
              />
            </div>
            <FormMacroInput label="CARBOIDRATI (100g)" val={form.per100g?.carboidrati} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, carboidrati: v } }))} />
            <FormMacroInput label="PROTEINE (100g)" val={form.per100g?.proteine} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, proteine: v } }))} />
            <FormMacroInput label="GRASSI (100g)" val={form.per100g?.grassi} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, grassi: v } }))} />
            <div>
              <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-3 tracking-[0.2em]">KCAL (AUTO)</label>
              <input 
                type="number" 
                disabled
                value={Math.round((form.per100g?.carboidrati || 0) * 4 + (form.per100g?.proteine || 0) * 4 + (form.per100g?.grassi || 0) * 9)}
                className="w-full bg-[var(--background-main)] border-2 border-transparent rounded-2xl px-6 py-4 font-black text-[var(--text-secondary)] text-xl"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12">
            <button onClick={resetForm} className="px-10 py-5 border-4 border-[var(--border-color)] rounded-[2rem] font-black text-[var(--text-secondary)] hover:bg-[var(--background-main)] transition-all uppercase tracking-widest text-sm">ANNULLA</button>
            <button onClick={handleSave} className="px-10 py-5 bg-brand-primary text-white rounded-[2rem] font-black hover:bg-brand-primary-hover shadow-xl transition-all uppercase tracking-widest text-sm">SALVA ALIMENTO</button>
          </div>
        </div>
      )}

      <div className="bg-[var(--background-secondary)] rounded-[3rem] border-2 border-[var(--border-color)] overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left text-base min-w-[700px]">
          <thead className="bg-[var(--background-main)] text-[var(--text-secondary)] font-black uppercase text-xs tracking-widest border-b-2 border-[var(--border-color)]">
            <tr>
              <th className="px-10 py-6">Nome Alimento</th>
              <th className="px-4 py-6 text-center">Carbs</th>
              <th className="px-4 py-6 text-center">Prot</th>
              <th className="px-4 py-6 text-center">Fat</th>
              <th className="px-4 py-6 text-center">Kcal</th>
              <th className="px-10 py-6 text-right">Gestisci</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[var(--border-color)]">
            {filteredAlimenti.map(alimento => (
              <tr key={alimento.id} className="hover:bg-[var(--background-main)] transition-colors group">
                <td className="px-10 py-6 font-black text-[var(--text-primary)] text-lg group-hover:text-brand-primary transition-colors">{alimento.nome}</td>
                <td className="px-4 py-6 text-center font-bold text-[var(--text-secondary)]">{alimento.per100g.carboidrati}g</td>
                <td className="px-4 py-6 text-center font-bold text-[var(--text-secondary)]">{alimento.per100g.proteine}g</td>
                <td className="px-4 py-6 text-center font-bold text-[var(--text-secondary)]">{alimento.per100g.grassi}g</td>
                <td className="px-4 py-6 text-center font-black text-brand-primary text-xl">{alimento.per100g.kcal}</td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => startEdit(alimento)} className="p-4 bg-[var(--background-main)] text-blue-600 dark:text-blue-400 hover:opacity-80 rounded-2xl transition-all shadow-sm border border-[var(--border-color)]">✏️</button>
                    <button onClick={() => onDelete(alimento.id)} className="p-4 bg-[var(--background-main)] text-red-600 dark:text-red-400 hover:opacity-80 rounded-2xl transition-all shadow-sm border border-[var(--border-color)]">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const FormMacroInput: React.FC<{ label: string; val: number | undefined; onChange: (v: number) => void }> = ({ label, val, onChange }) => (
  <div>
    <label className="block text-xs font-black uppercase text-[var(--text-secondary)] mb-3 tracking-[0.2em]">{label}</label>
    <input 
      type="number" 
      value={val}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-[var(--background-main)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 font-black text-[var(--text-primary)] outline-none focus:border-brand-primary transition-all text-xl"
    />
  </div>
);

export default FoodManager;
