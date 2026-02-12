/**
 * Meal Solver Service – Smart-Balance (Weighted Least Squares).
 * Include TUTTI gli alimenti con quantità ragionevoli; distribuzione per categoria macro.
 * Zero LLM, tutto client-side.
 */

import type { Alimento } from '../types';

export interface MealTarget {
  kcal: number;
  carboidrati: number;
  proteine: number;
  grassi: number;
}

export interface FoodInput {
  alimento: Alimento;
  fixedGrams?: number;
}

export interface SolverResultItem {
  alimentoId: string;
  nome: string;
  quantita: number;
  locked: boolean;
}

export type MissingMacro = 'carboidrati' | 'proteine' | 'grassi' | null;

export interface MealSolverResult {
  success: boolean;
  items: SolverResultItem[];
  actual: MealTarget;
  precisionScore: number;
  matchScore: number;
  message?: string;
  missingMacro: MissingMacro;
  suggestions?: string[];
  categoryBreakdown?: {
    protein: { count: number; totalGrams: number };
    carbs: { count: number; totalGrams: number };
    fats: { count: number; totalGrams: number };
  };
}

/** Indici (locali alla lista free) per categoria macro */
export interface FoodCategory {
  PROTEIN_SOURCES: number[];
  CARB_SOURCES: number[];
  FAT_SOURCES: number[];
  MIXED: number[];
}

export interface FeasibilityCheck {
  isFeasible: boolean;
  warnings: string[];
  suggestions: string[];
}

const ROUND_STEP = 5;
const MACRO_CLASSIFICATION_THRESHOLD = 0.2;
const CATEGORY_DIST_WEIGHTS: Record<keyof FoodCategory, number> = {
  PROTEIN_SOURCES: 60,
  CARB_SOURCES: 60,
  FAT_SOURCES: 30,
  MIXED: 15,
};
const TARGET_MIN_GRAMS = 40;
const MIN_BIAS_WEIGHT = 30;
const MIN_REASONABLE_GRAMS = 30;
const REMOVE_THRESHOLD = 15;
/** Soglia errore kcal per attivare correzione (2%) */
const KCAL_TOLERANCE_PCT = 0.02;
/** Massimo fattore di scala per correzione kcal (evita oscillazioni) */
const MAX_REFINE_SCALE = 1.5;
const MIN_REFINE_SCALE = 0.7;
/** Soglie per step di controllo 2 e 3: sotto queste precisioni si ri-refina */
const KCAL_PRECISION_THRESHOLD_PCT = 95;
const MACRO_PRECISION_THRESHOLD_PCT = 90;
/** Scale più ampie per step 2 e 3 (correzioni più aggressive) */
const MAX_REFINE_SCALE_AGGRESSIVE = 2;
const MIN_REFINE_SCALE_AGGRESSIVE = 0.5;

export function roundQuantity(grams: number): number {
  if (grams <= 0) return 0;
  return Math.max(0, Math.round(grams / ROUND_STEP) * ROUND_STEP);
}

/** Pesi WLS: ordine [kcal, carb, prot, fat]. Kcal con peso alto per priorità assoluta. */
const WEIGHTS = [20, Math.sqrt(40), Math.sqrt(80), Math.sqrt(40)];

/** Kcal derivate dai macro (4c+4p+9f) per coerenza: così totali kcal e macro non si contraddicono. */
function derivedKcalPer100g(p: { carboidrati: number; proteine: number; grassi: number }): number {
  return 4 * p.carboidrati + 4 * p.proteine + 9 * p.grassi;
}

/** Classifica gli alimenti per macro dominante (% kcal). Indici = posizione nella lista passata (0..n-1). */
export function classifyFoodsByMacro(foods: FoodInput[]): FoodCategory {
  const categories: FoodCategory = {
    PROTEIN_SOURCES: [],
    CARB_SOURCES: [],
    FAT_SOURCES: [],
    MIXED: [],
  };
  for (let i = 0; i < foods.length; i++) {
    const p = foods[i].alimento.per100g;
    const proteinKcal = p.proteine * 4;
    const carbKcal = p.carboidrati * 4;
    const fatKcal = p.grassi * 9;
    const totalKcal = Math.max(derivedKcalPer100g(p), 1);
    const proteinRatio = proteinKcal / totalKcal;
    const carbRatio = carbKcal / totalKcal;
    const fatRatio = fatKcal / totalKcal;
    const maxRatio = Math.max(proteinRatio, carbRatio, fatRatio);
    if (maxRatio < MACRO_CLASSIFICATION_THRESHOLD) {
      categories.MIXED.push(i);
    } else if (proteinRatio === maxRatio) {
      categories.PROTEIN_SOURCES.push(i);
    } else if (carbRatio === maxRatio) {
      categories.CARB_SOURCES.push(i);
    } else {
      categories.FAT_SOURCES.push(i);
    }
  }
  return categories;
}

