const themeToggle = document.querySelector("#themeToggle");
const schedulerInterval = document.querySelector("#schedulerInterval");
const schedulerTrigger = document.querySelector("#schedulerTrigger");
const schedulerMenu = document.querySelector("#schedulerMenu");
const schedulerList = document.querySelector("#schedulerList");
const schedulerToggle = document.querySelector("#schedulerToggle");
const schedulerRunOnce = document.querySelector("#schedulerRunOnce");
const schedulerHint = document.querySelector("#schedulerHint");
const schedulerStatePill = document.querySelector("#schedulerStatePill");
const schedulerSummaryStatus = document.querySelector("#schedulerSummaryStatus");
const schedulerSummaryNext = document.querySelector("#schedulerSummaryNext");
const schedulerSummaryLast = document.querySelector("#schedulerSummaryLast");
const schedulerProgressArea = document.querySelector("#schedulerProgressArea");
const schedulerProgressTitle = document.querySelector("#schedulerProgressTitle");
const schedulerProgressText = document.querySelector("#schedulerProgressText");
const schedulerProgressLog = document.querySelector("#schedulerProgressLog");
const COMPLETED_PROGRESS_HIDE_DELAY = 3200;
const SCHEDULER_PROGRESS_DISMISSED_KEY = "appexpo-sync-progress-dismissed";

