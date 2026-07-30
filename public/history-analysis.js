const themeToggle = document.querySelector("#themeToggle");
const analysisStartDate = document.querySelector("#analysisStartDate");
const analysisEndDate = document.querySelector("#analysisEndDate");
const analysisRangeQuick = document.querySelector("#analysisRangeQuick");
const analysisRangeTrigger = document.querySelector("#analysisRangeTrigger");
const analysisRangeMenu = document.querySelector("#analysisRangeMenu");
const analysisRangeList = document.querySelector("#analysisRangeList");
const analysisCustomModal = document.querySelector("#analysisCustomModal");
const analysisCustomStart = document.querySelector("#analysisCustomStart");
const analysisCustomEnd = document.querySelector("#analysisCustomEnd");
const analysisCustomStartLabel = document.querySelector("#analysisCustomStartLabel");
const analysisCustomEndLabel = document.querySelector("#analysisCustomEndLabel");
const analysisCustomApply = document.querySelector("#analysisCustomApply");
const analysisCalendarTitle = document.querySelector("#analysisCalendarTitle");
const analysisCalendarGrid = document.querySelector("#analysisCalendarGrid");
const analysisGameInput = document.querySelector("#analysisGameInput");
const analysisGameClear = document.querySelector("#analysisGameClear");
const analysisGameMenu = document.querySelector("#analysisGameMenu");
const analysisGameTools = document.querySelector("#analysisGameTools");
const analysisGameList = document.querySelector("#analysisGameList");
const analysisGameHint = document.querySelector("#analysisGameHint");
const analysisSearch = document.querySelector("#analysisSearch");
const analysisCountryCount = document.querySelector("#analysisCountryCount");
const analysisTodayCount = document.querySelector("#analysisTodayCount");
const analysisGamesIconCount = document.querySelector("#analysisGamesIconCount");
const analysisGamesBannerCount = document.querySelector("#analysisGamesBannerCount");
const analysisTreeHint = document.querySelector("#analysisTreeHint");
const analysisTreemap = document.querySelector("#analysisTreemap");
const analysisDetailModal = document.querySelector("#analysisDetailModal");
const analysisDetailTitle = document.querySelector("#analysisDetailTitle");
const analysisDetailHint = document.querySelector("#analysisDetailHint");
const analysisDetailBody = document.querySelector("#analysisDetailBody");

const PIE_COLORS = {
  today: "#2563eb",
  icon: "#14b8a6",
  banner: "#f59e0b",
};

const METRIC_DEFS = {
  total: {
    label: "Total",
    valueKey: "total",
    color: "#8b5cf6",
  },
  today: {
    label: "Today",
    valueKey: "todayCount",
    color: PIE_COLORS.today,
  },
  icon: {
    label: "Games · Icon",
    valueKey: "gamesIconCount",
    color: PIE_COLORS.icon,
  },
  banner: {
    label: "Games · Banner",
    valueKey: "gamesBannerCount",
    color: PIE_COLORS.banner,
  },
};

const RANGE_DAYS = {
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "14d": 14,
  "30d": 30,
};

const RANGE_LABELS = {
  "1d": "近 1 天",
  "3d": "近 3 天",
  "7d": "近 7 天",
  "14d": "近 14 天",
  "30d": "近 30 天",
  custom: "自定义",
};

