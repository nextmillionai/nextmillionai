// ═══════════════════════════════════════════════════════════
// tabs-shared.js — the four COMMON tabs (Work · Lab · Provenance ·
// Share) rendered identically on the Profile and the Report pages.
// One source of truth: both pages load this module; flipping the
// Profile<->Report segmented toggle changes ONLY the Overview surface.
// Requires icons.js (glyph) and a page-level esc().
// ═══════════════════════════════════════════════════════════

// Build the slice of the assessment the shared tabs need from RAW api
// (the report page calls this; the profile page passes its full P,
// whose fields are a superset of this shape).
function nmaSharedPrep(api){
  var enr=api.enrichment||{};
  var hidden=window._visHiddenProjects||[];
  return {
    projects:(api.scannedProjects||[]).map(function(p){
      var name=p.name||'';
      return {name:name,languages:p.languages||[],lastActive:p.lastActive||null,
        sessionCount:p.sessionCount||0,series:p.series||null,
        visible:hidden.indexOf(name)<0};
    }),
    lab:api.experimental,
    coverage:api.coverage,
    toolsDetail:api.toolsDetail||[],
    multiDevice:api.multiDevice,
    links:api.links||[],
    enrichment:{growthAreas:enr.growthAreas||[]},
    assessment:{
      sourcesUsed:(api.assessment||{}).sources_used||(api.assessment||{}).sourcesUsed||[],
      dateRange:(api.assessment||{}).dateRange||'',
      confidence:(api.assessment||{}).confidence||0
    },
    tools:api.tools_detected||[],
    harness:api.harness||{},
    modelsSummary:api.modelsSummary||{}
  };
}

function nmaRenderSharedTabs(P){
  window._SHARED_P=P;
  // Work-tab toggles read window._P; the report page has no page-level
  // P, so the shared slice serves as it there
  if(!window._P)window._P=P;
  renderWork(P);
  renderLab(P);
  renderProvenance(P);
  if(window._servedMode)renderShare();
}

// Fetch visibility config before preparing shared data so project
// visibility is seeded from the persisted hiddenProjects list.
function nmaFetchVisConfig(cb){
  if(!window._servedMode){cb();return;}
  fetch('/api/profile/config').then(function(r){return r.ok?r.json():null;}).then(function(cfg){
    if(cfg){
      window._visConfig=cfg;
      window._visHiddenProjects=(cfg.hiddenProjects||[]);
    }
    cb();
  }).catch(function(){cb();});
}

var _workShown=20;

// Tab scaffolds — the section markup lives HERE (one source), injected
// into a single container per tab so profile.html and report.html stay
// byte-identical. Sub-ids match what the render fns below populate.
var NMA_WORK_SCAFFOLD=`
    <section>
      <h2>What you work on</h2>
      <div class="ctl-note">All projects power your scores. Toggle visibility to control what appears on your shared profile; hidden projects never appear in your shared profile or export.</div>
      <div class="work-band" id="pfWorkBand"></div>
      <div class="wcards" id="pfWorkTop"></div>
    </section>
    <section>
      <h2 class="h2-sm">All projects</h2>
      <div class="work-tools">
        <input type="search" id="pfWorkSearch" class="wsearch" placeholder="Search projects&hellip;" oninput="renderWorkList()">
        <div class="wfilters" id="pfWorkFilters"></div>
      </div>
      <div id="pfWorkList"></div>
      <button class="btn" id="pfWorkMore" style="display:none;margin-top:12px" onclick="workShowMore()">Show more</button>
    </section>`;
var NMA_LAB_SCAFFOLD=`
    <section>
      <h2>Lab</h2>
      <div class="exp-banner"><span class="tg">EXPERIMENTAL</span><span>Richer reads of your practice, still being calibrated. Lower confidence, deliberately kept off your main and shared profile &mdash; for your eyes only.</span></div>
      <div class="exp-grid" id="pfLabSignals"></div>
    </section>
    <section id="pfLabGrowthSec" style="display:none">
      <h2 class="h2-sm">Growth areas</h2>
      <div class="ctl-note">Private by default &mdash; shared only if you switch it on in the report. Each one is an observed gap and the next signal that would close it.</div>
      <div id="pfLabGrowth"></div>
    </section>
    <section id="pfLabCISec" style="display:none">
      <h2 class="h2-sm">Code intelligence</h2>
      <div class="ctl-note">From the opt-in local code scan (<b>assess --code</b>) &mdash; metrics only, never stored, never shared.</div>
      <div id="pfLabCI"></div>
    </section>`;
var NMA_PROV_SCAFFOLD=`
    <section>
      <h2>What feeds this assessment</h2>
      <div class="ctl-note">Scores come only from your local AI coding sessions + git over the selected window. Widen the window or add repos with <b>nextmillionai calibrate</b> &mdash; nothing leaves your machine.</div>
      <div class="rig" id="pfRig"></div>
      <div class="prov" id="pfProv"></div>
    </section>
    <hr class="div">
    <section>
      <h2>Coverage</h2>
      <div class="ctl-note">What exists on this machine that was NOT collected, and the one knob that widens it. More coverage &rarr; higher confidence. Never estimated.</div>
      <div id="pfCoverage"></div>
    </section>
    <hr class="div">
    <section>
      <h2>Links</h2>
      <div class="ctl-note">Shown on your profile for credibility &mdash; NOT used to compute your scores. Self-declared, displayed as such; scores stay behavior-only.</div>
      <div class="links" id="pfLinks"></div>
    </section>`;

