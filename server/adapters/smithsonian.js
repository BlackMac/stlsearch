const path = require('path');
const { BaseAdapter } = require('./base');

// Static dataset of ~950 Smithsonian 3D models, scraped from 3d.si.edu.
// Cloudflare JS challenge blocks live server-side requests, so we search locally.
const models = require('./smithsonian-models.json');

class SmithsonianAdapter extends BaseAdapter {
  constructor() {
    super('smithsonian', 'Smithsonian 3D', {
      baseUrl: 'https://3d.si.edu',
      color: '#d4a843',
    });
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20 } = options;

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = models.filter(m => {
      const title = m.title.toLowerCase();
      return terms.every(t => title.includes(t));
    });

    const start = (page - 1) * perPage;
    const paged = matched.slice(start, start + perPage);

    const results = paged.map(m => this.normalizeResult({
      id: m.id,
      title: m.title,
      description: 'Smithsonian 3D digitization — free museum scan',
      thumbnail: m.thumbnail,
      author: 'Smithsonian Institution',
      authorUrl: 'https://3d.si.edu',
      sourceUrl: m.url,
      downloads: -1,
      likes: -1,
      license: 'CC0 / Public Domain',
      isFree: true,
      fileFormats: ['obj', 'glb', 'stl'],
    }));

    return {
      results,
      total: matched.length,
      hasMore: start + perPage < matched.length,
    };
  }
}

module.exports = { SmithsonianAdapter };
