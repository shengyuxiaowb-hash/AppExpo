const themeToggle = document.querySelector("#themeToggle");
const historySearch = document.querySelector("#historySearch");
const historyDatePicker = document.querySelector("#historyDatePicker");
const historyYearTrigger = document.querySelector("#historyYearTrigger");
const historyYearMenu = document.querySelector("#historyYearMenu");
const historyYearList = document.querySelector("#historyYearList");
const historyMonthTrigger = document.querySelector("#historyMonthTrigger");
const historyMonthMenu = document.querySelector("#historyMonthMenu");
const historyMonthList = document.querySelector("#historyMonthList");
const historyDayTrigger = document.querySelector("#historyDayTrigger");
const historyDayMenu = document.querySelector("#historyDayMenu");
const historyDayList = document.querySelector("#historyDayList");
const historyDateClear = document.querySelector("#historyDateClear");
const historyGameTrigger = document.querySelector("#historyGameTrigger");
const historyGameMenu = document.querySelector("#historyGameMenu");
const historyGameList = document.querySelector("#historyGameList");
const historyGameFilterInput = document.querySelector("#historyGameFilterInput");
const historyAppIdInput = document.querySelector("#historyAppIdInput");
const historyAppIdHint = document.querySelector("#historyAppIdHint");
const historyCountryTrigger = document.querySelector("#historyCountryTrigger");
const historyCountryMenu = document.querySelector("#historyCountryMenu");
const historyCountryList = document.querySelector("#historyCountryList");
const historyPageType = document.querySelector("#historyPageType");
const historyRunCount = document.querySelector("#historyRunCount");
const historyMatchCount = document.querySelector("#historyMatchCount");
const historyCountryCount = document.querySelector("#historyCountryCount");
const historyRunList = document.querySelector("#historyRunList");
const historyResults = document.querySelector("#historyResults");
const historyRunBadge = document.querySelector("#historyRunBadge");

const state = {
  loading: false,
  dateMenuOpen: "",
  gameMenuOpen: false,
  countryMenuOpen: false,
  historyDate: { year: "", month: "", day: "" },
  games: [],
  countries: [],
  selectedGameKey: "",
  historyGameFilter: "",
  historyAppIdQuery: "",
  selectedCountry: "",
  selectedPageType: "",
  analytics: {
    summary: { matchCount: 0, countryCount: 0, todayCount: 0, gamesCount: 0 },
    groups: [],
    items: [],
  },
  cache: {
    games: null,
    countries: new Map(),
    analytics: new Map(),
  },
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanInlineText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("appexpo-theme", nextTheme);
  themeToggle.setAttribute("aria-label", nextTheme === "dark" ? "切换白天模式" : "切换黑夜模式");
  themeToggle.setAttribute("aria-pressed", nextTheme === "dark" ? "true" : "false");
}