function renderWork(P){
  var host=document.getElementById('workBody');
  if(host)host.innerHTML=NMA_WORK_SCAFFOLD;
  var projects=(P.projects||[]).slice();
  // Rank: most recently active first, then by session count
  projects.sort(function(a,b){
    var la=a.lastActive||'',lb=b.lastActive||'';
    if(la!==lb)return la<lb?1:-1;
    return (b.sessionCount||0)-(a.sessionCount||0);
  });
  P._workSorted=projects;

  // Summary band
  var langCounts={};
  projects.forEach(function(p){(p.languages||[]).forEach(function(l){langCounts[l]=(langCounts[l]||0)+1;});});
  var topLangs=Object.keys(langCounts).sort(function(a,b){return langCounts[b]-langCounts[a];}).slice(0,4);
  var active30=projects.filter(function(p){
    if(!p.lastActive)return false;
    return (Date.now()-new Date(p.lastActive+'T00:00:00'))/86400000<=30;
  }).length;
  document.getElementById('pfWorkBand').innerHTML=
    '<div><div class="n">'+projects.length+'</div><div class="l">projects assessed</div></div>'
    +'<div><div class="n">'+active30+'</div><div class="l">active last 30 days</div></div>'
    +'<div><div class="n">'+(topLangs.join(' · ')||'—')+'</div><div class="l">most common stacks</div></div>';

  // Top work cards (the ones that define "what you work on")
  var top=projects.filter(function(p){return p.sessionCount>0;}).slice(0,8);
  if(top.length<4)top=projects.slice(0,8);
  document.getElementById('pfWorkTop').innerHTML=top.map(function(p,i){
    var idx=projects.indexOf(p);
    return '<div class="wcard">'
      +'<div class="wc-top"><span class="wc-name">'+esc(p.name)+'</span>'
      +visToggle(p,idx)+'</div>'
      +(p.series&&p.series.some(function(v){return v>0;})?sparkSVG(p.series,150,30):'')
      +'<div class="wc-meta">'
        +(p.sessionCount?'<span>'+p.sessionCount+' sessions</span>':'')
        +(p.lastActive?'<span>active '+esc(p.lastActive)+'</span>':'')
      +'</div>'
      +'<div class="wc-langs">'+(p.languages||[]).slice(0,4).map(function(l){return '<span class="bc-chip">'+esc(l)+'</span>';}).join('')+'</div>'
    +'</div>';
  }).join('')||'<div class="ctl-note">No project activity found yet.</div>';

  renderWorkList();
}

function renderWorkList(){
  var P=window._P;if(!P||!P._workSorted)return;
  var q=(document.getElementById('pfWorkSearch').value||'').toLowerCase();
  var lang=window._workLangFilter||'';
  var rows=P._workSorted.filter(function(p){
    if(q&&p.name.toLowerCase().indexOf(q)<0)return false;
    if(lang&&(p.languages||[]).indexOf(lang)<0)return false;
    return true;
  });

  // Language filter chips (from full set, not filtered subset)
  var langCounts={};
  P._workSorted.forEach(function(p){(p.languages||[]).forEach(function(l){langCounts[l]=(langCounts[l]||0)+1;});});
  var langs=Object.keys(langCounts).sort(function(a,b){return langCounts[b]-langCounts[a];}).slice(0,6);
  document.getElementById('pfWorkFilters').innerHTML=langs.map(function(l){
    return '<span class="wf '+(l===lang?'on':'')+'" onclick="workFilterLang(\''+esc(l)+'\')">'+esc(l)+'</span>';
  }).join('');

  var shown=rows.slice(0,_workShown);
  document.getElementById('pfWorkList').innerHTML=shown.map(function(p){
    var idx=P._workSorted.indexOf(p);
    return '<div class="proj"><div><div class="pn">'+esc(p.name)+'</div><div class="pd">'
      +[(p.languages||[]).slice(0,3).join(', '),p.sessionCount?p.sessionCount+' sessions':'',p.lastActive?'last '+esc(p.lastActive):''].filter(Boolean).join(' · ')
      +'</div></div>'+visToggle(p,idx)+'</div>';
  }).join('')||'<div class="ctl-note">No projects match.</div>';

  var more=document.getElementById('pfWorkMore');
  more.style.display=rows.length>_workShown?'inline-flex':'none';
  more.textContent='Show '+Math.min(20,rows.length-_workShown)+' more ('+(rows.length-_workShown)+' remaining)';
}

function workShowMore(){_workShown+=20;renderWorkList();}

function renderLab(P){
  var host=document.getElementById('labBody');
  if(host)host.innerHTML=NMA_LAB_SCAFFOLD;
  var lab=P.lab;
  var el=document.getElementById('pfLabSignals');
  if(lab===undefined){el.innerHTML='';return;}
  var xs=(lab&&lab.signals)||[];
  el.innerHTML=xs.length?xs.map(function(s){
    return '<div class="exp"><span class="bd">'+esc(s.kind||'beta')+'</span>'
      +'<div class="l">'+esc(s.label)+'</div>'
      +'<div class="h">'+esc(s.headline)+'</div>'
      +(s.series?'<div class="exp-spark">'+sparkSVG(s.series,170,32)+'</div>':'')
      +'<div class="d">'+esc(s.detail||'')+'</div>'
      +'<div class="cf"><i><b style="width:'+(s.confidence||0)+'%"></b></i>'+(s.confidence||0)+'% confidence</div>'
      +'<button class="ask-agent" onclick="askAgent(\'Lab signal\',\''+esc(s.label)+'\',this)">&#10697; explore with your agent</button></div>';
  }).join(''):'<div class="ctl-note">Not enough rich data yet for Lab signals — they appear as your session history grows.</div>';

  renderLabCI(P);
  renderLabGrowth(P);
}

function renderLabCI(P){
  var items=(P.lab&&P.lab.codeIntelligence)||[];
  var sec=document.getElementById('pfLabCISec');
  if(!items.length){sec.style.display='none';return;}
  sec.style.display='block';

  // Group by repo (title format: "repo: detail")
  var groups={};
  items.forEach(function(c){
    var repo=(c.title||'').split(':')[0]||'other';
    (groups[repo]=groups[repo]||[]).push(c);
  });
  var names=Object.keys(groups).sort(function(a,b){return groups[b].length-groups[a].length;});

  document.getElementById('pfLabCI').innerHTML=names.map(function(repo,gi){
    var cards=groups[repo];
    var open=gi<2?' open':'';
    return '<details class="ci-group"'+open+'><summary><b>'+esc(repo)+'</b> · '+cards.length+' finding'+(cards.length!==1?'s':'')+'</summary>'
      +cards.slice(0,6).map(function(c){
        return '<div class="ci"><div class="l">'+esc(c.label||'')+'</div><div class="t">'+esc(c.title||'')+'</div><div class="find">'+esc(c.find||'')+'</div><div class="sugg">'+esc(c.sugg||'')+'</div><div class="basis">'+esc(c.basis||'')+' · '+(c.confidence||0)+'% confidence</div></div>';
      }).join('')
      +(cards.length>6?'<div class="ctl-note">+'+(cards.length-6)+' more in this repo</div>':'')
      +'</details>';
  }).join('');
}