const state = {
  schedulerMenuOpen: false,
  schedulerState: null,
  progressDismissTimer: null
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSchedulerTime(value) {
  if (!value) return "未安排";
  return formatTime(value);
}

function schedulerRunning() {
  return Boolean(state.schedulerState?.running);
}

function selectedSchedulerLabel() {
  const option = schedulerInterval.selectedOptions?.[0];
  return option ? option.textContent : "请选择频率";
}

function renderSchedulerOptions() {
  schedulerTrigger.querySelector("span").textContent = selectedSchedulerLabel();
  schedulerList.innerHTML = Array.from(schedulerInterval.options).map((option) => {
    const active = option.value === schedulerInterval.value;
    return `
      <button class="game-option${active ? " active" : ""}" type="button" role="option" aria-selected="${active ? "true" : "false"}" data-scheduler-value="${option.value}">
        <span>${option.textContent || ""}</span>
      </button>
    `;
  }).join("");
}

function setSchedulerMenu(open) {
  state.schedulerMenuOpen = open;
  schedulerMenu.hidden = !open;
  schedulerTrigger.setAttribute("aria-expanded", open ? "true" : "false");
}

function schedulerProgressKey(scheduler) {
  const status = scheduler?.lastStatus || "idle";
  const finishedAt = scheduler?.lastFinishedAt || "";
  return `${status}:${finishedAt}`;
}

function isCompletedSchedulerStatus(status) {
  return status === "completed" || status === "completed-local-only";
}

function hasCompletedProgressEvent(events) {
  const lastEvent = Array.isArray(events) ? events[events.length - 1] : null;
  return Boolean(lastEvent?.status === "success" && /已写入本地历史记录|全部接口成功/.test(lastEvent.message || ""));
}

function isCompletedSchedulerProgress(scheduler, events) {
  return Boolean(!scheduler?.running && scheduler?.lastFinishedAt && (isCompletedSchedulerStatus(scheduler.lastStatus) || hasCompletedProgressEvent(events)));
}

function getDismissedSchedulerProgressKey() {
  try {
    return sessionStorage.getItem(SCHEDULER_PROGRESS_DISMISSED_KEY) || "";
  } catch (error) {
    return "";
  }
}

function setDismissedSchedulerProgressKey(value) {
  try {
    if (!value) {
      sessionStorage.removeItem(SCHEDULER_PROGRESS_DISMISSED_KEY);
      return;
    }
    sessionStorage.setItem(SCHEDULER_PROGRESS_DISMISSED_KEY, value);
  } catch (error) {
    // ignore storage errors
  }
}

function clearProgressDismissTimer() {
  if (state.progressDismissTimer) {
    clearTimeout(state.progressDismissTimer);
    state.progressDismissTimer = null;
  }
}

function scheduleCompletedProgressDismiss(scheduler) {
  clearProgressDismissTimer();
  const key = schedulerProgressKey(scheduler);
  if (!key || !schedulerProgressArea || schedulerProgressArea.hidden) return;
  state.progressDismissTimer = window.setTimeout(() => {
    setDismissedSchedulerProgressKey(key);
    schedulerProgressArea.hidden = true;
    state.progressDismissTimer = null;
  }, COMPLETED_PROGRESS_HIDE_DELAY);
}

function renderSchedulerSummary(scheduler) {
  const events = scheduler.progressEvents || [];
  const statusLabel = scheduler.running
    ? "同步中"
    : scheduler.enabled
      ? "已启动"
      : scheduler.lastStatus === "failed"
        ? "失败"
        : "未启动";
  schedulerStatePill.textContent = statusLabel;
  schedulerStatePill.dataset.state = scheduler.running
    ? "running"
    : scheduler.enabled
      ? "enabled"
      : scheduler.lastStatus === "failed"
        ? "failed"
        : "idle";
  schedulerSummaryStatus.textContent = statusLabel;
  schedulerSummaryNext.textContent = scheduler.enabled ? formatSchedulerTime(scheduler.nextRunAt) : "未安排";
  schedulerSummaryLast.textContent = scheduler.lastFinishedAt ? formatSchedulerTime(scheduler.lastFinishedAt) : "未执行";
  const showProgressArea = scheduler.running || scheduler.lastStatus === "failed";
  schedulerProgressArea.hidden = !showProgressArea;
  if (scheduler.running) {
    clearProgressDismissTimer();
    setDismissedSchedulerProgressKey("");
    schedulerProgressTitle.textContent = "同步执行中";
    schedulerProgressText.textContent = `正在同步 ${scheduler.currentGame || "准备中"}${scheduler.currentIndex ? ` (${scheduler.currentIndex}/${scheduler.totalGames || 0})` : ""}`;
  } else if (scheduler.lastStatus === "failed") {
    clearProgressDismissTimer();
    schedulerProgressTitle.textContent = "最近一次同步记录";
    schedulerProgressText.textContent = `同步未完成：${scheduler.lastError || "存在失败接口"}`;
  } else {
    clearProgressDismissTimer();
    renderSchedulerProgressLog([]);
    return;
  }
  renderSchedulerProgressLog(events);
}

function renderSchedulerProgressLog(events) {
  if (!schedulerProgressLog) return;
  const list = Array.isArray(events) ? events.slice() : [];
  schedulerProgressLog.hidden = list.length === 0;
  if (!list.length) {
    schedulerProgressLog.innerHTML = "";
    return;
  }
  schedulerProgressLog.innerHTML = list.map((item) => {
    const label = [item.country, item.pageType ? item.pageType.toUpperCase() : "", item.retry ? "补重试" : ""].filter(Boolean).join(" · ");
    const timeLabel = formatTime(item.time);
    return `
      <div class="sync-progress-log-item" data-status="${item.status || "info"}">
        <span class="sync-progress-log-dot" aria-hidden="true"></span>
        <div class="sync-progress-log-body">
          <div class="sync-progress-log-head">
            <span class="sync-progress-log-meta">${escapeHtml(label || "同步")}</span>
            <span class="sync-progress-log-time">${escapeHtml(timeLabel)}</span>
          </div>
          <span class="sync-progress-log-text">${escapeHtml(item.message || "")}</span>
        </div>
      </div>
    `;
  }).join("");
  schedulerProgressLog.scrollTop = schedulerProgressLog.scrollHeight;
}

async function loadSchedulerStatus() {
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
    schedulerTrigger.disabled = scheduler.running;
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
    renderSchedulerSummary(scheduler);
  } catch (error) {
    schedulerHint.textContent = error.message || "定时器状态加载失败";
    schedulerStatePill.textContent = "异常";
    schedulerStatePill.dataset.state = "failed";
    schedulerSummaryStatus.textContent = "异常";
    schedulerSummaryNext.textContent = "未安排";
    schedulerSummaryLast.textContent = "未执行";
    schedulerProgressArea.hidden = true;
    schedulerProgressTitle.textContent = "同步执行中";
    renderSchedulerProgressLog([]);
  }
}

async function toggleScheduler() {
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

schedulerTrigger.addEventListener("click", () => {
  if (schedulerRunning()) return;
  setSchedulerMenu(!state.schedulerMenuOpen);
});

schedulerList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-scheduler-value]");
  if (!button || schedulerRunning()) return;
  schedulerInterval.value = button.dataset.schedulerValue;
  setSchedulerMenu(false);
  renderSchedulerOptions();
});

schedulerToggle.addEventListener("click", async () => {
  try {
    await toggleScheduler();
  } catch (error) {
    alert(error.message || "定时器操作失败");
  }
});

schedulerRunOnce.addEventListener("click", async () => {
  try {
    await runSchedulerOnce();
  } catch (error) {
    alert(error.message || "立即执行失败");
  }
});

document.addEventListener("click", (event) => {
  if (state.schedulerMenuOpen && !event.target.closest(".scheduler-picker")) setSchedulerMenu(false);
});

themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

setTheme(currentTheme());
renderSchedulerOptions();
loadSchedulerStatus();
setInterval(loadSchedulerStatus, 10000);
