(function(){
  "use strict";
  var MONTHS = window.__KPI_APP__.MONTHS;

  // =========================================================================
  // Production Plan Attainment — one flexible SKU list per month (hL Planned
  // vs Produced, straight from NetSuite). Seeded Jan–Jul 2026 from the old
  // workbook; Aug onward starts empty for live entry / paste-in from NetSuite.
  // =========================================================================

  var SEED_PRODUCTION = [
    [ // January
      { sku: "CPT : CPT Case 375ml", planned: 1179, produced: 1250 },
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 885.1, produced: 862.3 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 2603.1, produced: 2561.9 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 142.6, produced: 142.6 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 120, produced: 120.9 },
      { sku: "GB WINDJAMMER : GB Windjammer Case 375ml", planned: 0, produced: 0 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 486.6, produced: 484.6 },
      { sku: "HAZY : HAZY Case 375ml", planned: 612, produced: 626.2 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 15.8, produced: 16.3 },
      { sku: "IPA : IPA Case 375ml", planned: 439.8, produced: 433.8 },
      { sku: "LAGER : LAGER Balter Steel Keg", planned: 138.6, produced: 136.6 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 251.5, produced: 254.9 },
      { sku: "XPA : XPA Case 375ml", planned: 4289.4, produced: 4284.7 },
      { sku: "LR: Red Hot Moon - 49.5L Keg", planned: 4.95, produced: 4.95 },
      { sku: "LR : Dolcita Lager - 49.5L Keg", planned: 30.195, produced: 30.195 },
    ],
    [ // February
      { sku: "CPT : CPT Balter Steel Keg", planned: 173.3, produced: 176.2 },
      { sku: "CPT : CPT Case 375ml", planned: 834, produced: 854.8 },
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 532.1, produced: 529.2 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 1242, produced: 1250.3 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 168.3, produced: 160.9 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 114, produced: 118.6 },
      { sku: "GB WINDJAMMER : GB Windjammer Case 375ml", planned: 0, produced: 0 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 222.8, produced: 223.7 },
      { sku: "HAZY : HAZY Case 375ml", planned: 633, produced: 636.2 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 23.8, produced: 23.8 },
      { sku: "IPA : IPA Case 375ml", planned: 168, produced: 167 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 270.3, produced: 277.7 },
      { sku: "XPA : XPA Case 375ml", planned: 2586, produced: 2587.4 },
      { sku: "LR:  Amber Ale 2026 - 49.5L Keg", planned: 2.97, produced: 2.97 },
      { sku: "LR: Bump City - 49.5L Keg", planned: 4.95, produced: 4.95 },
      { sku: "LR: Goldfinger - 49.5L Keg", planned: 4.455, produced: 4.455 },
      { sku: "LR: Heat Seeker - 49.5L Keg", planned: 3.465, produced: 3.465 },
    ],
    [ // March
      { sku: "CPT : CPT Balter Steel Keg", planned: 356.4, produced: 376.2 },
      { sku: "CPT : CPT Case 375ml", planned: 899.8, produced: 872 },
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 930.6, produced: 907.9 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 1104, produced: 1114.1 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 120.3, produced: 120.3 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 150, produced: 149.6 },
      { sku: "GB WINDJAMMER : GB Windjammer Case 375ml", planned: 282, produced: 279.2 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 539.6, produced: 525.7 },
      { sku: "HAZY : HAZY Case 375ml", planned: 550.8, produced: 557.3 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 15.8, produced: 15.8 },
      { sku: "IPA : IPA Case 375ml", planned: 311.5, produced: 310.8 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 173.3, produced: 173.7 },
      { sku: "XPA : XPA Case 375ml", planned: 4196.7, produced: 4175.2 },
      { sku: "LR: Black Lager 4.9% 49.5L Keg", planned: 297, produced: 300.5 },
      { sku: "LR: Bump City (WC PILS) - 49.5L Keg", planned: 89.1, produced: 88.6 },
      { sku: "LR: Cirrostratus - Case 375ml", planned: 162, produced: 167 },
      { sku: "LR: Cirrostratus 49.5L Keg", planned: 74.3, produced: 74.3 },
      { sku: "LR: Dolcita Lager - 49.5L Keg", planned: 39.6, produced: 38.1 },
      { sku: "LR: Parrotdog NZ XPA - Case 375ml", planned: 27, produced: 25.2 },
      { sku: "LR: IIIPA 2025 49.5L Keg", planned: 2.97, produced: 2.97 },
      { sku: "LR: La to the Bay - 49.5L Keg", planned: 4.455, produced: 4.455 },
      { sku: "LR: Pale Ale Low Alc - 49.5L Keg", planned: 5.445, produced: 5.445 },
    ],
    [ // April
      { sku: "CPT : CPT Balter Steel Keg", planned: 232.7, produced: 234.1 },
      { sku: "CPT : CPT Case 375ml", planned: 720, produced: 694.6 },
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 524.7, produced: 520.7 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 1548, produced: 1547 },
      { sku: "GB SUBTROPIC : GB SUBTROPIC 49.5L Keg", planned: 13.4, produced: 13.4 },
      { sku: "GB SUBTROPIC : GB Subtropic Case 375ml", planned: 123, produced: 123.3 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 113.9, produced: 115.8 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 174, produced: 171.5 },
      { sku: "GB WINDJAMMER : GB Windjammer Case 375ml", planned: 0, produced: 0 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 223.7, produced: 215.8 },
      { sku: "HAZY : HAZY Case 375ml", planned: 660, produced: 665.9 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 23.8, produced: 24.3 },
      { sku: "IPA : IPA Case 375ml", planned: 236.4, produced: 233.7 },
      { sku: "LAGER : LAGER Balter Steel Keg", planned: 69.3, produced: 70.3 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 421.7, produced: 432.6 },
      { sku: "XPA : XPA Case 375ml", planned: 4258.2, produced: 4282.7 },
      { sku: "LR: BLACKLAGER : Black Lager 49.5L Keg", planned: 94.1, produced: 94.5 },
      { sku: "LR: Frank - Pilot : Frank - Pilot 49.5L Keg", planned: 4.455, produced: 4.455 },
      { sku: "LR: Frank - Pilot : Prysma-Delic - Pilot 49.5L Keg", planned: 4.455, produced: 4.455 },
    ],
    [ // May
      { sku: "CPT : CPT Balter Steel Keg", planned: 371.3, produced: 374.2 },
      { sku: "CPT : CPT Case 375ml", planned: 840, produced: 826.9 },
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 775.2, produced: 773.2 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 2235, produced: 2335.4 },
      { sku: "GB SUBTROPIC : GB SUBTROPIC 49.5L Keg", planned: 17.8, produced: null },
      { sku: "GB SUBTROPIC : GB Subtropic Case 375ml", planned: 51, produced: 45.2 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 111.4, produced: 111.4 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 177, produced: 178.7 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 311.9, produced: 315.3 },
      { sku: "HAZY : HAZY Case 375ml", planned: 522, produced: 518.7 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 47.5, produced: 48.5 },
      { sku: "IPA : IPA Case 375ml", planned: 349.2, produced: 344.6 },
      { sku: "LAGER : LAGER Balter Steel Keg", planned: 69.3, produced: 70.8 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 182.2, produced: 183.6 },
      { sku: "XPA : XPA Case 375ml", planned: 3560.3, produced: 3489 },
      { sku: "BLACKLAGER : Black Lager 49.5L Keg", planned: 372.2, produced: 381.2 },
    ],
    [ // June
      { sku: "CPT : CPT Balter Steel Keg", planned: 205, produced: 202.95 },
      { sku: "CPT : CPT Case 375ml", planned: 1171.2, produced: 1152 },
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 516, produced: 510.84 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 1360.3, produced: 1338 },
      { sku: "GB SUBTROPIC : GB Subtropic Case 375ml", planned: 141.459, produced: 139.14 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 144, produced: 142.56 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 152.5, produced: 150 },
      { sku: "GB WINDJAMMER : GB Windjammer Case 375ml", planned: 286.7, produced: 282 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 350, produced: 346.5 },
      { sku: "HAZY : HAZY Case 375ml", planned: 754.509, produced: 742.14 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 16, produced: 15.84 },
      { sku: "IPA : IPA Case 375ml", planned: 322.69, produced: 317.4 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 274, produced: 271.26 },
      { sku: "XPA : XPA Case 375ml", planned: 4587.2, produced: 4512 },
      { sku: "BLACKLAGER : Black Lager 49.5L Keg", planned: 376, produced: 372.24 },
    ],
    [ // July
      { sku: "EAZYHAZY : Eazy Hazy Balter Steel Keg", planned: 959.31, produced: 926.64 },
      { sku: "CPT : CPT Balter Steel Keg", planned: 222.75, produced: 227.205 },
      { sku: "LAGER : LAGER Balter Steel Keg", planned: 71.775, produced: 83.655 },
      { sku: "BLACKLAGER : Black Lager 49.5L Keg", planned: 287.1, produced: 284.13 },
      { sku: "HAZY : HAZY Balter Steel Keg", planned: 247.5, produced: 249.48 },
      { sku: "IPA : IPA Balter Steel Keg", planned: 39.6, produced: 46.035 },
      { sku: "XPA : XPA Balter Steel Keg", planned: 101.97, produced: 102.465 },
      { sku: "GB WAYFARER : GB Wayfarer 49.5L Keg", planned: 147.015, produced: 148.5 },
      { sku: "GB SUBTROPIC : GB SUBTROPIC 49.5L Keg", planned: 22.275, produced: 22.28 },
      { sku: "EAZYHAZY : Eazy Hazy Case 375ml", planned: 2637.152, produced: 2681.499 },
      { sku: "BLACKLAGER : Black Lager - Case 375ml", planned: 219.6, produced: 232.044 },
      { sku: "CPT : CPT Case 375ml", planned: 808.921, produced: 776.591 },
      { sku: "GB SUBTROPIC : GB Subtropic Case 375ml", planned: 173.24, produced: 163.358 },
      { sku: "HAZY : HAZY Case 375ml", planned: 656.482, produced: 633.546 },
      { sku: "IPA : IPA Case 375ml", planned: 386.13, produced: 329.4 },
      { sku: "LPA : LPA - Case 375ml", planned: 460.55, produced: 468.541 },
      { sku: "XPA : XPA Case 375ml", planned: 3661.952, produced: 3410.876 },
      { sku: "GB WAYFARER : GB Wayfarer Case 375ml", planned: 122, produced: 116.51 },
    ],
  ];
  function buildSeedProduction(){
    var out = [];
    for (var i=0;i<12;i++){
      out.push({ skus: (SEED_PRODUCTION[i] || []).map(function(r){ return { sku:r.sku, planned:r.planned, produced:r.produced }; }) });
    }
    return out;
  }

  function productionTotals(monthState){
    var skus = monthState.skus || [];
    var sumPlanned = 0, sumProduced = 0, sumAbsDiff = 0, any = false;
    skus.forEach(function(row){
      var p = row.planned, pr = row.produced;
      if (p === null || p === undefined || isNaN(p)) return;
      any = true;
      sumPlanned += Number(p);
      if (pr !== null && pr !== undefined && !isNaN(pr)){
        sumProduced += Number(pr);
        sumAbsDiff += Math.abs(Number(pr) - Number(p));
      }
    });
    var attainment = sumPlanned ? (1 - sumAbsDiff/sumPlanned) * 100 : null;
    return { planned: any ? sumPlanned : null, produced: any ? sumProduced : null, diff: any ? (sumProduced-sumPlanned) : null, absDiff: any ? sumAbsDiff : null, attainmentPct: attainment };
  }

  // =========================================================================
  // Forecast Accuracy — fixed set of product/package categories (Planned vs
  // Sold), plus an independently-tracked Litres total. Seeded Jan–Jun 2026
  // (July onward had no actuals yet in the old workbook); Jul–Dec start
  // empty here for live entry.
  //
  // NOTE: the headline "Forecast Accuracy" % below is 1 − (sum of each
  // category's |Sold − Planned| ÷ sum of each category's Planned), computed
  // in each category's own unit (cases, kegs, etc). The legacy workbook blended
  // these with unlisted unit-conversion factors into one figure that can't be
  // reverse-engineered from the file alone — if exact parity with the old
  // "Actual Forecast Accuracy" row matters, share the case/keg/bottle→litre
  // conversion factors and this can be tightened to match exactly.
  // =========================================================================

  var FORECAST_CATEGORIES = ["XPA TANK BEER", "XPA PACK", "XPA KEG", "LAGER PACK", "LAGER KEG", "LR - PACK", "LR - KEG", "CPT - PACK", "CPT - KEG", "EAZY HAZY PACK", "EAZY HAZY KEG", "HAZY PACK", "HAZY KEG", "IPA PACK", "IPA KEG", "CERVEZA BOTTLE", "CERVEZA CAN"];

  var SEED_FORECAST = [
    { // Jan - Forecast Accuracy
      litres: { planned: 1668046.86, sold: 1505637 },
      cats: [
        { planned: 6000, sold: 3990 }, // XPA TANK BEER
        { planned: 77915, sold: 60237 }, // XPA PACK
        { planned: 13693, sold: 13484 }, // XPA KEG
        { planned: 0, sold: 0 }, // LAGER PACK
        { planned: 101, sold: 102 }, // LAGER KEG
        { planned: 0, sold: -297 }, // LR - PACK
        { planned: 41, sold: 55 }, // LR - KEG
        { planned: 19055, sold: 14861 }, // CPT - PACK
        { planned: 630, sold: 589 }, // CPT - KEG
        { planned: 26033, sold: 25186 }, // EAZY HAZY PACK
        { planned: 1162, sold: 1159 }, // EAZY HAZY KEG
        { planned: 11247, sold: 12242 }, // HAZY PACK
        { planned: 691, sold: 634 }, // HAZY KEG
        { planned: 6701, sold: 5108 }, // IPA PACK
        { planned: 51, sold: 29 }, // IPA KEG
        { planned: 543, sold: 300 }, // CERVEZA BOTTLE
        { planned: 161, sold: 55 }, // CERVEZA CAN
      ]
    },
    { // Feb - Forecast Accuracy
      litres: { planned: 1442447.98, sold: 1252877.14 },
      cats: [
        { planned: 5500, sold: 4750 }, // XPA TANK BEER
        { planned: 62894, sold: 47177 }, // XPA PACK
        { planned: 12049, sold: 12252 }, // XPA KEG
        { planned: 0, sold: 0 }, // LAGER PACK
        { planned: 107, sold: 70 }, // LAGER KEG
        { planned: 0, sold: 199 }, // LR - PACK
        { planned: 31, sold: 29 }, // LR - KEG
        { planned: 15403, sold: 10856 }, // CPT - PACK
        { planned: 561, sold: 490 }, // CPT - KEG
        { planned: 25347, sold: 17695 }, // EAZY HAZY PACK
        { planned: 955, sold: 1157 }, // EAZY HAZY KEG
        { planned: 9342, sold: 7725 }, // HAZY PACK
        { planned: 661, sold: 530 }, // HAZY KEG
        { planned: 6334, sold: 3518 }, // IPA PACK
        { planned: 71, sold: 43 }, // IPA KEG
        { planned: 474, sold: 282 }, // CERVEZA BOTTLE
        { planned: 273, sold: 160 }, // CERVEZA CAN
      ]
    },
    { // Mar - Forecast Accuracy
      litres: { planned: 1506609.66, sold: 1810044.32 },
      cats: [
        { planned: 3000, sold: 5000 }, // XPA TANK BEER
        { planned: 65712, sold: 75949 }, // XPA PACK
        { planned: 13406, sold: 15518 }, // XPA KEG
        { planned: 0, sold: 0 }, // LAGER PACK
        { planned: 94, sold: 94 }, // LAGER KEG
        { planned: 0, sold: 3384 }, // LR - PACK
        { planned: 43, sold: 123 }, // LR - KEG
        { planned: 14637, sold: 18158 }, // CPT - PACK
        { planned: 680, sold: 675 }, // CPT - KEG
        { planned: 19303, sold: 31498 }, // EAZY HAZY PACK
        { planned: 1198, sold: 1559 }, // EAZY HAZY KEG
        { planned: 10681, sold: 11593 }, // HAZY PACK
        { planned: 731, sold: 672 }, // HAZY KEG
        { planned: 5673, sold: 5377 }, // IPA PACK
        { planned: 61, sold: 61 }, // IPA KEG
        { planned: 433, sold: 291 }, // CERVEZA BOTTLE
        { planned: 149, sold: 118 }, // CERVEZA CAN
      ]
    },
    { // Apr - Forecast Accuracy
      litres: { planned: 1777822.32, sold: 1653128.36 },
      cats: [
        { planned: 7050, sold: 7100 }, // XPA TANK BEER
        { planned: 65666, sold: 72511 }, // XPA PACK
        { planned: 16943, sold: 14032 }, // XPA KEG
        { planned: 0, sold: 0 }, // LAGER PACK
        { planned: 124, sold: 78 }, // LAGER KEG
        { planned: 0, sold: 53 }, // LR - PACK
        { planned: 99, sold: 677 }, // LR - KEG
        { planned: 15480, sold: 13789 }, // CPT - PACK
        { planned: 685, sold: 541 }, // CPT - KEG
        { planned: 28727, sold: 31200 }, // EAZY HAZY PACK
        { planned: 1517, sold: 1292 }, // EAZY HAZY KEG
        { planned: 11695, sold: 9539 }, // HAZY PACK
        { planned: 734, sold: 557 }, // HAZY KEG
        { planned: 6352, sold: 4727 }, // IPA PACK
        { planned: 54, sold: 47 }, // IPA KEG
        { planned: 516, sold: 193 }, // CERVEZA BOTTLE
        { planned: 126, sold: 98 }, // CERVEZA CAN
      ]
    },
    { // May - Forecast Accuracy
      litres: { planned: 1470525.84, sold: 1464576 },
      cats: [
        { planned: 4350, sold: 4750 }, // XPA TANK BEER
        { planned: 57737, sold: 56578 }, // XPA PACK
        { planned: 13375, sold: 12633 }, // XPA KEG
        { planned: 0, sold: 0 }, // LAGER PACK
        { planned: 101, sold: 94 }, // LAGER KEG
        { planned: 46, sold: 18 }, // LR - PACK
        { planned: 94, sold: 636 }, // LR - KEG
        { planned: 14634, sold: 12964 }, // CPT - PACK
        { planned: 541, sold: 461 }, // CPT - KEG
        { planned: 23291, sold: 27849 }, // EAZY HAZY PACK
        { planned: 1162, sold: 1259 }, // EAZY HAZY KEG
        { planned: 10399, sold: 8956 }, // HAZY PACK
        { planned: 630, sold: 757 }, // HAZY KEG
        { planned: 5830, sold: 5371 }, // IPA PACK
        { planned: 55, sold: 53 }, // IPA KEG
        { planned: 417, sold: 175 }, // CERVEZA BOTTLE
        { planned: 120, sold: 135 }, // CERVEZA CAN
      ]
    },
    { // Jun - Forecast Accuracy
      litres: { planned: 1496736.84, sold: 1554382 },
      cats: [
        { planned: 4125, sold: 3250 }, // XPA TANK BEER
        { planned: 59588, sold: 67130 }, // XPA PACK
        { planned: 13046, sold: 14111 }, // XPA KEG
        { planned: 0, sold: 0 }, // LAGER PACK
        { planned: 93, sold: 85 }, // LAGER KEG
        { planned: 18, sold: 0 }, // LR - PACK
        { planned: 770, sold: 740 }, // LR - KEG
        { planned: 14210, sold: 13622 }, // CPT - PACK
        { planned: 545, sold: 530 }, // CPT - KEG
        { planned: 23200, sold: 19235 }, // EAZY HAZY PACK
        { planned: 1248, sold: 1293 }, // EAZY HAZY KEG
        { planned: 9846, sold: 10025 }, // HAZY PACK
        { planned: 634, sold: 561 }, // HAZY KEG
        { planned: 6096, sold: 4996 }, // IPA PACK
        { planned: 50, sold: 34 }, // IPA KEG
        { planned: 292, sold: 151 }, // CERVEZA BOTTLE
        { planned: 141, sold: 86 }, // CERVEZA CAN
      ]
    },
  ];
  var FORECAST_TARGET_PCT = 80; // flat 80% budget target across all months (from KPI - BU-style "Budget Forecast Accuracy")

  function buildSeedForecast(){
    var out = [];
    for (var i=0;i<12;i++){
      var seed = SEED_FORECAST[i];
      if (seed){
        out.push({
          litres: { planned: seed.litres.planned, sold: seed.litres.sold },
          cats: FORECAST_CATEGORIES.map(function(name, idx){
            var c = seed.cats[idx];
            return { name: name, planned: c.planned, sold: c.sold };
          })
        });
      } else {
        out.push({
          litres: { planned: null, sold: null },
          cats: FORECAST_CATEGORIES.map(function(name){ return { name:name, planned:null, sold:null }; })
        });
      }
    }
    return out;
  }

  function forecastTotals(monthState){
    var cats = monthState.cats || [];
    var sumPlanned = 0, sumAbsDiff = 0, any = false;
    cats.forEach(function(row){
      var p = row.planned, s = row.sold;
      if (p === null || p === undefined || isNaN(p)) return;
      any = true;
      sumPlanned += Number(p);
      if (s !== null && s !== undefined && !isNaN(s)){
        sumAbsDiff += Math.abs(Number(s) - Number(p));
      }
    });
    var accuracyPct = sumPlanned ? (1 - sumAbsDiff/sumPlanned) * 100 : null;
    var pack = 0, keg = 0, packAny=false, kegAny=false;
    cats.forEach(function(row){
      if (row.planned === null || row.sold === null || row.planned === undefined || row.sold === undefined) return;
      if (/PACK/.test(row.name)){ pack += Number(row.sold); packAny = true; }
      if (/KEG/.test(row.name)){ keg += Number(row.sold); kegAny = true; }
    });
    return { accuracyPct: accuracyPct, sumPlanned: any ? sumPlanned : null, sumAbsDiff: any ? sumAbsDiff : null, packSold: packAny?pack:null, kegSold: kegAny?keg:null };
  }

  window.__KPI_APP__.buildSeedProduction = buildSeedProduction;
  window.__KPI_APP__.productionTotals = productionTotals;
  window.__KPI_APP__.FORECAST_CATEGORIES = FORECAST_CATEGORIES;
  window.__KPI_APP__.buildSeedForecast = buildSeedForecast;
  window.__KPI_APP__.forecastTotals = forecastTotals;
  window.__KPI_APP__.FORECAST_TARGET_PCT = FORECAST_TARGET_PCT;
})();
