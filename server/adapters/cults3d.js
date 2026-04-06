const { BaseAdapter } = require('./base');

class Cults3DAdapter extends BaseAdapter {
  constructor() {
    super('cults3d', 'Cults3D', {
      baseUrl: 'https://cults3d.com',
      color: '#e8435a',
    });
    this.apiKey = process.env.CULTS3D_API_KEY || '';
    this.username = process.env.CULTS3D_USERNAME || '';
  }

  isEnabled() {
    // Cults3D GraphQL requires Basic Auth (username:api_key)
    return !!(this.apiKey && this.username);
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;
    const offset = (page - 1) * perPage;

    try {
      const graphqlQuery = {
        query: `{
          creationsSearchBatch(query: "${query.replace(/"/g, '\\"')}", limit: ${perPage}, offset: ${offset}) {
            total
            results {
              id
              slug
              name(locale: EN)
              shortUrl
              illustrationImageUrl
              creator {
                nick
              }
              downloadsCount
              likesCount
              license
              free
              price
              createdAt
            }
          }
        }`,
      };

      const auth = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');

      const data = await this.fetchJSON(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(graphqlQuery),
      });

      const searchResult = data?.data?.creationsSearchBatch || {};
      const creations = searchResult.results || [];

      const results = creations
        .filter(item => {
          if (freeOnly && item.free === false) return false;
          return true;
        })
        .map(item => this.normalizeResult({
          id: item.id || item.slug,
          title: item.name,
          description: '',
          thumbnail: item.illustrationImageUrl || '',
          author: item.creator?.nick || 'Unknown',
          authorUrl: item.creator?.nick ? `https://cults3d.com/en/users/${item.creator.nick}` : '',
          sourceUrl: item.shortUrl || `https://cults3d.com/en/search?q=${encodeURIComponent(query)}`,
          downloads: item.downloadsCount || -1,
          likes: item.likesCount || -1,
          license: item.license || 'Unknown',
          isFree: item.free !== false,
          price: item.price || null,
          createdAt: item.createdAt,
          fileFormats: ['stl'],
        }));

      return {
        results,
        total: searchResult.total || results.length,
        hasMore: offset + perPage < (searchResult.total || 0),
      };
    } catch (err) {
      console.error(`Cults3D search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { Cults3DAdapter };
