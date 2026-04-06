const { BaseAdapter } = require('./base');

class MakerWorldAdapter extends BaseAdapter {
  constructor() {
    super('makerworld', 'MakerWorld', {
      baseUrl: 'https://makerworld.com',
      color: '#00a86b',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;
    const offset = (page - 1) * perPage;

    try {
      const sortMapping = {
        relevant: 'comprehensive_rank_v4',
        newest: 'publishTime',
        downloads: 'downloadNum',
        likes: 'collectNum',
      };

      const params = new URLSearchParams({
        keyword: query,
        limit: String(perPage),
        offset: String(offset),
        sortBy: sortMapping[sort] || 'comprehensive_rank_v4',
      });

      const url = `https://makerworld.com/api/v1/design/search?${params}`;
      const data = await this.fetchJSON(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MeshHunt/1.0',
        },
      });

      const items = data.hits || data.designs || data.items || [];

      const results = (Array.isArray(items) ? items : []).filter(item => {
        if (freeOnly && item.price && item.price > 0) return false;
        return true;
      }).map(item => {
        const thumbnail = item.cover || item.thumbnail || item.coverUrl ||
          (item.images && item.images[0]?.url) || '';

        return this.normalizeResult({
          id: item.id || item.designId,
          title: item.title || item.name,
          description: (item.summary || item.description || '').substring(0, 200),
          thumbnail,
          author: item.designCreator?.name || item.author?.name || item.username || 'Unknown',
          authorUrl: item.designCreator?.profileUrl || '',
          sourceUrl: item.url || `https://makerworld.com/en/models/${item.id || item.designId}`,
          downloads: item.downloadNum || item.downloadCount || item.downloads || -1,
          likes: item.collectNum || item.likeCount || item.likes || -1,
          license: item.license || 'Unknown',
          isFree: true, // MakerWorld models are free
          price: null,
          createdAt: item.publishTime || item.createTime || item.createdAt,
          fileFormats: ['stl', '3mf'],
        });
      });

      return {
        results,
        total: data.total || data.totalHits || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`MakerWorld search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { MakerWorldAdapter };
