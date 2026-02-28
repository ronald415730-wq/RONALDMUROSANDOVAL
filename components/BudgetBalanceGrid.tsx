
import React, { useMemo } from "react";
import { Sector, BudgetSection, MeasurementEntry, DikeConfig } from "../types";
import { LayoutGrid, TrendingUp, PieChart, Activity, ClipboardList, ArrowRightLeft } from "lucide-react";

interface BudgetBalanceGridProps {
  sectors: Sector[];
  budgetBySector: Record<string, BudgetSection[]>;
  measurements: MeasurementEntry[];
  dikes: DikeConfig[];
}

export const BudgetBalanceGrid: React.FC<BudgetBalanceGridProps> = ({
  sectors,
  budgetBySector,
  measurements,
  dikes
}) => {
  
  const getExecutedQuantity = (itemCode: string, sectorId: string) => {
    const sectorDikes = dikes.filter(d => d.sectorId === sectorId);
    const relevantMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));

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

  const consolidatedData = useMemo(() => {
    // We want to group by item code across all sectors
    const itemMap: Record<string, {
        code: string,
        description: string,
        unit: string,
        contractual: number,
        executed: number,
        price: number,
        sectionName: string,
        groupName: string,
        sectionId: string,
        groupCode: string
    }> = {};

    sectors.forEach(sector => {
        const budget = budgetBySector[sector.id] || [];
        budget.forEach(section => {
            section.groups.forEach(group => {
                group.items.forEach(item => {
                    if (item.selected === false) return;
                    
                    const key = `${section.id}-${group.code}-${item.code}`;
                    const executed = getExecutedQuantity(item.code, sector.id);
                    
                    if (!itemMap[key]) {
                        itemMap[key] = {
                            code: item.code,
                            description: item.description,
                            unit: item.unit,
                            contractual: 0,
                            executed: 0,
                            price: item.price,
                            sectionName: section.name,
                            groupName: group.name,
                            sectionId: section.id,
                            groupCode: group.code
                        };
                    }
                    
                    itemMap[key].contractual += item.metrado;
                    itemMap[key].executed += executed;
                });
            });
        });
    });

    return Object.values(itemMap);
  }, [sectors, budgetBySector, measurements, dikes]);

  const sections = useMemo(() => {
    const grouped: Record<string, {
        id: string,
        name: string,
        groups: Record<string, {
            code: string,
            name: string,
            items: typeof consolidatedData
        }>
    }> = {};

    consolidatedData.forEach(item => {
        if (!grouped[item.sectionId]) {
            grouped[item.sectionId] = {
                id: item.sectionId,
                name: item.sectionName,
                groups: {}
            };
        }
        if (!grouped[item.sectionId].groups[item.groupCode]) {
            grouped[item.sectionId].groups[item.groupCode] = {
                code: item.groupCode,
                name: item.groupName,
                items: []
            };
        }
        grouped[item.sectionId].groups[item.groupCode].items.push(item);
    });

    return Object.values(grouped).map(s => ({
        ...s,
        groups: Object.values(s.groups)
    }));
  }, [consolidatedData]);

  const totalFinancial = useMemo(() => {
    let totalContractual = 0;
    let totalExecuted = 0;
    
    consolidatedData.forEach(item => {
        totalContractual += item.contractual * item.price;
        totalExecuted += item.executed * item.price;
    });

    // Apply GG, Utilidad, etc. to get a final financial figure
    const directContractual = totalContractual;
    const directExecuted = totalExecuted;
    
    const gg = 0.1446;
    const ut = 0.10;
    const fee = 0.0925;
    const igv = 0.18;

    const subtotalContractual = directContractual * (1 + gg + ut);
    const subtotalExecuted = directExecuted * (1 + gg + ut);
    
    // Fixed costs from image
    const fixedCosts = 9537937.87 + 449186.01 + 211593.17 + 2867059.36;
    
    const totalSinIgvContractual = (subtotalContractual + fixedCosts) * (1 + fee);
    const totalSinIgvExecuted = (subtotalExecuted + (fixedCosts * (directExecuted / (directContractual || 1)))) * (1 + fee);
    
    const totalContractualFinal = totalSinIgvContractual * (1 + igv);
    const totalExecutedFinal = totalSinIgvExecuted * (1 + igv);

    return {
        contractual: totalContractualFinal,
        executed: totalExecutedFinal,
        progress: totalContractualFinal > 0 ? (totalExecutedFinal / totalContractualFinal) * 100 : 0
    };
  }, [consolidatedData]);

  const formatNumber = (num: number) => {
    if (num === 0) return "-";
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (num: number) => {
    return `S/. ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl shadow-blue-900/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Resumen de Metrados y Balance</h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Control de Saldos, Mayores Metrados y Deductivos</p>
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-8">
            <div className="text-right">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">AVANCE FINANCIERO TOTAL</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{totalFinancial.progress.toFixed(2)}%</span>
                    <span className="text-xs font-bold text-indigo-400">({formatCurrency(totalFinancial.executed)})</span>
                </div>
            </div>
            <div className="bg-indigo-200/50 dark:bg-indigo-800/50 p-2 rounded-xl">
                <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#003366] text-white uppercase font-black tracking-tighter">
                <th className="px-3 py-4 text-left border-r border-white/10 w-16">ITEM</th>
                <th className="px-3 py-4 text-left border-r border-white/10">DESCRIPCIÓN PARTIDA</th>
                <th className="px-3 py-4 text-center border-r border-white/10 w-12">UND.</th>
                <th className="px-3 py-4 text-right border-r border-white/10 w-28 bg-blue-900/50">METRADO<br/>CONTRACTUAL</th>
                <th className="px-3 py-4 text-right border-r border-white/10 w-28 bg-green-900/50">METRADO<br/>EJECUTADO</th>
                <th className="px-3 py-4 text-right border-r border-white/10 w-28 bg-gray-900/50">SALDO<br/>CONTRACTUAL</th>
                <th className="px-3 py-4 text-right border-r border-white/10 w-28 bg-purple-900/50">MAYOR<br/>METRADO</th>
                <th className="px-3 py-4 text-right border-r border-white/10 w-28 bg-red-900/50">DEDUCTIVO<br/>(MENOR MET.)</th>
                <th className="px-3 py-4 text-center w-20 bg-indigo-900/50">%<br/>AVANCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sections.map(section => (
                <React.Fragment key={section.id}>
                  {/* Section Header */}
                  <tr className="bg-gray-100 dark:bg-gray-900/80 font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    <td className="px-3 py-2 border-r dark:border-gray-700">{section.id}</td>
                    <td colSpan={8} className="px-3 py-2">{section.name}</td>
                  </tr>

                  {section.groups.map(group => {
                    const groupContractual = group.items.reduce((acc, i) => acc + (i.contractual * i.price), 0);
                    const groupExecuted = group.items.reduce((acc, i) => acc + (i.executed * i.price), 0);
                    const groupBalance = group.items.reduce((acc, i) => acc + (Math.max(0, i.contractual - i.executed) * i.price), 0);
                    const groupMayor = group.items.reduce((acc, i) => acc + (Math.max(0, i.executed - i.contractual) * i.price), 0);
                    const groupDeductivo = group.items.reduce((acc, i) => acc + (Math.max(0, i.contractual - i.executed) * i.price), 0);

                    return (
                      <React.Fragment key={group.code}>
                        {/* Group Header */}
                        <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold text-gray-600 dark:text-gray-400 text-[10px]">
                          <td className="px-3 py-2 border-r dark:border-gray-700">{group.code}</td>
                          <td colSpan={8} className="px-3 py-2">{group.name}</td>
                        </tr>

                        {/* Items */}
                        {group.items.map(item => {
                          const saldo = Math.max(0, item.contractual - item.executed);
                          const mayor = Math.max(0, item.executed - item.contractual);
                          const deductivo = Math.max(0, item.contractual - item.executed);
                          const progress = item.contractual > 0 ? (item.executed / item.contractual) * 100 : 0;

                          return (
                            <tr key={item.code} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                              <td className="px-3 py-2 border-r dark:border-gray-700 font-medium text-gray-500">{item.code}</td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300">{item.description}</td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 text-center text-gray-500 italic">{item.unit}</td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 text-right font-mono font-bold text-gray-900 dark:text-white">
                                {formatNumber(item.contractual)}
                              </td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {formatNumber(item.executed)}
                              </td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 text-right font-mono font-bold text-gray-600 dark:text-gray-400">
                                {formatNumber(saldo)}
                              </td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                                {formatNumber(mayor)}
                              </td>
                              <td className="px-3 py-2 border-r dark:border-gray-700 text-right font-mono font-bold text-red-600 dark:text-red-400">
                                {formatNumber(deductivo)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${
                                  progress >= 100 ? 'bg-emerald-100 text-emerald-700' :
                                  progress > 0 ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {progress.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Group Subtotal */}
                        <tr className="bg-gray-50/50 dark:bg-gray-900/20 font-black text-[10px] border-t border-gray-200 dark:border-gray-700">
                          <td colSpan={3} className="px-3 py-2 text-right uppercase tracking-tighter text-gray-500">
                            TOTAL {group.name} (S/.)
                          </td>
                          <td className="px-3 py-2 text-right font-mono border-r dark:border-gray-700">{formatNumber(groupContractual)}</td>
                          <td className="px-3 py-2 text-right font-mono border-r dark:border-gray-700 text-emerald-600">{formatNumber(groupExecuted)}</td>
                          <td className="px-3 py-2 text-right font-mono border-r dark:border-gray-700">{formatNumber(groupBalance)}</td>
                          <td className="px-3 py-2 text-right font-mono border-r dark:border-gray-700 text-purple-600">{formatNumber(groupMayor)}</td>
                          <td className="px-3 py-2 text-right font-mono border-r dark:border-gray-700 text-red-600">{formatNumber(groupDeductivo)}</td>
                          <td className="px-3 py-2 text-center bg-indigo-50/30 dark:bg-indigo-900/10">
                            {groupContractual > 0 ? ((groupExecuted / groupContractual) * 100).toFixed(2) : "0.00"}%
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend / Info */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Glosario de Balance</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
          <div className="space-y-1">
            <p className="font-black text-indigo-900 dark:text-indigo-100 uppercase">Metrado Contractual</p>
            <p>Cantidad total establecida en el contrato original del proyecto.</p>
          </div>
          <div className="space-y-1">
            <p className="font-black text-indigo-900 dark:text-indigo-100 uppercase">Mayor Metrado</p>
            <p>Excedente de ejecución física sobre la cantidad contractual pactada.</p>
          </div>
          <div className="space-y-1">
            <p className="font-black text-indigo-900 dark:text-indigo-100 uppercase">Deductivo</p>
            <p>Metrado no ejecutado respecto al contractual (ahorro o menor metrado).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
