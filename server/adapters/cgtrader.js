const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class CGTraderAdapter extends BaseAdapter {
  constructor() {
    super('cgtrader', 'CGTrader', {
      baseUrl: 'https://www.cgtrader.com',
      color: '#00bcd4',
    });
  }

  isEnabled() { return !!cheerio; }

  async search(query, options = {}) {
    const { page = 1, freeOnly = true } = options;
    if (!cheerio) return { results: [], total: 0, hasMore: false };

    try {
      const typeFilter = freeOnly ? '/free' : '';
      const url = `${this.baseUrl}${typeFilter}/3d-models/${encodeURIComponent(query)}?page=${page}`;
      const html = await this.fetchHTML(url);
      const $ = cheerio.load(html);
      const results = [];

      $('[class*="ModelCard"], .product-card, .search-item').each((i, el) => {
        const card = $(el);
        const link = card.find('a[href*="/3d-model"]').first();
        const img = card.find('img').first();
        const title = link.attr('title') || img.attr('alt') || card.find('.title, .name, h3').first().text().trim();
        const priceText = card.find('[class*="price"], .Price').first().text().trim();
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : 0;

        if (!title) return;

        const href = link.attr('href') || '';
        results.push(this.normalizeResult({
          id: href || `cgtrader-${i}`,
          title,
          description: '',
          thumbnail: img.attr('src') || img.attr('data-src') || '',
          author: card.find('.author, .user, .designer-name').first().text().trim() || 'Unknown',
          authorUrl: '',
          sourceUrl: href.startsWith('http') ? href : `https://www.cgtrader.com${href}`,
          downloads: -1,
          likes: -1,
          license: 'Royalty Free',
          isFree: price === 0,
          price: price > 0 ? price : null,
          createdAt: null,
          fileFormats: ['stl', 'obj', 'fbx', 'blend'],
        }));
      });

      return { results, total: results.length, hasMore: results.length >= 10 };
    } catch (err) {
      console.error(`CGTrader search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { CGTraderAdapter };
