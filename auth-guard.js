(async function () {
  if (location.pathname.endsWith('profil.html') || location.pathname.endsWith('admin.html')) return;
  try {
    const config = await fetch('/api/config').then(r => r.json());
    if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) return;
    const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    const { data } = await client.auth.getUser();
    if (!data.user) location.replace('/profil.html?login=required');
  } catch { location.replace('/profil.html?login=required'); }
})();
