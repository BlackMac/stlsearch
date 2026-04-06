const { BaseAdapter } = require('./base');

const STW_DESIGNER_ID = 20099;

class ScanTheWorldAdapter extends BaseAdapter {
  constructor() {
    super('scantheworld', 'Scan the World', {
      baseUrl: 'https://www.myminifactory.com',
      color: '#2d6a4f',
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
    const { page = 1, perPage = 20 } = options;

    try {
      // Request extra results since we filter by designer
      const fetchSize = Math.min(perPage * 4, 100);
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        per_page: String(fetchSize),
      });

      const url = `${this.baseUrl}/api/v2/search?${params}`;
      const data = this.curlJSON(url, {
        headers: { 'X-Api-Key': this.apiKey },
      });

      const allItems = data.items || [];
      if (data.error) console.error(`STW: API error: ${data.detail} - ${data.error_description}`);
      else console.log(`STW: got ${allItems.length} items, filtering for designer ${STW_DESIGNER_ID}`);
      const stwItems = allItems.filter(
        item => item.designer && item.designer.id === STW_DESIGNER_ID
      );
      console.log(`STW: ${stwItems.length} matches after filter`);

      const results = stwItems.slice(0, perPage).map(item => {
        const images = item.images || [];
        const thumbnail = images.length > 0
          ? (images[0].standard?.url || images[0].large?.url || images[0].thumbnail?.url || images[0].original?.url || '')
          : (item.cover_image || item.thumbnail || '');

        return this.normalizeResult({
          id: item.id,
          title: item.name || item.title,
          description: (item.description || '').substring(0, 200),
          thumbnail,
          author: 'Scan The World',
          authorUrl: 'https://www.myminifactory.com/users/Scan+The+World',
          sourceUrl: item.url || `https://www.myminifactory.com/object/${item.slug || item.id}`,
          downloads: item.downloads || item.download_count || -1,
          likes: item.likes || item.likes_count || -1,
          license: item.license?.type || item.license || 'CC BY-SA',
          isFree: true,
          createdAt: item.published_at || item.created_at,
          fileFormats: ['stl'],
        });
      });

      return {
        results,
        total: stwItems.length,
        hasMore: stwItems.length >= perPage,
      };
    } catch (err) {
      console.error(`Scan the World search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { ScanTheWorldAdapter, STW_DESIGNER_ID };
