const STORAGE_KEY = 'nova_router_chat_state_v1';
const DEFAULT_MODELS = [
  'openai/gpt-4o-mini',
  'openai/gpt-4.1-mini',
  'anthropic/claude-3.7-sonnet',
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen-2.5-72b-instruct'
];

const DEFAULT_PRESETS = [
  { id: crypto.randomUUID(), name: 'Hilfreicher Assistent', prompt: 'Du bist ein hilfreicher, präziser und freundlicher Assistent.' },
  { id: crypto.randomUUID(), name: 'Coder', prompt: 'Du bist ein starker Software-Assistent. Liefere sauberen, gut strukturierten Code mit kurzen Erklärungen.' },
  { id: crypto.randomUUID(), name: 'Kreativ', prompt: 'Du bist kreativ, ideenreich und schreibst ansprechend mit originellen Vorschlägen.' }
];

const state = loadState();
let abortController = null;
let pendingAttachments = [];

const el = {
  sidebar: document.getElementById('sidebar'),
  openSidebarBtn: document.getElementById('openSidebarBtn'),
  toggleSidebarBtn: document.getElementById('toggleSidebarBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  heroNewChatBtn: document.getElementById('heroNewChatBtn'),
  heroSettingsBtn: document.getElementById('heroSettingsBtn'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  testConnectionBtn: document.getElementById('testConnectionBtn'),
  chatList: document.getElementById('chatList'),
  chatSearch: document.getElementById('chatSearch'),
  activeChatTitle: document.getElementById('activeChatTitle'),
  messages: document.getElementById('messages'),
  emptyState: document.getElementById('emptyState'),
  chatPanel: document.getElementById('chatPanel'),
  messageInput: document.getElementById('messageInput'),
  sendBtn: document.getElementById('sendBtn'),
  stopBtn: document.getElementById('stopBtn'),
  modelSelect: document.getElementById('modelSelect'),
  promptPresetSelect: document.getElementById('promptPresetSelect'),
  attachmentInput: document.getElementById('attachmentInput'),
  attachmentPreview: document.getElementById('attachmentPreview'),
  toggleAdvancedBtn: document.getElementById('toggleAdvancedBtn'),
  advancedPanel: document.getElementById('advancedPanel'),
  systemPromptInput: document.getElementById('systemPromptInput'),
  chatTitleInput: document.getElementById('chatTitleInput'),
  temperatureInput: document.getElementById('temperatureInput'),
  topPInput: document.getElementById('topPInput'),
  maxTokensInput: document.getElementById('maxTokensInput'),
  extraBodyInput: document.getElementById('extraBodyInput'),
  statusText: document.getElementById('statusText'),
  tokenHint: document.getElementById('tokenHint'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  themeSelect: document.getElementById('themeSelect'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  apiBaseInput: document.getElementById('apiBaseInput'),
  refererInput: document.getElementById('refererInput'),
  appTitleInput: document.getElementById('appTitleInput'),
  hardcodedKeyHelp: document.getElementById('hardcodedKeyHelp'),
  modelInput: document.getElementById('modelInput'),
  addModelBtn: document.getElementById('addModelBtn'),
  resetModelsBtn: document.getElementById('resetModelsBtn'),
  modelList: document.getElementById('modelList'),
  presetNameInput: document.getElementById('presetNameInput'),
  presetPromptInput: document.getElementById('presetPromptInput'),
  addPresetBtn: document.getElementById('addPresetBtn'),
  presetList: document.getElementById('presetList')
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const fallback = {
    settings: {
      apiKey: '',
      apiBase: 'https://openrouter.ai/api/v1',
      referer: '',
      appTitle: 'NovaRouter Chat UI',
      theme: 'system',
      allowedModels: [...DEFAULT_MODELS],
      promptPresets: [...DEFAULT_PRESETS],
      hardcodedApiKey: ''
    },
    chats: [],
    activeChatId: null
  };

  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      settings: {
        ...fallback.settings,
        ...(parsed.settings || {}),
        allowedModels: Array.isArray(parsed?.settings?.allowedModels) && parsed.settings.allowedModels.length
          ? parsed.settings.allowedModels
          : [...DEFAULT_MODELS],
        promptPresets: Array.isArray(parsed?.settings?.promptPresets) && parsed.settings.promptPresets.length
          ? parsed.settings.promptPresets
          : [...DEFAULT_PRESETS]
      },
      chats: Array.isArray(parsed.chats) ? parsed.chats : []
    };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createChat() {
  const chat = {
    id: crypto.randomUUID(),
    title: 'Neuer Chat',
    model: state.settings.allowedModels[0] || '',
    systemPrompt: '',
    temperature: 0.7,
    topP: 1,
    maxTokens: 1200,
    extraBody: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  saveState();
  render();
}

function getActiveChat() {
  return state.chats.find(chat => chat.id === state.activeChatId) || null;
}

function deleteChat(chatId) {
  state.chats = state.chats.filter(chat => chat.id !== chatId);
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats[0]?.id || null;
  }
  saveState();
  render();
}

function duplicateChat(chatId) {
  const chat = state.chats.find(c => c.id === chatId);
  if (!chat) return;
  const clone = JSON.parse(JSON.stringify(chat));
  clone.id = crypto.randomUUID();
  clone.title = `${chat.title} Kopie`;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = new Date().toISOString();
  state.chats.unshift(clone);
  state.activeChatId = clone.id;
  saveState();
  render();
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

function renderChatList() {
  const query = el.chatSearch.value.trim().toLowerCase();
  const chats = [...state.chats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  el.chatList.innerHTML = '';

  chats
    .filter(chat => !query || chat.title.toLowerCase().includes(query) || chat.messages.some(m => (m.contentText || '').toLowerCase().includes(query)))
    .forEach(chat => {
      const item = document.createElement('div');
      item.className = `chat-item ${chat.id === state.activeChatId ? 'active' : ''}`;
      item.innerHTML = `
        <div>
          <div class="chat-item-title">${escapeHtml(chat.title)}</div>
          <div class="chat-item-meta">${escapeHtml(chat.model || 'Kein Modell')} • ${chat.messages.length} Nachrichten</div>
          <div class="chat-item-meta">${formatTime(chat.updatedAt)}</div>
        </div>
        <div class="chat-item-menu">
          <button class="msg-action-btn" data-action="dup">Duplizieren</button>
          <button class="msg-action-btn" data-action="del">Löschen</button>
        </div>
      `;
      item.addEventListener('click', (event) => {
        const action = event.target?.dataset?.action;
        if (action === 'dup') {
          event.stopPropagation();
          duplicateChat(chat.id);
          return;
        }
        if (action === 'del') {
          event.stopPropagation();
          if (confirm(`Chat „${chat.title}“ löschen?`)) deleteChat(chat.id);
          return;
        }
        state.activeChatId = chat.id;
        saveState();
        render();
        closeSidebarOnMobile();
      });
      el.chatList.appendChild(item);
    });
}

function renderMessages() {
  const chat = getActiveChat();
  el.messages.innerHTML = '';
  if (!chat) return;

  if (!chat.messages.length) {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.innerHTML = `
      <div class="message-meta"><span class="role-badge">Start</span></div>
      <div class="message-body">Noch keine Nachrichten. Schreib etwas, wähle ein Modell und leg los.</div>
    `;
    el.messages.appendChild(card);
    return;
  }

  chat.messages.forEach((message) => {
    const tmpl = document.getElementById('messageTemplate');
    const node = tmpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.role-badge').textContent = message.role;
    node.querySelector('.message-body').innerHTML = renderRichText(message.contentText || '');
    const actions = node.querySelector('.message-actions');

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.textContent = 'Kopieren';
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(message.contentText || '');
      setStatus('Nachricht kopiert');
    };
    actions.appendChild(copyBtn);

    if (message.role === 'user') {
      const editBtn = document.createElement('button');
      editBtn.className = 'msg-action-btn';
      editBtn.textContent = 'Bearbeiten';
      editBtn.onclick = () => {
        el.messageInput.value = message.contentText || '';
        autoresizeTextarea();
      };
      actions.appendChild(editBtn);
    }

    if (message.role === 'assistant') {
      const regenBtn = document.createElement('button');
      regenBtn.className = 'msg-action-btn';
      regenBtn.textContent = 'Neu generieren';
      regenBtn.onclick = () => regenerateFromAssistantMessage(message.id);
      actions.appendChild(regenBtn);
    }

    el.messages.appendChild(node);
  });

  el.messages.scrollTop = el.messages.scrollHeight;
}

function renderRichText(text) {
  let html = escapeHtml(text)
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');

  html = html.replace(/(?:^|<br>)- (.*?)(?=(<br>- )|$)/g, '<li>$1</li>');
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>').replace(/<\/ul><ul>/g, '');
  }
  return html;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderControls() {
  const chat = getActiveChat();
  const hasChat = !!chat;
  el.emptyState.classList.toggle('hidden', hasChat);
  el.chatPanel.classList.toggle('hidden', !hasChat);
  el.activeChatTitle.textContent = chat?.title || 'Neuer Chat';

  el.modelSelect.innerHTML = '';
  state.settings.allowedModels.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    el.modelSelect.appendChild(option);
  });

  el.promptPresetSelect.innerHTML = '<option value="">Preset einfügen...</option>';
  state.settings.promptPresets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name;
    el.promptPresetSelect.appendChild(option);
  });

  if (chat) {
    if (!state.settings.allowedModels.includes(chat.model)) {
      chat.model = state.settings.allowedModels[0] || '';
    }
    el.modelSelect.value = chat.model;
    el.systemPromptInput.value = chat.systemPrompt || '';
    el.chatTitleInput.value = chat.title || '';
    el.temperatureInput.value = chat.temperature ?? 0.7;
    el.topPInput.value = chat.topP ?? 1;
    el.maxTokensInput.value = chat.maxTokens ?? 1200;
    el.extraBodyInput.value = chat.extraBody || '';
  }

  el.themeSelect.value = state.settings.theme;
  applyTheme();
}

function renderSettings() {
  el.apiKeyInput.value = state.settings.apiKey || '';
  el.apiBaseInput.value = state.settings.apiBase || 'https://openrouter.ai/api/v1';
  el.refererInput.value = state.settings.referer || '';
  el.appTitleInput.value = state.settings.appTitle || 'NovaRouter Chat UI';
  el.hardcodedKeyHelp.value = `Du kannst den API Key auch direkt im Code eintragen:\n\n1. Öffne app.js\n2. Suche nach: state.settings.hardcodedApiKey\n3. Hinterlege dort deinen Key\n\nAchtung: Ein Browser-Key ist für echte Produktion unsicher. Nutze dafür lieber einen Server-Proxy.`;

  el.modelList.innerHTML = '';
  state.settings.allowedModels.forEach(model => {
    const item = document.createElement('div');
    item.className = 'tag-item';
    item.innerHTML = `<span>${escapeHtml(model)}</span><button class="remove-chip">✕</button>`;
    item.querySelector('button').onclick = () => {
      state.settings.allowedModels = state.settings.allowedModels.filter(m => m !== model);
      if (!state.settings.allowedModels.length) state.settings.allowedModels = [...DEFAULT_MODELS];
      state.chats.forEach(chat => {
        if (!state.settings.allowedModels.includes(chat.model)) {
          chat.model = state.settings.allowedModels[0];
        }
      });
      saveState();
      renderSettings();
      renderControls();
    };
    el.modelList.appendChild(item);
  });

  el.presetList.innerHTML = '';
  state.settings.promptPresets.forEach(preset => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `<strong>${escapeHtml(preset.name)}</strong><button class="remove-chip">✕</button>`;
    item.title = preset.prompt;
    item.querySelector('button').onclick = () => {
      state.settings.promptPresets = state.settings.promptPresets.filter(p => p.id !== preset.id);
      saveState();
      renderSettings();
      renderControls();
    };
    el.presetList.appendChild(item);
  });
}

