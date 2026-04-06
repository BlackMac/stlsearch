const { ThingiverseAdapter } = require('./thingiverse');
const { PrintablesAdapter } = require('./printables');
const { SketchfabAdapter } = require('./sketchfab');
const { ThreeDScansAdapter } = require('./threedscans');
const { SmithsonianAdapter } = require('./smithsonian');
const { MyMiniFactoryAdapter } = require('./myminifactory');

// Only include adapters with working APIs.
const adapters = [
  new SketchfabAdapter(),
  new ThingiverseAdapter(),
  new PrintablesAdapter(),
  new MyMiniFactoryAdapter(),
  new ThreeDScansAdapter(),
  new SmithsonianAdapter(),
];

/**
 * Get all adapters (or filtered subset)
 */
function getAdapters(sourceNames = null) {
  if (!sourceNames || sourceNames === 'all') return adapters;
  const names = Array.isArray(sourceNames) ? sourceNames : sourceNames.split(',');
  return adapters.filter(a => names.includes(a.name));
}

/**
 * Fan-out search to multiple adapters with timeout
 */
async function searchAll(query, options = {}) {
  const {
    sources = 'all',
    page = 1,
    perPage = 20,
    sort = 'relevant',
    freeOnly = true,
    timeout = 8000,
  } = options;

  const activeAdapters = getAdapters(sources).filter(a => a.isEnabled());

  console.log(`Searching ${activeAdapters.length} sources for "${query}": ${activeAdapters.map(a => a.name).join(', ')}`);

  const results = await Promise.allSettled(
    activeAdapters.map(adapter =>
      Promise.race([
        adapter.search(query, { page, perPage, sort, freeOnly }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${adapter.displayName} timeout`)), timeout)
        ),
      ])
    )
  );

  const allResults = [];
  const sourceStats = {};

  results.forEach((result, i) => {
    const adapter = activeAdapters[i];
    if (result.status === 'fulfilled') {
      sourceStats[adapter.name] = {
        name: adapter.displayName,
        count: result.value.results.length,
        total: result.value.total,
        status: 'ok',
      };
      allResults.push(...result.value.results);
    } else {
      sourceStats[adapter.name] = {
        name: adapter.displayName,
        count: 0,
        total: 0,
        status: 'error',
        error: result.reason?.message || 'Unknown error',
      };
    }
  });

  // Deduplicate cross-source results (same model on multiple platforms)
  const deduped = deduplicateResults(allResults);

  // Sort merged results
  sortResults(deduped, sort);

  return {
    results: deduped,
    total: deduped.length,
    sources: sourceStats,
    query,
    page,
  };
}

function sortResults(results, sort) {
  switch (sort) {
    case 'newest':
      results.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      break;
    case 'downloads':
      results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
      break;
    case 'likes':
      results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      break;
    default:
      // Sort by combined score: downloads + likes*2, with source variety
      results.sort((a, b) => {
        const scoreA = Math.max(a.downloads || 0, 0) + Math.max(a.likes || 0, 0) * 2;
        const scoreB = Math.max(b.downloads || 0, 0) + Math.max(b.likes || 0, 0) * 2;
        return scoreB - scoreA;
      });
      break;
  }
}

/**
 * Normalize a title for fuzzy comparison.
 * Strips punctuation, extra spaces, lowercases, removes common suffixes.
 */
function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')    // strip punctuation
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim();
}

/**
 * Check if two titles are similar enough to be duplicates.
 * Uses normalized exact match or substring containment for short titles.
 */
function isSimilarTitle(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb || na.length < 4 || nb.length < 4) return false;

  // Exact normalized match
  if (na === nb) return true;

  // One contains the other (for cases like "Parametric Hinge" vs "Parametric hinge v2")
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length >= 8 && longer.startsWith(shorter)) return true;

  // Token-based similarity: if 80%+ of words overlap
  const tokensA = new Set(na.split(' ').filter(w => w.length > 2));
  const tokensB = new Set(nb.split(' ').filter(w => w.length > 2));
  if (tokensA.size < 2 || tokensB.size < 2) return false;
  const overlap = [...tokensA].filter(t => tokensB.has(t)).length;
  const similarity = overlap / Math.min(tokensA.size, tokensB.size);
  return similarity >= 0.8;
}

/**
 * Score a result for dedup winner selection.
 * Higher score = better result to keep.
 */
function resultScore(r) {
  return Math.max(r.downloads || 0, 0) + Math.max(r.likes || 0, 0) * 2 +
    (r.thumbnail ? 10 : 0) + (r.description ? 5 : 0);
}

/**
 * Remove duplicate models across sources.
 * When the same model appears on multiple platforms, keeps the one with
 * the best stats and adds a "alsoOn" array to track other sources.
 */
function deduplicateResults(results) {
  const kept = [];
  const usedIndices = new Set();

  for (let i = 0; i < results.length; i++) {
    if (usedIndices.has(i)) continue;

    let best = results[i];
    const alsoOn = [];

    for (let j = i + 1; j < results.length; j++) {
      if (usedIndices.has(j)) continue;

      if (isSimilarTitle(best.title, results[j].title)) {
        usedIndices.add(j);
        // Keep the one with better score
        if (resultScore(results[j]) > resultScore(best)) {
          alsoOn.push({ source: best.source, sourceName: best.sourceName, sourceUrl: best.sourceUrl });
          best = results[j];
        } else {
          alsoOn.push({ source: results[j].source, sourceName: results[j].sourceName, sourceUrl: results[j].sourceUrl });
        }
      }
    }

    if (alsoOn.length > 0) {
      // Deduplicate alsoOn by source (keep one per source, exclude best's own source)
      const seen = new Set([best.source]);
      best.alsoOn = alsoOn.filter(s => {
        if (seen.has(s.source)) return false;
        seen.add(s.source);
        return true;
      });
    }
    kept.push(best);
  }

  return kept;
}

module.exports = { adapters, getAdapters, searchAll };
