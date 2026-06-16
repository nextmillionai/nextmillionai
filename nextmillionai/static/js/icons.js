// ═══════════════════════════════════════════════════════════
// icons.js — the nextmillionai monoline glyph set.
// One coherent system: 24x24, stroke=currentColor, no fills, no emoji.
// Emoji render differently per OS and read as unpolished on a
// credential; these inherit the ink/accent palette instead.
// ═══════════════════════════════════════════════════════════

const NMA_GLYPHS={
  // ── archetype / kind glyphs ──
  agent:      '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.5" stroke-dasharray="3.4 3.4"/>',
  orchestra:  '<circle cx="12" cy="5.5" r="2.2"/><circle cx="5.5" cy="17" r="2.2"/><circle cx="18.5" cy="17" r="2.2"/><path d="M11 7.5 6.5 15M13 7.5l4.5 7.5M7.7 17h8.6"/>',
  hexagon:    '<path d="M12 3l7.5 4.3v8.6L12 20.2 4.5 15.9V7.3L12 3z"/>',
  diamond:    '<path d="M12 3.5 20 12l-8 8.5L4 12l8-8.5z"/><path d="M8 12h8" opacity=".5"/>',
  velocity:   '<path d="M5 19 19 5M10 5h9v9"/>',
  layers:     '<path d="M12 4 4 8.5 12 13l8-4.5L12 4z"/><path d="M4 13.5 12 18l8-4.5" opacity=".6"/>',
  context:    '<path d="M8 4H5.5v16H8M16 4h2.5v16H16"/><circle cx="12" cy="12" r="2"/>',
  gear:       '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6M6.1 6.1l1.8 1.8M16.1 16.1l1.8 1.8M17.9 6.1l-1.8 1.8M7.9 16.1l-1.8 1.8"/>',
  terminal:   '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m7.5 10 2.6 2.4L7.5 14.8M12.8 15h4"/>',
  stack:      '<rect x="5" y="4.5" width="14" height="4.4" rx="1.4"/><rect x="5" y="11" width="14" height="4.4" rx="1.4" opacity=".7"/><path d="M5 19.5h14" opacity=".45"/>',
  platform:   '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5" opacity=".6"/><rect x="4" y="13" width="7" height="7" rx="1.5" opacity=".6"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  gem:        '<path d="M7 4h10l3.5 5L12 20.5 1.5 9 5 4h2z" transform="translate(1.5 -0.5) scale(0.92)"/><path d="M8 9h8M12 9v9" opacity=".5" transform="translate(1.5 -0.5) scale(0.92)"/>',
  ship:       '<path d="M3.5 13 20 5l-5 14.5-3.6-5L3.5 13z"/><path d="m11.4 14.5 3.8-6.2" opacity=".5"/>',
  flag:       '<path d="M6 21V4.5"/><path d="M6 5c4-2 7 2 12 0v8c-5 2-8-2-12 0"/>',
  spark:      '<path d="M12 3.5v17M3.5 12h17M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7" opacity=".85"/>',
  // ── UI glyphs ──
  eye:        '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
  card:       '<rect x="3.5" y="5" width="17" height="14" rx="2.2"/><path d="M7 9.5h6M7 13h4" opacity=".7"/><circle cx="17" cy="11" r="1.8" opacity=".7"/>',
  signal:     '<circle cx="12" cy="12" r="2.2"/><path d="M7.5 16.5a6.4 6.4 0 0 1 0-9M16.5 7.5a6.4 6.4 0 0 1 0 9" opacity=".7"/><path d="M4.7 19.3a10.3 10.3 0 0 1 0-14.6M19.3 4.7a10.3 10.3 0 0 1 0 14.6" opacity=".4"/>',
  user:       '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.6 3.8-5.2 7-5.2S17.8 16.4 19 20"/>',
  repo:       '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h3l2 2.5h6A2.5 2.5 0 0 1 20 10v6.5A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9z"/>',
  commit:     '<circle cx="12" cy="12" r="8.5"/><path d="m8.3 12.2 2.5 2.5 4.9-5.4"/>',
  lock:       '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  download:   '<path d="M12 4v10.5M7.5 11 12 15.5 16.5 11M5 19.5h14"/>',
  info:       '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.6v.2"/>',
};

