/**
 * Symbios: поведение страницы.
 * Подключается как <script type="module">: выполняется после разбора HTML,
 * не создаёт глобальных переменных. Тему до отрисовки ставит маленький скрипт в <head> index.html.
 */

/**
 * Флаги функций. login: пункт меню и раздел «Вход».
 * На статическом сайте нет бэкенда авторизации, поэтому по умолчанию раздел скрыт.
 * true — показать разметку с data-feature="login", false — удалить её со страницы.
 */
const FEATURES = {
  login: false,
};

function applyFeatureFlags() {
  document.querySelectorAll('[data-feature]').forEach((el) => {
    if (FEATURES[el.dataset.feature]) {
      el.hidden = false;
    } else {
      el.remove();
    }
  });
}

/**
 * Тема оформления: тёмная или светлая (атрибут data-theme у <html>).
 * Выбор посетителя хранится в localStorage; пока он ничего не выбирал,
 * тема следует настройке системы и меняется вместе с ней.
 */
const THEME_COLORS = { dark: '#22205a', light: '#f6f8fc' };

function initTheme() {
  const root = document.documentElement;
  const button = document.querySelector('[data-theme-toggle]');
  const meta = document.querySelector('meta[name="theme-color"]');
  const media = window.matchMedia('(prefers-color-scheme: light)');

  const apply = (theme) => {
    root.dataset.theme = theme;
    meta?.setAttribute('content', THEME_COLORS[theme]);
    if (button) {
      const label = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  };

  const stored = () => {
    try {
      return localStorage.getItem('theme');
    } catch {
      return null;
    }
  };

  apply(root.dataset.theme === 'light' ? 'light' : 'dark');

  button?.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* в приватном режиме хранилище бывает недоступно: тема просто не запомнится */
    }
  });

  media.addEventListener('change', (event) => {
    if (!stored()) apply(event.matches ? 'light' : 'dark');
  });
}

/* Меню на узких экранах: кнопка-бургер открывает список разделов */
function initNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) setOpen(false);
  });
}

/* Подсветка в меню раздела, который сейчас на экране */
function initScrollSpy() {
  const links = [...document.querySelectorAll('.site-nav .nav-link[href^="#"]')];
  const sections = links.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const visible = new Set();
  const mark = () => {
    // Текущий раздел — самый верхний из пересекающих полосу посередине экрана
    const current = sections.find((section) => visible.has(section));
    links.forEach((link) => {
      const isCurrent = Boolean(current) && link.hash === `#${current.id}`;
      link.classList.toggle('is-active', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      mark();
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((section) => observer.observe(section));
}

/* Плавное появление блоков с атрибутом data-reveal, когда они попадают в экран */
function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((el) => observer.observe(el));
}

/* Слайдер «до/после» (замена BeerSlider 1.0.3 без полифиллов) */
function initBeforeAfter(root) {
  const reveal = root.querySelector('.before-after-reveal');
  const revealImg = reveal && reveal.querySelector('img');
  if (!revealImg) return;

  const range = document.createElement('input');
  Object.assign(range, { type: 'range', min: '0', max: '100', value: '50', className: 'before-after-range' });
  range.setAttribute('aria-label', 'Сравнение «до» и «после»: какая часть исходной таблицы показана, %');

  const handle = document.createElement('span');
  handle.className = 'before-after-handle';
  handle.setAttribute('aria-hidden', 'true');
  root.append(range, handle);

  const move = () => {
    reveal.style.width = `${range.value}%`;
    handle.style.left = `${range.value}%`;
  };
  range.addEventListener('input', move);

  // Перетаскивание мышью, пером и пальцем по всей площади слайдера
  const setFromPointer = (event) => {
    const rect = root.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    range.value = String(Math.round(Math.min(100, Math.max(0, percent))));
    move();
  };
  root.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    root.setPointerCapture(event.pointerId);
    setFromPointer(event);
  });
  root.addEventListener('pointermove', (event) => {
    if (root.hasPointerCapture(event.pointerId)) setFromPointer(event);
  });
  root.addEventListener('dragstart', (event) => event.preventDefault());

  // Ширина «открываемой» картинки всегда равна ширине слайдера,
  // в том числе когда раздел был скрыт и стал видимым.
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width) revealImg.style.width = `${entry.contentRect.width}px`;
  }).observe(root);

  move();
  root.classList.add('is-ready');
}

