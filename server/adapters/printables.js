const { BaseAdapter } = require('./base');

class PrintablesAdapter extends BaseAdapter {
  constructor() {
    super('printables', 'Printables', {
      baseUrl: 'https://api.printables.com',
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
        : null; // null = default relevance

      const graphqlQuery = {
        query: `query SearchPrints($query: String!, $limit: Int!, $offset: Int!${ordering ? ', $ordering: SearchChoicesEnum' : ''}) {
          result: searchPrints2(query: $query, limit: $limit, offset: $offset${ordering ? ', ordering: $ordering' : ''}) {
            items {
              id
              name
              datePublished
              downloadCount
              likesCount
              image {
                filePath
              }
              user {
                publicUsername
              }
              price
            }
          }
        }`,
        variables: {
          query,
          limit: perPage,
          offset,
          ...(ordering ? { ordering } : {}),
        },
      };

      // Use curl to bypass TLS fingerprinting (Node fetch gets 403 on www.printables.com)
      const data = this.curlJSON(`${this.baseUrl}/graphql/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(graphqlQuery),
      });

      const items = data?.data?.result?.items || [];

      const results = items
        .filter(item => {
          if (freeOnly && item.price && Number(item.price) > 0) return false;
          return true;
        })
        .map(item => {
          const thumbPath = item.image?.filePath;
          const thumbnail = thumbPath
            ? (thumbPath.startsWith('http') ? thumbPath : `https://media.printables.com/${thumbPath}`)
            : '';

          return this.normalizeResult({
            id: item.id,
            title: item.name || 'Untitled',
            description: '',
            thumbnail,
            author: item.user?.publicUsername || 'Unknown',
            authorUrl: item.user?.publicUsername ? `https://www.printables.com/@${item.user.publicUsername}` : '',
            sourceUrl: `https://www.printables.com/model/${item.id}`,
            downloads: item.downloadCount ?? -1,
            likes: item.likesCount ?? -1,
            license: 'Unknown',
            isFree: !item.price || Number(item.price) === 0,
            price: item.price && Number(item.price) > 0 ? Number(item.price) : null,
            createdAt: item.datePublished,
            fileFormats: ['stl', '3mf'],
          });
        });

      return {
        results,
        total: results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Printables search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { PrintablesAdapter };
