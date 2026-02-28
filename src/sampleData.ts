
import { MeasurementEntry, ProgressEntry, DikeConfig, BudgetSection, ProtocolEntry } from "../types";

export const SAMPLE_DIKES: DikeConfig[] = [
  { id: "DIPR_001_MI", name: "DIQUE 01 MI", sectorId: "CASMA", totalML: 2700, progInicioDique: "0+560", progFinDique: "3+260", progInicioRio: "0+560", progFinRio: "3+260" },
  { id: "DIPR_002_MD", name: "DIQUE 02 MD", sectorId: "CASMA", totalML: 5064, progInicioDique: "0+000", progFinDique: "5+064", progInicioRio: "0+000", progFinRio: "5+064" },
  { id: "DIPR_001b_MI", name: "DIQUE 01b MI", sectorId: "CONFLUENCIA", totalML: 3525, progInicioDique: "5+397", progFinDique: "8+922", progInicioRio: "5+397", progFinRio: "8+922" },
  { id: "DIPR_005_MI_RG", name: "DIQUE 05 MI RG", sectorId: "RIO_GRANDE", totalML: 15216, progInicioDique: "8+900", progFinDique: "24+116", progInicioRio: "8+900", progFinRio: "24+116" },
  { id: "DIPR_016_MI_S", name: "DIQUE 16 MI S", sectorId: "SECHIN", totalML: 10698, progInicioDique: "4+055", progFinDique: "14+754", progInicioRio: "4+055", progFinRio: "14+754" },
];

export const SAMPLE_BUDGET: Record<string, BudgetSection[]> = {
  "CASMA": [
    {
      id: "400",
      name: "ESTRUCTURAS",
      groups: [
        {
          id: "404",
          code: "404",
          name: "ENROCADO",
          items: [
            { id: "404.A", code: "404.A", description: "ENROCADO Y ACOMODO", unit: "m3", metrado: 150000, price: 45.50, selected: true },
            { id: "404.D", code: "404.D", description: "FILTRO DE ROCA", unit: "m3", metrado: 45000, price: 38.20, selected: true },
          ]
        }
      ]
    }
  ]
};

export const SAMPLE_PROTOCOLS: ProtocolEntry[] = [
    {
        id: "P_S_M_1_1",
        dikeId: "DIPR_001_MI",
        measurementId: "S_M_1_1",
        estado: "EJECUTADO",
        pkRio: "0+560",
        pkDique: "0+560",
        distancia: 0,
        tipoEnrocado: "TIPO 1",
        tipoTerreno: "B1",
        intervencion: "MUESTRA",
        protocols: { "item404A": "PROT-001", "item404D": "PROT-001" },
        valuationMonths: { "item404A": "AGOSTO 2024", "item404D": "AGOSTO 2024" }
    }
];

