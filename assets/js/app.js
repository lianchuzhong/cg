/* 主页逻辑：免登录预约（昵称 或 手机号 即可） */
(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var modal = $("#modal");
  var mBody = $("#mBody");
  var toastEl = $("#toast");
  var currentCat = "all";
  var lastBooking = null;
  var toastTimer = null;
  var shareItem = null;

  var fProv = $("#fProv"), fCity = $("#fCity"), fDist = $("#fDist"), kwInput = $("#kw");
  var selProv = "", selCity = "", selDist = "";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function toast(msg, type) {
    toastEl.textContent = msg;
    toastEl.className = "toast" + (type ? " " + type : "");
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function catLabel(key) {
    var c = (window.CATS || []).filter(function (x) { return x.key === key; })[0];
    return c ? c.label.replace(/^\S+\s?/, "") : key;
  }

  /* ---------- 省市区联动筛选 ---------- */
  function regionOf(i) { return [i.prov || "", i.city || "", i.dist || ""].join(" "); }

  function uniq(list, key) {
    var seen = {}, out = [];
    list.forEach(function (i) {
      var v = i[key] || "";
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    });
    return out.sort();
  }

  /* 依据上级选择，列出该项下真正存在的地区；上级为「全部」时列出全部 */
  function fillRegion(sel, key, pool) {
    var cur = sel.value;
    sel.innerHTML = '<option value="">全部</option>' +
      uniq(pool, key).map(function (v) {
        return '<option value="' + esc(v) + '">' + esc(v) + "</option>";
      }).join("");
    if (cur && uniq(pool, key).indexOf(cur) !== -1) sel.value = cur;
    else if (cur) { sel.value = ""; return true; }
    return false;
  }

  /* 返回 true 表示级联中有值被清掉，需要继续刷新 */
  function syncRegions() {
    var items = window.ITEMS || [];
    var changed = false;
    changed = fillRegion(fProv, "prov", items) || changed;

    var poolCity = selProv ? items.filter(function (i) { return i.prov === selProv; }) : items;
    changed = fillRegion(fCity, "city", poolCity) || changed;

    var poolDist = poolCity.filter(function (i) { return !selCity || i.city === selCity; });
    changed = fillRegion(fDist, "dist", poolDist) || changed;

    selProv = fProv.value; selCity = fCity.value; selDist = fDist.value;
    return changed;
  }

  /* ---------- 分类筛选 ---------- */
  function renderFilters() {
    $("#filters").innerHTML = (window.CATS || []).map(function (c) {
      return '<button class="chip' + (c.key === currentCat ? " active" : "") + '" data-cat="' + c.key + '" role="tab">' + esc(c.label) + "</button>";
    }).join("");
  }

  function matchKeyword(i, kw) {
    if (!kw) return true;
    var hay = [i.name, i.desc, i.addr, i.tags, regionOf(i)].join(" ").toLowerCase();
    return hay.indexOf(kw) !== -1;
  }

  function visibleItems() {
    var kw = (kwInput.value || "").trim().toLowerCase();
    return (window.ITEMS || []).filter(function (i) {
      if (currentCat !== "all" && i.cat !== currentCat) return false;
      if (selProv && i.prov !== selProv) return false;
      if (selCity && i.city !== selCity) return false;
      if (selDist && i.dist !== selDist) return false;
      return matchKeyword(i, kw);
    });
  }

  function renderCards() {
    var list = visibleItems();
    var grid = $("#cardGrid");
    grid.innerHTML = list.map(function (i) {
      return '' +
      '<article class="card" data-card="' + esc(i.id) + '">' +
        '<div class="card-top">' +
          '<div class="card-emoji">' + esc(i.emoji) + "</div>" +
          "<div>" +
            '<h3 class="card-name">' + esc(i.name) + "</h3>" +
            '<div class="card-meta">' + esc(regionOf(i)) + " · " + esc(i.addr) + " · " + esc(i.duration) + "</div>" +
          "</div>" +
        "</div>" +
        '<p class="card-desc">' + esc(i.desc) + "</p>" +
        '<div class="chip-tags">' + (i.tags || []).map(function (t) {
          return '<span class="chip-tag">' + esc(t) + "</span>";
        }).join("") + "</div>" +
        '<div class="card-foot">' +
          '<div class="price">¥' + esc(i.price) + "<small>/" + esc(i.unit) + "</small></div>" +
          '<div class="card-acts">' +
            '<button class="btn btn-ghost btn-sm" data-share="' + esc(i.id) + '">分享</button>' +
            '<button class="btn" data-book="' + esc(i.id) + '">立即预约</button>' +
          "</div>" +
        "</div>" +
      "</article>";
    }).join("");

    var kw = (kwInput.value || "").trim();
    var parts = [];
    if (currentCat !== "all") parts.push(catLabel(currentCat));
    if (selProv) parts.push(selProv);
    if (selCity) parts.push(selCity);
    if (selDist) parts.push(selDist);
    if (kw) parts.push("“" + kw + "”");
    $("#resultCount").textContent = "共 " + list.length + " 个项目" +
      (parts.length ? "（" + parts.join(" · ") + "）" : "");

    $("#listEmpty").hidden = list.length > 0;
  }

  /* ---------- 弹窗 ---------- */
  function openModal(html, wide) {
    mBody.innerHTML = html;
    modal.className = wide ? "modal modal-wide" : "modal";
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.hidden = true;
    modal.className = "modal";
    mBody.innerHTML = "";
    shareItem = null;
    document.body.style.overflow = "";
    Array.prototype.forEach.call(document.querySelectorAll(".card.hit"), function (el) {
      el.classList.remove("hit");
    });
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) closeModal();
    if (e.target.closest(".modal-close")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  /* ---------- 预约表单 ---------- */
  function slotOptions() {
    return Store.TIME_SLOTS.map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(s) + "</option>";
    }).join("");
  }

  function openBooking(itemId) {
    var item = window.ITEMS.filter(function (i) { return i.id === itemId; })[0];
    if (!item) return;
    lastBooking = null;

    openModal('' +
      '<h3 class="m-title">预约 ' + esc(item.name) + "</h3>" +
      '<p class="m-sub">昵称需全站唯一，填昵称或手机号任一项即可提交</p>' +

      '<div class="m-summary">' +
        '<div class="card-emoji">' + esc(item.emoji) + "</div>" +
        '<div class="m-sum-body">' +
          '<div class="m-sum-name">' + esc(regionOf(item)) + " · " + esc(item.addr) + "</div>" +
          '<div class="m-sum-meta">' + esc(item.duration) + " · " + esc((item.tags || []).join(" / ")) + "</div>" +
        "</div>" +
        '<div class="m-price">¥' + esc(item.price) + "</div>" +
      "</div>" +

      '<form id="bookForm" data-item="' + esc(item.id) + '" novalidate>' +
        '<div class="form-grid">' +
          '<label class="field">' +
            '<span class="field-label">昵称 <i>*</i>（唯一，不可重复） 或 手机号（任填一项）</span>' +
            '<input class="input" name="name" type="text" maxlength="20" placeholder="如：小明" autocomplete="nickname">' +
          "</label>" +
          '<label class="field">' +
            '<span class="field-label">手机号（选填，可只填昵称）</span>' +
            '<input class="input" name="phone" type="tel" maxlength="11" placeholder="11 位手机号" inputmode="numeric" autocomplete="tel">' +
          "</label>" +
          '<label class="field">' +
            '<span class="field-label">预约日期 <i>*</i></span>' +
            '<input class="input" name="date" type="date" value="' + Store.today() + '" min="' + Store.today() + '" required>' +
          "</label>" +
          '<label class="field">' +
            '<span class="field-label">时段 <i>*</i></span>' +
            '<select class="input" name="slot">' + slotOptions() + "</select>" +
          "</label>" +
          '<label class="field">' +
            '<span class="field-label">' + (item.cat === "food" || item.cat === "drink" ? "用餐/到店人数" : "参与人数") + " <i>*</i></span>" +
            '<input class="input" name="people" type="number" min="1" max="99" value="2" required>' +
          "</label>" +
          '<label class="field">' +
            '<span class="field-label">份数 / 桌数</span>' +
            '<input class="input" name="qty" type="number" min="1" max="20" value="1">' +
          "</label>" +
        "</div>" +
        '<label class="field">' +
          '<span class="field-label">备注（选填）</span>' +
          '<input class="input" name="note" type="text" maxlength="60" placeholder="如：靠窗位置、忌口、纪念日">' +
        "</label>" +
        '<p class="err" id="formErr"></p>' +
        '<button class="btn btn-block" type="submit">提交预约（免预约金）</button>' +
        '<p class="hint">提交后记住预约码，可在下方“我的预约”用昵称或手机号随时查询。</p>' +
      "</form>");

    var f = $("#bookForm");
    f.date.value = Store.today();
    f.slot.selectedIndex = 4;
    f.people.focus();
  }

  function formErr(msg) {
    $("#formErr").textContent = msg || "";
    return !msg;
  }

  /* 昵称占用时实时提示，避免等到提交才知道 */
  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el.name || el.name !== "name" || !el.form || el.form.id !== "bookForm") return;
    var v = el.value.trim();
    if (!v || v.length > 20) return void formErr("");
    if (Store.nameTaken(v)) formErr("昵称「" + v + "」已被使用，请换一个昵称");
  });

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.id !== "bookForm") return;
    e.preventDefault();

    var item = window.ITEMS.filter(function (i) { return i.id === f.dataset.item; })[0];
    if (!item) return;

    var name = f.name.value.trim();
    var phone = f.phone.value.trim();
    var date = f.date.value;
    var people = parseInt(f.people.value, 10);
    var qty = parseInt(f.qty.value, 10) || 1;
    var note = f.note.value.trim();

    if (!name && !phone) return void formErr("请至少填写昵称或手机号其中一项");
    if (name && name.length > 20) return void formErr("昵称最多 20 个字");
    if (name && Store.nameTaken(name)) return void formErr("昵称「" + name + "」已被使用，请换一个昵称");
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) return void formErr("手机号格式不正确，请填 11 位");
    if (!date) return void formErr("请选择预约日期");
    if (date < Store.today()) return void formErr("日期不能早于今天");
    if (!people || people < 1 || people > 99) return void formErr("人数需在 1-99 之间");
    if (qty < 1 || qty > 20) return void formErr("份数需在 1-20 之间");
    if (!formErr("")) return;

    var btn = f.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "提交中…";

    try {
      lastBooking = Store.createBooking({
        itemId: item.id,
        itemName: item.name,
        itemEmoji: item.emoji,
        cat: item.cat,
        prov: item.prov || "",
        city: item.city || "",
        dist: item.dist || "",
        addr: item.addr || "",
        unitPrice: item.price,
        qty: qty,
        date: date,
        slot: f.slot.value,
        name: name,
        phone: phone,
        people: people,
        note: note
      });
      showSuccess(lastBooking);
      renderMine();
    } catch (err) {
      formErr(err.message || "提交失败，请重试");
    } finally {
      btn.disabled = false;
      btn.textContent = "提交预约（免预约金）";
    }
  });

  function showSuccess(b) {
    openModal('' +
      '<div class="ok-icon">🎉</div>' +
      '<h3 class="ok-title">预约成功</h3>' +
      '<p class="ok-sub">' + esc(b.name || b.phone) + " 的预约已提交，等待商家确认</p>" +

      '<div class="code-box">' +
        '<div class="code-label">预约码（到店出示）</div>' +
        '<div class="code-num">' + esc(b.code) + "</div>" +
      "</div>" +

      '<div class="sum-row"><span>项目</span><span>' + esc(b.itemEmoji + " " + b.itemName) + "</span></div>" +
      '<div class="sum-row"><span>时间</span><span>' + esc(b.date) + " " + esc(b.slot) + "</span></div>" +
      '<div class="sum-row"><span>人数 / 份数</span><span>' + esc(b.people) + " 人 · " + esc(b.qty) + " 份</span></div>" +
      '<div class="sum-row"><span>联系方式</span><span>' + esc([b.name, b.phone].filter(Boolean).join(" / ")) + "</span></div>" +
      (b.note ? '<div class="sum-row"><span>备注</span><span>' + esc(b.note) + "</span></div>" : "") +
      '<div class="sum-total"><span>合计（到店支付）</span><span>¥' + esc(b.amount) + "</span></div>" +

      '<div style="display:flex;gap:10px;margin-top:20px">' +
        '<button class="btn btn-ghost" style="flex:1" data-save>保存到桌面</button>' +
        '<button class="btn" style="flex:1" data-close>完成</button>' +
      "</div>");
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest("[data-save]")) return;
    if (!lastBooking) return;
    Store.exportJSON([lastBooking])
      .then(function (r) {
        toast(r.method === "picker" ? "已保存到 " + r.suggested : "已下载，请在浏览器下载目录查看（可把下载目录设为桌面）", "ok");
      })
      .catch(function () { toast("已取消保存", "err"); });
  });

  /* ---------- 分享：每个商家一条专属链接 + 一张二维码 ---------- */
  function findItem(id) {
    var list = window.ITEMS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* 去掉当前页面的查询串和 hash，保留站点根路径，拼出该商家的专属地址 */
  function shareUrl(itemId) {
    var base = location.href.split("#")[0].split("?")[0];
    return base + "?i=" + encodeURIComponent(itemId);
  }

  function shareText(item) {
    return item.emoji + " " + item.name + "\n" +
      regionOf(item) + " " + item.addr + "\n" +
      "¥" + item.price + "/" + item.unit + " · " + item.duration + "\n" +
      "点链接或扫码直接预约：\n" + shareUrl(item.id);
  }

  function copyText(text, okMsg) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? okMsg : "复制失败，请长按/选中上面的链接手动复制", ok ? "ok" : "err");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg, "ok"); }, fallback);
    } else {
      fallback();
    }
  }

  function highlightCard(itemId) {
    Array.prototype.forEach.call(document.querySelectorAll(".card.hit"), function (el) {
      el.classList.remove("hit");
    });
    var card = document.querySelector('[data-card="' + itemId + '"]');
    if (!card) return false;
    card.classList.add("hit");
    if (typeof card.scrollIntoView === "function") card.scrollIntoView({ block: "center" });
    return true;
  }

  function openShare(itemId) {
    var item = findItem(itemId);
    if (!item) return toast("该项目不存在", "err");
    shareItem = item;
    highlightCard(item.id);

    openModal('' +
      '<h3 class="m-title">分享 · ' + esc(item.emoji + " " + item.name) + "</h3>" +
      '<p class="m-sub">把这个链接或二维码发给客人，对方点开 / 扫码就直接进入「' + esc(item.name) + "」的预约页</p>" +

      '<div class="share-body">' +
        '<div class="share-qr"><canvas id="qrCanvas"></canvas></div>' +
        '<div class="share-side">' +
          '<div>' +
            '<span class="field-label">本商家预约地址</span>' +
            '<input class="input" id="shareUrl" readonly value="' + esc(shareUrl(item.id)) + '">' +
          "</div>" +
          '<div class="share-btns">' +
            '<button class="btn btn-sm" data-copy-link>复制链接</button>' +
            '<button class="btn btn-ghost btn-sm" data-copy-text>复制文案</button>' +
            '<button class="btn btn-ghost btn-sm" data-save-qr>保存二维码</button>' +
          "</div>" +
          '<div class="share-preview">' +
            esc(item.emoji + " " + item.name) + "<br>" +
            esc(regionOf(item) + " · " + item.addr) + "<br>" +
            esc("¥" + item.price + "/" + item.unit + " · " + item.duration) +
          "</div>" +
          '<p class="hint">链接和二维码都只指向这一个商家，别的项目不会出现在对方的预约页里。</p>' +
        "</div>" +
      "</div>", true);

    try {
      QR.draw($("#qrCanvas"), shareUrl(item.id), { scale: 6 });
    } catch (err) {
      toast("二维码生成失败：" + (err.message || "内容过长"), "err");
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-copy-link]") && shareItem) {
      copyText(shareUrl(shareItem.id), "链接已复制");
      return;
    }
    if (e.target.closest("[data-copy-text]") && shareItem) {
      copyText(shareText(shareItem), "文案已复制");
      return;
    }
    if (e.target.closest("[data-save-qr]") && shareItem) {
      var canvas = $("#qrCanvas");
      if (!canvas) return;
      var name = shareItem.name.replace(/[\\/:*?"<>|]/g, "");
      canvas.toBlob(function (blob) {
        if (!blob) return toast("二维码导出失败", "err");
        Store.saveBinary(blob, "预约码-" + name + ".png")
          .then(function (r) {
            toast(r.method === "picker" ? "已保存到 " + r.suggested : "已下载二维码（可在下载目录查看）", "ok");
          })
          .catch(function () { toast("已取消保存", "err"); });
      }, "image/png");
    }
  });

  /* ---------- 我的预约 ---------- */
  function bookingRow(b) {
    var st = Store.STATUS[b.status] || { label: b.status, cls: "" };
    return '' +
    '<div class="bk">' +
      '<div class="card-emoji">' + esc(b.itemEmoji || "📌") + "</div>" +
      '<div class="bk-info">' +
        '<div class="bk-title">' + esc(b.itemName) + "</div>" +
        '<div class="bk-sub">预约码 ' + esc(b.code) + " · " + esc(b.date) + " " + esc(b.slot) + " · " + esc(b.people) + " 人 · ¥" + esc(b.amount) + "</div>" +
        '<div class="bk-sub">提交于 ' + esc(Store.fmtDateTime(b.createdAt)) + (b.note ? " · 备注：" + esc(b.note) : "") + "</div>" +
      "</div>" +
      '<div class="bk-side">' +
        '<span class="badge ' + st.cls + '">' + esc(st.label) + "</span>" +
        (b.status === "pending" ? '<button class="btn btn-ghost btn-sm" data-cancel="' + esc(b.id) + '">取消</button>' : "") +
      "</div>" +
    "</div>";
  }

  function renderMine() {
    var kw = $("#mineKey").value.trim();
    var box = $("#mineList");
    if (!kw) {
      box.innerHTML = "";
      $("#mineEmpty").hidden = false;
      $("#mineEmpty").textContent = "还没有查询记录。完成预约后，用昵称或手机号即可查回。";
      return;
    }
    var list = Store.search(kw);
    if (!list.length) {
      box.innerHTML = "";
      $("#mineEmpty").hidden = false;
      $("#mineEmpty").textContent = "没有找到与「" + kw + "」相关的预约。";
      return;
    }
    box.innerHTML = list.map(bookingRow).join("");
    $("#mineEmpty").hidden = true;
  }

  document.addEventListener("click", function (e) {
    var catBtn = e.target.closest("[data-cat]");
    if (catBtn) {
      currentCat = catBtn.dataset.cat;
      renderFilters();
      renderCards();
      return;
    }

    var bookBtn = e.target.closest("[data-book]");
    if (bookBtn) return void openBooking(bookBtn.dataset.book);

    var shareBtn = e.target.closest("[data-share]");
    if (shareBtn) return void openShare(shareBtn.dataset.share);

    var cancelBtn = e.target.closest("[data-cancel]");
    if (cancelBtn) {
      if (!confirm("确定取消这条预约吗？")) return;
      Store.setStatus(cancelBtn.dataset.cancel, "canceled");
      renderMine();
      toast("已取消", "ok");
    }
  });

  /* ---------- 搜索 / 省市区筛选 ---------- */
  function applyFilter() { syncRegions(); renderCards(); }

  fProv.addEventListener("change", function () { selProv = fProv.value; selCity = ""; selDist = ""; applyFilter(); });
  fCity.addEventListener("change", function () { selCity = fCity.value; selDist = ""; applyFilter(); });
  fDist.addEventListener("change", function () { selDist = fDist.value; applyFilter(); });

  kwInput.addEventListener("input", renderCards);
  kwInput.addEventListener("search", renderCards);
  kwInput.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });

  $("#resetFilter").addEventListener("click", function () {
    kwInput.value = "";
    currentCat = "all";
    selProv = selCity = selDist = "";
    fProv.value = fCity.value = fDist.value = "";
    renderFilters();
    syncRegions();
    renderCards();
    toast("已重置筛选", "ok");
  });

  $("#mineSearch").addEventListener("click", renderMine);
  $("#mineKey").addEventListener("keydown", function (e) {
    if (e.key === "Enter") renderMine();
  });
  $("#mineClear").addEventListener("click", function () {
    $("#mineKey").value = "";
    renderMine();
  });
  $("#mineExport").addEventListener("click", function () {
    var list = Store.all();
    if (!list.length) return void toast("还没有预约记录", "err");
    Store.exportJSON(list)
      .then(function (r) {
        toast(r.method === "picker" ? "已保存到 " + r.suggested : "已下载，请在浏览器下载目录查看（可把下载目录设为桌面）", "ok");
      })
      .catch(function () { toast("已取消保存", "err"); });
  });

  renderFilters();
  syncRegions();
  renderCards();
  renderMine();

  /* 深链：分享出去的 ?i=<id> 直接打开该商家的预约页 */
  (function applyShareLink() {
    var m = /[?&]i=([^&#]*)/.exec(location.search);
    if (!m) return;
    var id = decodeURIComponent(m[1] || "");
    if (!findItem(id)) return void toast("链接里的项目不存在或已下架", "err");
    highlightCard(id);
    openBooking(id);
  })();
})();
