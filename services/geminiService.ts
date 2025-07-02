


import { GoogleGenAI } from "@google/genai";
import { GeminiSingleRunPromptData } from '../components/types';
import { GEMINI_MODEL_NAME } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY environment variable is not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const constructCumulativePrompt = (data: GeminiSingleRunPromptData): string => {
  const {
    testName, targetMean, rawData, westgardViolations,
    observedMean, observedSD, observedCV, biasPercent, sigmaMetric,
    refBioTEa, cliaTEa, sigmaWarningThreshold, sigmaCriticalThreshold
  } = data;

  let prompt = `You are a medical lab quality control expert. Analyze the following CUMULATIVE QC data for the ${testName} test, collected over a period of time.

Target QC Parameters for this Test:
- Target Mean: ${targetMean.toFixed(2)}
- Biological Variation TEa (%): ${refBioTEa ?? 'N/A'}
- CLIA TEa (%): ${cliaTEa ?? 'N/A'}
- Lab's Sigma Warning Threshold: ${sigmaWarningThreshold?.toFixed(1) ?? 'N/A'}
- Lab's Sigma Critical Threshold: ${sigmaCriticalThreshold?.toFixed(1) ?? 'N/A'}

Observed QC Statistics for the ENTIRE PERIOD:
- Number of Data Points: ${rawData.split('\n').filter(Boolean).length}
- Observed Mean: ${observedMean?.toFixed(2) ?? 'N/A'}
- Observed SD: ${observedSD?.toFixed(2) ?? 'N/A'}
- Observed CV (%): ${observedCV?.toFixed(2) ?? 'N/A'}%
- Observed Bias (%): ${biasPercent?.toFixed(2) ?? 'N/A'}%

An excerpt of the most recent Raw Data Points:
${rawData.length > 2000 ? `... (data too long) ...\n${rawData.slice(-2000)}` : rawData}

Performance Metrics for the CUMULATIVE Run:
- Sigma Metric: ${sigmaMetric?.sigmaValue?.toFixed(2) ?? 'N/A'} (Assessment: ${sigmaMetric?.assessment ?? 'N/A'})
  - Details for Sigma: ${sigmaMetric?.details ?? ''}

Calculated Westgard Rule Violations in the CUMULATIVE data:
`;

  if (westgardViolations.length > 0) {
    westgardViolations.forEach(v => {
      prompt += `- ${v.rule}: ${v.message}\n`;
    });
  } else {
    prompt += `- None detected.\n`;
  }

  prompt += `
Based on this CUMULATIVE data, please provide a concise and actionable analysis for lab personnel:
1.  **Long-Term Performance Summary:** Briefly assess the long-term accuracy (bias) and precision (CV, SD). Is the process stable?
2.  **Significance of Findings:** Comment on any trends, shifts, or recurring Westgard rule violations. How does the cumulative Sigma Metric reflect overall process capability? Are there any patterns in the data that suggest a need for investigation?
3.  **Overall Recommendation:** State whether the process is considered stable and in control over time. Suggest actions if systemic issues are apparent (e.g., recommend calibration, review reagent lots, investigate instrument performance).

Focus on the long-term stability and control of the test.
`;
  return prompt;
};

export const getQCInterpretationForCumulativeRun = async (data: GeminiSingleRunPromptData): Promise<string> => {
  if (!API_KEY) {
    return "AI interpretation is unavailable: API key not configured.";
  }
  
  const prompt = constructCumulativePrompt(data);

  try {
    const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: prompt,
    });
    
    let interpretationText = response.text; 
    const fenceRegex = /^```(?:\w*\s*)?\n?([\s\S]*?)\n?```$/s;
    const match = interpretationText.match(fenceRegex);
    if (match && match[1]) {
      interpretationText = match[1].trim();
    } else {
      interpretationText = interpretationText.trim(); 
    }
    
    return interpretationText;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes("API_KEY_INVALID") || error.message.includes("API key not valid")) {
             throw new Error("Gemini API request failed: Invalid API Key. Please check your configuration.");
        }
        throw new Error(`Gemini API request failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred while fetching QC interpretation from Gemini API.");
  }
};
