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
        page: String(page - 1),
        pageSize: String(perPage),
      });

      const url = `https://thangs.com/api/models/v2/search-by-text?${params}`;

      // Use curl to bypass TLS fingerprinting (Node fetch gets 403)
      const data = this.curlJSON(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      const items = data.results || [];

      const results = (Array.isArray(items) ? items : [])
        .filter(item => {
          if (freeOnly) {
            const price = item.marketplaceInfo?.priceInUSD;
            if (price && price > 0) return false;
            if (item.visibility === 'market-paid') return false;
          }
          return true;
        })
        .map(item => {
          const thumbnail = item.thumbnails?.[0] || '';

          return this.normalizeResult({
            id: item.modelId || item.externalId,
            title: item.name || 'Untitled',
            description: (item.description || '').substring(0, 200),
            thumbnail,
            author: item.ownerUsername || 'Unknown',
            authorUrl: item.ownerUsername ? `https://thangs.com/designer/${encodeURIComponent(item.ownerUsername)}` : '',
            sourceUrl: `https://thangs.com/m/${item.modelId || item.externalId}`,
            downloads: item.downloadCount ?? -1,
            likes: item.likeCount ?? -1,
            license: 'Unknown',
            isFree: !item.marketplaceInfo?.priceInUSD,
            price: item.marketplaceInfo?.priceInUSD || null,
            createdAt: item.createdAt || null,
            fileFormats: ['stl'],
          });
        });

      return {
        results,
        total: data.searchMetadata?.totalResults || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Thangs search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { ThangsAdapter };
