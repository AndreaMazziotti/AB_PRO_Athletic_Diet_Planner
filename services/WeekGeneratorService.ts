/**
 * Generatore Settimanale Dinamico (Oggi -> Domenica)
 * Modalità FACILE: genera pasti certificati e calcola grammi per target ON/OFF.
 * Priorità macronutrienti: grammi Prot/Carb/Fat dal target; calorie = conseguenza (4P+4C+9F).
 * Cross-contamination: sottrae macro secondari da ogni ingrediente prima di calcolare il successivo.
 */

import type { Alimento, AlimentoSelezionato, NomePasto, PastoComposto, PastoStatus, TipologiaGiornata } from '../types';
import type { FacileSetupPreferences, EasyModeTargets } from '../types';
import type { TipologiaGiornataConfig } from '../types';
import { PASTI_4, PASTI_5 } from '../constants';
import { computeTotalsFromItems } from '../utils';

const MACRO_TOLERANCE_G = 1;  // +/- 1g per macro
const KCAL_TOLERANCE = 5;     // +/- 5 kcal

/** Modelli Colazione/Spuntino: array di nome parziale per risolvere ID da alimenti */
export const MEAL_MODELS_BREAKFAST: { id: string; foodPatterns: string[] }[] = [
  { id: 'T1', foodPatterns: ['Yogurt Greco 0%', 'Fette Biscottate', 'Burro di Arachidi'] },
  { id: 'T2', foodPatterns: ['Albume', 'Farina d\'Avena', 'Cioccolato Fondente 90%'] },
  { id: 'T3', foodPatterns: ['Proteine Isolate', 'Corn Flakes', 'Latte di mandorla', 'Nocciole'] },
  { id: 'T4', foodPatterns: ['Pane di Segale', 'Bresaola', 'Olio di Oliva'] },
];

/** Modelli Pranzo/Cena: pattern per risolvere alimenti (primo = proteina, secondo = carbo, terzo = condimento/extra) */
export const MEAL_MODELS_MAIN: { id: string; proteinPattern: string; carbPatterns: string[]; extraPatterns?: string[] }[] = [
  { id: 'PESCE_A', proteinPattern: 'Salmone', carbPatterns: ['Gallette di Riso', 'Riso Basmati'], extraPatterns: ['Olio di Oliva'] },
  { id: 'PESCE_B', proteinPattern: 'Spigola|Merluzzo|Nasello', carbPatterns: ['Pasta', 'Riso Basmati'], extraPatterns: ['Olio di Oliva'] },
  { id: 'ROSSA_A', proteinPattern: 'Vitello|Bovino', carbPatterns: ['Riso Basmati'], extraPatterns: ['Olio di Oliva', 'Parmigiano'] },
  { id: 'ROSSA_B', proteinPattern: 'Bovino', carbPatterns: ['Patate', 'Pane di Segale'], extraPatterns: ['Olio di Oliva'] },
  { id: 'BIANCA_A', proteinPattern: 'Petto di Pollo', carbPatterns: ['Riso Basmati'], extraPatterns: ['Olio di Oliva'] },
  { id: 'BIANCA_B', proteinPattern: 'Fesa di Tacchino', carbPatterns: ['Pasta'], extraPatterns: ['Olio di Oliva'] },
];

function findAlimentoByPattern(alimenti: Alimento[], pattern: string): Alimento | null {
  const re = new RegExp(pattern, 'i');
  return alimenti.find(a => re.test(a.nome)) ?? null;
}

function findAlimentoByFirstMatch(alimenti: Alimento[], patterns: string[]): Alimento | null {
  for (const p of patterns) {
    const found = alimenti.find(a => a.nome.toLowerCase().includes(p.toLowerCase()));
    if (found) return found;
  }
  return null;
}

/** Restituisce gli alimenti per un modello colazione/spuntino */
function resolveBreakfastModel(
  alimenti: Alimento[],
  model: (typeof MEAL_MODELS_BREAKFAST)[0]
): Alimento[] {
  const resolved: Alimento[] = [];
  for (const pat of model.foodPatterns) {
    const a = alimenti.find(x => x.nome.toLowerCase().includes(pat.toLowerCase()));
    if (a) resolved.push(a);
  }
  return resolved;
}