function formatTime(value) {
  if (!value) return "未标明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanInlineText(value);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function daysInMonth(year, month) {
  if (!year || !month) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

function selectedHistoryDateValue() {
  const { year, month, day } = state.historyDate;
  if (!year || !month || !day) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function todayDateState() {
  const today = new Date();
  return {
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    day: String(today.getDate()),
  };
}

function selectedDateLabel(key) {
  const value = state.historyDate[key];
  if (!value) {
    if (key === "year") return "年份";
    if (key === "month") return "月份";
    return "日期";
  }
  if (key === "year") return `${value} 年`;
  if (key === "month") return `${pad2(value)} 月`;
  return `${pad2(value)} 日`;
}

function selectedGame() {
  return state.games.find((item) => item.key === state.selectedGameKey) || null;
}

function selectedGameLabel() {
  const selected = selectedGame();
  return selected ? cleanInlineText(selected.name) : "全部游戏";
}

function selectedCountryItem() {
  return state.countries.find((item) => item.code === state.selectedCountry) || null;
}

function selectedCountryLabel() {
  const selected = selectedCountryItem();
  if (!selected) return "全部国家";
  return cleanInlineText(`${selected.code} · ${selected.localName || selected.label || selected.code}`);
}

function selectedPageTypeLabel() {
  if (state.selectedPageType === "today") return "Today";
  if (state.selectedPageType === "games") return "Games";
  return "全部页面";
}

function setBusy(isBusy) {
  state.loading = isBusy;
  historySearch.disabled = isBusy;
  historyYearTrigger.disabled = isBusy;
  historyMonthTrigger.disabled = isBusy;
  historyDayTrigger.disabled = isBusy;
  historyDateClear.disabled = isBusy;
  historyGameTrigger.disabled = isBusy;
  historyAppIdInput.disabled = isBusy;
  historyCountryTrigger.disabled = isBusy;
  historyPageType.querySelectorAll("input").forEach((input) => {
    input.disabled = isBusy;
  });
  historySearch.textContent = isBusy ? "读取中" : "查询历史";
}

function resetHistoryAppIdHint(message = "", tone = "") {
  historyAppIdHint.textContent = message;
  historyAppIdHint.classList.remove("hit", "miss", "show");
  if (tone) historyAppIdHint.classList.add(tone);
  if (message) historyAppIdHint.classList.add("show");
}

function matchHistoryGamesByAppId(value) {
  const query = String(value || "").trim();
  if (!query) return [];
  return state.games.filter((game) => {
    const ids = Array.isArray(game.appIds) && game.appIds.length
      ? game.appIds
      : [game.appId].filter(Boolean);
    return ids.some((id) => String(id || "").trim() === query);
  });
}

function syncHistoryAppIdFromSelectedGame() {
  const selected = selectedGame();
  if (!selected) return;
  const ids = Array.isArray(selected.appIds) && selected.appIds.length
    ? selected.appIds
    : [selected.appId].filter(Boolean);
  if (ids.length) {
    historyAppIdInput.value = ids[0];
    state.historyAppIdQuery = ids[0];
    resetHistoryAppIdHint("已匹配到历史记录游戏", "hit");
  }
}

function applyHistoryAppIdSearch() {
  const query = String(historyAppIdInput.value || "").trim();
  state.historyAppIdQuery = query;
  if (!query) {
    state.selectedGameKey = "";
    renderHistoryGames();
    resetHistoryAppIdHint();
    return;
  }
  const matches = matchHistoryGamesByAppId(query);
  if (!matches.length) {
    resetHistoryAppIdHint("没有匹配到历史记录游戏", "miss");
    return;
  }
  const exact = matches.find((game) => {
    const ids = Array.isArray(game.appIds) && game.appIds.length
      ? game.appIds
      : [game.appId].filter(Boolean);
    return ids.some((id) => String(id || "").trim() === query);
  }) || null;
  const selected = exact || matches[0];
  state.selectedGameKey = selected.key;
  renderHistoryGames();
  resetHistoryAppIdHint("已匹配到历史记录游戏", "hit");
}

function setDateMenu(name) {
  state.dateMenuOpen = state.dateMenuOpen === name ? "" : name;
  const menus = {
    year: [historyYearMenu, historyYearTrigger],
    month: [historyMonthMenu, historyMonthTrigger],
    day: [historyDayMenu, historyDayTrigger],
  };
  Object.entries(menus).forEach(([key, [menu, trigger]]) => {
    const open = state.dateMenuOpen === key;
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      requestAnimationFrame(() => scrollActiveDateOptionIntoView(menu));
    }
  });
}

function scrollActiveDateOptionIntoView(menu) {
  if (!menu) return;
  const list = menu.querySelector(".game-list");
  const active = list?.querySelector(".game-option.active");
  if (!list || !active) return;
  const targetTop = active.offsetTop - (list.clientHeight / 2) + (active.clientHeight / 2);
  list.scrollTop = Math.max(0, targetTop);
}

function setHistoryGameMenu(open) {
  state.gameMenuOpen = open;
  historyGameMenu.hidden = !open;
  historyGameTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    requestAnimationFrame(() => {
      historyGameFilterInput.value = state.historyGameFilter || "";
      historyGameFilterInput.focus();
      historyGameFilterInput.select();
    });
  }
}

function setHistoryCountryMenu(open) {
  state.countryMenuOpen = open;
  historyCountryMenu.hidden = !open;
  historyCountryTrigger.setAttribute("aria-expanded", open ? "true" : "false");
}

function renderHistoryDatePicker() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => String(currentYear + 1 - index));
  const months = Array.from({ length: 12 }, (_, index) => String(index + 1));
  const days = Array.from(
    { length: daysInMonth(state.historyDate.year || currentYear, state.historyDate.month || 1) },
    (_, index) => String(index + 1)
  );

  historyYearTrigger.querySelector("span").textContent = selectedDateLabel("year");
  historyMonthTrigger.querySelector("span").textContent = selectedDateLabel("month");
  historyDayTrigger.querySelector("span").textContent = selectedDateLabel("day");

  historyYearList.innerHTML = years.map((year) => `
    <button class="game-option${state.historyDate.year === year ? " active" : ""}" type="button" data-date-part="year" data-date-value="${escapeHtml(year)}">
      <span>${escapeHtml(year)} 年</span>
    </button>
  `).join("");
  historyMonthList.innerHTML = months.map((month) => `
    <button class="game-option${state.historyDate.month === month ? " active" : ""}" type="button" data-date-part="month" data-date-value="${escapeHtml(month)}">
      <span>${escapeHtml(`${Number(month)} 月`)}</span>
    </button>
  `).join("");
  historyDayList.innerHTML = days.map((day) => `
    <button class="game-option${state.historyDate.day === day ? " active" : ""}" type="button" data-date-part="day" data-date-value="${escapeHtml(day)}">
      <span>${escapeHtml(`${Number(day)} 日`)}</span>
    </button>
  `).join("");
}

function renderHistoryGames() {
  historyGameTrigger.querySelector("span").textContent = selectedGameLabel();
  if (!state.games.length) {
    historyGameList.innerHTML = '<div class="game-list-state">历史数据库里还没有可选游戏</div>';
    return;
  }
  const filter = cleanInlineText(state.historyGameFilter || "").toLowerCase();
  const filteredGames = filter
    ? state.games.filter((game) => cleanInlineText(game.name).toLowerCase().includes(filter))
    : state.games;
  if (!filteredGames.length) {
    historyGameList.innerHTML = '<div class="game-list-state">没有匹配到历史记录游戏</div>';
    return;
  }
  historyGameList.innerHTML = [
    `
      <button class="game-option${!state.selectedGameKey ? " active" : ""}" type="button" data-history-game-key="">
        <span>全部游戏</span>
      </button>
    `,
    ...filteredGames.map((game) => `
      <button class="game-option${state.selectedGameKey === game.key ? " active" : ""}" type="button" data-history-game-key="${escapeHtml(game.key)}">
        <span>${escapeHtml(cleanInlineText(game.name))}</span>
      </button>
    `),
  ].join("");
}

function renderCountryMenu() {
  historyCountryTrigger.querySelector("span").textContent = selectedCountryLabel();
  if (!state.countries.length) {
    historyCountryList.innerHTML = '<div class="game-list-state">当前筛选条件下还没有命中国家</div>';
    return;
  }
  historyCountryList.innerHTML = [
    `
      <button class="game-option${!state.selectedCountry ? " active" : ""}" type="button" data-history-country="">
        <span>全部国家</span>
      </button>
    `,
    ...state.countries.map((country) => `
      <button class="game-option${state.selectedCountry === country.code ? " active" : ""}" type="button" data-history-country="${escapeHtml(country.code)}">
        <span>${escapeHtml(cleanInlineText(`${country.code} · ${country.localName || country.label || country.code}`))}</span>
      </button>
    `),
  ].join("");
}

function fetchJson(url, fallbackMessage) {
  return fetch(url, { cache: "no-store" }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || fallbackMessage);
    }
    return data;
  });
}

function countriesCacheKey() {
  return JSON.stringify({
    gameKey: state.selectedGameKey || "",
    pageType: state.selectedPageType || "",
    date: selectedHistoryDateValue() || "",
  });
}

function analyticsCacheKey() {
  return JSON.stringify({
    gameKey: state.selectedGameKey || "",
    country: state.selectedCountry || "",
    pageType: state.selectedPageType || "",
    date: selectedHistoryDateValue() || "",
  });
}

async function loadHistoryGames() {
  if (state.cache.games) {
    state.games = state.cache.games;
    if (!state.games.some((item) => item.key === state.selectedGameKey)) {
      state.selectedGameKey = "";
    }
    renderHistoryGames();
    return;
  }
  try {
    const data = await fetchJson("/api/history/games", "历史游戏目录加载失败");
    state.games = data.games || [];
    state.cache.games = state.games;
    if (!state.games.some((item) => item.key === state.selectedGameKey)) {
      state.selectedGameKey = "";
    }
  } catch (_error) {
    state.games = [];
    state.selectedGameKey = "";
  }
  renderHistoryGames();
  if (state.historyAppIdQuery) {
    const selected = selectedGame();
    const ids = Array.isArray(selected?.appIds) && selected.appIds.length
      ? selected.appIds
      : [selected?.appId].filter(Boolean);
    if (ids.length) {
      const matchedId = ids.find((id) => String(id || "").trim() === String(state.historyAppIdQuery || "").trim()) || ids[0];
      historyAppIdInput.value = matchedId;
      resetHistoryAppIdHint("已匹配到历史记录游戏", "hit");
    }
  }
}

