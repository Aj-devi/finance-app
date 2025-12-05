/* Pastel Finance + Pixel Garden
   - Finance CRUD (earnings/expenses)
   - Charts (Chart.js)
   - Coins: earned by adding finance entries and daily bonus; spent in shop
   - Pixel plant generator draws sprite on canvas so no images needed
   - Garden: buy plants, water/feed, growth stages, coin generation
   - PWA friendly: localStorage persistence
*/

const STORAGE_KEY = 'pastel_finance_garden_v1';
const VERSION = '1.0';

// categories & freq
const INCOME_CATEGORIES = ["Job","Gift","Tips","Business","Other"];
const EXPENSE_CATEGORIES = ["Food","Rent","Utilities","Gas","Shopping","Health","Entertainment","Other"];
const FREQ_EARN = ["Once","Weekly","Monthly","Yearly"];
const FREQ_EXP = ["Once","Weekly","Biweekly","Monthly","Yearly"];

// Shop - pixel plant blueprints (name, price, palette (pastel), base pixel map size)
const SHOP_ITEMS = [
  { id: 'sprout', name: 'Sprout', price: 10, palette: ['#FFD1E8','#CFFFE4','#8EE7B8','#D1EEFF'], size:8 },
  { id: 'bloom',  name: 'Bloom',  price: 25, palette: ['#E8D1FF','#FFD1E8','#FFB3C6','#D1EEFF'], size:10 },
  { id: 'cactus', name: 'Cactus', price: 20, palette: ['#D1EEFF','#CFFFE4','#FFD1E8','#E8D1FF'], size:8 }
];

// app state
let state = {
  items: [], // finance items
  coins: 30, // start coins for a bit of play
  garden: [null, null, null], // 3 slots: each slot {shopId, health:0-100, hunger:0-100, age:0, boughtAt, level}
  settings: { dark: false },
  lastDaily: null
};

let barChart=null, pieChart=null;

// DOM refs
const appEl = document.getElementById('app');
const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
const screens = Array.from(document.querySelectorAll('main.screen'));
const summaryEarn = document.getElementById('summary-earn');
const summaryExp = document.getElementById('summary-exp');
const summaryNet = document.getElementById('summary-net');
const earnContainer = document.getElementById('earningsContainer');
const expContainer = document.getElementById('expensesContainer');
const statsList = document.getElementById('stats-list');
const coinCount = document.getElementById('coinCount');

// modal & form
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const segButtons = Array.from(document.querySelectorAll('.seg-btn'));
const nameInput = document.getElementById('name');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const frequencyInput = document.getElementById('frequency');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const editIndexInput = document.getElementById('editIndex');
const modalTitle = document.getElementById('modalTitle');

// buttons
const quickAddEarning = document.getElementById('quickAddEarning');
const quickAddExpense = document.getElementById('quickAddExpense');
const dailyBtn = document.getElementById('dailyBtn');
const addBtn = document.getElementById('addBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const csvInput = document.getElementById('csvInput');
const darkToggle = document.getElementById('darkToggle');

// garden & shop
const gardenSlots = document.getElementById('gardenSlots');
const shopList = document.getElementById('shopList');

init();

function init(){
  load();
  bindUI();
  initCharts();
  renderAll();
  applyTheme();
  // tick for garden: age & coin generation every minute simulated (for demo keep short)
  setInterval(gardenTick, 60_000); // 60s
}

function bindUI(){
  navBtns.forEach(btn => btn.addEventListener('click', () => {
    navBtns.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    showScreen(btn.dataset.screen);
  }));

  quickAddEarning.addEventListener('click', ()=> openModalFor('earning'));
  quickAddExpense.addEventListener('click', ()=> openModalFor('expense'));
  dailyBtn.addEventListener('click', claimDaily);
  addBtn.addEventListener('click', ()=> openModalFor('earning'));
  clearAllBtn.addEventListener('click', ()=> { if(confirm('Clear all data?')) { state.items=[]; state.garden=[null,null,null]; state.coins=0; save(); renderAll(); } });
  modalClose.addEventListener('click', closeModal);
  document.getElementById('saveItem').addEventListener('click', saveFromModal);
  document.getElementById('cancelItem').addEventListener('click', closeModal);
  segButtons.forEach(b => b.addEventListener('click', ()=> { segButtons.forEach(x=>x.classList.remove('active')); b.classList.add('active'); populateCategoryAndFreq(b.dataset.type);}));

  exportBtn.addEventListener('click', exportCSV);
  importBtn.addEventListener('click', ()=> csvInput.click());
  csvInput.addEventListener('change', handleCSVFile);

  darkToggle.addEventListener('change', e => { state.settings.dark = e.target.checked; applyTheme(); save(); });

  // initial show home
  showScreen('screen-home');

  // render shop items
  renderShop();
}

function save(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){console.error('save',e);} }
function load(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(raw) state = JSON.parse(raw); } catch(e){ console.error('load',e); } }