function applyTheme() {
  const theme = state.settings.theme || 'system';
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  document.body.classList.toggle('light', theme === 'light' || (theme === 'system' && prefersLight));
}

function updateActiveChatFromControls() {
  const chat = getActiveChat();
  if (!chat) return;
  chat.model = el.modelSelect.value;
  chat.systemPrompt = el.systemPromptInput.value;
  chat.title = el.chatTitleInput.value.trim() || 'Neuer Chat';
  chat.temperature = Number(el.temperatureInput.value || 0.7);
  chat.topP = Number(el.topPInput.value || 1);
  chat.maxTokens = Number(el.maxTokensInput.value || 1200);
  chat.extraBody = el.extraBodyInput.value;
  chat.updatedAt = new Date().toISOString();
  saveState();
  renderChatList();
  el.activeChatTitle.textContent = chat.title;
}

function setStatus(text) {
  el.statusText.textContent = text;
}

function autoresizeTextarea() {
  el.messageInput.style.height = 'auto';
  el.messageInput.style.height = `${Math.min(el.messageInput.scrollHeight, 260)}px`;
}

function openSettings() {
  renderSettings();
  el.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  el.settingsModal.classList.add('hidden');
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 960) el.sidebar.classList.remove('open');
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'nova-router-export.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importState(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Ungültige Datei');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  location.reload();
}

function saveSettingsFromModal() {
  state.settings.apiKey = el.apiKeyInput.value.trim();
  state.settings.apiBase = el.apiBaseInput.value.trim() || 'https://openrouter.ai/api/v1';
  state.settings.referer = el.refererInput.value.trim();
  state.settings.appTitle = el.appTitleInput.value.trim() || 'NovaRouter Chat UI';
  saveState();
  closeSettings();
  setStatus('Einstellungen gespeichert');
}

function addModel() {
  const model = el.modelInput.value.trim();
  if (!model) return;
  if (!state.settings.allowedModels.includes(model)) {
    state.settings.allowedModels.unshift(model);
    saveState();
    el.modelInput.value = '';
    renderSettings();
    renderControls();
  }
}

function addPreset() {
  const name = el.presetNameInput.value.trim();
  const prompt = el.presetPromptInput.value.trim();
  if (!name || !prompt) return;
  state.settings.promptPresets.unshift({ id: crypto.randomUUID(), name, prompt });
  saveState();
  el.presetNameInput.value = '';
  el.presetPromptInput.value = '';
  renderSettings();
  renderControls();
}

function attachFiles(files) {
  const incoming = Array.from(files || []);
  incoming.forEach(file => pendingAttachments.push(file));
  renderAttachmentPreview();
}

