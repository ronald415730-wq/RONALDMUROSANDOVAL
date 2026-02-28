
import React, { useMemo, useState } from "react";
import { MeasurementEntry, DikeConfig, Sector, BudgetSection } from "../types";
import { TrendingUp, FileSpreadsheet, Download, Filter, ChevronDown, Layers, Database } from "lucide-react";
import { Button } from "./Button";

interface VolumeEntryGridProps {
  dike: DikeConfig | null;
  entries: MeasurementEntry[];
  customColumns: string[];
  sectors: Sector[];
  allDikes: DikeConfig[];
  budgetBySector: Record<string, BudgetSection[]>;
  filterSectorId?: string;
  filterDikeId?: string;
}

export const VolumeEntryGrid: React.FC<VolumeEntryGridProps> = ({ 
    dike, 
    entries, 
    customColumns,
    sectors,
    allDikes,
    budgetBySector,
    filterSectorId = "ALL",
    filterDikeId = "ALL"
}) => {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const ALL_COLUMNS = [
    { id: 'pk', label: 'Progresiva' },
    { id: 'distancia', label: 'DIST.', unit: 'ml' },
    { id: 'tipoTerreno', label: 'TERRENO' },
    { id: 'tipoEnrocado', label: 'ENROCADO' },
    { id: 'item403A', label: '403.A RELLENO', unit: 'm3' },
    { id: 'item403A_MM', label: '403.A RELLENO M.M.', unit: 'm3' },
    { id: 'item402B', label: '402.B CORTE TALUD', unit: 'm3' },
    { id: 'item402B_MM', label: '402.B CORTE TALUD M.M.', unit: 'm3' },
    { id: 'item402E', label: '402.E CORTE UÑA', unit: 'm3' },
    { id: 'item402E_MM', label: '402.E CORTE UÑA M.M.', unit: 'm3' },
    { id: 'item404A', label: '404.A/404.B/404.G ENROCADO TALUD', unit: 'm3' },
    { id: 'item404A_MM', label: '404.A/404.B/404.G ENROCADO TALUD M.M.', unit: 'm3' },
    { id: 'item404D', label: '404.D/404.E/404.H ENROCADO UÑA', unit: 'm3' },
    { id: 'item404D_MM', label: '404.D/404.E/404.H ENROCADO UÑA M.M.', unit: 'm3' },
    { id: 'item413A', label: '413.A RELLENO MATERIAL PROPIO', unit: 'm3' },
    { id: 'item413A_MM', label: '413.A RELLENO MATERIAL PROPIO M.M.', unit: 'm3' },
    { id: 'item412A', label: '412.A AFIRMADO', unit: 'm3' },
    { id: 'item406A', label: '406.A PERFILADO TALUD', unit: 'm2' },
    { id: 'item401A', label: '401.A DESBROCE', unit: 'm3' },
    { id: 'item409A', label: '409.A GEOTEXTIL 400GR', unit: 'm2' },
    { id: 'item409B', label: '409.B GEOTEXTIL 200GR', unit: 'm2' },
    { id: 'item414A', label: '414.A GOECELDA', unit: 'm3' },
    { id: 'item415', label: '415 GAVION', unit: 'm3' },
    { id: 'item408A', label: '408.A ZANJA Y RELLENO ANCLAJE DE GEOTEXTIL', unit: 'm2' },
    { id: 'item416A', label: '416.A PERFILADO Y COMPACTACIÓN FUNDACIÓN DE DIQUE', unit: 'm2' },
    ...customColumns.map(c => ({ id: c, label: c, unit: 'm3' }))
  ];

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesDike = filterDikeId === "ALL" || entry.dikeId === filterDikeId;
      const matchesSector = filterSectorId === "ALL" || allDikes.find(d => d.id === entry.dikeId)?.sectorId === filterSectorId;
      
      if (!matchesDike || !matchesSector) return false;

      return (Object.entries(filters) as [string, string][]).every(([key, value]) => {
        if (!value) return true;
        const entryValue = String((entry as any)[key] || '').toLowerCase();
        return entryValue.includes(value.toLowerCase());
      });
    });
  }, [entries, filters, filterDikeId, filterSectorId, allDikes]);

  const calculateVolume = (area: number, distance: number) => {
    return (area || 0) * (distance || 0);
  };

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    ALL_COLUMNS.forEach(col => totals[col.id] = 0);

    filteredEntries.forEach(entry => {
      ALL_COLUMNS.forEach(col => {
        if (['pk', 'distancia', 'tipoTerreno', 'tipoEnrocado'].includes(col.id)) return;
        const area = Number(entry[col.id] || 0);
        totals[col.id] += calculateVolume(area, entry.distancia);
      });
      totals['distancia'] += entry.distancia || 0;
    });

    return totals;
  }, [filteredEntries]);

  const formatNumber = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
             <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hoja de Volúmenes (Área x Distancia)</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cálculo automático de volúmenes por partida y progresiva</p>
             </div>
         </div>
         <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`text-xs h-9 ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}>
                <Filter className="w-3.5 h-3.5 mr-2" /> {showFilters ? 'Ocultar Filtros' : 'Filtrar Datos'}
            </Button>
            <Button variant="outline" className="text-xs h-9">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-2" /> Exportar Volúmenes
            </Button>
         </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#003366] text-white text-[9px] uppercase tracking-wider font-black">
                {ALL_COLUMNS.map(col => (
                  <th key={col.id} className="px-2 py-2 border-r border-white/10 text-center whitespace-nowrap">
                    {col.label} {col.unit && <span className="text-blue-200">({col.unit})</span>}
                  </th>
                ))}
              </tr>
              {showFilters && (
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700">
                  {ALL_COLUMNS.map(col => (
                    <th key={col.id} className="px-1 py-1 border-r border-gray-200 dark:border-gray-700">
                      <input 
                        type="text"
                        className="w-full text-[8px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 h-5 outline-none"
                        placeholder="..."
                        value={filters[col.id] || ''}
                        onChange={e => setFilters(p => ({...p, [col.id]: e.target.value}))}
                      />
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-mono text-[10px]">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                  {ALL_COLUMNS.map(col => {
                    let val: any = entry[col.id];
                    const isMetadata = ['pk', 'distancia', 'tipoTerreno', 'tipoEnrocado'].includes(col.id);
                    
                    if (!isMetadata) {
                      val = calculateVolume(Number(val || 0), entry.distancia);
                    }

                    return (
                      <td key={col.id} className={`px-2 py-1.5 border-r border-gray-100 dark:border-gray-800 text-center ${isMetadata ? 'bg-gray-50/50 dark:bg-gray-900/20 font-bold' : 'text-blue-700 dark:text-blue-400'}`}>
                        {typeof val === 'number' ? formatNumber(val) : val}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-gray-100 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600 font-black text-[10px]">
              <tr>
                <td className="px-2 py-2 text-center uppercase">TOTALES</td>
                <td className="px-2 py-2 text-center border-l border-gray-200 dark:border-gray-700">{formatNumber(columnTotals.distancia)}</td>
                <td colSpan={2}></td>
                {ALL_COLUMNS.slice(4).map(col => (
                  <td key={col.id} className="px-2 py-2 text-center border-l border-gray-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-400">
                    {formatNumber(columnTotals[col.id])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-xs font-black text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> Resumen por Sector
              </h3>
              <div className="space-y-2">
                  {sectors.map(sector => {
                      const sectorDikes = allDikes.filter(d => d.sectorId === sector.id);
                      const sectorEntries = entries.filter(e => sectorDikes.some(d => d.id === e.dikeId));
                      const totalVol = sectorEntries.reduce((acc, e) => {
                          let rowVol = 0;
                          ALL_COLUMNS.slice(4).forEach(col => {
                              rowVol += calculateVolume(Number(e[col.id] || 0), e.distancia);
                          });
                          return acc + rowVol;
                      }, 0);
                      
                      return (
                          <div key={sector.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                              <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{sector.name}</span>
                              <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400">{formatNumber(totalVol)} m³</span>
                          </div>
                      );
                  })}
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-xs font-black text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" /> Top Partidas (m³)
              </h3>
              <div className="space-y-2">
                  {ALL_COLUMNS.slice(4)
                    .sort((a, b) => columnTotals[b.id] - columnTotals[a.id])
                    .slice(0, 5)
                    .map(col => (
                        <div key={col.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                            <span className="text-[9px] font-bold text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{col.label}</span>
                            <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">{formatNumber(columnTotals[col.id])}</span>
                        </div>
                    ))
                  }
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full mb-3">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Volumen Total Acumulado</h3>
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
                  {formatNumber((Object.values(columnTotals) as number[]).reduce((a, b) => a + b, 0) - columnTotals.distancia)}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Metros Cúbicos Ejecutados</p>
          </div>
      </div>
    </div>
  );
};
