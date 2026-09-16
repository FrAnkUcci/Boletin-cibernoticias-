import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { fetchFeedFromUrl, SAMPLE_SECURITY_NEWS } from './server/rssParser';
import { generateDailyBriefing, analyzeSingleThreat, getAi } from './server/geminiService';
import { translateNewsItemsToSpanish } from './server/translationService';
import {
  getAllSources,
  addCustomSource,
  deleteCustomSource,
  toggleSource,
  testFeedUrl,
} from './server/sourcesManager';
import type { DailyBriefing, NewsCategory, NewsItem } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cache for news and briefing
let cachedNews: NewsItem[] = [...SAMPLE_SECURITY_NEWS];
let cachedBriefing: DailyBriefing | null = null;
let lastFetchTimestamp: number = 0;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const sourceItemCounts: Record<string, number> = {};

async function refreshAllFeeds(forceBriefing = false) {
  const sources = getAllSources().filter((s) => s.enabled);
  console.log(`[Server] Refreshing cybersecurity news feeds from ${sources.length} active sources...`);

  const promises = sources.map(async (src) => {
    try {
      const items = await fetchFeedFromUrl(src.url, src.name, src.category);
      sourceItemCounts[src.id] = items.length;
      return items;
    } catch {
      sourceItemCounts[src.id] = 0;
      return [];
    }
  });

  const results = await Promise.allSettled(promises);

  const freshItems: NewsItem[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled' && res.value && res.value.length > 0) {
      freshItems.push(...res.value);
    }
  }

  // Deduplicate by URL or normalized title
  const seen = new Set<string>();
  let merged: NewsItem[] = [];

  // Add fresh items first
  for (const item of freshItems) {
    const key = item.url.replace(/\/$/, '').toLowerCase() || item.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // Also include the curated Spanish/global sample items if not already present
  for (const item of SAMPLE_SECURITY_NEWS) {
    const key = item.url.replace(/\/$/, '').toLowerCase() || item.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  // Sort by date descending
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Translate all English cybersecurity news items into Spanish (title and summary)
  try {
    const ai = getAi();
    merged = await translateNewsItemsToSpanish(merged, ai);
  } catch (transErr) {
    console.warn('[Server] Translation error during feed processing:', transErr);
  }

  cachedNews = merged;
  lastFetchTimestamp = Date.now();

  // Regenerate daily briefing if requested or not yet created
  if (forceBriefing || !cachedBriefing) {
    cachedBriefing = await generateDailyBriefing(cachedNews);
  }

  console.log(`[Server] Cached ${cachedNews.length} security news items. Briefing updated.`);
  return cachedNews;
}

// Ensure initial data is prepared
refreshAllFeeds(true).catch((err) => {
  console.error('[Server] Initial feed fetch error:', err);
});

// API Routes
app.get('/api/news', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    if (force || Date.now() - lastFetchTimestamp > CACHE_TTL_MS) {
      await refreshAllFeeds(false);
    }

    const allSources = getAllSources();
    res.json({
      news: cachedNews,
      lastUpdated: new Date(lastFetchTimestamp).toISOString(),
      sourcesCount: allSources.length,
      activeSourcesCount: allSources.filter((s) => s.enabled).length,
      totalCount: cachedNews.length,
    });
  } catch (error: any) {
    console.error('[API] /api/news error:', error);
    res.status(500).json({ error: 'Error al obtener noticias', fallback: cachedNews });
  }
});

app.post('/api/news/refresh', async (req, res) => {
  try {
    const updated = await refreshAllFeeds(true);
    res.json({
      success: true,
      news: updated,
      briefing: cachedBriefing,
      lastUpdated: new Date(lastFetchTimestamp).toISOString(),
    });
  } catch (error: any) {
    console.error('[API] /api/news/refresh error:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar fuentes' });
  }
});

