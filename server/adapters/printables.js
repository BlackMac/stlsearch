const { BaseAdapter } = require('./base');

class PrintablesAdapter extends BaseAdapter {
  constructor() {
    super('printables', 'Printables', {
      baseUrl: 'https://www.printables.com',
      color: '#fa6831',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;
    const offset = (page - 1) * perPage;

    try {
      const ordering = sort === 'newest' ? '-first_publish'
        : sort === 'downloads' ? '-download_count'
        : sort === 'likes' ? '-likes_count'
        : '-relevance';

      const graphqlQuery = {
        query: `query SearchModels($query: String!, $limit: Int!, $offset: Int!, $ordering: String) {
          result: searchModelsV2(query: $query, limit: $limit, offset: $offset, ordering: $ordering) {
            items {
              id
              name
              slug
              description
              datePublished
              downloadCount
              displayCount
              likesCount
              image {
                filePath
              }
              user {
                publicUsername
                slug
              }
              price
              currency
              license {
                name
              }
            }
            cursor
            total
          }
        }`,
        variables: {
          query,
          limit: perPage,
          offset,
          ordering,
        },
      };

      const data = await this.fetchJSON(`${this.baseUrl}/graphql/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(graphqlQuery),
      });

      const result = data?.data?.result || {};
      const items = result.items || [];

      const results = items
        .filter(item => {
          if (freeOnly && item.price && item.price > 0) return false;
          return true;
        })
        .map(item => {
          const thumbPath = item.image?.filePath;
          const thumbnail = thumbPath
            ? (thumbPath.startsWith('http') ? thumbPath : `https://media.printables.com/${thumbPath}`)
            : '';

          return this.normalizeResult({
            id: item.id,
            title: item.name,
            description: (item.description || '').substring(0, 200),
            thumbnail,
            author: item.user?.publicUsername || 'Unknown',
            authorUrl: item.user?.slug ? `https://www.printables.com/@${item.user.slug}` : '',
            sourceUrl: `https://www.printables.com/model/${item.id}-${item.slug || ''}`,
            downloads: item.downloadCount || -1,
            likes: item.likesCount || -1,
            license: item.license?.name || 'Unknown',
            isFree: !item.price || item.price === 0,
            price: item.price && item.price > 0 ? item.price : null,
            createdAt: item.datePublished,
            fileFormats: ['stl', '3mf'],
          });
        });

      return {
        results,
        total: result.total || results.length,
        hasMore: offset + perPage < (result.total || 0),
      };
    } catch (err) {
      console.error(`Printables search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { PrintablesAdapter };
