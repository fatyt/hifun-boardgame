/* ============ 嗨翻桌遊 網站程式 ============ */

const CONFIG = {
  // Google 試算表「發佈到網路」後取得的 CSV 網址。留空則使用 data/games.js 的範例資料。
  // 例：https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBqYenotANJNHBXATNufhAwkKqZf9bv0kspFafAaTOYR7Leof1ic_ct7Fe-THkiS2Tf-a-PpjR3Eq6/pub?gid=1545608570&single=true&output=csv",
  // 「活動」工作表發佈成 CSV 的網址。留空則使用 data/events.js 的範例資料。
  EVENTS_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBqYenotANJNHBXATNufhAwkKqZf9bv0kspFafAaTOYR7Leof1ic_ct7Fe-THkiS2Tf-a-PpjR3Eq6/pub?gid=1700000001&single=true&output=csv",
  // LINE 官方帳號 ID（含 @）。設定後所有「LINE 預約／詢問」按鈕會自動帶入訊息。
  LINE_ID: "@hi_fun",
};

const WEIGHT = { 1: "輕度", 2: "中度", 3: "重度" };
const COLORS = ["#34506b", "#b8463a", "#6f7f52", "#b98a2e", "#4f7f7b", "#7a5566", "#3c3833", "#8a6440", "#5d6a8a"];

const state = { tab: "all", q: "", players: 0, time: "", weight: 0, tag: "", sort: "rec", page: 1 };
let games = [];

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "NT$ " + Number(n).toLocaleString("zh-TW");

