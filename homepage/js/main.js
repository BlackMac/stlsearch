/**
 * MeshHunt - Main App Controller
 */

(function () {
  'use strict';

  // State
  let sources = [];
  let currentQuery = '';
  let currentPage = 1;
  let isSearching = false;
  let hasSearched = false;
  let allResults = [];

  // DOM refs
  const $ = id => document.getElementById(id);
  const searchInput = $('search-input');
  const searchClear = $('search-clear');
  const resultsGrid = $('results-grid');
  const filterBar = $('filter-bar');
  const filterInner = $('filter-inner');
  const loadingMore = $('loading-more');
  const emptyState = $('empty-state');
  const welcomeState = $('welcome-state');
  const hero = $('hero');
  const sortSelect = $('sort-select');
  const sourceCount = $('source-count');
  const togglePaid = $('toggle-paid');
  const drawerOverlay = $('drawer-overlay');

  // ================================================================
  // Init
  // ================================================================

  async function init() {
    applyTheme(Store.getTheme());
    sortSelect.value = Store.getDefaultSort();
    if (Store.getIncludePaid()) togglePaid.classList.add('on');

    loadSources();
    bindEvents();
    updateFavBadge();
  }

  async function loadSources() {
    try {
      const data = await API.getSources();
      sources = data.sources || [];
      sourceCount.textContent = sources.filter(s => s.enabled).length;
      renderSourcePills();
      renderSourceSettings();
    } catch {
      sources = [];
    }
  }

  // ================================================================
  // Theme
  // ================================================================

  function applyTheme(theme) {
    Store.setTheme(theme);
    if (theme === 'system') {
      const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', preferred);
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    // Update theme buttons
    document.querySelectorAll('#theme-options .theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  // ================================================================
  // Search
  // ================================================================

  const doSearch = Utils.debounce(async function (query) {
    if (!query.trim()) {
      clearResults();
      return;
    }
    await performSearch(query.trim());
  }, 300);

  async function performSearch(query, page = 1) {
    if (isSearching && page === 1) return;
    isSearching = true;
    currentQuery = query;
    currentPage = page;

    // Record in history & stats
    if (page === 1) {
      Store.addSearchHistory(query);
      hero.classList.add('compact');
      filterBar.classList.add('visible');
      welcomeState.style.display = 'none';
      emptyState.style.display = 'none';
      resultsGrid.innerHTML = Components.skeletonCards(12);
      allResults = [];
    } else {
      loadingMore.style.display = 'block';
    }

    try {
      const enabledSources = getEnabledSourceNames();
      const data = await API.search(query, {
        page,
        perPage: 24,
        sort: sortSelect.value,
        freeOnly: !Store.getIncludePaid(),
        sources: enabledSources.length < sources.length ? enabledSources : 'all',
      });

      if (page === 1) {
        Store.recordSearch(query, data.sources);
        allResults = data.results || [];
        renderResults(allResults);
      } else {
        allResults = allResults.concat(data.results || []);
        appendResults(data.results || []);
      }

      if (allResults.length === 0 && page === 1) {
        emptyState.style.display = 'block';
      }
    } catch (err) {
      console.error('Search error:', err);
      if (page === 1) {
        resultsGrid.innerHTML = '';
        emptyState.style.display = 'block';
      }
    } finally {
      isSearching = false;
      loadingMore.style.display = 'none';
    }
  }

  function clearResults() {
    currentQuery = '';
    allResults = [];
    hasSearched = false;
    hero.classList.remove('compact');
    filterBar.classList.remove('visible');
    resultsGrid.innerHTML = '';
    emptyState.style.display = 'none';
    welcomeState.style.display = 'block';
  }

  function renderResults(results) {
    resultsGrid.innerHTML = results.map(r => Components.resultCard(r)).join('');
  }

  function appendResults(results) {
    resultsGrid.insertAdjacentHTML('beforeend', results.map(r => Components.resultCard(r)).join(''));
  }

  function getEnabledSourceNames() {
    const stored = Store.getEnabledSources();
    if (!stored) return sources.filter(s => s.enabled).map(s => s.name);
    return stored;
  }

  // ================================================================
  // Source Pills (Filter Bar)
  // ================================================================

  function renderSourcePills() {
    const enabled = getEnabledSourceNames();
    const separator = filterInner.querySelector('.filter-separator');
    // Remove old pills
    filterInner.querySelectorAll('.filter-pill').forEach(el => el.remove());
    // Add new pills before separator
    sources.forEach(src => {
      const isActive = enabled.includes(src.name);
      const pill = document.createElement('div');
      pill.innerHTML = Components.sourcePill(src, isActive);
      separator.before(pill.firstElementChild);
    });
  }

  function renderSourceSettings() {
    const list = $('source-toggle-list');
    const enabled = getEnabledSourceNames();
    list.innerHTML = sources.map(src =>
      Components.sourceToggleItem(src, enabled.includes(src.name))
    ).join('');
  }

  // ================================================================
  // Drawers
  // ================================================================

  function openDrawer(id) {
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    $(id).classList.add('open');
    drawerOverlay.classList.add('open');
  }

  function closeDrawers() {
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    drawerOverlay.classList.remove('open');
  }

  // ================================================================
  // Favorites
  // ================================================================

  function toggleFavorite(modelId) {
    const model = allResults.find(r => r.id === modelId);
    if (!model) return;

    if (Store.isFavorite(modelId)) {
      Store.removeFavorite(modelId);
    } else {
      Store.addFavorite(model);
    }

    // Update card button
    const btn = document.querySelector(`[data-fav-id="${CSS.escape(modelId)}"]`);
    if (btn) {
      const isFav = Store.isFavorite(modelId);
      btn.classList.toggle('favorited', isFav);
      btn.innerHTML = isFav ? Components.icons.heartFilled : Components.icons.heart;
    }

    updateFavBadge();
    renderFavorites();
  }

  function renderFavorites() {
    const favs = Store.getFavorites();
    const grid = $('favorites-grid');
    const empty = $('favorites-empty');

    if (favs.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      grid.innerHTML = favs.map(f => Components.favoriteCard(f)).join('');
    }
  }

  function updateFavBadge() {
    const badge = $('fav-badge');
    const count = Store.getFavorites().length;
    badge.style.display = count > 0 ? 'block' : 'none';
  }

  // ================================================================
  // Stats
  // ================================================================

  function renderStats() {
    $('stats-body').innerHTML = Components.statsPanel(Store.getStats());
  }

  // ================================================================
  // Sync
  // ================================================================

  async function generateSlug() {
    const slug = Utils.generateSlug();
    Store.setSyncSlug(slug);
    $('slug-text').textContent = slug;
    $('sync-slug-display').style.display = 'flex';

    try {
      await API.saveProfile(slug, {
        settings: {
          theme: Store.getTheme(),
          enabledSources: Store.getEnabledSources(),
          includePaid: Store.getIncludePaid(),
          defaultSort: Store.getDefaultSort(),
        },
        favorites: Store.getFavorites(),
        stats: Store.getStats(),
      });
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  }

  async function restoreSlug() {
    const slug = $('sync-input').value.trim().toLowerCase();
    if (!slug) return;

    try {
      const profile = await API.loadProfile(slug);
      if (!profile) {
        alert('Sync code not found. Check the code and try again.');
        return;
      }

      if (profile.settings) {
        Store.importAll({
          ...profile.settings,
          favorites: profile.favorites || [],
          stats: profile.stats || Store.getStats(),
        });
      }

      Store.setSyncSlug(slug);
      $('slug-text').textContent = slug;
      $('sync-slug-display').style.display = 'flex';
      $('sync-input').value = '';

      // Apply restored settings
      applyTheme(Store.getTheme());
      sortSelect.value = Store.getDefaultSort();
      if (Store.getIncludePaid()) togglePaid.classList.add('on');
      else togglePaid.classList.remove('on');
      renderSourcePills();
      renderSourceSettings();
      renderFavorites();
      updateFavBadge();

      alert('Settings restored successfully!');
    } catch (err) {
      console.error('Failed to restore:', err);
      alert('Failed to restore. Please try again.');
    }
  }

  // ================================================================
  // Events
  // ================================================================

  function bindEvents() {
    // Search
    searchInput.addEventListener('input', () => {
      searchClear.classList.toggle('visible', searchInput.value.length > 0);
      doSearch(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch.cancel && doSearch.cancel();
        if (searchInput.value.trim()) performSearch(searchInput.value.trim());
      }
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.remove('visible');
      searchInput.focus();
      clearResults();
    });

    // Keyboard shortcut: / to focus search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && !document.activeElement.closest('.drawer')) {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        closeDrawers();
      }
    });

    // Sort
    sortSelect.addEventListener('change', () => {
      Store.setDefaultSort(sortSelect.value);
      if (currentQuery) performSearch(currentQuery);
    });

    // Toggle paid
    togglePaid.addEventListener('click', () => {
      togglePaid.classList.toggle('on');
      Store.setIncludePaid(togglePaid.classList.contains('on'));
      if (currentQuery) performSearch(currentQuery);
    });

    // Source pills click
    filterInner.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      const name = pill.dataset.source;
      const enabled = getEnabledSourceNames();
      const isActive = enabled.includes(name);

      let newEnabled;
      if (isActive) {
        newEnabled = enabled.filter(s => s !== name);
      } else {
        newEnabled = [...enabled, name];
      }

      Store.setEnabledSources(newEnabled);
      renderSourcePills();
      renderSourceSettings();
      if (currentQuery) performSearch(currentQuery);
    });

    // Header buttons
    $('btn-favorites').addEventListener('click', () => { renderFavorites(); openDrawer('favorites-drawer'); });
    $('btn-stats').addEventListener('click', () => { renderStats(); openDrawer('stats-drawer'); });
    $('btn-settings').addEventListener('click', () => openDrawer('settings-drawer'));

    // Drawer close
    drawerOverlay.addEventListener('click', closeDrawers);
    document.querySelectorAll('[data-close-drawer]').forEach(btn => {
      btn.addEventListener('click', closeDrawers);
    });

    // Bottom nav (mobile)
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-nav]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const target = btn.dataset.nav;
        if (target === 'search') {
          closeDrawers();
          searchInput.focus();
        } else if (target === 'favorites') {
          renderFavorites();
          openDrawer('favorites-drawer');
        } else if (target === 'stats') {
          renderStats();
          openDrawer('stats-drawer');
        } else if (target === 'settings') {
          openDrawer('settings-drawer');
        }
      });
    });

    // Theme options
    document.querySelectorAll('#theme-options .theme-option').forEach(btn => {
      btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
    });

    // Source toggles in settings
    $('source-toggle-list').addEventListener('change', (e) => {
      const toggle = e.target.closest('[data-source-toggle]');
      if (!toggle) return;
      const name = toggle.dataset.sourceToggle;
      const enabled = getEnabledSourceNames();
      let newEnabled;
      if (toggle.checked) {
        newEnabled = [...enabled, name];
      } else {
        newEnabled = enabled.filter(s => s !== name);
      }
      Store.setEnabledSources(newEnabled);
      renderSourcePills();
      sourceCount.textContent = newEnabled.length;
    });

    // Sync
    $('btn-generate-slug').addEventListener('click', generateSlug);
    $('btn-restore-slug').addEventListener('click', restoreSlug);
    $('slug-copy').addEventListener('click', () => {
      Utils.copyToClipboard($('slug-text').textContent);
    });

    // Export/Import/Clear
    $('btn-export').addEventListener('click', () => {
      Utils.downloadJSON(Store.exportAll(), 'meshhunt-settings.json');
    });

    $('btn-import').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = await Utils.readJSONFile(file);
        Store.importAll(data);
        applyTheme(Store.getTheme());
        renderSourcePills();
        renderSourceSettings();
        updateFavBadge();
        alert('Settings imported successfully!');
      } catch (err) {
        alert('Failed to import: ' + err.message);
      }
      e.target.value = '';
    });

    $('btn-clear-data').addEventListener('click', () => {
      if (confirm('Clear all MeshHunt data? This cannot be undone.')) {
        Store.clearAll();
        location.reload();
      }
    });

    // Card clicks (delegation)
    resultsGrid.addEventListener('click', (e) => {
      // Favorite button
      const favBtn = e.target.closest('[data-fav-id]');
      if (favBtn) {
        toggleFavorite(favBtn.dataset.favId);
        return;
      }

      // Card click → open source URL
      const card = e.target.closest('.result-card');
      if (card && card.dataset.url) {
        window.open(card.dataset.url, '_blank', 'noopener');
      }
    });

    // Favorites card clicks
    $('favorites-grid').addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-remove-fav]');
      if (removeBtn) {
        Store.removeFavorite(removeBtn.dataset.removeFav);
        renderFavorites();
        updateFavBadge();
        return;
      }

      const card = e.target.closest('.fav-card');
      if (card && card.dataset.url) {
        window.open(card.dataset.url, '_blank', 'noopener');
      }
    });

    // Infinite scroll
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && currentQuery && !isSearching && allResults.length >= currentPage * 24) {
        performSearch(currentQuery, currentPage + 1);
      }
    }, { rootMargin: '200px' });
    observer.observe(loadingMore);

    // Show existing slug
    const existingSlug = Store.getSyncSlug();
    if (existingSlug) {
      $('slug-text').textContent = existingSlug;
      $('sync-slug-display').style.display = 'flex';
    }
  }

  // ================================================================
  // Start
  // ================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
