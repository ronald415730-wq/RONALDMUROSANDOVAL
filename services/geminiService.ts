
import { GoogleGenAI, Type } from "@google/genai";
import { DikeConfig, MeasurementEntry, CopySuggestion, BudgetSection, BrandKit, AdVariation } from "../types";

// FIX: Always use process.env.API_KEY when initializing the Gemini client instance
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeConstructionData = async (
  dikes: DikeConfig[],
  measurements: MeasurementEntry[],
  budget: BudgetSection[],
  userQuery: string
): Promise<string> => {
  const ai = getAI();

  // Prepare data summary for the context
  const dikeSummary = dikes.map(d => `${d.name} (${d.sectorId}): ${d.totalML}ml`).join("\n");
  
  // Serialize Detailed Measurements for Analysis (PK vs Volumes)
  const detailedData = measurements.map(m => {
    const volExcav = (m.item402B_Contractual + m.item402B_Rep + m.item402B_Fund + m.item402E_NivelFreatico) * m.distancia;
    const volTalud = (m.item404_Talud_T1 + m.item404_Talud_T2 + m.item404_Talud_T1_MM + m.item404_Talud_T2_MM) * m.distancia;
    const volUna = (m.item404_Una_T1 + m.item404_Una_T2 + m.item404_Una_T1_MM + m.item404_Una_T2_MM) * m.distancia;
    return `PK:${m.pk} | Dist:${m.distancia}m | Type:${m.tipoEnrocado} | Exc:${volExcav.toFixed(1)}m3 | Talud:${volTalud.toFixed(1)}m3 | Una:${volUna.toFixed(1)}m3`;
  }).join("\n");

  // Extract Key Unit Prices
  const enrocadoPrices: string[] = [];
  budget.forEach(sec => sec.groups.forEach(g => g.items.forEach(i => {
      if(i.description.includes("ENROCADO") || i.description.includes("EXCAVACIÓN")) {
          enrocadoPrices.push(`${i.code} ${i.description.substring(0, 30)}... : S/.${i.price}`);
      }
  })));
  const priceSummary = enrocadoPrices.join("\n");

  // --- Calculate Totals (Physical) ---
  const totalExcavation = measurements.reduce((acc, m) => {
    const vol402B = (m.item402B_Contractual + m.item402B_Rep + m.item402B_Fund);
    const vol402E = m.item402E_NivelFreatico;
    return acc + ((vol402B + vol402E) * m.distancia);
  }, 0);

  const totalEnrocado = measurements.reduce((acc, m) => {
    const volTalud = m.item404_Talud_T1 + m.item404_Talud_T2 + m.item404_Talud_T1_MM + m.item404_Talud_T2_MM;
    const volUna = m.item404_Una_T1 + m.item404_Una_T2 + m.item404_Una_T1_MM + m.item404_Una_T2_MM;
    return acc + ((volTalud + volUna) * m.distancia);
  }, 0);

  const totalRelleno = measurements.reduce((acc, m) => {
      return acc + ((m.item413A_Contractual + m.item413A_MM) * m.distancia);
  }, 0);
  
  // --- Calculate Totals (Financial) ---
  let totalDirectCost = 0; // Total Contractual
  let totalExecutedDirectCost = 0; // Total Executed to Date

  // Helper to map Item Code to Measurement Value (Logic mirrors MeasurementSummaryPanel)
  const getExecutedQtyForItem = (itemCode: string): number => {
      return measurements.reduce((acc, m) => {
          if (m.item501A_Carguio !== 1) return acc; // Only executed rows

          const rawCode = itemCode.trim();
          const baseCode = rawCode.split('_')[0].trim();
          const isB2Item = rawCode.endsWith('_R') || ['404.G', '404.H', '415.A', '416.B', '417.A'].includes(rawCode);
          const isB2Row = m.tipoTerreno === 'B2';

          // Ensure item matches row context (B1 vs B2)
          if (isB2Item && !isB2Row) return acc;
          if (!isB2Item && isB2Row) return acc; 

          let val = 0;
          const dist = m.distancia || 0;

          // Check dynamic columns
          if ((m as any)[rawCode] !== undefined) {
              val = Number((m as any)[rawCode]);
          } else {
              // Standard mapping
              switch (baseCode) {
                  case "402.B": val = (m.item402B_Contractual + m.item402B_Rep + m.item402B_Fund); break;
                  case "402.C": val = 0; break;
                  case "402.E": val = (m.item402E_NivelFreatico + m.item402E_NivelFreatico_MM); break;
                  case "403.A": val = (m.item403A_Contractual + m.item403A_Rep + m.item403A_Fund); break;
                  case "404.A": val = (m.item404_Talud_T1 + m.item404_Talud_T1_MM); break;
                  case "404.B": val = (m.item404_Talud_T2 + m.item404_Talud_T2_MM); break;
                  case "404.G": val = (m.item404_Talud_T1 + m.item404_Talud_T1_MM + m.item404_Talud_T2 + m.item404_Talud_T2_MM); break; 
                  case "404.D": case "404.F": val = (m.item404_Una_T1 + m.item404_Una_T1_MM); break;
                  case "404.E": val = (m.item404_Una_T2 + m.item404_Una_T2_MM); break;
                  case "404.H": val = (m.item404_Una_T1 + m.item404_Una_T1_MM + m.item404_Una_T2 + m.item404_Una_T2_MM); break;
                  case "413.A": val = (m.item413A_Contractual + m.item413A_MM); break;
                  case "412.A": val = m.item412A_Afirmado; break;
                  case "406.A": val = m.item406A_Perfilado; break;
                  case "409.A": val = m.item409A_Geotextil; break;
                  case "416.A": case "416.B": val = m.item416A_Fundacion; break;
                  case "408.A": val = m.item408A_Zanja; break;
                  case "405.A": val = (m.item405A_Descolmatacion + m.item405A_Descolmatacion_MM); break;
                  case "415.A": val = m.gavion; break;
                  default: val = 0;
              }
          }
          return acc + (val * dist);
      }, 0);
  };

  budget.forEach(section => {
      section.groups.forEach(group => {
          group.items.forEach(item => {
              totalDirectCost += (item.metrado * item.price);
              const executedQty = getExecutedQtyForItem(item.code);
              totalExecutedDirectCost += (executedQty * item.price);
          });
      });
  });
  
  const prompt = `Act as a Civil Engineer specializing in Hydraulic Works.
  
  Context Data:
  Dikes Configured: ${dikeSummary}
  Budget Unit Prices (Sample): ${priceSummary}
  
  Analysis Data:
  - Total Excavation Volume: ${totalExcavation.toFixed(2)} m3
  - Total Riprap (Enrocado) Volume: ${totalEnrocado.toFixed(2)} m3
  - Total Backfill Volume: ${totalRelleno.toFixed(2)} m3
  
  Financial Status:
  - Total Contractual Budget (Direct Cost): S/. ${totalDirectCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
  - Total Executed Cost (Direct Cost): S/. ${totalExecutedDirectCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
  - Financial Advance: ${totalDirectCost > 0 ? ((totalExecutedDirectCost/totalDirectCost)*100).toFixed(2) : 0}%

  Sample Measurements:
  ${detailedData.slice(0, 5000)}... (truncated)
  
  User Question: "${userQuery}"
  
  Instructions:
  1. Analyze relationship between PK, Volume, and Cost.
  2. If asked about "costo total", use the Total Executed Cost provided above.
  3. Provide professional, technical answers in Spanish.`;

  try {
    // FIX: Updated model name to gemini-3-flash-preview as per standard text task guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error analyzing data. Please check API Key.";
  }
};