const state = {
  countries: [],
  globalGames: [],
  loading: false,
  loadingGames: false,
  menuOpen: false,
  gameMatches: [],
  selectedMatchKey: "",
  selectedMatchKeys: [],
  selectionMode: "single",
  selectedRange: "7d",
  rangeMenuOpen: false,
  customModalOpen: false,
  activeDateField: "start",
  calendarMonth: null,
  activeMetric: "total",
  aggregated: null,
  detailModalOpen: false,
  detailScrollY: 0,
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

function normalizeLoose(value) {
  return cleanInlineText(value).normalize("NFKC").toLowerCase().replace(/\s+/g, "");
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

function activeMetricDef() {
  return METRIC_DEFS[state.activeMetric] || METRIC_DEFS.total;
}

function metricValue(item, metric = state.activeMetric) {
  const definition = METRIC_DEFS[metric] || METRIC_DEFS.total;
  return Number(item?.[definition.valueKey] || 0);
}

function metricItems(items) {
  const metric = state.activeMetric;
  return items
    .map((item) => ({ item, value: metricValue(item, metric) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || b.item.total - a.item.total || a.item.code.localeCompare(b.item.code));
}

function metricTotal(items) {
  return items.reduce((sum, item) => sum + metricValue(item), 0);
}

function updateMetricTabs() {
  document.querySelectorAll("[data-analysis-metric]").forEach((button) => {
    const active = button.dataset.analysisMetric === state.activeMetric;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.disabled = state.loading;
  });
}

function todayISO() {
  return formatISODate(new Date());
}

function shiftDate(base, offsetDays) {
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return formatISODate(date);
}

function parseISODate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthTitle(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

function sameISODate(date, isoValue) {
  return formatISODate(date) === isoValue;
}

function setActiveDateField(field) {
  state.activeDateField = field === "end" ? "end" : "start";
  document.querySelectorAll("[data-analysis-date-field]").forEach((button) => {
    button.classList.toggle("active", button.dataset.analysisDateField === state.activeDateField);
  });
}

function renderCustomDateLabels() {
  analysisCustomStartLabel.textContent = analysisCustomStart.value || "请选择";
  analysisCustomEndLabel.textContent = analysisCustomEnd.value || "请选择";
}

function renderCalendar() {
  const base = state.calendarMonth || parseISODate(analysisCustomStart.value) || parseISODate(todayISO()) || new Date();
  const month = new Date(base.getFullYear(), base.getMonth(), 1);
  state.calendarMonth = month;
  analysisCalendarTitle.textContent = monthTitle(month);

  const startValue = analysisCustomStart.value;
  const endValue = analysisCustomEnd.value;
  const startDate = parseISODate(startValue);
  const endDate = parseISODate(endValue);
  const firstWeekday = (month.getDay() + 6) % 7;
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
  const today = todayISO();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const iso = formatISODate(current);
    const outside = current.getMonth() !== month.getMonth();
    const selectedStart = iso === startValue;
    const selectedEnd = iso === endValue;
    const inRange = startDate && endDate && current > startDate && current < endDate;
    cells.push(`
      <button
        class="history-analysis-calendar-day${outside ? " outside" : ""}${selectedStart || selectedEnd ? " selected" : ""}${inRange ? " in-range" : ""}${iso === today ? " today" : ""}"
        type="button"
        data-analysis-calendar-date="${escapeHtml(iso)}"
      >
        ${escapeHtml(String(current.getDate()))}
      </button>
    `);
  }

  analysisCalendarGrid.innerHTML = cells.join("");
}

function selectedRangeValue() {
  return state.selectedRange || "7d";
}

function selectedRangeLabel() {
  return RANGE_LABELS[selectedRangeValue()] || "近 7 天";
}

function applyQuickRange(value) {
  if (value === "custom") return;
  const days = RANGE_DAYS[value] || RANGE_DAYS["7d"];
  const end = todayISO();
  analysisStartDate.value = shiftDate(end, -(days - 1));
  analysisEndDate.value = end;
}

function setRangeMenu(open) {
  state.rangeMenuOpen = open;
  analysisRangeMenu.hidden = !open;
  analysisRangeTrigger.setAttribute("aria-expanded", open ? "true" : "false");
}

function setCustomModal(open) {
  state.customModalOpen = open;
  analysisCustomModal.hidden = !open;
  if (!open) return;
  analysisCustomStart.value = analysisStartDate.value || shiftDate(todayISO(), -6);
  analysisCustomEnd.value = analysisEndDate.value || todayISO();
  setActiveDateField("start");
  state.calendarMonth = parseISODate(analysisCustomStart.value) || parseISODate(todayISO());
  renderCustomDateLabels();
  renderCalendar();
  document.querySelector('[data-analysis-date-field="start"]')?.focus();
}

function renderRangeOptions() {
  const current = selectedRangeValue();
  analysisRangeTrigger.querySelector("span").textContent = selectedRangeLabel();
  analysisRangeTrigger.querySelector("strong").textContent = current === "custom"
    ? `${analysisStartDate.value || "开始"} 至 ${analysisEndDate.value || "结束"}`
    : "按已有记录统计";
  analysisRangeList.innerHTML = Object.entries(RANGE_LABELS).map(([value, label]) => {
    const active = value === current;
    const days = RANGE_DAYS[value] || 0;
    const helper = value === "custom" ? "选择开始和结束日期" : `${days} 天范围 · 只看已有记录`;
    return `
      <button class="game-option history-analysis-range-option${active ? " active" : ""}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-analysis-range="${escapeHtml(value)}">
        <span>${escapeHtml(label)}</span>
        <small>${escapeHtml(helper)}</small>
      </button>
    `;
  }).join("");
}

function fetchJson(url, fallbackMessage) {
  return fetch(url, { cache: "no-store" }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || fallbackMessage);
    return data;
  });
}

async function postJson(url, payload, fallbackMessage) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || fallbackMessage);
  return data;
}

function isDigitsOnly(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function isTenDigitAppId(value) {
  return /^\d{10}$/.test(String(value || "").trim());
}

function searchMode(value) {
  const text = String(value || "").trim();
  if (!text) return "empty";
  if (isTenDigitAppId(text)) return "appId";
  if (isDigitsOnly(text)) return "pendingAppId";
  return "name";
}

function gameDisplayLabel(game) {
  const primary = cleanInlineText(game.chineseName || "");
  const secondary = cleanInlineText(game.displayName || game.name || "");
  if (primary && secondary && normalizeLoose(primary) !== normalizeLoose(secondary)) {
    return `${primary} / ${secondary}`;
  }
  return primary || secondary;
}

function countryLabel(countryCode) {
  const country = state.countries.find((item) => item.code === countryCode);
  return country?.localName || country?.label || countryCode;
}

function aliasesForGame(game) {
  const pool = [
    game.displayName,
    game.chineseName,
    game.name,
    ...(Array.isArray(game.aliases) ? game.aliases : []),
  ];
  Object.values(game.countryEntries || {}).forEach((entry) => {
    const localAliases = Array.isArray(entry?.aliases) ? entry.aliases : [];
    pool.push(entry?.name, entry?.displayName, entry?.chineseName, ...localAliases);
  });
  return pool.map(cleanInlineText).filter(Boolean);
}

function makeAnalysisMatch(game, countryCode, countryEntry, matchedAlias = "") {
  const entryAppId = String(countryEntry?.appId || "").trim();
  if (!entryAppId) return null;
  return {
    key: `${game.key}|${countryCode}|${entryAppId}`,
    gameKey: game.key,
    appId: entryAppId,
    countryCode,
    countryLabel: countryLabel(countryCode),
    gameName: countryEntry?.displayName || countryEntry?.name || game.displayName || game.chineseName || "",
    groupName: gameDisplayLabel(game),
    countryCount: (game.countryCodes || []).length,
    matchedAlias,
  };
}

function buildMatchesByAppId(value) {
  const target = String(value || "").trim();
  if (!target) return [];
  const matches = [];
  for (const game of state.globalGames) {
    for (const [countryCode, countryEntry] of Object.entries(game.countryEntries || {})) {
      const entryAppId = String(countryEntry?.appId || "").trim();
      if (entryAppId !== target) continue;
      const match = makeAnalysisMatch(game, countryCode, countryEntry, target);
      if (match) matches.push(match);
    }
  }
  matches.sort((a, b) => (
    a.countryCode.localeCompare(b.countryCode)
    || a.gameName.localeCompare(b.gameName, "zh-CN")
  ));
  return matches;
}

function buildMatchesByName(value) {
  const target = normalizeLoose(value);
  if (!target) return [];
  const matches = [];
  for (const game of state.globalGames) {
    const aliases = aliasesForGame(game);
    const matchedAlias = aliases.find((alias) => normalizeLoose(alias).includes(target));
    if (!matchedAlias) continue;
    for (const [countryCode, countryEntry] of Object.entries(game.countryEntries || {})) {
      const match = makeAnalysisMatch(game, countryCode, countryEntry, matchedAlias);
      if (match) matches.push(match);
    }
  }
  matches.sort((a, b) => {
    const aliasA = normalizeLoose(a.matchedAlias || "");
    const aliasB = normalizeLoose(b.matchedAlias || "");
    const exactA = aliasA === target ? 0 : 1;
    const exactB = aliasB === target ? 0 : 1;
    const startsA = exactA || !aliasA.startsWith(target) ? 1 : 0;
    const startsB = exactB || !aliasB.startsWith(target) ? 1 : 0;
    return exactA - exactB
      || startsA - startsB
      || a.countryCode.localeCompare(b.countryCode)
      || a.gameName.localeCompare(b.gameName, "zh-CN");
  });
  return matches;
}

function buildAnalysisMatches(value) {
  const mode = searchMode(value);
  if (mode === "appId") return buildMatchesByAppId(value);
  if (mode === "name") return buildMatchesByName(value);
  return [];
}

function selectedAnalysisMatch() {
  return state.gameMatches.find((item) => item.key === state.selectedMatchKey) || null;
}

function selectedAnalysisMatches() {
  if (!state.selectedMatchKeys.length) return [];
  const selectedSet = new Set(state.selectedMatchKeys);
  return state.gameMatches.filter((item) => selectedSet.has(item.key));
}

function allMatchesSelected() {
  return state.gameMatches.length > 0 && state.selectedMatchKeys.length === state.gameMatches.length;
}

function selectedMatchesSummary(limit = 2) {
  const selected = selectedAnalysisMatches();
  if (!selected.length) return "未选择游戏";
  if (allMatchesSelected()) return `已选全部 ${selected.length} 条结果`;
  const labels = selected.slice(0, limit).map((item) => `${item.countryCode} · ${item.gameName}`);
  if (selected.length > limit) labels.push(`等 ${selected.length} 条`);
  return labels.join(" · ");
}

function setGameHint(message = "", tone = "") {
  analysisGameHint.textContent = message;
  analysisGameHint.classList.remove("hit", "miss", "show");
  if (tone) analysisGameHint.classList.add(tone);
  if (message) analysisGameHint.classList.add("show");
}

function setGameMenu(open) {
  state.menuOpen = open;
  analysisGameMenu.hidden = !open;
}

function shouldBlockAnalysisEnter(event) {
  return Boolean(event.isComposing || state.menuOpen || state.rangeMenuOpen || state.customModalOpen);
}

function renderGameTools() {
  const allSelected = allMatchesSelected();
  analysisGameTools.innerHTML = `
    <button class="app-id-union-tool history-analysis-tool${allSelected ? " active" : ""}" type="button" data-analysis-all="true">全部</button>
    <button class="app-id-union-tool history-analysis-tool${!allSelected && state.selectionMode === "multi" ? " active" : ""}" type="button" data-analysis-mode="multi">多选</button>
    <button class="app-id-union-tool history-analysis-tool${!allSelected && state.selectionMode === "single" ? " active" : ""}" type="button" data-analysis-mode="single">单选</button>
    <button class="app-id-union-tool history-analysis-tool" type="button" data-analysis-clear="true">清空</button>
    <button class="app-id-union-tool history-analysis-tool done" type="button" data-analysis-close="true">完成</button>
  `;
}

function renderGameMenu() {
  renderGameTools();
  if (!state.gameMatches.length) {
    analysisGameList.innerHTML = '<div class="game-list-state">没有匹配到相关国家和游戏</div>';
    return;
  }
  analysisGameList.innerHTML = state.gameMatches.map((item) => {
    const selected = state.selectedMatchKeys.includes(item.key);
    return `
      <button
        class="game-option app-id-union-option history-analysis-game-option${selected ? " active" : ""}"
        type="button"
        role="option"
        aria-selected="${selected ? "true" : "false"}"
        data-analysis-match-key="${escapeHtml(item.key)}"
      >
        <span>${escapeHtml(`${item.countryCode} · ${item.countryLabel} · ${item.gameName}`)}</span>
        <small>${escapeHtml(`App ID ${item.appId} · 关联 ${item.countryCount} 个国家 / 地区`)}</small>
        <em>${selected ? "已选" : state.selectionMode === "single" ? "点击单选" : "点击加入"}</em>
      </button>
    `;
  }).join("");
}

function refreshGameMatches() {
  const rawValue = String(analysisGameInput.value || "").trim();
  const mode = searchMode(rawValue);
  if (!rawValue) {
    state.gameMatches = [];
    state.selectedMatchKey = "";
    state.selectedMatchKeys = [];
    renderGameMenu();
    setGameMenu(false);
    setGameHint("", "");
    return;
  }
  if (mode === "pendingAppId") {
    state.gameMatches = [];
    state.selectedMatchKey = "";
    state.selectedMatchKeys = [];
    renderGameMenu();
    setGameMenu(false);
    setGameHint("App ID 必须为 10 位才开始搜索", "miss");
    return;
  }
  state.gameMatches = buildAnalysisMatches(rawValue);
  if (!state.gameMatches.some((item) => item.key === state.selectedMatchKey)) {
    state.selectedMatchKey = state.gameMatches[0]?.key || "";
  }
  const validKeys = new Set(state.gameMatches.map((item) => item.key));
  state.selectedMatchKeys = state.selectedMatchKeys.filter((key) => validKeys.has(key));
  if (!state.selectedMatchKeys.length && state.gameMatches.length) {
    state.selectedMatchKeys = state.gameMatches.map((item) => item.key);
  }
  renderGameMenu();
  setGameMenu(true);
  if (!state.gameMatches.length) {
    setGameHint(`未匹配到 ${rawValue} 对应的国家和游戏`, "miss");
    return;
  }
  const selected = selectedAnalysisMatch();
  const selectedCount = allMatchesSelected()
    ? "已选全部地区"
    : state.selectedMatchKeys.length
      ? `已选 ${state.selectedMatchKeys.length} 条`
      : "尚未选择";
  const modeLabel = mode === "name" ? "游戏联想" : "App ID 联想";
  setGameHint(`已联想 ${state.gameMatches.length} 条 · ${selectedCount}`, "hit");
}

function setBusy(isBusy) {
  state.loading = isBusy;
  analysisSearch.disabled = isBusy;
  analysisGameInput.disabled = isBusy || state.loadingGames;
  analysisGameClear.disabled = isBusy;
  analysisRangeTrigger.disabled = isBusy;
  analysisRangeList.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy;
  });
  document.querySelectorAll("[data-analysis-date-field], [data-analysis-calendar-nav], [data-analysis-calendar-date]").forEach((button) => {
    button.disabled = isBusy;
  });
  document.querySelectorAll("[data-analysis-metric]").forEach((button) => {
    button.disabled = isBusy;
  });
  analysisCustomApply.disabled = isBusy;
  analysisSearch.textContent = isBusy ? "分析中" : "开始分析";
}