// Title + archetype ids → glyph keys (one coherent family)
const NMA_GLYPH_MAP={
  // archetypes
  agent_builder:'agent', multi_agent_orchestrator:'orchestra',
  integration_architect:'hexagon', code_weaver:'diamond',
  rapid_prototyper:'velocity', system_thinker:'layers',
  context_engineer:'context', automation_engineer:'gear', cli_native:'terminal',
  // titles
  agentic_engineer:'agent', systems_architect:'hexagon', craft_engineer:'diamond',
  velocity_engineer:'velocity', context_architect:'context', design_engineer:'layers',
  devops_ai:'gear', full_stack_ai:'stack', ai_platform_lead:'platform',
  ai_craftmaster:'gem', shipping_machine:'ship', ai_pioneer:'flag',
};

function glyph(key,size,cls){
  const inner=NMA_GLYPHS[key]||NMA_GLYPHS.spark;
  size=size||18;
  return '<svg class="gl '+(cls||'')+'" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>';
}

function glyphFor(id,size,cls){
  return glyph(NMA_GLYPH_MAP[id]||'spark',size,cls);
}

// ═══════════════════════════════════════════════════════════
// Right-click explain: every section answers "how is this
// calculated" + hands the question to the user's own agent.
// Pages register {sel, label, how, anchor} entries; anchor
// links into /methodology#<slug>.
// ═══════════════════════════════════════════════════════════

var _explainRegistry=[];

function initExplain(registry){
  _explainRegistry=registry;
  document.addEventListener('contextmenu',function(e){
    for(var i=0;i<_explainRegistry.length;i++){
      var hit=e.target.closest(_explainRegistry[i].sel);
      if(hit){
        e.preventDefault();
        showExplain(_explainRegistry[i],e.clientX,e.clientY);
        return;
      }
    }
  });
  document.addEventListener('click',hideExplain);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')hideExplain();});
}

function showExplain(item,x,y){
  hideExplain();
  var el=document.createElement('div');
  el.id='nmaCtx';
  el.innerHTML=
    '<div class="ctx-label">'+glyph('info',13)+' '+item.label+'</div>'
    +'<div class="ctx-how">'+item.how+'</div>'
    +'<div class="ctx-actions">'
    +(item.anchor!==null?'<a class="ctx-a" href="/methodology#'+(item.anchor||'')+'" target="_blank">full method &rarr;</a>':'')
    +'<button class="ctx-a" onclick="ctxAskAgent(this)" data-label="'+item.label.replace(/"/g,'')+'">copy prompt for your agent</button>'
    +'</div>';
  document.body.appendChild(el);
  var w=Math.min(340,window.innerWidth-24);
  el.style.maxWidth=w+'px';
  var r=el.getBoundingClientRect();
  el.style.left=Math.min(x,window.innerWidth-r.width-14)+'px';
  el.style.top=Math.min(y,window.innerHeight-r.height-14)+'px';
}

function hideExplain(){
  var el=document.getElementById('nmaCtx');
  if(el)el.remove();
}

function ctxAskAgent(btn){
  var label=btn.getAttribute('data-label');
  var text='Using the nextmillionai MCP tools (nma_get_profile, nma_get_report): '
    +'explain my "'+label+'" — exactly which of my local signals produced it, the formula '
    +'behind it, and what single next signal would change it. Honest, no flattery.';
  (navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject())
    .then(function(){btn.textContent='copied';setTimeout(hideExplain,900);})
    .catch(function(){window.prompt('Copy this prompt:',text);});
}

// ═══════════════════════════════════════════════════════════
// Live indicator — shared by profile + report (served mode only).
// Live: equalizer pulse + "live · updated Xs ago" (SSE-driven).
// Snapshot: "snapshot · <date>" + a manual refresh affordance.
// All localhost: status/events/rebuild never leave this machine.
// ═══════════════════════════════════════════════════════════

function initLiveBadge(mountId,refetch){
  var el=document.getElementById(mountId);
  if(!el||!window._servedMode)return;
  window._liveRefetch=refetch;
  fetch('/api/live/status').then(function(r){return r.ok?r.json():null;}).then(function(st){
    if(!st)return;
    window._liveState=st;
    renderLiveBadge(el);
    if(st.live){
      try{
        var es=new EventSource('/api/live/events');
        es.addEventListener('status',function(ev){
          var prev=window._liveState||{};
          var next;
          try{next=JSON.parse(ev.data);}catch(e){return;}
          window._liveState=next;
          renderLiveBadge(el);
          if(next.generation!==prev.generation&&typeof window._liveRefetch==='function'){
            window._liveRefetch();
          }
        });
      }catch(e){}
      if(!window._liveTick){
        window._liveTick=setInterval(function(){renderLiveBadge(el);},5000);
      }
    }
  }).catch(function(){});
}

function _liveAgo(iso){
  if(!iso)return '';
  var s=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/1000));
  if(s<60)return s+'s ago';
  var m=Math.round(s/60);
  if(m<60)return m+'m ago';
  var h=Math.round(m/60);
  if(h<24)return h+'h ago';
  return Math.round(h/24)+'d ago';
}

