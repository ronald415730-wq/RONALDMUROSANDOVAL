
import React, { useState, useMemo } from "react";
import { DikeConfig, MeasurementEntry, Sector, ProgressEntry } from "../types";
import { Button } from "./Button";
import { FileSpreadsheet, FileText, LayoutGrid, BookOpen, ChevronRight, ChevronDown } from "lucide-react";
import * as XLSX from 'xlsx';

interface ReportsPanelProps {
    sectors: Sector[];
    dikes: DikeConfig[];
    measurements: MeasurementEntry[];
    progressEntries: ProgressEntry[];
    budgetBySector?: Record<string, import("../types").BudgetSection[]>;
    filterSectorId?: string;
    filterDikeId?: string;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ 
    sectors, 
    dikes, 
    measurements, 
    progressEntries, 
    budgetBySector,
    filterSectorId = "ALL",
    filterDikeId = "ALL"
}) => {
    const [activeReport, setActiveReport] = useState<"dike" | "summary" | "execution" | "global" | "sector">("dike");
    const [terrainType, setTerrainType] = useState<"B1" | "B2">("B1");
    const [localFilterSectorId, setLocalFilterSectorId] = useState<string>(filterSectorId);

    // Sync with global filter if it changes
    React.useEffect(() => {
        setLocalFilterSectorId(filterSectorId);
    }, [filterSectorId]);

    const B1_PARTIDAS = [
        { id: 'item401A', label: '401.A', desc: 'DESBROCE Y LIMPIEZA', unit: 'ha' },
        { id: 'item402B', label: '402.B', desc: 'EXCAVACIÓN MASIVA EN MATERIAL SUELTO, CON EQUIPO', unit: 'm3' },
        { id: 'item402C', label: '402.C', desc: 'EXCAVACIÓN EN ROCA SUELTA CON EQUIPO', unit: 'm3' },
        { id: 'item402D', label: '402.D', desc: 'EXCAVACIÓN DE ROCA FIJA CON MARTILLO HIDRÁULICO', unit: 'm3' },
        { id: 'item402E', label: '402.E', desc: 'EXCAVACION DE UÑA EN MATERIAL CON NIVEL FREATICO', unit: 'm3' },
        { id: 'item403A', label: '403.A', desc: 'CONFORMACIÓN Y COMPACTACIÓN DE DIQUE', unit: 'm3' },
        { id: 'item404A', label: '404.A', desc: 'ENROCADO Y ACOMODO PARA PROTECCIÓN DE TALUD TIPO 1', unit: 'm3' },
        { id: 'item404B', label: '404.B', desc: 'ENROCADO Y ACOMODO PARA PROTECCIÓN DE TALUD TIPO 2', unit: 'm3' },
        { id: 'item404D', label: '404.D', desc: 'ENROCADO Y ACOMODO EN UÑA ANTISOCAVANTE TIPO 1', unit: 'm3' },
        { id: 'item404E', label: '404.E', desc: 'ENROCADO Y ACOMODO EN UÑA ANTISOCAVANTE TIPO 2', unit: 'm3' },
        { id: 'item405A', label: '405.A', desc: 'DESCOLMATACIÓN DEL CAUCE', unit: 'm3' },
        { id: 'item406A', label: '406.A', desc: 'REFINE Y PERFILADO DE TALUD', unit: 'm2' },
        { id: 'item407A', label: '407.A', desc: 'MEJORAMIENTO DEL SUELO DE FUNDACION', unit: 'm3' },
        { id: 'item408A', label: '408.A', desc: 'ZANJA Y RELLENO PARA ANCLAJE DE GEOTEXTIL', unit: 'ml' },
        { id: 'item409A', label: '409.A', desc: 'GEOTEXTIL NO TEJIDO CLASE 1, INCLUYE INSTALACIÓN', unit: 'm2' },
        { id: 'item409B', label: '409.B', desc: 'GEOTEXTIL NO TEJIDO CLASE 2, INCLUYE INSTALACIÓN', unit: 'm2' },
        { id: 'item410A', label: '410.A', desc: 'CONFORMACIÓN DE DME/DMO', unit: 'm3' },
        { id: 'item410B', label: '410.B', desc: 'CONFORMACIÓN DE MATERIAL EXCEDENTE EN TRASDOS DE DIQUE', unit: 'm3' },
        { id: 'item412A', label: '412.A', desc: 'RELLENO COMPACTADO CON MATERIAL PARA AFIRMADO EN CORONA', unit: 'm3' },
        { id: 'item413A', label: '413.A', desc: 'RELLENO CON MATERIAL PROPIO', unit: 'm3' },
        { id: 'item414A', label: '414.A', desc: 'TRATAMIENTO DE TALUD CON GEOCELDAS', unit: 'm2' },
        { id: 'item416A', label: '416.A', desc: 'PERFILADO Y COMPACTACION PARA FUNDACIÓN DE DIQUE', unit: 'm2' },
    ];

    const B2_PARTIDAS = [
        { id: 'item402B', label: '402.B', desc: 'EXCAVACIÓN EN MATERIAL SUELTO, CON EQUIPO', unit: 'm3' },
        { id: 'item402C', label: '402.C', desc: 'EXCAVACIÓN EN ROCA SUELTA CON EQUIPO', unit: 'm3' },
        { id: 'item402E', label: '402.E', desc: 'EXCAVACIÓN DE UÑA EN MATERIAL CON NIVEL FREÁTICO', unit: 'm3' },
        { id: 'item403A', label: '403.A', desc: 'CONFORMACIÓN Y COMPACTACIÓN DE DIQUE', unit: 'm3' },
        { id: 'item403B', label: '403.B', desc: 'RECRECIMIENTO Y CONFORMACION EN DIQUE EXISTENTE', unit: 'm3' },
        { id: 'item404G', label: '404.G', desc: 'ENROCADO Y ACOMODO PARA PROTECCIÓN DE TALUD EN DIQUE EXISTENTE TIPO 2', unit: 'm3' },
        { id: 'item404H', label: '404.H', desc: 'ENROCADO Y ACOMODO EN UÑA ANTISOCAVANTE EN DIQUE EXISTENTE TIPO 1', unit: 'm3' },
        { id: 'item409A', label: '409.A', desc: 'GEOTEXTIL NO TEJIDO CLASE 1, INCLUYE INSTALACIÓN', unit: 'm2' },
        { id: 'item412A', label: '412.A', desc: 'RELLENO COMPACTADO CON MATERIAL PARA AFIRMADO EN CORONA', unit: 'm3' },
        { id: 'item413A', label: '413.A', desc: 'RELLENO CON MATERIAL PROPIO', unit: 'm3' },
        { id: 'item415', label: '415', desc: 'GAVIÓN (INCLUYE INSTALACIÓN)', unit: 'm3' },
        { id: 'item416A', label: '416.A', desc: 'PERFILADO Y COMPACTACION DE CORONA EN DIQUE EXISTENTE', unit: 'm3' },
    ];

    const currentPartidas = terrainType === "B1" ? B1_PARTIDAS : B2_PARTIDAS;

    const selectedSectorName = useMemo(() => {
        if (localFilterSectorId === "ALL") return "Todos los Sectores";
        return sectors.find(s => s.id === localFilterSectorId)?.name || localFilterSectorId;
    }, [localFilterSectorId, sectors]);

    const calculateDikeVolumes = (dikeId: string) => {
        const dikeEntries = measurements.filter(m => m.dikeId === dikeId && m.tipoTerreno === terrainType).sort((a, b) => {
            const parsePk = (pkStr: string): number => {
                const clean = pkStr.replace(/\s/g, '');
                if (clean.includes('+')) {
                    const [km, m] = clean.split('+');
                    return (parseFloat(km || "0") * 1000) + parseFloat(m || "0");
                }
                return parseFloat(clean) || 0;
            };
            return parsePk(a.pk) - parsePk(b.pk);
        });

        const totals: Record<string, number> = {};
        currentPartidas.forEach(p => totals[p.id] = 0);

        for (let i = 1; i < dikeEntries.length; i++) {
            const prev = dikeEntries[i - 1];
            const curr = dikeEntries[i];
            const dist = curr.distancia;

            currentPartidas.forEach(p => {
                const area1 = (prev as any)[p.id] || 0;
                const area2 = (curr as any)[p.id] || 0;
                const volume = ((area1 + area2) / 2) * dist;
                totals[p.id] += volume;
            });
        }

        return totals;
    };

    const dikeData = useMemo(() => {
        const filteredDikes = dikes.filter(d => 
            (localFilterSectorId === "ALL" || d.sectorId === localFilterSectorId) &&
            (filterDikeId === "ALL" || d.id === filterDikeId)
        );
        return filteredDikes.map(dike => {
            return {
                ...dike,
                volumes: calculateDikeVolumes(dike.id)
            };
        });
    }, [dikes, measurements, terrainType, localFilterSectorId, filterDikeId]);

    const totalVolumes = useMemo(() => {
        const totals: Record<string, number> = {};
        currentPartidas.forEach(p => {
            totals[p.id] = dikeData.reduce((acc, d) => acc + (d.volumes[p.id] || 0), 0);
        });
        return totals;
    }, [dikeData, currentPartidas]);

    const globalVolumes = useMemo(() => {
        const results: Record<string, Record<string, number>> = {
            "B1": {},
            "B2": {}
        };

        const filteredDikesForGlobal = localFilterSectorId === "ALL" ? dikes : dikes.filter(d => d.sectorId === localFilterSectorId);

        ["B1", "B2"].forEach(tType => {
            const partidas = tType === "B1" ? B1_PARTIDAS : B2_PARTIDAS;
            partidas.forEach(p => {
                results[tType][p.id] = 0;
            });

            filteredDikesForGlobal.forEach(dike => {
                const dikeEntries = measurements.filter(m => m.dikeId === dike.id && m.tipoTerreno === tType).sort((a, b) => {
                    const parsePk = (pkStr: string): number => {
                        const clean = pkStr.replace(/\s/g, '');
                        if (clean.includes('+')) {
                            const [km, m] = clean.split('+');
                            return (parseFloat(km || "0") * 1000) + parseFloat(m || "0");
                        }
                        return parseFloat(clean) || 0;
                    };
                    return parsePk(a.pk) - parsePk(b.pk);
                });

                for (let i = 1; i < dikeEntries.length; i++) {
                    const prev = dikeEntries[i - 1];
                    const curr = dikeEntries[i];
                    const dist = curr.distancia;

                    partidas.forEach(p => {
                        const area1 = (prev as any)[p.id] || 0;
                        const area2 = (curr as any)[p.id] || 0;
                        const volume = ((area1 + area2) / 2) * dist;
                        results[tType][p.id] += volume;
                    });
                }
            });
        });

        return results;
    }, [dikes, measurements]);

    const sectorSummaryData = useMemo(() => {
        if (!budgetBySector) return [];

        const filteredSectors = localFilterSectorId === "ALL" ? sectors : sectors.filter(s => s.id === localFilterSectorId);

        return filteredSectors.map(sector => {
            const sectorBudget = budgetBySector[sector.id] || [];
            const sectorDikes = dikes.filter(d => d.sectorId === sector.id && (filterDikeId === "ALL" || d.id === filterDikeId));
            
            let totalContractual = 0;
            let totalExecuted = 0;

            // Calculate volumes for this sector's dikes
            const sectorDikeVolumes: Record<string, number> = {};
            
            sectorDikes.forEach(dike => {
                ["B1", "B2"].forEach(tType => {
                    const dikeEntries = measurements.filter(m => m.dikeId === dike.id && m.tipoTerreno === tType).sort((a, b) => {
                        const parsePk = (pkStr: string): number => {
                            const clean = pkStr.replace(/\s/g, '');
                            if (clean.includes('+')) {
                                const [km, m] = clean.split('+');
                                return (parseFloat(km || "0") * 1000) + parseFloat(m || "0");
                            }
                            return parseFloat(clean) || 0;
                        };
                        return parsePk(a.pk) - parsePk(b.pk);
                    });

                    const partidas = tType === "B1" ? B1_PARTIDAS : B2_PARTIDAS;
                    for (let i = 1; i < dikeEntries.length; i++) {
                        const prev = dikeEntries[i - 1];
                        const curr = dikeEntries[i];
                        const dist = curr.distancia;

                        partidas.forEach(p => {
                            const area1 = (prev as any)[p.id] || 0;
                            const area2 = (curr as any)[p.id] || 0;
                            const volume = ((area1 + area2) / 2) * dist;
                            sectorDikeVolumes[p.id] = (sectorDikeVolumes[p.id] || 0) + volume;
                        });
                    }
                });
            });

            sectorBudget.forEach(section => {
                section.groups.forEach(group => {
                    group.items.forEach(item => {
                        totalContractual += item.metrado * item.price;
                        const executedQty = sectorDikeVolumes[item.code] || 0;
                        totalExecuted += executedQty * item.price;
                    });
                });
            });

            return {
                id: sector.id,
                name: sector.name,
                contractual: totalContractual,
                executed: totalExecuted,
                balance: totalContractual - totalExecuted,
                percentage: totalContractual > 0 ? (totalExecuted / totalContractual) * 100 : 0
            };
        });
    }, [sectors, dikes, measurements, budgetBySector]);

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        let data: any[] = [];
        let sheetName = "Reporte";

        if (activeReport === "dike") {
            sheetName = `Diques_${terrainType}`;
            data = dikeData.map(d => {
                const row: any = {
                    'NOMENCLATURA': d.name,
                    'INICIO': d.progInicioDique,
                    'FIN': d.progFinDique
                };
                currentPartidas.forEach(p => {
                    row[`${p.label} (${p.unit})`] = d.volumes[p.id] || 0;
                });
                return row;
            });
        } else if (activeReport === "summary") {
            sheetName = `Resumen_${terrainType}`;
            data = currentPartidas.map(p => ({
                'ITEM': p.label,
                'DESCRIPCIÓN DE LA PARTIDA': p.desc,
                'UND': p.unit,
                'METRADOS C03': totalVolumes[p.id] || 0
            }));
        } else if (activeReport === "execution") {
            sheetName = "Estado_Ejecucion";
            data = dikeData.map(d => ({
                'DIQUE': d.name,
                'SECTOR': sectors.find(s => s.id === dikes.find(dk => dk.id === d.id)?.sectorId)?.name || '-',
                'PROG. INICIO': d.progInicioDique,
                'PROG. FIN': d.progFinDique,
                'LONGITUD TOTAL (ML)': d.totalML,
                'LONGITUD EJECUTADA (ML)': d.executedML,
                'AVANCE (%)': d.progress.toFixed(2) + '%',
                'ESTADO': d.progress >= 100 ? 'COMPLETADO' : (d.progress > 0 ? 'EN PROCESO' : 'PENDIENTE')
            }));
        } else if (activeReport === "global") {
            sheetName = "Global_Metrados";
            // Create two tables in one sheet or two sheets? Let's do two sheets for global
            const dataB1 = B1_PARTIDAS.map(p => ({
                'ITEM': p.label,
                'DESCRIPCIÓN': p.desc,
                'UND': p.unit,
                'TOTAL GLOBAL B1': globalVolumes["B1"][p.id] || 0
            }));
            const wsB1 = XLSX.utils.json_to_sheet(dataB1);
            XLSX.utils.book_append_sheet(wb, wsB1, "Global B1");

            const dataB2 = B2_PARTIDAS.map(p => ({
                'ITEM': p.label,
                'DESCRIPCIÓN': p.desc,
                'UND': p.unit,
                'TOTAL GLOBAL B2': globalVolumes["B2"][p.id] || 0
            }));
            const wsB2 = XLSX.utils.json_to_sheet(dataB2);
            XLSX.utils.book_append_sheet(wb, wsB2, "Global B2");
            
            XLSX.writeFile(wb, `Reporte_Global_${new Date().toISOString().slice(0, 10)}.xlsx`);
            return;
        } else if (activeReport === "sector") {
            sheetName = "Resumen_Sectores";
            data = sectorSummaryData.map(s => ({
                'SECTOR': s.name,
                'PRESUPUESTO CONTRACTUAL': s.contractual,
                'MONTO EJECUTADO': s.executed,
                'SALDO POR EJECUTAR': s.balance,
                'AVANCE (%)': s.percentage.toFixed(2) + '%'
            }));
        }

        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `Reporte_${activeReport}_${terrainType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveReport("dike")}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeReport === 'dike' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Reporte por Dique
                        </button>
                        <button 
                            onClick={() => setActiveReport("summary")}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeReport === 'summary' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Resumen de Reporte de metrados total
                        </button>
                        <button 
                            onClick={() => setActiveReport("execution")}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeReport === 'execution' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Control de Estado General de Ejecucion
                        </button>
                        <button 
                            onClick={() => setActiveReport("global")}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeReport === 'global' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Resumen Global de Metrados
                        </button>
                        <button 
                            onClick={() => setActiveReport("sector")}
                            className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeReport === 'sector' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Resumen por Sector
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Sector:</span>
                        <select 
                            className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-blue-600 dark:text-blue-400 outline-none"
                            value={localFilterSectorId}
                            onChange={(e) => setLocalFilterSectorId(e.target.value)}
                        >
                            <option value="ALL">Todos los Sectores</option>
                            {sectors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white text-xs h-9 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
                <button 
                    onClick={() => setTerrainType("B1")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-x border-t transition-all font-bold text-sm ${terrainType === 'B1' ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-blue-600' : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500 opacity-60'}`}
                >
                    <BookOpen className="w-4 h-4" /> TIPO DE TERRENO B1
                </button>
                <button 
                    onClick={() => setTerrainType("B2")}
                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-x border-t transition-all font-bold text-sm ${terrainType === 'B2' ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-blue-600' : 'bg-gray-100 dark:bg-gray-900 border-transparent text-gray-500 opacity-60'}`}
                >
                    <BookOpen className="w-4 h-4" /> TIPO DE TERRENO B2
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {activeReport === "dike" && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-900/50">
                                    <th rowSpan={2} className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] font-bold text-center uppercase">{selectedSectorName} - Resumen de Metrados por Dique</th>
                                    {currentPartidas.map(p => (
                                        <th key={p.id} className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] font-bold text-center uppercase">{p.label}</th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-100 dark:bg-gray-900/50">
                                    {currentPartidas.map(p => (
                                        <th key={p.id} className="p-2 border border-gray-300 dark:border-gray-700 text-[8px] font-medium text-center uppercase leading-tight max-w-[100px]">{p.desc}</th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-200 dark:bg-gray-800">
                                    <th className="p-4 border border-gray-300 dark:border-gray-700 text-4xl font-black text-center">{terrainType}</th>
                                    {currentPartidas.map(p => (
                                        <th key={p.id} className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] font-bold text-center uppercase">{p.unit}</th>
                                    ))}
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-900/30">
                                    <th className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] font-bold uppercase">Nomenclatura</th>
                                    {currentPartidas.map(p => (
                                        <th key={p.id} className="p-2 border border-gray-300 dark:border-gray-700"></th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dikeData.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] font-bold">{d.name}</td>
                                        {currentPartidas.map(p => (
                                            <td key={p.id} className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] text-right font-mono">
                                                {d.volumes[p.id] ? d.volumes[p.id].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-100 dark:bg-gray-900 font-bold">
                                    <td className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] text-center uppercase">Total</td>
                                    {currentPartidas.map(p => (
                                        <td key={p.id} className="p-2 border border-gray-300 dark:border-gray-700 text-[10px] text-right font-mono">
                                            {totalVolumes[p.id] ? totalVolumes[p.id].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {activeReport === "summary" && (
                    <div className="p-6 max-w-4xl mx-auto">
                        <h2 className="text-xl font-bold mb-6 uppercase text-center">RESUMEN 400 - MOVIMIENTO DE TIERRAS - {terrainType} - {selectedSectorName}</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-800">
                                    <th className="p-3 border border-gray-400 text-left text-xs font-bold uppercase">Item</th>
                                    <th className="p-3 border border-gray-400 text-left text-xs font-bold uppercase">Descripción de la Partida</th>
                                    <th className="p-3 border border-gray-400 text-center text-xs font-bold uppercase">Und</th>
                                    <th className="p-3 border border-gray-400 text-right text-xs font-bold uppercase bg-gray-300 dark:bg-gray-700">Metrados C03</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentPartidas.map((p, idx) => (
                                    <tr key={p.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/30'}>
                                        <td className="p-2 border border-gray-300 dark:border-gray-700 text-xs font-bold">{p.label}</td>
                                        <td className="p-2 border border-gray-300 dark:border-gray-700 text-xs uppercase">{p.desc}</td>
                                        <td className="p-2 border border-gray-300 dark:border-gray-700 text-xs text-center">{p.unit}</td>
                                        <td className="p-2 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono font-bold">
                                            {totalVolumes[p.id] ? totalVolumes[p.id].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeReport === "execution" && (
                    <div className="p-4">
                        <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter text-center">Control Estado General de Dique - {selectedSectorName}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-[#003366] text-white">
                                        <th className="p-2 border border-white/20 uppercase">Estado</th>
                                        <th className="p-2 border border-white/20 uppercase">Dique</th>
                                        <th className="p-2 border border-white/20 uppercase">Pk Rio</th>
                                        <th className="p-2 border border-white/20 uppercase">Pk Dique</th>
                                        <th className="p-2 border border-white/20 uppercase">Dist. Parc.</th>
                                        <th className="p-2 border border-white/20 uppercase">Enrocado T1/T2</th>
                                        <th className="p-2 border border-white/20 uppercase">Terreno B1/B2</th>
                                        <th className="p-2 border border-white/20 uppercase">Tipo de Intervencion</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {measurements
                                        .filter(m => {
                                            const dike = dikes.find(d => d.id === m.dikeId);
                                            return dike && (localFilterSectorId === "ALL" || dike.sectorId === localFilterSectorId) && (filterDikeId === "ALL" || dike.id === filterDikeId);
                                        })
                                        .map(m => {
                                        const dike = dikes.find(d => d.id === m.dikeId);
                                        // Simple logic for "Estado" - can be refined
                                        let estado = "SIN EJECUTAR";
                                        if (m.item501A_Carguio === 1) estado = "EJECUTADO";
                                        else if (progressEntries.some(p => p.dikeId === m.dikeId)) estado = "OBRA VIAL";

                                        return (
                                            <tr key={m.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50/30 transition-colors">
                                                <td className="p-2 text-center font-bold uppercase">{estado}</td>
                                                <td className="p-2 text-center uppercase">{dike?.name || m.dikeId}</td>
                                                <td className="p-2 text-center font-mono">{m.pk}</td>
                                                <td className="p-2 text-center font-mono">{m.pk}</td> {/* Assuming Pk Dique is same for now or derived */}
                                                <td className="p-2 text-center font-mono">{m.distancia.toFixed(2)}</td>
                                                <td className="p-2 text-center uppercase">{m.tipoEnrocado}</td>
                                                <td className="p-2 text-center uppercase">{m.tipoTerreno}</td>
                                                <td className="p-2 uppercase">{m.intervencion}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeReport === "global" && (
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-6 uppercase text-center">Resumen Global de Metrados por Partida (B1 y B2) - {selectedSectorName}</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* B1 Table */}
                            <div>
                                <h3 className="text-lg font-bold mb-3 text-green-700 dark:text-green-400 border-b-2 border-green-200 pb-1">TIPO DE TERRENO B1</h3>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 dark:bg-gray-800">
                                            <th className="p-2 border border-gray-400 text-left text-[10px] font-bold uppercase">Item</th>
                                            <th className="p-2 border border-gray-400 text-left text-[10px] font-bold uppercase">Descripción</th>
                                            <th className="p-2 border border-gray-400 text-center text-[10px] font-bold uppercase">Und</th>
                                            <th className="p-2 border border-gray-400 text-right text-[10px] font-bold uppercase">Total Global</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {B1_PARTIDAS.map((p, idx) => (
                                            <tr key={p.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/30'}>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] font-bold">{p.label}</td>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] uppercase truncate max-w-[200px]" title={p.desc}>{p.desc}</td>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] text-center">{p.unit}</td>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] text-right font-mono font-bold">
                                                    {globalVolumes["B1"][p.id] ? globalVolumes["B1"][p.id].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* B2 Table */}
                            <div>
                                <h3 className="text-lg font-bold mb-3 text-orange-700 dark:text-orange-400 border-b-2 border-orange-200 pb-1">TIPO DE TERRENO B2</h3>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-200 dark:bg-gray-800">
                                            <th className="p-2 border border-gray-400 text-left text-[10px] font-bold uppercase">Item</th>
                                            <th className="p-2 border border-gray-400 text-left text-[10px] font-bold uppercase">Descripción</th>
                                            <th className="p-2 border border-gray-400 text-center text-[10px] font-bold uppercase">Und</th>
                                            <th className="p-2 border border-gray-400 text-right text-[10px] font-bold uppercase">Total Global</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {B2_PARTIDAS.map((p, idx) => (
                                            <tr key={p.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/30'}>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] font-bold">{p.label}</td>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] uppercase truncate max-w-[200px]" title={p.desc}>{p.desc}</td>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] text-center">{p.unit}</td>
                                                <td className="p-1.5 border border-gray-300 dark:border-gray-700 text-[10px] text-right font-mono font-bold">
                                                    {globalVolumes["B2"][p.id] ? globalVolumes["B2"][p.id].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeReport === "sector" && (
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-6 uppercase text-center">Resumen Consolidado por Sector</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-200 dark:bg-gray-800">
                                        <th className="p-3 border border-gray-400 text-left text-xs font-bold uppercase">Sector</th>
                                        <th className="p-3 border border-gray-400 text-right text-xs font-bold uppercase">Presupuesto Contractual</th>
                                        <th className="p-3 border border-gray-400 text-right text-xs font-bold uppercase">Monto Ejecutado</th>
                                        <th className="p-3 border border-gray-400 text-right text-xs font-bold uppercase">Saldo por Ejecutar</th>
                                        <th className="p-3 border border-gray-400 text-center text-xs font-bold uppercase">Avance (%)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sectorSummaryData.map((s, idx) => (
                                        <tr key={s.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/30'}>
                                            <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs font-bold uppercase">{s.name}</td>
                                            <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono">
                                                S/. {s.contractual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono text-green-600 dark:text-green-400 font-bold">
                                                S/. {s.executed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono text-orange-600 dark:text-orange-400">
                                                S/. {s.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-blue-500 transition-all duration-500" 
                                                            style={{ width: `${Math.min(100, s.percentage)}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold min-w-[45px]">{s.percentage.toFixed(2)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 dark:bg-gray-900 font-bold">
                                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs uppercase">Total General</td>
                                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono">
                                            S/. {sectorSummaryData.reduce((acc, s) => acc + s.contractual, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono text-green-600 dark:text-green-400">
                                            S/. {sectorSummaryData.reduce((acc, s) => acc + s.executed, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-right font-mono text-orange-600 dark:text-orange-400">
                                            S/. {sectorSummaryData.reduce((acc, s) => acc + s.balance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 border border-gray-300 dark:border-gray-700 text-xs text-center">
                                            {(() => {
                                                const totalC = sectorSummaryData.reduce((acc, s) => acc + s.contractual, 0);
                                                const totalE = sectorSummaryData.reduce((acc, s) => acc + s.executed, 0);
                                                const totalP = totalC > 0 ? (totalE / totalC) * 100 : 0;
                                                return <span className="text-blue-600 dark:text-blue-400">{totalP.toFixed(2)}%</span>;
                                            })()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
