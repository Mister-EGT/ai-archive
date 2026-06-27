(function installNexusOpenRouterApiEnhancements(){
  if (window.__nexusOpenRouterApiEnhancementsLoaded) return;
  window.__nexusOpenRouterApiEnhancementsLoaded = true;

  if (typeof store === 'undefined') {
    console.warn('Nexus OpenRouter API enhancements could not start: store is not available.');
    return;
  }

  const GATEWAY_REASONING_EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
  const EFFORT_PERCENT = {
    minimal: 0.10,
    low: 0.20,
    medium: 0.50,
    high: 0.80,
    xhigh: 0.95,
    max: 0.95,
  };
  const REASONING_PARAM_NAMES = new Set(['reasoning', 'include_reasoning', 'reasoning_effort', 'reasoning_tokens']);

  const original = {
    modelSupportsReasoning: typeof modelSupportsReasoning === 'function' ? modelSupportsReasoning : null,
    getReasoningEfforts: typeof getReasoningEfforts === 'function' ? getReasoningEfforts : null,
    modelSupportsParam: typeof modelSupportsParam === 'function' ? modelSupportsParam : null,
    buildReasoningRequest: typeof buildReasoningRequest === 'function' ? buildReasoningRequest : null,
    extractReasoningDetailsFromMessage: typeof extractReasoningDetailsFromMessage === 'function' ? extractReasoningDetailsFromMessage : null,
    extractReasoningPayloadFromMessage: typeof extractReasoningPayloadFromMessage === 'function' ? extractReasoningPayloadFromMessage : null,
    extractProviderInfo: typeof extractProviderInfo === 'function' ? extractProviderInfo : null,
  };

  function modelReasoningMeta(model) {
    const meta = model && typeof model.reasoning === 'object' ? model.reasoning : null;
    return meta || null;
  }

  function modelSupportedParams(model) {
    return Array.isArray(model?.supported_parameters) ? model.supported_parameters.map(String) : [];
  }

  function normalizedSupportedReasoningEfforts(model) {
    const meta = modelReasoningMeta(model);
    if (!Array.isArray(meta?.supported_efforts)) return null;
    const efforts = meta.supported_efforts
      .map(value => String(value || '').toLowerCase())
      .filter(value => value && value !== 'none');
    return efforts.length ? efforts : null;
  }

  function uiEffortsForModel(model) {
    const supported = normalizedSupportedReasoningEfforts(model);
    const baseEfforts = typeof REASONING_EFFORTS !== 'undefined' && Array.isArray(REASONING_EFFORTS)
      ? REASONING_EFFORTS
      : ['minimal', 'low', 'medium', 'high', 'xhigh'];
    if (!supported) return baseEfforts;
    const filtered = baseEfforts.filter(effort => supported.includes(effort) || (effort === 'xhigh' && supported.includes('max')));
    return filtered.length ? filtered : baseEfforts;
  }

  function requestEffortForModel(model, mode) {
    const supported = normalizedSupportedReasoningEfforts(model);
    const meta = modelReasoningMeta(model);
    const candidate = String(mode || '').toLowerCase();

    if (candidate === 'xhigh' && supported?.includes('max')) return 'max';
    if (supported?.includes(candidate)) return candidate;
    if (!supported && GATEWAY_REASONING_EFFORTS.includes(candidate)) return candidate;

    const fallback = String(meta?.default_effort || '').toLowerCase();
    if (fallback && fallback !== 'none') {
      if (!supported || supported.includes(fallback)) return fallback;
      if (fallback === 'max' && supported.includes('xhigh')) return 'xhigh';
    }

    if (supported?.includes('medium')) return 'medium';
    return supported?.[supported.length - 1] || 'medium';
  }

  function reasoningBudgetForMode(model, mode) {
    const meta = modelReasoningMeta(model);
    if (!meta?.supports_max_tokens) return 0;
    const maxOutput = Number(store?.settings?.maxTokens) || 0;
    if (!Number.isFinite(maxOutput) || maxOutput <= 0) return 0;
    const effort = requestEffortForModel(model, mode);
    const ratio = EFFORT_PERCENT[effort] || EFFORT_PERCENT[mode] || 0;
    return ratio > 0 ? Math.max(1, Math.floor(maxOutput * ratio)) : 0;
  }

  if (original.modelSupportsReasoning) {
    modelSupportsReasoning = function patchedModelSupportsReasoning(model) {
      const meta = modelReasoningMeta(model);
      if (meta) return true;
      const params = modelSupportedParams(model);
      if (params.some(param => REASONING_PARAM_NAMES.has(param))) return true;
      return original.modelSupportsReasoning(model);
    };
  }

  if (original.getReasoningEfforts) {
    getReasoningEfforts = function patchedGetReasoningEfforts(model) {
      if (typeof modelSupportsReasoning === 'function' && !modelSupportsReasoning(model)) return [];
      return uiEffortsForModel(model);
    };
  }

  if (original.modelSupportsParam) {
    modelSupportsParam = function patchedModelSupportsParam(model, param) {
      const name = String(param || '');
      const params = modelSupportedParams(model);
      if (params.includes(name)) return true;
      if (name === 'max_completion_tokens') return true;
      if (name === 'reasoning' && modelReasoningMeta(model)) return true;
      if (REASONING_PARAM_NAMES.has(name) && typeof modelSupportsReasoning === 'function') return modelSupportsReasoning(model);
      return original.modelSupportsParam(model, param);
    };
  }

  if (original.buildReasoningRequest) {
    buildReasoningRequest = function patchedBuildReasoningRequest(model, mode) {
      const meta = modelReasoningMeta(model);
      const supports = typeof modelSupportsReasoning === 'function' ? modelSupportsReasoning(model) : Boolean(meta);
      if (!supports) return {};

      const allModes = typeof REASONING_MODES !== 'undefined' && Array.isArray(REASONING_MODES) ? REASONING_MODES : ['off', 'auto', 'minimal', 'low', 'medium', 'high', 'xhigh'];
      const selected = allModes.includes(mode) ? mode : 'off';
      if (selected === 'off') {
        return meta?.mandatory ? { reasoning: { enabled: true, exclude: false } } : {};
      }

      if (modelSupportsParam(model, 'reasoning') || meta) {
        const reasoning = { exclude: false };
        if (selected === 'auto') {
          reasoning.enabled = true;
          const defaultEffort = String(meta?.default_effort || '').toLowerCase();
          if (defaultEffort && defaultEffort !== 'none') reasoning.effort = defaultEffort;
          return { reasoning };
        }

        const budget = reasoningBudgetForMode(model, selected);
        if (budget > 0) {
          reasoning.max_tokens = budget;
        } else {
          reasoning.effort = requestEffortForModel(model, selected);
        }
        return { reasoning };
      }

      const legacy = original.buildReasoningRequest(model, selected);
      if (legacy?.include_reasoning === true && !legacy.reasoning) {
        return { ...legacy, reasoning: { enabled: true, exclude: false } };
      }
      return legacy;
    };
  }

  function collectReasoningDetails(msg) {
    const sources = [
      msg?.reasoning_details,
      msg?.reasoningDetails,
      msg?.reasoning?.reasoning_details,
      msg?.reasoning?.details,
      msg?.thinking?.reasoning_details,
      msg?.output?.filter?.(part => /reason|think|thought|analysis/i.test(part?.type || '')),
      msg?.content?.filter?.(part => /reason|think|thought|analysis/i.test(part?.type || '')),
    ];
    const out = [];
    for (const source of sources) {
      const normalized = typeof normalizeReasoningDetails === 'function' ? normalizeReasoningDetails(source) : [];
      out.push(...normalized);
    }
    const seen = new Set();
    return out.filter(detail => {
      const key = [detail.id, detail.type, detail.format, detail.index, detail.text, detail.summary].map(v => String(v ?? '')).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function reasoningDetailText(detail) {
    if (!detail || typeof detail !== 'object') return '';
    const type = String(detail.type || '').toLowerCase();
    if (detail.summary) return `Zusammenfassung (${detail.format || 'reasoning'}):\n${detail.summary}`;
    if (detail.text) return detail.text;
    if (type.includes('encrypted')) return `[Verschlüsselter Reasoning-Block erhalten: ${detail.format || 'unbekannt'}]`;
    if (type.includes('redacted')) return `[Reasoning-Block vom Provider redigiert: ${detail.format || 'unbekannt'}]`;
    return '';
  }

  if (original.extractReasoningDetailsFromMessage) {
    extractReasoningDetailsFromMessage = function patchedExtractReasoningDetailsFromMessage(msg) {
      const details = collectReasoningDetails(msg);
      return details.length ? details : original.extractReasoningDetailsFromMessage(msg);
    };
  }

  if (original.extractReasoningPayloadFromMessage) {
    extractReasoningPayloadFromMessage = function patchedExtractReasoningPayloadFromMessage(msg) {
      const base = original.extractReasoningPayloadFromMessage(msg) || { text: '', details: [] };
      const details = collectReasoningDetails(msg);
      const detailText = details.map(reasoningDetailText).filter(Boolean).join('\n\n');
      return {
        text: base.text || detailText,
        details: details.length ? details : (base.details || []),
      };
    };
  }

  if (original.extractProviderInfo) {
    extractProviderInfo = function patchedExtractProviderInfo(payload) {
      const info = original.extractProviderInfo(payload) || {};
      const meta = payload?.openrouter_metadata || payload?.openrouter?.metadata || payload?.metadata?.openrouter;
      if (meta && typeof meta === 'object') {
        const provider = meta.provider || meta.provider_slug || meta.providerTag || meta.provider_name || meta.selected_provider;
        if (typeof provider === 'string' && !info.providerTag) info.providerTag = provider;
        if (typeof meta.provider_name === 'string' && !info.providerName) info.providerName = meta.provider_name;
        info.openrouterMetadata = meta;
      }
      return info;
    };
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function nexusOpenRouterFetch(input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && /\/chat\/completions(?:\?|$)/.test(url) && init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        if (body && typeof body === 'object') {
          const headers = new Headers(init.headers || {});
          headers.set('X-OpenRouter-Metadata', 'enabled');

          if (body.max_tokens != null && body.max_completion_tokens == null) {
            body.max_completion_tokens = body.max_tokens;
            delete body.max_tokens;
          }

          if (!body.reasoning && body.include_reasoning != null) {
            body.reasoning = body.include_reasoning
              ? { enabled: true, exclude: false }
              : { exclude: true };
            delete body.include_reasoning;
          }

          if (!body.reasoning && body.reasoning_effort) {
            body.reasoning = { effort: String(body.reasoning_effort), exclude: false };
            delete body.reasoning_effort;
          }

          const chat = typeof store.getChat === 'function' ? store.getChat() : null;
          if (chat?.id && !body.session_id) body.session_id = `nexus:${chat.id}`.slice(0, 256);

          const metadata = body.metadata && typeof body.metadata === 'object' ? { ...body.metadata } : {};
          metadata.app = 'nexus';
          metadata.client = 'nexus-web';
          metadata.reasoning_mode = String(store.settings?.reasoningMode || 'off');
          if (chat?.id) metadata.chat_id = String(chat.id).slice(0, 64);
          body.metadata = metadata;

          const trace = body.trace && typeof body.trace === 'object' ? { ...body.trace } : {};
          trace.trace_name = trace.trace_name || 'nexus-chat';
          trace.span_name = trace.span_name || (body.stream ? 'chat.completions.stream' : 'chat.completions');
          trace.generation_name = trace.generation_name || String(body.model || 'model').slice(0, 128);
          body.trace = trace;

          init = { ...init, headers, body: JSON.stringify(body) };
        }
      } catch (err) {
        if (store.settings?.showDebug) console.warn('OpenRouter Request konnte nicht erweitert werden:', err);
      }
    }
    return nativeFetch(input, init);
  };

  window.__nexusOpenRouterApiMode = 'metadata-session-reasoning-details';
})();
