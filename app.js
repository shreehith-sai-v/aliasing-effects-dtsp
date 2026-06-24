/**
 * App Bootstrap — Navigation, routing, keyboard shortcuts, init.
 */

'use strict';

const App = (() => {

  // ─── Navigation ──────────────────────────────────────────────────────────
  let activeSection = 'hero';

  function initNav() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('[data-section-id]');

    // Intersection observer for active nav highlight
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
          const id = entry.target.dataset.sectionId;
          if (id) setActiveNav(id);
        }
      });
    }, { threshold: [0.2], rootMargin: '-10% 0px -70% 0px' });

    sections.forEach(s => observer.observe(s));

    navItems.forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const target = item.dataset.section;
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveNav(target);
      });
    });
  }

  function setActiveNav(id) {
    activeSection = id;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === id);
    });
  }

  // ─── Reveal Animation ────────────────────────────────────────────────────
  function initReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────
  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      const sections = ['hero','exp1','exp2','exp3','exp4','exp5','exp6','exp7','exp8','exp9','exp10'];
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key);
        const target = sections[idx] || sections[0];
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key === '0') {
        const el = document.getElementById('exp10');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ─── Slider fill (visual progress) ───────────────────────────────────────
  function initSliderFills() {
    document.querySelectorAll('input[type=range]').forEach(slider => {
      const update = () => {
        const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        slider.style.background = `linear-gradient(90deg,
          var(--accent-cyan) ${pct}%,
          var(--bg-overlay) ${pct}%)`;
      };
      slider.addEventListener('input', update);
      update();
    });
  }

  // ─── Boot ────────────────────────────────────────────────────────────────
  function boot() {
    // Start hero canvas animation
    Visualizer.startHeroCanvas('hero-canvas');

    // Init mini charts after a tick (allow layout to complete)
    setTimeout(() => {
      try { Visualizer.initMiniCharts(); } catch(e) { console.warn('Mini charts:', e); }
    }, 300);

    // Init all experiments
    Experiments.initAll();

    // Navigation
    initNav();
    initReveal();
    initKeyboard();
    initSliderFills();

    // CTA scroll button
    const cta = document.getElementById('hero-cta');
    if (cta) {
      cta.addEventListener('click', () => {
        document.getElementById('exp1')?.scrollIntoView({ behavior: 'smooth' });
      });
    }

    console.log('%cDSP Sampling Laboratory v1.0', 'color:#00D4DC;font-weight:bold;font-size:14px;');
    console.log('%cSampling Theorem & Aliasing Interactive Laboratory', 'color:#8899AA;');
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { boot, setActiveNav };

})();

window.App = App;