/* Лайтбокс портфолио на нативном <dialog> */
function initLightbox() {
  const gallery = document.getElementById('portfolio-gallery');
  const dialog = document.getElementById('lightbox');
  if (!gallery || !dialog || typeof dialog.showModal !== 'function') return;

  const items = [...gallery.querySelectorAll('a[href]')];
  const picture = document.createElement('picture');
  const source = document.createElement('source');
  const img = document.createElement('img');
  source.type = 'image/webp';
  picture.append(source, img);
  dialog.querySelector('[data-lightbox-media]').append(picture);
  const title = dialog.querySelector('[data-lightbox-title]');
  const text = dialog.querySelector('[data-lightbox-text]');
  const counter = dialog.querySelector('[data-lightbox-counter]');
  const fullscreenBtn = dialog.querySelector('[data-lightbox-fullscreen]');
  let current = 0;
  let opener = null;

  const show = (index) => {
    current = (index + items.length) % items.length;
    const item = items[current];
    source.srcset = item.dataset.webp || '';
    img.src = item.href;
    img.alt = [item.dataset.title, item.dataset.caption].filter(Boolean).join(': ');
    title.textContent = item.dataset.title || '';
    text.textContent = item.dataset.caption || '';
    counter.textContent = `${current + 1} / ${items.length}`;
  };

  items.forEach((item, index) => {
    item.addEventListener('click', (event) => {
      event.preventDefault();
      opener = item;
      show(index);
      dialog.showModal();
    });
  });

  dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => show(current + 1));
  dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });

  // Клик по свободному месту вокруг картинки закрывает лайтбокс
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.classList.contains('lightbox-figure')) dialog.close();
  });

  // Свайп на сенсорных экранах
  let touchX = null;
  dialog.addEventListener(
    'touchstart',
    (event) => {
      touchX = event.touches[0].clientX;
    },
    { passive: true },
  );
  dialog.addEventListener('touchend', (event) => {
    if (touchX === null) return;
    const dx = event.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  dialog.addEventListener('close', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    opener?.focus();
  });

  if (document.fullscreenEnabled) {
    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    });
  } else {
    fullscreenBtn.hidden = true;
  }
}

/* Форма обратной связи: отправка через Formspree без перезагрузки страницы */
function initContactForm(form) {
  const status = form.querySelector('.form-status');
  const button = form.querySelector('[type="submit"]');

  const setStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.action.includes('YOUR_FORM_ID')) {
      console.warn('Форма обратной связи не настроена: укажите ID формы Formspree в атрибуте action (см. README).');
      setStatus('Не удалось отправить сообщение: форма ещё не подключена.', true);
      return;
    }
    button.disabled = true;
    setStatus('Отправляем…');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      form.reset();
      setStatus('Спасибо! Сообщение отправлено.');
    } catch (error) {
      console.error(error);
      setStatus('Не удалось отправить сообщение. Попробуйте ещё раз позже.', true);
    } finally {
      button.disabled = false;
    }
  });
}

function initLoginForm(form) {
  form.addEventListener('submit', (event) => event.preventDefault()); // TODO: подключить бэкенд авторизации
}

function setCurrentYear() {
  document.querySelectorAll('[data-current-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

/* Прелоадер: убрать после события load, но не позже чем через 1 с */
function hidePreloader() {
  const preloader = document.querySelector('.preloader');
  if (!preloader) return;
  let hidden = false;
  const hide = () => {
    if (hidden) return;
    hidden = true;
    preloader.classList.add('is-hidden');
    setTimeout(() => preloader.remove(), 400);
  };
  if (document.readyState === 'complete') hide();
  else window.addEventListener('load', hide, { once: true });
  setTimeout(hide, 1000);
}

hidePreloader();
applyFeatureFlags();
initTheme();
initNav();
initScrollSpy();
initReveal();
document.querySelectorAll('[data-before-after]').forEach(initBeforeAfter);
initLightbox();
document.querySelectorAll('[data-contact-form]').forEach(initContactForm);
document.querySelectorAll('[data-login-form]').forEach(initLoginForm);
setCurrentYear();