async function loadConfig() {
  const response = await fetch("/api/config", { cache: "no-store" });
  const config = await response.json();
  if (!response.ok) throw new Error(config.error || "配置加载失败");
  state.countries = (config.countries || []).slice().sort((a, b) => a.code.localeCompare(b.code));
}

async function loadGlobalGames() {
  if (state.globalGames.length) return;
  state.loadingGames = true;
  setBusy(state.loading);
  try {
    const data = await fetchJson("/api/game-catalog", "全局游戏目录加载失败");
    state.globalGames = (data.games || []).map((game) => ({
      ...game,
      displayLabel: gameDisplayLabel(game),
    }));
  } finally {
    state.loadingGames = false;
    setBusy(state.loading);
  }
}

function selectionPayload(matches) {
  return matches.map((item) => ({
    key: item.key,
    gameKey: item.gameKey,
    appId: item.appId,
    country: item.countryCode,
    gameName: item.gameName,
    groupName: item.groupName,
  }));
}

async function loadAnalyticsForSelections(matches) {
  return postJson("/api/history/analytics-batch", {
    selections: selectionPayload(matches),
    dateFrom: analysisStartDate.value,
    dateTo: analysisEndDate.value,
  }, "历史分析加载失败");
}

function buildSelectionLookup(matches) {
  const byCountryApp = new Map();
  const byApp = new Map();
  const byGame = new Map();
  for (const match of matches) {
    byCountryApp.set(`${match.countryCode}|${match.appId}`, match);
    if (!byApp.has(match.appId)) byApp.set(match.appId, match);
    if (!byGame.has(match.gameKey)) byGame.set(match.gameKey, match);
  }
  return { byCountryApp, byApp, byGame };
}

function selectionForItem(item, lookup) {
  const country = cleanInlineText(item.country || "");
  const appId = cleanInlineText(item.app_id || "");
  const gameKey = cleanInlineText(item.game_key || "");
  return lookup.byCountryApp.get(`${country}|${appId}`)
    || lookup.byApp.get(appId)
    || lookup.byGame.get(gameKey)
    || null;
}

function normalizeHistoryMatch(item, selection) {
  let parsed = {};
  try {
    parsed = JSON.parse(item.raw_match || "{}");
  } catch (_error) {
    parsed = {};
  }
  const gameLabel = cleanInlineText(item.game_name || selection?.gameName || selection?.groupName || "");
  return {
    gameKey: item.game_key || selection?.gameKey || "",
    gameLabel,
    gamePrimary: cleanInlineText(selection?.groupName || gameLabel),
    appId: item.app_id || selection?.appId || "",
    country: item.country || "",
    countryLabel: item.countryLabel || item.country_label || "",
    localName: item.localName || item.local_name || "",
    pageType: item.page_type || parsed.pageType || "",
    pageLabel: item.page_label || parsed.pageLabel || item.page_type || "",
    mediaMode: item.media_mode || parsed.mediaMode || "",
    groupTitle: cleanInlineText(item.group_title || parsed.groupTitle || ""),
    headerTitle: cleanInlineText(parsed.headerTitle || parsed.cardHeaderTitle || ""),
    sectionTitle: cleanInlineText(item.section_title || parsed.sectionTitle || ""),
    placementTitle: cleanInlineText(item.placement_title || parsed.placementTitle || ""),
    subtitle: cleanInlineText(item.subtitle || parsed.subtitle || ""),
    appTitle: cleanInlineText(parsed.appTitle || item.game_name || gameLabel),
    appSubtitle: cleanInlineText(parsed.appSubtitle || parsed.subtitle || item.subtitle || ""),
    syncDate: item.sync_date || String(item.checked_at || parsed.checkedAt || "").slice(0, 10),
    checkedAt: item.checked_at || parsed.checkedAt || "",
    image: item.image || parsed.image || parsed.heroImage || "",
    iconImage: parsed.iconImage || parsed.appIcon || "",
    placementType: cleanInlineText(parsed.placementType || item.placement_type || ""),
  };
}