function renderLabGrowth(P){
  var sec=document.getElementById('pfLabGrowthSec');
  var el=document.getElementById('pfLabGrowth');
  if(!sec||!el)return;
  var items=((P.enrichment||{}).growthAreas)||[];
  if(!items.length){sec.style.display='none';return;}
  sec.style.display='block';
  el.innerHTML='<div class="plock">'+glyph('lock',13)+' Only visible to you</div>'
    +items.map(function(g,i){
      return '<div class="growth-item"><span class="gi">'+(i+1)+'</span><div><div class="obs">'+esc(g.observed)+'</div><div class="nxt">→ '+esc(g.nextSignal)+'</div><button class="ask-agent" onclick="askAgent(\'growth area\',\''+esc(g.observed).replace(/'/g,'')+'\',this)">'+glyph('agent',12)+' work on this with your agent</button></div></div>';
    }).join('');
}

// ═══ TOOLS & ACTIVITY OVER TIME (shared: profile + report) ══════════

function renderTimeline(data){
  var sec=document.getElementById('pfTimeSection')||document.getElementById('repTimeSection');
  var el=document.getElementById('pfTimeline')||document.getElementById('repTimeline');
  if(!sec||!el)return;
  var days=(data.activityByDay||[]).filter(function(d){return d&&d.date;});
  if(days.length<14){sec.style.display='none';return;}
  sec.style.display='';

  var byMonth={};
  days.forEach(function(d){
    var m=d.date.slice(0,7);
    var cur=byMonth[m]||(byMonth[m]={sessions:0,commits:0,tools:{}});
    cur.sessions+=d.sessions||0;
    cur.commits+=d.commits||0;
    (d.tools||[]).forEach(function(t){cur.tools[t]=1;});
  });
  var months=Object.keys(byMonth).sort().slice(-12);
  var maxU=Math.max.apply(null,months.map(function(m){return byMonth[m].sessions+byMonth[m].commits;}).concat([1]));
  var toolLabels={claude_code:'Claude Code',cursor:'Cursor',codex:'Codex',aider:'Aider',cline:'Cline','continue':'Continue',copilot_chat:'Copilot',zed_ai:'Zed',antigravity:'Antigravity',opencode:'OpenCode',git:'git'};

  var h='<div class="tl-strip">';
  months.forEach(function(m){
    var c=byMonth[m];
    var hS=Math.round(c.sessions/maxU*72), hC=Math.round(c.commits/maxU*72);
    var tools=Object.keys(c.tools).map(function(t){return toolLabels[t]||t;});
    h+='<div class="tl-col" title="'+esc(m)+': '+c.sessions+' sessions, '+c.commits+' commits'+(tools.length?' · '+esc(tools.join(', ')):'')+'">'
      +'<div class="tl-bars"><i class="s" style="height:'+hS+'px"></i><i class="c" style="height:'+hC+'px"></i></div>'
      +'<span class="tl-m">'+m.slice(2).replace('-','·')+'</span>'
      +(tools.length?'<span class="tl-t">'+tools.length+'</span>':'<span class="tl-t"> </span>')
      +'</div>';
  });
  h+='</div><div class="tl-legend"><span><i class="s"></i> sessions</span><span><i class="c"></i> commits</span><span class="tl-tnote">number = AI surfaces active that month</span></div>';

  var models=Object.entries((data.modelsSummary||{}).byModel||{}).slice(0,5);
  if(models.length){
    h+='<div class="lev-domain" style="margin-top:16px">'+models.map(function(e){return '<span class="lev-tag">'+esc(e[0])+' <b>'+e[1]+'</b></span>';}).join('')
      +'</div><div class="rep-note">Model usage is a whole-window count — sessions don\'t carry per-day model stamps, so no time series is invented.</div>';
  }
  el.innerHTML=h;
}

function renderProvenance(P){
  var host=document.getElementById('provBody');
  if(host)host.innerHTML=NMA_PROV_SCAFFOLD;
  var am=P.assessment||{};

  // The rig: what this builder's setup looks like — surfaces → models → harness → repos
  var rigEl=document.getElementById('pfRig');
  if(rigEl){
    var models=Object.keys((P.modelsSummary||{}).byModel||{});
    var h=P.harness||{};
    var harnessChips=[
      h.skills?h.skills+' skills':null,
      h.agents?h.agents+' agents':null,
      h.commands?h.commands+' commands':null,
      h.hooks?h.hooks+' hooks':null,
      h.mcpRepos?h.mcpRepos+' MCP repos':null,
      h.claudeMdRepos?h.claudeMdRepos+'× CLAUDE.md':null,
      h.subagentDispatches?h.subagentDispatches+' subagent dispatches':null
    ].filter(Boolean);
    var cols=[
      {label:'Surfaces',items:(am.sourcesUsed||[])},
      {label:'Models',items:models.slice(0,5)},
      {label:'Harness',items:harnessChips.length?harnessChips:['none detected yet']},
      {label:'Repos',items:[(P.projects||[]).length+' assessed',(h.scaffoldedRepos||0)+' scaffolded']}
    ];
    rigEl.innerHTML='<div class="rig-flow">'+cols.map(function(c,i){
      return (i>0?'<span class="rig-arrow">&#8594;</span>':'')
        +'<div class="rig-col"><div class="rig-l">'+c.label+'</div>'
        +c.items.map(function(x){return '<span class="rig-chip">'+esc(x)+'</span>';}).join('')
        +'</div>';
    }).join('')+'</div>';
  }

  var provItems=[
    '<b>'+(am.sourcesUsed||[]).join(', ')+'</b> over <b>'+(am.dateRange||'—')+'</b>',
    (P.projects||[]).length+' repos discovered',
    'tools: '+(P.tools||[]).join(', '),
    'confidence '+(am.confidence||0)+'% (more data → higher)'
  ];
  // Wider tool field: each adapter declares what it could honestly read.
  // deep = parsed sessions; counts = countable artifacts only;
  // presence = install detected, usage insufficient.
  var tdl=P.toolsDetail||[];
  if(tdl.length){
    provItems.push('wider tool field: '+tdl.map(function(t){
      return esc(t.label)+' <span class="fid fid-'+esc(t.fidelity)+'" title="'+esc(t.note||'')+'">'+esc(t.fidelity)+'</span>';
    }).join(' &nbsp;·&nbsp; '));
  }

  // Reverse hiring: roadmap note where users look for "what uses this".
  // Honest: nothing is shared today unless the user explicitly publishes.
  provItems.push(
    'reverse hiring <span class="fid" title="The hiring network — where vetted '
    +'hiring agents discover builders from published profiles — is NOT live yet. '
    +'Nothing here is shared with anyone unless you explicitly run publish, and '
    +'publish today targets a registry you self-host.">coming soon</span> — '
    +'nothing is shared unless you explicitly publish');

  // Multi-device sync: who contributed evidence to the union (sync docs:
  // sessions dedupe by ledger key, commits per repo per day, scores stay
  // per-device)
  var md=P.multiDevice;
  if(md&&(md.devices||[]).length>1){
    var devLine=md.devices.map(function(d){
      return esc(d.name||d.id)+(d.thisDevice?' (this machine)':'')+' — '+(d.sessions||0)+' sessions';
    }).join(' · ');
    provItems.push('synced across <b>'+md.devices.length+' devices</b>: '+devLine);
    provItems.push('merged union: <b>'+((md.merged||{}).sessions||0)+'</b> sessions over <b>'+esc((md.merged||{}).dateRange||'—')+'</b> — deduped by stable IDs, never summed blindly; scores stay per-device');
  }
  document.getElementById('pfProv').innerHTML=provItems.map(function(x){return '<div class="prov-row">▸ '+x+'</div>';}).join('')+'<div class="sc-cmd" style="margin-top:12px;max-width:480px"><code id="cmdCal">'+cliCmd('calibrate')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdCal\',this)">copy</span></div>'+(window._servedMode?'<a class="btn" style="margin-top:12px" href="/api/scan-results" target="_blank">view raw scan data</a>':'');

  // Coverage: per-source status + gaps (private, served mode only)
  var cov=P.coverage;
  var covEl=document.getElementById('pfCoverage');
  if(!cov){
    covEl.innerHTML='<div class="ctl-note">Coverage detail is private to your machine.</div>';
  }else{
    var srcRows=(cov.sources||[]).map(function(s){
      var st,cls;
      if(s.collected){st='collected';cls='on';}
      else if(s.detectedOnMachine&&!s.consented){st='consent off';cls='off';}
      else if(!s.detectedOnMachine){st='not detected';cls='na';}
      else{st='consented — no data found';cls='na';}
      return '<div class="cov-src"><span class="cs-name">'+esc(s.label)+'</span><span class="cs-st '+cls+'">'+st+'</span></div>';
    }).join('');
    var gaps=cov.gaps||[];
    covEl.innerHTML='<div class="cov-srcs">'+srcRows+'</div>'
      +(gaps.length?gaps.map(function(g){
      return '<div class="cov-row"><div class="cov-gap">'+esc(g.gap)+'</div><div class="cov-knob">widen: <b>'+esc(g.widen)+'</b></div></div>';
    }).join(''):'<div class="cov-row ok">'+glyph('commit',13)+' Maximal — every detected source was collected.</div>');
  }

  // Links
  document.getElementById('pfLinks').innerHTML=(P.links||[]).length?(P.links||[]).map(function(l){
    return '<div class="link-row"><span class="lk">'+esc(l.label)+'</span>'+(l.on?'<span class="lv2">'+esc(l.value)+'</span><span class="link-act off">shown</span>':'<span class="lv2 add">not linked</span><span class="link-act">+ add</span>')+'</div>';
  }).join(''):'<div class="ctl-note">No links added. Add them in <b>nextmillionai.config.json</b> — shown as self-declared, never scored.</div>';
}

// ═══ SHARE — one shared renderer, IDENTICAL on profile + report ═══
// The whole Share tab is built here into #shareBody so the two views can
// never drift. Ordered most-used first: send to an agent (Markdown) →
// PDF → JSON → export → builder card → MCP → run modes → publish.
function renderShare(){
  var host=document.getElementById('shareBody');
  if(!host)return;
  host.innerHTML=
    '<section>'
    +'<h2>Share</h2>'
    +'<div class="ctl-note">Default = fully local. Everything below is opt-in, derived-only, and revocable. Preview first with <b>View as public</b>.</div>'
    +'<div class="share-grid">'

    // 1. Send to an agent — the Markdown export
    +'<div class="share-card">'
      +'<div class="sc-t"><span data-g="agent"></span> Send to an agent</div>'
      +'<div class="sc-d">Hand your profile to any AI agent in the format it reads best &mdash; clean Markdown, derived-only (no code or prompts).</div>'
      +'<div class="sc-md">'
        +'<span class="sc-md-lbl">Profile</span>'
        +'<button class="btn" onclick="copyMarkdown(\'profile\',this)">Copy .md</button>'
        +'<a class="btn quiet" href="profile.md" target="_blank" rel="noopener">Open</a>'
      +'</div>'
      +'<div class="sc-md">'
        +'<span class="sc-md-lbl">Report</span>'
        +'<button class="btn" onclick="copyMarkdown(\'report\',this)">Copy .md</button>'
        +'<a class="btn quiet" href="report.md" target="_blank" rel="noopener">Open</a>'
      +'</div>'
    +'</div>'

    // 2. Print / PDF
    +'<div class="share-card">'
      +'<div class="sc-t"><span data-g="download"></span> Print / PDF</div>'
      +'<div class="sc-d">Your profile or report as a PDF &mdash; everything visible on the page, brand colors kept.</div>'
      +'<div class="sc-md">'
        +'<span class="sc-md-lbl">Profile</span>'
        +'<button class="btn" onclick="nmaPrintSurface(\'profile\',this)">Download PDF</button>'
      +'</div>'
      +'<div class="sc-md">'
        +'<span class="sc-md-lbl">Report</span>'
        +'<button class="btn" onclick="nmaPrintSurface(\'report\',this)">Download PDF</button>'
      +'</div>'
    +'</div>'

    // 3. Raw JSON
    +'<div class="share-card">'
      +'<div class="sc-t"><span data-g="card"></span> Assessment JSON</div>'
      +'<div class="sc-d">The raw assessment data. In <b>View as public</b> this is the redacted, shareable JSON.</div>'
      +'<button class="btn dark" onclick="downloadJSON()">&#8595; Download JSON</button>'
    +'</div>'

    // 4. Preview & export
    +'<div class="share-card">'
      +'<div class="sc-t"><span data-g="eye"></span> Preview &amp; export</div>'
      +'<div class="sc-d">See exactly what others see, then ship a static folder (HTML + JSON + profile.md/report.md) to any host you control.</div>'
      +'<button class="btn" onclick="nmaTogglePublic()">View as public</button>'
      +'<div class="sc-cmd"><code id="cmdExport">'+cliCmd('export')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdExport\',this)">copy</span></div>'
    +'</div>'

    // 5. Builder card (PNG)
    +'<div class="share-card">'
      +'<div class="sc-t"><span data-g="card"></span> Builder card</div>'
      +'<div class="sc-d">Your identity mark as a PNG &mdash; for a README, a post, or a resume.</div>'
      +'<button class="btn dark" onclick="downloadCard()">&#8595; Download card</button>'
    +'</div>'

    // 6. MCP (coming soon)
    +'<div class="share-card">'
      +'<div class="sc-t"><span data-g="agent"></span> Connect via your agent <span class="fid">coming soon</span></div>'
      +'<div class="sc-d">Any MCP-compatible agent (Claude Code, Cursor, Cline) will be able to read this profile and run assessments via the nextmillionai MCP server.</div>'
    +'</div>'

    // 7. Run modes
    +'<div class="share-card sc-full">'
      +'<div class="sc-t"><span data-g="gear"></span> Run modes</div>'
      +'<div class="sc-d">Everything this tool can do, from your terminal. Nothing here sends data anywhere.</div>'
      +'<div class="sc-cmd"><code id="cmdSync">'+cliCmd('sync --repo <your-private-repo>')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdSync\',this)">copy</span></div>'
      +'<div class="sc-modes">sync: one merged profile across your machines (your repo, revocable)</div>'
      +'<div class="sc-cmd"><code id="cmdCode">'+cliCmd('assess --code')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdCode\',this)">copy</span></div>'
      +'<div class="sc-modes">code scan: deeper repo evidence — metrics only, never stored or sent</div>'
      +'<div class="sc-cmd"><code id="cmdEnrich">'+cliCmd('enrich')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdEnrich\',this)">copy</span></div>'
      +'<div class="sc-modes">enrich: narrative written by YOUR agent — it can never change a score</div>'
    +'</div>'

    // 8. Publish / network
    +'<div class="share-card sc-full" id="shareNetwork">'
      +'<div class="sc-t"><span data-g="signal"></span> Publish to the network <span class="fid">coming soon</span></div>'
      +'<div class="sc-d">Reverse hiring — coming soon. Nothing is shared unless you explicitly publish.</div>'
      +'<div class="net-snip">'
        +'<div class="ns-step"><div class="ns-label">your signal</div><div class="ns-card"><div class="ns-row"><div class="ns-av"></div><div class="ns-nm">builder · anon</div></div><div class="ns-bar"><i style="width:82%"></i></div><div class="ns-bar"><i style="width:64%"></i></div><div class="ns-chips"><span>Agent Builder</span><span>signals only</span></div></div></div>'
        +'<div class="ns-arrow">&rarr;</div>'
        +'<div class="ns-step"><div class="ns-label">match found</div><div class="ns-card"><div class="ns-row" style="justify-content:space-between"><span class="ns-badge">match</span><span class="ns-score">92</span></div><div class="ns-nm" style="font-size:11px">Senior AI Engineer</div><div class="ns-chips"><span>Python</span><span>MCP</span><span>multi-agent</span></div></div></div>'
        +'<div class="ns-arrow">&rarr;</div>'
        +'<div class="ns-step"><div class="ns-label">inside your IDE</div><div class="ns-card"><div class="ns-bubble">A hiring agent reached your agent about a role that fits how you build. Want to hear it?</div></div></div>'
        +'<div class="ns-arrow">&rarr;</div>'
        +'<div class="ns-step"><div class="ns-label">your call</div><div class="ns-card"><div class="ns-nm" style="font-size:11px">Reveal your identity?</div><div class="ns-chips"><span>anonymous until you say yes</span></div><div class="ns-ctas"><span class="ns-btn go">Reveal</span><span class="ns-btn">Pass</span></div></div></div>'
      +'</div>'
      +'<div id="shareNetBody"></div>'
    +'</div>'

    +'</div></section>';

  // hydrate this section's glyphs, mount the PDF control, fix CLI prefixes
  host.querySelectorAll('[data-g]').forEach(function(el){
    el.innerHTML=(typeof glyph==='function')?glyph(el.getAttribute('data-g'),16):'';
  });
  if(typeof initPdfStyle==='function')initPdfStyle('pdfStyleCtl');

  var net=document.getElementById('shareNetBody');
  if(net){
    fetch('/api/publish/state').then(function(r){return r.ok?r.json():null;}).then(function(st){
      if(!st)return;
      if(st.published){
        net.innerHTML=
          '<div class="sc-state on">&#9679; Published</div>'
          +'<div class="sc-meta">Builder ID: <code>'+esc(st.builderId||'')+'</code><br>Registry: <code>'+esc(st.registry||'')+'</code><br>Since: '+esc(st.publishedAt||'')+'</div>'
          +'<div class="sc-cmd"><code id="cmdUnpub">'+cliCmd('unpublish')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdUnpub\',this)">copy</span></div>';
      }else{
        net.innerHTML=
          '<div class="sc-state">&#9675; Not published &mdash; local-only</div>'
          +'<div class="sc-meta">Publishing sends only the sections you chose (the public view) and is revocable anytime. Self-host a registry with <code>'+cliCmd('network serve')+'</code>.</div>'
          +'<div class="sc-cmd"><code id="cmdPub">'+cliCmd('publish')+'</code><span class="sc-copy" onclick="copyCmd(\'cmdPub\',this)">copy</span></div>';
      }
    }).catch(function(){});
  }
}

// Copy the user's profile/report as Markdown — the "send to an agent"
// path. Fetches the same /profile.md · /report.md the server renders.
function copyMarkdown(view,btn){
  fetch(view+'.md').then(function(r){return r.ok?r.text():null;}).then(function(md){
    if(!md){flashBtn(btn,'unavailable');return;}
    (navigator.clipboard?navigator.clipboard.writeText(md):Promise.reject())
      .then(function(){flashBtn(btn,'copied — paste into your agent');})
      .catch(function(){window.prompt('Copy this Markdown for your agent:',md);});
  }).catch(function(){flashBtn(btn,'unavailable');});
}

// View-as-public works on either surface (each view has its own toggler).
function nmaTogglePublic(){
  if(window._NMA_SURFACE==='report'&&typeof togglePublicReport==='function')return togglePublicReport();
  if(typeof togglePublic==='function')return togglePublic();
}

// ═══ Builder card PNG — shared so both views can download it ═══
function downloadCard(){
  var P=window._P;if(!P)return;
  var bt=P.builderType||{},am=P.assessment||{},a=P.activity||{};
  var pos=P.positioning||{};
  var lvLabel=(LEV_STAGES.filter(function(s){return s.id===pos.leverageMode;})[0]||{}).label||pos.leverageMode||'';
  var scale=2,W=720,H=360;
  var cv=document.createElement('canvas');cv.width=W*scale;cv.height=H*scale;
  var x=cv.getContext('2d');x.scale(scale,scale);

  x.fillStyle='#FAF8F3';x.fillRect(0,0,W,H);
  x.strokeStyle='#EAE4D8';x.lineWidth=2;x.strokeRect(1,1,W-2,H-2);

  x.fillStyle='#23211C';
  x.font='600 30px "Space Grotesk", sans-serif';
  x.fillText(P.name||'Builder',36,64);
  x.font='700 24px "Space Grotesk", sans-serif';
  x.fillStyle='#E2542C';
  x.fillText((bt.title||(P.primaryTitle||{}).name||'').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/gu,''),36,108);
  x.font='400 14px "Inter", sans-serif';
  x.fillStyle='#4A463E';
  wrapText(x,bt.tagline||P.summaryLine||'',36,134,400,20);

  x.font='500 12px "JetBrains Mono", monospace';
  var cx=36,cy=190;
  [lvLabel].concat(((pos.techDomains||[]).slice(0,3)).map(function(t){return t.name+' '+(t.pct||t.weight||'')+'%';}))
    .filter(Boolean).forEach(function(chip,i){
      var tw=x.measureText(chip).width+20;
      x.fillStyle=i===0?'#23211C':'#F4EFE6';
      roundRect(x,cx,cy,tw,26,13);x.fill();
      x.fillStyle=i===0?'#FFFFFF':'#4A463E';
      x.fillText(chip,cx+10,cy+17);
      cx+=tw+8;
    });

  var comp=P.composite||0;
  var rcx=600,rcy=110,rr=52;
  x.lineWidth=10;x.strokeStyle='#EAE4D8';
  x.beginPath();x.arc(rcx,rcy,rr,0,Math.PI*2);x.stroke();
  var col=comp>=75?'#1F9254':comp>=50?'#CF8A1A':'#CB5A45';
  x.strokeStyle=col;x.lineCap='round';
  x.beginPath();x.arc(rcx,rcy,rr,-Math.PI/2,-Math.PI/2+Math.PI*2*(comp/100));x.stroke();
  x.fillStyle=col;x.font='700 32px "Space Grotesk", sans-serif';x.textAlign='center';
  x.fillText(String(comp),rcx,rcy+11);
  x.font='500 11px "JetBrains Mono", monospace';x.fillStyle='#8C877A';
  x.fillText('confidence '+(am.confidence||0)+'%',rcx,rcy+rr+24);
  x.textAlign='left';

  if(a.days&&a.days.length){
    var weeks=Math.min(13,Math.floor(a.days.length/7));
    var start=a.days.length-weeks*7;
    var palette=['#EDE7DB','#CDE6CF','#92CFA0','#4FAE72','#1F9254'];
    for(var w=0;w<weeks;w++){
      var sum=0;for(var d=0;d<7;d++)sum+=a.days[start+w*7+d]||0;
      var lvl=sum===0?0:sum<=5?1:sum<=11?2:sum<=18?3:4;
      x.fillStyle=palette[lvl];
      roundRect(x,36+w*24,250,18,18,4);x.fill();
    }
    x.font='500 10px "JetBrains Mono", monospace';x.fillStyle='#8C877A';
    x.fillText('last 13 weeks',36,288);
  }

  x.font='500 11px "JetBrains Mono", monospace';x.fillStyle='#8C877A';
  x.fillText('nextmillionai.org',36,332);

  var aEl=document.createElement('a');
  aEl.href=cv.toDataURL('image/png');
  aEl.download='builder-card.png';
  aEl.click();
}

