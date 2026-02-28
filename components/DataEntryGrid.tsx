
import React, { useState, useMemo, useRef, useEffect } from "react";
import { MeasurementEntry, DikeConfig, Sector, BudgetSection } from "../types";
import { ExcelService } from "../services/excelService";
import * as XLSX from "xlsx";
import { Undo2, Redo2, Eraser, Trash2, Upload, AlertCircle, PlusCircle, Plus, Database, Settings, Filter, FileText, ChevronDown, FileSpreadsheet, ArrowUp, ArrowDown, X, FileUp, CheckSquare, Download, HelpCircle, Info, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { Button } from "./Button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

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
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClear?: () => void;
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
            className={`w-full h-full px-1 py-0.5 cursor-text transition-colors relative min-h-[20px] flex items-center border border-transparent ${!isValid ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' : 'hover:bg-blue-50/80 hover:border-blue-200'} ${type === 'number' ? 'justify-end' : 'justify-start'} ${className}`}
        >
            {(value !== undefined && value !== null && value !== "") 
                ? (typeof value === 'number' ? value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 3}) : value) 
                : <span className="text-gray-300">-</span>}
            {!isValid && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-red-500 pr-1" title={errorMessage}>
                    <AlertCircle className="w-3 h-3" />
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
    allDikes,
    onAddEntry, 
    onUpdateEntries, 
    onDeleteEntry,
    onAddColumn,
    onDeleteColumn,
    filterSectorId = "ALL",
    filterDikeId = "ALL",
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onClear
}) => {
  const [newPk, setNewPk] = useState("");
  const [newDistancia, setNewDistancia] = useState("");
  const [newTipoEnrocado, setNewTipoEnrocado] = useState("TIPO 2");
  const [newTipoTerreno, setNewTipoTerreno] = useState("B2");
  const [newIntervencion, setNewIntervencion] = useState("PROTECCION DE TALUD CON ENROCADO");
  
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newColName, setNewColName] = useState("");
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

  const executedML = useMemo(() => entries.reduce((acc, entry) => acc + (entry.distancia || 0), 0), [entries]);
  const progressPercent = dike?.totalML && dike.totalML > 0 ? (executedML / dike.totalML) * 100 : 0;

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
    { id: 'item404A', label: '404.A/404.B/404.G ENROCADO TALUD', unit: 'm2' },
    { id: 'item404A_MM', label: '404.A/404.B/404.G ENROCADO TALUD M.M.', unit: 'm2' },
    { id: 'item404D', label: '404.D/404.E/404.H ENROCADO UÑA', unit: 'm2' },
    { id: 'item404D_MM', label: '404.D/404.E/404.H ENROCADO UÑA M.M.', unit: 'm2' },
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
        const filterValue = String(value).toLowerCase();
        
        // Exact match for specific fields
        if (['tipoTerreno', 'tipoEnrocado'].includes(key)) {
          return entryValue === filterValue;
        }
        
        return entryValue.includes(filterValue);
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

  const validatePkFormat = (val: any): boolean => {
    if (!val) return true;
    const str = String(val).trim();
    return /^(\d+\s*\+\s*\d+(\.\d+)?|\d+(\.\d+)?)$/.test(str);
  };

  const duplicatePksMap = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      const pk = String(e.pk || "").trim();
      if (pk) {
        // Use composite key to ensure duplicates are per dike
        const key = `${e.dikeId}_${pk}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [entries]);

  const isPkUnique = (pk: any, entryId: string, dikeId: string): boolean => {
    const cleanPk = String(pk || "").trim();
    if (!cleanPk) return true;
    
    const key = `${dikeId}_${cleanPk}`;
    const count = duplicatePksMap[key] || 0;
    
    const entry = entries.find(e => e.id === entryId);
    const originalPk = String(entry?.pk || "").trim();
    const originalDikeId = entry?.dikeId;

    if (cleanPk === originalPk && dikeId === originalDikeId) {
      return count <= 1;
    } else {
      return count === 0;
    }
  };

  const hasDuplicates = useMemo(() => {
    return Object.values(duplicatePksMap).some((count: any) => (count as number) > 1);
  }, [duplicatePksMap]);

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
    if (newPk && validatePkFormat(newPk) && isPkUnique(newPk, "", dike?.id || "")) {
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
    else if (val && dike && !isPkUnique(val, "NEW", dike.id)) setPkError("PK Duplicado");
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
          const reader = new FileReader();
          reader.onload = async (evt) => {
              try {
                  const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                  const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                  
                  // Try to find a sheet matching the dike name, otherwise use the first one
                  let sheetName = workbook.SheetNames.find(name => name.toUpperCase() === dike.name.toUpperCase() || name.toUpperCase() === dike.id.toUpperCase());
                  if (!sheetName) sheetName = workbook.SheetNames[0];
                  
                  const sheet = workbook.Sheets[sheetName];
                  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
                  
                  if (rows.length === 0) {
                      alert("El archivo o la hoja seleccionada no contienen datos.");
                      return;
                  }

                  // Filter out rows that might be headers or units
                  const dataRows = rows.filter(row => {
                      const values = Object.values(row);
                      if (values.length === 0) return false;
                      const firstVal = String(values[0] || "").trim();
                      if (!firstVal || firstVal.startsWith('(')) return false;
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
                              // Common variations for PK
                              if (col.id === 'pk' && (uk === "PROG" || uk === "PROGRESIVA" || uk === "PK")) return true;
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
                      const updatedEntries = [...entries, ...newEntries];
                      onUpdateEntries(updatedEntries);
                  }
              } catch (err) {
                  console.error("Import processing error:", err);
                  alert("Error al procesar los datos del archivo.");
              }
          };
          reader.readAsArrayBuffer(file);
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

  const handleAddColumnLocal = () => {
    const name = newColName.trim();
    if (!name) return;

    // Standard columns to avoid conflicts
    const standardColumns = [
      'pk', 'distancia', 'tipoTerreno', 'tipoEnrocado', 'intervencion', 'id', 'dikeId',
      'item401A', 'item402B', 'item402B_MM', 'item402C', 'item402D', 'item402E', 'item402E_MM',
      'item403A', 'item403A_MM', 'item403B', 'item404A', 'item404A_MM', 'item404B', 'item404D',
      'item404D_MM', 'item404E', 'item404G', 'item404H', 'item405A', 'item406A', 'item407A',
      'item408A', 'item409A', 'item409B', 'item410A', 'item410B', 'item412A', 'item413A',
      'item413A_MM', 'item414A', 'item415', 'item416A', 'item501A_Carguio'
    ];

    if (standardColumns.some(c => c.toLowerCase() === name.toLowerCase())) {
        alert(`"${name}" es un nombre reservado para columnas estándar.`);
        return;
    }

    if (customColumns.some(c => c.toLowerCase() === name.toLowerCase())) {
        alert(`La columna "${name}" ya existe.`);
        return;
    }

    onAddColumn(name);
    setNewColName("");
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

          <div className="flex-1 max-w-sm px-4 hidden lg:block">
              <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-2 border border-blue-100 dark:border-blue-800/50 flex items-center gap-3">
                  <div className="w-12 h-12 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={[
                                      { name: 'Ejecutado', value: executedML },
                                      { name: 'Restante', value: Math.max(0, dike.totalML - executedML) }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={15}
                                  outerRadius={22}
                                  paddingAngle={2}
                                  dataKey="value"
                                  stroke="none"
                              >
                                  <Cell fill="#2563eb" />
                                  <Cell fill="#e5e7eb" />
                              </Pie>
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
                  
                  <div className="flex-1">
                      <div className="flex items-center justify-between mb-1 px-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                            <span className="text-[9px] font-black text-blue-900 dark:text-blue-100 uppercase tracking-tight">Estado de Avance</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black text-blue-700 dark:text-blue-400">{progressPercent.toFixed(1)}%</span>
                            <TrendingUp className="w-3 h-3 text-blue-600" />
                          </div>
                      </div>
                      
                      <div className="h-2 w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-600/50 relative">
                          <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(37,99,235,0.3)]"
                              style={{ width: `${Math.min(100, progressPercent)}%` }}
                          />
                      </div>
                      
                      <div className="flex justify-between mt-1 px-1">
                        <span className="text-[8px] font-black text-gray-700 dark:text-gray-300">{executedML.toLocaleString()} ml</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase">Meta: {dike.totalML.toLocaleString()} ml</span>
                      </div>
                  </div>
              </div>
          </div>

          <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Terreno:</span>
                <select 
                  className="text-[10px] font-bold bg-transparent outline-none text-blue-600 cursor-pointer"
                  value={filters['tipoTerreno'] || ''}
                  onChange={e => setFilters(p => ({...p, 'tipoTerreno': e.target.value}))}
                >
                  <option value="">TODOS</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                </select>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <Button onClick={() => setShowColumnManager(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] h-8 px-3 font-bold rounded-lg transition-all shadow-sm"><Settings className="w-3.5 h-3.5 mr-1.5" /> Columnas</Button>
              <Button variant={showFilters ? "primary" : "outline"} onClick={() => setShowFilters(!showFilters)} className="text-[10px] h-8 px-3 font-bold rounded-lg"><Filter className="w-3.5 h-3.5 mr-1.5" /> Filtros</Button>
              
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  onClick={onUndo} 
                  disabled={!canUndo} 
                  className={`text-[10px] h-8 px-2 font-bold rounded-lg ${!canUndo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  title="Atrás (Deshacer)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onRedo} 
                  disabled={!canRedo} 
                  className={`text-[10px] h-8 px-2 font-bold rounded-lg ${!canRedo ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                  title="Adelante (Rehacer)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              <Button 
                variant="outline" 
                onClick={onClear} 
                className="text-[10px] h-8 px-3 font-bold rounded-lg text-red-600 border-red-100 hover:bg-red-50"
                title="Limpiar Tabla"
              >
                <Eraser className="w-3.5 h-3.5 mr-1.5" /> Limpiar
              </Button>
              
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

      {hasDuplicates && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-red-900 uppercase tracking-tight">Partidas Duplicadas Detectadas</h3>
                <p className="text-[9px] text-red-700">Se han encontrado múltiples registros con el mismo código PK dentro de un mismo dique. Por favor, revise los siguientes puntos:</p>
              </div>
            </div>
            {filters.pk && (
              <Button 
                variant="outline"
                onClick={() => setFilters(p => ({ ...p, pk: "" }))}
                className="text-[9px] h-7 border-gray-200 text-gray-600 hover:bg-gray-100 font-bold"
              >
                Limpiar Filtro
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(duplicatePksMap)
              .filter(([_, count]) => (count as number) > 1)
              .map(([key, count]) => {
                const [dId, pk] = key.split('_');
                const dikeName = allDikes?.find(d => d.id === dId)?.name || dId;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setShowFilters(true);
                      setFilters(p => ({ ...p, pk }));
                    }}
                    className={`px-2 py-1 rounded-md text-[8px] font-bold border transition-all flex items-center gap-1.5 ${
                      filters.pk === pk 
                      ? 'bg-red-600 border-red-700 text-white shadow-sm' 
                      : 'bg-white border-red-200 text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <span className="opacity-70">{dikeName}:</span> {pk}
                    <span className={`px-1 rounded-full text-[7px] ${filters.pk === pk ? 'bg-white/20' : 'bg-red-100'}`}>
                      {count as number} registros
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm flex-1 relative flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar" ref={gridContainerRef}>
            <table className="w-max text-[8px] text-left border-collapse table-fixed">
            <thead className="bg-[#003366] text-white sticky top-0 z-[40] shadow-md">
                {/* Row 1: Labels */}
                <tr className="text-center font-black border-b border-white/10 h-12">
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio' && columnVisibility[c.id] !== false).map(col => (
                        <th key={col.id} className={`px-2 border-r border-white/5 ${['pk', 'distancia', 'tipoTerreno', 'tipoEnrocado'].includes(col.id) ? 'w-[80px]' : 'min-w-[100px]'} text-[8px] leading-tight uppercase tracking-wider`}>
                            {columnAliases[col.id] || col.label}
                        </th>
                    ))}
                    <th className="px-2 bg-[#002244] w-[90px] text-center sticky right-0 z-[50] tracking-widest text-[8px]">ACCIONES</th>
                </tr>
                {/* Row 2: Units */}
                <tr className="text-center text-[8px] font-bold bg-[#003366] h-7 border-b border-white/5">
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio' && columnVisibility[c.id] !== false).map(col => (
                        <th key={col.id} className="px-2 border-r border-white/5 opacity-60 italic">
                            {col.unit ? `(${col.unit})` : ''}
                        </th>
                    ))}
                    <th className="sticky right-0 bg-[#002244]"></th>
                </tr>
                {/* Row 3: Filters */}
                {showFilters && (
                    <tr className="bg-[#002244] h-8 border-b border-white/10">
                        {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio' && columnVisibility[c.id] !== false).map(col => (
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
                        {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio' && columnVisibility[c.id] !== false).map(col => (
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
                                            col.id === 'pk' ? (v => validatePkFormat(v) && isPkUnique(v, entry.id, entry.dikeId)) :
                                            ['distancia', 'intervencion', 'tipoTerreno', 'tipoEnrocado'].includes(col.id) ? (col.id === 'distancia' ? (v => !isNaN(Number(v)) && Number(v) > 0) : undefined) :
                                            (v => !isNaN(Number(v)) && Number(v) >= 0)
                                        }
                                        errorMessage={
                                            col.id === 'pk' ? "PK inválido o duplicado en este dique" :
                                            col.id === 'distancia' ? "Distancia debe ser mayor a 0" :
                                            "Debe ser un número positivo"
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
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio' && c.id !== 'pk' && columnVisibility[c.id] !== false).map(col => (
                        <td key={col.id} className="border-r border-gray-200 text-right px-1">
                            {['tipoTerreno', 'tipoEnrocado', 'intervencion'].includes(col.id) ? '' : (columnTotals.totals[col.id] > 0 ? columnTotals.totals[col.id].toFixed(2) : '')}
                        </td>
                    ))}
                    <td className="sticky right-0 bg-gray-100 z-[30]"></td>
                </tr>

                {/* Row: Column Volume Totals */}
                <tr className="bg-indigo-50/80 h-7 text-indigo-900">
                    <td className="border-r border-indigo-200 text-center">VOLÚMENES</td>
                    {ALL_COLUMNS.filter(c => c.id !== 'item501A_Carguio' && c.id !== 'pk' && columnVisibility[c.id] !== false).map(col => (
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
                    <td colSpan={100} className="px-2 py-1">
                        <Button 
                            onClick={handleAddRowAtEnd} 
                            disabled={!newPk || !!pkError} 
                            className="w-7 h-7 p-0 bg-[#003366] text-white shadow-md border-0 rounded-full hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
                            title="Agregar PK Final"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </td>
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

      {showColumnManager && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-indigo-900 dark:text-white">Gestión de Columnas</h2>
              </div>
              <button onClick={() => setShowColumnManager(false)} className="p-1 hover:bg-white/50 rounded-full transition-colors">
                <X className="w-5 h-5 text-indigo-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Add New Column Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Añadir Atributo Extra</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nombre de la nueva columna (ej: Densidad, Humedad...)"
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                  />
                  <Button onClick={handleAddColumnLocal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                    <PlusCircle className="w-4 h-4 mr-2" /> Añadir
                  </Button>
                </div>
              </div>

              {/* Column List Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Configuración de Columnas</h3>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_COLUMNS.map(col => (
                    <div key={col.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 group hover:border-indigo-200 transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-900 dark:text-white">{col.label}</span>
                          {col.isCustom && <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-black uppercase">Extra</span>}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Alias (opcional)..."
                          className="w-full mt-1 px-2 py-1 text-[9px] bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none focus:border-indigo-500 transition-colors"
                          value={columnAliases[col.id] || ""}
                          onChange={e => setColumnAliases(p => ({...p, [col.id]: e.target.value}))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setColumnVisibility(p => ({...p, [col.id]: columnVisibility[col.id] === false}))}
                          className={`p-2 rounded-lg transition-all ${columnVisibility[col.id] !== false ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400 bg-gray-100'}`}
                          title={columnVisibility[col.id] !== false ? "Visible" : "Oculto"}
                        >
                          {columnVisibility[col.id] !== false ? <CheckSquare className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </button>
                        {col.isCustom && (
                          <button 
                            onClick={() => onDeleteColumn(col.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar Columna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <Button onClick={() => setShowColumnManager(false)} className="bg-indigo-600">Listo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
