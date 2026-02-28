
const SECTORS = [
  { id: "CASMA", name: "SECTOR CASMA" },
  { id: "CONFLUENCIA", name: "SECTOR CONFLUENCIA" },
  { id: "RIO_GRANDE", name: "SECTOR RIO GRANDE" },
  { id: "SECHIN", name: "SECTOR SECHIN" },
];

const INITIAL_DIKES = [
  { id: "DIPR_001_MI", sectorId: "CASMA", name: "DIPR_001_MI", progInicioRio: "0+140.000", progFinRio: "5+500.000", progInicioDique: "0+560.000", progFinDique: "2+700.000", totalML: 2140.00 },
  { id: "DIPR_002_MD", sectorId: "CASMA", name: "DIPR_002_MD", progInicioRio: "0+490.000", progFinRio: "5+500.000", progInicioDique: "-0+004.190", progFinDique: "5+064.290", totalML: 5068.48 },
  { id: "DIPR_001b_MI", sectorId: "CONFLUENCIA", name: "DIPR_001b_MI", progInicioRio: "5+500.000", progFinRio: "9+050.000", progInicioDique: "5+397.000", progFinDique: "8+922.000", totalML: 3525.00 },
  { id: "DIPR_002b_MD", sectorId: "CONFLUENCIA", name: "DIPR_002b_MD", progInicioRio: "1+025.000", progFinRio: "5+500.000", progInicioDique: "5+064.000", progFinDique: "11+175.000", totalML: 6111.00 },
  { id: "DIPR_003_MI", sectorId: "CONFLUENCIA", name: "DIPR_003_MI", progInicioRio: "9+857.000", progFinRio: "10+438.000", progInicioDique: "0+011.000", progFinDique: "0+579.000", totalML: 568.00 },
  { id: "DIPR_004_MI", sectorId: "CONFLUENCIA", name: "DIPR_004_MI", progInicioRio: "0+971.000", progFinRio: "3+969.000", progInicioDique: "0+060.000", progFinDique: "0+920.000", totalML: 860.00 },
  { id: "DIPR_005_MI", sectorId: "CONFLUENCIA", name: "DIPR_005_MI", progInicioRio: "2+218.000", progFinRio: "10+998.000", progInicioDique: "0+000.000", progFinDique: "8+900.000", totalML: 8900.00 },
  { id: "DIPR_006_MD", sectorId: "CONFLUENCIA", name: "DIPR_006_MD", progInicioRio: "5+823.000", progFinRio: "10+999.000", progInicioDique: "0+000.000", progFinDique: "5+946.030", totalML: 5946.03 },
  { id: "DIPR_015_MD_C", sectorId: "CONFLUENCIA", name: "DIPR_015_MD", progInicioRio: "1+954.000", progFinRio: "6+000.000", progInicioDique: "0+000.000", progFinDique: "4+047.886", totalML: 4047.89 },
  { id: "DIPR_016_MI_C", sectorId: "CONFLUENCIA", name: "DIPR_016_MI", progInicioRio: "1+950.000", progFinRio: "6+000.000", progInicioDique: "0+000.000", progFinDique: "4+055.678", totalML: 4055.68 },
  { id: "MIPR-001-MD", sectorId: "CONFLUENCIA", name: "MIPR-001-MD", progInicioRio: "1+950.000", progFinRio: "6+000.000", progInicioDique: "0+000.000", progFinDique: "0+838.000", totalML: 4050.00 },
  { id: "DESCOL_1_C", sectorId: "CONFLUENCIA", name: "Descolmatación 1", progInicioRio: "5+500.000", progFinRio: "10+643.000", progInicioDique: "", progFinDique: "", totalML: 5143.00 },
  { id: "DESCOL_2_C", sectorId: "CONFLUENCIA", name: "Descolmatación 2", progInicioRio: "0+000.000", progFinRio: "6+000.000", progInicioDique: "", progFinDique: "", totalML: 6000.00 },
  { id: "DESCOL_3_C", sectorId: "CONFLUENCIA", name: "Descolmatación 3", progInicioRio: "0+000.000", progFinRio: "11+000.000", progInicioDique: "", progFinDique: "", totalML: 11000.00 },
  { id: "DIPR_005_MI_RG", sectorId: "RIO_GRANDE", name: "DIPR-005-MI", progInicioRio: "11+000.000", progFinRio: "25+940.000", progInicioDique: "8+900.000", progFinDique: "24+116.000", totalML: 15216.00 },
  { id: "DIPR_006_MD_RG", sectorId: "RIO_GRANDE", name: "DIPR-006-MD", progInicioRio: "11+000.000", progFinRio: "13+910.000", progInicioDique: "5+946.000", progFinDique: "8+845.000", totalML: 2899.00 },
  { id: "DIPR_008_MD_RG", sectorId: "RIO_GRANDE", name: "DIPR-008-MD", progInicioRio: "18+228.000", progFinRio: "18+722.000", progInicioDique: "0+000.000", progFinDique: "0+470.000", totalML: 470.00 },
  { id: "DIPR_009_MD_RG", sectorId: "RIO_GRANDE", name: "DIPR-009-MD", progInicioRio: "19+974.000", progFinRio: "32+890.000", progInicioDique: "0+000.000", progFinDique: "12+862.000", totalML: 12862.00 },
  { id: "DIPR_010_MI_RG", sectorId: "RIO_GRANDE", name: "DIPR-010-MI", progInicioRio: "27+610.000", progFinRio: "28+300.000", progInicioDique: "0+000.000", progFinDique: "0+662.000", totalML: 662.00 },
  { id: "DIPR_011_MI_RG", sectorId: "RIO_GRANDE", name: "DIPR-011-MI", progInicioRio: "28+445.000", progFinRio: "29+210.000", progInicioDique: "0+000.000", progFinDique: "0+747.000", totalML: 747.00 },
  { id: "DIPR_012_MD_RG", sectorId: "RIO_GRANDE", name: "DIPR-012-MD", progInicioRio: "32+960.000", progFinRio: "34+190.000", progInicioDique: "0+000.000", progFinDique: "1+214.000", totalML: 1214.00 },
  { id: "DIPR_013_MD_RG", sectorId: "RIO_GRANDE", name: "DIPR-013-MD", progInicioRio: "35+220.000", progFinRio: "36+890.000", progInicioDique: "0+000.000", progFinDique: "1+739.000", totalML: 1739.00 },
  { id: "DIPR_014_MI_RG", sectorId: "RIO_GRANDE", name: "DIPR-014-MI", progInicioRio: "35+630.000", progFinRio: "36+910.000", progInicioDique: "0+000.000", progFinDique: "1+275.050", totalML: 1275.05 },
  { id: "DIPR_015_MD_S", sectorId: "SECHIN", name: "DIPR_015_MD", progInicioRio: "6+000.000", progFinRio: "8+060.000", progInicioDique: "4+047.886", progFinDique: "6+130.000", totalML: 2082.11 },
  { id: "DIPR_016_MI_S", sectorId: "SECHIN", name: "DIPR_016_MI", progInicioRio: "6+000.000", progFinRio: "19+500.000", progInicioDique: "4+055.678", progFinDique: "14+754.000", totalML: 10698.32 },
  { id: "DIPR_017_MD_S", sectorId: "SECHIN", name: "DIPR_017_MD", progInicioRio: "9+100.000", progFinRio: "13+520.000", progInicioDique: "0+000.000", progFinDique: "4+452.000", totalML: 4452.00 },
  { id: "DIPR_018_MD_S", sectorId: "SECHIN", name: "DIPR_018_MD", progInicioRio: "15+280.000", progFinRio: "19+500.000", progInicioDique: "0+000.000", progFinDique: "3+130.000", totalML: 3130.00 },
  { id: "DIPR_019_MD_S", sectorId: "SECHIN", name: "DIPR_019_MD", progInicioRio: "21+033.000", progFinRio: "21+289.000", progInicioDique: "0+000.000", progFinDique: "0+290.000", totalML: 290.00 },
  { id: "DIPR_020_MD_S", sectorId: "SECHIN", name: "DIPR_020_MD", progInicioRio: "22+756.000", progFinRio: "23+600.000", progInicioDique: "0+000.000", progFinDique: "0+855.000", totalML: 855.00 },
  { id: "DIPR_021_MI_S", sectorId: "SECHIN", name: "DIPR_021_MI", progInicioRio: "21+550.000", progFinRio: "23+539.000", progInicioDique: "0+000.000", progFinDique: "1+840.000", totalML: 1840.00 },
  { id: "DESCOL_1_S", sectorId: "SECHIN", name: "Descolmatación 1", progInicioRio: "6+000.000", progFinRio: "19+500.000", progInicioDique: "", progFinDique: "", totalML: 13500.00 },
  { id: "DESCOL_2_S", sectorId: "SECHIN", name: "Descolmatación 2", progInicioRio: "21+033.000", progFinRio: "23+600.000", progInicioDique: "", progFinDique: "", totalML: 2567.00 },
];

