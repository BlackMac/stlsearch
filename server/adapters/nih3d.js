const { BaseAdapter } = require('./base');

class NIH3DAdapter extends BaseAdapter {
  constructor() {
    super('nih3d', 'NIH 3D Print', {
      baseUrl: 'https://3d.nih.gov',
      color: '#2e7d32',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20 } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(perPage),
        offset: String((page - 1) * perPage),
      });

      const data = await this.fetchJSON(`${this.baseUrl}/api/v1/models?${params}`, {
        headers: { 'Accept': 'application/json' },
      });

      const items = data.models || data.results || data || [];

      const results = (Array.isArray(items) ? items : []).map(item => this.normalizeResult({
        id: item.id || item.model_id,
        title: item.title || item.name,
        description: (item.description || '').substring(0, 200),
        thumbnail: item.thumbnail || item.image_url || '',
        author: item.author || item.creator || 'NIH',
        authorUrl: '',
        sourceUrl: item.url || `https://3d.nih.gov/entries/${item.id || item.model_id}`,
        downloads: item.downloads || -1,
        likes: -1,
        license: 'Public Domain',
        isFree: true,
        createdAt: item.created_at || item.date_added,
        fileFormats: ['stl', 'obj'],
      }));

      return {
        results,
        total: data.total || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`NIH 3D search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { NIH3DAdapter };
