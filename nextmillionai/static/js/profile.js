// ═══════════════════════════════════════════════════════
// profile.js — Builder Profile (renders from /api/profile)
// Tabs: Overview · Work · Lab · Provenance
// One JSON source: /api/profile (served) or ./assessment.json (export)
// ═══════════════════════════════════════════════════════

// BUILD_KINDS / LEV_STAGES live in tabs-shared.js (masthead is shared)

const DIM_ORDER=[
  {key:'signal_clarity',name:'Signal Clarity',what:'How precisely you direct the AI.',how:'From prompt specificity + how few iterations it takes to land, against research-anchored bands.'},
  {key:'build_stability',name:'Build Stability',what:'Whether AI-written code holds up in your commits.',how:'From git churn / revert rate on AI-authored lines. Higher survival = higher score.'},
  {key:'decision_weight',name:'Decision Weight',what:'The weight and durability of the decisions you make.',how:'From decision impact + plan signals (planning feeds THIS dimension only, never penalised elsewhere).'},
  {key:'recovery_velocity',name:'Recovery Velocity',what:'How fast and systematically you recover when the model goes wrong.',how:'From debug-vs-generate ratio + how quickly errors converge to fixes.'},
  {key:'context_command',name:'Context Command',what:'How well you carry context, references and memory across a session.',how:'From reference/rules usage, MCP/context bridging, and session continuity.'},
  {key:'orchestration_range',name:'Orchestration Range',what:'How widely you coordinate models, agents and tools.',how:'From tool count, MCP servers, parallel agents and model routing. Agent leverage raises it, never lowers it.'}
];

// ═══ UTILITY ═══

const band=s=> s>=75?'var(--good)' : s>=50?'var(--mid)' : 'var(--low)';

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

function ringSVG(score,size,stroke){
  if(score==null){
    // insufficient — a dash, never a fabricated 0
    const r0=(size-stroke)/2;
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" style="flex:0 0 auto">'
      +'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r0+'" fill="none" stroke="var(--line)" stroke-width="'+stroke+'"/>'
      +'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Space Grotesk" font-weight="700" font-size="'+size*0.30+'" fill="var(--muted)">\u2014</text></svg>';
  }
  const r=(size-stroke)/2,c=2*Math.PI*r,off=c*(1-score/100),col=band(score);
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" style="flex:0 0 auto">'
    +'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="'+stroke+'"/>'
    +'<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="'+stroke+'" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>'
    +'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Space Grotesk" font-weight="700" font-size="'+size*0.32+'" fill="'+col+'">'+score+'</text></svg>';
}

// Donut chart: proportions at a glance (focus signal, never a ranking)
var DONUT_COLORS=['#E2542C','#3F6CC7','#1F9254','#CF8A1A','#7C5BD6','#8C877A'];
function donutSVG(segments,size,label){
  size=size||120;
  var total=segments.reduce(function(s,x){return s+x.value;},0);
  if(!total)return '';
  var r=size*0.36,c=2*Math.PI*r,off=0;
  var rings=segments.map(function(seg,i){
    var frac=seg.value/total;
    var dash=(frac*c).toFixed(2)+' '+(c-frac*c).toFixed(2);
    var el='<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+(seg.color||DONUT_COLORS[i%DONUT_COLORS.length])+'" stroke-width="'+size*0.14+'" stroke-dasharray="'+dash+'" stroke-dashoffset="'+(-off).toFixed(2)+'" transform="rotate(-90 '+size/2+' '+size/2+')"/>';
    off+=frac*c;
    return el;
  }).join('');
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+rings
    +(label?'<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="JetBrains Mono" font-size="'+size*0.085+'" fill="var(--muted)">'+label+'</text>':'')
    +'</svg>';
}

function donutBlock(title,segments){
  var total=segments.reduce(function(s,x){return s+x.value;},0);
  if(!total)return '';
  return '<div class="donut-block">'+donutSVG(segments,118,title)
    +'<div class="donut-legend">'+segments.map(function(seg,i){
      var pct=Math.round(seg.value/total*100);
      return '<div class="dlg"><i style="background:'+(seg.color||DONUT_COLORS[i%DONUT_COLORS.length])+'"></i>'+esc(seg.label)+'<b>'+pct+'%</b></div>';
    }).join('')+'</div></div>';
}

// Tiny inline sparkline (polyline) from a numeric series
function showView(v){nmaShowView(v);}

function downloadJSON(){
  // Canonical assessment JSON — the raw data, not the render-transformed
  // object. In public mode this is the redacted shareable JSON.
  var data=window._publicMode?window._RAW_PUBLIC:window._RAW;
  if(!data)return;
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=window._publicMode?'assessment-public.json':'assessment.json';a.click();
}

// ═══ VIEW AS PUBLIC ═══
// Renders the page from the redacted shareable JSON — exactly what a
// stranger or hiring agent sees. Nothing is sent anywhere.

function togglePublic(){
  if(window._publicMode){
    window._publicMode=false;
    document.getElementById('pfPubBanner').style.display='none';
    var _pb=document.getElementById('pfPublicBtn');if(_pb)_pb.textContent='View as public';
    var P=transformData(window._RAW);window._P=P;render(P);showView('overview');
    return;
  }
  var apply=function(pub){
    window._RAW_PUBLIC=pub;
    window._publicMode=true;
    document.getElementById('pfPubBanner').style.display='block';
    var _pb=document.getElementById('pfPublicBtn');if(_pb)_pb.textContent='← Back to private view';
    var P=transformData(pub);window._P=P;render(P);showView('overview');
    window.scrollTo(0,0);
  };
  if(window._RAW_PUBLIC){apply(window._RAW_PUBLIC);return;}
  fetch('/api/profile/public').then(function(r){return r.ok?r.json():null;})
    .then(function(pub){if(pub)apply(pub);})
    .catch(function(){});
}

// ═══ EXPLORE WITH YOUR AGENT ═══
// Copies a ready-made prompt for the user's own agent (MCP) — the
// profile never talks to a model itself.

// ═══ DATA TRANSFORM ═══
// Converts /api/profile backend format to the render format

function transformData(api){
  var P=Object.assign({},api);

  // Composite score
  P.composite=api.composite||api.intent_score||0;

  // Assessment: normalize snake_case keys
  var am=api.assessment||{};
  P.assessment={
    confidence:am.confidence||0,
    sourcesUsed:am.sources_used||am.sourcesUsed||[],
    sessions:am.sessions||0,
    dateRange:am.dateRange||am.date_range||''
  };

  // Positioning: unwrap nested objects from backend
  var pos=api.positioning||{};
  var bd=pos.buildDomain;
  var lm=pos.leverageMode;
  P.positioning={
    buildDomain: typeof bd==='object'?(bd.primary||''):(bd||''),
    leverageMode: typeof lm==='object'?(lm.current||''):(lm||''),
    techDomains:(pos.techDomains||[]).map(function(t){
      var pct=t.pct||0;
      if(t.weight!=null) pct=t.weight>1?Math.round(t.weight):Math.round(t.weight*100);
      return {name:t.name, pct:pct};
    }),
    nearestExpansion: typeof lm==='object'?(lm.adjacent||''):(pos.nearestExpansion||''),
    placement: typeof bd==='object'?(bd.evidence||[]).join(' · '):(pos.placement||''),
    footprint: pos.footprint||null
  };

  // Builder type from primaryTitle — name only; the glyph system renders
  // the mark (emoji are inconsistent across OSes and read unpolished)
  if(!P.builderType){
    var pt=api.primaryTitle;
    P.builderType=pt?{id:pt.id||'',title:pt.name||'',tagline:pt.tagline||''}:{};
  }

  // Dimensions: convert keyed object to array
  if(api.dimensions&&!Array.isArray(api.dimensions)){
    P.dimensions=DIM_ORDER.map(function(d){
      var raw=api.dimensions[d.key];
      if(!raw)return null;
      var score=typeof raw==='object'?(raw.score!=null?raw.score:null):typeof raw==='number'?raw:null;
      var evidence=typeof raw==='object'&&Array.isArray(raw.evidence)?raw.evidence:[];
      var what=(typeof raw==='object'?raw.description:'')||d.what;
      var prov=typeof raw==='object'?!!raw.provisional:false;
      var samp=typeof raw==='object'?raw.sampleSize:null;
      return {name:d.name, score:score, evidence:evidence, what:what, how:d.how, provisional:prov, sampleSize:samp};
    }).filter(Boolean);
  }

  // wrappedStats: convert from object to card array (raw kept for lookups)
  if(api.wrappedStats&&!Array.isArray(api.wrappedStats)){
    P.wrappedStats_raw=api.wrappedStats;
    P.wrappedStats=buildWrappedCards(api);
  }

  // Archetypes: normalize level format
  if(Array.isArray(api.archetypes)){
    P.archetypes=api.archetypes.slice(0,3).map(function(a){
      return {
        name:a.name||a.id||'',
        level:typeof a.level==='object'?(a.level.label||''):(a.level||''),
        evidence:Array.isArray(a.evidence)?a.evidence.join(', '):(a.evidence||'')
      };
    });
  }

  // Collab: derive from signals/stats
  if(!P.collab) P.collab=buildCollab(api);

  // Activity: from activityByDay
  P.activity=buildActivityData(api);

  // Strengths: from enrichment
  if(!P.strengths){
    var enr=api.enrichment||{};
    P.strengths=enr.strengths||[];
  }

  // Enrichment: ensure growthAreas present
  var enr2=api.enrichment||{};
  P.enrichment={
    narrative:enr2.narrative||api.summaryLine||'',
    growthAreas:enr2.growthAreas||(enr2.artifacts&&enr2.artifacts.growthAreas)||[],
    source:enr2.source||'heuristic'
  };

  // Projects: from scannedProjects (full detail for the Work tab)
  if(!Array.isArray(P.projects)||P.projects.length===0||typeof P.projects[0]==='string'){
    var hidden=window._visHiddenProjects||[];
    P.projects=(api.scannedProjects||[]).map(function(p){
      var name=p.name||'';
      return {
        name:name,
        languages:p.languages||[],
        lastActive:p.lastActive||null,
        sessionCount:p.sessionCount||0,
        series:p.series||null,
        visible:hidden.indexOf(name)<0
      };
    });
  }

  // Lab: keep the whole experimental block (signals + codeIntelligence).
  // undefined (redacted artifact) ≠ empty (no data yet) — tabs hide on undefined.
  P.lab=api.experimental;          // may be undefined in shareable/export JSON
  P.coverage=api.coverage;         // private; undefined in shareable/export JSON

  // Links: defaults
  if(!P.links) P.links=[];

  // Stack/tools
  P.stack=Array.isArray(api.stack)&&api.stack.length>0?api.stack:
    (api.stackSummary?[].concat(api.stackSummary.languages||[],api.stackSummary.frameworks||[]):[]);
  P.tools=api.tools||api.tools_detected||[];

  return P;
}

function buildWrappedCards(api){
  var ws=api.wrappedStats||{};
  var sig=api.signals||{};
  var cards=[];

  if(ws.longestStreakDays) cards.push({
    q:'Longest streak',n:ws.longestStreakDays+' days',d:'consecutive AI coding',c:'g',
    means:'Your longest run of consecutive days with at least one AI coding session.',
    how:'Counted from session timestamps over the window.'
  });
  if(sig.ai_lines_survived) cards.push({
    q:'AI code shipped',n:sig.ai_lines_survived.toLocaleString(),d:'lines that survived',c:'o',
    means:'AI-authored LINES that made it into commits — per-commit authorship attribution, survival not raw volume.',
    how:'Sum of AI-attributed diff lines over tracked commits (Cursor scored commits).'
  });
  else if(sig.ai_code_blocks) cards.push({
    q:'AI code tracked',n:sig.ai_code_blocks.toLocaleString(),d:'code blocks',c:'o',
    means:'AI-generated code blocks tracked by your tools. Blocks, not lines — line-level survival needs per-commit attribution, which this machine\u2019s data doesn\u2019t carry.',
    how:'Count of tracked AI code-block events.'
  });
  if(ws.maxParallelAgents&&ws.maxParallelAgents>1) cards.push({
    q:'Max parallel agents',n:String(ws.maxParallelAgents),d:'at once',c:'p',
    means:'The most agents truly running at once — measured first from overlapping subagent-run transcripts (hard evidence: their own timestamps), with within-tool session overlap as the softer floor. Cross-tool overlap never counts.',
    how:'Peak concurrent session overlap from real timestamps, live + ledger.'
  });
  if(ws.subagentDispatches) cards.push({
    q:'Subagents dispatched',n:ws.subagentDispatches.toLocaleString(),d:'Task-tool runs',c:'p',
    means:'Agents you sent off to do work inside your sessions — the clearest loop-design signal.',
    how:'Task tool calls counted per session, accumulated in your local history ledger.'
  });
  if(ws.longestSessionMinutes){
    var h=Math.floor(ws.longestSessionMinutes/60),m=ws.longestSessionMinutes%60;
    var capped=ws.longestSessionMinutes===480;
    cards.push({q:'Longest session',c:'g',n:(h>0?(m>0?h+'h '+m+'m':h+'h'):m+'m')+(capped?'+':''),d:capped?'hit the 8h span cap':'measured active time',
      means:'Your longest single AI coding session.'+(capped?' This one hit the span estimator\u2019s 8h cap (its tool only exposes open/close times), so the real span may be longer.':' Gap-measured active time \u2014 stretches over 30 minutes idle never count, so a long one is genuinely long.'),
      how:'Gap-based active time (uncapped \u2014 idle already excluded) where transcripts carry per-event timestamps; first-to-last span capped 8h otherwise. Ledger-preserved.'});
  }
  if(ws.models&&ws.models.length>0) cards.push({
    q:'Go-to model',n:ws.models[0],d:'most used',
    means:'The model you reached for most across the window.',
    how:'Most frequent model in session metadata.'
  });
  if(ws.planModePercent!=null) cards.push({
    q:'Plan-first',n:ws.planModePercent+'%',d:'of Claude Code sessions',
    means:'Share of sessions where you wrote a plan before coding. Basis: Claude Code sessions — other tools don\u2019t expose plan mode.',
    how:'Plan-before-code signal / Claude Code sessions. Shown neutrally — not graded.'
  });
  if(ws.avgPromptWords) cards.push({
    q:'Avg prompt',n:ws.avgPromptWords+' words',d:'substantive',
    means:'Average length of your prompts. Basis: tools whose transcripts we parse (Claude Code, Codex) — Cursor prompt bodies are never read.',
    how:'Mean word count across parsed prompts. A signal of direction style, not quality.'
  });
  if(ws.totalActiveHours) cards.push({
    q:'Your session time',n:ws.totalActiveHours+'h',d:'active, hands-on',c:'g',
    means:'Time YOU actively spent in AI coding sessions. Where transcripts carry per-event timestamps (Claude Code, Codex) this is true ACTIVE time — gaps over 30 minutes never count. Where a tool only exposes open/close times (Cursor) it is the open-session span, capped 8h. Ledger-preserved: survives transcript pruning.',
    how:'Gap-based active time where measurable; first-to-last span (8h cap) otherwise. Per-tool estimator declared in the signal registry.'
  });
  if(ws.agentRuntimeHours) cards.push({
    q:'Agent runtime',n:ws.agentRuntimeHours+'h',d:(ws.subagentRunCount||0)+' subagent runs',c:'p',
    means:'Hours your dispatched subagents worked, measured from their own transcripts. Kept separate from your hands-on time — agents run in parallel. Basis: Claude Code subagent transcripts only — Cursor exposes no separate background-agent runtime, so agentic Cursor time stays inside your session hours.',
    how:'Per-run span from agent transcript timestamps (capped 8h each), ledger-preserved.'
  });
  if(ws.marathonSessionCount) cards.push({
    q:'Marathon sessions',n:String(ws.marathonSessionCount),d:'over 2h each',c:'g',
    means:'Sessions with 2+ hours of work \u2014 active time where transcripts allow measuring it (idle over 30 minutes never counts), open-session span otherwise.',
    how:'Effective duration \u2265 2h, recomputed from the local ledger each assess.'
  });
  var lev=api.leverage;
  if(lev&&lev.aiShare!=null) cards.push({
    q:'AI-authored share',n:lev.aiShare+'%',d:(lev.aiLines/1000).toFixed(1)+'k AI lines shipped',c:'o',
    means:'Share of your shipped lines that AI wrote and that SURVIVED in commits — '
      +lev.aiLines.toLocaleString()+' AI-authored vs '+lev.humanLines.toLocaleString()+' hand-written'
      +(lev.outputMultiple?(' ('+lev.outputMultiple+(lev.outputMultipleCapped?'+':'')+'× the hand-written share alone)'):'')
      +'. A counted fact, not an estimate. The "how long without AI" reading lives in your Lab as a labeled estimate band.',
    how:lev.basis
  });
  return cards;
}

