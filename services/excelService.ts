
import * as XLSX from 'xlsx';
import { Sector, DikeConfig, MeasurementEntry, ProgressEntry, BudgetSection, ProtocolEntry, ProjectBackup, BudgetItem, BudgetGroup } from '../types';

export class ExcelService {
  /**
   * Exports the entire project state to a multi-sheet Excel file.
   */
  static exportFullProject(data: ProjectBackup): void {
    const wb = XLSX.utils.book_new();

    // 1. Sectors
    if (data.sectors) {
      const wsSectors = XLSX.utils.json_to_sheet(data.sectors);
      XLSX.utils.book_append_sheet(wb, wsSectors, "Sectores");
    }

    // 2. Dikes
    const wsDikes = XLSX.utils.json_to_sheet(data.dikes);
    XLSX.utils.book_append_sheet(wb, wsDikes, "Diques");

    // 3. Measurements
    const wsMeasurements = XLSX.utils.json_to_sheet(data.measurements);
    XLSX.utils.book_append_sheet(wb, wsMeasurements, "Metrados");

    // 4. Progress
    const wsProgress = XLSX.utils.json_to_sheet(data.progressEntries);
    XLSX.utils.book_append_sheet(wb, wsProgress, "Avance");

    // 5. Protocols
    if (data.protocols) {
      // Flatten protocols for easier Excel handling
      const flattenedProtocols = data.protocols.map(p => {
        const { protocols, ...rest } = p;
        return { ...rest, ...protocols };
      });
      const wsProtocols = XLSX.utils.json_to_sheet(flattenedProtocols);
      XLSX.utils.book_append_sheet(wb, wsProtocols, "Protocolos");
    }

    // 6. Budget (Flattened)
    if (data.budgetBySector) {
      const flattenedBudget: any[] = [];
      Object.entries(data.budgetBySector).forEach(([sectorId, sections]) => {
        sections.forEach(section => {
          section.groups.forEach(group => {
            group.items.forEach(item => {
              flattenedBudget.push({
                sectorId,
                sectionId: section.id,
                sectionName: section.name,
                groupId: group.id,
                groupCode: group.code,
                groupName: group.name,
                itemId: item.id,
                itemCode: item.code,
                itemDescription: item.description,
                itemUnit: item.unit,
                itemMetrado: item.metrado,
                itemPrice: item.price,
                itemSelected: item.selected !== false
              });
            });
          });
        });
      });
      const wsBudget = XLSX.utils.json_to_sheet(flattenedBudget);
      XLSX.utils.book_append_sheet(wb, wsBudget, "Presupuesto");
    }

    XLSX.writeFile(wb, `Casma_Backup_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  /**
   * Parses an Excel file and returns a ProjectBackup object.
   */
  static async importFullProject(file: File): Promise<Partial<ProjectBackup>> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const result: Partial<ProjectBackup> = {};

          // 1. Sectors
          if (workbook.SheetNames.includes("Sectores")) {
            result.sectors = XLSX.utils.sheet_to_json(workbook.Sheets["Sectores"]) as Sector[];
          }

          // 2. Dikes
          if (workbook.SheetNames.includes("Diques")) {
            result.dikes = XLSX.utils.sheet_to_json(workbook.Sheets["Diques"]) as DikeConfig[];
          }

          // 3. Measurements
          if (workbook.SheetNames.includes("Metrados")) {
            result.measurements = XLSX.utils.sheet_to_json(workbook.Sheets["Metrados"]) as MeasurementEntry[];
          }

          // 4. Progress
          if (workbook.SheetNames.includes("Avance")) {
            result.progressEntries = XLSX.utils.sheet_to_json(workbook.Sheets["Avance"]) as ProgressEntry[];
          }

          // 5. Protocols
          if (workbook.SheetNames.includes("Protocolos")) {
            const rawProtocols = XLSX.utils.sheet_to_json(workbook.Sheets["Protocolos"]) as any[];
            result.protocols = rawProtocols.map(p => {
              const { id, dikeId, measurementId, estado, pkRio, pkDique, distancia, tipoEnrocado, tipoTerreno, intervencion, ...protocolValues } = p;
              return {
                id: id || `P_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                dikeId, 
                measurementId, 
                estado, 
                pkRio, 
                pkDique, 
                distancia: Number(distancia) || 0, 
                tipoEnrocado, 
                tipoTerreno, 
                intervencion,
                protocols: protocolValues
              } as ProtocolEntry;
            });
          }

          // 6. Budget
          if (workbook.SheetNames.includes("Presupuesto")) {
            const flatBudget = XLSX.utils.sheet_to_json(workbook.Sheets["Presupuesto"]) as any[];
            const budgetBySector: Record<string, BudgetSection[]> = {};

            flatBudget.forEach(row => {
              const { sectorId, sectionId, sectionName, groupId, groupCode, groupName, itemId, itemCode, itemDescription, itemUnit, itemMetrado, itemPrice, itemSelected } = row;
              
              if (!sectorId) return;
              if (!budgetBySector[sectorId]) budgetBySector[sectorId] = [];
              
              let section = budgetBySector[sectorId].find(s => s.id === sectionId);
              if (!section) {
                section = { id: sectionId || `S_${Date.now()}`, name: sectionName || "Sin Nombre", groups: [] };
                budgetBySector[sectorId].push(section);
              }

              let group = section.groups.find(g => g.id === groupId);
              if (!group) {
                group = { id: groupId || `G_${Date.now()}`, code: groupCode || "", name: groupName || "Sin Nombre", items: [] };
                section.groups.push(group);
              }

              group.items.push({
                id: itemId || `I_${Date.now()}`,
                code: itemCode || "",
                description: itemDescription || "",
                unit: itemUnit || "",
                metrado: Number(itemMetrado) || 0,
                price: Number(itemPrice) || 0,
                selected: itemSelected !== false
              });
            });
            result.budgetBySector = budgetBySector;
          }

          result.timestamp = Date.now();
          resolve(result);
        } catch (err) {
          console.error("Error parsing Excel:", err);
          reject(new Error("No se pudo procesar el archivo Excel. Verifique el formato."));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Exports a specific table to Excel, CSV or TXT.
   */
  static exportTable(data: any[], fileName: string, sheetName: string, format: 'xlsx' | 'csv' | 'txt' = 'xlsx'): void {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    let ext = 'xlsx';
    if (format === 'csv') ext = 'csv';
    if (format === 'txt') ext = 'txt';
    
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.${ext}`);
  }

  /**
   * Imports a specific table from Excel, CSV or TXT.
   */
  static async importTable<T>(file: File): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // For text files, we use codepage if needed, but SheetJS usually detects UTF-8
          const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const json = XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as T[];
          resolve(json);
        } catch (err) {
          console.error("Error in importTable:", err);
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Imports measurements for multiple dikes from a single file.
   */
  static async importMeasurements(file: File, dikes: DikeConfig[], customColumns: string[] = []): Promise<MeasurementEntry[]> {
    const rows = await this.importTable<any>(file);
    if (rows.length === 0) return [];

    // Filter out header-like rows
    const dataRows = rows.filter(row => {
      const values = Object.values(row);
      if (values.length === 0) return false;
      const firstVal = String(values[0] || "").trim();
      // Skip if it looks like a unit or is empty
      if (!firstVal || firstVal.startsWith('(')) return false;
      // Skip if it's just a repeat of headers
      if (firstVal.toUpperCase() === "PK" || firstVal.toUpperCase() === "PROGRESIVA") return false;
      return true;
    });

    return dataRows.map((row, idx) => {
      // Find Dique/Dike column
      const dikeKey = Object.keys(row).find(k => k.toUpperCase() === "DIQUE" || k.toUpperCase() === "DIKEID" || k.toUpperCase() === "NOMBRE DIQUE");
      let dikeId = "";
      if (dikeKey && row[dikeKey]) {
        const dikeVal = String(row[dikeKey]).trim().toUpperCase();
        const foundDike = dikes.find(d => d.id.toUpperCase() === dikeVal || d.name.toUpperCase() === dikeVal);
        if (foundDike) dikeId = foundDike.id;
      }

      const entry: any = {
        id: `IMPORT_GLOBAL_${Date.now()}_${idx}`,
        dikeId: dikeId || (dikes.length > 0 ? dikes[0].id : ""),
        pk: "", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "IMPORTADO",
        item501A_Carguio: 1
      };

      // Map columns
      Object.keys(row).forEach(key => {
        const uk = key.trim().toUpperCase();
        // Basic fields
        if (uk === "PK" || uk === "PROGRESIVA") entry.pk = String(row[key]);
        else if (uk === "DISTANCIA" || uk === "PARCIAL") entry.distancia = parseFloat(String(row[key]).replace(/,/g, '')) || 0;
        else if (uk === "TERRENO" || uk === "TIPO TERRENO") entry.tipoTerreno = String(row[key]);
        else if (uk === "ENROCADO" || uk === "TIPO ENROCADO") entry.tipoEnrocado = String(row[key]);
        else if (uk === "INTERVENCION") entry.intervencion = String(row[key]);
        
        // Item fields (e.g. 403.A)
        if (/^\d/.test(uk) || uk.startsWith("ITEM")) {
            const cleanKey = uk.replace(/^ITEM/, '');
            entry[`item${cleanKey.replace(/\./g, '')}`] = parseFloat(String(row[key]).replace(/,/g, '')) || 0;
        }

        // Custom Columns
        const customCol = customColumns.find(c => c.toUpperCase() === uk);
        if (customCol) {
            entry[customCol] = row[key];
        }
      });

      return entry as MeasurementEntry;
    });
  }
}
