import React, { useMemo, useState, useRef } from "react";
import { BudgetSection, MeasurementEntry, DikeConfig, Sector, BudgetItem } from "../types";
import { ClipboardList, TrendingUp, Edit2, Save, Trash2, X, Layers, Download } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface MeasurementSummaryPanelProps {
  budget: BudgetSection[];
  measurements: MeasurementEntry[];
  dikes: DikeConfig[];
  sectors: Sector[];
  budgetBySector?: Record<string, BudgetSection[]>;
  onUpdateBudget?: (sectorId: string, budget: BudgetSection[]) => void;
  filterSectorId?: string;
  filterDikeId?: string;
}

export const MeasurementSummaryPanel: React.FC<MeasurementSummaryPanelProps> = ({ 
    budget, 
    measurements, 
    dikes, 
    sectors, 
    budgetBySector,
    onUpdateBudget,
    filterSectorId = "ALL",
    filterDikeId = "ALL"
}) => {
  
  const [editingRow, setEditingRow] = useState<{
      sectorId: string, 
      sectionId: string, 
      groupId: string, 
      itemId: string, 
      tempItem: BudgetItem
  } | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!panelRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(panelRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('Resumen_Metrados.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Hubo un error al exportar el PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const getExecutedQuantity = (itemCode: string, allMeasurements: MeasurementEntry[]): number => {
    return allMeasurements.reduce((acc, m) => {
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

      // Check for dynamic column match first
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
            
            case "404.D": val = (m.item404_Una_T1 + m.item404_Una_T1_MM); break;
            case "404.F": val = (m.item404_Una_T1 + m.item404_Una_T1_MM); break;
            case "404.E": val = (m.item404_Una_T2 + m.item404_Una_T2_MM); break;
            case "404.H": val = (m.item404_Una_T1 + m.item404_Una_T1_MM + m.item404_Una_T2 + m.item404_Una_T2_MM); break;
            
            case "405.A": val = (m.item405A_Descolmatacion + m.item405A_Descolmatacion_MM); break;
            
            case "413.A": val = (m.item413A_Contractual + m.item413A_MM); break;
            case "412.A": val = m.item412A_Afirmado; break;
            case "406.A": val = m.item406A_Perfilado; break;
            case "409.A": val = m.item409A_Geotextil; break;
            case "416.A": val = m.item416A_Fundacion; break;
            case "416.B": val = m.item416A_Fundacion; break;
            case "408.A": val = m.item408A_Zanja; break;
            case "415.A": val = m.gavion; break;
            
            default: val = 0;
        }
      }
      return acc + (val * dist);
    }, 0);
  };

  const formatNumber = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatCurrency = (num: number) => `S/. ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const sectorFinancials = useMemo(() => {
    if (!budgetBySector) return [];

    const filteredSectors = filterSectorId === "ALL" ? sectors : sectors.filter(s => s.id === filterSectorId);

    return filteredSectors.map(sector => {
        const sectorBudget = budgetBySector[sector.id] || [];
        const sectorDikes = dikes.filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId));
        const sectorMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));

        let totalContractual = 0;
        let totalExecuted = 0;
        let totalExecutedVolume = 0;

        sectorBudget.forEach(section => {
            section.groups.forEach(group => {
                group.items.forEach(item => {
                    const itemTotal = item.metrado * item.price;
                    totalContractual += itemTotal;

                    const execQty = getExecutedQuantity(item.code, sectorMeasurements);
                    const itemExecuted = execQty * item.price;
                    totalExecuted += itemExecuted;

                    if (['m3', 'm^3'].includes(item.unit.toLowerCase())) {
                        totalExecutedVolume += execQty;
                    }
                });
            });
        });

        const balance = totalContractual - totalExecuted;
        const percentage = totalContractual > 0 ? (totalExecuted / totalContractual) * 100 : 0;

        return {
            id: sector.id,
            name: sector.name,
            contractual: totalContractual,
            executed: totalExecuted,
            balance: balance,
            percentage: percentage,
            executedVol: totalExecutedVolume
        };
    });
  }, [sectors, dikes, measurements, budgetBySector]);

  const processedSectors = useMemo(() => {
      if (!budgetBySector) return [];

      const filteredSectors = filterSectorId === "ALL" ? sectors : sectors.filter(s => s.id === filterSectorId);

      return filteredSectors.map(sector => {
          const sectorBudget = budgetBySector[sector.id] || [];
          const sectorDikes = dikes.filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId));
          const sectorMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));

          let sectContractual = 0;
          let sectExecuted = 0;
          
          const sections = sectorBudget.map(section => {
              const groups = section.groups.map(group => {
                  let grpContractual = 0;
                  let grpExecuted = 0;
                  let grpBalance = 0;
                  let grpMayor = 0;
                  let grpDeductivo = 0;

                  const items = group.items.map(item => {
                      const executedQty = getExecutedQuantity(item.code, sectorMeasurements);
                      const balanceQty = item.metrado - executedQty;
                      
                      const mayorMetradoQty = executedQty > item.metrado ? executedQty - item.metrado : 0;
                      const deductivoQty = balanceQty > 0 ? balanceQty : 0;

                      const price = item.price || 0;
                      const costContractual = item.metrado * price;
                      const costExecuted = executedQty * price;
                      
                      grpContractual += costContractual;
                      grpExecuted += costExecuted;
                      grpBalance += (balanceQty > 0 ? balanceQty : 0) * price;
                      grpMayor += mayorMetradoQty * price;
                      grpDeductivo += deductivoQty * price;

                      return {
                          ...item,
                          executedQty,
                          balanceQty,
                          mayorMetradoQty,
                          deductivoQty,
                          percentage: item.metrado > 0 ? (executedQty / item.metrado) * 100 : 0
                      };
                  });

                  sectContractual += grpContractual;
                  sectExecuted += grpExecuted;

                  return {
                      ...group,
                      items,
                      totals: {
                          contractual: grpContractual,
                          executed: grpExecuted,
                          balance: grpBalance,
                          mayor: grpMayor,
                          deductivo: grpDeductivo,
                          percentage: grpContractual > 0 ? (grpExecuted / grpContractual) * 100 : 0
                      }
                  };
              });
              return { ...section, groups };
          });

          return {
              sector,
              sections,
              totals: {
                  contractual: sectContractual,
                  executed: sectExecuted,
                  percentage: sectContractual > 0 ? (sectExecuted / sectContractual) * 100 : 0
              }
          };
      });
  }, [sectors, budgetBySector, measurements, dikes]);

  const handleEditClick = (sectorId: string, sectionId: string, groupId: string, item: BudgetItem) => {
      setEditingRow({
          sectorId,
          sectionId,
          groupId,
          itemId: item.id,
          tempItem: { ...item }
      });
  };

  const handleCancelEdit = () => {
      setEditingRow(null);
  };

  const handleChangeEdit = (field: keyof BudgetItem, value: string | number) => {
      if (!editingRow) return;
      setEditingRow({
          ...editingRow,
          tempItem: { ...editingRow.tempItem, [field]: value }
      });
  };

  const handleSaveEdit = () => {
      if (!editingRow || !onUpdateBudget || !budgetBySector) return;
      const { sectorId, sectionId, groupId, itemId, tempItem } = editingRow;
      
      const newBudget = JSON.parse(JSON.stringify(budgetBySector[sectorId]));
      const section = newBudget.find((s: any) => s.id === sectionId);
      if (section) {
          const group = section.groups.find((g: any) => g.id === groupId);
          if (group) {
              const idx = group.items.findIndex((i: any) => i.id === itemId);
              if (idx !== -1) {
                  group.items[idx] = tempItem;
                  onUpdateBudget(sectorId, newBudget);
              }
          }
      }
      setEditingRow(null);
  };

  const handleDeleteRow = (sectorId: string, sectionId: string, groupId: string, itemId: string) => {
      if (!onUpdateBudget || !budgetBySector) return;
      if (!confirm("¿Está seguro de eliminar esta partida del presupuesto?")) return;

      const newBudget = JSON.parse(JSON.stringify(budgetBySector[sectorId]));
      const section = newBudget.find((s: any) => s.id === sectionId);
      if (section) {
          const group = section.groups.find((g: any) => g.id === groupId);
          if (group) {
              group.items = group.items.filter((i: any) => i.id !== itemId);
              onUpdateBudget(sectorId, newBudget);
          }
      }
  };

  return (
    <div className="space-y-8 pb-10" ref={panelRef}>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
             <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg">
                <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resumen de Metrados y Balance</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Control de Saldos y Avance Financiero por Sector</p>
             </div>
         </div>
         <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
         >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
         </button>
      </div>

      {sectorFinancials.length > 0 && (
          <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Resumen Financiero por Sector
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sectorFinancials.map(sf => (
                      <div key={sf.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                          <div className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2 flex justify-between items-center">
                              <h3 className="font-bold text-xs text-gray-900 dark:text-gray-100 uppercase tracking-wide">{sf.name}</h3>
                              <Layers className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <div className="space-y-2 mb-3">
                              <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] text-gray-500 uppercase">Costo Ejecutado</span>
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400">{formatCurrency(sf.executed)}</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] text-gray-500 uppercase">Vol. Físico (m³)</span>
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatNumber(sf.executedVol)}</span>
                              </div>
                              <div className="flex justify-between items-baseline">
                                    <span className="text-[10px] text-gray-500 uppercase">Saldo</span>
                                    <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{formatCurrency(sf.balance)}</span>
                              </div>
                              <div className="flex justify-between items-baseline border-t border-gray-100 dark:border-gray-700 pt-1">
                                    <span className="text-[10px] text-gray-400 uppercase">Contractual</span>
                                    <span className="text-[10px] font-mono text-gray-400">{formatCurrency(sf.contractual)}</span>
                              </div>
                          </div>
                          <div className="mt-auto">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Avance Financiero</span>
                                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{sf.percentage.toFixed(2)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${sf.percentage > 100 ? 'bg-purple-500' : 'bg-blue-600'}`} 
                                        style={{width: `${Math.min(sf.percentage, 100)}%`}}
                                    ></div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {processedSectors.map(({ sector, sections, totals }) => (
        <div key={sector.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#003366] dark:text-blue-300 uppercase flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-[10px]">DETALLE</span>
                    {sector.name}
                </h3>
                <div className="text-xs font-mono text-gray-500">
                    Presupuesto: {formatCurrency(totals.contractual)}
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-[10px] md:text-xs">
                    <thead>
                        <tr className="bg-[#003366] text-white uppercase font-bold text-[10px]">
                            <th className="px-3 py-2 text-left w-16">Item</th>
                            <th className="px-3 py-2 text-left min-w-[200px]">Descripción Partida</th>
                            <th className="px-3 py-2 text-center w-12">Und.</th>
                            <th className="px-3 py-2 text-right bg-blue-900 border-l border-blue-800 w-24">Metrado<br/>Contractual</th>
                            <th className="px-3 py-2 text-right bg-green-800 border-l border-green-700 w-24">Metrado<br/>Ejecutado</th>
                            <th className="px-3 py-2 text-right bg-gray-700 border-l border-gray-600 w-24">Saldo<br/>Contractual</th>
                            <th className="px-3 py-2 text-right bg-purple-900 border-l border-purple-800 w-20">Mayor<br/>Metrado</th>
                            <th className="px-3 py-2 text-right bg-red-900 border-l border-red-800 w-20">Deductivo<br/>(Menor Met.)</th>
                            <th className="px-3 py-2 text-right border-l border-blue-800 w-16">% Avance</th>
                            <th className="px-3 py-2 text-center bg-slate-800 border-l border-slate-700 w-20">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sections.map(section => (
                            <React.Fragment key={section.id}>
                                <tr className="bg-gray-200 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100 text-xs border-y border-gray-300 dark:border-gray-600">
                                    <td className="px-3 py-1.5">{section.id}</td>
                                    <td colSpan={9} className="px-3 py-1.5">{section.name}</td>
                                </tr>
                                
                                {section.groups.map(group => (
                                    <React.Fragment key={group.id}>
                                        <tr className="bg-gray-100 dark:bg-gray-800 font-semibold text-gray-700 dark:text-gray-300 text-[10px]">
                                            <td className="px-3 py-1">{group.code}</td>
                                            <td colSpan={9} className="px-3 py-1">{group.name}</td>
                                        </tr>

                                        {group.items.map(item => {
                                            const isEditing = editingRow?.itemId === item.id && editingRow?.sectorId === sector.id;
                                            const rowItem = isEditing ? editingRow.tempItem : item;

                                            return (
                                                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-800 ${isEditing ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                                                    <td className="px-3 py-1.5 font-medium text-gray-500 align-middle">
                                                        {isEditing ? (
                                                            <input className="w-full bg-white border border-gray-300 rounded px-1 py-0.5" value={rowItem.code} onChange={e => handleChangeEdit('code', e.target.value)} />
                                                        ) : rowItem.code}
                                                    </td>
                                                    <td className="px-3 py-1.5 align-middle">
                                                        {isEditing ? (
                                                            <input className="w-full bg-white border border-gray-300 rounded px-1 py-0.5" value={rowItem.description} onChange={e => handleChangeEdit('description', e.target.value)} />
                                                        ) : rowItem.description}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center text-gray-500 align-middle">
                                                        {isEditing ? (
                                                            <input className="w-full bg-white border border-gray-300 rounded px-1 py-0.5 text-center" value={rowItem.unit} onChange={e => handleChangeEdit('unit', e.target.value)} />
                                                        ) : rowItem.unit}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono font-medium text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        {isEditing ? (
                                                            <input 
                                                                type="number" 
                                                                className="w-full bg-white border border-gray-300 rounded px-1 py-0.5 text-right font-bold text-blue-600" 
                                                                value={rowItem.metrado} 
                                                                onChange={e => handleChangeEdit('metrado', parseFloat(e.target.value) || 0)} 
                                                            />
                                                        ) : formatNumber(item.metrado)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-green-700 dark:text-green-400 font-bold bg-green-50/30 dark:bg-green-900/10 border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        {formatNumber(item.executedQty)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-gray-600 dark:text-gray-400 border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        {formatNumber(item.balanceQty)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/10 border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        {item.mayorMetradoQty > 0 ? formatNumber(item.mayorMetradoQty) : '-'}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-red-600 dark:text-red-400 bg-red-50/30 dark:bg-red-900/10 border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        {item.deductivoQty > 0 ? formatNumber(item.deductivoQty) : '-'}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-bold text-[10px] border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        <div className="flex justify-end items-center gap-1">
                                                            <span className={`px-1.5 py-0.5 rounded-full min-w-[40px] text-center ${
                                                                item.percentage > 100 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 
                                                                item.percentage > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 
                                                                'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                                                            }`}>
                                                                {item.percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center border-l border-gray-100 dark:border-gray-700 align-middle">
                                                        {isEditing ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={handleSaveEdit} className="p-1 text-green-600 bg-green-50 rounded hover:bg-green-100" title="Guardar"><Save className="w-3.5 h-3.5" /></button>
                                                                <button onClick={handleCancelEdit} className="p-1 text-red-600 bg-red-50 rounded hover:bg-red-100" title="Cancelar"><X className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 hover:opacity-100">
                                                                <button onClick={() => handleEditClick(sector.id, section.id, group.id, item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => handleDeleteRow(sector.id, section.id, group.id, item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        <tr className="bg-gray-5 dark:bg-gray-900/50 font-bold text-[10px] border-t border-gray-300 dark:border-gray-600">
                                            <td colSpan={3} className="px-3 py-1.5 text-right text-gray-600 dark:text-gray-400 uppercase">
                                                TOTAL {group.name} (S/.)
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                                                {formatCurrency(group.totals.contractual)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-green-700 dark:text-green-400 border-l border-gray-200 dark:border-gray-700">
                                                {formatCurrency(group.totals.executed)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                                                {formatCurrency(group.totals.balance)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-purple-700 dark:text-purple-400 border-l border-gray-200 dark:border-gray-700">
                                                {formatCurrency(group.totals.mayor)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-red-700 dark:text-red-400 border-l border-gray-200 dark:border-gray-700">
                                                {formatCurrency(group.totals.deductivo)}
                                            </td>
                                            <td className="px-3 py-1.5 text-right border-l border-gray-200 dark:border-gray-700">
                                                {group.totals.percentage.toFixed(2)}%
                                            </td>
                                            <td></td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      ))}
    </div>
  );
};