function renderLiveBadge(el){
  var st=window._liveState||{};
  if(st.live){
    var eq='<span class="eq"><i></i><i></i><i></i><i></i><i></i></span>';
    var txt;
    if(st.updating)txt='live · refreshing';
    else if(st.lastError)txt='live · last refresh failed';
    else if(st.lastUpdated)txt='live · updated '+_liveAgo(st.lastUpdated);
    else txt='live · watching';
    var src=(st.sources||[]).length;
    var title=st.lastError?('Last refresh failed: '+st.lastError):
      (src?('Watching '+src+' local source'+(src===1?'':'s')+' — updates never leave this machine'):
        'Live mode is on, but no watchable sources were found');
    el.innerHTML='<span class="live-badge on'+(st.updating?' busy':'')+(st.lastError?' err':'')+
      '" title="'+title.replace(/"/g,'&quot;')+'">'+eq+'<span class="lb-txt">'+txt+'</span></span>';
  }else{
    var d=window._liveSnapshotDate||'';
    var cli=(window._CLI||'nextmillionai');
    el.innerHTML='<span class="live-badge snap" title="Static snapshot — refresh re-runs the local scan. To keep this view updating itself, restart with: '+cli+' report --live">'+
      '<span class="lb-dot"></span><span class="lb-txt">snapshot'+(d?' · '+d:'')+'</span>'+
      '<button class="lb-refresh" onclick="liveManualRefresh(this)" title="Re-run the local assessment">refresh</button>'+
      '<button class="lb-refresh" onclick="liveGoLiveHint(this)" title="Keep this view updating itself — copies the command">go live</button></span>';
  }
}

function liveGoLiveHint(btn){
  var cmd=(window._CLI||'nextmillionai')+' report --live';
  (navigator.clipboard?navigator.clipboard.writeText(cmd):Promise.reject())
    .then(function(){btn.textContent='copied — restart with it';setTimeout(function(){btn.textContent='go live';},2000);})
    .catch(function(){window.prompt('Restart the server with:',cmd);});
}

function liveManualRefresh(btn){
  btn.textContent='refreshing…';btn.disabled=true;
  fetch('/api/profile/rebuild',{method:'POST'}).then(function(r){return r.json();}).then(function(){
    if(typeof window._liveRefetch==='function')window._liveRefetch();
    btn.textContent='refresh';btn.disabled=false;
  }).catch(function(){btn.textContent='retry';btn.disabled=false;});
}

// ═══════════════════════════════════════════════════════════
// PDF / print style — surface-specific: body.pdf-profile or
// body.pdf-report. Cross-page print opens the target page in
// a new window with ?print=1, auto-prints, then closes.
// ═══════════════════════════════════════════════════════════

function initPdfStyle(mountId){
  if(location.search.indexOf('print=1')>=0){
    window._autoPrintPending=true;
  }
  window.addEventListener('beforeprint',_pdfBeforePrint);
  window.addEventListener('afterprint',_pdfAfterPrint);
}

function nmaMaybeAutoPrint(){
  if(!window._autoPrintPending)return;
  window._autoPrintPending=false;
  setTimeout(function(){window.print();},200);
  setTimeout(function(){window.close();},400);
}

function _pdfBeforePrint(){
  window._printViewRestore=null;
  if(typeof NMA_TAB_IDS==='object'&&window._NMA_TAB&&window._NMA_TAB!=='overview'){
    window._printViewRestore=window._NMA_TAB;
    var ov=window._NMA_OVERVIEW_ID&&document.getElementById(window._NMA_OVERVIEW_ID);
    if(ov)ov.style.display='';
    Object.keys(NMA_TAB_IDS).forEach(function(k){
      var id=NMA_TAB_IDS[k];var el=id&&document.getElementById(id);
      if(el)el.style.display='none';
    });
  }
  var surface=window._NMA_SURFACE||'profile';
  document.body.classList.add('pdf-'+surface);
}

function _pdfAfterPrint(){
  document.body.classList.remove('pdf-profile');
  document.body.classList.remove('pdf-report');
  if(window._printViewRestore&&typeof nmaShowView==='function'){
    nmaShowView(window._printViewRestore);
    window._printViewRestore=null;
  }
}