async function loadCountries() {
  const cacheKey = countriesCacheKey();
  if (state.cache.countries.has(cacheKey)) {
    const data = state.cache.countries.get(cacheKey);
    state.countries = data.countries || [];
    if (state.selectedCountry && !state.countries.some((item) => item.code === state.selectedCountry)) {
      state.selectedCountry = "";
    }
    renderCountryMenu();
    renderCountrySidebar();
    return;
  }
  const date = selectedHistoryDateValue();
  const params = new URLSearchParams({
    gameKey: state.selectedGameKey,
    pageType: state.selectedPageType,
    dateFrom: date,
    dateTo: date,
  });
  const data = await fetchJson(`/api/history/countries?${params.toString()}`, "历史国家列表加载失败");
  state.cache.countries.set(cacheKey, data);
  state.countries = data.countries || [];
  if (state.selectedCountry && !state.countries.some((item) => item.code === state.selectedCountry)) {
    state.selectedCountry = "";
  }
  renderCountryMenu();
  renderCountrySidebar();
}

async function loadAnalytics() {
  const cacheKey = analyticsCacheKey();
  if (state.cache.analytics.has(cacheKey)) {
    state.analytics = state.cache.analytics.get(cacheKey);
    renderSummary();
    renderResults();
    return;
  }
  const date = selectedHistoryDateValue();
  const params = new URLSearchParams({
    gameKey: state.selectedGameKey,
    country: state.selectedCountry,
    pageType: state.selectedPageType,
    dateFrom: date,
    dateTo: date,
  });
  const data = await fetchJson(`/api/history/analytics?${params.toString()}`, "历史分析加载失败");
  state.cache.analytics.set(cacheKey, data);
  state.analytics = data;
  renderSummary();
  renderResults();
}

function renderSummary() {
  const date = selectedHistoryDateValue();
  const summary = state.analytics.summary || {};
  historyRunCount.textContent = date ? "1" : String(new Set((state.analytics.items || []).map((item) => String(item.checked_at || "").slice(0, 10)).filter(Boolean)).size);
  historyMatchCount.textContent = String(summary.matchCount || 0);
  historyCountryCount.textContent = String(summary.countryCount || 0);
  historyRunBadge.textContent = `${state.countries.length} 个国家`;

}

function renderCountrySidebar() {
  if (!state.countries.length) {
    historyRunList.innerHTML = '<div class="empty-state">当前筛选条件下还没有命中国家。</div>';
    return;
  }
  historyRunList.innerHTML = state.countries.map((country) => {
    const active = state.selectedCountry === country.code;
    const label = cleanInlineText(`${country.code} · ${country.localName || country.label || country.code}`);
    return `
      <button class="history-run-item${active ? " active" : ""}" type="button" data-country-code="${escapeHtml(country.code)}">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(`${country.matchCount || 0} 个命中展位`)}</span>
        <small>${escapeHtml(`${country.gameCount || 0} 款相关游戏`)}</small>
      </button>
    `;
  }).join("");
}