function renderAttachmentPreview() {
  el.attachmentPreview.innerHTML = '';
  el.attachmentPreview.classList.toggle('hidden', !pendingAttachments.length);
  pendingAttachments.forEach((file, index) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = `<span>${escapeHtml(file.name)}</span><button class="remove-chip">✕</button>`;
    chip.querySelector('button').onclick = () => {
      pendingAttachments.splice(index, 1);
      renderAttachmentPreview();
    };
    el.attachmentPreview.appendChild(chip);
  });
}

async function fileToDataPart(file) {
  if (file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return {
      type: 'image_url',
      image_url: { url: base64 }
    };
  }
  const text = await file.text();
  return {
    type: 'text',
    text: `Datei: ${file.name}\n\n${text.slice(0, 15000)}`
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function buildUserMessageContent(text) {
  const parts = [{ type: 'text', text }];
  for (const file of pendingAttachments) {
    parts.push(await fileToDataPart(file));
  }
  return parts;
}

function getApiKey() {
  return state.settings.apiKey || state.settings.hardcodedApiKey || '';
}

function buildMessagesForApi(chat) {
  const messages = [];
  if (chat.systemPrompt?.trim()) {
    messages.push({ role: 'system', content: chat.systemPrompt.trim() });
  }
  for (const message of chat.messages) {
    if (message.role === 'assistant') {
      messages.push({ role: 'assistant', content: message.contentText || '' });
    } else if (message.role === 'user') {
      messages.push({ role: 'user', content: message.apiContent || message.contentText || '' });
    }
  }
  return messages;
}

async function sendMessage() {
  const chat = getActiveChat();
  if (!chat) return;

  const text = el.messageInput.value.trim();
  if (!text && !pendingAttachments.length) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    openSettings();
    setStatus('Bitte zuerst einen OpenRouter API Key eintragen');
    return;
  }

  updateActiveChatFromControls();

  let apiContent;
  try {
    apiContent = await buildUserMessageContent(text || 'Bitte analysiere die angehängten Inhalte.');
  } catch (error) {
    setStatus(`Anhang konnte nicht verarbeitet werden: ${error.message}`);
    return;
  }

  const userMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    contentText: text || pendingAttachments.map(file => `[Anhang] ${file.name}`).join('\n'),
    apiContent
  };
  const assistantMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    contentText: ''
  };

  chat.messages.push(userMessage, assistantMessage);
  chat.updatedAt = new Date().toISOString();
  if (chat.title === 'Neuer Chat' && text) {
    chat.title = text.slice(0, 40);
    el.chatTitleInput.value = chat.title;
  }
  saveState();
  render();

  el.messageInput.value = '';
  autoresizeTextarea();
  pendingAttachments = [];
  renderAttachmentPreview();

  abortController = new AbortController();
  el.stopBtn.classList.remove('hidden');
  setStatus('Antwort wird gestreamt...');

  const body = {
    model: chat.model,
    messages: buildMessagesForApi(chat),
    temperature: chat.temperature,
    top_p: chat.topP,
    max_tokens: chat.maxTokens,
    stream: true
  };

  if (chat.extraBody?.trim()) {
    try {
      Object.assign(body, JSON.parse(chat.extraBody));
    } catch (error) {
      setStatus(`Zusätzlicher JSON Body ist ungültig: ${error.message}`);
      el.stopBtn.classList.add('hidden');
      return;
    }
  }

  try {
    const response = await fetch(`${state.settings.apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(state.settings.referer ? { 'HTTP-Referer': state.settings.referer } : {}),
        ...(state.settings.appTitle ? { 'X-Title': state.settings.appTitle } : {})
      },
      body: JSON.stringify(body),
      signal: abortController.signal
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      throw new Error(`${response.status} ${response.statusText} ${text}`.trim());
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const data = JSON.parse(jsonStr);
          const delta = data?.choices?.[0]?.delta?.content;
          if (delta) {
            assistantMessage.contentText += delta;
            renderMessages();
          }
        } catch {
        }
      }
    }

    setStatus('Antwort fertig');
    chat.updatedAt = new Date().toISOString();
    saveState();
    renderChatList();
  } catch (error) {
    if (error.name === 'AbortError') {
      setStatus('Streaming gestoppt');
    } else {
      assistantMessage.contentText = assistantMessage.contentText || `Fehler: ${error.message}`;
      setStatus(`Fehler: ${error.message}`);
    }
  } finally {
    abortController = null;
    el.stopBtn.classList.add('hidden');
    saveState();
    renderMessages();
  }
}

function regenerateFromAssistantMessage(messageId) {
  const chat = getActiveChat();
  if (!chat) return;
  const idx = chat.messages.findIndex(m => m.id === messageId);
  if (idx <= 0) return;
  chat.messages = chat.messages.slice(0, idx);
  saveState();
  render();
  sendMessageFromHistory();
}

async function sendMessageFromHistory() {
  const chat = getActiveChat();
  if (!chat) return;
  const lastUser = [...chat.messages].reverse().find(m => m.role === 'user');
  if (!lastUser) return;
  const assistantMessage = { id: crypto.randomUUID(), role: 'assistant', contentText: '' };
  chat.messages.push(assistantMessage);
  saveState();
  render();

  const apiKey = getApiKey();
  abortController = new AbortController();
  el.stopBtn.classList.remove('hidden');
  setStatus('Antwort wird neu generiert...');

  const body = {
    model: chat.model,
    messages: buildMessagesForApi(chat),
    temperature: chat.temperature,
    top_p: chat.topP,
    max_tokens: chat.maxTokens,
    stream: true
  };
  if (chat.extraBody?.trim()) Object.assign(body, JSON.parse(chat.extraBody));

  try {
    const response = await fetch(`${state.settings.apiBase.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(state.settings.referer ? { 'HTTP-Referer': state.settings.referer } : {}),
        ...(state.settings.appTitle ? { 'X-Title': state.settings.appTitle } : {})
      },
      body: JSON.stringify(body),
      signal: abortController.signal
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const data = JSON.parse(jsonStr);
          const delta = data?.choices?.[0]?.delta?.content;
          if (delta) {
            assistantMessage.contentText += delta;
            renderMessages();
          }
        } catch {}
      }
    }
    setStatus('Neue Antwort fertig');
  } catch (error) {
    assistantMessage.contentText = assistantMessage.contentText || `Fehler: ${error.message}`;
    setStatus(`Fehler: ${error.message}`);
  } finally {
    abortController = null;
    el.stopBtn.classList.add('hidden');
    saveState();
    render();
  }
}