// New Function for Contextual Procedural Help
export const getProceduralGuidance = async (
    currentContext: string,
    userQuestion: string
): Promise<string> => {
    const ai = getAI();

    const prompt = `You are an AI Assistant for a Hydraulic Works Control Application.
    
    Current User Context: "${currentContext}" (The screen they are looking at).
    User Question: "${userQuestion}"

    Features of the App:
    1. Configuration: Add Sectors, Dikes, and Manage backups.
    2. Data Entry (Hoja de Metrados): Enter executed quantities per PK. Supports 'B1' (New Dike) and 'B2' (Reinforcement).
    3. Budget: Manage budget items, prices, and view totals per sector.
    4. Progress: Track daily progress (linear meters), view charts.
    5. Summary: View financial and physical balance.
    
    Instructions:
    - Provide a short, concise, step-by-step guide to help the user.
    - If they ask about 'Optimization' or 'Speed', suggest using the System Support panel.
    - Keep tone professional and helpful.
    `;

    try {
        // FIX: Updated model name to gemini-3-flash-preview for procedural guidance
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text || "I can't help with that right now.";
    } catch (error) {
        return "Error connecting to assistant.";
    }
};

export const generateAdVariations = async (
  productDescription: string,
  productUrl: string,
  brandKit: BrandKit,
  count: number = 2,
  customCta?: string
): Promise<AdVariation[]> => {
  const ai = getAI();

  const prompt = `Act as a world-class advertising creative director.
  
  Product Description: "${productDescription}"
  Product URL: "${productUrl}"
  ${customCta ? `MANDATORY Call-to-Action: "${customCta}"` : ""}
  
  Brand Identity:
  - Primary Color: ${brandKit.primaryColor}
  - Secondary Color: ${brandKit.secondaryColor}
  - Font: ${brandKit.fontFamily}
  
  Task: Generate ${count} distinct variations for a banner ad.
  ${count === 5 ? "Each variation MUST explore a unique aesthetic: minimalist, bold, playful, professional, and vintage." : "Each variation should have a different creative angle."}
  
  For each variation, provide:
  1. A headline and description.
  2. The specified CTA (if provided, otherwise generate a compelling one).
  3. A visual prompt for an image generation model.
  4. A brief explanation of the design choices for that specific aesthetic.
  5. A recommended standard banner size (e.g., 300x250, 728x90, or 160x600).
  
  Return the result as a JSON array of objects with the following structure:
  [
    {
      "headline": "...",
      "cta": "...",
      "description": "...",
      "visualPrompt": "...",
      "style": "one of: minimal, bold, playful, professional, vintage, vibrant, editorial",
      "designExplanation": "...",
      "size": "..."
    }
  ]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const variations = JSON.parse(response.text || "[]");
    return variations.map((v: any, index: number) => ({
      ...v,
      id: `var-${Date.now()}-${index}`,
    }));
  } catch (error) {
    console.error("Error generating ad variations:", error);
    return [];
  }
};

export const generateCopySuggestions = async (
  productDescription: string
): Promise<CopySuggestion[]> => {
  // ... (Existing code kept for compatibility if needed, though likely unused in this app context)
  return [];
};
