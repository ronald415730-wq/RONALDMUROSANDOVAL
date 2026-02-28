
import React, { useRef, useState, useMemo } from "react";
import { DikeConfig, Sector, ProjectBackup, MeasurementEntry, BudgetSection } from "../types";
import { Table, FileSpreadsheet, Download, Upload, Save, HardDrive, Copy, Plus, Edit2, Check, X, Trash2, FolderPlus, Settings, AlertTriangle, CheckCircle, Info, Columns, Play, Sparkles, FileText, LayoutGrid, TrendingUp, Activity, RefreshCw, FileCode, Terminal, ExternalLink, Database } from "lucide-react";
import { Button } from "./Button";
import { ExcelService } from "../services/excelService";

interface ConfigurationPanelProps {
  sectors: Sector[];
  dikes: DikeConfig[];
  measurements: MeasurementEntry[];
  budgetBySector: Record<string, BudgetSection[]>;
  customColumns: string[];
  onRestore: (data: ProjectBackup) => void;
  onReset?: () => void;
  onBackup?: () => void;
  onDuplicate?: (sourceId: string, newName: string, newSectorId: string) => void;
  onAddSector: (sector: Sector) => void;
  onUpdateSector: (sector: Sector) => void;
  onDeleteSector: (id: string) => void;
  onAddDike: (dike: DikeConfig) => void;
  onUpdateDike: (dike: DikeConfig) => void;
  onDeleteDike: (id: string) => void;
  onAddColumn: (name: string) => void;
  onDeleteColumn: (name: string) => void;
  onImportMeasurements?: (entries: MeasurementEntry[]) => void;
  onGenerateExercise?: () => void;
  onGenerateDikeSample?: (dikeId: string) => void;
  onLoadSamples?: () => void;
  filterSectorId?: string;
  filterDikeId?: string;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ 
  sectors, 
  dikes, 
  measurements,
  budgetBySector,
  customColumns,
  onRestore,
  onReset,
  onBackup,
  onDuplicate,
  onAddSector,
  onUpdateSector,
  onDeleteSector,
  onAddDike,
  onUpdateDike,
  onDeleteDike,
  onAddColumn,
  onDeleteColumn,
  onImportMeasurements,
  onGenerateExercise,
  onGenerateDikeSample,
  onLoadSamples,
  filterSectorId = "ALL",
  filterDikeId = "ALL"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DikeConfig | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  
  // Custom Columns Local State
  const [newColName, setNewColName] = useState("");
  const [viewMode, setViewMode] = useState<"TABLE" | "DETAILED" | "TRAMOS" | "CARDS">("TABLE");
  const [showVBAModal, setShowVBAModal] = useState(false);

  const handleAdvancedExcel = () => {
    const backup: ProjectBackup = {
      sectors,
      dikes,
      measurements,
      progressEntries: [],
      protocols: [],
      customColumns,
      budgetBySector: {},
      timestamp: Date.now()
    };
    ExcelService.exportMasterWorkbook(backup);
  };

  const vbaCode = ExcelService.getVBAMacroCode(window.location.origin);

  const copyVBACode = () => {
    navigator.clipboard.writeText(vbaCode);
    alert("Código VBA copiado al portapapeles. Péguelo en un módulo de Excel.");
  };

  // Helper for Validation
  const parsePk = (val: string) => {
    if (!val) return 0;
    const clean = val.toString().replace(/\s/g, '');
    if (clean.includes('+')) {
        const [km, m] = clean.split('+');
        return (parseFloat(km) * 1000) + parseFloat(m);
    }
    return parseFloat(clean) || 0;
  };

  const getDikeValidation = (dike: DikeConfig) => {
      const errors: string[] = [];
      const idDupes = dikes.filter(d => d.id === dike.id).length;
      if (idDupes > 1) errors.push("ID Duplicado");

      const nameDupes = dikes.filter(d => d.name === dike.name).length;
      if (nameDupes > 1) errors.push("Nombre Duplicado");

      const start = parsePk(dike.progInicioDique);
      const end = parsePk(dike.progFinDique);
      const calcLen = Math.abs(end - start);
      const diff = Math.abs(calcLen - dike.totalML);
      
      if (dike.totalML <= 0) {
          errors.push("Longitud Total es 0 o negativa");
      } else if (diff > 0.1) { 
          errors.push(`Inconsistencia: Calc(${calcLen.toFixed(2)}) vs Total(${dike.totalML})`);
      }

      // Check for overlaps within the same sector
      const sectorDikes = dikes.filter(d => d.sectorId === dike.sectorId && d.id !== dike.id);
      sectorDikes.forEach(other => {
          const otherStart = parsePk(other.progInicioDique);
          const otherEnd = parsePk(other.progFinDique);
          
          const minA = Math.min(start, end);
          const maxA = Math.max(start, end);
          const minB = Math.min(otherStart, otherEnd);
          const maxB = Math.max(otherStart, otherEnd);

          if (maxA > minB && maxB > minA) {
              errors.push(`Traslape con ${other.name} (${other.progInicioDique} - ${other.progFinDique})`);
          }
      });

      return { isValid: errors.length === 0, errors };
  };

  const analysisResults = useMemo(() => {
    const results: { id: string, name: string, errors: string[], type: 'DIKE' | 'MEASUREMENT' }[] = [];
    
    // 1. Dike validation
    dikes.forEach(d => {
        const v = getDikeValidation(d);
        if (!v.isValid) {
            results.push({ id: d.id, name: d.name, errors: v.errors, type: 'DIKE' });
        }
    });

    // 2. Measurement validation: Orphaned entries
    const orphaned = measurements.filter(m => !dikes.some(d => d.id === m.dikeId));
    if (orphaned.length > 0) {
        const orphanedByDikeId = orphaned.reduce((acc, m) => {
            acc[m.dikeId] = (acc[m.dikeId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        Object.entries(orphanedByDikeId).forEach(([dId, count]) => {
            results.push({
                id: `orphan-${dId}`,
                name: `Metrados Huérfanos (ID: ${dId})`,
                errors: [`${count} registros no tienen un dique asociado en la configuración.`],
                type: 'MEASUREMENT'
            });
        });
    }

    // 3. Measurement validation: Duplicates within same dike
    const dikeGroups = measurements.reduce((acc, m) => {
        if (!acc[m.dikeId]) acc[m.dikeId] = [];
        acc[m.dikeId].push(m);
        return acc;
    }, {} as Record<string, MeasurementEntry[]>);

    Object.entries(dikeGroups).forEach(([dId, groupEntries]) => {
        const pkCounts: Record<string, number> = {};
        (groupEntries as MeasurementEntry[]).forEach(e => {
            const pk = (e.pk || "").trim();
            if (pk) pkCounts[pk] = (pkCounts[pk] || 0) + 1;
        });

        const duplicates = Object.entries(pkCounts).filter(([pk, count]) => count > 1);
        if (duplicates.length > 0) {
            const dike = dikes.find(d => d.id === dId);
            results.push({
                id: `dupe-${dId}`,
                name: dike ? `Duplicados en ${dike.name}` : `Duplicados en Dique ${dId}`,
                errors: duplicates.map(([pk, count]) => `Progresiva ${pk} repetida ${count} veces.`),
                type: 'MEASUREMENT'
            });
        }
    });

    return results;
  }, [dikes, measurements]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        onRestore(json);
      } catch (err) {
        alert("Error al leer el archivo de respaldo.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGlobalMeasurementsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportMeasurements) return;

    try {
        const entries = await ExcelService.importMeasurements(file, dikes, customColumns);
        if (entries.length > 0) {
            if (confirm(`Se han detectado ${entries.length} registros de metrados para múltiples diques. ¿Desea importarlos al sistema? (Esto agregará los datos a los existentes)`)) {
                onImportMeasurements(entries);
            }
        } else {
            alert("No se encontraron registros válidos en el archivo.");
        }
    } catch (err) {
        alert("Error al importar metrados globales.");
    }
    if (e.target) e.target.value = "";
  };

  // --- FUNCIÓN DE EXPORTACIÓN DE DIQUES A CSV ---
  const handleExportDikesCSV = () => {
    const headers = [
        "Sector ID", 
        "Nombre Sector", 
        "ID Dique", 
        "Nombre Dique", 
        "Prog Rio Inicio", 
        "Prog Rio Fin", 
        "Prog Dique Inicio", 
        "Prog Dique Fin", 
        "Total ML"
    ];
    
    const rows = dikes.map(dike => {
      const sector = sectors.find(s => s.id === dike.sectorId);
      return [
        dike.sectorId,
        sector?.name || "Desconocido",
        dike.id,
        dike.name,
        dike.progInicioRio,
        dike.progFinRio,
        dike.progInicioDique,
        dike.progFinDique,
        dike.totalML.toString()
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    // Agregar BOM para UTF-8 (soporte para tildes en Excel)
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CONFIG_DIQUES_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDuplicateClick = (dike: DikeConfig) => {
      if (!onDuplicate) return;
      
      const newName = prompt(`Ingrese el nombre para la copia de "${dike.name}":`, `${dike.name} (Copia)`);
      if (!newName) return;

      const sectorList = sectors.map(s => s.id).join(", ");
      const newSectorId = prompt(`Ingrese el ID del Sector para el nuevo dique (${sectorList}):`, dike.sectorId);
      
      if (newSectorId) {
          onDuplicate(dike.id, newName, newSectorId);
      }
  };

  const handleCreateSector = () => {
    const name = prompt("Ingrese el nombre del Nuevo Sector:");
    if (!name || !name.trim()) return;
    
    const defaultId = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const id = prompt("Ingrese el ID del Nuevo Sector (único):", defaultId);
    
    if (!id || !id.trim()) return;
    const finalId = id.trim().toUpperCase();

    if (sectors.some(s => s.id === finalId)) {
        alert("Este ID de sector ya existe.");
        return;
    }

    onAddSector({ id: finalId, name: name.trim() });
  };

  const handleCreateDikeInSector = (sectorId: string) => {
    const newId = `DIQUE_${Date.now()}`;
    const newDike: DikeConfig = {
        id: newId,
        sectorId: sectorId,
        name: "NUEVO DIQUE",
        progInicioRio: "0+000",
        progFinRio: "0+000",
        progInicioDique: "0+000",
        progFinDique: "0+000",
        totalML: 0
    };

    onAddDike(newDike);
    setEditingId(newId);
    setEditForm(newDike);
  };

  const startEdit = (dike: DikeConfig) => {
    setEditingId(dike.id);
    setEditForm({ ...dike });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (editForm) {
       onUpdateDike(editForm);
       setEditingId(null);
       setEditForm(null);
    }
  };

  const handleEditChange = (field: keyof DikeConfig, value: string | number) => {
      if (!editForm) return;
      setEditForm({ ...editForm, [field]: value });
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

  const calculateDikeStats = (dike: DikeConfig) => {
    const dikeMeasurements = measurements.filter(m => m.dikeId === dike.id);
    const executedML = dikeMeasurements.reduce((acc, m) => acc + (m.distancia || 0), 0);
    const progress = dike.totalML > 0 ? (executedML / dike.totalML) * 100 : 0;

    // Estimate cost (simplified)
    const sectorBudget = budgetBySector[dike.sectorId] || [];
    let executedCost = 0;
    
    dikeMeasurements.forEach(m => {
      if (m.item501A_Carguio !== 1) return; // Only count valid rows
      
      sectorBudget.forEach(section => {
        section.groups.forEach(group => {
          group.items.forEach(item => {
            const rawCode = item.code.trim();
            const val = Number(m[rawCode] || 0);
            if (val > 0) {
              executedCost += val * (m.distancia || 0) * item.price;
            }
          });
        });
      });
    });

    return {
      progress: Math.min(progress, 100),
      executedCost
    };
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Data Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h2 className="text-base font-semibold text-blue-900 dark:text-blue-100">Centro de Respaldo</h2>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2 flex-1">
                {onReset && (
                    <Button 
                        onClick={onReset}
                        className="w-full justify-center text-xs h-9 bg-red-600 hover:bg-red-700 shadow-sm text-white"
                        title="Restablecer datos predeterminados"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Restablecer Predeterminados
                    </Button>
                )}
                <Button onClick={onBackup} className="w-full justify-center text-xs h-9 bg-blue-600 hover:bg-blue-700 shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Backup Total (.json)
                </Button>
                
                {/* BOTÓN NUEVO: EXCEL MAESTRO AVANZADO */}
                <Button 
                    onClick={handleAdvancedExcel} 
                    className="w-full justify-center text-xs h-9 bg-emerald-600 hover:bg-emerald-700 shadow-sm font-bold"
                    title="Generar Excel con hojas por dique y macros"
                >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Generar Libro Maestro (.xlsx)
                </Button>
                
                {/* BOTÓN NUEVO: VER MACROS VBA */}
                <Button 
                    onClick={() => setShowVBAModal(true)} 
                    variant="outline"
                    className="w-full justify-center text-xs h-9 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 shadow-sm font-bold"
                >
                    <FileCode className="w-4 h-4 mr-2" /> Ver Macros VBA (Importación)
                </Button>

                <div className="w-full relative">
                    <input 
                        type="file" 
                        id="global-measurements-import"
                        className="hidden" 
                        accept=".xlsx,.xls,.csv,.txt" 
                        onChange={handleGlobalMeasurementsImport} 
                    />
                    <Button 
                        onClick={() => document.getElementById('global-measurements-import')?.click()} 
                        variant="outline" 
                        className="w-full justify-center text-xs h-9 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm font-bold"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Importar Metrados (Global)
                    </Button>
                </div>
                {/* BOTÓN NUEVO: EXPORTAR DIQUES A CSV */}
                <Button 
                    onClick={handleExportDikesCSV} 
                    variant="outline" 
                    className="w-full justify-center text-xs h-9 bg-white dark:bg-gray-800 text-green-700 border-green-200 hover:bg-green-50 shadow-sm font-bold"
                >
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Diques (CSV)
                </Button>
                <div className="w-full relative">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".json" 
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full justify-center text-xs h-9 bg-white dark:bg-gray-800">
                        <Upload className="w-4 h-4 mr-2" /> Restaurar Sistema
                    </Button>
                </div>
            </div>
          </div>

          {/* Quick Actions / Exercise Generation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-base font-semibold text-amber-900 dark:text-amber-100">Ejercicio de Llenado</h2>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center gap-3">
                <p className="text-[10px] text-amber-700 dark:text-amber-300 text-center italic">
                    Genera automáticamente metrados y avance diario para todos los diques configurados.
                </p>
                <Button onClick={onGenerateExercise} className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold border-0 shadow-lg transition-all hover:scale-[1.02] active:scale-95">
                    <Play className="w-4 h-4 mr-2" /> EJECUTAR EJERCICIO MASIVO
                </Button>
                <Button onClick={onLoadSamples} className="w-full h-10 bg-blue-500 hover:bg-blue-600 text-white font-bold border-0 shadow-lg transition-all hover:scale-[1.02] active:scale-95">
                    <RefreshCw className="w-4 h-4 mr-2" /> CARGAR DATOS DE MUESTRA
                </Button>
                {filterDikeId !== "ALL" && onGenerateDikeSample && (
                    <Button 
                        onClick={() => onGenerateDikeSample(filterDikeId)} 
                        className="w-full h-10 bg-purple-500 hover:bg-purple-600 text-white font-bold border-0 shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                    >
                        <Sparkles className="w-4 h-4 mr-2" /> GENERAR MUESTRA DIQUE SELECCIONADO
                    </Button>
                )}
            </div>
          </div>

          {/* Custom Columns Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2">
                <Columns className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                <h2 className="text-base font-semibold text-purple-900 dark:text-purple-100">Atributos Extra</h2>
              </div>
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="Nueva columna..."
                        className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-[10px] bg-white dark:bg-gray-900 outline-none"
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                    />
                    <Button onClick={handleAddColumnLocal} className="text-xs h-8 px-3 bg-purple-600">
                        <Plus className="w-3.5 h-3.5" />
                    </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-[60px]">
                    {customColumns.map(col => (
                        <div key={col} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[9px] font-bold">
                            {col}
                            <X className="w-2.5 h-2.5 cursor-pointer text-red-500" onClick={() => onDeleteColumn(col)} />
                        </div>
                    ))}
                </div>
            </div>
          </div>
      </div>

      <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Configuración de Diques {viewMode === "DETAILED" && "(Vista Detallada)"}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Configure la segmentación geográfica de la obra</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex mr-2">
                <button 
                  onClick={() => setViewMode("TABLE")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === "TABLE" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Vista Tabla
                </button>
                <button 
                  onClick={() => setViewMode("DETAILED")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === "DETAILED" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Vista Detallada
                </button>
                <button 
                  onClick={() => setViewMode("TRAMOS")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === "TRAMOS" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Control de Tramos
                </button>
                <button 
                  onClick={() => setViewMode("CARDS")}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === "CARDS" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Vista Tarjetas
                </button>
            </div>
            <Button 
                onClick={() => setShowValidation(!showValidation)} 
                variant="outline"
                className={`text-xs h-9 px-3 ${showValidation ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}`}
            >
                {showValidation ? <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> : <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />} 
                {showValidation ? "Ocultar Errores" : "Validar Estructura"}
            </Button>
            <Button onClick={handleCreateSector} className="text-xs h-9 px-4 bg-[#003366] hover:bg-[#002244] text-white shadow-sm transition-all hover:scale-105 active:scale-95">
                <FolderPlus className="w-4 h-4 mr-2" /> Crear Nuevo Sector
            </Button>
          </div>
      </div>

      {showValidation && analysisResults.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-sm font-black text-red-900 dark:text-red-100 uppercase tracking-widest">Inconsistencias Detectadas ({analysisResults.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analysisResults.map((result) => (
                      <div key={result.id} className={`bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm ${result.type === 'DIKE' ? 'border-red-100 dark:border-red-900/50' : 'border-amber-100 dark:border-amber-900/50'}`}>
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                  {result.type === 'MEASUREMENT' && <Database className="w-3 h-3 text-amber-500" />}
                                  <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{result.name}</span>
                              </div>
                              <span className="text-[8px] font-bold text-gray-400 font-mono">{result.id}</span>
                          </div>
                          <ul className="space-y-1">
                              {result.errors.map((err, i) => (
                                  <li key={i} className={`text-[9px] flex items-start gap-1.5 font-semibold ${result.type === 'DIKE' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                      <span className={`mt-1 w-1 h-1 rounded-full shrink-0 ${result.type === 'DIKE' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                      {err}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {showValidation && analysisResults.length === 0 && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                  <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-widest">Estructura Validada</h3>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">No se encontraron duplicados ni inconsistencias en las progresivas.</p>
              </div>
          </div>
      )}

      {viewMode === "TABLE" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                      <thead className="text-[10px] text-white uppercase bg-[#003366] border-b border-gray-200 dark:border-gray-700">
                          <tr className="h-10">
                              <th className="px-2 py-2 border-r border-white/20 text-center font-bold w-20">SECTOR</th>
                              <th className="px-2 py-2 border-r border-white/20 font-bold">NOMBRE DIQUE</th>
                              <th className="px-2 py-2 border-r border-white/20 text-center font-bold w-24">INICIO DIQUE</th>
                              <th className="px-2 py-2 border-r border-white/20 text-center font-bold w-24">FIN DIQUE</th>
                              <th className="px-2 py-2 border-r border-white/20 text-right font-bold w-24">TOTAL (ML)</th>
                              <th className="px-2 py-2 border-r border-white/20 text-center font-bold w-32">AVANCE (%)</th>
                              <th className="px-2 py-2 text-center font-bold w-24">ACCIONES</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {sectors
                            .filter(s => filterSectorId === "ALL" || s.id === filterSectorId)
                            .map(sector => (
                              <React.Fragment key={sector.id}>
                                  {dikes
                                    .filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId))
                                    .map((dike) => {
                                      const isEditing = editingId === dike.id;
                                      const validation = getDikeValidation(dike);
                                      
                                      return (
                                          <tr key={dike.id} className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-[10px]">
                                              <td className="px-2 py-1 border-r dark:border-gray-600 align-middle font-bold text-gray-500">
                                                  {sector.id}
                                              </td>
                                              <td className="px-2 py-1 border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] font-bold text-blue-700 h-6"
                                                          value={editForm.name}
                                                          onChange={(e) => handleEditChange('name', e.target.value)}
                                                          autoFocus
                                                      />
                                                  ) : (
                                                      <span className="font-bold text-blue-600 dark:text-blue-400">{dike.name}</span>
                                                  )}
                                              </td>

                                              <td className="px-2 py-1 text-center border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-center h-6"
                                                          value={editForm.progInicioDique}
                                                          onChange={(e) => handleEditChange('progInicioDique', e.target.value)}
                                                          placeholder="0+000"
                                                      />
                                                  ) : <span className="font-mono text-gray-600">{dike.progInicioDique}</span>}
                                              </td>
                                              <td className="px-2 py-1 text-center border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-center h-6"
                                                          value={editForm.progFinDique}
                                                          onChange={(e) => handleEditChange('progFinDique', e.target.value)}
                                                          placeholder="0+000"
                                                      />
                                                  ) : <span className="font-mono text-gray-600">{dike.progFinDique}</span>}
                                              </td>

                                              <td className="px-2 py-1 text-right border-r dark:border-gray-600 align-middle bg-yellow-50/30 dark:bg-yellow-900/10">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          type="number"
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-right font-bold h-6"
                                                          value={editForm.totalML}
                                                          onChange={(e) => handleEditChange('totalML', parseFloat(e.target.value))}
                                                      />
                                                  ) : (
                                                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                                                          validation.isValid || !showValidation 
                                                          ? 'text-gray-900 dark:text-gray-100' 
                                                          : 'bg-red-50 text-red-600'
                                                      }`}>
                                                          {dike.totalML.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                      </span>
                                                  )}
                                              </td>

                                              <td className="px-3 py-1 border-r dark:border-gray-600 align-middle">
                                                  <div className="flex flex-col gap-1">
                                                      <div className="flex justify-between items-center text-[8px] font-black uppercase">
                                                          <span className="text-blue-600 dark:text-blue-400">{calculateDikeStats(dike).progress.toFixed(1)}%</span>
                                                          <span className="text-gray-400 italic">{(measurements.filter(m => m.dikeId === dike.id).reduce((a, b) => a + (b.distancia || 0), 0)).toFixed(1)} ml</span>
                                                      </div>
                                                      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-600/50">
                                                          <div 
                                                              className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                                                              style={{ width: `${calculateDikeStats(dike).progress}%` }}
                                                          />
                                                      </div>
                                                  </div>
                                              </td>

                                              <td className="px-2 py-1 text-center whitespace-nowrap align-middle">
                                                  {isEditing ? (
                                                      <div className="flex items-center justify-center gap-1">
                                                          <button onClick={saveEdit} className="p-1 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors border border-green-200" title="Guardar"><Check className="w-3 h-3" /></button>
                                                          <button onClick={cancelEdit} className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-200" title="Cancelar"><X className="w-3 h-3" /></button>
                                                      </div>
                                                  ) : (
                                                      <div className="flex items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                          <button onClick={() => startEdit(dike)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                                                          <button onClick={() => handleDuplicateClick(dike)} className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                                                          <button onClick={() => onDeleteDike(dike.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                                                      </div>
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                    })}
                              </React.Fragment>
                            ))}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : viewMode === "DETAILED" ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                      <thead className="text-[10px] text-white uppercase bg-[#003366] border-b border-gray-200 dark:border-gray-700">
                          <tr>
                              <th rowSpan={2} className="px-2 py-2 border-r border-white/20 text-center font-bold w-24">ID DIQUE</th>
                              <th rowSpan={2} className="px-2 py-2 border-r border-white/20 text-center font-bold w-20">SECTOR</th>
                              <th rowSpan={2} className="px-2 py-2 border-r border-white/20 font-bold">NOMBRE DIQUE</th>
                              <th colSpan={2} className="px-2 py-1 border-r border-white/20 text-center font-bold">PROGRESIVA RIO</th>
                              <th colSpan={2} className="px-2 py-1 border-r border-white/20 text-center font-bold">PROGRESIVA DIQUE</th>
                              <th rowSpan={2} className="px-2 py-2 border-r border-white/20 text-right font-bold w-24">TOTAL (ML)</th>
                              <th rowSpan={2} className="px-2 py-2 text-center font-bold w-24">ACCIONES</th>
                          </tr>
                          <tr>
                              <th className="px-2 py-1 border-r border-white/10 text-center font-medium w-24">Inicio</th>
                              <th className="px-2 py-1 border-r border-white/20 text-center font-medium w-24">Fin</th>
                              <th className="px-2 py-1 border-r border-white/10 text-center font-medium w-24">Inicio</th>
                              <th className="px-2 py-1 border-r border-white/20 text-center font-medium w-24">Fin</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {sectors
                            .filter(s => filterSectorId === "ALL" || s.id === filterSectorId)
                            .map(sector => (
                              <React.Fragment key={sector.id}>
                                  {dikes
                                    .filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId))
                                    .map((dike) => {
                                      const isEditing = editingId === dike.id;
                                      const validation = getDikeValidation(dike);
                                      
                                      return (
                                          <tr key={dike.id} className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-[10px]">
                                              <td className="px-2 py-1 border-r dark:border-gray-600 align-middle font-mono text-gray-400">
                                                  {dike.id}
                                              </td>
                                              <td className="px-2 py-1 border-r dark:border-gray-600 align-middle font-bold text-gray-500">
                                                  {sector.id}
                                              </td>
                                              <td className="px-2 py-1 border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] font-bold text-blue-700 h-6"
                                                          value={editForm.name}
                                                          onChange={(e) => handleEditChange('name', e.target.value)}
                                                      />
                                                  ) : (
                                                      <span className="font-bold text-blue-600 dark:text-blue-400">{dike.name}</span>
                                                  )}
                                              </td>

                                              <td className="px-2 py-1 text-center border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-center h-6"
                                                          value={editForm.progInicioRio}
                                                          onChange={(e) => handleEditChange('progInicioRio', e.target.value)}
                                                      />
                                                  ) : <span className="font-mono text-gray-600">{dike.progInicioRio}</span>}
                                              </td>
                                              <td className="px-2 py-1 text-center border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-center h-6"
                                                          value={editForm.progFinRio}
                                                          onChange={(e) => handleEditChange('progFinRio', e.target.value)}
                                                      />
                                                  ) : <span className="font-mono text-gray-600">{dike.progFinRio}</span>}
                                              </td>

                                              <td className="px-2 py-1 text-center border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-center h-6"
                                                          value={editForm.progInicioDique}
                                                          onChange={(e) => handleEditChange('progInicioDique', e.target.value)}
                                                      />
                                                  ) : <span className="font-mono text-gray-600">{dike.progInicioDique}</span>}
                                              </td>
                                              <td className="px-2 py-1 text-center border-r dark:border-gray-600 align-middle">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-center h-6"
                                                          value={editForm.progFinDique}
                                                          onChange={(e) => handleEditChange('progFinDique', e.target.value)}
                                                      />
                                                  ) : <span className="font-mono text-gray-600">{dike.progFinDique}</span>}
                                              </td>

                                              <td className="px-2 py-1 text-right border-r dark:border-gray-600 align-middle bg-yellow-50/30 dark:bg-yellow-900/10">
                                                  {isEditing && editForm ? (
                                                      <input 
                                                          type="number"
                                                          className="w-full bg-white dark:bg-gray-800 border border-blue-300 rounded px-1 py-0.5 text-[10px] text-right font-bold h-6"
                                                          value={editForm.totalML}
                                                          onChange={(e) => handleEditChange('totalML', parseFloat(e.target.value))}
                                                      />
                                                  ) : (
                                                      <span className="font-mono font-bold">{dike.totalML.toFixed(2)}</span>
                                                  )}
                                              </td>

                                              <td className="px-2 py-1 text-center whitespace-nowrap align-middle">
                                                  {isEditing ? (
                                                      <div className="flex items-center justify-center gap-1">
                                                          <button onClick={saveEdit} className="p-1 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors border border-green-200"><Check className="w-3 h-3" /></button>
                                                          <button onClick={cancelEdit} className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors border border-red-200"><X className="w-3 h-3" /></button>
                                                      </div>
                                                  ) : (
                                                      <div className="flex items-center justify-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                          <button onClick={() => startEdit(dike)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                                          <button onClick={() => onDeleteDike(dike.id)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                      </div>
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                    })}
                              </React.Fragment>
                            ))}
                      </tbody>
                  </table>
              </div>
          </div>
      ) : viewMode === "TRAMOS" ? (
          <div className="space-y-10">
              {sectors
                .filter(s => filterSectorId === "ALL" || s.id === filterSectorId)
                .map(sector => {
                  const sectorDikes = dikes.filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId));
                  const totalGeneral = sectorDikes.reduce((acc, d) => acc + d.totalML, 0);
                  
                  return (
                      <div key={sector.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                              <h3 className="text-xl font-black text-[#003366] dark:text-blue-400 tracking-tight">Sector {sector.name} - Control de Tramos</h3>
                              <p className="text-xs text-gray-500 font-medium">Detalle de progresivas y longitudes totales por dique.</p>
                          </div>
                          <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                      <tr className="bg-gray-50 dark:bg-gray-900/50 text-[#003366] dark:text-blue-300 uppercase text-[10px] font-black border-b border-gray-200 dark:border-gray-700">
                                          <th className="px-6 py-4">SECTOR</th>
                                          <th className="px-6 py-4">PROG. INICIO RIO</th>
                                          <th className="px-6 py-4">PROG. FIN RIO</th>
                                          <th className="px-6 py-4 text-blue-600 dark:text-blue-400">PROG. INICIO DIQUE</th>
                                          <th className="px-6 py-4 text-blue-600 dark:text-blue-400">PROG. FIN DIQUE</th>
                                          <th className="px-6 py-4 text-right">TOTAL (ML)</th>
                                          <th className="px-6 py-4 text-center">ACCIONES</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                      {sectorDikes.map(dike => (
                                          <tr key={dike.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                              <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{dike.name}</td>
                                              <td className="px-6 py-4 font-mono text-gray-500">{dike.progInicioRio}</td>
                                              <td className="px-6 py-4 font-mono text-gray-500">{dike.progFinRio}</td>
                                              <td className="px-6 py-4 font-mono font-bold text-blue-700 dark:text-blue-300">{dike.progInicioDique}</td>
                                              <td className="px-6 py-4 font-mono font-bold text-blue-700 dark:text-blue-300">{dike.progFinDique}</td>
                                              <td className="px-6 py-4 text-right font-mono font-black text-blue-600 dark:text-blue-400">
                                                  {dike.totalML.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                                                      <Activity className="w-3.5 h-3.5" /> Ver Detalle
                                                  </button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-200 dark:border-gray-700">
                                      <tr className="font-black text-gray-900 dark:text-white uppercase text-[10px]">
                                          <td colSpan={5} className="px-6 py-4 text-right tracking-widest">TOTAL GENERAL</td>
                                          <td className="px-6 py-4 text-right font-mono text-sm">
                                              {totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          <td></td>
                                      </tr>
                                  </tfoot>
                              </table>
                          </div>
                      </div>
                  );
              })}
          </div>
      ) : viewMode === "CARDS" ? (
          <div className="space-y-10">
              {sectors
                .filter(s => filterSectorId === "ALL" || s.id === filterSectorId)
                .map((sector) => (
                  <div key={sector.id} className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                          <FolderPlus className="w-4 h-4 text-blue-600" />
                          <h3 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-widest">SECTOR {sector.name}</h3>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700 ml-2"></div>
                          <div className="flex items-center gap-1">
                               <button 
                                  onClick={() => {
                                      const newName = prompt("Nuevo nombre del sector:", sector.name);
                                      if (newName && newName !== sector.name) onUpdateSector({...sector, name: newName});
                                  }} 
                                  className="text-gray-400 hover:text-blue-600 p-1"
                               >
                                  <Edit2 className="w-3 h-3" />
                               </button>
                               <button 
                                  onClick={() => onDeleteSector(sector.id)} 
                                  className="text-gray-400 hover:text-red-600 p-1"
                               >
                                  <Trash2 className="w-3 h-3" />
                               </button>
                               <Button 
                                  onClick={() => handleCreateDikeInSector(sector.id)} 
                                  className="text-[9px] h-6 px-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 ml-2 shadow-sm"
                               >
                                  <Plus className="w-3 h-3 mr-1" /> Agregar Dique
                               </Button>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {dikes
                            .filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId))
                            .map((dike) => {
                              const stats = calculateDikeStats(dike);
                              return (
                                  <div key={dike.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                      <div className="p-4 space-y-4">
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">{dike.name}</h4>
                                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dike.id}</p>
                                              </div>
                                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button onClick={() => startEdit(dike)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                      <Edit2 className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button onClick={() => handleDuplicateClick(dike)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                      <Copy className="w-3.5 h-3.5" />
                                                  </button>
                                                  <button onClick={() => onDeleteDike(dike.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                              </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-y-3 py-2 border-y border-gray-50 dark:border-gray-700/50">
                                              <div>
                                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Inicio Dique</p>
                                                  <p className="text-[10px] font-black text-gray-700 dark:text-gray-300 font-mono">{dike.progInicioDique}</p>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Fin Dique</p>
                                                  <p className="text-[10px] font-black text-gray-700 dark:text-gray-300 font-mono">{dike.progFinDique}</p>
                                              </div>
                                              <div>
                                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Inicio Río</p>
                                                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 font-mono">{dike.progInicioRio}</p>
                                              </div>
                                              <div className="text-right">
                                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Fin Río</p>
                                                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 font-mono">{dike.progFinRio}</p>
                                              </div>
                                          </div>

                                          <div className="space-y-2">
                                              <div className="flex justify-between items-end">
                                                  <div className="flex items-center gap-1.5">
                                                      <TrendingUp className="w-3 h-3 text-blue-600" />
                                                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Fisico</span>
                                                  </div>
                                                  <span className="text-[10px] font-black text-gray-900 dark:text-white">{stats.progress.toFixed(1)}%</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                  <div 
                                                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                                      style={{ width: `${stats.progress}%` }}
                                                  />
                                              </div>
                                          </div>

                                          <div className="flex justify-between items-center pt-2">
                                              <div className="flex items-center gap-1.5">
                                                  <LayoutGrid className="w-3 h-3 text-emerald-600" />
                                                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Ejecutado (Est.)</span>
                                              </div>
                                              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                                  S/. {stats.executedCost.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                              </span>
                                          </div>
                                      </div>
                                      <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Longitud Total:</span>
                                          <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 font-mono">{dike.totalML.toFixed(2)} m</span>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              ))}
          </div>
      ) : null}

      {showVBAModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-xl">
                  <Terminal className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-amber-900 dark:text-white uppercase tracking-tight">Macro VBA de Importación</h2>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">Sincronización automática Excel → Aplicación</p>
                </div>
              </div>
              <button onClick={() => setShowVBAModal(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                <X className="w-6 h-6 text-amber-400" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex gap-4">
                <Info className="w-6 h-6 text-blue-600 shrink-0" />
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-blue-900 dark:text-white uppercase tracking-wider">¿Cómo usar este código?</h4>
                  <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-decimal ml-4 font-bold">
                    <li>Abra su archivo de Excel generado (Libro Maestro).</li>
                    <li>Presione <kbd className="bg-white px-1 rounded border shadow-sm">Alt + F11</kbd> para abrir el editor de VBA.</li>
                    <li>Vaya a <span className="italic">Insertar &gt; Módulo</span>.</li>
                    <li>Pegue el código que aparece a continuación.</li>
                    <li>En Excel, puede asignar esta macro a un botón o ejecutarla con <kbd className="bg-white px-1 rounded border shadow-sm">Alt + F8</kbd>.</li>
                  </ol>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button onClick={copyVBACode} className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] h-8 px-4">
                    <Copy className="w-3 h-3 mr-2" /> Copiar Código
                  </Button>
                </div>
                <pre className="bg-gray-900 text-amber-400 p-6 rounded-2xl overflow-x-auto font-mono text-[11px] leading-relaxed border-2 border-gray-800 shadow-inner custom-scrollbar">
                  {vbaCode}
                </pre>
              </div>

              <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                  Asegúrese de que su Excel esté guardado como <span className="underline">Libro de Excel habilitado para macros (.xlsm)</span> para conservar el código.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowVBAModal(false)}>Cerrar</Button>
              <Button onClick={copyVBACode} className="bg-amber-600">Copiar Código</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