/** Verifica se il pasto è realizzabile e raccoglie warning/suggerimenti. */
export function checkMealFeasibility(
  foods: FoodInput[],
  target: MealTarget,
  categories: FoodCategory
): FeasibilityCheck {
  const result: FeasibilityCheck = { isFeasible: true, warnings: [], suggestions: [] };
  if (target.kcal <= 0) return result;

  const tooManySourcesSuggestions: string[] = [];
  if (categories.PROTEIN_SOURCES.length > 0) {
    const targetProt = target.proteine;
    const numProt = categories.PROTEIN_SOURCES.length;
    const firstProt = foods[categories.PROTEIN_SOURCES[0]].alimento.per100g.proteine || 1;
    const gramsPerSource = (targetProt / numProt) * (100 / firstProt);
    if (gramsPerSource < MIN_REASONABLE_GRAMS) {
      result.warnings.push(
        `Hai inserito ${numProt} fonti proteiche ma il target proteine (${targetProt}g) è troppo basso. Ogni fonte riceverebbe meno di ${MIN_REASONABLE_GRAMS}g. `
      );
      const sugg = `Rimuovi ${numProt - Math.max(1, Math.floor(targetProt / 20))} fonti proteiche oppure aumenta il target proteine a circa ${numProt * 25}g.`;
      result.suggestions.push(sugg);
      tooManySourcesSuggestions.push(sugg);
    }
  }

  if (categories.CARB_SOURCES.length > 0 && target.carboidrati > 0) {
    const targetCarb = target.carboidrati;
    const numCarb = categories.CARB_SOURCES.length;
    const firstCarb = foods[categories.CARB_SOURCES[0]].alimento.per100g.carboidrati || 1;
    const gramsPerSource = (targetCarb / numCarb) * (100 / firstCarb);
    if (gramsPerSource < MIN_REASONABLE_GRAMS) {
      result.warnings.push(
        `Hai inserito ${numCarb} fonti di carboidrati ma il target carboidrati (${targetCarb}g) è troppo basso. `
      );
      const sugg = `Rimuovi ${numCarb - 1} fonti di carboidrati oppure aumenta il target carboidrati a circa ${numCarb * 30}g.`;
      result.suggestions.push(sugg);
      tooManySourcesSuggestions.push(sugg);
    }
  }

  if (tooManySourcesSuggestions.length > 0) {
    result.isFeasible = false;
    result.warnings = [
      'Non è possibile comporre un pasto bilanciato con questi alimenti. Prova a togliere qualcosa.',
    ];
    result.suggestions = tooManySourcesSuggestions;
    return result;
  }

  const maxProtDensity = Math.max(
    ...foods.map(f => (f.alimento.per100g.proteine * 4) / Math.max(derivedKcalPer100g(f.alimento.per100g), 1))
  );
  const requiredProtDensity = (target.proteine * 4) / Math.max(target.kcal, 1);
  if (requiredProtDensity > maxProtDensity * 1.15) {
    result.isFeasible = false;
    result.warnings.push(
      `Il target richiede ${target.proteine}g di proteine in ${target.kcal} kcal (${Math.round(requiredProtDensity * 100)}% kcal da proteine), ma nessun alimento ha densità proteica così alta. `
    );
    result.suggestions.push(
      `Riduci il target proteine a circa ${Math.floor(target.kcal * maxProtDensity / 4)}g oppure aggiungi alimenti più proteici.`
    );
  }
  return result;
}

function solveLinearSystem(M: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const A = M.map(row => [...row]);
  const b = [...rhs];
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
    }
    [A[col], A[maxRow]] = [A[maxRow], A[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];
    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-12) continue;
    for (let r = col + 1; r < n; r++) {
      const f = A[r][col] / pivot;
      for (let c = col; c < n; c++) A[r][c] -= f * A[col][c];
      b[r] -= f * b[col];
    }
  }
  const x: number[] = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) sum -= A[i][j] * x[j];
    x[i] = Math.abs(A[i][i]) < 1e-12 ? 0 : sum / A[i][i];
  }
  return x;
}

/**
 * Weighted Least Squares + distribuzione per categoria macro + bias verso quantità minime.
 * Distribuzione applicata DENTRO ogni categoria (proteine tra loro, carbo tra loro, ecc.).
 */
function weightedLeastSquaresWithDistribution(
  A: number[][],
  b: number[],
  n: number,
  freeFoods: FoodInput[]
): number[] {
  const W2 = WEIGHTS.map(w => w * w);
  const AtW2A: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const AtW2b: number[] = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let v = 0;
      for (let r = 0; r < 4; r++) v += A[r][i] * W2[r] * A[r][j];
      AtW2A[i][j] = v;
    }
    let v = 0;
    for (let r = 0; r < 4; r++) v += A[r][i] * W2[r] * b[r];
    AtW2b[i] = v;
  }

  const categories = classifyFoodsByMacro(freeFoods);
  const categoryKeys: (keyof FoodCategory)[] = ['PROTEIN_SOURCES', 'CARB_SOURCES', 'FAT_SOURCES', 'MIXED'];
  for (const categoryName of categoryKeys) {
    const indices = categories[categoryName];
    if (indices.length <= 1) continue;
    const beta = CATEGORY_DIST_WEIGHTS[categoryName];
    const nCat = indices.length;
    const oneOverNCat = 1 / nCat;
    for (const ii of indices) {
      for (const jj of indices) {
        const distTerm = ii === jj ? 1 - oneOverNCat : -oneOverNCat;
        AtW2A[ii][jj] += beta * distTerm;
      }
    }
  }

  for (let i = 0; i < n; i++) {
    AtW2A[i][i] += MIN_BIAS_WEIGHT;
    AtW2b[i] += MIN_BIAS_WEIGHT * TARGET_MIN_GRAMS;
  }

  return solveLinearSystem(AtW2A, AtW2b);
}