export const SAMPLE_MEASUREMENTS: MeasurementEntry[] = [
  // DIPR_001_MI (CASMA)
  { id: "S_M_1_1", dikeId: "DIPR_001_MI", pk: "0+560.00", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 4.5, item402B: 2.1, item402E: 8.5, item404A: 7.2, item404D: 8.1, item413A: 2.1, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_1_2", dikeId: "DIPR_001_MI", pk: "1+000.00", distancia: 440, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 5.2, item402B: 1.8, item402E: 9.1, item404A: 7.5, item404D: 8.5, item413A: 2.5, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_1_3", dikeId: "DIPR_001_MI", pk: "1+500.00", distancia: 500, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 4.8, item402B: 2.3, item402E: 8.8, item404A: 7.8, item404D: 8.2, item413A: 2.2, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_1_4", dikeId: "DIPR_001_MI", pk: "2+000.00", distancia: 500, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 5.5, item402B: 1.5, item402E: 9.5, item404A: 8.1, item404D: 8.8, item413A: 2.8, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_1_5", dikeId: "DIPR_001_MI", pk: "2+700.00", distancia: 700, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 4.2, item402B: 2.5, item402E: 8.2, item404A: 7.0, item404D: 8.0, item413A: 2.0, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },

  // DIPR_002_MD (CASMA)
  { id: "S_M_2_1", dikeId: "DIPR_002_MD", pk: "0+000.00", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 3.8, item402B: 1.2, item402E: 7.5, item404A: 6.2, item404D: 7.1, item413A: 1.8, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_2_2", dikeId: "DIPR_002_MD", pk: "1+000.00", distancia: 1000, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 4.1, item402B: 1.5, item402E: 8.2, item404A: 6.5, item404D: 7.5, item413A: 2.1, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_2_3", dikeId: "DIPR_002_MD", pk: "2+500.00", distancia: 1500, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 3.5, item402B: 1.8, item402E: 7.8, item404A: 6.8, item404D: 7.2, item413A: 1.9, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_2_4", dikeId: "DIPR_002_MD", pk: "4+000.00", distancia: 1500, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 4.5, item402B: 1.1, item402E: 8.5, item404A: 7.1, item404D: 7.8, item413A: 2.2, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_2_5", dikeId: "DIPR_002_MD", pk: "5+064.29", distancia: 1064.29, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 3.2, item402B: 2.1, item402E: 7.2, item404A: 6.0, item404D: 7.0, item413A: 1.7, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },

  // DIPR_001b_MI (CONFLUENCIA)
  { id: "S_M_3_1", dikeId: "DIPR_001b_MI", pk: "5+397.00", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 5.5, item402B: 2.5, item402E: 9.5, item404A: 8.2, item404D: 9.1, item413A: 2.8, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_3_2", dikeId: "DIPR_001b_MI", pk: "6+500.00", distancia: 1103, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 6.1, item402B: 2.8, item402E: 10.2, item404A: 8.5, item404D: 9.5, item413A: 3.1, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_3_3", dikeId: "DIPR_001b_MI", pk: "7+500.00", distancia: 1000, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 5.8, item402B: 3.1, item402E: 9.8, item404A: 8.8, item404D: 9.2, item413A: 2.9, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_3_4", dikeId: "DIPR_001b_MI", pk: "8+922.00", distancia: 1422, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 6.5, item402B: 2.4, item402E: 10.5, item404A: 9.1, item404D: 9.8, item413A: 3.2, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },

  // DIPR_005_MI_RG (RIO GRANDE)
  { id: "S_M_4_1", dikeId: "DIPR_005_MI_RG", pk: "8+900.00", distancia: 0, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 3.67, item402B: 5.83, item402E: 8.84, item404A: 7.76, item404D: 8.84, item413A: 2.48, item412A: 0.82, item406A: 1.2, item501A_Carguio: 1 },
  { id: "S_M_4_2", dikeId: "DIPR_005_MI_RG", pk: "12+000.00", distancia: 3100, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 4.2, item402B: 6.1, item402E: 9.2, item404A: 8.1, item404D: 9.2, item413A: 2.8, item412A: 0.82, item406A: 1.5, item501A_Carguio: 1 },
  { id: "S_M_4_3", dikeId: "DIPR_005_MI_RG", pk: "16+000.00", distancia: 4000, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 3.9, item402B: 5.5, item402E: 8.5, item404A: 7.5, item404D: 8.5, item413A: 2.5, item412A: 0.82, item406A: 1.3, item501A_Carguio: 1 },
  { id: "S_M_4_4", dikeId: "DIPR_005_MI_RG", pk: "20+000.00", distancia: 4000, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 4.5, item402B: 6.5, item402E: 9.5, item404A: 8.5, item404D: 9.5, item413A: 3.0, item412A: 0.82, item406A: 1.6, item501A_Carguio: 1 },
  { id: "S_M_4_5", dikeId: "DIPR_005_MI_RG", pk: "24+116.00", distancia: 4116, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 3.5, item402B: 5.0, item402E: 8.0, item404A: 7.0, item404D: 8.0, item413A: 2.2, item412A: 0.82, item406A: 1.1, item501A_Carguio: 1 },

  // DIPR_016_MI_S (SECHIN)
  { id: "S_M_5_1", dikeId: "DIPR_016_MI_S", pk: "4+055.68", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 4.8, item402B: 2.2, item402E: 8.2, item404A: 7.1, item404D: 8.2, item413A: 2.2, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_5_2", dikeId: "DIPR_016_MI_S", pk: "7+000.00", distancia: 2944.32, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", intervencion: "MUESTRA", item403A: 5.1, item402B: 2.5, item402E: 8.5, item404A: 7.4, item404D: 8.5, item413A: 2.5, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_5_3", dikeId: "DIPR_016_MI_S", pk: "10+000.00", distancia: 3000, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 4.5, item402B: 2.1, item402E: 7.8, item404A: 6.8, item404D: 7.8, item413A: 2.1, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
  { id: "S_M_5_4", dikeId: "DIPR_016_MI_S", pk: "14+754.00", distancia: 4754, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "MUESTRA", item403A: 5.2, item402B: 2.8, item402E: 8.8, item404A: 7.8, item404D: 8.8, item413A: 2.8, item412A: 0.65, item406A: 1.8, item501A_Carguio: 1 },
];

export const SAMPLE_PROGRESS_ENTRIES: ProgressEntry[] = [
  // DIPR_001_MI
  { id: "S_P_1_1", date: "2024-08-01", dikeId: "DIPR_001_MI", progInicio: "0+560", progFin: "1+000", longitud: 440, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance inicial", status: "Completed", priority: "high" },
  { id: "S_P_1_2", date: "2024-08-05", dikeId: "DIPR_001_MI", progInicio: "1+000", progFin: "1+500", longitud: 500, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance continuo", status: "In Progress", priority: "medium" },
  
  // DIPR_002_MD
  { id: "S_P_2_1", date: "2024-08-02", dikeId: "DIPR_002_MD", progInicio: "0+000", progFin: "1+000", longitud: 1000, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance inicial", status: "Completed", priority: "high" },
  { id: "S_P_2_2", date: "2024-08-06", dikeId: "DIPR_002_MD", progInicio: "1+000", progFin: "2+500", longitud: 1500, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance continuo", status: "Not Started", priority: "low" },

  // DIPR_005_MI_RG
  { id: "S_P_4_1", date: "2024-08-03", dikeId: "DIPR_005_MI_RG", progInicio: "8+900", progFin: "12+000", longitud: 3100, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance inicial sector Rio Grande", status: "Completed", priority: "high" },
  { id: "S_P_4_2", date: "2024-08-07", dikeId: "DIPR_005_MI_RG", progInicio: "12+000", progFin: "16+000", longitud: 4000, tipoTerreno: "B2", tipoEnrocado: "TIPO 2", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance continuo sector Rio Grande", status: "In Progress", priority: "medium" },

  // DIPR_016_MI_S
  { id: "S_P_5_1", date: "2024-08-04", dikeId: "DIPR_016_MI_S", progInicio: "4+055", progFin: "7+000", longitud: 2945, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance inicial sector Sechin", status: "Completed", priority: "high" },
  { id: "S_P_5_2", date: "2024-08-08", dikeId: "DIPR_016_MI_S", progInicio: "7+000", progFin: "10+000", longitud: 3000, tipoTerreno: "B1", tipoEnrocado: "TIPO 1", partida: "404.A ENROCADO Y ACOMODO", intervencion: "AVANCE MUESTRA", capa: "Capa Única", observaciones: "Avance continuo sector Sechin", status: "Not Started", priority: "low" },
];
