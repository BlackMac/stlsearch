const { ThingiverseAdapter } = require('./thingiverse');
const { PrintablesAdapter } = require('./printables');
const { Cults3DAdapter } = require('./cults3d');
const { MyMiniFactoryAdapter } = require('./myminifactory');
const { ThangsAdapter } = require('./thangs');
const { SketchfabAdapter } = require('./sketchfab');

// Only include adapters with working APIs.
// Excluded (no working server-side access):
//   MakerWorld (403 on all endpoints), GrabCAD/Free3D/TurboSquid/CGTrader (Cloudflare),
//   NIH 3D (404), YouMagine (404/503)
const adapters = [
  new SketchfabAdapter(),
  new ThingiverseAdapter(),
  new PrintablesAdapter(),
  new ThangsAdapter(),
  new Cults3DAdapter(),
  new MyMiniFactoryAdapter(),
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

  // Sort merged results
  sortResults(allResults, sort);

  return {
    results: allResults,
    total: allResults.length,
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

module.exports = { adapters, getAdapters, searchAll };