function roundRect(x,px,py,w,h,r){
  x.beginPath();
  x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);
  x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();
}

function wrapText(x,text,px,py,maxW,lh){
  var words=String(text).split(' '),line='',yy=py;
  for(var i=0;i<words.length;i++){
    var test=line+words[i]+' ';
    if(x.measureText(test).width>maxW&&i>0){x.fillText(line,px,yy);line=words[i]+' ';yy+=lh;}
    else line=test;
  }
  x.fillText(line,px,yy);
}

function sparkSVG(series,w,h,color){
  if(!series||series.length<2)return '';
  w=w||120;h=h||28;color=color||'var(--accent)';
  var max=Math.max.apply(null,series),min=Math.min.apply(null,series);
  var range=(max-min)||1,pad=2;
  var pts=series.map(function(v,i){
    var x=pad+i*((w-pad*2)/(series.length-1));
    var y=h-pad-((v-min)/range)*(h-pad*2);
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  return '<svg class="spark" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function askAgent(kind,label,btn){
  var text=agentPrompt(kind,label);
  (navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject())
    .then(function(){flashBtn(btn,'copied — paste into your agent');})
    .catch(function(){window.prompt('Copy this prompt for your agent:',text);});
}

function cliCmd(sub){return (window._CLI||'nextmillionai')+' '+sub;}

function copyCmd(id,el){
  var text=document.getElementById(id).textContent;
  (navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject())
    .then(function(){el.textContent='copied';setTimeout(function(){el.textContent='copy';},1500);})
    .catch(function(){window.prompt('Copy:',text);});
}

function applyCli(){
  var map={cmdExport:'export',cmdPub:'publish',cmdUnpub:'unpublish',
    cmdSync:'sync --repo <your-private-repo>',
    cmdCode:'assess --code',cmdEnrich:'enrich'};
  Object.keys(map).forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.textContent=cliCmd(map[id]);
  });
}

