(function(){
  "use strict";

  // =========================================================================
  // Constants: months, owners, raw metrics, KPI definitions
  // =========================================================================

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  var OWNERS = [
    { code:"BG",    name:"Brett Griffiths" },
    { code:"TB&MG", name:"Tim & Flash" },
    { code:"MM",    name:"Manny Martins" },
    { code:"PK",    name:"Patrick Kerr" },
    { code:"CM&RH", name:"Cal & Razor" },
    { code:"JB",    name:"James Belsey" },
    { code:"PB",    name:"Paul Bailey" },
    { code:"HL&RK", name:"Harry & Ryan" }
  ];

  // Raw, department-entered inputs. Grouped the same way as the old
  // spreadsheet's Raw Data tab (General / Quality / Utilities / Efficiency).
  // "Total Cans/Kegs Produced" are deliberately NOT here — they're the same
  // numbers entered once on the Complaints tab (Units Produced), so we read
  // them from there instead of asking anyone to type them twice.
  var RAW_METRICS = [
    { id:"cansPkg",  type:"General",    name:"Total Volume Packaged — Cans", unit:"hL", owner:"CM&RH" },
    { id:"kegsPkg",  type:"General",    name:"Total Volume Packaged — Kegs", unit:"hL", owner:"CM&RH" },

    { id:"physChem",  type:"Quality", name:"Phys Chem",                       unit:"%", owner:"PK", pct:true },
    { id:"micro",     type:"Quality", name:"Micro",                           unit:"%", owner:"PK", pct:true },
    { id:"sensoryScore",   type:"Quality", name:"Sensory — Score Total",      unit:"#", owner:"PK" },
    { id:"sensoryTasters", type:"Quality", name:"Sensory — Total # of Tasters", unit:"#", owner:"PK" },
    { id:"costOfQuality",  type:"Quality", name:"Cost of Quality",            unit:"$", owner:"PK" },

    { id:"water", type:"Utilities", name:"Water Consumption",             unit:"m³",  owner:"HL&RK" },
    { id:"co2",   type:"Utilities", name:"CO₂ Consumption",               unit:"kg",  owner:"HL&RK" },
    { id:"gas",   type:"Utilities", name:"Natural Gas Consumption",       unit:"m³",  owner:"HL&RK" },
    { id:"elec",  type:"Utilities", name:"Electrical Consumption",        unit:"kWh", owner:"HL&RK" },

    { id:"extractLoss",      type:"Efficiency", name:"Extract Loss",               unit:"kg", owner:"TB&MG" },
    { id:"extractProcessed", type:"Efficiency", name:"Extract Processed",          unit:"kg", owner:"TB&MG" },
    { id:"plannedVolume",    type:"Efficiency", name:"Planned Volume",             unit:"hL", owner:"PB" },
    { id:"variance",         type:"Efficiency", name:"Aggregated Absolute Variance from Planned Volume", unit:"hL", owner:"PB" },
    { id:"cansConsumed",     type:"Efficiency", name:"Total Cans Consumed",        unit:"#",  owner:"CM&RH" },
    { id:"canME",   type:"Efficiency", name:"Can Line — ME (machine efficiency)",  unit:"%", owner:"CM&RH", pct:true },
    { id:"canUFE",  type:"Efficiency", name:"Can Line — UFE",                      unit:"%", owner:"CM&RH", pct:true },
    { id:"canLoad", type:"Efficiency", name:"Can Line — Loading Time",             unit:"%", owner:"CM&RH", pct:true },
    { id:"kegME",   type:"Efficiency", name:"Keg Line — ME",                       unit:"%", owner:"CM&RH", pct:true },
    { id:"kegUFE",  type:"Efficiency", name:"Keg Line — UFE",                      unit:"%", owner:"CM&RH", pct:true },
    { id:"kegLoad", type:"Efficiency", name:"Keg Line — Loading Time",             unit:"%", owner:"CM&RH", pct:true }
  ];
  var TYPE_ORDER = ["General","Quality","Utilities","Efficiency"];

  function ownerName(code){
    var o = OWNERS.filter(function(x){ return x.code === code; })[0];
    return o ? o.name : code;
  }
  function metricsByType(type){ return RAW_METRICS.filter(function(m){ return m.type === type; }); }

  // ---- Last-year consumer complaints baseline (fixed, imported from the
  // old spreadsheet's "Raw Data CC" tab — this doesn't change month to month
  // going forward, so it isn't part of editable state). ----
  var LY_CC = [
    { cans:{ c:32, u:2313840 }, draught:{ c:0, u:5268 } }, // Jan
    { cans:{ c:5,  u:1780768 }, draught:{ c:0, u:7892 } }, // Feb
    { cans:{ c:10, u:2073840 }, draught:{ c:0, u:6405 } }, // Mar
    { cans:{ c:11, u:2366240 }, draught:{ c:0, u:6185 } }, // Apr
    { cans:{ c:13, u:1896976 }, draught:{ c:0, u:5959 } }, // May
    { cans:{ c:8,  u:2002128 }, draught:{ c:0, u:3198 } }, // Jun
    { cans:{ c:8,  u:1725728 }, draught:{ c:0, u:2763 } }, // Jul
    { cans:{ c:4,  u:2671616 }, draught:{ c:0, u:4208 } }, // Aug
    { cans:{ c:3,  u:2666592 }, draught:{ c:0, u:3947 } }, // Sep
    { cans:{ c:5,  u:2605536 }, draught:{ c:0, u:4844 } }, // Oct
    { cans:{ c:5,  u:3248544 }, draught:{ c:0, u:4128 } }, // Nov
    { cans:{ c:5,  u:3087296 }, draught:{ c:0, u:3774 } }  // Dec
  ];

  // ---- KPI targets (from the old spreadsheet's "KPI - BU" tab). Percentages
  // are stored here on a 0–100 scale to match how raw % fields are entered. ----
  var KPI_DEFS = [
    { key:"micro",         type:"Quality", label:"Micro",                              unit:"%",       target:72.41,  better:"high" },
    { key:"physChem",      type:"Quality", label:"Phys Chem",                          unit:"%",       target:65,     better:"high" },
    { key:"sensory",       type:"Quality", label:"Sensory",                            unit:"score",   target:7.5,    better:"high" },
    { key:"ccCansBottles", type:"Quality", label:"Consumer Complaints (Cans & Bottles)", unit:"% chg",  target:322,    better:"low" },
    { key:"ccKegs",        type:"Quality", label:"Consumer Complaints (Kegs)",          unit:"% chg",  target:0.083,  better:"low" },
    { key:"ccTotal",       type:"Quality", label:"Consumer Complaints (Total)",         unit:"% chg",  target:322.083, better:"low" },
    { key:"controllableRatio", type:"Quality", label:"Controllable Complaints Ratio",   unit:"PPM/hL", target:627.76, better:"low" },
    { key:"controllableComplaints", type:"Quality", label:"Controllable Complaints",    unit:"#",      target:5.083,  better:"low" },
    { key:"kegReturnsRatio", type:"Quality", label:"Keg Returns Ratio",                 unit:"PPM/hL", target:33.06,  better:"low" },
    { key:"kegReturns",    type:"Quality", label:"Keg Returns",                        unit:"#",       target:0.083,  better:"low" },
    { key:"totalComplaintsRatio", type:"Quality", label:"Consumer Complaints Ratio (Total)", unit:"PPM/hL", target:665.903, better:"low" },
    { key:"costOfQuality", type:"Quality", label:"Cost of Quality",                    unit:"$",       target:22700,  better:"low" },

    { key:"waterPerHL", type:"Utilities", label:"Water Consumption",     unit:"hL/hL",  target:5.28,   better:"low" },
    { key:"co2PerHL",   type:"Utilities", label:"CO₂ Consumption",      unit:"kg/hL",  target:4.96,   better:"low" },
    { key:"fuelPerHL",  type:"Utilities", label:"Purchased Fuel Consumption", unit:"MJ/hL", target:147.35, better:"low" },
    { key:"elecPerHL",  type:"Utilities", label:"Electrical Consumption", unit:"kWh/hL", target:12.9,  better:"low" },

    { key:"extractLossPct",     type:"Efficiency", label:"Extract Loss",              unit:"%", target:17.96, better:"low" },
    { key:"totalPackageLossPct", type:"Efficiency", label:"Total Package Loss",       unit:"%", target:0.98,  better:"low" },
    { key:"planAttainmentPct",  type:"Efficiency", label:"Plan Attainment",           unit:"%", target:95,    better:"high" },
    { key:"aggME",  type:"Efficiency", label:"Packaging ME — Aggregated",  unit:"%", target:85, better:"high" },
    { key:"aggUFE", type:"Efficiency", label:"Packaging UFE — Aggregated", unit:"%", target:50, better:"high" },
    { key:"canME",  type:"Efficiency", label:"Can Line ME",                unit:"%", target:90, better:"high" },
    { key:"canUFE", type:"Efficiency", label:"Can Line UFE",               unit:"%", target:50, better:"high" },
    { key:"kegME",  type:"Efficiency", label:"Keg Line ME",                unit:"%", target:80, better:"high" },
    { key:"kegUFE", type:"Efficiency", label:"Keg Line UFE",               unit:"%", target:50, better:"high" }
  ];

  var HERO_KEYS = ["planAttainmentPct","totalComplaintsRatio","extractLossPct","aggME"];

  // ---- Seed data: Jan–Jul 2026 actuals, imported from the old spreadsheet so
  // trends/dashboard have real numbers from day one. Aug–Dec start blank. ----
  var SEED_RAW = {
    cansPkg:  [9277,5614,7650,7719,7738.5,8564,8668],
    kegsPkg:  [2279,1407,2635,1731,2293.83,1982,2118],
    physChem: [75.74,61.37,61.58,62,76.76,68.1,60.02],
    micro:    [77.79,91.98,75.74,65,72.49,62,68.89],
    sensoryScore:   [2136,1135,1742,1666,1100.5,1643,1800.5],
    sensoryTasters: [277,148,231,215,142,215,232],
    costOfQuality:  [0,0,0,0,null,null,null],
    water: [5864,5864,5864,5759,5759,5759,null],
    co2:   [42140,44600,49920,75220,49790,69722,81717],
    gas:   [42061,39909,36446,41442,41837,39817,null],
    elec:  [164088.4093,135769.3253,149959.2393,130692,139351,130120,129463],
    extractLoss:      [35688.329373,17295.15,28354.86,28325.25,23555.536527,29586.56,39877.35],
    extractProcessed: [160795.00056,94172.78,136961.96,133148.17,132714.6606,151536.06,170998.86],
    plannedVolume: [11198.65,6983.44,10332.67,9445.81,9993.3,10660.9,11225.32],
    variance:      [168.7,38.2,138.9,90.3,239.2,207.3,505.6],
    cansConsumed:  [2495144,1510139,2058597,2077615,2082326,2300456,2332494],
    canME:   [95.57,93.43,90.88,93.72,93.86,90.97,89.37],
    canUFE:  [59.64,55.22,50.47,54.6,53.83,55.14,46.14],
    canLoad: [100,100,100,100,100,100,100],
    kegME:   [85.93,76.79,79.96,82.58,84.44,86.48,91.49],
    kegUFE:  [43.7,49.5,44.83,46.02,46.2,48.62,43.82],
    kegLoad: [100,100,100,100,100,100,100]
  };
  var SEED_CC = {
    cansComplaints:    [6,4,10,4,2,1,0],
    cansUnits:         [2473888,1497152,2040080,2058336,2063600,2283696,2311408],
    draughtComplaints: [0,1,0,1,0,0,0],
    draughtUnits:      [4604,2843,5323,3496,4634,4005,4279]
  };

  function buildSeedMonths(){
    return MONTHS.map(function(m, i){
      var raw = {};
      RAW_METRICS.forEach(function(def){
        var arr = SEED_RAW[def.id];
        raw[def.id] = (arr && i < arr.length) ? arr[i] : null;
      });
      var cc = {
        cans:    { complaints: i < 7 ? SEED_CC.cansComplaints[i] : null,    units: i < 7 ? SEED_CC.cansUnits[i] : null },
        draught: { complaints: i < 7 ? SEED_CC.draughtComplaints[i] : null, units: i < 7 ? SEED_CC.draughtUnits[i] : null }
      };
      return { raw: raw, cc: cc };
    });
  }

  window.__KPI_APP__ = {
    MONTHS: MONTHS, OWNERS: OWNERS, RAW_METRICS: RAW_METRICS, TYPE_ORDER: TYPE_ORDER,
    LY_CC: LY_CC, KPI_DEFS: KPI_DEFS, HERO_KEYS: HERO_KEYS,
    ownerName: ownerName, metricsByType: metricsByType, buildSeedMonths: buildSeedMonths
  };
})();