function nnlsWithKcalPriority(
  A: number[][],
  b: number[],
  targetKcal: number,
  n: number,
  freeFoods: FoodInput[]
): number[] {
  let x = weightedLeastSquaresWithDistribution(A, b, n, freeFoods);
  for (let i = 0; i < n; i++) x[i] = Math.max(0, x[i]);
  let totalKcal = 0;
  for (let j = 0; j < n; j++) totalKcal += (A[0][j] / 100) * x[j];
  if (totalKcal <= 0) return x;
  const scale = targetKcal / totalKcal;
  for (let i = 0; i < n; i++) {
    x[i] = Math.max(0, x[i] * scale);
  }
  return x;
}

function computeTotals(foods: FoodInput[], quantities: number[]): MealTarget {
  let kcal = 0, carb = 0, prot = 0, fat = 0;
  foods.forEach((f, i) => {
    const q = quantities[i] || 0;
    const p = f.alimento.per100g;
    const factor = q / 100;
    kcal += derivedKcalPer100g(p) * factor;
    carb += p.carboidrati * factor;
    prot += p.proteine * factor;
    fat += p.grassi * factor;
  });
  return { kcal, carboidrati: carb, proteine: prot, grassi: fat };
}

/** Precisione 0-100: 100 = perfetta aderenza al target */
interface PrecisionPct {
  kcalPct: number;
  carbPct: number;
  protPct: number;
  fatPct: number;
}

function getPrecision(target: MealTarget, actual: MealTarget): PrecisionPct {
  const kcalPct =
    target.kcal > 0
      ? Math.max(0, 100 * (1 - Math.min(1, Math.abs(actual.kcal - target.kcal) / target.kcal)))
      : 100;
  const carbPct =
    target.carboidrati > 0
      ? Math.max(0, 100 * (1 - Math.min(1, Math.abs(actual.carboidrati - target.carboidrati) / target.carboidrati)))
      : 100;
  const protPct =
    target.proteine > 0
      ? Math.max(0, 100 * (1 - Math.min(1, Math.abs(actual.proteine - target.proteine) / target.proteine)))
      : 100;
  const fatPct =
    target.grassi > 0
      ? Math.max(0, 100 * (1 - Math.min(1, Math.abs(actual.grassi - target.grassi) / target.grassi)))
      : 100;
  return { kcalPct, carbPct, protPct, fatPct };
}

function needsImprovement(precision: PrecisionPct): boolean {
  return (
    precision.kcalPct < KCAL_PRECISION_THRESHOLD_PCT ||
    precision.carbPct < MACRO_PRECISION_THRESHOLD_PCT ||
    precision.protPct < MACRO_PRECISION_THRESHOLD_PCT ||
    precision.fatPct < MACRO_PRECISION_THRESHOLD_PCT
  );
}

/**
 * Secondo passaggio: corregge le quantità per avvicinare le kcal al target e reintegra
 * alimenti a 0 quando un macro è sotto target (es. olio per i grassi).
 */
function refineQuantities(
  foods: FoodInput[],
  quantities: number[],
  target: MealTarget,
  freeIndices: number[],
  freeFoods: FoodInput[],
  categories: FoodCategory
): number[] {
  const q = quantities.map(x => x);
  if (target.kcal <= 0) return q;

  // --- Fase 1: correzione kcal (scala i liberi; arrotonda una sola volta a fine ciclo) ---
  for (let iter = 0; iter < 4; iter++) {
    const actual = computeTotals(foods, q);
    const errPct = Math.abs(actual.kcal - target.kcal) / target.kcal;
    if (errPct <= KCAL_TOLERANCE_PCT) break;
    let scale = target.kcal / actual.kcal;
    if (actual.kcal < target.kcal) scale *= 1.005;
    scale = Math.max(MIN_REFINE_SCALE, Math.min(MAX_REFINE_SCALE, scale));
    for (const i of freeIndices) {
      q[i] = q[i] * scale;
    }
  }
  for (const i of freeIndices) {
    q[i] = roundQuantity(q[i]);
  }

  // --- Fase 2: reintegra alimenti a zero quando un macro è sotto target ---
  const macroConfig: { targetKey: keyof MealTarget; categoryKey: keyof FoodCategory }[] = [
    { targetKey: 'grassi', categoryKey: 'FAT_SOURCES' },
    { targetKey: 'carboidrati', categoryKey: 'CARB_SOURCES' },
    { targetKey: 'proteine', categoryKey: 'PROTEIN_SOURCES' },
  ];
  for (const { targetKey, categoryKey } of macroConfig) {
    const actual = computeTotals(foods, q);
    const targetVal = target[targetKey];
    if (targetVal < 1) continue;
    const deficit = targetVal - (actual[targetKey] ?? 0);
    if (deficit < 1) continue;
    const localIndices = categories[categoryKey];
    for (const localIdx of localIndices) {
      const fullIdx = freeIndices[localIdx];
      if (fullIdx === undefined) continue;
      if (q[fullIdx] >= 10) continue;
      const addGrams = 10;
      q[fullIdx] = roundQuantity(q[fullIdx] + addGrams);
      const afterAdd = computeTotals(foods, q);
      if (afterAdd.kcal <= 0) break;
      let scale = target.kcal / afterAdd.kcal;
      scale = Math.max(MIN_REFINE_SCALE, Math.min(MAX_REFINE_SCALE, scale));
      for (const i of freeIndices) {
        q[i] = roundQuantity(q[i] * scale);
      }
      break;
    }
  }

  // --- Fase 3: ultima correzione kcal dopo eventuali reintegri ---
  for (let iter = 0; iter < 3; iter++) {
    const actual = computeTotals(foods, q);
    const errPct = Math.abs(actual.kcal - target.kcal) / target.kcal;
    if (errPct <= KCAL_TOLERANCE_PCT) break;
    let scale = target.kcal / actual.kcal;
    scale = Math.max(MIN_REFINE_SCALE, Math.min(MAX_REFINE_SCALE, scale));
    for (const i of freeIndices) {
      q[i] = q[i] * scale;
    }
  }
  for (const i of freeIndices) {
    q[i] = roundQuantity(q[i]);
  }

  return q;
}