// ═══ The Profile <-> Report flip + shared tab routing ═══════
// The Profile/Report segmented control IS the Overview entry: there is no
// separate Overview tab. Clicking Profile or Report opens that surface's
// overview (the heading toggles between them). Work/Lab/Provenance/Share are
// shared tabs that ride in the URL hash and stay available on both surfaces.

var NMA_TAB_IDS={overview:null,work:'viewWork',lab:'viewLab',prov:'viewProv',share:'viewShare'};
var NMA_TAB_BTNS={overview:null,work:'tabWork',lab:'tabLab',prov:'tabProv',share:'tabShare'};

function nmaShowView(v){
  if(!NMA_TAB_IDS[v]&&v!=='overview')v='overview';
  Object.keys(NMA_TAB_IDS).forEach(function(k){
    var id=k==='overview'?window._NMA_OVERVIEW_ID:NMA_TAB_IDS[k];
    var el=id&&document.getElementById(id);
    if(el)el.style.display=k===v?'':'none';
    var b=NMA_TAB_BTNS[k]&&document.getElementById(NMA_TAB_BTNS[k]);
    if(b)b.classList.toggle('active',k===v);
  });
  // The segmented control shows the active section: when overview is open the
  // current surface button reads as selected; on a shared tab it just marks
  // which surface you're on.
  var segP=document.getElementById('segProfile'),segR=document.getElementById('segReport');
  if(segP)segP.classList.toggle('ov',v==='overview'&&window._NMA_SURFACE==='profile');
  if(segR)segR.classList.toggle('ov',v==='overview'&&window._NMA_SURFACE==='report');
  window._NMA_TAB=v;
  try{history.replaceState(null,'',location.pathname+(v==='overview'?'':'#'+v));}catch(e){}
  window.scrollTo({top:0,behavior:'smooth'});
}