function applyTheme(){ if(state.settings.dark){ appEl.classList.add('dark'); appEl.classList.remove('light'); darkToggle.checked=true;} else { appEl.classList.remove('dark'); appEl.classList.add('light'); darkToggle.checked=false; } coinCount.textContent = state.coins; }

function showScreen(id){ screens.forEach(s => s.classList.add('hidden')); const el = document.getElementById(id); if(el) el.classList.remove('hidden'); renderAll(); }

function openModalFor(type, idx=-1){
  segButtons.forEach(b => b.classList.toggle('active', b.dataset.type === type));
  populateCategoryAndFreq(type);
  if(idx >= 0){
    const it = state.items[idx];
    modalTitle.textContent = 'Edit Item';
    nameInput.value = it.name;
    categoryInput.value = it.category;
    amountInput.value = it.amount;
    frequencyInput.value = it.frequency;
    dateInput.value = it.date || '';
    noteInput.value = it.note || '';
    editIndexInput.value = idx;
  } else {
    modalTitle.textContent = type === 'earning' ? 'Add Earning' : 'Add Expense';
    nameInput.value = '';
    amountInput.value = '';
    dateInput.value = '';
    noteInput.value = '';
    editIndexInput.value = -1;
  }
  modal.classList.remove('hidden');
  setTimeout(()=>nameInput.focus(),120);
}

function closeModal(){ modal.classList.add('hidden'); editIndexInput.value = -1; }

function populateCategoryAndFreq(type){
  const cats = type === 'earning' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  categoryInput.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
  const freqs = type === 'earning' ? FREQ_EARN : FREQ_EXP;
  frequencyInput.innerHTML = freqs.map(f => `<option>${f}</option>`).join('');
}

function saveFromModal(){
  const type = segButtons.find(b=>b.classList.contains('active')).dataset.type;
  const name = (nameInput.value || '(no name)').trim();
  const category = categoryInput.value;
  const amount = parseFloat(amountInput.value) || 0;
  const frequency = frequencyInput.value;
  const date = dateInput.value || '';
  const note = noteInput.value || '';
  const item = { type, name, category, amount, frequency, date, note, createdAt:Date.now() };

  const editIdx = parseInt(editIndexInput.value,10);
  if(!isNaN(editIdx) && editIdx >= 0) { state.items[editIdx] = item; }
  else {
    state.items.push(item);
    // small reward for adding a finance entry: 1 coin
    state.coins += 1;
    showToast('+1 coin for adding entry!');
  }
  save(); renderAll(); closeModal();
}

function renderAll(){
  renderLists();
  renderSummary();
  renderStats();
  updateCharts();
  renderGarden();
  coinCount.textContent = state.coins;
}

// finance lists
function renderLists(){
  earnContainer.innerHTML = '';
  expContainer.innerHTML = '';
  state.items.forEach((it, idx) => {
    const el = document.createElement('div'); el.className = 'item';
    el.innerHTML = `<div><div style="font-weight:700">${escapeHtml(it.name)}</div><div class="meta">${escapeHtml(it.category)} • ${escapeHtml(it.frequency)} ${it.date ? '• ' + escapeHtml(it.date):''}</div></div>
                    <div style="text-align:right"><div class="amt">${it.type==='earning' ? '+' : '-'}${formatCurrency(it.amount)}</div>
                    <div style="margin-top:6px"><button class="btn" onclick="window.appEdit(${idx})">Edit</button> <button class="btn ghost" onclick="window.appRemove(${idx})">Delete</button></div></div>`;
    if(it.type === 'earning') earnContainer.appendChild(el); else expContainer.appendChild(el);
  });
  // tab toggles
  Array.from(document.querySelectorAll('.tab')).forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      btn.classList.add('active');
      const show = btn.dataset.tab === 'earn' ? earnContainer : expContainer;
      earnContainer.classList.toggle('hidden', show !== earnContainer);
      expContainer.classList.toggle('hidden', show !== expContainer);
    });
  });
}