function colorOf(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

function lineUrl(msg) {
  const id = CONFIG.LINE_ID;
  if (!msg) return `https://line.me/R/ti/p/${encodeURIComponent(id)}`;
  return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(msg)}`;
}

/* ---------- 資料載入 ---------- */

// Google 雲端硬碟的分享連結轉成可直接顯示的圖片網址（檔案需設為「知道連結的人皆可檢視」）
function imageUrl(u) {
  const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : u;
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", q = false;
  text = text.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function fromSheet(rows) {
  const [head, ...body] = rows;
  const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
  const yes = (v) => /^(y|yes|v|是|有|1|true|○|o|✓|✔)$/i.test(v);
  // 「NT$1,280」「1,280 元」「30 分」都只取數字
  const num = (v) => parseFloat(String(v).replace(/[^\d.]/g, "")) || 0;
  // 試算表把 11/28 自動轉成 2026/11/28、2026-11-28 時，改回 11/28
  const shortDate = (v) => {
    const m = v.match(/^\d{4}[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
    return m ? `${+m[1]}/${+m[2]}` : v;
  };
  const rentState = (v) => (/已?租出|出租中|借出/.test(v) ? "已租出" : /可租|可借|^y$/i.test(v) ? "可租" : "");
  return body
    .map((r) => {
      const g = (k) => (col[k] == null ? "" : (r[col[k]] ?? "").trim());
      // 人數、時間、難度留空＝資料待補，存 0，畫面顯示「資料整理中」，篩選時排除
      const min = num(g("最少人數"));
      const w = num(g("難度"));
      return {
        name: g("名稱"), en: g("英文名"),
        min, max: num(g("最多人數")) || min,
        time: num(g("時間")), age: num(g("年齡")), weight: w ? Math.min(3, Math.max(1, w)) : 0,
        tags: g("類型").split(/[、,，/\s]+/).map((s) => s.trim()).filter(Boolean),
        play: yes(g("店內可玩")),
        rent: rentState(g("租借")), due: shortDate(g("歸還日")), rentFee: num(g("租金")),
        price: num(g("售價")), stock: g("庫存") === "" ? null : num(g("庫存")),
        isNew: yes(g("新品")), hot: yes(g("熱門")),
        pick: g("推薦語"), video: g("影片"),
        images: g("圖片").split(/[\s、，,|]+/).filter(Boolean).map(imageUrl),
      };
    })
    .filter((x) => x.name);
}

async function loadGames() {
  if (CONFIG.SHEET_CSV_URL) {
    try {
      const res = await fetch(CONFIG.SHEET_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const list = fromSheet(parseCSV(await res.text()));
      if (list.length) {
        const t = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
        return { list, source: `Google 試算表（${t} 更新）` };
      }
    } catch (e) {
      console.warn("讀取 Google 試算表失敗，改用範例資料", e);
    }
  }
  return { list: window.GAMES || [], source: "範例資料（data/games.js）" };
}

/* ---------- 狀態判斷 ---------- */

const canRent = (g) => g.rent === "可租";
const isRental = (g) => g.rent === "可租" || g.rent === "已租出";
const onSale = (g) => g.price > 0;

function pillsOf(g) {
  const p = [];
  if (g.play) p.push(`<span class="pill play">店內可玩</span>`);
  if (canRent(g)) p.push(`<span class="pill rent">可租借</span>`);
  else if (g.rent === "已租出") p.push(`<span class="pill out">租出中${g.due ? `・${esc(g.due)} 還` : ""}</span>`);
  if (onSale(g)) p.push(`<span class="pill sale">${money(g.price)}${g.stock === 0 ? "・可預訂" : ""}</span>`);
  return p.join("");
}

function playersText(g) {
  if (!g.min) return "";
  return g.min === g.max ? `${g.min} 人` : `${g.min}–${g.max} 人`;
}

// 卡片上的「2–4 人・30 分・輕度」，缺的項目略過，全缺就顯示「資料整理中」
function metaText(g) {
  const parts = [playersText(g), g.time ? `${g.time} 分` : "", WEIGHT[g.weight] || ""].filter(Boolean);
  return parts.length ? parts.join("・") : "資料整理中";
}

function coverHTML(g, opts = {}) {
  const badge = g.isNew ? `<i class="badge">新品</i>` : g.hot && !opts.noHot ? `<i class="badge hot">人氣</i>` : "";
  const imgs = g.images || [];
  if (opts.photo && imgs.length) {
    return `<div class="cover photo" style="--c:${colorOf(g.name)}">
      <img src="${esc(imgs[0])}" alt="" loading="lazy">${badge}
      ${imgs.length > 1 ? `<span class="img-count" aria-label="共 ${imgs.length} 張圖片">${imgs.length} 張</span>` : ""}
    </div>`;
  }
  return `<div class="cover" style="--c:${colorOf(g.name)}">
    <span class="frame"></span>${badge}
    <span class="v">${esc(g.name)}</span>
    <span class="en">${esc(g.en)}</span>
  </div>`;
}

/* ---------- 目錄 ---------- */

function matches(g) {
  if (state.tab === "play" && !g.play) return false;
  if (state.tab === "rent" && !isRental(g)) return false;
  if (state.tab === "sale" && !onSale(g)) return false;
  if (state.players) {
    if (state.players >= 6 ? g.max < 6 : g.min > state.players || g.max < state.players) return false;
  }
  if (state.time && !g.time) return false;
  if (state.time === "short" && g.time > 30) return false;
  if (state.time === "mid" && (g.time <= 30 || g.time > 75)) return false;
  if (state.time === "long" && g.time <= 60) return false;
  if (state.weight && g.weight !== state.weight) return false;
  if (state.tag && !g.tags.includes(state.tag)) return false;
  if (state.q) {
    const q = state.q.toLowerCase();
    const hay = `${g.name} ${g.en} ${g.tags.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function sorter(a, b) {
  // 租借分頁：可租的排前面
  if (state.tab === "rent" && canRent(a) !== canRent(b)) return canRent(a) ? -1 : 1;
  switch (state.sort) {
    // 資料待補（0）排在最後
    case "time": return (a.time || 1e9) - (b.time || 1e9);
    case "weight": return (a.weight || 9) - (b.weight || 9) || (a.time || 1e9) - (b.time || 1e9);
    case "price": return (a.price || 1e9) - (b.price || 1e9);
    default: {
      const score = (g) => (g.hot ? 2 : 0) + (g.isNew ? 1 : 0);
      return score(b) - score(a);
    }
  }
}

const PAGE_SIZE = 24; // 可被 2、3、4、6 整除，各種螢幕寬度最後一列都排得滿

function render() {
  const list = games.filter(matches).sort(sorter);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  state.page = Math.min(Math.max(1, state.page), pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const shown = list.slice(start, start + PAGE_SIZE);

  $("#count").textContent = list.length;
  $("#empty").hidden = list.length > 0;
  renderPager(list.length, pages, start, shown.length);
  $("#grid").innerHTML = shown
    .map((g) => `<button class="card" data-i="${games.indexOf(g)}" aria-label="${esc(g.name)}，查看詳細">
        ${coverHTML(g, { photo: true })}
        <div class="card-body">
          <h3>${esc(g.name)}</h3>
          <p class="meta">${metaText(g)}</p>
          <div class="pills">${pillsOf(g)}</div>
        </div>
      </button>`)
    .join("");
}

// 頁碼：1 … 4 5 6 … 13（頭尾固定，目前頁前後各一頁）
function pageNumbers(cur, total) {
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= total));
  const nums = [...set].sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push(n - nums[i - 1] === 2 ? n - 1 : "…");
    out.push(n);
  });
  return out;
}

