const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class ThingiverseAdapter extends BaseAdapter {
  constructor() {
    super('thingiverse', 'Thingiverse', {
      baseUrl: 'https://www.thingiverse.com',
      color: '#248bfb',
    });
    this.appToken = process.env.THINGIVERSE_APP_TOKEN || '';
  }

  isEnabled() {
    // Works via API with token, or via scraping with cheerio
    return !!(this.appToken || cheerio);
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;

    // Use API if token is available
    if (this.appToken) {
      return this._searchAPI(query, { page, perPage, sort });
    }

    // Fall back to scraping
    return this._searchScrape(query, { page, perPage, sort });
  }

  async _searchAPI(query, { page, perPage, sort }) {
    try {
      const params = new URLSearchParams({
        term: query,
        page: String(page),
        per_page: String(perPage),
        sort: sort === 'newest' ? 'newest' : sort === 'downloads' ? 'popular' : 'relevant',
      });

      const url = `https://api.thingiverse.com/search/${encodeURIComponent(query)}?${params}`;
      const data = await this.fetchJSON(url, {
        headers: { 'Authorization': `Bearer ${this.appToken}` },
      });

      const hits = data.hits || data || [];
      const results = (Array.isArray(hits) ? hits : []).map(item => this.normalizeResult({
        id: item.id,
        title: item.name || item.title,
        description: (item.description || '').substring(0, 200),
        thumbnail: item.thumbnail || item.preview_image || '',
        author: item.creator ? item.creator.name : 'Unknown',
        authorUrl: item.creator ? item.creator.public_url : '',
        sourceUrl: item.public_url || `https://www.thingiverse.com/thing:${item.id}`,
        downloads: item.download_count || item.downloads || -1,
        likes: item.like_count || item.likes || -1,
        license: item.license || 'Unknown',
        isFree: true,
        createdAt: item.added || item.created_at,
        fileFormats: ['stl'],
      }));

      return {
        results,
        total: data.total || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Thingiverse API error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }

  async _searchScrape(query, { page, perPage, sort }) {
    if (!cheerio) return { results: [], total: 0, hasMore: false };

    try {
      const sortParam = sort === 'newest' ? 'newest' : sort === 'downloads' ? 'popular' : 'relevant';
      const url = `https://www.thingiverse.com/search?q=${encodeURIComponent(query)}&page=${page}&type=things&sort=${sortParam}`;
      const html = await this.fetchHTML(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const $ = cheerio.load(html);
      const results = [];

      // Thingiverse search pages embed JSON data in script tags
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';
        // Look for __INITIAL_STATE__ or similar JSON data
        const stateMatch = content.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
        if (stateMatch) {
          try {
            const state = JSON.parse(stateMatch[1]);
            const things = state?.searchResults?.things?.hits || state?.things?.items || [];
            for (const item of things) {
              results.push(this.normalizeResult({
                id: item.id || item.thing_id,
                title: item.name || item.title || 'Untitled',
                description: (item.description || '').substring(0, 200),
                thumbnail: item.thumbnail || item.preview_image || '',
                author: item.creator?.name || item.creator?.username || 'Unknown',
                authorUrl: item.creator?.public_url || '',
                sourceUrl: item.public_url || `https://www.thingiverse.com/thing:${item.id}`,
                downloads: item.download_count || item.downloads || -1,
                likes: item.like_count || item.likes || -1,
                license: item.license || 'Unknown',
                isFree: true,
                createdAt: item.added || item.created_at,
                fileFormats: ['stl'],
              }));
            }
            if (results.length > 0) break;
          } catch {}
        }
      }

      // Fallback: parse HTML cards directly
      if (results.length === 0) {
        $('[class*="ThingCard"], .thing-card, [data-testid*="thing"]').each((i, el) => {
          if (i >= perPage) return false;
          const card = $(el);
          const link = card.find('a[href*="/thing:"]').first();
          const img = card.find('img').first();
          const href = link.attr('href') || '';
          const thingId = href.match(/thing:(\d+)/)?.[1] || `tv-${i}`;

          const title = img.attr('alt') || link.attr('title') || card.find('[class*="title"], [class*="Title"]').first().text().trim();
          if (!title) return;

          results.push(this.normalizeResult({
            id: thingId,
            title,
            description: '',
            thumbnail: img.attr('src') || img.attr('data-src') || '',
            author: card.find('[class*="creator"], [class*="Creator"], [class*="user"]').first().text().trim() || 'Unknown',
            authorUrl: '',
            sourceUrl: href.startsWith('http') ? href : `https://www.thingiverse.com${href}`,
            downloads: -1,
            likes: -1,
            license: 'Unknown',
            isFree: true,
            createdAt: null,
            fileFormats: ['stl'],
          }));
        });
      }

      return {
        results,
        total: results.length,
        hasMore: results.length >= 10,
      };
    } catch (err) {
      console.error(`Thingiverse scrape error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { ThingiverseAdapter };
