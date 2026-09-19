// swipe-back.js — 全局右滑退出
// 从左边缘往右滑：把当前最上层的全屏页滑走（等于点了返回）

(function() {
  var EDGE = 26;      // 起手边缘宽度
  var RATIO = 0.32;   // 滑过屏宽多少算退出
  var SPEED = 0.5;    // 快速轻扫判定（px/ms）
  var DUR = 280;      // 滑出时长

  var page = null, x0 = 0, y0 = 0, dx = 0, t0 = 0, w = 0
  var dragging = false, decided = false

  function topModalOpen() {
    return document.querySelectorAll(
      '.sheet-overlay.show, .center-modal.show, .img-picker-overlay.show, .disclaimer-overlay.show'
    ).length > 0
  }

  function topPage() {
    var list = document.querySelectorAll('#app .full-page')
    var best = null, bz = -1
    for (var i = 0; i < list.length; i++) {
      var el = list[i]
      if (el.classList.contains('is-opening') || el.classList.contains('is-closing')) continue
      var r = el.getBoundingClientRect()
      if (r.width < w * 0.9 || r.height < 200) continue
      var z = parseInt(getComputedStyle(el).zIndex, 10)
      if (isNaN(z)) z = 0
      if (z >= bz) { bz = z; best = el }
    }
    return best
  }

  function back(el) {
    el.style.transition = 'transform ' + DUR + 'ms var(--ease)'
    el.style.transform = 'translateY(0)'
    setTimeout(function() {
      el.style.transition = ''
      el.style.boxShadow = ''
    }, DUR)
  }

  function close(el) {
    el.classList.add('is-closing')
    el.style.pointerEvents = 'none'
    el.style.overflow = 'hidden'
    el.style.transition = 'transform ' + DUR + 'ms var(--ease)'
    el.style.transform = 'translateX(100%)'
    setTimeout(function() { el.remove() }, DUR + 30)
  }

  document.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1) return
    if (topModalOpen()) return
    var t = e.touches[0]
    if (t.clientX > EDGE) return
    w = window.innerWidth || 375
    var el = topPage()
    if (!el) return
    page = el; dx = 0; x0 = t.clientX; y0 = t.clientY; t0 = Date.now()
    dragging = false; decided = false
  }, { passive: true })

  document.addEventListener('touchmove', function(e) {
    if (!page || e.touches.length !== 1) return
    var t = e.touches[0]
    var mx = t.clientX - x0, my = t.clientY - y0
    if (!decided) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      if (Math.abs(my) > Math.abs(mx)) { page = null; return }   // 纵向：让页面自己滚
      decided = true; dragging = true
      page.style.transition = 'none'
      page.style.boxShadow = '-10px 0 26px rgba(0,0,0,.16)'
    }
    if (!dragging) return
    e.preventDefault()
    dx = mx > 0 ? mx : mx * 0.25
    page.style.transform = 'translateX(' + dx + 'px)'
  }, { passive: false })

  function end() {
    var el = page; page = null
    if (!el || !dragging) { dragging = false; return }
    dragging = false
    var dt = Math.max(1, Date.now() - t0)
    var fast = dx / dt > SPEED && dx > 24
    if (dx > w * RATIO || fast) close(el)
    else back(el)
  }

  document.addEventListener('touchend', end, { passive: true })
  document.addEventListener('touchcancel', end, { passive: true })
})()
