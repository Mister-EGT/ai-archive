const els = {
  q: document.getElementById("q"),
  developer: document.getElementById("developer"),
  modality: document.getElementById("modality"),
  status: document.getElementById("status"),
  sort: document.getElementById("sort"),
  resetBtn: document.getElementById("resetBtn"),
  rows: document.getElementById("rows"),
  thead: document.getElementById("thead"),
  countLabel: document.getElementById("countLabel"),
  emptyState: document.getElementById("emptyState"),
  detailDialog: document.getElementById("detailDialog"),
  developerWrap: document.getElementById("developerWrap"),
  modalityWrap: document.getElementById("modalityWrap"),
  statusWrap: document.getElementById("statusWrap"),
  calcModelSearch: document.getElementById("calcModelSearch"),
  calcModelMenu: document.getElementById("calcModelMenu"),
  calcInputTokens: document.getElementById("calcInputTokens"),
  calcOutputTokens: document.getElementById("calcOutputTokens"),
  calcResult: document.getElementById("calcResult")
};

const d = {
  logo: document.getElementById("dLogo"),
  name: document.getElementById("dName"),
  dev: document.getElementById("dDev"),
  kv: document.getElementById("dKV"),
  notesWrap: document.getElementById("dNotesWrap"),
  notes: document.getElementById("dNotes"),
  links: document.getElementById("dLinks")
};

