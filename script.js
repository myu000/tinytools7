/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Clock
  setInterval(() => {
    const el = document.getElementById('clockText');
    if (el) el.textContent = new Date().toLocaleString();
  }, 1000);

  // Hydrate Free draft
  const freeText = document.getElementById('freeText');
  if (freeText) freeText.value = localStorage.getItem('freeDraft') || "";

  // Journal entries
  renderJournalEntries();

  // To‑Do list
  renderTodo();

  // Playlists
  renderPlaylists();

  // Notes
  renderNotes();

  // Restore environment + wallpaper
  restoreEnvironment();
  restoreWallpaper();
});

/* ---------- Global helpers ---------- */
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display='block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>{ t.style.display='none'; }, 1600);
}
function exportText(filename, content){
  if (!content || !String(content).trim()){ alert("Nothing to export."); return; }
  const blob = new Blob([content], {type:"text/plain"});
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = filename; link.click();
}
function toggleTheme(){
  const isLight = document.documentElement.dataset.theme === 'light';
  document.documentElement.dataset.theme = isLight ? 'dark' : 'light';
  toast(isLight ? "Dark theme" : "Light theme");
}
function clearData(){
  if (!confirm("This will clear all local data (writing, tasks, playlists, notes). Proceed?")) return;
  localStorage.clear(); location.reload();
}
function toggleFull(id){
  const el = document.getElementById(id);
  el.classList.toggle('full');
  toast(el.classList.contains('full') ? "Expanded" : "Restored");
}
function focusTile(id){
  document.body.classList.add('focus-all');
  document.querySelectorAll('.tile').forEach(t=>t.classList.remove('focused'));
  const el = document.getElementById(id);
  el.classList.add('focused'); el.classList.add('full');
}
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape' && document.body.classList.contains('focus-all')){
    document.body.classList.remove('focus-all');
    document.querySelectorAll('.tile').forEach(t=>t.classList.remove('focused','full'));
  }
});

/* ---------- Writing: tabs ---------- */
function setWritingTab(tab, el){
  document.querySelectorAll('#writing .tab').forEach(t => {
    t.classList.remove('active'); t.setAttribute('aria-selected', 'false');
  });
  el.classList.add('active'); el.setAttribute('aria-selected', 'true');
  ['promptsView','freeView','brainstormView','journalView'].forEach(id=>{
    document.getElementById(id).style.display = 'none';
  });
  const map = {prompts:'promptsView', free:'freeView', brainstorm:'brainstormView', journal:'journalView'};
  document.getElementById(map[tab]).style.display = 'flex';
}

