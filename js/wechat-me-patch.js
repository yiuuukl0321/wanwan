/* wechat-me-patch.js —— 必须加载在 wechat.js 之后
   作用：删掉全部 Followers / Following，我页顶部换成咩&砚版式 */
(function(){
  /* ---------- 样式 ---------- */
  var st = document.createElement('style');
  st.textContent =
    '.me-profile-page{padding:16px}' +
    '.me-profile-page .card{padding:0 18px;margin-bottom:12px}' +
    '.me-profile-page .card:first-child{padding:18px}' +
    '.me-hero-top{display:flex;align-items:center;gap:14px}' +
    '.me-avatar{width:62px;height:62px;border-radius:50%;overflow:hidden;flex:0 0 auto;background:#f1f1ef}' +
    '.me-avatar img{width:100%;height:100%;object-fit:cover}' +
    '.me-name{font-size:21px;font-weight:600;letter-spacing:-.4px}' +
    '.me-wechat-id{font-size:12px;color:var(--mute);margin-top:4px}' +
    '.me-menu button.item{width:100%;background:none;border:0;border-bottom:1px solid var(--line);' +
      'font:inherit;color:inherit;text-align:left;cursor:pointer;display:flex;align-items:center;' +
      'justify-content:space-between;gap:12px;padding:15px 0;min-height:52px;font-size:14.5px}' +
    '.me-menu button.item:last-child{border-bottom:0}' +
    '.me-menu button.item em{font-style:normal;color:var(--mute);font-size:11px}' +
    '.is-danger{color:#c0392b}' +
    '.me-stats{display:none!important}';
  document.head.appendChild(st);

  /* ---------- 覆盖函数 ---------- */
  window.getWechatSelfProfile = async function(uid){
    uid = uid || window._wechatUid;
    if (!uid) return { avatar: '', bio: '' };
    var row = await db.config.get('wechatSelfProfile_' + uid);
    return { avatar: '', bio: '', ...(row && row.value || {}) };
  };

  window.buildMeTabHTML = function(user, profile, posts, selfAvatar){
    var name = (user && (user.nick || user.name)) || '未知用户';
    var account = (user && user.identity && user.identity.account) || '未设置';
    var bio = String(profile && profile.bio || '').trim();
    var avatar = buildWechatSelfAvatarHTML(selfAvatar, name);
    return `
      <div class="me-profile-page">
        <div class="card">
          <div class="me-hero-top">
            <div class="me-avatar">${avatar}</div>
            <div class="me-info-stack">
              <div class="me-name">${wcEscHtml(name)}</div>
              <div class="me-wechat-id">@${wcEscHtml(account)}</div>
            </div>
          </div>
          ${bio ? <div class="sub">${wcEscHtml(bio)}</div> : ''}
        </div>
        <div class="card me-menu">
          <button class="item" id="btn-me-edit-profile" type="button"><span>Edit Profile</span><i class="x">›</i></button>
          <button class="item" id="btn-me-view-profile" type="button"><span>View Profile</span><i class="x">›</i></button>
        </div>
        <div class="card me-menu">
          ${buildMeMenuRow('btn-wallet-row', 'fa-solid fa-credit-card', '微信支付')}
          ${buildMeMenuRow('btn-favorites-row', 'fa-solid fa-cube', '我的收藏')}
          ${buildMeMenuRow('btn-stickers-row', 'fa-solid fa-icons', '表情')}
          ${buildMeMenuRow('btn-plugin-row', 'fa-solid fa-heart-circle-bolt', '插件')}
          ${buildMeMenuRow('btn-beauty-row', 'fa-solid fa-wand-sparkles', '美化')}
          <button class="item me-switch-row" id="btn-account-switch-row" type="button">
            <span class="is-danger">切换账号</span>
          </button>
        </div>
      </div>`;
  };

  window.showEditProfileStatsSheet = async function(wechatPage){
    var profile = await getWechatSelfProfile();
    var sheet = wcMakeSheet(`
      <div class="sheet-title">Edit Profile</div>
      <div class="me-stats-editor">
        <label class="me-profile-field">
          <span>个性签名</span>
          <textarea class="input-field" id="me-bio-input" rows="4" placeholder="输入个性签名">${wcEscHtml(profile.bio || '')}</textarea>
        </label>
      </div>
      <div class="sheet-actions">
        <button class="btn-pill btn-full" id="btn-save-me-stats">保存</button>
      </div>`);
    wcShowSheet(sheet, async function(){
      await saveWechatSelfProfile({ bio: sheet.querySelector('#me-bio-input').value.trim() });
      await loadMeTab(wechatPage, wechatPage.querySelector('#wechat-content'));
    });
  };

  window.renderMeTabPage = function(page, container, html){
    container.innerHTML = html;
    if (isWechatRolePhoneMode(page)) {
      var a = container.querySelector('#btn-role-phone-view-moments');
      if (a) a.addEventListener('click', function(){ loadWechatRolePhoneMoments(page); });
      var b = container.querySelector('#btn-role-phone-wallet');
      if (b) b.addEventListener('click', function(){ window.openRolePhoneWalletPage && window.openRolePhoneWalletPage(_wechatRolePhoneSession); });
      return;
    }
    var map = {
      'btn-me-edit-profile': function(){ showEditProfileStatsSheet(page); },
      'btn-me-view-profile': function(){ openWechatSelfProfilePage(page); },
      'btn-wallet-row': function(){ openWechatWalletPage(); },
      'btn-favorites-row': function(){ openWechatFavoritesPage(); },
      'btn-stickers-row': function(){ openStickerLibraryPage(); },
      'btn-plugin-row': function(){ openThoughtPresetsPage(); },
      'btn-beauty-row': function(){ openChatBeautyPresetsPage(); },
      'btn-account-switch-row': function(){ openWechatAccountSwitchPage(); }
    };
    Object.keys(map).forEach(function(id){
      var el = container.querySelector('#' + id);
      if (el) el.addEventListener('click', map[id]);
    });
  };

  window.buildRolePhoneMeTabStateHTML = async function(){
    var s = _wechatRolePhoneSession;
    var charId = (s && s.charId) || _wechatUid;
    var ownerUid = s && s.ownerUid;
    var char = await getWechatDisplayCharacter(charId, ownerUid);
    if (!char) return '<div class="list-empty">角色不存在</div>';
    var mp = await getWechatContactMomentsProfileForOwner(ownerUid, charId);
    var gn = await getPrivateChatGroupNameForOwner(ownerUid, charId);
    return buildRolePhoneMeTabHTML(char, mp, gn);
  };

  window.buildRolePhoneMeTabHTML = function(char, momentsProfile, groupName){
    var name = getWechatDisplayName(char);
    var account = (char && char.identity && char.identity.account) || '未设置';
    var avatar = buildCharacterAvatarHTML(char);
    var bio = String(momentsProfile && momentsProfile.bio || '').trim();
    return `
      <div class="me-profile-page contact-profile-scroll">
        <div class="card">
          <div class="me-hero-top">
            <div class="me-avatar">${avatar}</div>
            <div class="me-info-stack">
              <div class="me-name">${wcEscHtml(name)}</div>
              <div class="me-wechat-id">@${wcEscHtml(account)}</div>
            </div>
          </div>
          ${bio ? <div class="sub">${wcEscHtml(bio.slice(0, 120))}</div> : ''}
          <div class="me-actions">
            <button class="me-action-btn me-action-primary" id="btn-role-phone-view-moments" type="button">朋友圈</button>
            <button class="me-action-btn" type="button">Message</button>
          </div>
        </div>
        <div class="card me-menu">
          <button class="item" id="btn-role-phone-wallet" type="button"><span>微信支付</span><i class="x">›</i></button>
          <button class="item" type="button"><span>我的收藏</span><i class="x">›</i></button>
        </div>
      </div>`;
  };

  window.openWechatContactProfilePage = async function(wechatPage, charId){
    var char = await getWechatDisplayCharacter(charId);
    if (!char) return;
    var mp = await getWechatContactMomentsProfile(charId);
    var gn = await getPrivateChatGroupName(charId);
    var page = document.createElement('div');
    page.id = 'wechat-contact-profile-page';
    page.className = 'full-page wechat-contact-profile-page';
    if (isWechatRolePhoneMode(wechatPage)) {
      page.classList.add('wechat-role-phone-page');
      page.dataset.wechatRolePhone = '1';
    }
    page.dataset.charId = charId;
    page.innerHTML = buildWechatContactProfilePageHTML(char, mp, gn);
    window.openPage(page);
    page.querySelector('#btn-wcp-back').addEventListener('click', function(){ window.closePage('wechat-contact-profile-page'); });
    page.querySelector('#btn-wcp-message').addEventListener('click', async function(){
      window.closePage('wechat-contact-profile-page');
      await openPrivateChat(wechatPage, charId, null);
    });
    page.querySelector('#wcp-group-row').addEventListener('click', function(){ showContactGroupPicker(page, wechatPage, charId); });
    var cr = page.querySelector('#wcp-call-records');
    if (cr) cr.addEventListener('click', function(){ window.openCallRecordsPage && window.openCallRecordsPage(charId); });
    page.querySelector('#btn-wcp-moments').addEventListener('click', function(){ openWechatContactMomentsPage(wechatPage, charId); });
  };

  window.buildWechatContactProfilePageHTML = function(char, momentsProfile, groupName){
    var name = getWechatDisplayName(char);
    var account = (char && char.identity && char.identity.account) || '未设置';
    var avatar = buildCharacterAvatarHTML(char);
    var bio = String(momentsProfile && momentsProfile.bio || '').trim();
    return `
      <div class="page-header">
        <button class="header-back" id="btn-wcp-back"><i class="fa fa-angle-left"></i></button>
        <span class="header-title">Personal Profile</span>
        <span class="header-spacer"></span>
      </div>
      <div class="me-profile-page contact-profile-scroll">
        <div class="card">
          <div class="me-hero-top">
            <div class="me-avatar">${avatar}</div>
            <div class="me-info-stack">
              <div class="me-name">${wcEscHtml(name)}</div>
              <div class="me-wechat-id">@${wcEscHtml(account)}</div>
            </div>
          </div>
          ${bio ? <div class="sub">${wcEscHtml(bio.slice(0, 120))}</div> : ''}
          <div class="me-actions">
            <button class="me-action-btn me-action-primary" id="btn-wcp-moments" type="button">朋友圈</button>
            <button class="me-action-btn" id="btn-wcp-message" type="button">Message</button>
          </div>
        </div>
        <div class="card me-menu">
          <button class="item" id="wcp-group-row" type="button">
            <span>分组</span><em id="wcp-group-value">${wcEscHtml(groupName || '')}</em>
          </button>
          <button class="item" id="wcp-call-records" type="button">
            <span>通话记录</span><i class="x">›</i>
          </button>
        </div>
      </div>`;
  };

  /* ---------- 兜底：任何地方冒出 Followers / Following 就抹掉 ---------- */
  function sweep(root){
    (root || document).querySelectorAll('.me-stats, .me-stat').forEach(function(el){
      if (/Follow/i.test(el.textContent || '')) el.remove();
    });
  }
  sweep(document);
  new MutationObserver(function(muts){
    muts.forEach(function(m){ m.addedNodes && m.addedNodes.forEach(function(n){ if (n.nodeType === 1) sweep(n); }); });
  }).observe(document.body, { childList: true, subtree: true });
})();
