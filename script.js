// category/script.js
(() => {
  const sourceName   = window.SOURCE_NAME || '';
// to this (absolute, for Flask):
 const jsonPath = '/data/all_news.json';
  const itemsPerPage = 10;

  let allNewsItems  = [];
  let filteredItems = [];
  let currentPage   = 1;

  // Convert yyyy-mm-dd → dd/mm/yyyy
  function isoToCsvDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  // Convert dd/mm/yyyy → yyyy-mm-dd
  function csvDateToIso(csv) {
    const [d, m, y] = csv.split('/');
    return `${y}-${m}-${d}`;
  }

  // Populate category dropdown
  function populateCategories(items) {
    const sel = document.getElementById('categoryFilter');
    sel.innerHTML = '<option value="all">Բոլոր կատեգորիաները</option>';
    Array.from(new Set(items.map(i => i.Category).filter(Boolean))).forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
  }

  // Render news items
  function renderNews(items) {
    const c = document.getElementById('newsContainer');
    c.innerHTML = '';
    if (!items.length) {
      c.innerHTML = '<p class="no-results">Ոչինչ չի գտնվել</p>';
      return;
    }
    items.forEach(item => {
      const contentText = item.Content && item.Content.trim() !== ''
        ? item.Content.substring(0, 200) + '…'
        : 'Տեսանյութ';
      const div = document.createElement('div');
      div.className = 'news-item';
      div.innerHTML = `
        <h3>${item.Title}</h3>
        <p class="news-date">${item.Date}</p>
        <p class="news-category">Կատեգորիա | ${item.Category || 'Ընորոշված չէ'}</p>
        <p class="news-teaser">${contentText}</p>
        <a
          href="/news_detail/index.html?source=${encodeURIComponent(sourceName)}&url=${encodeURIComponent(item.URL)}"
          class="view-button">View</a>
      `;
      c.appendChild(div);
    });
  }

  // Render pagination
  function renderPagination(totalCount) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    if (totalPages < 2) return;
    const makeBtn = (label, disabled, click, isActive) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      if (disabled) btn.disabled = true;
      if (isActive) btn.classList.add('active');
      btn.addEventListener('click', click);
      return btn;
    };
    container.appendChild(makeBtn('Prev', currentPage === 1, () => { currentPage--; updatePage(); }));
    let pages = [];
    if (totalPages <= 5) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else if (currentPage <= 3) {
      pages = [1, 2, 3, null, totalPages];
    } else if (currentPage >= totalPages - 2) {
      pages = [1, null, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages];
    }
    pages.forEach(p => {
      if (p === null) {
        const span = document.createElement('span'); span.textContent = '…'; container.appendChild(span);
      } else {
        container.appendChild(makeBtn(
          p, false, () => { currentPage = p; updatePage(); }, p === currentPage
        ));
      }
    });
    container.appendChild(makeBtn('Next', currentPage === totalPages, () => { currentPage++; updatePage(); }));
  }

  // Update display for current page
  function updatePage() {
    const start     = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredItems.slice(start, start + itemsPerPage);
    renderNews(pageItems);
    renderPagination(filteredItems.length);
  }

  // Filter data and reset page
  function applyFilters() {
    const term     = document.getElementById('searchInput').value.trim().toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    const dateIso  = document.getElementById('datePicker').value;
    const dateCsv  = dateIso ? isoToCsvDate(dateIso) : null;
    filteredItems = allNewsItems.filter(item => {
      const okSearch = !term ||
        (item.Title && item.Title.toLowerCase().includes(term)) ||
        (item.Content && item.Content.toLowerCase().includes(term));
      const okCat    = category === 'all' || item.Category === category;
      const okDate   = !dateCsv || item.Date === dateCsv;
      return okSearch && okCat && okDate;
    });
    currentPage = 1;
    updatePage();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const newsContainer  = document.getElementById('newsContainer');
    const searchButton   = document.getElementById('searchButton');
    const searchInput    = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const datePicker     = document.getElementById('datePicker');

    fetch(jsonPath)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        allNewsItems = data
          .filter(i => i.source === sourceName)
          .sort((a, b) => {
            const [da, ma, ya] = a.Date.split('/');
            const [db, mb, yb] = b.Date.split('/');
            return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
          });
        // Default: show only latest day's articles
        if (allNewsItems.length) {
          const latestCsv = allNewsItems[0].Date;
          datePicker.value = csvDateToIso(latestCsv);
        }
        populateCategories(allNewsItems);
        applyFilters();
      })
      .catch(err => {
        console.error(err);
        if (newsContainer) newsContainer.innerHTML = `<p class="error-message">Error loading data: ${err.message}</p>`;
      });

    searchButton.addEventListener('click', applyFilters);
    searchInput.addEventListener('keyup', e => { if (e.key === 'Enter') applyFilters(); });
    categoryFilter.addEventListener('change', applyFilters);
    datePicker.addEventListener('change', applyFilters);
  });
})();
