// ======= Sections =======
const sections = {
  finance: document.getElementById('financeSection'),
  garden: document.getElementById('gardenSection'),
  games: document.getElementById('gamesSection'),
  store: document.getElementById('storeSection')
};

function showSection(section){
  Object.values(sections).forEach(s=>s.classList.remove('active'));
  section.classList.add('active');
}

document.getElementById('financeBtn').onclick=()=>showSection(sections.finance);
document.getElementById('gardenBtn').onclick=()=>showSection(sections.garden);
document.getElementById('gamesBtn').onclick=()=>showSection(sections.games);
document.getElementById('storeBtn').onclick=()=>showSection(sections.store);

// ======= RESOURCES =======
let coins = Number(localStorage.getItem('coins'))||10;
let water = Number(localStorage.getItem('water'))||3;
let food = Number(localStorage.getItem('food'))||3;
const coinsDisplay = document.getElementById('coins');
const waterDisplay = document.getElementById('waterCount');
const foodDisplay = document.getElementById('foodCount');
function updateResources(){ coinsDisplay.textContent=coins; waterDisplay.textContent=water; foodDisplay.textContent=food; }
updateResources();

// ======= FINANCE =======
let financeEntries = JSON.parse(localStorage.getItem('financeEntries'))||[];
function saveFinance(){ localStorage.setItem('financeEntries', JSON.stringify(financeEntries)); displayFinance(); }
function displayFinance(){
  const list=document.getElementById('financeList'); list.innerHTML='';
  let totalE=0, totalX=0;
  financeEntries.forEach((e,i)=>{
    const li=document.createElement('li');
    li.textContent=`${e.name} - $${e.amount} (${e.type}) | ${e.frequency} | ${e.date||''} | ${e.note||''}`;
    const btn=document.createElement('button'); btn.textContent='Remove';
    btn.onclick=()=>{ financeEntries.splice(i,1); saveFinance(); };
    li.appendChild(btn); list.appendChild(li);
    e.type==='earning'? totalE+=e.amount: totalX+=e.amount;
  });
  document.getElementById('financeTotals').textContent=`Total Earnings: $${totalE} | Total Expenses: $${totalX} | Net: $${totalE-totalX}`;
}
document.getElementById('addEntryBtn').onclick=()=>{
  const name=document.getElementById('entryName').value;
  const amount=Number(document.getElementById('entryAmount').value);
  const type=document.getElementById('entryType').value;
  const frequency=document.getElementById('entryFrequency').value;
  const date=document.getElementById('entryDate').value;
  const note=document.getElementById('entryNote').value;
  if(name && amount){ financeEntries.push({name, amount, type, frequency, date, note}); saveFinance(); }
};
saveFinance();

// ======= GARDEN =======
let plants = JSON.parse(localStorage.getItem('plants'))||[];
const gardenGrid=document.getElementById('gardenGrid');

const plantTypes=[
  {name:'Sunflower', cost:5, images:['https://i.ibb.co/LtB4Y6Y/sunflower-seed.png','https://i.ibb.co/3kV7J7Q/sunflower-sprout.png','https://i.ibb.co/zfGZtVW/sunflower-bloom.png']},
  {name:'Rose', cost:10, images:['https://i.ibb.co/5vhgkSn/rose-seed.png','https://i.ibb.co/8gL0XrX/rose-sprout.png','https://i.ibb.co/7kZnQfx/rose-bloom.png']},
  {name:'Tulip', cost:7, images:['https://i.ibb.co/TMbM3F4/tulip-seed.png','https://i.ibb.co/6X8T2Vw/tulip-sprout.png','https://i.ibb.co/3ShM1Z9/tulip-bloom.png']},
  {name:'Cactus', cost:3, images:['https://i.ibb.co/FVYZQ6J/cactus-seed.png','https://i.ibb.co/WnD8Tcz/cactus-sprout.png','https://i.ibb.co/tJxhw0K/cactus-bloom.png']},
  {name:'Daisy', cost:4, images:['https://i.ibb.co/1mZRkQ3/daisy-seed.png','https://i.ibb.co/XFv3PnR/daisy-sprout.png','https://i.ibb.co/xDyt0Xk/daisy-bloom.png']},
  {name:'Orchid', cost:12, images:['https://i.ibb.co/3hHnP2M/orchid-seed.png','https://i.ibb.co/2PWXfRL/orchid-sprout.png','https://i.ibb.co/vZt5yCg/orchid-bloom.png']},
  {name:'Lily', cost:8, images:['https://i.ibb.co/wCw5vZs/lily-seed.png','https://i.ibb.co/7KLVK0x/lily-sprout.png','https://i.ibb.co/J7V0Ftz/lily-bloom.png']},
  {name:'Bonsai', cost:15, images:['https://i.ibb.co/6bKx7JH/bonsai-seed.png','https://i.ibb.co/7Ym7G7K/bonsai-sprout.png','https://i.ibb.co/f0p5d2g/bonsai-bloom.png']},
  {name:'Lavender', cost:6, images:['https://i.ibb.co/6BXMQ0y/lavender-seed.png','https://i.ibb.co/1ZKjJmH/lavender-sprout.png','https://i.ibb.co/0FJH1MK/lavender-bloom.png']},
  {name:'Cherry Blossom', cost:20, images:['https://i.ibb.co/BcKQGfH/cherry-seed.png','https://i.ibb.co/Z2Z1WrX/cherry-sprout.png','https://i.ibb.co/Y7B0Z8X/cherry-bloom.png']}
];

