
import React, { useState, useEffect, useMemo } from "react";
import { Sector, DikeConfig, MeasurementEntry, ProgressEntry, ProjectBackup, BudgetSection, BackupFile, ProtocolEntry } from "./types";
import { SECTORS, INITIAL_DIKES, INITIAL_MEASUREMENTS, INITIAL_BUDGET, INITIAL_PROGRESS_ENTRIES } from "./constants";
import { ConfigurationPanel } from "./components/ConfigurationPanel";
import { DataEntryGrid } from "./components/DataEntryGrid";
import { BudgetPanel } from "./components/BudgetPanel";
import { MeasurementSummaryPanel } from "./components/MeasurementSummaryPanel";
import { ProgressControlPanel } from "./components/ProgressControlPanel";
import { LinearSchedulePanel } from "./components/LinearSchedulePanel";
import { DescriptiveReportPanel } from "./components/DescriptiveReportPanel";
import { ReportsPanel } from "./components/ReportsPanel";
import { SystemStabilityPanel } from "./components/SystemStabilityPanel";
import { ProtocolControlGrid } from "./components/ProtocolControlGrid";
import { ValuationReportPanel } from "./components/ValuationReportPanel";
import { AIAssistant } from "./components/AIAssistant";
import { Button } from "./components/Button";
import { analyzeConstructionData } from "./services/geminiService";
import { saveProjectData, loadProjectData } from "./services/storage";
import { saveAs } from 'file-saver';
import { ExcelService } from "./services/excelService";
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { Database, FolderOpen, Table2, Bot, LogOut, Calculator, ClipboardList, ClipboardCheck, HardHat, CalendarRange, FileText, LayoutGrid, ShieldCheck, Search, ArrowDownAZ, X, Cloud, CloudUpload, CloudDownload, RefreshCw, Save, Download, FileSpreadsheet, FileCode, Sparkles, HelpCircle, Info, BookOpen, CheckCircle } from "lucide-react";
import { TextArea } from "./components/Input";

import { BrandKitPanel } from "./components/BrandKitPanel";
import { BannerGeneratorPanel } from "./components/BannerGeneratorPanel";
import { BrandKit } from "./types";

