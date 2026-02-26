
export interface Sector {
  id: string;
  name: string;
}

export interface DikeConfig {
  id: string;
  sectorId: string;
  name: string;
  progInicioRio: string;
  progFinRio: string;
  progInicioDique: string;
  progFinDique: string;
  totalML: number;
  notes?: string;
}

export interface MeasurementEntry {
  id: string;
  dikeId: string;
  pk: string;
  distancia: number;
  tipoTerreno: "B1" | "B2" | string;
  tipoEnrocado: "TIPO 1" | "TIPO 2" | string;
  intervencion: string;

  // Partidas B1 & B2
  item401A?: number; // DESBROCE Y LIMPIEZA
  item402B?: number; // EXCAVACIÓN MASIVA EN MATERIAL SUELTO
  item402B_MM?: number; // EXCAVACIÓN MASIVA EN MATERIAL SUELTO M.M.
  item402C?: number; // EXCAVACIÓN EN ROCA SUELTA
  item402D?: number; // EXCAVACIÓN DE ROCA FIJA
  item402E?: number; // EXCAVACION DE UÑA
  item402E_MM?: number; // EXCAVACION DE UÑA M.M.
  item403A?: number; // CONFORMACIÓN Y COMPACTACIÓN
  item403A_MM?: number; // CONFORMACIÓN Y COMPACTACIÓN M.M.
  item403B?: number; // RECRECIMIENTO Y CONFORMACION (B2)
  item404A?: number; // ENROCADO TALUD T1
  item404A_MM?: number; // ENROCADO TALUD T1 M.M.
  item404B?: number; // ENROCADO TALUD T2
  item404D?: number; // ENROCADO UÑA T1
  item404D_MM?: number; // ENROCADO UÑA T1 M.M.
  item404E?: number; // ENROCADO UÑA T2
  item404G?: number; // ENROCADO TALUD EXISTENTE (B2)
  item404H?: number; // ENROCADO UÑA EXISTENTE (B2)
  item405A?: number; // DESCOLMATACIÓN
  item406A?: number; // REFINE Y PERFILADO
  item407A?: number; // MEJORAMIENTO SUELO
  item408A?: number; // ZANJA Y RELLENO
  item409A?: number; // GEOTEXTIL CLASE 1
  item409B?: number; // GEOTEXTIL CLASE 2
  item410A?: number; // DME/DMO
  item410B?: number; // MATERIAL EXCEDENTE
  item412A?: number; // AFIRMADO CORONA
  item413A?: number; // RELLENO PROPIO
  item413A_MM?: number; // RELLENO PROPIO M.M.
  item414A?: number; // GEOCELDAS
  item415?: number;  // GAVION (B2)
  item416A?: number; // PERFILADO Y COMPACTACION FUNDACION / CORONA

  // Legacy/Control fields (keep for compatibility if needed)
  item501A_Carguio?: number;

  // Allow dynamic properties for Custom Columns
  [key: string]: any;
}

export interface ProgressEntry {
  id: string;
  date: string;
  dikeId: string;
  progInicio: string;
  progFin: string;
  longitud: number;
  tipoTerreno: "B1" | "B2";
  tipoEnrocado: "TIPO 1" | "TIPO 2";
  partida: string;
  intervencion: string;
  capa: string;
  observaciones: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
}

export interface BudgetItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  metrado: number;
  price: number;
  selected?: boolean;
}

export interface BudgetGroup {
  id: string;
  code: string;
  name: string;
  items: BudgetItem[];
}

export interface BudgetSection {
  id: string;
  name: string;
  groups: BudgetGroup[];
}

export interface BrandKit {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface AnimationSettings {
  style: "none" | "fade-in" | "slide-in-left" | "slide-in-right" | "pulse";
  duration: number; // in seconds
}

export interface AdVariation {
  id: string;
  headline: string;
  cta: string;
  description: string;
  visualPrompt: string;
  style: BannerStyle;
  designExplanation?: string;
  size?: string;
  animation?: AnimationSettings;
}

export interface ProtocolEntry {
  id: string;
  dikeId: string;
  measurementId: string; // Link to MeasurementEntry
  estado: string;
  pkRio: string;
  pkDique: string;
  distancia: number;
  tipoEnrocado: string;
  tipoTerreno: string;
  intervencion: string;
  // Protocol numbers/status for each item
  protocols: Record<string, string>; 
}

export interface ProjectBackup {
  sectors?: Sector[];
  dikes: DikeConfig[];
  measurements: MeasurementEntry[];
  progressEntries: ProgressEntry[];
  protocols?: ProtocolEntry[]; // Added protocols
  customColumns: string[];
  budgetBySector?: Record<string, BudgetSection[]>;
  budgetByDike?: Record<string, BudgetSection[]>;
  storagePath?: string;
  timestamp: number;
}

export interface CopySuggestion {
  headline: string;
  cta: string;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:5";
export type ImageSize = "1024x1024" | "1200x628" | "1080x1920";
export type BannerStyle = "minimal" | "bold" | "playful" | "professional" | "vintage" | "vibrant" | "editorial";

export interface GeneratedImage {
  id: string;
  url: string;
  size: string;
  ratio: string;
  style: string;
}

export interface BackupFile {
  id: string;
  name: string;
  path: string;
  type: 'auto' | 'manual' | 'temp';
  date: string;
  size: string;
  data: ProjectBackup;
}