function renderPager(total, pages, start, count) {
  const el = $("#pager");
  if (pages <= 1) { el.hidden = true; el.innerHTML = ""; return; }
  el.hidden = false;
  const p = state.page;
  const btn = (n, label, extra = "") =>
    `<button type="button" data-page="${n}" ${extra}>${label}</button>`;
  el.innerHTML = `
    <p class="pager-info">第 ${start + 1}–${start + count} 款・共 ${total} 款</p>
    <div class="pager-nav">
      ${btn(p - 1, "‹<span class=\"pager-word\"> 上一頁</span>", `class="pager-step" aria-label="上一頁"${p === 1 ? " disabled" : ""}`)}
      ${pageNumbers(p, pages).map((n) => n === "…"
        ? `<span class="pager-gap" aria-hidden="true">…</span>`
        : btn(n, n, `class="pager-num" aria-label="第 ${n} 頁"${n === p ? ' aria-current="page"' : ""}`)).join("")}
      ${btn(p + 1, "<span class=\"pager-word\">下一頁 </span>›", `class="pager-step" aria-label="下一頁"${p === pages ? " disabled" : ""}`)}
    </div>`;
}

function goPage(n) {
  state.page = n;
  render();
  const top = $(".result-bar").getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: "smooth" });
}

function renderCounts() {
  const n = {
    all: games.length,
    play: games.filter((g) => g.play).length,
    rent: games.filter(isRental).length,
    sale: games.filter(onSale).length,
  };
  $$("#cat-tabs button").forEach((b) => {
    const label = b.textContent.replace(/\s*\d+$/, "");
    b.innerHTML = `${label}<span class="n">${n[b.dataset.tab]}</span>`;
  });
  $("#stat-all").textContent = n.all;
  $("#stat-play").textContent = n.play;
  $("#stat-rent").textContent = games.filter(canRent).length;
}

function buildTagChips() {
  const tags = [...new Set(games.flatMap((g) => g.tags))];
  const order = ["派對", "策略", "家庭", "合作", "推理", "卡牌", "親子", "雙人"];
  tags.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  $("#tag-chips").insertAdjacentHTML("beforeend", tags.map((t) => `<button data-v="${esc(t)}">${esc(t)}</button>`).join(""));
}

/* ---------- 詳細頁 ---------- */

function openDetail(g) {
  const playRow = g.play
    ? `<span class="s"><i class="dot ok"></i>可以玩</span><a class="btn btn-ghost" data-line data-msg="我想預約店內遊玩，想玩《${esc(g.name)}》，日期：　人數：" href="#">預約座位</a>`
    : `<span class="s"><i class="dot no"></i>暫不開放</span><span></span>`;

  let rentRow;
  if (canRent(g)) rentRow = `<span class="s"><i class="dot ok"></i>可租借<small>${g.rentFee ? `${money(g.rentFee)} / 3 天` : ""}</small></span><a class="btn btn-ink" data-line data-msg="我想預約租借《${esc(g.name)}》，取件日期：" href="#">預約租借</a>`;
  else if (g.rent === "已租出") rentRow = `<span class="s"><i class="dot wait"></i>租出中<small>${g.due ? `預計 ${esc(g.due)} 歸還` : ""}</small></span><a class="btn btn-ghost" data-line data-msg="《${esc(g.name)}》歸還後想登記租借" href="#">登記候補</a>`;
  else rentRow = `<span class="s"><i class="dot no"></i>不提供租借</span><span></span>`;

  let saleRow;
  if (onSale(g)) {
    const stock = g.stock === 0 ? "目前缺貨・可預訂" : g.stock ? `現貨 ${g.stock} 盒` : "";
    const inCart = cartQty(g.name);
    saleRow = `<span class="s"><i class="dot ${g.stock === 0 ? "wait" : "ok"}"></i>${money(g.price)}<small>${stock}</small></span><button type="button" class="btn btn-shu" data-add="${esc(g.name)}">${inCart ? `已加入 ${inCart} 盒・再加一盒` : g.stock === 0 ? "加入清單・預訂" : "加入購物清單"}</button>`;
  } else saleRow = `<span class="s"><i class="dot no"></i>未販售</span><span></span>`;

  $("#detail-body").innerHTML = `<div class="d-grid">
    ${carouselHTML(g)}
    <div>
      <h2 class="d-title" id="d-title">${esc(g.name)}</h2>
      <p class="d-en">${esc(g.en)}</p>
      <dl class="d-specs">
        <div><dt>人數</dt><dd>${playersText(g) || "–"}</dd></div>
        <div><dt>時間</dt><dd>${g.time ? g.time + " 分" : "–"}</dd></div>
        <div><dt>年齡</dt><dd>${g.age ? g.age + "+" : "–"}</dd></div>
        <div><dt>難度</dt><dd>${WEIGHT[g.weight] || "–"}</dd></div>
      </dl>
      <div class="d-tags">${g.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      ${g.pick ? `<p class="d-pick">${esc(g.pick)}</p>` : ""}
      <div class="d-status">
        <div class="d-row"><span class="k">店內遊玩</span>${playRow}</div>
        <div class="d-row"><span class="k">租借</span>${rentRow}</div>
        <div class="d-row"><span class="k">販售</span>${saleRow}</div>
      </div>
      ${g.video ? `<a class="d-video" href="${esc(g.video)}" target="_blank" rel="noopener">▶ 觀看規則教學影片</a>` : ""}
    </div>
  </div>`;
  wireLineLinks($("#detail-body"));
  $("#detail").showModal();
  initCarousel($("#detail-body .carousel"));
}

