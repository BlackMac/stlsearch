const { BaseAdapter } = require('./base');

class YouMagineAdapter extends BaseAdapter {
  constructor() {
    super('youmagine', 'YouMagine', {
      baseUrl: 'https://www.youmagine.com',
      color: '#ff9800',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20 } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        per_page: String(perPage),
      });

      const data = await this.fetchJSON(`${this.baseUrl}/api/v1/designs/search.json?${params}`, {
        headers: { 'Accept': 'application/json' },
      });

      const items = data.designs || data.results || data || [];

      const results = (Array.isArray(items) ? items : []).map(item => this.normalizeResult({
        id: item.id,
        title: item.name || item.title,
        description: (item.description || '').substring(0, 200),
        thumbnail: item.image_url || item.thumbnail || '',
        author: item.user?.name || item.designer || 'Unknown',
        authorUrl: item.user?.url ? `https://www.youmagine.com${item.user.url}` : '',
        sourceUrl: item.url || `https://www.youmagine.com/designs/${item.slug || item.id}`,
        downloads: item.downloads_count || item.downloads || -1,
        likes: item.likes_count || item.likes || -1,
        license: item.license || 'Unknown',
        isFree: true,
        createdAt: item.created_at,
        fileFormats: ['stl'],
      }));

      return {
        results,
        total: data.total || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`YouMagine search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { YouMagineAdapter };