function buildCollab(api){
  var ws=api.wrappedStats||{};
  var sig=api.signals||{};
  var act=api.activity||{};
  var totalSess=act.totalSessions||0;
  var totalPrompts=ws.avgPromptsPerSession?Math.round(ws.avgPromptsPerSession*totalSess):0;

  return {
    prompts:totalPrompts>=1000?(totalPrompts/1000).toFixed(1)+'k':(totalPrompts||'—'),
    aiEdits:(function(){var v=sig.ai_lines_survived||0;if(v)return (v>=1000?(v/1000).toFixed(1)+'k':v)+' lines';var b=sig.ai_code_blocks||0;return b?(b>=1000?(b/1000).toFixed(1)+'k':b)+' blocks':'—';})(),
    commits:sig.scored_commits?sig.scored_commits+' commits':'—',
    agents:[
      ws.maxParallelAgents?'up to '+ws.maxParallelAgents:null,
      ws.subagentDispatches?ws.subagentDispatches+' dispatched':null
    ].filter(Boolean).join(' · ')||'—'
  };
}

function buildActivityData(api){
  var existing=api.activity||{};
  var abd=api.activityByDay||[];

  var rawDays=existing.days||null;
  var isLevelArray=Array.isArray(rawDays)&&rawDays.length>0&&typeof rawDays[0]==='number';

  function dayUnits(d){return (d.sessions||0)+(d.commits||0);}

  if(Array.isArray(rawDays)&&rawDays.length>0&&!isLevelArray){
    var merged={};
    abd.forEach(function(d){merged[d.date]=dayUnits(d);});
    rawDays.forEach(function(d){if(d.date&&!merged[d.date])merged[d.date]=dayUnits(d);});
    abd=Object.keys(merged).map(function(k){return {date:k,sessions:merged[k]};});
    rawDays=null;
  }

  var activity={
    streak:existing.streak||0,
    activeDays:existing.activeDays||0,
    avgSessionHours:existing.avgSessionHours||0,
    totalSessions:existing.totalSessions||0,
    days:isLevelArray?rawDays:null
  };

  if(!activity.days&&abd.length>0){
    var maxUnits=1;
    abd.forEach(function(d){if(dayUnits(d)>maxUnits)maxUnits=dayUnits(d);});
    var byDate={};
    abd.forEach(function(d){byDate[d.date]=dayUnits(d);});

    var weeks=26;
    var today=new Date();
    var days=[];
    for(var i=weeks*7-1;i>=0;i--){
      var dd=new Date(today);dd.setDate(dd.getDate()-i);
      var ds=dd.toISOString().slice(0,10);
      var units=byDate[ds]||0;
      if(units===0)days.push(0);
      else if(units<=maxUnits*0.25)days.push(1);
      else if(units<=maxUnits*0.5)days.push(2);
      else if(units<=maxUnits*0.75)days.push(3);
      else days.push(4);
    }
    activity.days=days;

    if(!activity.activeDays) activity.activeDays=abd.filter(function(d){return dayUnits(d)>0;}).length;
    if(!activity.totalSessions) activity.totalSessions=abd.reduce(function(s,d){return s+(d.sessions||0);},0);
    if(!activity.streak){
      var maxStreak=0,streak=0;
      var sorted=abd.filter(function(d){return d.sessions>0;}).map(function(d){return d.date;}).sort();
      for(var j=0;j<sorted.length;j++){
        if(j===0)streak=1;
        else{var diff=(new Date(sorted[j]+'T00:00:00')-new Date(sorted[j-1]+'T00:00:00'))/86400000;streak=diff===1?streak+1:1;}
        if(streak>maxStreak)maxStreak=streak;
      }
      activity.streak=maxStreak;
    }
  }

  return activity;
}

// ═══ RENDER ═══

// avatarUpload / renderAvatar live in tabs-shared.js (masthead is shared)

