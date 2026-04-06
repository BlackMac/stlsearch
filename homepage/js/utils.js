/**
 * MeshHunt - Utility functions
 */

const Utils = {
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  formatNumber(n) {
    if (n < 0) return '-';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 2592000000) return Math.floor(diff / 86400000) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Slug generation for cross-device sync
  generateSlug() {
    const adjectives = [
      'swift','brave','calm','dark','eager','fair','glad','hale','iron','jade',
      'keen','lean','mild','neat','open','pale','pure','rare','sage','tall',
      'vast','warm','wise','bold','cool','deep','fast','gold','high','just',
      'kind','live','nice','odd','pink','rich','safe','thin','ugly','vivid',
      'wild','zany','able','bare','cold','dull','easy','fine','grey','hard',
      'idle','lazy','mean','new','old','poor','real','slow','true','used'
    ];
    const colors = [
      'red','blue','green','gold','pink','teal','plum','ruby','sage','mint',
      'rose','lime','cyan','gray','navy','wine','jade','rust','sand','snow',
      'aqua','fawn','onyx','opal','coal','dusk','dawn','haze','mist','moss',
      'clay','corn','pear','fern','iris','lava','silk','bone','wolf','bear'
    ];
    const nouns = [
      'fox','owl','elk','ray','fin','gem','arc','orb','oak','elm',
      'bay','cub','kit','pup','ram','yak','emu','cod','ant','bee',
      'hawk','wolf','bear','lynx','colt','frog','moth','wasp','swan','dove',
      'kite','lark','wren','reef','cave','peak','glen','vale','ford','isle',
      'bolt','dart','glow','mist','wave','star','moon','comet','flare','spark',
      'echo','drum','harp','bell','reed','rune','seal','icon','crest','blade'
    ];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    return `${pick(adjectives)}-${pick(colors)}-${pick(nouns)}`;
  },

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    }
  },

  // Download JSON file
  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Read JSON file
  readJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(JSON.parse(reader.result)); }
        catch (e) { reject(new Error('Invalid JSON file')); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },
};