/**
 * Step di controllo 2: correzione aggressiva kcal fino a precisione >= 95%.
 * Scala senza arrotondare in mezzo, poi arrotonda una sola volta per non perdere precisione.
 * Leggero overshoot quando sotto target così dopo il round non restiamo sotto.
 */
function refineStep2Kcal(
  foods: FoodInput[],
  quantities: number[],
  target: MealTarget,
  freeIndices: number[]
): number[] {
  const q = quantities.map(x => x);
  if (target.kcal <= 0) return q;
  for (let iter = 0; iter < 8; iter++) {
    const actual = computeTotals(foods, q);
    const precision = getPrecision(target, actual);
    if (precision.kcalPct >= KCAL_PRECISION_THRESHOLD_PCT) break;
    let scale = target.kcal / actual.kcal;
    if (actual.kcal < target.kcal) scale *= 1.008;
    scale = Math.max(MIN_REFINE_SCALE_AGGRESSIVE, Math.min(MAX_REFINE_SCALE_AGGRESSIVE, scale));
    for (const i of freeIndices) {
      q[i] = q[i] * scale;
    }
  }
  for (const i of freeIndices) {
    q[i] = roundQuantity(q[i]);
  }
  return q;
}

/**
 * Step 2b: quando siamo sotto target sia su kcal che su carbs, aggiungiamo grammi alle fonti
 * carboidrati e riscaliamo verso il target kcal (senza scalare in basso se già sotto).
 */
function refineStep2bCarbsKcal(
  foods: FoodInput[],
  quantities: number[],
  target: MealTarget,
  freeIndices: number[],
  categories: FoodCategory
): number[] {
  const q = quantities.map(x => x);
  if (target.kcal <= 0 || target.carboidrati < 1) return q;
  const carbLocal = categories.CARB_SOURCES;
  if (carbLocal.length === 0) return q;

  for (let iter = 0; iter < 12; iter++) {
    const actual = computeTotals(foods, q);
    const precision = getPrecision(target, actual);
    if (precision.kcalPct >= KCAL_PRECISION_THRESHOLD_PCT && precision.carbPct >= MACRO_PRECISION_THRESHOLD_PCT) break;
    const underKcal = actual.kcal < target.kcal - 10;
    const underCarb = actual.carboidrati < target.carboidrati - 2;
    if (!underKcal && !underCarb) break;

    if (underCarb && underKcal) {
      let bestLocalIdx = carbLocal[0];
      let bestScore = 0;
      for (const localIdx of carbLocal) {
        const fullIdx = freeIndices[localIdx];
        if (fullIdx === undefined) continue;
        const p = foods[fullIdx].alimento.per100g;
        const carbContrib = p.carboidrati * 0.4 + (derivedKcalPer100g(p) / 100) * 0.6;
        if (carbContrib > bestScore) {
          bestScore = carbContrib;
          bestLocalIdx = localIdx;
        }
      }
      const fullIdx = freeIndices[bestLocalIdx];
      if (fullIdx === undefined) continue;
      const addG = 10;
      q[fullIdx] = roundQuantity(q[fullIdx] + addG);
    }

    const after = computeTotals(foods, q);
    if (after.kcal <= 0) break;
    if (after.kcal < target.kcal - 5) {
      let scale = target.kcal / after.kcal;
      scale = Math.min(scale, MAX_REFINE_SCALE_AGGRESSIVE);
      for (const i of freeIndices) {
        q[i] = q[i] * scale;
      }
    }
  }
  for (const i of freeIndices) {
    q[i] = roundQuantity(q[i]);
  }
  return q;
}

/**
 * Step di controllo 3a: swap compensato (kcal invariata).
 * Quando un macro è in eccesso e un altro in deficit: riduci la fonte dell'eccesso e aumenta
 * la fonte del deficit in modo che le kcal totali restino invariate (es. -2g olio, + più riso).
 */
