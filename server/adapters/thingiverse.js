const { BaseAdapter } = require('./base');

class ThingiverseAdapter extends BaseAdapter {
  constructor() {
    super('thingiverse', 'Thingiverse', {
      baseUrl: 'https://api.thingiverse.com',
      color: '#248bfb',
    });
    this.appToken = process.env.THINGIVERSE_APP_TOKEN || '';
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;

    try {
      const params = new URLSearchParams({
        term: query,
        page: String(page),
        per_page: String(perPage),
        sort: sort === 'newest' ? 'newest' : sort === 'downloads' ? 'popular' : 'relevant',
      });

      const headers = {};
      if (this.appToken) {
        headers['Authorization'] = `Bearer ${this.appToken}`;
      }

      const url = `${this.baseUrl}/search/${encodeURIComponent(query)}?${params}`;
      const data = await this.fetchJSON(url, { headers });

      const hits = data.hits || data || [];
      const results = (Array.isArray(hits) ? hits : []).map(item => this.normalizeResult({
        id: item.id,
        title: item.name || item.title,
        description: (item.description || '').substring(0, 200),
        thumbnail: item.thumbnail || (item.preview_image ? item.preview_image : ''),
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
      console.error(`Thingiverse search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { ThingiverseAdapter };
