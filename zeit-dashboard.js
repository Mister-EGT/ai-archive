const TIMEZONE = "Europe/Berlin";

const providers = [
  {
    id: "time-now-berlin",
    label: "Time.Now, Europe/Berlin",
    description: "Feste Berlin-Zeitzone über Time.Now.",
    async fetchTime() {
      const data = await fetchJson(`https://time.now/developer/api/timezone/${TIMEZONE}`);
      return normalizeTimeResponse(data, "Time.Now hat Europe/Berlin geliefert");
    }
  },
  {
    id: "time-now-ip",
    label: "Time.Now, per IP-Erkennung",
    description: "Automatische Zeitzone über Time.Now und öffentliche IP.",
    async fetchTime() {
      const data = await fetchJson("https://time.now/developer/api/ip");
      return normalizeTimeResponse(data, "Time.Now hat per IP synchronisiert");
    }
  },
  {
    id: "worldtimeapi-berlin",
    label: "WorldTimeAPI, Europe/Berlin",
    description: "Feste Berlin-Zeitzone über WorldTimeAPI.",
    async fetchTime() {
      const data = await fetchJson(`https://worldtimeapi.org/api/timezone/${TIMEZONE}`);
      return normalizeTimeResponse(data, "WorldTimeAPI hat Europe/Berlin geliefert");
    }
  },
  {
    id: "timeapiio-berlin",
    label: "TimeAPI.io, Europe/Berlin",
    description: "Feste Berlin-Zeitzone über TimeAPI.io.",
    async fetchTime() {
      const data = await fetchJson(`https://timeapi.io/api/Time/current/zone?timeZone=${encodeURIComponent(TIMEZONE)}`);
      return normalizeTimeResponse(data, "TimeAPI.io hat Europe/Berlin geliefert");
    }
  },
  {
    id: "browser-local",
    label: "Browser-Systemzeit",
    description: "Kein externer Request. Nutzt die lokale Gerätezeit als Fallback.",
    async fetchTime() {
      return browserTimePayload();
    }
  }
];

const state = {
  activeProviderId: providers[0].id,
  syncedBaseMs: Date.now(),
  perfBaseMs: performance.now(),
  currentTimezone: TIMEZONE,
  currentUtcOffset: "unbekannt",
  activeSyncIntervalMs: 3000,
  passiveSyncIntervalMs: 6000,
  renderIntervalMs: 33,
  renderTimer: null,
  activeSyncTimer: null,
  passiveSyncTimer: null,
  providerStatus: Object.fromEntries(providers.map(provider => [provider.id, {
    healthState: "idle",
    text: provider.id === providers[0].id ? "Wird verbunden..." : "Nicht verwendet",
    detail: provider.description,
    lastSuccess: null,
    lastAttempt: null,
    backgroundHealthy: false,
    syncSource: null,
    lastError: null
  }]))
};

const elements = {
  timeText: document.getElementById("timeText"),
  millisecondsText: document.getElementById("millisecondsText"),
  dateText: document.getElementById("dateText"),
  zoneText: document.getElementById("zoneText"),
  offsetText: document.getElementById("offsetText"),
  activeSourceText: document.getElementById("activeSourceText"),
  lastSuccessText: document.getElementById("lastSuccessText"),
  lastAttemptText: document.getElementById("lastAttemptText"),
  providerSelect: document.getElementById("providerSelect"),
  providersList: document.getElementById("providersList"),
  globalSyncDot: document.getElementById("globalSyncDot"),
  globalSyncText: document.getElementById("globalSyncText")
};

