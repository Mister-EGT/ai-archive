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

const detailEls = {
  logo: document.getElementById("dLogo"),
  name: document.getElementById("dName"),
  dev: document.getElementById("dDev"),
  kv: document.getElementById("dKV"),
  notesWrap: document.getElementById("dNotesWrap"),
  notes: document.getElementById("dNotes"),
  links: document.getElementById("dLinks")
};

let allModels = [];
let filteredModels = [];
let activeColumns = [];
let tokenCalcModels = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").toLowerCase().trim();
}

function fmtMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return `${number.toFixed(2)} $/1M`;
}

function fmtInt(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Intl.NumberFormat("de-DE").format(number);
}

function fmtCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD"
  }).format(number);
}

function fmtDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("de-DE");
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
  return models.some(model => {
    if (!model || !Object.prototype.hasOwnProperty.call(model, key)) return false;

    const value = model[key];
    if (value === null || value === undefined) return false;
    if (typeof value === "string" && value.trim() === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;

    return true;
  });
}

function getActiveColumns(models) {
  const candidates = [
    {
      key: "name",
      label: "Modell",
      type: "text",
      important: true,
      cell: model => {
        const logo = model.modelIconUrl
          ? `<img src="${escapeHtml(model.modelIconUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "";
        return `<span class="dev"><span>${escapeHtml(model.name || "")}</span>${logo}</span>`;
      }
    },
    {
      key: "developerName",
      label: "Entwickler",
      type: "text",
      important: true,
      cell: model => {
        const logo = model.developerLogoUrl
          ? `<img src="${escapeHtml(model.developerLogoUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
          : "";
        return `<span class="dev">${logo}<span>${escapeHtml(model.developerName || "")}</span></span>`;
      }
    },
    {
      key: "contextWindow",
      label: "Kontext",
      type: "text",
      cell: model => escapeHtml(fmtInt(model.contextWindow) ?? "")
    },
    {
      key: "inputCostPer1MTokens",
      label: "Input",
      type: "text",
      cell: model => escapeHtml(fmtMoney(model.inputCostPer1MTokens) ?? "")
    },
    {
      key: "outputCostPer1MTokens",
      label: "Output",
      type: "text",
      cell: model => escapeHtml(fmtMoney(model.outputCostPer1MTokens) ?? "")
    },
    {
      key: "modality",
      label: "Modalität",
      type: "badge",
      cell: model => model.modality ? badge(model.modality) : ""
    },
    {
      key: "status",
      label: "Status",
      type: "badge",
      cell: model => model.status ? badge(model.status, statusDot(model.status)) : ""
    },
    {
      key: "releaseDate",
      label: "Release",
      type: "text",
      cell: model => escapeHtml(fmtDate(model.releaseDate) ?? "")
    },
    {
      key: "tags",
      label: "Tags",
      type: "text",
      cell: model => {
        const tags = Array.isArray(model.tags) ? model.tags : null;
        return tags ? escapeHtml(tags.slice(0, 5).join(", ")) : "";
      }
    }
  ];

  return candidates.filter(column => column.important || hasAny(models, column.key));
}

function buildSortOptions(columns) {
  const options = [
    { value: "name-asc", label: "Name A bis Z" },
    { value: "name-desc", label: "Name Z bis A" }
  ];

  if (columns.some(column => column.key === "inputCostPer1MTokens")) {
    options.push({ value: "in-asc", label: "Input Kosten aufsteigend" });
    options.push({ value: "in-desc", label: "Input Kosten absteigend" });
  }

  if (columns.some(column => column.key === "outputCostPer1MTokens")) {
    options.push({ value: "out-asc", label: "Output Kosten aufsteigend" });
    options.push({ value: "out-desc", label: "Output Kosten absteigend" });
  }

  if (columns.some(column => column.key === "releaseDate")) {
    options.push({ value: "release-desc", label: "Release neu zuerst" });
    options.push({ value: "release-asc", label: "Release alt zuerst" });
  }

  return options;
}

function fillDeveloperFilter(models) {
  const developers = new Set(models.map(model => model.developerName).filter(Boolean));
  const options = ["", ...Array.from(developers).sort((a, b) => a.localeCompare(b, "de"))];

  els.developer.innerHTML = options
    .map(value => `<option value="${escapeHtml(value)}">${value ? escapeHtml(value) : "Alle"}</option>`)
    .join("");
}

