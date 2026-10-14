import https from 'https';

interface ChatMessage {
  sender: 'user' | 'ai' | 'model' | 'assistant';
  text: string;
}

interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiContentPart[];
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

const DEFAULT_SYSTEM_INSTRUCTION = `You are AI CareAssist, an empathetic, highly knowledgeable, and supportive digital healthcare assistant on the HealthCentreApp platform.

Key Guidelines:
1. Provide comprehensive, accurate, practical, and compassionate guidance covering all aspects of general health, adult care, family wellness, symptom triage, preventive health, medication advice, and lifestyle management.
2. If the user provides a photo or image (e.g. skin conditions, medication packaging, visible symptoms, or health records), carefully inspect the visual elements and provide constructive, cautious medical advice while noting visual evaluation limitations.
3. Structure your answers clearly using clean headings or bullet points where appropriate for readability.
4. Keep answers easy to understand, encouraging, and actionable.
5. Triage & Safety: Highlight red flag emergency symptoms (e.g. severe chest pain, sudden numbness or weakness, severe breathing difficulty, high persistent fever, or signs of severe dehydration) and emphasize visiting the nearest healthcare center or emergency department immediately when needed.
6. Always remind users gently that AI CareAssist provides advisory health information and does not replace an in-person consultation with a qualified medical professional.
7. Language: Always communicate in clear, professional, compassionate English.
8. Patient Records, Medications & Care Summaries:
You have direct, verified access to the patient's personal health records provided in the [PATIENT'S ACTIVE MEDICATIONS], [PATIENT'S RECENT MYSYMPTOMS REPORTS], [PATIENT MEDICAL RECORD & ALLERGIES], and [REGISTERED CHILD HEALTH PROFILES] context blocks.
- When the user asks about their medications (e.g. "tell me my medication details", "what medicines am I on?", "when do I take my pills?", or "medication details"), review and list their actual active medications from the context, including names, dosages, frequencies, and instructions. Do NOT claim that you lack access to their personal records or pharmacy history when records are present in the context.
- If the context indicates that no medications or symptoms are currently logged, inform the user politely that their HealthCentreApp profile currently has no active records saved, and guide them on how to log medications or describe any medicine they are taking.
- When the user requests a "Care Summary" or "MySymptoms Report", synthesize their real recorded symptoms, child health profiles, and active medications into a clear, cohesive summary with clinical guidance.`;

/**
 * Call Google Generative AI API with fallback model support
 */
async function callGeminiApi(modelName: string, payload: any, apiKey: string): Promise<string> {
  const postData = JSON.stringify(payload);

  const options: https.RequestOptions = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
    timeout: 12000,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const candidate = parsed.candidates?.[0];
            const text = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('\n');
            if (text) {
              resolve(text);
            } else {
              reject(new Error('No text generated in Gemini response'));
            }
          } catch (err: any) {
            reject(new Error(`Failed to parse Gemini response: ${err.message}`));
          }
        } else {
          try {
            const errorObj = JSON.parse(data);
            reject(new Error(errorObj.error?.message || `HTTP ${res.statusCode}: ${data}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for model ${modelName}`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

export const geminiService = {
  /**
   * Generate an intelligent CareAssist response from prompt, image and previous conversation turns
   */
  async generateCareAssistResponse(
    prompt: string,
    history: ChatMessage[] = [],
    patientContext?: string,
    image?: { mimeType: string; data: string }
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in backend environment');
    }

    // Build system instruction with confidential patient records
    const fullSystemInstruction = patientContext
      ? `${DEFAULT_SYSTEM_INSTRUCTION}\n\n[CONFIDENTIAL PATIENT HEALTH RECORDS & CLINICAL CONTEXT]:\n${patientContext}`
      : DEFAULT_SYSTEM_INSTRUCTION;

    // Convert past messages into Gemini conversational turns (ensuring valid alternation)
    const contents: GeminiContent[] = [];

    // Add recent history turns (limit last 8 turns to keep context fast and focused)
    const recentHistory = history.slice(-8);
    for (const msg of recentHistory) {
      const isUser = msg.sender === 'user';
      if (msg.text && msg.text.trim()) {
        const role = isUser ? 'user' : 'model';
        // Avoid duplicate consecutive same roles if history has quirks
        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts.push({ text: msg.text.trim() });
        } else {
          contents.push({
            role,
            parts: [{ text: msg.text.trim() }],
          });
        }
      }
    }

    // Add current user prompt and optional image
    const userParts: GeminiContentPart[] = [{ text: prompt.trim() }];
    if (image && image.data && image.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    }

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts.push(...userParts);
    } else {
      contents.push({
        role: 'user',
        parts: userParts,
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: fullSystemInstruction }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1200,
      },
    };

    let lastError: any = null;

    // Try through candidate models
    for (const model of CANDIDATE_MODELS) {
      try {
        const text = await callGeminiApi(model, payload, apiKey);
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiService] Model ${model} failed: ${err.message}. Trying next candidate...`);
      }
    }

    throw new Error(lastError?.message || 'All Gemini models failed to generate content');
  },
};
