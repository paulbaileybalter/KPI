(function(){
  "use strict";

  // Brand palette (matches the site's own CSS variables)
  var C = {
    teal:   "47D7AC",
    orange: "FDAA63",
    purple: "7566A0",
    sky:    "99D6EA",
    ink:    "0B0B0C",
    pale:   "F1EB9C",
    gold:   "FFD637",
    paper:  "FFFFFF",
    line:   "E7E5DE",
    wash:   "FAFAF7",
    good:   "2FA86B",
    goodBg: "DCF3E7",
    bad:    "C4553C",
    badBg:  "FAE1DA",
    grey:   "8B8878"
  };

  var PAGE_W = 13.333, PAGE_H = 7.5;

  function splitLines(text){
    return String(text || "")
      .split(/\r?\n/)
      .map(function(l){ return l.replace(/^[-•\s]+/, "").trim(); })
      .filter(function(l){ return l.length > 0; });
  }

  function bulletParas(text, opts){
    var lines = splitLines(text);
    if (!lines.length) lines = ["—"];
    return lines.map(function(l, i){
      var o = Object.assign({ text: l, options: Object.assign({ bullet: true, breakLine: i < lines.length - 1 }, opts || {}) });
      return o;
    });
  }

  function addHeader(slide, kicker, title){
    slide.addShape("rect", { x:0, y:0, w:PAGE_W, h:1.15, fill:{ color:C.ink } });
    slide.addText(kicker.toUpperCase(), {
      x:0.5, y:0.16, w:PAGE_W-1, h:0.3, fontFace:"Arial", fontSize:11, color:C.teal,
      bold:true, charSpacing:2, margin:0
    });
    slide.addText(title, {
      x:0.5, y:0.42, w:PAGE_W-1, h:0.65, fontFace:"Arial", fontSize:28, color:C.paper,
      bold:true, margin:0
    });
  }

  function addFooter(slide, monthLabel, pageNum, logoData){
    slide.addShape("rect", { x:0, y:PAGE_H-0.5, w:PAGE_W, h:0.5, fill:{ color:C.ink } });
    if (logoData){
      slide.addImage({ data: logoData, x:0.35, y:PAGE_H-0.42, w:0.34, h:0.34 });
    }
    slide.addText("Balter Brewing  ·  Pre-Supply  ·  " + monthLabel, {
      x:0.8, y:PAGE_H-0.46, w:8, h:0.42, fontFace:"Arial", fontSize:9, color:"CFCDC4", valign:"middle", margin:0
    });
    slide.addText(String(pageNum), {
      x:PAGE_W-0.8, y:PAGE_H-0.46, w:0.5, h:0.42, fontFace:"Arial", fontSize:9, color:"CFCDC4",
      align:"right", valign:"middle", margin:0
    });
  }

  function statCard(slide, x, y, w, h, label, value, sub, accentColor){
    slide.addShape("roundRect", { x:x, y:y, w:w, h:h, rectRadius:0.08, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
    slide.addText(label.toUpperCase(), { x:x+0.18, y:y+0.14, w:w-0.36, h:0.28, fontFace:"Arial", fontSize:9.5, bold:true, color:C.grey, charSpacing:1, margin:0 });
    slide.addText(String(value), { x:x+0.18, y:y+0.4, w:w-0.36, h:h-0.7, fontFace:"Arial", fontSize:24, bold:true, color:accentColor || C.ink, margin:0, valign:"top" });
    if (sub){
      slide.addText(sub, { x:x+0.18, y:y+h-0.34, w:w-0.36, h:0.28, fontFace:"Arial", fontSize:9.5, color:C.grey, margin:0 });
    }
  }

  function fmt(v, decimals){
    if (v === null || v === undefined || isNaN(v)) return "—";
    var d = decimals === undefined ? 1 : decimals;
    return Number(v).toLocaleString(undefined, { minimumFractionDigits:0, maximumFractionDigits:d });
  }
  function fmtByUnit(v, unit){
    if (v === null || v === undefined || isNaN(v)) return "—";
    if (unit === "$") return "$" + fmt(v, 0);
    if (unit === "%") return fmt(v, 1) + "%";
    if (unit === "% chg") return (v > 0 ? "+" : "") + fmt(v, 1) + "%";
    if (unit === "score") return fmt(v, 2);
    return fmt(v, 2);
  }
  function statusOf(def, actual){
    if (actual === null || actual === undefined || isNaN(actual)) return "neutral";
    return def.better === "high" ? (actual >= def.target ? "good" : "bad") : (actual <= def.target ? "good" : "bad");
  }

  function imageToDataURL(url){
    return fetch(url).then(function(res){ return res.blob(); }).then(function(blob){
      return new Promise(function(resolve, reject){
        var reader = new FileReader();
        reader.onload = function(){ resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }).catch(function(){ return null; });
  }

  async function buildDeck(state, monthIndex){
    var A = window.__KPI_APP__;
    var MONTHS = A.MONTHS, KPI_DEFS = A.KPI_DEFS, TYPE_ORDER = A.TYPE_ORDER;
    var monthLabel = MONTHS[monthIndex] + " 2026";
    var notes = state.exportNotes[monthIndex];
    var logoData = await imageToDataURL("icon-512.png");

    var pres = new PptxGenJS();
    pres.layout = "LAYOUT_WIDE";
    pres.author = "Balter Brewing KPI Dashboard";
    pres.title = "Balter Brewing Pre-Supply — " + monthLabel;
    var page = 1;

    // ---------------- Slide 1: Title ----------------
    var s1 = pres.addSlide();
    s1.addShape("rect", { x:0, y:0, w:PAGE_W, h:PAGE_H, fill:{ color:C.ink } });
    s1.addShape("rect", { x:0, y:PAGE_H-0.14, w:PAGE_W, h:0.14, fill:{ color:C.teal } });
    if (logoData) s1.addImage({ data:logoData, x:PAGE_W/2-0.55, y:1.55, w:1.1, h:1.1 });
    s1.addText("BALTER BREWING", { x:0, y:2.95, w:PAGE_W, h:0.5, align:"center", fontFace:"Arial", fontSize:16, color:C.teal, bold:true, charSpacing:3, margin:0 });
    s1.addText("PRE-SUPPLY", { x:0, y:3.35, w:PAGE_W, h:0.9, align:"center", fontFace:"Arial", fontSize:44, color:C.paper, bold:true, margin:0 });
    s1.addText(monthLabel, { x:0, y:4.25, w:PAGE_W, h:0.5, align:"center", fontFace:"Arial", fontSize:20, color:C.gold, bold:true, margin:0 });

    // ---------------- Slide 2: Actions ----------------
    var s2 = pres.addSlide();
    addHeader(s2, "Balter Brewing Pre-Supply", "Actions");
    var actionRows = [[
      { text:"#", options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:10 } },
      { text:"Action", options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:10 } },
      { text:"Owner", options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:10 } },
      { text:"Due", options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:10 } },
      { text:"Status", options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:10 } }
    ]];
    var actions = notes.actions.length ? notes.actions : [{action:"",owner:"",due:"",status:""}];
    actions.forEach(function(a, i){
      actionRows.push([
        { text:String(i+1), options:{ fontSize:10 } },
        { text:a.action||"", options:{ fontSize:10 } },
        { text:a.owner||"", options:{ fontSize:10 } },
        { text:a.due||"", options:{ fontSize:10 } },
        { text:a.status||"", options:{ fontSize:10 } }
      ]);
    });
    s2.addTable(actionRows, { x:0.5, y:1.4, w:PAGE_W-1, colW:[0.5, 6.63, 1.9, 1.5, 1.78], border:{ type:"solid", color:C.line, pt:0.75 }, autoPage:false, valign:"middle", rowH:0.4, margin:[3,5,3,5] });
    addFooter(s2, monthLabel, page++, logoData);

    // ---------------- Slide 3: Executive Summary ----------------
    var s3 = pres.addSlide();
    addHeader(s3, "Balter Brewing Pre-Supply", "Supply Executive Summary — " + monthLabel);
    var quad = [
      { title:"Achievements", text:notes.summaryAchievements, x:0.5, y:1.4, color:C.teal },
      { title:"Opportunities", text:notes.summaryOpportunities, x:6.87, y:1.4, color:C.orange },
      { title:"Actions", text:notes.summaryActionsText, x:0.5, y:4.15, color:C.purple },
      { title:"Looking Forward", text:notes.summaryLookingForward, x:6.87, y:4.15, color:C.sky }
    ];
    quad.forEach(function(q){
      s3.addShape("roundRect", { x:q.x, y:q.y, w:5.95, h:2.55, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
      s3.addShape("rect", { x:q.x, y:q.y, w:0.08, h:2.55, fill:{ color:q.color } });
      s3.addText(q.title.toUpperCase(), { x:q.x+0.3, y:q.y+0.14, w:5.4, h:0.32, fontFace:"Arial", fontSize:12, bold:true, color:C.ink, margin:0 });
      s3.addText(bulletParas(q.text, { fontSize:11.5, color:C.ink }), { x:q.x+0.3, y:q.y+0.52, w:5.4, h:1.9, fontFace:"Arial", valign:"top", margin:0, paraSpaceAfter:6 });
    });
    addFooter(s3, monthLabel, page++, logoData);

    // ---------------- Slide 4: Safety & Wellbeing ----------------
    var s4 = pres.addSlide();
    addHeader(s4, "Balter Brewing Pre-Supply", "Safety & Wellbeing");
    statCard(s4, 0.5, 1.5, 3.4, 1.7, "Days LTI-free", notes.safetyDays===null?"—":fmt(notes.safetyDays,0), null, C.teal);
    s4.addShape("roundRect", { x:4.15, y:1.5, w:8.68, h:4.9, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
    s4.addText("NOTES", { x:4.45, y:1.68, w:8, h:0.3, fontFace:"Arial", fontSize:11, bold:true, color:C.grey, charSpacing:1, margin:0 });
    s4.addText(bulletParas(notes.safetyNotes, { fontSize:13, color:C.ink }), { x:4.45, y:2.05, w:8.1, h:4.2, fontFace:"Arial", valign:"top", margin:0, paraSpaceAfter:8 });
    addFooter(s4, monthLabel, page++, logoData);

    // ---------------- Slide 5: Quality ----------------
    var s5 = pres.addSlide();
    addHeader(s5, "Balter Brewing Pre-Supply", "Quality");
    var actualQ = A.computeActual(state.months[monthIndex], monthIndex);
    var qCards = [
      { label:"Micro", val: fmtByUnit(actualQ.micro, "%"), target: kpiDefTarget(KPI_DEFS,"micro") },
      { label:"Phys Chem", val: fmtByUnit(actualQ.physChem, "%"), target: kpiDefTarget(KPI_DEFS,"physChem") },
      { label:"Sensory", val: fmtByUnit(actualQ.sensory, "score"), target: kpiDefTarget(KPI_DEFS,"sensory") },
      { label:"Complaints (Total)", val: (actualQ.controllableComplaints===null?"—":fmt(actualQ.controllableComplaints+ (actualQ.kegReturns||0),0)), target: null }
    ];
    qCards.forEach(function(c, i){
      statCard(s5, 0.5 + i*3.13, 1.5, 2.93, 1.5, c.label, c.val, c.target ? ("target " + c.target) : null, C.purple);
    });
    s5.addShape("roundRect", { x:0.5, y:3.25, w:12.3, h:3.15, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
    s5.addText("NOTES", { x:0.8, y:3.43, w:8, h:0.3, fontFace:"Arial", fontSize:11, bold:true, color:C.grey, charSpacing:1, margin:0 });
    s5.addText(bulletParas(notes.qualityNotes, { fontSize:13, color:C.ink }), { x:0.8, y:3.8, w:11.7, h:2.5, fontFace:"Arial", valign:"top", margin:0, paraSpaceAfter:8 });
    addFooter(s5, monthLabel, page++, logoData);

    // ---------------- Slide 6: KPI Dash ----------------
    var s6 = pres.addSlide();
    addHeader(s6, "Balter Brewing Pre-Supply", "KPI Dash");
    var dashHeader = ["Type","KPI","Unit","Target","Actual","Var","YTD Target","YTD Actual","YTD Var"].map(function(h){
      return { text:h, options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:8.5 } };
    });
    var dashRows = [dashHeader];
    TYPE_ORDER.forEach(function(type){
      KPI_DEFS.filter(function(k){ return k.type===type; }).forEach(function(def){
        var val = actualQ[def.key];
        var ytd = A.computeYTD(state.months, monthIndex, def.key);
        var st = statusOf(def, val), ytdSt = statusOf(def, ytd);
        var stFill = st==="good"?C.goodBg:st==="bad"?C.badBg:C.paper;
        var stColor = st==="good"?C.good:st==="bad"?C.bad:C.grey;
        var ytdFill = ytdSt==="good"?C.goodBg:ytdSt==="bad"?C.badBg:C.paper;
        var ytdColor = ytdSt==="good"?C.good:ytdSt==="bad"?C.bad:C.grey;
        dashRows.push([
          { text:def.type, options:{ fontSize:8 } },
          { text:def.label, options:{ fontSize:8, bold:true } },
          { text:def.unit, options:{ fontSize:8 } },
          { text:fmtByUnit(def.target, def.unit), options:{ fontSize:8, align:"right" } },
          { text:fmtByUnit(val, def.unit), options:{ fontSize:8, align:"right", bold:true } },
          { text:st.toUpperCase(), options:{ fontSize:7.5, align:"center", bold:true, fill:{color:stFill}, color:stColor } },
          { text:fmtByUnit(def.target, def.unit), options:{ fontSize:8, align:"right" } },
          { text:fmtByUnit(ytd, def.unit), options:{ fontSize:8, align:"right", bold:true } },
          { text:ytdSt.toUpperCase(), options:{ fontSize:7.5, align:"center", bold:true, fill:{color:ytdFill}, color:ytdColor } }
        ]);
      });
    });
    s6.addTable(dashRows, { x:0.4, y:1.25, w:PAGE_W-0.8, colW:[1.3,3.4,0.85,1.2,1.2,1.08,1.2,1.2,1.08], border:{ type:"solid", color:C.line, pt:0.5 }, autoPage:false, valign:"middle", rowH:0.19, margin:[2,3,2,3] });
    addFooter(s6, monthLabel, page++, logoData);

    // ---------------- Slide 7: Production Plan Attainment ----------------
    var s7 = pres.addSlide();
    addHeader(s7, "Balter Brewing Pre-Supply", "Production Plan Attainment");
    var prodMonth = state.production[monthIndex];
    var prodTotals = A.productionTotals(prodMonth);
    var prodRowCount = (prodMonth.skus||[]).length + 2; // header + total
    var prodAvailH = 6.9 - 1.3;
    var prodRowH = Math.max(0.19, Math.min(0.32, prodAvailH / prodRowCount));
    var prodFont = prodRowH < 0.24 ? 7.5 : 8.5;
    var prodHeader = ["SKU","hL Planned","hL Produced","Attainment","Diff"].map(function(h){
      return { text:h, options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:prodFont } };
    });
    var prodRows = [prodHeader];
    (prodMonth.skus||[]).forEach(function(row){
      var attain = (row.planned && row.produced!==null && row.produced!==undefined) ? (row.produced/row.planned)*100 : null;
      var diff = (row.planned!==null&&row.produced!==null&&row.planned!==undefined&&row.produced!==undefined) ? row.produced-row.planned : null;
      prodRows.push([
        { text:row.sku||"", options:{ fontSize:prodFont } },
        { text:fmt(row.planned,2), options:{ fontSize:prodFont, align:"right" } },
        { text:fmt(row.produced,2), options:{ fontSize:prodFont, align:"right" } },
        { text:attain===null?"—":fmt(attain,1)+"%", options:{ fontSize:prodFont, align:"right" } },
        { text:diff===null?"—":fmt(diff,1), options:{ fontSize:prodFont, align:"right" } }
      ]);
    });
    prodRows.push([
      { text:"Total", options:{ fontSize:prodFont, bold:true, fill:{color:C.wash} } },
      { text:fmt(prodTotals.planned,1), options:{ fontSize:prodFont, bold:true, align:"right", fill:{color:C.wash} } },
      { text:fmt(prodTotals.produced,1), options:{ fontSize:prodFont, bold:true, align:"right", fill:{color:C.wash} } },
      { text:prodTotals.attainmentPct===null?"—":fmt(prodTotals.attainmentPct,1)+"%", options:{ fontSize:prodFont, bold:true, align:"right", fill:{color:C.wash} } },
      { text:fmt(prodTotals.diff,1), options:{ fontSize:prodFont, bold:true, align:"right", fill:{color:C.wash} } }
    ]);
    s7.addTable(prodRows, { x:0.6, y:1.3, w:PAGE_W-1.2, colW:[5.4,1.68,1.68,1.68,1.68], border:{ type:"solid", color:C.line, pt:0.5 }, autoPage:false, valign:"middle", rowH:prodRowH, margin:[2,4,2,4] });
    addFooter(s7, monthLabel, page++, logoData);

    // ---------------- Slide 8: Forecast Accuracy (month) ----------------
    var s8 = pres.addSlide();
    addHeader(s8, "Balter Brewing Pre-Supply", "Forecast Accuracy — " + monthLabel);
    var foreMonth = state.forecast[monthIndex];
    var foreTotals = A.forecastTotals(foreMonth);
    var reportedPct = notes.forecastReportedPct;
    var headlinePct = (reportedPct !== null && reportedPct !== undefined && reportedPct !== "") ? Number(reportedPct) : foreTotals.accuracyPct;
    s8.addText("Target: " + A.FORECAST_TARGET_PCT + "%", { x:PAGE_W-3, y:0.2, w:2.6, h:0.3, align:"right", fontFace:"Arial", fontSize:11, italic:true, color:C.sky, margin:0 });
    statCard(s8, 0.5, 1.35, 3.0, 1.35, "Forecast Accuracy", headlinePct===null?"—":fmt(headlinePct,1)+"%", reportedPct!==null&&reportedPct!==undefined&&reportedPct!=="" ? "reported" : "app-calculated", (headlinePct!==null && headlinePct>=A.FORECAST_TARGET_PCT)?C.good:C.bad);
    var foreHeader = ["Category","Planned","Sold","Attainment","Diff"].map(function(h){
      return { text:h, options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:8.5 } };
    });
    var foreRows = [foreHeader];
    var litresAttain = (foreMonth.litres.planned && foreMonth.litres.sold!==null && foreMonth.litres.sold!==undefined) ? (foreMonth.litres.sold/foreMonth.litres.planned)*100 : null;
    foreRows.push([
      { text:"Litres (NetSuite total)", options:{ fontSize:8.5, bold:true, fill:{color:C.wash} } },
      { text:fmt(foreMonth.litres.planned,0), options:{ fontSize:8.5, align:"right", fill:{color:C.wash} } },
      { text:fmt(foreMonth.litres.sold,0), options:{ fontSize:8.5, align:"right", fill:{color:C.wash} } },
      { text:litresAttain===null?"—":fmt(litresAttain,1)+"%", options:{ fontSize:8.5, align:"right", fill:{color:C.wash} } },
      { text:(foreMonth.litres.planned!==null&&foreMonth.litres.sold!==null&&foreMonth.litres.planned!==undefined&&foreMonth.litres.sold!==undefined)?fmt(foreMonth.litres.sold-foreMonth.litres.planned,0):"—", options:{ fontSize:8.5, align:"right", fill:{color:C.wash} } }
    ]);
    (foreMonth.cats||[]).forEach(function(row){
      var attain = (row.planned && row.sold!==null && row.sold!==undefined) ? (row.sold/row.planned)*100 : null;
      var diff = (row.planned!==null&&row.sold!==null&&row.planned!==undefined&&row.sold!==undefined) ? row.sold-row.planned : null;
      foreRows.push([
        { text:row.name, options:{ fontSize:8.5 } },
        { text:fmt(row.planned,0), options:{ fontSize:8.5, align:"right" } },
        { text:fmt(row.sold,0), options:{ fontSize:8.5, align:"right" } },
        { text:attain===null?"—":fmt(attain,1)+"%", options:{ fontSize:8.5, align:"right" } },
        { text:diff===null?"—":fmt(diff,0), options:{ fontSize:8.5, align:"right" } }
      ]);
    });
    s8.addTable(foreRows, { x:4.0, y:1.35, w:PAGE_W-4.5, colW:[3.3,1.35,1.35,1.3,1.45], border:{ type:"solid", color:C.line, pt:0.5 }, autoPage:false, valign:"middle", rowH:0.22, margin:[2,4,2,4] });
    addFooter(s8, monthLabel, page++, logoData);

    // ---------------- Slide 9: Forecast Accuracy YTD ----------------
    var s9 = pres.addSlide();
    addHeader(s9, "Balter Brewing Pre-Supply", "Forecast Accuracy — 2026 YTD");
    s9.addText("Target: " + A.FORECAST_TARGET_PCT + "%", { x:PAGE_W-3, y:0.2, w:2.6, h:0.3, align:"right", fontFace:"Arial", fontSize:11, italic:true, color:C.sky, margin:0 });
    var accVals = MONTHS.map(function(m,i){ return A.forecastTotals(state.forecast[i]).accuracyPct; });
    var targetVals = MONTHS.map(function(){ return A.FORECAST_TARGET_PCT; });
    s9.addChart("line", [
      { name:"Balter Forecast Accuracy", labels:MONTHS, values: accVals.map(function(v){ return v===null?null:Math.round(v*10)/10; }) },
      { name:"Target", labels:MONTHS, values: targetVals }
    ], {
      x:0.6, y:1.35, w:12.1, h:4.6,
      showTitle:false, showLegend:true, legendPos:"b",
      chartColors:[C.teal, C.purple],
      lineDataSymbol:"circle", lineSize:2.5,
      valAxisTitle:"%", showValAxisTitle:true,
      catAxisLabelColor:C.grey, valAxisLabelColor:C.grey,
      valGridLine:{ color:C.line, size:1 }, catGridLine:{ style:"none" }
    });
    s9.addShape("roundRect", { x:0.6, y:6.1, w:12.1, h:0.85, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
    s9.addText("COMMENTS", { x:0.85, y:6.2, w:4, h:0.25, fontFace:"Arial", fontSize:9.5, bold:true, color:C.grey, charSpacing:1, margin:0 });
    s9.addText(bulletParas(notes.forecastComments, { fontSize:11, color:C.ink }), { x:0.85, y:6.44, w:11.6, h:0.5, fontFace:"Arial", valign:"top", margin:0 });
    addFooter(s9, monthLabel, page++, logoData);

    // ---------------- Slide 10: SLOB ----------------
    var s10 = pres.addSlide();
    addHeader(s10, "Balter Brewing Pre-Supply", "SLOB — 2026");
    statCard(s10, 0.5, 1.5, 3.9, 1.7, "YTD", notes.slob.ytd===null?"—":"$"+fmt(notes.slob.ytd,0), null, C.purple);
    statCard(s10, 4.55, 1.5, 3.9, 1.7, "This month", notes.slob.thisMonth===null?"—":"$"+fmt(notes.slob.thisMonth,0), null, C.orange);
    statCard(s10, 8.6, 1.5, 3.9, 1.7, "Forward-risk carry-over", notes.slob.carryOver===null?"—":"$"+fmt(notes.slob.carryOver,0), null, C.bad);
    s10.addShape("roundRect", { x:0.5, y:3.45, w:12.0, h:2.95, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
    s10.addText("COMMENTS", { x:0.8, y:3.63, w:8, h:0.3, fontFace:"Arial", fontSize:11, bold:true, color:C.grey, charSpacing:1, margin:0 });
    s10.addText(bulletParas(notes.slob.comments, { fontSize:13, color:C.ink }), { x:0.8, y:4.0, w:11.4, h:2.3, fontFace:"Arial", valign:"top", margin:0, paraSpaceAfter:8 });
    addFooter(s10, monthLabel, page++, logoData);

    // ---------------- Slide 11: Value Add Program ----------------
    var s11 = pres.addSlide();
    addHeader(s11, "Balter Brewing Pre-Supply", "Value Add Program");
    var vaCards = [
      { label:"MTD", v:notes.va.mtd }, { label:"Prior month", v:notes.va.pm },
      { label:"YTD", v:notes.va.ytd }, { label:"FY forecast", v:notes.va.fyForecast }
    ];
    vaCards.forEach(function(c,i){
      statCard(s11, 0.5+i*3.13, 1.35, 2.93, 1.35, c.label, c.v===null||c.v===undefined?"—":"$"+fmt(c.v,0), null, C.teal);
    });
    if (notes.vaInitiatives.length){
      var vaHeader = ["Initiative","Category","MTD $","YTD $"].map(function(h){
        return { text:h, options:{ bold:true, color:C.paper, fill:{color:C.ink}, fontSize:9 } };
      });
      var vaRows = [vaHeader];
      notes.vaInitiatives.forEach(function(r){
        vaRows.push([
          { text:r.initiative||"", options:{ fontSize:9 } },
          { text:r.category||"", options:{ fontSize:9 } },
          { text:r.mtd===null||r.mtd===undefined||r.mtd===""?"—":"$"+fmt(r.mtd,0), options:{ fontSize:9, align:"right" } },
          { text:r.ytd===null||r.ytd===undefined||r.ytd===""?"—":"$"+fmt(r.ytd,0), options:{ fontSize:9, align:"right" } }
        ]);
      });
      s11.addTable(vaRows, { x:0.5, y:2.95, w:12.3, colW:[6.3,3.0,1.5,1.5], border:{ type:"solid", color:C.line, pt:0.5 }, autoPage:false, valign:"middle", rowH:0.28 });
    }
    var commentsY = notes.vaInitiatives.length ? (2.95 + Math.min(notes.vaInitiatives.length+1, 8)*0.28 + 0.25) : 2.95;
    var commentsH = PAGE_H - 0.65 - commentsY;
    if (commentsH > 0.6){
      s11.addShape("roundRect", { x:0.5, y:commentsY, w:12.3, h:commentsH, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
      s11.addText("COMMENTS", { x:0.8, y:commentsY+0.15, w:8, h:0.28, fontFace:"Arial", fontSize:10.5, bold:true, color:C.grey, charSpacing:1, margin:0 });
      s11.addText(bulletParas(notes.va.comments, { fontSize:12, color:C.ink }), { x:0.8, y:commentsY+0.48, w:11.7, h:commentsH-0.6, fontFace:"Arial", valign:"top", margin:0, paraSpaceAfter:6 });
    }
    addFooter(s11, monthLabel, page++, logoData);

    // ---------------- Slide 12: Next month focus ----------------
    var s12 = pres.addSlide();
    addHeader(s12, "Balter Brewing Pre-Supply", notes.nextMonthTitle || "Next Month Focus");
    s12.addShape("roundRect", { x:0.5, y:1.5, w:12.3, h:4.9, rectRadius:0.06, fill:{ color:C.wash }, line:{ color:C.line, width:0.75 } });
    s12.addText(bulletParas(notes.nextMonthNotes, { fontSize:15, color:C.ink }), { x:0.9, y:1.85, w:11.5, h:4.3, fontFace:"Arial", valign:"top", margin:0, paraSpaceAfter:10 });
    addFooter(s12, monthLabel, page++, logoData);

    // ---------------- Slide 13: Closing ----------------
    var s13 = pres.addSlide();
    s13.addShape("rect", { x:0, y:0, w:PAGE_W, h:PAGE_H, fill:{ color:C.ink } });
    s13.addShape("rect", { x:0, y:0, w:PAGE_W, h:0.14, fill:{ color:C.teal } });
    if (logoData) s13.addImage({ data:logoData, x:PAGE_W/2-0.5, y:2.9, w:1.0, h:1.0 });
    s13.addText("THANK YOU", { x:0, y:4.05, w:PAGE_W, h:0.7, align:"center", fontFace:"Arial", fontSize:32, color:C.paper, bold:true, margin:0 });

    var filename = "Balter_Pre-Supply_" + MONTHS[monthIndex] + "_2026.pptx";
    await pres.writeFile({ fileName: filename });
  }

  function kpiDefTarget(defs, key){
    var d = defs.filter(function(x){ return x.key===key; })[0];
    if (!d) return null;
    return fmtByUnit(d.target, d.unit);
  }

  window.__KPI_APP__.buildDeck = buildDeck;
})();
