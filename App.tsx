
import React, { useState, useEffect } from 'react';
import { AppState, Alimento, AlimentoSelezionato, NomePasto, SettimanaConfig, TipologiaGiornataConfig, PastoComposto, PastoStatus } from './types';
import { INITIAL_ALIMENTI } from './constants';
import { loadStateFromLocalStorage, saveStateToLocalStorage, STORAGE_KEY } from './utils';
import Header from './components/Header';
import SetupWizard from './components/SetupWizard';
import FoodManager from './components/FoodManager';
import DailyPlanner from './components/DailyPlanner';
import Diary from './components/Diary';

const App: React.FC = () => {
  // Inizializzazione stato: prova a caricare dal localStorage, altrimenti usa il default
  const [state, setState] = useState<AppState>(() => {
    const saved = loadStateFromLocalStorage();
    if (saved) return saved;
    return {
      isConfigured: false,
      settimane: [],
      tipologie: [],
      alimenti: INITIAL_ALIMENTI,
      pastiSalvati: [],
      dailySetups: []
    };
  });

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Salva lo stato ogni volta che cambia
  useEffect(() => {
    saveStateToLocalStorage(state);
  }, [state]);

  const handleSetupComplete = (weeks: SettimanaConfig[], tipologie: TipologiaGiornataConfig[]) => {
    setState(prev => ({
      ...prev,
      isConfigured: true,
      settimane: weeks,
      tipologie: tipologie
    }));
    setCurrentTab('dashboard');
  };

  const addAlimento = (a: Alimento) => {
    setState(prev => ({ ...prev, alimenti: [...prev.alimenti, a] }));
  };

  const updateAlimento = (a: Alimento) => {
    setState(prev => ({ ...prev, alimenti: prev.alimenti.map(x => x.id === a.id ? a : x) }));
  };

  const deleteAlimento = (id: string) => {
    setState(prev => ({ ...prev, alimenti: prev.alimenti.filter(x => x.id !== id) }));
  };

  const handleSaveMeal = (date: string, week: number, type: string, mealName: NomePasto, items: AlimentoSelezionato[], status: PastoStatus = 'regular') => {
    setState(prev => {
      const existingIdx = prev.pastiSalvati.findIndex(p => p.data === date && p.nomePasto === mealName);

      const newPasto: PastoComposto = {
        id: existingIdx >= 0 ? prev.pastiSalvati[existingIdx].id : Date.now().toString(),
        data: date,
        settimana: week,
        tipologiaGiornata: type as any,
        nomePasto: mealName,
        alimenti: items,
        status: status
      };

      const newPasti = [...prev.pastiSalvati];
      if (existingIdx >= 0) {
        newPasti[existingIdx] = newPasto;
      } else {
        newPasti.push(newPasto);
      }

      // Aggiorna anche il setup giornaliero (quale settimana/tipo è stata usata)
      const existingSetupIdx = prev.dailySetups.findIndex(s => s.date === date);
      const newSetups = [...prev.dailySetups];
      const newSetup = { date, settimana: week, tipologiaGiornata: type as any };
      if (existingSetupIdx >= 0) {
        newSetups[existingSetupIdx] = newSetup;
      } else {
        newSetups.push(newSetup);
      }

      return { ...prev, pastiSalvati: newPasti, dailySetups: newSetups };
    });
  };

  const exportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `dieta_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      if (event.target?.result) {
        try {
          const imported = JSON.parse(event.target.result as string);
          // Validazione minima
          if (imported.alimenti && imported.settimane) {
            setState(imported);
            alert('Configurazione importata con successo!');
          } else {
            throw new Error("Formato file non valido");
          }
        } catch (err) {
          alert('Errore durante l\'importazione. Il file non è valido.');
        }
      }
    };
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0]);
    }
  };

  // RESET DEFINITIVO: Pulisce storage e ricarica la pagina per evitare stati sporchi in memoria
  const handleReset = () => {
    const confirmMessage = "ATTENZIONE: Questa azione cancellerà permanentemente tutti i tuoi dati, lo storico dei pasti e le impostazioni delle 5 settimane.\n\nVuoi procedere con il RESET TOTALE?";
    if (window.confirm(confirmMessage)) {
      localStorage.removeItem(STORAGE_KEY);
      // Ricarichiamo la pagina per forzare l'app a ripartire dallo stato iniziale pulito
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen pb-12 flex flex-col transition-colors">
      <Header currentTab={currentTab} setTab={setCurrentTab} isConfigured={state.isConfigured} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 md:py-8">
        {!state.isConfigured ? (
          <div className="space-y-12 py-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Setup Programma</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto leading-relaxed">Configura i tuoi obiettivi energetici e la distribuzione dei nutrienti per le prossime 5 settimane.</p>
            </div>
            <SetupWizard
              onComplete={handleSetupComplete}
              initialWeeks={state.settimane.length > 0 ? state.settimane : undefined}
              initialTipologie={state.tipologie.length > 0 ? state.tipologie : undefined}
            />
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DailyPlanner
                state={state}
                onSaveMeal={handleSaveMeal}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}
            {currentTab === 'diary' && (
              <Diary state={state} onDateSelect={(d) => { setSelectedDate(d); setCurrentTab('dashboard'); }} />
            )}
            {currentTab === 'foods' && (
              <FoodManager
                alimenti={state.alimenti}
                onAdd={addAlimento}
                onUpdate={updateAlimento}
                onDelete={deleteAlimento}
              />
            )}
            {currentTab === 'config' && (
              <div className="max-w-2xl mx-auto space-y-8 bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm transition-colors animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">⚙️</span>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Impostazioni</h2>
                </div>

                <div className="space-y-10">
                  <section className="group">
                    <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-4 group-hover:text-indigo-500 transition-colors">Export Dati (Backup)</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Scarica un file JSON con tutta la tua configurazione e lo storico. Utile per non perdere dati o per spostarli su un altro dispositivo.</p>
                    <button onClick={exportConfig} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transition-all uppercase tracking-widest text-xs">Esporta JSON</button>
                  </section>

                  <section className="group">
                    <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest mb-4 group-hover:text-indigo-500 transition-colors">Import Dati</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Carica un file di backup salvato in precedenza. Attenzione: i dati attuali verranno sovrascritti.</p>
                    <div className="relative overflow-hidden inline-block">
                      <input
                        type="file"
                        accept=".json"
                        onChange={importConfig}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <div className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-gray-700 transition-all uppercase tracking-widest text-xs inline-block">Sfoglia File</div>
                    </div>
                  </section>

                  <section className="pt-10 border-t border-gray-100 dark:border-gray-800 group">
                    <h3 className="text-xs font-black uppercase text-rose-500 tracking-widest mb-4">Zona Pericolo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Se vuoi cancellare tutto e ricominciare da zero (nuovo piano 5 settimane), usa questo tasto.</p>
                    <button onClick={handleReset} className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 px-8 py-4 rounded-2xl font-black hover:bg-rose-100 dark:hover:bg-rose-900/30 border-2 border-rose-100 dark:border-rose-900/50 transition-all uppercase tracking-widest text-xs">Reset Totale App</button>
                  </section>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-gray-100 dark:border-gray-800 py-10 text-center text-gray-400 dark:text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">
        <p>AB PRO Athletic Diet Planner &bull; Built for Peak Performance</p>
      </footer>
    </div>
  );
};

export default App;
