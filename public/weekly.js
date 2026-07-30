const themeToggle = document.querySelector("#themeToggle");
const weeklyCountryTrigger = document.querySelector("#weeklyCountryTrigger");
const weeklyCountryMenu = document.querySelector("#weeklyCountryMenu");
const weeklyCountryList = document.querySelector("#weeklyCountryList");
const weeklyWeekTrigger = document.querySelector("#weeklyWeekTrigger");
const weeklyWeekMenu = document.querySelector("#weeklyWeekMenu");
const weeklyWeekList = document.querySelector("#weeklyWeekList");
const weeklyStatusPill = document.querySelector("#weeklyStatusPill");
const weeklyTodayLabel = document.querySelector("#weeklyTodayLabel");
const weeklySchedule = document.querySelector("#weeklySchedule");
const weeklyCarouselRail = document.querySelector("#weeklyCarouselRail");
const weeklyEventRail = document.querySelector("#weeklyEventRail");
const weeklyCarouselCount = document.querySelector("#weeklyCarouselCount");
const weeklyEventCount = document.querySelector("#weeklyEventCount");
const weeklyCarouselHint = document.querySelector("#weeklyCarouselHint");
const weeklyEventHint = document.querySelector("#weeklyEventHint");

const state = {
  countries: [],
  weeks: [],
  selectedCountry: "CN",
  selectedWeek: "",
  selectedDay: "",
  data: null,
  openMenu: "",
  statusTimer: null,
  autoCaptureKeys: new Set(),
  autoCaptureTimer: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem("appexpo-theme", nextTheme);
  themeToggle.setAttribute("aria-label", nextTheme === "dark" ? "切换白天模式" : "切换黑夜模式");
  themeToggle.setAttribute("aria-pressed", nextTheme === "dark" ? "true" : "false");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function formatFullDate(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return value || "";
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long"
  });
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDateFromLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWeekOption() {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    weekStart: isoDateFromLocal(weekStart),
    weekEnd: isoDateFromLocal(weekEnd),
    itemCount: 0,
    dayCount: 0
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function postJson(url, payload = {}) {
  return fetchJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function setMenuOpen(name, open) {
  state.openMenu = open ? name : "";
  const countryOpen = state.openMenu === "country";
  const weekOpen = state.openMenu === "week";
  weeklyCountryMenu.hidden = !countryOpen;
  weeklyWeekMenu.hidden = !weekOpen;
  weeklyCountryTrigger.setAttribute("aria-expanded", countryOpen ? "true" : "false");
  weeklyWeekTrigger.setAttribute("aria-expanded", weekOpen ? "true" : "false");
  if (weekOpen) requestAnimationFrame(ensureSelectedWeekVisible);
}

function countryLabel(country) {
  return `${country.code} · ${country.localName || country.label || ""}`;
}

function sortWeeklyCountries(countries = []) {
  const priority = new Map([
    ["CN", 0],
    ["TW", 1],
    ["HK", 2]
  ]);
  return countries
    .map((country, index) => ({ country, index }))
    .sort((left, right) => {
      const leftOrder = priority.has(left.country.code) ? priority.get(left.country.code) : 100 + left.index;
      const rightOrder = priority.has(right.country.code) ? priority.get(right.country.code) : 100 + right.index;
      return leftOrder - rightOrder;
    })
    .map((item) => item.country);
}

function weekLabel(week, index) {
  if (!week) return "暂无入库周";
  if (index === 0) return `本周周次 · ${week.weekStart} 至 ${week.weekEnd}`;
  return `历史周次 · ${week.weekStart} 至 ${week.weekEnd}`;
}

function ensureSelectedWeekVisible() {
  const active = weeklyWeekList.querySelector(".weekly-picker-option.active");
  if (!active) return;
  active.scrollIntoView({ block: "nearest" });
}

function renderCountryPicker() {
  const selected = state.countries.find((country) => country.code === state.selectedCountry) || state.countries[0];
  if (selected) {
    weeklyCountryTrigger.querySelector("span").textContent = selected.code;
    weeklyCountryTrigger.querySelector("strong").textContent = selected.localName || selected.label || selected.code;
  }
  weeklyCountryList.innerHTML = state.countries.map((country) => {
    const active = country.code === state.selectedCountry;
    return `
      <button class="weekly-picker-option${active ? " active" : ""}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-country="${escapeHtml(country.code)}">
        <span>${escapeHtml(country.code)}</span>
        <strong>${escapeHtml(country.localName || country.label || country.code)}</strong>
      </button>
    `;
  }).join("");
}

function renderWeekPicker() {
  if (!state.weeks.length) {
    weeklyWeekTrigger.disabled = true;
    weeklyWeekTrigger.querySelector("span").textContent = "暂无数据";
    weeklyWeekTrigger.querySelector("strong").textContent = "等待每日自动抓取";
    weeklyWeekList.innerHTML = "";
    return;
  }
  weeklyWeekTrigger.disabled = false;
  const selectedIndex = Math.max(0, state.weeks.findIndex((week) => week.weekStart === state.selectedWeek));
  const selected = state.weeks[selectedIndex] || state.weeks[0];
  const selectedLabel = selectedIndex === 0 ? "本周周次" : "历史周次";
  weeklyWeekTrigger.querySelector("span").textContent = selectedLabel;
  weeklyWeekTrigger.querySelector("strong").textContent = `${selected.weekStart} 至 ${selected.weekEnd}`;
  weeklyWeekList.innerHTML = state.weeks.map((week, index) => {
    const active = week.weekStart === state.selectedWeek;
    const label = index === 0 ? "本周周次" : "历史周次";
    return `
      <button class="weekly-picker-option weekly-picker-option-wide${active ? " active" : ""}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-week="${escapeHtml(week.weekStart)}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(week.weekStart)} 至 ${escapeHtml(week.weekEnd)}</strong>
        <small>${Number(week.dayCount || 0)} 天 · ${Number(week.itemCount || 0)} 条</small>
      </button>
    `;
  }).join("");
}

function renderSchedule(days = []) {
  weeklySchedule.innerHTML = days.map((day) => {
    const hasData = Boolean(day.carouselCount || day.eventCount);
    const selected = state.selectedDay === day.date;
    return `
      <button class="weekly-day${hasData ? " active" : ""}${selected ? " selected" : ""}" type="button" data-weekly-day="${escapeHtml(day.date)}">
        <strong>${escapeHtml(day.weekday)}</strong>
        <span>${escapeHtml(formatDate(day.date))}</span>
        <small>Banner ${Number(day.carouselCount || 0)} · Event ${Number(day.eventCount || 0)}</small>
      </button>
    `;
  }).join("");
}

function imageBlock(item, label) {
  if (item.video) {
    return `
      <video src="${escapeHtml(item.video)}" poster="${escapeHtml(item.image || "")}" autoplay muted loop playsinline preload="metadata"></video>
    `;
  }
  if (item.image) {
    return `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || item.appTitle || label)}" loading="lazy">`;
  }
  return `<div class="weekly-image-empty">无图片</div>`;
}

function setRailEmpty(rail, isEmpty) {
  rail.classList.toggle("weekly-rail-empty", isEmpty);
}

function attachDragScroll(rail) {
  if (!rail) return;
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startScrollLeft = 0;
  let nextScrollLeft = 0;
  let frameId = 0;

  function applyScroll() {
    frameId = 0;
    rail.scrollLeft = nextScrollLeft;
  }

  rail.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || rail.classList.contains("weekly-rail-empty")) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startScrollLeft = rail.scrollLeft;
    nextScrollLeft = startScrollLeft;
    rail.classList.add("is-dragging");
    rail.setPointerCapture?.(event.pointerId);
  });

  rail.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) > 3) moved = true;
    if (moved) event.preventDefault();
    nextScrollLeft = startScrollLeft - deltaX;
    if (!frameId) {
      frameId = window.requestAnimationFrame(applyScroll);
    }
  }, { passive: false });

  function stopDrag(event) {
    if (!dragging) return;
    dragging = false;
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      rail.scrollLeft = nextScrollLeft;
    }
    rail.classList.remove("is-dragging");
    rail.releasePointerCapture?.(event.pointerId);
    if (moved) {
      rail.dataset.dragged = "1";
      window.setTimeout(() => {
        delete rail.dataset.dragged;
      }, 0);
    }
  }

  rail.addEventListener("pointerup", stopDrag);
  rail.addEventListener("pointercancel", stopDrag);
  rail.addEventListener("click", (event) => {
    if (rail.dataset.dragged === "1") {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  rail.addEventListener("selectstart", (event) => {
    event.preventDefault();
  });

  rail.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });
}

