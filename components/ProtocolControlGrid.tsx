
import React, { useState, useMemo, useRef } from "react";
import { MeasurementEntry, DikeConfig, ProtocolEntry } from "../types";
import { ExcelService } from "../services/excelService";
import { ClipboardCheck, Search, Filter, Download, FileSpreadsheet, ChevronDown, FileUp, HelpCircle, X, Info, AlertCircle } from "lucide-react";
import { Button } from "./Button";

interface ProtocolControlGridProps {
  dike: DikeConfig | null;
  measurements: MeasurementEntry[];
  protocols: ProtocolEntry[];
  onUpdateProtocols: (protocols: ProtocolEntry[]) => void;
  filterSectorId?: string;
  filterDikeId?: string;
  dikes?: DikeConfig[];
}

export const ProtocolControlGrid: React.FC<ProtocolControlGridProps> = ({ 
  dike, 
  measurements, 
  protocols,
  onUpdateProtocols,
  filterSectorId = "ALL",
  filterDikeId = "ALL",
  dikes = []
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [textHeight, setTextHeight] = useState(10);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALL_ITEMS = [
    { id: 'item403A', label: '403.A RELLENO', sub: 'TOP-RELLD' },
    { id: 'item403A_MM', label: '403.A RELLENO M.M.', sub: 'TOP-RELLD' },
    { id: 'item402B', label: '402.B CORTE TALUD', sub: 'TOP-EXC' },
    { id: 'item402B_MM', label: '402.B CORTE TALUD M.M.', sub: 'TOP-EXC' },
    { id: 'item402E', label: '402.E CORTE UÑA', sub: 'TOP-EXC' },
    { id: 'item402E_MM', label: '402.E CORTE UÑA M.M.', sub: 'TOP-EXC' },
    { id: 'item404A', label: '404.A/404.B ENROCADO TALUD', sub: 'TOP-ENR' },
    { id: 'item404A_MM', label: '404.A/404.B ENROCADO TALUD M.M.', sub: 'TOP-ENR' },
    { id: 'item404D', label: '404.D/404.E ENROCADO UÑA', sub: 'TOP-ENR' },
    { id: 'item404D_MM', label: '404.D/404.E ENROCADO UÑA M.M.', sub: 'TOP-ENR' },
    { id: 'item413A', label: '413.A RELLENO MATERIAL PROPIO', sub: 'TOP-RELL' },
    { id: 'item413A_MM', label: '413.A RELLENO MATERIAL PROPIO M.M.', sub: 'TOP-RELL' },
    { id: 'item412A', label: '412.A AFIRMADO', sub: 'TO-AFIR' },
    { id: 'item406A', label: '406.A PERFILADO TALUD', sub: 'TOP-PERT' },
    { id: 'item401A', label: '401.A DESBROCE', sub: 'TOP-LIDES' },
    { id: 'item409A', label: '409.A GEOTEXTIL 400GR', sub: 'TOP-GEO' },
    { id: 'item409B', label: '409.B GEOTEXTIL 200GR', sub: 'TOP-GEO' },
    { id: 'item414A', label: '414.A GOECELDA', sub: 'TOP-GEOC' },
    { id: 'item415', label: '415 GAVION', sub: 'TOP-GAV' },
    { id: 'item408A', label: '408.A ZANJA Y RELLENO ANCLAJE DE GEOTEXTIL', sub: 'TOP-ZAN' },
    { id: 'item416A', label: '416.A PERFILADO Y COMPACTACIÓN FUNDACIÓN DE DIQUE', sub: 'TOP-PECOD' },
  ];

  // Sync protocols with measurements
  const syncedProtocols = useMemo(() => {
    const targetDikes = filterDikeId !== "ALL" && dike 
        ? [dike] 
        : (filterSectorId !== "ALL" ? dikes.filter(d => d.sectorId === filterSectorId) : dikes);
    
    const relevantMeasurements = measurements.filter(m => targetDikes.some(d => d.id === m.dikeId));
    
    return relevantMeasurements.map(m => {
      const existing = protocols.find(p => p.measurementId === m.id);
      if (existing) return existing;
      
      // Create default protocol entry if not exists
      return {
        id: `PROT_${m.id}`,
        dikeId: dike.id,
        measurementId: m.id,
        estado: "SIN EJECUTAR",
        pkRio: "", // This would ideally be calculated or stored in measurement
        pkDique: m.pk,
        distancia: m.distancia,
        tipoEnrocado: m.tipoEnrocado,
        tipoTerreno: m.tipoTerreno,
        intervencion: m.intervencion,
        protocols: {}
      } as ProtocolEntry;
    });
  }, [dike, measurements, protocols]);

  const filteredProtocols = useMemo(() => {
    return syncedProtocols.filter(p => {
      const matchesSearch = p.pkDique.includes(searchTerm) || p.estado.includes(searchTerm);
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const fieldValue = (p as any)[key];
        return String(fieldValue || '').toLowerCase().includes((value as string).toLowerCase());
      });
      return matchesSearch && matchesFilters;
    });
  }, [syncedProtocols, searchTerm, filters]);

  const handleUpdateProtocol = (id: string, field: string, value: any) => {
    const existingIdx = protocols.findIndex(p => p.id === id);
    let newProtocols = [...protocols];
    
    if (existingIdx !== -1) {
      newProtocols[existingIdx] = { ...newProtocols[existingIdx], [field]: value };
    } else {
      const protToCreate = syncedProtocols.find(p => p.id === id);
      if (protToCreate) {
        newProtocols.push({ ...protToCreate, [field]: value });
      }
    }
    onUpdateProtocols(newProtocols);
  };

  const handleUpdateProtocolValue = (protId: string, itemId: string, value: string) => {
    const existingIdx = protocols.findIndex(p => p.id === protId);
    let newProtocols = [...protocols];
    
    if (existingIdx !== -1) {
      newProtocols[existingIdx] = { 
        ...newProtocols[existingIdx], 
        protocols: { ...newProtocols[existingIdx].protocols, [itemId]: value } 
      };
    } else {
      const protToCreate = syncedProtocols.find(p => p.id === protId);
      if (protToCreate) {
        newProtocols.push({ 
          ...protToCreate, 
          protocols: { ...protToCreate.protocols, [itemId]: value } 
        });
      }
    }
    onUpdateProtocols(newProtocols);
  };

  const handleExport = () => {
    const exportData = filteredProtocols.map(p => {
      const row: any = {
        "ESTADO": p.estado,
        "RIO": p.pkRio,
        "DIQUE": p.pkDique,
        "DISTANCIA": p.distancia,
        "ENROCADO": p.tipoEnrocado,
        "TERRENO": p.tipoTerreno,
        "INTERVENCION": p.intervencion
      };
      ALL_ITEMS.forEach(i => {
        row[i.label] = p.protocols[i.id] || "";
      });
      return row;
    });

    ExcelService.exportTable(exportData, `Protocolos_${dike?.name || "Dique"}`, "Protocolos");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const rows = await ExcelService.importTable<any>(file);
        
        if (rows.length === 0) {
          alert("El archivo no contiene datos.");
          return;
        }

        const newProtocols = [...protocols];
        let updatedCount = 0;

        rows.forEach(row => {
          // Find PK column (DIQUE or PK DIQUE)
          const pkKey = Object.keys(row).find(k => k.toUpperCase() === "DIQUE" || k.toUpperCase() === "PK DIQUE");
          if (!pkKey || !row[pkKey]) return;

          const pk = String(row[pkKey]).trim();
          const existingIdx = newProtocols.findIndex(p => p.pkDique === pk && p.dikeId === dike?.id);
          
          let targetProtocol: ProtocolEntry;
          if (existingIdx !== -1) {
            targetProtocol = { ...newProtocols[existingIdx] };
          } else {
            const synced = syncedProtocols.find(p => p.pkDique === pk);
            if (!synced) return;
            targetProtocol = { ...synced };
          }

          // Update fields
          Object.keys(row).forEach(key => {
            const uk = key.toUpperCase();
            if (uk === "RIO") targetProtocol.pkRio = String(row[key]);
            else if (uk === "DISTANCIA") targetProtocol.distancia = parseFloat(String(row[key]).replace(/,/g, '')) || targetProtocol.distancia;
            else if (uk === "ENROCADO") targetProtocol.tipoEnrocado = String(row[key]);
            else if (uk === "TERRENO") targetProtocol.tipoTerreno = String(row[key]);
            else if (uk === "INTERVENCION" || uk === "TIPO DE INTERVENCION") targetProtocol.intervencion = String(row[key]);
            else if (uk === "ESTADO") targetProtocol.estado = String(row[key]).toUpperCase();
            
            // Check for protocol items
            const item = ALL_ITEMS.find(i => i.label.toUpperCase() === uk || i.id.toUpperCase() === uk);
            if (item) {
              targetProtocol.protocols[item.id] = String(row[key]);
            }
          });

          if (existingIdx !== -1) {
            newProtocols[existingIdx] = targetProtocol;
          } else {
            newProtocols.push(targetProtocol);
          }
          updatedCount++;
        });

        onUpdateProtocols(newProtocols);
        alert(`Se han importado/actualizado ${updatedCount} registros de protocolos.`);
    } catch (err) {
        alert("Error al importar protocolos.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!dike) return <div className="p-12 text-center">Seleccione un dique para ver el control de protocolos.</div>;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <ClipboardCheck className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Control de Protocolos Aprobados</h2>
            <p className="text-xs text-gray-500">{dike.name} - Sector {dike.sectorId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar PK o Estado..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-10">
            <Filter className="w-4 h-4 mr-2" /> Filtros
          </Button>
          
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = ".xlsx,.xls";
                  fileInputRef.current.click();
                }
              }} 
              className="h-9 text-[10px] bg-white text-green-700 border-green-200 hover:bg-green-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Importar Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = ".txt,.csv";
                  fileInputRef.current.click();
                }
              }} 
              className="h-9 text-[10px] bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <FileUp className="w-3.5 h-3.5 mr-1.5" /> Importar TXT/CSV
            </Button>
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            <Button 
              variant="outline" 
              onClick={handleExport} 
              className="h-9 text-[10px] border-gray-200 text-gray-600 hover:bg-gray-50" 
              title="Descargar Plantilla de Importación"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> Plantilla
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleImport} 
            />
          </div>

          <Button onClick={handleExport} className="h-10 bg-green-700 hover:bg-green-800 text-white">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
          </Button>

          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Ayuda de importación/exportación"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 border-l pl-3 border-gray-200">
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Altura</span>
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={textHeight}
                  onChange={e => setTextHeight(Number(e.target.value))}
                  className="w-10 h-7 text-[10px] border border-gray-200 rounded px-1 outline-none focus:ring-1 focus:ring-blue-500 text-center"
                />
                <button 
                  onClick={() => setTextHeight(prev => prev + 1)}
                  className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                >
                  +
                </button>
                <button 
                  onClick={() => setTextHeight(prev => Math.max(6, prev - 1))}
                  className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold"
                >
                  -
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 relative animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 text-blue-400 hover:text-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-blue-900">Centro de Ayuda: Importación y Exportación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
                <div className="space-y-1">
                  <p className="font-bold underline">Formato de Importación:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>TXT/CSV:</strong> Delimitado por tabulaciones o comas.</li>
                    <li><strong>XLSX:</strong> Hoja de cálculo de Excel.</li>
                    <li><strong>Columna Clave:</strong> Debe incluir una columna llamada <code className="bg-blue-100 px-1 rounded">DIQUE</code> o <code className="bg-blue-100 px-1 rounded">PK DIQUE</code> para vincular los datos.</li>
                    <li><strong>Partidas:</strong> Los encabezados deben contener el código de la partida (ej. 403.A) para importar los números de protocolo.</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-bold underline">Recomendación:</p>
                  <p>La mejor forma de asegurar el formato correcto es <strong>Exportar a Excel</strong> primero, completar los datos en el archivo y luego volver a <strong>Importar</strong> el mismo archivo.</p>
                  <div className="flex items-center gap-2 mt-2 p-2 bg-blue-100/50 rounded border border-blue-200">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <span>El sistema buscará coincidencias por Progresiva (PK) para actualizar los registros existentes.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table 
            className="w-max text-left border-collapse table-fixed"
            style={{ 
              fontSize: `${textHeight}px`, 
              fontFamily: "'Arial Narrow', Arial, sans-serif",
              lineHeight: '1.2'
            }}
          >
            <thead className="bg-[#003366] text-white sticky top-0 z-20">
              <tr className="text-center font-bold border-b border-white/20">
                <th className="px-2 py-3 border-r border-white/20 w-[100px] uppercase">Estado y Control</th>
                <th colSpan={2} className="px-2 py-3 border-r border-white/20 uppercase">Progresivas</th>
                <th className="px-2 py-3 border-r border-white/20 w-[80px] uppercase">Distancia</th>
                <th className="px-2 py-3 border-r border-white/20 w-[100px] uppercase">Enrocado</th>
                <th className="px-2 py-3 border-r border-white/20 w-[80px] uppercase">Terreno</th>
                <th className="px-2 py-3 border-r border-white/20 w-[200px] uppercase">Tipo de Intervención</th>
                {ALL_ITEMS.map(item => (
                  <th key={item.id} className="px-2 py-3 border-r border-white/20 min-w-[100px] uppercase">
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      <span className="text-[8px] opacity-70">{item.sub}</span>
                    </div>
                  </th>
                ))}
              </tr>
              <tr className="bg-[#004080] text-[9px] text-center border-b border-white/10">
                <th className="px-2 py-1 border-r border-white/10">ESTADO</th>
                <th className="px-2 py-1 border-r border-white/10 w-[80px]">RIO</th>
                <th className="px-2 py-1 border-r border-white/10 w-[80px]">DIQUE</th>
                <th className="px-2 py-1 border-r border-white/10">PARCIAL (m)</th>
                <th className="px-2 py-1 border-r border-white/10">T1 / T2</th>
                <th className="px-2 py-1 border-r border-white/10">B1 / B2</th>
                <th className="px-2 py-1 border-r border-white/10">MATERIAL A INSTALAR</th>
                {ALL_ITEMS.map(item => (
                  <th key={item.id} className="px-2 py-1 border-r border-white/10">N° PROTOCOLO</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProtocols.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="border-r border-gray-100 p-0">
                    <select 
                      value={p.estado}
                      onChange={e => handleUpdateProtocol(p.id, 'estado', e.target.value)}
                      style={{ fontSize: `${textHeight}px` }}
                      className={`w-full h-full p-2 outline-none font-bold text-center transition-colors ${
                        p.estado === 'EJECUTADO' ? 'bg-green-100 text-green-700' : 
                        p.estado === 'PENDIENTE' ? 'bg-orange-100 text-orange-700' : 
                        p.estado === 'IGP25' ? 'bg-blue-100 text-blue-700' :
                        p.estado === 'OBRA VIAL' ? 'bg-purple-100 text-purple-700' :
                        p.estado === 'OBRA HIDRAULICA' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-transparent text-gray-400'
                      }`}
                    >
                      <option value="SIN EJECUTAR">SIN EJECUTAR</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="IGP25">IGP25</option>
                      <option value="EJECUTADO">EJECUTADO</option>
                      <option value="OBRA VIAL">OBRA VIAL</option>
                      <option value="OBRA HIDRAULICA">OBRA HIDRAULICA</option>
                    </select>
                  </td>
                  <td className="border-r border-gray-100 p-2 text-center">
                    <input 
                      type="text" 
                      value={p.pkRio}
                      onChange={e => handleUpdateProtocol(p.id, 'pkRio', e.target.value)}
                      style={{ fontSize: `${textHeight}px` }}
                      className="w-full bg-transparent outline-none text-center"
                      placeholder="0+000"
                    />
                  </td>
                  <td className="border-r border-gray-100 p-2 text-center font-bold bg-gray-50" style={{ fontSize: `${textHeight}px` }}>{p.pkDique}</td>
                  <td className="border-r border-gray-100 p-2 text-right" style={{ fontSize: `${textHeight}px` }}>{p.distancia.toFixed(2)}</td>
                  <td className="border-r border-gray-100 p-2 text-center" style={{ fontSize: `${textHeight}px` }}>{p.tipoEnrocado}</td>
                  <td className="border-r border-gray-100 p-2 text-center" style={{ fontSize: `${textHeight}px` }}>{p.tipoTerreno}</td>
                  <td className="border-r border-gray-100 p-2 text-xs" style={{ fontSize: `${textHeight}px` }}>{p.intervencion}</td>
                  {ALL_ITEMS.map(item => (
                    <td key={item.id} className="border-r border-gray-100 p-0">
                      <input 
                        type="text"
                        value={p.protocols[item.id] || ""}
                        onChange={e => handleUpdateProtocolValue(p.id, item.id, e.target.value)}
                        style={{ fontSize: `${textHeight}px` }}
                        className="w-full h-full p-2 bg-transparent outline-none text-center focus:bg-blue-50"
                        placeholder="-"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