const parsePk = (pkStr) => {
    if (!pkStr) return 0;
    const clean = pkStr.replace(/\s/g, '');
    if (clean.includes('+')) {
        const [km, m] = clean.split('+');
        return (parseFloat(km) * 1000) + parseFloat(m);
    }
    return parseFloat(clean) || 0;
};

const formatPk = (meters) => {
    const km = Math.floor(meters / 1000);
    const m = (meters % 1000).toFixed(2);
    return `${km}+${m.toString().padStart(6, '0')}`;
};

const measurements = [];
const progress = [];

INITIAL_DIKES.forEach(dike => {
    const startM = parsePk(dike.progInicioDique);
    const endM = dike.progFinDique ? parsePk(dike.progFinDique) : startM + dike.totalML;
    const totalLength = Math.abs(endM - startM);
    
    if (totalLength <= 0) return;

    const direction = endM > startM ? 1 : -1;
    const mCount = 5 + Math.floor(Math.random() * 5);
    const step = totalLength / mCount;

    for (let i = 0; i <= mCount; i++) {
        const currentM = startM + (i * step * direction);
        const dist = i === 0 ? 0 : step;
        const isB2 = Math.random() > 0.7;

        measurements.push({
            id: `SAMPLE_M_${dike.id}_${i}`,
            dikeId: dike.id,
            pk: formatPk(currentM),
            distancia: parseFloat(dist.toFixed(2)),
            tipoTerreno: isB2 ? "B2" : "B1",
            tipoEnrocado: Math.random() > 0.5 ? "TIPO 1" : "TIPO 2",
            intervencion: "GENERACIÓN DE MUESTRA",
            item501A_Carguio: 1, 
            item403A: parseFloat((Math.random() * 5 + 2).toFixed(2)),
            item402B: parseFloat((Math.random() * 3).toFixed(2)),
            item402E: parseFloat((Math.random() * 8 + 4).toFixed(2)),
            item404A: parseFloat((Math.random() * 6 + 5).toFixed(2)),
            item404D: parseFloat((Math.random() * 5 + 4).toFixed(2)),
            item413A: parseFloat((Math.random() * 3).toFixed(2)),
            item412A: 0.65,
            item406A: 1.8,
            item401A: 0,
            item409A: 12.5,
            item409B: 0,
            item414A: 0,
            item415: isB2 ? parseFloat((Math.random() * 6).toFixed(2)) : 0,
            item408A: 0,
            item416A: 0
        });
    }

    const pCount = 3 + Math.floor(Math.random() * 3);
    const pStep = totalLength / pCount;
    const today = new Date();

    for (let j = 0; j < pCount; j++) {
        const pStart = startM + (j * pStep * direction);
        const pEnd = startM + ((j + 1) * pStep * direction);
        const entryDate = new Date();
        entryDate.setDate(today.getDate() - (pCount - j) * 2);

        progress.push({
            id: `SAMPLE_P_${dike.id}_${j}`,
            date: entryDate.toISOString().split('T')[0],
            dikeId: dike.id,
            progInicio: formatPk(pStart),
            progFin: formatPk(pEnd),
            longitud: parseFloat(pStep.toFixed(2)),
            tipoTerreno: Math.random() > 0.8 ? "B2" : "B1",
            tipoEnrocado: "TIPO 2",
            partida: "404.A ENROCADO Y ACOMODO",
            intervencion: "AVANCE DE MUESTRA",
            capa: "Capa Única",
            observaciones: "Avance de muestra generado automáticamente"
        });
    }
});

console.log(JSON.stringify({ measurements, progress }, null, 2));