/* ---------- Writing: prompts ---------- */
function genrePool(){
  return {
    fantasy: [
      "Describe a hidden portal in an ordinary place.",
      "Invent a magical creature with a tragic flaw.",
      "Write about a kingdom ruled by dreams.",
      "Create a spell that backfires in an unexpected way."
    ],
    mystery: [
      "A locked room. A missing key. What happened?",
      "Write a scene where a detective finds the wrong clue.",
      "Describe a character who knows too much.",
      "Invent a mystery that unfolds in reverse."
    ],
    romance: [
      "Two strangers meet during a power outage.",
      "Describe a love letter that was never sent.",
      "Write about a relationship built on a lie.",
      "Invent a moment where silence says everything."
    ],
    "sci-fi": [
      "Design a future where memories are traded.",
      "Write about a robot who dreams of freedom.",
      "Describe a planet where time runs backward.",
      "Invent a technology that changes emotions."
    ],
    drama: [
      "Write a confrontation between parent and child.",
      "Describe a moment of quiet betrayal.",
      "Invent a scene where someone confesses too late.",
      "Create a story where the truth is unbearable."
    ],
    reflective: [
      "Write about a moment that changed your perspective.",
      "Describe a place that feels like home.",
      "What does vulnerability mean to you?",
      "Write a letter to your future self.",
      "Reflect on a decision you regret — or don’t."
    ]
  };
}
function newPrompt(){
  const saved = JSON.parse(localStorage.getItem('promptResponses') || '{}');
  const genre = document.getElementById('genreSelect').value;
  const pools = genrePool();
  const pool = genre === 'random' ? Object.values(pools).flat() : (pools[genre] || pools.fantasy);
  const text = pool[Math.floor(Math.random()*pool.length)];
  const prompt = `${text} (${new Date().toLocaleString()})`;

  const area = document.getElementById('promptArea');
  area.innerHTML = "";
  const wrap = document.createElement('div'); wrap.className='stack';
  const label = document.createElement('strong'); label.textContent = prompt;
  const ta = document.createElement('textarea');
  ta.placeholder = "Your response..."; ta.value = saved[prompt] || "";
  ta.oninput = () => {
    saved[prompt] = ta.value;
    localStorage.setItem('promptResponses', JSON.stringify(saved));
  };
  wrap.appendChild(label); wrap.appendChild(ta); area.appendChild(wrap);
}
/* Responses modal */
function openResponses(){ buildResponsesList(); document.getElementById('responsesModal').style.display='flex'; }
function closeResponses(){ document.getElementById('responsesModal').style.display='none'; }
function buildResponsesList(){
  const saved = JSON.parse(localStorage.getItem('promptResponses') || '{}');
  const list = document.getElementById('responsesList'); list.innerHTML="";
  const keys = Object.keys(saved);
  if (!keys.length){ const p=document.createElement('p'); p.className='muted'; p.textContent="No responses yet."; list.appendChild(p); return; }
  keys.forEach((prompt, i)=>{
    const row = document.createElement('div'); row.className='resp-row stack';
    const top = document.createElement('div'); top.className='row';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.id='resp-'+i; cb.setAttribute('aria-label','Select response');
    const lab = document.createElement('label'); lab.htmlFor='resp-'+i; lab.textContent=prompt;
    const del = document.createElement('button'); del.className='btn danger'; del.textContent='Delete';
    del.onclick = ()=>{
      const savedNow = JSON.parse(localStorage.getItem('promptResponses') || '{}');
      delete savedNow[prompt]; localStorage.setItem('promptResponses', JSON.stringify(savedNow));
      buildResponsesList(); toast("Response deleted");
    };
    top.appendChild(cb); top.appendChild(lab); top.appendChild(del);
    const ta = document.createElement('textarea'); ta.readOnly=true; ta.value=saved[prompt];
    row.appendChild(top); row.appendChild(ta); list.appendChild(row);
  });
}
function selectAllResponses(checked){
  document.querySelectorAll('#responsesList input[type=checkbox]').forEach(cb=>cb.checked=checked);
}
function exportSelectedResponses(){
  const saved = JSON.parse(localStorage.getItem('promptResponses') || '{}');
  const selected = [];
  document.querySelectorAll('#responsesList input[type=checkbox]:checked').forEach(cb=>{
    const label = cb.parentElement.querySelector('label').textContent;
    selected.push({prompt:label, text:saved[label]});
  });
  if (!selected.length){ alert("No responses selected."); return; }
  const content = selected.map(r=>`${r.prompt}\n${r.text}\n`).join('\n');
  exportText('selected_responses.txt', content); toast("Exported selected responses");
}

/* ---------- Writing: free ---------- */
function saveFree(){ localStorage.setItem('freeDraft', document.getElementById('freeText').value); toast("Draft saved"); }
function discardFree(){ document.getElementById('freeText').value=""; localStorage.removeItem('freeDraft'); toast("Draft discarded"); }

/* ---------- Writing: brainstorm ---------- */
function generateIdea(){
  const ideas = [
    "Design a tool that solves a tiny but annoying problem.",
    "Invent a productivity ritual for creative people.",
    "Imagine a dashboard that adapts to your mood.",
    "Create a writing prompt generator with personality.",
    "Sketch a feature that blends music with focus."
  ];
  document.getElementById('ideaText').textContent = ideas[Math.floor(Math.random()*ideas.length)];
}
function clearIdeas(){ document.getElementById('ideaText').textContent=""; document.getElementById('brainstormDraft').value=""; }
function saveBrainstorm(){
  const notes = document.getElementById('brainstormDraft').value.trim();
  if (!notes){ toast("Nothing to save"); return; }
  localStorage.setItem('brainstormNotes', notes); toast("Notes saved");
}
function exportBrainstorm(){
  const notes = document.getElementById('brainstormDraft').value.trim();
  if (!notes){ toast("Nothing to export"); return; }
  exportText('brainstorm_notes.txt', notes); toast("Notes exported");
}

