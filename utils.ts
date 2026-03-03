
import { MacroSplit, MacroValue, NomePasto, EasyModeTargets, EasyModeMealTarget } from './types';
import { PASTI_4, PASTI_5 } from './constants';

export const calculateMacrosFromKcal = (kcalCarb: number, kcalProt: number, kcalFat: number): MacroSplit => {
  return {
    carboidrati: { kcal: kcalCarb, grammi: Math.round(kcalCarb / 4) },
    proteine: { kcal: kcalProt, grammi: Math.round(kcalProt / 4) },
    grassi: { kcal: kcalFat, grammi: Math.round(kcalFat / 9) },
  };
};

export const calculateMacrosFromPercentages = (totalKcal: number, pCarb: number, pProt: number, pFat: number): MacroSplit => {
  const kCarb = (totalKcal * pCarb) / 100;
  const kProt = (totalKcal * pProt) / 100;
  const kFat = (totalKcal * pFat) / 100;
  return calculateMacrosFromKcal(kCarb, kProt, kFat);
};

/**
 * Motore di calcolo per modalità FACILE.
 * Genera i target per pasto per giorni ON (allenamento) e OFF (riposo).
 * Usa quote caloriche distinte: kcalOn per ON, kcalOff per OFF.
 */
export function calculateEasyModeTargets(
  kcalOn: number,
  kcalOff: number,
  numPasti: 4 | 5,
  trainingTiming: 'morning' | 'afternoon'
): EasyModeTargets {
  const meals = numPasti === 4 ? PASTI_4 : PASTI_5;

  // --- GIORNI OFF: distribuzione equa, macro da kcalOff ---
  const protOff = Math.round((kcalOff * 0.45) / 4);
  const carbOff = Math.round((kcalOff * 0.30) / 4);
  const fatOff = Math.round((kcalOff * 0.25) / 9);
  const kcalPerMealOff = Math.round(kcalOff / numPasti);
  const offProfile: Partial<Record<NomePasto, EasyModeMealTarget>> = {};
  for (const pasto of meals) {
    offProfile[pasto] = {
      kcal: kcalPerMealOff,
      carboidrati: Math.round(carbOff / numPasti),
      proteine: Math.round(protOff / numPasti),
      grassi: Math.round(fatOff / numPasti),
    };
  }

  // --- GIORNI ON: strategia peri-workout, macro da kcalOn ---
  const protTotalG = Math.round((kcalOn * 0.45) / 4);
  const carbTotalG = Math.round((kcalOn * 0.30) / 4);
  const fatTotalG = Math.round((kcalOn * 0.25) / 9);
  const isMattina = trainingTiming === 'morning';
  let periIdx: number[], farIdx: number[];
  if (numPasti === 4) {
    periIdx = isMattina ? [0, 1] : [2, 3];  // Mattina: Colazione+Pranzo | Sera: Merenda+Cena
    farIdx = isMattina ? [2, 3] : [0, 1];
  } else {
    periIdx = isMattina ? [0, 1] : [3, 4];  // Mattina: Colazione+Spuntino | Sera: Merenda+Cena
    farIdx = isMattina ? [2, 3, 4] : [0, 1, 2];
  }

  const numPeri = periIdx.length;
  const numFar = farIdx.length;

  const onProfile: Partial<Record<NomePasto, EasyModeMealTarget>> = {};
  const carbPeri = Math.round(carbTotalG * 0.65 / 2);  // 65% peri, diviso 2 pasti
  const carbFarEach = Math.round((carbTotalG * 0.35) / numFar);
  const fatPeri = Math.round(fatTotalG * 0.10);        // 10% per pasto peri (20% totale)
  const fatFarEach = Math.round((fatTotalG * 0.80) / numFar);
  const protPerMeal = Math.round(protTotalG / numPasti);

  for (let i = 0; i < meals.length; i++) {
    const pasto = meals[i];
    const isPeri = periIdx.includes(i);
    const carbs = isPeri ? carbPeri : carbFarEach;
    const fat = isPeri ? fatPeri : fatFarEach;
    const kcal = Math.round(carbs * 4 + protPerMeal * 4 + fat * 9);
    onProfile[pasto] = {
      kcal,
      carboidrati: carbs,
      proteine: protPerMeal,
      grassi: fat,
    };
  }

  return { ON: onProfile, OFF: offProfile };
}

/** Calcola macro e kcal da alimento; usa 4c+4p+9f per coerenza matematica. */
export const calculateMacroFromAlimento = (alimentoPer100g: any, quantity: number) => {
  const factor = quantity / 100;
  const c = alimentoPer100g.carboidrati * factor;
  const p = alimentoPer100g.proteine * factor;
  const g = alimentoPer100g.grassi * factor;
  const kcal = 4 * c + 4 * p + 9 * g;
  return {
    carboidrati: Number(c.toFixed(1)),
    proteine: Number(p.toFixed(1)),
    grassi: Number(g.toFixed(1)),
    kcal: Number(kcal.toFixed(1)),
  };
};

/** Formatta data YYYY-MM-DD in DD/MM/YYYY (italiano) via toLocaleDateString */
export function formatDateIT(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr;
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
}

/** Funzione condivisa: calcola totali da alimenti selezionati. Usata da Dashboard e generatore. */
export const computeTotalsFromItems = (
  alimenti: { id: string; per100g: { carboidrati: number; proteine: number; grassi: number } }[],
  items: { alimentoId: string; quantita: number }[]
) => {
  return items.reduce(
    (acc, it) => {
      const a = alimenti.find(x => x.id === it.alimentoId);
      if (!a) return acc;
      const m = calculateMacroFromAlimento(a.per100g, it.quantita);
      return {
        carboidrati: acc.carboidrati + m.carboidrati,
        proteine: acc.proteine + m.proteine,
        grassi: acc.grassi + m.grassi,
        kcal: acc.kcal + m.kcal,
      };
    },
    { carboidrati: 0, proteine: 0, grassi: 0, kcal: 0 }
  );
};

export const STORAGE_KEY = 'athletic_diet_app_state';

export const saveStateToLocalStorage = (state: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadStateFromLocalStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
};
