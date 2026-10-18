const list = [];
const box = document.querySelector('#messages');
const form = document.querySelector('#chatForm');
const input = document.querySelector('#chatInput');
function add(text, role){ const el=document.createElement('div'); el.className=`chat-bubble ${role}`; el.textContent=text; box.appendChild(el); box.scrollTop=box.scrollHeight; }
form.addEventListener('submit', async (e)=>{ e.preventDefault(); const text=input.value.trim(); if(!text)return; input.value=''; add(text,'user'); list.push({role:'user',content:text}); add('Javob tayyorlanmoqda...','assistant'); const loading=box.lastElementChild; try { const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:list})}); const d=await r.json(); loading.remove(); if(!r.ok) throw new Error(d.xato||'Xatolik'); add(d.natija,'assistant'); list.push({role:'assistant',content:d.natija}); } catch(err){ loading.textContent=err.message; } });