async function testConnection() {
  const apiKey = el.apiKeyInput.value.trim() || state.settings.hardcodedApiKey;
  const base = el.apiBaseInput.value.trim() || 'https://openrouter.ai/api/v1';
  if (!apiKey) {
    setStatus('Bitte erst API Key eintragen');
    return;
  }
  setStatus('Verbindung wird getestet...');
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...(el.refererInput.value.trim() ? { 'HTTP-Referer': el.refererInput.value.trim() } : {}),
        ...(el.appTitleInput.value.trim() ? { 'X-Title': el.appTitleInput.value.trim() } : {})
      }
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    setStatus(`Verbindung erfolgreich. ${Array.isArray(data.data) ? data.data.length : 0} Modelle gefunden.`);
  } catch (error) {
    setStatus(`Verbindung fehlgeschlagen: ${error.message}`);
  }
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function render() {
  renderChatList();
  renderControls();
  renderMessages();
}

function bindEvents() {
  el.newChatBtn.onclick = createChat;
  el.heroNewChatBtn.onclick = createChat;
  el.openSettingsBtn.onclick = openSettings;
  el.heroSettingsBtn.onclick = openSettings;
  el.closeSettingsBtn.onclick = closeSettings;
  el.saveSettingsBtn.onclick = saveSettingsFromModal;
  el.testConnectionBtn.onclick = testConnection;
  el.chatSearch.oninput = renderChatList;
  el.sendBtn.onclick = sendMessage;
  el.messageInput.addEventListener('input', autoresizeTextarea);
  el.messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  el.stopBtn.onclick = () => abortController?.abort();
  el.toggleAdvancedBtn.onclick = () => el.advancedPanel.classList.toggle('hidden');
  el.modelSelect.onchange = updateActiveChatFromControls;
  el.systemPromptInput.oninput = updateActiveChatFromControls;
  el.chatTitleInput.oninput = updateActiveChatFromControls;
  el.temperatureInput.oninput = updateActiveChatFromControls;
  el.topPInput.oninput = updateActiveChatFromControls;
  el.maxTokensInput.oninput = updateActiveChatFromControls;
  el.extraBodyInput.oninput = updateActiveChatFromControls;
  el.clearChatBtn.onclick = () => {
    const chat = getActiveChat();
    if (!chat) return;
    if (!confirm('Diesen Chat wirklich leeren?')) return;
    chat.messages = [];
    chat.updatedAt = new Date().toISOString();
    saveState();
    render();
  };
  el.exportBtn.onclick = exportState;
  el.importInput.onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importState(file);
    } catch (error) {
      setStatus(`Import fehlgeschlagen: ${error.message}`);
    }
    event.target.value = '';
  };
  el.themeSelect.onchange = () => {
    state.settings.theme = el.themeSelect.value;
    saveState();
    applyTheme();
  };
  el.addModelBtn.onclick = addModel;
  el.resetModelsBtn.onclick = () => {
    state.settings.allowedModels = [...DEFAULT_MODELS];
    saveState();
    renderSettings();
    renderControls();
  };
  el.addPresetBtn.onclick = addPreset;
  el.promptPresetSelect.onchange = () => {
    const preset = state.settings.promptPresets.find(p => p.id === el.promptPresetSelect.value);
    if (!preset) return;
    el.systemPromptInput.value = preset.prompt;
    updateActiveChatFromControls();
    el.promptPresetSelect.value = '';
    setStatus(`Preset „${preset.name}“ übernommen`);
  };
  el.attachmentInput.onchange = (event) => {
    attachFiles(event.target.files);
    event.target.value = '';
  };
  el.openSidebarBtn.onclick = () => el.sidebar.classList.add('open');
  el.toggleSidebarBtn.onclick = () => el.sidebar.classList.remove('open');
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
}

function injectHardcodedKeyPlaceholder() {
  state.settings.hardcodedApiKey = '';
}

injectHardcodedKeyPlaceholder();
setupTabs();
bindEvents();
if (!state.chats.length) createChat();
else render();
autoresizeTextarea();
