const { BaseAdapter } = require('./base');

class SketchfabAdapter extends BaseAdapter {
  constructor() {
    super('sketchfab', 'Sketchfab', {
      baseUrl: 'https://api.sketchfab.com/v3',
      color: '#1caad9',
    });
    this.apiToken = process.env.SKETCHFAB_API_TOKEN || '';
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;

    try {
      const sortMapping = {
        relevant: '-relevance',
        newest: '-publishedAt',
        downloads: '-downloadCount',
        likes: '-likeCount',
      };

      const params = new URLSearchParams({
        q: query,
        type: 'models',
        count: String(perPage),
        offset: String((page - 1) * perPage),
        sort_by: sortMapping[sort] || '-relevance',
        downloadable: 'true',
      });

      if (freeOnly) params.set('price', '0');

      const headers = { 'Accept': 'application/json' };
      if (this.apiToken) headers['Authorization'] = `Token ${this.apiToken}`;

      const data = await this.fetchJSON(`${this.baseUrl}/search?${params}`, { headers });
      const items = data.results || [];

      const results = items.map(item => {
        const thumbs = item.thumbnails?.images || [];
        // Pick the largest thumbnail available
        const thumb = thumbs.reduce((best, t) => (!best || (t.width || 0) > (best.width || 0)) ? t : best, null);

        return this.normalizeResult({
          id: item.uid,
          title: item.name,
          description: (item.description || '').substring(0, 200),
          thumbnail: thumb?.url || '',
          author: item.user?.displayName || item.user?.username || 'Unknown',
          authorUrl: item.user?.profileUrl || '',
          sourceUrl: item.viewerUrl || `https://sketchfab.com/3d-models/${item.slug}-${item.uid}`,
          downloads: item.downloadCount || -1,
          likes: item.likeCount || -1,
          license: item.license?.label || 'Unknown',
          isFree: !item.price || item.price === 0,
          price: item.price && item.price > 0 ? item.price / 100 : null,
          createdAt: item.publishedAt,
          fileFormats: ['gltf', 'obj', 'stl'],
        });
      });

      return {
        results,
        total: data.totalCount || results.length,
        hasMore: (page - 1) * perPage + results.length < (data.totalCount || 0),
      };
    } catch (err) {
      console.error(`Sketchfab search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { SketchfabAdapter };
