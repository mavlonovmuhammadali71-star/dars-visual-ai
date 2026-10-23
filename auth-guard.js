if (false) (async function () {
  if (location.pathname.endsWith('profil.html') || location.pathname.endsWith('admin.html')) return;

  let authenticated = false;
  try {
    const config = await fetch('/api/config').then(r => r.json());
    if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      const { data } = await client.auth.getUser();
      authenticated = Boolean(data.user);
    }
  } catch { authenticated = false; }
  if (authenticated) return;

  const showLoginNotice = () => {
    let notice = document.getElementById('loginNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'loginNotice';
      notice.className = 'login-notice';
      notice.innerHTML = '🔐 Bu bo‘limdan foydalanish uchun <a href="profil.html#google-login">Google orqali ro‘yxatdan o‘ting</a>';
      document.body.appendChild(notice);
    }
    requestAnimationFrame(() => notice.classList.add('show'));
    clearTimeout(window.loginNoticeTimer);
    window.loginNoticeTimer = setTimeout(() => notice.classList.remove('show'), 4500);
  };

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (/(^|\/)(slaydlar|poyga|kutubxona)\.html(?:#|$)/.test(href)) {
      event.preventDefault();
      showLoginNotice();
    }
  });
})();
