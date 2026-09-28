/* 二维码生成（ISO/IEC 18004）：字节模式 + 纠错等级 M，版本 1-10，无任何外部依赖。
   商家分享链接约 40-70 字节，版本 10（纠错 M）最多可放 213 字节，容量足够。 */
(function (global) {
  "use strict";

  var EC_FORMAT_BITS = 0; /* 格式信息里的纠错等级位：M = 00 */
  var MAX_VERSION = 10;

  /* 纠错等级 M 下版本 1-10 的分块结构：data = 每个数据块的码字数，ec = 每块纠错码字数 */
  var BLOCKS = [
    null,
    { ec: 10, data: [16] },
    { ec: 16, data: [28] },
    { ec: 26, data: [44] },
    { ec: 18, data: [32, 32] },
    { ec: 24, data: [43, 43] },
    { ec: 16, data: [27, 27, 27, 27] },
    { ec: 18, data: [31, 31, 31, 31] },
    { ec: 22, data: [38, 38, 39, 39] },
    { ec: 22, data: [36, 36, 36, 37, 37] },
    { ec: 26, data: [43, 43, 43, 43, 44] }
  ];

  /* 各版本校正图形（对准图形）的中心坐标 */
  var ALIGN = [
    null,
    [], [6, 18], [6, 22], [6, 26], [6, 30],
    [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ];

  /* ---------- GF(256) 伽罗华域运算，生成多项式用 0x11D ---------- */
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function mul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  /* 纠错码生成多项式 g(x) = (x-a^0)(x-a^1)...(x-a^(n-1)) */
  function genPoly(n) {
    var g = [1], i, j;
    for (i = 0; i < n; i++) {
      var next = new Array(g.length + 1);
      for (j = 0; j < next.length; j++) next[j] = 0;
      for (j = 0; j < g.length; j++) {
        next[j] ^= g[j];
        next[j + 1] ^= mul(g[j], EXP[i]);
      }
      g = next;
    }
    return g;
  }

  /* 里德-所罗门纠错码：对数据码字做多项式取余 */
  function ecCodewords(data, n) {
    var g = genPoly(n);
    var buf = new Uint8Array(data.length + n);
    var i, j;
    for (i = 0; i < data.length; i++) buf[i] = data[i];
    for (i = 0; i < data.length; i++) {
      var f = buf[i];
      if (!f) continue;
      for (j = 0; j < g.length; j++) buf[i + j] ^= mul(g[j], f);
    }
    return buf.subarray(data.length);
  }

  /* ---------- UTF-8 编码 ---------- */
  function utf8(str) {
    var out = [], i, c, c2, cp;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length &&
                 (c2 = str.charCodeAt(i + 1)) >= 0xdc00 && c2 <= 0xdfff) {
        cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        i++;
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return out;
  }

  function dataCount(v) {
    return BLOCKS[v].data.reduce(function (a, b) { return a + b; }, 0);
  }

  function countBits(v) { return v < 10 ? 8 : 16; }

  function capacityOf(v) {
    return Math.floor((dataCount(v) * 8 - 4 - countBits(v)) / 8);
  }

  function pickVersion(len) {
    for (var v = 1; v <= MAX_VERSION; v++) {
      if (len <= capacityOf(v)) return v;
    }
    throw new Error("内容过长（" + len + " 字节），二维码最多容纳 " + capacityOf(MAX_VERSION) + " 字节");
  }

  /* ---------- 数据码字：模式 + 长度 + 内容 + 结束符 + 填充 ---------- */
  function toCodewords(bytes, v) {
    var total = dataCount(v);
    var bits = [];
    var i, j;
    function put(val, len) {
      for (var k = len - 1; k >= 0; k--) bits.push((val >>> k) & 1);
    }

    put(4, 4);
    put(bytes.length, countBits(v));
    for (i = 0; i < bytes.length; i++) put(bytes[i], 8);

    for (i = 0; i < 4 && bits.length < total * 8; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);

    var cw = new Uint8Array(total);
    for (i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw[i >> 3] = b;
    }
    var pad = [0xec, 0x11], p = 0;
    for (i = bits.length >> 3; i < total; i++) cw[i] = pad[p++ % 2];
    return cw;
  }

  /* 交织：数据码字逐块交错在前，纠错码字逐块交错在后 */
  function interleave(cw, v) {
    var cfg = BLOCKS[v], out = [], blocks = [], ecs = [];
    var i, j, off = 0;
    for (i = 0; i < cfg.data.length; i++) {
      blocks.push(Array.prototype.slice.call(cw, off, off + cfg.data[i]));
      off += cfg.data[i];
    }
    for (i = 0; i < blocks.length; i++) ecs.push(Array.prototype.slice.call(ecCodewords(blocks[i], cfg.ec)));

    var max = cfg.data[0];
    for (i = 1; i < cfg.data.length; i++) if (cfg.data[i] > max) max = cfg.data[i];

    for (i = 0; i < max; i++)
      for (j = 0; j < blocks.length; j++)
        if (i < blocks[j].length) out.push(blocks[j][i]);
    for (i = 0; i < cfg.ec; i++)
      for (j = 0; j < ecs.length; j++) out.push(ecs[j][i]);
    return out;
  }

  /* ---------- 功能图形 ---------- */
  function reserveFinder(fn, size, r0, c0) {
    for (var i = -1; i <= 7; i++)
      for (var j = -1; j <= 7; j++) {
        var r = r0 + i, c = c0 + j;
        if (r >= 0 && r < size && c >= 0 && c < size) fn[r][c] = true;
      }
  }

  function drawFinder(m, r0, c0) {
    for (var i = 0; i < 7; i++)
      for (var j = 0; j < 7; j++) {
        var edge = i === 0 || i === 6 || j === 0 || j === 6;
        var core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[r0 + i][c0 + j] = edge || core ? 1 : 0;
      }
  }

  function drawTiming(m, fn, size) {
    for (var i = 0; i < size; i++) {
      if (!fn[6][i]) { m[6][i] = i % 2 === 0 ? 1 : 0; fn[6][i] = true; }
      if (!fn[i][6]) { m[i][6] = i % 2 === 0 ? 1 : 0; fn[i][6] = true; }
    }
  }

  function drawAlign(m, fn, size, v) {
    var pos = ALIGN[v];
    for (var a = 0; a < pos.length; a++)
      for (var b = 0; b < pos.length; b++) {
        var r = pos[a], c = pos[b];
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        for (var i = -2; i <= 2; i++)
          for (var j = -2; j <= 2; j++) {
            m[r + i][c + j] = Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0) ? 1 : 0;
            fn[r + i][c + j] = true;
          }
      }
  }

  function reserveFormat(fn, size) {
    var i;
    for (i = 0; i <= 5; i++) { fn[i][8] = true; fn[8][i] = true; }
    fn[7][8] = true;
    fn[8][7] = true;
    fn[8][8] = true;
    for (i = 0; i < 8; i++) fn[8][size - 8 + i] = true;
    for (i = 0; i < 7; i++) fn[size - 1 - i][8] = true;
    fn[size - 8][8] = true;
  }

  /* 版本信息（版本 7 起），BCH(18,6) */
  function drawVersion(m, fn, size, v) {
    if (v < 7) return;
    var rem = v, i;
    for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
    var bits = (v << 12) | rem;
    for (i = 0; i < 18; i++) {
      var b = (bits >>> i) & 1;
      var a = size - 11 + i % 3, q = Math.floor(i / 3);
      m[q][a] = b; fn[q][a] = true;
      m[a][q] = b; fn[a][q] = true;
    }
  }

  /* ---------- 数据码字填入矩阵（之字形，跳过第 6 列定时图形） ---------- */
  function placeData(m, fn, size, cw) {
    var limit = cw.length * 8, idx = 0, upward = true;
    for (var right = size - 1; right > 0; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        var r = upward ? size - 1 - vert : vert;
        for (var k = 0; k < 2; k++) {
          var c = right - k;
          if (fn[r][c]) continue;
          if (idx < limit) {
            m[r][c] = (cw[idx >> 3] >>> (7 - (idx & 7))) & 1;
            idx++;
          }
        }
      }
      upward = !upward;
    }
  }

  /* ---------- 掩码与惩罚分 ---------- */
  function maskHit(mask, r, c) {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return (r * c) % 2 + (r * c) % 3 === 0;
      case 6: return ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      default: return ((r + c) % 2 + (r * c) % 3) % 2 === 0;
    }
  }

  var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  var P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];

  function matchAt(get, a, b, len, pat) {
    for (var i = 0; i < len; i++) if (get(a + i, b) !== pat[i]) return false;
    return true;
  }

  function penalty(m, size) {
    var score = 0, r, c, i, run;

    for (r = 0; r < size; r++) {
      run = 1;
      for (c = 1; c < size; c++) {
        if (m[r][c] === m[r][c - 1]) run++;
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    for (c = 0; c < size; c++) {
      run = 1;
      for (r = 1; r < size; r++) {
        if (m[r][c] === m[r - 1][c]) run++;
        else { if (run >= 5) score += 3 + (run - 5); run = 1; }
      }
      if (run >= 5) score += 3 + (run - 5);
    }

    for (r = 0; r < size - 1; r++)
      for (c = 0; c < size - 1; c++) {
        var v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }

    var rowGet = function (a, b) { return m[a][b]; };
    var colGet = function (a, b) { return m[b][a]; };
    for (r = 0; r + 11 <= size; r++)
      for (c = 0; c + 11 <= size; c++) {
        if (matchAt(rowGet, r, c, 11, P1)) score += 40;
        if (matchAt(rowGet, r, c, 11, P2)) score += 40;
      }
    for (c = 0; c < size; c++)
      for (r = 0; r + 11 <= size; r++) {
        if (matchAt(colGet, r, c, 11, P1)) score += 40;
        if (matchAt(colGet, r, c, 11, P2)) score += 40;
      }

    var dark = 0;
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) dark += m[r][c];
    score += Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5) * 10;
    return score;
  }

  function applyMask(m, fn, size, mask) {
    for (var r = 0; r < size; r++)
      for (var c = 0; c < size; c++)
        if (!fn[r][c] && maskHit(mask, r, c)) m[r][c] ^= 1;
  }

  /* ---------- 格式信息：BCH(15,5) + 掩码 0x5412 ---------- */
  function drawFormat(m, size, mask) {
    var data = (EC_FORMAT_BITS << 3) | mask;
    var rem = data, i;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;

    for (i = 0; i <= 5; i++) m[i][8] = (bits >>> i) & 1;
    m[7][8] = (bits >>> 6) & 1;
    m[8][8] = (bits >>> 7) & 1;
    m[8][7] = (bits >>> 8) & 1;
    for (i = 9; i < 15; i++) m[8][14 - i] = (bits >>> i) & 1;

    /* 第二份：位序与第一份相反，从最高位 (14) 往下填 */
    for (i = 0; i < 7; i++) m[size - 1 - i][8] = (bits >>> (14 - i)) & 1;
    for (i = 7; i < 15; i++) m[8][size - 15 + i] = (bits >>> (14 - i)) & 1;

    m[size - 8][8] = 1;
  }

  /* ---------- 对外：生成矩阵 ---------- */
  function encode(text) {
    var bytes = utf8(String(text == null ? "" : text));
    var v = pickVersion(bytes.length);
    var size = 17 + 4 * v;
    var m = [], fn = [], i, r, c;

    for (r = 0; r < size; r++) {
      m.push(new Array(size));
      fn.push(new Array(size));
      for (c = 0; c < size; c++) { m[r][c] = 0; fn[r][c] = false; }
    }

    reserveFinder(fn, size, 0, 0);
    reserveFinder(fn, size, 0, size - 7);
    reserveFinder(fn, size, size - 7, 0);
    drawTiming(m, fn, size);
    drawFinder(m, 0, 0);
    drawFinder(m, 0, size - 7);
    drawFinder(m, size - 7, 0);
    drawAlign(m, fn, size, v);
    reserveFormat(fn, size);
    drawVersion(m, fn, size, v);

    placeData(m, fn, size, interleave(toCodewords(bytes, v), v));

    var best = 0, bestScore = Infinity;
    for (i = 0; i < 8; i++) {
      applyMask(m, fn, size, i);
      drawFormat(m, size, i);
      var s = penalty(m, size);
      if (s < bestScore) { bestScore = s; best = i; }
      applyMask(m, fn, size, i);
    }
    applyMask(m, fn, size, best);
    drawFormat(m, size, best);

    return {
      version: v,
      size: size,
      get: function (row, col) { return !!m[row][col]; }
    };
  }

  /* ---------- 绘制到 canvas ---------- */
  function draw(canvas, text, opts) {
    opts = opts || {};
    var qr = encode(text);
    var scale = opts.scale || 6;
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var dim = (qr.size + quiet * 2) * scale;
    var ctx = canvas.getContext("2d");
    canvas.width = dim;
    canvas.height = dim;
    ctx.fillStyle = opts.bg || "#ffffff";
    ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = opts.fg || "#000000";
    for (var r = 0; r < qr.size; r++)
      for (var c = 0; c < qr.size; c++)
        if (qr.get(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    return { version: qr.version, size: qr.size, pixels: dim };
  }

  global.QR = {
    encode: encode,
    draw: draw,
    maxBytes: function () { return capacityOf(MAX_VERSION); },
    capacity: capacityOf
  };
})(typeof window !== "undefined" ? window : this);