/* ---------- 圖片輪播 ---------- */

function carouselHTML(g) {
  const imgs = g.images || [];
  if (!imgs.length) return `<div class="carousel single">${coverHTML(g, { noHot: true })}</div>`;
  const n = imgs.length;
  return `<div class="carousel" role="region" aria-roledescription="輪播" aria-label="${esc(g.name)} 圖片">
    <div class="track" tabindex="0">
      ${imgs.map((src, i) => `<figure class="slide" aria-roledescription="圖片" aria-label="第 ${i + 1} 張，共 ${n} 張">
        <img src="${esc(src)}" alt="${esc(g.name)} 圖片 ${i + 1}" ${i ? 'loading="lazy"' : ""}>
      </figure>`).join("")}
    </div>
    ${n > 1 ? `
      <button class="cz-btn prev" type="button" aria-label="上一張">‹</button>
      <button class="cz-btn next" type="button" aria-label="下一張">›</button>
      <div class="cz-foot">
        <div class="dots">${imgs.map((_, i) => `<button type="button" class="dot-btn" aria-label="第 ${i + 1} 張"${i ? "" : ' aria-current="true"'}></button>`).join("")}</div>
        <span class="cz-count"><b>1</b> / ${n}</span>
      </div>` : ""}
  </div>`;
}

function initCarousel(root) {
  if (!root || root.classList.contains("single")) return;
  const track = $(".track", root);
  const slides = $$(".slide", track);
  const n = slides.length;

  // 圖片載入失敗時顯示提示
  slides.forEach((s) => $("img", s).addEventListener("error", () => s.classList.add("broken"), { once: true }));
  if (n < 2) return;

  const dots = $$(".dot-btn", root);
  const countEl = $(".cz-count b", root);
  let idx = 0;
  let lockUntil = 0; // 按鈕切換的動畫期間，不讓捲動事件改寫目前張數

  const show = (i) => {
    idx = i;
    dots.forEach((d, j) => (j === i ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
    countEl.textContent = i + 1;
  };
  const go = (i) => {
    i = (i + n) % n;
    show(i);
    lockUntil = Date.now() + 700;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  };

  $(".prev", root).addEventListener("click", () => go(idx - 1));
  $(".next", root).addEventListener("click", () => go(idx + 1));
  dots.forEach((d, i) => d.addEventListener("click", () => go(i)));

  // 手機左右滑動時同步指示器
  let raf;
  track.addEventListener("scroll", () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (Date.now() < lockUntil) return;
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== idx) show(i);
    });
  }, { passive: true });

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
  });
}

/* ---------- 今天玩什麼 ---------- */

let pickN = 4;
let lastPick = [];

