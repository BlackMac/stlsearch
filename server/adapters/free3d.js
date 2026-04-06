const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class Free3DAdapter extends BaseAdapter {
  constructor() {
    super('free3d', 'Free3D', {
      baseUrl: 'https://free3d.com',
      color: '#9c27b0',
    });
  }

  isEnabled() { return !!cheerio; }

  async search(query, options = {}) {
    const { page = 1, freeOnly = true } = options;
    if (!cheerio) return { results: [], total: 0, hasMore: false };

    try {
      const priceFilter = freeOnly ? '&price_max=0' : '';
      const url = `${this.baseUrl}/3d-models/${encodeURIComponent(query)}?page=${page}${priceFilter}`;
      const html = await this.fetchHTML(url);
      const $ = cheerio.load(html);
      const results = [];

      $('.search-result, .product-item, .model-item').each((i, el) => {
        const card = $(el);
        const link = card.find('a[href*="/3d-model"]').first();
        const img = card.find('img').first();
        const title = link.attr('title') || link.text().trim() || card.find('.title, .name, h3, h4').first().text().trim();

        if (!title) return;

        results.push(this.normalizeResult({
          id: link.attr('href') || `free3d-${i}`,
          title,
          description: '',
          thumbnail: img.attr('src') || img.attr('data-src') || '',
          author: card.find('.author, .user, .designer').first().text().trim() || 'Unknown',
          authorUrl: '',
          sourceUrl: link.attr('href') ? (link.attr('href').startsWith('http') ? link.attr('href') : `https://free3d.com${link.attr('href')}`) : '',
          downloads: -1,
          likes: -1,
          license: 'Unknown',
          isFree: true,
          createdAt: null,
          fileFormats: ['stl', 'obj', 'fbx'],
        }));
      });

      return { results, total: results.length, hasMore: results.length >= 10 };
    } catch (err) {
      console.error(`Free3D search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { Free3DAdapter };