function render(P){
  // Identity + meta + chips: one shared masthead, identical on /report
  nmaRenderMasthead(P);
  var am=P.assessment||{};
  var pos=P.positioning||{};
  var lvLabel=(LEV_STAGES.filter(function(s){return s.id===pos.leverageMode;})[0]||{}).label||pos.leverageMode;

  // Hide Lab + Provenance tabs entirely on redacted (shared/exported) JSON —
  // the data is private, not absent, so we don't render empty shells.
  // Work hides too when the artifact carries no projects (hidden by default).
  var redacted=P.lab===undefined;
  document.getElementById('tabLab').style.display=redacted?'none':'';
  document.getElementById('tabProv').style.display=(P.coverage===undefined&&redacted)?'none':'';
  document.getElementById('tabWork').style.display=(P.projects||[]).length?'':'none';
  var shareTab=document.getElementById('tabShare');
  if(shareTab)shareTab.style.display=window._servedMode?'':'none';
  if(window._servedMode)renderShare();

  renderBuilderCard(P,lvLabel);

  // Where you sit: the 2D positioning map (the graphic centerpiece)
  renderPositioningMap(P);
  document.getElementById('pfLevCap').textContent=pos.nearestExpansion?
    (pos.nearestExpansion+'  ·  Higher leverage is fit, not better — worth it for decomposable work, ~15× the tokens.'):
    'Higher leverage is fit, not better — staying at prompting is correct for tightly-coupled work.';

  // Low-data honesty (SURFACING only — engine untouched): below the
  // visibility threshold the profile reads as EARLY, scores are marked
  // provisional, and prominence is dampened. Early = thin, not weak.
  var sessions=(P.activity||{}).totalSessions||(am.sessions||0);
  var early=(am.confidence||0)<45||sessions<5;
  document.body.classList.toggle('early-profile',early);
  var eb=document.getElementById('pfEarly');
  if(!eb){eb=document.createElement('div');eb.id='pfEarly';
    var host=document.getElementById('pfScope');host.parentNode.insertBefore(eb,host);}
  eb.innerHTML=early?('<div class="early-banner">'+glyph('spark',14)
    +'<div><b>Early profile — limited data so far.</b> Scores below are provisional reads, not verdicts. '
    +'A few more sessions, or connecting more repos (<b>'+cliCmd('calibrate')+'</b>), sharpens every number.</div></div>'):'';

  // Scope banner
  document.getElementById('pfScope').innerHTML='<span>computed over <b>'+(am.dateRange||'—')+'</b></span><span class="sep">·</span><span><b>'+(am.sourcesUsed||[]).length+'</b> sources: '+(am.sourcesUsed||[]).join(', ')+'</span><span class="sep">·</span><span>no percentiles — your measurements, research-anchored bands</span>';

  // Wrapped cards
  var _cardLegend='<div class="cards-legend"><span class="cl-h">colour = what each number measures</span>'+'<span class="cl"><i class="g"></i>Cadence</span>'+'<span class="cl"><i class="o"></i>Output</span>'+'<span class="cl"><i class="p"></i>Orchestration</span>'+'<span class="cl"><i class="n"></i>Direction</span></div>';
  document.getElementById('pfCards').innerHTML=_cardLegend+(P.wrappedStats||[]).map(function(c){
    return '<details class="card '+(c.c||'')+'"><summary><div class="q">'+c.q+'</div><div class="n">'+c.n+'</div><div class="d">'+(c.d||'')+'</div><div class="seemore" aria-label="what this means" title="what this means">▾</div></summary><div class="cdet"><div class="dl">What it means</div>'+(c.means||'')+'<div class="dl">How it is measured</div>'+(c.how||'')+'</div></details>';
  }).join('');
  // One open at a time: opening a card closes the others (keeps the row tidy;
  // align-items:start already stops siblings stretching to the tall one).
  var _pfCards=document.getElementById('pfCards');
  _pfCards.querySelectorAll('details.card').forEach(function(d){
    d.addEventListener('toggle',function(){
      if(!d.open) return;
      _pfCards.querySelectorAll('details.card[open]').forEach(function(o){ if(o!==d) o.open=false; });
    });
  });

  // Dimension rings — click opens a full-width panel beneath the grid
  var confTip=buildConfTip(P);
  document.getElementById('pfDims').innerHTML='<div class="ovr">'+ringSVG(P.composite,100,9)+((early||_mostlyProvisional(P))?'<div class="prov-chip">provisional</div>':'')+'<div class="lbl">overall</div><div class="cf" title="'+esc(confTip)+'">confidence <b>'+(am.confidence||0)+'%</b><a class="cf-why" href="/methodology#12-anti-patterns-trajectory-data-completeness-confidence"> · why?</a></div></div><div class="rings">'+(P.dimensions||[]).map(function(d,i){
    var dtag=d.score==null?' <i class="insuf-t">insufficient</i>':(d.provisional?' <i class="prov-t">small sample</i>':'');
    return '<button class="ring-c'+(d.score==null?' insuf':'')+(d.provisional?' prov':'')+'" id="dimBtn'+i+'" onclick="openDim('+i+')">'+ringSVG(d.score,42,5)+'<span class="rn">'+d.name+dtag+'</span><span class="chev">▾</span></button>';
  }).join('')+'</div>';
  document.getElementById('pfDimPanel').innerHTML='';
  window._openDim=null;

  // Tech domains as a donut — proportion at a glance
  var td=(P.positioning||{}).techDomains||[];
  var techEl=document.getElementById('pfTechDonut');
  if(techEl){
    var segs=td.slice(0,5).map(function(x){return {label:x.name,value:x.pct};});
    var rest=td.slice(5).reduce(function(s,x){return s+x.pct;},0);
    if(rest>0)segs.push({label:'other',value:rest,color:'#C9C3B4'});
    techEl.innerHTML=donutBlock('languages',segs);
  }

  // Stack axes: AI frameworks / databases / cloud (focus signals, no ranking)
  var ss=P.stackSummary||{};
  var groups=[
    {label:'AI frameworks & SDKs',items:ss.aiFrameworks||[]},
    {label:'Databases',items:ss.databases||[]},
    {label:'Cloud & deploy',items:ss.cloud||[]}
  ].filter(function(g){return g.items.length;});
  document.getElementById('pfStackGroups').innerHTML=groups.map(function(g){
    return '<div class="sg-row"><span class="sg-label">'+g.label+'</span><span class="sg-chips">'+g.items.map(function(x){return '<span class="bc-chip">'+esc(x)+'</span>';}).join('')+'</span></div>';
  }).join('');




  // Collaboration flow
  var c=P.collab||{};
  document.getElementById('pfCollab').innerHTML='<div class="flow"><div class="node"><div class="ic">'+glyph('user',22)+'</div><div class="nm">You</div><div class="nv">'+(c.prompts||'—')+' prompts</div></div><span class="arrow">→</span><div class="node"><div class="ic">'+glyph('agent',22)+'</div><div class="nm">AI agents</div><div class="nv">'+(c.agents||'—')+'</div></div><span class="arrow">→</span><div class="node"><div class="ic">'+glyph('repo',22)+'</div><div class="nm">Repo</div><div class="nv">'+(c.aiEdits||'—')+'</div></div><span class="arrow">→</span><div class="node"><div class="ic">'+glyph('commit',22)+'</div><div class="nm">Commits</div><div class="nv">'+(c.commits||'—')+'</div></div></div>';

  // Where the AI work happens: surfaces (share of active days) + models
  var sdEl=document.getElementById('pfSurfaceDonuts');
  if(sdEl){
    var toolDays={};
    (P.activityByDay||[]).forEach(function(d){
      (d.tools||[]).forEach(function(tool){
        if(tool==='git')return; // a source, not an AI surface
        toolDays[tool]=(toolDays[tool]||0)+1;
      });
    });
    var toolLabels={claude_code:'Claude Code',cursor:'Cursor',codex:'Codex CLI',claude_desktop:'Claude Desktop',aider:'Aider',cline:'Cline','continue':'Continue.dev',copilot_chat:'Copilot Chat',windsurf:'Windsurf',zed_ai:'Zed AI',jetbrains_ai:'JetBrains AI',cody:'Cody',antigravity:'Antigravity',opencode:'OpenCode'};
    var surfSegs=Object.keys(toolDays).sort(function(a,b){return toolDays[b]-toolDays[a];})
      .map(function(k){return {label:toolLabels[k]||k,value:toolDays[k]};});
    var byModel=(P.modelsSummary||{}).byModel||{};
    var mkeys=Object.keys(byModel).filter(function(m){return m!=='unknown'&&m!=='default';})
      .sort(function(a,b){return byModel[b]-byModel[a];});
    var mSegs=mkeys.slice(0,4).map(function(m){return {label:m,value:byModel[m]};});
    var mRest=mkeys.slice(4).reduce(function(s,m){return s+byModel[m];},0);
    if(mRest>0)mSegs.push({label:'other',value:mRest,color:'#C9C3B4'});
    sdEl.innerHTML=donutBlock('surfaces',surfSegs)+donutBlock('models',mSegs);
  }

  // Activity heatmap
  renderActivity(P);

  // Kinds you hold (compact) + one strength highlight
  renderKindsHeld(P);
  renderStrengthHighlight(P);

  // Timeline (shared with report)
  renderTimeline(P);

  // Other tabs
  renderWork(P);
  renderLab(P);
  renderProvenance(P);
}

