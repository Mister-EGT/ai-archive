(function installNexusOpenRouterApiEnhancements(){
  if (window.__nexusOpenRouterApiEnhancementsLoaded) return;
  window.__nexusOpenRouterApiEnhancementsLoaded = true;

  if (typeof store === 'undefined') return;

  const PARAMS = new Set(['reasoning', 'include_reasoning', 'reasoning_effort', 'reasoning_tokens']);
  const EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  const RATIO = { minimal: 0.10, low: 0.20, medium: 0.50, high: 0.80, xhigh: 0.95, max: 0.95 };

  const original = {
    modelSupportsReasoning: typeof modelSupportsReasoning === 'function' ? modelSupportsReasoning : null,
    getReasoningEfforts: typeof getReasoningEfforts === 'function' ? getReasoningEfforts : null,
    modelSupportsParam: typeof modelSupportsParam === 'function' ? modelSupportsParam : null,
    buildReasoningRequest: typeof buildReasoningRequest === 'function' ? buildReasoningRequest : null,
    extractReasoningDetailsFromMessage: typeof extractReasoningDetailsFromMessage === 'function' ? extractReasoningDetailsFromMessage : null,
    extractReasoningPayloadFromMessage: typeof extractReasoningPayloadFromMessage === 'function' ? extractReasoningPayloadFromMessage : null,
    extractProviderInfo: typeof extractProviderInfo === 'function' ? extractProviderInfo : null,
  };

  function meta(model) {
    return model && typeof model.reasoning === 'object' ? model.reasoning : null;
  }

  function params(model) {
    return Array.isArray(model?.supported_parameters) ? model.supported_parameters.map(String) : [];
  }

  function supportedEfforts(model) {
    const m = meta(model);
    if (!Array.isArray(m?.supported_efforts)) return null;
    const out = m.supported_efforts.map(v => String(v || '').toLowerCase()).filter(v => v && v !== 'none');
    return out.length ? out : null;
  }

  function allowedUiEfforts(model) {
    const base = typeof REASONING_EFFORTS !== 'undefined' && Array.isArray(REASONING_EFFORTS)
      ? REASONING_EFFORTS
      : ['minimal', 'low', 'medium', 'high', 'xhigh'];
    const supported = supportedEfforts(model);
    if (!supported) return base;
    const filtered = base.filter(e => supported.includes(e) || (e === 'xhigh' && supported.includes('max')));
    return filtered.length ? filtered : base;
  }

  function mappedEffort(model, mode) {
    const selected = String(mode || '').toLowerCase();
    const supported = supportedEfforts(model);
    const fallback = String(meta(model)?.default_effort || '').toLowerCase();
    if (selected === 'xhigh' && supported?.includes('max')) return 'max';
    if (supported?.includes(selected)) return selected;
    if (!supported && EFFORTS.includes(selected)) return selected;
    if (fallback && fallback !== 'none' && (!supported || supported.includes(fallback))) return fallback;
    if (supported?.includes('medium')) return 'medium';
    return supported?.[supported.length - 1] || 'medium';
  }

  function tokenBudget(model, mode) {
    const m = meta(model);
    const maxOutput = Number(store?.settings?.maxTokens) || 0;
    if (!m?.supports_max_tokens || !Number.isFinite(maxOutput) || maxOutput < 2048) return 0;
    const effort = mappedEffort(model, mode);
    const ratio = RATIO[effort] || RATIO[String(mode || '').toLowerCase()] || 0;
    return ratio > 0 ? Math.max(1024, Math.floor(maxOutput * ratio)) : 0;
  }

  if (original.modelSupportsReasoning) {
    modelSupportsReasoning = function(model) {
      if (meta(model)) return true;
      if (params(model).some(p => PARAMS.has(p))) return true;
      return original.modelSupportsReasoning(model);
    };
  }

  if (original.getReasoningEfforts) {
    getReasoningEfforts = function(model) {
      if (typeof modelSupportsReasoning === 'function' && !modelSupportsReasoning(model)) return [];
      return allowedUiEfforts(model);
    };
  }

  if (original.modelSupportsParam) {
    modelSupportsParam = function(model, param) {
      const name = String(param || '');
      if (params(model).includes(name)) return true;
      if (name === 'reasoning' && meta(model)) return true;
      if (PARAMS.has(name) && typeof modelSupportsReasoning === 'function') return modelSupportsReasoning(model);
      return original.modelSupportsParam(model, param);
    };
  }

  if (original.buildReasoningRequest) {
    buildReasoningRequest = function(model, mode) {
      const modes = typeof REASONING_MODES !== 'undefined' && Array.isArray(REASONING_MODES)
        ? REASONING_MODES
        : ['off', 'auto', 'minimal', 'low', 'medium', 'high', 'xhigh'];
      const selected = modes.includes(mode) ? mode : 'off';
      if (selected === 'off') return {};
      const supports = typeof modelSupportsReasoning === 'function' ? modelSupportsReasoning(model) : Boolean(meta(model));
      if (!supports) return {};

      if (modelSupportsParam(model, 'reasoning') || meta(model)) {
        const reasoning = { exclude: false };
        if (selected === 'auto') {
          reasoning.enabled = true;
          const d = String(meta(model)?.default_effort || '').toLowerCase();
          if (d && d !== 'none') reasoning.effort = d;
          return { reasoning };
        }
        const budget = tokenBudget(model, selected);
        if (budget > 0) reasoning.max_tokens = budget;
        else reasoning.effort = mappedEffort(model, selected);
        return { reasoning };
      }
      return original.buildReasoningRequest(model, selected);
    };
  }

  function norm(value) {
    return typeof normalizeReasoningDetails === 'function' ? normalizeReasoningDetails(value) : [];
  }

  function detailsFrom(msg) {
    if (!msg || typeof msg !== 'object') return [];
    const sources = [
      msg.reasoning_details,
      msg.reasoningDetails,
      msg.reasoning?.reasoning_details,
      msg.reasoning?.details,
      msg.thinking?.reasoning_details,
      Array.isArray(msg.output) ? msg.output.filter(p => /reason|think|thought|analysis/i.test(String(p?.type || p?.name || ''))) : null,
      Array.isArray(msg.content) ? msg.content.filter(p => /reason|think|thought|analysis/i.test(String(p?.type || p?.name || ''))) : null,
    ];
    const all = sources.flatMap(norm);
    const seen = new Set();
    return all.filter(d => {
      const key = [d.id, d.type, d.format, d.index, d.text, d.summary, d.data].map(v => String(v ?? '')).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function detailText(d) {
    if (!d || typeof d !== 'object') return '';
    const type = String(d.type || '').toLowerCase();
    if (d.summary) return `Reasoning-Zusammenfassung:\n${d.summary}`;
    if (d.text) return String(d.text);
    if (type.includes('encrypted')) return '[Verschlüsselter Reasoning-Block erhalten]';
    if (type.includes('redacted')) return '[Reasoning-Block vom Provider redigiert]';
    return '';
  }

  if (original.extractReasoningDetailsFromMessage) {
    extractReasoningDetailsFromMessage = function(msg) {
      const details = detailsFrom(msg);
      return details.length ? details : original.extractReasoningDetailsFromMessage(msg);
    };
  }

  if (original.extractReasoningPayloadFromMessage) {
    extractReasoningPayloadFromMessage = function(msg) {
      const base = original.extractReasoningPayloadFromMessage(msg) || { text: '', details: [] };
      const details = detailsFrom(msg);
      const text = details.map(detailText).filter(Boolean).join('\n\n');
      return { text: base.text || text, details: details.length ? details : (base.details || []) };
    };
  }

  if (original.extractProviderInfo) {
    extractProviderInfo = function(payload) {
      const info = original.extractProviderInfo(payload) || {};
      const om = payload?.openrouter_metadata || payload?.openrouter?.metadata;
      if (om && typeof om === 'object') {
        const provider = om.provider || om.provider_slug || om.selected_provider || om.provider_name;
        if (typeof provider === 'string' && !info.providerTag) info.providerTag = provider;
        if (typeof om.provider_name === 'string' && !info.providerName) info.providerName = om.provider_name;
        info.openrouterMetadata = om;
      }
      return info;
    };
  }

  window.__nexusOpenRouterApiMode = 'safe-reasoning-display-v2';
})();
