
import React, { useMemo } from "react";
import { Sector, BudgetSection, MeasurementEntry, DikeConfig } from "../types";
import { LayoutGrid, TrendingUp, PieChart as PieChartIcon, Activity, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface BudgetSummaryGridProps {
  sectors: Sector[];
  budgetBySector: Record<string, BudgetSection[]>;
  measurements: MeasurementEntry[];
  dikes: DikeConfig[];
}

const COLORS = ['#003366', '#0066cc', '#3399ff', '#66b2ff', '#99ccff', '#cce5ff'];

export const BudgetSummaryGrid: React.FC<BudgetSummaryGridProps> = ({
  sectors,
  budgetBySector,
  measurements,
  dikes
}) => {
  const summaryData = useMemo(() => {
    return sectors.map(sector => {
      const budget = budgetBySector[sector.id] || [];
      const sectorDikes = dikes.filter(d => d.sectorId === sector.id);
      const sectorMeasurements = measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));

      let directCost = 0;
      budget.forEach(section => {
        section.groups.forEach(group => {
          group.items.forEach(item => {
            if (item.selected !== false) {
              directCost += item.metrado * item.price;
            }
          });
        });
      });

      const gastosGenerales = directCost * 0.1446;
      const utilidad = directCost * 0.10;
      const subtotal = directCost + gastosGenerales + utilidad;
      
      const gastosGestion = 9537937.87 / sectors.length;
      const buenaVecindad = 449186.01 / sectors.length;
      const areasAuxiliares = 211593.17 / sectors.length;
      const derechoCantera = 2867059.36 / sectors.length;
      
      const costoDeterminado = subtotal + gastosGestion + buenaVecindad + areasAuxiliares + derechoCantera;
      const tarifaFee = costoDeterminado * 0.0925;
      const totalSinIgv = costoDeterminado + tarifaFee;
      const igv = totalSinIgv * 0.18;
      const totalConIgv = totalSinIgv + igv;

      return {
        sectorName: sector.name,
        directCost,
        gastosGenerales,
        utilidad,
        subtotal,
        otrosGastos: gastosGestion + buenaVecindad + areasAuxiliares + derechoCantera,
        costoDeterminado,
        tarifaFee,
        totalSinIgv,
        igv,
        totalConIgv
      };
    });
  }, [sectors, budgetBySector, measurements, dikes]);

  const totals = useMemo(() => {
    return summaryData.reduce((acc, curr) => ({
      directCost: acc.directCost + curr.directCost,
      gastosGenerales: acc.gastosGenerales + curr.gastosGenerales,
      utilidad: acc.utilidad + curr.utilidad,
      subtotal: acc.subtotal + curr.subtotal,
      otrosGastos: acc.otrosGastos + curr.otrosGastos,
      costoDeterminado: acc.costoDeterminado + curr.costoDeterminado,
      tarifaFee: acc.tarifaFee + curr.tarifaFee,
      totalSinIgv: acc.totalSinIgv + curr.totalSinIgv,
      igv: acc.igv + curr.igv,
      totalConIgv: acc.totalConIgv + curr.totalConIgv
    }), {
      directCost: 0, gastosGenerales: 0, utilidad: 0, subtotal: 0, otrosGastos: 0,
      costoDeterminado: 0, tarifaFee: 0, totalSinIgv: 0, igv: 0, totalConIgv: 0
    });
  }, [summaryData]);

  const pieData = useMemo(() => {
    return summaryData.map(s => ({
      name: s.sectorName,
      value: s.totalConIgv
    }));
  }, [summaryData]);

  const componentsData = useMemo(() => {
    return [
      { name: 'Costo Directo', value: totals.directCost },
      { name: 'G. Generales', value: totals.gastosGenerales },
      { name: 'Utilidad', value: totals.utilidad },
      { name: 'Otros Gastos', value: totals.otrosGastos },
      { name: 'Tarifa/Fee', value: totals.tarifaFee },
      { name: 'IGV', value: totals.igv },
    ];
  }, [totals]);

  const formatCurrency = (amount: number) => {
    return `S/. ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
          <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Resumen de Presupuesto Consolidado</h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Todos los Sectores del Proyecto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Costo Directo Total</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(totals.directCost)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <PieChartIcon className="w-12 h-12 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Subtotal (GG + Utilidad)</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.subtotal)}</p>
        </div>
        <div className="bg-[#003366] p-5 rounded-2xl shadow-xl shadow-blue-900/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition-transform">
            <Activity className="w-12 h-12 text-white" />
          </div>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Presupuesto Total (Inc. IGV)</p>
          <p className="text-2xl font-black text-white">{formatCurrency(totals.totalConIgv)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                  <PieChartIcon className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Distribución por Sector</h3>
              </div>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              formatter={(value) => <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{value}</span>}
                          />
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Componentes del Presupuesto</h3>
              </div>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={componentsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                          <XAxis type="number" hide />
                          <YAxis 
                              dataKey="name" 
                              type="category" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 9, fontWeight: 'bold', fill: '#6b7280' }}
                              width={100}
                          />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {componentsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 uppercase text-[10px] font-bold border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-4 text-left">Sector</th>
                <th className="px-4 py-4 text-right">Costo Directo</th>
                <th className="px-4 py-4 text-right">GG + Utilidad</th>
                <th className="px-4 py-4 text-right">Subtotal</th>
                <th className="px-4 py-4 text-right">Otros Gastos</th>
                <th className="px-4 py-4 text-right">Tarifa/Fee</th>
                <th className="px-4 py-4 text-right bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">Total Inc. IGV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {summaryData.map((data, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-4 font-bold text-gray-900 dark:text-white">{data.sectorName}</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency(data.directCost)}</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency(data.gastosGenerales + data.utilidad)}</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency(data.subtotal)}</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency(data.otrosGastos)}</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency(data.tarifaFee)}</td>
                  <td className="px-4 py-4 text-right font-mono font-black bg-blue-50/30 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300">
                    {formatCurrency(data.totalConIgv)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-900 text-white font-bold">
              <tr>
                <td className="px-4 py-4 text-left uppercase tracking-wider">Totales Consolidados</td>
                <td className="px-4 py-4 text-right font-mono">{formatCurrency(totals.directCost)}</td>
                <td className="px-4 py-4 text-right font-mono">{formatCurrency(totals.gastosGenerales + totals.utilidad)}</td>
                <td className="px-4 py-4 text-right font-mono">{formatCurrency(totals.subtotal)}</td>
                <td className="px-4 py-4 text-right font-mono">{formatCurrency(totals.otrosGastos)}</td>
                <td className="px-4 py-4 text-right font-mono">{formatCurrency(totals.tarifaFee)}</td>
                <td className="px-4 py-4 text-right font-mono text-blue-300 text-sm">
                  {formatCurrency(totals.totalConIgv)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Notas de Cálculo Consolidado
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-blue-800 dark:text-blue-300">
          <ul className="space-y-2 list-disc pl-4">
            <li>Gastos Generales calculados al 14.46% del Costo Directo.</li>
            <li>Utilidad calculada al 10.00% del Costo Directo.</li>
            <li>Tarifa o Fee calculada al 9.25% del Costo Determinado.</li>
          </ul>
          <ul className="space-y-2 list-disc pl-4">
            <li>IGV aplicado al 18.00% sobre el Total sin IGV.</li>
            <li>Otros Gastos incluyen Gestión, Buena Vecindad, Áreas Auxiliares y Derecho de Cantera.</li>
            <li>Los valores mostrados son proyecciones basadas en los metrados contractuales de cada sector.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
