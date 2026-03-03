
import React, { useState } from 'react';
import { FacileSetupPreferences, EasyModeTargets } from '../types';
import { SettimanaConfig, TipologiaGiornataConfig } from '../types';
import { TIPOLOGIE_GIORNATA } from '../constants';
import { calculateMacrosFromPercentages, calculateEasyModeTargets } from '../utils';

const TOTAL_STEPS = 4;
const progressPercent = (step: number) => (step / TOTAL_STEPS) * 100;

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
];

interface SetupWizardFacileProps {
  onComplete: (prefs: FacileSetupPreferences, settimane: SettimanaConfig[], tipologie: TipologiaGiornataConfig[], easyModeTargets: EasyModeTargets) => void;
}

function buildSettimaneFromFacile(prefs: FacileSetupPreferences): SettimanaConfig[] {
  const kcalOn = prefs.kcal_on ?? prefs.targetCalories ?? 2500;
  const kcalOff = prefs.kcal_off ?? prefs.targetCalories ?? 2000;
  const macrosOn = calculateMacrosFromPercentages(kcalOn, 30, 45, 25);
  const macrosOff = calculateMacrosFromPercentages(kcalOff, 30, 45, 25);
  return Array.from({ length: 5 }, (_, i) => ({
    numero: i + 1,
    giorniON: { calorieTotal: kcalOn, macros: macrosOn },
    giorniOFF: { calorieTotal: kcalOff, macros: macrosOff },
  }));
}

function buildTipologieFromFacile(prefs: FacileSetupPreferences): TipologiaGiornataConfig[] {
  const numPasti = prefs.mealFrequency;
  const isMattina = prefs.trainingTiming === 'morning';

  const onTipo = numPasti === 4
    ? (isMattina ? 'ON_4_PASTI_WOD_MATTINA' : 'ON_4_PASTI_WOD_SERA')
    : (isMattina ? 'ON_5_PASTI_WOD_MATTINA' : 'ON_5_PASTI_WOD_SERA');
  const offTipo = numPasti === 4 ? 'OFF_4_PASTI' : 'OFF_5_PASTI';

  return TIPOLOGIE_GIORNATA.filter(t => t.tipo === onTipo || t.tipo === offTipo);
}

