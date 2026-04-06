const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class TurboSquidAdapter extends BaseAdapter {
  constructor() {
    super('turbosquid', 'TurboSquid', {
      baseUrl: 'https://www.turbosquid.com',
      color: '#e91e63',
    });
  }

  isEnabled() { return !!cheerio; }

  async search(query, options = {}) {
    const { page = 1, freeOnly = true } = options;
    if (!cheerio) return { results: [], total: 0, hasMore: false };

    try {
      const priceFilter = freeOnly ? '&min_price=0&max_price=0' : '';
      const url = `${this.baseUrl}/Search/3D-Models?q=${encodeURIComponent(query)}&page_num=${page}${priceFilter}`;
      const html = await this.fetchHTML(url);
      const $ = cheerio.load(html);
      const results = [];

      $('[class*="ProductCard"], .SearchResult, .asset-card').each((i, el) => {
        const card = $(el);
        const link = card.find('a[href*="/3d-model"], a[href*="/FullPreview"]').first();
        const img = card.find('img').first();
        const title = img.attr('alt') || link.attr('title') || card.find('.Title, .product-name, h3').first().text().trim();
        const priceText = card.find('[class*="price"], .Price').first().text().trim();
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;

        if (!title) return;

        results.push(this.normalizeResult({
          id: link.attr('href') || `turbosquid-${i}`,
          title,
          description: '',
          thumbnail: img.attr('src') || img.attr('data-src') || '',
          author: card.find('.artist, .author, .user').first().text().trim() || 'Unknown',
          authorUrl: '',
          sourceUrl: link.attr('href') ? (link.attr('href').startsWith('http') ? link.attr('href') : `https://www.turbosquid.com${link.attr('href')}`) : '',
          downloads: -1,
          likes: -1,
          license: 'Royalty Free',
          isFree: price === 0,
          price: price > 0 ? price : null,
          createdAt: null,
          fileFormats: ['stl', 'obj', 'fbx', 'max'],
        }));
      });

      return { results, total: results.length, hasMore: results.length >= 10 };
    } catch (err) {
      console.error(`TurboSquid search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { TurboSquidAdapter };