function refineStep3Swap(
  foods: FoodInput[],
  quantities: number[],
  target: MealTarget,
  freeIndices: number[],
  categories: FoodCategory
): number[] {
  const q = quantities.map(x => x);
  if (target.kcal <= 0) return q;

  const macroSpec: {
    key: keyof MealTarget;
    categoryKey: keyof FoodCategory;
    getActual: (a: MealTarget) => number;
    getNutrientPer100: (p: { carboidrati: number; proteine: number; grassi: number }) => number;
  }[] = [
    { key: 'grassi', categoryKey: 'FAT_SOURCES', getActual: a => a.grassi, getNutrientPer100: p => p.grassi },
    { key: 'carboidrati', categoryKey: 'CARB_SOURCES', getActual: a => a.carboidrati, getNutrientPer100: p => p.carboidrati },
    { key: 'proteine', categoryKey: 'PROTEIN_SOURCES', getActual: a => a.proteine, getNutrientPer100: p => p.proteine },
  ];

  for (let over = 0; over < macroSpec.length; over++) {
    for (let under = 0; under < macroSpec.length; under++) {
      if (over === under) continue;
      const actual = computeTotals(foods, q);
      const targetOver = target[macroSpec[over].key];
      const targetUnder = target[macroSpec[under].key];
      if (targetOver < 1 || targetUnder < 1) continue;
      const actualOver = macroSpec[over].getActual(actual);
      const actualUnder = macroSpec[under].getActual(actual);
      const excess = actualOver - targetOver;
      const deficit = targetUnder - actualUnder;
      if (excess < 0.5 || deficit < 0.5) continue;

      const overIndices = categories[macroSpec[over].categoryKey];
      const underIndices = categories[macroSpec[under].categoryKey];
      if (overIndices.length === 0 || underIndices.length === 0) continue;

      let bestOverFullIdx: number | null = null;
      let bestUnderFullIdx: number | null = null;
      let bestOverNutrientPerGram = 0;
      let bestUnderKcalPerGram = 0;
      for (const localIdx of overIndices) {
        const fullIdx = freeIndices[localIdx];
        if (fullIdx === undefined || q[fullIdx] < 5) continue;
        const p = foods[fullIdx].alimento.per100g;
        const nutrientPerGram = macroSpec[over].getNutrientPer100(p) / 100;
        if (nutrientPerGram > bestOverNutrientPerGram) {
          bestOverNutrientPerGram = nutrientPerGram;
          bestOverFullIdx = fullIdx;
        }
      }
      for (const localIdx of underIndices) {
        const fullIdx = freeIndices[localIdx];
        if (fullIdx === undefined) continue;
        const kcalPerGram = derivedKcalPer100g(foods[fullIdx].alimento.per100g) / 100;
        if (kcalPerGram > 0 && (bestUnderFullIdx === null || kcalPerGram > bestUnderKcalPerGram)) {
          bestUnderKcalPerGram = kcalPerGram;
          bestUnderFullIdx = fullIdx;
        }
      }
      if (bestOverFullIdx === null || bestUnderFullIdx === null || bestOverFullIdx === bestUnderFullIdx) continue;

      const nutrientPer100Over = macroSpec[over].getNutrientPer100(foods[bestOverFullIdx].alimento.per100g);
      const gramsToReduceToRemoveExcess = nutrientPer100Over > 0 ? (excess * 100) / nutrientPer100Over : 0;
      const reduceGrams = Math.min(
        Math.max(5, roundQuantity(gramsToReduceToRemoveExcess) || 5),
        q[bestOverFullIdx],
        30
      );
      if (reduceGrams < 5) continue;
      const kcalToReplace = (reduceGrams / 100) * derivedKcalPer100g(foods[bestOverFullIdx].alimento.per100g);
      const addGramsRaw = (kcalToReplace * 100) / Math.max(1, derivedKcalPer100g(foods[bestUnderFullIdx].alimento.per100g));
      const addGrams = roundQuantity(Math.min(addGramsRaw, 60));
      if (addGrams < 5) continue;

      q[bestOverFullIdx] = roundQuantity(Math.max(0, q[bestOverFullIdx] - reduceGrams));
      q[bestUnderFullIdx] = roundQuantity(q[bestUnderFullIdx] + addGrams);
    }
  }

  return q;
}

/**
 * Step di controllo 3b: micro-aggiustamenti sui macro con precisione < 90%.
 * Quando siamo SOTTO target macro: aggiungiamo nudge e riscaliamo solo se siamo sopra target kcal
 * (se siamo sotto kcal non scalare in basso, così non annulliamo il guadagno).
 */
