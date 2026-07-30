const themeToggle = document.querySelector("#themeToggle");
const schedulerInterval = document.querySelector("#schedulerInterval");
const schedulerTrigger = document.querySelector("#schedulerTrigger");
const schedulerMenu = document.querySelector("#schedulerMenu");
const schedulerList = document.querySelector("#schedulerList");
const schedulerToggle = document.querySelector("#schedulerToggle");
const schedulerRunOnce = document.querySelector("#schedulerRunOnce");
const schedulerHint = document.querySelector("#schedulerHint");
const appIdUnionInput = document.querySelector("#appIdUnionInput");
const appIdUnionToday = document.querySelector("#appIdUnionToday");
const appIdUnionGames = document.querySelector("#appIdUnionGames");
const appIdUnionMenu = document.querySelector("#appIdUnionMenu");
const appIdUnionTools = document.querySelector("#appIdUnionTools");
const appIdUnionList = document.querySelector("#appIdUnionList");
const appIdUnionHint = document.querySelector("#appIdUnionHint");
const runAppIdUnionButton = document.querySelector("#runAppIdUnionButton");
const progressArea = document.querySelector("#progressArea");
const progressText = document.querySelector("#progressText");
const resultsEl = document.querySelector("#results");
const pageResultTemplate = document.querySelector("#pageResultTemplate");
const metricPages = document.querySelector("#metricPages");
const metricMatches = document.querySelector("#metricMatches");
const metricSections = document.querySelector("#metricSections");