function pick(shuffle = false) {
  const limit = +$('input[name="ptime"]:checked').value;
  const mood = $('input[name="pmood"]:checked').value;
  const beginner = $('input[name="plevel"]:checked').value === "new";

  const scored = games
    .filter((g) => g.play && g.min <= pickN && g.max >= pickN)
    .map((g) => {
      let s = 0;
      const why = [`適合 ${pickN} 人`];
      if (g.time <= limit) { s += 3; why.push(`約 ${g.time} 分鐘`); }
      else if (g.time <= limit * 1.3) s += 1;
      else s -= 6;
      if (mood) {
        if (g.tags.includes(mood)) { s += 4; why.push(mood); }
        else s -= 2;
      }
      if (beginner) {
        if (g.weight === 1) { s += 3; why.push("新手友善"); }
        if (g.weight === 3) s -= 5;
      } else if (g.weight >= 2) { s += 2; why.push(`${WEIGHT[g.weight]}策略`); }
      if (g.hot) { s += 1; why.push("店內人氣"); }
      // 人數落在甜蜜點（不是極端值）加分
      if (pickN > g.min && pickN < g.max) s += 1;
      if (shuffle) s += Math.random() * 3;
      return { g, s, why };
    })
    .sort((a, b) => b.s - a.s);

  let top = scored.slice(0, 3);
  if (shuffle) {
    const prev = new Set(lastPick);
    const fresh = scored.filter((x) => !prev.has(x.g)).slice(0, 3);
    if (fresh.length === 3) top = fresh;
  }
  lastPick = top.map((x) => x.g);

  const box = $("#pick-result");
  if (!top.length) {
    box.innerHTML = `<p class="empty">目前店內沒有剛好適合 ${pickN} 人的桌遊，<a data-line href="#">用 LINE 問問店長</a>吧！</p>`;
    wireLineLinks(box);
    return;
  }
  const ranks = ["第一推薦", "第二推薦", "第三推薦"];
  box.innerHTML = `<h3>為你挑選<button class="link-btn" id="reshuffle" type="button">換一批 ↻</button></h3>
    <div class="pick-list">
      ${top.map((x, i) => `<button class="pick-item" data-i="${games.indexOf(x.g)}">
        ${coverHTML(x.g, { noHot: true, photo: true })}
        <div>
          <span class="rank">${ranks[i]}</span>
          <h4>${esc(x.g.name)}</h4>
          <div class="why">${x.why.slice(0, 4).map((w) => `<span>${esc(w)}</span>`).join("")}</div>
          ${x.g.pick ? `<p>${esc(x.g.pick)}</p>` : ""}
        </div>
      </button>`).join("")}
    </div>`;
  $("#reshuffle").addEventListener("click", () => pick(true));
}

/* ---------- 活動・揪團 ---------- */

let events = [];
let evType = "";
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

// 接受 2026/12/6、2026-12-06、12/6（沒寫年份時取最近的未來日期）
function parseDate(s, time) {
  let m = String(s).match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
  let y, mo, d;
  if (m) [, y, mo, d] = m.map(Number);
  else {
    m = String(s).match(/(\d{1,2})[\/\-.月](\d{1,2})/);
    if (!m) return null;
    [, mo, d] = m.map(Number);
    const now = new Date();
    y = now.getFullYear();
    if (new Date(y, mo - 1, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60)) y++;
  }
  const [hh, mm] = (String(time || "").match(/(\d{1,2}):(\d{2})/) || [, 23, 59]).slice(1).map(Number);
  return new Date(y, mo - 1, d, hh, mm);
}

function fromEventSheet(rows) {
  const [head, ...body] = rows;
  const col = Object.fromEntries(head.map((h, i) => [h.trim(), i]));
  const num = (v) => parseFloat(String(v).replace(/[^\d.]/g, "")) || 0;
  return body
    .map((r) => {
      const g = (k) => (col[k] == null ? "" : (r[col[k]] ?? "").trim());
      return {
        date: g("日期"), start: g("開始"), end: g("結束"),
        type: /課|共學|教/.test(g("類型")) ? "共學課程" : "桌遊揪團",
        title: g("標題"), desc: g("說明"),
        games: g("相關桌遊").split(/[、,，\n]+/).map((s) => s.trim()).filter(Boolean),
        cap: num(g("人數上限")), joined: num(g("已報名")),
        fee: g("費用"), place: g("地點"), host: g("帶領人"), status: g("狀態"),
      };
    })
    .filter((e) => e.title && e.date);
}

