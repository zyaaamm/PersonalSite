(() => {
  'use strict';
  const intro = document.querySelector('.intro');
  const shell = document.querySelector('#site-shell');
  const introWord = document.querySelector('.intro-word');
  const introSkip = document.querySelector('.intro-skip');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const welcomeTiming = { scene: 3600, hello: 1900, exit: 1100, quickExit: 180 };
  const greetingScenes = [...document.querySelectorAll('.hero-greeting')];
  let greetingIndex = 0;
  let greetingPaused = false;
  let heroVisible = true;
  let greetingTimer;
  function setGreeting(index) {
    greetingIndex = index;
    greetingScenes.forEach((scene, i) => scene.classList.toggle('is-current', i === index));
    document.querySelectorAll('[data-greeting-language]').forEach(label => label.classList.toggle('is-current', label.dataset.greetingLanguage === (index ? 'zh' : 'en')));
  }
  function syncGreeting() {
    clearTimeout(greetingTimer);
    if (greetingPaused || !heroVisible || document.hidden || !intro.hidden) return;
    greetingTimer = setTimeout(() => { setGreeting(1 - greetingIndex); syncGreeting(); }, 3800);
  }
  document.querySelector('.greeting-toggle').addEventListener('click', event => {
    greetingPaused = !greetingPaused;
    event.currentTarget.textContent = greetingPaused ? '继续轮换' : '暂停轮换';
    event.currentTarget.setAttribute('aria-pressed', String(greetingPaused));
    syncGreeting();
  });
  document.addEventListener('visibilitychange', syncGreeting);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      syncGreeting();
    }, { threshold: .15 }).observe(document.querySelector('.hero'));
  }
  let introTimers = [];
  let writingAnimations = [];
  let introReturnFocus;
  const clearIntroTimers = () => { introTimers.forEach(clearTimeout); introTimers = []; };
  const svgNS = 'http://www.w3.org/2000/svg';
  function svgNode(name, attributes = {}) {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function buildHandwriting() {
    const holder = document.querySelector('.hanzi-writing');
    const data = window.WELCOME_HANZI;
    if (!data) { holder.textContent = '很高兴你来了'; return; }
    [...'很高兴你来了'].forEach((character, characterIndex) => {
      const glyph = data[character];
      const svg = svgNode('svg', { viewBox: '0 0 1024 1024', class: 'hanzi-character' });
      const group = svgNode('g', { transform: 'translate(0 900) scale(1 -1)' });
      const lengths = glyph.medians.map(points => points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - points[i][0], point[1] - points[i][1]), 0));
      const total = lengths.reduce((a, b) => a + b, 0);
      let elapsed = 0;
      glyph.medians.forEach((median, strokeIndex) => {
        let d = `M${median[0][0]} ${median[0][1]}`;
        for (let i = 1; i < median.length - 1; i++) {
          const point = median[i], next = median[i + 1];
          d += ` Q${point[0]} ${point[1]} ${(point[0] + next[0]) / 2} ${(point[1] + next[1]) / 2}`;
        }
        const last = median[median.length - 1];
        d += ` L${last[0]} ${last[1]}`;
        const duration = 800 * lengths[strokeIndex] / total + 18;
        const pen = svgNode('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': '52', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: '1', class: 'hanzi-pen' });
        pen.dataset.delay = String(characterIndex * 245 + elapsed);
        pen.dataset.duration = String(duration);
        elapsed += duration;
        group.append(pen);
      });
      svg.append(group);
      holder.append(svg);
    });
  }
  function writeHello() {
    if (reduceMotion.matches) return;
    writingAnimations.push(document.querySelector('.hello-stroke').animate(
      [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
      { duration: welcomeTiming.hello, easing: 'cubic-bezier(.3,.08,.3,1)', fill: 'both' }
    ));
  }
  function writeChinese() {
    if (reduceMotion.matches) return;
    document.querySelectorAll('.hanzi-pen').forEach(pen => writingAnimations.push(pen.animate(
      [{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }],
      { duration: Number(pen.dataset.duration), delay: Number(pen.dataset.delay), easing: 'linear', fill: 'both' }
    )));
  }
  function finishIntro(quick = false) {
    if (intro.hidden || intro.dataset.step === 'done') return;
    clearIntroTimers();
    intro.dataset.step = 'done';
    intro.style.setProperty('--intro-exit', `${quick ? welcomeTiming.quickExit : welcomeTiming.exit}ms`);
    intro.classList.add('is-leaving');
    shell.inert = false;
    document.body.classList.remove('intro-open');
    if (introReturnFocus) introReturnFocus.focus({ preventScroll: true });
    else document.querySelector('#hero-title').focus({ preventScroll: true });
    introTimers.push(setTimeout(() => { intro.hidden = true; intro.classList.remove('is-running'); syncGreeting(); }, reduceMotion.matches ? 0 : quick ? welcomeTiming.quickExit : welcomeTiming.exit));
  }
  function playIntro(returnFocus = null) {
    clearIntroTimers();
    clearTimeout(greetingTimer);
    writingAnimations.forEach(animation => animation.cancel());
    writingAnimations = [];
    introReturnFocus = returnFocus;
    intro.hidden = false;
    intro.classList.remove('is-leaving', 'is-running', 'second-visible');
    intro.dataset.step = 'one';
    introWord.textContent = 'Hello，我是Zya';
    void intro.offsetWidth;
    intro.classList.add('is-running');
    shell.inert = true;
    document.body.classList.add('intro-open');
    intro.focus({ preventScroll: true });
    writeHello();
    introTimers.push(setTimeout(() => {
      intro.dataset.step = 'two';
      intro.classList.add('second-visible');
      introWord.textContent = '很高兴你来了';
      writeChinese();
      introTimers.push(setTimeout(finishIntro, welcomeTiming.scene));
    }, welcomeTiming.scene));
  }
  introSkip.addEventListener('click', () => finishIntro(true));
  document.querySelector('.replay-intro').addEventListener('click', event => playIntro(event.currentTarget));
  document.addEventListener('keydown', event => {
    if (!intro.hidden && intro.dataset.step !== 'done') {
      if (event.key === 'Escape') finishIntro(true);
      if (event.key === 'Tab') { event.preventDefault(); introSkip.focus(); }
    }
  });
  buildHandwriting();
  playIntro();

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#navigation');
  const siteHeader = document.querySelector('.site-header');
  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开导航');
    nav.classList.remove('is-open');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  matchMedia('(min-width: 641px)').addEventListener('change', closeMenu);

  const contactReveal = document.querySelector('.contact-reveal');
  const contactEmail = document.querySelector('#contact-email');
  function setContactExpanded(expanded, focusEmail = false) {
    contactReveal.setAttribute('aria-expanded', String(expanded));
    contactReveal.setAttribute('aria-label', expanded ? '收起联系邮箱' : '显示联系邮箱');
    contactEmail.hidden = !expanded;
    if (expanded && focusEmail) contactEmail.querySelector('.email-address').focus({ preventScroll: true });
  }
  contactReveal.addEventListener('click', () => {
    const expanded = contactReveal.getAttribute('aria-expanded') !== 'true';
    setContactExpanded(expanded, expanded);
  });
  if ('IntersectionObserver' in window) {
    const contactObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setContactExpanded(true);
        contactObserver.disconnect();
      }
    }, { threshold: 0.25 });
    contactObserver.observe(document.querySelector('#contact'));
  }

  const demoLinkSlot = document.querySelector('.project-link-slot');
  const demoUrl = demoLinkSlot?.dataset.demoUrl?.trim();
  if (demoLinkSlot && demoUrl && /^https:\/\//i.test(demoUrl)) {
    const link = document.createElement('a');
    link.className = 'project-live-link';
    link.href = demoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '在线体验 ↗';
    demoLinkSlot.append(link);
  }
  let toastTimer;
  function notify(message) {
    const toast = document.querySelector('.toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }
  document.querySelector('.copy-email').addEventListener('click', async () => {
    const email = '2814864961@qq.com';
    let copied = false;
    try { await navigator.clipboard.writeText(email); copied = true; } catch {
      const field = document.createElement('textarea');
      field.value = email;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.append(field);
      field.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      field.remove();
      document.querySelector('.copy-email').focus({ preventScroll: true });
    }
    notify(copied ? '邮箱已复制，期待你的来信 :)' : '请长按或选中邮箱地址进行复制');
  });

  if ('IntersectionObserver' in window) {
    if (!reduceMotion.matches) {
      document.body.classList.add('motion-ready');
      const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
      }), { threshold: 0.06 });
      document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
    }
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.hash === '#' + entry.target.id ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current'));
    }), { rootMargin: '-90px 0px -50% 0px', threshold: 0 });
    ['home', 'experience', 'projects', 'honors', 'contact'].forEach(id => navObserver.observe(document.getElementById(id)));
  }
  let scrollScheduled = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    document.querySelector('.reading-progress').style.width = (max > 0 ? Math.min(100, Math.max(0, scrollY / max * 100)) : 0) + '%';
    siteHeader.classList.toggle('is-scrolled', scrollY > 36);
    scrollScheduled = false;
  }
  addEventListener('scroll', () => { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  addEventListener('resize', updateProgress);
  updateProgress();
})();