// ═══ BUILDER CARD (the identity mark) ═══

function renderBuilderCard(P,lvLabel){
  var bt=P.builderType||{};
  var am=P.assessment||{};

  var el=document.getElementById('pfBcard');
  el.onclick=function(e){
    if(e.target.closest('.bc-dl'))return;
    document.getElementById('secKinds').scrollIntoView({behavior:'smooth',block:'start'});
  };
  // The hero says HOW you build: a signal-specific line (summaryLine is
  // built from the dominant work mode + top dimensions + a real stat),
  // and behavioral signature chips — never the language stack (that
  // lives in the Languages section).
  var descriptor=P.summaryLine||bt.tagline||'';
  // No kind earned yet (no archetype has reached the threshold): say so
  // honestly instead of rendering a blank "—" next to a confident ring.
  var noKind=!bt.title;
  var titleHtml,tagHtml;
  if(noKind){
    var arts=(P.archetypes||[]).slice().sort(function(a,b){return (b.score||0)-(a.score||0);});
    var top=arts[0]||{};
    titleHtml='<div class="bc-title nokind"><span class="bc-glyph">'+glyphFor('',30)+'</span>No kind earned yet</div>';
    tagHtml='<div class="bc-tag">A kind crystallizes when a craft reaches 80. Your strongest so far is <b>'
      +esc(top.name||'—')+'</b> at '+(top.score!=null?top.score:'—')+' — keep building and one will surface.</div>';
  }else{
    titleHtml='<div class="bc-title"><span class="bc-glyph">'+glyphFor(bt.id,30)+'</span>'+esc(bt.title)+'</div>';
    tagHtml='<div class="bc-tag">'+esc(descriptor)+'</div>';
  }
  el.innerHTML=
    '<div class="bc-main">'
      +'<div class="eye">Which kind of builder are you?</div>'
      +titleHtml
      +tagHtml
      +'<div class="bc-chips">'
        +(lvLabel?'<span class="bc-chip on">'+esc(lvLabel)+'</span>':'')
        +signatureChips(P).map(function(c){return '<span class="bc-chip">'+esc(c)+'</span>';}).join('')
      +'</div>'
      +'<span class="jump">▾ where you sit</span>'
    +'</div>'
    +'<div class="bc-side">'
      +ringSVG(P.composite,86,8)
      +(_mostlyProvisional(P)?'<div class="bc-prov" title="Most dimensions are scored from small samples — this composite is a provisional read, not a verdict.">provisional</div>':'')
      +'<div class="bc-cf" title="'+esc(buildConfTip(P))+'">confidence <b>'+(am.confidence||0)+'%</b></div>'
    +'</div>';
}

// 2-3 behavioral signature keywords, each gated on a real signal
function signatureChips(P){
  var ws=P.wrappedStats_raw||{};
  var h=P.harness||{};
  var chips=[];
  if((ws.planModePercent||0)>=40)chips.push('Plans first');
  if((h.subagentDispatches||0)>0||(ws.maxParallelAgents||0)>1)chips.push('Delegates wide');
  if((h.scaffoldedRepos||0)>0)chips.push('Harness-ready');
  if((ws.avgPromptWords||0)>=200)chips.push('Dense prompts');
  if((ws.deepSessionCount||0)>=5)chips.push('Deep sessions');
  if((ws.longestStreakDays||0)>=7)chips.push('Ships in streaks');
  return chips.slice(0,3);
}

// Confidence is honest or it is nothing: surface WHAT drives the number
function buildConfTip(P){
  var f=(P.assessment||{}).confidenceFactors;
  if(!f)return 'From metric completeness, sources, sample depth, active hours, and active-day window.';
  return ['completeness','sources','depth','volume','window'].map(function(k){
    return f[k]?f[k].detail:null;
  }).filter(Boolean).join(' · ');
}

// Composite reads provisional when most of the dimensions behind it are scored
// from small samples — a confident-looking number shouldn't sit on thin scores.
function _mostlyProvisional(P){
  var d=(P.dimensions||[]).filter(function(x){return x.score!=null;});
  if(d.length<3)return false;
  return d.filter(function(x){return x.provisional;}).length/d.length>=0.5;
}


// downloadCard / roundRect / wrapText live in tabs-shared.js (Share is shared)

// ═══ POSITIONING MAP (the centerpiece: build domain x leverage) ═══

var POS_DOMAINS=[
  {id:'products',label:'Products',sub:'AI is how you move'},
  {id:'ai_products',label:'AI products',sub:'the model ships in the feature'},
  {id:'ai_systems',label:'AI systems',sub:'the machines that build'}
];

function stageSubSignals(P){
  var h=P.harness||{};
  var ws=P.wrappedStats_raw||{};
  var harn=[
    h.rules?h.rules+' rules':null,
    h.mcpRepos?h.mcpRepos+' MCP repos':null,
    h.skills?h.skills+' skills':null,
    h.hooks?h.hooks+' hooks':null
  ].filter(Boolean);
  var loop=[
    ws.maxParallelAgents>1?ws.maxParallelAgents+' parallel agents':null,
    h.subagentDispatches?h.subagentDispatches+' subagent dispatches':null
  ].filter(Boolean);
  return {
    prompting:'direct, turn by turn',
    harnessing:harn.length?harn.join(' · '):'rules · MCPs · hooks · skills',
    designs_the_loop:loop.length?loop.join(' · '):'state files · scheduled loops · orchestration'
  };
}