function renderSummary(){
  let earn=0, exp=0;
  state.items.forEach(it => { if(it.type === 'earning') earn += Number(it.amount || 0); else exp += Number(it.amount || 0); });
  summaryEarn.textContent = formatCurrency(earn);
  summaryExp.textContent = formatCurrency(exp);
  summaryNet.textContent = formatCurrency(earn - exp);
}

// stats
function renderStats(){
  statsList.innerHTML = '';
  const byCat = {}; EXPENSE_CATEGORIES.forEach(c=>byCat[c]=0);
  state.items.forEach(it => { if(it.type === 'expense') byCat[it.category] = (byCat[it.category]||0) + Number(it.amount || 0); });
  const entries = Object.entries(byCat).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  if(entries.length === 0) { statsList.innerHTML = '<div class="muted">No data yet — add expenses to see stats.</div>'; return; }
  entries.forEach(([cat,val]) => {
    const el = document.createElement('div'); el.className = 'item';
    el.innerHTML = `<div><div style="font-weight:700">${escapeHtml(cat)}</div><div class="meta">Total spent</div></div><div style="text-align:right"><div class="amt">${formatCurrency(val)}</div></div>`;
    statsList.appendChild(el);
  });
}

// charts
function initCharts(){
  const barCtx = document.getElementById('barChart').getContext('2d');
  barChart = new Chart(barCtx, { type:'bar', data:{ labels:['Earnings','Expenses'], datasets:[{ label:'Amount', data:[0,0], backgroundColor:['rgba(126,231,184,0.9)','rgba(255,154,162,0.9)'] }]}, options:{plugins:{legend:{display:false}}, responsive:true, maintainAspectRatio:false }});
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  pieChart = new Chart(pieCtx, { type:'pie', data:{ labels:[], datasets:[{ data:[], backgroundColor:[]} ] }, options:{responsive:true, maintainAspectRatio:false}});
  updateCharts();
}

function updateCharts(){
  if(!barChart || !pieChart) return;
  let earn=0, exp=0; state.items.forEach(it=>{ if(it.type==='earning') earn += Number(it.amount||0); else exp += Number(it.amount||0); });
  barChart.data.datasets[0].data = [earn, exp]; barChart.update();
  const byCat={}; EXPENSE_CATEGORIES.forEach(c=>byCat[c]=0); state.items.forEach(it=>{ if(it.type==='expense') byCat[it.category] = (byCat[it.category]||0) + Number(it.amount||0); });
  const labels = Object.keys(byCat).filter(k=>byCat[k]>0); const values = labels.map(l => byCat[l]); const colors = labels.map((_,i)=>SHOP_ITEMS[i % SHOP_ITEMS.length]?.palette?.[0] || '#F0C');
  pieChart.data.labels = labels; pieChart.data.datasets[0].data = values; pieChart.data.datasets[0].backgroundColor = colors; pieChart.update();
}

// exposed
window.appEdit = function(idx){ openModalFor(state.items[idx].type, idx); };
window.appRemove = function(idx){ if(!confirm('Delete?')) return; state.items.splice(idx,1); save(); renderAll(); };

