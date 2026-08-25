(function(){
  "use strict";
  var A = window.__KPI_APP__;

  function num(v){ return (v === null || v === undefined || v === "" || isNaN(v)) ? null : Number(v); }
  function nz(v){ var n = num(v); return n === null ? 0 : n; }

  // % change in complaints-per-million-units between last year and current
  // year for one product category. Mirrors the old spreadsheet's IFERROR-
  // wrapped formula: division by a zero last-year rate reads back as 0
  // (matching what the sheet showed), not an error.
  function pctChange(lyC, lyU, curC, curU){
    if (!lyU || !curU) return null;
    var lyRate = (lyC / lyU) * 1e6;
    var curRate = (curC / curU) * 1e6;
    if (lyRate === 0) return 0;
    return ((curRate - lyRate) / lyRate) * 100;
  }

  // Compute every KPI's actual value for one month index (0=Jan..11=Dec).
  // `month` is { raw:{...}, cc:{ cans:{complaints,units}, draught:{complaints,units} } }
  function computeActual(month, monthIndex){
    var raw = month.raw || {};
    var cc = month.cc || { cans:{}, draught:{} };
    var ly = A.LY_CC[monthIndex];

    var cansProduced = nz(cc.cans && cc.cans.units);
    var draughtProduced = nz(cc.draught && cc.draught.units);
    var packagedVol = nz(raw.cansPkg) + nz(raw.kegsPkg); // hL

    var ccCans = pctChange(ly.cans.c, ly.cans.u, nz(cc.cans && cc.cans.complaints), num(cc.cans && cc.cans.units));
    var ccDraught = pctChange(ly.draught.c, ly.draught.u, nz(cc.draught && cc.draught.complaints), num(cc.draught && cc.draught.units));
    var ccCansBottles = (ccCans === null ? null : ccCans);
    var ccTotal = (ccCansBottles === null && ccDraught === null) ? null : (nz(ccCansBottles) + nz(ccDraught));

    var controllableComplaints = num(cc.cans && cc.cans.complaints);
    var cansUnits = num(cc.cans && cc.cans.units);
    var controllableRatio = cansUnits ? (nz(controllableComplaints) * 1e8) / (cansUnits * 0.375) : null;

    var kegReturns = num(cc.draught && cc.draught.complaints);
    var draughtUnits = num(cc.draught && cc.draught.units);
    var kegReturnsRatio = draughtUnits ? (nz(kegReturns) * 1e8) / (draughtUnits * 49.5) : null;

    var totalComplaintsRatio = (cansUnits || draughtUnits)
      ? ((nz(controllableComplaints) + nz(kegReturns)) * 1e8) / (nz(cansUnits) * 0.375 + nz(draughtUnits) * 49.5)
      : null;

    var sensory = num(raw.sensoryTasters) ? nz(raw.sensoryScore) / num(raw.sensoryTasters) : null;

    var waterPerHL = packagedVol ? (nz(raw.water) * 10) / packagedVol : null;
    var co2PerHL = packagedVol ? nz(raw.co2) / packagedVol : null;
    var fuelPerHL = packagedVol ? (nz(raw.gas) * 38.3) / packagedVol : null;
    var elecPerHL = packagedVol ? nz(raw.elec) / packagedVol : null;

    var extractLossPct = num(raw.extractProcessed) ? (nz(raw.extractLoss) / num(raw.extractProcessed)) * 100 : null;
    var planAttainmentPct = num(raw.plannedVolume) ? (1 - (nz(raw.variance) / num(raw.plannedVolume))) * 100 : null;

    var packagedProduced = cansProduced; // bottles always 0 for this brewery
    var packagedConsumed = num(raw.cansConsumed);
    var totalPackageLossPct = packagedConsumed ? (1 - (packagedProduced / packagedConsumed)) * 100 : null;

    var canLoad = num(raw.canLoad), kegLoad = num(raw.kegLoad);
    var loadSum = nz(canLoad) + nz(kegLoad);
    var aggME = loadSum ? (nz(raw.canME) * nz(canLoad) + nz(raw.kegME) * nz(kegLoad)) / loadSum : null;
    var aggUFE = loadSum ? (nz(raw.canUFE) * nz(canLoad) + nz(raw.kegUFE) * nz(kegLoad)) / loadSum : null;

    return {
      packagedVol: packagedVol || null,
      cansProduced: cansProduced || null,
      draughtProduced: draughtProduced || null,
      micro: num(raw.micro),
      physChem: num(raw.physChem),
      sensory: sensory,
      ccCansBottles: ccCansBottles,
      ccKegs: ccDraught,
      ccTotal: ccTotal,
      controllableRatio: controllableRatio,
      controllableComplaints: controllableComplaints,
      kegReturnsRatio: kegReturnsRatio,
      kegReturns: kegReturns,
      totalComplaintsRatio: totalComplaintsRatio,
      costOfQuality: num(raw.costOfQuality),
      waterPerHL: waterPerHL,
      co2PerHL: co2PerHL,
      fuelPerHL: fuelPerHL,
      elecPerHL: elecPerHL,
      extractLossPct: extractLossPct,
      totalPackageLossPct: totalPackageLossPct,
      planAttainmentPct: planAttainmentPct,
      aggME: aggME,
      aggUFE: aggUFE,
      canME: num(raw.canME),
      canUFE: num(raw.canUFE),
      kegME: num(raw.kegME),
      kegUFE: num(raw.kegUFE)
    };
  }

  // YTD = running average of monthly actuals from Jan through monthIndex,
  // skipping months with no value for that KPI (mirrors the old workbook's
  // KPI - YTD tab, which averages rather than accumulates).
  function computeYTD(monthsArr, monthIndex, key){
    var vals = [];
    for (var i = 0; i <= monthIndex; i++){
      var a = computeActual(monthsArr[i], i);
      if (a[key] !== null && a[key] !== undefined && !isNaN(a[key])) vals.push(a[key]);
    }
    if (!vals.length) return null;
    var sum = vals.reduce(function(a,b){ return a+b; }, 0);
    return sum / vals.length;
  }

  window.__KPI_APP__.computeActual = computeActual;
  window.__KPI_APP__.computeYTD = computeYTD;
})();
