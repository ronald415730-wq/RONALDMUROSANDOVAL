
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
   * Specific importer for measurements that tries to map columns to the MeasurementEntry interface.
   * Now supports multiple sheets if it's an Excel file.
   */
  static async importMeasurements(file: File, dikes: DikeConfig[], customColumns: string[]): Promise<MeasurementEntry[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
          const entries: MeasurementEntry[] = [];

          // Process all sheets
          workbook.SheetNames.forEach(sheetName => {
            // Skip common non-dike sheets
            if (['INICIO', 'SECTORES', 'DIQUES', 'RESUMEN', 'DASHBOARD', 'CONFIG'].includes(sheetName.toUpperCase())) return;

            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
            
            // Try to identify if this sheet is for a specific dike by its name
            const sheetDike = dikes.find(d => d.name.toUpperCase() === sheetName.toUpperCase() || d.id.toUpperCase() === sheetName.toUpperCase());

            rows.forEach((row, idx) => {
              // Try to find a dike ID in the row, or use the sheet's dike if identified
              const dikeName = row.Dique || row.DIQUE || row.dike || row.Dike || row.DIQUES || row.Diques;
              const dike = dikes.find(d => d.name === dikeName || d.id === dikeName) || sheetDike;
              
              if (!dike) return;

              const entry: any = {
                id: `IMPORT_GLOBAL_${Date.now()}_${sheetName}_${idx}`,
                dikeId: dike.id,
                pk: String(row.PK || row.Progresiva || row.PROGRESIVA || row.pk || row.PROG || row.Prog || "").trim(),
                distancia: parseFloat(row.Distancia || row.DISTANCIA || row.distancia || row.dist || row.DIST || "0"),
                tipoTerreno: String(row.Terreno || row.TERRENO || row.tipoTerreno || row.TIPO_TERRENO || "B1").trim(),
                tipoEnrocado: String(row.Enrocado || row.ENROCADO || row.tipoEnrocado || row.TIPO_ENROCADO || "TIPO 2").trim(),
                intervencion: String(row.Intervencion || row.INTERVENCION || row.intervencion || "").trim(),
                item501A_Carguio: 1
              };

              // Map standard items
              const standardItems = [
                'item401A', 'item402B', 'item402B_MM', 'item402C', 'item402D', 'item402E', 'item402E_MM',
                'item403A', 'item403A_MM', 'item403B', 'item404A', 'item404A_MM', 'item404B', 'item404D',
                'item404D_MM', 'item404E', 'item404G', 'item404H', 'item405A', 'item406A', 'item407A',
                'item408A', 'item409A', 'item409B', 'item410A', 'item410B', 'item412A', 'item413A',
                'item413A_MM', 'item414A', 'item415', 'item416A'
              ];

              standardItems.forEach(item => {
                // Try multiple variations for each item code
                const variations = [
                  item, 
                  item.replace('item', ''), 
                  item.toUpperCase(),
                  item.replace('item', '').toUpperCase(),
                  item.replace('item', 'ITEM')
                ];
                
                let val: any = undefined;
                for (const v of variations) {
                  if (row[v] !== undefined) {
                    val = row[v];
                    break;
                  }
                }
                
                if (val !== undefined) entry[item] = parseFloat(String(val).replace(/,/g, '')) || 0;
              });

              // Map custom columns
              customColumns.forEach(col => {
                const variations = [col, col.toUpperCase(), col.toLowerCase(), col.trim()];
                let val: any = undefined;
                for (const v of variations) {
                  if (row[v] !== undefined) {
                    val = row[v];
                    break;
                  }
                }
                if (val !== undefined) entry[col] = val;
              });

              if (entry.pk && entry.pk !== "PK" && entry.pk !== "PROGRESIVA") entries.push(entry);
            });
          });

          resolve(entries);
        } catch (err) {
          console.error("Error in importMeasurements:", err);
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Exports a master workbook with sheets for each sector and dike.
   */
  static exportMasterWorkbook(data: ProjectBackup): void {
    const wb = XLSX.utils.book_new();

    // 1. Dashboard / Instructions
    const wsDashboard = XLSX.utils.aoa_to_sheet([
      ["LIBRO MAESTRO DE CONTROL DE OBRA - CASMA"],
      [""],
      ["INSTRUCCIONES:"],
      ["1. Use las hojas de cada dique para ingresar metrados."],
      ["2. No cambie los nombres de las hojas."],
      ["3. Use el botón de 'Importar a App' (Macro) para sincronizar."],
      [""],
      ["ENLACES DIRECTOS:"],
      ["Aplicación Web:", window.location.origin],
      ["Panel de Metrados:", `${window.location.origin}/metrados`],
      [""],
      ["RESUMEN DE PROYECTO:"],
      ["Sectores:", data.sectors.length],
      ["Diques:", data.dikes.length],
      ["Metrados Totales:", data.measurements.length]
    ]);
    XLSX.utils.book_append_sheet(wb, wsDashboard, "INICIO");

    // 2. Sectors Sheet
    const wsSectors = XLSX.utils.json_to_sheet(data.sectors.map(s => ({
      ID: s.id,
      Nombre: s.name
    })));
    XLSX.utils.book_append_sheet(wb, wsSectors, "SECTORES");

    // 3. Dikes Sheet
    const wsDikes = XLSX.utils.json_to_sheet(data.dikes.map(d => ({
      ID: d.id,
      Sector: d.sectorId,
      Nombre: d.name,
      Inicio: d.progInicioDique,
      Fin: d.progFinDique,
      Longitud: d.totalML
    })));
    XLSX.utils.book_append_sheet(wb, wsDikes, "DIQUES");

    // 4. Create a sheet for each Dike
    data.dikes.forEach(dike => {
      const dikeMeasurements = data.measurements.filter(m => m.dikeId === dike.id);
      
      // If no measurements, provide a template row
      const rows = dikeMeasurements.length > 0 ? dikeMeasurements.map(m => {
        const { id, dikeId, ...rest } = m;
        return { ...rest };
      }) : [
        { pk: "0+000", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "PROTECCION", item403A: 0, item402B: 0 }
      ];

      const wsDike = XLSX.utils.json_to_sheet(rows);
      
      // Limit sheet name length to 31 chars (Excel limit)
      const sheetName = `MET_${dike.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}`;
      XLSX.utils.book_append_sheet(wb, wsDike, sheetName);
    });

    XLSX.writeFile(wb, `Libro_Maestro_Casma_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  static getVBAMacroCode(appUrl: string): string {
    return `
' VBA Macro para importar datos de Excel a la Aplicación Casma
' Pegue este código en un Módulo de su Libro de Excel (Alt + F11 -> Insertar -> Módulo)

Sub ImportarMetrados()
    Dim http As Object
    Dim url As String
    Dim json As String
    Dim sheet As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim dataArray As String
    
    url = "${appUrl}/api/excel/import"
    Set http = CreateObject("MSXML2.XMLHTTP")
    
    Set sheet = ActiveSheet
    If Not sheet.Name Like "MET_*" Then
        MsgBox "Por favor, ejecute esta macro desde una hoja de Metrados (MET_...)", vbExclamation
        Exit Sub
    End If
    
    lastRow = sheet.Cells(sheet.Rows.Count, "A").End(xlUp).Row
    If lastRow < 2 Then
        MsgBox "No hay datos para importar.", vbInformation
        Exit Sub
    End If
    
    ' Construir JSON básico (Simplificado para el ejemplo)
    ' En una versión real, se mapearían todas las columnas dinámicamente
    dataArray = "["
    For i = 2 To lastRow
        dataArray = dataArray & "{"
        dataArray = dataArray & """pk"":""" & sheet.Cells(i, 1).Value & ""","
        dataArray = dataArray & """distancia"":" & Replace(sheet.Cells(i, 2).Value, ",", ".") & ","
        dataArray = dataArray & """tipoTerreno"":""" & sheet.Cells(i, 3).Value & ""","
        dataArray = dataArray & """tipoEnrocado"":""" & sheet.Cells(i, 4).Value & ""","
        dataArray = dataArray & """intervencion"":""" & sheet.Cells(i, 5).Value & """"
        dataArray = dataArray & "}"
        If i < lastRow Then dataArray = dataArray & ","
    Next i
    dataArray = dataArray & "]"
    
    json = "{""type"":""MEASUREMENTS"",""data"":" & dataArray & "}"
    
    With http
        .Open "POST", url, False
        .setRequestHeader "Content-Type", "application/json"
        .Send json
        
        If .Status = 200 Then
            MsgBox "Importación exitosa: " & .responseText, vbInformation
        Else
            MsgBox "Error al importar: " & .Status & " - " & .responseText, vbCritical
        End If
    End With
End Sub
    `;
  }
}