// csv import/export
function exportCSV(){
  const rows = [['type','name','category','amount','frequency','date','note']];
  state.items.forEach(it => rows.push([it.type,it.name,it.category,it.amount,it.frequency,it.date,it.note]));
  const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='finance_export.csv'; a.click(); URL.revokeObjectURL(url);
}
function escapeCsv(v){ if(v===undefined||v===null) return ''; const s = String(v).replace(/"/g,'""'); if(s.includes(',')||s.includes('"')||s.includes('\n')) return `"${s}"`; return s; }
function handleCSVFile(e){ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload = ev => { parseCSVandImport(ev.target.result); csvInput.value=''; }; r.readAsText(f); }
function parseCSVandImport(text){
  const lines = text.split(/\r?\n/).filter(Boolean); if(lines.length < 2) { alert('CSV empty'); return; }
  lines.shift();
  const res=[];
  lines.forEach(line => { const row = parseCSVLine(line); res.push({ type:row[0], name:row[1], category:row[2], amount:parseFloat(row[3])||0, frequency:row[4], date:row[5], note:row[6] }); });
  if(confirm(`Replace data with ${res.length} items? OK replace, Cancel append`)) state.items = res; else state.items = state.items.concat(res);
  save(); renderAll();
}
function parseCSVLine(line){ const out=[]; let cur=''; let inQ=false; for(let i=0;i<line.length;i++){ const ch=line[i]; if(inQ){ if(ch==='\"'){ if(line[i+1]==='\"'){ cur+='"'; i++; } else inQ=false; } else cur+=ch; } else { if(ch==='"') inQ=true; else if(ch===','){ out.push(cur); cur=''; } else cur+=ch; } } out.push(cur); return out; }

// garden & shop logic

function renderShop(){
  shopList.innerHTML = '';
  SHOP_ITEMS.forEach((s, i) => {
    const div = document.createElement('div'); div.className='shop-item';
    div.innerHTML = `<div style="font-weight:700">${s.name}</div><canvas id="shop-canvas-${i}" width="80" height="80"></canvas><div class="muted">Price: ${s.price} coins</div><div style="margin-top:8px"><button class="btn" onclick="buyPlant('${s.id}')">Buy</button></div>`;
    shopList.appendChild(div);
    drawPixelPlantOnCanvas(`shop-canvas-${i}`, s);
  });
}

function buyPlant(id){
  const item = SHOP_ITEMS.find(x=>x.id===id);
  if(!item) return;
  if(state.coins < item.price){ alert('Not enough coins'); return; }
  // find empty slot
  const slotIdx = state.garden.findIndex(s => s === null);
  if(slotIdx === -1){ alert('Garden full! Remove a plant or make space.'); return; }
  // buy
  state.coins -= item.price;
  state.garden[slotIdx] = { shopId: item.id, health: 100, hunger: 100, age: 0, boughtAt: Date.now(), level: 1 };
  save(); renderGarden(); applyTheme();
  showToast(`Bought ${item.name}!`);
}

function renderGarden(){
  gardenSlots.innerHTML = '';
  state.garden.forEach((slot, idx) => {
    const div = document.createElement('div'); div.className='slot';
    if(slot === null){
      div.innerHTML = `<div class="muted">Empty</div><div style="margin-top:8px"><button class="small-btn" onclick="buySlotEmpty(${idx})">Buy slot (free)</button></div>`;
    } else {
      const shop = SHOP_ITEMS.find(s=>s.id===slot.shopId);
      const canvasId = `garden-canvas-${idx}`;
      div.innerHTML = `<canvas id="${canvasId}" width="120" height="120"></canvas>
                       <div style="font-weight:700;margin-top:6px">${shop?.name || 'Plant'}</div>
                       <div class="meta">Lvl ${slot.level} • Age ${Math.floor(slot.age/60)}m</div>
                       <div class="controls">
                         <button class="small-btn" onclick="waterPlant(${idx})">💧</button>
                         <button class="small-btn" onclick="feedPlant(${idx})">🍎</button>
                         <button class="small-btn" onclick="harvestPlant(${idx})">🪙</button>
                         <button class="small-btn" onclick="removePlant(${idx})">🗑️</button>
                       </div>
                       <div class="meter"><i style="width:${Math.max(0,Math.min(100,slot.health))}%"></i></div>
                       <div class="meter"><i style="width:${Math.max(0,Math.min(100,slot.hunger))}% ; background:linear-gradient(90deg,#ffd1e8,#ff9aa2)"></i></div>`;
      // after append we draw
      setTimeout(()=> drawPixelPlantOnCanvas(canvasId, SHOP_ITEMS.find(s=>s.id===slot.shopId), slot.level), 20);
    }
    gardenSlots.appendChild(div);
  });
}

function buySlotEmpty(idx){ alert('Use the Shop to buy plants.'); }

// interactions
function waterPlant(idx){
  const slot = state.garden[idx];
  if(!slot) return;
  slot.health = Math.min(100, slot.health + 20);
  slot.age += 1; // small age increase when interacted
  save(); renderGarden(); showToast('Watered 💧');
}
function feedPlant(idx){
  const slot = state.garden[idx];
  if(!slot) return;
  slot.hunger = Math.min(100, slot.hunger + 25);
  slot.age += 1;
  save(); renderGarden(); showToast('Fed 🍎');
}
function harvestPlant(idx){
  const slot = state.garden[idx];
  if(!slot) return;
  // harvesting gives coins proportional to level and happiness
  const happiness = (slot.health + slot.hunger) / 2;
  const earned = Math.max(1, Math.round((slot.level * happiness) / 50));
  state.coins += earned;
  showToast(`Harvested ${earned} coins!`);
  // small chance to level up
  if(Math.random() < 0.25) slot.level = Math.min(slot.level+1, 5);
  // slight penalty
  slot.health = Math.max(10, slot.health - 20);
  slot.hunger = Math.max(0, slot.hunger - 30);
  save(); renderGarden(); applyTheme();
}
function removePlant(idx){
  if(!confirm('Remove this plant?')) return;
  state.garden[idx] = null;
  save(); renderGarden();
}

// garden tick: age & auto-decay & coin passive
function gardenTick(){
  state.garden.forEach(slot => {
    if(!slot) return;
    slot.age = (slot.age || 0) + 1;
    slot.health = Math.max(0, slot.health - 2);
    slot.hunger = Math.max(0, slot.hunger - 3);
    // passive coin generation if plant healthy
    const happiness = (slot.health + slot.hunger) / 2;
    if(happiness > 70 && Math.random() < 0.2) {
      const earned = Math.max(1, Math.round(slot.level * 0.5));
      state.coins += earned;
    }
  });
  save(); renderGarden(); applyTheme();
}

// pixel plant drawing
function drawPixelPlantOnCanvas(canvasId, shopItem, level=1){
  const c = document.getElementById(canvasId);
  if(!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  // simple pixel art generator: create a grid and draw a leaf/face shaped sprite using palette
  const size = shopItem.size || 8;
  const scale = Math.floor(Math.min(c.width, c.height) / (size + 4));
  const offset = Math.floor((c.width - size*scale)/2);
  // generate pixel map deterministically from shopId + level
  const seed = (shopItem.id.charCodeAt(0) + level*13) % 100;
  const rand = mulberry32(seed);
  // base background
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0,0,c.width,c.height);

  // draw pot
  ctx.fillStyle = shopItem.palette[1] || '#ffd1e8';
  const potH = Math.floor(scale*1.2);
  ctx.fillRect(offset + Math.floor(size*scale*0.25), c.height - potH - 8, Math.floor(size*scale*0.5), potH);

  // draw pixels
  for(let y=0;y<size;y++){
    for(let x=0;x<size;x++){
      // symmetrical pattern for plant body
      const center = Math.floor(size/2);
      const distance = Math.abs(x - center);
      let chance = 0.25 + (1 - distance/center) * 0.6;
      // vary by seed
      if(rand() > chance) continue;
      const paletteIndex = Math.floor(rand()*shopItem.palette.length);
      ctx.fillStyle = shopItem.palette[paletteIndex];
      ctx.fillRect(offset + x*scale, 8 + y*scale, scale, scale);
    }
  }
  // eyes (face) - only for some plants
  ctx.fillStyle = '#3b3b3b';
  ctx.fillRect(offset + center*scale - Math.floor(scale*0.6), 8 + Math.floor(size*scale*0.4), Math.floor(scale*0.6), Math.floor(scale*0.6));
  ctx.fillRect(offset + center*scale + Math.floor(scale*0.2),8 + Math.floor(size*scale*0.4), Math.floor(scale*0.6), Math.floor(scale*0.6));
  // little shine
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.fillRect(offset + center*scale - Math.floor(scale*0.5), 8 + Math.floor(size*scale*0.35), Math.floor(scale*0.25), Math.floor(scale*0.25));
}

// deterministic PRNG
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// daily claim
function claimDaily(){
  const today = (new Date()).toISOString().slice(0,10);
  if(state.lastDaily === today){ alert('Daily already claimed'); return; }
  const bonus = 10;
  state.coins += bonus;
  state.lastDaily = today;
  save(); applyTheme(); showToast(`+${bonus} coins daily bonus!`);
}

// shop draw for canvas helper for shop grid already called in renderShop

function renderShop(){ /* placeholder if shops re-render needed */ }

// small UI helpers
function formatCurrency(n){ return Number(n || 0).toLocaleString(undefined, {style:'currency', currency:'USD', maximumFractionDigits:2}); }
function escapeHtml(s){ if(s===undefined||s===null) return ''; return String(s).replace(/[&<>"'`=\/]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#x2F;","`":"&#x60;","=":"&#x3D;"}[c])); }
function showToast(msg){ const t = document.createElement('div'); t.textContent = msg; t.style.position='fixed'; t.style.left='50%'; t.style.transform='translateX(-50%)'; t.style.bottom='90px'; t.style.background='#fff'; t.style.padding='8px 12px'; t.style.borderRadius='12px'; t.style.boxShadow='0 10px 30px rgba(0,0,0,0.12)'; document.body.appendChild(t); setTimeout(()=>{ t.style.transition='opacity .5s'; t.style.opacity='0'; setTimeout(()=>t.remove(),500); },1500); }

// save & render garden after page load / actions
function renderGarden(){
  // if garden UI exists, draw slots and canvases
  const el = document.getElementById('gardenSlots');
  if(!el) return;
  el.innerHTML = '';
  state.garden.forEach((slot, idx) => {
    const div = document.createElement('div'); div.className='slot';
    if(slot === null){
      div.innerHTML = `<div class="muted">Empty</div><div style="margin-top:8px"><button class="small-btn" onclick="buyPlant('${SHOP_ITEMS[0].id}')">Quick Buy Sprout</button></div>`;
    } else {
      const shop = SHOP_ITEMS.find(s => s.id === slot.shopId) || SHOP_ITEMS[0];
      const canvasId = `garden-canvas-${idx}`;
      div.innerHTML = `<canvas id="${canvasId}" width="120" height="120"></canvas>
        <div style="font-weight:700;margin-top:6px">${shop.name} (Lvl ${slot.level})</div>
        <div class="meta">Age ${Math.floor(slot.age/60)}m</div>
        <div class="controls">
          <button class="small-btn" onclick="waterPlant(${idx})">💧</button>
          <button class="small-btn" onclick="feedPlant(${idx})">🍎</button>
          <button class="small-btn" onclick="harvestPlant(${idx})">🪙</button>
          <button class="small-btn" onclick="removePlant(${idx})">🗑️</button>
        </div>
        <div class="meter"><i style="width:${Math.max(0,Math.min(100,slot.health))}%"></i></div>
        <div class="meter"><i style="width:${Math.max(0,Math.min(100,slot.hunger))}% ; background:linear-gradient(90deg,#ffd1e8,#ff9aa2)"></i></div>`;
      setTimeout(()=> drawPixelPlantOnCanvas(canvasId, shop, slot.level), 20);
    }
    el.appendChild(div);
  });
  coinCount.textContent = state.coins;
}

// helper: draw shop canvases once DOM ready
function renderShop(){
  const shopListEl = document.getElementById('shopList');
  shopListEl.innerHTML = '';
  SHOP_ITEMS.forEach((s, i) => {
    const div = document.createElement('div'); div.className='shop-item';
    div.innerHTML = `<div style="font-weight:700">${s.name}</div><canvas id="shop-canvas-${i}" width="80" height="80"></canvas><div class="muted">Price: ${s.price} coins</div><div style="margin-top:8px"><button class="btn" onclick="buyPlant('${s.id}')">Buy</button></div>`;
    shopListEl.appendChild(div);
    setTimeout(()=>drawPixelPlantOnCanvas(`shop-canvas-${i}`, s, 1), 20);
  });
}

// expose buyPlant so buttons work
window.buyPlant = buyPlant;

// small utilities
function escapeCsv(v){ if(v===undefined||v===null) return ''; const s=String(v).replace(/"/g,'""'); if(s.includes(',')||s.includes('"')||s.includes('\n')) return `"${s}"`; return s; }

// ==== On-load render ====
renderShop();
renderGarden();
initCharts();
renderAll();
save();
