
import React, { useState, useEffect, useMemo, useRef } from "react";
import { ProgressEntry, DikeConfig, BudgetSection, Sector } from "../types";
import { ExcelService } from "../services/excelService";
import { Plus, Trash2, Calendar, HardHat, Filter, X, Layout, Search, Copy, Pickaxe, Mountain, Shovel, BarChart3, ChevronDown, Activity, AlertTriangle, Layers, Edit3, Download, ChevronUp, FileSpreadsheet, TrendingUp } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, parseISO, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProgressControlPanelProps {
  sectors: Sector[];
  dikes: DikeConfig[];
  budget: BudgetSection[];
  budgetBySector?: Record<string, BudgetSection[]>;
  entries: ProgressEntry[];
  onAddEntry: (entry: ProgressEntry) => void;
  onUpdateEntry?: (entry: ProgressEntry) => void;
  onDeleteEntry: (id: string) => void;
  filterSectorId?: string;
  filterDikeId?: string;
}

// Local Editable Helper Components
const ProgressEditableCell = ({ 
    value, 
    onChange, 
    type = "text", 
    className = "", 
    placeholder = "", 
    align = "left", 
    isNumeric = false 
}: { 
    value: string | number, 
    onChange: (val: string) => void, 
    type?: string, 
    className?: string, 
    placeholder?: string, 
    align?: "left" | "center" | "right", 
    isNumeric?: boolean 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(value?.toString() || "");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setLocalVal(value?.toString() || ""); }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const commit = () => {
        setIsEditing(false);
        if (localVal !== value.toString()) {
            onChange(localVal);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
            setLocalVal(value?.toString() || "");
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input 
                ref={inputRef}
                type={type} 
                value={localVal} 
                onChange={(e) => setLocalVal(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className={`bg-white border border-blue-400 rounded px-1.5 py-0.5 text-[10px] outline-none shadow-sm w-full ${className}`}
                placeholder={placeholder}
            />
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-1.5 py-0.5 rounded min-h-[20px] flex items-center transition-colors group border border-transparent hover:border-gray-200 ${className} ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}
            title="Click para editar"
        >
            <span className="truncate">
                {isNumeric && localVal ? Number(localVal).toFixed(2) : (localVal || <span className="text-gray-300 italic">{placeholder || "-"}</span>)}
            </span>
        </div>
    );
}

const ProgressEditableSelect = ({ 
    value, 
    onChange, 
    options, 
    className = "" 
}: { 
    value: string, 
    onChange: (val: string) => void, 
    options: {value: string, label: string}[], 
    className?: string 
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (isEditing && selectRef.current) {
            selectRef.current.focus();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <select 
                ref={selectRef}
                value={value} 
                onChange={handleChange}
                onBlur={handleBlur}
                className={`bg-white border border-blue-400 rounded px-1 py-0.5 text-[10px] outline-none shadow-sm w-full ${className}`}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        );
    }

    const label = options.find(o => o.value === value)?.label || value || "-";

    return (
        <div 
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 px-1.5 py-0.5 rounded min-h-[20px] flex items-center transition-colors group border border-transparent hover:border-gray-200 ${className}`}
            title={label}
        >
            <span className="truncate">{label}</span>
            <Edit3 className="w-2.5 h-2.5 text-gray-300 ml-1 opacity-0 group-hover:opacity-100" />
        </div>
    );
}

const ProgressChart = ({ data }: { data: { name: string, percent: number }[] }) => {
    if (!data.length) return (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            No hay datos para mostrar en el gráfico.
        </div>
    );
    
    const height = 350;
    const width = Math.max(800, data.length * 80); 
    const margin = { top: 40, right: 30, bottom: 100, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const barWidth = chartWidth / data.length;
    const barPadding = barWidth * 0.4;
    const effectiveBarWidth = barWidth - barPadding;

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 uppercase tracking-wide">
                    <BarChart3 className="w-4 h-4 text-blue-600" /> Progreso Físico por Dique (%)
                </h3>
                <div className="flex gap-4 text-[10px]">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-sm border border-gray-400 dark:border-gray-500"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Meta Total (100%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Avance Actual</span>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <svg width={width} height={height} style={{ minWidth: '100%' }}>
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.9" />
                        </linearGradient>
                        <linearGradient id="barGradientComplete" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
                            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.9" />
                        </linearGradient>
                    </defs>
                    {[0, 20, 40, 60, 80, 100].map(tick => {
                        const y = margin.top + chartHeight - (tick / 100) * chartHeight;
                        return (
                            <g key={tick}>
                                <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#e5e7eb" strokeDasharray="4" />
                                <text x={margin.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{tick}%</text>
                            </g>
                        )
                    })}
                    <line x1={margin.left} y1={margin.top + chartHeight} x2={width - margin.right} y2={margin.top + chartHeight} stroke="#9ca3af" strokeWidth="1" />
                    <text x={20} y={height / 2} textAnchor="middle" transform={`rotate(-90, 20, ${height/2})`} fontSize="10" fill="#6b7280" fontWeight="bold">AVANCE (%)</text>
                    {data.map((d, i) => {
                        const percent = Math.min(d.percent, 100); 
                        const barH = (percent / 100) * chartHeight;
                        const x = margin.left + (i * barWidth) + (barPadding / 2);
                        const y = margin.top + chartHeight - barH;
                        const fullHeight = chartHeight;
                        const yFull = margin.top;
                        return (
                            <g key={i} className="group">
                                <rect x={x} y={yFull} width={effectiveBarWidth} height={fullHeight} fill="#e5e7eb" rx="2" className="dark:fill-gray-700 transition-colors stroke-gray-300 dark:stroke-gray-600" strokeWidth="0.5" />
                                <rect x={x} y={y} width={effectiveBarWidth} height={barH} fill={d.percent >= 100 ? "url(#barGradientComplete)" : "url(#barGradient)"} rx="2" className="transition-all duration-300 hover:opacity-90 cursor-pointer">
                                    <title>{d.name}: {d.percent.toFixed(2)}%</title>
                                </rect>
                                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <text x={x + effectiveBarWidth/2} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1f2937" className="dark:fill-white">{d.percent.toFixed(1)}%</text>
                                </g>
                                <text x={x + effectiveBarWidth/2} y={margin.top + chartHeight + 15} textAnchor="end" fontSize="10" fill="#4b5563" className="dark:fill-gray-400 font-medium" transform={`rotate(-45, ${x + effectiveBarWidth/2}, ${margin.top + chartHeight + 15})`}>{d.name}</text>
                            </g>
                        )
                    })}
                </svg>
            </div>
        </div>
    )
}

const ActivityProgressChart = ({ data }: { data: { name: string, executed: number, total: number, unit: string }[] }) => {
    if (!data.length) return null;
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mt-4">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-purple-600" /> Avance Físico por Especialidad
            </h3>
            <div className="space-y-4">
                {data.map((item, idx) => {
                    const percent = item.total > 0 ? (item.executed / item.total) * 100 : 0;
                    return (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{item.name}</span>
                                <span className="text-gray-500 font-mono">
                                    {item.executed.toLocaleString()} / {item.total.toLocaleString()} {item.unit} ({percent.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden relative">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-700" style={{ width: `${Math.min(percent, 100)}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ProgressOverTimeChart = ({ entries, dikes, budget }: { entries: ProgressEntry[], dikes: DikeConfig[], budget: BudgetSection[] }) => {
    const chartData = useMemo(() => {
        if (entries.length === 0) return [];

        // 1. Get date range
        const dates = entries.map(e => parseISO(e.date)).sort((a, b) => a.getTime() - b.getTime());
        const startDate = dates[0];
        const endDate = new Date(Math.max(dates[dates.length - 1].getTime(), new Date().getTime()));
        
        // Add some buffer to the end if needed, or just use the interval
        const interval = eachDayOfInterval({ start: startDate, end: endDate });

        // 2. Calculate total target (ML)
        const totalTargetML = dikes.reduce((acc, d) => acc + d.totalML, 0) || 1;

        // 3. Group executed progress by date
        const executedByDate: Record<string, number> = {};
        entries.forEach(entry => {
            const dateKey = entry.date;
            // We use a proxy for progress: the maximum length achieved in key activities
            // For simplicity in this chart, we'll sum the lengths of "403.A" (Conformación) as the main progress indicator
            // or just use the entry length if it represents a significant step.
            // Let's use the same logic as dikeProgressSummary: max of key activities
            if (["403.A", "404.A", "404.B", "402.B"].some(code => entry.partida.startsWith(code))) {
                executedByDate[dateKey] = (executedByDate[dateKey] || 0) + entry.longitud;
            }
        });

        // 4. Build cumulative data
        let cumulativeExecuted = 0;
        const totalDays = interval.length;
        
        return interval.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            cumulativeExecuted += executedByDate[dateKey] || 0;
            
            // Planned: Linear projection from 0 to 100% over the interval
            // In a real app, this would come from a baseline schedule
            const plannedPercent = (index / (totalDays - 1)) * 100;
            const executedPercent = (cumulativeExecuted / totalTargetML) * 100;

            return {
                date: format(day, 'dd MMM', { locale: es }),
                fullDate: dateKey,
                executed: Number(executedPercent.toFixed(2)),
                planned: Number(plannedPercent.toFixed(2))
            };
        });
    }, [entries, dikes]);

    if (entries.length === 0) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mt-4">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-blue-600" /> Curva S: Programado vs Ejecutado
                </h3>
                <div className="flex gap-4 text-[10px]">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-gray-400 border-t-2 border-dashed border-gray-400"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Programado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-blue-600"></div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Ejecutado</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorExecuted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="date" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(value) => `${value}%`}
                            domain={[0, 100]}
                        />
                        <Tooltip 
                            contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`${value}%`]}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="executed" 
                            stroke="#2563eb" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorExecuted)" 
                            name="Ejecutado"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="planned" 
                            stroke="#9ca3af" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={false}
                            name="Programado"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-gray-500 mt-4 italic text-center">
                * El avance programado se calcula linealmente sobre el periodo de ejecución actual.
            </p>
        </div>
    );
};