function refineStep3Macro(
  foods: FoodInput[],
  quantities: number[],
  target: MealTarget,
  freeIndices: number[],
  freeFoods: FoodInput[],
  categories: FoodCategory
): number[] {
  const q = quantities.map(x => x);
  if (target.kcal <= 0) return q;

  const macroConfig: {
    targetKey: keyof MealTarget;
    categoryKey: keyof FoodCategory;
    nutrientPer100: (p: { carboidrati: number; proteine: number; grassi: number }) => number;
  }[] = [
    { targetKey: 'carboidrati', categoryKey: 'CARB_SOURCES', nutrientPer100: p => p.carboidrati },
    { targetKey: 'proteine', categoryKey: 'PROTEIN_SOURCES', nutrientPer100: p => p.proteine },
    { targetKey: 'grassi', categoryKey: 'FAT_SOURCES', nutrientPer100: p => p.grassi },
  ];

  for (const { targetKey, categoryKey, nutrientPer100 } of macroConfig) {
    const actual = computeTotals(foods, q);
    const precision = getPrecision(target, actual);
    const pct = targetKey === 'carboidrati' ? precision.carbPct : targetKey === 'proteine' ? precision.protPct : precision.fatPct;
    if (pct >= MACRO_PRECISION_THRESHOLD_PCT) continue;
    const targetVal = target[targetKey];
    if (targetVal < 1) continue;
    const actualVal = actual[targetKey] ?? 0;
    const localIndices = categories[categoryKey];
    if (localIndices.length === 0) continue;

    const nudgeGrams = 5;
    if (actualVal < targetVal - 0.5) {
      let bestLocalIdx = localIndices[0];
      let bestContrib = 0;
      for (const localIdx of localIndices) {
        const fullIdx = freeIndices[localIdx];
        if (fullIdx === undefined || q[fullIdx] < 0) continue;
        const p = foods[fullIdx].alimento.per100g;
        const contrib = nutrientPer100(p) * (nudgeGrams / 100);
        if (contrib > bestContrib) {
          bestContrib = contrib;
          bestLocalIdx = localIdx;
        }
      }
      const fullIdx = freeIndices[bestLocalIdx];
      if (fullIdx === undefined) continue;
      q[fullIdx] = roundQuantity(q[fullIdx] + nudgeGrams);
    } else if (actualVal > targetVal + 0.5) {
      let bestLocalIdx = localIndices[0];
      let bestContrib = 0;
      for (const localIdx of localIndices) {
        const fullIdx = freeIndices[localIdx];
        if (fullIdx === undefined || q[fullIdx] < nudgeGrams) continue;
        const p = foods[fullIdx].alimento.per100g;
        const contrib = nutrientPer100(p) * (nudgeGrams / 100);
        if (contrib > bestContrib) {
          bestContrib = contrib;
          bestLocalIdx = localIdx;
        }
      }
      const fullIdx = freeIndices[bestLocalIdx];
      if (fullIdx === undefined || q[fullIdx] < nudgeGrams) continue;
      q[fullIdx] = roundQuantity(Math.max(0, q[fullIdx] - nudgeGrams));
    }

    const afterNudge = computeTotals(foods, q);
    if (afterNudge.kcal <= 0) continue;
    const underKcal = actual.kcal < target.kcal - 5;
    if (afterNudge.kcal > target.kcal) {
      let scale = target.kcal / afterNudge.kcal;
      scale = Math.max(MIN_REFINE_SCALE_AGGRESSIVE, Math.min(MAX_REFINE_SCALE_AGGRESSIVE, scale));
      for (const i of freeIndices) {
        q[i] = roundQuantity(q[i] * scale);
      }
    } else if (!underKcal && afterNudge.kcal < target.kcal - 5) {
      let scale = target.kcal / afterNudge.kcal;
      scale = Math.min(scale, MAX_REFINE_SCALE_AGGRESSIVE);
      for (const i of freeIndices) {
        q[i] = roundQuantity(q[i] * scale);
      }
    }
  }

  return q;
}

function computeMatchScore(target: MealTarget, actual: MealTarget): number {
  if (target.kcal <= 0) return 100;
  const eKcal = Math.abs(actual.kcal - target.kcal) / Math.max(target.kcal, 1);
  const eCarb = target.carboidrati > 0 ? Math.abs(actual.carboidrati - target.carboidrati) / target.carboidrati : 0;
  const eProt = target.proteine > 0 ? Math.abs(actual.proteine - target.proteine) / target.proteine : 0;
  const eFat = target.grassi > 0 ? Math.abs(actual.grassi - target.grassi) / target.grassi : 0;
  const scoreKcal = Math.max(0, 1 - eKcal) * 100;
  const macroSum = target.carboidrati + target.proteine + target.grassi;
  const scoreMacro = macroSum > 0
    ? Math.max(0, 1 - (eCarb + eProt + eFat) / 3) * 100
    : 100;
  return Math.round(0.6 * scoreKcal + 0.4 * scoreMacro);
}

/** Identifica il macro con maggiore carenza (actual < target) per suggerimento. */
function getMissingMacro(target: MealTarget, actual: MealTarget): MissingMacro {
  const deficits = [
    { macro: 'carboidrati' as const, diff: target.carboidrati - actual.carboidrati },
    { macro: 'proteine' as const, diff: target.proteine - actual.proteine },
    { macro: 'grassi' as const, diff: target.grassi - actual.grassi },
  ].filter(d => d.diff > 1);
  if (deficits.length === 0) return null;
  deficits.sort((a, b) => b.diff - a.diff);
  return deficits[0].macro;
}

