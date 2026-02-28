
import React, { useState, useMemo, useEffect } from "react";
import { DikeConfig, BudgetSection, ProgressEntry, Sector } from "../types";
import { CalendarRange, Filter, Map, Layers, LayoutTemplate, Search, ArrowRight, FileSpreadsheet, Download, Activity, PieChart as PieChartIcon } from "lucide-react";
import { Button } from "./Button";
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface LinearSchedulePanelProps {
  dikes: DikeConfig[];
  budget: BudgetSection[];
  progressEntries: ProgressEntry[];
  sectors: Sector[];
  filterSectorId?: string;
  filterDikeId?: string;
}

export const LinearSchedulePanel: React.FC<LinearSchedulePanelProps> = ({ 
  dikes, 
  budget, 
  progressEntries, 
  sectors,
  filterSectorId = "ALL",
  filterDikeId = "ALL"
}) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(filterSectorId !== "ALL" ? filterSectorId : "TODOS");
  const [selectedDikeId, setSelectedDikeId] = useState(filterDikeId !== "ALL" ? filterDikeId : (dikes[0]?.id || ""));
  const [resolution, setResolution] = useState(100); // Meters per column
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>("TODOS");

  // Sync with global filters
  useEffect(() => {
    if (filterSectorId !== "ALL") {
      setSelectedSectorId(filterSectorId);
    }
    if (filterDikeId !== "ALL") {
      setSelectedDikeId(filterDikeId);
    }
  }, [filterSectorId, filterDikeId]);

  // Filter dikes by sector
  const filteredDikes = useMemo(() => {
      if (selectedSectorId === "TODOS") return dikes;
      return dikes.filter(d => d.sectorId === selectedSectorId);
  }, [dikes, selectedSectorId]);

  // Auto-select first dike when list changes
  useEffect(() => {
      if (filteredDikes.length > 0) {
          if (!filteredDikes.find(d => d.id === selectedDikeId)) {
              setSelectedDikeId(filteredDikes[0].id);
          }
      } else {
          setSelectedDikeId("");
      }
  }, [filteredDikes, selectedDikeId]);

  const selectedDike = dikes.find(d => d.id === selectedDikeId);

  // Calculate progress summary for the selected dike
  const progressSummary = useMemo(() => {
    if (!selectedDike) return { total: 0, executed: 0, percent: 0 };
    
    // Key activities for progress (same as ProgressControlPanel)
    const keyActivities = ["403.A", "404.A", "404.B", "402.B"];
    const dikeEntries = progressEntries.filter(e => e.dikeId === selectedDikeId);
    
    // Group by activity and find max length
    const activityMaxLen: Record<string, number> = {};
    dikeEntries.forEach(e => {
        keyActivities.forEach(code => {
            if (e.partida.startsWith(code)) {
                activityMaxLen[code] = Math.max(activityMaxLen[code] || 0, e.longitud);
            }
        });
    });

    const executed = Object.values(activityMaxLen).reduce((a, b) => a + b, 0) / (keyActivities.length || 1);
    const total = selectedDike.totalML || 1;
    const percent = Math.min((executed / total) * 100, 100);

    return { total, executed, percent };
  }, [selectedDike, progressEntries, selectedDikeId]);

  const chartData = useMemo(() => [
    { name: 'Ejecutado', value: progressSummary.percent, fill: '#22c55e' },
    { name: 'Pendiente', value: 100 - progressSummary.percent, fill: '#f3f4f6' }
  ], [progressSummary]);

  // Helper: Parse PK string to meters
  const parsePk = (pkStr: string): number => {
    if (!pkStr) return 0;
    if (pkStr.includes('+')) {
      const [km, m] = pkStr.split('+');
      return (parseFloat(km) * 1000) + parseFloat(m);
    }
    return parseFloat(pkStr) || 0;
  };

  // Helper: Format meters back to PK string
  const formatPk = (meters: number): string => {
    const km = Math.floor(meters / 1000);
    const m = meters % 1000;
    return `${km}+${m.toString().padStart(3, '0')}`;
  };

  // Generate Grid Columns (PK Intervals)
  const gridColumns = useMemo(() => {
    if (!selectedDike) return [];
    
    // Use Dike Start/End if defined, else defaults
    const start = parsePk(selectedDike.progInicioDique) || 0;
    // Fallback if config is missing end point, estimate from totalML
    const end = selectedDike.progFinDique ? parsePk(selectedDike.progFinDique) : start + selectedDike.totalML; 
    
    // Sanity check for negative or weird config
    const safeStart = Math.min(start, end);
    const safeEnd = Math.max(start, end);

    const cols = [];
    for (let current = safeStart; current < safeEnd; current += resolution) {
      cols.push({
        start: current,
        end: Math.min(current + resolution, safeEnd),
        label: formatPk(current)
      });
    }
    return cols;
  }, [selectedDike, resolution]);

  // Extract Flattened Partidas (Items) for Rows, including Group ID for filtering
  const allPartidas = useMemo(() => {
    return budget.flatMap(section => 
        section.groups.flatMap(group => 
            group.items.map(item => ({
                code: item.code,
                desc: item.description,
                unit: item.unit,
                groupId: group.id,
                groupName: group.name
            }))
        )
    );
  }, [budget]);

  // Filter Partidas based on Search Term and Group Filter
  const displayedPartidas = useMemo(() => {
    let filtered = allPartidas;
    
    if (activeGroupFilter !== "TODOS") {
        filtered = filtered.filter(p => p.groupId === activeGroupFilter);
    }

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(p => 
            p.code.toLowerCase().includes(lowerTerm) || 
            p.desc.toLowerCase().includes(lowerTerm)
        );
    }

    return filtered;
  }, [allPartidas, searchTerm, activeGroupFilter]);

  // Determine cell status
  const checkProgress = (partidaCode: string, colStart: number, colEnd: number) => {
    // Find any progress entry for this dike and partida that overlaps with this column's range
    return progressEntries.some(entry => {
      if (entry.dikeId !== selectedDikeId) return false;
      // Loose match on code to handle potential formatting diffs
      if (!entry.partida.startsWith(partidaCode)) return false; 
      
      const pStart = parsePk(entry.progInicio);
      const pEnd = parsePk(entry.progFin);
      
      const entryMin = Math.min(pStart, pEnd);
      const entryMax = Math.max(pStart, pEnd);

      // Check overlap: Interval [colStart, colEnd] overlaps with [entryMin, entryMax]
      // Overlap condition: start1 < end2 && start2 < end1
      return (entryMin < colEnd && entryMax > colStart);
    });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Export each sector as a sheet or one big sheet? 
    // User asked for "detailed and complete all sectors and dikes"
    // Let's create one sheet per sector if possible, or one big detailed sheet.
    
    const exportData: any[] = [];
    
    // Headers
    const headers = ["SECTOR", "DIQUE", "GRUPO", "CÓDIGO", "DESCRIPCIÓN", "UNIDAD", "PROG. INICIO", "PROG. FIN", "ESTADO"];
    exportData.push(headers);

    sectors.forEach(sector => {
        const sectorDikes = dikes.filter(d => d.sectorId === sector.id);
        sectorDikes.forEach(dike => {
            allPartidas.forEach(partida => {
                // Check if this partida has any progress in this dike
                const relevantProgress = progressEntries.filter(e => 
                    e.dikeId === dike.id && e.partida.startsWith(partida.code)
                );

                if (relevantProgress.length > 0) {
                    relevantProgress.forEach(entry => {
                        exportData.push([
                            sector.name,
                            dike.name,
                            partida.groupName,
                            partida.code,
                            partida.desc,
                            partida.unit,
                            entry.progInicio,
                            entry.progFin,
                            "EJECUTADO"
                        ]);
                    });
                } else {
                    // Optional: include pending items? User said "detailed and complete"
                    exportData.push([
                        sector.name,
                        dike.name,
                        partida.groupName,
                        partida.code,
                        partida.desc,
                        partida.unit,
                        dike.progInicioDique,
                        dike.progFinDique,
                        "PENDIENTE"
                    ]);
                }
            });
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Cronograma Detallado");
    
    // Also add a matrix view for the selected dike if one is selected
    if (selectedDike) {
        const matrixData: any[] = [];
        const matrixHeaders = ["CÓDIGO", "DESCRIPCIÓN", ...gridColumns.map(c => c.label)];
        matrixData.push(matrixHeaders);

        displayedPartidas.forEach(partida => {
            const row = [partida.code, partida.desc];
            gridColumns.forEach(col => {
                const isDone = checkProgress(partida.code, col.start, col.end);
                row.push(isDone ? "X" : "");
            });
            matrixData.push(row);
        });

        const wsMatrix = XLSX.utils.aoa_to_sheet(matrixData);
        XLSX.utils.book_append_sheet(wb, wsMatrix, `Matriz ${selectedDike.name}`);
    }

    XLSX.writeFile(wb, `Cronograma_Construccion_Detallado.xlsx`);
  };

  if (!dikes.length) return <div className="p-8 text-center text-gray-500 text-sm">No hay diques configurados.</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div className="flex items-center gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-800">
                    <CalendarRange className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Cronograma Lineal</h2>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Visualización de Actividades por Progresivas</p>
                </div>
            </div>

            <div className="flex-1 w-full max-w-xl">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-gray-50 dark:bg-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs font-medium transition-all"
                        placeholder="Buscar partida..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Sector Filter */}
                <div className="relative group">
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
                        <div className="pl-3 pr-1 py-2 text-gray-400">
                            <Filter className="w-4 h-4" />
                        </div>
                        <select 
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 text-gray-700 dark:text-gray-200 outline-none py-2.5 pl-2 pr-8 appearance-none min-w-[120px] cursor-pointer"
                            value={selectedSectorId}
                            onChange={(e) => setSelectedSectorId(e.target.value)}
                        >
                            <option value="TODOS">Todos Sectores</option>
                            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Dike Selector */}
                <div className="relative group">
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
                        <div className="pl-3 pr-1 py-2 text-gray-400">
                            <Map className="w-4 h-4" />
                        </div>
                        <select 
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 text-gray-700 dark:text-gray-200 outline-none py-2.5 pl-2 pr-8 appearance-none min-w-[160px] cursor-pointer"
                            value={selectedDikeId}
                            onChange={(e) => setSelectedDikeId(e.target.value)}
                        >
                            {filteredDikes.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            {filteredDikes.length === 0 && <option value="">Sin diques</option>}
                        </select>
                    </div>
                </div>

                {/* Resolution Selector */}
                <div className="relative group">
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:border-blue-300 transition-colors">
                        <div className="pl-3 pr-1 py-2 text-gray-400">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                        <select 
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 text-gray-700 dark:text-gray-200 outline-none py-2.5 pl-2 pr-8 appearance-none min-w-[100px] cursor-pointer"
                            value={resolution}
                            onChange={(e) => setResolution(parseInt(e.target.value))}
                        >
                            <option value={10}>Cada 10m</option>
                            <option value={20}>Cada 20m</option>
                            <option value={50}>Cada 50m</option>
                            <option value={100}>Cada 100m</option>
                            <option value={200}>Cada 200m</option>
                            <option value={500}>Cada 500m</option>
                        </select>
                    </div>
                </div>

                <Button 
                    onClick={handleExportExcel}
                    className="h-10 bg-green-700 hover:bg-green-800 text-white shadow-sm"
                >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Exportar Cronograma
                </Button>
            </div>
        </div>

        {/* Tabs and Legend Section */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <button 
                        onClick={() => setActiveGroupFilter("TODOS")}
                        className={`px-6 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeGroupFilter === "TODOS" ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        TODOS
                    </button>
                    <button 
                        onClick={() => setActiveGroupFilter("B1")}
                        className={`px-6 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeGroupFilter === "B1" ? 'bg-white dark:bg-gray-800 text-green-600 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        B1 - DIQUE NUEVO
                    </button>
                    <button 
                        onClick={() => setActiveGroupFilter("B2")}
                        className={`px-6 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${activeGroupFilter === "B2" ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm border border-gray-200 dark:border-gray-700' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        B2 - REFUERZO
                    </button>
                </div>

                <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded border border-gray-300 bg-white dark:bg-gray-800 shadow-inner"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded border border-green-600 bg-green-500 shadow-inner"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ejecutado</span>
                    </div>
                </div>
            </div>

            {selectedDike && (
                <div className="flex items-center gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 min-w-[300px]">
                    <div className="w-16 h-16 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={20}
                                    outerRadius={28}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black text-blue-700 dark:text-blue-300">{progressSummary.percent.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avance del Dique</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white truncate max-w-[150px]">{selectedDike.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Ejecutado</span>
                                <span className="text-[10px] font-black text-green-600">{progressSummary.executed.toLocaleString()} ML</span>
                            </div>
                            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Total</span>
                                <span className="text-[10px] font-black text-gray-600 dark:text-gray-400">{progressSummary.total.toLocaleString()} ML</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {selectedDike ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col">
                {/* Grid Container */}
                <div className="overflow-auto relative max-h-[700px] custom-scrollbar">
                    <table className="border-collapse w-max">
                        <thead className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm">
                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                <th className="sticky left-0 z-40 bg-gray-50 dark:bg-gray-900 text-left px-6 py-4 border-b border-r border-gray-200 dark:border-gray-700 min-w-[350px] shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)] h-24 align-middle">
                                    <span className="text-[11px] font-black text-[#003366] dark:text-blue-400 uppercase tracking-widest">PARTIDA / ACTIVIDAD</span>
                                </th>
                                {gridColumns.map((col, idx) => (
                                    <th key={idx} className="text-center px-0 border-b border-r border-gray-200 dark:border-gray-700 min-w-[24px] h-24 align-middle bg-gray-50 dark:bg-gray-900/30">
                                        <div className="text-[9px] font-black text-gray-500 font-mono -rotate-90 w-4 mx-auto whitespace-nowrap origin-center tracking-tighter">
                                            {col.label}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {displayedPartidas.map(partida => {
                                if (!partida.code) return null;

                                return (
                                    <tr key={`${partida.groupId}-${partida.code}`} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                        <td className="sticky left-0 z-20 bg-white dark:bg-gray-800 px-6 py-3 border-r border-gray-100 dark:border-gray-800 shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter ${partida.groupId === 'B1' ? 'bg-green-100 text-green-700 border border-green-200' : (partida.groupId === 'B2' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-gray-100 text-gray-600 border border-gray-200')}`}>
                                                        {partida.groupId}
                                                    </span>
                                                    <span className="text-[11px] font-black text-gray-900 dark:text-white tracking-tight">{partida.code}</span>
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate max-w-[300px] leading-tight" title={partida.desc}>{partida.desc}</span>
                                            </div>
                                        </td>
                                        {gridColumns.map((col, idx) => {
                                            const isDone = checkProgress(partida.code, col.start, col.end);
                                            return (
                                                <td key={idx} className={`border-r border-b border-gray-50 dark:border-gray-800 relative p-0 h-10 w-6`}>
                                                    {isDone && (
                                                        <div className="absolute inset-0 bg-green-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]" title={`Ejecutado: ${partida.code} en ${col.label}`}></div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="p-12 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-500">
                <Map className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Seleccione un Dique</p>
                <p className="text-xs mt-1">Utilice los filtros superiores para seleccionar un sector y dique.</p>
            </div>
        )}
      </div>
    </div>
  );
};