let allModels = [];
let filtered = [];
let activeColumns = [];
let tokenCalcModels = [];

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(s) {
  return String(s ?? "").toLowerCase().trim();
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(2)} $/1M`;
}

function fmtInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Intl.NumberFormat("de-DE").format(n);
}

function fmtCurrency(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(s) {
  if (!s) return null;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return String(s);
  return dt.toLocaleDateString("de-DE");
}

function statusDot(status) {
  if (status === "active") return "green";
  if (status === "deprecated") return "red";
  return "";
}

function badge(label, dotClass = "") {
  return `<span class="badge"><span class="dot ${dotClass}"></span>${escapeHtml(label)}</span>`;
}

function hasAny(models, key) {
  return models.some(m => {
    if (!m || !Object.prototype.hasOwnProperty.call(m, key)) return false;
    const v = m[key];
    if (v === null || v === undefined) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
}

function getActiveColumns(models) {
  const candidates = [
    {
      key: "name",
      label: "Model",
      type: "text",
      important: true,
      cell: (m) => {
        const logo = m.modelIconUrl
          ? `<img src="${escapeHtml(m.modelIconUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "";
        return `<span class="dev"><span>${escapeHtml(m.name || "")}</span>${logo}</span>`
      }
    },
    {
      key: "developerName",
      label: "Entwickler",
      type: "text",
      important: true,
      cell: (m) => {
        const logo = m.developerLogoUrl
          ? `<img src="${escapeHtml(m.developerLogoUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "";
        return `<span class="dev">${logo}<span>${escapeHtml(m.developerName || "")}</span></span>`;
      }
    },
    {
      key: "contextWindow",
      label: "Kontext",
      type: "text",
      cell: (m) => escapeHtml(fmtInt(m.contextWindow) ?? "")
    },
    {
      key: "inputCostPer1MTokens",
      label: "Input",
      type: "text",
      cell: (m) => escapeHtml(fmtMoney(m.inputCostPer1MTokens) ?? "")
    },
    {
      key: "outputCostPer1MTokens",
      label: "Output",
      type: "text",
      cell: (m) => escapeHtml(fmtMoney(m.outputCostPer1MTokens) ?? "")
    },
    {
      key: "modality",
      label: "ModalitÃ¤t",
      type: "badge",
      cell: (m) => m.modality ? badge(m.modality) : ""
    },
    {
      key: "status",
      label: "Status",
      type: "badge",
      cell: (m) => m.status ? badge(m.status, statusDot(m.status)) : ""
    },
    {
      key: "releaseDate",
      label: "Release",
      type: "text",
      cell: (m) => escapeHtml(fmtDate(m.releaseDate) ?? "")
    },
    {
      key: "tags",
      label: "Tags",
      type: "text",
      cell: (m) => {
        const tags = Array.isArray(m.tags) ? m.tags : null;
        return tags ? escapeHtml(tags.slice(0, 5).join(", ")) : "";
      }
    }
  ];

  return candidates.filter(c => c.important || hasAny(models, c.key));
}

function buildSortOptions(cols) {
  const options = [];

  options.push({ value: "name-asc", label: "Name A Z" });
  options.push({ value: "name-desc", label: "Name Z A" });

  if (cols.some(c => c.key === "inputCostPer1MTokens")) {
    options.push({ value: "in-asc", label: "Input Kosten aufsteigend" });
    options.push({ value: "in-desc", label: "Input Kosten absteigend" });
  }
  if (cols.some(c => c.key === "outputCostPer1MTokens")) {
    options.push({ value: "out-asc", label: "Output Kosten aufsteigend" });
    options.push({ value: "out-desc", label: "Output Kosten absteigend" });
  }
  if (cols.some(c => c.key === "releaseDate")) {
    options.push({ value: "release-desc", label: "Release neu zuerst" });
    options.push({ value: "release-asc", label: "Release alt zuerst" });
  }

  return options;
}

function fillDeveloperFilter(models) {
  const set = new Set(models.map(m => m.developerName).filter(Boolean));
  const devs = ["", ...Array.from(set).sort((a, b) => a.localeCompare(b, "de"))];
  els.developer.innerHTML = devs
    .map(v => `<option value="${escapeHtml(v)}">${v ? escapeHtml(v) : "Alle"}</option>`)
    .join("");
}

function applyFilters() {
  const q = normalize(els.q.value);
  const developer = els.developer.value;
  const modality = els.modality.value;
  const status = els.status.value;

  filtered = allModels.filter(m => {
    if (developer && m.developerName !== developer) return false;
    if (modality && m.modality !== modality) return false;
    if (status && m.status !== status) return false;

    if (q) {
      const parts = [];
      if (m.name) parts.push(m.name);
      if (m.developerName) parts.push(m.developerName);
      if (Array.isArray(m.tags)) parts.push(m.tags.join(" "));
      if (m.notes) parts.push(m.notes);
      const hay = normalize(parts.join(" "));
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  applySort();
  render();
}

function valForSortNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function applySort() {
  const s = els.sort.value;

  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de");
  const rel = (x) => {
  if (!x || !x.releaseDate) return Number.POSITIVE_INFINITY;
  const t = new Date(x.releaseDate).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
	};
	const byRelease = (a, b) => rel(a) - rel(b);
  const byIn = (a, b) => valForSortNum(a.inputCostPer1MTokens) - valForSortNum(b.inputCostPer1MTokens);
  const byOut = (a, b) => valForSortNum(a.outputCostPer1MTokens) - valForSortNum(b.outputCostPer1MTokens);

  const map = {
    "name-asc": (a, b) => byName(a, b),
    "name-desc": (a, b) => byName(b, a),
    "release-asc": (a, b) => byRelease(a, b),
    "release-desc": (a, b) => byRelease(b, a),
    "in-asc": (a, b) => byIn(a, b),
    "in-desc": (a, b) => byIn(b, a),
    "out-asc": (a, b) => byOut(a, b),
    "out-desc": (a, b) => byOut(b, a)
  };

  filtered.sort(map[s] || map["name-asc"]);
}

function renderTableHeader() {
  els.thead.innerHTML = `
    <tr>
      ${activeColumns.map(c => {
        const cls = c.type === "right" ? "right" : "";
        return `<th class="${cls}">${escapeHtml(c.label)}</th>`;
      }).join("")}
    </tr>
  `;
}

function render() {
  els.countLabel.textContent = `${filtered.length} Modelle`;
  els.emptyState.hidden = filtered.length !== 0;

  els.rows.innerHTML = filtered.map(m => {
    const tds = activeColumns.map(c => {
      const cls = c.type === "right" ? "right" : "";
      const label = c.label;
      const content = c.cell(m) || "";
      return `<td class="${cls}" data-label="${escapeHtml(label)}">${content}</td>`;
    }).join("");

    return `<tr data-id="${escapeHtml(m.id || "")}" tabindex="0" role="button" aria-label="Details Ã¶ffnen">${tds}</tr>`;
  }).join("");

  for (const tr of els.rows.querySelectorAll("tr")) {
    tr.addEventListener("click", () => openDetails(tr.dataset.id));
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDetails(tr.dataset.id);
      }
    });
  }
}

function linkChip(label, url) {
  if (!url) return "";
  const safe = escapeHtml(url);
  return `<a class="link" href="${safe}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function addKV(rows, label, value) {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;
  rows.push(`<div class="k">${escapeHtml(label)}</div><div class="v">${escapeHtml(String(value))}</div>`);
}

function openDetails(id) {
  const m = allModels.find(x => String(x.id || "") === String(id || ""));
  if (!m) return;

  d.logo.innerHTML = m.developerLogoUrl
    ? `<img src="${escapeHtml(m.developerLogoUrl)}" alt="" onerror="this.style.display='none'">`
    : "";

  d.name.textContent = m.name || "";
  d.dev.textContent = m.developerName || "";

  const rows = [];
  addKV(rows, "ModalitÃ¤t", m.modality);
  addKV(rows, "Status", m.status);
  addKV(rows, "Kontextfenster", fmtInt(m.contextWindow) ?? null);
  addKV(rows, "Kosten Input", fmtMoney(m.inputCostPer1MTokens) ?? null);
  addKV(rows, "Kosten Output", fmtMoney(m.outputCostPer1MTokens) ?? null);
  addKV(rows, "Release", fmtDate(m.releaseDate) ?? null);
  addKV(rows, "Letztes Update", fmtDate(m.updatedAt) ?? null);

  if (Array.isArray(m.tags) && m.tags.length) addKV(rows, "Tags", m.tags.join(", "));

  d.kv.innerHTML = rows.join("");
  if (!rows.length) d.kv.innerHTML = `<div class="muted small">Keine Detailfelder vorhanden.</div>`;

  if (m.notes) {
    d.notesWrap.hidden = false;
    d.notes.textContent = m.notes;
  } else {
    d.notesWrap.hidden = true;
    d.notes.textContent = "";
  }

  const links = [
    linkChip("Website", m.websiteUrl),
    linkChip("Docs", m.docsUrl),
    linkChip("Pricing", m.pricingUrl)
  ].filter(Boolean).join("");

  d.links.innerHTML = links;

  els.detailDialog.showModal();
}

function reset() {
  els.q.value = "";
  if (els.developer) els.developer.value = "";
  if (els.modality) els.modality.value = "";
  if (els.status) els.status.value = "";
  if (els.sort) els.sort.value = "release-desc";
  applyFilters();
}

function fillTokenCalculator(models) {
  if (!els.calcModelSearch || !els.calcModelMenu) return;
  tokenCalcModels = models
    .slice()
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de"));

  els.calcModelSearch.value = "";
  renderTokenCalcMenu("", false);
  updateTokenCalculator();
}

function getTokenCalcMatches(query) {
  const q = normalize(query);
  if (!q) return tokenCalcModels;
  return tokenCalcModels
    .filter(m => normalize(`${m.name || ""} ${m.developerName || ""} ${m.id || ""}`).includes(q))
    ;
}

function renderTokenCalcMenu(query, forceShow = false) {
  if (!els.calcModelMenu) return;

  const matches = getTokenCalcMatches(query);
  if (!matches.length) {
    els.calcModelMenu.hidden = true;
    els.calcModelMenu.innerHTML = "";
    return;
  }

  els.calcModelMenu.innerHTML = matches
    .map((m) => {
      const name = escapeHtml(m.name || "Unbenanntes Modell");
      const dev = escapeHtml(m.developerName || "Unbekannt");
      return `<button type="button" class="calc-menu-item" data-model-id="${escapeHtml(String(m.id || ""))}"><span class="calc-menu-name">${name}</span><span class="calc-menu-dev">${dev}</span></button>`;
    })
    .join("");

  for (const btn of els.calcModelMenu.querySelectorAll(".calc-menu-item")) {
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const id = btn.dataset.modelId;
      const selected = tokenCalcModels.find(m => String(m.id || "") === String(id || ""));
      if (!selected || !els.calcModelSearch) return;
      els.calcModelSearch.value = selected.name || "";
      els.calcModelMenu.hidden = true;
      updateTokenCalculator();
    });
  }

  els.calcModelMenu.hidden = !forceShow && !query;
}