const potTypes=['Red','Blue','Yellow','Green','Pink','Purple','Orange','Brown','White','Black'];

function saveGarden(){ localStorage.setItem('plants', JSON.stringify(plants)); updateResources(); displayGarden(); }
function displayGarden(){
  gardenGrid.innerHTML='';
  plants.forEach(p=>{
    const div=document.createElement('div'); div.className='plant-card';
    let stageIndex = Math.min(p.age,2);
    const happiness = p.water>=3 && p.food>=3 ? '😄' : (p.water>=2 && p.food>=2 ? '😐' : '😢');
    div.innerHTML=`
      <img src="${p.images[stageIndex]}" alt="${p.name}" class="grow">
      <p>${p.name} (${p.pot})</p>
      <p>Water: ${p.water}/5 | Food: ${p.food}/5</p>
      <p>Happiness: ${happiness}</p>
    `;
    gardenGrid.appendChild(div);
  });
}
displayGarden();

function waterPlant(){ if(water<=0){ alert("No water! Play mini-games."); return; } plants.forEach(p=>{ if(p.water<5)p.water++; }); water--; saveGarden(); }
function feedPlant(){ if(food<=0){ alert("No food! Play mini-games."); return; } plants.forEach(p=>{ if(p.food<5)p.food++; }); food--; saveGarden(); }
document.getElementById('waterPlantBtn').onclick=waterPlant;
document.getElementById('feedPlantBtn').onclick=feedPlant;

// Age plants every minute with animation
setInterval(()=>{ plants.forEach(p=>{ if(p.age<2)p.age++; }); saveGarden(); },60000);

// ======= STORE =======
const plantStoreGrid=document.getElementById('plantStoreGrid');
const potStoreGrid=document.getElementById('potStoreGrid');
function displayStore(){
  plantStoreGrid.innerHTML=''; potStoreGrid.innerHTML='';
  plantTypes.forEach(p=>{
    const btn=document.createElement('button'); btn.textContent=`${p.name} (${p.cost} coins)`; plantStoreGrid.appendChild(btn);
    btn.onclick=()=>{
      if(coins>=p.cost){ coins-=p.cost; plants.push({name:p.name,pot:'Default',water:3,food:3,age:0,images:p.images}); saveGarden(); }
      else alert("Not enough coins!");
    };
  });
  potTypes.forEach(p=>{
    const btn=document.createElement('button'); btn.textContent=p; potStoreGrid.appendChild(btn);
    btn.onclick=()=>{
      if(plants.length>0){ plants[plants.length-1].pot=p; saveGarden(); }
      else alert("Buy a plant first!");
    };
  });
}
displayStore();

// ======= DAY/NIGHT =======
function updateDayNight(){ const h=new Date().getHours(); document.body.style.background=(h>=6&&h<18)?'#fff0f5':'#2c3e50'; document.body.style.color=(h>=6&&h<18)?'#333':'#fff'; }
setInterval(updateDayNight,60000); updateDayNight();

// ======= MINI-GAMES =======
const gameArea=document.getElementById('gameArea');
document.getElementById('tapGameBtn').onclick=()=>{
  gameArea.innerHTML='<p>Tap fast for 5 seconds!</p><button id="tapBtn">Tap</button><p>Score: <span id="tapScore">0</span></p>';
  let score=0; const tapScore=document.getElementById('tapScore'); const tapBtn=document.getElementById('tapBtn');
  tapBtn.onclick=()=>{ score++; tapScore.textContent=score; };
  setTimeout(()=>{ alert(`You earned ${score} coins, ${score} water, ${score} food!`); coins+=score; water+=score; food+=score; saveGarden(); gameArea.innerHTML=''; },5000);
};

document.getElementById('matchGameBtn').onclick=()=>{
  gameArea.innerHTML='<p>Match letters!</p>'; const letters=['A','B','A','B']; let first=null; let score=0;
  letters.forEach(l=>{ const b=document.createElement('button'); b.textContent=l; gameArea.appendChild(b); b.onclick=()=>{ if(!first) first=b; else{ if(first.textContent===b.textContent) score++; first=null; else first=null; } }; });
  setTimeout(()=>{ alert(`You earned ${score} coins, ${score} water, ${score} food!`); coins+=score; water+=score; food+=score; saveGarden(); gameArea.innerHTML=''; },10000);
};
