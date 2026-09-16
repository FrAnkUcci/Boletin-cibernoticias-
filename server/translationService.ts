import { GoogleGenAI, Type } from '@google/genai';
import type { NewsItem } from '../src/types';

// English and Spanish token lists for language detection
const ENGLISH_TOKENS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  // Cyber specific English indicators
  'warns', 'warning', 'warned', 'attack', 'attacks', 'attackers', 'hacker', 'hackers',
  'vulnerability', 'vulnerabilities', 'flaw', 'flaws', 'breach', 'breaches', 'leaked',
  'exploit', 'exploited', 'exploiting', 'zero-day', 'patch', 'patches', 'patched',
  'malware', 'ransomware', 'stealer', 'trojan', 'backdoor', 'spyware', 'threat',
  'threats', 'actor', 'actors', 'gang', 'campaign', 'targeting', 'targets', 'targeted',
  'uncovers', 'reveals', 'discovers', 'fixes', 'releases', 'security', 'critical',
  'flaw', 'bugs', 'bypasses', 'bypassing', 'hijacking', 'credentials', 'compromised',
  'exposed', 'cyberattack', 'cyberattacks', 'remote', 'execution', 'code', 'users'
]);

const SPANISH_TOKENS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por',
  'un', 'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero',
  'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre', 'cuando',
  'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien',
  'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra',
  'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos',
  'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos',
  'alerta', 'avisos', 'seguridad', 'ciberseguridad', 'vulnerabilidades', 'nacional',
  'boletín', 'oficial', 'disposición', 'ministerio', 'estado', 'resolución', 'normativa'
]);

/**
 * Detects whether a given text is predominantly in English.
 */
export function isEnglishText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return false;

  let englishScore = 0;
  let spanishScore = 0;

  for (const word of words) {
    if (ENGLISH_TOKENS.has(word)) englishScore++;
    if (SPANISH_TOKENS.has(word)) spanishScore++;
  }

  // If there are clear English markers and English words outnumber Spanish words
  if (englishScore >= 2 && englishScore > spanishScore) {
    return true;
  }

  // If English score is dominant relative to words count
  if (words.length >= 4 && englishScore / words.length >= 0.25 && spanishScore === 0) {
    return true;
  }

  return false;
}

/**
 * Checks if a NewsItem needs translation from English to Spanish.
 */
export function needsEnglishTranslation(item: NewsItem): boolean {
  // If already marked as translated, skip
  if (item.translated) return false;

  // Check title first (strongest indicator)
  if (isEnglishText(item.title)) return true;

  // Check summary
  if (isEnglishText(item.summary)) return true;

  return false;
}

// Fallback rule-based glossary for cybersecurity headlines
const CYBER_GLOSSARY_REPLACEMENTS: [RegExp, string][] = [
  // Headline patterns
  [/^(.+?)\s+warns\s+of\s+(.+)$/i, '$1 advierte de $2'],
  [/^(.+?)\s+warns\s+(.+)$/i, '$1 alerta sobre $2'],
  [/^(.+?)\s+fixes\s+critical\s+(.+?)\s+flaw/i, '$1 soluciona fallo crítico en $2'],
  [/^(.+?)\s+fixes\s+(.+?)\s+zero-day/i, '$1 corrige zero-day en $2'],
  [/^(.+?)\s+releases\s+patch\s+for\s+(.+)$/i, '$1 publica parche para $2'],
  [/^(.+?)\s+patches\s+(.+)$/i, '$1 parchea $2'],
  [/^critical\s+zero-day\s+in\s+(.+?)\s+allows\s+(.+)$/i, 'Vulnerabilidad zero-day crítica en $1 permite $2'],
  [/^critical\s+flaw\s+in\s+(.+?)\s+allows\s+(.+)$/i, 'Fallo crítico en $1 permite $2'],
  [/^hackers\s+target\s+(.+?)\s+with\s+(.+)$/i, 'Cibercriminales atacan $1 con $2'],
  [/^hackers\s+exploit\s+(.+?)\s+in\s+(.+)$/i, 'Cibercriminales explotan $1 en $2'],
  [/^ransomware\s+gang\s+targets\s+(.+)$/i, 'Banda de ransomware ataca $1'],
  [/^ransomware\s+gang\s+claims\s+attack\s+on\s+(.+)$/i, 'Banda de ransomware reivindica ataque contra $1'],
  [/^new\s+ransomware\s+strain\s+(.+)$/i, 'Nueva variante de ransomware $1'],
  [/^data\s+breach\s+at\s+(.+)$/i, 'Fuga de datos en $1'],

  // Frequent common phrases in cyber news
  [/\bdata breach\b/gi, 'fuga de datos'],
  [/\bdata leak\b/gi, 'filtración de datos'],
  [/\bransomware gang\b/gi, 'banda de ransomware'],
  [/\bransomware strain\b/gi, 'variante de ransomware'],
  [/\bransomware attack\b/gi, 'ataque de ransomware'],
  [/\bzero-day vulnerability\b/gi, 'vulnerabilidad zero-day'],
  [/\bzero-day flaw\b/gi, 'fallo de día cero (zero-day)'],
  [/\bremote code execution\b/gi, 'ejecución remota de código (RCE)'],
  [/\bprivilege escalation\b/gi, 'escalada de privilegios'],
  [/\bsecurity update\b/gi, 'actualización de seguridad'],
  [/\bsecurity advisory\b/gi, 'aviso de seguridad'],
  [/\bactively exploited\b/gi, 'explotada activamente'],
  [/\bknown exploited vulnerability\b/gi, 'vulnerabilidad explotada conocida'],
  [/\bsupply chain attack\b/gi, 'ataque a la cadena de suministro'],
  [/\bdenial of service\b/gi, 'denegación de servicio (DoS)'],
  [/\bphishing campaign\b/gi, 'campaña de phishing'],
  [/\bthreat actor\b/gi, 'actor de amenazas'],
  [/\bthreat actors\b/gi, 'actores de amenazas'],
  [/\bcritical vulnerability\b/gi, 'vulnerabilidad crítica'],
  [/\bcritical flaw\b/gi, 'fallo crítico'],
  [/\bhigh severity\b/gi, 'severidad alta'],
  [/\bbuffer overflow\b/gi, 'desbordamiento de búfer'],
  [/\bsql injection\b/gi, 'inyección SQL'],
  [/\bcommand injection\b/gi, 'inyección de comandos'],
  [/\bauthentication bypass\b/gi, 'evasión de autenticación'],
  [/\bflaw allows\b/gi, 'fallo permite'],
  [/\bvulnerability allows\b/gi, 'vulnerabilidad permite'],
  [/\bhackers are\b/gi, 'los cibercriminales están'],
  [/\battackers are\b/gi, 'los atacantes están'],
  [/\bwarns users\b/gi, 'advierte a los usuarios'],
  [/\burges users to update\b/gi, 'insta a los usuarios a actualizar'],
  [/\bpatches available\b/gi, 'parches disponibles'],
  [/\bmillions of\b/gi, 'millones de'],
  [/\baffects millions\b/gi, 'afecta a millones'],
];