function renderPositioningMap(P){
  var el=document.getElementById('pfPosMap');if(!el)return;
  var pos=P.positioning||{};
  var fp=(pos.footprint||{}).cells||[];
  var weights={};
  fp.forEach(function(c){weights[c.domain+'|'+c.stage]=c.weight;});
  var maxW=Math.max.apply(null,fp.map(function(c){return c.weight;}).concat([1]));
  var subs=stageSubSignals(P);
  var stages=LEV_STAGES.slice().reverse(); // designs_the_loop on top
  var curStage=pos.leverageMode,curDom=pos.buildDomain;
  var nextIdx=LEV_STAGES.findIndex(function(s){return s.id===curStage;})+1;
  var nextStage=(pos.nearestExpansion&&nextIdx<LEV_STAGES.length)?LEV_STAGES[nextIdx].id:null;

  var h='<div class="pm">';
  stages.forEach(function(s){
    h+='<div class="pm-row">';
    h+='<div class="pm-stage"><b>'+s.label+'</b><span>'+esc(subs[s.id]||s.desc)+'</span></div>';
    POS_DOMAINS.forEach(function(d){
      var w=weights[d.id+'|'+s.id]||0;
      var here=(d.id===curDom&&s.id===curStage);
      var next=(d.id===curDom&&s.id===nextStage);
      h+='<div class="pm-cell'+(here?' here':'')+(next?' next':'')+'"'
        +(w?' style="--w:'+(0.08+0.30*w/maxW).toFixed(2)+'"':'')
        +(w?' title="'+w+'% of your repo work"':'')+'>'
        +(w?'<span class="pm-w">'+w+'%</span>':'')
        +(here?'<span class="pm-dot"></span><span class="pm-you">you</span>':'')
        +(next?'<span class="pm-arrow">↑ nearest expansion</span>':'')
        +'</div>';
    });
    h+='</div>';
  });
  h+='<div class="pm-row pm-foot"><div class="pm-stage"></div>'
    +POS_DOMAINS.map(function(d){return '<div class="pm-col"><b>'+d.label+'</b><span>'+d.sub+'</span></div>';}).join('')
    +'</div></div>';
  el.innerHTML=h;
}

// ═══ DIMENSION PANEL (click, full-width, one at a time) ═══

function openDim(i){
  var P=window._P;if(!P)return;
  var panel=document.getElementById('pfDimPanel');
  for(var j=0;j<(P.dimensions||[]).length;j++){
    var b=document.getElementById('dimBtn'+j);
    if(b)b.classList.toggle('open',j===i&&window._openDim!==i);
  }
  if(window._openDim===i){
    window._openDim=null;
    panel.classList.remove('open');
    setTimeout(function(){panel.innerHTML='';},180);
    return;
  }
  window._openDim=i;
  var d=P.dimensions[i];
  panel.innerHTML=
    '<div class="dp-head">'+ringSVG(d.score,46,5)+'<b>'+esc(d.name)+'</b>'
    +(d.provisional?'<span class="dp-prov" title="Scored from a small sample — a provisional read, not a verdict. The score isn\'t lowered; it just hasn\'t earned full confidence yet.">provisional · small sample'+(d.sampleSize!=null?' ('+d.sampleSize+')':'')+'</span>':'')
    +'<button class="dp-x" onclick="openDim('+i+')">close</button></div>'
    +'<div class="dp-cols">'
    +'<div><div class="dl">What it measures</div><p>'+esc(d.what||'')+'</p></div>'
    +'<div><div class="dl">Your evidence</div>'+((d.evidence||[]).length?d.evidence.map(function(x){return '<div class="ev"><span class="a">▸</span>'+esc(x)+'</div>';}).join(''):'<p class="muted">insufficient data — not estimated</p>')+'</div>'
    +'<div><div class="dl">How it is scored</div><p>'+esc(d.how||'')+'</p>'
    +'<button class="ask-agent" onclick="askAgent(\'dimension\',\''+esc(d.name)+'\',this)">'+glyph('agent',12)+' explore with your agent</button></div>'
    +'</div>';
  panel.classList.add('open');
}

// ═══ KINDS YOU HOLD (compact badges; full detail lives in the report DNA) ═══

function renderKindsHeld(P){
  var el=document.getElementById('pfKindsHeld');if(!el)return;
  var cat=P.titlesCatalog||[];
  if(!cat.length){el.innerHTML='';return;}
  var specialized=cat.filter(function(c){return !c.baseline;});
  var specHeld=specialized.filter(function(c){return c.earned;}).length;
  document.getElementById('pfKindsHeldSub').textContent=(specHeld>0
    ?'You hold '+specHeld+' of the '+specialized.length+' specialized crafts, plus the AI Explorer baseline everyone holds'
    :'You hold the AI Explorer baseline. Specialize a craft (reach 80 in an archetype) to earn one of the '+specialized.length)
    +' — different crafts, never rungs. Full detail lives in your report\u2019s DNA section.';
  el.innerHTML=cat.map(function(k,i){
    var badge=k.baseline?'<span class="kb base">baseline</span>':(k.legendary?'<span class="kb leg">legendary</span>':(k.rare?'<span class="kb rare">rare</span>':''));
    return '<button class="kh '+(k.earned?'on':'')+'" id="khBtn'+i+'" onclick="kindSelect('+i+')">'
      +glyphFor(k.id,15)+'<span>'+esc(k.name)+'</span>'+badge+'</button>';
  }).join('');
  document.getElementById('pfKindDetail').innerHTML='';
  window._openKind=null;
}

function kindSelect(i){
  var P=window._P;var cat=P.titlesCatalog||[];var k=cat[i];if(!k)return;
  var panel=document.getElementById('pfKindDetail');
  cat.forEach(function(_,j){
    var b=document.getElementById('khBtn'+j);
    if(b)b.classList.toggle('sel',j===i&&window._openKind!==i);
  });
  if(window._openKind===i){
    window._openKind=null;panel.classList.remove('open');
    setTimeout(function(){panel.innerHTML='';},180);return;
  }
  window._openKind=i;
  // Map, not ladder: say what evidence the kind reflects — never "X to go"
  var appears=k.earnedBy?('Appears when your signals show: '+k.earnedBy.replace(/\u2265\s*(\d+)/g,'in the $1 band')):'';
  panel.innerHTML='<div class="khd"><div class="khd-head">'+glyphFor(k.id,20)+'<b>'+esc(k.name)+'</b>'
    +(k.earned?'<span class="khd-on">'+glyph('commit',13)+' yours</span>':'<span class="khd-off">not in your current signals</span>')+'</div>'
    +'<p>'+esc(k.tagline)+'</p>'
    +'<div class="khd-meta">sought by: '+esc(k.idealFor)+'</div>'
    +(appears?'<div class="khd-meta">'+esc(appears)+'</div>':'')
    +'</div>';
  panel.classList.add('open');
}

// ═══ STRENGTH HIGHLIGHT (one line; the full list lives in the report) ═══