// Sources Management Endpoints
app.get('/api/sources', (req, res) => {
  try {
    const sources = getAllSources().map((s) => {
      // Calculate how many news currently in memory belong to this source
      const newsFromSource = cachedNews.filter(
        (n) => n.source.toLowerCase() === s.name.toLowerCase() || n.url.includes(new URL(s.url).hostname)
      );
      return {
        ...s,
        itemCount: newsFromSource.length || sourceItemCounts[s.id] || 0,
      };
    });

    res.json({
      sources,
      total: sources.length,
      customCount: sources.filter((s) => s.isCustom).length,
      activeCount: sources.filter((s) => s.enabled).length,
    });
  } catch (error: any) {
    console.error('[API] /api/sources error:', error);
    res.status(500).json({ error: 'Error al consultar fuentes' });
  }
});

app.post('/api/sources', async (req, res) => {
  try {
    const { name, url, category, description } = req.body;
    if (!name || !url || !category) {
      res.status(400).json({ error: 'Nombre, URL y Categoría son campos obligatorios.' });
      return;
    }

    const { source, testResult } = await addCustomSource({
      name,
      url,
      category,
      description,
    });

    // Refresh feeds in background to pull news from the newly registered source
    refreshAllFeeds(false).catch((err) => console.warn('[Server] Post-source add refresh warning:', err));

    res.status(201).json({
      success: true,
      source,
      testResult,
      message: `Fuente "${name}" añadida exitosamente. ${testResult.message}`,
    });
  } catch (error: any) {
    console.error('[API] POST /api/sources error:', error);
    res.status(400).json({ error: error.message || 'Error al añadir fuente personalizada' });
  }
});

app.delete('/api/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteCustomSource(id);
    if (!deleted) {
      res.status(404).json({ error: 'Fuente personalizada no encontrada o es una fuente protegida del sistema' });
      return;
    }

    // Refresh news after removal
    refreshAllFeeds(false).catch((err) => console.warn('[Server] Post-source delete refresh warning:', err));

    res.json({ success: true, message: 'Fuente eliminada correctamente' });
  } catch (error: any) {
    console.error('[API] DELETE /api/sources error:', error);
    res.status(500).json({ error: 'Error al eliminar la fuente' });
  }
});

app.patch('/api/sources/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const updated = toggleSource(id, typeof enabled === 'boolean' ? enabled : true);
    if (!updated) {
      res.status(404).json({ error: 'Fuente no encontrada' });
      return;
    }

    res.json({ success: true, source: updated });
  } catch (error: any) {
    console.error('[API] PATCH /api/sources/toggle error:', error);
    res.status(500).json({ error: 'Error al cambiar estado de la fuente' });
  }
});

app.post('/api/sources/test', async (req, res) => {
  try {
    const { url, category } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL requerida' });
      return;
    }
    const result = await testFeedUrl(url, category);
    res.json(result);
  } catch (error: any) {
    console.error('[API] /api/sources/test error:', error);
    res.status(500).json({ error: 'Error al probar el feed' });
  }
});

app.post('/api/translate-news', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Array de noticias requerido' });
      return;
    }
    const ai = getAi();
    const translated = await translateNewsItemsToSpanish(items, ai);
    res.json({ success: true, items: translated });
  } catch (error: any) {
    console.error('[API] /api/translate-news error:', error);
    res.status(500).json({ error: 'Error al traducir noticias al español' });
  }
});

app.get('/api/briefing', async (req, res) => {
  try {
    if (!cachedBriefing || req.query.force === 'true') {
      cachedBriefing = await generateDailyBriefing(cachedNews);
    }
    res.json(cachedBriefing);
  } catch (error: any) {
    console.error('[API] /api/briefing error:', error);
    res.status(500).json({ error: 'Error al generar el boletín diario' });
  }
});

app.post('/api/analyze-threat', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Título requerido' });
      return;
    }
    const analysis = await analyzeSingleThreat(title, content || title);
    res.json(analysis);
  } catch (error: any) {
    console.error('[API] /api/analyze-threat error:', error);
    res.status(500).json({ error: 'Error al analizar la amenaza' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Cybersecurity Bulletin Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