const SetupWizardFacile: React.FC<SetupWizardFacileProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [kcalOn, setKcalOn] = useState(2500);
  const [kcalOff, setKcalOff] = useState(2000);
  const [mealFrequency, setMealFrequency] = useState<4 | 5>(4);
  const [trainingTiming, setTrainingTiming] = useState<'morning' | 'afternoon'>('afternoon');
  const [onDays, setOnDays] = useState<number[]>([1, 2, 3, 4, 5]); // Lun-Ven default

  const toggleDay = (day: number) => {
    setOnDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const prefs: FacileSetupPreferences = {
    kcal_on: kcalOn,
    kcal_off: kcalOff,
    mealFrequency,
    trainingTiming,
    onDays,
  };

  const handleGenerate = () => {
    const settimane = buildSettimaneFromFacile(prefs);
    const tipologie = buildTipologieFromFacile(prefs);
    const easyModeTargets = calculateEasyModeTargets(prefs.kcal_on, prefs.kcal_off, prefs.mealFrequency, prefs.trainingTiming);
    onComplete(prefs, settimane, tipologie, easyModeTargets);
  };

  return (
    <div className="setup-wizard-facile max-w-2xl mx-auto rounded-xl md:rounded-2xl transition-colors">
      <div className="px-3 sm:px-4 md:px-10 pb-24 md:pb-12">
        <div className="mb-5 md:mb-8">
          <span className="text-[var(--brand-primary)] font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] block mb-1">
            Modalità facile
          </span>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Step {step} di {TOTAL_STEPS}
          </h1>
          <div className="setup-progress-track mt-2 h-1.5 w-full rounded-full bg-[var(--background-main)] overflow-hidden">
            <div
              className="setup-progress-fill h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300 ease-out"
              style={{ width: `${progressPercent(step)}%` }}
            />
          </div>
        </div>

        <div key={step} className="space-y-6 animate-fade-in">
          {step === 1 && (
            <div className="p-4 md:p-6 rounded-2xl bg-[var(--background-secondary)] border border-[var(--border-color)] space-y-6">
              <label className="block text-sm font-bold text-[var(--text-primary)]">
                Calorie per tipo di giornata
              </label>
              <p className="text-xs text-[var(--text-secondary)] -mt-2">Imposta quote diverse per giorni di allenamento e riposo.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Kcal Giorni Allenamento (ON)</label>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      value={kcalOn}
                      onChange={(e) => setKcalOn(Math.max(1200, Math.min(5000, parseInt(e.target.value) || 2500)))}
                      min={1200}
                      max={5000}
                      step={50}
                      className="setup-kcal-box w-full max-w-[160px] rounded-xl px-4 py-3 font-bold text-xl text-[var(--text-primary)] border border-[var(--border-color)] bg-[var(--background-main)]"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">kcal</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Kcal Giorni Riposo (OFF)</label>
                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      value={kcalOff}
                      onChange={(e) => setKcalOff(Math.max(1200, Math.min(5000, parseInt(e.target.value) || 2000)))}
                      min={1200}
                      max={5000}
                      step={50}
                      className="setup-kcal-box w-full max-w-[160px] rounded-xl px-4 py-3 font-bold text-xl text-[var(--text-primary)] border border-[var(--border-color)] bg-[var(--background-main)]"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">kcal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-4 md:p-6 rounded-2xl bg-[var(--background-secondary)] border border-[var(--border-color)]">
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-4">
                Frequenza pasti
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMealFrequency(4)}
                  className={`flex-1 py-4 px-4 rounded-2xl border-2 font-bold text-center transition-all ${
                    mealFrequency === 4
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--background-main)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                  }`}
                  style={{ borderRadius: 16 }}
                >
                  4 Pasti
                  <span className="block text-xs font-normal mt-1 opacity-90">Colazione, Pranzo, Merenda, Cena</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMealFrequency(5)}
                  className={`flex-1 py-4 px-4 rounded-2xl border-2 font-bold text-center transition-all ${
                    mealFrequency === 5
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--background-main)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                  }`}
                  style={{ borderRadius: 16 }}
                >
                  5 Pasti
                  <span className="block text-xs font-normal mt-1 opacity-90">Colazione, Spuntino, Pranzo, Merenda, Cena</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-4 md:p-6 rounded-2xl bg-[var(--background-secondary)] border border-[var(--border-color)]">
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-4">
                Timing allenamento
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTrainingTiming('morning')}
                  className={`flex-1 py-4 px-4 rounded-2xl border-2 font-bold text-center transition-all ${
                    trainingTiming === 'morning'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--background-main)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                  }`}
                  style={{ borderRadius: 16 }}
                >
                  Mi alleno di Mattina
                </button>
                <button
                  type="button"
                  onClick={() => setTrainingTiming('afternoon')}
                  className={`flex-1 py-4 px-4 rounded-2xl border-2 font-bold text-center transition-all ${
                    trainingTiming === 'afternoon'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--background-main)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                  }`}
                  style={{ borderRadius: 16 }}
                >
                  Mi alleno di Pomeriggio/Sera
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="p-4 md:p-6 rounded-2xl bg-[var(--background-secondary)] border border-[var(--border-color)]">
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
                Giorni di allenamento (Giorni ON)
              </label>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Seleziona i giorni in cui ti alleni. Gli altri saranno giorni di riposo.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {WEEKDAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                      onDays.includes(value)
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--background-main)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)]'
                    }`}
                    style={{ borderRadius: 16 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="setup-footer fixed left-0 right-0 bottom-0 z-10 px-3 sm:px-4 md:relative md:left-auto md:right-auto md:bottom-auto md:px-0 md:mt-8 flex gap-2 md:gap-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-0 bg-[var(--background-main)] border-t border-[var(--border-color)] md:border-t-0 md:bg-transparent">
        <button
          disabled={step === 1}
          onClick={() => setStep(s => s - 1)}
          className="flex-1 py-3.5 md:py-4 border border-[var(--border-color)] rounded-2xl font-bold text-[var(--text-secondary)] hover:bg-[var(--background-secondary)] transition-all uppercase tracking-wider disabled:opacity-30 text-xs md:text-sm"
          style={{ borderRadius: 16 }}
        >
          Indietro
        </button>
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 py-3.5 md:py-4 bg-[var(--brand-primary)] text-white rounded-2xl font-bold hover:bg-[var(--brand-primary-hover)] shadow-lg transition-all uppercase tracking-wider text-xs md:text-sm"
            style={{ borderRadius: 16 }}
          >
            Avanti
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            className="flex-1 py-3.5 md:py-4 bg-[var(--brand-primary)] text-white rounded-2xl font-bold hover:bg-[var(--brand-primary-hover)] shadow-lg transition-all uppercase tracking-wider text-xs md:text-sm"
            style={{ borderRadius: 16 }}
          >
            Genera Piano
          </button>
        )}
      </div>
    </div>
  );
};

export default SetupWizardFacile;
