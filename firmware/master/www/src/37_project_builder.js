/* Créateur de projet guidé, local et explicable */
(function () {
  'use strict';
  const A=window.APP, LAB=window.LAB, $=A.$, icon=A.icon, esc=A.esc, toast=A.toast;
  const examples=['Je veux mesurer température et humidité dans une serre','Je veux surveiller le niveau d’une cuve et démarrer une pompe','Je veux détecter une présence et allumer une lumière'];
  const groups=[
    [['température','temperature','humidité','humidite','météo','meteo','serre'],['dht22','dht11','bme280','sht31']],
    [['distance','obstacle','parking'],['hcsr04','vl53l0x','sharp_ir']],
    [['niveau','cuve','liquide','fuite'],['water_level','float_switch','ir_beam']],
    [['luminosité','luminosite','lumière','lumiere','éclairage'],['ldr','bh1750','veml7700']],
    [['co2','qualité air','qualite air'],['mhz19','scd40','ccs811']],
    [['écran','ecran','afficher','oled'],['oled_ssd1306','lcd1602','oled_sh1106']],
    [['relais'],['relay']], [['ventilateur','ventilation'],['fan_pwm']],
    [['pompe','arroser','arrosage'],['pump','relay']], [['servo','volet'],['servo_sg90','servo_360']],
    [['présence','presence','mouvement','intrusion'],['pir_hcsr501','pir_am312']]
  ];
  const actuators=['relay','fan_pwm','pump','servo_sg90','led','buzzer_active'];
  let flow;
  function fresh(){flow={goal:'',modules:[],board:'',stage:'start',question:'',history:[]};}
  const mod=id=>LAB.module(id);
  function norm(s){return A.norm(s);}
  function candidates(q,skip){
    const n=norm(q),ids=[];
    const add=id=>{if(!skip.includes(id)&&mod(id)&&!ids.includes(id))ids.push(id);};
    (LAB.MODULES||[]).forEach(m=>{if(n.includes(norm(m.id))||(norm(m.name).length>4&&n.includes(norm(m.name))))add(m.id);});
    groups.forEach(g=>{if(g[0].some(k=>n.includes(norm(k))))g[1].forEach(add);});
    if(!ids.length)['dht22','bme280','oled_ssd1306','relay','hcsr04','pir_hcsr501'].forEach(add);
    return ids.slice(0,8).map(mod).filter(Boolean);
  }
  function choices(){
    if(flow.stage==='modules')return candidates(flow.goal,flow.modules).map(m=>({label:m.name,value:m.id,detail:m.desc}));
    if(flow.stage==='board')return [{label:'ESP32',value:'esp32'},{label:'ESP32-S3',value:'esp32s3'},{label:'ESP32-C3',value:'esp32c3'}];
    if(flow.stage==='actuator')return actuators.map(mod).filter(Boolean).map(m=>({label:m.name,value:m.id,detail:m.desc}));
    if(flow.stage==='more')return [{label:'Ajouter un autre composant',value:'more'},{label:'C’est tout',value:'done'}];
    if(flow.stage==='mode')return [{label:'Code',value:'code'},{label:'Câblage',value:'wiring'},{label:'Tout préparer',value:'all'},{label:'Proposition seulement',value:'none'}];
    if(flow.stage==='review')return [{label:'Oui, ouvrir le Studio',value:'yes'},{label:'Non, préciser',value:'no'}];
    return [];
  }
  function askNext(){
    if(!flow.modules.length){flow.stage='modules';flow.question='Quels composants veux-tu utiliser ? Choisis les éléments un par un.';return;}
    if(!flow.board){flow.stage='board';flow.question='Quelle carte vas-tu programmer ?';return;}
    const needsAct=/quand|lorsque|allum|active|commande|seuil|dépasse|depasse|pompe|ventil/i.test(norm(flow.goal));
    if(needsAct&&!flow.modules.some(id=>mod(id)&&mod(id).act)){flow.stage='actuator';flow.question='Quel actionneur doit réagir ?';return;}
    if(!/mesur|temp|humid|affich|surveil|niveau|distance|présence|presence|quand|lorsque|allum|alarme/i.test(norm(flow.goal))){flow.stage='behavior';flow.question='Que doit faire le projet ? Décris le résultat attendu.';return;}
    flow.stage='mode';flow.question='Quelle aide souhaites-tu ?'; 
  }
  function rules(){
    const sensor=flow.modules.map(mod).find(m=>m&&m.outs&&m.outs.length);
    const action=flow.modules.map(mod).find(m=>m&&m.act);
    const low=/moins de|inferieur|en dessous/.test(norm(flow.goal));
    const threshold=flow.goal.match(/(?:>|plus de|moins de|supérieur(?:e)? à|inférieur(?:e)? à|en dessous de|dépasse)\s*(\d+(?:[,.]\d+)?)/i);
    if(!sensor||!action)return [];
    return [{if:{m:flow.modules.indexOf(sensor.id),out:sensor.outs[0].k,op:low?'<':'>',v:threshold?Number(threshold[1].replace(',','.')):25,hyst:0.5},
      then:{m:flow.modules.indexOf(action.id),act:'on'},else:{m:flow.modules.indexOf(action.id),act:'off'}}];
  }
  function spec(){
    return {board:flow.board,title:'Projet NEXUS',description:flow.goal,modules:flow.modules.map(id=>({id:id})),rules:rules(),
      options:{web:/web|téléphone|telephone|navigateur/i.test(flow.goal),master:true}};
  }
  function near(){
    return (LAB.RECIPES||[]).map(r=>{const ids=(r.modules||[]).map(m=>m.id),n=ids.filter(id=>flow.modules.includes(id)).length;return {r:r,score:n/Math.max(ids.length,flow.modules.length)};})
      .filter(x=>x.score>=0.5).sort((a,b)=>b.score-a.score).slice(0,3);
  }
  function draw(el){
    el.innerHTML="<div class='stack builder'><div class='hero'><div><div class='eyebrow'>SMART PROJECT BUILDER</div><h1>Raconte ton projet</h1><p>Je vérifie les composants connus, puis je pose quelques questions à choix. Tu valides avant d’ouvrir le code.</p></div><div class='hero-mark'>"+icon('wand')+"</div></div><div class='grid g-3'><section class='card span-2'><div class='card-h'><h2 class='grow'>Conversation guidée</h2><button class='btn sm' id='builder-reset'>Recommencer</button></div><div class='card-b'><div class='chat builder-chat' id='builder-log'></div><div id='builder-input-area'></div><div class='builder-choices' id='builder-choices'></div></div></section><aside class='stack'><div class='card pad'><div class='eyebrow'>COMPOSANTS</div><div class='stack small' id='builder-modules'></div></div><div class='card pad'><h3>Aide au choix</h3><p class='small muted'>Choisis code, câblage ou les deux. Les broches sont proposées par le générateur du Studio.</p><div class='hint'>Une vérification logicielle ne prouve pas que le montage physique fonctionne.</div></div><div class='card pad'><h3>Reprendre un projet</h3><div class='stack small' id='builder-saved'><span class='muted'>Lecture de la microSD…</span></div></div></aside></div></div>";
    const log=$('#builder-log',el);flow.history.forEach(item=>{const d=document.createElement('div');d.className='msg '+item.who;d.textContent=item.text;log.append(d);});
    const modules=$('#builder-modules',el);modules.textContent='';
    flow.modules.forEach(id=>{const row=document.createElement('div');row.className='module-chip';row.textContent=mod(id).name;const x=document.createElement('button');x.textContent='×';x.onclick=()=>{flow.modules=flow.modules.filter(v=>v!==id);askNext();draw(el);};row.append(x);modules.append(row);});
    const area=$('#builder-input-area',el),buttons=$('#builder-choices',el);
    if(flow.stage==='start'){const t=document.createElement('textarea');t.className='textarea';t.id='builder-description';t.rows=3;t.placeholder='Ex. Je veux surveiller la température et démarrer un ventilateur au-dessus de 30 °C.';area.append(t);
      const ex=document.createElement('div');ex.className='chips scroll';examples.forEach(s=>{const b=document.createElement('button');b.className='chip';b.textContent=s;b.onclick=()=>{t.value=s;};ex.append(b);});area.append(ex);
      const go=document.createElement('button');go.className='btn primary';go.textContent='Comprendre mon projet';go.onclick=()=>{flow.goal=t.value.trim();if(!flow.goal)return;flow.history.push({who:'me',text:flow.goal});askNext();draw(el);};area.append(go);
    } else if(flow.stage==='behavior'){const t=document.createElement('textarea');t.className='textarea';t.value=flow.goal;t.rows=2;area.append(t);const b=document.createElement('button');b.className='btn primary';b.textContent='Continuer';b.onclick=()=>{flow.goal=t.value;flow.history.push({who:'me',text:t.value});flow.stage='mode';flow.question='Quelle aide souhaites-tu ?';draw(el);};area.append(b);}
    if(flow.question){const q=document.createElement('div');q.className='msg bot';q.textContent=flow.question;log.append(q);}
    choices().forEach(o=>{const b=document.createElement('button');b.className='builder-choice';const strong=document.createElement('b');strong.textContent=o.label;b.append(strong);if(o.detail){const small=document.createElement('small');small.textContent=o.detail;b.append(small);}b.onclick=()=>{handle(o.value);draw(el);};buttons.append(b);});
    if(flow.stage==='review'){
      const result=document.createElement('div');result.className='builder-review';
      const names=flow.modules.map(id=>mod(id).name).join(', ');
      let generated;try{generated=LAB.generate(spec());}catch(e){generated=null;}
      const warn=document.createElement('p');warn.className='small muted';warn.textContent=generated?('Proposition: '+flow.board+' · '+generated.wiring.length+' connexions affectées automatiquement.'):'Le générateur demande une correction.';result.append(warn);
      const p=document.createElement('p');p.textContent='Projet: '+names+' — '+flow.goal+' · Aide: '+({code:'code',wiring:'câblage',all:'code + câblage',none:'proposition seulement'}[flow.mode]||'code + câblage');result.append(p);
      const blocks=document.createElement('div');blocks.className='program-blocks';
      const rule=rules()[0];
      const blockText=rule?['QUAND · '+mod(flow.modules[rule.if.m]).name,'SI · '+rule.if.out+' '+rule.if.op+' '+rule.if.v,'ALORS · '+mod(flow.modules[rule.then.m]).name+' activé','SINON · action arrêtée']:flow.modules.map(id=>'MODULE · '+mod(id).name);
      blockText.forEach((text,i)=>{const b=document.createElement('div');b.className='program-block block-'+i;b.textContent=text;blocks.append(b);});
      result.append(blocks);
      near().forEach(x=>{const m=document.createElement('div');m.className='match-row';m.textContent='Projet proche: '+x.r.title+' · '+Math.round(x.score*100)+' %';result.append(m);});
      buttons.prepend(result);
    }
    $('#builder-reset',el).onclick=()=>{fresh();draw(el);};
  }
  function handle(value){
    if(flow.stage==='modules'){if(!flow.modules.includes(value))flow.modules.push(value);flow.history.push({who:'me',text:mod(value).name});flow.stage='more';flow.question='Veux-tu ajouter un autre composant ?';}
    else if(flow.stage==='more'){if(value==='more'){flow.stage='modules';flow.question='Choisis le composant suivant.';}else askNext();}
    else if(flow.stage==='board'){flow.board=value;flow.history.push({who:'me',text:value});askNext();}
    else if(flow.stage==='actuator'){if(!flow.modules.includes(value))flow.modules.push(value);flow.history.push({who:'me',text:mod(value).name});flow.stage='mode';flow.question='Quelle aide souhaites-tu ?';}
    else if(flow.stage==='mode'){flow.mode=value;flow.history.push({who:'me',text:value});flow.stage='review';flow.question='Voici le résumé. Est-ce bien ce que tu veux ?';}
    else if(flow.stage==='review'){if(value==='no'){flow.stage='behavior';flow.question='Que veux-tu corriger ou préciser ?';}else{try{const s=spec();const r=LAB.generate(s);if(r.warnings.length)toast('Des avertissements apparaîtront dans le Studio.','warn');if(flow.mode==='none'){localStorage.setItem('nexus.builder.lastPlan',JSON.stringify({spec:s,created:new Date().toISOString()}));toast('Proposition enregistrée sur cet appareil.','ok');return;}A.openInStudio(s,flow.mode==='wiring'?'wiring':'code');}catch(e){toast(e.message,'bad');}}}
  }
  async function loadSaved(el){const box=$('#builder-saved',el);if(!box)return;let local=[],remote=[];try{local=(await A.api('/api/projects')||[]).filter(p=>p.group==='mine').map(p=>({id:p.name,title:p.title||p.name,path:p.path,source:'S3'}));}catch(e){}try{remote=(await A.piProjects()).map(p=>({id:p.id,title:p.title||p.id,source:'Pi'}));}catch(e){}const merged=new Map();local.forEach(p=>merged.set(p.id,p));remote.forEach(p=>{if(!merged.has(p.id))merged.set(p.id,p);});const mine=[...merged.values()];if(!mine.length){box.textContent='Aucun projet nommé accessible. Enregistre depuis le Studio; le Pi conservera les projets si tu l’as connecté.';return;}box.textContent='';mine.slice(0,12).forEach(p=>{const row=document.createElement('div');row.className='match-row';const name=document.createElement('span');name.textContent=(p.title||p.name||p.id).replace(/_/g,' ');const button=document.createElement('button');button.className='btn sm';button.textContent='Continuer';button.onclick=async()=>{try{let meta;if(p.source==='Pi'){const files=await A.piReadProject(p.id);meta=JSON.parse(files['project.json']||'{}');}else{const blob=await A.api('/api/sd/download?path='+encodeURIComponent((p.path||('/sd/PROJECTS/MY_PROJECTS/'+p.id))+'/project.json'),{raw:true});meta=JSON.parse(await blob.text());}if(!meta.spec)throw new Error('Ce projet ne contient pas de fiche Studio.');A.openInStudio(meta.spec);}catch(e){toast('Reprise impossible : '+e.message,'bad');}};row.append(name,button);box.append(row);});}
  A.page({id:'create',title:'Créer un projet',icon:'wand',group:'build',desc:'Décris le besoin et réponds aux choix de l’assistant',render:function(el){fresh();draw(el);loadSaved(el);}});
  A.commands.push({title:'Créer un projet avec l’assistant',group:'Action',icon:'wand',run:function(){A.go('create');}},
    {title:'Compagnon Raspberry Pi',group:'Outils',icon:'cpu',run:function(){A.go('companion');}});
})();
