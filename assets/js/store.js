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

  /* 创建预约。contact 至少一项有值（昵称或手机号） */
  function createBooking(input) {
    var list = all();
    var book = {
      id: "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      code: uniqueCode(list),
      itemId: input.itemId,
      itemName: input.itemName,
      itemEmoji: input.itemEmoji,
      cat: input.cat,
      unitPrice: input.unitPrice,
      qty: input.qty,
      date: input.date,
      slot: input.slot,
      name: input.name || "",
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
             (b.code && b.code.toLowerCase() === kw);
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
    var head = ["预约码", "项目", "分类", "日期", "时段", "份数/人数", "单价", "合计", "昵称", "手机号", "备注", "状态", "提交时间"];
    var lines = [head.map(csvCell).join(",")];
    list.forEach(function (b) {
      lines.push([
        b.code, b.itemName, b.cat, b.date, b.slot, b.people,
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

  /* 导出为文件：优先用 File System Access API 让用户直接存到桌面，
     不支持时退回普通下载（浏览器默认下载目录，可在下载设置改为桌面）。 */
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

    var blob = new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return Promise.resolve({ ok: true, method: "download", suggested: suggested });
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
    var ids = {};
    existing.forEach(function (b) { ids[b.id] = true; });
    var added = 0;
    incoming.forEach(function (b) {
      if (b && b.id && !ids[b.id]) {
        existing.push(b);
        ids[b.id] = true;
        added++;
      }
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
    importJSON: importJSON
  };
})(window);
