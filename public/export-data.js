(function(){
  "use strict";

  function emptyExportNotes(){
    return {
      actions: [],
      summaryAchievements: "",
      summaryOpportunities: "",
      summaryActionsText: "",
      summaryLookingForward: "",
      safetyDays: null,
      safetyNotes: "",
      qualityNotes: "",
      forecastReportedPct: null,
      forecastComments: "",
      va: { mtd: null, pm: null, ytd: null, fyForecast: null, comments: "" },
      vaInitiatives: [],
      slob: { ytd: null, thisMonth: null, carryOver: null, comments: "" },
      nextMonthTitle: "",
      nextMonthNotes: ""
    };
  }

  function buildEmptyExportNotesArray(){
    var out = [];
    for (var i=0;i<12;i++) out.push(emptyExportNotes());
    return out;
  }

  function ensureExportShape(s){
    if (!Array.isArray(s.exportNotes) || s.exportNotes.length !== 12){
      s.exportNotes = buildEmptyExportNotesArray();
    }
    s.exportNotes.forEach(function(n){
      var empty = emptyExportNotes();
      Object.keys(empty).forEach(function(k){
        if (!(k in n)) n[k] = empty[k];
      });
      if (!Array.isArray(n.actions)) n.actions = [];
      if (!Array.isArray(n.vaInitiatives)) n.vaInitiatives = [];
      n.va = n.va || empty.va;
      n.slob = n.slob || empty.slob;
    });
    return s;
  }

  window.__KPI_APP__.emptyExportNotes = emptyExportNotes;
  window.__KPI_APP__.buildEmptyExportNotesArray = buildEmptyExportNotesArray;
  window.__KPI_APP__.ensureExportShape = ensureExportShape;
})();
