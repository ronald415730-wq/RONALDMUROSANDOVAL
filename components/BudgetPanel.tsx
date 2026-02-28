
import React, { useState, useRef, useEffect, useMemo } from "react";
import { BudgetSection, Sector, BudgetItem, MeasurementEntry, DikeConfig } from "../types";
import { ExcelService } from "../services/excelService";
import { Calculator, Upload, CheckSquare, Square, Layout, Plus, Trash2, Edit2, Copy, AlertTriangle, RefreshCw, Save, Download, LayoutGrid, FileSpreadsheet } from "lucide-react";
import { Button } from "./Button";
import { BudgetSummaryGrid } from "./BudgetSummaryGrid";
import { BudgetBalanceGrid } from "./BudgetBalanceGrid";

interface BudgetPanelProps {
  sectors: Sector[];
  budgetBySector: Record<string, BudgetSection[]>;
  budgetByDike?: Record<string, BudgetSection[]>;
  onUpdateBudget: (sectorId: string, budget: BudgetSection[]) => void;
  onUpdateDikeBudget?: (dikeId: string, budget: BudgetSection[]) => void;
  measurements: MeasurementEntry[];
  dikes: DikeConfig[];
  filterSectorId?: string;
  filterDikeId?: string;
}

const EditableCell = ({ 
    value, 
    onChange, 
    type = "text",
    className = "",
    placeholder = "",
    validate
}: { 
    value: string | number, 
    onChange: (val: string) => void, 
    type?: string,
    className?: string,
    placeholder?: string,
    validate?: (val: string) => boolean
}) => {
    const [localValue, setLocalValue] = useState(value.toString());
    const [isValid, setIsValid] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        setLocalValue(value.toString());
        setIsValid(true);
    }, [value]);

    const commit = () => {
        const finalValue = localValue.trim();
        const isCurrentlyValid = validate ? validate(finalValue) : true;
        
        if (isCurrentlyValid && finalValue !== value.toString()) {
            onChange(finalValue);
        } else if (!isCurrentlyValid) {
            // Revert on invalid
            setLocalValue(value.toString());
            setIsValid(true);
        }
    };

    const handleBlur = () => {
        commit();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            commit();
            inputRef.current?.blur();
        }
        if (e.key === 'Escape') {
            setLocalValue(value.toString());
            setIsValid(true);
            inputRef.current?.blur();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalValue(val);
        if (validate) {
            setIsValid(validate(val));
        }
    };

    return (
        <div className="relative w-full">
            <input 
                ref={inputRef}
                type={type === 'number' ? 'text' : type} // Use text for better custom validation control
                value={localValue} 
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`bg-transparent outline-none w-full ${className} focus:bg-blue-50 focus:ring-1 ${isValid ? 'focus:ring-blue-400' : 'focus:ring-red-500 bg-red-50 text-red-600'} rounded px-1 transition-colors`}
                placeholder={placeholder}
            />
            {!isValid && (
                <div className="absolute -top-6 left-0 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded shadow-lg z-10 animate-bounce whitespace-nowrap">
                    Número inválido
                </div>
            )}
        </div>
    );
};