/**
 * Public Google Translate free endpoint (fast single-query fallback).
 */
async function translateWithPublicApi(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3500),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item[0]).join('');
      if (translated && translated.trim().length > 0) {
        return translated.trim();
      }
    }
  } catch {
    // Silently fall through to rule-based translation
  }

  // Fallback to cyber glossary translation
  return applyGlossaryTranslation(text);
}

/**
 * Rule-based cyber translation fallback.
 */
function applyGlossaryTranslation(text: string): string {
  let translated = text;
  for (const [pattern, replacement] of CYBER_GLOSSARY_REPLACEMENTS) {
    translated = translated.replace(pattern, replacement);
  }
  return translated;
}

// In-memory translation cache to avoid duplicate API calls
const TRANSLATION_CACHE = new Map<string, { titleEs: string; summaryEs: string }>();
let geminiTranslationCooldownUntil = 0;

function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.error?.code || err?.code;
  if (status === 429) return true;
  const msg = typeof err?.message === 'string' ? err.message : typeof err === 'string' ? err : '';
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded')
  );
}

/**
 * Translates a batch of items using the Gemini API.
 */
async function translateBatchWithGemini(
  ai: GoogleGenAI,
  itemsToTranslate: { id: string; title: string; summary: string }[]
): Promise<Map<string, { titleEs: string; summaryEs: string }>> {
  const resultMap = new Map<string, { titleEs: string; summaryEs: string }>();

  if (Date.now() < geminiTranslationCooldownUntil) {
    return resultMap;
  }

  const prompt = `Eres un traductor experto en Ciberinteligencia para la Unidad de Coordinación de Ciberseguridad de la Guardia Civil en España.
Traduce los siguientes titulares y resúmenes de noticias del inglés al español técnico formal, claro y natural.

Reglas estrictas:
1. Mantén intactos los identificadores de vulnerabilidades (ej. CVE-2026-XXXX, GHSA-XXXX).
2. Mantén intactos los acrónimos técnicos (RCE, MFA, SSO, EDR, SIEM, OT, IoT, API, VPN, DDoS, XSS, KEV).
3. Mantén los nombres propios de grupos cibercriminales (LockBit, Akira, Qilin, Volt Typhoon, Midnight Blizzard), marcas y productos (Microsoft, Google Chrome, Fortinet, Ivanti, VMware, Cisco, Linux, Windows, Apple, Kubernetes).
4. Emplea terminología técnica adecuada en español (ej. "zero-day" -> "día cero (zero-day)", "data breach" -> "fuga de datos", "actively exploited" -> "explotada activamente", "patch available" -> "parche disponible", "ransomware strain" -> "variante de ransomware").
5. Traduce TODOS los titulares y resúmenes enviados.

NOTICIAS A TRADUCIR:
${JSON.stringify(itemsToTranslate, null, 2)}

Devuelve ÚNICAMENTE un array JSON con esta estructura exacta para cada elemento:
[
  {
    "id": string,
    "titleEs": string,
    "summaryEs": string
  }
]`;

  const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                titleEs: { type: Type.STRING },
                summaryEs: { type: Type.STRING }
              },
              required: ['id', 'titleEs', 'summaryEs']
            }
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.id && item.titleEs && item.summaryEs) {
              resultMap.set(item.id, {
                titleEs: item.titleEs.trim(),
                summaryEs: item.summaryEs.trim()
              });
            }
          }
          return resultMap;
        }
      }
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        geminiTranslationCooldownUntil = Date.now() + 60_000 * 5; // 5 minutes cooldown
        console.info(`[Translator] Free tier translation quota limit reached; activating high-speed neural and technical glossary fallback.`);
        break; // All models share quota, do not retry
      }

      console.info(`[Translator] Model ${model} temporarily unavailable; switching to fallback model...`);
    }
  }

  return resultMap;
}

