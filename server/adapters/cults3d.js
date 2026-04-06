const { BaseAdapter } = require('./base');

class Cults3DAdapter extends BaseAdapter {
  constructor() {
    super('cults3d', 'Cults3D', {
      baseUrl: 'https://cults3d.com',
      color: '#1a1a2e',
    });
    this.apiKey = process.env.CULTS3D_API_KEY || '';
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;
    const offset = (page - 1) * perPage;

    try {
      const sortMapping = {
        relevant: 'PERTINENCE',
        newest: 'DATE',
        downloads: 'DOWNLOADS',
        likes: 'POPULARITY',
      };

      const graphqlQuery = {
        query: `query SearchCreations($query: String!, $limit: Int!, $offset: Int!, $sort: SortEnum, $free: Boolean) {
          searchCreations(query: $query, limit: $limit, offset: $offset, sort: $sort, free: $free) {
            total
            creations {
              id
              slug
              name
              description
              url
              illustrationImageUrl
              creator {
                nick
                url
              }
              downloadsCount
              likesCount
              license
              free
              price
              currency
              createdAt
            }
          }
        }`,
        variables: {
          query,
          limit: perPage,
          offset,
          sort: sortMapping[sort] || 'PERTINENCE',
          free: freeOnly || null,
        },
      };

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const data = await this.fetchJSON(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify(graphqlQuery),
      });

      const searchResult = data?.data?.searchCreations || {};
      const creations = searchResult.creations || [];

      const results = creations.map(item => this.normalizeResult({
        id: item.id || item.slug,
        title: item.name,
        description: (item.description || '').substring(0, 200),
        thumbnail: item.illustrationImageUrl || '',
        author: item.creator?.nick || 'Unknown',
        authorUrl: item.creator?.url ? `https://cults3d.com${item.creator.url}` : '',
        sourceUrl: item.url ? `https://cults3d.com${item.url}` : `https://cults3d.com/en/search?q=${encodeURIComponent(query)}`,
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