/** Restituisce gli alimenti per un modello pranzo/cena */
function resolveMainModel(
  alimenti: Alimento[],
  model: (typeof MEAL_MODELS_MAIN)[0]
): Alimento[] {
  const resolved: Alimento[] = [];
  const prot = findAlimentoByPattern(alimenti, model.proteinPattern);
  if (prot) resolved.push(prot);
  const carb = findAlimentoByFirstMatch(alimenti, model.carbPatterns);
  if (carb) resolved.push(carb);
  for (const p of model.extraPatterns ?? []) {
    const ext = alimenti.find(a => a.nome.toLowerCase().includes(p.toLowerCase()));
    if (ext) resolved.push(ext);
  }
  return resolved;
}

/** Calcola giorni da oggi (incluso) a domenica stessa settimana */
export function getDatesTodayToSunday(): string[] {
  const today = new Date();
  const dates: string[] = [];
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay(); // 0 = Domenica, 6 = Sabato
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  for (let d = 0; d <= daysUntilSunday; d++) {
    const dte = new Date(start);
    dte.setDate(start.getDate() + d);
    dates.push(dte.toISOString().split('T')[0]);
  }
  return dates;
}

/** Determina se una data è ON o OFF (considera override manuale) */
function isOnDay(
  dateStr: string,
  prefs: FacileSetupPreferences,
  manualOverrides?: Record<string, 'ON' | 'OFF'>
): boolean {
  const override = manualOverrides?.[dateStr];
  if (override !== undefined) return override === 'ON';
  const d = new Date(dateStr + 'T12:00:00');
  const weekday = d.getDay();
  return prefs.onDays.includes(weekday);
}

/** Ottiene il target per un pasto in base a ON/OFF */
function getMealTarget(
  meal: NomePasto,
  isOn: boolean,
  targets: EasyModeTargets
): { kcal: number; carboidrati: number; proteine: number; grassi: number } | null {
  const profile = isOn ? targets.ON : targets.OFF;
  const t = profile[meal];
  if (!t) return null;
  return { kcal: t.kcal, carboidrati: t.carboidrati, proteine: t.proteine, grassi: t.grassi };
}

type MacroRole = 'protein' | 'fat' | 'carb' | 'extra';

function classifyAlimento(a: Alimento): MacroRole {
  const p = a.per100g;
  const protKcal = p.proteine * 4;
  const carbKcal = p.carboidrati * 4;
  const fatKcal = p.grassi * 9;
  const total = Math.max(protKcal + carbKcal + fatKcal, 1);
  if (protKcal / total >= 0.35) return 'protein';
  if (fatKcal / total >= 0.35) return 'fat';
  if (carbKcal / total >= 0.35) return 'carb';
  return 'extra';
}

/** Valori per 1g: P_val = Prot/100, C_val = Carb/100, F_val = Fat/100 */
function valPer1g(p: { carboidrati: number; proteine: number; grassi: number }) {
  return {
    P: p.proteine / 100,
    C: p.carboidrati / 100,
    F: p.grassi / 100,
    kcalPerG: (4 * p.carboidrati + 4 * p.proteine + 9 * p.grassi) / 100,
  };
}

/** Macro e kcal da X grammi (contributo per sottrazione sequenziale) */
function contrib(p: { carboidrati: number; proteine: number; grassi: number }, grams: number) {
  const v = valPer1g(p);
  return {
    proteine: grams * v.P,
    carboidrati: grams * v.C,
    grassi: grams * v.F,
    kcal: grams * v.kcalPerG,
  };
}

/**
 * Macro-Solver a Errore Zero: Top-Down con compensazione.
 * 1) Proteina centra Prot | 2) Grassi per Fat residui | 3) Carbo = Kcal_residue (equilibratore)
 * Controllo: se carbo sballa proteine >1g, riduci proteina e ricalcola.
 */
