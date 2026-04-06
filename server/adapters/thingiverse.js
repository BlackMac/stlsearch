const { BaseAdapter } = require('./base');

class ThingiverseAdapter extends BaseAdapter {
  constructor() {
    super('thingiverse', 'Thingiverse', {
      baseUrl: 'https://api.thingiverse.com',
      color: '#248bfb',
    });
    this.appToken = process.env.THINGIVERSE_APP_TOKEN || '';
  }

  isEnabled() {
    return !!this.appToken;
  }

  get statusReason() {
    return this.appToken ? null : 'Requires THINGIVERSE_APP_TOKEN';
  }

  async search(query, options = {}) {
    const { page = 1, perPage = 20, sort = 'relevant', freeOnly = true } = options;

    try {
      const params = new URLSearchParams({
        term: query,
        page: String(page),
        per_page: String(perPage),
        sort: sort === 'newest' ? 'newest' : sort === 'downloads' ? 'popular' : 'relevant',
      });

      const url = `${this.baseUrl}/search/${encodeURIComponent(query)}?${params}`;

      // Use curl - Thingiverse API may block Node.js fetch
      const data = this.curlJSON(url, {
        headers: {
          'Authorization': `Bearer ${this.appToken}`,
          'Accept': 'application/json',
        },
      });

      const hits = data.hits || data || [];
      const results = (Array.isArray(hits) ? hits : []).map(item => this.normalizeResult({
        id: item.id,
        title: item.name || item.title,
        description: (item.description || '').substring(0, 200),
        thumbnail: this._upgradeImageUrl(item.preview_image || item.thumbnail || ''),
        author: item.creator ? item.creator.name : 'Unknown',
        authorUrl: item.creator ? item.creator.public_url : '',
        sourceUrl: item.public_url || `https://www.thingiverse.com/thing:${item.id}`,
        downloads: item.download_count || item.downloads || -1,
        likes: item.like_count || item.likes || -1,
        license: item.license || 'Unknown',
        isFree: true,
        createdAt: item.added || item.created_at,
        fileFormats: ['stl'],
      }));

      return {
        results,
        total: data.total || results.length,
        hasMore: results.length === perPage,
      };
    } catch (err) {
      console.error(`Thingiverse search error: ${err.message}`);
      return { results: [], total: 0, hasMore: false };
    }
  }
  /**
   * Upgrade Thingiverse thumbnail URLs to higher resolution.
   * Available sizes: _thumb_medium (7KB), _thumb_large (11KB),
   * _preview_card (11KB), _preview_featured (34KB), _display_large (48KB)
   */
  _upgradeImageUrl(url) {
    if (!url) return '';
    // Replace low-res suffixes with _preview_featured for good quality/speed balance
    return url
      .replace(/_thumb_medium\./, '_preview_featured.')
      .replace(/_thumb_large\./, '_preview_featured.')
      .replace(/_preview_card\./, '_preview_featured.');
  }
}

module.exports = { ThingiverseAdapter };