function renderStrengthHighlight(P){
  var el=document.getElementById('pfStrength');if(!el)return;
  var s=(P.strengths||[])[0];
  if(!s){el.innerHTML='';return;}
  var claim=typeof s==='string'?s:(s.claim||'');
  var ev=typeof s==='object'?(s.evidence||''):'';
  var hint=((P.enrichment||{}).source||'heuristic')==='heuristic'
    ?'<div style="font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:8px">Run <code>nextmillionai enrich</code> for richer strengths and narrative.</div>':'';
  el.innerHTML='<hr class="div"><section><div class="strength one"><span class="dot"></span><div><div class="claim">'+esc(claim)+'</div><div class="ev">'+esc(ev)+'</div></div><a class="str-more" href="/report">full strengths, with evidence, in your report →</a></div>'+hint+'</section>';
}

// ═══ WORK TAB ═══


// ═══ LAB TAB ═══

// ═══ PROVENANCE TAB ═══

// ═══ ACTIVITY HEATMAP v2 ═══
// Cells: per-day AI-vs-human mix (where Cursor commit attribution gives a
// real ratio), session/commit volume as intensity, hover detail per day,
// and a scrubber to walk the full history — not just the last 26 weeks.

var _actOffsetWeeks=0;
var _actFilter='all';
var HM_WEEKS=26;

function actFilter(mode){
  _actFilter=mode;
  _actOffsetWeeks=0;
  var btns=document.querySelectorAll('#pfActFilter .seg-b');
  btns.forEach(function(b){b.classList.toggle('on',b.textContent.toLowerCase()===mode);});
  renderActivity(window._P);
}

function _dayUnits(d){return (d.sessions||0)+(d.commits||0);}