function calculateAutomaticGrams(
  foods: Alimento[],
  target: { kcal: number; carboidrati: number; proteine: number; grassi: number }
): AlimentoSelezionato[] {
  const proteinSource = foods.find(a => classifyAlimento(a) === 'protein');
  const fatSource = foods.find(a => classifyAlimento(a) === 'fat');
  const carbSource = foods.find(a => classifyAlimento(a) === 'carb');
  const usedIds = new Set([proteinSource, fatSource, carbSource].filter(Boolean).map(a => a!.id));
  const extras = foods.filter(a => !usedIds.has(a.id));

  // Sottrai contributo extras (quantità fissa 10g) dal target
  let tProt = target.proteine;
  let tCarb = target.carboidrati;
  let tFat = target.grassi;
  let tKcal = target.kcal;
  for (const ex of extras) {
    const c = contrib(ex.per100g, 10);
    tProt -= c.proteine;
    tCarb -= c.carboidrati;
    tFat -= c.grassi;
    tKcal -= c.kcal;
  }
  tProt = Math.max(0, tProt);
  tCarb = Math.max(0, tCarb);
  tFat = Math.max(0, tFat);
  tKcal = Math.max(1, tKcal);

  const solve = (gP: number) => {
    let gF = 0, gC = 0;
    const c1 = proteinSource ? contrib(proteinSource.per100g, gP) : { proteine: 0, carboidrati: 0, grassi: 0, kcal: 0 };
    const fatResidual = tFat - c1.grassi;
    if (fatSource && fatResidual > 0) {
      const vF = valPer1g(fatSource.per100g);
      gF = fatResidual / vF.F;
    }
    const c2 = fatSource ? contrib(fatSource.per100g, gF) : { proteine: 0, carboidrati: 0, grassi: 0, kcal: 0 };
    const kcalResidual = tKcal - c1.kcal - c2.kcal;
    if (carbSource && kcalResidual > 0) {
      const vC = valPer1g(carbSource.per100g);
      gC = kcalResidual / vC.kcalPerG;
    }
    const c3 = carbSource ? contrib(carbSource.per100g, gC) : { proteine: 0, carboidrati: 0, grassi: 0, kcal: 0 };
    const totalProt = c1.proteine + c2.proteine + c3.proteine;
    return { gF, gC, totalProt };
  };

  let gProt = 0;
  if (proteinSource && tProt > 0) {
    const vP = valPer1g(proteinSource.per100g);
    gProt = tProt / vP.P;
  }

  let gFat = 0, gCarb = 0;
  const MAX_ITER = 8;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const { gF, gC, totalProt } = solve(gProt);
    gFat = gF;
    gCarb = gC;
    const protExcess = totalProt - tProt;
    if (protExcess <= MACRO_TOLERANCE_G) break;
    if (proteinSource && gProt > 5) {
      const vP = valPer1g(proteinSource.per100g);
      const reduce = Math.min(gProt - 5, Math.max(0, protExcess - MACRO_TOLERANCE_G) / vP.P);
      gProt = Math.max(5, gProt - reduce);
    } else break;
  }

  const result: AlimentoSelezionato[] = [];
  if (proteinSource && gProt >= 1) {
    result.push({ alimentoId: proteinSource.id, quantita: Math.round(gProt) });
  }
  if (fatSource && gFat >= 1) {
    result.push({ alimentoId: fatSource.id, quantita: Math.round(gFat) });
  }
  if (carbSource && gCarb >= 1) {
    result.push({ alimentoId: carbSource.id, quantita: Math.round(gCarb) });
  }
  for (const ex of extras) {
    result.push({ alimentoId: ex.id, quantita: 10 });
  }

  // Fine-tuning per tolleranza ±1g / ±5 kcal (round-to-zero)
  const totals = computeTotalsFromItems(foods, result);
  const dKcal = totals.kcal - target.kcal;
  const dCarb = totals.carboidrati - target.carboidrati;
  const dFat = totals.grassi - target.grassi;
  if (Math.abs(dKcal) > KCAL_TOLERANCE || Math.abs(dCarb) > MACRO_TOLERANCE_G || Math.abs(dFat) > MACRO_TOLERANCE_G) {
    if (carbSource) {
      const idx = result.findIndex(r => r.alimentoId === carbSource.id);
      if (idx >= 0 && result[idx].quantita >= 5) {
        const step = dKcal > 0 ? -1 : 1;
        result[idx] = { ...result[idx], quantita: Math.max(5, result[idx].quantita + step) };
      }
    }
  }

  return result;
}

/**
 * Genera i pasti dal giorno corrente alla domenica.
 * Varietà: se 4+ giorni, forza almeno 2 PESCE e 2 ROSSA su pranzo/cena.
 */
