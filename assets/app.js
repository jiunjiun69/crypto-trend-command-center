(function () {
  const charts = window.CHECKONCHAIN_CHARTS || [];
  const state = {
    query: "",
    category: "All",
    pack: "all",
    activeId: new URLSearchParams(window.location.search).get("chart"),
    watchlist: new Set(JSON.parse(localStorage.getItem("coc-watchlist") || "[]")),
    compare: JSON.parse(localStorage.getItem("coc-compare") || "[]"),
  };

  const packMatchers = {
    all: () => true,
    cycle: (chart) => /cycle|top|bottom|mvrv|nupl|mayer|pi|euphoria|drawdown|bear|bull/.test(chart.keywords),
    flows: (chart) => /flow|etf|capital|liquidity|realised|realized|profit|loss|volume|demand/.test(chart.keywords),
    risk: (chart) => /risk|volatility|liquidation|leverage|funding|sopr|z-score|ratio|dominance/.test(chart.keywords),
    derivatives: (chart) => chart.category === "Derivatives" || /options|futures|funding|ibit/.test(chart.keywords),
  };

  const el = {
    search: document.getElementById("searchInput"),
    categoryList: document.getElementById("categoryList"),
    chartList: document.getElementById("chartList"),
    chartFrame: document.getElementById("chartFrame"),
    activeTitle: document.getElementById("activeTitle"),
    activeCategory: document.getElementById("activeCategory"),
    chartCount: document.getElementById("chartCount"),
    categoryCount: document.getElementById("categoryCount"),
    watchCount: document.getElementById("watchCount"),
    resultCount: document.getElementById("resultCount"),
    watchBtn: document.getElementById("watchBtn"),
    compareBtn: document.getElementById("compareBtn"),
    compareGrid: document.getElementById("compareGrid"),
    clearCompareBtn: document.getElementById("clearCompareBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
  };

  const categories = ["All", ...Array.from(new Set(charts.map((chart) => chart.category))).sort()];
  const byId = new Map(charts.map((chart) => [chart.id, chart]));

  function persist() {
    localStorage.setItem("coc-watchlist", JSON.stringify([...state.watchlist]));
    localStorage.setItem("coc-compare", JSON.stringify(state.compare));
  }

  function filteredCharts() {
    const q = state.query.trim().toLowerCase();
    const matcher = packMatchers[state.pack] || packMatchers.all;
    return charts.filter((chart) => {
      const matchesCategory = state.category === "All" || chart.category === state.category;
      const matchesQuery = !q || chart.keywords.includes(q) || chart.title.toLowerCase().includes(q);
      return matchesCategory && matchesQuery && matcher(chart);
    });
  }

  function setActive(id) {
    const chart = byId.get(id) || charts[0];
    if (!chart) return;
    state.activeId = chart.id;
    el.chartFrame.src = chart.url;
    el.activeTitle.textContent = chart.title;
    el.activeCategory.textContent = chart.category;
    const url = new URL(window.location.href);
    url.searchParams.set("chart", chart.id);
    history.replaceState(null, "", url);
    renderChartList();
    renderWatchButton();
  }

  function renderStats() {
    el.chartCount.textContent = charts.length.toLocaleString();
    el.categoryCount.textContent = (categories.length - 1).toLocaleString();
    el.watchCount.textContent = state.watchlist.size.toLocaleString();
  }

  function renderCategories() {
    const counts = charts.reduce((acc, chart) => {
      acc[chart.category] = (acc[chart.category] || 0) + 1;
      return acc;
    }, {});
    el.categoryList.innerHTML = categories
      .map((category) => {
        const count = category === "All" ? charts.length : counts[category] || 0;
        return `<button class="category-button ${category === state.category ? "active" : ""}" data-category="${category}">
          <span>${category}</span><small>${count}</small>
        </button>`;
      })
      .join("");
  }

  function renderChartList() {
    const results = filteredCharts();
    el.resultCount.textContent = results.length.toLocaleString();
    el.chartList.innerHTML = results
      .map((chart) => {
        const watched = state.watchlist.has(chart.id);
        return `<article class="chart-card ${chart.id === state.activeId ? "active" : ""}">
          <button class="chart-open" data-id="${chart.id}">
            <strong>${chart.title}</strong>
          </button>
          <div class="chart-meta">
            <span>${chart.category}</span>
            <div class="mini-actions">
              <button data-watch="${chart.id}" title="${watched ? "移出 Watchlist" : "加入 Watchlist"}" aria-label="${watched ? "移出 Watchlist" : "加入 Watchlist"}">
                <i data-lucide="${watched ? "star" : "star-off"}"></i>
              </button>
              <button data-compare="${chart.id}" title="加入比較" aria-label="加入比較"><i data-lucide="plus"></i></button>
            </div>
          </div>
        </article>`;
      })
      .join("");
    document.querySelectorAll(".chart-open").forEach((button) => {
      button.className = "chart-open-reset";
    });
    refreshIcons();
  }

  function renderWatchButton() {
    const watched = state.watchlist.has(state.activeId);
    el.watchBtn.classList.toggle("primary", watched);
    el.watchBtn.querySelector("span").textContent = watched ? "Watching" : "Watch";
  }

  function renderCompare() {
    const unique = state.compare.filter((id, idx, arr) => byId.has(id) && arr.indexOf(id) === idx).slice(0, 4);
    state.compare = unique;
    persist();
    if (!unique.length) {
      el.compareGrid.innerHTML = '<div class="empty-state">從指標庫或主圖表加入最多 4 個 chart，快速比較週期、資金流與風險訊號。</div>';
      return;
    }
    el.compareGrid.innerHTML = unique
      .map((id) => {
        const chart = byId.get(id);
        return `<article class="compare-card">
          <header><strong>${chart.title}</strong><button class="text-button" data-remove-compare="${id}">移除</button></header>
          <iframe title="${chart.title}" loading="lazy" src="${chart.url}"></iframe>
        </article>`;
      })
      .join("");
  }

  function toggleWatch(id) {
    if (state.watchlist.has(id)) state.watchlist.delete(id);
    else state.watchlist.add(id);
    persist();
    renderStats();
    renderWatchButton();
    renderChartList();
  }

  function addCompare(id) {
    state.compare = [id, ...state.compare.filter((existing) => existing !== id)].slice(0, 4);
    persist();
    renderCompare();
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  el.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderChartList();
  });

  el.categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.category = button.dataset.category;
    renderCategories();
    renderChartList();
  });

  document.querySelector(".quick-packs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-pack]");
    if (!button) return;
    state.pack = button.dataset.pack;
    document.querySelectorAll("[data-pack]").forEach((pack) => pack.classList.toggle("active", pack === button));
    renderChartList();
  });

  el.chartList.addEventListener("click", (event) => {
    const open = event.target.closest("[data-id]");
    const watch = event.target.closest("[data-watch]");
    const compare = event.target.closest("[data-compare]");
    if (open) setActive(open.dataset.id);
    if (watch) toggleWatch(watch.dataset.watch);
    if (compare) addCompare(compare.dataset.compare);
  });

  el.watchBtn.addEventListener("click", () => toggleWatch(state.activeId));
  el.compareBtn.addEventListener("click", () => addCompare(state.activeId));
  el.clearCompareBtn.addEventListener("click", () => {
    state.compare = [];
    persist();
    renderCompare();
  });
  el.compareGrid.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-compare]");
    if (!remove) return;
    state.compare = state.compare.filter((id) => id !== remove.dataset.removeCompare);
    persist();
    renderCompare();
  });
  el.copyLinkBtn.addEventListener("click", async () => {
    const chart = byId.get(state.activeId);
    if (!chart) return;
    await navigator.clipboard.writeText(chart.url);
  });

  renderStats();
  renderCategories();
  setActive(state.activeId || charts.find((chart) => /mvrv_all/.test(chart.sourcePath))?.id || charts[0]?.id);
  renderCompare();
  refreshIcons();
})();
