
export type MacroType = 'carboidrati' | 'proteine' | 'grassi';

export interface MacroValue {
  kcal: number;
  grammi: number;
}

export interface MacroSplit {
  carboidrati: MacroValue;
  proteine: MacroValue;
  grassi: MacroValue;
}

export interface SettimanaConfig {
  numero: number;
  giorniON: {
    calorieTotal: number;
    macros: MacroSplit;
  };
  giorniOFF: {
    calorieTotal: number;
    macros: MacroSplit;
  };
}

export type TipologiaGiornata = 
  | 'ON_4_PASTI_WOD_SERA'
  | 'ON_4_PASTI_WOD_MATTINA'
  | 'ON_5_PASTI_WOD_MATTINA'
  | 'ON_5_PASTI_WOD_SERA'
  | 'OFF_4_PASTI'
  | 'OFF_4_PASTI_CARBS'
  | 'OFF_5_PASTI';

export type NomePasto = 'colazione' | 'spuntino' | 'pranzo' | 'merenda' | 'cena';

export interface DistribuzionePasto {
  pasto: NomePasto;
  percentuali: {
    carboidrati: number;
    proteine: number;
    grassi: number;
  };
}

export interface TipologiaGiornataConfig {
  tipo: TipologiaGiornata;
  label: string;
  categoria: 'ON' | 'OFF';
  numeroPasti: 4 | 5;
  distribuzioni: DistribuzionePasto[];
}

export interface Alimento {
  id: string;
  nome: string;
  per100g: {
    carboidrati: number;
    proteine: number;
    grassi: number;
    kcal: number;
  };
}

export interface AlimentoSelezionato {
  alimentoId: string;
  quantita: number; // grams
}

export type PastoStatus = 'regular' | 'skipped' | 'cheat';

export interface PastoComposto {
  id: string;
  data: string; // YYYY-MM-DD
  settimana: number;
  tipologiaGiornata: TipologiaGiornata;
  nomePasto: NomePasto;
  alimenti: AlimentoSelezionato[];
  status: PastoStatus;
}

export interface DailySetup {
  date: string; // YYYY-MM-DD
  settimana: number;
  tipologiaGiornata: TipologiaGiornata;
}

export interface AppState {
  isConfigured: boolean;
  settimane: SettimanaConfig[];
  tipologie: TipologiaGiornataConfig[];
  alimenti: Alimento[];
  pastiSalvati: PastoComposto[];
  dailySetups: DailySetup[]; // Memorizza quale settimana/tipo è stata scelta per ogni giorno
}