async function loadEvents() {
  if (CONFIG.EVENTS_CSV_URL) {
    try {
      const res = await fetch(CONFIG.EVENTS_CSV_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      return { list: fromEventSheet(parseCSV(await res.text())), source: "Google 試算表「活動」" };
    } catch (e) {
      console.warn("讀取活動試算表失敗，改用範例資料", e);
    }
  }
  return { list: window.EVENTS || [], source: "範例資料（data/events.js）" };
}

function prepareEvents(list) {
  const now = new Date();
  return list
    .map((e) => ({ ...e, at: parseDate(e.date, e.start), until: parseDate(e.date, e.end || e.start) }))
    .filter((e) => e.at && e.until >= now)
    .sort((a, b) => a.at - b.at);
}

function eventState(e) {
  if (/取消/.test(e.status)) return "cancel";
  if (/額滿|滿/.test(e.status) || (e.cap && e.joined >= e.cap)) return "full";
  return "open";
}

function eventHTML(e) {
  const st = eventState(e);
  const md = `${e.at.getMonth() + 1}/${e.at.getDate()}`;
  const wd = e.at.getDay();
  const time = e.start ? `${esc(e.start)}${e.end ? `–${esc(e.end)}` : ""}` : "";
  const gameChips = e.games.map((n) => {
    const i = games.findIndex((g) => g.name === n);
    return i >= 0 ? `<button type="button" class="ev-game" data-i="${i}">${esc(n)}</button>` : `<span class="ev-game">${esc(n)}</span>`;
  }).join("");
  const pct = e.cap ? Math.min(100, Math.round((e.joined / e.cap) * 100)) : 0;
  const left = e.cap ? Math.max(0, e.cap - e.joined) : 0;
  const cap = e.cap
    ? `<div class="ev-cap"><div class="bar"><i style="width:${pct}%"></i></div>
        <span>已報名 <b>${e.joined}</b> / ${e.cap} 人${st === "open" && left ? `<span class="left">剩 ${left} 位</span>` : ""}</span></div>`
    : `<div class="ev-cap"><span>已報名 <b>${e.joined}</b> 人</span></div>`;
  const label = `${md}（${WEEK[wd]}）${e.title}`;
  const btn =
    st === "cancel" ? `<span class="btn btn-ghost" aria-disabled="true">活動取消</span>`
    : st === "full" ? `<a class="btn btn-ghost" data-line data-msg="想登記候補：${esc(label)}，人數：　姓名：" href="#">額滿・登記候補</a>`
    : `<a class="btn btn-shu" data-line data-msg="我想報名：${esc(label)}，人數：　姓名：" href="#">報名</a>`;

  return `<article class="ev ${st}">
    <div class="ev-date" aria-label="${e.at.getMonth() + 1} 月 ${e.at.getDate()} 日 星期${WEEK[wd]}">
      <span class="m">${e.at.getMonth() + 1} 月</span>
      <span class="d">${e.at.getDate()}</span>
      <span class="w${wd === 0 || wd === 6 ? " weekend" : ""}">週${WEEK[wd]}</span>
    </div>
    <div class="ev-body">
      <div class="ev-meta">
        <span class="ev-type ${e.type === "共學課程" ? "course" : "meetup"}">${esc(e.type)}</span>
        ${time ? `<span>${time}</span>` : ""}${e.place ? `<span>${esc(e.place)}</span>` : ""}${e.host ? `<span>帶領：${esc(e.host)}</span>` : ""}
      </div>
      <h3>${esc(e.title)}</h3>
      ${e.desc ? `<p class="ev-desc">${esc(e.desc)}</p>` : ""}
      ${gameChips ? `<div class="ev-games">相關桌遊　${gameChips}</div>` : ""}
    </div>
    <div class="ev-side">
      ${cap}
      ${e.fee ? `<p class="ev-fee"><small>費用</small>${esc(e.fee)}</p>` : ""}
      ${btn}
    </div>
  </article>`;
}

function renderEvents() {
  const list = events.filter((e) => !evType || e.type === evType);
  $("#ev-list").innerHTML = list.map(eventHTML).join("");
  $("#ev-empty").hidden = list.length > 0;
  wireLineLinks($("#ev-list"));

  // 首頁顯示最近一場可報名的活動
  const next = events.find((e) => eventState(e) === "open");
  const el = $("#next-event");
  if (next) {
    el.innerHTML = `<b>近期活動</b><span>${next.at.getMonth() + 1}/${next.at.getDate()}（${WEEK[next.at.getDay()]}）${esc(next.title)} →</span>`;
    el.hidden = false;
  } else el.hidden = true;
}

/* ---------- 購物清單（用 LINE 下單） ---------- */
// 清單只存在客人自己的瀏覽器；送出時整理成一則 LINE 訊息，由店員確認庫存與付款。

const CART_KEY = "hifun-cart";
let cart = loadCart(); // [{ name, qty }]
let cartPickup = "到店自取";

function loadCart() {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && x.name && x.qty > 0) : [];
  } catch { return []; }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* 無痕模式等情況存不了，清單仍可在本頁使用 */ }
}
const cartQty = (name) => cart.find((x) => x.name === name)?.qty || 0;
const gameByName = (name) => games.find((g) => g.name === name);

