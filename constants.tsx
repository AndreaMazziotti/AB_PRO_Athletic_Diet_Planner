
import { Alimento, TipologiaGiornataConfig, NomePasto } from './types';

export const INITIAL_ALIMENTI: Alimento[] = [
  { id: '1', nome: 'Riso cotto', per100g: { carboidrati: 28, proteine: 2.7, grassi: 0.3, kcal: 130 } },
  { id: '2', nome: 'Riso crudo', per100g: { carboidrati: 80, proteine: 7, grassi: 0.6, kcal: 365 } },
  { id: '3', nome: 'Petto di pollo cotto', per100g: { carboidrati: 0, proteine: 31, grassi: 3.6, kcal: 165 } },
  { id: '4', nome: 'Petto di pollo crudo', per100g: { carboidrati: 0, proteine: 23, grassi: 1.2, kcal: 110 } },
  { id: '5', nome: 'Pasta di riso cotta', per100g: { carboidrati: 25, proteine: 2.5, grassi: 0.5, kcal: 120 } },
  { id: '6', nome: 'Pasta di riso cruda', per100g: { carboidrati: 78, proteine: 7, grassi: 1.5, kcal: 360 } },
  { id: '7', nome: 'Pasta bianca cotta', per100g: { carboidrati: 31, proteine: 5, grassi: 0.9, kcal: 158 } },
  { id: '8', nome: 'Pasta bianca cruda', per100g: { carboidrati: 75, proteine: 13, grassi: 1.5, kcal: 371 } },
  { id: '9', nome: 'Pane bianco', per100g: { carboidrati: 49, proteine: 8, grassi: 3.2, kcal: 265 } },
  { id: '10', nome: 'Tonno al naturale', per100g: { carboidrati: 0, proteine: 26, grassi: 0.6, kcal: 116 } },
  { id: '11', nome: 'Tonno all\'olio sgocciolato', per100g: { carboidrati: 0, proteine: 25, grassi: 10, kcal: 200 } },
  { id: '12', nome: 'Salmone affumicato', per100g: { carboidrati: 0, proteine: 18, grassi: 4, kcal: 117 } },
  { id: '13', nome: 'Salmone sott\'olio', per100g: { carboidrati: 0, proteine: 20, grassi: 12, kcal: 200 } },
  { id: '14', nome: 'Proteine in polvere (whey)', per100g: { carboidrati: 5, proteine: 80, grassi: 3, kcal: 370 } },
  { id: '15', nome: 'Cereali Kellogg\'s Special K', per100g: { carboidrati: 76, proteine: 14, grassi: 1.5, kcal: 375 } },
  { id: '16', nome: 'Risetti Choco Pops', per100g: { carboidrati: 84, proteine: 6, grassi: 1, kcal: 375 } },
  { id: '17', nome: 'Burro di arachidi', per100g: { carboidrati: 20, proteine: 25, grassi: 50, kcal: 620 } },
  { id: '18', nome: 'Merluzzo', per100g: { carboidrati: 0, proteine: 17, grassi: 0.3, kcal: 82 } },
  { id: '19', nome: 'Olio EVO', per100g: { carboidrati: 0, proteine: 0, grassi: 100, kcal: 900 } },
  { id: '20', nome: 'Burro', per100g: { carboidrati: 0, proteine: 0.5, grassi: 83, kcal: 750 } },
  { id: '21', nome: 'Latte Alpro (soia)', per100g: { carboidrati: 0.5, proteine: 3, grassi: 1.8, kcal: 35 } },
  { id: '22', nome: 'Yogurt greco 2% grassi', per100g: { carboidrati: 4, proteine: 9, grassi: 2, kcal: 73 } },
  { id: '23', nome: 'Cioccolata fondente 70%', per100g: { carboidrati: 45, proteine: 8, grassi: 35, kcal: 550 } },
  { id: '24', nome: 'Uova (intere)', per100g: { carboidrati: 1, proteine: 13, grassi: 11, kcal: 155 } },
  { id: '25', nome: 'Tofu', per100g: { carboidrati: 2, proteine: 8, grassi: 4.8, kcal: 76 } },
  { id: '26', nome: 'Farina di avena', per100g: { carboidrati: 60, proteine: 13, grassi: 7, kcal: 370 } },
  { id: '27', nome: 'Farina di mandorle', per100g: { carboidrati: 10, proteine: 21, grassi: 50, kcal: 600 } },
  { id: '28', nome: 'Macinato di manzo magro', per100g: { carboidrati: 0, proteine: 20, grassi: 5, kcal: 130 } },
  { id: '29', nome: 'Sgombro sott\'olio sgocciolato', per100g: { carboidrati: 0, proteine: 19, grassi: 11, kcal: 180 } },
  { id: '30', nome: 'Insalata di mare', per100g: { carboidrati: 3, proteine: 12, grassi: 1, kcal: 70 } },
];

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