// Local-date string — never toISOString here: it converts to UTC and
// shifts the day for any UTC+ timezone, breaking weekday alignment.
function _localDate(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function _dayClass(d){
  if(_dayUnits(d)===0)return null;
  if(d.preAi)return 'pre';          // git history before your first AI session — shown, separated
  var r=d.aiRatio;
  if(r==null)return 'act';          // real activity, AI share unknown — honest
  if(r>=60)return 'ai';
  if(r>=30)return 'mix';
  return 'hum';
}

function actScrub(v){
  var max=parseInt(document.getElementById('pfScrubRange').max,10)||0;
  _actOffsetWeeks=max-parseInt(v,10);
  renderActivity(window._P);
}

function renderActivity(P){
  var a=P.activity||{};
  var abd=P.activityByDay||[];
  var byDate={};
  abd.forEach(function(d){byDate[d.date]=d;});

  var gridEl=document.getElementById('pfGrid');

  // Fill the available width with small cells, ending at TODAY — the grid
  // spreads across the container instead of stopping mid-way. Week count is
  // derived from the width so the dots stay small and the right edge is today.
  var _wrap=document.querySelector('.hm-wrap');
  var _availW=(_wrap&&_wrap.clientWidth)||document.querySelector('.wrap')&&document.querySelector('.wrap').clientWidth-2||700;
  var _cell=(window.innerWidth<=520?9:11),_gap=3;
  HM_WEEKS=Math.max(18,Math.min(105,Math.floor((_availW+_gap)/(_cell+_gap))));

  // Time filter: override HM_WEEKS for 30d/7d
  var scrub=document.getElementById('pfScrub');
  if(_actFilter==='7d'){
    HM_WEEKS=2;
    scrub.style.display='flex';
    scrub.style.visibility='hidden';
  }else if(_actFilter==='30d'){
    HM_WEEKS=5;
    scrub.style.display='flex';
    scrub.style.visibility='hidden';
  }else{
    scrub.style.visibility='';
  }
  gridEl.classList.toggle('filtered',_actFilter!=='all');

  // Scrubber bounds across the full history
  var firstDate=abd.length?abd[0].date:null;
  var totalWeeks=firstDate?Math.ceil((Date.now()-new Date(firstDate+'T00:00:00'))/(7*86400000)):HM_WEEKS;
  var maxOffset=Math.max(0,totalWeeks-HM_WEEKS);
  if(_actFilter==='all'&&maxOffset>0){
    scrub.style.display='flex';
    var range=document.getElementById('pfScrubRange');
    range.max=maxOffset;
    range.value=maxOffset-_actOffsetWeeks;
  }

  // GitHub-style alignment: columns are real Sunday-anchored weeks, so
  // rows are consistent weekdays and the last column reaches TODAY
  // (days after today render blank, not "no activity").
  var today=new Date();today.setHours(0,0,0,0);
  var end=new Date(today);end.setDate(end.getDate()-_actOffsetWeeks*7);
  var endSunday=new Date(end);endSunday.setDate(end.getDate()-end.getDay());
  var start=new Date(endSunday);start.setDate(endSunday.getDate()-(HM_WEEKS-1)*7);

  var maxUnits=1,cells=[];
  for(var w=0;w<HM_WEEKS;w++){
    for(var d2=0;d2<7;d2++){
      var dd=new Date(start);dd.setDate(start.getDate()+w*7+d2);
      var ds=_localDate(dd);
      var future=dd>end;
      var day=byDate[ds]||{date:ds,sessions:0,commits:0};
      if(!future&&_dayUnits(day)>maxUnits)maxUnits=_dayUnits(day);
      cells.push({day:day,future:future,date:ds});
    }
  }

  var hmColors={ai:'var(--hm-ai)',mix:'var(--hm-mix)',hum:'var(--hm-hum)',act:'var(--hm-act)',pre:'var(--hm-pre)'};
  var g='',monthMarks=[],lastMonth='';
  for(var w2=0;w2<HM_WEEKS;w2++){
    g+='<div class="gcol">';
    for(var d3=0;d3<7;d3++){
      var c=cells[w2*7+d3];
      if(c.future){g+='<div class="gcell ghost"></div>';continue;}
      var cls=_dayClass(c.day);
      var op=cls?Math.max(0.6,Math.min(1,_dayUnits(c.day)/maxUnits+0.45)):1;
      var bg=cls?hmColors[cls]:'var(--g0)';
      var isToday=c.date===_localDate(new Date());
      g+='<div class="gcell'+(isToday?' today':'')+'" data-date="'+c.date+'" style="background:'+bg+';opacity:'+op.toFixed(2)+'"></div>';
    }
    var wkMonth=cells[w2*7].date.slice(0,7);
    if(wkMonth!==lastMonth){
      monthMarks.push({w:w2,label:new Date(cells[w2*7].date+'T00:00:00').toLocaleString('en',{month:'short'})});
      lastMonth=wkMonth;
    }
    g+='</div>';
  }
  document.getElementById('pfGrid').innerHTML=g;
  document.getElementById('pfMonths').innerHTML=monthMarks.map(function(m){
    return '<span style="left:'+(m.w/HM_WEEKS*100)+'%">'+m.label+'</span>';
  }).join('');
  document.getElementById('pfScrubL').textContent=cells[0].date+' → '+cells[cells.length-1].date;

  // Pill label: range-aware
  var pillLabel=_actFilter==='all'
    ?(a.activeDays||0)+' active days all-time'
    :_actFilter.toUpperCase()+' view';
  document.getElementById('pfActPill').textContent=pillLabel;

  // Stats: range-scoped for 30d/7d
  var rangeStart=_localDate(start);
  var rangeAbd=_actFilter==='all'?abd:abd.filter(function(d){return d.date>=rangeStart;});
  var rangeDays=rangeAbd.filter(function(d){return _dayUnits(d)>0;}).length;
  var rangeSessions=rangeAbd.reduce(function(s,d){return s+(d.sessions||0);},0);
  var rangeCommits=rangeAbd.reduce(function(s,d){return s+(d.commits||0);},0);
  var peak=(P.wrappedStats_raw||{}).peakProductivityHour;
  var peakLabel=peak!=null?((peak%12||12)+(peak<12?' AM':' PM')):'—';
  document.getElementById('pfActStats').innerHTML=
    '<div><div class="n">'+((_actFilter==='all')?(a.streak||0):rangeDays)+'</div><div class="l">'+(_actFilter==='all'?'Day streak':'Active days')+'</div></div>'
    +'<div><div class="n">'+rangeSessions+'</div><div class="l">Sessions'+(_actFilter!=='all'?' ('+_actFilter+')':' this month')+'</div></div>'
    +'<div><div class="n">'+rangeCommits+'</div><div class="l">Commits'+(_actFilter!=='all'?' ('+_actFilter+')':'')+'</div></div>'
    +'<div><div class="n">'+peakLabel+'</div><div class="l">Peak hour</div></div>';

  _bindHeatTips(byDate);
}

function _bindHeatTips(byDate){
  var grid=document.getElementById('pfGrid');
  var tip=document.getElementById('pfTip');
  grid.onmousemove=function(e){
    var cell=e.target.closest('.gcell');
    if(!cell){tip.style.display='none';return;}
    var day=byDate[cell.dataset.date];
    var dateNice=new Date(cell.dataset.date+'T00:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
    var rows=['<b>'+dateNice+'</b>'];
    if(!day||_dayUnits(day)===0){rows.push('no recorded activity');}
    else{
      if(day.sessions)rows.push(day.sessions+' session'+(day.sessions!==1?'s':'')+(day.activeMinutes?' · '+(day.activeMinutes/60).toFixed(1)+' session-h':''));
      if(day.commits)rows.push(day.commits+' commit'+(day.commits!==1?'s':''));
      if(day.topProject)rows.push('top: '+esc(day.topProject));
      if(day.tools&&day.tools.length)rows.push(day.tools.join(' · '));
      if(day.preAi)rows.push('pre-AI git history (before your first AI session)');
      else rows.push(day.aiRatio!=null?Math.round(day.aiRatio)+'% AI-attributed lines':'AI share unknown for this day');
    }
    tip.innerHTML=rows.join('<br>');
    tip.style.display='block';
    var r=grid.getBoundingClientRect();
    tip.style.left=Math.min(e.clientX-r.left+14,r.width-230)+'px';
    tip.style.top=(e.clientY-r.top+18)+'px';
  };
  grid.onmouseleave=function(){tip.style.display='none';};
}

// ═══ GROWTH AREAS (private — mirrored in Lab; home is the report) ═══

// ═══ CLI-ADAPTIVE COMMANDS ═══
// A clone without pip-install has no `nextmillionai` on PATH; the hub
// tells us the invocation that actually works on this machine.

// ═══ SHARE TAB ═══

// ═══ INIT ═══

function hydrateGlyphs(){
  document.querySelectorAll('[data-g]').forEach(function(el){
    el.innerHTML=glyph(el.getAttribute('data-g'),14);
  });
}

var PROFILE_EXPLAIN=[
  {sel:'.bcard',label:'Builder type & overall score',how:'Your primary title comes from archetype thresholds; the overall ring is an archetype-relative weighted mean of the six dimensions. Confidence is four measured factors: metric completeness, sources, volume, window.',anchor:'3-composite-archetype-relative'},
  {sel:'.dim-panel,.ring-c',label:'Dimension score',how:'Each dimension is arithmetic over counted local signals against research-anchored bands — no model, no percentile. Click the dimension for its exact inputs.',anchor:'2-the-six-dimensions'},
  {sel:'.card',label:'This number',how:'Counted directly from your session and git metadata. Open the tile for what it means and how it is measured.',anchor:'7-wrapped-stats-signal-cards'},
  {sel:'.pm',label:'Positioning map',how:'Columns from framework markers in your repos; rows from harness scaffolding + orchestration evidence (subagent dispatches, parallel sessions); shading is your commit-weighted footprint. A map, not a ladder.',anchor:'8-positioning-the-map-build-domain-leverage'},
  {sel:'.kheld-panel,.kh',label:'Kinds',how:'Each kind is a combination of archetype thresholds; archetypes are scored from counted signals. Kinds are different crafts — never rungs.',anchor:'6-titles'},
  {sel:'.donut-block',label:'Proportional mix',how:'Languages from your repos weighted by commits; surfaces by share of active days each appears; models from session metadata counts.',anchor:'1-data-collection'},
  {sel:'.hm-wrap,.act-stats',label:'Activity',how:'The per-day union of sessions, Cursor-attributed commits, and git history — preserved in your local history ledger even after sources prune.',anchor:'1-data-collection'},
  {sel:'.exp',label:'Lab signal',how:'An experimental read, calibrating: each card states its own basis and confidence, and never enters a shared profile.',anchor:null},
  {sel:'.wcard,.proj',label:'Project',how:'Discovered from real session working directories and local git repos; hidden from shared profiles unless you toggle it on.',anchor:'1-data-collection'},
  {sel:'.rig-flow',label:'Your rig',how:'Surfaces from collected sources, models from session metadata, harness from repo scaffolding files, repos from git discovery.',anchor:'1-data-collection'}
];

document.addEventListener('DOMContentLoaded',function(){
  hydrateGlyphs();
  initExplain(PROFILE_EXPLAIN);
  // Static export embeds the (visibility-redacted) assessment JSON;
  // the local server serves the full profile from /api/profile.
  if(window.__NMA_PROFILE__){
    var P0=transformData(window.__NMA_PROFILE__);
    window._P=P0;
    render(P0);
    nmaInitFlip('profile','viewOverview');
    initPdfStyle('pfPdfStyle');
    nmaMaybeAutoPrint();
    return;
  }
  // Served mode reads /api/profile; the static export artifact falls
  // back to ./assessment.json — the one JSON both views render from.
  fetch('/api/profile').then(function(r){
    if(!r.ok)throw new Error('no api');
    window._servedMode=true;
    return r.json();
  }).catch(function(){
    window._servedMode=false;
    return fetch('./assessment.json').then(function(r){
      if(!r.ok)return null;
      return r.json();
    }).catch(function(){return null;});
  }).then(function(api){
    if(!api)return;
    window._RAW=api;
    if(window._servedMode){
      fetch('/api/cli').then(function(r){return r.ok?r.json():null;}).then(function(c){
        if(c&&c.cli){window._CLI=c.cli;applyCli();}
      }).catch(function(){});
    }
    // Static artifacts are already the public view — no toggle to show
    if(!window._servedMode){
      var pb=document.getElementById('pfPublicBtn');
      if(pb)pb.style.display='none';
    }
    // Fetch visibility config before transforming so project visibility
    // is seeded from persisted hiddenProjects.
    nmaFetchVisConfig(function(){
      var P=transformData(api);
      window._P=P;
      render(P);
      nmaInitFlip('profile','viewOverview');
      initPdfStyle('pfPdfStyle');
      nmaMaybeAutoPrint();
    });
  }).catch(function(){});
});