function computeCategoryBreakdown(
  foods: FoodInput[],
  quantities: number[]
): MealSolverResult['categoryBreakdown'] {
  let proteinCount = 0, proteinGrams = 0, carbCount = 0, carbGrams = 0, fatCount = 0, fatGrams = 0;
  foods.forEach((f, i) => {
    const q = quantities[i] || 0;
    if (q <= 0) return;
    const p = f.alimento.per100g;
    const totalKcal = Math.max(derivedKcalPer100g(p), 1);
    const proteinRatio = (p.proteine * 4) / totalKcal;
    const carbRatio = (p.carboidrati * 4) / totalKcal;
    const fatRatio = (p.grassi * 9) / totalKcal;
    if (proteinRatio > MACRO_CLASSIFICATION_THRESHOLD) {
      proteinCount++;
      proteinGrams += q;
    }
    if (carbRatio > MACRO_CLASSIFICATION_THRESHOLD) {
      carbCount++;
      carbGrams += q;
    }
    if (fatRatio > MACRO_CLASSIFICATION_THRESHOLD) {
      fatCount++;
      fatGrams += q;
    }
  });
  return {
    protein: { count: proteinCount, totalGrams: Math.round(proteinGrams) },
    carbs: { count: carbCount, totalGrams: Math.round(carbGrams) },
    fats: { count: fatCount, totalGrams: Math.round(fatGrams) },
  };
}

export function solveMeal(target: MealTarget, foods: FoodInput[]): MealSolverResult {
  const emptyResult = (message: string, missingMacro: MissingMacro = null, suggestions?: string[]): MealSolverResult => ({
    success: false,
    items: [],
    actual: { kcal: 0, carboidrati: 0, proteine: 0, grassi: 0 },
    precisionScore: 0,
    matchScore: 0,
    message,
    missingMacro,
    suggestions,
  });

  if (foods.length === 0) {
    return emptyResult('Aggiungi almeno un alimento.');
  }

  const lockedIndices: number[] = [];
  const freeIndices: number[] = [];
  foods.forEach((f, i) => {
    if (f.fixedGrams != null && f.fixedGrams >= 0) lockedIndices.push(i);
    else freeIndices.push(i);
  });

  const nFree = freeIndices.length;
  const freeFoods = freeIndices.map(i => foods[i]);

  if (nFree === 0) {
    const quantities = foods.map(f => f.fixedGrams ?? 0);
    const actual = computeTotals(foods, quantities);
    const matchScore = computeMatchScore(target, actual);
    const missingMacro = matchScore < 80 ? getMissingMacro(target, actual) : null;
    return {
      success: true,
      items: foods.map((f, i) => ({
        alimentoId: f.alimento.id,
        nome: f.alimento.nome,
        quantita: roundQuantity(quantities[i]),
        locked: true,
      })),
      actual,
      precisionScore: matchScore,
      matchScore,
      message: matchScore < 80 ? `Configurazione sbilanciata (Precisione: ${matchScore}%)` : undefined,
      missingMacro,
      categoryBreakdown: computeCategoryBreakdown(foods, quantities),
    };
  }

  const categories = classifyFoodsByMacro(freeFoods);
  const feasibility = checkMealFeasibility(freeFoods, target, categories);

  if (!feasibility.isFeasible) {
    const quantities = foods.map((f, i) => f.fixedGrams ?? 0);
    const actual = computeTotals(foods, quantities);
    return {
      success: false,
      items: foods.map((f, i) => ({
        alimentoId: f.alimento.id,
        nome: f.alimento.nome,
        quantita: roundQuantity(quantities[i]),
        locked: f.fixedGrams != null,
      })),
      actual,
      precisionScore: 0,
      matchScore: 0,
      message: feasibility.warnings.join(' ').trim(),
      missingMacro: null,
      suggestions: feasibility.suggestions.length > 0 ? feasibility.suggestions : undefined,
    };
  }

  const bScaled = [target.kcal * 100, target.carboidrati * 100, target.proteine * 100, target.grassi * 100];
  const nutrientPer100 = (r: number, f: FoodInput) => {
    const p = f.alimento.per100g;
    return r === 0 ? derivedKcalPer100g(p) : r === 1 ? p.carboidrati : r === 2 ? p.proteine : p.grassi;
  };
  for (let r = 0; r < 4; r++) {
    lockedIndices.forEach(i => {
      const g = foods[i].fixedGrams ?? 0;
      bScaled[r] -= (g / 100) * nutrientPer100(r, foods[i]) * 100;
    });
  }

  const overflowLabels = ['kcal', 'carboidrati', 'proteine', 'grassi'] as const;
  const overflowIdx = bScaled.findIndex(v => v < -1);
  if (overflowIdx >= 0) {
    const quantities = foods.map((f, i) => (freeIndices.includes(i) ? 0 : roundQuantity(f.fixedGrams ?? 0)));
    const actual = computeTotals(foods, quantities);
    const macroName = overflowIdx === 0 ? 'calorie' : overflowLabels[overflowIdx];
    return {
      success: false,
      items: foods.map((f, i) => ({
        alimentoId: f.alimento.id,
        nome: f.alimento.nome,
        quantita: quantities[i],
        locked: f.fixedGrams != null,
      })),
      actual,
      precisionScore: computeMatchScore(target, actual),
      matchScore: computeMatchScore(target, actual),
      message: `Attenzione: gli alimenti fissati superano già il target di ${macroName}. Gli altri ingredienti sono stati impostati a 0 g.`,
      missingMacro: null,
      suggestions: ['Riduci le quantità fissate oppure aumenta il target del pasto.'],
    };
  }

  const A_free: number[][] = [[], [], [], []];
  freeIndices.forEach(j => {
    const p = foods[j].alimento.per100g;
    A_free[0].push(derivedKcalPer100g(p));
    A_free[1].push(p.carboidrati);
    A_free[2].push(p.proteine);
    A_free[3].push(p.grassi);
  });

  const targetKcalFree = Math.max(0, bScaled[0] / 100);
  let xFree = nnlsWithKcalPriority(A_free, bScaled, targetKcalFree, nFree, freeFoods);

  const quantities: number[] = foods.map((f, i) => f.fixedGrams ?? 0);
  freeIndices.forEach((origIdx, k) => {
    quantities[origIdx] = xFree[k];
  });
  let roundedQuantities = quantities.map((q, i) =>
    foods[i].fixedGrams != null ? roundQuantity(foods[i].fixedGrams!) : roundQuantity(q)
  );

  roundedQuantities = refineQuantities(
    foods,
    roundedQuantities,
    target,
    freeIndices,
    freeFoods,
    categories
  );

  let actualAfterRefine = computeTotals(foods, roundedQuantities);
  let precision = getPrecision(target, actualAfterRefine);
  if (needsImprovement(precision)) {
    roundedQuantities = refineStep2Kcal(foods, roundedQuantities, target, freeIndices);
    actualAfterRefine = computeTotals(foods, roundedQuantities);
    precision = getPrecision(target, actualAfterRefine);
  }
  if (needsImprovement(precision)) {
    roundedQuantities = refineStep2bCarbsKcal(foods, roundedQuantities, target, freeIndices, categories);
    actualAfterRefine = computeTotals(foods, roundedQuantities);
    precision = getPrecision(target, actualAfterRefine);
  }
  if (needsImprovement(precision)) {
    roundedQuantities = refineStep3Swap(foods, roundedQuantities, target, freeIndices, categories);
    actualAfterRefine = computeTotals(foods, roundedQuantities);
    precision = getPrecision(target, actualAfterRefine);
  }
  if (needsImprovement(precision)) {
    roundedQuantities = refineStep3Macro(
      foods,
      roundedQuantities,
      target,
      freeIndices,
      freeFoods,
      categories
    );
  }

  const actual = computeTotals(foods, roundedQuantities);
  const matchScore = computeMatchScore(target, actual);
  const missingMacro = matchScore < 80 ? getMissingMacro(target, actual) : null;

  let message: string | undefined;
  const msgParts: string[] = [];
  if (feasibility.warnings.length > 0) msgParts.push(feasibility.warnings.join(' ').trim());
  if (matchScore < 80) msgParts.push(`Configurazione sbilanciata (Precisione: ${matchScore}%).`);
  if (msgParts.length > 0) message = msgParts.join(' ');

  return {
    success: true,
    items: foods.map((f, i) => ({
      alimentoId: f.alimento.id,
      nome: f.alimento.nome,
      quantita: roundedQuantities[i],
      locked: f.fixedGrams != null,
    })),
    actual,
    precisionScore: matchScore,
    matchScore,
    message: message || undefined,
    missingMacro,
    suggestions: feasibility.suggestions.length > 0 ? feasibility.suggestions : undefined,
    categoryBreakdown: computeCategoryBreakdown(foods, roundedQuantities),
  };
}

