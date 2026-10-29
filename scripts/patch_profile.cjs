const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'components', 'ProfileScreenWeb.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'components', 'ProfileScreenWeb.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // 1. Remove duplicate coin balance and duplicate Test Mode button in profile top bar
  // Look for:
  // {/* Coin balance action / display - Only for non-admin users */}
  // through to {/* Logout button */}
  const coinBalRegex = /\{\/\* Coin balance action \/ display - Only for non-admin users \*\/\}[\s\S]*?\{\/\* Logout button \*\/\}/;
  if (coinBalRegex.test(code)) {
    code = code.replace(coinBalRegex, `{/* Logout button */}`);
    console.log(`[OK] Removed duplicate coin balance & test mode button from: ${file}`);
  } else {
    console.warn(`[WARN] Coin balance regex not matched in ${file}`);
  }

  // 2. Patch useEffect to handle open_plans_packages for both admin and normal users
  const oldEffect = `  useEffect(() => {
    if (!isAdmin) {
      if (activeTab !== 'profile') setActiveTab('profile');
      return;
    }
    const handleOpenRss = () => setActiveTab('dashboard');
    const handleOpenTemplates = () => setActiveTab('templates');
    const handleOpenPlans = () => setActiveTab('plans_packages');
    const handleOpenTemplateManagerCustom = () => setNormalUserTab('templates_manager');

    window.addEventListener('open_rss_dashboard', handleOpenRss);
    window.addEventListener('open_template_manager', handleOpenTemplates);
    window.addEventListener('open_plans_packages', handleOpenPlans);
    window.addEventListener('ai_news_open_template_manager', handleOpenTemplateManagerCustom);
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h.includes('plan') || h.includes('package') || h.includes('promo')) {
        setActiveTab('plans_packages');
      } else if (h.includes('template')) {
        setActiveTab('templates');
        setNormalUserTab('templates_manager');
      } else if (h.includes('dashboard') || h.includes('rss') || h.includes('feed')) {
        setActiveTab('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => {
      window.removeEventListener('open_rss_dashboard', handleOpenRss);
      window.removeEventListener('open_template_manager', handleOpenTemplates);
      window.removeEventListener('open_plans_packages', handleOpenPlans);
      window.removeEventListener('ai_news_open_template_manager', handleOpenTemplateManagerCustom);
      window.removeEventListener('hashchange', handleHash);
    };
  }, [isAdmin]);`;

  const newEffect = `  useEffect(() => {
    const handleOpenRss = () => {
      if (isAdmin) setActiveTab('dashboard');
    };
    const handleOpenTemplates = () => {
      if (isAdmin) setActiveTab('templates');
      setNormalUserTab('templates_manager');
    };
    const handleOpenPlans = () => {
      if (isAdmin) setActiveTab('plans_packages');
      setNormalUserTab('membership');
      setTimeout(() => {
        const el = document.getElementById('user-membership-accordion-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    const handleOpenTemplateManagerCustom = () => setNormalUserTab('templates_manager');

    window.addEventListener('open_rss_dashboard', handleOpenRss);
    window.addEventListener('open_template_manager', handleOpenTemplates);
    window.addEventListener('open_plans_packages', handleOpenPlans);
    window.addEventListener('ai_news_open_template_manager', handleOpenTemplateManagerCustom);
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h.includes('plan') || h.includes('package') || h.includes('promo') || h.includes('membership')) {
        if (isAdmin) setActiveTab('plans_packages');
        setNormalUserTab('membership');
      } else if (h.includes('template')) {
        if (isAdmin) setActiveTab('templates');
        setNormalUserTab('templates_manager');
      } else if (h.includes('dashboard') || h.includes('rss') || h.includes('feed')) {
        if (isAdmin) setActiveTab('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => {
      window.removeEventListener('open_rss_dashboard', handleOpenRss);
      window.removeEventListener('open_template_manager', handleOpenTemplates);
      window.removeEventListener('open_plans_packages', handleOpenPlans);
      window.removeEventListener('ai_news_open_template_manager', handleOpenTemplateManagerCustom);
      window.removeEventListener('hashchange', handleHash);
    };
  }, [isAdmin]);`;

  // Standardize CRLF to LF for matching
  const normOldEffect = oldEffect.replace(/\r\n/g, '\n');
  const normCode = code.replace(/\r\n/g, '\n');

  if (normCode.includes(normOldEffect)) {
    code = normCode.replace(normOldEffect, newEffect);
    console.log(`[OK] Patched useEffect in: ${file}`);
  } else {
    console.warn(`[WARN] Old effect not found directly in: ${file}`);
  }

  // 3. Add id="user-membership-accordion-section"
  if (!code.includes('id="user-membership-accordion-section"')) {
    code = code.replace(
      `{/* OPTION 2: मेंबरशिप प्लान व अपग्रेड */}\n            <div className={\`rounded-2xl border transition-all overflow-hidden shadow-lg \${normalUserTab === 'membership'`,
      `{/* OPTION 2: मेंबरशिप प्लान व अपग्रेड */}\n            <div id="user-membership-accordion-section" className={\`rounded-2xl border transition-all overflow-hidden shadow-lg \${normalUserTab === 'membership'`
    );
    console.log(`[OK] Added id="user-membership-accordion-section" in: ${file}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