function nmaInitFlip(surface,overviewId){
  window._NMA_SURFACE=surface;
  window._NMA_OVERVIEW_ID=overviewId;
  // segmented toggle state
  var pb=document.getElementById('segProfile'),rb=document.getElementById('segReport');
  if(pb&&rb){
    pb.classList.toggle('on',surface==='profile');
    rb.classList.toggle('on',surface==='report');
    pb.setAttribute('aria-pressed',String(surface==='profile'));
    rb.setAttribute('aria-pressed',String(surface==='report'));
  }
  // deep link: open the tab named in the hash
  var tab=(location.hash||'').replace('#','');
  nmaShowView(NMA_TAB_IDS.hasOwnProperty(tab)?tab:'overview');
  window.addEventListener('hashchange',function(){
    var t=(location.hash||'').replace('#','');
    nmaShowView(NMA_TAB_IDS.hasOwnProperty(t)?t:'overview');
  });
}

function nmaFlipTo(surface){
  // Profile/Report doubles as the Overview opener. Clicking the surface you're
  // already on re-opens its overview; clicking the other navigates to that
  // surface's overview (the heading toggles). Shared tabs are reachable from
  // both surfaces but the flip itself always lands on the overview.
  if(surface===window._NMA_SURFACE){nmaShowView('overview');return;}
  if(window._servedMode){
    location.href=(surface==='report'?'/report':'/profile');
  }else{
    // static export: the two surfaces are sibling files
    location.href=(surface==='report'?'./report.html':'./profile.html');
  }
}

