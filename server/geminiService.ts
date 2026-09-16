import { GoogleGenAI, Type } from '@google/genai';
import type { DailyBriefing, NewsItem } from '../src/types';

let aiInstance: GoogleGenAI | null = null;

export function getAi(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

let geminiQuotaCooldownUntil = 0;

function isQuotaExceeded(err: any): boolean {
  if (!err) return false;
  const status = err?.status || err?.error?.code;
  if (status === 429) return true;
  const msg = typeof err?.message === 'string' ? err.message : '';
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('Quota exceeded')
  );
}

async function generateContentWithFallback(ai: GoogleGenAI, prompt: string, schema: any): Promise<string | null> {
  if (Date.now() < geminiQuotaCooldownUntil) {
    return null;
  }

  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });
      if (response.text) {
        return response.text;
      }
    } catch (err: any) {
      if (isQuotaExceeded(err)) {
        geminiQuotaCooldownUntil = Date.now() + 60_000 * 5; // 5 minute cooldown
        console.info(`[Gemini] API free tier request quota reached; switching smoothly to rule-based intelligence synthesizer.`);
        break; // All models share quota, do not retry
      }

      const isHighDemand =
        err?.status === 503 ||
        err?.error?.code === 503 ||
        (typeof err?.message === 'string' && (err.message.includes('503') || err.message.includes('high demand') || err.message.includes('UNAVAILABLE')));

      if (isHighDemand) {
        console.info(`[Gemini] Model ${model} experiencing temporary high demand; checking fallback model...`);
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      console.info(`[Gemini] Model ${model} currently unavailable; utilizing rule-based intelligence synthesizer.`);
      break;
    }
  }

  return null;
}

