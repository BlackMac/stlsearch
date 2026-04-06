const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class SmithsonianAdapter extends BaseAdapter {
  constructor() {
    super('smithsonian', 'Smithsonian 3D', {
      baseUrl: 'https://3d.si.edu',
      color: '#d4a843',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20 } = options;

    if (!cheerio) {
      console.error('Smithsonian adapter requires cheerio');
      return { results: [], total: 0, hasMore: false };
    }

    try {
      // 3d.si.edu uses Drupal + EDAN search; pages are 0-indexed, 25 results per page
      const edanPage = page - 1;
      const url = `${this.baseUrl}/edan/search/explore_3d_packages?edan_q=${encodeURIComponent(query)}&page=${edanPage}`;

      const html = this.curlHTML(url);
      console.log(`Smithsonian: got ${html.length} bytes, contains ${(html.match(/edan-search-result/g) || []).length} results`);
      const $ = cheerio.load(html);

      // Extract total count from "311 results" text
      let total = 0;
      const countText = $('body').text().match(/(\d+)\s+results/);
      if (countText) total = parseInt(countText[1], 10);
      console.log(`Smithsonian: total=${total}, li count=${$('li.edan-search-result').length}`);

      const results = [];

      $('li.edan-search-result').each((i, el) => {
        if (results.length >= perPage) return false;

        const $el = $(el);
        const link = $el.find('a.inner');
        const href = link.attr('href') || '';
        const title = $el.find('.title').text().trim();
        const img = $el.find('img');
        const thumbnail = img.attr('src') || '';

        // Extract UUID from href like /object/3d/slug:UUID
        const uuidMatch = href.match(/:([a-f0-9-]{36})$/);
        const uuid = uuidMatch ? uuidMatch[1] : href;

        if (title) {
          results.push(this.normalizeResult({
            id: uuid,
            title,
            description: 'Smithsonian 3D digitization - free museum scan',
            thumbnail,
            author: 'Smithsonian Institution',
            authorUrl: 'https://3d.si.edu',
            sourceUrl: `https://3d.si.edu${href}`,
            downloads: -1,
            likes: -1,
            license: 'CC0 / Public Domain',
            isFree: true,
            fileFormats: ['obj', 'glb', 'stl'],
          }));
        }
      });

      return {
        results,
        total,
        hasMore: results.length >= perPage && (edanPage + 1) * 25 < total,
      };
    } catch (err) {
      console.error(`Smithsonian search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { SmithsonianAdapter };
