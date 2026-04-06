const { ThingiverseAdapter } = require('./thingiverse');
const { PrintablesAdapter } = require('./printables');
const { Cults3DAdapter } = require('./cults3d');
const { MyMiniFactoryAdapter } = require('./myminifactory');
const { ThangsAdapter } = require('./thangs');
const { MakerWorldAdapter } = require('./makerworld');
const { SketchfabAdapter } = require('./sketchfab');
const { GrabCADAdapter } = require('./grabcad');
const { NIH3DAdapter } = require('./nih3d');
const { YouMagineAdapter } = require('./youmagine');
const { Free3DAdapter } = require('./free3d');
const { TurboSquidAdapter } = require('./turbosquid');
const { CGTraderAdapter } = require('./cgtrader');

// Initialize all adapters
const adapters = [
  new ThingiverseAdapter(),
  new PrintablesAdapter(),
  new Cults3DAdapter(),
  new MyMiniFactoryAdapter(),
  new ThangsAdapter(),
  new MakerWorldAdapter(),
  new SketchfabAdapter(),
  new GrabCADAdapter(),
  new NIH3DAdapter(),
  new YouMagineAdapter(),
  new Free3DAdapter(),
  new TurboSquidAdapter(),
  new CGTraderAdapter(),
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
      // Sort by a combined score: downloads + likes, with source variety
      results.sort((a, b) => {
        const scoreA = Math.max(a.downloads || 0, 0) + Math.max(a.likes || 0, 0) * 2;
        const scoreB = Math.max(b.downloads || 0, 0) + Math.max(b.likes || 0, 0) * 2;
        return scoreB - scoreA;
      });
      break;
  }
}

function interleaveResults(results) {
  const bySrc = {};
  for (const r of results) {
    if (!bySrc[r.source]) bySrc[r.source] = [];
    bySrc[r.source].push(r);
  }
  const sources = Object.keys(bySrc);
  const interleaved = [];
  let idx = 0;
  let added = true;
  while (added) {
    added = false;
    for (const src of sources) {
      if (idx < bySrc[src].length) {
        interleaved.push(bySrc[src][idx]);
        added = true;
      }
    }
    idx++;
  }
  results.length = 0;
  results.push(...interleaved);
}

module.exports = { adapters, getAdapters, searchAll };