function visToggle(p,idx){
  return '<span class="vis '+(p.visible?'shown':'hidden')+'" onclick="toggleProj('+idx+');event.stopPropagation()" title="'+(p.visible?'Shown on your shared profile. Click to hide from shared view (data still counts toward your scores).':'Hidden from shared profile. Click to show. Data still counts toward your scores either way.')+'">'+(p.visible?'● on profile':'○ hidden')+'</span>';
}


function workFilterLang(l){
  window._workLangFilter=window._workLangFilter===l?'':l;
  _workShown=20;
  renderWorkList();
}


function nmaPrintSurface(surface,btn){
  if(surface===window._NMA_SURFACE){
    window.print();
    return;
  }
  var base=window._servedMode
    ?(surface==='report'?'/report':'/profile')
    :(surface==='report'?'./report.html':'./profile.html');
  window.open(base+'?print=1','_blank');
  if(btn)flashBtn(btn,'opening\u2026');
}

function flashBtn(btn,msg){
  if(!btn)return;
  var orig=btn.textContent;btn.textContent=msg;
  setTimeout(function(){btn.textContent=orig;},1800);
}


function agentPrompt(kind,label){
  return 'Using the nextmillionai MCP tools (nma_get_profile, nma_get_report, '
    +'nma_growth_edge): explain my "'+label+'" '+kind+' — what it measures, which of my '
    +'local signals produced it, and what single next signal would move it. '
    +'Be honest, no flattery; my data is local.';
}


