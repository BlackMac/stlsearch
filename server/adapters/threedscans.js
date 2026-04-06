const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class ThreeDScansAdapter extends BaseAdapter {
  constructor() {
    super('threedscans', 'Three D Scans', {
      baseUrl: 'https://threedscans.com',
      color: '#8b5cf6',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20 } = options;

    try {
      // WordPress REST API - works without auth
      const params = new URLSearchParams({
        search: query,
        per_page: String(perPage),
        page: String(page),
        _fields: 'id,title,link,slug,date',
      });

      const url = `${this.baseUrl}/wp-json/wp/v2/posts?${params}`;
      const items = await this.fetchJSON(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!Array.isArray(items)) return { results: [], total: 0, hasMore: false };

      // Fetch thumbnails in parallel by scraping each post page for the GIF
      const results = await Promise.all(items.map(async (item) => {
        const title = (item.title?.rendered || '').replace(/&#8217;/g, "'").replace(/&#8211;/g, '-').replace(/&amp;/g, '&');
        let thumbnail = '';

        // Try to get the GIF thumbnail from the post page
        try {
          if (cheerio) {
            const html = await this.fetchHTML(item.link, {}, 5000);
            const $ = cheerio.load(html);
            // ThreeDScans uses animated GIF previews
            const gif = $('img.frontPageImg, img.fullSizeGif').first();
            thumbnail = gif.attr('data-full') || gif.attr('src') || '';
            if (!thumbnail) {
              // Fallback: any content image that isn't the site icon
              $('img').each((_, el) => {
                const src = $(el).attr('src') || '';
                if (src && !src.includes('siteicon') && !src.includes('square.png') && !src.includes('emoji')) {
                  thumbnail = src;
                  return false;
                }
              });
            }
          }
        } catch {}

        return this.normalizeResult({
          id: item.id,
          title,
          description: 'Free museum 3D scan',
          thumbnail,
          author: 'Three D Scans',
          authorUrl: 'https://threedscans.com',
          sourceUrl: item.link,
          downloads: -1,
          likes: -1,
          license: 'CC0 / Public Domain',
          isFree: true,
          createdAt: item.date,
          fileFormats: ['obj', 'stl'],
        });
      }));

      return {
        results,
        total: results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Three D Scans search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { ThreeDScansAdapter };
