const STORAGE_KEY = "capability-engine-v2";
const THEME_KEY = "capability-engine-theme";

const state = {
  sessions: [],
  filters: {
    mode: "",
    activity: "",
    caffeine: "",
    activation: "",
    response: ""
  }
};

const els = {
  body: document.body,
  themeToggle: document.getElementById("themeToggle"),
  sessionForm: document.getElementById("sessionForm"),
  resetFormBtn: document.getElementById("resetFormBtn"),
  date: document.getElementById("date"),
  mode: document.getElementById("mode"),
  activity: document.getElementById("activity"),
  functionPurpose: document.getElementById("functionPurpose"),
  sessionType: document.getElementById("sessionType"),
  effort: document.getElementById("effort"),
  effortValue: document.getElementById("effortValue"),
  duration: document.getElementById("duration"),
  distance: document.getElementById("distance"),
  volume: document.getElementById("volume"),
  notes: document.getElementById("notes"),
  timeOfDayGroup: document.getElementById("timeOfDayGroup"),
  responseGroup: document.getElementById("responseGroup"),
  poolLength: document.getElementById("poolLength"),
  poolUnit: document.getElementById("poolUnit"),
  poolLengths: document.getElementById("poolLengths"),
  yardsOutput: document.getElementById("yardsOutput"),
  metersOutput: document.getElementById("metersOutput"),
  copyDistanceBtn: document.getElementById("copyDistanceBtn"),
  filterMode: document.getElementById("filterMode"),
  filterActivity: document.getElementById("filterActivity"),
  filterCaffeine: document.getElementById("filterCaffeine"),
  filterActivation: document.getElementById("filterActivation"),
  filterResponse: document.getElementById("filterResponse"),
  clearFiltersBtn: document.getElementById("clearFiltersBtn"),
  sessionLog: document.getElementById("sessionLog"),
  historyMeta: document.getElementById("historyMeta"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  importJsonInput: document.getElementById("importJsonInput")
};

function init() {
  applySavedTheme();
  setDefaultDate();
  loadSessions();
  bindEvents();
  populateFilterActivities();
  render();
  updateSwimCalculator();
  registerServiceWorker();
}

function bindEvents() {
  els.themeToggle.addEventListener("click", toggleTheme);

  els.effort.addEventListener("input", () => {
    els.effortValue.textContent = els.effort.value;
  });

  document.querySelectorAll(".segmented").forEach(group => {
    group.addEventListener("click", event => {
      const btn = event.target.closest(".seg-btn");
      if (!btn) return;
      group.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.querySelectorAll(".single-select").forEach(group => {
    group.addEventListener("click", event => {
      const chip = event.target.closest(".chip");
      if (!chip) return;
      group.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  document.querySelectorAll(".multi-select").forEach(group => {
    group.addEventListener("click", event => {
      const chip = event.target.closest(".chip");
      if (!chip) return;
      chip.classList.toggle("active");
    });
  });

  els.sessionForm.addEventListener("submit", handleSubmit);
  els.resetFormBtn.addEventListener("click", resetForm);

  ["input", "change"].forEach(type => {
    els.poolLength.addEventListener(type, updateSwimCalculator);
    els.poolUnit.addEventListener(type, updateSwimCalculator);
    els.poolLengths.addEventListener(type, updateSwimCalculator);
  });

  els.copyDistanceBtn.addEventListener("click", copyDistanceToEntry);

  els.filterMode.addEventListener("change", handleFilterChange);
  els.filterActivity.addEventListener("change", handleFilterChange);
  els.filterCaffeine.addEventListener("change", handleFilterChange);
  els.filterActivation.addEventListener("change", handleFilterChange);
  els.filterResponse.addEventListener("change", handleFilterChange);
  els.clearFiltersBtn.addEventListener("click", clearFilters);

  els.exportJsonBtn.addEventListener("click", exportJson);
  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.importJsonInput.addEventListener("change", importJsonFile);
}

function setDefaultDate() {
  if (!els.date.value) {
    els.date.value = new Date().toISOString().split("T")[0];
  }
}

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "light";
  if (saved === "dark") {
    els.body.classList.add("dark");
  }
  updateThemeIcon();
}

function toggleTheme() {
  els.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, els.body.classList.contains("dark") ? "dark" : "light");
  updateThemeIcon();
}

function updateThemeIcon() {
  els.themeToggle.textContent = els.body.classList.contains("dark") ? "◐" : "☼";
}

function getSegmentedValue(groupName) {
  const active = document.querySelector(`[data-group="${groupName}"] .seg-btn.active`);
  return active ? active.dataset.value : "";
}

function getSingleChipValue(groupEl) {
  const active = groupEl.querySelector(".chip.active");
  return active ? active.dataset.value : "";
}

function getMultiChipValues(groupEl) {
  return Array.from(groupEl.querySelectorAll(".chip.active")).map(chip => chip.dataset.value);
}

function handleSubmit(event) {
  event.preventDefault();

  const session = {
    id: createId(),
    date: els.date.value,
    mode: els.mode.value,
    activity: els.activity.value,
    functionPurpose: els.functionPurpose.value,
    sessionType: els.sessionType.value,
    effort: Number(els.effort.value),
    duration: els.duration.value.trim(),
    distance: els.distance.value.trim(),
    volume: els.volume.value.trim(),
    variables: {
      caffeine: getSegmentedValue("caffeine"),
      activation: getSegmentedValue("activation"),
      timeOfDay: getSingleChipValue(els.timeOfDayGroup)
    },
    responses: getMultiChipValues(els.responseGroup),
    notes: els.notes.value.trim(),
    createdAt: new Date().toISOString()
  };

  state.sessions.unshift(session);
  persistSessions();
  populateFilterActivities();
  render();
  resetForm();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resetForm() {
  els.sessionForm.reset();
  setDefaultDate();

  els.effort.value = 5;
  els.effortValue.textContent = "5";

  document.querySelectorAll(".segmented").forEach(group => {
    const buttons = group.querySelectorAll(".seg-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    if (buttons[0]) buttons[0].classList.add("active");
  });

  els.timeOfDayGroup.querySelectorAll(".chip").forEach((chip, index) => {
    chip.classList.toggle("active", index === 0);
  });

  els.responseGroup.querySelectorAll(".chip").forEach(chip => chip.classList.remove("active"));
}

function updateSwimCalculator() {
  const poolLength = parseFloat(els.poolLength.value) || 0;
  const lengths = parseFloat(els.poolLengths.value) || 0;
  const unit = els.poolUnit.value;

  let totalMeters = 0;
  let totalYards = 0;

  if (unit === "yards") {
    totalYards = poolLength * lengths;
    totalMeters = totalYards * 0.9144;
  } else {
    totalMeters = poolLength * lengths;
    totalYards = totalMeters / 0.9144;
  }

  els.yardsOutput.textContent = formatNumber(totalYards);
  els.metersOutput.textContent = formatNumber(totalMeters);
}

function copyDistanceToEntry() {
  const yards = els.yardsOutput.textContent;
  const meters = els.metersOutput.textContent;
  if (yards === "0" && meters === "0") return;
  els.distance.value = `${yards} yd / ${meters} m`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1);
}

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.sessions = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load sessions:", error);
    state.sessions = [];
  }
}

function persistSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sessions));
}

function handleFilterChange() {
  state.filters.mode = els.filterMode.value;
  state.filters.activity = els.filterActivity.value;
  state.filters.caffeine = els.filterCaffeine.value;
  state.filters.activation = els.filterActivation.value;
  state.filters.response = els.filterResponse.value;
  render();
}

function clearFilters() {
  state.filters = {
    mode: "",
    activity: "",
    caffeine: "",
    activation: "",
    response: ""
  };

  els.filterMode.value = "";
  els.filterActivity.value = "";
  els.filterCaffeine.value = "";
  els.filterActivation.value = "";
  els.filterResponse.value = "";

  render();
}

function getFilteredSessions() {
  return state.sessions.filter(session => {
    const matchesMode = !state.filters.mode || session.mode === state.filters.mode;
    const matchesActivity = !state.filters.activity || session.activity === state.filters.activity;
    const matchesCaffeine = !state.filters.caffeine || session.variables?.caffeine === state.filters.caffeine;
    const matchesActivation = !state.filters.activation || session.variables?.activation === state.filters.activation;
    const matchesResponse = !state.filters.response || (session.responses || []).includes(state.filters.response);

    return (
      matchesMode &&
      matchesActivity &&
      matchesCaffeine &&
      matchesActivation &&
      matchesResponse
    );
  });
}

function render() {
  const sessions = getFilteredSessions();
  els.historyMeta.textContent = `${sessions.length} session${sessions.length === 1 ? "" : "s"}`;

  if (!sessions.length) {
    els.sessionLog.className = "log-list empty-state";
    els.sessionLog.innerHTML = `
      <div class="empty-card">
        <h3>No matching sessions</h3>
        <p>Try changing filters or save a new entry.</p>
      </div>
    `;
    return;
  }

  els.sessionLog.className = "log-list";
  els.sessionLog.innerHTML = sessions.map(renderSessionCard).join("");
}

function renderSessionCard(session) {
  const detailPills = [
    session.functionPurpose,
    session.sessionType,
    session.duration ? `${escapeHtml(session.duration)} min` : null,
    session.distance ? `Distance: ${escapeHtml(session.distance)}` : null,
    session.volume ? `Volume: ${escapeHtml(session.volume)}` : null,
    `Effort: ${session.effort}/10`
  ].filter(Boolean);

  const variablePills = [
    `Green tea: ${session.variables?.caffeine || "—"}`,
    `Activation: ${session.variables?.activation || "—"}`,
    `Time: ${session.variables?.timeOfDay || "—"}`
  ];

  const responsePills = (session.responses || [])
    .map(item => `<span class="meta-pill">${escapeHtml(item)}</span>`)
    .join("");

  return `
    <article class="session-card">
      <div class="session-top">
        <div>
          <div class="session-title">${escapeHtml(session.activity)} · ${escapeHtml(session.mode)}</div>
          <div class="session-date">${formatDate(session.date)}</div>
        </div>
      </div>

      <div class="meta-row">
        ${detailPills.map(item => `<span class="meta-pill">${item}</span>`).join("")}
      </div>

      <div class="detail-row">
        ${variablePills.map(item => `<span class="meta-pill">${escapeHtml(item)}</span>`).join("")}
      </div>

      ${responsePills ? `<div class="detail-row">${responsePills}</div>` : ""}

      ${session.notes ? `<div class="note-block">${escapeHtml(session.notes)}</div>` : ""}
    </article>
  `;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function populateFilterActivities() {
  const activities = Array.from(
    new Set(state.sessions.map(s => s.activity).filter(Boolean))
  ).sort();

  const current = els.filterActivity.value;

  els.filterActivity.innerHTML =
    `<option value="">All</option>` +
    activities.map(activity => `<option>${escapeHtml(activity)}</option>`).join("");

  if (activities.includes(current)) {
    els.filterActivity.value = current;
  }
}

function exportJson() {
  downloadFile(
    JSON.stringify(state.sessions, null, 2),
    `capability-engine-sessions-${todayStamp()}.json`,
    "application/json"
  );
}

function exportCsv() {
  const headers = [
    "date",
    "mode",
    "activity",
    "functionPurpose",
    "sessionType",
    "effort",
    "duration",
    "distance",
    "volume",
    "caffeine",
    "activation",
    "timeOfDay",
    "responses",
    "notes",
    "createdAt"
  ];

  const rows = state.sessions.map(session => [
    session.date,
    session.mode,
    session.activity,
    session.functionPurpose,
    session.sessionType,
    session.effort,
    session.duration,
    session.distance,
    session.volume,
    session.variables?.caffeine || "",
    session.variables?.activation || "",
    session.variables?.timeOfDay || "",
    (session.responses || []).join(" | "),
    session.notes || "",
    session.createdAt || ""
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(csvEscape).join(","))
    .join("\n");

  downloadFile(
    csv,
    `capability-engine-sessions-${todayStamp()}.csv`,
    "text/csv;charset=utf-8"
  );
}

function importJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);

      if (!Array.isArray(parsed)) {
        throw new Error("Imported file is not a valid session array.");
      }

      state.sessions = parsed.concat(state.sessions).sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      persistSessions();
      populateFilterActivities();
      render();
      event.target.value = "";
    } catch (error) {
      console.error(error);
      alert("Could not import JSON file.");
    }
  };

  reader.readAsText(file);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const safe = String(value ?? "");
  return `"${safe.replace(/"/g, '""')}"`;
}

function todayStamp() {
  return new Date().toISOString().split("T")[0];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.error("Service worker registration failed:", error);
    });
  });
}

init();