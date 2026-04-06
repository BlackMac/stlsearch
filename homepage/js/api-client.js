/**
 * MeshHunt - API client for search backend
 */

const API = {
  baseUrl: '',

  async search(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      page: String(options.page || 1),
      perPage: String(options.perPage || 24),
      sort: options.sort || 'relevant',
      free: String(options.freeOnly !== false),
    });
    if (options.sources && options.sources !== 'all') {
      params.set('sources', Array.isArray(options.sources) ? options.sources.join(',') : options.sources);
    }

    const res = await fetch(`${this.baseUrl}/api/search?${params}`);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
  },

  async getSources() {
    const res = await fetch(`${this.baseUrl}/api/sources`);
    if (!res.ok) throw new Error(`Failed to load sources: ${res.status}`);
    return res.json();
  },

  async saveProfile(slug, data) {
    const res = await fetch(`${this.baseUrl}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...data }),
    });
    if (!res.ok) throw new Error('Failed to save profile');
    return res.json();
  },

  async loadProfile(slug) {
    const res = await fetch(`${this.baseUrl}/api/profiles/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  imageProxyUrl(url) {
    if (!url) return '';
    return `${this.baseUrl}/api/image-proxy?url=${encodeURIComponent(url)}`;
  },
};