function isGamesBanner(match) {
  if (match.pageType !== "games") return false;
  const text = `${match.mediaMode || ""} ${match.placementType || ""} ${match.pageLabel || ""}`.toLowerCase();
  return text.includes("carousel")
    || text.includes("banner")
    || text.includes("轮播")
    || text.includes("顶部轮播");
}

function isGamesIcon(match) {
  return match.pageType === "games" && !isGamesBanner(match);
}

function matchMetricType(match) {
  if (match.pageType === "today") return "today";
  if (isGamesBanner(match)) return "banner";
  if (isGamesIcon(match)) return "icon";
  return "";
}

function titleForDedup(match) {
  return cleanInlineText(match.placementTitle || match.sectionTitle || match.groupTitle || match.headerTitle || match.appTitle || "");
}

function imageKey(value) {
  return String(value || "").replace(/\/\d+x\d+[^/]*\.(jpg|png|webp)$/i, "/{size}.$1");
}

function historyDedupKey(match) {
  const metricType = matchMetricType(match) || match.mediaMode || "";
  const displayTitle = titleForDedup(match) || cleanInlineText(match.subtitle || match.appTitle || "");
  const gameIdentity = match.appId || match.appTitle || match.gameLabel || "";
  const sectionIdentity = match.sectionTitle || "";
  const placementIdentity = match.placementType || "";
  return [
    match.country,
    match.pageType,
    metricType,
    sectionIdentity,
    placementIdentity,
    gameIdentity,
    displayTitle,
  ].map((part) => cleanInlineText(part || "").toLowerCase()).join("|");
}

function dedupeHistoryMatches(matches) {
  const bucket = new Map();
  for (const match of matches) {
    const key = historyDedupKey(match);
    if (!bucket.has(key)) {
      bucket.set(key, {
        ...match,
        dedupKey: key,
        rawCount: 0,
        dates: [],
        firstDate: "",
        latestDate: "",
        occurrences: [],
      });
    }
    const entry = bucket.get(key);
    entry.occurrences.push(match);
    if (match.syncDate && !entry.dates.includes(match.syncDate)) entry.dates.push(match.syncDate);
    if (match.checkedAt && String(match.checkedAt).localeCompare(String(entry.checkedAt || "")) > 0) {
      entry.checkedAt = match.checkedAt;
      entry.image = match.image || entry.image;
      entry.subtitle = match.subtitle || entry.subtitle;
      entry.description = match.description || entry.description;
    }
  }
  return Array.from(bucket.values()).map((entry) => {
    entry.dates.sort();
    entry.firstDate = entry.dates[0] || entry.syncDate || "";
    entry.latestDate = entry.dates[entry.dates.length - 1] || entry.syncDate || "";
    entry.syncDate = entry.latestDate || entry.syncDate;
    entry.rawCount = entry.dates.length || entry.occurrences.length || 1;
    return entry;
  });
}

function matchesForMetric(matches, metric = state.activeMetric) {
  if (metric === "today") return matches.filter((item) => item.pageType === "today");
  if (metric === "icon") return matches.filter((item) => isGamesIcon(item));
  if (metric === "banner") return matches.filter((item) => isGamesBanner(item));
  return matches;
}

function uniqueValues(items, selector, limit = 4) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const value = cleanInlineText(selector(item));
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function uniqueGames(items, limit = 5) {
  return uniqueValues(items, (item) => item.gameLabel, limit);
}

function buildCountryAnalysis(code, matches) {
  const uniqueMatches = dedupeHistoryMatches(matches);
  const sortedMatches = uniqueMatches.slice().sort((a, b) => String(b.checkedAt || "").localeCompare(String(a.checkedAt || "")));
  const todayMatches = sortedMatches.filter((item) => item.pageType === "today");
  const bannerMatches = sortedMatches.filter((item) => isGamesBanner(item));
  const iconMatches = sortedMatches.filter((item) => isGamesIcon(item));
  const dates = uniqueValues(matches, (item) => item.syncDate, 999);
  const localName = sortedMatches[0]?.localName || matches[0]?.localName || matches[0]?.countryLabel || code;
  return {
    code,
    localName,
    total: sortedMatches.length,
    rawTotal: matches.length,
    uniqueMatches: sortedMatches,
    latestCheckedAt: sortedMatches[0]?.checkedAt || "",
    todayCount: todayMatches.length,
    gamesBannerCount: bannerMatches.length,
    gamesIconCount: iconMatches.length,
    dates,
    matchDates: dates.slice(0, 6),
    relatedGames: uniqueGames(sortedMatches, 6),
    todayTitles: uniqueValues(todayMatches, (item) => item.placementTitle || item.sectionTitle || item.groupTitle || item.headerTitle || item.appTitle, 4),
    bannerTitles: uniqueValues(bannerMatches, (item) => item.placementTitle || item.sectionTitle || item.groupTitle || item.headerTitle || item.appTitle, 4),
    iconTitles: uniqueValues(iconMatches, (item) => item.placementTitle || item.sectionTitle || item.groupTitle || item.headerTitle || item.appTitle, 4),
  };
}

async function buildAggregatedAnalytics() {
  const matches = selectedAnalysisMatches();
  const data = await loadAnalyticsForSelections(matches);
  const lookup = buildSelectionLookup(matches);
  const countryMap = new Map();
  for (const group of data.groups || []) {
    const code = group.country || "";
    if (!code) continue;
    if (!countryMap.has(code)) countryMap.set(code, []);
    const bucket = countryMap.get(code);
    for (const item of group.matches || []) {
      bucket.push(normalizeHistoryMatch(item, selectionForItem(item, lookup)));
    }
  }
  const countries = Array.from(countryMap.entries()).map(([code, matchesForCountry]) => buildCountryAnalysis(code, matchesForCountry));
  countries.sort((a, b) => b.total - a.total || b.todayCount - a.todayCount || a.code.localeCompare(b.code));
  state.aggregated = {
    matches,
    countries,
    summary: data.summary || {},
  };
}

