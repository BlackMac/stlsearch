const { BaseAdapter } = require('./base');

let cheerio;
try { cheerio = require('cheerio'); } catch {}

class MakerWorldAdapter extends BaseAdapter {
  constructor() {
    super('makerworld', 'MakerWorld', {
      baseUrl: 'https://makerworld.com',
      color: '#00a86b',
    });
  }

  isEnabled() {
    return !!cheerio;
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;
    if (!cheerio) return { results: [], total: 0, hasMore: false };

    try {
      // MakerWorld uses a Next.js-style app with internal API
      // Try the search page and extract embedded JSON data
      const sortParam = sort === 'newest' ? 'updateTime' : sort === 'downloads' ? 'downloadNum' : sort === 'likes' ? 'collectNum' : '';
      const url = `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(query)}&page=${page}${sortParam ? `&sortBy=${sortParam}` : ''}`;

      const html = await this.fetchHTML(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const $ = cheerio.load(html);
      const results = [];

      // MakerWorld embeds data in __NEXT_DATA__ or similar script tags
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const content = $(script).html() || '';

        // Check for Next.js data
        if (content.includes('__NEXT_DATA__') || ($(script).attr('id') === '__NEXT_DATA__')) {
          try {
            const jsonStr = $(script).attr('id') === '__NEXT_DATA__' ? content : content.match(/__NEXT_DATA__\s*=\s*({[\s\S]*?});/)?.[1];
            if (!jsonStr) continue;
            const data = JSON.parse(jsonStr);
            const searchData = data?.props?.pageProps?.searchResult?.hits ||
                               data?.props?.pageProps?.designs ||
                               data?.props?.pageProps?.items || [];

            for (const item of searchData) {
              if (freeOnly && item.price && item.price > 0) continue;

              results.push(this.normalizeResult({
                id: item.id || item.designId,
                title: item.title || item.name || 'Untitled',
                description: (item.summary || item.description || '').substring(0, 200),
                thumbnail: item.cover || item.thumbnail || item.coverUrl || '',
                author: item.designCreator?.name || item.author?.name || 'Unknown',
                authorUrl: item.designCreator?.profileUrl || '',
                sourceUrl: `https://makerworld.com/en/models/${item.id || item.designId}`,
                downloads: item.downloadNum || item.downloadCount || -1,
                likes: item.collectNum || item.likeCount || -1,
                license: item.license || 'Unknown',
                isFree: true,
                createdAt: item.publishTime || item.createTime,
                fileFormats: ['stl', '3mf'],
              }));
            }
            if (results.length > 0) break;
          } catch {}
        }
      }

      // Fallback: parse HTML cards
      if (results.length === 0) {
        $('[class*="DesignCard"], [class*="design-card"], [class*="model-card"], a[href*="/models/"]').each((i, el) => {
          if (i >= perPage) return false;
          const card = $(el).closest('[class*="card"], [class*="Card"]').length ? $(el).closest('[class*="card"], [class*="Card"]') : $(el);
          const link = card.is('a') ? card : card.find('a[href*="/models/"]').first();
          const img = card.find('img').first();
          const href = link.attr('href') || '';
          const modelId = href.match(/models\/(\d+)/)?.[1] || `mw-${i}`;

          const title = img.attr('alt') || link.attr('title') || card.find('[class*="title"], [class*="name"], h3, h4').first().text().trim();
          if (!title || title.length < 2) return;

          results.push(this.normalizeResult({
            id: modelId,
            title,
            description: '',
            thumbnail: img.attr('src') || img.attr('data-src') || '',
            author: card.find('[class*="author"], [class*="user"], [class*="creator"]').first().text().trim() || 'Unknown',
            authorUrl: '',
            sourceUrl: href.startsWith('http') ? href : `https://makerworld.com${href}`,
            downloads: -1,
            likes: -1,
            license: 'Unknown',
            isFree: true,
            createdAt: null,
            fileFormats: ['stl', '3mf'],
          }));
        });
      }

      return {
        results,
        total: results.length,
        hasMore: results.length >= 10,
      };
    } catch (err) {
      console.error(`MakerWorld search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
}

module.exports = { MakerWorldAdapter };