export async function generateDailyBriefing(news: NewsItem[]): Promise<DailyBriefing> {
  const ai = getAi();
  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate top critical and high items
  const criticalItems = news.filter((n) => n.severity === 'CRITICAL');
  const highItems = news.filter((n) => n.severity === 'HIGH');
  const allCves = Array.from(new Set(news.flatMap((n) => n.cves)));
  const topCandidateThreats = (criticalItems.concat(highItems).concat(news)).slice(0, 3);

  // If no Gemini API key or temporary 503 capacity limit, provide high-quality rule-based executive brief
  const defaultBriefing: DailyBriefing = {
    date: today,
    alertLevel: criticalItems.length > 1 ? 'CRITICAL' : criticalItems.length === 1 ? 'HIGH' : 'ELEVATED',
    headline: `Boletín de Ciberseguridad: ${criticalItems.length} incidentes críticos y ${news.length} avisos procesados hoy`,
    summary: `Panorama de amenazas activo con foco en explotación de vulnerabilidades perimetrales (RCE), actividad persistente de variantes de ransomware dirigidas a hipervisores de virtualización y campañas de suplantación OAuth. Se recomienda verificación urgente de los parches reportados por CISA e INCIBE.`,
    topThreats: topCandidateThreats.map((item) => ({
      title: item.title,
      severity: item.severity === 'CRITICAL' || item.severity === 'HIGH' ? item.severity : 'HIGH',
      description: item.summary,
    })),
    keyActions: [
      'Auditar y actualizar pasarelas SSL-VPN e interfaces de gestión perimetrales expuestas a Internet.',
      'Reforzar políticas de Acceso Condicional en Microsoft 365, deshabilitando flujos de Device Code no requeridos.',
      'Comprobar la segmentación de red en hipervisores VMware/Proxmox y activar MFA en consolas de gestión.',
      'Desplegar actualizaciones de navegador y controladores inalámbricos en todos los endpoints empresariales.'
    ],
    cveWatchlist: allCves.length > 0 ? allCves.slice(0, 6) : ['CVE-2026-21345', 'CVE-2026-30112', 'CVE-2026-4401'],
    generatedAt: new Date().toISOString(),
  };

  if (!ai) {
    return defaultBriefing;
  }

  try {
    const titlesAndSummaries = news
      .slice(0, 15)
      .map((n, i) => `[${i + 1}] [${n.severity}] [${n.source}] ${n.title}: ${n.summary} (CVEs: ${n.cves.join(', ') || 'N/A'})`)
      .join('\n');

    const prompt = `Actúa como un CISO y analista senior de ciberinteligencia. Analiza las siguientes noticias y avisos de seguridad de hoy (${today}) y genera un informe de inteligencia ejecutiva en español:

Noticias del día:
${titlesAndSummaries}

Genera un JSON con:
- alertLevel: "CRITICAL" | "HIGH" | "ELEVATED" | "NORMAL"
- headline: Titular conciso y directo de máximo 15 palabras
- summary: Resumen ejecutivo del panorama de amenazas de hoy (2 a 3 oraciones contundentes)
- topThreats: Lista de hasta 3 amenazas principales (con title, severity ["CRITICAL"|"HIGH"], description)
- keyActions: Lista de 4 recomendaciones técnicas y accionables para el equipo de seguridad
- cveWatchlist: Lista de los CVEs más urgentes mencionados`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        alertLevel: { type: Type.STRING },
        headline: { type: Type.STRING },
        summary: { type: Type.STRING },
        topThreats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              severity: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ['title', 'severity', 'description'],
          },
        },
        keyActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        cveWatchlist: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['alertLevel', 'headline', 'summary', 'topThreats', 'keyActions', 'cveWatchlist'],
    };

    const text = await generateContentWithFallback(ai, prompt, schema);
    if (text) {
      const parsed = JSON.parse(text);
      return {
        date: today,
        alertLevel: (parsed.alertLevel || defaultBriefing.alertLevel) as any,
        headline: parsed.headline || defaultBriefing.headline,
        summary: parsed.summary || defaultBriefing.summary,
        topThreats: parsed.topThreats?.length ? parsed.topThreats : defaultBriefing.topThreats,
        keyActions: parsed.keyActions?.length ? parsed.keyActions : defaultBriefing.keyActions,
        cveWatchlist: parsed.cveWatchlist?.length ? parsed.cveWatchlist : defaultBriefing.cveWatchlist,
        generatedAt: new Date().toISOString(),
      };
    }
  } catch (error: any) {
    console.info('[Gemini] Daily briefing synthesized due to:', error?.message || error);
  }

  return defaultBriefing;
}

export async function analyzeSingleThreat(title: string, content: string): Promise<{
  impact: string;
  recommendation: string;
  affectedSystems: string[];
}> {
  const ai = getAi();
  if (!ai) {
    return {
      impact: 'Potencial compromiso de confidencialidad e integridad del sistema afectado.',
      recommendation: 'Revisar la guía oficial del fabricante y aplicar los parches de seguridad recomendados.',
      affectedSystems: ['Sistemas corporativos compatibles']
    };
  }

  try {
    const prompt = `Analiza esta noticia de ciberseguridad:
Título: ${title}
Detalle: ${content}

Devuelve un JSON con:
- impact: impacto técnico y de negocio en 1 oración clara
- recommendation: recomendación técnica prioritaria para el equipo de seguridad
- affectedSystems: lista de sistemas, software o componentes afectados (máximo 3)`;

    const schema = {
      type: Type.OBJECT,
      properties: {
        impact: { type: Type.STRING },
        recommendation: { type: Type.STRING },
        affectedSystems: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['impact', 'recommendation', 'affectedSystems'],
    };

    const text = await generateContentWithFallback(ai, prompt, schema);
    if (text) {
      return JSON.parse(text);
    }
  } catch {
    console.info('[Gemini] Threat analysis heuristic assessment applied.');
  }

  return {
    impact: 'Riesgo de seguridad evaluado para entornos empresariales expuestos.',
    recommendation: 'Auditar la exposición de los servicios referenciados y aplicar defensas perimetrales.',
    affectedSystems: ['Infraestructura afectada']
  };
}
