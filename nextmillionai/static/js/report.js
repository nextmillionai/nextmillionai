// ═══════════════════════════════════════════════════════════
// report.js — Lighthouse + Paxel AI Coding Report
// Renders from the same assessment JSON as the profile view.
// ═══════════════════════════════════════════════════════════

function esc(s){const d=document.createElement('div');d.textContent=String(s);return d.innerHTML;}

function band(s){return s>=75?'var(--good)':s>=50?'var(--mid)':'var(--low)';}

function ringSVG(score,size,stroke){
  const r=(size-stroke)/2,c=2*Math.PI*r,off=c*(1-score/100),col=band(score);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size/2} ${size/2})"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Space Grotesk" font-weight="700" font-size="${size*0.32}" fill="${col}">${score}</text></svg>`;
}

function showView(v){nmaShowView(v==='report'?'overview':v);}

// ═══ DIMENSION META ═══════════════════════════════════════

const DIM_ORDER=['signal_clarity','build_stability','decision_weight','recovery_velocity','context_command','orchestration_range'];
const DIM_NAMES={
  signal_clarity:'Signal Clarity',build_stability:'Build Stability',decision_weight:'Decision Weight',
  recovery_velocity:'Recovery Velocity',context_command:'Context Command',orchestration_range:'Orchestration Range',
};

// ═══ BUILD WRAPPED CARDS FROM REAL DATA ═══════════════════

function buildCards(data){
  const ws=data.wrappedStats||{};
  const sig=data.signals||{};
  const am=data.assessment||{};
  const act=data.activity||{};
  const cards=[];

  // Which kind of builder
  const pos=data.positioning||{};
  const bd=typeof pos.buildDomain==='object'?pos.buildDomain.primary:(pos.buildDomain||'');
  const bdLabels={products:'Product builder',ai_products:'AI-powered product builder',ai_systems:'AI-systems builder'};
  if(bd)cards.push({q:'Which kind of builder are you?',a:bdLabels[bd]||bd,d:'Based on what AI does in your shipped work.'});

  // AI code shipped — lines need per-commit attribution; blocks are the
  // honest fallback unit when attribution data doesn't exist
  const survived=sig.ai_lines_survived||0;
  if(survived>0)cards.push({q:'How much did you ship?',a:survived.toLocaleString()+' lines',d:'AI-authored lines that survived in commits (per-commit attribution).'});
  else if(sig.ai_code_blocks)cards.push({q:'How much did you ship?',a:sig.ai_code_blocks.toLocaleString()+' blocks',d:'Tracked AI code blocks — line-level survival needs attribution data.'});

  // Max parallel agents + dispatches
  const maxPar=ws.maxParallelAgents||0;
  if(maxPar>0)cards.push({q:'How many agents at once?',a:maxPar,d:'Peak parallel agents, measured across your full history.'});
  if(ws.subagentDispatches)cards.push({q:'How many agents did you send off?',a:ws.subagentDispatches.toLocaleString()+' dispatches',d:'Subagents launched from your sessions (Task tool), ledger-accumulated.'});

  // How you work with agent
  const wm=data.workMode||{};
  const wmLine=(typeof wm==='object'&&wm.dominant)?(wm.dominant.line||''):(ws.workMode||'');
  if(wmLine)cards.push({q:'How do you work with your agent?',a:wmLine,d:'Your dominant collaboration style.'});

  // Longest session (8h honesty cap — say when it's hit)
  const lsMins=ws.longestSessionMinutes||0;
  if(lsMins>0){
    const h=Math.floor(lsMins/60),m=lsMins%60;
    const capped=lsMins===480;
    cards.push({q:'Your longest session?',a:(h>0?(m>0?h+'h '+m+'m':h+'h'):m+'m')+(capped?'+':''),
      d:capped?'Hit the span estimator\u2019s 8h cap — the real span may be longer.':'Measured active time — idle over 30 minutes never counts.'});
  }

  // Plan-first ratio
  const planPct=ws.planModePercent!=null?ws.planModePercent:(ws.planFirstRatio!=null?Math.round(ws.planFirstRatio*100):null);
  if(planPct!=null)cards.push({q:'How often do you plan first?',a:Math.round(planPct)+'% in plan mode',d:'Sessions where you planned before coding.'});

  // Go-to model
  const model=(Array.isArray(ws.models)&&ws.models[0])?ws.models[0]:(ws.primaryModel||'');
  if(model)cards.push({q:'What\'s your go-to model?',a:model,d:'The model you reach for most.'});

  // Peak productivity hour
  const peakHr=ws.peakProductivityHour;
  if(peakHr!=null&&peakHr!==14){
    const ampm=peakHr===0?'12 AM':peakHr<12?peakHr+' AM':peakHr===12?'12 PM':(peakHr-12)+' PM';
    cards.push({q:'When do you do your best work?',a:ampm,d:'The hour you start the most sessions — your natural building window.'});
  }

  // Longest streak
  const streak=ws.longestStreakDays||act.streak||0;
  if(streak>0)cards.push({q:'What\'s your longest streak?',a:streak+' days',d:'Consecutive days you shipped something.'});

  // Active days
  const aDays=act.activeDays||0;
  if(aDays>0)cards.push({q:'How many days did you show up?',a:aDays+' days',d:'Days with at least one session or commit in the assessment window.'});

  // Avg prompt length
  const promptWords=ws.avgPromptWords||0;
  if(promptWords>0)cards.push({q:'How long are your prompts?',a:promptWords+' words',d:'Average prompt length.'});

  // Deep + marathon sessions
  const deepSess=ws.deepSessionCount||0;
  if(deepSess>0)cards.push({q:'How do you work?',a:deepSess+' deep sessions',d:'Sessions over 30 minutes of focused work.'});
  if(ws.marathonSessionCount)cards.push({q:'How deep do you go?',a:ws.marathonSessionCount+' marathons',d:'Sessions with 2+ hours of work each \u2014 active time where measurable.'});

  // Total hours
  const hours=ws.totalActiveHours||ws.totalEstimatedHours||0;
  if(hours>0)cards.push({q:'How much time did you put in?',a:hours+'h',d:'Your hands-on session time — ledger-preserved, survives transcript pruning.'});
  if(ws.agentRuntimeHours)cards.push({q:'How long did your agents run?',a:ws.agentRuntimeHours+'h',d:(ws.subagentRunCount||0)+' subagent runs from their own transcripts (Claude Code only — Cursor exposes no separate background-agent runtime).'});

  // AI leverage — measured authorship facts (the counterfactual time
  // band lives in Lab as a labeled estimate, never presented as fact)
  const lev=data.leverage;
  if(lev&&lev.aiShare!=null){
    cards.push({q:'How much of it did AI write?',a:lev.aiShare+'%',
      d:lev.aiLines.toLocaleString()+' AI-authored lines survived in '+lev.trackedCommits+' tracked commits vs '+lev.humanLines.toLocaleString()+' hand-written.'});
    if(lev.outputMultiple)cards.push({q:'Output multiple',a:lev.outputMultiple+(lev.outputMultipleCapped?'+':'')+'×',
      d:'Shipped lines vs your hand-written share alone — counted, not estimated.'});
  }

  // Total sessions
  const sessions=act.totalSessions||am.sessions||0;
  if(sessions>0)cards.push({q:'How many sessions?',a:sessions,d:'Total AI coding sessions.'});

  // Prompts per session
  const pps=ws.avgPromptsPerSession||0;
  if(pps>0)cards.push({q:'How much do you talk to your agent?',a:Math.round(pps)+' prompts a session',d:'Average back-and-forth per session.'});

  // Feature to fix ratio
  const ftf=ws.featureToFixRatio;
  if(ftf!=null&&ftf>0){
    const features=Math.round(ftf*100);
    cards.push({q:'What kind of work is it?',a:features>=50?'Mostly features':'Mostly fixes',d:features+'% features, '+(100-features)+'% fixes in your commits.'});
  }

  return cards;
}

// ═══ RENDER ═══════════════════════════════════════════════

function render(data){
  const am=data.assessment||{};
  const enr=data.enrichment||{};

  // Identity + meta + chips: one shared masthead, identical on /profile
  nmaRenderMasthead(data);

  // Hero: archetype line + the narrative opening (report CONTENT)
  var pt=data.primaryTitle||{};
  var typeLine=document.getElementById('repType');
  typeLine.innerHTML=(pt.name?glyphFor(pt.id,15)+' <b>'+esc(pt.name)+'</b>':'<b>No kind earned yet</b> <span class="rt-sep" style="opacity:.7">(no craft has reached 80)</span>')
    +(data.composite?'<span class="rt-sep">·</span>overall <b>'+data.composite+'</b>':'')
    +((am.confidence!=null)?'<span class="rt-sep">·</span>confidence '+am.confidence+'%':'');

  // Narrative + positioning line
  document.getElementById('repNarr').textContent=enr.narrative||'';
  document.getElementById('repPos').textContent=enr.positioningLine||'';

  // Wrapped cards (Paxel)
  const cards=buildCards(data);
  document.getElementById('repCards').innerHTML=cards.map(c=>
    `<div class="pcard"><div class="pic"><div class="dots"><i></i><i></i><i></i></div></div><div class="pbody"><div class="q">${esc(c.q)}</div><div class="a">${esc(String(c.a))}</div><div class="d">${esc(c.d||'')}</div></div></div>`
  ).join('');

  // Six narrative blocks
  renderNarrative(enr);

  // Scores band
  renderScores(data);

  // Where you sit — the same 2D map as the profile
  renderLevMap(data);

  // Report depth: projects, timeline, evidence appendix (data-gated)
  renderProjects(data);
  renderTimeline(data);
  renderEvidence(data);

  // AI Engineering DNA: radar + business fit map (report-only)
  renderDNA(data);

  // Experimental tab
  renderExp(data);
  renderCI(data);
}

// ═══ NARRATIVE BLOCKS ═════════════════════════════════════

function renderNarrative(e){
  const wyb=Array.isArray(e.whatYouBuilt)?e.whatYouBuilt:[e.whatYouBuilt].filter(Boolean);
  const dp=e.decisionPatterns||{}, st=dp.stats||{};
  let h='';

  // 1. Your narrative
  if(e.narrative){
    h+=`<div class="nsec"><h3>Your narrative</h3><p>${esc(e.narrative)}</p></div>`;
  }

  // 2. What you built
  if(wyb.length){
    h+=`<div class="nsec"><h3>What you built</h3>${wyb.map(p=>`<p>${esc(p)}</p>`).join('')}</div>`;
  }

  // 3. Decision patterns
  if(dp.style||(dp.named&&dp.named.length)){
    h+=`<div class="nsec"><h3>Decision patterns</h3>`;
    if(dp.style)h+=`<p>${esc(dp.style)}</p>`;
    if(st.detected){
      h+=`<div class="dp-stats"><span><b>${st.detected}</b> decisions</span><span><b>${st.highValue||0}</b> high-value</span>`;
      if(st.byDomain){
        Object.entries(st.byDomain).forEach(([k,v])=>{h+=`<span>${esc(k)}: <b>${v}</b></span>`;});
      }
      h+=`</div>`;
    }
    if(dp.named&&dp.named.length){
      h+=`<div class="named">${dp.named.map(n=>`<div class="it"><div class="nm">${esc(n.name)}</div><div class="ev">${esc(n.evidence||'')}</div></div>`).join('')}</div>`;
    }
    h+=`</div>`;
  }

  // 4. Strengths (prominent)
  if((e.strengths||[]).length){
    h+=`<div class="nsec"><h3>Strengths</h3><div class="slist">${e.strengths.map(s=>{
      const claim=typeof s==='string'?s:(s.claim||'');
      const ev=typeof s==='object'?(s.evidence||''):'';
      return `<div class="s"><span class="dot"></span><div><b>${esc(claim)}</b>${ev?'<div style="color:var(--ink-soft);font-size:13.5px;margin-top:2px">'+esc(ev)+'</div>':''}</div></div>`;
    }).join('')}</div></div>`;
  }

  // 5. Growth areas — private BY DEFAULT; the user can opt them into
  // shared artifacts via the visibility toggle below (served mode)
  if((e.growthAreas||[]).length){
    h+=`<div class="nsec nsec--private"><h3>Growth areas</h3><div class="private-lock">${glyph('lock',12)} Private by default</div>`;
    h+=`<div class="glist">${e.growthAreas.map((g,i)=>{
      const obs=typeof g==='string'?g:(g.observed||'');
      const next=typeof g==='object'?(g.nextSignal||''):'';
      return `<div class="g"><span class="n">${i+1}</span><div><b>${esc(obs)}</b>${next?'<div class="nx">'+esc(next)+'</div>':''}</div></div>`;
    }).join('')}</div>`;
    h+=`<div class="private-note" id="growthShareNote">Excluded from shared/exported reports unless you switch it on.</div>`;
    h+=`<label class="growth-toggle" id="growthToggleWrap" style="display:none"><input type="checkbox" id="growthShareToggle" onchange="setGrowthSharing(this.checked)"> include growth areas when I share or export this report</label></div>`;
  }

  // 6. How you use AI
  const p=e.howYouUseAI;
  if(p){
    h+=`<div class="nsec"><h3>How you use AI</h3><div class="persona"><div class="persona-gl">${glyph('diamond',26)}</div><div><div class="pn">${esc(p.persona||'')}</div><div class="pl">${esc(p.line||'')}</div><div class="pe">${p.evidencePoints||0} evidence points</div></div></div></div>`;
  }

  // Heuristic fallback: if no enrichment blocks at all, show a minimal message
  if(!h){
    h=`<div class="nsec"><h3>Narrative</h3><p>Run <code>nextmillionai enrich</code> to unlock detailed narrative blocks about how you build with AI.</p></div>`;
  }

  // Heuristic banner: nudge toward agent-written enrichment
  if(e.source==='heuristic'){
    h=`<div class="early-banner">${glyph('info',14)}<div><b>Auto-generated narrative</b> — derived from your scores. Run <code>nextmillionai enrich</code> to have your own AI agent write a richer, evidence-backed narrative.</div></div>`+h;
  }

  document.getElementById('repNarrative').innerHTML=h;
}

// ═══ SCORES BAND ══════════════════════════════════════════

function dimScore(val){
  if(typeof val==='number')return val;
  if(val&&typeof val==='object'&&typeof val.score==='number')return val.score;
  return 0;
}

function renderScores(data){
  if(!document.getElementById('repScores'))return;
  const am=data.assessment||{};
  const dims=data.dimensions||{};
  const composite=data.intent_score||data.composite||0;

  // Build dimension bars — handle both dict-of-dicts and array-of-objects
  let dimHTML='';
  if(Array.isArray(dims)){
    // Array format (from mockup data)
    dimHTML=dims.map(d=>{
      const s=d.score||0;
      return `<div class="sd"><span class="sn">${esc(d.name)}</span><span class="sb"><i style="width:${s}%;background:${band(s)}"></i></span><span class="sv">${s}</span></div>`;
    }).join('');
  }else{
    // Dict format (from real assessment JSON)
    dimHTML=DIM_ORDER.map(id=>{
      const raw=dims[id];
      if(raw==null)return '';
      const name=DIM_NAMES[id]||id;
      const sval=(raw&&typeof raw==='object')?raw.score:raw;
      if(sval==null){
        // insufficient is SHOWN, never hidden or zeroed
        return `<div class="sd insuf"><span class="sn">${esc(name)}</span><span class="sb"></span><span class="sv">\u2014 <i>insufficient</i></span></div>`;
      }
      const s=dimScore(raw);
      return `<div class="sd"><span class="sn">${esc(name)}</span><span class="sb"><i style="width:${s}%;background:${band(s)}"></i></span><span class="sv">${s}</span></div>`;
    }).join('');
  }

  const earlyRep=(am.confidence||0)<45||(am.sessions||0)<5;
  document.body.classList.toggle('early-profile',earlyRep);
  document.getElementById('repScores').innerHTML=
    (earlyRep?'<div class="early-banner">'+glyph('spark',14)+'<div><b>Early profile — limited data so far.</b> The numbers below are provisional reads; more sessions sharpen them.</div></div>':'')
    +`<div class="ovr">${ringSVG(composite,92,8)}${earlyRep?'<div class="prov-chip">provisional</div>':''}<div class="lbl">overall</div><div class="cf">confidence <b>${am.confidence||0}%</b></div></div><div class="dl">${dimHTML}</div>`;

  const scopeSources=(am.sourcesUsed||am.sources_used||[]).join(', ');
  document.getElementById('repScope').innerHTML=
    `computed over <b>${esc(am.dateRange||'\u2014')}</b> \u00b7 ${esc(scopeSources)} \u00b7 no percentiles, research-anchored bands \u00b7 <b>nextmillionai calibrate</b> to widen`;
}

// ═══ WHERE YOU SIT — the SAME 2D positioning map as the profile ════
// (the old cramped strip with the overlapping YOU marker is gone)

const _LEV_STAGES=[
  {id:'prompting',label:'Prompting',desc:'Directs the agent turn by turn.'},
  {id:'harnessing',label:'Harnessing',desc:'Builds scaffolding around the agent — rules, MCPs, hooks.'},
  {id:'designs_the_loop',label:'Designs the loop',desc:'Designs loops & orchestration that drive the agents.'}
];
const _POS_DOMAINS=[
  {id:'products',label:'Products',sub:'AI is how you move'},
  {id:'ai_products',label:'AI products',sub:'the model ships in the feature'},
  {id:'ai_systems',label:'AI systems',sub:'the machines that build'}
];
const _DOM_LABELS={products:'Product builder',ai_products:'AI-powered products',ai_systems:'AI-systems builder'};

function _repStageSubs(data){
  const h=data.harness||{};
  const ws=data.wrappedStats||{};
  const harn=[
    h.rules?h.rules+' rules':null,
    h.mcpRepos?h.mcpRepos+' MCP repos':null,
    h.skills?h.skills+' skills':null,
    h.hooks?h.hooks+' hooks':null
  ].filter(Boolean);
  const loop=[
    (ws.maxParallelAgents||0)>1?ws.maxParallelAgents+' parallel agents':null,
    h.subagentDispatches?h.subagentDispatches+' subagent dispatches':null
  ].filter(Boolean);
  return {
    prompting:'direct, turn by turn',
    harnessing:harn.length?harn.join(' · '):'rules · MCPs · hooks · skills',
    designs_the_loop:loop.length?loop.join(' · '):'state files · scheduled loops · orchestration'
  };
}

function renderLevMap(data){
  const section=document.getElementById('repMapSection');
  const el=document.getElementById('repLevMap');
  if(!section||!el)return;
  const pos=data.positioning||{};
  const lev=typeof pos.leverageMode==='object'?(pos.leverageMode.current||''):(pos.leverageMode||'');
  const dom=typeof pos.buildDomain==='object'?(pos.buildDomain.primary||''):(pos.buildDomain||'');
  const exp=typeof pos.leverageMode==='object'?(pos.leverageMode.adjacent||''):(pos.nearestExpansion||'');
  if(!lev&&!dom){section.style.display='none';return;}
  section.style.display='';

  const fp=(pos.footprint||{}).cells||[];
  const weights={};
  fp.forEach(c=>{weights[c.domain+'|'+c.stage]=c.weight;});
  const maxW=Math.max.apply(null,fp.map(c=>c.weight).concat([1]));
  const subs=_repStageSubs(data);
  const stages=_LEV_STAGES.slice().reverse(); // designs_the_loop on top
  const nextIdx=_LEV_STAGES.findIndex(s=>s.id===lev)+1;
  const nextStage=(exp&&nextIdx<_LEV_STAGES.length)?_LEV_STAGES[nextIdx].id:null;

  let h='<div class="pm">';
  stages.forEach(s=>{
    h+='<div class="pm-row">';
    h+='<div class="pm-stage"><b>'+s.label+'</b><span>'+esc(subs[s.id]||s.desc)+'</span></div>';
    _POS_DOMAINS.forEach(d=>{
      const w=weights[d.id+'|'+s.id]||0;
      const here=(d.id===dom&&s.id===lev);
      const next=(d.id===dom&&s.id===nextStage);
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
    +_POS_DOMAINS.map(d=>'<div class="pm-col"><b>'+d.label+'</b><span>'+d.sub+'</span></div>').join('')
    +'</div></div>';

  // Footprint distribution + tech tags below the grid
  const bd=typeof pos.buildDomain==='object'?pos.buildDomain:{};
  let tags='<div class="lev-domain">';
  if(dom)tags+=`<span class="lev-tag">builds: <b>${esc(_DOM_LABELS[dom]||dom)}</b></span>`;
  (bd.distribution||[]).forEach(d2=>{
    tags+=`<span class="lev-tag">${esc(_DOM_LABELS[d2.domain]||d2.domain)} <b>${d2.weight}%</b> · ${d2.projects} repo${d2.projects!==1?'s':''}</span>`;
  });
  (pos.techDomains||[]).slice(0,3).forEach(t=>{
    const pct=t.weight!=null?(t.weight>1?Math.round(t.weight):Math.round(t.weight*100)):(t.pct||0);
    tags+=`<span class="lev-tag">${esc(t.name)} <b>${pct}%</b></span>`;
  });
  tags+='</div>';
  const cap=exp?`<div class="lev-arrow"><span class="arr">&rarr;</span> ${esc(exp)} · Higher leverage is fit, not better — worth it for decomposable work, ~15× the tokens.</div>`:'';
  el.innerHTML=h+tags+cap;
}

// ═══ PER-PROJECT BREAKDOWN (private; hidden in shared artifacts) ════

function renderProjects(data){
  const sec=document.getElementById('repProjSection');
  const el=document.getElementById('repProjects');
  if(!sec||!el)return;
  const projs=(data.scannedProjects||[]).filter(p=>p&&p.name);
  if(!projs.length){sec.style.display='none';return;}
  sec.style.display='';
  const top=projs.slice().sort((a,b)=>(b.sessionCount||0)-(a.sessionCount||0)).slice(0,10);
  const max=Math.max.apply(null,top.map(p=>p.sessionCount||0).concat([1]));
  el.innerHTML='<div class="proj-rows">'+top.map(p=>{
    const w=Math.max(2,Math.round((p.sessionCount||0)/max*100));
    return `<div class="proj-row"><span class="pr-name">${esc(p.name)}</span>`
      +`<span class="pr-bar"><i style="width:${w}%"></i></span>`
      +`<span class="pr-n">${p.sessionCount||0} sessions</span>`
      +`<span class="pr-meta">${esc((p.languages||[]).slice(0,3).join(', '))}${p.lastActive?' · last '+esc(p.lastActive):''}</span></div>`;
  }).join('')+'</div>'
  +'<div class="rep-note">Sessions counted from your local stores. This section is private — it never appears in shared or exported reports.</div>';
}

// renderTimeline lives in tabs-shared.js (shared with profile)

// ═══ EVIDENCE APPENDIX — every claim, with its measured pointer ═════

function renderEvidence(data){
  const sec=document.getElementById('repEvidenceSection');
  const el=document.getElementById('repEvidence');
  if(!sec||!el)return;
  const rows=[];
  const dims=data.dimensions||{};
  DIM_ORDER.forEach(id=>{
    const d=dims[id];
    if(!d||typeof d!=='object')return;
    const evs=Array.isArray(d.evidence)?d.evidence:[];
    evs.forEach(ev=>rows.push({claim:(DIM_NAMES[id]||id)+(d.score!=null?' '+d.score:''),pointer:ev,src:'counted session + git signals'}));
  });
  const pos=data.positioning||{};
  const bd=typeof pos.buildDomain==='object'?pos.buildDomain:{};
  (bd.evidence||[]).forEach(ev=>rows.push({claim:'Build domain: '+(_DOM_LABELS[bd.primary]||bd.primary||''),pointer:ev,src:ev.indexOf('verified')>=0?'code scan (imports + call sites)':'dependency manifests'}));
  const lm=typeof pos.leverageMode==='object'?pos.leverageMode:{};
  (lm.evidence||[]).forEach(ev=>rows.push({claim:'Leverage: '+(lm.current||''),pointer:ev,src:'harness + ledger evidence'}));
  const enr=data.enrichment||{};
  (enr.strengths||[]).forEach(s=>{
    if(typeof s==='object'&&s.claim)rows.push({claim:s.claim,pointer:s.evidence||'—',src:'narrative (derived-only)'});
  });
  const named=(enr.decisionPatterns||{}).named||[];
  named.forEach(n=>{if(n.name)rows.push({claim:n.name,pointer:n.evidence||'—',src:'decision patterns'});});

  if(!rows.length){sec.style.display='none';return;}
  sec.style.display='';
  el.innerHTML='<table class="ev-table"><thead><tr><th>Claim</th><th>Pointer (measured basis)</th><th>Source</th></tr></thead><tbody>'
    +rows.map(r=>`<tr><td>${esc(r.claim)}</td><td>${esc(r.pointer)}</td><td class="ev-src">${esc(r.src)}</td></tr>`).join('')
    +'</tbody></table>'
    +'<div class="rep-note">Pointers are derived counts and names from your local sessions, git history and ledger — never raw code or transcripts.</div>';
}

// ═══ AI ENGINEERING DNA (radar + business fit map) ═════════

function dnaShow(which){
  document.getElementById('dnaRadar').style.display=which==='radar'?'block':'none';
  document.getElementById('dnaMapWrap').style.display=which==='map'?'block':'none';
  // Zone panel + caveat only visible in map mode
  var zp=document.getElementById('dnaZonePanel');
  if(zp&&which==='radar')zp.innerHTML='';
  document.getElementById('dnaMapCaveat').style.display=which==='map'?'':'none';
  // Kinds stay visible in both modes
  document.getElementById('dnaTabRadar').classList.toggle('on',which==='radar');
  document.getElementById('dnaTabMap').classList.toggle('on',which==='map');
}

function renderDNA(data){
  const archetypes=data.archetypes||[];
  const fit=data.businessFit;
  const sec=document.getElementById('repDnaSection');
  if(!sec)return;
  if(archetypes.length<3){sec.style.display='none';return;}
  sec.style.display='block';

  renderRadar(archetypes);
  renderDnaKinds(data);
  if(fit&&fit.zones){renderFitMap(data,fit);}
  else{
    document.getElementById('dnaTabMap').style.display='none';
    document.getElementById('dnaMapWrap').style.display='none';
  }
}

// Every kind we measure — full detail (the profile shows only a compact
// badge row; the exploration lives here). Map, not ladder: availability
// is described as evidence, never as distance-to-target.
function renderDnaKinds(data){
  var cat=data.titlesCatalog||[];
  var el=document.getElementById('dnaKinds');
  if(!el||!cat.length){if(el)el.innerHTML='';return;}
  var specialized=cat.filter(function(c){return !c.baseline;});
  var specHeld=specialized.filter(function(c){return c.earned;}).length;
  el.innerHTML='<div class="h2sub">'+specialized.length+' specialized crafts · you hold '+specHeld+' + the AI Explorer baseline. Different crafts, never rungs.</div>'
    +'<div class="dna-kinds">'+cat.map(function(k){
      var badge=k.baseline?'<span class="kb base">baseline</span>':(k.legendary?'<span class="kb leg">legendary</span>':(k.rare?'<span class="kb rare">rare</span>':''));
      var appears=k.earnedBy?('Appears when your signals show: '+k.earnedBy.replace(/\u2265\s*(\d+)/g,'in the $1 band')):'';
      return '<div class="dk '+(k.earned?'on':'')+'">'
        +'<div class="dk-head">'+glyphFor(k.id,16)+'<b>'+esc(k.name)+'</b>'+badge
        +(k.earned?'<span class="dk-yours">yours</span>':'')+'</div>'
        +'<div class="dk-t">'+esc(k.tagline)+'</div>'
        +'<div class="dk-m">sought by: '+esc(k.idealFor)+'</div>'
        +(k.earned?'':'<div class="dk-m">'+esc(appears)+'</div>')
        +'</div>';
    }).join('')+'</div>';
}

// ── Competency radar: archetype shape at a glance ──
function renderRadar(archetypes){
  const A=archetypes.slice(0,9);
  const n=A.length,W=840,H=580,cx=W/2,cy=H/2-12,R=168;
  const ang=i=>(i/n)*2*Math.PI-Math.PI/2;
  const pt=(i,r)=>[cx+Math.cos(ang(i))*r,cy+Math.sin(ang(i))*r];

  let s=`<svg viewBox="0 0 ${W} ${H}" class="radar-svg" role="img" aria-label="Archetype competency radar">`;
  // grid rings + spokes
  for(const lvl of [25,50,75,100]){
    const ring=A.map((_,i)=>pt(i,R*lvl/100).map(v=>v.toFixed(1)).join(',')).join(' ');
    s+=`<polygon points="${ring}" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="${lvl===100?'none':'3 4'}"/>`;
  }
  for(let i=0;i<n;i++){
    const [x2,y2]=pt(i,R);
    s+=`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--line-2)" stroke-width="1"/>`;
  }
  // score polygon
  const poly=A.map((a,i)=>pt(i,R*(a.score||0)/100).map(v=>v.toFixed(1)).join(',')).join(' ');
  s+=`<polygon points="${poly}" fill="var(--accent)" fill-opacity="0.10" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
  // vertex dots + labels
  A.forEach((a,i)=>{
    const [vx,vy]=pt(i,R*(a.score||0)/100);
    const col=a.color||'var(--accent)';
    s+=`<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="5" fill="${col}" stroke="var(--surface)" stroke-width="2"/>`;
    const [lx,ly]=pt(i,R+34);
    const anchor=Math.abs(Math.cos(ang(i)))<0.3?'middle':(Math.cos(ang(i))>0?'start':'end');
    s+=`<text x="${lx.toFixed(1)}" y="${(ly-4).toFixed(1)}" text-anchor="${anchor}" font-family="JetBrains Mono" font-size="11" fill="var(--ink-soft)">${esc(a.name)}</text>`;
    s+=`<text x="${lx.toFixed(1)}" y="${(ly+13).toFixed(1)}" text-anchor="${anchor}" font-family="Space Grotesk" font-weight="700" font-size="15" fill="${col}">${a.score||0}</text>`;
  });
  s+='</svg>';
  document.getElementById('dnaRadar').innerHTML=s;
}

// ── Business fit map: segments landscape + fit-to-segment ──
let _fitData=null;
function renderFitMap(data,fit){
  _fitData=fit;
  var W=920,H=660,M={l:80,r:80,t:46,b:54};
  var pw=W-M.l-M.r, ph=H-M.t-M.b;
  var px=function(x){return M.l+((x+1)/2)*pw;};
  var py=function(y){return H-M.b-((y+1)/2)*ph;};
  var topIds={};
  (fit.topFits||[]).forEach(function(t){topIds[t.id]=true;});

  var s='<svg viewBox="0 0 '+W+' '+H+'" class="fitmap-svg" role="img" aria-label="Business fit map">';
  // soft quadrant background
  s+='<rect x="'+M.l+'" y="'+M.t+'" width="'+pw+'" height="'+ph+'" rx="8" fill="var(--surface-2)" stroke="var(--line)" stroke-width="1"/>';
  // quadrant axes
  s+='<line x1="'+px(-1)+'" y1="'+py(0)+'" x2="'+px(1)+'" y2="'+py(0)+'" stroke="var(--line)" stroke-dasharray="5 6"/>';
  s+='<line x1="'+px(0)+'" y1="'+py(-1)+'" x2="'+px(0)+'" y2="'+py(1)+'" stroke="var(--line)" stroke-dasharray="5 6"/>';
  // axis labels (using page palette)
  s+='<text x="'+(W/2)+'" y="'+(M.t-14)+'" text-anchor="middle" class="fm-axis">'+esc(fit.axes.y[1]).toUpperCase()+'</text>';
  s+='<text x="'+(W/2)+'" y="'+(H-12)+'" text-anchor="middle" class="fm-axis">'+esc(fit.axes.y[0]).toUpperCase()+'</text>';
  s+='<text x="'+(M.l-14)+'" y="'+(H/2)+'" text-anchor="middle" class="fm-axis" transform="rotate(-90 '+(M.l-14)+' '+(H/2)+')">'+esc(fit.axes.x[0]).toUpperCase()+'</text>';
  s+='<text x="'+(W-M.r+14)+'" y="'+(H/2)+'" text-anchor="middle" class="fm-axis" transform="rotate(90 '+(W-M.r+14)+' '+(H/2)+')">'+esc(fit.axes.x[1]).toUpperCase()+'</text>';

  // zone ellipses — muted palette, no zone-specific colors
  fit.zones.forEach(function(z){
    var zx=px(z.x),zy=py(z.y);
    var rx=z.radiusX*pw/2, ry=z.radiusY*ph/2;
    var hot=!!topIds[z.id];
    s+='<g class="fm-zone'+(hot?' hot':'')+'" onclick="fitZoneClick(\''+z.id+'\')" style="cursor:pointer">';
    s+='<ellipse cx="'+zx.toFixed(1)+'" cy="'+zy.toFixed(1)+'" rx="'+rx.toFixed(1)+'" ry="'+ry.toFixed(1)+'" fill="var(--accent)" fill-opacity="'+(hot?0.08:0.03)+'" stroke="var(--accent)" stroke-opacity="'+(hot?0.45:0.18)+'" stroke-width="1.5"/>';
    s+='<text x="'+zx.toFixed(1)+'" y="'+(zy-4).toFixed(1)+'" text-anchor="middle" class="fm-zname" fill="var(--ink)">'+esc(z.name)+'</text>';
    s+='<text x="'+zx.toFixed(1)+'" y="'+(zy+10).toFixed(1)+'" text-anchor="middle" class="fm-zcat">'+esc((z.categories||[]).slice(0,2).join(' · '))+'</text>';
    s+='</g>';
  });

  // gravity lines to top fits + chips
  var ux=px(fit.position.x), uy=py(fit.position.y);
  fit.zones.filter(function(z){return !!topIds[z.id];}).forEach(function(z){
    var zx=px(z.x),zy=py(z.y);
    var mx=(ux+zx)/2, my=(uy+zy)/2;
    s+='<line x1="'+ux+'" y1="'+uy+'" x2="'+zx+'" y2="'+zy+'" stroke="var(--accent)" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="3 5"/>';
    var chipLabel=z.isStrongFit?'strong fit':Math.min(z.affinity,99)+'%';
    var chipW=z.isStrongFit?74:50;
    s+='<g onclick="fitZoneClick(\''+z.id+'\')" style="cursor:pointer"><rect x="'+(mx-chipW/2)+'" y="'+(my-11)+'" width="'+chipW+'" height="20" rx="10" fill="var(--surface)" stroke="var(--accent)" stroke-opacity="0.6"/><text x="'+mx+'" y="'+(my+3)+'" text-anchor="middle" class="fm-chip" fill="var(--accent)">'+chipLabel+'</text></g>';
  });

  // the builder dot
  s+='<circle cx="'+ux+'" cy="'+uy+'" r="12" fill="var(--accent)" fill-opacity="0.15"/>';
  s+='<circle cx="'+ux+'" cy="'+uy+'" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="2.5"/>';
  s+='<text x="'+ux+'" y="'+(uy+26)+'" text-anchor="middle" class="fm-you">'+esc(data.name||'You')+'</text>';
  s+='</svg>';
  document.getElementById('dnaMapSvg').innerHTML=s;

  // open the panel on the top fit by default
  if(fit.topFits&&fit.topFits[0])fitZoneClick(fit.topFits[0].id);
}

function fitZoneClick(zoneId){
  const fit=_fitData;if(!fit)return;
  const z=fit.zones.find(x=>x.id===zoneId);if(!z)return;
  const archNames={agent_builder:'Agent Builder',multi_agent_orchestrator:'Multi-Agent Orchestrator',integration_architect:'Integration Architect',code_weaver:'Code Weaver',rapid_prototyper:'Rapid Prototyper',system_thinker:'System Thinker',automation_engineer:'Automation Engineer',cli_native:'CLI-Native Builder',context_engineer:'Context Engineer'};
  const reqs=(z.requirements||[]).map(r=>{
    const ok=r.actual>=r.minScore;
    return `<div class="fm-req ${ok?'ok':'gap'}"><span class="fm-rn">${esc(archNames[r.archetypeId]||r.archetypeId)}</span><span class="fm-rb"><i style="width:${Math.min(r.actual,100)}%;background:${ok?'var(--good)':'var(--mid)'}"></i></span><span class="fm-rv">${r.actual}<span class="fm-rmin">/ ${r.minScore}</span></span></div>`;
  }).join('');
  var el=document.getElementById('dnaZonePanel');
  el.innerHTML=
    `<div class="fm-panel">`
    +`<div class="fm-panel-head"><div><b>${esc(z.name)}</b><div class="fm-zcat2">${esc((z.categories||[]).join(' · '))}</div></div>`
    +`<div class="fm-aff">${z.isStrongFit?'strong':Math.min(z.affinity,99)+'%'}<span> fit${z.isStrongFit?' — every band met':''}</span></div></div>`
    +`<div class="fm-desc">${esc(z.description||'')}</div>`
    +`<div class="fm-reqs">${reqs}</div>`
    +'</div>';
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}

// ═══ LAB ══════════════════════════════════════════════════

function sparkSVG(series,w,h){
  if(!series||series.length<2)return '';
  w=w||170;h=h||32;
  const max=Math.max(...series),min=Math.min(...series);
  const range=(max-min)||1,pad=2;
  const pts=series.map((v,i)=>{
    const px=pad+i*((w-pad*2)/(series.length-1));
    const py=h-pad-((v-min)/range)*(h-pad*2);
    return px.toFixed(1)+','+py.toFixed(1);
  }).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;margin:6px 0 2px"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderExp(data){
  const x=data.experimental;
  const el=document.getElementById('repExp');
  if(x===undefined){
    // Shareable/exported JSON carries no experimental block at all —
    // hide the tab rather than imply the data doesn't exist.
    const tab=document.getElementById('tabExp');
    if(tab)tab.style.display='none';
    return;
  }
  if(!x||!x.available){
    el.innerHTML='<div style="font-family:var(--mono);font-size:11px;color:var(--muted);padding:16px;">Not enough rich data yet for Lab signals — they appear as your session history grows.</div>';
    return;
  }
  el.innerHTML=(x.signals||[]).map(s=>
    `<div class="exp"><span class="bd">${esc(s.kind||'beta')}</span><div class="l">${esc(s.label)}</div><div class="h">${esc(s.headline)}</div>${s.series?sparkSVG(s.series):''}<div class="d">${esc(s.detail||'')}</div><div class="cf"><i><b style="width:${s.confidence||0}%"></b></i>${s.confidence||0}% confidence</div></div>`
  ).join('');
}

// ═══ CODE INTELLIGENCE ═══════════════════════════════════

function renderCI(data){
  const el=document.getElementById('repCI');
  if(!el)return;
  const x=data.experimental;
  const items=(x&&x.codeIntelligence)||[];
  if(!items.length){el.innerHTML='';return;}

  // Group cards by repo (title format: "repo: detail"), cap per group
  const groups={};
  items.forEach(c=>{
    const repo=(c.title||'').split(':')[0]||'other';
    (groups[repo]=groups[repo]||[]).push(c);
  });
  const names=Object.keys(groups).sort((a,b)=>groups[b].length-groups[a].length);

  el.innerHTML=names.map((repo,gi)=>{
    const cards=groups[repo];
    const inner=cards.slice(0,6).map(c=>
      `<div class="ci"><div class="l">${esc(c.label||'')}</div><div class="t">${esc(c.title||'')}</div><div class="find">${esc(c.find||'')}</div><div class="sugg">${esc(c.sugg||'')}</div><div class="basis">${esc(c.basis||'')} \u00b7 ${c.confidence||0}% confidence</div></div>`
    ).join('')
    +(cards.length>6?`<div style="font-family:var(--mono);font-size:11px;color:var(--muted);padding:8px 0">+${cards.length-6} more in this repo</div>`:'');
    return `<details class="ci-group"${gi<2?' open':''}><summary><b>${esc(repo)}</b> \u00b7 ${cards.length} finding${cards.length!==1?'s':''}</summary>${inner}</details>`;
  }).join('');
}

// ═══ VIEW AS PUBLIC ═════════════════════════════════════════

function togglePublicReport(){
  if(window._publicMode){
    window._publicMode=false;
    document.getElementById('repPubBanner').style.display='none';
    var _pb=document.getElementById('repPublicBtn');if(_pb)_pb.textContent='View as public';
    var tab=document.getElementById('tabExp');if(tab)tab.style.display='';
    render(window._reportPrivate);
    return;
  }
  var apply=function(pub){
    window._reportPrivate=window._reportData;
    window._reportData=pub;
    window._publicMode=true;
    document.getElementById('repPubBanner').style.display='block';
    var _pb=document.getElementById('repPublicBtn');if(_pb)_pb.textContent='← Back to private view';
    render(pub);showView('report');window.scrollTo(0,0);
  };
  if(window._RAW_PUBLIC){apply(window._RAW_PUBLIC);return;}
  fetch('/api/profile/public').then(r=>r.ok?r.json():null).then(function(pub){
    if(pub){window._RAW_PUBLIC=pub;apply(pub);}
  }).catch(function(){});
}

// ═══ GROWTH SHARING TOGGLE (visibility config, served mode) ═══

function hydrateGrowthToggle(){
  var wrap=document.getElementById('growthToggleWrap');
  if(!wrap||!window._servedMode)return;
  fetch('/api/profile/config').then(r=>r.ok?r.json():null).then(function(cfg){
    if(!cfg)return;
    wrap.style.display='flex';
    var on=!!(((cfg.sections||{}).growthAreas)||{}).includeInShareable;
    document.getElementById('growthShareToggle').checked=on;
    var note=document.getElementById('growthShareNote');
    if(note&&on)note.textContent='You opted in: growth areas WILL appear in shared/exported reports.';
  }).catch(function(){});
}

function setGrowthSharing(on){
  fetch('/api/profile/config').then(r=>r.ok?r.json():null).then(function(cfg){
    if(!cfg)return;
    cfg.sections=cfg.sections||{};
    cfg.sections.growthAreas=cfg.sections.growthAreas||{showOnPage:true};
    cfg.sections.growthAreas.includeInShareable=!!on;
    return fetch('/api/profile/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
  }).then(function(){
    window._RAW_PUBLIC=null; // public cache is stale now
    var note=document.getElementById('growthShareNote');
    if(note)note.textContent=on
      ?'You opted in: growth areas WILL appear in shared/exported reports.'
      :'Excluded from shared/exported reports unless you switch it on.';
  }).catch(function(){});
}

// ═══ DOWNLOAD JSON ════════════════════════════════════════

function downloadJSON(){
  const data=window._reportData||{};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='assessment.json';
  a.click();
}

// ═══ INIT ═════════════════════════════════════════════════

function hydrateGlyphs(){
  document.querySelectorAll('[data-g]').forEach(function(el){
    el.innerHTML=glyph(el.getAttribute('data-g'),14);
  });
}

var REPORT_EXPLAIN=[
  {sel:'.pcard',label:'This stat',how:'Counted directly from your session and git metadata over the assessment window.',anchor:'7-wrapped-stats-signal-cards'},
  {sel:'.scoreband',label:'Scores band',how:'Six dimensions, each arithmetic over counted local signals against research-anchored bands; the overall is an archetype-relative weighted mean. No percentiles.',anchor:'2-the-six-dimensions'},
  {sel:'#dnaRadar',label:'Competency radar',how:'All nine archetype scores, each computed independently from counted signals — multi-hold by design, no single bucket.',anchor:'4-archetypes-independent-multi-hold'},
  {sel:'#dnaMap,#dnaZonePanel',label:'Business fit map',how:'Axes are archetype-weighted sums; affinity is weighted closeness of your scores to each segment requirement band. Fit-to-segment, never builder-vs-builder.',anchor:'10-business-fit-map-fit-to-segment-report-only'},
  {sel:'#repNarrative',label:'Narrative',how:'Written by YOUR agent (or a local heuristic) from derived signals only — it can never change a score.',anchor:'where-a-model-does-and-does-not-come-in'},
  {sel:'.exp',label:'Lab signal',how:'An experimental read, calibrating: each card states its basis and confidence, and never enters a shared report.',anchor:null}
];

async function init(){
  hydrateGlyphs();
  initExplain(REPORT_EXPLAIN);
  let data=null;
  try{
    data=await fetch('/api/profile').then(r=>{if(r.ok)return r.json();return null;}).catch(()=>null);
    window._servedMode=!!data;
    if(!data){
      // Static export artifact: both views read the same ./assessment.json
      data=await fetch('./assessment.json').then(r=>{if(r.ok)return r.json();return null;}).catch(()=>null);
    }
  }catch(e){}

  if(!data||typeof data!=='object'){
    document.getElementById('pfName').textContent='No assessment data found';
    document.getElementById('repNarr').textContent='Run nextmillionai assess to generate your report.';
    return;
  }

  window._reportData=data;
  if(!window._servedMode){
    var pb=document.getElementById('repPublicBtn');
    if(pb)pb.style.display='none';
  }
  render(data);
  hydrateGrowthToggle();
  // Fetch visibility config, then render shared tabs with correct project visibility
  nmaFetchVisConfig(function(){
    nmaRenderSharedTabs(nmaSharedPrep(data));
  });
  nmaInitFlip('report','viewReport');
  if(window._servedMode){
    fetch('/api/cli').then(function(r){return r.ok?r.json():null;}).then(function(c){
      if(c&&c.cli){window._CLI=c.cli;applyCli();}
    }).catch(function(){});
  }
  initPdfStyle('repPdfStyle');
  nmaMaybeAutoPrint();

  // Live indicator — disabled (post-launch).
  // if(window._servedMode){
  //   var gen=((data.assessment||{}).generated_at)||'';
  //   window._liveSnapshotDate=gen?gen.slice(0,10):'';
  //   initLiveBadge('rpLive',function(){
  //     fetch('/api/profile').then(function(r){return r.ok?r.json():null;}).then(function(fresh){
  //       if(!fresh)return;
  //       window._reportData=fresh;
  //       var g2=((fresh.assessment||{}).generated_at)||'';
  //       window._liveSnapshotDate=g2?g2.slice(0,10):'';
  //       render(fresh);
  //       hydrateGrowthToggle();
  //     }).catch(function(){});
  //   });
  // }
}

document.addEventListener('DOMContentLoaded',init);
