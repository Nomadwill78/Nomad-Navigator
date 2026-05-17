import { GoogleGenAI, Type } from "@google/genai";
import { DashboardStats, AIAnalysisData, ReportFrequency } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDashboardInsights = async (data: DashboardStats): Promise<AIAnalysisData> => {
  try {
    const prompt = `
      Analyze the following nonprofit dashboard data for "Nomad Compass". 
      Provide strategic insights, risks, and recommendations.
      
      Data:
      ${JSON.stringify(data)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            trendAnalysis: { type: Type.STRING },
            readinessScore: { type: Type.INTEGER, description: "Grant readiness score between 0 and 100" }
          },
          required: ["keyFindings", "recommendations", "risks", "trendAnalysis", "readinessScore"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");
    
    return JSON.parse(text) as AIAnalysisData;
  } catch (error) {
    console.error("Error generating insights:", error);
    // Return fallback data if AI fails
    return {
      keyFindings: ["Data analysis unavailable at this moment.", "Please check connection."],
      recommendations: ["Review manual reports."],
      risks: ["Analysis incomplete."],
      trendAnalysis: "Unable to calculate.",
      readinessScore: 0
    };
  }
};

export const generateImpactReport = async (data: DashboardStats, frequency: ReportFrequency = 'quarterly'): Promise<string> => {
  try {
    const prompt = `
      You are a grantmaking expert and senior nonprofit analyst for "Nomad Compass". 
      Analyze the following comprehensive dashboard data and generate a detailed, grant-ready ${frequency.toUpperCase()} Impact Report in Markdown format.
      
      The reporting period for this report is ${frequency}.
      
      Data:
      ${JSON.stringify(data, null, 2)}

      Structure the report with these precise sections:
      1. **Executive Summary**: A high-impact overview (3-4 paragraphs) of performance, theory of change, and mission alignment.
      2. **Grant Readiness Assessment**: 
         - **Current Score**: [X/100]
         - **Rationale**: Provide a data-driven justification for this score based on reporting consistency, financial health, and outcome verification.
         - **Gaps**: Identify top 3 barriers to institutional funding readiness.
      3. **SWOT Analysis**: 
         - **Strengths**: Core competencies and high-performing metrics.
         - **Weaknesses**: Operational inefficiencies or data gaps.
         - **Opportunities**: Strategic scaling or partnership potential.
         - **Threats**: External risks or funding volatility.
      4. **Sector Benchmarks & Comparable Analysis**: Compare the organization's SROI ($${data.sroi}) and efficiency metrics against global development benchmarks and similar nonprofits in the WASH (Water, Sanitation, Hygiene) sector.
      5. **Outcomes & Effectiveness**: Detailed analysis of primary impacts (Water Access, Health, Behavior) vs. targets.
      6. **Equity & Inclusion Audit**: Performance analysis across demographics (Age, Race, Disability) and geographic reach (Urban vs Rural optimization).
      7. **Financial Sustainability**: Review of spending ratios (Program vs Admin), funding diversity, and operating liquidity.
      8. **Forward-Looking Strategic Recommendations**: 3 high-leverage actions to boost the Readiness Score for the next cycle.

      Tone: Extremely professional, analytical, evidence-based, and compelling for high-tier institutional global donors. Use Markdown formatting for hierarchy.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Unable to generate report at this time.";
  } catch (error) {
    console.error("Error generating report:", error);
    throw new Error("Failed to generate impact report.");
  }
};