function normalizeHistoryGroup(group) {
  const matches = (group.matches || []).map((item) => {
    let parsed = {};
    try {
      parsed = JSON.parse(item.raw_match || "{}");
    } catch (_error) {
      parsed = {};
    }
    return {
      country: item.country || "",
      countryLabel: item.country_label || "",
      localName: item.local_name || "",
      pageType: item.page_type || parsed.pageType || "",
      pageLabel: item.page_label || parsed.pageLabel || item.page_type || "",
      mediaMode: parsed.mediaMode || "",
      groupTitle: cleanInlineText(item.group_title || parsed.groupTitle || ""),
      groupSubtitle: cleanInlineText(parsed.groupSubtitle || ""),
      headerTitle: cleanInlineText(parsed.headerTitle || parsed.cardHeaderTitle || ""),
      sectionTitle: cleanInlineText(item.section_title || parsed.sectionTitle || ""),
      sectionSubtitle: cleanInlineText(parsed.sectionSubtitle || ""),
      placementTitle: cleanInlineText(item.placement_title || parsed.placementTitle || ""),
      subtitle: cleanInlineText(item.subtitle || parsed.subtitle || ""),
      description: cleanInlineText(parsed.description || ""),
      appTitle: cleanInlineText(parsed.appTitle || item.game_name || ""),
      appSubtitle: cleanInlineText(parsed.appSubtitle || parsed.subtitle || ""),
      callToAction: cleanInlineText(parsed.callToAction || ""),
      buttonNote: cleanInlineText(parsed.buttonNote || parsed.eventRequirement || ""),
      heroRibbon: cleanInlineText(parsed.heroRibbon || parsed.eventStatus || ""),
      heroEyebrow: cleanInlineText(parsed.heroEyebrow || parsed.eventKind || ""),
      heroTitle: cleanInlineText(parsed.heroTitle || parsed.placementTitle || ""),
      heroDescription: cleanInlineText(parsed.heroDescription || parsed.description || parsed.subtitle || ""),
      eventKind: cleanInlineText(parsed.eventKind || ""),
      eventStatus: cleanInlineText(parsed.eventStatus || ""),
      eventStartDate: parsed.eventStartDate || "",
      eventEndDate: parsed.eventEndDate || "",
      eventRequirement: cleanInlineText(parsed.eventRequirement || ""),
      placementType: cleanInlineText(parsed.placementType || ""),
      modulePosition: parsed.modulePosition || 0,
      itemPosition: parsed.itemPosition || 0,
      groupItemCount: parsed.groupItemCount || 0,
      position: parsed.position || 0,
      checkedAt: item.checked_at || parsed.checkedAt || "",
      updatedAt: item.updated_at || parsed.updatedAt || "",
      image: item.image || parsed.image || parsed.heroImage || "",
      appIcon: item.app_icon || parsed.appIcon || "",
      iconImage: parsed.iconImage || "",
      gameName: cleanInlineText(item.game_name || ""),
    };
  });
  matches.sort((a, b) => String(b.checkedAt || "").localeCompare(String(a.checkedAt || "")));
  return {
    country: group.country || "",
    countryLabel: group.countryLabel || "",
    localName: group.localName || "",
    matches,
  };
}

function todayGroupLabel(match) {
  if (match.pageType !== "today") return "";
  return match.groupTitle || match.pageLabel || "Today";
}

function primaryPlacementLabel(match, index) {
  if (match.pageType === "today" && match.modulePosition) {
    return `${match.pageLabel || "Today"} 栏目第 ${match.modulePosition} 位`;
  }
  return `${match.pageLabel || ""} 展位 ${index + 1}`.trim();
}

function detailPlacementLabel(match) {
  const position = match.itemPosition || match.position;
  if (match.pageType === "today") {
    if (!position) return "组内位置未标明";
    return `组内第 ${position} 位`;
  }
  return position ? `${match.placementType || "展位"} · 第 ${position} 位` : `${match.placementType || "展位"} · 位置未标明`;
}

function renderTodayHeroMatch(match, index, pageCheckedAt) {
  const hero = match.image
    ? `<img src="${escapeHtml(match.image)}" alt="${escapeHtml(match.sectionTitle || "Today 图片")}" loading="lazy">`
    : '<div class="image-fallback">无图片</div>';
  const icon = match.appIcon || match.iconImage;
  const appIcon = icon
    ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(match.appTitle || match.placementTitle || "App 图标")}" loading="lazy">`
    : '<div class="event-icon-fallback">App</div>';
  const groupLabel = todayGroupLabel(match);
  const groupTitle = groupLabel && groupLabel !== match.sectionTitle ? groupLabel : "";
  const groupSubtitle = match.groupSubtitle && match.groupSubtitle !== match.sectionSubtitle ? match.groupSubtitle : "";
  const primaryPosition = primaryPlacementLabel(match, index);
  const position = detailPlacementLabel(match);
  return `
    <article class="today-hero-card">
      ${groupTitle || groupSubtitle ? `
        <div class="today-hero-heading">
          ${groupTitle ? `<h3>${escapeHtml(groupTitle)}</h3>` : ""}
          ${groupSubtitle ? `<p>${escapeHtml(groupSubtitle)}</p>` : ""}
        </div>
      ` : ""}
      <div class="today-hero-media">
        ${hero}
        <div class="today-hero-gradient"></div>
        <div class="today-hero-copy">
          <span>${escapeHtml(match.eventKind || match.placementType || "Today")}</span>
          <strong>${escapeHtml(match.sectionTitle || match.placementTitle || "展位")}</strong>
          ${match.sectionSubtitle ? `<p>${escapeHtml(match.sectionSubtitle)}</p>` : ""}
        </div>
      </div>
      <div class="today-hero-lockup">
        <div class="event-icon">${appIcon}</div>
        <div>
          <strong>${escapeHtml(match.appTitle || match.placementTitle || "命中游戏")}</strong>
          <span>${escapeHtml(match.appSubtitle || match.subtitle || "")}</span>
        </div>
        <button type="button" disabled>${escapeHtml(match.callToAction || "查看")}</button>
      </div>
      <div class="event-meta">
        <span>${escapeHtml(primaryPosition)}</span>
        <span>${escapeHtml(position)}</span>
        <span>模块时间 ${escapeHtml(formatTime(match.updatedAt))}</span>
        <span>分析时间 ${escapeHtml(formatTime(match.checkedAt || pageCheckedAt))}</span>
      </div>
    </article>
  `;
}

