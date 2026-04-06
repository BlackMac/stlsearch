const { BaseAdapter } = require('./base');

class ThangsAdapter extends BaseAdapter {
  constructor() {
    super('thangs', 'Thangs', {
      baseUrl: 'https://thangs.com',
      color: '#7c3aed',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;

    try {
      const params = new URLSearchParams({
        searchTerm: query,
        page: String(page - 1), // zero-indexed
        pageSize: String(perPage),
        collapse: 'true',
      });

      if (freeOnly) params.set('freeModels', 'true');

      const url = `https://thangs.com/api/models/v2/search-by-text?${params}`;
      const data = await this.fetchJSON(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
      });

      const items = data.results || data.models || data.hits || [];

      const results = (Array.isArray(items) ? items : []).map(item => {
        const thumbnail = item.thumbnailUrl || item.thumbnail || item.previewImageUrl || '';

        return this.normalizeResult({
          id: item.id || item.modelId,
          title: item.name || item.title,
          description: (item.description || item.shortDescription || '').substring(0, 200),
          thumbnail,
          author: item.ownerUsername || item.creator?.name || item.owner?.username || 'Unknown',
          authorUrl: item.ownerUsername ? `https://thangs.com/designer/${item.ownerUsername}` : '',
          sourceUrl: item.url || item.publicUrl || `https://thangs.com/model/${item.id || item.modelId}`,
          downloads: item.downloadCount || item.downloads || -1,
          likes: item.likeCount || item.likes || -1,
          license: item.license || 'Unknown',
          isFree: !item.price || item.price === 0,
          price: item.price && item.price > 0 ? item.price : null,
          createdAt: item.createdAt || item.publishedAt,
          fileFormats: item.fileTypes || ['stl'],
        });
      });

      return {
        results,
        total: data.totalResults || data.total || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Thangs search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { ThangsAdapter };