function toggleProj(i){
  var P=window._P;
  P._workSorted[i].visible=!P._workSorted[i].visible;
  renderWork(P);
  // Persist to visibility config (hiddenProjects = projects NOT visible)
  if(window._servedMode){
    var hidden=[];
    (P._workSorted||[]).forEach(function(p){if(!p.visible)hidden.push(p.name);});
    // Include any projects not in _workSorted that were already hidden
    (P.projects||[]).forEach(function(p){
      if(!p.visible&&hidden.indexOf(p.name)<0)hidden.push(p.name);
    });
    var cfg=window._visConfig||{};
    cfg.hiddenProjects=hidden;
    window._visHiddenProjects=hidden;
    fetch('/api/profile/config',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(cfg)}).then(function(){
      window._RAW_PUBLIC=null; // public cache is stale
    }).catch(function(){});
  }
}

var BUILD_KINDS=[
  {id:'ai_systems',label:'AI-systems builder',headline:'You build the machines that build.',desc:'Agents, harnesses, multi-agent infrastructure — the tools other people ship with.',signals:'Placed here by agent frameworks, orchestration code, and harness patterns in your repos.'},
  {id:'ai_products',label:'AI-powered product builder',headline:'You ship products with AI woven through them.',desc:'Real products where the model does real work — a feature people use, not a demo.',signals:'Placed here by LLM SDKs sitting behind product features and AI-assisted feature commits.'},
  {id:'products',label:'Product builder',headline:'You ship the product; AI is how you move.',desc:'The product is the point. AI is the leverage that gets it out the door faster.',signals:'Placed here when AI shows up in how you build, not in what ships.'}
];

var LEV_STAGES=[
  {id:'prompting',label:'Prompting',desc:'Directs the agent turn by turn.'},
  {id:'harnessing',label:'Harnessing',desc:'Builds scaffolding around the agent — rules, MCPs, hooks.'},
  {id:'designs_the_loop',label:'Designs the loop',desc:'Designs loops & orchestration that drive the agents.'}
];

// ═══ Shared masthead — one identity block, both surfaces ═══════════
// The flip's promise is "same person, two depths": the header must be
// pixel-identical on /profile and /report. Per-surface extras (Builder
// card, PDF) ride at the END of head-actions; everything else matches.
function avatarUpload(input){
  var file=input.files&&input.files[0];
  if(!file)return;
  var reader=new FileReader();
  reader.onload=function(){
    try{localStorage.setItem('nma_avatar',reader.result);}catch(e){}
    renderAvatar(window._P||{});
    // Persist to server so it survives across browsers/ports
    if(window._servedMode){
      fetch('/api/avatar',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({avatar:reader.result})}).catch(function(){});
    }
  };
  reader.readAsDataURL(file);
}

function renderAvatar(P){
  var el=document.getElementById('pfAv');if(!el)return;
  var img=null;
  try{img=localStorage.getItem('nma_avatar');}catch(e){}
  if(img){
    el.innerHTML='<img src="'+img+'" alt="">';
    el.classList.add('has-img');
  }else if(window._servedMode&&!window._avatarChecked){
    // Hydrate from server-persisted avatar on first load
    window._avatarChecked=true;
    fetch('/api/avatar').then(function(r){return r.ok?r.json():null;}).then(function(d){
      if(d&&d.avatar){
        try{localStorage.setItem('nma_avatar',d.avatar);}catch(e){}
        el.innerHTML='<img src="'+d.avatar+'" alt="">';
        el.classList.add('has-img');
      }
    }).catch(function(){});
  }else{
    el.textContent=(P.name||'?').trim()[0]||'?';
    el.classList.remove('has-img');
  }
}

function nmaRenderMasthead(P){
  renderAvatar(P);
  var am=P.assessment||{};
  var nameEl=document.getElementById('pfName');
  if(nameEl)nameEl.textContent=P.name||'Your profile';
  var whoEl=document.getElementById('pfWho');
  if(whoEl)whoEl.textContent=[P.title,P.location].filter(Boolean).join(' · ');
  var metaEl=document.getElementById('pfMeta');
  if(metaEl)metaEl.textContent=[
    'verified via '+(am.sourcesUsed||am.sources_used||[]).join(', '),
    am.sessions?am.sessions+' sessions':'',
    am.dateRange,
    P.availability||P.work_style||''
  ].filter(Boolean).join('  ·  ');
  var tagsEl=document.getElementById('pfTags');
  if(tagsEl){
    var pos=P.positioning||{};
    // Accept both shapes: the profile's prepped P (string ids) and the
    // raw assessment JSON (objects with .primary / .current)
    var bdId=pos.buildDomain&&(pos.buildDomain.primary||pos.buildDomain);
    var lvId=pos.leverageMode&&(pos.leverageMode.current||pos.leverageMode);
    var bd=BUILD_KINDS.filter(function(k){return k.id===bdId;})[0];
    var lv=LEV_STAGES.filter(function(s){return s.id===lvId;})[0];
    tagsEl.innerHTML=[
      (typeof bdId==='string')?'<span class="tag dom">builds: <b>'+esc((bd||{}).label||bdId)+'</b></span>':'',
      (typeof lvId==='string')?'<span class="tag">operates at: <b>'+esc((lv||{}).label||lvId)+'</b></span>':''
    ].filter(Boolean).join('');
  }
}
