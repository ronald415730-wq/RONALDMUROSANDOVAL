
import React, { useState, useMemo, useRef, useEffect } from "react";
import { MeasurementEntry, DikeConfig, Sector, BudgetSection } from "../types";
import { ExcelService } from "../services/excelService";
import { Trash2, Upload, AlertCircle, PlusCircle, Database, Settings, Filter, FileText, ChevronDown, FileSpreadsheet, ArrowUp, ArrowDown, X, FileUp, CheckSquare, Download, HelpCircle, Info } from "lucide-react";
import { Button } from "./Button";

interface DataEntryGridProps {
  dike: DikeConfig | null;
  entries: MeasurementEntry[];
  customColumns: string[];
  sectors?: Sector[];
  allDikes?: DikeConfig[];
  budget?: BudgetSection[];
  onSelectDike?: (dikeId: string) => void;
  onAddEntry: (entry: MeasurementEntry) => void;
  onUpdateEntries: (entries: MeasurementEntry[]) => void;
  onDeleteEntry: (id: string) => void;
  onAddColumn: (name: string) => void;
  onDeleteColumn: (name: string) => void;
  onFullImport: (data: any) => void;
  filterSectorId?: string;
  filterDikeId?: string;
}

const ColumnImport = ({ onImport, label }: { onImport: (vals: string[]) => void, label?: string }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     
     const reader = new FileReader();
     reader.onload = (evt) => {
         const text = evt.target?.result as string;
         if (text.includes("\0")) {
             alert("El archivo parece ser binario. Use archivos de texto (.csv, .txt).");
             return;
         }
         // Empieza en la tercera fila y usa coma como delimitador
         const lines = text.split(/\r?\n/).slice(2).map(l => {
             const cleanLine = l.trim();
             if (!cleanLine) return "";
             const parts = cleanLine.split(",");
             let val = parts[0].trim();
             if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
             return val;
         }).filter(l => l !== "");
         
         if (lines.length > 0) onImport(lines);
         else alert("No se encontraron datos válidos.");
     };
     reader.readAsText(file);
     if(fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="inline-flex">
        <button 
           onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} 
           className="text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded p-0.5 transition-all border border-white/10"
           title={`Importar datos para ${label}`}
        >
            <Upload className="w-2.5 h-2.5" />
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.txt" onChange={handleFileChange} />
    </div>
  )
}

const GridEditableCell = ({ 
    value, 
    onChange, 
    className = "", 
    type = "number",
    validate,
    errorMessage
}: { 
    value: string | number, 
    onChange: (val: string | number) => void, 
    className?: string,
    type?: "text" | "number",
    validate?: (val: string) => boolean,
    errorMessage?: string
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localVal, setLocalVal] = useState(value?.toString() || "");
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => { setLocalVal(value?.toString() || ""); }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const isValid = validate ? validate(localVal) : true;

    const commit = () => {
        setIsEditing(false);
        if (!isValid) {
            setLocalVal(value?.toString() || "");
            return;
        }
        
        if (type === 'number') {
            const cleanVal = localVal.replace(/,/g, '');
            const num = parseFloat(cleanVal);
            if (!isNaN(num)) {
                if (num !== value) onChange(num);
            } else if (localVal === "") {
                if (value !== 0) onChange(0);
            } else {
                setLocalVal(value?.toString() || "");
            }
        } else {
            if (localVal !== value) onChange(localVal);
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
            <div className="relative w-full h-full min-h-[20px]">
                <input 
                    ref={inputRef}
                    type="text"
                    className={`w-full h-full px-1 bg-white border border-blue-500 outline-none text-[8px] font-mono shadow-sm ${type === 'number' ? 'text-right' : 'text-left'} absolute inset-0 z-50 ${!isValid ? 'bg-red-50 text-red-700 border-red-500' : ''}`}
                    value={localVal}
                    onChange={e => setLocalVal(e.target.value)}
                    onBlur={commit}
                    onKeyDown={handleKeyDown}
                />
            </div>
        )
    }
    return (
        <div 
            onClick={() => setIsEditing(true)} 
            className={`w-full h-full px-1 py-0.5 cursor-text hover:bg-blue-50/80 transition-colors relative min-h-[20px] flex items-center border border-transparent hover:border-blue-200 ${type === 'number' ? 'justify-end' : 'justify-start'} ${className}`}
        >
            {(value !== undefined && value !== null && value !== "") 
                ? (typeof value === 'number' ? value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 3}) : value) 
                : <span className="text-gray-300">-</span>}
            {!isValid && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-red-500 pr-1" title={errorMessage}>
                    <AlertCircle className="w-2 h-2" />
                </div>
            )}
        </div>
    );
}