function renderCarouselMatch(match, index, pageCheckedAt) {
  const hero = match.image
    ? `<img src="${escapeHtml(match.image)}" alt="${escapeHtml(match.placementTitle || "轮播图片")}" loading="lazy">`
    : '<div class="image-fallback">无图片</div>';
  const icon = match.appIcon || match.iconImage;
  const appIcon = icon
    ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(match.appTitle || match.placementTitle || "App 图标")}" loading="lazy">`
    : '<div class="event-icon-fallback">App</div>';
  const position = match.position ? `第 ${match.position} 位` : "位置未标明";
  return `
    <article class="carousel-card">
      <div class="carousel-media">
        ${hero}
        <div class="carousel-scrim"></div>
        <div class="carousel-badge">
          <span>${escapeHtml(match.pageLabel || "")} 顶部轮播</span>
          <strong>${escapeHtml(position)}</strong>
        </div>
        <div class="carousel-copy">
          <span>${escapeHtml(match.eventStatus || match.eventKind || match.placementType || "轮播")}</span>
          <h3>${escapeHtml(match.placementTitle || match.appTitle || "命中游戏")}</h3>
          ${match.subtitle ? `<p>${escapeHtml(match.subtitle)}</p>` : ""}
          <div class="carousel-rule"></div>
          <div class="carousel-lockup">
            <div class="event-icon">${appIcon}</div>
            <div>
              <strong>${escapeHtml(match.appTitle || match.placementTitle || "命中游戏")}</strong>
              <small>${escapeHtml(match.appSubtitle || "")}</small>
            </div>
            <button type="button" disabled>${escapeHtml(match.callToAction || "查看")}</button>
          </div>
        </div>
      </div>
      <div class="event-meta">
        <span>${escapeHtml(match.pageLabel || "")} 顶部轮播</span>
        <span>展位 ${escapeHtml(position)}</span>
        <span>模块时间 ${escapeHtml(formatTime(match.updatedAt))}</span>
        <span>分析时间 ${escapeHtml(formatTime(match.checkedAt || pageCheckedAt))}</span>
      </div>
    </article>
  `;
}

function renderEventMatch(match, index, pageCheckedAt) {
  const hero = match.image
    ? `<img src="${escapeHtml(match.image)}" alt="${escapeHtml(match.placementTitle || "活动图片")}" loading="lazy">`
    : '<div class="image-fallback">无图片</div>';
  const icon = match.appIcon || match.iconImage || match.image;
  const appIcon = icon
    ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(match.appTitle || match.placementTitle || "App 图标")}" loading="lazy">`
    : '<div class="event-icon-fallback">App</div>';
  const position = match.itemPosition || match.position ? `组内第 ${match.itemPosition || match.position} 位` : "位置未标明";
  const primaryPosition = primaryPlacementLabel(match, index);
  const modulePosition = match.modulePosition ? `栏目第 ${match.modulePosition} 位` : "";
  const headerTitle = match.headerTitle || match.groupTitle || match.sectionTitle || "Today";
  const heroRibbon = match.heroRibbon || match.eventStatus || "进行中";
  const heroEyebrow = match.heroEyebrow || match.eventKind || "";
  const heroTitle = match.heroTitle || match.placementTitle || match.sectionTitle || "活动";
  const heroDescription = match.heroDescription || match.description || match.subtitle || "";
  const buttonNote = match.buttonNote || match.eventRequirement || "";
  return `
    <article class="event-card">
      <div class="event-heading">
        <div>
          <p class="event-source">${escapeHtml(headerTitle)}</p>
          <span>${escapeHtml(primaryPosition)} · ${escapeHtml(position)}</span>
        </div>
      </div>
      <div class="event-hero">
        ${hero}
        <div class="event-ribbon">${escapeHtml(heroRibbon)}</div>
        <div class="event-overlay">
          ${heroEyebrow ? `<span>${escapeHtml(heroEyebrow)}</span>` : ""}
          <h3>${escapeHtml(heroTitle)}</h3>
          ${heroDescription ? `<p>${escapeHtml(heroDescription)}</p>` : ""}
        </div>
      </div>
      <div class="event-lockup">
        <div class="event-icon">${appIcon}</div>
        <div>
          <strong>${escapeHtml(match.appTitle || match.placementTitle || "命中游戏")}</strong>
          <span>${escapeHtml(match.appSubtitle || match.subtitle || "")}</span>
        </div>
        <div class="event-action">
          <button type="button" disabled>${escapeHtml(match.callToAction || "查看")}</button>
          ${buttonNote ? `<small>${escapeHtml(buttonNote)}</small>` : ""}
        </div>
      </div>
      <div class="event-meta">
        <span>活动开始 ${escapeHtml(formatTime(match.eventStartDate))}</span>
        <span>活动结束 ${escapeHtml(formatTime(match.eventEndDate))}</span>
        ${modulePosition ? `<span>${escapeHtml(modulePosition)}</span>` : ""}
        <span>分析时间 ${escapeHtml(formatTime(match.checkedAt || pageCheckedAt))}</span>
      </div>
    </article>
  `;
}