const state = {
  countries: [],
  globalGames: [],
  selectedResultCountry: "",
  analysisData: null,
  loadingGlobalGames: false,
  appIdUnionMenuOpen: false,
  resultCountryMenuOpen: false,
  schedulerMenuOpen: false,
  analysisBusy: false,
  schedulerState: null,
  appIdUnionMatches: [],
  selectedAppIdUnionKey: "",
  selectedAppIdUnionKeys: [],
  appIdUnionSelectMode: "single",
  appIdUnionPageTypes: ["today", "games"]
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setSummary(pages = 0, matches = 0, sections = 0) {
  metricPages.textContent = pages;
  metricMatches.textContent = matches;
  metricSections.textContent = sections;
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

function schedulerRunning() {
  return Boolean(state.schedulerState?.running);
}

function refreshInteractionState() {
  const locked = state.analysisBusy || schedulerRunning();
  appIdUnionInput.disabled = locked || state.loadingGlobalGames;
  runAppIdUnionButton.disabled = locked || state.loadingGlobalGames;
  if (schedulerTrigger) schedulerTrigger.disabled = schedulerRunning();
}

function resetAppIdUnionHint(message = "", tone = "") {
  appIdUnionHint.textContent = message;
  appIdUnionHint.classList.remove("hit", "miss");
  if (tone) appIdUnionHint.classList.add(tone);
}

function isTenDigitAppId(value) {
  return /^\d{10}$/.test(String(value || "").trim());
}

function isDigitsOnly(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function appIdUnionQueryMode(value) {
  const text = String(value || "").trim();
  if (!text) return "empty";
  if (isTenDigitAppId(text)) return "appId";
  if (isDigitsOnly(text)) return "pendingAppId";
  return "name";
}

function findGlobalGameByAppId(appId) {
  const target = String(appId || "").trim();
  if (!target) return null;
  for (const game of state.globalGames) {
    const entries = game.countryEntries || {};
    for (const [countryCode, countryEntry] of Object.entries(entries)) {
      if (String(countryEntry?.appId || "").trim() === target) {
        return { game, countryCode, countryEntry };
      }
    }
  }
  return null;
}

function buildAppIdUnionMatchesByAppId(value) {
  const target = String(value || "").trim();
  if (!target) return [];
  const matches = [];
  for (const game of state.globalGames) {
    const entries = game.countryEntries || {};
    for (const [countryCode, countryEntry] of Object.entries(entries)) {
    const entryAppId = String(countryEntry?.appId || "").trim();
    if (!entryAppId) continue;
      const matched = entryAppId === target;
      if (!matched) continue;
      const countryMeta = state.countries.find((item) => item.code === countryCode);
      matches.push({
        key: `${game.key}|${countryCode}|${entryAppId}`,
        gameKey: game.key,
        appId: entryAppId,
        countryCode,
        countryLabel: countryMeta?.localName || countryMeta?.label || countryCode,
        gameName: countryEntry?.displayName || countryEntry?.name || game.displayName,
        groupName: game.displayName,
        countryCount: (game.countryCodes || []).length,
      });
    }
  }
  matches.sort((a, b) => {
    const exactA = a.appId === target ? 0 : 1;
    const exactB = b.appId === target ? 0 : 1;
    return exactA - exactB || a.countryCode.localeCompare(b.countryCode) || a.gameName.localeCompare(b.gameName);
  });
  return matches;
}

function buildAppIdUnionMatchesByName(value) {
  const target = normalizeLoose(value);
  if (!target) return [];
  const matches = [];
  for (const game of state.globalGames) {
    const aliases = [
      game.displayName,
      game.chineseName,
      ...(Array.isArray(game.aliases) ? game.aliases : []),
      ...Object.values(game.countryEntries || {}).flatMap((entry) => {
        const localAliases = Array.isArray(entry?.aliases) ? entry.aliases : [];
        return [entry?.name, entry?.displayName, entry?.chineseName, ...localAliases].filter(Boolean);
      }),
    ].filter(Boolean);
    const matchedAlias = aliases.find((alias) => normalizeLoose(alias).includes(target));
    if (!matchedAlias) continue;
    const entries = game.countryEntries || {};
    for (const [countryCode, countryEntry] of Object.entries(entries)) {
      const entryAppId = String(countryEntry?.appId || "").trim();
      if (!entryAppId) continue;
      const countryMeta = state.countries.find((item) => item.code === countryCode);
      matches.push({
        key: `${game.key}|${countryCode}|${entryAppId}`,
        gameKey: game.key,
        appId: entryAppId,
        countryCode,
        countryLabel: countryMeta?.localName || countryMeta?.label || countryCode,
        gameName: countryEntry?.displayName || countryEntry?.name || game.displayName,
        groupName: game.displayName,
        countryCount: (game.countryCodes || []).length,
        matchedAlias,
      });
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
      || a.gameName.localeCompare(b.gameName);
  });
  return matches;
}

function buildAppIdUnionMatches(value) {
  const mode = appIdUnionQueryMode(value);
  if (mode === "appId") return buildAppIdUnionMatchesByAppId(value);
  if (mode === "name") return buildAppIdUnionMatchesByName(value);
  return [];
}

function renderAppIdUnionMatches() {
  const allSelected = allAppIdUnionSelected();
  appIdUnionTools.innerHTML = `
    <button class="app-id-union-tool${allSelected ? " active" : ""}" type="button" data-appid-union-all="true">全部</button>
    <button class="app-id-union-tool${!allSelected && state.appIdUnionSelectMode === "multi" ? " active" : ""}" type="button" data-appid-mode="multi">多选</button>
    <button class="app-id-union-tool${!allSelected && state.appIdUnionSelectMode === "single" ? " active" : ""}" type="button" data-appid-mode="single">单选</button>
    <button class="app-id-union-tool" type="button" data-appid-union-clear="true">清空</button>
    <button class="app-id-union-tool done" type="button" data-appid-union-close="true">完成</button>
  `;
  if (!state.appIdUnionMatches.length) {
    appIdUnionList.innerHTML = '<div class="game-list-state">没有匹配到相关国家和游戏</div>';
    return;
  }
  appIdUnionList.innerHTML = `${state.appIdUnionMatches.map((item) => `
    <button class="game-option app-id-union-option${state.selectedAppIdUnionKeys.includes(item.key) ? " active" : ""}" type="button" role="option" aria-selected="${state.selectedAppIdUnionKeys.includes(item.key) ? "true" : "false"}" data-appid-union-key="${escapeHtml(item.key)}">
      <span>${escapeHtml(`${item.countryCode} · ${item.countryLabel} · ${item.gameName}`)}</span>
      <small>${escapeHtml(`App ID ${item.appId} · 关联 ${item.countryCount} 个国家 / 地区`)}</small>
      <em>${state.selectedAppIdUnionKeys.includes(item.key) ? "已选" : state.appIdUnionSelectMode === "single" ? "点击单选" : "点击加入"}</em>
    </button>
  `).join("")}`;
}

function setAppIdUnionMenu(open) {
  state.appIdUnionMenuOpen = open;
  appIdUnionMenu.hidden = !open;
}

function shouldBlockAppIdUnionEnter(event) {
  return Boolean(event.isComposing || state.appIdUnionMenuOpen);
}

function selectedAppIdUnionMatch() {
  return state.appIdUnionMatches.find((item) => item.key === state.selectedAppIdUnionKey) || null;
}

function selectedAppIdUnionMatches() {
  if (!state.selectedAppIdUnionKeys.length) return [];
  const selectedSet = new Set(state.selectedAppIdUnionKeys);
  return state.appIdUnionMatches.filter((item) => selectedSet.has(item.key));
}

function allAppIdUnionSelected() {
  return state.appIdUnionMatches.length > 0 && state.selectedAppIdUnionKeys.length === state.appIdUnionMatches.length;
}

function refreshAppIdUnionMatches() {
  const rawValue = String(appIdUnionInput.value || "").trim();
  const mode = appIdUnionQueryMode(rawValue);
  if (!rawValue) {
    state.appIdUnionMatches = [];
    state.selectedAppIdUnionKey = "";
    state.selectedAppIdUnionKeys = [];
    setAppIdUnionMenu(false);
    resetAppIdUnionHint();
    return;
  }
  if (mode === "pendingAppId") {
    state.appIdUnionMatches = [];
    state.selectedAppIdUnionKey = "";
    state.selectedAppIdUnionKeys = [];
    setAppIdUnionMenu(false);
    resetAppIdUnionHint("App ID 必须为 10 位才开始搜索", "miss");
    return;
  }
  state.appIdUnionMatches = buildAppIdUnionMatches(rawValue);
  if (!state.appIdUnionMatches.some((item) => item.key === state.selectedAppIdUnionKey)) {
    state.selectedAppIdUnionKey = state.appIdUnionMatches[0]?.key || "";
  }
  const validKeys = new Set(state.appIdUnionMatches.map((item) => item.key));
  state.selectedAppIdUnionKeys = state.selectedAppIdUnionKeys.filter((key) => validKeys.has(key));
  if (!state.selectedAppIdUnionKeys.length && state.appIdUnionMatches.length) {
    state.selectedAppIdUnionKeys = state.appIdUnionMatches.map((item) => item.key);
  }
  renderAppIdUnionMatches();
  if (!state.appIdUnionMatches.length) {
    setAppIdUnionMenu(true);
    resetAppIdUnionHint(`未匹配到 ${rawValue} 对应的国家和游戏`, "miss");
    return;
  }
  const selected = selectedAppIdUnionMatch();
  setAppIdUnionMenu(true);
  const selectedCount = allAppIdUnionSelected()
    ? "已选全部地区"
    : state.selectedAppIdUnionKeys.length
      ? `已选 ${state.selectedAppIdUnionKeys.length} 条`
      : "尚未选择";
  const modeLabel = mode === "name" ? "游戏联想" : "App ID 联想";
  resetAppIdUnionHint(`已联想 ${state.appIdUnionMatches.length} 条结果 · ${modeLabel} · ${selectedCount}${selected ? ` · 当前 ${selected.countryCode} · ${selected.gameName}` : ""}`, "hit");
}

function refreshProgressState(message = "正在请求 Apple editorial API...") {
  if (schedulerRunning()) {
    const scheduler = state.schedulerState || {};
    progressArea.hidden = false;
    progressText.textContent = `正在同步 ${scheduler.currentGame || "准备中"}${scheduler.currentIndex ? ` (${scheduler.currentIndex}/${scheduler.totalGames || 0})` : ""}`;
    return;
  }
  progressArea.hidden = !state.analysisBusy;
  progressText.textContent = message;
}

function setBusy(isBusy, message = "正在请求 Apple editorial API...") {
  state.analysisBusy = isBusy;
  refreshInteractionState();
  refreshProgressState(message);
}

function formatSchedulerTime(value) {
  if (!value) return "未安排";
  return formatTime(value);
}

async function loadSchedulerStatus() {
  if (!schedulerHint || !schedulerInterval || !schedulerTrigger || !schedulerList || !schedulerToggle || !schedulerRunOnce) return;
  try {
    const response = await fetch("/api/scheduler", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "定时器状态加载失败");
    const scheduler = data.scheduler || {};
    state.schedulerState = scheduler;
    if (scheduler.intervalMinutes) schedulerInterval.value = String(scheduler.intervalMinutes);
    renderSchedulerOptions();
    schedulerToggle.textContent = scheduler.running ? "同步中" : (scheduler.enabled ? "停止定时" : "启动定时");
    schedulerToggle.dataset.enabled = scheduler.enabled ? "true" : "false";
    schedulerRunOnce.disabled = Boolean(scheduler.running);
    if (scheduler.running) {
      schedulerHint.textContent = `执行中 · ${scheduler.currentGame || "准备中"} ${scheduler.currentIndex ? `(${scheduler.currentIndex}/${scheduler.totalGames || 0})` : ""}`.trim();
    } else if (scheduler.enabled) {
      schedulerHint.textContent = `已启动 · 下次 ${formatSchedulerTime(scheduler.nextRunAt)}`;
    } else if (scheduler.lastStatus === "completed" || scheduler.lastStatus === "completed-local-only") {
      schedulerHint.textContent = `最近完成 · ${formatSchedulerTime(scheduler.lastFinishedAt)}`;
    } else if (scheduler.lastStatus === "failed") {
      schedulerHint.textContent = `失败 · ${scheduler.lastError || "请检查日志"}`;
    } else {
      schedulerHint.textContent = "未启动";
    }
    refreshInteractionState();
    refreshProgressState();
  } catch (error) {
    state.schedulerState = null;
    schedulerHint.textContent = error.message || "定时器状态加载失败";
    refreshInteractionState();
    refreshProgressState();
  }
}

function selectedPageTypes() {
  const selected = [];
  if (appIdUnionToday?.checked) selected.push("today");
  if (appIdUnionGames?.checked) selected.push("games");
  state.appIdUnionPageTypes = selected.length ? selected : ["today"];
  return state.appIdUnionPageTypes.slice();
}

renderSchedulerOptions();

function normalizeLoose(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function renderEmpty(message = "输入 App ID 或游戏名后，联查结果会在这里显示。") {
  resultsEl.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function setSchedulerMenu(open) {
  if (!schedulerMenu || !schedulerTrigger) return;
  state.schedulerMenuOpen = open;
  schedulerMenu.hidden = !open;
  schedulerTrigger.setAttribute("aria-expanded", open ? "true" : "false");
}

function selectedSchedulerLabel() {
  if (!schedulerInterval) return "请选择频率";
  const option = schedulerInterval.selectedOptions?.[0];
  return option ? option.textContent : "请选择频率";
}

function renderSchedulerOptions() {
  if (!schedulerTrigger || !schedulerList || !schedulerInterval) return;
  schedulerTrigger.querySelector("span").textContent = selectedSchedulerLabel();
  schedulerList.innerHTML = Array.from(schedulerInterval.options).map((option) => {
    const active = option.value === schedulerInterval.value;
    return `
      <button class="game-option${active ? " active" : ""}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-scheduler-value="${escapeHtml(option.value)}">
        <span>${escapeHtml(option.textContent || "")}</span>
      </button>
    `;
  }).join("");
}

function resultCountryLabel(grouped) {
  const selected = grouped.get(state.selectedResultCountry);
  if (!selected) return "请选择国家结果";
  const hitCount = selected.pages.reduce((sum, page) => sum + ((page.matches || []).length), 0);
  return `${selected.country} · ${selected.localName} · ${hitCount ? `命中 ${hitCount}` : "未命中"}`;
}

function formatTime(value) {
  if (!value) return "未标明";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function pageTypeLabel(pageType) {
  if (pageType === "today") return "Today";
  if (pageType === "games") return "Games";
  return String(pageType || "").toUpperCase() || "页面";
}

function countryMeta(countryCode) {
  return state.countries.find((item) => item.code === countryCode) || {};
}

function expectedResults(data) {
  const rawResults = data.results || [];
  const countries = data.countries || [];
  const pageTypes = data.pageTypes || [];
  if (data.pending || !(data.crossCountry || countries.length > 1) || !countries.length || !pageTypes.length) {
    return rawResults;
  }

  const seen = new Set(rawResults.map((result) => `${result.country}:${result.pageType}`));
  const sampleByCountry = new Map();
  for (const result of rawResults) {
    if (result.country && !sampleByCountry.has(result.country)) {
      sampleByCountry.set(result.country, result);
    }
  }
  const completed = rawResults.slice();
  for (const countryCode of countries) {
    const meta = countryMeta(countryCode);
    const sample = sampleByCountry.get(countryCode) || {};
    const sampleRequest = sample._request || {};
    for (const pageType of pageTypes) {
      const key = `${countryCode}:${pageType}`;
      if (seen.has(key)) continue;
      completed.push({
        country: countryCode,
        countryLabel: meta.label || countryCode,
        localName: meta.localName || meta.label || countryCode,
        pageType,
        pageLabel: pageTypeLabel(pageType),
        url: "",
        found: false,
        matches: [],
        checkedAt: data.checkedAt,
        error: "本次没有返回该页面结果，请重试该页面。",
        _request: {
          country: countryCode,
          pageType,
          gameName: sampleRequest.gameName || data.gameName || "",
          appId: sampleRequest.appId || data.appId || "",
          appIcon: sampleRequest.appIcon || "",
          aliases: sampleRequest.aliases || [],
          countryEntries: sampleRequest.countryEntries || {},
          crossCountry: Boolean(data.crossCountry),
        },
      });
    }
  }
  return completed;
}

async function loadConfig() {
  const response = await fetch("/api/config");
  const config = await response.json();
  if (!response.ok) throw new Error(config.error || "配置加载失败");
  state.countries = (config.countries || []).slice().sort((a, b) => a.code.localeCompare(b.code));
  await loadGlobalGames();
  await loadSchedulerStatus();
}

async function loadGlobalGames() {
  state.loadingGlobalGames = true;
  try {
    const response = await fetch("/api/game-catalog", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "全局游戏目录加载失败");
    state.globalGames = data.games || [];
  } catch (error) {
    state.globalGames = [];
  } finally {
    state.loadingGlobalGames = false;
    if (appIdUnionInput.value.trim()) refreshAppIdUnionMatches();
  }
}

async function runAppIdUnionAnalysis() {
  if (schedulerRunning()) {
    renderEmpty("本地同步进行中，请等待当前同步完成后再执行联查。");
    return;
  }
  const rawValue = String(appIdUnionInput.value || "").trim();
  if (!rawValue) {
    renderEmpty("请先输入 10 位 App ID 或游戏名。");
    return;
  }
  if (appIdUnionQueryMode(rawValue) === "pendingAppId") {
    renderEmpty("App ID 必须为 10 位才开始联查。");
    return;
  }
  if (!state.appIdUnionMatches.length) {
    refreshAppIdUnionMatches();
  }
  if (!state.appIdUnionMatches.length) {
    renderEmpty(`未匹配到 ${rawValue} 对应的国家和游戏。`);
    return;
  }
  const selectedMatches = selectedAppIdUnionMatches();
  const matchesToRun = selectedMatches.length ? selectedMatches : state.appIdUnionMatches;
  if (!matchesToRun.length) {
    renderEmpty(`未匹配到 ${rawValue} 对应的国家和游戏。`);
    return;
  }
  const groupedGames = new Map();
  for (const match of matchesToRun) {
    const game = state.globalGames.find((item) => item.key === match.gameKey);
    if (!game) continue;
    const current = groupedGames.get(match.gameKey) || {
      ...game,
      countryCodes: [],
    };
    if (!current.countryCodes.includes(match.countryCode)) {
      current.countryCodes.push(match.countryCode);
    }
    groupedGames.set(match.gameKey, current);
  }
  const games = Array.from(groupedGames.values());
  if (!games.length) {
    renderEmpty("没有可联查的游戏。");
    return;
  }
  await runGlobalAnalysis(games);
}

function renderMatch(match, index, pageCheckedAt) {
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
        ${groupLabel ? `<span>所在栏目 ${escapeHtml(groupLabel)}</span>` : ""}
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

function renderResults(data) {
  const completedResults = expectedResults(data);
  state.analysisData = { ...data, results: completedResults };
  const results = completedResults.map((result, index) => ({
    ...result,
    __resultIndex: index
  }));
  const matches = results.flatMap((result) => result.matches || []);
  const sections = new Set(matches.map((match) => `${match.pageType}:${match.sectionTitle}`).filter(Boolean));
  setSummary(results.length, matches.length, sections.size);

  if (!results.length) {
    renderEmpty("没有返回分析结果。");
    return;
  }

  resultsEl.innerHTML = "";
  if (data.crossCountry || (data.countries || []).length > 1) {
    const grouped = new Map();
    for (const result of results) {
      const bucket = grouped.get(result.country) || {
        country: result.country,
        localName: result.localName || result.countryLabel,
        pages: []
      };
      bucket.pages.push(result);
      grouped.set(result.country, bucket);
    }
    const orderedCountries = (data.countries || [])
      .filter((countryCode) => grouped.has(countryCode))
      .map((countryCode, index) => {
        const group = grouped.get(countryCode);
        const hitCount = group.pages.reduce((sum, page) => sum + ((page.matches || []).length), 0);
        return { countryCode, index, hitCount };
      })
      .sort((a, b) => {
        const aHasHit = a.hitCount > 0 ? 1 : 0;
        const bHasHit = b.hitCount > 0 ? 1 : 0;
        if (bHasHit !== aHasHit) return bHasHit - aHasHit;
        if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
        return a.index - b.index;
      });
    const availableCountries = orderedCountries.map((item) => item.countryCode);
    if (!availableCountries.length) {
      renderEmpty("还没有返回联查结果。");
      return;
    }
    if (!availableCountries.includes(state.selectedResultCountry)) {
      state.selectedResultCountry = availableCountries[0];
    }
    const filterNode = document.createElement("section");
    filterNode.className = "country-filter-bar";
    const hitCountryCount = orderedCountries.filter((item) => item.hitCount > 0).length;
    filterNode.innerHTML = `
      <div class="result-country-picker">
        <div class="label-row">
          <label>国家结果</label>
          <span>${escapeHtml(`命中 ${hitCountryCount} / ${availableCountries.length} 个国家`)}</span>
        </div>
        <div class="country-picker result-country-picker-wrap">
          <button class="game-trigger" id="resultCountryTrigger" type="button" aria-haspopup="listbox" aria-expanded="false">
            <span>${escapeHtml(resultCountryLabel(grouped))}</span>
          </button>
          <div class="game-menu country-menu" id="resultCountryMenu" hidden>
            <div class="game-list" id="resultCountryList" role="listbox" aria-label="国家结果列表">
              ${availableCountries.map((countryCode) => {
                const group = grouped.get(countryCode);
                const hitCount = group.pages.reduce((sum, page) => sum + ((page.matches || []).length), 0);
                const active = countryCode === state.selectedResultCountry;
                return `
                  <button class="game-option country-option${active ? " active" : ""}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-result-country="${escapeHtml(countryCode)}">
                    <span>${escapeHtml(`${countryCode} · ${group.localName}`)}</span>
                    <small>${escapeHtml(hitCount ? `命中 ${hitCount}` : "未命中")}</small>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    `;
    resultsEl.appendChild(filterNode);

    const selectedGroup = grouped.get(state.selectedResultCountry);
    if (selectedGroup) {
      const groupNode = document.createElement("section");
      groupNode.className = "country-result-group";
      const hitCount = selectedGroup.pages.reduce((sum, page) => sum + ((page.matches || []).length), 0);
      groupNode.innerHTML = `
        <div class="country-result-header">
          <div>
            <h2>${escapeHtml(`${selectedGroup.country} · ${selectedGroup.localName}`)}</h2>
            <p>${escapeHtml(`${selectedGroup.pages.length} 个页面 · ${hitCount} 个命中展位`)}</p>
          </div>
          <span class="result-badge ${hitCount ? "hit" : ""}">${escapeHtml(hitCount ? `${hitCount} 命中` : "未命中")}</span>
        </div>
        <div class="country-page-stack"></div>
      `;
      const stack = groupNode.querySelector(".country-page-stack");
      for (const result of selectedGroup.pages) {
        const node = pageResultTemplate.content.firstElementChild.cloneNode(true);
        node.dataset.resultIndex = String(result.__resultIndex);
        const title = node.querySelector("h2");
        const link = node.querySelector("a");
        const badge = node.querySelector(".result-badge");
        const grid = node.querySelector(".match-grid");
        const retryButton = node.querySelector("[data-retry-result]");

        title.textContent = `${result.pageLabel} · ${result.localName || result.countryLabel}`;
        link.textContent = `数据源：Apple API JSON · 分析时间 ${formatTime(result.checkedAt || data.checkedAt)}`;
        link.href = result.url;
        retryButton.hidden = !result.error;

        if (result.error) {
          badge.textContent = "接口失败";
          badge.classList.add("error");
          grid.innerHTML = `<div class="error-state">${escapeHtml(result.error)}</div>`;
        } else if (!result.found) {
          badge.textContent = "未命中";
          grid.innerHTML = '<div class="no-hit">当前 API 数据里没有找到该游戏。</div>';
        } else {
          badge.textContent = `${result.matches.length} 命中`;
          badge.classList.add("hit");
          grid.innerHTML = result.matches.map((match, index) => renderMatch(match, index, data.checkedAt)).join("");
        }
        stack.appendChild(node);
      }
      resultsEl.appendChild(groupNode);
    }
    return;
  }
  for (const [resultIndex, result] of results.entries()) {
    const node = pageResultTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.resultIndex = String(resultIndex);
    const title = node.querySelector("h2");
    const link = node.querySelector("a");
    const badge = node.querySelector(".result-badge");
    const grid = node.querySelector(".match-grid");
    const retryButton = node.querySelector("[data-retry-result]");

    title.textContent = `${result.country} · ${result.pageLabel} · ${result.localName || result.countryLabel}`;
    link.textContent = `数据源：Apple API JSON · 分析时间 ${formatTime(result.checkedAt || data.checkedAt)}`;
    link.href = result.url;
    retryButton.hidden = !result.error;

    if (result.error) {
      badge.textContent = "接口失败";
      badge.classList.add("error");
      grid.innerHTML = `<div class="error-state">${escapeHtml(result.error)}</div>`;
    } else if (!result.found) {
      badge.textContent = "未命中";
      grid.innerHTML = '<div class="no-hit">当前 API 数据里没有找到该游戏。</div>';
    } else {
      badge.textContent = `${result.matches.length} 命中`;
      badge.classList.add("hit");
      grid.innerHTML = result.matches.map((match, index) => renderMatch(match, index, data.checkedAt)).join("");
    }

    resultsEl.appendChild(node);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function imageToDataUrl(src) {
  if (!src || src.startsWith("data:")) return src;
  const proxyUrl = `/api/image-data?url=${encodeURIComponent(src)}`;
  const response = await fetch(proxyUrl, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "图片转换失败");
  return data.dataUrl;
}

async function inlineImages(root) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map(async (image) => {
    const source = image.currentSrc || image.src;
    if (!source) return;
    image.src = await imageToDataUrl(source);
    image.removeAttribute("srcset");
    image.removeAttribute("loading");
    image.removeAttribute("decoding");
  }));
}

function copyComputedStyles(source, target) {
  const computed = window.getComputedStyle(source);
  for (const property of computed) {
    target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }
  Array.from(source.children).forEach((child, index) => {
    const targetChild = target.children[index];
    if (targetChild) copyComputedStyles(child, targetChild);
  });
}

function safeAsciiSlug(value) {
  return String(value || "")
    .replace(/[^\x20-\x7E]+/g, "-")
    .replace(/[\\/:*?"<>|\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeExportFilename(result, format) {
  const country = safeAsciiSlug(result?.country || "AppExpo") || "AppExpo";
  const page = safeAsciiSlug(result?.pageLabel || result?.pageType || "placement") || "placement";
  const local = safeAsciiSlug(result?.localName || result?.countryLabel || "");
  const checkedAt = safeAsciiSlug(String(result?.checkedAt || state.analysisData?.checkedAt || "").replace(/[T:.Z]/g, "-"));
  return [country, page, local, checkedAt]
    .filter(Boolean)
    .join("-")
    .slice(0, 120) + `.${format}`;
}

function buildRetryPayload(result) {
  const requestMeta = result?._request || null;
  if (requestMeta) {
    return {
      countries: [requestMeta.country],
      gameName: requestMeta.gameName,
      appId: requestMeta.appId || "",
      appIcon: requestMeta.appIcon || "",
      aliases: requestMeta.aliases || [],
      countryEntries: requestMeta.countryEntries || {},
      pageTypes: [requestMeta.pageType],
      crossCountry: Boolean(requestMeta.crossCountry),
    };
  }
  return {
    countries: [result?.country || ""].filter(Boolean),
    gameName: result?.gameName || result?.appTitle || result?.placementTitle || "",
    appId: result?.appId || "",
    appIcon: result?.appIcon || result?.iconImage || "",
    aliases: [],
    pageTypes: [result?.pageType || "today"],
    crossCountry: Boolean(state.analysisData?.crossCountry),
  };
}

async function exportCardAsImage(button) {
  const card = button.closest(".page-result");
  if (!card) return;
  const resultIndex = Number(card.dataset.resultIndex);
  const result = state.analysisData?.results?.[resultIndex];
  if (!result) return;
  const oldText = button.textContent;
  button.textContent = "导出中";
  button.disabled = true;
  try {
    const response = await fetch("/api/export-result", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        result,
        checkedAt: state.analysisData?.checkedAt || "",
        theme: currentTheme()
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "导出图片失败");
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = makeExportFilename(result, "png");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    alert(error.message || "导出失败");
  } finally {
    button.textContent = oldText;
    button.disabled = false;
  }
}

async function retrySingleResult(button) {
  const card = button.closest(".page-result");
  if (!card) return;
  const resultIndex = Number(card.dataset.resultIndex);
  const current = state.analysisData?.results?.[resultIndex];
  if (!current) return;
  const payload = buildRetryPayload(current);
  const oldText = button.textContent;
  button.textContent = "重试中";
  button.disabled = true;
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "重试失败");
    const retried = (data.results || [])[0];
    if (!retried) throw new Error("没有返回可替换的结果");
    retried._request = current._request || {
      country: payload.countries?.[0] || current.country,
      pageType: payload.pageTypes?.[0] || current.pageType,
      gameName: payload.gameName || "",
      appId: payload.appId || "",
      appIcon: payload.appIcon || "",
      aliases: payload.aliases || [],
      countryEntries: payload.countryEntries || {},
      crossCountry: Boolean(payload.crossCountry),
    };
    retried.checkedAt = data.checkedAt || new Date().toISOString();
    state.analysisData.results[resultIndex] = retried;
    renderResults(state.analysisData);
  } catch (error) {
    alert(error.message || "重试失败");
  } finally {
    button.textContent = oldText;
    button.disabled = false;
  }
}

async function runGlobalAnalysis(targetGames = null) {
  if (schedulerRunning()) {
    renderEmpty("本地同步进行中，请等待当前同步完成后再执行联查。");
    return;
  }
  const selectedList = Array.isArray(targetGames) && targetGames.length ? targetGames : [];
  const pageTypes = selectedPageTypes();
  if (!selectedList.length) {
    renderEmpty("请先输入 App ID 或游戏名，并选择联查结果。");
    return;
  }
  if (!pageTypes.length) {
    renderEmpty("请至少选择 Today 或 Games。");
    return;
  }

  const totalPages = selectedList.reduce((sum, item) => sum + ((item.countryCodes || []).length * pageTypes.length), 0);
  const headline = selectedList.length === 1 ? selectedList[0].displayName : `${selectedList.length} 个游戏`;
  setBusy(true, `正在联查 ${headline} 的 ${pageTypes.map((item) => item.toUpperCase()).join(" / ")}...`);
  setSummary(totalPages, 0, 0);
  state.analysisData = null;
  resultsEl.innerHTML = "";

  try {
    const aggregate = {
      gameName: selectedList.length === 1 ? selectedList[0].displayName : `${selectedList.length} 个游戏`,
      appId: selectedList.length === 1 ? (selectedList[0].id || "") : "",
      countries: Array.from(new Set(selectedList.flatMap((item) => item.countryCodes || []))),
      pageTypes,
      checkedAt: new Date().toISOString(),
      crossCountry: true,
      pending: true,
      results: []
    };

    let progressIndex = 0;
    const progressTotal = selectedList.reduce((sum, item) => sum + ((item.countryCodes || []).length * pageTypes.length), 0);
    const failedJobs = [];

    const runSingleJob = async (selected, countryCode, pageType, phase = "first-pass", phaseIndex = 0, phaseTotal = 0) => {
      if (phase === "retry") {
        setBusy(
          true,
          `正在补重试 ${selected.displayName} · ${countryCode} · ${pageType.toUpperCase()} (${phaseIndex}/${phaseTotal})...`
        );
      } else {
        progressIndex += 1;
        setBusy(
          true,
          `正在联查 ${selected.displayName} · ${countryCode} · ${pageType.toUpperCase()} (${progressIndex}/${progressTotal})...`
        );
      }
      const response = await fetch("/api/analyze", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          countries: [countryCode],
          gameName: selected.displayName,
          aliases: selected.aliases || [],
          countryEntries: selected.countryEntries || {},
          pageTypes: [pageType],
          crossCountry: true
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `${countryCode} · ${pageType} 联查失败`);

      aggregate.checkedAt = data.checkedAt || aggregate.checkedAt;
      const received = data.results || [];
      for (const item of received) {
        item._request = {
          country: countryCode,
          pageType: item.pageType,
          gameName: selected.displayName,
          appId: selected.id || "",
          appIcon: "",
          aliases: selected.aliases || [],
          countryEntries: selected.countryEntries || {},
          crossCountry: true,
        };
      }
      const failedItems = received.filter((item) => item?.error);
      if (failedItems.length) {
        throw new Error(failedItems[0]?.error || `${countryCode} · ${pageType} 接口失败`);
      }
      aggregate.results.push(...received);
      renderResults(aggregate);
    };

    for (const selected of selectedList) {
      for (const countryCode of (selected.countryCodes || [])) {
        for (const pageType of pageTypes) {
          try {
            await runSingleJob(selected, countryCode, pageType);
          } catch (error) {
            failedJobs.push({
              selected,
              countryCode,
              pageType,
              message: error.message || `${countryCode} · ${pageType} 联查失败`,
            });
          }
        }
      }
    }

    let stillFailedJobs = failedJobs.slice();
    const retryRounds = 8;
    for (let retryRound = 1; retryRound <= retryRounds; retryRound += 1) {
      if (!stillFailedJobs.length) break;
      const currentRoundJobs = stillFailedJobs.slice();
      stillFailedJobs = [];
      let retryIndex = 0;
      for (const job of currentRoundJobs) {
        retryIndex += 1;
        try {
          await runSingleJob(
            job.selected,
            job.countryCode,
            job.pageType,
            "retry",
            retryIndex,
            currentRoundJobs.length
          );
        } catch (error) {
          stillFailedJobs.push({
            ...job,
            message: error.message || job.message,
          });
        }
      }
      if (stillFailedJobs.length && retryRound < retryRounds) {
        setBusy(true, `第 ${retryRound} 轮补重试后仍有 ${stillFailedJobs.length} 个接口失败，准备继续重试...`);
        await new Promise((resolve) => setTimeout(resolve, 1500 + retryRound * 500));
      }
    }
    if (stillFailedJobs.length) {
      aggregate.pending = false;
      renderResults(aggregate);
      const preview = stillFailedJobs.slice(0, 6).map((item) => `${item.countryCode} · ${item.pageType.toUpperCase()}`).join("，");
      resultsEl.insertAdjacentHTML(
        "afterbegin",
        `<div class="error-state">有 ${stillFailedJobs.length} 个接口在多轮补重试后仍失败：${escapeHtml(preview)}</div>`
      );
    } else {
      aggregate.pending = false;
      renderResults(aggregate);
    }
  } catch (error) {
    setSummary(0, 0, 0);
    resultsEl.innerHTML = `<div class="error-state">${escapeHtml(error.message || "联查失败")}</div>`;
  } finally {
    setBusy(false);
  }
}

async function toggleScheduler() {
  if (!schedulerToggle || !schedulerInterval) return;
  const enabled = schedulerToggle.dataset.enabled === "true";
  const endpoint = enabled ? "/api/scheduler/stop" : "/api/scheduler/start";
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intervalMinutes: Number(schedulerInterval.value || 120) })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "定时器操作失败");
  await loadSchedulerStatus();
}

async function runSchedulerOnce() {
  if (!schedulerRunOnce) return;
  const response = await fetch("/api/scheduler/run-once", {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "立即执行失败");
  await loadSchedulerStatus();
}

if (schedulerTrigger) {
  schedulerTrigger.addEventListener("click", () => {
    if (schedulerRunning()) return;
    setAppIdUnionMenu(false);
    setSchedulerMenu(!state.schedulerMenuOpen);
  });
}

appIdUnionInput.addEventListener("focus", () => {
  if (schedulerRunning()) return;
  if (appIdUnionInput.value.trim()) refreshAppIdUnionMatches();
});

appIdUnionInput.addEventListener("input", () => {
  state.selectedAppIdUnionKey = "";
  refreshAppIdUnionMatches();
});

[appIdUnionToday, appIdUnionGames].forEach((checkbox) => {
  checkbox?.addEventListener("change", (event) => {
    if (appIdUnionToday.checked || appIdUnionGames.checked) return;
    event.target.checked = true;
  });
});

appIdUnionInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (shouldBlockAppIdUnionEnter(event)) return;
    await runAppIdUnionAnalysis();
  }
});

appIdUnionMenu.addEventListener("click", (event) => {
  event.stopPropagation();
  const modeButton = event.target.closest("[data-appid-mode]");
  const allButton = event.target.closest("[data-appid-union-all]");
  const clearButton = event.target.closest("[data-appid-union-clear]");
  const closeButton = event.target.closest("[data-appid-union-close]");
  const button = event.target.closest("[data-appid-union-key]");
  if (modeButton) {
    state.appIdUnionSelectMode = modeButton.dataset.appidMode === "multi" ? "multi" : "single";
    state.selectedAppIdUnionKey = "";
    state.selectedAppIdUnionKeys = [];
    renderAppIdUnionMatches();
    resetAppIdUnionHint(`已切换为${state.appIdUnionSelectMode === "multi" ? "多选" : "单选"}模式，并清空当前选择`, "miss");
    return;
  }
  if (allButton) {
    state.selectedAppIdUnionKeys = state.appIdUnionMatches.map((item) => item.key);
    renderAppIdUnionMatches();
    resetAppIdUnionHint(`已选择全部地区，共 ${state.appIdUnionMatches.length} 条结果`, "hit");
    return;
  }
  if (clearButton) {
    state.selectedAppIdUnionKeys = [];
    renderAppIdUnionMatches();
    resetAppIdUnionHint("已清空当前选择", "miss");
    return;
  }
  if (closeButton) {
    setAppIdUnionMenu(false);
    return;
  }
  if (!button) return;
  const key = button.dataset.appidUnionKey;
  state.selectedAppIdUnionKey = key;
  if (state.appIdUnionSelectMode === "single") {
    state.selectedAppIdUnionKeys = [key];
  } else {
    if (state.selectedAppIdUnionKeys.includes(key)) {
      state.selectedAppIdUnionKeys = state.selectedAppIdUnionKeys.filter((item) => item !== key);
    } else {
      state.selectedAppIdUnionKeys = [...state.selectedAppIdUnionKeys, key];
    }
    if (!state.selectedAppIdUnionKeys.length) {
      state.selectedAppIdUnionKeys = [key];
    }
  }
  renderAppIdUnionMatches();
  const selected = selectedAppIdUnionMatch();
  if (selected) {
    if (appIdUnionQueryMode(appIdUnionInput.value) === "appId") {
      appIdUnionInput.value = selected.appId;
    }
    resetAppIdUnionHint(`已选择 ${state.selectedAppIdUnionKeys.length} 条 · 当前 ${selected.countryCode} · ${selected.gameName}`, "hit");
  }
  if (state.appIdUnionSelectMode === "single") {
    setAppIdUnionMenu(false);
  }
});

document.addEventListener("click", (event) => {
  if (state.appIdUnionMenuOpen && !event.target.closest(".app-id-picker")) setAppIdUnionMenu(false);
  if (state.schedulerMenuOpen && !event.target.closest(".scheduler-picker")) setSchedulerMenu(false);
  if (state.resultCountryMenuOpen && !event.target.closest(".result-country-picker-wrap")) {
    state.resultCountryMenuOpen = false;
    const menu = document.querySelector("#resultCountryMenu");
    const trigger = document.querySelector("#resultCountryTrigger");
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }
});

if (schedulerList) {
  schedulerList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scheduler-value]");
    if (!button || schedulerRunning() || !schedulerInterval) return;
    schedulerInterval.value = button.dataset.schedulerValue;
    setSchedulerMenu(false);
    renderSchedulerOptions();
  });
}

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});
runAppIdUnionButton.addEventListener("click", runAppIdUnionAnalysis);
if (schedulerToggle) {
  schedulerToggle.addEventListener("click", async () => {
    try {
      await toggleScheduler();
    } catch (error) {
      alert(error.message || "定时器操作失败");
    }
  });
}
if (schedulerRunOnce) {
  schedulerRunOnce.addEventListener("click", async () => {
    try {
      await runSchedulerOnce();
    } catch (error) {
      alert(error.message || "立即执行失败");
    }
  });
}
resultsEl.addEventListener("click", async (event) => {
  const resultCountryTrigger = event.target.closest("#resultCountryTrigger");
  if (resultCountryTrigger) {
    const menu = document.querySelector("#resultCountryMenu");
    state.resultCountryMenuOpen = !state.resultCountryMenuOpen;
    if (menu) menu.hidden = !state.resultCountryMenuOpen;
    resultCountryTrigger.setAttribute("aria-expanded", state.resultCountryMenuOpen ? "true" : "false");
    return;
  }
  const countryButton = event.target.closest("[data-result-country]");
  if (countryButton) {
    state.selectedResultCountry = countryButton.dataset.resultCountry;
    state.resultCountryMenuOpen = false;
    if (state.analysisData) renderResults(state.analysisData);
    return;
  }
  const retryButton = event.target.closest("[data-retry-result]");
  if (retryButton) {
    await retrySingleResult(retryButton);
    return;
  }
  const button = event.target.closest("[data-export-format]");
  if (button) {
    await exportCardAsImage(button);
  }
});
setTheme(currentTheme());

loadConfig()
  .then(() => renderEmpty())
  .catch((error) => {
    resultsEl.innerHTML = `<div class="error-state">${escapeHtml(error.message || "加载失败")}</div>`;
  });

if (schedulerHint) {
  setInterval(loadSchedulerStatus, 10000);
}
