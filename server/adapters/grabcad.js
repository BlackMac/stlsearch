const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class GrabCADAdapter extends BaseAdapter {
  constructor() {
    super('grabcad', 'GrabCAD', {
      baseUrl: 'https://grabcad.com',
      color: '#d32f2f',
    });
  }

  isEnabled() { return !!cheerio; }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant' } = options;
    if (!cheerio) return { results: [], total: 0, hasMore: false };

    try {
      const sortMapping = { relevant: 'recent', newest: 'recent', downloads: 'popular', likes: 'popular' };
      const params = new URLSearchParams({
        page: String(page),
        query: query,
        softwares: '',
        sort: sortMapping[sort] || 'recent',
      });

      const html = await this.fetchHTML(`${this.baseUrl}/library?${params}`);
      const $ = cheerio.load(html);
      const results = [];

      $('.card-listing').each((i, el) => {
        if (i >= perPage) return false;
        const card = $(el);
        const link = card.find('a.card-listing__name').first();
        const img = card.find('img').first();

        results.push(this.normalizeResult({
          id: link.attr('href') || `grabcad-${i}`,
          title: link.text().trim() || 'Untitled',
          description: '',
          thumbnail: img.attr('src') || img.attr('data-src') || '',
          author: card.find('.card-listing__user-name').text().trim() || 'Unknown',
          authorUrl: '',
          sourceUrl: link.attr('href') ? `https://grabcad.com${link.attr('href')}` : '',
          downloads: -1,
          likes: -1,
          license: 'Unknown',
          isFree: true,
          createdAt: null,
          fileFormats: ['step', 'stl', 'iges'],
        }));
      });

      return { results, total: results.length, hasMore: results.length >= 12 };
    } catch (err) {
      console.error(`GrabCAD search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { GrabCADAdapter };