function toOffsetString(totalMinutes) {
  const sign = totalMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(totalMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function browserTimePayload(label = "Lokale Gerätezeit übernommen") {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || TIMEZONE;
  const offsetMinutes = -now.getTimezoneOffset();

  return {
    epochMs: now.getTime(),
    timezone,
    utcOffset: toOffsetString(offsetMinutes),
    rawLabel: label
  };
}

function normalizeTimeResponse(data, fallbackLabel) {
  if (!data || typeof data !== "object") {
    throw new Error("Leere oder ungültige Antwort");
  }

  const iso = data.datetime || data.dateTime || data.currentDateTime || data.utc_datetime;
  let epochMs = Number.isFinite(data.epochMs) ? data.epochMs : null;

  if (!epochMs && typeof data.unixtime === "number") epochMs = data.unixtime * 1000;
  if (!epochMs && typeof data.unixTime === "number") epochMs = data.unixTime * 1000;
  if (!epochMs && typeof data.currentFileTime === "number") {
    epochMs = Math.floor((data.currentFileTime / 10000) - 11644473600000);
  }
  if (!epochMs && iso) epochMs = new Date(iso).getTime();

  if (!Number.isFinite(epochMs)) {
    throw new Error("Zeitstempel konnte nicht gelesen werden");
  }

  let timezone = data.timezone || data.timeZone || data.timeZoneName || TIMEZONE;
  if (timezone === "local") timezone = TIMEZONE;

  let utcOffset = data.utc_offset || data.utcOffset || null;
  if (!utcOffset && typeof data.gmtOffset === "number") {
    utcOffset = toOffsetString(Math.round(data.gmtOffset / 60));
  }
  if (!utcOffset && typeof data.raw_offset === "number") {
    utcOffset = toOffsetString(Math.round(data.raw_offset / 60));
  }
  if (!utcOffset && iso) {
    const match = String(iso).match(/([+-]\d{2}:\d{2}|Z)$/);
    utcOffset = match ? (match[1] === "Z" ? "+00:00" : match[1]) : "unbekannt";
  }

  return {
    epochMs,
    timezone,
    utcOffset: utcOffset || "unbekannt",
    rawLabel: fallbackLabel
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function formatDate(date, timezone) {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    timeZone: timezone
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}

function getEstimatedNow() {
  return new Date(state.syncedBaseMs + (performance.now() - state.perfBaseMs));
}

function getProviderById(providerId) {
  return providers.find(provider => provider.id === providerId);
}

function renderClock() {
  const now = getEstimatedNow();

  elements.timeText.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  elements.millisecondsText.textContent = `${pad(now.getMilliseconds(), 3)} ms`;
  elements.dateText.textContent = formatDate(now, state.currentTimezone);
  elements.zoneText.textContent = `Zeitzone: ${state.currentTimezone}`;
  elements.offsetText.textContent = `UTC Offset: ${state.currentUtcOffset}`;
}

function updateDerivedProviderText(providerId) {
  const entry = state.providerStatus[providerId];
  const isActive = providerId === state.activeProviderId;

  if (entry.healthState === "warn") {
    entry.text = isActive ? "Synchronisiere gerade..." : "Prüfe im Hintergrund...";
    return;
  }

  if (isActive) {
    if (entry.healthState === "ok") entry.text = "Synchronisiert";
    else if (entry.healthState === "err") entry.text = "Fehler, lokale Uhr läuft weiter";
    else entry.text = "Wird verbunden...";
    return;
  }

  if (entry.backgroundHealthy) {
    entry.text = "Nicht verwendet, im Hintergrund synchronisiert";
  } else if (entry.healthState === "err") {
    entry.text = "Nicht verwendet, Hintergrundfehler";
  } else {
    entry.text = "Nicht verwendet";
  }
}

function renderGlobalStatus() {
  const activeProvider = getProviderById(state.activeProviderId);
  const entry = state.providerStatus[state.activeProviderId];

  elements.globalSyncDot.className = `dot ${entry.healthState}`;
  elements.globalSyncText.textContent = `${activeProvider.label}: ${entry.text}`;
  elements.activeSourceText.textContent = activeProvider.label;
  elements.lastSuccessText.textContent = entry.lastSuccess ? formatDateTime(entry.lastSuccess) : "Noch keine";
  elements.lastAttemptText.textContent = entry.lastAttempt ? formatDateTime(entry.lastAttempt) : "Noch keiner";
}

function renderProviders() {
  elements.providersList.innerHTML = providers.map(provider => {
    const entry = state.providerStatus[provider.id];
    const activeClass = provider.id === state.activeProviderId ? "active" : "";
    const lastSuccess = entry.lastSuccess ? `Letzte erfolgreiche Sync: ${formatDateTime(entry.lastSuccess)}` : "Noch keine erfolgreiche Sync";
    const lastAttempt = entry.lastAttempt ? `Letzter Versuch: ${formatDateTime(entry.lastAttempt)}` : "Noch kein Versuch";

    return `
      <div class="provider-row ${activeClass}">
        <span class="dot ${entry.healthState}"></span>
        <div>
          <div class="provider-main">
            <span class="provider-name">${provider.label}</span>
            <span class="provider-status">${entry.text}</span>
          </div>
          <div class="provider-detail">${entry.detail}<br>${lastSuccess}<br>${lastAttempt}</div>
        </div>
      </div>
    `;
  }).join("");
}

function refreshUi() {
  providers.forEach(provider => updateDerivedProviderText(provider.id));
  renderProviders();
  renderGlobalStatus();
}

async function runProviderSync(providerId, mode = "background") {
  const provider = getProviderById(providerId);
  const entry = state.providerStatus[providerId];

  entry.lastAttempt = new Date();
  entry.syncSource = mode;
  entry.lastError = null;
  entry.healthState = "warn";
  entry.detail = mode === "active"
    ? `${provider.description} Aktive Quelle wird neu synchronisiert.`
    : `${provider.description} Läuft als Hintergrundprüfung.`;

  refreshUi();

  try {
    const result = await provider.fetchTime();
    entry.lastSuccess = new Date();
    entry.backgroundHealthy = true;
    entry.healthState = "ok";
    entry.detail = result.rawLabel || provider.description;

    if (mode === "active") {
      state.syncedBaseMs = result.epochMs;
      state.perfBaseMs = performance.now();
      state.currentTimezone = result.timezone || TIMEZONE;
      state.currentUtcOffset = result.utcOffset || "unbekannt";
      renderClock();
    }
  } catch (error) {
    entry.lastError = error;
    entry.backgroundHealthy = false;
    entry.healthState = "err";
    entry.detail = `Fehlgeschlagen: ${error.message}`;

    if (mode === "active") {
      const fallback = browserTimePayload("Aktive API fehlgeschlagen, lokale Gerätezeit übernommen");
      state.syncedBaseMs = fallback.epochMs;
      state.perfBaseMs = performance.now();
      state.currentTimezone = fallback.timezone;
      state.currentUtcOffset = fallback.utcOffset;
      renderClock();
    }

    console.error(`Synchronisierung fehlgeschlagen für ${provider.label}:`, error);
  }

  refreshUi();
}

async function syncActiveProvider() {
  await runProviderSync(state.activeProviderId, "active");
}

async function syncPassiveProviders() {
  const passiveIds = providers
    .map(provider => provider.id)
    .filter(providerId => providerId !== state.activeProviderId);

  await Promise.allSettled(passiveIds.map(providerId => runProviderSync(providerId, "background")));
}

function rebuildProviderSelect() {
  elements.providerSelect.innerHTML = providers.map(provider => `
    <option value="${provider.id}">${provider.label}</option>
  `).join("");
  elements.providerSelect.value = state.activeProviderId;
}

function restartTimers() {
  if (state.activeSyncTimer) clearInterval(state.activeSyncTimer);
  if (state.passiveSyncTimer) clearInterval(state.passiveSyncTimer);

  state.activeSyncTimer = setInterval(syncActiveProvider, state.activeSyncIntervalMs);
  state.passiveSyncTimer = setInterval(syncPassiveProviders, state.passiveSyncIntervalMs);
}

async function activateProvider(providerId) {
  state.activeProviderId = providerId;
  elements.providerSelect.value = providerId;
  refreshUi();
  await syncActiveProvider();
  await syncPassiveProviders();
  restartTimers();
}

async function start() {
  rebuildProviderSelect();
  refreshUi();
  renderClock();

  elements.providerSelect.addEventListener("change", async event => {
    await activateProvider(event.target.value);
  });

  state.renderTimer = setInterval(renderClock, state.renderIntervalMs);
  await activateProvider(state.activeProviderId);
}

window.addEventListener("beforeunload", () => {
  if (state.renderTimer) clearInterval(state.renderTimer);
  if (state.activeSyncTimer) clearInterval(state.activeSyncTimer);
  if (state.passiveSyncTimer) clearInterval(state.passiveSyncTimer);
});

start();