// 清單項目對上目前資料（價格、是否還在販售、現貨數）
function cartLines() {
  return cart.map((it) => {
    const g = gameByName(it.name);
    const sale = g && onSale(g);
    return {
      ...it, g, sale,
      price: sale ? g.price : 0,
      preorder: sale && g.stock === 0,
      over: sale && g.stock > 0 && it.qty > g.stock, // 超過現貨的部分要等調貨
    };
  });
}

function addToCart(name) {
  const g = gameByName(name);
  if (!g || !onSale(g)) return;
  const it = cart.find((x) => x.name === name);
  if (it) it.qty = Math.min(it.qty + 1, 20);
  else cart.push({ name, qty: 1 });
  saveCart();
  renderCartFab(true);
}

function setQty(name, qty) {
  const it = cart.find((x) => x.name === name);
  if (!it) return;
  if (qty <= 0) cart = cart.filter((x) => x !== it);
  else it.qty = Math.min(qty, 20);
  saveCart();
  renderCartFab();
  renderCart();
}

function renderCartFab(bump = false) {
  const fab = $("#cart-fab");
  const n = cart.reduce((s, x) => s + x.qty, 0);
  fab.hidden = n === 0;
  $("#cart-n").textContent = n;
  if (bump) { fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump"); }
}

function orderMessage(lines) {
  const ok = lines.filter((l) => l.sale);
  const total = ok.reduce((s, l) => s + l.price * l.qty, 0);
  const boxes = ok.reduce((s, l) => s + l.qty, 0);
  const rows = ok.map((l, i) => {
    const note = l.preorder ? "（預訂）" : l.over ? `（現貨 ${l.g.stock} 盒，其餘預訂）` : "";
    return `${i + 1}. 《${l.name}》× ${l.qty}${note}　${money(l.price * l.qty)}`;
  });
  return [
    "我想用網站購物清單下單：",
    ...rows,
    `合計 ${money(total)}（共 ${boxes} 盒）`,
    `取貨方式：${cartPickup}${cartPickup === "寄送" ? "（運費另計）" : ""}`,
    "姓名：",
    "手機：",
    ...(cartPickup === "寄送" ? ["寄送地址或 7-11 門市："] : []),
  ].join("\n");
}

function renderCart() {
  const lines = cartLines();
  const ok = lines.filter((l) => l.sale);
  const total = ok.reduce((s, l) => s + l.price * l.qty, 0);
  $("#cart-empty").hidden = lines.length > 0;
  $("#cart-main").hidden = lines.length === 0;
  $("#cart-list").innerHTML = lines.map((l) => {
    const note = !l.sale ? `<small class="warn">目前未販售，下單時不會列入</small>`
      : l.preorder ? `<small>目前缺貨・預訂</small>`
      : l.over ? `<small>現貨 ${l.g.stock} 盒，其餘需預訂</small>`
      : l.g.stock ? `<small>現貨 ${l.g.stock} 盒</small>` : "";
    return `<li class="cart-item${l.sale ? "" : " off"}">
      <div class="ci-name"><b>${esc(l.name)}</b>${note}</div>
      <div class="ci-qty" role="group" aria-label="${esc(l.name)} 數量">
        <button type="button" data-qty="${esc(l.name)}" data-d="-1" aria-label="減少一盒">−</button>
        <output>${l.qty}</output>
        <button type="button" data-qty="${esc(l.name)}" data-d="1" aria-label="增加一盒"${l.sale ? "" : " disabled"}>＋</button>
      </div>
      <div class="ci-sum">${l.sale ? money(l.price * l.qty) : "–"}</div>
      <button type="button" class="ci-del" data-del="${esc(l.name)}" aria-label="從清單移除 ${esc(l.name)}">移除</button>
    </li>`;
  }).join("");
  $("#cart-total").textContent = money(total);
  const send = $("#cart-send");
  send.href = lineUrl(orderMessage(lines));
  send.classList.toggle("disabled", ok.length === 0);
  send.setAttribute("aria-disabled", ok.length === 0);
  $$("#cart-pickup input").forEach((r) => (r.checked = r.value === cartPickup));
}

function openCart() {
  renderCart();
  $("#cart").showModal();
}

function bindCart() {
  const dlg = $("#cart");
  $("#cart-fab").addEventListener("click", openCart);
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) return dlg.close();
    const q = e.target.closest("[data-qty]");
    if (q) return setQty(q.dataset.qty, cartQty(q.dataset.qty) + +q.dataset.d);
    const d = e.target.closest("[data-del]");
    if (d) return setQty(d.dataset.del, 0);
    if (e.target.closest("#cart-clear") && confirm("確定清空購物清單？")) { cart = []; saveCart(); renderCartFab(); renderCart(); }
    const send = e.target.closest("#cart-send");
    if (send && send.classList.contains("disabled")) e.preventDefault();
  });
  $("#cart-pickup").addEventListener("change", (e) => { cartPickup = e.target.value; renderCart(); });
  // 詳細頁的「加入購物清單」
  $("#detail").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]");
    if (!b) return;
    addToCart(b.dataset.add);
    b.textContent = `已加入 ${cartQty(b.dataset.add)} 盒・再加一盒`;
    showToast(`已加入購物清單：《${b.dataset.add}》`);
  });
  // 其他分頁改了清單時同步
  window.addEventListener("storage", (e) => { if (e.key === CART_KEY) { cart = loadCart(); renderCartFab(); } });
}