function findTokenCalcModel(query) {
  if (!tokenCalcModels.length) return null;
  if (!query) return null;

  const q = normalize(query);
  return tokenCalcModels.find(m => normalize(m.name) === q)
    || tokenCalcModels.find(m => normalize(m.id) === q)
    || tokenCalcModels.find(m => normalize(m.name).includes(q))
    || tokenCalcModels.find(m => normalize(m.developerName).includes(q))
    || null;
}

function updateTokenCalculator() {
  if (!els.calcModelSearch || !els.calcResult) return;
  const query = els.calcModelSearch.value;
  const model = findTokenCalcModel(query);
  if (!model) {
    els.calcResult.textContent = "Bitte zuerst ein Modell auswählen.";
    return;
  }

  const inputTokens = Math.max(0, Number(els.calcInputTokens?.value || 0));
  const outputTokens = Math.max(0, Number(els.calcOutputTokens?.value || 0));
  const inputPrice = Number(model.inputCostPer1MTokens);
  const outputPrice = Number(model.outputCostPer1MTokens);

  const inputCost = Number.isFinite(inputPrice) ? (inputTokens / 1_000_000) * inputPrice : 0;
  const outputCost = Number.isFinite(outputPrice) ? (outputTokens / 1_000_000) * outputPrice : 0;
  const total = inputCost + outputCost;

  const inputLabel = `Input: ${fmtCurrency(inputCost) ?? "-"}`;
  const outputLabel = `Output: ${fmtCurrency(outputCost) ?? "-"}`;
  const totalLabel = `Gesamt: ${fmtCurrency(total) ?? "-"}`;
  const modelLabel = `${model.name || "Unbenanntes Modell"}`;
  els.calcResult.textContent = `${totalLabel} (${inputLabel}, ${outputLabel}) - ${modelLabel}`;
}

