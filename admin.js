const password = document.querySelector('#password');
const msg = document.querySelector('#loginMsg');
const login = document.querySelector('#login');
const dashboard = document.querySelector('#dashboard');
document.querySelector('#loginBtn').onclick = async () => {
  msg.textContent = 'Tekshirilmoqda...';
  const res = await fetch('/api/admin/summary', { headers: { 'x-admin-password': password.value } });
  const data = await res.json();
  if (!res.ok) { msg.textContent = data.xato || 'Kirish amalga oshmadi'; return; }
  login.hidden = true; dashboard.hidden = false;
  document.querySelector('#users').textContent = data.users;
  document.querySelector('#materials').textContent = data.materials.length;
  document.querySelector('#subs').textContent = data.subscriptions.length;
  document.querySelector('#subRows').innerHTML = data.subscriptions.map(s => `<tr><td>${s.user_id}</td><td>${s.plan || 'free'}</td><td>${s.status || '-'}</td><td>${s.daily_images ?? '-'}</td><td>${s.daily_slides ?? '-'}</td></tr>`).join('') || '<tr><td colspan="5">Hali obuna yo‘q</td></tr>';
};
document.querySelector('#logoutBtn').onclick = () => { dashboard.hidden = true; login.hidden = false; password.value = ''; };