export const ProgressControlPanel: React.FC<ProgressControlPanelProps> = ({ 
  sectors,
  dikes, 
  budget,
  budgetBySector,
  entries,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  filterSectorId = "ALL",
  filterDikeId = "ALL"
}) => {
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDike, setSelectedDike] = useState(filterDikeId !== "ALL" ? filterDikeId : "");
  const [progInicio, setProgInicio] = useState("");
  const [progFin, setProgFin] = useState("");
  const [longitud, setLongitud] = useState(""); 
  const [tipoTerreno, setTipoTerreno] = useState<"B1"|"B2">("B2");
  const [tipoEnrocado, setTipoEnrocado] = useState<"TIPO 1"|"TIPO 2">("TIPO 2");
  const [selectedPartida, setSelectedPartida] = useState("");
  const [capa, setCapa] = useState("Capa 1");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [observaciones, setObservaciones] = useState("");

  // Searchable Partida State
  const [partidaSearch, setPartidaSearch] = useState("");
  const [showPartidaSuggestions, setShowPartidaSuggestions] = useState(false);
  const partidaRef = useRef<HTMLDivElement>(null);

  // Filter State
  const [activeSectorTab, setActiveSectorTab] = useState(filterSectorId !== "ALL" ? filterSectorId : "TODOS");
  const [filterDikeIdState, setFilterDikeIdState] = useState(filterDikeId !== "ALL" ? filterDikeId : "");

  // Sync with global filters
  useEffect(() => {
    if (filterSectorId !== "ALL") {
      setActiveSectorTab(filterSectorId);
    }
    if (filterDikeId !== "ALL") {
      setSelectedDike(filterDikeId);
      setFilterDikeIdState(filterDikeId);
    }
  }, [filterSectorId, filterDikeId]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  
  // NEW FILTERS
  const [filterTipoTerreno, setFilterTipoTerreno] = useState<string>("TODOS");
  const [filterTipoEnrocado, setFilterTipoEnrocado] = useState<string>("TODOS");
  const [filterPartida, setFilterPartida] = useState<string>("");
  const [filterCapa, setFilterCapa] = useState<string>("");
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProgressEntry, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // UI State
  const [expandedSectors, setExpandedSectors] = useState<Set<string>>(new Set());
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);

  // Click outside handler for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partidaRef.current && !partidaRef.current.contains(event.target as Node)) {
        setShowPartidaSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [pkErrors, setPkErrors] = useState<{inicio?: string, fin?: string}>({});
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedDike && dikes.length > 0) {
        setSelectedDike(dikes[0].id);
    }
  }, [dikes]);

  const parsePk = (pkStr: string): number => {
      if (!pkStr) return 0;
      if (pkStr.includes('+')) {
        const [km, m] = pkStr.split('+');
        return (parseFloat(km) * 1000) + parseFloat(m);
      }
      return parseFloat(pkStr) || 0;
  };

  useEffect(() => {
      const start = parsePk(progInicio);
      const end = parsePk(progFin);
      const diff = Math.abs(end - start);
      if (!isNaN(diff) && (progInicio || progFin)) {
          setLongitud(diff.toFixed(2));
      }
  }, [progInicio, progFin]);

  const showLengthWarning = useMemo(() => {
      const calculated = Math.abs(parsePk(progFin) - parsePk(progInicio));
      const manual = parseFloat(longitud);
      if (isNaN(manual) || isNaN(calculated) || calculated === 0) return false;
      
      const diff = Math.abs(manual - calculated);
      return diff > (calculated * 0.01);
  }, [progInicio, progFin, longitud]);

  const validatePkFormat = (val: string): boolean => {
    if (!val) return true;
    const cleanVal = val.trim();
    const regex = /^(\d+\s*\+\s*\d+(\.\d+)?|\d+(\.\d+)?)$/;
    return regex.test(cleanVal);
  };

  const handleProgInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProgInicio(val);
    if (val && !validatePkFormat(val)) setPkErrors(prev => ({...prev, inicio: "Formato inválido"}));
    else setPkErrors(prev => ({...prev, inicio: undefined}));
  };

  const handleProgFinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProgFin(val);
    if (val && !validatePkFormat(val)) setPkErrors(prev => ({...prev, fin: "Formato inválido"}));
    else setPkErrors(prev => ({...prev, fin: undefined}));
  };

  const handleAddEntry = () => {
      if (!progInicio || !progFin || !selectedPartida || !longitud) {
          alert("Por favor complete los campos obligatorios");
          return;
      }
      if (pkErrors.inicio || pkErrors.fin || !validatePkFormat(progInicio) || !validatePkFormat(progFin)) {
          alert("Formato de progresiva inválido.");
          return;
      }

      const newEntry: ProgressEntry = {
          id: Date.now().toString(),
          date,
          dikeId: selectedDike,
          progInicio,
          progFin,
          longitud: parseFloat(longitud),
          tipoTerreno,
          tipoEnrocado,
          partida: selectedPartida,
          intervencion: "REGISTRO MANUAL",
          capa,
          priority,
          completed: false,
          observaciones
      };
      onAddEntry(newEntry);
      setProgInicio(progFin); setProgFin(""); setPkErrors({}); setPartidaSearch("");
  };

  const handleCopyRow = (entry: ProgressEntry) => {
      setDate(entry.date); setSelectedDike(entry.dikeId); setProgInicio(entry.progInicio); setProgFin(entry.progFin);
      setLongitud(entry.longitud.toString()); setTipoTerreno(entry.tipoTerreno); setTipoEnrocado(entry.tipoEnrocado);
      setSelectedPartida(entry.partida); setPartidaSearch(entry.partida); setCapa(entry.capa); setPriority(entry.priority || 'medium'); setObservaciones(entry.observaciones); setPkErrors({});
  };

  const handleRowUpdate = (id: string, field: keyof ProgressEntry, value: any) => {
    if (!onUpdateEntry) return;
    const entryToUpdate = entries.find(e => e.id === id);
    if (!entryToUpdate) return;
    const updatedEntry = { ...entryToUpdate, [field]: value };
    if (field === 'progInicio' || field === 'progFin') {
        const start = field === 'progInicio' ? value : entryToUpdate.progInicio;
        const end = field === 'progFin' ? value : entryToUpdate.progFin;
        const len = Math.abs(parsePk(end) - parsePk(start));
        updatedEntry.longitud = parseFloat(len.toFixed(2));
    }
    onUpdateEntry(updatedEntry);
  };

  const toggleRowSelection = (id: string) => {
      const newSet = new Set(selectedRowIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedRowIds(newSet);
  };

  const handleDeleteSelected = () => {
      if (selectedRowIds.size === 0) return;
      if (window.confirm(`¿Está seguro de eliminar ${selectedRowIds.size} registros seleccionados?`)) {
          selectedRowIds.forEach(id => onDeleteEntry(id));
          setSelectedRowIds(new Set());
      }
  };

  const toggleSectorExpand = (sectorId: string) => {
      const newSet = new Set(expandedSectors);
      if (newSet.has(sectorId)) {
          newSet.delete(sectorId);
      } else {
          newSet.add(sectorId);
      }
      setExpandedSectors(newSet);
  };

  const handleSort = (key: keyof ProgressEntry) => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
      }));
  };

  const filteredEntries = entries.filter(entry => {
    const entryDike = dikes.find(d => d.id === entry.dikeId);
    const sectorId = entryDike?.sectorId;
    
    const matchSector = activeSectorTab === "TODOS" || sectorId === activeSectorTab;
    const matchDike = filterDikeIdState ? entry.dikeId === filterDikeIdState : true;
    const matchStart = filterStartDate ? entry.date >= filterStartDate : true;
    const matchEnd = filterEndDate ? entry.date <= filterEndDate : true;
    const matchTerreno = filterTipoTerreno === "TODOS" || entry.tipoTerreno === filterTipoTerreno;
    const matchEnrocado = filterTipoEnrocado === "TODOS" || entry.tipoEnrocado === filterTipoEnrocado;
    const matchPartida = filterPartida ? entry.partida.toLowerCase().includes(filterPartida.toLowerCase()) : true;
    const matchCapa = filterCapa ? entry.capa.toLowerCase().includes(filterCapa.toLowerCase()) : true;

    return matchSector && matchDike && matchStart && matchEnd && matchTerreno && matchEnrocado && matchPartida && matchCapa;
  });

  const sortedEntries = useMemo(() => {
      const sorted = [...filteredEntries];
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };

      sorted.sort((a, b) => {
          if (sortConfig.key === 'priority') {
              const aP = priorityOrder[a.priority || 'medium'];
              const bP = priorityOrder[b.priority || 'medium'];
              return sortConfig.direction === 'asc' ? aP - bP : bP - aP;
          }

          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];
          
          if (aValue === undefined || bValue === undefined) return 0;
          if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
      });
      return sorted;
  }, [filteredEntries, sortConfig]);

  const uniqueExecutedPartidas = useMemo(() => {
      const unique = new Set(entries.map(e => e.partida));
      return Array.from(unique).sort();
  }, [entries]);

  const sectorFactors = useMemo(() => {
      const factors: Record<string, { excavation: number, enrocado: number, relleno: number }> = {};
      const globalTotalLen = dikes.reduce((acc, d) => acc + d.totalML, 0) || 1;
      let globalVolExc = 0, globalVolEnr = 0, globalVolRel = 0;
      budget.forEach(sec => sec.groups.forEach(grp => grp.items.forEach(item => {
           if (item.code.includes("402.B") || item.code.includes("402.E")) globalVolExc += item.metrado;
           else if (item.code.includes("404")) globalVolEnr += item.metrado;
           else if (item.code.includes("413") || item.code.includes("412")) globalVolRel += item.metrado;
      })));
      const globalFactors = { excavation: globalVolExc / globalTotalLen, enrocado: globalVolEnr / globalTotalLen, relleno: globalVolRel / globalTotalLen };
      
      sectors.forEach(sector => {
          const sectorDikes = dikes.filter(d => d.sectorId === sector.id);
          const totalLen = sectorDikes.reduce((acc, d) => acc + d.totalML, 0) || 1;
          const sectorBudget = budgetBySector ? budgetBySector[sector.id] : undefined;
          if (sectorBudget && sectorBudget.length > 0) {
              let volExc = 0, volEnr = 0, volRel = 0;
              sectorBudget.forEach(sec => sec.groups.forEach(grp => grp.items.forEach(item => {
                  if (item.code.includes("402.B") || item.code.includes("402.E")) volExc += item.metrado;
                  else if (item.code.includes("404")) volEnr += item.metrado;
                  else if (item.code.includes("413") || item.code.includes("412")) volRel += item.metrado;
              })));
              factors[sector.id] = { excavation: volExc / totalLen, enrocado: volEnr / totalLen, relleno: volRel / totalLen };
          } else {
              factors[sector.id] = globalFactors;
          }
      });
      return factors;
  }, [sectors, dikes, budgetBySector, budget]);

  const summaryTotals = useMemo(() => {
      const totals = { excavacion_ml: 0, enrocado_ml: 0, relleno_ml: 0, excavacion_m3: 0, enrocado_m3: 0, relleno_m3: 0 };
      filteredEntries.forEach(entry => {
          const dike = dikes.find(d => d.id === entry.dikeId);
          const factors = dike ? sectorFactors[dike.sectorId] : { excavation: 0, enrocado: 0, relleno: 0 };
          if (entry.partida.includes("402.B") || entry.partida.includes("402.E")) {
              totals.excavacion_ml += entry.longitud; totals.excavacion_m3 += entry.longitud * (factors?.excavation || 0);
          } else if (entry.partida.includes("404")) {
              totals.enrocado_ml += entry.longitud; totals.enrocado_m3 += entry.longitud * (factors?.enrocado || 0);
          } else if (entry.partida.includes("413") || entry.partida.includes("412")) {
              totals.relleno_ml += entry.longitud; totals.relleno_m3 += entry.longitud * (factors?.relleno || 0);
          }
      });
      return totals;
  }, [filteredEntries, sectorFactors, dikes]);

  const dikeVolumeSummary = useMemo(() => {
      const relevantDikes = activeSectorTab === "TODOS" ? dikes : dikes.filter(d => d.sectorId === activeSectorTab);
      const targetDikes = filterDikeIdState ? relevantDikes.filter(d => d.id === filterDikeIdState) : relevantDikes;
      return targetDikes.map(dike => {
          const dikeEntries = filteredEntries.filter(e => e.dikeId === dike.id);
          const factors = sectorFactors[dike.sectorId] || { excavation: 0, enrocado: 0, relleno: 0 };
          const stats = { excavacion: { ml: 0, m3: 0 }, enrocado: { ml: 0, m3: 0 }, relleno: { ml: 0, m3: 0 } };
          dikeEntries.forEach(entry => {
              const len = entry.longitud;
              if (entry.partida.includes("402.B") || entry.partida.includes("402.E")) {
                  stats.excavacion.ml += len; stats.excavacion.m3 += len * factors.excavation;
              } else if (entry.partida.includes("404")) {
                  stats.enrocado.ml += len; stats.enrocado.m3 += len * factors.enrocado;
              } else if (entry.partida.includes("413") || entry.partida.includes("412")) {
                  stats.relleno.ml += len; stats.relleno.m3 += len * factors.relleno;
              }
          });
          const totalActivity = stats.excavacion.ml + stats.enrocado.ml + stats.relleno.ml;
          return { dike, stats, hasActivity: totalActivity > 0 };
      }).filter(item => item.hasActivity || filterDikeIdState);
  }, [dikes, filteredEntries, activeSectorTab, filterDikeIdState, sectorFactors]);

  const dikeProgressSummary = useMemo(() => {
      const relevantDikes = activeSectorTab === "TODOS" ? dikes : dikes.filter(d => d.sectorId === activeSectorTab);
      return relevantDikes.map(dike => {
          const dikeEntries = filteredEntries.filter(e => e.dikeId === dike.id);
          const typeSums: Record<string, number> = {};
          dikeEntries.forEach(e => { const code = e.partida.split(' ')[0]; if(!typeSums[code]) typeSums[code] = 0; typeSums[code] += e.longitud; });
          const executed = Math.max(typeSums["403.A"] || 0, typeSums["404.A"] || 0, typeSums["404.B"] || 0, typeSums["402.B"] || 0); 
          return { name: dike.name, total: dike.totalML, executed: executed, percent: dike.totalML > 0 ? (executed / dike.totalML) * 100 : 0 };
      }).sort((a, b) => b.percent - a.percent);
  }, [dikes, filteredEntries, activeSectorTab]);

  const activityProgressData = useMemo(() => {
      let totalExc = 0, totalEnr = 0, totalRel = 0;
      const calculateTotals = (b: BudgetSection[]) => {
          b.forEach(s => s.groups.forEach(g => g.items.forEach(i => {
               if (i.code.includes("402.B") || i.code.includes("402.E")) totalExc += i.metrado;
               else if (i.code.includes("404")) totalEnr += i.metrado;
               else if (i.code.includes("413") || i.code.includes("412")) totalRel += i.metrado;
          })));
      };
      if (activeSectorTab === "TODOS") calculateTotals(budget);
      else if (budgetBySector && budgetBySector[activeSectorTab]) calculateTotals(budgetBySector[activeSectorTab]);
      return [
          { name: "Excavación", executed: summaryTotals.excavacion_m3, total: totalExc, unit: "m³" },
          { name: "Enrocado", executed: summaryTotals.enrocado_m3, total: totalEnr, unit: "m³" },
          { name: "Relleno", executed: summaryTotals.relleno_m3, total: totalRel, unit: "m³" }
      ];
  }, [activeSectorTab, budget, budgetBySector, summaryTotals]);

  const selectedDikeProgress = useMemo(() => {
      if (!selectedDike) return 0;
      const dike = dikes.find(d => d.id === selectedDike);
      if (!dike || !dike.totalML) return 0;
      const dikeEntries = entries.filter(e => e.dikeId === selectedDike);
      const typeSums: Record<string, number> = {};
      dikeEntries.forEach(e => { const code = e.partida.split(' ')[0]; if(!typeSums[code]) typeSums[code] = 0; typeSums[code] += e.longitud; });
      const executed = Math.max(typeSums["403.A"] || 0, typeSums["404.A"] || 0, typeSums["404.B"] || 0, typeSums["402.B"] || 0); 
      return Math.min(100, (executed / dike.totalML) * 100);
  }, [selectedDike, dikes, entries]);

  const handleTabChange = (sectorId: string) => { 
    setActiveSectorTab(sectorId); 
    setFilterDikeIdState(""); 
    
    // Also update the form selection if the current dike is not in the new sector
    if (sectorId !== "TODOS") {
        const sectorDikes = dikes.filter(d => d.sectorId === sectorId);
        if (sectorDikes.length > 0 && !sectorDikes.find(d => d.id === selectedDike)) {
            setSelectedDike(sectorDikes[0].id);
        }
    }
  };
  const dikesInActiveSector = activeSectorTab === "TODOS" ? dikes : dikes.filter(d => d.sectorId === activeSectorTab);
  const allPartidas = budget.flatMap(s => s.groups.flatMap(g => g.items));

  const filteredPartidaSuggestions = useMemo(() => {
    if (!partidaSearch) return [];
    const search = partidaSearch.toLowerCase();
    return allPartidas.filter(p => 
      p.code.toLowerCase().includes(search) || 
      p.description.toLowerCase().includes(search)
    ).slice(0, 10); // Limit to 10 suggestions
  }, [allPartidas, partidaSearch]);

  const partidaOptions = allPartidas.map(p => ({ value: p.code, label: `${p.code} - ${p.description}` }));
  const dikeOptions = dikes.map(d => ({ value: d.id, label: d.name }));
  const formatVolume = (val: number) => val.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) { const allIds = new Set(filteredEntries.map(e => e.id)); setSelectedRowIds(allIds); } else { setSelectedRowIds(new Set()); }
  };
  const areAllSelected = filteredEntries.length > 0 && selectedRowIds.size === filteredEntries.length;

  const handleExportExcel = () => {
      const exportData = sortedEntries.map(e => {
          const dike = dikes.find(d => d.id === e.dikeId);
          const dikeName = dike?.name || e.dikeId;
          const sectorName = sectors.find(s => s.id === dike?.sectorId)?.name || "-";
          return {
            "Fecha": e.date,
            "Sector": sectorName,
            "Dique": dikeName,
            "Prog. Inicio": e.progInicio,
            "Prog. Fin": e.progFin,
            "Longitud (m)": e.longitud,
            "Tipo Terreno": e.tipoTerreno,
            "Tipo Enrocado": e.tipoEnrocado,
            "Partida": e.partida,
            "Capa": e.capa,
            "Observaciones": e.observaciones
          };
      });
      
      ExcelService.exportTable(exportData, `Historial_Avance_${activeSectorTab}`, "Avance");
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof ProgressEntry }) => {
      if (sortConfig.key !== columnKey) return <div className="w-3 h-3 opacity-0 group-hover:opacity-30"><ChevronDown className="w-3 h-3"/></div>;
      return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  const SortableHeader = ({ label, columnKey, align="left" }: { label: string, columnKey: keyof ProgressEntry, align?: "left" | "right" | "center" }) => (
      <th 
        className={`px-3 py-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group select-none text-${align}`}
        onClick={() => handleSort(columnKey)}
      >
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
            {label}
            <SortIcon columnKey={columnKey} />
        </div>
      </th>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
         {/* Form Panel */}
         <div className="lg:col-span-1 space-y-3">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                 <div className="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                     <HardHat className="w-4 h-4 text-orange-500" />
                     <h3 className="font-bold text-gray-900 dark:text-white text-sm">Registro de Avance Real</h3>
                 </div>
                 <div className="space-y-2.5">
                     <div className="grid grid-cols-2 gap-2.5">
                        <Input label="Fecha" type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs py-1" />
                        <div>
                             <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Dique / Sector</label>
                             <select className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs" value={selectedDike} onChange={e => setSelectedDike(e.target.value)}>
                                 {dikesInActiveSector.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                             </select>
                             {selectedDike && (
                                 <div className="mt-1.5">
                                     <div className="flex justify-between text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">
                                         <span>Avance</span>
                                         <span>{selectedDikeProgress.toFixed(1)}%</span>
                                     </div>
                                     <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                         <div 
                                             className={`h-full rounded-full transition-all duration-500 ${selectedDikeProgress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                                             style={{ width: `${selectedDikeProgress}%` }}
                                         ></div>
                                     </div>
                                 </div>
                             )}
                        </div>
                     </div>
                     <div className="grid grid-cols-3 gap-2.5">
                        <Input 
                            label="Prog. Inicio" 
                            placeholder="0+000" 
                            value={progInicio} 
                            onChange={handleProgInicioChange} 
                            error={pkErrors.inicio}
                            className="text-xs py-1"
                        />
                        <Input 
                            label="Prog. Fin" 
                            placeholder="0+020" 
                            value={progFin} 
                            onChange={handleProgFinChange} 
                            error={pkErrors.fin}
                            className="text-xs py-1"
                        />
                        <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Longitud (m)</label>
                            <div className="relative">
                                <Input 
                                    label="" 
                                    type="number"
                                    placeholder="0.00" 
                                    value={longitud}
                                    onChange={(e) => setLongitud(e.target.value)}
                                    className="text-xs py-1 font-mono text-center"
                                />
                                {showLengthWarning && (
                                    <div className="absolute top-full left-0 w-full text-[9px] text-yellow-600 flex items-center justify-center gap-1 mt-0.5">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Discrepancia &gt; 1%
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Tipo Terreno</label>
                            <select className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs" value={tipoTerreno} onChange={e => setTipoTerreno(e.target.value as any)}>
                                <option value="B1">B1 (Normal)</option>
                                <option value="B2">B2 (Refuerzo)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Tipo Enrocado</label>
                            <select className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs" value={tipoEnrocado} onChange={e => setTipoEnrocado(e.target.value as any)}>
                                <option value="TIPO 1">TIPO 1</option>
                                <option value="TIPO 2">TIPO 2</option>
                            </select>
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1">Partida Ejecutada</label>
                        <div className="relative" ref={partidaRef}>
                            <div className="flex gap-1">
                                <input 
                                    type="text"
                                    className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="Buscar partida por código o nombre..."
                                    value={partidaSearch || selectedPartida}
                                    onChange={(e) => {
                                        setPartidaSearch(e.target.value);
                                        setSelectedPartida(e.target.value);
                                        setShowPartidaSuggestions(true);
                                    }}
                                    onFocus={() => setShowPartidaSuggestions(true)}
                                />
                                {selectedPartida && (
                                    <button 
                                        onClick={() => { setSelectedPartida(""); setPartidaSearch(""); }}
                                        className="p-1 text-gray-400 hover:text-red-500"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                            
                            {showPartidaSuggestions && filteredPartidaSuggestions.length > 0 && (
                                <div className="absolute z-[100] left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                    {filteredPartidaSuggestions.map(p => (
                                        <button
                                            key={p.id}
                                            className="w-full text-left px-3 py-2 text-[10px] hover:bg-blue-50 dark:hover:bg-blue-900/30 border-b border-gray-50 dark:border-gray-700 last:border-0"
                                            onClick={() => {
                                                setSelectedPartida(p.code);
                                                setPartidaSearch(p.code);
                                                setShowPartidaSuggestions(false);
                                            }}
                                        >
                                            <div className="font-bold text-blue-700 dark:text-blue-400">{p.code}</div>
                                            <div className="text-gray-600 dark:text-gray-400 truncate">{p.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-2.5">
                         <Input label="Capa" placeholder="Ej: Capa 1" value={capa} onChange={e => setCapa(e.target.value)} className="text-xs py-1" />
                         <Input label="Observaciones" placeholder="Opcional" value={observaciones} onChange={e => setObservaciones(e.target.value)} className="text-xs py-1" />
                     </div>
                     <Button onClick={handleAddEntry} className="w-full text-xs h-8">
                         <Plus className="w-3 h-3" /> Agregar Avance
                     </Button>
                 </div>
             </div>
         </div>

         {/* Grid Panel */}
         <div className="lg:col-span-2 space-y-4">
             <div className="flex flex-col gap-4">
                 {/* Sector Tabs */}
                 <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 rounded-xl">
                     <button onClick={() => handleTabChange("TODOS")} className={`px-3 py-1.5 text-[10px] font-medium rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${activeSectorTab === "TODOS" ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                        <Layout className="w-3 h-3" /> Todos
                     </button>
                     {sectors.map(sector => (
                         <button key={sector.id} onClick={() => handleTabChange(sector.id)} className={`px-3 py-1.5 text-[10px] font-medium rounded-lg transition-all whitespace-nowrap ${activeSectorTab === sector.id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            {sector.name}
                         </button>
                     ))}
                 </div>

                 {/* Key Metrics */}
                 <div className="grid grid-cols-3 gap-3">
                     <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between relative overflow-hidden">
                         <div className="relative z-10">
                             <p className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold uppercase flex items-center gap-1"><Pickaxe className="w-3 h-3" /> Excavación (402)</p>
                             <p className="text-lg font-bold text-blue-800 dark:text-blue-100 leading-tight mt-1">~{formatVolume(summaryTotals.excavacion_m3)} <span className="text-[10px] font-normal">m³</span></p>
                             <p className="text-[10px] text-blue-500 dark:text-blue-400">Longitud: {summaryTotals.excavacion_ml.toFixed(2)} ml</p>
                         </div>
                     </div>
                     <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl border border-yellow-100 dark:border-yellow-800 flex items-center justify-between relative overflow-hidden">
                         <div className="relative z-10">
                             <p className="text-[10px] text-yellow-600 dark:text-yellow-300 font-semibold uppercase flex items-center gap-1"><Mountain className="w-3 h-3" /> Enrocado (404)</p>
                             <p className="text-lg font-bold text-yellow-800 dark:text-yellow-100 leading-tight mt-1">~{formatVolume(summaryTotals.enrocado_m3)} <span className="text-[10px] font-normal">m³</span></p>
                             <p className="text-[10px] text-yellow-600 dark:text-yellow-400">Longitud: {summaryTotals.enrocado_ml.toFixed(2)} ml</p>
                         </div>
                     </div>
                     <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800 flex items-center justify-between relative overflow-hidden">
                         <div className="relative z-10">
                             <p className="text-[10px] text-green-600 dark:text-green-300 font-semibold uppercase flex items-center gap-1"><Shovel className="w-3 h-3" /> Relleno (412/413)</p>
                             <p className="text-lg font-bold text-green-800 dark:text-green-100 leading-tight mt-1">~{formatVolume(summaryTotals.relleno_m3)} <span className="text-[10px] font-normal">m³</span></p>
                             <p className="text-[10px] text-green-500 dark:text-green-400">Longitud: {summaryTotals.relleno_ml.toFixed(2)} ml</p>
                         </div>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    <ProgressChart data={dikeProgressSummary} />
                    <ActivityProgressChart data={activityProgressData} />
                    <ProgressOverTimeChart entries={entries} dikes={dikes} budget={budget} />
                 </div>
                 
                 <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                     <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase text-gray-500">
                         <Activity className="w-3 h-3" /> Resumen de Volúmenes Estimados por Dique
                     </div>
                     <div className="overflow-x-auto">
                         <table className="w-full text-[10px] text-gray-700 dark:text-gray-300">
                             <thead className="bg-gray-100 dark:bg-gray-700/50 text-left">
                                 <tr>
                                     <th className="px-2 py-1.5 rounded-l-lg">Dique</th>
                                     <th className="px-2 py-1.5 text-right">Excavación (Est.)</th>
                                     <th className="px-2 py-1.5 text-right">Enrocado (Est.)</th>
                                     <th className="px-2 py-1.5 text-right rounded-r-lg">Relleno (Est.)</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                 {dikeVolumeSummary.length === 0 ? (
                                     <tr><td colSpan={4} className="text-center py-4 italic text-gray-400">Sin actividad registrada</td></tr>
                                 ) : (
                                     <>
                                         {dikeVolumeSummary.map(item => (
                                             <tr key={item.dike.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                 <td className="px-2 py-1.5 font-medium">{item.dike.name}</td>
                                                 <td className="px-2 py-1.5 text-right">
                                                     <div className="font-bold text-blue-700 dark:text-blue-400">~{formatVolume(item.stats.excavacion.m3)} m³</div>
                                                     <div className="text-[9px] text-gray-400">{item.stats.excavacion.ml.toFixed(1)} ml</div>
                                                 </td>
                                                 <td className="px-2 py-1.5 text-right">
                                                     <div className="font-bold text-yellow-700 dark:text-yellow-400">~{formatVolume(item.stats.enrocado.m3)} m³</div>
                                                     <div className="text-[9px] text-gray-400">{item.stats.enrocado.ml.toFixed(1)} ml</div>
                                                 </td>
                                                 <td className="px-2 py-1.5 text-right">
                                                     <div className="font-bold text-green-700 dark:text-green-400">~{formatVolume(item.stats.relleno.m3)} m³</div>
                                                     <div className="text-[9px] text-gray-400">{item.stats.relleno.ml.toFixed(1)} ml</div>
                                                 </td>
                                             </tr>
                                         ))}
                                         <tr className="bg-gray-50 dark:bg-gray-700/30 font-bold border-t border-gray-200 dark:border-gray-600">
                                             <td className="px-2 py-2 text-gray-600 dark:text-gray-400 uppercase">Total</td>
                                             <td className="px-2 py-2 text-right text-blue-800 dark:text-blue-300">
                                                 ~{formatVolume(dikeVolumeSummary.reduce((acc, item) => acc + item.stats.excavacion.m3, 0))} m³
                                             </td>
                                             <td className="px-2 py-2 text-right text-yellow-800 dark:text-yellow-300">
                                                 ~{formatVolume(dikeVolumeSummary.reduce((acc, item) => acc + item.stats.enrocado.m3, 0))} m³
                                             </td>
                                             <td className="px-2 py-2 text-right text-green-800 dark:text-green-300">
                                                 ~{formatVolume(dikeVolumeSummary.reduce((acc, item) => acc + item.stats.relleno.m3, 0))} m³
                                             </td>
                                         </tr>
                                     </>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>

             {/* Grid Table */}
             <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col min-h-[400px]">
                 <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 space-y-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Historial de Ejecución</h3>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleExportExcel} variant="outline" className="text-[10px] h-6 px-3 bg-white hover:bg-blue-50 border-blue-200 text-blue-700">
                                <FileSpreadsheet className="w-3 h-3 mr-1" /> Exportar a Excel
                            </Button>
                            {selectedRowIds.size > 0 && (
                                <button 
                                    onClick={handleDeleteSelected}
                                    className="flex items-center px-2 py-0.5 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
                                >
                                    <Trash2 className="w-3 h-3 mr-1" /> Eliminar ({selectedRowIds.size})
                                </button>
                            )}
                            <div className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                                {filteredEntries.length} Registros
                            </div>
                        </div>
                    </div>

                    {/* Filters Toolbar */}
                    <div className="flex flex-wrap gap-2 items-end p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                                <Filter className="w-2.5 h-2.5" /> Sector
                            </label>
                            <select 
                                className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                value={activeSectorTab}
                                onChange={e => handleTabChange(e.target.value)}
                            >
                                <option value="TODOS">Todos los Sectores</option>
                                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="flex-1 min-w-[140px]">
                            <label className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                                <Filter className="w-2.5 h-2.5" /> Dique
                            </label>
                            <select 
                                className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                value={filterDikeIdState}
                                onChange={e => setFilterDikeIdState(e.target.value)}
                            >
                                <option value="">{activeSectorTab === "TODOS" ? "Todos (Global)" : "Todos (Sector Actual)"}</option>
                                {dikesInActiveSector.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="w-[110px]">
                            <label className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Desde
                            </label>
                            <input 
                                type="date" 
                                className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                value={filterStartDate}
                                onChange={e => setFilterStartDate(e.target.value)}
                            />
                        </div>
                        <div className="w-[110px]">
                            <label className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Hasta
                            </label>
                            <input 
                                type="date" 
                                className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                value={filterEndDate}
                                onChange={e => setFilterEndDate(e.target.value)}
                            />
                        </div>

                        <div className="min-w-[120px]">
                            <label className="text-[9px] uppercase font-black text-gray-400 mb-1 flex items-center gap-1.5 tracking-widest">
                                <Mountain className="w-3 h-3 text-blue-500" /> Terreno
                            </label>
                            <div className="relative group">
                                <select 
                                    className="block w-full pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
                                    value={filterTipoTerreno}
                                    onChange={e => setFilterTipoTerreno(e.target.value)}
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\' stroke-width=\'2\'%3e%3cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                                >
                                    <option value="TODOS">TODOS</option>
                                    <option value="B1">B1</option>
                                    <option value="B2">B2</option>
                                </select>
                            </div>
                        </div>

                        <div className="min-w-[120px]">
                            <label className="text-[9px] uppercase font-black text-gray-400 mb-1 flex items-center gap-1.5 tracking-widest">
                                <Activity className="w-3 h-3 text-blue-500" /> Enrocado
                            </label>
                            <div className="relative group">
                                <select 
                                    className="block w-full pl-3 pr-8 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
                                    value={filterTipoEnrocado}
                                    onChange={e => setFilterTipoEnrocado(e.target.value)}
                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\' stroke-width=\'2\'%3e%3cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em 1em' }}
                                >
                                    <option value="TODOS">TODOS</option>
                                    <option value="TIPO 1">TIPO 1</option>
                                    <option value="TIPO 2">TIPO 2</option>
                                </select>
                            </div>
                        </div>

                        <div className="min-w-[100px]">
                            <label className="text-[9px] uppercase font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                                <Layers className="w-2.5 h-2.5" /> Capa
                            </label>
                            <input 
                                type="text"
                                className="w-full text-[10px] border border-gray-300 dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                value={filterCapa}
                                onChange={e => setFilterCapa(e.target.value)}
                                placeholder="Buscar..."
                            />
                        </div>

                        {(filterDikeIdState || filterStartDate || filterEndDate || activeSectorTab !== "TODOS" || filterTipoTerreno !== "TODOS" || filterTipoEnrocado !== "TODOS" || filterPartida || filterCapa) && (
                            <button 
                                onClick={() => {
                                    setFilterDikeIdState(""); 
                                    setFilterStartDate(""); 
                                    setFilterEndDate("");
                                    setActiveSectorTab("TODOS");
                                    setFilterTipoTerreno("TODOS");
                                    setFilterTipoEnrocado("TODOS");
                                    setFilterPartida("");
                                    setFilterCapa("");
                                }}
                                className="h-[26px] px-2 bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] rounded border border-gray-300 dark:border-gray-600 shadow-sm flex items-center"
                                title="Limpiar Filtros"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                 </div>

                 <div className="overflow-auto flex-1">
                     <table className="w-full text-xs text-left">
                         <thead className="text-[10px] text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300 sticky top-0 z-10">
                             <tr>
                                 <SortableHeader label="Fecha" columnKey="date" />
                                 <SortableHeader label="Dique" columnKey="dikeId" />
                                 <SortableHeader label="Tramo (Inicio - Fin)" columnKey="progInicio" />
                                 <SortableHeader label="Long. (m)" columnKey="longitud" align="right" />
                                 <th className="px-3 py-2 text-left align-top">
                                    <div className="flex flex-col gap-1">
                                        <div 
                                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleSort('tipoTerreno')}
                                        >
                                            Detalles Téc.
                                            <SortIcon columnKey="tipoTerreno" />
                                        </div>
                                        <select 
                                            value={filterTipoTerreno}
                                            onChange={(e) => setFilterTipoTerreno(e.target.value)}
                                            className="text-[9px] border border-gray-300 dark:border-gray-600 rounded p-0.5 bg-white dark:bg-gray-800 font-normal w-full max-w-[140px] text-gray-600"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="TODOS">Todos Terrenos</option>
                                            <option value="B1">B1</option>
                                            <option value="B2">B2</option>
                                        </select>
                                        <select 
                                            value={filterTipoEnrocado}
                                            onChange={(e) => setFilterTipoEnrocado(e.target.value)}
                                            className="text-[9px] border border-gray-300 dark:border-gray-600 rounded p-0.5 bg-white dark:bg-gray-800 font-normal w-full max-w-[140px] text-gray-600"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="TODOS">Todos Enrocados</option>
                                            <option value="TIPO 1">TIPO 1</option>
                                            <option value="TIPO 2">TIPO 2</option>
                                        </select>
                                    </div>
                                 </th>
                                 <th className="px-3 py-2 text-left align-top">
                                    <div className="flex flex-col gap-1">
                                        <div 
                                            className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                                            onClick={() => handleSort('partida')}
                                        >
                                            Partida / Capa
                                            <SortIcon columnKey="partida" />
                                        </div>
                                        <select 
                                            value={filterPartida}
                                            onChange={(e) => setFilterPartida(e.target.value)}
                                            className="text-[9px] border border-gray-300 dark:border-gray-600 rounded p-0.5 bg-white dark:bg-gray-800 font-normal w-full max-w-[140px] text-gray-600"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="">Todas las Partidas</option>
                                            {uniqueExecutedPartidas.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={filterCapa}
                                            onChange={(e) => setFilterCapa(e.target.value)}
                                            placeholder="Filtrar Capa..."
                                            className="text-[9px] border border-gray-300 dark:border-gray-600 rounded p-0.5 bg-white dark:bg-gray-800 font-normal w-full max-w-[140px] text-gray-600"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                 </th>
                                 <SortableHeader label="Observaciones" columnKey="observaciones" />
                                 <th className="px-3 py-2 text-center">
                                     <div className="flex items-center justify-center gap-1">
                                         <span>Acción</span>
                                         <input 
                                             type="checkbox" 
                                             checked={areAllSelected}
                                             onChange={handleToggleSelectAll}
                                             className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                                             title="Seleccionar todos para eliminar"
                                         />
                                     </div>
                                 </th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                             {sortedEntries.length === 0 ? (
                                 <tr>
                                     <td colSpan={8} className="text-center py-8 text-gray-500">
                                         <div className="flex flex-col items-center gap-1">
                                             <Search className="w-6 h-6 text-gray-300" />
                                             <p className="text-xs">
                                                 {entries.length === 0 
                                                    ? "No hay registros." 
                                                    : "Sin resultados."}
                                             </p>
                                         </div>
                                     </td>
                                 </tr>
                             ) : (
                                 sortedEntries.map(entry => (
                                     <tr 
                                        key={entry.id} 
                                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                            selectedRowIds.has(entry.id) 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' 
                                            : ''
                                        }`}
                                     >
                                         <td className="px-3 py-1.5 whitespace-nowrap text-[10px] w-[100px]">
                                             <ProgressEditableCell 
                                                value={entry.date} 
                                                onChange={(v) => handleRowUpdate(entry.id, 'date', v)} 
                                                type="date"
                                             />
                                         </td>
                                         <td className="px-3 py-1.5 font-medium text-blue-600 text-[10px] w-[140px]">
                                             <ProgressEditableSelect 
                                                 value={entry.dikeId}
                                                 onChange={(v) => handleRowUpdate(entry.id, 'dikeId', v)}
                                                 options={dikeOptions}
                                             />
                                         </td>
                                         <td className="px-3 py-1.5 whitespace-nowrap font-mono text-[10px] w-[160px]">
                                             <div className="flex items-center gap-1">
                                                 <ProgressEditableCell 
                                                    value={entry.progInicio}
                                                    onChange={(v) => handleRowUpdate(entry.id, 'progInicio', v)}
                                                    placeholder="0+000"
                                                    align="right"
                                                 />
                                                 <span>-</span>
                                                 <ProgressEditableCell 
                                                    value={entry.progFin}
                                                    onChange={(v) => handleRowUpdate(entry.id, 'progFin', v)}
                                                    placeholder="0+100"
                                                    align="right"
                                                 />
                                             </div>
                                         </td>
                                         <td className="px-3 py-1.5 text-[10px] w-[80px]">
                                             <ProgressEditableCell 
                                                value={entry.longitud}
                                                onChange={(v) => handleRowUpdate(entry.id, 'longitud', parseFloat(v) || 0)}
                                                type="number"
                                                isNumeric
                                                align="right"
                                                className="font-bold"
                                             />
                                         </td>
                                         <td className="px-3 py-1.5 w-[160px]">
                                             <div className="flex gap-1 flex-col text-[10px]">
                                                 <ProgressEditableSelect 
                                                     value={entry.tipoTerreno}
                                                     onChange={(v) => handleRowUpdate(entry.id, 'tipoTerreno', v)}
                                                     options={[{value: 'B1', label: 'B1'}, {value: 'B2', label: 'B2'}]}
                                                 />
                                                 <ProgressEditableSelect 
                                                     value={entry.tipoEnrocado}
                                                     onChange={(v) => handleRowUpdate(entry.id, 'tipoEnrocado', v)}
                                                     options={[{value: 'TIPO 1', label: 'TIPO 1'}, {value: 'TIPO 2', label: 'TIPO 2'}]}
                                                 />
                                             </div>
                                         </td>
                                         <td className="px-3 py-1.5 max-w-[200px]">
                                             <div className="flex flex-col gap-1">
                                                 <ProgressEditableSelect 
                                                     value={entry.partida}
                                                     onChange={(v) => handleRowUpdate(entry.id, 'partida', v)}
                                                     options={partidaOptions}
                                                 />
                                                 <ProgressEditableCell 
                                                     value={entry.capa} 
                                                     onChange={(v) => handleRowUpdate(entry.id, 'capa', v)}
                                                     placeholder="Capa"
                                                 />
                                             </div>
                                         </td>
                                         <td className="px-3 py-1.5 max-w-[150px]">
                                             <ProgressEditableCell 
                                                value={entry.observaciones}
                                                onChange={(v) => handleRowUpdate(entry.id, 'observaciones', v)}
                                                placeholder="-"
                                             />
                                         </td>
                                         <td className="px-3 py-1.5 text-center">
                                             <div className="flex items-center justify-center gap-1.5">
                                                 <input 
                                                     type="checkbox" 
                                                     className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                     checked={selectedRowIds.has(entry.id)}
                                                     onChange={() => toggleRowSelection(entry.id)}
                                                 />
                                                 <button 
                                                    onClick={() => handleCopyRow(entry)} 
                                                    className="text-blue-500 hover:text-blue-700 transition-colors p-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    title="Copiar"
                                                 >
                                                     <Copy className="w-3.5 h-3.5" />
                                                 </button>
                                                 <button 
                                                    onClick={() => onDeleteEntry(entry.id)} 
                                                    className="text-red-500 hover:text-red-700 transition-colors p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Eliminar"
                                                 >
                                                     <Trash2 className="w-3.5 h-3.5" />
                                                 </button>
                                             </div>
                                         </td>
                                     </tr>
                                 ))
                             )}
                         </tbody>
                     </table>
                 </div>
             </div>
         </div>
      </div>
    </div>
  );
};
