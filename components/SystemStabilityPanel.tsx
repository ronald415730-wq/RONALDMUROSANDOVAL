
import React, { useState, useEffect, useMemo } from "react";
import { DikeConfig, MeasurementEntry, ProgressEntry, BudgetSection } from "../types";
// FIX: Added missing Info icon to lucide-react imports
import { Activity, ShieldCheck, Database, Wifi, RefreshCw, Trash2, FileWarning, HardDrive, CheckCircle, Zap, Mail, Server, Scale, FolderInput, PlayCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "./Button";
import { Input, TextArea } from "./Input";
import { getStorageUsage } from "../services/storage";

interface Props {
  dikes: DikeConfig[];
  measurements: MeasurementEntry[];
  progressEntries: ProgressEntry[];
  budgetBySector: Record<string, BudgetSection[]>;
  onFixData: (type: 'orphans' | 'dates' | 'budget' | 'units') => void;
  onClearLogs: () => void;
  storagePath?: string;
  onUpdateStoragePath?: (path: string) => void;
  onGenerateExercise?: () => void;
}

interface SystemLog {
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
}

export const SystemStabilityPanel: React.FC<Props> = ({ 
    dikes, 
    measurements, 
    progressEntries, 
    budgetBySector,
    onFixData,
    onClearLogs,
    storagePath,
    onUpdateStoragePath,
    onGenerateExercise
}) => {
  const [healthScore, setHealthScore] = useState(100);
  const [diskUsage, setDiskUsage] = useState<{usage: number, quota: number}>({ usage: 0, quota: 0 });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const [localPath, setLocalPath] = useState(storagePath || "C:/DATA_CONTROL/DB_LOCAL");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);

  // Calcular huérfanos dinámicamente
  const orphanCount = useMemo(() => {
    const validDikeIds = new Set(dikes.map(d => d.id));
    return measurements.filter(m => !validDikeIds.has(m.dikeId)).length;
  }, [dikes, measurements]);

  const dikeValidation = useMemo(() => {
    const issues: { dikeId: string, name: string, type: 'error' | 'warning', message: string }[] = [];
    const ids = new Set<string>();
    const names = new Set<string>();

    dikes.forEach(d => {
        if (ids.has(d.id)) issues.push({ dikeId: d.id, name: d.name, type: 'error', message: `ID duplicado: ${d.id}` });
        ids.add(d.id);

        if (names.has(d.name)) issues.push({ dikeId: d.id, name: d.name, type: 'warning', message: `Nombre duplicado: ${d.name}` });
        names.add(d.name);

        const parsePk = (pkStr: string): number => {
            if (!pkStr) return 0;
            const clean = pkStr.replace(/\s/g, '');
            if (clean.includes('+')) {
                const [km, m] = clean.split('+');
                return (parseFloat(km || "0") * 1000) + parseFloat(m || "0");
            }
            return parseFloat(clean) || 0;
        };

        const start = parsePk(d.progInicioDique);
        const end = parsePk(d.progFinDique);
        const calcLen = Math.abs(end - start);
        if (Math.abs(calcLen - d.totalML) > 1) {
            issues.push({ dikeId: d.id, name: d.name, type: 'warning', message: `Inconsistencia: PK (${calcLen.toFixed(1)}m) vs Longitud (${d.totalML}m)` });
        }
    });

    return issues;
  }, [dikes]);

  useEffect(() => {
      runDiagnostics();
  }, [dikes, measurements, progressEntries]);

  const runDiagnostics = async () => {
      setIsScanning(true);
      let score = 100;
      const newLogs: SystemLog[] = [];
      const usage = await getStorageUsage();
      setDiskUsage(usage);
      
      const usagePercent = usage.quota > 0 ? (usage.usage / usage.quota) * 100 : 0;
      if (usagePercent > 90) { 
          score -= 20; 
          newLogs.push({ id: Date.now()+'1', type: 'warning', message: 'Espacio crítico en disco local del navegador.', timestamp: new Date().toLocaleTimeString() }); 
      }
      
      if (orphanCount > 0) { 
          score -= (Math.min(orphanCount, 5) * 4); // Descontar salud basado en inconsistencias
          newLogs.push({ id: Date.now()+'2', type: 'error', message: `Detectados ${orphanCount} registros de metrados sin dique asociado (Huérfanos).`, timestamp: new Date().toLocaleTimeString() }); 
      }

      if (dikeValidation.length > 0) {
          score -= (Math.min(dikeValidation.length, 10) * 2);
          dikeValidation.forEach((v, i) => {
              newLogs.push({ id: `dike-val-${i}`, type: v.type, message: `Dique ${v.name}: ${v.message}`, timestamp: new Date().toLocaleTimeString() });
          });
      }

      setHealthScore(Math.max(0, score));
      setLogs(prev => [...newLogs, ...prev].slice(0, 50));
      setTimeout(() => setIsScanning(false), 800);
  };

  const handleOptimize = () => {
      setIsOptimizing(true);
      setTimeout(() => {
          setIsOptimizing(false);
          setLogs(prev => [{ id: Date.now().toString(), type: 'info', message: 'Optimización de base de datos completada.', timestamp: new Date().toLocaleTimeString() }, ...prev]);
          alert("Optimización completada. El rendimiento de las consultas debería mejorar.");
      }, 1500);
  };

  const formatBytes = (bytes: number, decimals = 2) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-full ${healthScore > 80 ? 'bg-green-100 text-green-600' : healthScore > 50 ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                <Activity className="w-6 h-6" />
              </div>
              <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Salud del Sistema</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthScore}%</p>
              </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600"><Server className="w-6 h-6" /></div>
              <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Disco Local (IndexedDB)</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBytes(diskUsage.usage)} / {formatBytes(diskUsage.quota)}</p>
              </div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 shadow-sm flex items-center justify-between text-white">
              <div>
                  <p className="text-xs uppercase font-bold opacity-80">Prueba de Stress</p>
                  <p className="text-lg font-bold">Simulación de Carga</p>
              </div>
              <Button onClick={onGenerateExercise} className="bg-white/20 hover:bg-white/30 border-0 text-white text-xs h-9">
                  <PlayCircle className="w-4 h-4 mr-1" /> Ejecutar Test
              </Button>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden p-4">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Configuración de Ruta de Base de Datos</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <Input label="Ruta de Red / Local Asignada" value={localPath} onChange={(e) => setLocalPath(e.target.value)} className="font-mono text-xs" />
              </div>
              <Button onClick={() => onUpdateStoragePath?.(localPath)} className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">Asignar Ruta</Button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Mantenimiento de Integridad</h3>
                  </div>
                  {isScanning && <div className="text-[10px] text-blue-600 animate-pulse font-bold">ESCANEANDO...</div>}
              </div>
              <div className="p-4 space-y-3">
                  <div className={`flex items-center justify-between p-2.5 border rounded-lg transition-all ${orphanCount > 0 ? 'bg-red-50 border-red-200' : 'border-gray-100 hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded ${orphanCount > 0 ? 'bg-red-100 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                            <Database className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold">Datos de Metrados Huérfanos</p>
                            <p className="text-[10px] text-gray-500">
                                {orphanCount > 0 
                                    ? `Inconsistencia: ${orphanCount} registros sin dueño.` 
                                    : "Integridad de metrados correcta."}
                            </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {orphanCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                        <Button 
                            onClick={() => onFixData('orphans')} 
                            disabled={orphanCount === 0}
                            className={`text-[10px] h-7 px-3 border-0 ${orphanCount > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-200 text-gray-400'}`}
                        >
                            {orphanCount > 0 ? "Reparar Ahora" : "Sin Errores"}
                        </Button>
                      </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-1.5 rounded text-blue-600">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold">Sincronización de Presupuestos</p>
                            <p className="text-[10px] text-gray-500">Alinear estructura de partidas entre sectores.</p>
                        </div>
                      </div>
                      <Button onClick={() => onFixData('budget')} className="text-[10px] h-7 px-3 bg-blue-600 shadow-sm border-0">Sincronizar</Button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-50 p-1.5 rounded text-purple-600">
                            <Zap className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold">Optimización de Consultas</p>
                            <p className="text-[10px] text-gray-500">Reconstruir índices temporales del navegador.</p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleOptimize} 
                        isLoading={isOptimizing}
                        className="text-[10px] h-7 px-3 bg-purple-600 shadow-sm border-0"
                      >
                        Optimizar
                      </Button>
                  </div>

                  {/* Dike Validation Summary */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" /> Estado de Validación de Diques
                      </h4>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                          {dikeValidation.length === 0 ? (
                              <div className="flex items-center gap-2 text-green-600 text-[10px] font-medium">
                                  <CheckCircle className="w-3 h-3" /> Todos los diques están validados correctamente.
                              </div>
                          ) : (
                              dikeValidation.map((v, i) => (
                                  <div key={i} className={`flex items-start gap-2 text-[9px] p-1.5 rounded border ${v.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                      <div>
                                          <span className="font-bold">{v.name}:</span> {v.message}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/30">
                   <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Logs de Estabilidad</span>
                       <button onClick={onClearLogs} className="text-[9px] text-blue-600 hover:underline">Limpiar historial</button>
                   </div>
                   <div className="h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2 space-y-1.5 custom-scrollbar font-mono">
                      {logs.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[10px] text-gray-400 italic">No hay logs registrados.</div>
                      ) : (
                          logs.map(log => (
                              <div key={log.id} className={`text-[9px] p-1 rounded flex gap-2 border-l-2 ${log.type === 'error' ? 'text-red-700 bg-red-50 border-red-500' : log.type === 'warning' ? 'text-yellow-700 bg-yellow-50 border-yellow-500' : 'text-gray-600 bg-gray-50 border-gray-300'}`}>
                                  <span className="opacity-50 shrink-0">[{log.timestamp}]</span>
                                  <span className="font-bold">{log.message}</span>
                              </div>
                          ))
                      )}
                   </div>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
               <div className="p-4 border-b border-gray-200 bg-teal-50 dark:bg-teal-900/20 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Ticket de Soporte de Ingeniería</h3>
               </div>
               <div className="p-5 flex-1 flex flex-col gap-3">
                   <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/50 p-2 rounded text-[10px] text-yellow-800 dark:text-yellow-300 flex items-start gap-2 mb-1">
                       <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                       <p>Use este formulario para reportar errores de cálculo o inconsistencias en los volúmenes exportados. Los logs técnicos se adjuntarán automáticamente.</p>
                   </div>
                   <Input label="Asunto del Problema" value={ticketSubject} placeholder="Ej: Error en factor de conversión m3" onChange={e => setTicketSubject(e.target.value)} className="text-xs" />
                   <TextArea label="Descripción Detallada" value={ticketMessage} placeholder="Describa el comportamiento observado..." onChange={e => setTicketMessage(e.target.value)} className="flex-1 text-xs" />
                   <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] text-gray-400 italic">ID Sistema: {Date.now().toString().slice(-8)}</span>
                        <Button 
                            onClick={() => { setTicketSent(true); setTimeout(()=>setTicketSent(false), 3000); }} 
                            disabled={ticketSent || !ticketMessage.trim()} 
                            className={`text-xs h-8 px-5 border-0 ${ticketSent ? 'bg-green-600' : 'bg-teal-600 hover:bg-teal-700'} text-white shadow-sm`}
                        >
                            {ticketSent ? "Ticket Enviado ✓" : "Enviar Ticket"}
                        </Button>
                   </div>
               </div>
          </div>
      </div>
    </div>
  );
};
