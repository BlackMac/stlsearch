/**
 * MeshHunt - UI Components
 */

const Components = {

  // SVG icons used in cards
  icons: {
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    heartFilled: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    like: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  },

  resultCard(model) {
    const isFav = Store.isFavorite(model.id);
    const thumbSrc = model.thumbnail || '';
    // onload: reject tracking pixels (<20px), mark low-res images for CSS treatment
    // onerror: broken image - hide and show placeholder
    const imgValidation = `onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" onload="if(this.naturalWidth<20||this.naturalHeight<20){this.style.display='none';this.nextElementSibling.style.display='flex'}else if(this.naturalWidth<200||this.naturalHeight<200){this.classList.add('low-res')}"`;
    const thumbHtml = thumbSrc
      ? `<img src="${Utils.escapeHtml(thumbSrc)}" alt="" loading="lazy" ${imgValidation}><div class="card-thumb-placeholder" style="display:none">${this.icons.cube}</div>`
      : `<div class="card-thumb-placeholder">${this.icons.cube}</div>`;

    // "Also on" badges for deduplicated cross-source results
    const alsoOnHtml = model.alsoOn && model.alsoOn.length > 0
      ? `<div class="card-also-on">${model.alsoOn.map(s =>
          `<a href="${Utils.escapeHtml(s.sourceUrl)}" target="_blank" rel="noopener" class="also-on-badge" onclick="event.stopPropagation()" title="Also on ${Utils.escapeHtml(s.sourceName)}">${Utils.escapeHtml(s.sourceName)}</a>`
        ).join('')}</div>`
      : '';

    return `
      <article class="result-card source-${Utils.escapeHtml(model.source)}" data-id="${Utils.escapeHtml(model.id)}" data-url="${Utils.escapeHtml(model.sourceUrl)}">
        <div class="card-thumb">
          ${thumbHtml}
          <span class="card-source-badge" style="background:var(--source-color)">${Utils.escapeHtml(model.sourceName)}</span>
          ${model.price ? `<span class="card-price-badge">$${model.price}</span>` : ''}
          <button class="card-fav-btn ${isFav ? 'favorited' : ''}" data-fav-id="${Utils.escapeHtml(model.id)}" onclick="event.stopPropagation()">
            ${isFav ? this.icons.heartFilled : this.icons.heart}
          </button>
        </div>
        <div class="card-body">
          <h3 class="card-title">${Utils.escapeHtml(model.title)}</h3>
          <p class="card-author">by ${Utils.escapeHtml(model.author)}</p>
          <div class="card-stats">
            ${model.downloads >= 0 ? `<span class="card-stat">${this.icons.download} ${Utils.formatNumber(model.downloads)}</span>` : ''}
            ${model.likes >= 0 ? `<span class="card-stat">${this.icons.like} ${Utils.formatNumber(model.likes)}</span>` : ''}
          </div>
          ${alsoOnHtml}
        </div>
        <div class="card-footer">
          <span class="card-license">${Utils.escapeHtml(model.license)}</span>
          <a class="card-action" href="${Utils.escapeHtml(model.sourceUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            View on ${Utils.escapeHtml(model.sourceName)} ${this.icons.external}
          </a>
        </div>
      </article>
    `;
  },

  skeletonCard() {
    return `
      <div class="skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-author"></div>
          <div class="skeleton skeleton-stats"></div>
        </div>
      </div>
    `;
  },

  skeletonCards(count = 12) {
    return Array(count).fill(0).map(() => this.skeletonCard()).join('');
  },

  sourcePill(source, active = true) {
    return `
      <button class="filter-pill source-${Utils.escapeHtml(source.name)} ${active ? 'active' : 'disabled'}" data-source="${Utils.escapeHtml(source.name)}">
        <span class="dot" style="background:${Utils.escapeHtml(source.color)}"></span>
        ${Utils.escapeHtml(source.displayName)}
      </button>
    `;
  },

  sourceToggleItem(source, enabled = true) {
    return `
      <li class="source-toggle-item">
        <span class="source-dot" style="background:${Utils.escapeHtml(source.color)}"></span>
        <span class="source-name">${Utils.escapeHtml(source.displayName)}</span>
        <label class="toggle">
          <input type="checkbox" ${enabled ? 'checked' : ''} data-source-toggle="${Utils.escapeHtml(source.name)}">
          <span class="toggle-track"></span>
        </label>
      </li>
    `;
  },

  favoriteCard(model) {
    return `
      <div class="fav-card" data-url="${Utils.escapeHtml(model.sourceUrl)}">
        <div class="fav-thumb">
          ${model.thumbnail ? `<img src="${Utils.escapeHtml(model.thumbnail)}" alt="" loading="lazy">` : ''}
        </div>
        <div class="fav-info">
          <div class="fav-title">${Utils.escapeHtml(model.title)}</div>
          <div class="fav-source">${Utils.escapeHtml(model.sourceName)} &middot; ${Utils.escapeHtml(model.author)}</div>
        </div>
        <button class="fav-remove" data-remove-fav="${Utils.escapeHtml(model.id)}" onclick="event.stopPropagation()">
          ${this.icons.x}
        </button>
      </div>
    `;
  },

  statsPanel(stats) {
    const topQueries = Object.entries(stats.queryCounts || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const sourceCounts = Object.entries(stats.sourceCounts || {})
      .sort((a, b) => b[1] - a[1]);

    const maxSourceCount = sourceCounts.length > 0 ? sourceCounts[0][1] : 1;

    return `
      <div class="stat-card">
        <div class="stat-card-header">Total Searches</div>
        <div class="stat-value">${Utils.formatNumber(stats.totalSearches || 0)}</div>
      </div>

      ${topQueries.length > 0 ? `
        <div class="stat-card">
          <div class="stat-card-header">Top Queries</div>
          <ul class="stat-list">
            ${topQueries.map(([q, count]) => `
              <li class="stat-list-item">
                <span class="label">${Utils.escapeHtml(q)}</span>
                <span class="value">${count}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${sourceCounts.length > 0 ? `
        <div class="stat-card">
          <div class="stat-card-header">Results by Source</div>
          <div class="stat-bar-container">
            ${sourceCounts.map(([src, count]) => `
              <div class="stat-bar-row">
                <span class="stat-bar-label">${Utils.escapeHtml(src)}</span>
                <div class="stat-bar">
                  <div class="stat-bar-fill source-${Utils.escapeHtml(src)}" style="width:${Math.round(count / maxSourceCount * 100)}%;background:var(--source-color, var(--accent))"></div>
                </div>
                <span class="stat-bar-value">${Utils.formatNumber(count)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },
};
