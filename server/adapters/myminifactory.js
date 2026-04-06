const { BaseAdapter } = require('./base');

class MyMiniFactoryAdapter extends BaseAdapter {
  constructor() {
    super('myminifactory', 'MyMiniFactory', {
      baseUrl: 'https://www.myminifactory.com',
      color: '#00b4d8',
    });
    this.apiKey = process.env.MYMINIFACTORY_API_KEY || '';
  }

  isEnabled() {
    return !!this.apiKey;
  }

  get statusReason() {
    return this.apiKey ? null : 'Requires MYMINIFACTORY_API_KEY';
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        per_page: String(perPage),
      });

      if (sort === 'newest') params.set('sort', 'date');
      else if (sort === 'downloads') params.set('sort', 'popularity');
      else if (sort === 'likes') params.set('sort', 'likes');

      if (freeOnly) params.set('price', 'free');

      const headers = {
        'Accept': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const url = `${this.baseUrl}/api/v2/search?${params}`;
      const data = await this.fetchJSON(url, { headers });

      const items = data.items || data.objects || data.results || [];
      const total = data.total_count || data.total || items.length;

      const results = (Array.isArray(items) ? items : []).map(item => {
        const images = item.images || [];
        const thumbnail = images.length > 0
          ? (images[0].thumbnail?.url || images[0].original?.url || images[0].url || '')
          : (item.cover_image || item.thumbnail || '');

        return this.normalizeResult({
          id: item.id,
          title: item.name || item.title,
          description: (item.description || '').substring(0, 200),
          thumbnail,
          author: item.designer?.username || item.user?.username || 'Unknown',
          authorUrl: item.designer?.profile_url || '',
          sourceUrl: item.url || `https://www.myminifactory.com/object/${item.slug || item.id}`,
          downloads: item.downloads || item.download_count || -1,
          likes: item.likes || item.likes_count || -1,
          license: item.license?.type || item.license || 'Unknown',
          isFree: item.price === 0 || item.price === '0' || item.free === true,
          price: item.price && Number(item.price) > 0 ? Number(item.price) : null,
          createdAt: item.published_at || item.created_at,
          fileFormats: ['stl'],
        });
      });

      return {
        results,
        total,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`MyMiniFactory search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { MyMiniFactoryAdapter };