type MacroKey = Exclude<MissingMacro, null>;

/** Alimenti standard per suggerimento macro (fallback se non in DB). */
export const SUGGESTED_FOODS_BY_MACRO: Record<MacroKey, { nome: string; per100g: { carboidrati: number; proteine: number; grassi: number; kcal: number } }[]> = {
  carboidrati: [
    { nome: 'Riso', per100g: { carboidrati: 28, proteine: 2.7, grassi: 0.3, kcal: 130 } },
    { nome: 'Pasta', per100g: { carboidrati: 25, proteine: 5, grassi: 0.9, kcal: 131 } },
    { nome: 'Patate', per100g: { carboidrati: 17, proteine: 2, grassi: 0.1, kcal: 77 } },
  ],
  proteine: [
    { nome: 'Petto di pollo', per100g: { carboidrati: 0, proteine: 31, grassi: 3.6, kcal: 165 } },
    { nome: 'Tonno', per100g: { carboidrati: 0, proteine: 30, grassi: 1, kcal: 132 } },
    { nome: 'Uova', per100g: { carboidrati: 1.1, proteine: 12.6, grassi: 9.5, kcal: 155 } },
  ],
  grassi: [
    { nome: 'Olio extra vergine', per100g: { carboidrati: 0, proteine: 0, grassi: 100, kcal: 884 } },
    { nome: 'Avocado', per100g: { carboidrati: 8.5, proteine: 2, grassi: 15, kcal: 160 } },
  ],
};

/** Restituisce un Alimento da usare per il suggerimento: preferisce dal DB, altrimenti fallback. */
export function getSuggestionFoodForMacro(
  macro: MissingMacro,
  alimenti: Alimento[]
): Alimento | null {
  if (!macro || !SUGGESTED_FOODS_BY_MACRO[macro as MacroKey]?.length) return null;
  const options = SUGGESTED_FOODS_BY_MACRO[macro as MacroKey];
  for (const opt of options) {
    const found = alimenti.find(a => a.nome.toLowerCase().includes(opt.nome.toLowerCase()));
    if (found) return found;
  }
  const fallback = options[0];
  return {
    id: `suggested-${macro}-${fallback.nome.replace(/\s/g, '-').toLowerCase()}`,
    nome: fallback.nome,
    per100g: { ...fallback.per100g },
  };
}