function dateCopyForItems(items) {
  const dateSet = new Set(items.flatMap((item) => item.dates || []));
  return dateSet.size
    ? `实际命中 ${dateSet.size} 天`
    : "所选范围内暂无已有记录";
}

function renderMetricContext(items) {
  const metric = activeMetricDef();
  const total = metricTotal(items);
  const countryCount = metricItems(items).length;
  const label = selectedMatchesSummary();
  const rangeCopy = `${selectedRangeLabel()}（${analysisStartDate.value} 至 ${analysisEndDate.value}）`;
  const dateCopy = dateCopyForItems(items);
  analysisTreeHint.textContent = total
    ? `${label} · ${rangeCopy} · ${dateCopy} · 当前 ${metric.label}，${countryCount} 个国家 / 地区有命中。`
    : `${label} · ${rangeCopy} · ${metric.label} 暂无历史命中。`;
}

function renderSummary(items) {
  const todayTotal = items.reduce((sum, item) => sum + item.todayCount, 0);
  const iconTotal = items.reduce((sum, item) => sum + item.gamesIconCount, 0);
  const bannerTotal = items.reduce((sum, item) => sum + item.gamesBannerCount, 0);
  analysisCountryCount.textContent = String(items.length);
  analysisTodayCount.textContent = String(todayTotal);
  analysisGamesIconCount.textContent = String(iconTotal);
  analysisGamesBannerCount.textContent = String(bannerTotal);
  renderMetricContext(items);
  return { todayTotal, iconTotal, bannerTotal };
}

function renderTreemap(items) {
  const metric = activeMetricDef();
  const ranked = metricItems(items);
  if (!ranked.length) {
    analysisTreemap.innerHTML = `<div class="empty-state">当前日期范围内还没有 ${escapeHtml(metric.label)} 国家排行数据。</div>`;
    return;
  }
  const total = ranked.reduce((sum, entry) => sum + entry.value, 0) || 1;
  const maxValue = Math.max(...ranked.map((entry) => entry.value), 1);
  analysisTreemap.innerHTML = `
    <div class="history-analysis-rank-chart">
      ${ranked.slice(0, 12).map(({ item, value }, index) => {
        const width = Math.max(5, (value / maxValue) * 100);
        const share = ((value / total) * 100).toFixed(1);
        return `
          <button class="history-analysis-rank-row" type="button" data-analysis-country-detail="${escapeHtml(item.code)}">
            <span class="history-analysis-rank-index">${escapeHtml(String(index + 1))}</span>
            <span class="history-analysis-rank-country">
              <strong>${escapeHtml(`${item.code} · ${item.localName}`)}</strong>
              <small>${escapeHtml(`${metric.label} ${value} 去重命中 · ${share}% · 原始 ${item.rawTotal || item.total}`)}</small>
            </span>
            <span class="history-analysis-rank-track">
              <span class="history-analysis-rank-fill" style="width:${width}%; background:${metric.color}"></span>
            </span>
            <span class="history-analysis-rank-count">
              <strong>${escapeHtml(String(value))}</strong>
              <small>${escapeHtml(`${share}%`)}</small>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function setDetailModal(open) {
  if (open && !state.detailModalOpen) {
    state.detailScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${state.detailScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }
  if (!open && state.detailModalOpen) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, state.detailScrollY || 0);
  }
  state.detailModalOpen = open;
  analysisDetailModal.hidden = !open;
}

function detailTitle(match) {
  return titleForDedup(match) || match.subtitle || match.appTitle || "未命名展位";
}

function normalizeImageUrl(value) {
  return String(value || "").split("?")[0].replace(/\/\d+x\d+[^/]*\.(jpg|png|webp)$/i, "/{size}.$1");
}

function shouldRenderAsIcon(match) {
  const image = normalizeImageUrl(match.image);
  const icon = normalizeImageUrl(match.iconImage);
  if (!image) return false;
  if (icon && image === icon) return true;
  return /AppIcon|Icon-|iconArtwork|512x512/i.test(match.image || "");
}

function detailMeta(match) {
  const page = match.pageLabel || match.pageType || "-";
  const metricType = matchMetricType(match);
  const placement = match.placementType || (metricType === "banner" ? "Games · Banner" : metricType === "icon" ? "Games · Icon" : "展位");
  const category = match.sectionTitle && match.sectionTitle !== placement ? ` · ${match.sectionTitle}` : "";
  const hitDays = match.dates?.length || (match.syncDate ? 1 : 0);
  return `${page} · ${placement}${category} · 命中 ${hitDays} 天 · 原始 ${match.rawCount || 1} 条`;
}

function detailGroupDef(type) {
  if (type === "today") return { key: "today", label: "Today", color: PIE_COLORS.today };
  if (type === "icon") return { key: "icon", label: "Games · Icon", color: PIE_COLORS.icon };
  if (type === "banner") return { key: "banner", label: "Games · Banner", color: PIE_COLORS.banner };
  return { key: "other", label: "其他", color: "#64748b" };
}

function groupDetailMatches(matches) {
  const order = ["today", "icon", "banner", "other"];
  const groups = new Map(order.map((key) => [key, []]));
  for (const match of matches) {
    const key = matchMetricType(match) || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(match);
  }
  return order
    .map((key) => ({ ...detailGroupDef(key), matches: groups.get(key) || [] }))
    .filter((group) => group.matches.length);
}