function applyFilters() {
  const query = normalize(els.q.value);
  const developer = els.developer.value;
  const modality = els.modality.value;
  const status = els.status.value;

  filteredModels = allModels.filter(model => {
    if (developer && model.developerName !== developer) return false;
    if (modality && model.modality !== modality) return false;
    if (status && model.status !== status) return false;

    if (query) {
      const searchableText = [
        model.name,
        model.developerName,
        Array.isArray(model.tags) ? model.tags.join(" ") : "",
        model.notes
      ].filter(Boolean).join(" ");

      if (!normalize(searchableText).includes(query)) return false;
    }

    return true;
  });

  applySort();
  render();
}

function numericSortValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.POSITIVE_INFINITY;
}

function releaseSortValue(model) {
  if (!model || !model.releaseDate) return Number.NEGATIVE_INFINITY;

  const time = new Date(model.releaseDate).getTime();
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

function applySort() {
  const sortValue = els.sort.value;
  const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "de");
  const byRelease = (a, b) => releaseSortValue(a) - releaseSortValue(b);
  const byInputCost = (a, b) => numericSortValue(a.inputCostPer1MTokens) - numericSortValue(b.inputCostPer1MTokens);
  const byOutputCost = (a, b) => numericSortValue(a.outputCostPer1MTokens) - numericSortValue(b.outputCostPer1MTokens);

  const sorters = {
    "name-asc": (a, b) => byName(a, b),
    "name-desc": (a, b) => byName(b, a),
    "release-asc": (a, b) => byRelease(a, b),
    "release-desc": (a, b) => byRelease(b, a),
    "in-asc": (a, b) => byInputCost(a, b),
    "in-desc": (a, b) => byInputCost(b, a),
    "out-asc": (a, b) => byOutputCost(a, b),
    "out-desc": (a, b) => byOutputCost(b, a)
  };

  filteredModels.sort(sorters[sortValue] || sorters["name-asc"]);
}

function renderTableHeader() {
  els.thead.innerHTML = `
    <tr>
      ${activeColumns.map(column => `<th>${escapeHtml(column.label)}</th>`).join("")}
    </tr>
  `;
}

function render() {
  els.countLabel.textContent = `${filteredModels.length} Modelle`;
  els.emptyState.hidden = filteredModels.length !== 0;

  els.rows.innerHTML = filteredModels.map(model => {
    const cells = activeColumns.map(column => {
      const content = column.cell(model) || "";
      return `<td data-label="${escapeHtml(column.label)}">${content}</td>`;
    }).join("");

    return `<tr data-id="${escapeHtml(model.id || "")}" tabindex="0" role="button" aria-label="Details öffnen">${cells}</tr>`;
  }).join("");

  for (const row of els.rows.querySelectorAll("tr")) {
    row.addEventListener("click", () => openDetails(row.dataset.id));
    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openDetails(row.dataset.id);
      }
    });
  }
}