/**
 * Main translation processor for an array of NewsItems.
 * Translates all English news items to Spanish, preserving original English strings.
 */
export async function translateNewsItemsToSpanish(
  items: NewsItem[],
  aiInstance: GoogleGenAI | null
): Promise<NewsItem[]> {
  const itemsNeedingTranslation: NewsItem[] = [];

  for (const item of items) {
    if (item.translated) continue;

    // Check if already in persistent cache
    const cacheKey = item.id || item.title;
    if (TRANSLATION_CACHE.has(cacheKey)) {
      const cached = TRANSLATION_CACHE.get(cacheKey)!;
      item.originalTitle = item.originalTitle || item.title;
      item.originalSummary = item.originalSummary || item.summary;
      item.originalLanguage = 'en';
      item.translated = true;
      item.title = cached.titleEs;
      item.summary = cached.summaryEs;
      item.content = item.content && item.content.length > 500 ? item.content : cached.summaryEs;
      continue;
    }

    if (needsEnglishTranslation(item)) {
      itemsNeedingTranslation.push(item);
    }
  }

  if (itemsNeedingTranslation.length === 0) {
    return items;
  }

  console.log(`[Translator] Found ${itemsNeedingTranslation.length} news items in English to translate to Spanish...`);

  const translationResults = new Map<string, { titleEs: string; summaryEs: string }>();

  // 1. If Gemini AI is available and not in cooldown, translate in batches
  if (aiInstance && Date.now() >= geminiTranslationCooldownUntil) {
    const BATCH_SIZE = 10;
    for (let i = 0; i < itemsNeedingTranslation.length; i += BATCH_SIZE) {
      const batch = itemsNeedingTranslation.slice(i, i + BATCH_SIZE).map((it) => ({
        id: it.id,
        title: it.title,
        summary: it.summary
      }));

      try {
        const batchResults = await translateBatchWithGemini(aiInstance, batch);
        for (const [id, res] of batchResults.entries()) {
          translationResults.set(id, res);
        }

        if (Date.now() < geminiTranslationCooldownUntil) {
          // Quota limit reached; proceed with fallback for remainder
          break;
        }
      } catch {
        // Fallback pipeline handles any unhandled batch items
      }
    }
  }

  // 2. For any remaining items not translated by Gemini, use fast fallback translation
  const remainingItems = itemsNeedingTranslation.filter((it) => !translationResults.has(it.id));
  if (remainingItems.length > 0) {
    // Process in parallel chunks of 5
    const CHUNK_SIZE = 5;
    for (let i = 0; i < remainingItems.length; i += CHUNK_SIZE) {
      const chunk = remainingItems.slice(i, i + CHUNK_SIZE);
      await Promise.allSettled(
        chunk.map(async (item) => {
          try {
            const [titleEs, summaryEs] = await Promise.all([
              translateWithPublicApi(item.title),
              translateWithPublicApi(item.summary)
            ]);
            translationResults.set(item.id, {
              titleEs: titleEs || item.title,
              summaryEs: summaryEs || item.summary
            });
          } catch {
            translationResults.set(item.id, {
              titleEs: applyGlossaryTranslation(item.title),
              summaryEs: applyGlossaryTranslation(item.summary)
            });
          }
        })
      );
    }
  }

  // 3. Map translated fields back onto the NewsItem objects and save in cache
  return items.map((item) => {
    const trans = translationResults.get(item.id);
    if (!trans) {
      return item;
    }

    // Save in cache
    const cacheKey = item.id || item.title;
    TRANSLATION_CACHE.set(cacheKey, trans);
    if (item.title) TRANSLATION_CACHE.set(item.title, trans);

    return {
      ...item,
      originalTitle: item.originalTitle || item.title,
      originalSummary: item.originalSummary || item.summary,
      originalLanguage: 'en',
      translated: true,
      title: trans.titleEs,
      summary: trans.summaryEs,
      content: item.content ? (item.content.length < 500 ? trans.summaryEs : item.content) : trans.summaryEs
    };
  });
}