function renderHistoryMatch(match, index, pageCheckedAt) {
  if (match.mediaMode === "carousel") return renderCarouselMatch(match, index, pageCheckedAt);
  if (match.mediaMode === "event") return renderEventMatch(match, index, pageCheckedAt);
  if (match.pageType === "today" && match.mediaMode === "hero") return renderTodayHeroMatch(match, index, pageCheckedAt);
  const primaryPosition = primaryPlacementLabel(match, index);
  const position = detailPlacementLabel(match);
  const groupLabel = todayGroupLabel(match);
  const isToday = match.pageType === "today";
  const isFeatured = match.mediaMode === "hero";
  const gameTitle = match.appTitle || match.gameName || match.placementTitle || "命中游戏";
  const image = match.image
    ? `<img src="${escapeHtml(match.image)}" alt="${escapeHtml(match.placementTitle || "展位图片")}" loading="lazy">`
    : '<div class="image-fallback">无图片</div>';
  return `
    <article class="match-card ${isFeatured ? "featured-match" : "icon-match"} ${isToday ? "today-match" : ""}">
      <div class="match-media">${image}</div>
      <div class="match-body">
        <div class="match-kicker">
          ${isToday && groupLabel ? `<span>所在栏目 ${escapeHtml(groupLabel)}</span>` : ""}
          <span>${escapeHtml(primaryPosition)}</span>
          <span>${escapeHtml(position)}</span>
        </div>
        <p class="section-label">${isToday ? "展位标题" : "标题来源"}</p>
        <h3>${escapeHtml(match.sectionTitle || "未命名区域")}</h3>
        ${match.sectionSubtitle ? `<p class="section-copy">${escapeHtml(match.sectionSubtitle)}</p>` : ""}
        <div class="game-proof">
          <strong>${escapeHtml(gameTitle)}</strong>
          ${match.subtitle ? `<span>${escapeHtml(match.subtitle)}</span>` : ""}
        </div>
        <div class="meta-line">
          <span>模块时间 ${escapeHtml(formatTime(match.updatedAt))}</span>
          <span>分析时间 ${escapeHtml(formatTime(match.checkedAt || pageCheckedAt))}</span>
        </div>
      </div>
    </article>
  `;
}

function renderResults() {
  const groups = (state.analytics.groups || []).map(normalizeHistoryGroup);
  if (!groups.length) {
    historyResults.innerHTML = '<div class="empty-state">当前筛选条件下还没有历史展位结果。</div>';
    return;
  }

  historyResults.innerHTML = groups.map((group) => {
    const todayItems = group.matches.filter((item) => item.pageType === "today");
    const gamesItems = group.matches.filter((item) => item.pageType === "games");
    const orderedPages = [
      { label: "Today", items: todayItems },
      { label: "Games", items: gamesItems },
    ].filter((section) => section.items.length);

    return `
      ${orderedPages.map((section) => `
        <article class="page-result history-page-result">
          <div class="page-result-header">
            <div>
              <h2>${escapeHtml(`${group.country} · ${section.label} · ${group.localName || group.countryLabel || group.country}`)}</h2>
              <p>${escapeHtml(`历史命中 ${section.items.length} 个展位`)}</p>
            </div>
            <span class="result-badge hit">${escapeHtml(`${section.items.length} 命中`)}</span>
          </div>
          <div class="match-grid">
            ${section.items.map((match, index) => renderHistoryMatch(match, index, match.checkedAt)).join("")}
          </div>
        </article>
      `).join("")}
    `;
  }).join("");
}