function hideControlIfMissing() {
  if (!hasAny(allModels, "developerName")) els.developerWrap.style.display = "none";
  if (!hasAny(allModels, "modality")) els.modalityWrap.style.display = "none";
  if (!hasAny(allModels, "status")) els.statusWrap.style.display = "none";
}

async function load() {
  try {
    const res = await fetch("models.json", { cache: "no-store" });
    if (!res.ok) throw new Error("models.json konnte nicht geladen werden.");
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("models.json muss ein Array sein.");

    allModels = data;

    activeColumns = getActiveColumns(allModels);
    renderTableHeader();

    const sortOptions = buildSortOptions(activeColumns);
    els.sort.innerHTML = sortOptions.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
    els.sort.value = "release-desc";

    fillDeveloperFilter(allModels);
    fillTokenCalculator(allModels);
    hideControlIfMissing();
    reset();
  } catch (e) {
    els.countLabel.textContent = "Fehler beim Laden";
    els.emptyState.hidden = false;
    els.emptyState.textContent = String(e.message || e);
  }
}

function wire() {
  els.q.addEventListener("input", applyFilters);
  els.developer.addEventListener("change", applyFilters);
  els.modality.addEventListener("change", applyFilters);
  els.status.addEventListener("change", applyFilters);
  els.sort.addEventListener("change", () => {
    applySort();
    render();
  });
  els.resetBtn.addEventListener("click", reset);
  els.calcModelSearch?.addEventListener("input", () => {
    renderTokenCalcMenu(els.calcModelSearch?.value || "", true);
    updateTokenCalculator();
  });
  els.calcModelSearch?.addEventListener("focus", () => {
    renderTokenCalcMenu(els.calcModelSearch?.value || "", true);
  });
  els.calcModelSearch?.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!els.calcModelMenu) return;
      els.calcModelMenu.hidden = true;
    }, 120);
  });
  els.calcInputTokens?.addEventListener("input", updateTokenCalculator);
  els.calcOutputTokens?.addEventListener("input", updateTokenCalculator);
}

wire();
load();

























