
import React, { useState, useRef } from "react";
import { Sector, DikeConfig, MeasurementEntry, BudgetSection, ProtocolEntry } from "../types";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Database, Trash2, Save, X, Info, Layers, Activity, Download } from "lucide-react";
import { Button } from "./Button";
import * as XLSX from "xlsx";

interface GlobalImportPanelProps {
  sectors: Sector[];
  dikes: DikeConfig[];
  onImport: (data: { measurements: MeasurementEntry[], protocols: ProtocolEntry[] }) => void;
}

export const GlobalImportPanel: React.FC<GlobalImportPanelProps> = ({ sectors, dikes, onImport }) => {
  const [importData, setImportData] = useState<any[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("ALL");
  const [importMode, setImportMode] = useState<'unified' | 'metrados' | 'protocols'>('unified');
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading', message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = (type: 'unified' | 'metrados' | 'protocols' | 'detailed') => {
    let headers: string[] = [];
    let fileName = "";

    const common = ['DIQUE', 'PK', 'DISTANCIA', 'TERRENO', 'ENROCADO', 'INTERVENCION'];
    const items = ['403.A', '404.A', '404.D', '413.A', '402.B', '402.E', '406.A', '401.A', '409.A', '412.A'];
    const protocolFields = ['PROTOCOLO', 'MES', 'ESTADO'];

    switch (type) {
      case 'unified':
        headers = [...common, ...protocolFields, ...items];
        fileName = "Plantilla_Importacion_Unificada.xlsx";
        break;
      case 'metrados':
        headers = [...common, ...items];
        fileName = "Plantilla_Importacion_Metrados.xlsx";
        break;
      case 'protocols':
        headers = ['DIQUE', 'PK', ...protocolFields];
        fileName = "Plantilla_Importacion_Protocolos.xlsx";
        break;
      case 'detailed':
        // Comprehensive list of items
        const allItems = [
            '401.A', '402.B', '402.B_MM', '402.C', '402.D', '402.E', '402.E_MM', 
            '403.A', '403.A_MM', '403.B', '404.A', '404.A_MM', '404.B', '404.D', 
            '404.D_MM', '404.E', '404.G', '404.H', '405.A', '406.A', '407.A', 
            '408.A', '409.A', '409.B', '410.A', '410.B', '412.A', '413.A', 
            '413.A_MM', '414.A', '415', '416.A'
        ];
        headers = [...common, ...protocolFields, ...allItems];
        fileName = "Plantilla_Importacion_Detallada_Completa.xlsx";
        break;
    }

    const sampleData = [
      headers.reduce((acc, h) => ({ ...acc, [h]: h === 'DIQUE' ? (dikes[0]?.name || 'DIQUE 01 MI') : h === 'PK' ? '0+000' : h === 'DISTANCIA' ? 20 : h === 'TERRENO' ? 'B1' : h === 'ENROCADO' ? 'TIPO 2' : h === 'ESTADO' ? 'EJECUTADO' : '' }), {})
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, fileName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus({ type: 'loading', message: 'Procesando archivo...' });
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
            setStatus({ type: 'error', message: 'El archivo está vacío o no tiene el formato correcto.' });
            return;
        }

        setImportData(data);
        setStatus({ type: 'success', message: `Se han cargado ${data.length} filas. Revise la previsualización antes de confirmar.` });
      } catch (err) {
        setStatus({ type: 'error', message: 'Error al leer el archivo Excel.' });
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImport = () => {
    if (importData.length === 0) return;

    const newMeasurements: MeasurementEntry[] = [];
    const newProtocols: ProtocolEntry[] = [];
    const pkCheck: Record<string, Set<string>> = {}; // dikeId -> Set of PKs
    const dikeStats: Record<string, { count: number, name: string }> = {};

    importData.forEach((row, idx) => {
      // Find dike by name or ID
      const dikeName = String(row.DIQUE || row.Dique || row.dique || "").trim();
      const dike = dikes.find(d => d.name === dikeName || d.id === dikeName);
      
      if (!dike) return;
      
      // Filter by sector if selected
      if (selectedSectorId !== "ALL" && dike.sectorId !== selectedSectorId) return;

      const pk = String(row.PK || row.Progresiva || row.PROGRESIVA || row.pk || "").trim();
      if (!pk) return;

      // Duplicate PK Validation
      if (!pkCheck[dike.id]) pkCheck[dike.id] = new Set();
      if (pkCheck[dike.id].has(pk)) {
          console.warn(`PK duplicado detectado: ${pk} en dique ${dike.name}`);
          return; // Skip duplicates within the same dike in the same import
      }
      pkCheck[dike.id].add(pk);

      const mId = `M_${dike.id}_${pk.replace(/\+/g, '_')}_${idx}`;
      
      const measurement: MeasurementEntry = {
        id: mId,
        dikeId: dike.id,
        pk: pk,
        distancia: parseFloat(row.DISTANCIA || row.Distancia || row.distancia || "0") || 0,
        tipoTerreno: String(row.TERRENO || row.Terreno || row.tipoTerreno || "B1").trim(),
        tipoEnrocado: String(row.ENROCADO || row.Enrocado || row.tipoEnrocado || "TIPO 2").trim(),
        intervencion: String(row.INTERVENCION || row.Intervencion || row.intervencion || "IMPORTACIÓN GLOBAL").trim(),
        item501A_Carguio: 1 // Default to executed if imported
      };

      // Map items (item403A, etc)
      Object.keys(row).forEach(key => {
          if (key.startsWith('item') || key.match(/^\d+\.\w/)) {
              const cleanKey = key.startsWith('item') ? key : `item${key.replace(/\./g, '')}`;
              measurement[cleanKey] = parseFloat(row[key]) || 0;
          }
      });

      newMeasurements.push(measurement);

      // Stats tracking
      if (!dikeStats[dike.id]) dikeStats[dike.id] = { count: 0, name: dike.name };
      dikeStats[dike.id].count++;

      // Create protocol entry if protocol number exists
      const protocolNum = String(row.PROTOCOLO || row.Protocolo || row.protocolo || "").trim();
      const valMonth = String(row.MES || row.Mes || row.VALORIZACION || "").trim();
      const estadoTramo = String(row.ESTADO || row.Estado || row.estado || "EJECUTADO").toUpperCase();

      if (protocolNum || importMode === 'protocols') {
          const protocol: ProtocolEntry = {
              id: `P_${mId}`,
              dikeId: dike.id,
              measurementId: mId,
              estado: (estadoTramo === "PENDIENTE" || estadoTramo === "SIN EJECUTAR") ? estadoTramo : "EJECUTADO",
              pkRio: "",
              pkDique: pk,
              distancia: measurement.distancia,
              tipoEnrocado: measurement.tipoEnrocado,
              tipoTerreno: measurement.tipoTerreno,
              intervencion: measurement.intervencion,
              protocols: {},
              valuationMonths: {}
          };

          // Map items to protocol
          Object.keys(measurement).forEach(k => {
              if (k.startsWith('item') && measurement[k] > 0) {
                  protocol.protocols[k] = protocolNum || "P-PENDIENTE";
                  if (valMonth) protocol.valuationMonths![k] = valMonth;
              }
          });

          newProtocols.push(protocol);
      }
    });

    if (newMeasurements.length > 0) {
        onImport({ measurements: newMeasurements, protocols: newProtocols });
        
        const statsSummary = Object.values(dikeStats)
            .map(s => `${s.name}: ${s.count} filas`)
            .join(', ');

        setStatus({ 
            type: 'success', 
            message: `Importación exitosa. Procesado correctamente: ${statsSummary}. Total: ${newMeasurements.length} metrados y ${newProtocols.length} protocolos vinculados.` 
        });
        setImportData([]);
    } else {
        setStatus({ type: 'error', message: 'No se encontraron registros válidos para importar. Verifique los nombres de los diques en su archivo.' });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Importación Global de Metrados y Protocolos</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cargue datos de múltiples diques y sectores en un solo paso</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">1. Seleccionar Sector de Destino</label>
                        <select 
                            value={selectedSectorId} 
                            onChange={(e) => setSelectedSectorId(e.target.value)}
                            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="ALL">TODOS LOS SECTORES</option>
                            {sectors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">2. Modo de Importación</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['unified', 'metrados', 'protocols'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setImportMode(mode)}
                                    className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all border ${
                                        importMode === mode 
                                            ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                    }`}
                                >
                                    {mode === 'unified' ? 'Unificado' : mode === 'metrados' ? 'Metrados' : 'Protocolos'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-4">3. Seleccione su archivo Excel (.xlsx, .xls)</p>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".xlsx,.xls" 
                        onChange={handleFileUpload} 
                    />
                    <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 w-full mb-4">
                        <Upload className="w-4 h-4 mr-2" /> Cargar Archivo
                    </Button>

                    <div className="w-full pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Descargar Plantillas</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => downloadTemplate('unified')} className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[9px] font-bold hover:bg-gray-50 transition-colors">
                                <Download className="w-3 h-3 text-blue-600" /> Unificado
                            </button>
                            <button onClick={() => downloadTemplate('metrados')} className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[9px] font-bold hover:bg-gray-50 transition-colors">
                                <Download className="w-3 h-3 text-green-600" /> Metrados
                            </button>
                            <button onClick={() => downloadTemplate('protocols')} className="flex items-center justify-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[9px] font-bold hover:bg-gray-50 transition-colors">
                                <Download className="w-3 h-3 text-purple-600" /> Protocolos
                            </button>
                            <button onClick={() => downloadTemplate('detailed')} className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg text-[9px] font-bold hover:bg-indigo-100 transition-colors col-span-2">
                                <Download className="w-3 h-3 text-indigo-600" /> Detallado y Completo
                            </button>
                        </div>
                    </div>
                </div>

                {status.type !== 'idle' && (
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                        status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                        status.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                        'bg-blue-50 border-blue-200 text-blue-800'
                    }`}>
                        {status.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : 
                         status.type === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : 
                         <Activity className="w-5 h-5 shrink-0 animate-spin" />}
                        <p className="text-xs font-bold">{status.message}</p>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50">
                <h3 className="text-[11px] font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Instrucciones de Formato
                </h3>
                <ul className="space-y-2 text-[10px] text-blue-800 dark:text-blue-300 font-medium">
                    <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span><strong>DIQUE:</strong> Nombre exacto del dique o su ID (ej: DIPR_001_MI).</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span><strong>PK:</strong> Progresiva en formato 0+000.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span><strong>PARTIDAS:</strong> Use códigos como "403.A" o "item403A" como encabezados.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span><strong>PROTOCOLOS:</strong> Agregue una columna "PROTOCOLO" para activar el tramo automáticamente.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span><strong>VALORIZACIÓN:</strong> Use la columna "MES" para asignar el periodo de pago.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <span><strong>ESTADO:</strong> Columna opcional para "EJECUTADO", "PENDIENTE" o "SIN EJECUTAR".</span>
                    </li>
                </ul>
            </div>
        </div>

        {importData.length > 0 && (
            <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Previsualización de Datos</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setImportData([])} className="text-red-600 border-red-200 hover:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" /> Cancelar
                        </Button>
                        <Button onClick={processImport} className="bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] tracking-widest">
                            <Activity className="w-4 h-4 mr-2" /> INICIAR PROCESO Y REPARTIR DATOS
                        </Button>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px]">
                        <table className="w-full text-left border-collapse text-[10px]">
                            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 font-bold uppercase border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {Object.keys(importData[0]).map(key => (
                                        <th key={key} className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {importData.slice(0, 10).map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        {Object.values(row).map((val: any, j) => (
                                            <td key={j} className="px-3 py-1.5 border-r border-gray-100 dark:border-gray-800 truncate max-w-[150px]">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {importData.length > 10 && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center text-[10px] text-gray-500 italic">
                                Mostrando 10 de {importData.length} filas...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