const GridEditableSelect = ({ 
    value, 
    onChange, 
    options, 
    className = ""
}: { 
    value: string, 
    onChange: (val: string) => void, 
    options: string[],
    className?: string
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        if (isEditing && selectRef.current) selectRef.current.focus();
    }, [isEditing]);

    const handleBlur = () => setIsEditing(false);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange(e.target.value);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <select 
                ref={selectRef}
                value={value || ""} 
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full h-full bg-white border border-blue-500 outline-none text-[8px] font-bold absolute inset-0 z-50 ${className}`}
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)} 
            className={`w-full h-full px-2 py-1.5 cursor-pointer hover:bg-blue-50 transition-all relative flex items-center justify-center min-h-[28px] font-bold text-[9px] ${className}`}
        >
            {value}
        </div>
    );
};

export const DataEntryGrid: React.FC<DataEntryGridProps> = ({ 
    dike, 
    entries, 
    customColumns,
    onAddEntry, 
    onUpdateEntries, 
    onDeleteEntry,
    onAddColumn,
    onDeleteColumn,
    filterSectorId = "ALL",
    filterDikeId = "ALL"
}) => {
  const [newPk, setNewPk] = useState("");
  const [newDistancia, setNewDistancia] = useState("");
  const [newTipoEnrocado, setNewTipoEnrocado] = useState("TIPO 2");
  const [newTipoTerreno, setNewTipoTerreno] = useState("B2");
  const [newIntervencion, setNewIntervencion] = useState("PROTECCION DE TALUD CON ENROCADO");
  
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [columnAliases, setColumnAliases] = useState<Record<string, string>>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [pkError, setPkError] = useState<string | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const ALL_COLUMNS = [
    { id: 'pk', label: 'Progresiva' },
    { id: 'distancia', label: 'DIST.', unit: 'ml' },
    { id: 'tipoTerreno', label: 'TERRENO' },
    { id: 'tipoEnrocado', label: 'ENROCADO' },
    { id: 'intervencion', label: 'INTERVENCION' },
    { id: 'item403A', label: '403.A RELLENO', unit: 'm2' },
    { id: 'item403A_MM', label: '403.A RELLENO M.M.', unit: 'm2' },
    { id: 'item402B', label: '402.B CORTE TALUD', unit: 'm2' },
    { id: 'item402B_MM', label: '402.B CORTE TALUD M.M.', unit: 'm2' },
    { id: 'item402E', label: '402.E CORTE UÑA', unit: 'm2' },
    { id: 'item402E_MM', label: '402.E CORTE UÑA M.M.', unit: 'm2' },
    { id: 'item404A', label: '404.A/404.B ENROCADO TALUD', unit: 'm2' },
    { id: 'item404A_MM', label: '404.A/404.B ENROCADO TALUD M.M.', unit: 'm2' },
    { id: 'item404D', label: '404.D/404.E ENROCADO UÑA', unit: 'm2' },
    { id: 'item404D_MM', label: '404.D/404.E ENROCADO UÑA M.M.', unit: 'm2' },
    { id: 'item413A', label: '413.A RELLENO MATERIAL PROPIO', unit: 'm2' },
    { id: 'item413A_MM', label: '413.A RELLENO MATERIAL PROPIO M.M.', unit: 'm2' },
    { id: 'item412A', label: '412.A AFIRMADO', unit: 'm2' },
    { id: 'item406A', label: '406.A PERFILADO TALUD', unit: 'm' },
    { id: 'item401A', label: '401.A DESBROCE', unit: 'm2' },
    { id: 'item409A', label: '409.A GEOTEXTIL 400GR', unit: 'm' },
    { id: 'item409B', label: '409.B GEOTEXTIL 200GR', unit: 'm' },
    { id: 'item414A', label: '414.A GOECELDA', unit: 'm2' },
    { id: 'item415', label: '415 GAVION', unit: 'm2' },
    { id: 'item408A', label: '408.A ZANJA Y RELLENO ANCLAJE DE GEOTEXTIL', unit: 'm' },
    { id: 'item416A', label: '416.A PERFILADO Y COMPACTACIÓN FUNDACIÓN DE DIQUE', unit: 'm' },
    { id: 'item501A_Carguio', label: 'EJEC.' },
    ...customColumns.map(c => ({ id: c, label: c, isCustom: true }))
  ];

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const entryValue = String((entry as any)[key] || '').toLowerCase();
        return entryValue.includes(String(value).toLowerCase());
      });
    });
  }, [entries, filters]);

  const parsePk = (pkStr: string): number => {
    if (!pkStr) return 0;
    const clean = pkStr.toString().replace(/\s/g, '');
    if (clean.includes('+')) {
      const [km, m] = clean.split('+');
      return (parseFloat(km || "0") * 1000) + parseFloat(m || "0");
    }
    return parseFloat(clean) || 0;
  };

  const validatePkFormat = (val: string): boolean => {
    if (!val) return true;
    return /^(\d+\s*\+\s*\d+(\.\d+)?|\d+(\.\d+)?)$/.test(val.trim());
  };

  const isPkUnique = (pk: string, excludeId?: string): boolean => {
    const cleanPk = pk.trim();
    if (!cleanPk) return true;
    return !entries.some(e => e.pk.trim() === cleanPk && e.id !== excludeId);
  };

  const autoCalculatedDistance = useMemo(() => {
    if (!newPk || !validatePkFormat(newPk)) return "0.000";
    let prevMeters = 0;
    if (entries.length > 0) {
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (entry.pk && validatePkFormat(entry.pk)) {
                prevMeters = parsePk(entry.pk);
                break;
            }
        }
    }
    const currMeters = parsePk(newPk);
    return Math.abs(currMeters - prevMeters).toFixed(3);
  }, [newPk, entries]);

  useEffect(() => {
    if (newPk && validatePkFormat(newPk) && isPkUnique(newPk)) {
      setNewDistancia(autoCalculatedDistance);
    }
  }, [autoCalculatedDistance, newPk]);

  const calculateRowVolume = (entry: MeasurementEntry) => {
    if (entry.item501A_Carguio !== 1) return 0;
    let totalArea = 0;
    ALL_COLUMNS.forEach(col => {
        if (!['pk', 'distancia', 'tipoTerreno', 'tipoEnrocado', 'intervencion', 'item501A_Carguio'].includes(col.id)) {
            const val = Number(entry[col.id] || 0);
            if (!isNaN(val)) totalArea += val;
        }
    });
    return totalArea * (entry.distancia || 0);
  };

  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    const volumeTotals: Record<string, number> = {};
    
    ALL_COLUMNS.forEach(col => {
        totals[col.id] = 0;
        volumeTotals[col.id] = 0;
    });

    filteredEntries.forEach(entry => {
        const isExecuted = entry.item501A_Carguio === 1;
        ALL_COLUMNS.forEach(col => {
            if (typeof entry[col.id] === 'number') {
                totals[col.id] += entry[col.id];
                if (isExecuted && col.id !== 'distancia') {
                    volumeTotals[col.id] += entry[col.id] * (entry.distancia || 0);
                }
            }
        });
    });

    return { totals, volumeTotals };
  }, [filteredEntries]);

  const totalDikeVolume = useMemo(() => {
    return filteredEntries.reduce((acc, entry) => acc + calculateRowVolume(entry), 0);
  }, [filteredEntries]);

  const handlePkChange = (val: string) => {
    setNewPk(val);
    if (val && !validatePkFormat(val)) setPkError("Error Formato");
    else if (val && !isPkUnique(val)) setPkError("PK Duplicado");
    else setPkError(null);
  };

  const handleCellChange = (field: string, value: any, entryId: string) => {
      const updatedEntries = entries.map(e => e.id === entryId ? { ...e, [field]: value } : e);
      onUpdateEntries(updatedEntries);
  };

  const handleExport = (format: 'csv' | 'xls' | 'txt') => {
    const visibleCols = ALL_COLUMNS.filter(c => columnVisibility[c.id] !== false);
    
    // Define headers, including the calculated volume
    const headers = [
        ...visibleCols.map(c => columnAliases[c.id] || c.label),
        "VOLUMEN (m3)"
    ];

    const fileName = `Metrados_${dike?.name || 'Obra'}`;

    // Helper to get row data
    const getRowData = (e: MeasurementEntry) => {
        const row: any = {};
        visibleCols.forEach(c => {
            row[columnAliases[c.id] || c.label] = (e as any)[c.id];
        });
        row["VOLUMEN (m3)"] = calculateRowVolume(e);
        return row;
    };

    const exportData = filteredEntries.map(e => getRowData(e));

    ExcelService.exportTable(exportData, fileName, "Metrados", format === 'xls' ? 'xlsx' : format);
    setShowExportMenu(false);
  };

  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !dike) return;

      try {
          const rows = await ExcelService.importTable<any>(file);
          
          if (rows.length === 0) {
              alert("El archivo no contiene datos.");
              return;
          }

          // Filter out rows that might be headers or units (e.g. "(m)")
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

          const newEntries: MeasurementEntry[] = dataRows.map((row, idx) => {
              const entry: any = {
                  id: `IMPORT_${Date.now()}_${idx}`,
                  dikeId: dike.id,
                  pk: "", distancia: 0, tipoTerreno: "B1", tipoEnrocado: "TIPO 2", intervencion: "IMPORTADO",
                  item501A_Carguio: 1
              };

              ALL_COLUMNS.forEach(col => {
                  const label = col.label.toUpperCase();
                  const alias = (columnAliases[col.id] || "").toUpperCase();
                  const id = col.id.toUpperCase();

                  // Try to find matching key in row
                  const matchKey = Object.keys(row).find(k => {
                      const uk = k.trim().toUpperCase();
                      return uk === label || uk === alias || uk === id;
                  });

                  if (matchKey) {
                      let val = row[matchKey];
                      if (val !== undefined && val !== null) {
                          if (typeof val === 'string' && !['pk', 'intervencion', 'tipoTerreno', 'tipoEnrocado'].includes(col.id)) {
                              val = parseFloat(val.replace(/,/g, '')) || 0;
                          }
                          entry[col.id] = val;
                      }
                  }
              });

              return entry as MeasurementEntry;
          });

          if (newEntries.length === 0) {
              alert("No se pudieron procesar registros válidos del archivo.");
              return;
          }

          const choice = confirm(`Se han detectado ${newEntries.length} registros válidos.\n\n- Aceptar: REEMPLAZAR los datos actuales.\n- Cancelar: AGREGAR a los datos existentes.`);
          
          if (choice) {
              onUpdateEntries(newEntries);
          } else {
              // Append logic
              const updatedEntries = [...entries, ...newEntries];
              onUpdateEntries(updatedEntries);
          }
      } catch (err) {
          console.error("Import error:", err);
          alert("Error al importar el archivo. Verifique que el formato sea correcto.");
      }
      
      if (importFileRef.current) importFileRef.current.value = "";
      setShowImportMenu(false);
  };

  const handleInsertRow = (afterId: string, above: boolean) => {
    const idx = entries.findIndex(e => e.id === afterId);
    const prevEntry = entries[idx];
    const newEntry: MeasurementEntry = {
        ...prevEntry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        pk: "", distancia: 0
    };
    const newEntries = [...entries];
    newEntries.splice(above ? idx : idx + 1, 0, newEntry);
    onUpdateEntries(newEntries);
  };

  const handleAddRowAtEnd = () => {
    if(!newPk || pkError || !dike) return;
    const newEntry: MeasurementEntry = {
        id: Date.now().toString(),
        dikeId: dike.id,
        pk: newPk,
        distancia: parseFloat(newDistancia) || 0,
        tipoTerreno: newTipoTerreno,
        tipoEnrocado: newTipoEnrocado,
        intervencion: newIntervencion,
        item401A: 0, item402B: 0, item402C: 0, item402D: 0, item402E: 0,
        item403A: 0, item403B: 0, item404A: 0, item404B: 0, item404D: 0,
        item404E: 0, item404G: 0, item404H: 0, item405A: 0, item406A: 0,
        item407A: 0, item408A: 0, item409A: 0, item409B: 0, item410A: 0,
        item410B: 0, item412A: 0, item413A: 0, item414A: 0, item415: 0,
        item416A: 0, item501A_Carguio: 1
    };
    onAddEntry(newEntry);
    setNewPk("");
    setNewDistancia("");
  };

  const ColumnHeader = ({ columnId, label, subHeader = false }: { columnId: string, label: string, subHeader?: boolean }) => {
      const alias = columnAliases[columnId];
      const isVisible = columnVisibility[columnId] !== false;
      if (!isVisible) return null;
      return (
          <div className="flex flex-col items-center justify-between h-full group relative w-full px-0.5">
              <span className={`leading-none ${subHeader ? 'text-[7px]' : 'text-[8px]'} font-bold text-center`}>{alias || label}</span>
              {showFilters && (
                  <input 
                    type="text" 
                    value={filters[columnId] || ''} 
                    onChange={e => setFilters(p => ({...p, [columnId]: e.target.value}))} 
                    className="mt-0.5 w-full text-[7px] bg-white text-black border border-blue-200 rounded px-0.5 h-3 outline-none text-center" 
                    placeholder=".." 
                  />
              )}
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ColumnImport onImport={(v) => {
                      const ids = filteredEntries.map(e => e.id);
                      const updates = entries.map(e => {
                          const idx = ids.indexOf(e.id);
                          if (idx !== -1 && idx < v.length) {
                              let val: string | number = v[idx];
                              if (val !== "" && !isNaN(Number(val.replace(/,/g,''))) && !['pk','intervencion'].includes(columnId)) val = parseFloat(val.replace(/,/g,''));
                              return { ...e, [columnId]: val };
                          }
                          return e;
                      });
                      onUpdateEntries(updates);
                  }} label={alias || label} />
              </div>
          </div>
      );
  };

  if (!dike) return <div className="p-12 text-center border-2 border-dashed rounded-xl bg-white dark:bg-gray-800"><Database className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-medium">Seleccione un Dique para editar su hoja de metrados.</p></div>;

  return (
    <div className="space-y-2 h-full flex flex-col relative">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20"><Database className="w-4 h-4 text-white" /></div>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{dike.name}</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Hoja de Metrados</p>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <Button onClick={() => setShowColumnManager(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] h-8 px-3 font-bold rounded-lg transition-all shadow-sm"><Settings className="w-3.5 h-3.5 mr-1.5" /> Columnas</Button>
              <Button variant={showFilters ? "primary" : "outline"} onClick={() => setShowFilters(!showFilters)} className="text-[10px] h-8 px-3 font-bold rounded-lg"><Filter className="w-3.5 h-3.5 mr-1.5" /> Filtros</Button>
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <div className="relative">
                <Button variant="outline" onClick={() => setShowImportMenu(!showImportMenu)} className="bg-white hover:bg-blue-50 text-[10px] h-8 px-3 text-blue-700 border-blue-200 font-bold rounded-lg shadow-sm"><FileUp className="w-3.5 h-3.5 mr-1.5" /> IMPORTAR <ChevronDown className="w-3 h-3 ml-1" /></Button>
                {showImportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] py-2 animate-in fade-in slide-in-from-top-2">
                        <div className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 mb-1">Cargar Dique Completo</div>
                        <button onClick={() => importFileRef.current?.click()} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 flex items-center gap-3 transition-colors">
                            <FileUp className="w-4 h-4 text-blue-600" /> 
                            <span className="font-semibold">Desde CSV / TXT / XLS</span>
                        </button>
                        <button 
                            onClick={() => handleExport('xls')} 
                            className="w-full text-left px-4 py-2 text-xs hover:bg-green-50 flex items-center gap-3 border-t border-gray-50 mt-1 transition-colors"
                        >
                            <Download className="w-4 h-4 text-green-600" /> 
                            <span className="font-semibold">Descargar Plantilla</span>
                        </button>
                        <input type="file" ref={importFileRef} className="hidden" accept=".csv,.txt,.xlsx,.xls" onChange={handleFullImport} />
                    </div>
                )}
              </div>

              <Button variant="outline" onClick={() => handleExport('csv')} className="bg-white hover:bg-blue-50 text-[10px] h-8 px-3 text-blue-700 border-blue-200 font-bold rounded-lg shadow-sm"><Download className="w-3.5 h-3.5 mr-1.5" /> EXPORTAR CSV</Button>

              <div className="relative">
                <Button variant="outline" onClick={() => setShowExportMenu(!showExportMenu)} className="bg-white hover:bg-green-50 text-[10px] h-8 px-3 text-green-700 border-green-200 font-bold rounded-lg shadow-sm"><FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> EXPORTAR <ChevronDown className="w-3 h-3 ml-1" /></Button>
                {showExportMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[100] py-2 animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => handleExport('xls')} className="w-full text-left px-4 py-2 text-xs hover:bg-green-50 flex items-center gap-3 transition-colors font-semibold">Excel (.xls)</button>
                        <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-xs hover:bg-blue-50 flex items-center gap-3 transition-colors font-semibold">CSV (.csv)</button>
                        <button onClick={() => handleExport('txt')} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-3 transition-colors font-semibold">Texto Plano (.txt)</button>
                    </div>
                )}
              </div>

              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                title="Ayuda de importación/exportación"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
          </div>
      </div>

      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold text-blue-900">Ayuda: Importación de Metrados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[9px] text-blue-800">
                <div className="space-y-1">
                  <p className="font-bold underline">Formatos Soportados:</p>
                  <ul className="list-disc pl-3 space-y-0.5">
                    <li><strong>Excel (.xlsx):</strong> Recomendado para importar toda la hoja.</li>
                    <li><strong>CSV/TXT:</strong> Delimitado por comas o tabulaciones.</li>
                    <li><strong>Columnas:</strong> El archivo debe tener encabezados que coincidan con los códigos de las partidas (ej: 403.A, 402.B).</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-bold underline">Proceso de Importación:</p>
                  <p>1. Use <strong>Exportar Excel</strong> para obtener la plantilla actual.</p>
                  <p>2. Llene los datos en su editor preferido.</p>
                  <p>3. Use <strong>Importar</strong> y seleccione el archivo para cargar los datos al dique actual.</p>
                  <p className="bg-blue-100/50 p-1 rounded border border-blue-200 text-[8px]">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    La importación reemplazará los datos existentes del dique seleccionado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex-1 relative flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar" ref={gridContainerRef}>
            <table className="w-max text-[8px] text-left border-collapse table-fixed">
            <thead className="bg-[#003366] text-white sticky top-0 z-[40] shadow-md">
                {/* Row 1: Labels */}
                <tr className="text-center font-black border-b border-white/10 h-12">
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio').map(col => (
                        <th key={col.id} className={`px-2 border-r border-white/5 ${['pk', 'distancia', 'tipoTerreno', 'tipoEnrocado'].includes(col.id) ? 'w-[80px]' : 'min-w-[100px]'} text-[8px] leading-tight uppercase tracking-wider`}>
                            {columnAliases[col.id] || col.label}
                        </th>
                    ))}
                    <th className="px-2 bg-[#002244] w-[90px] text-center sticky right-0 z-[50] tracking-widest text-[8px]">ACCIONES</th>
                </tr>
                {/* Row 2: Units */}
                <tr className="text-center text-[8px] font-bold bg-[#003366] h-7 border-b border-white/5">
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio').map(col => (
                        <th key={col.id} className="px-2 border-r border-white/5 opacity-60 italic">
                            {col.unit ? `(${col.unit})` : ''}
                        </th>
                    ))}
                    <th className="sticky right-0 bg-[#002244]"></th>
                </tr>
                {/* Row 3: Filters */}
                {showFilters && (
                    <tr className="bg-[#002244] h-8 border-b border-white/10">
                        {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio').map(col => (
                            <th key={col.id} className="px-1 border-r border-white/5">
                                {col.id === 'tipoTerreno' ? (
                                    <select 
                                        className="w-full text-[7px] bg-white/10 text-white border border-white/20 rounded px-0.5 h-5 outline-none font-bold uppercase"
                                        value={filters[col.id] || ''}
                                        onChange={e => setFilters(p => ({...p, [col.id]: e.target.value}))}
                                    >
                                        <option value="" className="text-black">TODOS</option>
                                        <option value="B1" className="text-black">B1</option>
                                        <option value="B2" className="text-black">B2</option>
                                    </select>
                                ) : col.id === 'tipoEnrocado' ? (
                                    <select 
                                        className="w-full text-[7px] bg-white/10 text-white border border-white/20 rounded px-0.5 h-5 outline-none font-bold uppercase"
                                        value={filters[col.id] || ''}
                                        onChange={e => setFilters(p => ({...p, [col.id]: e.target.value}))}
                                    >
                                        <option value="" className="text-black">TODOS</option>
                                        <option value="TIPO 1" className="text-black">TIPO 1</option>
                                        <option value="TIPO 2" className="text-black">TIPO 2</option>
                                    </select>
                                ) : (
                                    <input 
                                        type="text"
                                        className="w-full text-[7px] bg-white/10 text-white border border-white/20 rounded px-1 h-5 outline-none placeholder-white/30 text-center font-bold"
                                        placeholder="..."
                                        value={filters[col.id] || ''}
                                        onChange={e => setFilters(p => ({...p, [col.id]: e.target.value}))}
                                    />
                                )}
                            </th>
                        ))}
                        <th className="sticky right-0 bg-[#001122]"></th>
                    </tr>
                )}
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white font-mono">
                {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors">
                        {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio').map(col => (
                            <td key={col.id} className={`border-r border-gray-100 ${['pk', 'distancia', 'tipoTerreno', 'tipoEnrocado'].includes(col.id) ? 'bg-blue-50/20' : ''}`}>
                                {col.id === 'tipoTerreno' ? (
                                    <GridEditableSelect value={entry.tipoTerreno} onChange={v => handleCellChange('tipoTerreno', v, entry.id)} options={['B1', 'B2']} />
                                ) : col.id === 'tipoEnrocado' ? (
                                    <GridEditableSelect value={entry.tipoEnrocado} onChange={v => handleCellChange('tipoEnrocado', v, entry.id)} options={['TIPO 1', 'TIPO 2']} />
                                ) : (
                                    <GridEditableCell 
                                        type={['pk', 'intervencion', 'tipoTerreno', 'tipoEnrocado'].includes(col.id) ? 'text' : 'number'}
                                        value={entry[col.id]} 
                                        onChange={v => handleCellChange(col.id, v, entry.id)} 
                                        validate={
                                            col.id === 'pk' ? (v => validatePkFormat(v) && isPkUnique(v, entry.id)) :
                                            col.id === 'distancia' ? (v => !isNaN(Number(v)) && Number(v) >= 0) :
                                            undefined
                                        }
                                        errorMessage={
                                            col.id === 'pk' ? "PK inválido o duplicado" :
                                            col.id === 'distancia' ? "Distancia inválida" :
                                            undefined
                                        }
                                    />
                                )}
                            </td>
                        ))}

                        <td className="px-1 py-1 text-center sticky right-0 bg-white dark:bg-gray-800 z-[30] border-l border-gray-200 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center justify-center gap-1">
                                <button onClick={() => handleInsertRow(entry.id, true)} className="p-0.5 text-gray-500 hover:bg-gray-100 rounded" title="Ins. Arriba"><ArrowUp className="w-3 h-3" /></button>
                                <button onClick={() => handleInsertRow(entry.id, false)} className="p-0.5 text-gray-500 hover:bg-gray-100 rounded" title="Ins. Abajo"><ArrowDown className="w-3 h-3" /></button>
                                <button onClick={() => onDeleteEntry(entry.id)} className="p-0.5 text-red-600 hover:bg-red-50 rounded" title="Elim."><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900 sticky bottom-0 z-[40] font-bold text-[8px] border-t border-gray-300">
                {/* Row: Column Totals (Areas) */}
                <tr className="bg-gray-100/80 h-6 text-gray-600">
                    <td className="border-r border-gray-200 text-center bg-blue-50/20">TOTALES</td>
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio').slice(1).map(col => (
                        <td key={col.id} className="border-r border-gray-200 text-right px-1">
                            {['tipoTerreno', 'tipoEnrocado', 'intervencion'].includes(col.id) ? '' : (columnTotals.totals[col.id] > 0 ? columnTotals.totals[col.id].toFixed(2) : '')}
                        </td>
                    ))}
                    <td className="sticky right-0 bg-gray-100 z-[30]"></td>
                </tr>

                {/* Row: Column Volume Totals */}
                <tr className="bg-indigo-50/80 h-7 text-indigo-900">
                    <td className="border-r border-indigo-200 text-center">VOLÚMENES</td>
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio').slice(1).map(col => (
                        <td key={col.id} className="border-r border-indigo-200 text-right px-1 font-black">
                            {['distancia', 'tipoTerreno', 'tipoEnrocado', 'intervencion'].includes(col.id) ? '' : (columnTotals.volumeTotals[col.id] > 0 ? columnTotals.volumeTotals[col.id].toLocaleString('en-US', { maximumFractionDigits: 1 }) : '')}
                        </td>
                    ))}
                    <td className="sticky right-0 bg-indigo-50 z-[30]"></td>
                </tr>

                <tr className="bg-blue-50/90 h-10">
                    <td className="px-1 py-1 border-r border-blue-200">
                        <input 
                            type="text" 
                            value={newPk} 
                            onChange={e => handlePkChange(e.target.value)} 
                            placeholder="0+000" 
                            className={`w-full bg-white outline-none px-1 h-full text-[9px] font-mono border-2 rounded ${pkError ? 'text-red-600 border-red-500' : 'border-blue-300'}`} 
                        />
                    </td>
                    <td colSpan={100} className="px-2 py-1"><Button onClick={handleAddRowAtEnd} disabled={!newPk || !!pkError} className="text-[9px] h-6 bg-[#003366] px-4 font-bold text-white shadow-md border-0"><PlusCircle className="w-3.5 h-3.5 mr-1" /> AGREGAR PK FINAL</Button></td>
                </tr>
            </tfoot>
            </table>
        </div>
      </div>

      <div className="bg-[#003366] px-3 py-1 rounded-lg shadow-lg text-white flex justify-between items-center h-8">
          <div className="flex items-center gap-4 text-[9px]">
              <div className="flex items-center gap-1">
                  <span className="font-bold opacity-70">Longitud Total Dique:</span>
                  <span className="font-black text-xs">{(dike.totalML || 0).toFixed(2)} ml</span>
              </div>
              <div className="h-4 w-px bg-white/20"></div>
              <div className="flex items-center gap-1">
                  <span className="font-bold opacity-70">Metrado Ejecutado:</span>
                  <span className="font-black text-xs">{filteredEntries.reduce((a, b) => a + Number(b.distancia || 0), 0).toFixed(2)} ml</span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[8px] opacity-70 italic font-mono uppercase">Control de Áreas y Volúmenes OHLA</span>
          </div>
      </div>
    </div>
  );
};
