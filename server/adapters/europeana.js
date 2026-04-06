const { BaseAdapter } = require('./base');

class EuropeanaAdapter extends BaseAdapter {
  constructor() {
    super('europeana', 'Europeana', {
      baseUrl: 'https://api.europeana.eu',
      color: '#0a72cc',
    });
    this.apiKey = process.env.EUROPEANA_API_KEY || '';
  }

  isEnabled() {
    return !!this.apiKey;
  }

  get statusReason() {
    return this.apiKey ? null : 'Requires EUROPEANA_API_KEY';
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20 } = options;

    try {
      const start = (page - 1) * perPage + 1;
      const params = new URLSearchParams({
        query,
        qf: 'TYPE:3D',
        wskey: this.apiKey,
        rows: String(perPage),
        start: String(start),
        profile: 'rich',
      });

      const url = `${this.baseUrl}/record/v2/search.json?${params}`;
      const data = this.curlJSON(url);

      const items = data.items || [];
      const total = data.totalResults || 0;

      const results = items.map(item => {
        const title = (item.title || ['Untitled'])[0];
        const provider = (item.dataProvider || ['Unknown'])[0];
        const rights = (item.rights || ['Unknown'])[0];
        const viewUrl = (item.edmIsShownAt || [''])[0];
        const europeanaUrl = item.guid || `https://www.europeana.eu/item${item.id}`;
        const thumbnail = (item.edmPreview || [''])[0];
        const description = (item.dcDescription || [''])[0];
        const creator = (item.dcCreator || [provider])[0];

        // Extract license short name from URL
        let license = 'Unknown';
        if (rights.includes('publicdomain/zero')) license = 'CC0';
        else if (rights.includes('/by-nc-sa/')) license = 'CC BY-NC-SA';
        else if (rights.includes('/by-nc-nd/')) license = 'CC BY-NC-ND';
        else if (rights.includes('/by-nc/')) license = 'CC BY-NC';
        else if (rights.includes('/by-sa/')) license = 'CC BY-SA';
        else if (rights.includes('/by-nd/')) license = 'CC BY-ND';
        else if (rights.includes('/by/')) license = 'CC BY';
        else if (rights.includes('InC')) license = 'In Copyright';

        return this.normalizeResult({
          id: item.id,
          title,
          description: (description || `${provider} — European cultural heritage`).substring(0, 200),
          thumbnail,
          author: creator,
          authorUrl: '',
          sourceUrl: viewUrl || europeanaUrl,
          downloads: -1,
          likes: -1,
          license,
          isFree: !rights.includes('InC'),
          fileFormats: ['3d'],
        });
      });

      return {
        results,
        total,
        hasMore: start + perPage <= total,
      };
    } catch (err) {
      console.error(`Europeana search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { EuropeanaAdapter };
