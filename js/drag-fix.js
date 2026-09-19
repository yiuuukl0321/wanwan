// drag-fix.js — 桌面图标拖动性能修复（不改原文件）
(function () {
  var css = [
    /* 1. 拖动中的图标停掉抖动动画，否则和拖动打架 → 闪 */
    '#home-page.desktop-editing .app-icon.is-dragging-source,',
    '#home-page.desktop-editing .dock-item.is-dragging-source,',
    '#home-page.desktop-editing .desktop-widget.is-dragging-source {',
    '  animation: none !important;',
    '}',
    /* 2. ghost 去掉 drop-shadow，换成便宜的 box-shadow，并提到独立合成层 */
    '.desktop-drag-ghost {',
    '  filter: none !important;',
    '  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.18);',
    '  will-change: transform;',
    '  backface-visibility: hidden;',
    '}',
    /* 3. 按住图标的这段时间关掉毛玻璃，iOS 上 blur 叠加最拖性能 */
    '#home-page.is-icon-dragging .icon-bg,',
    '#home-page.is-icon-dragging .dock-icon-bg,',
    '#home-page.is-icon-dragging .dock-glass,',
    '#home-page.is-icon-dragging .desktop-widget {',
    '  backdrop-filter: none !important;',
    '  -webkit-backdrop-filter: none !important;',
    '}'
  ].join('\n')

  var style = document.createElement('style')
  style.id = 'wanwan-drag-fix'
  style.textContent = css
  document.head.appendChild(style)

  document.addEventListener('pointerdown', function (e) {
    var home = document.getElementById('home-page')
    if (!home || !e.target || !e.target.closest) return
    if (!e.target.closest('#home-page')) return
    if (!e.target.closest('.app-icon, .dock-item, .desktop-widget')) return
    var timer = setTimeout(function () { home.classList.add('is-icon-dragging') }, 120)
    var off = function () {
      clearTimeout(timer)
      home.classList.remove('is-icon-dragging')
      document.removeEventListener('pointerup', off, true)
      document.removeEventListener('pointercancel', off, true)
    }
    document.addEventListener('pointerup', off, true)
    document.addEventListener('pointercancel', off, true)
  }, true)
})()
