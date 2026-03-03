
import { Alimento, TipologiaGiornataConfig, NomePasto, AlimentoCategoria } from './types';

// Importa alimenti da CSV
import alimentiCsv from './alimenti.csv?raw';

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/** Mappa nome alimento (contains) -> categoria per generatore settimanale */
const CATEGORIA_BY_NOME: { pattern: RegExp | string; cat: AlimentoCategoria }[] = [
  { pattern: /salmone|spigola|merluzzo|nasello|tonno|pesce spada/i, cat: 'Pesce' },
  { pattern: /bovino|filetto.*bovino|vitello|bresaola/i, cat: 'Carne Rossa' },
  { pattern: /petto.*pollo|petto.*tacchino|fesa.*tacchino/i, cat: 'Carne Bianca' },
  { pattern: /riso basmati|pasta|pane di segale|gallette di riso|fette biscottate|farina d'?avena|corn flakes|patate|risetti/i, cat: 'Carbo' },
  { pattern: /yogurt greco 0%|albume|proteine isolate|olio.*oliva|burro di arachidi|cioccolato fondente 90%|nocciole|parmigiano|latte di mandorla/i, cat: 'Grassi/Pro' },
];

function getCategoriaForAlimento(nome: string): AlimentoCategoria | undefined {
  for (const { pattern, cat } of CATEGORIA_BY_NOME) {
    if (typeof pattern === 'string' ? nome.toLowerCase().includes(pattern.toLowerCase()) : pattern.test(nome)) {
      return cat;
    }
  }
  return undefined;
}

function parseAlimentiCSV(csv: string): Alimento[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rows = lines.slice(1).map(parseCSVRow);
  return rows
    .filter(row => row.length >= 6)
    .map(row => {
      const nome = row[1];
      return {
        id: row[0],
        nome,
        per100g: {
          carboidrati: parseFloat(row[2]) || 0,
          proteine: parseFloat(row[3]) || 0,
          grassi: parseFloat(row[4]) || 0,
          kcal: parseFloat(row[5]) || 0,
        },
        categoria: getCategoriaForAlimento(nome),
      };
    });
}

export const INITIAL_ALIMENTI: Alimento[] = parseAlimentiCSV(alimentiCsv);

/** ID degli alimenti certificati AB Nutrition (solo lettura, no edit/delete) */
export const CERTIFIED_ALIMENTO_IDS = new Set(INITIAL_ALIMENTI.map(a => a.id));

export const PASTI_4: NomePasto[] = ['colazione', 'pranzo', 'merenda', 'cena'];
export const PASTI_5: NomePasto[] = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena'];

export const TIPOLOGIE_GIORNATA: TipologiaGiornataConfig[] = [
  {
    tipo: 'ON_4_PASTI_WOD_SERA',
    label: 'ON - 4 pasti - WOD serale',
    categoria: 'ON',
    numeroPasti: 4,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 15, proteine: 30, grassi: 40 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 30, proteine: 30, grassi: 30 } },
      { pasto: 'merenda', percentuali: { carboidrati: 25, proteine: 20, grassi: 20 } },
      { pasto: 'cena', percentuali: { carboidrati: 30, proteine: 20, grassi: 10 } },
    ]
  },
  {
    tipo: 'ON_4_PASTI_WOD_MATTINA',
    label: 'ON - 4 pasti - WOD mattina',
    categoria: 'ON',
    numeroPasti: 4,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 30, proteine: 20, grassi: 10 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 25, proteine: 30, grassi: 20 } },
      { pasto: 'merenda', percentuali: { carboidrati: 20, proteine: 20, grassi: 30 } },
      { pasto: 'cena', percentuali: { carboidrati: 25, proteine: 30, grassi: 40 } },
    ]
  },
  {
    tipo: 'ON_5_PASTI_WOD_MATTINA',
    label: 'ON - 5 pasti - WOD mattina',
    categoria: 'ON',
    numeroPasti: 5,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 30, proteine: 20, grassi: 10 } },
      { pasto: 'spuntino', percentuali: { carboidrati: 10, proteine: 15, grassi: 15 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 20, proteine: 25, grassi: 20 } },
      { pasto: 'merenda', percentuali: { carboidrati: 20, proteine: 20, grassi: 25 } },
      { pasto: 'cena', percentuali: { carboidrati: 20, proteine: 20, grassi: 30 } },
    ]
  },
  {
    tipo: 'ON_5_PASTI_WOD_SERA',
    label: 'ON - 5 pasti - WOD sera',
    categoria: 'ON',
    numeroPasti: 5,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 15, proteine: 20, grassi: 30 } },
      { pasto: 'spuntino', percentuali: { carboidrati: 15, proteine: 15, grassi: 20 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 20, proteine: 25, grassi: 25 } },
      { pasto: 'merenda', percentuali: { carboidrati: 20, proteine: 20, grassi: 15 } },
      { pasto: 'cena', percentuali: { carboidrati: 30, proteine: 20, grassi: 10 } },
    ]
  },
  {
    tipo: 'OFF_4_PASTI',
    label: 'OFF - 4 pasti',
    categoria: 'OFF',
    numeroPasti: 4,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 25, proteine: 25, grassi: 25 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 25, proteine: 25, grassi: 25 } },
      { pasto: 'merenda', percentuali: { carboidrati: 25, proteine: 25, grassi: 25 } },
      { pasto: 'cena', percentuali: { carboidrati: 25, proteine: 25, grassi: 25 } },
    ]
  },
  {
    tipo: 'OFF_4_PASTI_CARBS',
    label: 'OFF - 4 pasti carbs focus',
    categoria: 'OFF',
    numeroPasti: 4,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 40, proteine: 20, grassi: 20 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 20, proteine: 30, grassi: 30 } },
      { pasto: 'merenda', percentuali: { carboidrati: 20, proteine: 20, grassi: 30 } },
      { pasto: 'cena', percentuali: { carboidrati: 20, proteine: 30, grassi: 20 } },
    ]
  },
  {
    tipo: 'OFF_5_PASTI',
    label: 'OFF - 5 pasti',
    categoria: 'OFF',
    numeroPasti: 5,
    distribuzioni: [
      { pasto: 'colazione', percentuali: { carboidrati: 20, proteine: 20, grassi: 20 } },
      { pasto: 'spuntino', percentuali: { carboidrati: 20, proteine: 20, grassi: 20 } },
      { pasto: 'pranzo', percentuali: { carboidrati: 20, proteine: 20, grassi: 20 } },
      { pasto: 'merenda', percentuali: { carboidrati: 20, proteine: 20, grassi: 20 } },
      { pasto: 'cena', percentuali: { carboidrati: 20, proteine: 20, grassi: 20 } },
    ]
  }
];
