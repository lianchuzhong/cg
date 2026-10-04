/* 数据层：localStorage 持久化 + 导出到本机桌面 */
(function (global) {
  "use strict";

  var LS_KEY = "cg.bookings.v1";
  var SETTINGS_KEY = "cg.settings.v1";

  var STATUS = {
    pending:   { label: "待确认", cls: "b-pending" },
    confirmed: { label: "已确认", cls: "b-confirmed" },
    canceled:  { label: "已取消", cls: "b-canceled" },
    done:      { label: "已完成", cls: "b-done" }
  };

  var TIME_SLOTS = [
    "10:00-12:00", "12:00-14:00", "14:00-16:00",
    "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-24:00"
  ];

  function readLS(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("读取本地数据失败", e);
      return fallback;
    }
  }

  function writeLS(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.warn("写入本地数据失败", e);
      return false;
    }
  }

  function all() {
    var list = readLS(LS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function save(list) {
    return writeLS(LS_KEY, list);
  }

  function settings() {
    return readLS(SETTINGS_KEY, { passcode: "" });
  }

  function saveSettings(obj) {
    return writeLS(SETTINGS_KEY, obj);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function makeCode() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var s = "";
    for (var i = 0; i < 6; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }

  function uniqueCode(list) {
    var used = {};
    list.forEach(function (b) { used[b.code] = true; });
    var c;
    do { c = makeCode(); } while (used[c]);
    return c;
  }

  /* 昵称必须全局唯一：否则别人用同名就能查到、甚至取消掉我的预约 */
  function nameTaken(name) {
    var n = String(name == null ? "" : name).trim().toLowerCase();
    if (!n) return false;
    return all().some(function (b) {
      return String(b.name || "").trim().toLowerCase() === n;
    });
  }

  /* 创建预约。contact 至少一项有值（昵称或手机号） */
  function createBooking(input) {
    var list = all();
    var name = String(input.name || "").trim();
    if (name && nameTaken(name)) {
      throw new Error("昵称「" + name + "」已被使用，请换一个昵称");
    }
    var book = {
      id: "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      code: uniqueCode(list),
      itemId: input.itemId,
      itemName: input.itemName,
      itemEmoji: input.itemEmoji,
      cat: input.cat,
      prov: input.prov || "",
      city: input.city || "",
      dist: input.dist || "",
      addr: input.addr || "",
      unitPrice: input.unitPrice,
      qty: input.qty,
      date: input.date,
      slot: input.slot,
      name: name,
      phone: input.phone || "",
      people: input.people,
      amount: input.unitPrice * input.qty,
      note: input.note || "",
      status: "pending",
      createdAt: nowISO()
    };
    list.push(book);
    if (!save(list)) {
      throw new Error("本地存储写入失败，可能是浏览器隐私模式或空间不足");
    }
    return book;
  }

  function find(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function setStatus(id, status) {
    if (!STATUS[status]) return null;
    var list = all();
    var target = null;
    list.forEach(function (b) {
      if (b.id === id) {
        b.status = status;
        b.updatedAt = nowISO();
        target = b;
      }
    });
    if (target) save(list);
    return target;
  }

  function remove(id) {
    var list = all();
    var next = list.filter(function (b) { return b.id !== id; });
    var ok = save(next);
    return ok ? next.length !== list.length : false;
  }

  function clearAll() {
    return writeLS(LS_KEY, []);
  }

  /* 用昵称或手机号查回自己的预约（模糊匹配） */
  function search(keyword) {
    var kw = String(keyword || "").trim().toLowerCase();
    if (!kw) return [];
    return all().filter(function (b) {
      return (b.name && b.name.toLowerCase().indexOf(kw) !== -1) ||
             (b.phone && b.phone.indexOf(kw) !== -1) ||
             (b.code && b.code.toLowerCase() === kw) ||
             (b.itemName && b.itemName.toLowerCase().indexOf(kw) !== -1) ||
             ([b.prov, b.city, b.dist, b.addr].join(" ").toLowerCase().indexOf(kw) !== -1);
    }).sort(function (a, b2) {
      return b2.createdAt.localeCompare(a.createdAt);
    });
  }

  function fmtDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function csvCell(v) {
    var s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toCSV(list) {
    var head = ["预约码", "项目", "分类", "省份", "城市", "区县", "地址", "日期", "时段", "份数/人数", "单价", "合计", "昵称", "手机号", "备注", "状态", "提交时间"];
    var lines = [head.map(csvCell).join(",")];
    list.forEach(function (b) {
      lines.push([
        b.code, b.itemName, b.cat, b.prov, b.city, b.dist, b.addr, b.date, b.slot, b.people,
        b.unitPrice, b.amount, b.name, b.phone, b.note,
        (STATUS[b.status] || {}).label || b.status, fmtDateTime(b.createdAt)
      ].map(csvCell).join(","));
    });
    return "\uFEFF" + lines.join("\r\n");
  }

  function toJSON(list) {
    return JSON.stringify({
      exportedAt: nowISO(),
      total: list.length,
      bookings: list
    }, null, 2);
  }

  /* 导出为文件：普通下载（浏览器下载目录，可在设置里改为桌面） */
  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return Promise.resolve({ ok: true, method: "download" });
  }

  function saveToFile(content, filename, mime) {
    var suggested = "E:\\桌面1\\" + filename;

    if (typeof window.showSaveFilePicker === "function") {
      return window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "文件", accept: { [mime || "text/plain"]: [filename.split(".").pop()] } }]
      }).then(function (handle) {
        return handle.createWritable().then(function (w) {
          return w.write(content).then(function () { return w.close(); });
        });
      }).then(function () {
        return { ok: true, method: "picker", suggested: suggested };
      });
    }

    return downloadBlob(content, filename, mime).then(function (r) {
      r.suggested = suggested;
      return r;
    });
  }

  /* ---------- 预约成功后自动存档到本机 ----------
     固定写同一个文件「吃喝玩乐预约数据.json」：
     第一次弹出保存框让用户选位置（建议桌面），之后记住这个文件，
     每次预约成功都静默覆盖写入，不用再点任何按钮。
     浏览器不允许完全无感知的写盘，所以第一次必须由这次点击授权。 */

  var AUTOSAVE_IDB = "cg-autosave";
  var AUTOSAVE_STORE = "handles";
  var AUTOSAVE_KEY = "bookings.json";
  var AUTOSAVE_NAME = "吃喝玩乐预约数据.json";
  var AUTOSAVE_PATH = "E:\\桌面1\\" + AUTOSAVE_NAME;

  function idbGet(key) {
    return new Promise(function (resolve) {
      try {
        if (!global.indexedDB) return resolve(null);
        var req = global.indexedDB.open(AUTOSAVE_IDB, 1);
        req.onupgradeneeded = function () {
          if (!req.result.objectStoreNames.contains(AUTOSAVE_STORE)) {
            req.result.createObjectStore(AUTOSAVE_STORE);
          }
        };
        req.onsuccess = function () {
          var db = req.result;
          try {
            var r = db.transaction(AUTOSAVE_STORE, "readonly").objectStore(AUTOSAVE_STORE).get(key);
            r.onsuccess = function () { db.close(); resolve(r.result || null); };
            r.onerror = function () { db.close(); resolve(null); };
          } catch (e) { db.close(); resolve(null); }
        };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function idbSet(key, val) {
    return new Promise(function (resolve) {
      try {
        if (!global.indexedDB) return resolve(false);
        var req = global.indexedDB.open(AUTOSAVE_IDB, 1);
        req.onupgradeneeded = function () {
          if (!req.result.objectStoreNames.contains(AUTOSAVE_STORE)) {
            req.result.createObjectStore(AUTOSAVE_STORE);
          }
        };
        req.onsuccess = function () {
          var db = req.result;
          try {
            var tx = db.transaction(AUTOSAVE_STORE, "readwrite");
            tx.objectStore(AUTOSAVE_STORE).put(val, key);
            tx.oncomplete = function () { db.close(); resolve(true); };
            tx.onerror = function () { db.close(); resolve(false); };
          } catch (e) { db.close(); resolve(false); }
        };
        req.onerror = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  }

  function ensurePermission(handle, mayAsk) {
    if (!handle || typeof handle.queryPermission !== "function") return Promise.resolve(!!handle);
    return handle.queryPermission({ mode: "readwrite" }).then(function (p) {
      if (p === "granted") return true;
      if (p === "prompt" && mayAsk && typeof handle.requestPermission === "function") {
        return handle.requestPermission({ mode: "readwrite" })
          .then(function (p2) { return p2 === "granted"; })
          .catch(function () { return false; });
      }
      return false;
    }).catch(function () { return false; });
  }

  function writeHandle(handle, content) {
    return handle.createWritable().then(function (w) {
      return w.write(content).then(function () { return w.close(); });
    });
  }

  function pickAndSave(content) {
    return global.showSaveFilePicker({
      suggestedName: AUTOSAVE_NAME,
      types: [{ description: "预约数据", accept: { "application/json": [".json"] } }]
    }).then(function (handle) {
      return writeHandle(handle, content)
        .then(function () { return idbSet(AUTOSAVE_KEY, handle); })
        .then(function () { return { ok: true, method: "picker", suggested: AUTOSAVE_PATH }; });
    });
  }

  /* 预约成功后调用：把当前全部预约写入本机固定文件 */
  function autoSave() {
    var content = toJSON(all());
    var done = { ok: false, suggested: AUTOSAVE_PATH };

    if (typeof global.showSaveFilePicker !== "function") {
      return downloadBlob(content, AUTOSAVE_NAME, "application/json")
        .then(function () { return { ok: true, method: "download", suggested: AUTOSAVE_PATH }; })
        .catch(function () { return done; });
    }

    return idbGet(AUTOSAVE_KEY).then(function (handle) {
      if (!handle) return pickAndSave(content);
      return ensurePermission(handle, true).then(function (ok) {
        if (!ok) return pickAndSave(content);
        return writeHandle(handle, content)
          .then(function () { return { ok: true, method: "auto", suggested: AUTOSAVE_PATH }; });
      });
    }).catch(function (err) {
      /* 用户主动取消保存不算错误，预约本身已在浏览器本地 */
      if (err && err.name === "AbortError") {
        return { ok: false, cancelled: true, suggested: AUTOSAVE_PATH };
      }
      return downloadBlob(content, AUTOSAVE_NAME, "application/json")
        .then(function () { return { ok: true, method: "download", suggested: AUTOSAVE_PATH }; })
        .catch(function () { return done; });
    });
  }

  function autoSaveInfo() {
    return { name: AUTOSAVE_NAME, path: AUTOSAVE_PATH };
  }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  function exportJSON(list) {
    return saveToFile(toJSON(list), "吃喝玩乐预约数据-" + stamp() + ".json", "application/json");
  }

  function exportCSV(list) {
    return saveToFile(toCSV(list), "吃喝玩乐预约数据-" + stamp() + ".csv", "text/csv");
  }

  /* 合并外部导入的 JSON（按 id 去重） */
  function importJSON(text) {
    var parsed = JSON.parse(text);
    var incoming = Array.isArray(parsed) ? parsed : parsed.bookings;
    if (!Array.isArray(incoming)) throw new Error("文件格式不正确");

    var existing = all();
    var ids = {}, names = {};
    existing.forEach(function (b) {
      ids[b.id] = true;
      if (b.name) names[String(b.name).trim().toLowerCase()] = true;
    });
    var added = 0;
    incoming.forEach(function (b) {
      if (!b || !b.id || ids[b.id]) return;
      var bn = String(b.name || "").trim().toLowerCase();
      if (bn && names[bn]) return;
      existing.push(b);
      ids[b.id] = true;
      if (bn) names[bn] = true;
      added++;
    });
    save(existing);
    return added;
  }

  global.Store = {
    STATUS: STATUS,
    TIME_SLOTS: TIME_SLOTS,
    all: all,
    save: save,
    settings: settings,
    saveSettings: saveSettings,
    createBooking: createBooking,
    nameTaken: nameTaken,
    find: find,
    setStatus: setStatus,
    remove: remove,
    clearAll: clearAll,
    search: search,
    fmtDateTime: fmtDateTime,
    today: today,
    toCSV: toCSV,
    toJSON: toJSON,
    exportJSON: exportJSON,
    exportCSV: exportCSV,
    importJSON: importJSON,
    autoSave: autoSave,
    autoSaveInfo: autoSaveInfo
  };
})(window);