function renderDetailItems(matches) {
  if (!matches.length) return '<div class="empty-state">当前维度暂无去重命中明细。</div>';
  return groupDetailMatches(matches).map((group) => {
    const rawCount = group.matches.reduce((sum, item) => sum + Number(item.rawCount || 1), 0);
    return `
      <section class="history-analysis-detail-group">
        <div class="history-analysis-detail-group-head">
          <span style="background:${group.color}"></span>
          <strong>${escapeHtml(group.label)}</strong>
          <small>${group.matches.length} 条去重 · 原始 ${rawCount} 条</small>
        </div>
        <div class="history-analysis-detail-list">
          ${group.matches.map((match) => `
            <article class="history-analysis-detail-item${shouldRenderAsIcon(match) ? " is-icon" : ""}">
              ${match.image ? `<img src="${escapeHtml(match.image)}" alt="" loading="lazy">` : '<div class="history-analysis-detail-image-empty">无图片</div>'}
              <div>
                <div class="history-analysis-detail-kicker">${escapeHtml(detailMeta(match))}</div>
                <h3>${escapeHtml(detailTitle(match))}</h3>
                ${match.subtitle && match.subtitle !== detailTitle(match) ? `<p>${escapeHtml(match.subtitle)}</p>` : ""}
                <small>${escapeHtml(`${match.appTitle || match.gameLabel || "未命名游戏"}${match.appId ? ` · App ID ${match.appId}` : ""}`)}</small>
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function openCountryDetail(countryCode) {
  const country = (state.aggregated?.countries || []).find((item) => item.code === countryCode);
  if (!country) return;
  const metric = activeMetricDef();
  const matches = matchesForMetric(country.uniqueMatches || [], state.activeMetric)
    .slice()
    .sort((a, b) => String(b.latestDate || b.syncDate || "").localeCompare(String(a.latestDate || a.syncDate || "")));
  const rawCount = matches.reduce((sum, item) => sum + Number(item.rawCount || 1), 0);
  analysisDetailTitle.textContent = `${country.code} · ${country.localName}`;
  analysisDetailHint.textContent = `${metric.label} 去重命中 ${matches.length} 条 · 原始记录 ${rawCount} 条 · ${analysisStartDate.value} 至 ${analysisEndDate.value}`;
  analysisDetailBody.innerHTML = renderDetailItems(matches);
  setDetailModal(true);
}

function renderMetricViews() {
  updateMetricTabs();
  const items = state.aggregated?.countries || [];
  renderMetricContext(items);
  renderTreemap(items);
}

async function performSearch() {
  await loadGlobalGames();
  if (selectedRangeValue() !== "custom" || !analysisStartDate.value || !analysisEndDate.value) {
    applyQuickRange(selectedRangeValue());
  }
  if (!state.selectedMatchKeys.length && analysisGameInput.value.trim()) refreshGameMatches();
  if (!state.selectedMatchKeys.length) {
    setGameHint("请先输入 App ID 或游戏名，并选择一个或多个结果", "miss");
    analysisTreemap.innerHTML = '<div class="empty-state">请先选择至少一个游戏结果。</div>';
    return;
  }
  setBusy(true);
  try {
    await buildAggregatedAnalytics();
    const items = state.aggregated?.countries || [];
    renderSummary(items);
    renderMetricViews();
  } catch (error) {
    analysisCountryCount.textContent = "0";
    analysisTodayCount.textContent = "0";
    analysisGamesIconCount.textContent = "0";
    analysisGamesBannerCount.textContent = "0";
    analysisTreemap.innerHTML = `<div class="error-state">${escapeHtml(error.message || "历史分析加载失败")}</div>`;
  } finally {
    setBusy(false);
  }
}

analysisRangeTrigger.addEventListener("click", () => {
  if (state.loading) return;
  setGameMenu(false);
  setRangeMenu(!state.rangeMenuOpen);
});

analysisRangeList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-analysis-range]");
  if (!button || state.loading) return;
  const nextRange = button.dataset.analysisRange || "7d";
  if (nextRange === "custom") {
    if (!analysisStartDate.value || !analysisEndDate.value) applyQuickRange("7d");
    setRangeMenu(false);
    setCustomModal(true);
    return;
  }
  state.selectedRange = nextRange;
  applyQuickRange(state.selectedRange);
  renderRangeOptions();
  setRangeMenu(false);
});

analysisCustomModal.addEventListener("click", (event) => {
  const fieldButton = event.target.closest("[data-analysis-date-field]");
  if (fieldButton) {
    setActiveDateField(fieldButton.dataset.analysisDateField || "start");
    renderCalendar();
    return;
  }
  const navButton = event.target.closest("[data-analysis-calendar-nav]");
  if (navButton) {
    const offset = Number(navButton.dataset.analysisCalendarNav || 0);
    const base = state.calendarMonth || parseISODate(todayISO()) || new Date();
    state.calendarMonth = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    renderCalendar();
    return;
  }
  const dateButton = event.target.closest("[data-analysis-calendar-date]");
  if (dateButton) {
    const value = dateButton.dataset.analysisCalendarDate || "";
    if (state.activeDateField === "start") {
      analysisCustomStart.value = value;
      if (!analysisCustomEnd.value || value > analysisCustomEnd.value) {
        analysisCustomEnd.value = value;
      }
      setActiveDateField("end");
    } else {
      analysisCustomEnd.value = value;
      if (!analysisCustomStart.value || analysisCustomStart.value > value) {
        analysisCustomStart.value = value;
      }
    }
    const selectedDate = parseISODate(value);
    if (selectedDate) state.calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    renderCustomDateLabels();
    renderCalendar();
    return;
  }
  if (!event.target.closest("[data-analysis-custom-close]")) return;
  setCustomModal(false);
});

analysisCustomApply.addEventListener("click", () => {
  const start = cleanInlineText(analysisCustomStart.value || "");
  const end = cleanInlineText(analysisCustomEnd.value || "");
  if (!start || !end) {
    setGameHint("请选择完整的自定义日期范围", "miss");
    return;
  }
  if (start > end) {
    setGameHint("自定义开始日期不能晚于结束日期", "miss");
    return;
  }
  state.selectedRange = "custom";
  analysisStartDate.value = start;
  analysisEndDate.value = end;
  renderRangeOptions();
  setCustomModal(false);
});