/* ---------- Writing: journal ---------- */
function saveJournal(){
  const text = document.getElementById('journalText').value.trim();
  if (!text) return;
  const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
  const date = new Date().toLocaleDateString();
  entries.unshift({date, text});
  localStorage.setItem('journalEntries', JSON.stringify(entries));
  document.getElementById('journalText').value=""; renderJournalEntries(); toast("Entry saved");
}
function renderJournalEntries(){
  const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
  const list = document.getElementById('journalEntries'); if (!list) return;
  list.innerHTML="";
  if (!entries.length){
    const p=document.createElement('p'); p.className='muted'; p.textContent="No entries yet.";
    list.appendChild(p); return;
  }
  entries.forEach((entry, i)=>{
    const div = document.createElement('div'); div.className='resp-row stack';
    const top = document.createElement('div'); top.className='row';
    const date = document.createElement('strong'); date.textContent=entry.date;
    const del = document.createElement('button'); del.className='btn danger'; del.textContent='Delete';
    del.onclick = ()=>{
      const arr = JSON.parse(localStorage.getItem('journalEntries') || '[]');
      arr.splice(i,1); localStorage.setItem('journalEntries', JSON.stringify(arr)); renderJournalEntries(); toast("Entry deleted");
    };
    top.appendChild(date); top.appendChild(del);
    const p = document.createElement('p'); p.textContent=entry.text;
    div.appendChild(top); div.appendChild(p); list.appendChild(div);
  });
}
function exportJournal(){
  const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
  const text = entries.map(e=>`${e.date}\n${e.text}\n`).join('\n');
  exportText('journal.txt', text || ""); toast("Journal exported");
}
function exportJournalPrintable(){
  const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
  let html = "<html><head><title>Journal</title></head><body style='font-family:sans-serif;padding:40px;max-width:700px;margin:auto;'>";
  entries.forEach(e=>{ html += `<h3>${e.date}</h3><p>${e.text.replace(/\n/g,"<br/>")}</p><hr/>`; });
  html += "</body></html>";
  const win=window.open("","_blank"); win.document.write(html); win.document.close(); win.print();
}

/* ---------- To‑Do ---------- */
function renderTodo(){
  const list = JSON.parse(localStorage.getItem('todoList') || '[]');
  const wrap = document.getElementById('todoList'); if (!wrap) return;
  wrap.innerHTML="";
  list.forEach((task,i)=>{
    const row=document.createElement('div'); row.className='row';
    const span=document.createElement('span'); span.style.flex=1; span.textContent=task;
    const del=document.createElement('button'); del.className='btn secondary'; del.textContent='✕';
    del.onclick=()=>{
      const arr=JSON.parse(localStorage.getItem('todoList')||'[]');
      arr.splice(i,1); localStorage.setItem('todoList', JSON.stringify(arr)); renderTodo(); toast("Task removed");
    };
    row.appendChild(span); row.appendChild(del); wrap.appendChild(row);
  });
}
function addTask(){
  const input = document.getElementById('todoInput');
  const v = input.value.trim(); if (!v) return;
  const list = JSON.parse(localStorage.getItem('todoList') || '[]');
  list.push(v); localStorage.setItem('todoList', JSON.stringify(list)); input.value=""; renderTodo(); toast("Task added");
}

/* ---------- Music ---------- */
function renderPlaylists(){
  const list = JSON.parse(localStorage.getItem('playlists') || '[]');
  const wrap = document.getElementById('playlistList'); if (!wrap) return;
  wrap.innerHTML="";
  list.forEach((pl,i)=>{
    const row=document.createElement('div'); row.className='resp-row row';
    const name=document.createElement('strong'); name.textContent=pl.name; name.style.flex=1;
    const play=document.createElement('button'); play.className='btn'; play.textContent='Play';
    play.onclick = ()=>{
      const player = document.getElementById('player');
      player.src = pl.url; player.play(); toast(`Playing: ${pl.name}`);
    };
    const del=document.createElement('button'); del.className='btn secondary'; del.textContent='Delete';
    del.onclick=()=>{
      const arr=JSON.parse(localStorage.getItem('playlists')||'[]');
      arr.splice(i,1); localStorage.setItem('playlists', JSON.stringify(arr)); renderPlaylists(); toast("Playlist removed");
    };
    row.appendChild(name); row.appendChild(play); row.appendChild(del); wrap.appendChild(row);
  });
}
function addPlaylist(){
  const name = document.getElementById('musicName').value.trim();
  const url = document.getElementById('musicUrl').value.trim();
  if (!name || !url){ toast("Name and URL required"); return; }
  const list = JSON.parse(localStorage.getItem('playlists') || '[]');
  list.push({name,url}); localStorage.setItem('playlists', JSON.stringify(list));
  document.getElementById('musicName').value=""; document.getElementById('musicUrl').value="";
  renderPlaylists(); toast("Playlist saved");
}

