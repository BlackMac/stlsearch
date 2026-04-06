const { execSync } = require('child_process');

/**
 * Base adapter class for STL source integrations.
 * All source adapters extend this class and implement search().
 */

class BaseAdapter {
  constructor(name, displayName, config = {}) {
    this.name = name;
    this.displayName = displayName;
    this.config = config;
    this.baseUrl = config.baseUrl || '';
    this.color = config.color || '#6b7280';
    this.icon = config.icon || '';
    this.enabled = config.enabled !== false;
  }

  /**
   * Search for models. Must be implemented by each adapter.
   * @param {string} query - Search term
   * @param {object} options - { page, perPage, sort, freeOnly }
   * @returns {Promise<{results: Array, total: number, hasMore: boolean}>}
   */
  async search(query, options = {}) {
    throw new Error(`${this.displayName} adapter: search() not implemented`);
  }

  /**
   * Check if this adapter is available (has required config, etc.)
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get adapter info for the /api/sources endpoint
   */
  getInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      color: this.color,
      icon: this.icon,
      enabled: this.isEnabled(),
      statusReason: this.statusReason || null,
    };
  }

  /**
   * Normalize a result into the unified format.
   * Subclasses call this to ensure consistent output.
   */
  normalizeResult(raw) {
    return {
      id: `${this.name}:${raw.id || ''}`,
      title: raw.title || 'Untitled',
      description: raw.description || '',
      thumbnail: raw.thumbnail || '',
      author: raw.author || 'Unknown',
      authorUrl: raw.authorUrl || '',
      sourceUrl: raw.sourceUrl || '',
      source: this.name,
      sourceName: this.displayName,
      downloads: typeof raw.downloads === 'number' ? raw.downloads : -1,
      likes: typeof raw.likes === 'number' ? raw.likes : -1,
      license: raw.license || 'Unknown',
      isFree: raw.isFree !== false,
      price: raw.price || null,
      createdAt: raw.createdAt || null,
      fileFormats: raw.fileFormats || ['stl'],
    };
  }

  /**
   * Safe fetch with timeout
   */
  async fetchWithTimeout(url, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Safe JSON fetch
   */
  async fetchJSON(url, options = {}, timeout = 8000) {
    const res = await this.fetchWithTimeout(url, options, timeout);
    if (!res.ok) throw new Error(`${this.displayName}: HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Safe HTML fetch (for scraping)
   */
  async fetchHTML(url, options = {}, timeout = 8000) {
    const res = await this.fetchWithTimeout(url, {
      ...options,
      headers: {
        'User-Agent': 'MeshHunt/1.0 (STL Meta Search Engine)',
        'Accept': 'text/html,application/xhtml+xml',
        ...(options.headers || {}),
      },
    }, timeout);
    if (!res.ok) throw new Error(`${this.displayName}: HTTP ${res.status}`);
    return res.text();
  }

  /**
   * Fetch via curl to bypass TLS fingerprinting that blocks Node.js fetch.
   * Many sites (Cloudflare-protected) accept curl but reject Node fetch.
   */
  curlJSON(url, options = {}) {
    const { method = 'GET', headers = {}, body = null, timeout = 8 } = options;
    // Always include a browser-like User-Agent
    const allHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      ...headers,
    };
    const args = ['curl', '-s', '-S', '--max-time', String(timeout), '-L'];
    args.push('-X', method);
    for (const [k, v] of Object.entries(allHeaders)) {
      args.push('-H', `${k}: ${v}`);
    }
    if (body) {
      args.push('-d', body);
    }
    args.push(url);
    const cmd = args.map(a => {
      if (a.includes("'") || a.includes(' ') || a.includes('"') || a.includes('\\') || a.includes('$') || a.includes('`') || a.includes('(') || a.includes('{')) {
        return "'" + a.replace(/'/g, "'\\''") + "'";
      }
      return a;
    }).join(' ');
    const result = execSync(cmd, { timeout: (timeout + 2) * 1000, encoding: 'utf8' });
    if (!result || result.trim().startsWith('<!') || result.trim().startsWith('<html')) {
      throw new Error(`${this.displayName}: received HTML instead of JSON (likely blocked by Cloudflare)`);
    }
    return JSON.parse(result);
  }

  /**
   * Fetch HTML via curl to bypass TLS fingerprinting.
   */
  curlHTML(url, options = {}) {
    const { timeout = 10 } = options;
    const args = [
      'curl', '-s', '-S', '--max-time', String(timeout), '-L',
      '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml',
      url,
    ];
    const cmd = args.map(a => {
      if (a.includes("'") || a.includes(' ') || a.includes('"') || a.includes('\\') || a.includes('$') || a.includes('`') || a.includes('(') || a.includes('{')) {
        return "'" + a.replace(/'/g, "'\\''") + "'";
      }
      return a;
    }).join(' ');
    return execSync(cmd, { timeout: (timeout + 2) * 1000, encoding: 'utf8' });
  }
}

module.exports = { BaseAdapter };
