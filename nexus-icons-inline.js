(function installPortableFluentIcons(){
  if (window.__portableFluentIconsLoaded) return;
  window.__portableFluentIconsLoaded = true;

  const BASES = [
    'https://cdn.jsdelivr.net/npm/@fluentui/svg-icons/icons/',
    'https://unpkg.com/@fluentui/svg-icons/icons/'
  ];

  const OFFICIAL = {
    Robot:'bot_24_regular.svg',
    Add:'add_24_regular.svg',
    Send:'send_24_regular.svg',
    Stop:'stop_24_regular.svg',
    Copy:'copy_24_regular.svg',
    CheckMark:'checkmark_24_regular.svg',
    Edit:'edit_24_regular.svg',
    Delete:'delete_24_regular.svg',
    FavoriteStar:'star_24_regular.svg',
    FavoriteStarFill:'star_24_filled.svg',
    Settings:'settings_24_regular.svg',
    GlobalNavButton:'navigation_24_regular.svg',
    Cancel:'dismiss_24_regular.svg',
    Message:'chat_24_regular.svg',
    View:'eye_24_regular.svg',
    PasswordKeyHide:'eye_off_24_regular.svg',
    DefenderApp:'shield_24_regular.svg',
    Refresh:'arrow_clockwise_24_regular.svg',
    Download:'arrow_download_24_regular.svg',
    Component:'developer_board_24_regular.svg',
    Permissions:'key_24_regular.svg',
    QuietHours:'weather_moon_24_regular.svg',
    Brightness:'weather_sunny_24_regular.svg',
    Package:'archive_24_regular.svg',
    ChevronDown:'chevron_down_24_regular.svg',
    More:'more_horizontal_24_regular.svg',
    Down:'arrow_down_24_regular.svg',
    Search:'search_24_regular.svg',
    Bug:'bug_24_regular.svg',
    Attach:'attach_24_regular.svg',
    PaymentCard:'payment_24_regular.svg',
    Lightbulb:'lightbulb_24_regular.svg'
  };

  const LOCAL_FALLBACK = {
    Robot:'<path d="M8 8.5h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z"/><path d="M12 8.5V5"/><path d="M9.5 5h5"/><path d="M9 14h.01"/><path d="M15 14h.01"/><path d="M9 17h6"/>',
    Add:'<path d="M12 5v14"/><path d="M5 12h14"/>',
    Send:'<path d="M4 5l16 7-16 7 3-7-3-7Z"/><path d="M7 12h7"/>',
    Stop:'<path d="M8 8h8v8H8z"/>',
    Copy:'<path d="M8 8h10v12H8z"/><path d="M6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    CheckMark:'<path d="M5 13l4 4L19 7"/>',
    Edit:'<path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 3Z"/><path d="M14 7l3 3"/>',
    Delete:'<path d="M6 7h12"/><path d="M9 7V5h6v2"/><path d="M8 10l1 10h6l1-10"/><path d="M10.5 12.5v5"/><path d="M13.5 12.5v5"/>',
    FavoriteStar:'<path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5Z"/>',
    FavoriteStarFill:'<path class="fill" d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5Z"/>'
  };

  const iconCache = new Map();

  function svgFallback(name){
    const path = LOCAL_FALLBACK[name] || LOCAL_FALLBACK.Add;
    return '<svg class="fluent-svg-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + path + '</svg>';
  }

  function sanitizeSvg(svgText){
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() !== 'svg') return '';
    svg.querySelectorAll('script,style,foreignObject').forEach(node => node.remove());
    svg.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'href' || name.endsWith(':href')) node.removeAttribute(attr.name);
      });
    });
    svg.setAttribute('class', 'fluent-svg-icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'currentColor');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    return svg.outerHTML;
  }

  async function fetchOfficialIcon(name){
    const file = OFFICIAL[name];
    if (!file) return '';
    if (iconCache.has(file)) return iconCache.get(file);
    const promise = (async () => {
      for (const base of BASES) {
        try {
          const response = await fetch(base + file, { cache:'force-cache', mode:'cors' });
          if (!response.ok) continue;
          const svg = sanitizeSvg(await response.text());
          if (svg) return svg;
        } catch {}
      }
      return '';
    })();
    iconCache.set(file, promise);
    return promise;
  }

  async function upgradeOneIcon(node){
    if (!node || node.nodeType !== 1 || !node.matches?.('.fluent-icon[data-icon]')) return;
    const name = node.getAttribute('data-icon') || '';
    if (node.getAttribute('data-svg-icon') === name) return;
    node.setAttribute('data-svg-icon', name);
    node.innerHTML = svgFallback(name);
    const officialSvg = await fetchOfficialIcon(name);
    if (officialSvg && node.isConnected && node.getAttribute('data-svg-icon') === name) node.innerHTML = officialSvg;
  }

  function upgradeFluentIcons(root){
    if (!root || root.nodeType !== 1) return;
    upgradeOneIcon(root);
    root.querySelectorAll?.('.fluent-icon[data-icon]').forEach(upgradeOneIcon);
  }

  const style = document.createElement('style');
  style.id = 'portable-fluent-icons-style';
  style.textContent = '.fluent-icon{font-family:inherit!important;font-size:var(--icon-size,16px)!important;line-height:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;text-transform:none!important}.fluent-svg-icon{width:100%;height:100%;display:block;overflow:visible;fill:currentColor}.fluent-svg-icon *{vector-effect:non-scaling-stroke}';
  document.head.appendChild(style);

  window.__portableFluentIconsMode = 'official-fluent-svg';
  upgradeFluentIcons(document.documentElement);

  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        upgradeOneIcon(record.target);
        continue;
      }
      record.addedNodes.forEach(node => upgradeFluentIcons(node));
    }
  }).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class','data-icon'] });
})();