/* ---------- Wallpapers ---------- */
function applyEnvironment(){
  const env = document.getElementById('envSelect').value;
  let color = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (env === 'forest') color = '#0f1612';
  if (env === 'ocean') color = '#0f1418';
  if (env === 'dusk') color = '#121016';
  if (env === 'mono') color = '#111111';
  document.body.style.background = color;
  localStorage.setItem('envColor', color);
  toast("Environment applied");
}
function resetEnvironment(){
  localStorage.removeItem('envColor');
  document.body.style.background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  toast("Environment reset");
}
function restoreEnvironment(){
  const color = localStorage.getItem('envColor');
  if (color) document.body.style.background = color;
}
function setWallpaper(){
  const url = document.getElementById('wallUrl').value.trim();
  if (!url){ toast("URL required"); return; }
  document.body.style.backgroundImage = `url("${url}")`;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  localStorage.setItem('wallImage', url);
  toast("Wallpaper set");
}
function clearWallpaper(){
  document.body.style.backgroundImage = 'none';
  localStorage.removeItem('wallImage');
  toast("Wallpaper cleared");
}
function restoreWallpaper(){
  const url = localStorage.getItem('wallImage');
  if (url){
    document.body.style.backgroundImage = `url("${url}")`;
    document.body.style.backgroundSize='cover';
    document.body.style.backgroundPosition='center';
  }
}

/* ---------- Clock & timer ---------- */
let timerInterval = null, remainingMs = 0;
function startTimer(){
  const mins = parseInt(document.getElementById('timerMins').value,10);
  if (!mins || mins<=0){ toast("Enter minutes"); return; }
  remainingMs = mins*60*1000;
  updateTimerStatus();
  clearInterval(timerInterval);
  timerInterval = setInterval(()=>{
    remainingMs -= 1000;
    if (remainingMs<=0){
      clearInterval(timerInterval); timerInterval=null; toast("Time up"); document.getElementById('timerStatus').textContent="Done";
    } else updateTimerStatus();
  }, 1000);
}
function stopTimer(){ clearInterval(timerInterval); timerInterval=null; document.getElementById('timerStatus').textContent="Stopped"; toast("Timer stopped"); }
function updateTimerStatus(){
  const s = Math.max(0, Math.floor(remainingMs/1000));
  const m = Math.floor(s/60), ss = String(s%60).padStart(2,'0');
  document.getElementById('timerStatus').textContent = `${m}:${ss}`;
}

/* ---------- Notes ---------- */
function renderNotes(){
  const notes = JSON.parse(localStorage.getItem('notes') || '[]');
  const list = document.getElementById('notesList'); if (!list) return;
  list.innerHTML="";
  notes.forEach((n,i)=>{
    const card = document.createElement('div'); card.className='resp-row stack';
    const top = document.createElement('div'); top.className='row';
    const title = document.createElement('strong'); title.textContent=n.title || 'Untitled'; title.style.flex=1;
    const del = document.createElement('button'); del.className='btn secondary'; del.textContent='Delete';
    del.onclick = ()=>{
      const arr = JSON.parse(localStorage.getItem('notes') || '[]');
      arr.splice(i,1); localStorage.setItem('notes', JSON.stringify(arr)); renderNotes(); toast("Note removed");
    };
    top.appendChild(title); top.appendChild(del);
    const p = document.createElement('p'); p.textContent=n.body || "";
    card.appendChild(top); card.appendChild(p); list.appendChild(card);
  });
}
function addNote(){
  const title = document.getElementById('noteTitle').value.trim();
  const body = document.getElementById('noteBody').value.trim();
  if (!title && !body){ toast("Write something to save"); return; }
  const list = JSON.parse(localStorage.getItem('notes') || '[]');
  list.unshift({title, body}); localStorage.setItem('notes', JSON.stringify(list));
  document.getElementById('noteTitle').value=""; document.getElementById('noteBody').value="";
  renderNotes(); toast("Note saved");
}

/* ---------- Writing bundle export ---------- */
function exportAllWriting(){
  const saved = JSON.parse(localStorage.getItem('promptResponses') || '{}');
  const free = localStorage.getItem('freeDraft') || '';
  const notes = localStorage.getItem('brainstormNotes') || '';
  const journal = JSON.parse(localStorage.getItem('journalEntries') || '[]');
  let text = "=== Prompts ===\n";
  Object.keys(saved).forEach(k=>{ text += `${k}\n${saved[k]}\n\n`; });
  text += "\n=== Free ===\n" + free + "\n\n";
  text += "=== Brainstorm ===\n" + notes + "\n\n";
  text += "=== Journal ===\n" + journal.map(e=>`${e.date}\n${e.text}\n`).join('\n');
  exportText('tinytools_writing_export.txt', text);
}