
import React, { useState, useMemo } from "react";
import { Sector, BudgetSection, MeasurementEntry, DikeConfig, BudgetItem, ProtocolEntry } from "../types";
import { FileSpreadsheet, Download, Printer, Search, ChevronDown, ChevronRight, Filter, Calendar } from "lucide-react";
import { Button } from "./Button";
import * as XLSX from 'xlsx';

interface ValuationReportPanelProps {
  sectors: Sector[];
  budgetBySector: Record<string, BudgetSection[]>;
  measurements: MeasurementEntry[];
  protocols?: ProtocolEntry[];
  dikes: DikeConfig[];
  filterSectorId?: string;
  filterDikeId?: string;
}

export const ValuationReportPanel: React.FC<ValuationReportPanelProps> = ({
  sectors,
  budgetBySector,
  measurements,
  protocols = [],
  dikes,
  filterSectorId = "ALL",
  filterDikeId = "ALL"
}) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(filterSectorId !== "ALL" ? filterSectorId : (sectors[0]?.id || ""));
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Sync with global filters
  React.useEffect(() => {
    if (filterSectorId !== "ALL") {
      setSelectedSectorId(filterSectorId);
    }
  }, [filterSectorId]);

  const selectedSector = sectors.find(s => s.id === selectedSectorId);
  const sectorBudget = budgetBySector[selectedSectorId] || [];
  const sectorDikes = dikes.filter(d => d.sectorId === selectedSectorId && (filterDikeId === "ALL" || d.id === filterDikeId));
  const sectorMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getExecutedQuantity = (itemCode: string) => {
    return sectorMeasurements.reduce((acc, m) => {
      const rawCode = itemCode.trim();
      const baseCode = rawCode.split('_')[0].trim();
      
      const itemToField: Record<string, string> = {
          "401.A": "item401A", "402.B": "item402B", "402.E": "item402E", "403.A": "item403A",
          "404.A": "item404A", "404.B": "item404B", "404.D": "item404D", "404.E": "item404E",
          "412.A": "item412A", "413.A": "item413A", "406.A": "item406A", "409.A": "item409A",
          "416.A": "item416A", "408.A": "item408A", "415.A": "item415"
      };
      const fieldName = itemToField[baseCode] || rawCode;

      const protocol = protocols.find(p => p.measurementId === m.id);
      const hasProtocol = protocol && protocol.protocols[fieldName];

      if (!hasProtocol && m.item501A_Carguio !== 1) return acc;

      const isB2BudgetItem = rawCode.endsWith('_R') || ['404.G', '404.H', '415.A', '416.B', '417.A'].includes(rawCode);
      const isB2Row = m.tipoTerreno === 'B2';
      if (isB2BudgetItem && !isB2Row) return acc;
      if (!isB2BudgetItem && isB2Row) return acc;

      let val = 0;
      const dist = m.distancia || 0;

      if (m[fieldName] !== undefined) {
         val = Number(m[fieldName]);
      } else if (m[rawCode] !== undefined) {
         val = Number(m[rawCode]);
      } else {
        const fallbackField = `item${baseCode.replace(/\./g, '')}`;
        val = Number(m[fallbackField] || 0);
      }
      
      return acc + (val * dist);
    }, 0);
  };

  const valuationSummary = useMemo(() => {
    const summary: Record<string, { total: number, items: Record<string, number> }> = {};
    
    sectorMeasurements.forEach(m => {
        const protocol = protocols.find(p => p.measurementId === m.id);
        if (!protocol) return;

        (Object.entries(protocol.valuationMonths || {}) as [string, string][]).forEach(([itemField, month]) => {
            if (!month) return;
            if (!summary[month]) summary[month] = { total: 0, items: {} };
            
            const area = Number((m as any)[itemField] || 0);
            const volume = area * m.distancia;
            
            summary[month].total += volume;
            summary[month].items[itemField] = (summary[month].items[itemField] || 0) + volume;
        });
    });

    return Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sectorMeasurements, protocols]);

  const exportToExcel = () => {
    const data: any[] = [];
    
    sectorBudget.forEach(section => {
      data.push({ SECCION: section.id, MEDIDA: section.name, UND: "", METRADOS: "" });
      section.groups.forEach(group => {
        data.push({ SECCION: group.code, MEDIDA: group.name, UND: "", METRADOS: "" });
        group.items.forEach(item => {
          const executed = getExecutedQuantity(item.code);
          data.push({
            SECCION: item.code,
            MEDIDA: item.description,
            UND: item.unit,
            METRADOS: executed.toFixed(2)
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resumen Metrados");
    XLSX.writeFile(wb, `RESUMEN_METRADOS_${selectedSector?.name || 'SECTOR'}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-[#003366] p-3 rounded-xl shadow-lg shadow-blue-900/20">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Resumen de Metrado de las Defensas Ribereñas
            </h1>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest">
              DEL {selectedSector?.name || "SECTOR SELECCIONADO"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" className="text-xs font-bold">
            <Download className="w-4 h-4 mr-2" /> EXPORTAR EXCEL
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="text-xs font-bold">
            <Printer className="w-4 h-4 mr-2" /> IMPRIMIR
          </Button>
        </div>
      </div>

      {/* Filters & Navigation */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {sectors.map(sector => (
            <button
              key={sector.id}
              onClick={() => setSelectedSectorId(sector.id)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                selectedSectorId === sector.id
                  ? "bg-[#003366] text-white shadow-md scale-105"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-blue-400"
              }`}
            >
              {sector.name}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar partida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Valuation Summary Section */}
      {valuationSummary.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                <Calendar className="w-4 h-4" /> Resumen de Avance por Valorización
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {valuationSummary.map(([month, data]) => (
                    <div key={month} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                            <h4 className="font-black text-xs text-emerald-700 dark:text-emerald-400 uppercase">{month}</h4>
                            <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-emerald-700">{data.total.toLocaleString()} m³</span>
                        </div>
                        <div className="space-y-1">
                            {Object.entries(data.items).map(([item, vol]) => (
                                <div key={item} className="flex justify-between text-[9px]">
                                    <span className="text-gray-500 uppercase font-bold">{item}</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{vol.toLocaleString()} m³</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
        <div className="bg-[#003366] text-white px-4 py-2 text-center font-black text-xs tracking-[0.2em] uppercase border-b border-blue-800">
          PARTIDAS PAQUETE 4 - {selectedSector?.name || "SECTOR"}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#002244] text-white text-[10px] font-black uppercase tracking-widest">
                <th className="px-4 py-3 text-left border-r border-blue-800 w-24">Sección</th>
                <th className="px-4 py-3 text-left border-r border-blue-800">Medida</th>
                <th className="px-4 py-3 text-center border-r border-blue-800 w-20">Und</th>
                <th className="px-4 py-3 text-right w-32">Metrados</th>
              </tr>
            </thead>
            <tbody>
              {sectorBudget.map((section) => {
                const isExpanded = expandedSections[section.id] !== false;
                return (
                  <React.Fragment key={section.id}>
                    {/* Section Row */}
                    <tr 
                      className="bg-[#4CAF50] text-white font-black text-xs cursor-pointer hover:bg-[#43A047] transition-colors"
                      onClick={() => toggleSection(section.id)}
                    >
                      <td className="px-4 py-2 text-center border-r border-white/20">{section.id}</td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {section.name}
                      </td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right"></td>
                    </tr>

                    {isExpanded && section.groups.map((group) => {
                      const isGroupExpanded = expandedSections[group.id] !== false;
                      return (
                        <React.Fragment key={group.id}>
                          {/* Group Row */}
                          <tr 
                            className="bg-[#FFF9C4] dark:bg-yellow-900/20 text-gray-800 dark:text-yellow-100 font-bold text-[11px] cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors"
                            onClick={() => toggleSection(group.id)}
                          >
                            <td className="px-4 py-1.5 text-center border-r border-gray-300 dark:border-gray-700">{group.code}</td>
                            <td className="px-4 py-1.5 flex items-center gap-2">
                              {isGroupExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {group.name}
                            </td>
                            <td className="px-4 py-1.5"></td>
                            <td className="px-4 py-1.5 text-right"></td>
                          </tr>

                          {isGroupExpanded && group.items
                            .filter(item => 
                              item.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.code.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((item) => {
                              const executed = getExecutedQuantity(item.code);
                              return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-800">
                                  <td className="px-4 py-1.5 text-[10px] font-bold text-gray-500 border-r border-gray-100 dark:border-gray-800">{item.code}</td>
                                  <td className="px-4 py-1.5 text-[11px] text-gray-700 dark:text-gray-300 font-medium">{item.description}</td>
                                  <td className="px-4 py-1.5 text-[10px] text-center font-bold text-gray-500 border-x border-gray-100 dark:border-gray-800">{item.unit}</td>
                                  <td className="px-4 py-1.5 text-[11px] text-right font-mono font-bold text-gray-900 dark:text-white bg-gray-50/30 dark:bg-gray-900/20">
                                    {executed.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400 flex justify-between items-center">
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> Datos filtrados por Sector</span>
          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Metrados calculados en base a progresivas ejecutadas</span>
        </div>
        <div className="font-bold">
          SISTEMA DE CONTROL DE OBRA - VALORIZACIÓN v2.0
        </div>
      </div>
    </div>
  );
};

const Activity = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
