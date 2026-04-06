/**
 * MeshHunt - localStorage state management
 */

const Store = {
  _prefix: 'meshhunt_',

  _get(key, fallback = null) {
    try {
      const val = localStorage.getItem(this._prefix + key);
      return val ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },

  _set(key, value) {
    try { localStorage.setItem(this._prefix + key, JSON.stringify(value)); }
    catch { /* quota exceeded - silently fail */ }
  },

  // Theme
  getTheme() { return this._get('theme', 'dark'); },
  setTheme(theme) { this._set('theme', theme); },

  // Sources (enabled sources list)
  getEnabledSources() {
    return this._get('enabledSources', null); // null = all enabled
  },
  setEnabledSources(sources) { this._set('enabledSources', sources); },

  // Include paid
  getIncludePaid() { return this._get('includePaid', false); },
  setIncludePaid(val) { this._set('includePaid', val); },

  // Default sort
  getDefaultSort() { return this._get('defaultSort', 'relevant'); },
  setDefaultSort(sort) { this._set('defaultSort', sort); },

  // Search history
  getSearchHistory() { return this._get('searchHistory', []); },
  addSearchHistory(query) {
    const history = this.getSearchHistory().filter(q => q !== query);
    history.unshift(query);
    if (history.length > 50) history.pop();
    this._set('searchHistory', history);
  },

  // Favorites
  getFavorites() { return this._get('favorites', []); },
  addFavorite(model) {
    const favs = this.getFavorites();
    if (!favs.find(f => f.id === model.id)) {
      favs.unshift(model);
      this._set('favorites', favs);
    }
  },
  removeFavorite(modelId) {
    const favs = this.getFavorites().filter(f => f.id !== modelId);
    this._set('favorites', favs);
  },
  isFavorite(modelId) {
    return this.getFavorites().some(f => f.id === modelId);
  },

  // Stats
  getStats() {
    return this._get('stats', {
      totalSearches: 0,
      queryCounts: {},
      sourceCounts: {},
      searchDays: {},
    });
  },
  recordSearch(query, sourceResults) {
    const stats = this.getStats();
    stats.totalSearches++;

    // Query counts
    stats.queryCounts[query] = (stats.queryCounts[query] || 0) + 1;

    // Source counts
    if (sourceResults) {
      for (const [src, info] of Object.entries(sourceResults)) {
        stats.sourceCounts[src] = (stats.sourceCounts[src] || 0) + (info.count || 0);
      }
    }

    // Daily activity
    const today = new Date().toISOString().split('T')[0];
    stats.searchDays[today] = (stats.searchDays[today] || 0) + 1;

    // Keep only last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    for (const day of Object.keys(stats.searchDays)) {
      if (day < cutoffStr) delete stats.searchDays[day];
    }

    this._set('stats', stats);
  },

  // Sync slug
  getSyncSlug() { return this._get('syncSlug', null); },
  setSyncSlug(slug) { this._set('syncSlug', slug); },

  // Export all data
  exportAll() {
    return {
      theme: this.getTheme(),
      enabledSources: this.getEnabledSources(),
      includePaid: this.getIncludePaid(),
      defaultSort: this.getDefaultSort(),
      favorites: this.getFavorites(),
      stats: this.getStats(),
      searchHistory: this.getSearchHistory(),
      syncSlug: this.getSyncSlug(),
    };
  },

  // Import all data
  importAll(data) {
    if (data.theme) this.setTheme(data.theme);
    if (data.enabledSources) this.setEnabledSources(data.enabledSources);
    if (data.includePaid !== undefined) this.setIncludePaid(data.includePaid);
    if (data.defaultSort) this.setDefaultSort(data.defaultSort);
    if (data.favorites) this._set('favorites', data.favorites);
    if (data.stats) this._set('stats', data.stats);
    if (data.searchHistory) this._set('searchHistory', data.searchHistory);
    if (data.syncSlug) this.setSyncSlug(data.syncSlug);
  },

  // Clear all
  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this._prefix)) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  },
};
