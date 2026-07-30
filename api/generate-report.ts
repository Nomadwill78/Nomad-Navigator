import { GoogleGenAI } from '@google/genai';

// Secure server-side report generation. The Gemini key lives here as a
// server-only env var (GEMINI_API_KEY) and is NEVER shipped to the browser.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'Report generation is not configured yet. Add a GEMINI_API_KEY in Vercel.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const data = body.data;
  const frequency = body.frequency || 'quarterly';

  if (!data) {
    res.status(400).json({ error: 'Missing dashboard data.' });
    return;
  }

  const prompt = `
      You are a grantmaking expert and senior nonprofit analyst for "Nomad Compass".
      Analyze the following comprehensive dashboard data and generate a detailed, grant-ready ${String(frequency).toUpperCase()} Impact Report in Markdown format.

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

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    res.status(200).json({ report: response.text || 'Unable to generate report at this time.' });
  } catch (error: any) {
    console.error('Report generation error:', error?.message || error);
    res.status(502).json({ error: 'The report service could not be reached. Please try again.' });
  }
}
