// elevenlabs-voice.js — ElevenLabs 通话语音（设置里可切换）
(function () {
  var KEY = 'elevenLabsVoice'
  var CFG = { enabled: false, key: '', voice: '', model: 'eleven_multilingual_v2' }
  var loaded = false

  async function load() {
    if (loaded) return CFG
    loaded = true
    try {
      var row = window.db && db.config ? await db.config.get(KEY) : null
      if (row && row.value) Object.assign(CFG, row.value)
    } catch (e) {}
    return CFG
  }
  function ok() { return !!(CFG.enabled && CFG.key && CFG.voice) }

  async function tts(text) {
    if (!ok() || !text) return null
    var url = 'https://api.elevenlabs.io/v1/text-to-speech/' +
      encodeURIComponent(CFG.voice) + '?output_format=mp3_44100_128'
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': CFG.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: String(text),
        model_id: CFG.model || 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    })
    if (!res.ok) throw new Error('ElevenLabs HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120))
    var blob = await res.blob()
    return URL.createObjectURL(blob)
  }

  window.ElevenVoice = { ready: ok, speak: tts, cfg: CFG }

  // 接管通话 TTS：ElevenLabs 优先，失败回退 Minimax
  function patchHelpers() {
    var helpers = window._wechatCallHelpers
    if (!helpers || typeof helpers.callMinimaxTTS !== 'function') return
    if (helpers.callMinimaxTTS.__el) return
    var orig = helpers.callMinimaxTTS
    var fn = async function (text) {
      try {
        var u = await tts(text)
        if (u) return u
      } catch (e) {
        console.warn('[ElevenLabs] 失败，回退 Minimax：', e.message)
      }
      return orig.apply(this, arguments)
    }
    fn.__el = true
    helpers.callMinimaxTTS = fn
  }

  // 没设 Minimax 音色的聊天也能出声：兜一个占位 id
  function patchDb() {
    if (!window.db || !db.config || db.config.__elPatched) return
    var tbl = db.config
    var orig = tbl.get.bind(tbl)
    tbl.get = function (key) {
      return orig(key).then(function (row) {
        if (row) return row
        if (ok() && typeof key === 'string' && key.indexOf('chatVoiceId_') === 0) {
          return { key: key, value: '__elevenlabs__' }
        }
        return row
      })
    }
    tbl.__elPatched = true
  }

  // ===== 设置页 =====
  function refreshValue() {
    var el = document.getElementById('val-elevenlabs-config')
    if (el) el.textContent = ok() ? (CFG.model || '已配置') : '未配置'
  }

  function injectRow() {
    var page = document.getElementById('settings-page')
    if (!page) return
    var anchor = page.querySelector('#row-minimax-config')
    if (!anchor || page.querySelector('#row-elevenlabs-config')) return
    var row = document.createElement('div')
    row.className = 'list-row clickable'
    row.id = 'row-elevenlabs-config'
    row.innerHTML =
      '<div class="row-icon-box"><i class="fa-solid fa-volume-high"></i></div>' +
      '<div class="row-body"><div class="row-label">ElevenLabs 语音配置</div></div>' +
      '<span class="row-value" id="val-elevenlabs-config">未配置</span>' +
      '<i class="fa fa-angle-right row-chevron"></i>'
    anchor.parentNode.insertBefore(row, anchor.nextSibling)
    row.addEventListener('click', openConfig)
    refreshValue()
  }

  function openConfig() {
    var models = [
      ['eleven_multilingual_v2', 'eleven_multilingual_v2（多语言，推荐）'],
      ['eleven_flash_v2_5', 'eleven_flash_v2_5（快、省额度）'],
      ['eleven_turbo_v2_5', 'eleven_turbo_v2_5（快）'],
      ['eleven_v3', 'eleven_v3（最新，最贵）']
    ]
    var html = '<div class="setting-section"><div class="api-form">' +
      '<div class="list-row" style="padding:0 0 4px;border:0">' +
        '<div class="row-body"><div class="row-label">优先用 ElevenLabs</div></div>' +
        '<label class="toggle-wrap"><input type="checkbox" id="el-on"' + (CFG.enabled ? ' checked' : '') + '>' +
        '<div class="toggle-track"></div><div class="toggle-thumb"></div></label>' +
      '</div>' +
      '<label class="form-label">API Key</label>' +
      '<input class="input-field" id="el-key" type="text" placeholder="sk_..." value="' + esc(CFG.key) + '">' +
      '<label class="form-label">Voice ID</label>' +
      '<input class="input-field" id="el-voice" placeholder="例如 onwK4e9ZLuTAKqWW03F9" value="' + esc(CFG.voice) + '">' +
      '<label class="form-label">模型</label>' +
      '<select class="input-field" id="el-model">' + models.map(function (m) {
        return '<option value="' + m[0] + '"' + (m[0] === CFG.model ? ' selected' : '') + '>' + m[1] + '</option>'
      }).join('') + '</select>' +
      '<div class="section-desc" style="padding:8px 0 0">' +
        'Voice ID 在 elevenlabs.io → Voices 里点进一个声音，地址栏 /voice-lab/ 后面那串就是。<br>' +
        '开启后通话语音优先走 ElevenLabs，出错或没填完自动回到 Minimax。</div>' +
      '<button class="btn-pill btn-full" id="el-save">保存</button>' +
      '<div class="section-desc" id="el-msg" style="padding:8px 0 0"></div>' +
      '</div></div>'
    var build = window.buildSubPage || buildSubPage
    var open = window.openSubPage || openSubPage
    var page = build('sub-elevenlabs-config', 'ElevenLabs 语音配置', html)
    open(page)
    page.querySelector('#el-save').addEventListener('click', async function () {
      CFG.enabled = page.querySelector('#el-on').checked
      CFG.key = page.querySelector('#el-key').value.trim()
      CFG.voice = page.querySelector('#el-voice').value.trim()
      CFG.model = page.querySelector('#el-model').value
      try {
        await db.config.put({ key: KEY, value: Object.assign({}, CFG) })
        refreshValue()
        var msg = page.querySelector('#el-msg')
        if (msg) msg.textContent = '已保存。'
        window.toast && window.toast('ElevenLabs 语音配置已保存')
      } catch (e) {
        window.toast && window.toast('保存失败：' + e.message)
      }
    })
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  }

  load().then(function () {
    patchHelpers(); patchDb(); injectRow(); refreshValue()
  })
  setInterval(function () { patchHelpers(); patchDb(); injectRow() }, 1000)
})()