function linkChip(label, url) {
  if (!url) return "";

  const safeUrl = escapeHtml(url);
  return `<a class="link" href="${safeUrl}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function addKV(rows, label, value) {
  if (value === null || value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;

  rows.push(`<div class="k">${escapeHtml(label)}</div><div class="v">${escapeHtml(String(value))}</div>`);
}

function openDetails(id) {
  const model = allModels.find(item => String(item.id || "") === String(id || ""));
  if (!model) return;

  detailEls.logo.innerHTML = model.developerLogoUrl
    ? `<img src="${escapeHtml(model.developerLogoUrl)}" alt="" onerror="this.style.display='none'">`
    : "";

  detailEls.name.textContent = model.name || "";
  detailEls.dev.textContent = model.developerName || "";

  const rows = [];
  addKV(rows, "Modalität", model.modality);
  addKV(rows, "Status", model.status);
  addKV(rows, "Kontextfenster", fmtInt(model.contextWindow) ?? null);
  addKV(rows, "Kosten Input", fmtMoney(model.inputCostPer1MTokens) ?? null);
  addKV(rows, "Kosten Output", fmtMoney(model.outputCostPer1MTokens) ?? null);
  addKV(rows, "Release", fmtDate(model.releaseDate) ?? null);
  addKV(rows, "Letztes Update", fmtDate(model.updatedAt) ?? null);

  if (Array.isArray(model.tags) && model.tags.length) {
    addKV(rows, "Tags", model.tags.join(", "));
  }

  detailEls.kv.innerHTML = rows.join("") || `<div class="muted small">Keine Detailfelder vorhanden.</div>`;

  if (model.notes) {
    detailEls.notesWrap.hidden = false;
    detailEls.notes.textContent = model.notes;
  } else {
    detailEls.notesWrap.hidden = true;
    detailEls.notes.textContent = "";
  }

  detailEls.links.innerHTML = [
    linkChip("Website", model.websiteUrl),
    linkChip("Docs", model.docsUrl),
    linkChip("Pricing", model.pricingUrl)
  ].filter(Boolean).join("");

  els.detailDialog.showModal();
}

function reset() {
  els.q.value = "";
  els.developer.value = "";
  els.modality.value = "";
  els.status.value = "";
  els.sort.value = "release-desc";
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
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return tokenCalcModels;

  return tokenCalcModels.filter(model => {
    const searchableText = `${model.name || ""} ${model.developerName || ""} ${model.id || ""}`;
    return normalize(searchableText).includes(normalizedQuery);
  });
}

function renderTokenCalcMenu(query, forceShow = false) {
  if (!els.calcModelMenu) return;

  const matches = getTokenCalcMatches(query);
  if (!matches.length) {
    els.calcModelMenu.hidden = true;
    els.calcModelMenu.innerHTML = "";
    return;
  }

  els.calcModelMenu.innerHTML = matches.map(model => {
    const name = escapeHtml(model.name || "Unbenanntes Modell");
    const developer = escapeHtml(model.developerName || "Unbekannt");
    const id = escapeHtml(String(model.id || ""));

    return `
      <button type="button" class="calc-menu-item" data-model-id="${id}">
        <span class="calc-menu-name">${name}</span>
        <span class="calc-menu-dev">${developer}</span>
      </button>
    `;
  }).join("");

  for (const button of els.calcModelMenu.querySelectorAll(".calc-menu-item")) {
    button.addEventListener("mousedown", event => {
      event.preventDefault();

      const selected = tokenCalcModels.find(model => String(model.id || "") === String(button.dataset.modelId || ""));
      if (!selected || !els.calcModelSearch) return;

      els.calcModelSearch.value = selected.name || "";
      els.calcModelMenu.hidden = true;
      updateTokenCalculator();
    });
  }

  els.calcModelMenu.hidden = !forceShow && !query;
}

function findTokenCalcModel(query) {
  if (!tokenCalcModels.length || !query) return null;

  const normalizedQuery = normalize(query);
  return tokenCalcModels.find(model => normalize(model.name) === normalizedQuery)
    || tokenCalcModels.find(model => normalize(model.id) === normalizedQuery)
    || tokenCalcModels.find(model => normalize(model.name).includes(normalizedQuery))
    || tokenCalcModels.find(model => normalize(model.developerName).includes(normalizedQuery))
    || null;
}

function updateTokenCalculator() {
  if (!els.calcModelSearch || !els.calcResult) return;

  const model = findTokenCalcModel(els.calcModelSearch.value);
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
  const totalCost = inputCost + outputCost;

  const inputLabel = `Input: ${fmtCurrency(inputCost) ?? "-"}`;
  const outputLabel = `Output: ${fmtCurrency(outputCost) ?? "-"}`;
  const totalLabel = `Gesamt: ${fmtCurrency(totalCost) ?? "-"}`;
  const modelLabel = model.name || "Unbenanntes Modell";

  els.calcResult.textContent = `${totalLabel} (${inputLabel}, ${outputLabel}) - ${modelLabel}`;
}

function hideControlIfMissing() {
  if (!hasAny(allModels, "developerName")) els.developerWrap.style.display = "none";
  if (!hasAny(allModels, "modality")) els.modalityWrap.style.display = "none";
  if (!hasAny(allModels, "status")) els.statusWrap.style.display = "none";
}

async function load() {
  try {
    const response = await fetch("models.json", { cache: "no-store" });
    if (!response.ok) throw new Error("models.json konnte nicht geladen werden.");

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("models.json muss ein Array sein.");

    allModels = data;
    activeColumns = getActiveColumns(allModels);
    renderTableHeader();

    const sortOptions = buildSortOptions(activeColumns);
    els.sort.innerHTML = sortOptions
      .map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
      .join("");
    els.sort.value = "release-desc";

    fillDeveloperFilter(allModels);
    fillTokenCalculator(allModels);
    hideControlIfMissing();
    reset();
  } catch (error) {
    els.countLabel.textContent = "Fehler beim Laden";
    els.emptyState.hidden = false;
    els.emptyState.textContent = String(error.message || error);
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
      if (els.calcModelMenu) els.calcModelMenu.hidden = true;
    }, 120);
  });
  els.calcInputTokens?.addEventListener("input", updateTokenCalculator);
  els.calcOutputTokens?.addEventListener("input", updateTokenCalculator);
}

wire();
load();
