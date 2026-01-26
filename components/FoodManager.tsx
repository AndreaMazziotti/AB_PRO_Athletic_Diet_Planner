
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20 transition-colors">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-md">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Archivio Alimenti</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all text-base uppercase tracking-widest"
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
          className="w-full bg-white dark:bg-gray-900 border-4 border-transparent dark:border-gray-800 focus:border-indigo-500 rounded-[2rem] px-16 py-6 shadow-md text-gray-900 dark:text-white font-black text-xl outline-none transition-all"
        />
        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl text-gray-400 group-focus-within:text-indigo-500 transition-colors">🔍</span>
      </div>

      {isAdding && (
        <div className="bg-white dark:bg-gray-900 p-10 rounded-[3rem] border-4 border-indigo-100 dark:border-indigo-900 shadow-2xl space-y-10 animate-in fade-in zoom-in-95 duration-200">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{editingId ? '✏️ MODIFICA' : '✨ NUOVO'} ALIMENTO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="col-span-full">
              <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-3 tracking-[0.2em]">NOME ALIMENTO</label>
              <input 
                type="text" 
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-xl"
              />
            </div>
            <FormMacroInput label="CARBOIDRATI (100g)" val={form.per100g?.carboidrati} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, carboidrati: v } }))} />
            <FormMacroInput label="PROTEINE (100g)" val={form.per100g?.proteine} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, proteine: v } }))} />
            <FormMacroInput label="GRASSI (100g)" val={form.per100g?.grassi} onChange={(v) => setForm(f => ({ ...f, per100g: { ...f.per100g!, grassi: v } }))} />
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-3 tracking-[0.2em]">KCAL (AUTO)</label>
              <input 
                type="number" 
                disabled
                value={Math.round((form.per100g?.carboidrati || 0) * 4 + (form.per100g?.proteine || 0) * 4 + (form.per100g?.grassi || 0) * 9)}
                className="w-full bg-gray-100 dark:bg-gray-950 border-2 border-transparent rounded-2xl px-6 py-4 font-black text-gray-400 dark:text-gray-600 text-xl"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12">
            <button onClick={resetForm} className="px-10 py-5 border-4 border-gray-100 dark:border-gray-800 rounded-[2rem] font-black text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase tracking-widest text-sm">ANNULLA</button>
            <button onClick={handleSave} className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all uppercase tracking-widest text-sm">SALVA ALIMENTO</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left text-base min-w-[700px]">
          <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 font-black uppercase text-xs tracking-widest border-b-2 border-gray-100 dark:border-gray-800">
            <tr>
              <th className="px-10 py-6">Nome Alimento</th>
              <th className="px-4 py-6 text-center">Carbs</th>
              <th className="px-4 py-6 text-center">Prot</th>
              <th className="px-4 py-6 text-center">Fat</th>
              <th className="px-4 py-6 text-center">Kcal</th>
              <th className="px-10 py-6 text-right">Gestisci</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-gray-50 dark:divide-gray-800">
            {filteredAlimenti.map(alimento => (
              <tr key={alimento.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors group">
                <td className="px-10 py-6 font-black text-gray-900 dark:text-gray-50 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{alimento.nome}</td>
                <td className="px-4 py-6 text-center font-bold text-gray-600 dark:text-gray-400">{alimento.per100g.carboidrati}g</td>
                <td className="px-4 py-6 text-center font-bold text-gray-600 dark:text-gray-400">{alimento.per100g.proteine}g</td>
                <td className="px-4 py-6 text-center font-bold text-gray-600 dark:text-gray-400">{alimento.per100g.grassi}g</td>
                <td className="px-4 py-6 text-center font-black text-indigo-600 dark:text-indigo-400 text-xl">{alimento.per100g.kcal}</td>
                <td className="px-10 py-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => startEdit(alimento)} className="p-4 bg-gray-50 dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-blue-200">✏️</button>
                    <button onClick={() => onDelete(alimento.id)} className="p-4 bg-gray-50 dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-red-200">🗑️</button>
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
    <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-3 tracking-[0.2em]">{label}</label>
    <input 
      type="number" 
      value={val}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-6 py-4 font-black text-gray-900 dark:text-white outline-none focus:border-indigo-500 transition-all text-xl"
    />
  </div>
);

export default FoodManager;
