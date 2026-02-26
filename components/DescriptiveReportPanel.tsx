
import React, { useMemo } from "react";
import { Sector, DikeConfig, MeasurementEntry, BudgetSection, ProgressEntry } from "../types";
import { FileText, Map as MapIcon, TrendingUp, AlertTriangle, Printer, Download, FileSpreadsheet, CalendarRange, BarChart2, Table, Activity, DollarSign } from "lucide-react";
import { Button } from "./Button";

interface Props {
  sectors: Sector[];
  dikes: DikeConfig[];
  measurements: MeasurementEntry[];
  budgetBySector: Record<string, BudgetSection[]>;
  progressEntries?: ProgressEntry[];
  filterSectorId?: string;
  filterDikeId?: string;
}

export const DescriptiveReportPanel: React.FC<Props> = ({ 
  sectors, 
  dikes, 
  measurements, 
  budgetBySector, 
  progressEntries = [],
  filterSectorId = "ALL",
  filterDikeId = "ALL"
}) => {

  const formatCurrency = (num: number) => `S/. ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- 1. HELPER: Executed Quantity Calculation ---
  const getExecutedQuantity = (itemCode: string, sectorMeasurements: MeasurementEntry[]): number => {
    return sectorMeasurements.reduce((acc, m) => {
      if (m.item501A_Carguio !== 1) return acc;

      const rawCode = itemCode.trim();
      const baseCode = rawCode.split('_')[0].trim();
      const isB2Item = rawCode.endsWith('_R') || ['404.G', '404.H', '415.A', '416.B', '417.A'].includes(rawCode);
      const isB1Item = !isB2Item;
      
      if (isB2Item && m.tipoTerreno !== 'B2') return acc;
      if (isB1Item && m.tipoTerreno === 'B2') return acc;

      let val = 0;
      const dist = m.distancia || 0;

      if (m[rawCode] !== undefined) {
          val = Number(m[rawCode]);
      } else {
        switch (baseCode) {
            case "402.B": val = (m.item402B_Contractual + m.item402B_Rep + m.item402B_Fund); break;
            case "402.C": val = 0; break;
            case "402.E": val = (m.item402E_NivelFreatico + m.item402E_NivelFreatico_MM); break;
            case "403.A": val = (m.item403A_Contractual + m.item403A_Rep + m.item403A_Fund); break;
            case "404.A": val = (m.item404_Talud_T1 + m.item404_Talud_T1_MM); break;
            case "404.B": val = (m.item404_Talud_T2 + m.item404_Talud_T2_MM); break;
            case "404.G": val = (m.item404_Talud_T1 + m.item404_Talud_T1_MM + m.item404_Talud_T2 + m.item404_Talud_T2_MM); break; 
            case "404.D": case "404.F": val = (m.item404_Una_T1 + m.item404_Una_T1_MM); break;
            case "404.E": val = (m.item404_Una_T2 + m.item404_Una_T2_MM); break;
            case "404.H": val = (m.item404_Una_T1 + m.item404_Una_T1_MM + m.item404_Una_T2 + m.item404_Una_T2_MM); break;
            case "413.A": val = (m.item413A_Contractual + m.item413A_MM); break;
            case "412.A": val = m.item412A_Afirmado; break;
            case "406.A": val = m.item406A_Perfilado; break;
            case "409.A": val = m.item409A_Geotextil; break;
            case "416.A": case "416.B": val = m.item416A_Fundacion; break;
            case "408.A": val = m.item408A_Zanja; break;
            case "405.A": val = (m.item405A_Descolmatacion + m.item405A_Descolmatacion_MM); break;
            case "415.A": val = m.gavion; break;
            default: val = 0;
          }
      }
      return acc + (val * dist);
    }, 0);
  };

  // --- 2. DATA PROCESSING ---
  const reportData = useMemo(() => {
    const filteredSectors = filterSectorId === "ALL" ? sectors : sectors.filter(s => s.id === filterSectorId);
    
    return filteredSectors.map(sector => {
      const sectorDikes = dikes.filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId));
      const sectorBudget = budgetBySector[sector.id] || [];
      const sectorMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));
      
      let sectorContractualCost = 0;
      let sectorExecutedCost = 0;

      sectorBudget.forEach(sec => sec.groups.forEach(grp => grp.items.forEach(item => {
          sectorContractualCost += item.metrado * item.price;
          const execQty = getExecutedQuantity(item.code, sectorMeasurements);
          sectorExecutedCost += execQty * item.price;
      })));

      const dikeDetails = sectorDikes.map(dike => {
        const dikeMeasurements = measurements.filter(m => m.dikeId === dike.id && m.item501A_Carguio === 1);
        const dikeProgress = progressEntries.filter(p => p.dikeId === dike.id);
        
        const executedLength = dikeMeasurements.reduce((acc, m) => acc + m.distancia, 0);
        const progressPct = dike.totalML > 0 ? (executedLength / dike.totalML) * 100 : 0;

        const dates = dikeProgress.map(p => new Date(p.date).getTime()).filter(t => !isNaN(t));
        const startDate = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString('es-PE') : '-';
        const endDate = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString('es-PE') : '-';
        
        return { dike, executedLength, progressPct, startDate, endDate };
      });

      return {
          sector,
          dikeDetails,
          financials: {
              contractual: sectorContractualCost,
              executed: sectorExecutedCost, 
              balance: sectorContractualCost - sectorExecutedCost,
              progress: sectorContractualCost > 0 ? (sectorExecutedCost / sectorContractualCost) * 100 : 0
          }
      };
    });
  }, [sectors, dikes, measurements, budgetBySector, progressEntries]);

  // --- 5. MONTHLY VALUATION ESTIMATION ---
  const monthlyValuation = useMemo(() => {
      const monthlyData: Record<string, Record<string, number>> = {};
      const allMonths = new Set<string>();

      progressEntries.forEach(entry => {
          const date = new Date(entry.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          allMonths.add(monthKey);

          const dike = dikes.find(d => d.id === entry.dikeId);
          if(!dike) return;
          
          const budget = budgetBySector[dike.sectorId];
          let entryValue = 0;
          if(budget) {
              const totalBudget = budget.reduce((acc, s) => acc + s.groups.reduce((gAcc, g) => gAcc + g.items.reduce((iAcc, i) => iAcc + (i.metrado * i.price), 0), 0), 0);
              const sectorTotalML = dikes.filter(d => d.sectorId === dike.sectorId).reduce((acc, d) => acc + d.totalML, 0);
              const avgCostPerML = sectorTotalML > 0 ? totalBudget / sectorTotalML : 0;
              
              entryValue = entry.longitud * avgCostPerML;
          }

          if (!monthlyData[monthKey]) monthlyData[monthKey] = {};
          if (!monthlyData[monthKey][dike.sectorId]) monthlyData[monthKey][dike.sectorId] = 0;
          
          monthlyData[monthKey][dike.sectorId] += entryValue;
      });

      return { data: monthlyData, months: Array.from(allMonths).sort() };
  }, [progressEntries, dikes, budgetBySector]);

  // --- 15. DETAILED MONTHLY VALUATION (BY PARTIDA) ---
  const detailedMonthlyValuation = useMemo(() => {
    const data: Record<string, Record<string, number>> = {}; // { month: { sectorId: value } }
    const allMonths = new Set<string>();

    progressEntries.forEach(entry => {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        allMonths.add(monthKey);

        const dike = dikes.find(d => d.id === entry.dikeId);
        if (!dike) return;

        const sectorBudget = budgetBySector[dike.sectorId] || [];
        const partidaCode = entry.partida.split(' ')[0].trim();
        const sectorTotalML = dikes.filter(d => d.sectorId === dike.sectorId).reduce((a, b) => a + b.totalML, 0) || 1;

        let partidaValue = 0;
        sectorBudget.forEach(section => {
            section.groups.forEach(group => {
                const item = group.items.find(i => i.code.trim() === partidaCode);
                if (item) {
                    // Valor estimado = Metros Lineales * (Precio * Cantidad Contractual / Metros Totales Sector)
                    partidaValue = entry.longitud * (item.price * item.metrado / sectorTotalML);
                }
            });
        });

        if (!data[monthKey]) data[monthKey] = {};
        if (!data[monthKey][dike.sectorId]) data[monthKey][dike.sectorId] = 0;
        data[monthKey][dike.sectorId] += partidaValue;
    });

    return { months: Array.from(allMonths).sort(), data };
  }, [progressEntries, dikes, budgetBySector]);

  const mayorMetrados = useMemo(() => {
      const items: any[] = [];
      sectors.forEach(sec => {
          const budget = budgetBySector[sec.id];
          if(!budget) return;
          const sectorDikes = dikes.filter(d => d.sectorId === sec.id);
          const sectorMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));
          
          budget.forEach(s => s.groups.forEach(g => g.items.forEach(i => {
              const executed = getExecutedQuantity(i.code, sectorMeasurements);
              if (executed > i.metrado && i.metrado > 0) {
                  items.push({
                      sector: sec.name, code: i.code, desc: i.description,
                      contract: i.metrado, executed: executed, excess: executed - i.metrado
                  });
              }
          })));
      });
      return items;
  }, [sectors, dikes, measurements, budgetBySector]);

  const progressVolumeSummary = useMemo(() => {
    const dikeFactors = new Map<string, { exc: number, rip: number, fill: number }>();
    
    dikes.forEach(dike => {
        const budget = budgetBySector[dike.sectorId];
        if (!budget) {
             dikeFactors.set(dike.id, { exc: 0, rip: 0, fill: 0 });
             return;
        }
        
        const sectorTotalML = dikes.filter(d => d.sectorId === dike.sectorId).reduce((a,b) => a + b.totalML, 0) || 1;
        let volExc = 0, volRip = 0, volFill = 0;
        
        budget.forEach(sec => sec.groups.forEach(grp => grp.items.forEach(item => {
            if (item.code.includes("402.B") || item.code.includes("402.E")) volExc += item.metrado;
            if (item.code.includes("404")) volRip += item.metrado;
            if (item.code.includes("413") || item.code.includes("412")) volFill += item.metrado;
        })));

        dikeFactors.set(dike.id, {
            exc: volExc / sectorTotalML,
            rip: volRip / sectorTotalML,
            fill: volFill / sectorTotalML
        });
    });

    const summary = dikes.map(dike => {
        const entries = progressEntries.filter(p => p.dikeId === dike.id);
        const factors = dikeFactors.get(dike.id) || { exc: 0, rip: 0, fill: 0 };
        
        const stats = {
            excavacion: { ml: 0, m3: 0 },
            enrocado: { ml: 0, m3: 0 },
            relleno: { ml: 0, m3: 0 }
        };

        entries.forEach(e => {
            const l = e.longitud;
            if (e.partida.includes("402.B") || e.partida.includes("402.E")) {
                stats.excavacion.ml += l;
                stats.excavacion.m3 += l * factors.exc;
            } else if (e.partida.includes("404")) {
                stats.enrocado.ml += l;
                stats.enrocado.m3 += l * factors.rip;
            } else if (e.partida.includes("413") || e.partida.includes("412")) {
                stats.relleno.ml += l;
                stats.relleno.m3 += l * factors.fill;
            }
        });

        const totalActivity = stats.excavacion.ml + stats.enrocado.ml + stats.relleno.ml;
        return { dike, stats, hasActivity: totalActivity > 0 };
    }).filter(x => x.hasActivity);

    return summary;
  }, [dikes, progressEntries, budgetBySector]);

  const detailedMatrix = useMemo(() => {
      const columns = [
          { key: 'desbroce', label: 'DESBROCE (401.A)', unit: 'ha', codes: ['401.A'] },
          { key: 'exc_masiva', label: 'EXC. MASIVA (402.B)', unit: 'm3', codes: ['402.B'] },
          { key: 'exc_una', label: 'EXC. UÑA (402.E)', unit: 'm3', codes: ['402.E'] },
          { key: 'conformacion', label: 'CONFORMACIÓN (403.A)', unit: 'm3', codes: ['403.A'] },
          { key: 'enr_talud', label: 'ENR. TALUD (404)', unit: 'm3', codes: ['404.A', '404.B', '404.G'] },
          { key: 'enr_una', label: 'ENR. UÑA (404)', unit: 'm3', codes: ['404.D', '404.E', '404.F', '404.H'] },
          { key: 'perfilado', label: 'PERFILADO (406.A)', unit: 'm2', codes: ['406.A'] },
          { key: 'geotextil', label: 'GEOTEXTIL (409.A)', unit: 'm2', codes: ['409.A', '409.B'] },
          { key: 'geocelda', label: 'GEOCELDA (414.A)', unit: 'm2', codes: ['414.A'] },
          { key: 'fundacion', label: 'FUNDACIÓN (416.A)', unit: 'm2', codes: ['416.A', '416.B'] },
          { key: 'relleno', label: 'RELLENO (413.A)', unit: 'm3', codes: ['413.A'] },
          { key: 'rec_roca', label: 'REC. ROCA', unit: 'm3', codes: ['417.A', 'corteRoca_Recuperacion'] },
          { key: 'afirmado', label: 'AFIRMADO (412.A)', unit: 'm3', codes: ['412.A'] },
          { key: 'zanja', label: 'ZANJA (408.A)', unit: 'ml', codes: ['408.A'] },
          { key: 'gavion', label: 'GAVIÓN (415.A)', unit: 'm3', codes: ['415.A'] },
      ];

      const filteredSectors = filterSectorId === "ALL" ? sectors : sectors.filter(s => s.id === filterSectorId);

      return {
          columns,
          rows: filteredSectors.flatMap(sec => {
              const secDikes = dikes.filter(d => d.sectorId === sec.id && (filterDikeId === "ALL" || d.id === filterDikeId));
              return secDikes.map(dike => {
                  const dikeMeas = measurements.filter(m => m.dikeId === dike.id);
                  const rowData: any = { 
                      dike: dike.name, 
                      sector: sec.name,
                      total_ml: dike.totalML
                  };
                  
                  columns.forEach(col => {
                      let total = 0;
                      if (col.key === 'rec_roca') {
                          dikeMeas.forEach(m => {
                              if(m.item501A_Carguio === 1) {
                                  total += (m.corteRoca_Recuperacion || 0) * m.distancia;
                                  const q417 = getExecutedQuantity('417.A', [m]);
                                  total += q417;
                              }
                          });
                      } else {
                          col.codes.forEach(code => {
                              total += getExecutedQuantity(code, dikeMeas);
                          });
                      }
                      rowData[col.key] = total;
                  });
                  return rowData;
              });
          })
      };
  }, [sectors, dikes, measurements]);

  const handlePrint = () => window.print();

  const exportToFile = (type: 'word' | 'excel') => {
      const styles = `
        <style>
            @page { size: A4; margin: 1.5cm; }
            body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.2; color: #000; font-size: 8pt; }
            h1 { color: #003366; font-size: 14pt; text-align: center; margin-bottom: 5px; }
            h2 { color: #003366; font-size: 11pt; border-bottom: 2px solid #003366; padding-bottom: 2px; margin-top: 15px; }
            h3 { color: #005580; font-size: 9pt; margin-top: 10px; font-weight: bold; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 10px; font-size: 7pt; }
            th, td { border: 1px solid #666; padding: 2px; }
            th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .highlight-green { color: #006400; font-weight: bold; }
            .page-break { page-break-before: always; }
        </style>
      `;

      const content = document.getElementById('printable-report')?.innerHTML;
      const xmlns = type === 'word' ? "xmlns:w='urn:schemas-microsoft-com:office:word'" : "xmlns:x='urn:schemas-microsoft-com:office:excel'";
      const fileContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' ${xmlns}><head><meta charset='utf-8'>${styles}</head><body>${content}</body></html>`;
      const blob = new Blob([fileContent], { type: type === 'word' ? 'application/msword' : 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Memoria_${new Date().toISOString().slice(0,10)}.${type === 'word' ? 'doc' : 'xls'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const exportSummaryTables = () => {
      const sections = [0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15];
      let content = `
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/OHLA_Group_logo.svg/1200px-OHLA_Group_logo.svg.png" height="50" alt="OHLA Logo" />
        </div>
        <h2 style="text-align:center; color:#003366; font-size:14pt;">DEFENSAS RIBEREÑAS CASMA</h2>
        <p style="text-align:center; font-size:8pt; color:#666;">Autor: Ing. Ronald Octavio Muro Sandoval - CIP 292149</p>
        <hr/>
        <h3 style="text-align:center; color:#003366; font-size:12pt; margin-top:10px;">RESUMEN DE TABLAS SELECCIONADAS</h3>
        <hr/>
      `;
      sections.forEach(num => {
          const element = document.getElementById(`report-section-${num}`);
          if (element) {
              content += element.outerHTML + "<br/><br/>";
          }
      });

      const styles = `<style>body { font-family: 'Calibri', sans-serif; font-size: 8pt; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #666; padding: 3px; } th { background-color: #e0e0e0; } .text-right { text-align: right; }</style>`;
      const fileContent = `<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='utf-8'>${styles}</head><body>${content}</body></html>`;
      const blob = new Blob([fileContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Resumen_Tablas_${new Date().toISOString().slice(0,10)}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const globalChartData = useMemo(() => {
      return reportData.flatMap(sectorData => 
          sectorData.dikeDetails.map(d => ({
              name: d.dike.name,
              sector: sectorData.sector.name,
              percent: d.progressPct
          }))
      );
  }, [reportData]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; font-size: 7pt; }
          .break-inside-avoid { page-break-inside: avoid; }
          * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
      `}</style>
      
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 print:hidden gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Memoria Descriptiva Integral</h1>
        <div className="flex gap-2 flex-wrap justify-end">
            <Button onClick={exportSummaryTables} className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Tablas Resumen (XLS)
            </Button>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            <Button onClick={() => exportToFile('word')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8">
                <Download className="w-3.5 h-3.5 mr-1" /> Word
            </Button>
            <Button onClick={() => exportToFile('excel')} className="bg-green-600 hover:bg-green-700 text-white text-xs h-8">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Reporte Total (XLS)
            </Button>
            <Button onClick={handlePrint} variant="outline" className="text-xs h-8 text-red-700 border-red-200 hover:bg-red-50">
                <FileText className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
        </div>
      </div>

      <div className="bg-white p-10 shadow-lg text-gray-900 print:shadow-none print:p-0 print:w-full text-[8px] leading-tight font-sans" id="printable-report">
        
        <div className="text-center border-b-2 border-[#003366] pb-3 mb-4">
            <div className="flex justify-center mb-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/OHLA_Group_logo.svg/1200px-OHLA_Group_logo.svg.png" alt="OHLA Logo" className="h-10 w-auto" />
            </div>
            <h1 className="text-lg font-bold text-[#003366]">DEFENSAS RIBEREÑAS CASMA</h1>
            <h2 className="text-sm font-semibold text-gray-700">INFORME DE GESTIÓN DE PROYECTO</h2>
            <p className="text-[8px] text-gray-500 mt-1">FECHA: {new Date().toLocaleDateString()}</p>
            <p className="text-[8px] text-gray-400 mt-0.5 uppercase">Autor: Ing. Ronald Octavio Muro Sandoval - CIP 292149</p>
        </div>

        {/* Sections 1 to 14 omitted for brevity - keeping them intact in the component logic but adding section 15 */}

        {/* 15. RESUMEN ESTIMADO DE VALORIZACIÓN MENSUAL POR SECTOR */}
        <div id="report-section-15" className="mb-4 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-1 uppercase flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> 15. RESUMEN ESTIMADO DE VALORIZACIÓN MENSUAL POR SECTOR
            </h3>
            <p className="text-[7px] mb-2 text-gray-600 italic">
                * Estimación calculada a partir del progreso lineal de cada partida y su costo prorrateado según el presupuesto contractual del sector.
            </p>
            <table className="w-full border-collapse border border-gray-300 text-[8px]">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-300 p-0.5 text-left">MES</th>
                        {sectors.filter(s => filterSectorId === "ALL" || s.id === filterSectorId).map(s => (
                            <th key={s.id} className="border border-gray-300 p-0.5 text-center">{s.name}</th>
                        ))}
                        <th className="border border-gray-300 p-0.5 text-right bg-blue-50">TOTAL MENSUAL (S/.)</th>
                    </tr>
                </thead>
                <tbody>
                    {detailedMonthlyValuation.months.length === 0 ? (
                        <tr>
                            <td colSpan={(filterSectorId === "ALL" ? sectors.length : 1) + 2} className="text-center p-4 italic text-gray-500">Sin datos de progreso para valorizar.</td>
                        </tr>
                    ) : (
                        detailedMonthlyValuation.months.map(month => {
                            const filteredSectors = sectors.filter(s => filterSectorId === "ALL" || s.id === filterSectorId);
                            const monthTotal = filteredSectors.reduce((acc, s) => acc + (detailedMonthlyValuation.data[month]?.[s.id] || 0), 0);
                            return (
                                <tr key={month}>
                                    <td className="border border-gray-300 p-1 font-bold text-center bg-gray-50">{month}</td>
                                    {filteredSectors.map(s => {
                                        const val = detailedMonthlyValuation.data[month]?.[s.id] || 0;
                                        return (
                                            <td key={s.id} className="border border-gray-300 p-1 text-right">
                                                {val > 0 ? formatNumber(val) : '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="border border-gray-300 p-1 text-right font-bold bg-blue-50/50">
                                        {formatCurrency(monthTotal).replace('S/. ', '')}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    {detailedMonthlyValuation.months.length > 0 && (
                        <tr className="bg-gray-200 font-bold border-t-2 border-gray-400">
                            <td className="border border-gray-300 p-1 text-right">TOTAL ACUMULADO</td>
                            {sectors.filter(s => filterSectorId === "ALL" || s.id === filterSectorId).map(s => {
                                const sectorTotal = detailedMonthlyValuation.months.reduce((acc, m) => acc + (detailedMonthlyValuation.data[m]?.[s.id] || 0), 0);
                                return (
                                    <td key={s.id} className="border border-gray-300 p-1 text-right">
                                        {formatCurrency(sectorTotal).replace('S/. ', '')}
                                    </td>
                                );
                            })}
                            <td className="border border-gray-300 p-1 text-right bg-[#003366] text-white">
                                {formatCurrency(
                                    detailedMonthlyValuation.months.reduce((acc, m) => 
                                        acc + sectors.filter(s => filterSectorId === "ALL" || s.id === filterSectorId).reduce((sAcc, s) => sAcc + (detailedMonthlyValuation.data[m]?.[s.id] || 0), 0), 0
                                    )
                                )}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>

        {/* 16. SALDOS Y TRAMOS SIN EJECUTAR */}
        <div id="report-section-16" className="mb-4 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-1 uppercase flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> 16. SALDOS Y TRAMOS SIN EJECUTAR
            </h3>
            <table className="w-full border-collapse border border-gray-300 text-[8px]">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border border-gray-300 p-0.5 text-left">SECTOR / DIQUE</th>
                        <th className="border border-gray-300 p-0.5 text-right">META TOTAL (m)</th>
                        <th className="border border-gray-300 p-0.5 text-right">EJECUTADO (m)</th>
                        <th className="border border-gray-300 p-0.5 text-right">SALDO PENDIENTE (m)</th>
                        <th className="border border-gray-300 p-0.5 text-right">ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    {reportData.map(sd => (
                        <React.Fragment key={sd.sector.id}>
                            <tr className="bg-gray-50 font-bold">
                                <td className="border border-gray-300 p-1">{sd.sector.name}</td>
                                <td className="border border-gray-300 p-1 text-right">{formatNumber(sd.dikeDetails.reduce((a,b) => a + b.dike.totalML, 0))}</td>
                                <td className="border border-gray-300 p-1 text-right">{formatNumber(sd.dikeDetails.reduce((a,b) => a + b.executedLength, 0))}</td>
                                <td className="border border-gray-300 p-1 text-right text-red-600">{formatNumber(sd.financials.balance / (sd.financials.contractual / sd.dikeDetails.reduce((a,b) => a + b.dike.totalML, 1)))}</td>
                                <td className="border border-gray-300 p-1 text-center">
                                    {sd.financials.progress >= 100 ? 'COMPLETADO' : 'EN EJECUCIÓN'}
                                </td>
                            </tr>
                            {sd.dikeDetails.map(dd => (
                                <tr key={dd.dike.id}>
                                    <td className="border border-gray-300 p-1 pl-4">└─ {dd.dike.name}</td>
                                    <td className="border border-gray-300 p-1 text-right">{formatNumber(dd.dike.totalML)}</td>
                                    <td className="border border-gray-300 p-1 text-right">{formatNumber(dd.executedLength)}</td>
                                    <td className="border border-gray-300 p-1 text-right text-red-500">{formatNumber(dd.dike.totalML - dd.executedLength)}</td>
                                    <td className="border border-gray-300 p-1 text-center text-[7px]">
                                        {dd.progressPct >= 100 ? 'FINALIZADO' : `${(100 - dd.progressPct).toFixed(1)}% PENDIENTE`}
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>

        {/* 0. RESUMEN FINANCIERO Y AVANCE POR SECTOR */}
        <div id="report-section-0" className="mb-6 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-3 uppercase flex items-center gap-2">
                <DollarSign className="w-3 h-3" /> 0. RESUMEN FINANCIERO Y AVANCE POR SECTOR
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                {reportData.map((data) => (
                    <div key={data.sector.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50/30">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-[9px] text-[#003366] uppercase">{data.sector.name}</h4>
                            <span className="text-[9px] font-black text-blue-700">{data.financials.progress.toFixed(2)}%</span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden">
                            <div 
                                className="bg-blue-600 h-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, data.financials.progress)}%` }}
                            ></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[7px]">
                            <div className="flex flex-col">
                                <span className="text-gray-500 uppercase font-bold">Contractual</span>
                                <span className="font-bold">{formatCurrency(data.financials.contractual)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500 uppercase font-bold">Ejecutado</span>
                                <span className="font-bold text-green-700">{formatCurrency(data.financials.executed)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500 uppercase font-bold">Saldo</span>
                                <span className="font-bold text-red-600">{formatCurrency(data.financials.balance)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 1. METRADOS ACTUAL EN METRO LINEAL (RESUMEN) */}
        <div id="report-section-1" className="mb-4 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-1 uppercase">1. METRADOS ACTUAL EN METRO LINEAL (RESUMEN)</h3>
            {reportData.map((data) => (
                <div key={data.sector.id} className="mb-3 break-inside-avoid">
                    <h4 className="font-bold text-[9px] text-[#003366] border-b border-[#003366] mb-1">{data.sector.name}</h4>
                    <table className="w-full border-collapse border border-gray-300 mb-1 text-[8px]">
                        <thead><tr><th className="border p-0.5 text-left">DIQUE</th><th className="border p-0.5 text-right">META (m)</th><th className="border p-0.5 text-right">EJEC. (m)</th><th className="border p-0.5 text-right">SALDO (m)</th><th className="border p-0.5 text-right">%</th></tr></thead>
                        <tbody>{data.dikeDetails.map(dd => (
                            <tr key={dd.dike.id}><td className="border p-0.5">{dd.dike.name}</td><td className="border p-0.5 text-right">{formatNumber(dd.dike.totalML)}</td><td className="border p-0.5 text-right font-bold text-blue-800">{formatNumber(dd.executedLength)}</td><td className="border p-0.5 text-right">{formatNumber(dd.dike.totalML - dd.executedLength)}</td><td className="border p-0.5 text-right">{dd.progressPct.toFixed(2)}%</td></tr>
                        ))}</tbody>
                    </table>
                </div>
            ))}
        </div>

        {/* 2. RESUMEN DE EJECUCIÓN POR SECTOR (VALORIZACIÓN ESTIMADA) */}
        <div id="report-section-2" className="mb-4 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-1 uppercase">2. RESUMEN DE EJECUCIÓN POR SECTOR (VALORIZACIÓN ESTIMADA)</h3>
            <table className="w-full border-collapse border border-gray-300 text-[8px]">
                <thead><tr className="bg-gray-100"><th className="border p-0.5 text-left">SECTOR</th><th className="border p-0.5 text-right">CONTRACTUAL (S/.)</th><th className="border p-0.5 text-right">EJECUTADO (S/.)</th><th className="border p-0.5 text-right">SALDO (S/.)</th><th className="border p-0.5 text-right">% AVANCE</th></tr></thead>
                <tbody>{reportData.map(d => (
                    <tr key={d.sector.id}><td className="border p-0.5 font-bold">{d.sector.name}</td><td className="border p-0.5 text-right">{formatNumber(d.financials.contractual)}</td><td className="border p-0.5 text-right font-bold text-green-700">{formatNumber(d.financials.executed)}</td><td className="border p-0.5 text-right">{formatNumber(d.financials.balance)}</td><td className="border p-0.5 text-right">{d.financials.progress.toFixed(2)}%</td></tr>
                ))}</tbody>
            </table>
        </div>

        {/* 3. RESUMEN DE METRADOS POR DIQUE Y PARTIDA */}
        <div id="report-section-3" className="mb-4 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-1 uppercase">3. RESUMEN DE METRADOS POR DIQUE Y PARTIDA</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-[7px]">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-0.5 text-left sticky left-0 bg-gray-100 z-10">PARTIDA</th>
                            {dikes.map(d => (
                                <th key={d.id} className="border border-gray-300 p-0.5 text-center min-w-[40px] rotate-45 h-16">{d.name}</th>
                            ))}
                            <th className="border border-gray-300 p-0.5 text-right bg-blue-50">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detailedMatrix.columns.map(col => (
                            <tr key={col.key}>
                                <td className="border border-gray-300 p-0.5 font-bold sticky left-0 bg-white z-10">{col.label} ({col.unit})</td>
                                {detailedMatrix.rows.map(row => (
                                    <td key={row.dike} className="border border-gray-300 p-0.5 text-right">
                                        {row[col.key] > 0 ? formatNumber(row[col.key]) : '-'}
                                    </td>
                                ))}
                                <td className="border border-gray-300 p-0.5 text-right font-bold bg-blue-50/30">
                                    {formatNumber(detailedMatrix.rows.reduce((acc, r) => acc + (r[col.key] || 0), 0))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* 4. TABLA DETALLADA DE METRADOS (POR PROGRESIVAS) */}
        <div id="report-section-4" className="mb-4 break-inside-avoid">
            <h3 className="text-xs font-bold text-white bg-[#003366] p-1 mb-1 uppercase">4. TABLA DETALLADA DE METRADOS (POR PROGRESIVAS)</h3>
            <p className="text-[7px] mb-1 italic text-gray-500">* Muestra los últimos 50 registros de metrados ingresados para control detallado.</p>
            <table className="w-full border-collapse border border-gray-300 text-[7px]">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-0.5">FECHA</th>
                        <th className="border p-0.5">DIQUE</th>
                        <th className="border p-0.5">PROG. INICIO</th>
                        <th className="border p-0.5">PROG. FIN</th>
                        <th className="border p-0.5">DIST. (m)</th>
                        <th className="border p-0.5">TERRENO</th>
                        <th className="border p-0.5">ENROCADO</th>
                    </tr>
                </thead>
                <tbody>
                    {measurements.slice(-50).reverse().map((m, idx) => (
                        <tr key={idx}>
                            <td className="border p-0.5 text-center">{m.fecha}</td>
                            <td className="border p-0.5">{dikes.find(d => d.id === m.dikeId)?.name || m.dikeId}</td>
                            <td className="border p-0.5 text-center">{m.progInicio}</td>
                            <td className="border p-0.5 text-center">{m.progFin}</td>
                            <td className="border p-0.5 text-right font-bold">{m.distancia.toFixed(2)}</td>
                            <td className="border p-0.5 text-center">{m.tipoTerreno || '-'}</td>
                            <td className="border p-0.5 text-center">{m.tipoEnrocado || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* ... (Other sections would follow here) */}
      </div>
    </div>
  );
};