function scrollHistoryResultsToTop(behavior = "smooth") {
  const rect = historyResults.getBoundingClientRect();
  const targetTop = rect.top + window.scrollY - 16;
  window.scrollTo({ top: Math.max(0, targetTop), behavior });
}

async function performSearch() {
  setBusy(true);
  try {
    await loadCountries();
    await loadAnalytics();
  } catch (error) {
    historyRunList.innerHTML = `<div class="error-state">${escapeHtml(error.message || "历史国家列表加载失败")}</div>`;
    historyResults.innerHTML = `<div class="error-state">${escapeHtml(error.message || "历史分析加载失败")}</div>`;
    historyRunCount.textContent = "0";
    historyMatchCount.textContent = "0";
    historyCountryCount.textContent = "0";
    historyRunBadge.textContent = "0 个国家";
  } finally {
    setBusy(false);
  }
}

historyRunList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-country-code]");
  if (!button || state.loading) return;
  state.selectedCountry = button.dataset.countryCode || "";
  renderCountryMenu();
  renderCountrySidebar();
  await performSearch();
  scrollHistoryResultsToTop("smooth");
});

historyDatePicker.addEventListener("click", (event) => {
  const trigger = event.target.closest(".date-trigger");
  if (trigger === historyYearTrigger) return setDateMenu("year");
  if (trigger === historyMonthTrigger) return setDateMenu("month");
  if (trigger === historyDayTrigger) return setDateMenu("day");
  const option = event.target.closest("[data-date-part]");
  if (!option) return;
  const part = option.dataset.datePart;
  const value = option.dataset.dateValue;
  if (!part || !value) return;
  state.historyDate[part] = value;
  if (part !== "day") {
    const maxDay = daysInMonth(state.historyDate.year || new Date().getFullYear(), state.historyDate.month || 1);
    if (state.historyDate.day && Number(state.historyDate.day) > maxDay) {
      state.historyDate.day = "";
    }
  }
  setDateMenu("");
  renderHistoryDatePicker();
});

historyDateClear.addEventListener("click", () => {
  state.historyDate = todayDateState();
  setDateMenu("");
  renderHistoryDatePicker();
});

historyGameTrigger.addEventListener("click", () => {
  if (state.loading) return;
  setHistoryGameMenu(!state.gameMenuOpen);
});

historyGameFilterInput.addEventListener("input", () => {
  state.historyGameFilter = historyGameFilterInput.value || "";
  renderHistoryGames();
});

historyGameFilterInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setHistoryGameMenu(false);
    return;
  }
  if (event.key !== "Enter") return;
  const firstOption = historyGameList.querySelector("[data-history-game-key]");
  if (!firstOption) return;
  state.selectedGameKey = firstOption.dataset.historyGameKey || "";
  state.historyGameFilter = "";
  historyGameFilterInput.value = "";
  setHistoryGameMenu(false);
  renderHistoryGames();
});

historyGameMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-history-game-key]");
  if (!option) return;
  state.selectedGameKey = option.dataset.historyGameKey || "";
  state.historyGameFilter = "";
  historyGameFilterInput.value = "";
  setHistoryGameMenu(false);
  renderHistoryGames();
});

historyAppIdInput.addEventListener("input", () => {
  applyHistoryAppIdSearch();
});

historyAppIdInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    applyHistoryAppIdSearch();
    performSearch();
  }
});

historyCountryTrigger.addEventListener("click", () => {
  if (state.loading) return;
  setHistoryCountryMenu(!state.countryMenuOpen);
});

historyCountryMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-history-country]");
  if (!option) return;
  state.selectedCountry = option.dataset.historyCountry || "";
  setHistoryCountryMenu(false);
  renderCountryMenu();
  renderCountrySidebar();
});

historyPageType.addEventListener("change", (event) => {
  const input = event.target.closest("input[name='historyPageType']");
  if (!input) return;
  state.selectedPageType = input.value || "";
});

historySearch.addEventListener("click", performSearch);

document.addEventListener("click", (event) => {
  if (!event.target.closest("#historyDatePicker")) setDateMenu("");
  if (!event.target.closest(".history-game-picker")) setHistoryGameMenu(false);
  if (!event.target.closest(".history-country-picker")) setHistoryCountryMenu(false);
});

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

async function initHistoryPage() {
  setTheme(currentTheme());
  state.historyDate = todayDateState();
  renderHistoryDatePicker();
  renderHistoryGames();
  resetHistoryAppIdHint();
  renderCountryMenu();
  renderCountrySidebar();
  await loadHistoryGames();
  await performSearch();
}

initHistoryPage();
