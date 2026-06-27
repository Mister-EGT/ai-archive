(function installPortableFluentIcons(){
  if (window.__portableFluentIconsLoaded) return;
  window.__portableFluentIconsLoaded = true;

  const SVG = {
    Robot:'<path d="M8 8.5h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z"/><path d="M12 8.5V5"/><path d="M9.5 5h5"/><path d="M9 14h.01"/><path d="M15 14h.01"/><path d="M9 17h6"/>',
    Add:'<path d="M12 5v14"/><path d="M5 12h14"/>',
    Send:'<path d="M4 5l16 7-16 7 3-7-3-7Z"/><path d="M7 12h7"/>',
    Stop:'<path d="M8 8h8v8H8z"/>',
    Copy:'<path d="M8 8h10v12H8z"/><path d="M6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    CheckMark:'<path d="M5 13l4 4L19 7"/>',
    Edit:'<path d="M4 20h4l11-11a2.1 2.1 0 0 0-3-3L5 17l-1 3Z"/><path d="M14 7l3 3"/>',
    Delete:'<path d="M6 7h12"/><path d="M9 7V5h6v2"/><path d="M8 10l1 10h6l1-10"/><path d="M10.5 12.5v5"/><path d="M13.5 12.5v5"/>',
    FavoriteStar:'<path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5Z"/>',
    FavoriteStarFill:'<path class="fill" d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7L12 4.5Z"/>',
    Settings:'<path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/><path d="M19 12a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7.3 7.3 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7.3 7.3 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.3 7.3 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7.3 7.3 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/>',
    GlobalNavButton:'<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    Cancel:'<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
    Message:'<path d="M5 6h14v10H8l-3 3V6Z"/>',
    View:'<path d="M3.5 12s3.2-6 8.5-6 8.5 6 8.5 6-3.2 6-8.5 6-8.5-6-8.5-6Z"/><path d="M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/>',
    PasswordKeyHide:'<path d="M4 4l16 16"/><path d="M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8"/><path d="M8.1 8.4C5.3 9.7 3.5 12 3.5 12s3.2 6 8.5 6c1.4 0 2.7-.4 3.8-1"/><path d="M13 6.1C17.8 6.6 20.5 12 20.5 12s-.8 1.5-2.2 3"/>',
    DefenderApp:'<path d="M12 3l7 3v5c0 4.6-2.8 7.9-7 10-4.2-2.1-7-5.4-7-10V6l7-3Z"/><path d="M12 7v10"/><path d="M8 11h8"/>',
    Refresh:'<path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 10A7 7 0 0 0 6.4 7.4L4 10"/><path d="M5.5 14a7 7 0 0 0 12.1 2.6L20 14"/>',
    Download:'<path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><path d="M5 19h14"/>',
    Component:'<path d="M8 8h8v8H8z"/><path d="M4 9h3"/><path d="M4 15h3"/><path d="M17 9h3"/><path d="M17 15h3"/><path d="M9 4v3"/><path d="M15 4v3"/><path d="M9 17v3"/><path d="M15 17v3"/>',
    Permissions:'<path d="M14 10a4 4 0 1 0-3.5 4"/><path d="M10.5 14L20 4.5"/><path d="M16 8.5l2 2"/><path d="M14 10.5l2 2"/>',
    QuietHours:'<path d="M18 16.5A7.5 7.5 0 0 1 7.5 6a7 7 0 1 0 10.5 10.5Z"/>',
    Brightness:'<path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M4.9 4.9L7 7"/><path d="M17 17l2.1 2.1"/><path d="M2 12h3"/><path d="M19 12h3"/><path d="M4.9 19.1L7 17"/><path d="M17 7l2.1-2.1"/>',
    Package:'<path d="M4 8l8-4 8 4v8l-8 4-8-4V8Z"/><path d="M4 8l8 4 8-4"/><path d="M12 12v8"/>',
    ChevronDown:'<path d="M6 9l6 6 6-6"/>',
    More:'<path d="M5 12h.01"/><path d="M12 12h.01"/><path d="M19 12h.01"/>',
    Down:'<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    Search:'<path d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"/><path d="M16 16l4 4"/>',
    Bug:'<path d="M8 8h8v9a4 4 0 0 1-8 0V8Z"/><path d="M9 8 7 5"/><path d="m15 8 2-3"/><path d="M5 12h3"/><path d="M16 12h3"/><path d="M5 16h3"/><path d="M16 16h3"/><path d="M10 11h.01"/><path d="M14 11h.01"/>',
    Attach:'<path d="M8 13.5 14.8 6.7a3 3 0 0 1 4.2 4.2l-8.1 8.1a4.5 4.5 0 0 1-6.4-6.4l8.4-8.4"/>',
    PaymentCard:'<path d="M4 7h16v10H4z"/><path d="M4 10h16"/><path d="M7 14h4"/>',
    Lightbulb:'<path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 10a4 4 0 1 1 8 0c0 2.5-2 3.3-2.5 5h-3C10 13.3 8 12.5 8 10Z"/>'
  };

  function iconMarkup(name){
    const path = SVG[name] || SVG.Component;
    return '<svg class="fluent-svg-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + path + '</svg>';
  }

  function upgradeOneIcon(node){
    if (!node || node.nodeType !== 1 || !node.matches?.('.fluent-icon[data-icon]')) return;
    const name = node.getAttribute('data-icon') || '';
    if (node.getAttribute('data-svg-icon') === name) return;
    node.innerHTML = iconMarkup(name);
    node.setAttribute('data-svg-icon', name);
    node.setAttribute('aria-hidden', 'true');
  }

  function upgradeFluentIcons(root){
    if (!root || root.nodeType !== 1) return;
    upgradeOneIcon(root);
    root.querySelectorAll?.('.fluent-icon[data-icon]').forEach(upgradeOneIcon);
  }

  const style = document.createElement('style');
  style.id = 'portable-fluent-icons-style';
  style.textContent = '.fluent-icon{font-family:inherit!important;font-size:var(--icon-size,16px)!important;line-height:1!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;text-transform:none!important}.fluent-svg-icon{width:100%;height:100%;display:block;overflow:visible;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.fluent-svg-icon .fill{fill:currentColor;stroke:none}';
  document.head.appendChild(style);

  window.__portableFluentIconsMode = 'inline-svg-forced';
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
