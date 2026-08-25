(function(){
  "use strict";
  var A = window.__KPI_APP__;
  var MONTHS = A.MONTHS, RAW_METRICS = A.RAW_METRICS, TYPE_ORDER = A.TYPE_ORDER, KPI_DEFS = A.KPI_DEFS;

  var CACHE_KEY = "balter-kpi-dashboard-v1";
  var SYNC_URL = "/api/sync";
  var POLL_MS = 15000;

  var state = null;
  var selectedMonth = new Date().getMonth() <= 11 ? Math.min(new Date().getMonth(), 11) : 7; // defaults to current calendar month
  var dirty = false;
  var pushTimer = null;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  function defaultState(){
    return { months: A.buildSeedMonths(), production: A.buildSeedProduction(), forecast: A.buildSeedForecast(), exportNotes: A.buildEmptyExportNotesArray(), updatedAt: null };
  }

  function ensureShape(s){
    if (!s || !Array.isArray(s.months) || s.months.length !== 12) return defaultState();
    s.months.forEach(function(m){
      m.raw = m.raw || {};
      m.cc = m.cc || {};
      m.cc.cans = m.cc.cans || { complaints:null, units:null };
      m.cc.draught = m.cc.draught || { complaints:null, units:null };
      RAW_METRICS.forEach(function(def){ if (!(def.id in m.raw)) m.raw[def.id] = null; });
    });
    if (!Array.isArray(s.production) || s.production.length !== 12){
      s.production = A.buildSeedProduction();
    }
    s.production.forEach(function(m){
      if (!Array.isArray(m.skus)) m.skus = [];
    });
    if (!Array.isArray(s.forecast) || s.forecast.length !== 12){
      s.forecast = A.buildSeedForecast();
    }
    s.forecast.forEach(function(m){
      m.litres = m.litres || { planned:null, sold:null };
      if (!Array.isArray(m.cats) || m.cats.length !== A.FORECAST_CATEGORIES.length){
        m.cats = A.FORECAST_CATEGORIES.map(function(name){ return { name:name, planned:null, sold:null }; });
      }
    });
    A.ensureExportShape(s);
    return s;
  }

  function saveLocal(){ try{ localStorage.setItem(CACHE_KEY, JSON.stringify(state)); }catch(e){} }
  function loadLocal(){
    try{
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return ensureShape(JSON.parse(raw));
    }catch(e){ return null; }
  }

  // ---------------------------------------------------------------------
  // Sync (Cloudflare KV via /api/sync — see worker.js)
  // ---------------------------------------------------------------------
  function setSyncStatus(mode, label){
    var dot = document.getElementById("syncDot");
    var lbl = document.getElementById("syncLabel");
    dot.className = "dot" + (mode === "live" ? " live" : mode === "local" ? " local" : "");
    lbl.textContent = label;
  }

  async function remoteGet(){
    var res = await fetch(SYNC_URL, { method: "GET" });
    if (!res.ok) throw new Error("sync GET failed");
    return res.json();
  }
  async function remoteSet(data){
    var res = await fetch(SYNC_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("sync PUT failed");
    return res.json();
  }

  function markDirty(){
    dirty = true;
    saveLocal();
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushRemote, 900);
  }

  async function pushRemote(){
    if (!dirty) return;
    try{
      state.updatedAt = Date.now();
      await remoteSet(state);
      dirty = false;
      setSyncStatus("live", "Synced");
    }catch(e){
      setSyncStatus("local", "Saved on this device");
    }
  }

  async function pollRemote(){
    if (dirty) return; // don't clobber an in-flight local edit
    try{
      var remote = await remoteGet();
      if (remote && (!state.updatedAt || (remote.updatedAt && remote.updatedAt > state.updatedAt))){
        state = ensureShape(remote);
        saveLocal();
        renderAll();
      }
      setSyncStatus("live", "Synced");
    }catch(e){
      setSyncStatus("local", "Offline — saved on this device");
    }
  }

  async function initSync(){
    var local = loadLocal();
    state = local || defaultState();
    renderAll();
    setSyncStatus("", "Connecting…");
    try{
      var remote = await remoteGet();
      if (remote && (!local || !local.updatedAt || (remote.updatedAt && remote.updatedAt >= local.updatedAt))){
        state = ensureShape(remote);
        saveLocal();
      } else if (local){
        await remoteSet(state); // this device has newer local data — push it
      }
      setSyncStatus("live", "Synced");
      renderAll();
    }catch(e){
      setSyncStatus("local", local ? "Saved on this device" : "Starting fresh (offline)");
    }
    setInterval(pollRemote, POLL_MS);
  }

  // ---------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------
  function fmtNum(v, decimals){
    if (v === null || v === undefined || isNaN(v)) return "—";
    var d = decimals === undefined ? 2 : decimals;
    return Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: d });
  }
  function fmtByUnit(v, unit){
    if (v === null || v === undefined || isNaN(v)) return "—";
    if (unit === "$") return "$" + fmtNum(v, 0);
    if (unit === "%") return fmtNum(v, 1) + "%";
    if (unit === "% chg") return (v > 0 ? "+" : "") + fmtNum(v, 1) + "%";
    if (unit === "score") return fmtNum(v, 2);
    return fmtNum(v, 2);
  }
  function statusFor(kpiDef, actual){
    if (actual === null || actual === undefined || isNaN(actual)) return "neutral";
    var t = kpiDef.target;
    if (kpiDef.better === "high") return actual >= t ? "good" : "bad";
    return actual <= t ? "good" : "bad";
  }
  function kpiDefByKey(key){ return KPI_DEFS.filter(function(k){ return k.key === key; })[0]; }

  // ---------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------
  function initTabs(){
    document.querySelectorAll(".tab").forEach(function(btn){
      btn.addEventListener("click", function(){
        document.querySelectorAll(".tab").forEach(function(b){ b.classList.remove("active"); });
        document.querySelectorAll(".view").forEach(function(v){ v.classList.remove("active"); });
        btn.classList.add("active");
        document.getElementById("view-" + btn.dataset.tab).classList.add("active");
        if (btn.dataset.tab === "trends") renderTrends();
      });
    });
  }

  function initMonthPicker(){
    var sel = document.getElementById("monthPicker");
    sel.innerHTML = MONTHS.map(function(m,i){ return '<option value="'+i+'">'+m+' 2026</option>'; }).join("");
    sel.value = String(selectedMonth);
    sel.addEventListener("change", function(){
      selectedMonth = Number(sel.value);
      renderAll();
    });
  }

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------
  function renderHeroCards(){
    var wrap = document.getElementById("heroCards");
    var actual = A.computeActual(state.months[selectedMonth], selectedMonth);
    wrap.innerHTML = A.HERO_KEYS.map(function(key){
      var def = kpiDefByKey(key);
      var val = actual[key];
      var st = statusFor(def, val);
      var target = fmtByUnit(def.target, def.unit);
      return '<div class="kpi-card">' +
        '<div class="lbl">' + def.label + '</div>' +
        '<div class="val">' + fmtByUnit(val, def.unit) + '</div>' +
        '<div class="cmp ' + st + '">' + (st === "good" ? "&#9650;" : st === "bad" ? "&#9660;" : "&middot;") + ' target ' + target + '</div>' +
        '</div>';
    }).join("");
  }

  function renderDashTables(){
    document.getElementById("dashMonthTitle").textContent = MONTHS[selectedMonth] + " 2026 — KPI vs Target";
    var actual = A.computeActual(state.months[selectedMonth], selectedMonth);
    var wrap = document.getElementById("dashTables");
    var html = "";
    TYPE_ORDER.forEach(function(type){
      var defs = KPI_DEFS.filter(function(k){ return k.type === type; });
      if (!defs.length) return;
      html += '<div class="section-title">' + type + '</div>';
      html += '<table class="data"><thead><tr><th>KPI</th><th class="num">Target</th><th class="num">Actual</th><th>Status</th><th class="num">YTD</th><th>YTD Status</th></tr></thead><tbody>';
      defs.forEach(function(def){
        var val = actual[def.key];
        var ytd = A.computeYTD(state.months, selectedMonth, def.key);
        var st = statusFor(def, val);
        var ytdSt = statusFor(def, ytd);
        html += '<tr><td><span class="kpi-name">' + def.label + '</span><span class="unit">' + def.unit + '</span></td>' +
          '<td class="num">' + fmtByUnit(def.target, def.unit) + '</td>' +
          '<td class="num">' + fmtByUnit(val, def.unit) + '</td>' +
          '<td><span class="status-tag ' + st + '">' + st.toUpperCase() + '</span></td>' +
          '<td class="num">' + fmtByUnit(ytd, def.unit) + '</td>' +
          '<td><span class="status-tag ' + ytdSt + '">' + ytdSt.toUpperCase() + '</span></td></tr>';
      });
      html += '</tbody></table>';
    });
    wrap.innerHTML = html;
  }

  // ---------------------------------------------------------------------
  // Data entry
  // ---------------------------------------------------------------------
  function renderEntryGroups(){
    document.getElementById("entryMonthTitle").textContent = "Enter raw data — " + MONTHS[selectedMonth] + " 2026";
    var wrap = document.getElementById("entryGroups");
    var month = state.months[selectedMonth];
    var html = "";
    TYPE_ORDER.forEach(function(type){
      var defs = A.metricsByType(type);
      if (!defs.length) return;
      html += '<div class="section-title">' + type + ' <span class="n">(' + defs.length + ' metrics)</span></div>';
      html += '<table class="data"><thead><tr><th>Metric</th><th>Owner</th><th class="num">Value</th></tr></thead><tbody>';
      defs.forEach(function(def){
        var v = month.raw[def.id];
        html += '<tr><td><span class="kpi-name">' + def.name + '</span></td>' +
          '<td><span class="owner-tag">' + A.ownerName(def.owner) + '</span></td>' +
          '<td class="num"><input class="cell-input' + (v !== null && v !== undefined ? ' filled' : '') + '" ' +
          'type="number" step="any" data-metric="' + def.id + '" value="' + (v === null || v === undefined ? "" : v) + '" placeholder="' + def.unit + '"></td></tr>';
      });
      html += '</tbody></table>';
    });
    // read-only derived rows sourced from Complaints tab
    html += '<div class="section-title">General <span class="n">(derived from Complaints tab)</span></div>';
    var actual = A.computeActual(month, selectedMonth);
    html += '<table class="data"><tbody>' +
      '<tr><td><span class="kpi-name">Total Cans Produced</span></td><td><span class="owner-tag">CM&amp;RH</span></td><td class="num">' + fmtNum(actual.cansProduced, 0) + '</td></tr>' +
      '<tr><td><span class="kpi-name">Total Kegs Produced</span></td><td><span class="owner-tag">CM&amp;RH</span></td><td class="num">' + fmtNum(actual.draughtProduced, 0) + '</td></tr>' +
      '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelectorAll('input[data-metric]').forEach(function(inp){
      inp.addEventListener("input", function(){
        var val = inp.value === "" ? null : Number(inp.value);
        state.months[selectedMonth].raw[inp.dataset.metric] = val;
        inp.classList.toggle("filled", val !== null);
        markDirty();
        renderHeroCards();
        renderDashTables();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Complaints
  // ---------------------------------------------------------------------
  function renderComplaints(){
    document.getElementById("ccMonthTitle").textContent = "Consumer complaints — " + MONTHS[selectedMonth] + " 2026";
    var month = state.months[selectedMonth];
    var cur = document.getElementById("ccCurrent");
    var cats = [["cans","Cans"],["draught","Draught"]];
    var html = '<table class="data"><thead><tr><th>Category</th><th class="num">Complaints</th><th class="num">Units Produced</th><th class="num">% change vs PY</th></tr></thead><tbody>';
    var actual = A.computeActual(month, selectedMonth);
    var changeByCat = { cans: actual.ccCansBottles, draught: actual.ccKegs };
    cats.forEach(function(pair){
      var key = pair[0], label = pair[1];
      var c = month.cc[key] || { complaints:null, units:null };
      var chg = changeByCat[key];
      html += '<tr><td><span class="kpi-name">' + label + '</span></td>' +
        '<td class="num"><input class="cell-input' + (c.complaints !== null && c.complaints !== undefined ? ' filled' : '') + '" type="number" step="any" data-cc="' + key + '" data-field="complaints" value="' + (c.complaints === null || c.complaints === undefined ? "" : c.complaints) + '" placeholder="#"></td>' +
        '<td class="num"><input class="cell-input' + (c.units !== null && c.units !== undefined ? ' filled' : '') + '" type="number" step="any" data-cc="' + key + '" data-field="units" value="' + (c.units === null || c.units === undefined ? "" : c.units) + '" placeholder="#"></td>' +
        '<td class="num">' + (chg === null ? "—" : fmtByUnit(chg, "% chg")) + '</td></tr>';
    });
    html += '</tbody></table>';
    cur.innerHTML = html;

    cur.querySelectorAll('input[data-cc]').forEach(function(inp){
      inp.addEventListener("input", function(){
        var val = inp.value === "" ? null : Number(inp.value);
        state.months[selectedMonth].cc[inp.dataset.cc][inp.dataset.field] = val;
        inp.classList.toggle("filled", val !== null);
        markDirty();
        renderComplaints();
        renderHeroCards();
        renderDashTables();
        renderEntryGroups();
      });
    });

    var ly = A.LY_CC[selectedMonth];
    var lyWrap = document.getElementById("ccLastYear");
    lyWrap.innerHTML = '<table class="data"><thead><tr><th>Category</th><th class="num">Complaints (LY)</th><th class="num">Units Produced (LY)</th></tr></thead><tbody>' +
      '<tr><td>Cans</td><td class="num">' + fmtNum(ly.cans.c,0) + '</td><td class="num">' + fmtNum(ly.cans.u,0) + '</td></tr>' +
      '<tr><td>Draught</td><td class="num">' + fmtNum(ly.draught.c,0) + '</td><td class="num">' + fmtNum(ly.draught.u,0) + '</td></tr>' +
      '</tbody></table>';
  }

  // ---------------------------------------------------------------------
  // Production Plan Attainment
  // ---------------------------------------------------------------------
  function renderProduction(){
    document.getElementById("prodMonthTitle").textContent = "SKUs — " + MONTHS[selectedMonth] + " 2026";
    var month = state.production[selectedMonth];
    var totals = A.productionTotals(month);

    var hero = document.getElementById("prodHero");
    var st = totals.attainmentPct === null ? "neutral" : (totals.attainmentPct >= 95 ? "good" : "bad");
    hero.innerHTML =
      '<div class="kpi-card"><div class="lbl">Plan Attainment</div><div class="val">' + (totals.attainmentPct===null?"—":fmtNum(totals.attainmentPct,1)+"%") + '</div><div class="cmp ' + st + '">target 95%</div></div>' +
      '<div class="kpi-card"><div class="lbl">Total Planned</div><div class="val">' + fmtNum(totals.planned,1) + '</div><div class="cmp neutral">hL</div></div>' +
      '<div class="kpi-card"><div class="lbl">Total Produced</div><div class="val">' + fmtNum(totals.produced,1) + '</div><div class="cmp neutral">hL</div></div>' +
      '<div class="kpi-card"><div class="lbl">Abs. Variance</div><div class="val">' + fmtNum(totals.absDiff,1) + '</div><div class="cmp neutral">hL</div></div>';

    var table = document.getElementById("prodTable");
    var html = '<thead><tr><th>SKU</th><th class="num">Planned (hL)</th><th class="num">Produced (hL)</th><th class="num">Attainment</th><th class="num">Diff</th><th></th></tr></thead><tbody>';
    (month.skus || []).forEach(function(row, idx){
      var attain = (row.planned && row.produced !== null && row.produced !== undefined) ? (row.produced/row.planned)*100 : null;
      var diff = (row.planned !== null && row.produced !== null && row.planned !== undefined && row.produced !== undefined) ? (row.produced - row.planned) : null;
      html += '<tr>' +
        '<td><input class="text-input" data-prod-idx="' + idx + '" data-prod-field="sku" value="' + escapeAttr(row.sku||"") + '" placeholder="SKU name"></td>' +
        '<td class="num"><input class="cell-input' + (row.planned!==null&&row.planned!==undefined?' filled':'') + '" type="number" step="any" data-prod-idx="' + idx + '" data-prod-field="planned" value="' + (row.planned===null||row.planned===undefined?"":row.planned) + '" placeholder="hL"></td>' +
        '<td class="num"><input class="cell-input' + (row.produced!==null&&row.produced!==undefined?' filled':'') + '" type="number" step="any" data-prod-idx="' + idx + '" data-prod-field="produced" value="' + (row.produced===null||row.produced===undefined?"":row.produced) + '" placeholder="hL"></td>' +
        '<td class="num">' + (attain===null?"—":fmtNum(attain,1)+"%") + '</td>' +
        '<td class="num">' + (diff===null?"—":fmtNum(diff,1)) + '</td>' +
        '<td><button class="row-remove" data-prod-remove="' + idx + '" title="Remove row">&times;</button></td>' +
        '</tr>';
    });
    html += '<tr class="total-row"><td>Total</td>' +
      '<td class="num">' + fmtNum(totals.planned,1) + '</td>' +
      '<td class="num">' + fmtNum(totals.produced,1) + '</td>' +
      '<td class="num">' + (totals.attainmentPct===null?"—":fmtNum(totals.attainmentPct,1)+"%") + '</td>' +
      '<td class="num">' + fmtNum(totals.diff,1) + '</td><td></td></tr>';
    html += '</tbody>';
    table.innerHTML = html;

    table.querySelectorAll('[data-prod-idx]').forEach(function(inp){
      inp.addEventListener("input", function(){
        var idx = Number(inp.dataset.prodIdx), field = inp.dataset.prodField;
        var row = state.production[selectedMonth].skus[idx];
        if (field === "sku") row.sku = inp.value;
        else row[field] = inp.value === "" ? null : Number(inp.value);
        markDirty();
        renderProduction();
      });
    });
    table.querySelectorAll('[data-prod-remove]').forEach(function(btn){
      btn.addEventListener("click", function(){
        state.production[selectedMonth].skus.splice(Number(btn.dataset.prodRemove), 1);
        markDirty();
        renderProduction();
      });
    });
  }

  function escapeAttr(s){
    return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function addSkuRow(){
    state.production[selectedMonth].skus.push({ sku:"", planned:null, produced:null });
    markDirty();
    renderProduction();
  }

  // ---------------------------------------------------------------------
  // Forecast Accuracy
  // ---------------------------------------------------------------------
  function renderForecast(){
    document.getElementById("foreMonthTitle").textContent = "Planned vs Sold by category — " + MONTHS[selectedMonth] + " 2026";
    var month = state.forecast[selectedMonth];
    var totals = A.forecastTotals(month);

    var hero = document.getElementById("foreHero");
    var target = A.FORECAST_TARGET_PCT;
    var st = totals.accuracyPct === null ? "neutral" : (totals.accuracyPct >= target ? "good" : "bad");
    var litresAttain = (month.litres.planned && month.litres.sold !== null && month.litres.sold !== undefined) ? (month.litres.sold/month.litres.planned)*100 : null;
    hero.innerHTML =
      '<div class="kpi-card"><div class="lbl">Forecast Accuracy</div><div class="val">' + (totals.accuracyPct===null?"—":fmtNum(totals.accuracyPct,1)+"%") + '</div><div class="cmp ' + st + '">target ' + target + '%</div></div>' +
      '<div class="kpi-card"><div class="lbl">Litres — Plan Attainment</div><div class="val">' + (litresAttain===null?"—":fmtNum(litresAttain,1)+"%") + '</div><div class="cmp neutral">Sold / Planned</div></div>' +
      '<div class="kpi-card"><div class="lbl">Pack Sold (from categories)</div><div class="val">' + fmtNum(totals.packSold,0) + '</div><div class="cmp neutral">units</div></div>' +
      '<div class="kpi-card"><div class="lbl">Keg Sold (from categories)</div><div class="val">' + fmtNum(totals.kegSold,0) + '</div><div class="cmp neutral">units</div></div>';

    var table = document.getElementById("foreTable");
    var html = '<thead><tr><th>Category</th><th class="num">Planned</th><th class="num">Sold</th><th class="num">Attainment</th><th class="num">Diff</th></tr></thead><tbody>';
    html += '<tr style="background:var(--wash)"><td><span class="kpi-name">Litres</span><span class="unit">independent NetSuite total</span></td>' +
      '<td class="num"><input class="cell-input' + (month.litres.planned!==null&&month.litres.planned!==undefined?' filled':'') + '" type="number" step="any" data-fore-litres="planned" value="' + (month.litres.planned===null||month.litres.planned===undefined?"":month.litres.planned) + '" placeholder="L"></td>' +
      '<td class="num"><input class="cell-input' + (month.litres.sold!==null&&month.litres.sold!==undefined?' filled':'') + '" type="number" step="any" data-fore-litres="sold" value="' + (month.litres.sold===null||month.litres.sold===undefined?"":month.litres.sold) + '" placeholder="L"></td>' +
      '<td class="num">' + (litresAttain===null?"—":fmtNum(litresAttain,1)+"%") + '</td>' +
      '<td class="num">' + ((month.litres.planned!==null&&month.litres.sold!==null&&month.litres.planned!==undefined&&month.litres.sold!==undefined)?fmtNum(month.litres.sold-month.litres.planned,0):"—") + '</td></tr>';

    (month.cats || []).forEach(function(row, idx){
      var attain = (row.planned && row.sold !== null && row.sold !== undefined) ? (row.sold/row.planned)*100 : null;
      var diff = (row.planned !== null && row.sold !== null && row.planned !== undefined && row.sold !== undefined) ? (row.sold - row.planned) : null;
      html += '<tr><td><span class="kpi-name">' + row.name + '</span></td>' +
        '<td class="num"><input class="cell-input' + (row.planned!==null&&row.planned!==undefined?' filled':'') + '" type="number" step="any" data-fore-idx="' + idx + '" data-fore-field="planned" value="' + (row.planned===null||row.planned===undefined?"":row.planned) + '" placeholder="#"></td>' +
        '<td class="num"><input class="cell-input' + (row.sold!==null&&row.sold!==undefined?' filled':'') + '" type="number" step="any" data-fore-idx="' + idx + '" data-fore-field="sold" value="' + (row.sold===null||row.sold===undefined?"":row.sold) + '" placeholder="#"></td>' +
        '<td class="num">' + (attain===null?"—":fmtNum(attain,1)+"%") + '</td>' +
        '<td class="num">' + (diff===null?"—":fmtNum(diff,0)) + '</td></tr>';
    });
    html += '<tr class="total-row"><td>Forecast Accuracy (categories)</td>' +
      '<td class="num">' + fmtNum(totals.sumPlanned,0) + '</td><td class="num">&mdash;</td>' +
      '<td class="num">' + (totals.accuracyPct===null?"—":fmtNum(totals.accuracyPct,1)+"%") + '</td>' +
      '<td class="num">' + fmtNum(totals.sumAbsDiff,0) + '</td></tr>';
    html += '</tbody>';
    table.innerHTML = html;

    table.querySelectorAll('[data-fore-litres]').forEach(function(inp){
      inp.addEventListener("input", function(){
        var field = inp.dataset.foreLitres;
        state.forecast[selectedMonth].litres[field] = inp.value === "" ? null : Number(inp.value);
        markDirty();
        renderForecast();
      });
    });
    table.querySelectorAll('[data-fore-idx]').forEach(function(inp){
      inp.addEventListener("input", function(){
        var idx = Number(inp.dataset.foreIdx), field = inp.dataset.foreField;
        state.forecast[selectedMonth].cats[idx][field] = inp.value === "" ? null : Number(inp.value);
        markDirty();
        renderForecast();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Export Deck (monthly Pre-Supply notes + .pptx generation)
  // ---------------------------------------------------------------------
  var EXPORT_FIELD_MAP = [
    ["fldAchievements", "summaryAchievements"],
    ["fldOpportunities", "summaryOpportunities"],
    ["fldSummaryActions", "summaryActionsText"],
    ["fldLookingForward", "summaryLookingForward"],
    ["fldSafetyNotes", "safetyNotes"],
    ["fldQualityNotes", "qualityNotes"],
    ["fldForecastComments", "forecastComments"],
    ["fldNextTitle", "nextMonthTitle"],
    ["fldNextNotes", "nextMonthNotes"]
  ];
  var EXPORT_NUMBER_MAP = [
    ["fldSafetyDays", "safetyDays"],
    ["fldForecastPct", "forecastReportedPct"]
  ];

  function renderExportTab(){
    document.getElementById("exportMonthTitle").textContent = "Pre-Supply deck notes — " + MONTHS[selectedMonth] + " 2026";
    var notes = state.exportNotes[selectedMonth];

    EXPORT_FIELD_MAP.forEach(function(pair){
      document.getElementById(pair[0]).value = notes[pair[1]] || "";
    });
    EXPORT_NUMBER_MAP.forEach(function(pair){
      var v = notes[pair[1]];
      document.getElementById(pair[0]).value = (v === null || v === undefined) ? "" : v;
    });
    document.getElementById("fldVaMtd").value = notes.va.mtd === null || notes.va.mtd === undefined ? "" : notes.va.mtd;
    document.getElementById("fldVaPm").value = notes.va.pm === null || notes.va.pm === undefined ? "" : notes.va.pm;
    document.getElementById("fldVaYtd").value = notes.va.ytd === null || notes.va.ytd === undefined ? "" : notes.va.ytd;
    document.getElementById("fldVaFy").value = notes.va.fyForecast === null || notes.va.fyForecast === undefined ? "" : notes.va.fyForecast;
    document.getElementById("fldVaComments").value = notes.va.comments || "";
    document.getElementById("fldSlobYtd").value = notes.slob.ytd === null || notes.slob.ytd === undefined ? "" : notes.slob.ytd;
    document.getElementById("fldSlobMonth").value = notes.slob.thisMonth === null || notes.slob.thisMonth === undefined ? "" : notes.slob.thisMonth;
    document.getElementById("fldSlobCarry").value = notes.slob.carryOver === null || notes.slob.carryOver === undefined ? "" : notes.slob.carryOver;
    document.getElementById("fldSlobComments").value = notes.slob.comments || "";

    renderActionsTable(notes);
    renderVaTable(notes);
  }

  function renderActionsTable(notes){
    var table = document.getElementById("actionsTable");
    var html = '<thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>';
    notes.actions.forEach(function(row, idx){
      html += '<tr>' +
        '<td><input class="text-input" data-act-idx="' + idx + '" data-act-field="action" value="' + escapeAttr(row.action||"") + '"></td>' +
        '<td><input class="text-input" style="min-width:110px" data-act-idx="' + idx + '" data-act-field="owner" value="' + escapeAttr(row.owner||"") + '"></td>' +
        '<td><input class="text-input" style="min-width:90px" data-act-idx="' + idx + '" data-act-field="due" value="' + escapeAttr(row.due||"") + '"></td>' +
        '<td><input class="text-input" style="min-width:100px" data-act-idx="' + idx + '" data-act-field="status" value="' + escapeAttr(row.status||"") + '"></td>' +
        '<td><button class="row-remove" data-act-remove="' + idx + '">&times;</button></td>' +
        '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
    table.querySelectorAll('[data-act-idx]').forEach(function(inp){
      inp.addEventListener("input", function(){
        state.exportNotes[selectedMonth].actions[Number(inp.dataset.actIdx)][inp.dataset.actField] = inp.value;
        markDirty();
      });
    });
    table.querySelectorAll('[data-act-remove]').forEach(function(btn){
      btn.addEventListener("click", function(){
        state.exportNotes[selectedMonth].actions.splice(Number(btn.dataset.actRemove), 1);
        markDirty();
        renderActionsTable(state.exportNotes[selectedMonth]);
      });
    });
  }

  function renderVaTable(notes){
    var table = document.getElementById("vaTable");
    var html = '<thead><tr><th>Initiative</th><th>Category</th><th class="num">MTD $</th><th class="num">YTD $</th><th></th></tr></thead><tbody>';
    notes.vaInitiatives.forEach(function(row, idx){
      html += '<tr>' +
        '<td><input class="text-input" data-va-idx="' + idx + '" data-va-field="initiative" value="' + escapeAttr(row.initiative||"") + '"></td>' +
        '<td><input class="text-input" style="min-width:120px" data-va-idx="' + idx + '" data-va-field="category" value="' + escapeAttr(row.category||"") + '"></td>' +
        '<td class="num"><input class="cell-input" data-va-idx="' + idx + '" data-va-field="mtd" type="number" step="any" value="' + (row.mtd===null||row.mtd===undefined?"":row.mtd) + '"></td>' +
        '<td class="num"><input class="cell-input" data-va-idx="' + idx + '" data-va-field="ytd" type="number" step="any" value="' + (row.ytd===null||row.ytd===undefined?"":row.ytd) + '"></td>' +
        '<td><button class="row-remove" data-va-remove="' + idx + '">&times;</button></td>' +
        '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
    table.querySelectorAll('[data-va-idx]').forEach(function(inp){
      inp.addEventListener("input", function(){
        var idx = Number(inp.dataset.vaIdx), field = inp.dataset.vaField;
        var row = state.exportNotes[selectedMonth].vaInitiatives[idx];
        row[field] = (field==="mtd"||field==="ytd") ? (inp.value===""?null:Number(inp.value)) : inp.value;
        markDirty();
      });
    });
    table.querySelectorAll('[data-va-remove]').forEach(function(btn){
      btn.addEventListener("click", function(){
        state.exportNotes[selectedMonth].vaInitiatives.splice(Number(btn.dataset.vaRemove), 1);
        markDirty();
        renderVaTable(state.exportNotes[selectedMonth]);
      });
    });
  }

  function wireExportFields(){
    EXPORT_FIELD_MAP.forEach(function(pair){
      document.getElementById(pair[0]).addEventListener("input", function(e){
        state.exportNotes[selectedMonth][pair[1]] = e.target.value;
        markDirty();
      });
    });
    EXPORT_NUMBER_MAP.forEach(function(pair){
      document.getElementById(pair[0]).addEventListener("input", function(e){
        state.exportNotes[selectedMonth][pair[1]] = e.target.value === "" ? null : Number(e.target.value);
        markDirty();
      });
    });
    [["fldVaMtd","mtd"],["fldVaPm","pm"],["fldVaYtd","ytd"],["fldVaFy","fyForecast"]].forEach(function(pair){
      document.getElementById(pair[0]).addEventListener("input", function(e){
        state.exportNotes[selectedMonth].va[pair[1]] = e.target.value === "" ? null : Number(e.target.value);
        markDirty();
      });
    });
    document.getElementById("fldVaComments").addEventListener("input", function(e){
      state.exportNotes[selectedMonth].va.comments = e.target.value;
      markDirty();
    });
    [["fldSlobYtd","ytd"],["fldSlobMonth","thisMonth"],["fldSlobCarry","carryOver"]].forEach(function(pair){
      document.getElementById(pair[0]).addEventListener("input", function(e){
        state.exportNotes[selectedMonth].slob[pair[1]] = e.target.value === "" ? null : Number(e.target.value);
        markDirty();
      });
    });
    document.getElementById("fldSlobComments").addEventListener("input", function(e){
      state.exportNotes[selectedMonth].slob.comments = e.target.value;
      markDirty();
    });
    document.getElementById("btnAddAction").addEventListener("click", function(){
      state.exportNotes[selectedMonth].actions.push({ action:"", owner:"", due:"", status:"" });
      markDirty();
      renderActionsTable(state.exportNotes[selectedMonth]);
    });
    document.getElementById("btnAddVa").addEventListener("click", function(){
      state.exportNotes[selectedMonth].vaInitiatives.push({ initiative:"", category:"", mtd:null, ytd:null });
      markDirty();
      renderVaTable(state.exportNotes[selectedMonth]);
    });
    function doExport(btn){
      var original = btn.textContent;
      btn.textContent = "Building…";
      btn.disabled = true;
      A.buildDeck(state, selectedMonth).catch(function(e){
        console.error(e);
        alert("Couldn't build the deck: " + (e && e.message ? e.message : e));
      }).finally(function(){
        btn.textContent = original;
        btn.disabled = false;
      });
    }
    document.getElementById("btnExportDeck").addEventListener("click", function(){ doExport(this); });
    document.getElementById("btnExportDeck2").addEventListener("click", function(){ doExport(this); });
  }

  // ---------------------------------------------------------------------
  // Trends
  // ---------------------------------------------------------------------
  var trendKpiKey = "planAttainmentPct";
  function initTrendSelect(){
    var sel = document.getElementById("trendKpiSelect");
    var extraOpts = '<option value="__prodAttainment">Production — Plan Attainment</option>' +
      '<option value="__forecastAccuracy">Forecast — Accuracy</option>';
    sel.innerHTML = extraOpts + KPI_DEFS.map(function(d){ return '<option value="'+d.key+'">'+d.type+' — '+d.label+'</option>'; }).join("");
    sel.value = trendKpiKey;
    sel.addEventListener("change", function(){ trendKpiKey = sel.value; renderTrends(); });
  }

  function renderTrends(){
    var isProd = trendKpiKey === "__prodAttainment";
    var isFore = trendKpiKey === "__forecastAccuracy";
    var def, vals;
    if (isProd){
      def = { label: "Production — Plan Attainment", unit: "%", target: 95, better: "high" };
      vals = MONTHS.map(function(m,i){ return A.productionTotals(state.production[i]).attainmentPct; });
    } else if (isFore){
      def = { label: "Forecast Accuracy", unit: "%", target: A.FORECAST_TARGET_PCT, better: "high" };
      vals = MONTHS.map(function(m,i){ return A.forecastTotals(state.forecast[i]).accuracyPct; });
    } else {
      def = kpiDefByKey(trendKpiKey);
      vals = MONTHS.map(function(m, i){ return A.computeActual(state.months[i], i)[def.key]; });
    }
    var svg = document.getElementById("trendChart");
    var W = 900, H = 340, padL = 56, padR = 20, padT = 20, padB = 40;
    var present = vals.filter(function(v){ return v !== null && v !== undefined; });
    var allForRange = present.concat([def.target]);
    var maxVal = Math.max.apply(null, allForRange);
    var minVal = Math.min.apply(null, allForRange.concat([0]));
    if (maxVal === minVal) maxVal = minVal + 1;
    var span = maxVal - minVal;
    maxVal += span * 0.12; minVal -= span * 0.06;
    if (minVal > 0 && def.better !== undefined) minVal = Math.min(minVal, 0);

    function x(i){ return padL + (W - padL - padR) * (i / (MONTHS.length - 1)); }
    function y(v){ return H - padB - (H - padT - padB) * ((v - minVal) / (maxVal - minVal)); }

    var gridLines = [0,1,2,3,4].map(function(k){
      var v = minVal + (maxVal - minVal) * (k/4);
      var yy = y(v);
      return '<line class="grid-line" x1="'+padL+'" x2="'+(W-padR)+'" y1="'+yy.toFixed(1)+'" y2="'+yy.toFixed(1)+'"/>' +
        '<text class="axis-label" x="'+(padL-8)+'" y="'+(yy+3).toFixed(1)+'" text-anchor="end">'+fmtNum(v,1)+'</text>';
    }).join("");

    var monthLabels = MONTHS.map(function(m,i){
      return '<text class="axis-label" x="'+x(i).toFixed(1)+'" y="'+(H-padB+18)+'" text-anchor="middle">'+m+'</text>';
    }).join("");

    var targetY = y(def.target).toFixed(1);
    var targetLine = '<line class="target-line" x1="'+padL+'" x2="'+(W-padR)+'" y1="'+targetY+'" y2="'+targetY+'"/>';

    var segments = [];
    var cur = [];
    vals.forEach(function(v, i){
      if (v === null || v === undefined){
        if (cur.length) segments.push(cur);
        cur = [];
      } else {
        cur.push([i, v]);
      }
    });
    if (cur.length) segments.push(cur);
    var lines = segments.map(function(seg){
      var d = seg.map(function(pt,i){ return (i===0?'M':'L') + x(pt[0]).toFixed(1) + ',' + y(pt[1]).toFixed(1); }).join(' ');
      return '<path class="trend-line" d="'+d+'"/>';
    }).join("");
    var dots = vals.map(function(v,i){
      if (v === null || v === undefined) return "";
      return '<circle class="trend-dot" cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="4"><title>'+MONTHS[i]+': '+fmtByUnit(v,def.unit)+'</title></circle>';
    }).join("");

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = gridLines + targetLine + lines + dots + monthLabels;
  }

  // ---------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------
  function renderMonthGrid(){
    var wrap = document.getElementById("monthGrid");
    wrap.innerHTML = MONTHS.map(function(m, i){
      var month = state.months[i];
      var total = RAW_METRICS.length + 4; // + 4 complaint fields
      var filled = RAW_METRICS.filter(function(def){ return month.raw[def.id] !== null && month.raw[def.id] !== undefined; }).length;
      ["cans","draught"].forEach(function(cat){
        var c = month.cc[cat];
        if (c.complaints !== null && c.complaints !== undefined) filled++;
        if (c.units !== null && c.units !== undefined) filled++;
      });
      var pct = Math.round((filled/total)*100);
      var status = pct === 0 ? "No data yet" : pct === 100 ? "Complete" : pct + "% entered";
      return '<button class="month-tile' + (i === selectedMonth ? ' selected' : '') + '" data-jump="' + i + '">' +
        '<div class="m">' + m + ' 2026</div>' +
        '<div class="status">' + status + '</div>' +
        '<div class="fill-bar"><i style="width:' + pct + '%"></i></div>' +
        '</button>';
    }).join("");
    wrap.querySelectorAll('[data-jump]').forEach(function(btn){
      btn.addEventListener("click", function(){
        selectedMonth = Number(btn.dataset.jump);
        document.getElementById("monthPicker").value = String(selectedMonth);
        renderAll();
        document.querySelector('.tab[data-tab="entry"]').click();
      });
    });
  }

  // ---------------------------------------------------------------------
  // Copy / print
  // ---------------------------------------------------------------------
  function buildSummaryText(){
    var month = state.months[selectedMonth];
    var actual = A.computeActual(month, selectedMonth);
    var lines = ["Balter Brewing — KPI Summary — " + MONTHS[selectedMonth] + " 2026", ""];
    TYPE_ORDER.forEach(function(type){
      var defs = KPI_DEFS.filter(function(k){ return k.type === type; });
      if (!defs.length) return;
      lines.push(type.toUpperCase());
      defs.forEach(function(def){
        var val = actual[def.key];
        var st = statusFor(def, val);
        lines.push("  " + def.label + ": " + fmtByUnit(val, def.unit) + " (target " + fmtByUnit(def.target, def.unit) + ", " + st.toUpperCase() + ")");
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  async function copySummary(){
    var btn = document.getElementById("btnCopySummary");
    var original = btn.textContent;
    try{
      await navigator.clipboard.writeText(buildSummaryText());
      btn.textContent = "Copied!";
    }catch(e){
      btn.textContent = "Copy failed";
    }
    setTimeout(function(){ btn.textContent = original; }, 2000);
  }

  // ---------------------------------------------------------------------
  // Bubbles decoration
  // ---------------------------------------------------------------------
  function initBubbles(){
    var wrap = document.getElementById("bubbles");
    var n = 14;
    for (var i=0;i<n;i++){
      var s = document.createElement("span");
      var size = 10 + Math.random()*26;
      s.style.width = size+"px";
      s.style.height = size+"px";
      s.style.left = (Math.random()*100)+"%";
      s.style.animationDuration = (14 + Math.random()*14)+"s";
      s.style.animationDelay = (-Math.random()*20)+"s";
      wrap.appendChild(s);
    }
  }

  // ---------------------------------------------------------------------
  // Master render + init
  // ---------------------------------------------------------------------
  function renderAll(){
    renderHeroCards();
    renderDashTables();
    renderEntryGroups();
    renderComplaints();
    renderProduction();
    renderForecast();
    renderMonthGrid();
    renderExportTab();
    if (document.getElementById("view-trends").classList.contains("active")) renderTrends();
  }

  document.addEventListener("DOMContentLoaded", function(){
    initBubbles();
    initTabs();
    initMonthPicker();
    initTrendSelect();
    wireExportFields();
    document.getElementById("btnCopySummary").addEventListener("click", copySummary);
    document.getElementById("btnPrint").addEventListener("click", function(){ window.print(); });
    document.getElementById("btnAddSku").addEventListener("click", addSkuRow);
    initSync();
  });
})();