function resetWeeklyRailsScroll() {
  weeklyCarouselRail.scrollLeft = 0;
  weeklyEventRail.scrollLeft = 0;
}

function todayCaptureKey() {
  return `all|${todayKey()}`;
}

function scheduleAutoCaptureRefresh() {
  if (state.autoCaptureTimer) window.clearTimeout(state.autoCaptureTimer);
  state.autoCaptureTimer = window.setTimeout(async () => {
    state.autoCaptureTimer = null;
    await loadWeekOptions();
    await loadWeeklyData();
  }, 2500);
}

async function ensureTodayAllCountriesCapture(data) {
  const key = todayCaptureKey();
  let status = null;
  try {
    status = await fetchJson("/api/weekly-games/status");
  } catch (_error) {
    status = null;
  }
  const scheduler = status?.scheduler || data?.scheduler || {};
  const captured = Number(status?.todayCapturedCountries || 0);
  const total = Number(status?.countryCount || state.countries.length || 0);
  if (total && captured >= total) {
    state.autoCaptureKeys.delete(key);
    return;
  }
  if (scheduler.running) {
    if (state.autoCaptureKeys.has(key)) scheduleAutoCaptureRefresh();
    return;
  }
  if (state.autoCaptureKeys.has(key)) return;
  state.autoCaptureKeys.add(key);
  weeklyStatusPill.textContent = "今日全国家抓取中";
  try {
    await postJson("/api/weekly-games/capture", {
      force: false,
    });
    scheduleAutoCaptureRefresh();
  } catch (_error) {
    state.autoCaptureKeys.delete(key);
  }
}