let toastTimer;
function showToast(text) {
  // 用 popover 放進最上層，詳細頁的對話框開著時也看得到
  const t = $("#toast");
  const show = () => { try { t.hidePopover(); t.showPopover(); } catch { t.classList.add("on"); } };
  const hide = () => { try { t.hidePopover(); } catch { /* 不支援 popover */ } t.classList.remove("on"); };
  t.innerHTML = `${esc(text)}<button type="button" class="toast-go">查看清單</button>`;
  show();
  t.querySelector(".toast-go").onclick = () => { hide(); $("#detail").close(); openCart(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, 3500);
}

/* ---------- 事件 ---------- */

function wireLineLinks(root = document) {
  $$("[data-line]", root).forEach((a) => {
    a.href = lineUrl(a.dataset.msg);
    a.target = "_blank";
    a.rel = "noopener";
  });
}

function bindMenu() {
  const btn = $("#menu-btn"), menu = $("#menu"), backdrop = $("#menu-backdrop");
  const setOpen = (open) => {
    menu.hidden = !open;
    backdrop.hidden = !open;
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
  };
  btn.addEventListener("click", () => setOpen(menu.hidden));
  backdrop.addEventListener("click", () => setOpen(false));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) { setOpen(false); btn.focus(); }
  });
}

function bindEvents() {
  bindMenu();
  $$("#cat-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      state.tab = b.dataset.tab;
      state.page = 1;
      $$("#cat-tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
      render();
    })
  );

  $$("#ev-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      evType = b.dataset.type;
      $$("#ev-tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
      renderEvents();
    })
  );

  $$(".chips").forEach((group) =>
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const key = group.dataset.filter;
      const v = btn.dataset.v;
      state[key] = key === "players" || key === "weight" ? +v : v;
      state.page = 1;
      $$("button", group).forEach((x) => x.classList.toggle("on", x === btn));
      render();
    })
  );

  let t;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value.trim(); state.page = 1; render(); }, 120);
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.page = 1; render(); });

  $("#pager").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-page]");
    if (b && !b.disabled) goPage(+b.dataset.page);
  });

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card, .pick-item, button.ev-game");
    if (card) openDetail(games[+card.dataset.i]);
  });

  const dlg = $("#detail");
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
  });

  $$(".stepper button").forEach((b) =>
    b.addEventListener("click", () => {
      pickN = Math.min(10, Math.max(1, pickN + +b.dataset.step));
      $("#pick-n").textContent = pickN;
    })
  );
  $("#pick-form").addEventListener("submit", (e) => { e.preventDefault(); pick(); });
}

/* ---------- 啟動 ---------- */

(async function init() {
  bindEvents();
  bindCart();
  wireLineLinks();
  const [g, ev] = await Promise.all([loadGames(), loadEvents()]);
  games = g.list;
  renderCartFab();
  $("#source").textContent = g.source;
  buildTagChips();
  renderCounts();
  render();
  events = prepareEvents(ev.list);
  $("#ev-source").textContent = ev.source;
  renderEvents();
})();
