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
    return !!(this.apiKey && this.username);
  }

  get statusReason() {
    if (!this.username) return 'Requires CULTS3D_USERNAME';
    if (!this.apiKey) return 'Requires CULTS3D_API_KEY';
    return null;
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;
    const offset = (page - 1) * perPage;

    try {
      // Cults3D GraphQL API uses HTTP Basic Auth and form-encoded data
      const auth = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');

      const graphqlQuery = `{
  creations(limit: ${perPage}, offset: ${offset}, query: "${query.replace(/"/g, '\\"')}") {
    name
    url
    slug
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
    tags
  }
}`;

      // Use curl with HTTP Basic Auth (form-encoded, per Cults3D docs)
      const data = this.curlJSON(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `query=${encodeURIComponent(graphqlQuery)}`,
      });
      const creations = data?.data?.creations || [];

      const results = creations
        .filter(item => {
          if (freeOnly && item.free === false) return false;
          return true;
        })
        .map(item => this.normalizeResult({
          id: item.slug || item.url,
          title: item.name || 'Untitled',
          description: '',
          thumbnail: item.illustrationImageUrl || '',
          author: item.creator?.nick || 'Unknown',
          authorUrl: item.creator?.nick ? `https://cults3d.com/en/users/${item.creator.nick}` : '',
          sourceUrl: item.url || `https://cults3d.com/en/search?q=${encodeURIComponent(query)}`,
          downloads: item.downloadsCount ?? -1,
          likes: item.likesCount ?? -1,
          license: item.license || 'Unknown',
          isFree: item.free !== false,
          price: item.price || null,
          createdAt: item.createdAt,
          fileFormats: ['stl'],
        }));

      return {
        results,
        total: results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Cults3D search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { Cults3DAdapter };