analysisGameInput.addEventListener("focus", async () => {
  await loadGlobalGames();
  if (analysisGameInput.value.trim()) refreshGameMatches();
});

analysisGameInput.addEventListener("input", async () => {
  await loadGlobalGames();
  state.selectedMatchKey = "";
  refreshGameMatches();
});

analysisGameInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (shouldBlockAnalysisEnter(event)) return;
    setGameMenu(false);
    await performSearch();
  }
});

analysisGameMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  const modeButton = event.target.closest("[data-analysis-mode]");
  const allButton = event.target.closest("[data-analysis-all]");
  const clearButton = event.target.closest("[data-analysis-clear]");
  const closeButton = event.target.closest("[data-analysis-close]");
  const optionButton = event.target.closest("[data-analysis-match-key]");
  if (modeButton) {
    state.selectionMode = modeButton.dataset.analysisMode === "multi" ? "multi" : "single";
    state.selectedMatchKey = "";
    state.selectedMatchKeys = [];
    renderGameMenu();
    setGameHint(`已切换为${state.selectionMode === "multi" ? "多选" : "单选"}模式，并清空当前选择`, "miss");
    return;
  }
  if (allButton) {
    state.selectedMatchKeys = state.gameMatches.map((item) => item.key);
    state.selectedMatchKey = state.gameMatches[0]?.key || "";
    renderGameMenu();
    setGameHint(`已选择全部地区，共 ${state.gameMatches.length} 条结果`, "hit");
    return;
  }
  if (clearButton) {
    state.selectedMatchKey = "";
    state.selectedMatchKeys = [];
    renderGameMenu();
    setGameHint("已清空当前选择", "miss");
    return;
  }
  if (closeButton) {
    setGameMenu(false);
    return;
  }
  if (!optionButton) return;
  const key = optionButton.dataset.analysisMatchKey || "";
  state.selectedMatchKey = key;
  if (state.selectionMode === "single") {
    state.selectedMatchKeys = [key];
  } else if (state.selectedMatchKeys.includes(key)) {
    state.selectedMatchKeys = state.selectedMatchKeys.filter((item) => item !== key);
    if (!state.selectedMatchKeys.length) state.selectedMatchKeys = [key];
  } else {
    state.selectedMatchKeys = [...state.selectedMatchKeys, key];
  }
  renderGameMenu();
  const selected = selectedAnalysisMatch();
  if (selected && searchMode(analysisGameInput.value) === "appId") {
    analysisGameInput.value = selected.appId;
  }
  setGameHint(selected ? `已选择 ${state.selectedMatchKeys.length} 条 · 当前 ${selected.countryCode} · ${selected.gameName}` : selectedMatchesSummary(), state.selectedMatchKeys.length ? "hit" : "miss");
  if (state.selectionMode === "single") setGameMenu(false);
});

analysisGameClear.addEventListener("click", () => {
  analysisGameInput.value = "";
  state.selectedMatchKey = "";
  state.selectedMatchKeys = [];
  state.gameMatches = [];
  setGameHint("", "");
  renderGameMenu();
  setGameMenu(false);
});

analysisSearch.addEventListener("click", async () => {
  await performSearch();
});

document.addEventListener("click", (event) => {
  const metricButton = event.target.closest("[data-analysis-metric]");
  if (!metricButton || state.loading) return;
  event.preventDefault();
  const metric = metricButton.dataset.analysisMetric || "today";
  if (!METRIC_DEFS[metric]) return;
  if (metric === state.activeMetric) {
    updateMetricTabs();
    metricButton.blur();
    return;
  }
  const metricBar = metricButton.closest(".history-analysis-metric-bar");
  const beforeTop = metricBar ? metricBar.getBoundingClientRect().top : null;
  state.activeMetric = metric;
  renderMetricViews();
  metricButton.blur();
  if (beforeTop === null || !metricBar) return;
  const keepMetricBarStill = () => {
    const afterTop = metricBar.getBoundingClientRect().top;
    window.scrollBy(0, afterTop - beforeTop);
  };
  keepMetricBarStill();
  requestAnimationFrame(keepMetricBarStill);
});

analysisTreemap.addEventListener("click", (event) => {
  const row = event.target.closest("[data-analysis-country-detail]");
  if (!row || state.loading) return;
  openCountryDetail(row.dataset.analysisCountryDetail || "");
});

document.addEventListener("click", (event) => {
  if (state.menuOpen && !event.target.closest(".history-analysis-search-shell")) {
    setGameMenu(false);
  }
  if (state.rangeMenuOpen && !event.target.closest(".history-analysis-range-picker")) {
    setRangeMenu(false);
  }
});

analysisDetailModal.addEventListener("click", (event) => {
  if (!event.target.closest("[data-analysis-detail-close]")) return;
  setDetailModal(false);
});

analysisDetailBody.addEventListener("wheel", (event) => {
  event.stopPropagation();
}, { passive: true });

analysisDetailBody.addEventListener("touchmove", (event) => {
  event.stopPropagation();
}, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.customModalOpen) {
    setCustomModal(false);
    return;
  }
  if (event.key === "Escape" && state.detailModalOpen) {
    setDetailModal(false);
  }
});

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

async function bootstrap() {
  setTheme(currentTheme());
  renderRangeOptions();
  updateMetricTabs();
  applyQuickRange(selectedRangeValue());
  await loadConfig();
  await loadGlobalGames();
  renderGameMenu();
  analysisTreeHint.textContent = "输入 App ID 或游戏名后，选择历史库中要分析的国家和游戏结果。";
  analysisTreemap.innerHTML = '<div class="empty-state">选择日期范围和游戏后，这里会展示国家排行。</div>';
}

bootstrap().catch((error) => {
  analysisTreemap.innerHTML = `<div class="error-state">${escapeHtml(error.message || "历史分析初始化失败")}</div>`;
});