const App: React.FC = () => {
  // App State
  const [activeTab, setActiveTab] = useState<"config" | "data" | "summary" | "budget" | "progress" | "schedule" | "report" | "ai" | "support" | "reports" | "adgen" | "protocols" | "valuation">("data");
  const [showGlobalHelp, setShowGlobalHelp] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("ALL");
  const [selectedDikeId, setSelectedDikeId] = useState<string | null>("DIPR_001_MI"); 
  
  // Brand Kit State
  const [brandKit, setBrandKit] = useState<BrandKit>({
    primaryColor: "#4f46e5",
    secondaryColor: "#10b981",
    fontFamily: "Inter, sans-serif"
  });
  
  // Sidebar Search & Sort State
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarSort, setSidebarSort] = useState<"default" | "asc">("default");
  const restoreInputRef = React.useRef<HTMLInputElement>(null);

  // Data State
  const [dikes, setDikes] = useState<DikeConfig[]>(INITIAL_DIKES);
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>(INITIAL_MEASUREMENTS);
  const [protocols, setProtocols] = useState<ProtocolEntry[]>([]);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>(INITIAL_PROGRESS_ENTRIES);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [sectors, setSectors] = useState<Sector[]>(SECTORS);
  const [storagePath, setStoragePath] = useState<string>("C:/DATA_CONTROL/DB_LOCAL");
  
  // Virtual File System State for Backups
  const [virtualFileSystem, setVirtualFileSystem] = useState<BackupFile[]>([]);

  // Budget State: Per Sector
  const [budgetBySector, setBudgetBySector] = useState<Record<string, BudgetSection[]>>(() => {
    const initial: Record<string, BudgetSection[]> = {};
    SECTORS.forEach(sector => {
        initial[sector.id] = JSON.parse(JSON.stringify(INITIAL_BUDGET));
    });
    return initial;
  });

  const [budgetByDike, setBudgetByDike] = useState<Record<string, BudgetSection[]>>({});
  
  // AI State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Real-time & Drive State
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  // Validate selectedDikeId
  useEffect(() => {
    if (selectedDikeId && selectedDikeId !== "ALL") {
      const exists = dikes.some(d => d.id === selectedDikeId);
      if (!exists) {
        if (dikes.length > 0) {
          // Try to find a dike in the same sector if possible
          const sectorDikes = dikes.filter(d => d.sectorId === selectedSectorId);
          if (sectorDikes.length > 0) {
            setSelectedDikeId(sectorDikes[0].id);
          } else {
            setSelectedDikeId(dikes[0].id);
          }
        } else {
          setSelectedDikeId(null);
        }
      }
    }
  }, [dikes, selectedDikeId, selectedSectorId]);

  // WebSocket Connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onopen = () => {
      setIsConnected(true);
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'INIT_STATE' || message.type === 'STATE_UPDATED') {
        const payload = message.payload;
        if (payload.sectors) setSectors(payload.sectors);
        if (payload.dikes) setDikes(payload.dikes);
        if (payload.measurements) setMeasurements(payload.measurements);
        if (payload.protocols) setProtocols(payload.protocols);
        if (payload.progressEntries) setProgressEntries(payload.progressEntries);
        if (payload.customColumns) setCustomColumns(payload.customColumns);
        if (payload.budgetBySector) setBudgetBySector(payload.budgetBySector);
        setLastSaved(new Date(payload.lastUpdated || Date.now()).toLocaleTimeString());
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setWs(null);
    };

    return () => socket.close();
  }, []);

  // Check Google Auth Status
  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setIsGoogleAuthenticated(data.authenticated))
      .catch(err => console.error("Auth status check failed", err));

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsGoogleAuthenticated(true);
        alert("Conectado a Google Drive exitosamente.");
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const broadcastState = (newState: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'UPDATE_STATE',
        payload: newState
      }));
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (err) {
      console.error("Failed to get Google Auth URL", err);
    }
  };

  const handleDriveSave = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/drive/save', { method: 'POST' });
      if (res.ok) alert("Datos guardados en Google Drive.");
      else alert("Error al guardar en Google Drive.");
    } catch (err) {
      console.error("Drive save failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync to Drive
  useEffect(() => {
    if (autoSync && isGoogleAuthenticated && isConnected) {
      const timer = setTimeout(() => {
        handleDriveSave();
      }, 5000); // Sync every 5 seconds of inactivity
      return () => clearTimeout(timer);
    }
  }, [sectors, dikes, measurements, progressEntries, budgetBySector, autoSync, isGoogleAuthenticated, isConnected]);

  const handleDriveLoad = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/drive/load');
      if (res.ok) alert("Datos cargados desde Google Drive.");
      else alert("No se encontró archivo de respaldo en Google Drive.");
    } catch (err) {
      console.error("Drive load failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveToLocal = async () => {
    try {
      const projectData: ProjectBackup = {
        sectors,
        dikes,
        measurements,
        protocols,
        progressEntries,
        customColumns,
        budgetBySector,
        timestamp: Date.now()
      };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `casma_backup_${new Date().toISOString().slice(0,10)}.json`,
          types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert("Archivo guardado exitosamente.");
      } else {
        saveAs(blob, `casma_backup_${new Date().toISOString().slice(0,10)}.json`);
      }
    } catch (err) {
      console.error("Local save failed", err);
    }
  };

  const handleExportFullExcel = () => {
    const data: ProjectBackup = {
      sectors,
      dikes,
      measurements,
      protocols,
      progressEntries,
      customColumns,
      budgetBySector,
      budgetByDike,
      timestamp: Date.now()
    };
    ExcelService.exportFullProject(data);
  };

  const handleExportWordReport = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "MEMORIA DESCRIPTIVA - DEFENSAS RIBEREÑAS CASMA",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Fecha: ${new Date().toLocaleDateString()}`, bold: true }),
            ],
          }),
          new Paragraph({ text: "Autor: Ing. Ronald Octavio Muro Sandoval - CIP 292149", alignment: AlignmentType.CENTER }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "1. RESUMEN DE EJECUCIÓN POR SECTOR", heading: HeadingLevel.HEADING_2 }),
          ...sectors.flatMap(s => {
            const sectorDikes = dikes.filter(d => d.sectorId === s.id);
            return [
              new Paragraph({ children: [new TextRun({ text: `Sector: ${s.name}`, bold: true })] }),
              new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new DocxTableRow({
                    children: [
                      new DocxTableCell({ children: [new Paragraph("Dique")] }),
                      new DocxTableCell({ children: [new Paragraph("Meta (m)")] }),
                      new DocxTableCell({ children: [new Paragraph("Ejecutado (m)")] }),
                    ]
                  }),
                  ...sectorDikes.map(d => {
                    const exec = measurements.filter(m => m.dikeId === d.id && m.item501A_Carguio === 1).reduce((acc, m) => acc + m.distancia, 0);
                    return new DocxTableRow({
                      children: [
                        new DocxTableCell({ children: [new Paragraph(d.name)] }),
                        new DocxTableCell({ children: [new Paragraph(d.totalML.toString())] }),
                        new DocxTableCell({ children: [new Paragraph(exec.toString())] }),
                      ]
                    });
                  })
                ]
              }),
              new Paragraph({ text: "" })
            ];
          })
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Memoria_Descriptiva_Casma_${new Date().toISOString().slice(0,10)}.docx`);
  };

  useEffect(() => {
    loadData();
    loadVirtualFileSystem();
  }, []);

  useEffect(() => {
    if (dikes.length > 0) {
        saveData();
    }
  }, [measurements, progressEntries, customColumns, dikes, sectors, budgetBySector, budgetByDike, storagePath]);

  useEffect(() => {
      const intervalId = setInterval(() => {
          performAutoBackup();
      }, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
  }, [dikes, measurements, progressEntries, budgetBySector, budgetByDike]);

  const performAutoBackup = () => {
      const data: ProjectBackup = {
          sectors, dikes, measurements, progressEntries, customColumns, budgetBySector, budgetByDike, storagePath, timestamp: Date.now()
      };
      const timestamp = new Date();
      const fileName = `AutoSave_${timestamp.toISOString().replace(/[:.]/g, '-')}.json`;
      const file: BackupFile = {
          id: Date.now().toString(),
          name: fileName,
          path: `${storagePath}/AUTOGUARDADO`,
          type: 'auto',
          date: timestamp.toLocaleString(),
          size: `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`,
          data: data
      };
      setVirtualFileSystem(prev => {
          const autos = prev.filter(f => f.type === 'auto');
          const others = prev.filter(f => f.type !== 'auto');
          const newAutos = [file, ...autos].slice(0, 10); 
          const updatedFS = [...newAutos, ...others];
          localStorage.setItem('virtualFileSystem', JSON.stringify(updatedFS));
          return updatedFS;
      });
  };

  const createTempSnapshot = (actionName: string) => {
      const data: ProjectBackup = {
          sectors, dikes, measurements, progressEntries, customColumns, budgetBySector, budgetByDike, storagePath, timestamp: Date.now()
      };
      const file: BackupFile = {
          id: Date.now().toString(),
          name: `Snapshot_${actionName}_${Date.now()}.tmp`,
          path: `${storagePath}/TEMPORALES`,
          type: 'temp',
          date: new Date().toLocaleString(),
          size: `${(JSON.stringify(data).length / 1024).toFixed(2)} KB`,
          data: data
      };
       setVirtualFileSystem(prev => {
          const updatedFS = [file, ...prev].slice(0, 20);
          localStorage.setItem('virtualFileSystem', JSON.stringify(updatedFS));
          return updatedFS;
      });
  };

  const loadVirtualFileSystem = () => {
      const storedFS = localStorage.getItem('virtualFileSystem');
      if (storedFS) {
          try {
              setVirtualFileSystem(JSON.parse(storedFS));
          } catch (e) { console.error("Error loading Virtual FS", e); }
      }
  };

  const consolidatedBudget = useMemo(() => {
    const templateSector = Object.keys(budgetBySector)[0];
    const template = templateSector ? budgetBySector[templateSector] : INITIAL_BUDGET;
    const totalBudget: BudgetSection[] = JSON.parse(JSON.stringify(template));
    totalBudget.forEach(sec => sec.groups.forEach(grp => grp.items.forEach(item => { item.metrado = 0; })));
    (Object.values(budgetBySector) as BudgetSection[][]).forEach(sectorBudget => {
        sectorBudget.forEach(sec => {
            const targetSec = totalBudget.find(s => s.id === sec.id);
            if (targetSec) {
                sec.groups.forEach(grp => {
                    const targetGrp = targetSec.groups.find(g => g.id === grp.id);
                    if (targetGrp) {
                        grp.items.forEach(item => {
                            const targetItem = targetGrp.items.find(i => i.id === item.id);
                            if (targetItem) { targetItem.metrado += item.metrado; }
                        })
                    }
                })
            }
        })
    });
    return totalBudget;
  }, [budgetBySector]);

  const filteredDikesBySector = useMemo(() => {
      const filteredSectors = selectedSectorId === "ALL" ? sectors : sectors.filter(s => s.id === selectedSectorId);
      return filteredSectors.map(sector => {
          let sectorDikes = dikes.filter(d => d.sectorId === sector.id);
          if (sidebarSearch) { sectorDikes = sectorDikes.filter(d => d.name.toLowerCase().includes(sidebarSearch.toLowerCase())); }
          if (sidebarSort === 'asc') { sectorDikes = [...sectorDikes].sort((a, b) => a.name.localeCompare(b.name)); }
          return { sector, dikes: sectorDikes, hasMatches: sectorDikes.length > 0 };
      });
  }, [sectors, dikes, sidebarSearch, sidebarSort, selectedSectorId]);

  const saveData = async () => {
    const data: any = { sectors, dikes, measurements, protocols, progressEntries, customColumns, budgetBySector, budgetByDike, storagePath, timestamp: Date.now() };
    try { await saveProjectData(data); setLastSaved(new Date().toLocaleTimeString()); } catch (e) { console.error("Failed to save to IndexedDB", e); }
  };

  const loadData = async () => {
    try {
        const data = await loadProjectData();
        if (data) {
            if (data.sectors && data.sectors.length > 0) setSectors(data.sectors);
            if (data.dikes && data.dikes.length > 0) setDikes(data.dikes);
            if (data.measurements) setMeasurements(data.measurements);
            if (data.protocols) setProtocols(data.protocols);
            if (data.progressEntries) setProgressEntries(data.progressEntries);
            if (data.customColumns) setCustomColumns(data.customColumns);
            if (data.storagePath) setStoragePath(data.storagePath);
            if (data.budgetBySector) {
                const loadedBudget = { ...data.budgetBySector };
                SECTORS.forEach(sector => { if (!loadedBudget[sector.id]) { loadedBudget[sector.id] = JSON.parse(JSON.stringify(INITIAL_BUDGET)); } });
                setBudgetBySector(loadedBudget);
            } else {
                const loadedBudget: Record<string, BudgetSection[]> = {};
                (data.sectors || SECTORS).forEach((sector: Sector) => { loadedBudget[sector.id] = JSON.parse(JSON.stringify(INITIAL_BUDGET)); });
                setBudgetBySector(loadedBudget);
            }
            if (data.budgetByDike) { setBudgetByDike(data.budgetByDike); }
            setLastSaved(new Date(data.timestamp).toLocaleTimeString());
        }
    } catch (e) { console.error("Failed to load from IndexedDB", e); }
  };

  const handleDownloadBackup = () => {
    const data: ProjectBackup = { sectors, dikes, measurements, protocols, progressEntries, customColumns, budgetBySector, budgetByDike, storagePath, timestamp: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RESALDO_TOTAL_SISTEMA_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const data = await ExcelService.importFullProject(file);
        handleRestore(data as ProjectBackup);
      } catch (err) {
        alert("Error al importar el archivo Excel: " + (err instanceof Error ? err.message : "Formato inválido"));
      }
    } else if (fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target?.result as string);
          handleRestore(data);
        } catch (err) {
          alert("Error al leer el archivo de respaldo JSON.");
        }
      };
      reader.readAsText(file);
    } else {
      alert("Formato de archivo no soportado. Use .xlsx o .json");
    }
    
    e.target.value = "";
  };

  const currentDike = selectedDikeId === "ALL" ? null : (dikes.find(d => d.id === selectedDikeId) || null);
  const currentDikeMeasurements = useMemo(() => {
    if (selectedDikeId === "ALL") {
        if (selectedSectorId === "ALL") return measurements;
        const sectorDikes = dikes.filter(d => d.sectorId === selectedSectorId);
        return measurements.filter(m => sectorDikes.some(d => d.id === m.dikeId));
    }
    return measurements.filter(m => m.dikeId === selectedDikeId);
  }, [measurements, selectedDikeId, selectedSectorId, dikes]);

  const handleAddEntry = (entry: MeasurementEntry) => { 
    const newMeasurements = [...measurements, entry];
    setMeasurements(newMeasurements); 
    broadcastState({ measurements: newMeasurements });
    createTempSnapshot('add_entry'); 
  };
  const handleUpdateEntries = (updatedEntries: MeasurementEntry[]) => {
    const otherEntries = measurements.filter(m => m.dikeId !== selectedDikeId);
    const newMeasurements = [...otherEntries, ...updatedEntries];
    setMeasurements(newMeasurements);
    broadcastState({ measurements: newMeasurements });
    createTempSnapshot('update_entries');
  };
  const handleDeleteEntry = (id: string) => { 
    const newMeasurements = measurements.filter(m => m.id !== id);
    setMeasurements(newMeasurements); 
    broadcastState({ measurements: newMeasurements });
    createTempSnapshot('delete_entry'); 
  };
  const handleAddColumn = (columnName: string) => { 
    if (columnName && !customColumns.includes(columnName)) { 
      const newCols = [...customColumns, columnName];
      setCustomColumns(newCols); 
      broadcastState({ customColumns: newCols });
    } 
  };
  const handleDeleteColumn = (columnName: string) => { 
    const newCols = customColumns.filter(c => c !== columnName);
    setCustomColumns(newCols); 
    broadcastState({ customColumns: newCols });
  };
  const handleRestore = (data: ProjectBackup) => {
      if (data) {
          createTempSnapshot('before_restore');
          if (Array.isArray(data.sectors)) setSectors(data.sectors);
          if (Array.isArray(data.dikes)) setDikes(data.dikes);
          if (Array.isArray(data.measurements)) setMeasurements(data.measurements);
          if (Array.isArray(data.protocols)) setProtocols(data.protocols);
          if (Array.isArray(data.progressEntries)) setProgressEntries(data.progressEntries);
          if (Array.isArray(data.customColumns)) setCustomColumns(data.customColumns);
          if (data.budgetBySector) setBudgetBySector(data.budgetBySector);
          if (data.budgetByDike) setBudgetByDike(data.budgetByDike);
          if (data.storagePath) setStoragePath(data.storagePath);
          
          broadcastState({
            sectors: data.sectors,
            dikes: data.dikes,
            measurements: data.measurements,
            protocols: data.protocols,
            progressEntries: data.progressEntries,
            customColumns: data.customColumns,
            budgetBySector: data.budgetBySector,
            budgetByDike: data.budgetByDike
          });

          alert("Base de datos restaurada.");
      }
  };

  const handleImportMeasurements = (newEntries: MeasurementEntry[]) => {
      const updatedMeasurements = [...measurements, ...newEntries];
      setMeasurements(updatedMeasurements);
      broadcastState({ measurements: updatedMeasurements });
      createTempSnapshot('import_measurements');
  };

  const handleResetDefaults = () => {
    if (window.confirm("¿Está seguro de que desea restablecer todos los datos a los valores predeterminados? Se perderán todos los cambios actuales.")) {
      const initialBudgetBySector: Record<string, BudgetSection[]> = {};
      SECTORS.forEach(sector => {
          initialBudgetBySector[sector.id] = JSON.parse(JSON.stringify(INITIAL_BUDGET));
      });

      const defaultData = {
        sectors: SECTORS,
        dikes: INITIAL_DIKES,
        measurements: INITIAL_MEASUREMENTS,
        protocols: [],
        progressEntries: INITIAL_PROGRESS_ENTRIES,
        customColumns: [],
        budgetBySector: initialBudgetBySector,
        budgetByDike: {}
      };

      setSectors(SECTORS);
      setDikes(INITIAL_DIKES);
      setMeasurements(INITIAL_MEASUREMENTS);
      setProtocols([]);
      setProgressEntries(INITIAL_PROGRESS_ENTRIES);
      setCustomColumns([]);
      setBudgetBySector(initialBudgetBySector);
      setBudgetByDike({});

      broadcastState(defaultData);
      alert("Datos restablecidos a los valores predeterminados.");
    }
  };

  const handleAddSector = (sector: Sector) => { 
    const newSectors = [...sectors, sector];
    const newBudget = {...budgetBySector, [sector.id]: JSON.parse(JSON.stringify(INITIAL_BUDGET))};
    setSectors(newSectors); 
    setBudgetBySector(newBudget); 
    broadcastState({ sectors: newSectors, budgetBySector: newBudget });
    createTempSnapshot('add_sector'); 
  };
  const handleUpdateSector = (updated: Sector) => {
    const newSectors = sectors.map(s => s.id === updated.id ? updated : s);
    setSectors(newSectors);
    broadcastState({ sectors: newSectors });
  };
  const handleDeleteSector = (id: string) => { 
    if (dikes.some(d => d.sectorId === id)) { alert("No se puede eliminar un sector que contiene diques."); return; } 
    const newSectors = sectors.filter(s => s.id !== id);
    const newBudget = {...budgetBySector}; 
    delete newBudget[id]; 
    setSectors(newSectors);
    setBudgetBySector(newBudget); 
    broadcastState({ sectors: newSectors, budgetBySector: newBudget });
    createTempSnapshot('delete_sector'); 
  };
  const handleAddDike = (d: DikeConfig) => {
    const newDikes = [...dikes, d];
    setDikes(newDikes);
    broadcastState({ dikes: newDikes });
  };
  const handleUpdateDike = (u: DikeConfig) => {
    const newDikes = dikes.map(d => d.id === u.id ? u : d);
    setDikes(newDikes);
    broadcastState({ dikes: newDikes });
  };
  const handleDeleteDike = (id: string) => { 
    if(measurements.some(m => m.dikeId === id) && !confirm("Este dique tiene metrados asociados. ¿Está seguro de eliminarlo?")) return; 
    const newDikes = dikes.filter(d => d.id !== id);
    const newMeasurements = measurements.filter(m => m.id !== id);
    setDikes(newDikes); 
    setMeasurements(newMeasurements); 
    if(selectedDikeId === id) setSelectedDikeId(null); 
    broadcastState({ dikes: newDikes, measurements: newMeasurements });
    createTempSnapshot('delete_dike'); 
  };
  
  const handleAddProgress = (entry: ProgressEntry) => { 
    const newEntries = [entry, ...progressEntries];
    setProgressEntries(newEntries); 
    broadcastState({ progressEntries: newEntries });
    createTempSnapshot('add_progress'); 
  };
  const handleUpdateProgressEntry = (u: ProgressEntry) => {
    const newEntries = progressEntries.map(p => p.id === u.id ? u : p);
    setProgressEntries(newEntries);
    broadcastState({ progressEntries: newEntries });
  };
  const handleDeleteProgress = (id: string) => { 
    const newEntries = progressEntries.filter(p => p.id !== id);
    setProgressEntries(newEntries); 
    broadcastState({ progressEntries: newEntries });
    createTempSnapshot('delete_progress'); 
  };
  const handleUpdateBudget = (sid: string, b: BudgetSection[]) => { 
    const newBudget = {...budgetBySector, [sid]: b};
    setBudgetBySector(newBudget); 
    broadcastState({ budgetBySector: newBudget });
    createTempSnapshot('update_budget'); 
  };
  const handleUpdateDikeBudget = (dikeId: string, b: BudgetSection[]) => { 
    const newBudget = {...budgetByDike, [dikeId]: b};
    setBudgetByDike(newBudget); 
    broadcastState({ budgetByDike: newBudget });
    createTempSnapshot('update_dike_budget'); 
  };

  // --- LOGICA DE EJERCICIO MASIVO MEJORADA ---
  const handleGenerateExercise = () => {
    if (!confirm("Esta acción generará metrados automáticos e HISTORIAL DE AVANCE para TODOS los diques configurados. Los datos existentes serán reemplazados para este ejercicio. ¿Desea continuar?")) return;
    
    const parsePkLocal = (pkStr: string): number => {
        if (!pkStr) return 0;
        const clean = pkStr.replace(/\s/g, '');
        if (clean.includes('+')) {
            const [km, m] = clean.split('+');
            return (parseFloat(km) * 1000) + parseFloat(m);
        }
        return parseFloat(clean) || 0;
    };

    const formatPkLocal = (meters: number): string => {
        const km = Math.floor(meters / 1000);
        const m = (meters % 1000).toFixed(2);
        return `${km}+${m.toString().padStart(6, '0')}`;
    };

    const newExerciseMeasurements: MeasurementEntry[] = [];
    const newExerciseProgress: ProgressEntry[] = [];
    const step = 50; // Cada 50 metros un punto de medición

    dikes.forEach(dike => {
        const startM = parsePkLocal(dike.progInicioDique);
        const endM = parsePkLocal(dike.progFinDique);
        const totalLength = Math.abs(endM - startM);
        
        if (totalLength <= 0) return;

        const points = Math.ceil(totalLength / step);
        const direction = endM > startM ? 1 : -1;

        // 1. Generar Hoja de Metrados (Celdas)
        for (let i = 0; i <= points; i++) {
            let currentM = startM + (i * step * direction);
            if ((direction === 1 && currentM > endM) || (direction === -1 && currentM < endM)) {
                currentM = endM;
            }

            const dist = i === 0 ? 0 : Math.abs(currentM - (startM + ((i-1) * step * direction)));
            if (i > 0 && dist === 0) continue;

            const isB2 = Math.random() > 0.7; // 30% probabilidad de ser refuerzo B2

            const entry: MeasurementEntry = {
                id: `EXERCISE_M_${dike.id}_${i}_${Date.now()}`,
                dikeId: dike.id,
                pk: formatPkLocal(currentM),
                distancia: parseFloat(dist.toFixed(2)),
                tipoTerreno: isB2 ? "B2" : "B1",
                tipoEnrocado: Math.random() > 0.5 ? "TIPO 1" : "TIPO 2",
                intervencion: "LLENADO DE EJERCICIO AUTOMÁTICO",
                item501A_Carguio: 1, 
                item403A: parseFloat((Math.random() * 2.5 + 1.2).toFixed(2)),
                item402B: parseFloat((Math.random() * 1.8).toFixed(2)),
                item402E: parseFloat((Math.random() * 6 + 3).toFixed(2)),
                item404A: parseFloat((Math.random() * 4 + 4).toFixed(2)),
                item404D: parseFloat((Math.random() * 3 + 3).toFixed(2)),
                item413A: parseFloat((Math.random() * 2.2).toFixed(2)),
                item412A: 0.62,
                item406A: 1.5,
                item401A: 0,
                item409A: 12.5,
                item409B: 0,
                item414A: 0,
                item415: isB2 ? parseFloat((Math.random() * 5).toFixed(2)) : 0,
                item408A: 0,
                item416A: 0
            };
            newExerciseMeasurements.push(entry);
            if (currentM === endM) break;
        }

        // 2. Generar Historial de Avance Diario (ProgressEntries)
        const totalProgressPoints = 8;
        const subStep = totalLength / totalProgressPoints;
        const today = new Date();

        for(let j = 0; j < totalProgressPoints; j++) {
            const progressStart = startM + (j * subStep * direction);
            const progressEnd = startM + ((j + 1) * subStep * direction);
            const entryDate = new Date();
            entryDate.setDate(today.getDate() - (totalProgressPoints - j));

            const progEntry: ProgressEntry = {
                id: `EXERCISE_P_${dike.id}_${j}_${Date.now()}`,
                date: entryDate.toISOString().split('T')[0],
                dikeId: dike.id,
                progInicio: formatPkLocal(progressStart),
                progFin: formatPkLocal(progressEnd),
                longitud: parseFloat(subStep.toFixed(2)),
                tipoTerreno: Math.random() > 0.8 ? "B2" : "B1",
                tipoEnrocado: "TIPO 2",
                partida: "404.A ENROCADO Y ACOMODO",
                intervencion: "AVANCE AUTOMÁTICO",
                capa: "Capa Única",
                observaciones: "Avance generado en ejercicio masivo"
            };
            newExerciseProgress.push(progEntry);
        }
    });

    createTempSnapshot('before_bulk_exercise');
    setMeasurements(newExerciseMeasurements);
    setProgressEntries(newExerciseProgress);
    broadcastState({ measurements: newExerciseMeasurements, progressEntries: newExerciseProgress });
    alert(`Ejercicio Completado:\n- ${newExerciseMeasurements.length} celdas de metrados llenadas.\n- ${newExerciseProgress.length} registros de avance diario creados.\n\nRevise ahora los paneles de Cronograma, Resumen y Memoria.`);
    setActiveTab("summary");
  };

  const handleFixData = (type: 'orphans' | 'dates' | 'budget' | 'units') => {
    if (type === 'orphans') {
        const validDikeIds = new Set(dikes.map(d => d.id));
        const orphanCount = measurements.filter(m => !validDikeIds.has(m.dikeId)).length;
        
        if (orphanCount === 0) {
            alert("No se detectaron registros de metrados huérfanos.");
            return;
        }

        if (confirm(`Se han detectado ${orphanCount} registros que no pertenecen a ningún dique configurado. ¿Desea eliminarlos permanentemente?`)) {
            createTempSnapshot('fix_orphans');
            const cleanedMeasurements = measurements.filter(m => validDikeIds.has(m.dikeId));
            setMeasurements(cleanedMeasurements);
            broadcastState({ measurements: cleanedMeasurements });
            alert(`Limpieza completada. Se eliminaron ${orphanCount} registros huérfanos.`);
        }
    }
  };

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse("");
    try {
      const response = await analyzeConstructionData(dikes, measurements, consolidatedBudget, aiQuery);
      setAiResponse(response);
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("Lo siento, ocurrió un error al procesar su consulta técnica. Por favor, intente nuevamente.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Global Help Modal */}
      {showGlobalHelp && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-blue-600 text-white">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                <h2 className="text-lg font-bold">Centro de Ayuda: Gestión de Datos</h2>
              </div>
              <button onClick={() => setShowGlobalHelp(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-[#003366] dark:text-blue-400">
                  <FileSpreadsheet className="w-5 h-5" />
                  <h3 className="font-black uppercase text-sm tracking-widest">Manual de Importación y Exportación</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase mb-3 flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-green-600" /> Exportación de Datos
                    </h4>
                    <ul className="space-y-2 text-[10px] text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                        <span><strong>Excel (.xlsx):</strong> Recomendado para reportes y edición masiva. Mantiene formatos y fórmulas.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                        <span><strong>CSV:</strong> Formato universal para intercambio rápido de datos entre sistemas.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-1 shrink-0" />
                        <span><strong>TXT:</strong> Texto plano tabulado, útil para integraciones técnicas específicas.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase mb-3 flex items-center gap-2">
                      <CloudUpload className="w-3.5 h-3.5 text-orange-600" /> Importación de Datos
                    </h4>
                    <ul className="space-y-2 text-[10px] text-gray-600 dark:text-gray-400">
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shrink-0" />
                        <span><strong>Plantilla:</strong> Use siempre un archivo exportado previamente como base para importar.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shrink-0" />
                        <span><strong>Encabezados:</strong> No modifique la primera fila. El sistema usa los códigos de partida para mapear.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1 shrink-0" />
                        <span><strong>Identificadores:</strong> La columna "DIQUE" o "PK" es vital para actualizar los registros correctos.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Database className="w-5 h-5" />
                  <h3 className="font-black uppercase text-sm tracking-widest">Respaldo y Recuperación (JSON)</h3>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                  <p className="text-[11px] text-purple-900 dark:text-purple-200 leading-relaxed">
                    El sistema permite realizar un <strong>Backup Total</strong> en formato JSON. Este archivo contiene la estructura completa del proyecto, incluyendo:
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      <CheckCircle className="w-3 h-3" /> Sectores y Diques
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      <CheckCircle className="w-3 h-3" /> Metrados y Avances
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      <CheckCircle className="w-3 h-3" /> Protocolos y Control
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      <CheckCircle className="w-3 h-3" /> Presupuesto y Precios
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                <Info className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider">Nota de Seguridad</p>
                  <p className="text-[10px] text-blue-800 dark:text-blue-300">
                    Se recomienda realizar un respaldo total antes de realizar importaciones masivas de datos para prevenir pérdida accidental de información.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button onClick={() => setShowGlobalHelp(false)} className="bg-[#003366] text-white px-6">Entendido</Button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-[#003366] text-white shadow-md z-30 shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg">
               <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/OHLA_Group_logo.svg/1200px-OHLA_Group_logo.svg.png" alt="OHLA" className="h-8 w-auto" />
            </div>
            <div>
                <h1 className="text-lg font-bold tracking-tight">DEFENSAS RIBEREÑAS CASMA</h1>
                <p className="text-[10px] text-gray-300 uppercase tracking-wider">Autor: Ing. Ronald Octavio Muro Sandoval - CIP 292149</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-[10px] font-medium uppercase">{isConnected ? 'En Red' : 'Desconectado'}</span>
             </div>
             
             {!isGoogleAuthenticated ? (
                <Button onClick={handleGoogleConnect} className="bg-white text-blue-900 hover:bg-blue-50 text-[10px] h-7 px-3 flex items-center gap-2">
                   <Cloud className="w-3 h-3" /> Conectar Drive
                </Button>
             ) : (
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded border border-white/20 mr-2">
                      <input 
                        type="checkbox" 
                        id="autoSync" 
                        checked={autoSync} 
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="w-3 h-3 cursor-pointer"
                      />
                      <label htmlFor="autoSync" className="text-[9px] cursor-pointer font-bold uppercase">Auto-Sync</label>
                   </div>
                   <Button onClick={handleDriveSave} disabled={isSyncing} className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-7 px-3 flex items-center gap-2">
                      {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />} Guardar en Drive
                   </Button>
                   <Button onClick={handleDriveLoad} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-7 px-3 flex items-center gap-2">
                      {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CloudDownload className="w-3 h-3" />} Cargar de Drive
                   </Button>
                </div>
             )}

             {lastSaved && <span className="text-[10px] text-gray-300 italic">Sincronizado: {lastSaved}</span>}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-20 h-full">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <nav className="space-y-1">
                    <button onClick={() => setActiveTab("adgen")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'adgen' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <Sparkles className="w-3.5 h-3.5" /><span className="font-medium text-xs">Generador de Ads</span>
                    </button>
                    <button onClick={() => setActiveTab("config")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <FolderOpen className="w-3.5 h-3.5" /><span className="font-medium text-xs">Configuración</span>
                    </button>
                    <button onClick={() => setActiveTab("data")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'data' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <Table2 className="w-3.5 h-3.5" /><span className="font-medium text-xs">Hoja de Metrados</span>
                    </button>
                    <button onClick={() => setActiveTab("summary")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'summary' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <ClipboardList className="w-3.5 h-3.5" /><span className="font-medium text-xs">Resumen Partidas</span>
                    </button>
                    <button onClick={() => setActiveTab("budget")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'budget' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <Calculator className="w-3.5 h-3.5" /><span className="font-medium text-xs">Presupuesto</span>
                    </button>
                    <button onClick={() => setActiveTab("progress")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'progress' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <HardHat className="w-3.5 h-3.5" /><span className="font-medium text-xs">Avance de Obra</span>
                    </button>
                    <button onClick={() => setActiveTab("protocols")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'protocols' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <ClipboardCheck className="w-3.5 h-3.5" /><span className="font-medium text-xs">Protocolos</span>
                    </button>
                    <button onClick={() => setActiveTab("schedule")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'schedule' ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <CalendarRange className="w-3.5 h-3.5" /><span className="font-medium text-xs">Cronograma</span>
                    </button>
                    <button onClick={() => setActiveTab("report")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'report' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <FileText className="w-3.5 h-3.5" /><span className="font-medium text-xs">Memoria Descriptiva</span>
                    </button>
                    <button onClick={() => setActiveTab("reports")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <LayoutGrid className="w-3.5 h-3.5" /><span className="font-medium text-xs">Reportes de Metrados</span>
                    </button>
                    <button onClick={() => setActiveTab("valuation")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'valuation' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <FileSpreadsheet className="w-3.5 h-3.5" /><span className="font-medium text-xs">Valorización</span>
                    </button>
                    <button onClick={() => setActiveTab("support")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'support' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <ShieldCheck className="w-3.5 h-3.5" /><span className="font-medium text-xs">Soporte Técnico</span>
                    </button>
                    <button onClick={() => setActiveTab("ai")} className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                        <Bot className="w-3.5 h-3.5" /><span className="font-medium text-xs">Asistente Técnico</span>
                    </button>
                </nav>
            </div>

            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Herramientas de Datos</h3>
                <div className="grid grid-cols-2 gap-1">
                    <button 
                        onClick={handleSaveToLocal}
                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        title="Guardar en USB / Local"
                    >
                        <Save className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400">GUARDAR LOCAL</span>
                    </button>
                    <button 
                        onClick={handleExportFullExcel}
                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
                        title="Exportar Base de Datos Completa (Excel)"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400">EXCEL TOTAL</span>
                    </button>
                    <button 
                        onClick={handleExportWordReport}
                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        title="Exportar Memoria Descriptiva (Word)"
                    >
                        <FileText className="w-4 h-4 text-blue-800 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400">WORD MEMORIA</span>
                    </button>
                    <button 
                        onClick={handleDownloadBackup}
                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
                        title="Respaldo de Recuperación (JSON)"
                    >
                        <FileCode className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400">RECUPERACIÓN</span>
                    </button>
                    <button 
                        onClick={() => restoreInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
                        title="Restaurar desde archivo JSON"
                    >
                        <CloudUpload className="w-4 h-4 text-orange-600 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400">RESTAURAR</span>
                    </button>
                    <button 
                        onClick={() => setShowGlobalHelp(true)}
                        className="flex flex-col items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        title="Centro de Ayuda de Importación/Exportación"
                    >
                        <HelpCircle className="w-4 h-4 text-blue-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-bold text-gray-600 dark:text-gray-400">AYUDA DATOS</span>
                    </button>
                    <input 
                        type="file" 
                        ref={restoreInputRef} 
                        onChange={handleUploadBackup} 
                        className="hidden" 
                        accept=".json" 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="relative mb-4">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-9 pr-9 py-2 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-gray-50 dark:bg-gray-900 text-[11px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
                        placeholder="Buscar dique..."
                        value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                    />
                </div>
                {filteredDikesBySector.map(({ sector, dikes: sectorDikes, hasMatches }) => {
                    if (sidebarSearch && !hasMatches) return null;
                    return (
                        <div key={sector.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="bg-[#003366] text-white py-2 px-3 text-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{sector.name}</span>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                {sectorDikes.map(dike => (
                                    <button 
                                        key={dike.id}
                                        onClick={() => { 
                                            setSelectedDikeId(dike.id); 
                                            setSelectedSectorId(dike.sectorId);
                                            if (activeTab !== "progress" && activeTab !== "schedule" && activeTab !== "data") { 
                                                setActiveTab("data"); 
                                            } 
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-[11px] font-semibold transition-all flex items-center gap-3 group ${selectedDikeId === dike.id ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                                    >
                                        <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${selectedDikeId === dike.id ? "bg-blue-600 scale-125 shadow-[0_0_8px_rgba(37,99,235,0.4)]" : "bg-gray-200 group-hover:bg-gray-300"}`} />
                                        <span className="truncate">{dike.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </aside>

        <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Global Filter Bar */}
                <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-8">
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Filtrar Sector:</span>
                        <select 
                            value={selectedSectorId} 
                            onChange={(e) => {
                                setSelectedSectorId(e.target.value);
                                setSelectedDikeId("ALL");
                            }}
                            className="text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-[200px] shadow-sm appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                        >
                            <option value="ALL">TODOS LOS SECTORES</option>
                            {sectors.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Filtrar Dique:</span>
                        <select 
                            value={selectedDikeId || "ALL"} 
                            onChange={(e) => setSelectedDikeId(e.target.value)}
                            className="text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 bg-white dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-w-[200px] shadow-sm appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                        >
                            <option value="ALL">TODOS LOS DIQUES</option>
                            {dikes.filter(d => selectedSectorId === "ALL" || d.sectorId === selectedSectorId).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1"></div>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-full border border-gray-100 dark:border-gray-800">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            {isConnected ? 'Sincronizado' : 'Desconectado'}
                        </span>
                    </div>
                </div>

                {activeTab === "adgen" && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Banner Generator</h1>
                                <p className="text-xs text-gray-500">Cree variaciones de anuncios alineadas con su marca usando IA</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                            <div className="xl:col-span-1">
                                <BrandKitPanel 
                                    brandKit={brandKit} 
                                    onUpdate={(updates) => setBrandKit(prev => ({ ...prev, ...updates }))} 
                                />
                            </div>
                            <div className="xl:col-span-3">
                                <BannerGeneratorPanel brandKit={brandKit} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === "config" && (
                    <ConfigurationPanel 
                        sectors={sectors} 
                        dikes={dikes} 
                        measurements={measurements}
                        budgetBySector={budgetBySector}
                        customColumns={customColumns} 
                        onRestore={handleRestore} 
                        onReset={handleResetDefaults}
                        onBackup={handleDownloadBackup} 
                        onAddSector={handleAddSector} 
                        onUpdateSector={handleUpdateSector} 
                        onDeleteSector={handleDeleteSector} 
                        onAddDike={handleAddDike} 
                        onUpdateDike={handleUpdateDike} 
                        onDeleteDike={handleDeleteDike} 
                        onAddColumn={handleAddColumn} 
                        onDeleteColumn={handleDeleteColumn} 
                        onImportMeasurements={handleImportMeasurements}
                        onGenerateExercise={handleGenerateExercise} 
                        filterSectorId={selectedSectorId}
                        filterDikeId={selectedDikeId || "ALL"}
                    />
                )}
                {activeTab === "data" && <DataEntryGrid dike={currentDike} entries={currentDikeMeasurements} customColumns={customColumns} budget={budgetBySector[currentDike?.sectorId || ""] || []} onAddEntry={handleAddEntry} onUpdateEntries={handleUpdateEntries} onDeleteEntry={handleDeleteEntry} onAddColumn={handleAddColumn} onDeleteColumn={handleDeleteColumn} onFullImport={()=>{}} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "protocols" && <ProtocolControlGrid dike={currentDike} measurements={measurements} protocols={protocols} onUpdateProtocols={(newProtocols) => { setProtocols(newProtocols); broadcastState({ protocols: newProtocols }); }} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} dikes={dikes} />}
                {activeTab === "summary" && <MeasurementSummaryPanel budget={consolidatedBudget} measurements={measurements} dikes={dikes} sectors={sectors} budgetBySector={budgetBySector} onUpdateBudget={handleUpdateBudget} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "budget" && <BudgetPanel budgetBySector={budgetBySector} budgetByDike={budgetByDike} sectors={sectors} onUpdateBudget={handleUpdateBudget} onUpdateDikeBudget={handleUpdateDikeBudget} measurements={measurements} dikes={dikes} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "progress" && <ProgressControlPanel sectors={sectors} dikes={dikes} budget={consolidatedBudget} budgetBySector={budgetBySector} entries={progressEntries} onAddEntry={handleAddProgress} onUpdateEntry={handleUpdateProgressEntry} onDeleteEntry={handleDeleteProgress} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "schedule" && <LinearSchedulePanel sectors={sectors} dikes={dikes} budget={consolidatedBudget} progressEntries={progressEntries} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "report" && <DescriptiveReportPanel sectors={sectors} dikes={dikes} measurements={measurements} budgetBySector={budgetBySector} progressEntries={progressEntries} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "reports" && <ReportsPanel sectors={sectors} dikes={dikes} measurements={measurements} progressEntries={progressEntries} budgetBySector={budgetBySector} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "valuation" && <ValuationReportPanel sectors={sectors} budgetBySector={budgetBySector} measurements={measurements} dikes={dikes} filterSectorId={selectedSectorId} filterDikeId={selectedDikeId || "ALL"} />}
                {activeTab === "support" && <SystemStabilityPanel dikes={dikes} measurements={measurements} progressEntries={progressEntries} budgetBySector={budgetBySector} onFixData={handleFixData} onClearLogs={()=>{}} storagePath={storagePath} onUpdateStoragePath={setStoragePath} onGenerateExercise={handleGenerateExercise} />}
                {activeTab === "ai" && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                             <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><Bot className="w-4 h-4 text-purple-600" />Asistente de Ingeniería</h2>
                             <TextArea label="Consulta sobre el proyecto" placeholder="Ej: ¿Cuál es el presupuesto total?" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} className="min-h-[80px] text-xs" />
                             <div className="mt-3 flex justify-end">
                                <Button onClick={handleAskAI} isLoading={isAiLoading} disabled={!aiQuery.trim()} className="text-xs h-8">Analizar Datos</Button>
                             </div>
                        </div>
                        {aiResponse && <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-purple-100 dark:border-purple-900/20"><div className="prose dark:prose-invert text-xs max-w-none"><p className="whitespace-pre-line">{aiResponse}</p></div></div>}
                    </div>
                )}
            </div>
            <AIAssistant activeTab={activeTab} />
        </main>
      </div>
    </div>
  );
};

export default App;
