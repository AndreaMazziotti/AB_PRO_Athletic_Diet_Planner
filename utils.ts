
import { MacroSplit, MacroValue } from './types';

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

export const calculateMacroFromAlimento = (alimentoPer100g: any, quantity: number) => {
  const factor = quantity / 100;
  return {
    carboidrati: Number((alimentoPer100g.carboidrati * factor).toFixed(1)),
    proteine: Number((alimentoPer100g.proteine * factor).toFixed(1)),
    grassi: Number((alimentoPer100g.grassi * factor).toFixed(1)),
    kcal: Number((alimentoPer100g.kcal * factor).toFixed(1)),
  };
};

export const STORAGE_KEY = 'athletic_diet_app_state';

export const saveStateToLocalStorage = (state: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadStateFromLocalStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
};