export const BudgetPanel: React.FC<BudgetPanelProps> = ({ 
    sectors, 
    budgetBySector, 
    budgetByDike = {},
    onUpdateBudget, 
    onUpdateDikeBudget,
    measurements, 
    dikes,
    filterSectorId = "ALL",
    filterDikeId = "ALL"
}) => {
  const [activeSector, setActiveSector] = useState(filterSectorId !== "ALL" ? filterSectorId : (sectors[0]?.id || ""));
  const [viewMode, setViewMode] = useState<"SECTOR" | "DIKE" | "SUMMARY" | "BALANCE">(filterDikeId !== "ALL" ? "DIKE" : "SECTOR");
  const [activeDikeId, setActiveDikeId] = useState<string>(filterDikeId !== "ALL" ? filterDikeId : "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with global filters
  useEffect(() => {
    if (filterSectorId !== "ALL") {
      setActiveSector(filterSectorId);
    }
    if (filterDikeId !== "ALL") {
      setViewMode("DIKE");
      setActiveDikeId(filterDikeId);
    }
  }, [filterSectorId, filterDikeId]);

  // Filter dikes for the active sector
  const sectorDikes = dikes.filter(d => d.sectorId === activeSector);

  // Auto-select first dike when switching sectors or mode
  useEffect(() => {
      if (viewMode === "DIKE" && sectorDikes.length > 0 && !sectorDikes.find(d => d.id === activeDikeId)) {
          setActiveDikeId(sectorDikes[0].id);
      }
  }, [activeSector, viewMode, sectorDikes, activeDikeId]);

  // Determine which budget to display/edit
  const isDikeMode = viewMode === "DIKE" && activeDikeId;
  const activeBudget = isDikeMode 
      ? (budgetByDike[activeDikeId] || []) 
      : (budgetBySector[activeSector] || []);

  const currentDikeName = dikes.find(d => d.id === activeDikeId)?.name || "";

  // Duplicate Code Validation
  const duplicateCodes = useMemo(() => {
      const codes = new Set<string>();
      const duplicates = new Set<string>();
      activeBudget.forEach(section => {
          section.groups.forEach(group => {
              group.items.forEach(item => {
                  if (codes.has(item.code)) {
                      duplicates.add(item.code);
                  }
                  codes.add(item.code);
              });
          });
      });
      return duplicates;
  }, [activeBudget]);

  // Measurements Filter
  const relevantMeasurements = isDikeMode
      ? measurements.filter(m => m.dikeId === activeDikeId)
      : measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));

  const getExecutedQuantity = (itemCode: string) => {
    return relevantMeasurements.reduce((acc, m) => {
      if (m.item501A_Carguio !== 1) return acc;

      const rawCode = itemCode.trim();
      const baseCode = rawCode.split('_')[0].trim();
      
      const isB2BudgetItem = rawCode.endsWith('_R') || ['404.G', '404.H', '415.A', '416.B', '417.A'].includes(rawCode);
      const isB1BudgetItem = !isB2BudgetItem;

      const isB2Row = m.tipoTerreno === 'B2';
      const isB1Row = m.tipoTerreno === 'B1' || !m.tipoTerreno || m.tipoTerreno === 'NORMAL';

      if (isB2BudgetItem && !isB2Row) return acc;
      if (isB1BudgetItem && !isB1Row) return acc;

      let val = 0;
      const dist = m.distancia || 0;

      if (m[rawCode] !== undefined) {
         val = Number(m[rawCode]);
      } else {
        switch (baseCode) {
            case "401.A": val = m.item401A || 0; break;
            case "402.B": val = m.item402B || 0; break;
            case "402.C": val = m.item402C || 0; break;
            case "402.D": val = m.item402D || 0; break;
            case "402.E": val = m.item402E || 0; break;
            case "403.A": val = m.item403A || 0; break;
            case "403.B": val = m.item403B || 0; break;
            case "404.A": val = m.item404A || 0; break;
            case "404.B": val = m.item404B || 0; break;
            case "404.D": val = m.item404D || 0; break;
            case "404.E": val = m.item404E || 0; break;
            case "404.G": val = m.item404A || 0; break;
            case "404.H": val = m.item404D || 0; break;
            case "405.A": val = m.item405A || 0; break;
            case "406.A": val = m.item406A || 0; break;
            case "407.A": val = m.item407A || 0; break;
            case "408.A": val = m.item408A || 0; break;
            case "409.A": val = m.item409A || 0; break;
            case "409.B": val = m.item409B || 0; break;
            case "410.A": val = m.item410A || 0; break;
            case "410.B": val = m.item410B || 0; break;
            case "412.A": val = m.item412A || 0; break;
            case "413.A": val = m.item413A || 0; break;
            case "414.A": val = m.item414A || 0; break;
            case "415": val = m.item415 || 0; break;
            case "415.A": val = m.item415 || 0; break;
            case "416.A": val = m.item416A || 0; break;
            case "416.B": val = m.item416A || 0; break;
            default: val = 0;
        }
      }
      return acc + (val * dist);
    }, 0);
  };

  const areAllSelected = activeBudget.length > 0 && activeBudget.every(section => 
    section.groups.every(group => 
      group.items.every(item => item.selected !== false)
    )
  );

  let totalDirectCost = 0;
  let totalExecutedCost = 0;
  let totalBalanceCost = 0;
  
  activeBudget.forEach(section => {
    section.groups.forEach(group => {
      group.items.forEach(item => {
        if (item.selected !== false) { 
             const executedQty = getExecutedQuantity(item.code);
             const balanceQty = item.metrado - executedQty;
             
             totalDirectCost += item.metrado * item.price;
             totalExecutedCost += executedQty * item.price;
             totalBalanceCost += (balanceQty > 0 ? balanceQty : 0) * item.price;
        }
      });
    });
  });

  const gastosGenerales = totalDirectCost * 0.1446;
  const utilidad = totalDirectCost * 0.10;
  const subtotal = totalDirectCost + gastosGenerales + utilidad;
  
  const gastosGestion = 9537937.87;
  const buenaVecindad = 449186.01;
  const areasAuxiliares = 211593.17;
  const derechoCantera = 2867059.36;
  
  const costoDeterminado = subtotal + gastosGestion + buenaVecindad + areasAuxiliares + derechoCantera;
  
  const tarifaFee = costoDeterminado * 0.0925;
  const totalSinIgv = costoDeterminado + tarifaFee;
  const igv = totalSinIgv * 0.18;
  const totalConIgv = totalSinIgv + igv;

  const formatCurrency = (amount: number) => {
    return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleUpdate = (newBudget: BudgetSection[]) => {
      if (isDikeMode) {
          if (onUpdateDikeBudget) onUpdateDikeBudget(activeDikeId, newBudget);
      } else {
          onUpdateBudget(activeSector, newBudget);
      }
  };

  const handleUpdateItem = (sectionId: string, groupId: string, itemId: string, field: keyof BudgetItem, value: any) => {
      const newBudget = JSON.parse(JSON.stringify(activeBudget));
      const section = newBudget.find((s: BudgetSection) => s.id === sectionId);
      if (section) {
          const group = section.groups.find((g: any) => g.id === groupId);
          if (group) {
              const item = group.items.find((i: any) => i.id === itemId);
              if (item) {
                  item[field] = value;
                  handleUpdate(newBudget);
              }
          }
      }
  };

  const handleToggleAll = () => {
    const newState = !areAllSelected;
    const newBudget = JSON.parse(JSON.stringify(activeBudget));
    newBudget.forEach((section: BudgetSection) => {
        section.groups.forEach((group) => {
            group.items.forEach((item) => {
                item.selected = newState;
            });
        });
    });
    handleUpdate(newBudget);
  };

  const handleAddItem = (sectionId: string, groupId: string) => {
      const newBudget = JSON.parse(JSON.stringify(activeBudget));
      const section = newBudget.find((s: BudgetSection) => s.id === sectionId);
      if (section) {
          const group = section.groups.find((g: any) => g.id === groupId);
          if (group) {
              const newItem: BudgetItem = {
                  id: Date.now().toString(),
                  code: "NUEVO.01",
                  description: "Nueva Partida",
                  unit: "und",
                  metrado: 0,
                  price: 0,
                  selected: true
              };
              group.items.push(newItem);
              handleUpdate(newBudget);
          }
      }
  };

  const handleDeleteItem = (sectionId: string, groupId: string, itemId: string) => {
      if(!confirm("¿Eliminar esta partida?")) return;
      
      const newBudget = JSON.parse(JSON.stringify(activeBudget));
      const section = newBudget.find((s: BudgetSection) => s.id === sectionId);
      if (section) {
          const group = section.groups.find((g: any) => g.id === groupId);
          if (group) {
              group.items = group.items.filter((i: any) => i.id !== itemId);
              handleUpdate(newBudget);
          }
      }
  };

  const handleInitializeDikeBudget = (copyQuantities: boolean) => {
      const sectorBudget = budgetBySector[activeSector] || [];
      const newBudget = JSON.parse(JSON.stringify(sectorBudget));
      
      if (!copyQuantities) {
          newBudget.forEach((sec: BudgetSection) => {
              sec.groups.forEach(grp => {
                  grp.items.forEach(item => {
                      item.metrado = 0;
                  });
              });
          });
      }
      
      if (onUpdateDikeBudget) {
          onUpdateDikeBudget(activeDikeId, newBudget);
      }
  };

  const handleImportBudget = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          try {
              const data = await ExcelService.importTable<any>(file);

              // Validate numerical values for Metrado and Price
              const errors: string[] = [];
              data.forEach((row, index) => {
                  // Check both possible naming conventions (internal flattened format vs exported table format)
                  const metrado = row.itemMetrado !== undefined ? row.itemMetrado : row.Metrado;
                  const price = row.itemPrice !== undefined ? row.itemPrice : (row["Precio Unitario"] || row.PrecioUnitario);

                  if (metrado !== undefined && metrado !== null && metrado !== "" && isNaN(Number(String(metrado).replace(/,/g, '')))) {
                      errors.push(`Fila ${index + 2}: 'Metrado' tiene un valor no numérico ("${metrado}")`);
                  }
                  if (price !== undefined && price !== null && price !== "" && isNaN(Number(String(price).replace(/,/g, '')))) {
                      errors.push(`Fila ${index + 2}: 'Precio Unitario' tiene un valor no numérico ("${price}")`);
                  }
              });

              if (errors.length > 0) {
                  alert(`Error de Importación:\n\nSe encontraron valores no numéricos en las columnas de Metrado o Precio.\n\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... y ${errors.length - 5} errores más.` : ''}`);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  return;
              }

              // Reconstruct budget structure if it's the flattened format
              if (data.length > 0 && data[0].sectorId) {
                  const budgetBySector: Record<string, BudgetSection[]> = {};
                  data.forEach(row => {
                      const { sectorId, sectionId, sectionName, groupId, groupCode, groupName, itemId, itemCode, itemDescription, itemUnit, itemMetrado, itemPrice, itemSelected } = row;
                      if (!budgetBySector[sectorId]) budgetBySector[sectorId] = [];
                      let section = budgetBySector[sectorId].find(s => s.id === sectionId);
                      if (!section) {
                          section = { id: sectionId, name: sectionName, groups: [] };
                          budgetBySector[sectorId].push(section);
                      }
                      let group = section.groups.find(g => g.id === groupId);
                      if (!group) {
                          group = { id: groupId, code: groupCode, name: groupName, items: [] };
                          section.groups.push(group);
                      }
                      group.items.push({
                          id: itemId, code: itemCode, description: itemDescription, unit: itemUnit,
                          metrado: Number(itemMetrado), price: Number(itemPrice), selected: itemSelected !== false
                      });
                  });
                  // If we are in sector mode, we might want to only update the current sector
                  // but usually import means replacing the whole thing or at least the current view
                  if (budgetBySector[activeSector]) {
                      handleUpdate(budgetBySector[activeSector]);
                      alert("Presupuesto importado correctamente para este sector.");
                  } else {
                      alert("El archivo no contiene datos para el sector actual.");
                  }
              } else {
                  handleUpdate(data as unknown as BudgetSection[]);
                  alert("Presupuesto importado correctamente.");
              }
          } catch (err) {
              alert("Error al importar Excel.");
          }
      } else {
          const reader = new FileReader();
          reader.onload = (evt) => {
              try {
                  const json = JSON.parse(evt.target?.result as string);
                  if (Array.isArray(json)) {
                      handleUpdate(json);
                      alert("Presupuesto importado correctamente.");
                  } else {
                      alert("Formato de archivo inválido.");
                  }
              } catch (err) {
                  alert("Error al leer el archivo JSON.");
              }
          };
          reader.readAsText(file);
      }
      
      if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportExcel = () => {
    const sectorName = sectors.find(s => s.id === activeSector)?.name || "Sector";
    const fileName = isDikeMode 
        ? `Presupuesto_${currentDikeName}`
        : `Presupuesto_${sectorName}`;

    const flattenedBudget: any[] = [];
    activeBudget.forEach(section => {
        section.groups.forEach(group => {
            group.items.forEach(item => {
                if (item.selected !== false) {
                    flattenedBudget.push({
                        "Item": item.code,
                        "Descripción": item.description,
                        "Unidad": item.unit,
                        "Metrado": item.metrado,
                        "Precio Unitario": item.price,
                        "Total": item.metrado * item.price,
                        "Ejecutado": getExecutedQuantity(item.code) * item.price,
                        "Saldo": Math.max(0, item.metrado - getExecutedQuantity(item.code)) * item.price
                    });
                }
            });
        });
    });

    ExcelService.exportTable(flattenedBudget, fileName, "Presupuesto");
  };

  return (
    <div className="space-y-6">
      
      {/* Sector Navigation */}
      <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 mb-2 overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
         {sectors.map(sector => (
             <button
                key={sector.id}
                onClick={() => setActiveSector(sector.id)}
                className={`px-4 py-2 text-[10px] font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeSector === sector.id
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
             >
                <Layout className="w-3 h-3" />
                {sector.name}
             </button>
         ))}
      </div>

      {/* View Mode Switcher */}
      <div className="flex justify-center mb-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
              <button
                  onClick={() => setViewMode("SECTOR")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === "SECTOR" 
                      ? "bg-white shadow text-blue-600" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                  Presupuesto de Sector
              </button>
              <button
                  onClick={() => setViewMode("DIKE")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === "DIKE" 
                      ? "bg-white shadow text-blue-600" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                  Presupuesto por Dique
              </button>
              <button
                  onClick={() => setViewMode("SUMMARY")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === "SUMMARY" 
                      ? "bg-white shadow text-blue-600" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                  Resumen Consolidado
              </button>
              <button
                  onClick={() => setViewMode("BALANCE")}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === "BALANCE" 
                      ? "bg-white shadow text-blue-600" 
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                  Metrados y Balance
              </button>
          </div>
      </div>

      {viewMode === "SUMMARY" ? (
          <BudgetSummaryGrid 
            sectors={sectors} 
            budgetBySector={budgetBySector} 
            measurements={measurements} 
            dikes={dikes} 
          />
      ) : viewMode === "BALANCE" ? (
          <BudgetBalanceGrid 
            sectors={sectors} 
            budgetBySector={budgetBySector} 
            measurements={measurements} 
            dikes={dikes} 
          />
      ) : (
          <>
      {/* Financial Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  {isDikeMode ? "Total Contractual (Dique)" : "Total Contractual (Sector)"}
              </p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(totalConIgv)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm border-l-4 border-l-green-500">
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">Total Ejecutado</p>
              <p className="text-lg font-black text-green-700 dark:text-green-300">
                {formatCurrency(totalExecutedCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1)))}
              </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm border-l-4 border-l-orange-500">
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase mb-1">Saldo</p>
              <p className="text-lg font-black text-orange-700 dark:text-orange-300">
                {formatCurrency(totalBalanceCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1)))}
              </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm border-l-4 border-l-blue-500">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">% de Avance</p>
              <div className="flex items-end gap-2">
                  <p className="text-lg font-black text-blue-700 dark:text-blue-300">
                    {totalConIgv > 0 ? (( (totalExecutedCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1))) / totalConIgv) * 100).toFixed(2) : "0.00"}%
                  </p>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full mb-1.5 overflow-hidden">
                      <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, totalConIgv > 0 ? ( (totalExecutedCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1))) / totalConIgv) * 100 : 0)}%` }}
                      ></div>
                  </div>
              </div>
          </div>
      </div>

      {/* Dike Selector (Only visible in Dike Mode) */}
      {viewMode === "DIKE" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
              <label className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block mb-2">Seleccionar Dique:</label>
              <div className="flex flex-wrap gap-2">
                  {sectorDikes.map(dike => (
                      <button
                          key={dike.id}
                          onClick={() => setActiveDikeId(dike.id)}
                          className={`px-3 py-1.5 text-[10px] rounded-md border transition-all ${
                              activeDikeId === dike.id
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                          }`}
                      >
                          {dike.name}
                      </button>
                  ))}
                  {sectorDikes.length === 0 && (
                      <span className="text-xs text-gray-500 italic">No hay diques en este sector.</span>
                  )}
              </div>
          </div>
      )}

      {/* Empty State for Dike Budget */}
      {isDikeMode && activeBudget.length === 0 && activeDikeId && (
          <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  No hay presupuesto configurado para el dique <span className="font-bold">{currentDikeName}</span>.
              </p>
              <div className="flex justify-center gap-4">
                  <Button onClick={() => handleInitializeDikeBudget(false)} variant="primary" className="text-xs">
                      <Layout className="w-3 h-3 mr-2" /> Iniciar (Cantidades en 0)
                  </Button>
                  <Button onClick={() => handleInitializeDikeBudget(true)} variant="outline" className="text-xs">
                      <Copy className="w-3 h-3 mr-2" /> Copiar Todo del Sector
                  </Button>
              </div>
          </div>
      )}

      {/* Main Budget Table Panel */}
      {(activeBudget.length > 0 || !isDikeMode) && (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm gap-4">
                <div className="flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg">
                    <Calculator className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        {isDikeMode ? `Presupuesto Específico: ${currentDikeName}` : "Presupuesto Específico de Sector"}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        {isDikeMode && (
                            <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded border border-orange-200 flex items-center">
                                <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Ajustes por Dique
                            </span>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isDikeMode ? "Modificaciones manuales habilitadas para esta estructura" : `Sector: ${sectors.find(s=>s.id === activeSector)?.name}`}
                        </p>
                    </div>
                </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Total Presupuesto (Inc. IGV)</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalConIgv)}</p>
                    </div>
                    <div className="flex gap-2">
                        {isDikeMode && (
                            <Button 
                                variant="outline" 
                                className="text-[10px] h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => {
                                    if(confirm("¿Restablecer al presupuesto del sector? Se perderán los cambios específicos.")) {
                                        handleInitializeDikeBudget(true);
                                    }
                                }}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" /> Reset
                            </Button>
                        )}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImportBudget} 
                            className="hidden" 
                            accept=".json,.xlsx,.xls" 
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-[10px] h-7 px-2">
                            <Upload className="w-3 h-3" /> Importar
                        </Button>
                        <Button variant="outline" onClick={handleExportExcel} className="text-[10px] h-7 px-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            <FileSpreadsheet className="w-3 h-3 mr-1" /> Exportar Excel
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                    <tr className="bg-[#003366] text-white uppercase text-[10px] font-bold">
                        <th className="px-1 py-1 text-center w-6">
                            <button onClick={handleToggleAll} className="flex items-center justify-center hover:text-blue-300 transition-colors" title={areAllSelected ? "Deseleccionar Todo" : "Seleccionar Todo"}>
                                {areAllSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            </button>
                        </th>
                        <th className="px-1 py-1 text-left w-12">Item</th>
                        <th className="px-1 py-1 text-left">Descripción</th>
                        <th className="px-1 py-1 text-center w-8">Und.</th>
                        <th className="px-1 py-1 text-right w-16">Metrado</th>
                        <th className="px-1 py-1 text-right w-16">P. Unit.</th>
                        <th className="px-1 py-1 text-right w-20 bg-blue-900 border-l border-blue-800">Parcial S/.</th>
                        <th className="px-1 py-1 text-right w-20 bg-green-900 border-l border-green-800">Ejecutado S/.</th>
                        <th className="px-1 py-1 text-right w-20 bg-gray-700 border-l border-gray-600">Saldo S/.</th>
                        <th className="px-1 py-1 text-center w-10 bg-indigo-900 border-l border-indigo-800">%</th>
                        <th className="px-1 py-1 text-center w-8"></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {activeBudget.map((section) => (
                        <React.Fragment key={section.id}>
                        <tr className="bg-green-600 text-white font-bold text-[10px]">
                            <td className="px-1 py-1"></td>
                            <td className="px-1 py-1">{section.id}</td>
                            <td colSpan={4} className="px-1 py-1">{section.name}</td>
                            <td className="px-1 py-1 text-right">
                                {formatCurrency(section.groups.reduce((accS, g) => accS + g.items.reduce((accI, i) => accI + (i.selected !== false ? (i.metrado * i.price) : 0), 0), 0))}
                            </td>
                            <td className="px-1 py-1 text-right bg-green-700">
                                {formatCurrency(section.groups.reduce((accS, g) => accS + g.items.reduce((accI, i) => {
                                    const execQty = getExecutedQuantity(i.code);
                                    return accI + (i.selected !== false ? (execQty * i.price) : 0);
                                }, 0), 0))}
                            </td>
                            <td className="px-1 py-1 text-right bg-gray-800">
                                {formatCurrency(section.groups.reduce((accS, g) => accS + g.items.reduce((accI, i) => {
                                    const execQty = getExecutedQuantity(i.code);
                                    const balQty = Math.max(0, i.metrado - execQty);
                                    return accI + (i.selected !== false ? (balQty * i.price) : 0);
                                }, 0), 0))}
                            </td>
                            <td className="px-1 py-1 text-center bg-indigo-800">
                                {(() => {
                                    const contractual = section.groups.reduce((accS, g) => accS + g.items.reduce((accI, i) => accI + (i.selected !== false ? (i.metrado * i.price) : 0), 0), 0);
                                    const executed = section.groups.reduce((accS, g) => accS + g.items.reduce((accI, i) => {
                                        const execQty = getExecutedQuantity(i.code);
                                        return accI + (i.selected !== false ? (execQty * i.price) : 0);
                                    }, 0), 0);
                                    return contractual > 0 ? `${((executed / contractual) * 100).toFixed(1)}%` : "0%";
                                })()}
                            </td>
                            <td></td>
                        </tr>
                        
                        {section.groups.map((group) => (
                            <React.Fragment key={group.id}>
                            <tr className="bg-yellow-100 dark:bg-yellow-900/30 font-semibold text-gray-800 dark:text-gray-200 text-[10px]">
                                <td className="px-1 py-1"></td>
                                <td className="px-1 py-1">{group.code}</td>
                                <td colSpan={4} className="px-1 py-1">{group.name}</td>
                                <td className="px-1 py-1 text-right text-gray-700 dark:text-gray-300">
                                    {formatCurrency(group.items.reduce((acc, i) => acc + (i.selected !== false ? (i.metrado * i.price) : 0), 0))}
                                </td>
                                <td className="px-1 py-1 text-right text-green-700 dark:text-green-400">
                                    {formatCurrency(group.items.reduce((acc, i) => {
                                        const execQty = getExecutedQuantity(i.code);
                                        return acc + (i.selected !== false ? (execQty * i.price) : 0);
                                    }, 0))}
                                </td>
                                <td className="px-1 py-1 text-right text-gray-600 dark:text-gray-400">
                                    {formatCurrency(group.items.reduce((acc, i) => {
                                        const execQty = getExecutedQuantity(i.code);
                                        const balQty = Math.max(0, i.metrado - execQty);
                                        return acc + (i.selected !== false ? (balQty * i.price) : 0);
                                    }, 0))}
                                </td>
                                <td className="px-1 py-1 text-center text-indigo-700 dark:text-indigo-400">
                                    {(() => {
                                        const contractual = group.items.reduce((acc, i) => acc + (i.selected !== false ? (i.metrado * i.price) : 0), 0);
                                        const executed = group.items.reduce((acc, i) => {
                                            const execQty = getExecutedQuantity(i.code);
                                            return acc + (i.selected !== false ? (execQty * i.price) : 0);
                                        }, 0);
                                        return contractual > 0 ? `${((executed / contractual) * 100).toFixed(1)}%` : "0%";
                                    })()}
                                </td>
                                <td></td>
                            </tr>
                            
                            {group.items.map((item) => {
                                const executedQty = getExecutedQuantity(item.code);
                                const balanceQty = item.metrado - executedQty;
                                const executedAmount = executedQty * item.price;
                                const balanceAmount = (balanceQty > 0 ? balanceQty : 0) * item.price;

                                return (
                                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-xs ${item.selected === false ? 'opacity-50 grayscale' : ''} ${duplicateCodes.has(item.code) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                <td className="px-1 py-1 text-center">
                                    <button 
                                        onClick={() => handleUpdateItem(section.id, group.id, item.id, 'selected', item.selected === undefined ? false : !item.selected)}
                                        className="text-gray-500 hover:text-blue-600 transition-colors"
                                        title={item.selected !== false ? "Excluir del cálculo" : "Incluir en cálculo"}
                                    >
                                        {item.selected !== false ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5" />}
                                    </button>
                                </td>
                                <td className="px-1 py-1 font-medium text-gray-500 relative">
                                    <EditableCell 
                                        value={item.code} 
                                        onChange={(val) => handleUpdateItem(section.id, group.id, item.id, 'code', val)}
                                        className={`font-medium ${duplicateCodes.has(item.code) ? 'text-red-600' : ''}`}
                                    />
                                    {duplicateCodes.has(item.code) && (
                                        <div className="absolute -top-1 -right-1">
                                            <AlertTriangle className="w-3 h-3 text-red-500" title="Código duplicado en este dique" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-1 py-1">
                                    <EditableCell 
                                        value={item.description} 
                                        onChange={(val) => handleUpdateItem(section.id, group.id, item.id, 'description', val)}
                                    />
                                </td>
                                <td className="px-1 py-1 text-center text-gray-500">
                                    <EditableCell 
                                        value={item.unit} 
                                        onChange={(val) => handleUpdateItem(section.id, group.id, item.id, 'unit', val)}
                                        className="text-center"
                                    />
                                </td>
                                <td className={`px-1 py-1 text-right font-mono ${isDikeMode ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
                                    <EditableCell 
                                        value={item.metrado} 
                                        onChange={(val) => handleUpdateItem(section.id, group.id, item.id, 'metrado', parseFloat(val) || 0)}
                                        type="number"
                                        validate={(val) => !isNaN(Number(val)) && Number(val) > 0}
                                        className={`text-right font-bold ${isDikeMode ? 'text-orange-800 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300'}`}
                                    />
                                </td>
                                <td className={`px-1 py-1 text-right font-mono ${isDikeMode ? 'bg-orange-50 dark:bg-orange-900/10 border border-orange-200' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}>
                                    <EditableCell 
                                        value={item.price} 
                                        onChange={(val) => handleUpdateItem(section.id, group.id, item.id, 'price', parseFloat(val) || 0)}
                                        type="number"
                                        validate={(val) => !isNaN(Number(val)) && val.trim() !== ""}
                                        className={`text-right font-bold ${isDikeMode ? 'text-orange-800 dark:text-orange-300' : ''}`}
                                    />
                                </td>
                                <td className="px-1 py-1 text-right font-mono font-medium text-gray-700 dark:text-gray-300 border-l border-blue-100 dark:border-blue-900/30">
                                    <div>{(item.metrado * item.price).toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                                    <div className="text-[9px] text-gray-400 font-normal">
                                        (P.U. {item.price.toFixed(2)})
                                    </div>
                                </td>
                                <td className="px-1 py-1 text-right font-mono text-green-700 dark:text-green-400 bg-green-50/20 dark:bg-green-900/10 border-l border-green-100 dark:border-green-900/30">
                                    {executedAmount.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </td>
                                <td className="px-1 py-1 text-right font-mono text-gray-600 dark:text-gray-400 bg-gray-50/20 dark:bg-gray-800/20 border-l border-gray-100 dark:border-gray-700">
                                    {balanceAmount.toLocaleString('es-PE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </td>
                                <td className="px-1 py-1 text-center font-bold text-indigo-600 dark:text-indigo-400 border-l border-indigo-50 dark:border-indigo-900/20 bg-indigo-50/30 dark:bg-indigo-900/10">
                                    {item.metrado > 0 ? `${((executedQty / item.metrado) * 100).toFixed(1)}%` : "0%"}
                                </td>
                                <td className="px-1 py-1 text-center">
                                    <button 
                                        onClick={() => handleDeleteItem(section.id, group.id, item.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                        title="Eliminar partida"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </td>
                                </tr>
                            )})}
                            <tr>
                                <td colSpan={10} className="px-1 py-1 bg-gray-50 dark:bg-gray-900/30">
                                    <div className="flex justify-center py-1">
                                        <button 
                                            onClick={() => handleAddItem(section.id, group.id)}
                                            className="w-7 h-7 bg-blue-600 text-white rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
                                            title={`Agregar Partida a ${group.code}`}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            </React.Fragment>
                        ))}
                        </React.Fragment>
                    ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-900 border-t-2 border-gray-300 dark:border-gray-600 font-bold text-gray-800 dark:text-gray-200 text-[10px]">
                        <tr>
                            <td colSpan={6} className="px-3 py-1.5 text-right">TOTAL COSTO DIRECTO</td>
                            <td className="px-3 py-1.5 text-right border-l border-gray-200">{formatCurrency(totalDirectCost)}</td>
                            <td className="px-3 py-1.5 text-right text-green-700 border-l border-gray-200">{formatCurrency(totalExecutedCost)}</td>
                            <td className="px-3 py-1.5 text-right text-gray-600 border-l border-gray-200">{formatCurrency(totalBalanceCost)}</td>
                            <td></td>
                        </tr>
                        <tr className="text-gray-600 dark:text-gray-400">
                            <td colSpan={6} className="px-3 py-1 text-right">GASTOS GENERALES (14.46%)</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(gastosGenerales)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="text-gray-600 dark:text-gray-400">
                            <td colSpan={6} className="px-3 py-1 text-right">UTILIDAD (10.00%)</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(utilidad)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                            <td colSpan={6} className="px-3 py-1.5 text-right">SUBTOTAL</td>
                            <td className="px-3 py-1.5 text-right border-l border-gray-200">{formatCurrency(subtotal)}</td>
                            <td className="px-3 py-1.5 text-right border-l border-gray-200 bg-green-50/50 dark:bg-green-900/10">{formatCurrency(totalExecutedCost)}</td>
                            <td className="px-3 py-1.5 text-right border-l border-gray-200 bg-gray-50/50 dark:bg-gray-800/50">{formatCurrency(totalBalanceCost)}</td>
                            <td className="px-3 py-1.5 text-center border-l border-gray-200 bg-indigo-50/50 dark:bg-indigo-900/10 font-bold">
                                {subtotal > 0 ? `${((totalExecutedCost / subtotal) * 100).toFixed(1)}%` : "0%"}
                            </td>
                            <td></td>
                        </tr>
                         <tr className="text-[9px] text-gray-500">
                            <td colSpan={6} className="px-3 py-1 text-right">GASTOS DE GESTION DEL CONTRATISTA</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(gastosGestion)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="text-[9px] text-gray-500">
                            <td colSpan={6} className="px-3 py-1 text-right">BUENA VECINDAD Y RRPP</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(buenaVecindad)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="text-[9px] text-gray-500">
                            <td colSpan={6} className="px-3 py-1 text-right">AREAS AUXILIARES</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(areasAuxiliares)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="text-[9px] text-gray-500">
                            <td colSpan={6} className="px-3 py-1 text-right">DERECHO DE CANTERA</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(derechoCantera)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                            <td colSpan={6} className="px-3 py-1.5 text-right">COSTO DETERMINADO</td>
                            <td className="px-3 py-1.5 text-right border-l border-gray-200">{formatCurrency(costoDeterminado)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="px-3 py-1 text-right">TARIFA O FEE (9.25%)</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(tarifaFee)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="text-blue-700 dark:text-blue-300">
                            <td colSpan={6} className="px-3 py-1.5 text-right">TOTAL PRESUPUESTO (SIN IGV)</td>
                            <td className="px-3 py-1.5 text-right border-l border-gray-200">{formatCurrency(totalSinIgv)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="text-gray-600 dark:text-gray-400">
                            <td colSpan={6} className="px-3 py-1 text-right">IGV (18%)</td>
                            <td className="px-3 py-1 text-right border-l border-gray-200">{formatCurrency(igv)}</td>
                            <td colSpan={3}></td>
                        </tr>
                        <tr className="bg-[#003366] text-white text-sm">
                            <td colSpan={6} className="px-3 py-2 text-right">TOTAL (INC. IGV)</td>
                            <td className="px-3 py-2 text-right border-l border-blue-800">{formatCurrency(totalConIgv)}</td>
                            <td className="px-3 py-2 text-right border-l border-blue-800 bg-green-800/50">{formatCurrency(totalExecutedCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1)))}</td>
                            <td className="px-3 py-2 text-right border-l border-blue-800 bg-gray-800/50">{formatCurrency(totalBalanceCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1)))}</td>
                            <td className="px-3 py-2 text-center border-l border-blue-800 bg-indigo-800/50">
                                {totalConIgv > 0 ? `${(( (totalExecutedCost * 1.18 * (totalConIgv / (subtotal * 1.18 || 1))) / totalConIgv) * 100).toFixed(1)}%` : "0%"}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                </div>
            </div>
                </>
            )}
        </>
      )}
    </div>
  );
};