export function generateRemainingWeek(
  alimenti: Alimento[],
  prefs: FacileSetupPreferences,
  targets: EasyModeTargets,
  manualOverrides?: Record<string, 'ON' | 'OFF'>,
  tipologie?: TipologiaGiornataConfig[]
): PastoComposto[] {
  const dates = getDatesTodayToSunday();
  const meals = prefs.mealFrequency === 5 ? [...PASTI_5] : [...PASTI_4];
  const results: PastoComposto[] = [];
  const numDays = dates.length;

  const isBreakfastMeal = (m: NomePasto) => ['colazione', 'spuntino', 'merenda'].includes(m);
  const isMainMeal = (m: NomePasto) => ['pranzo', 'cena'].includes(m);

  // Pianifica modelli pranzo/cena: se 4+ giorni, forza 2 PESCE + 2 ROSSA
  const mainModels = [...MEAL_MODELS_MAIN];
  let mainPlan: string[] = [];
  if (numDays >= 4) {
    const pesceIds = mainModels.filter(m => m.id.startsWith('PESCE')).map(m => m.id);
    const rossaIds = mainModels.filter(m => m.id.startsWith('ROSSA')).map(m => m.id);
    const biancaIds = mainModels.filter(m => m.id.startsWith('BIANCA')).map(m => m.id);
    const slots = dates.length * 2; // pranzo + cena per giorno
    const planned: string[] = [];
    let pesceCount = 0, rossaCount = 0;
    let idx = 0;
    while (planned.length < slots) {
      let chosen: string;
      if (pesceCount < 2) {
        chosen = pesceIds[idx % pesceIds.length];
        pesceCount++;
      } else if (rossaCount < 2) {
        chosen = rossaIds[idx % rossaIds.length];
        rossaCount++;
      } else {
        chosen = [...pesceIds, ...rossaIds, ...biancaIds][idx % (pesceIds.length + rossaIds.length + biancaIds.length)];
      }
      planned.push(chosen);
      idx++;
    }
    mainPlan = planned;
  } else {
    const all = mainModels.map(m => m.id);
    for (let i = 0; i < dates.length * 2; i++) {
      mainPlan.push(all[i % all.length]);
    }
  }

  let breakfastIdx = 0;
  let mainPlanIdx = 0;

  const onTipo = (tipologie?.find(t => t.categoria === 'ON')?.tipo ?? 'ON_4_PASTI_WOD_SERA') as TipologiaGiornata;
  const offTipo = (tipologie?.find(t => t.categoria === 'OFF')?.tipo ?? 'OFF_4_PASTI') as TipologiaGiornata;

  for (let di = 0; di < dates.length; di++) {
    const dateStr = dates[di];
    const isOn = isOnDay(dateStr, prefs, manualOverrides);
    const tipologia = isOn ? onTipo : offTipo;
    const settimana = 1;

    for (let mi = 0; mi < meals.length; mi++) {
      const mealName = meals[mi];
      const target = getMealTarget(mealName, isOn, targets);
      if (!target) continue;

      let resolvedAlimenti: Alimento[] = [];
      if (isBreakfastMeal(mealName)) {
        const model = MEAL_MODELS_BREAKFAST[breakfastIdx % MEAL_MODELS_BREAKFAST.length];
        resolvedAlimenti = resolveBreakfastModel(alimenti, model);
        breakfastIdx++;
      } else if (isMainMeal(mealName)) {
        const modelId = mainPlan[mainPlanIdx];
        const model = mainModels.find(m => m.id === modelId)!;
        resolvedAlimenti = resolveMainModel(alimenti, model);
        mainPlanIdx++;
      }

      if (resolvedAlimenti.length === 0) continue;

      const items = calculateAutomaticGrams(resolvedAlimenti, {
        kcal: target.kcal,
        carboidrati: target.carboidrati,
        proteine: target.proteine,
        grassi: target.grassi,
      });
      if (items.length === 0) continue;

      const pasto: PastoComposto = {
        id: `gen-${dateStr}-${mealName}-${Date.now()}`,
        data: dateStr,
        settimana,
        tipologiaGiornata: tipologia as any,
        nomePasto: mealName,
        alimenti: items,
        status: 'regular' as PastoStatus,
        isAutoGenerated: true,
      };
      results.push(pasto);
    }
  }

  // Correzione ultimo pasto (Cena): se totale giornaliero macro è fuori, aggiusta ±1g
  for (const dateStr of dates) {
    const dayPasti = results.filter(p => p.data === dateStr);
    const dayTarget = {
      proteine: dayPasti.reduce((s, p) => {
        const t = getMealTarget(p.nomePasto, isOnDay(dateStr, prefs, manualOverrides), targets);
        return s + (t?.proteine ?? 0);
      }, 0),
      carboidrati: dayPasti.reduce((s, p) => {
        const t = getMealTarget(p.nomePasto, isOnDay(dateStr, prefs, manualOverrides), targets);
        return s + (t?.carboidrati ?? 0);
      }, 0),
      grassi: dayPasti.reduce((s, p) => {
        const t = getMealTarget(p.nomePasto, isOnDay(dateStr, prefs, manualOverrides), targets);
        return s + (t?.grassi ?? 0);
      }, 0),
    };
    const dayActual = dayPasti.reduce(
      (acc, p) => {
        const t = computeTotalsFromItems(alimenti, p.alimenti);
        return {
          proteine: acc.proteine + t.proteine,
          carboidrati: acc.carboidrati + t.carboidrati,
          grassi: acc.grassi + t.grassi,
        };
      },
      { proteine: 0, carboidrati: 0, grassi: 0 }
    );
    const cenaPasto = dayPasti.find(p => p.nomePasto === 'cena');
    if (cenaPasto && cenaPasto.alimenti.length > 0) {
      const carbIdx = cenaPasto.alimenti.findIndex(it => {
        const a = alimenti.find(x => x.id === it.alimentoId);
        return a && classifyAlimento(a) === 'carb';
      });
      const fatIdx = cenaPasto.alimenti.findIndex(it => {
        const a = alimenti.find(x => x.id === it.alimentoId);
        return a && classifyAlimento(a) === 'fat';
      });
      const dCarb = Math.round(dayActual.carboidrati - dayTarget.carboidrati);
      const dFat = Math.round(dayActual.grassi - dayTarget.grassi);
      let newItems = [...cenaPasto.alimenti];
      if (Math.abs(dCarb) > MACRO_TOLERANCE_G && carbIdx >= 0) {
        newItems[carbIdx] = { ...newItems[carbIdx], quantita: Math.max(5, newItems[carbIdx].quantita - dCarb) };
      }
      if (Math.abs(dFat) > MACRO_TOLERANCE_G && fatIdx >= 0) {
        newItems[fatIdx] = { ...newItems[fatIdx], quantita: Math.max(5, newItems[fatIdx].quantita - dFat) };
      }
      const idx = results.findIndex(r => r.id === cenaPasto.id);
      if (idx >= 0 && (Math.abs(dCarb) > MACRO_TOLERANCE_G || Math.abs(dFat) > MACRO_TOLERANCE_G)) {
        results[idx] = { ...cenaPasto, alimenti: newItems };
      }
    }
  }

  // Verifica finale: log macro e kcal giornalieri
  for (const dateStr of dates) {
    const dayPasti = results.filter(p => p.data === dateStr);
    const actual = dayPasti.reduce(
      (acc, p) => {
        const t = computeTotalsFromItems(alimenti, p.alimenti);
        return { proteine: acc.proteine + t.proteine, carboidrati: acc.carboidrati + t.carboidrati, grassi: acc.grassi + t.grassi, kcal: acc.kcal + t.kcal };
      },
      { proteine: 0, carboidrati: 0, grassi: 0, kcal: 0 }
    );
    const isOn = isOnDay(dateStr, prefs, manualOverrides);
    const targetKcal = isOn ? (prefs.kcal_on ?? 2500) : (prefs.kcal_off ?? 2000);
    const targetMacro = { proteine: (targetKcal * 0.45) / 4, carboidrati: (targetKcal * 0.3) / 4, grassi: (targetKcal * 0.25) / 9 };
    if (typeof console !== 'undefined' && console.debug) {
      const pOk = Math.abs(actual.proteine - targetMacro.proteine) <= MACRO_TOLERANCE_G * 4;
      const cOk = Math.abs(actual.carboidrati - targetMacro.carboidrati) <= MACRO_TOLERANCE_G * 4;
      const fOk = Math.abs(actual.grassi - targetMacro.grassi) <= MACRO_TOLERANCE_G * 4;
      const kOk = Math.abs(actual.kcal - targetKcal) <= targetKcal * 0.01;
      console.debug(`[WeekGen] ${dateStr}: P ${Math.round(actual.proteine)} C ${Math.round(actual.carboidrati)} F ${Math.round(actual.grassi)} | ${Math.round(actual.kcal)} kcal ${pOk && cOk && fOk && kOk ? '✓' : '!'}`);
    }
  }

  return results;
}

/**
 * Ricalcola i grammi di un pasto esistente per un nuovo target (ON/OFF cambiato).
 * Mantiene gli stessi alimenti, aggiorna quantità con algoritmo grammi/cross-contamination.
 */
export function recalcGramsForMeal(
  alimenti: Alimento[],
  existingPasto: PastoComposto,
  newTarget: { kcal: number; carboidrati: number; proteine: number; grassi: number }
): AlimentoSelezionato[] {
  const foods = existingPasto.alimenti
    .map(a => alimenti.find(x => x.id === a.alimentoId))
    .filter((a): a is Alimento => !!a);
  if (foods.length === 0) return existingPasto.alimenti;
  return calculateAutomaticGrams(foods, {
    kcal: newTarget.kcal,
    carboidrati: newTarget.carboidrati,
    proteine: newTarget.proteine,
    grassi: newTarget.grassi,
  });
}