function filterItemsByDay(items = []) {
  if (!state.selectedDay) return items;
  return items.filter((item) => item.captureDate === state.selectedDay);
}

function pickDefaultWeeklyDay(days = []) {
  if (!days.length) return "";
  const currentDay = todayKey();
  const currentWeekStart = currentWeekOption().weekStart;
  if (state.selectedWeek === currentWeekStart && days.some((day) => day.date === currentDay)) {
    return currentDay;
  }
  const firstDataDay = days.find((day) => Number(day.carouselCount || 0) || Number(day.eventCount || 0));
  return firstDataDay?.date || days[0]?.date || "";
}

function selectedDayLabel(data = state.data) {
  const days = data?.days || [];
  const day = days.find((item) => item.date === state.selectedDay) || days[0];
  if (!day) return "";
  return `${day.weekday} ${formatDate(day.date)}`;
}

function renderCarousel(items = []) {
  const filtered = filterItemsByDay(items);
  weeklyCarouselCount.textContent = `${filtered.length} 条`;
  setRailEmpty(weeklyCarouselRail, !filtered.length);
  if (!filtered.length) {
    weeklyCarouselRail.innerHTML = `<div class="empty-state">当前日期暂无 Games · Banner 入库记录。</div>`;
    return;
  }
  weeklyCarouselRail.innerHTML = filtered.map((item) => `
    <article class="weekly-carousel-card">
      <div class="weekly-carousel-media">
        ${imageBlock(item, "Games · Banner")}
        <div class="weekly-card-overlay">
          <span>${escapeHtml(item.captureDate || "")}</span>
          <h3>${escapeHtml(item.title || item.appTitle || "未命名 Games · Banner")}</h3>
          ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
        </div>
      </div>
      <div class="weekly-card-meta">
        ${item.appIcon ? `<img src="${escapeHtml(item.appIcon)}" alt="" loading="lazy">` : ""}
        <div>
          <strong>${escapeHtml(item.appTitle || item.title || "未命名游戏")}</strong>
          ${item.appSubtitle ? `<small>${escapeHtml(item.appSubtitle)}</small>` : ""}
        </div>
      </div>
    </article>
  `).join("");
}

function renderEvents(items = []) {
  const filtered = filterItemsByDay(items);
  weeklyEventCount.textContent = `${filtered.length} 条`;
  setRailEmpty(weeklyEventRail, !filtered.length);
  if (!filtered.length) {
    weeklyEventRail.innerHTML = `<div class="empty-state">当前日期暂无 Games · Event 入库记录。</div>`;
    return;
  }
  weeklyEventRail.innerHTML = filtered.map((item) => `
    <article class="weekly-event-card">
      <div class="weekly-event-media">
        ${imageBlock(item, "活动图片")}
        <div class="weekly-event-overlay">
          ${item.eventKind ? `<span>${escapeHtml(item.eventKind)}</span>` : ""}
          <h3>${escapeHtml(item.title || "未命名活动")}</h3>
          ${item.subtitle ? `<p>${escapeHtml(item.subtitle)}</p>` : ""}
        </div>
      </div>
      <div class="weekly-event-app">
        ${item.appIcon ? `<img src="${escapeHtml(item.appIcon)}" alt="" loading="lazy">` : ""}
        <div>
          <strong>${escapeHtml(item.appTitle || "未命名游戏")}</strong>
          ${item.appSubtitle ? `<small>${escapeHtml(item.appSubtitle)}</small>` : ""}
        </div>
        <button type="button" tabindex="-1">查看</button>
      </div>
    </article>
  `).join("");
}

function renderData(data) {
  state.data = data;
  renderSchedule(data.days || []);
  renderCarousel(data.carousel || []);
  renderEvents(data.events || []);
  resetWeeklyRailsScroll();
  const country = [data.country, data.localName || data.countryLabel].filter(Boolean).join(" · ");
  const hint = [country, selectedDayLabel(data)].filter(Boolean).join(" · ");
  weeklyCarouselHint.textContent = hint;
  weeklyEventHint.textContent = hint;
}

function renderNoWeekData() {
  state.data = null;
  weeklySchedule.innerHTML = `<div class="empty-state">当前国家暂无每周一更入库记录。</div>`;
  weeklyCarouselCount.textContent = "0 条";
  weeklyEventCount.textContent = "0 条";
  weeklyCarouselHint.textContent = "等待每日自动抓取入库。";
  weeklyEventHint.textContent = "等待每日自动抓取入库。";
  setRailEmpty(weeklyCarouselRail, true);
  setRailEmpty(weeklyEventRail, true);
  weeklyCarouselRail.innerHTML = `<div class="empty-state">暂无 Games · Banner 入库记录。</div>`;
  weeklyEventRail.innerHTML = `<div class="empty-state">暂无 Games · Event 入库记录。</div>`;
  resetWeeklyRailsScroll();
}

async function loadWeekOptions() {
  const params = new URLSearchParams({ country: state.selectedCountry || "CN" });
  const data = await fetchJson(`/api/weekly-games/weeks?${params.toString()}`);
  const currentWeek = currentWeekOption();
  const weeks = data.weeks || [];
  const savedCurrentWeek = weeks.find((week) => week.weekStart === currentWeek.weekStart);
  state.weeks = [
    savedCurrentWeek || currentWeek,
    ...weeks.filter((week) => week.weekStart !== currentWeek.weekStart)
  ];
  if (!state.weeks.some((week) => week.weekStart === state.selectedWeek)) {
    state.selectedWeek = currentWeek.weekStart;
  }
  renderWeekPicker();
}

async function loadWeeklyData() {
  if (!state.selectedWeek) {
    renderNoWeekData();
    await ensureTodayAllCountriesCapture({});
    return;
  }
  const params = new URLSearchParams({
    country: state.selectedCountry || "CN",
    weekStart: state.selectedWeek || ""
  });
  weeklyStatusPill.textContent = "读取中";
  try {
    const data = await fetchJson(`/api/weekly-games?${params.toString()}`);
    const days = data.days || [];
    const hasSelectedDay = days.some((day) => day.date === state.selectedDay);
    if (!state.selectedDay || !hasSelectedDay) {
      state.selectedDay = pickDefaultWeeklyDay(days);
    }
    renderData(data);
    const scheduler = data.scheduler || {};
    weeklyStatusPill.textContent = scheduler.running
      ? `抓取中 ${scheduler.currentIndex || 0}/${scheduler.totalCountries || 0}`
      : "每日自动抓取";
    await ensureTodayAllCountriesCapture(data);
  } catch (error) {
    weeklyStatusPill.textContent = "读取失败";
    weeklySchedule.innerHTML = `<div class="error-state">${escapeHtml(error.message || "读取失败")}</div>`;
    weeklyCarouselRail.innerHTML = "";
    weeklyEventRail.innerHTML = "";
  }
}

async function loadConfig() {
  const data = await fetchJson("/api/config");
  state.countries = sortWeeklyCountries(data.countries || []);
  if (!state.countries.some((country) => country.code === state.selectedCountry)) {
    state.selectedCountry = state.countries[0]?.code || "CN";
  }
  weeklyTodayLabel.textContent = formatFullDate();
  renderCountryPicker();
  await loadWeekOptions();
}

async function refreshStatus() {
  try {
    const data = await fetchJson("/api/weekly-games/status");
    const scheduler = data.scheduler || {};
    if (scheduler.running) {
      weeklyStatusPill.textContent = `抓取中 ${scheduler.currentCountry || ""} ${scheduler.currentIndex || 0}/${scheduler.totalCountries || 0}`.trim();
      return;
    }
    if (scheduler.lastStatus === "failed") {
      weeklyStatusPill.textContent = "抓取失败";
      return;
    }
    if (scheduler.lastStatus === "partial") {
      weeklyStatusPill.textContent = `部分完成 ${data.todayCapturedCountries || 0}/${data.countryCount || 0}`;
      return;
    }
    weeklyStatusPill.textContent = `今日已抓 ${data.todayCapturedCountries || 0}/${data.countryCount || 0}`;
  } catch (error) {
    weeklyStatusPill.textContent = "状态未知";
  }
}

themeToggle?.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

weeklyCountryTrigger?.addEventListener("click", () => {
  setMenuOpen("country", state.openMenu !== "country");
});

weeklyWeekTrigger?.addEventListener("click", () => {
  if (weeklyWeekTrigger.disabled) return;
  setMenuOpen("week", state.openMenu !== "week");
});

weeklyCountryList?.addEventListener("click", async (event) => {
  const option = event.target.closest("[data-country]");
  if (!option) return;
  state.selectedCountry = option.dataset.country || "CN";
  state.selectedDay = "";
  setMenuOpen("", false);
  renderCountryPicker();
  await loadWeekOptions();
  await loadWeeklyData();
});

weeklyWeekList?.addEventListener("click", async (event) => {
  const option = event.target.closest("[data-week]");
  if (!option) return;
  state.selectedWeek = option.dataset.week || "";
  state.selectedDay = "";
  setMenuOpen("", false);
  renderWeekPicker();
  await loadWeeklyData();
});

weeklySchedule?.addEventListener("click", (event) => {
  const dayButton = event.target.closest("[data-weekly-day]");
  if (!dayButton || !state.data) return;
  state.selectedDay = dayButton.dataset.weeklyDay || "";
  renderData(state.data);
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".weekly-picker")) return;
  setMenuOpen("", false);
});

attachDragScroll(weeklyCarouselRail);
attachDragScroll(weeklyEventRail);

(async function init() {
  setTheme(document.documentElement.dataset.theme || "light");
  await loadConfig();
  await loadWeeklyData();
  refreshStatus();
  state.statusTimer = window.setInterval(refreshStatus, 5000);
})();
