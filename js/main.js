/**
 * Symbios: поведение страницы.
 * Подключается как <script type="module">: выполняется после разбора HTML,
 * после bootstrap.bundle.min.js (тоже defer), не создаёт глобальных переменных.
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

/* Анимации появления (data-animation="bounce-in-left" и т. п.) */
function animateSection(section) {
  section.querySelectorAll('[data-animation]').forEach((el) => {
    const className = `animate-${el.dataset.animation}`;
    el.classList.remove(className);
    void el.offsetWidth; // перезапуск анимации, если класс уже стоял
    el.classList.add(className);
    el.addEventListener('animationend', () => el.classList.remove(className), { once: true });
  });
}

/**
 * Разделы — слайды карусели Bootstrap. Адрес раздела хранится в location.hash
 * (#services, #portfolio…): ссылки работают с клавиатуры, кнопка «Назад» переключает
 * раздел, на раздел можно дать ссылку. Имя раздела задаётся атрибутом data-section,
 * а не id: иначе браузер прокручивает к «якорю» карусель и страницу.
 */
function initSections() {
  const carouselEl = document.getElementById('main-carousel');
  if (!carouselEl || !window.bootstrap) return;

  const sections = [...carouselEl.querySelectorAll('.carousel-item')];
  const ids = sections.map((section) => section.dataset.section);
  const navLinks = [...document.querySelectorAll('.site-nav .nav-link[href^="#"]')];
  const indexFromHash = () => ids.indexOf(decodeURIComponent(location.hash.slice(1)));

  const markNav = (id) => {
    navLinks.forEach((link) => {
      const isCurrent = link.hash === `#${id}`;
      link.classList.toggle('active', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  // Открыть раздел из адреса сразу, без анимации перелистывания
  const initial = Math.max(indexFromHash(), 0);
  sections.forEach((section, i) => section.classList.toggle('active', i === initial));
  markNav(ids[initial]);
  animateSection(sections[initial]);

  const carousel = window.bootstrap.Carousel.getOrCreateInstance(carouselEl, {
    interval: false,
    ride: false,
    touch: false,
    wrap: true,
  });

  let moveFocus = false;

  carouselEl.addEventListener('slide.bs.carousel', (event) => {
    animateSection(event.relatedTarget);
  });

  carouselEl.addEventListener('slid.bs.carousel', (event) => {
    const section = sections[event.to];
    const id = ids[event.to];
    markNav(id);
    const hash = `#${id}`;
    if (location.hash !== hash && !(event.to === 0 && !location.hash)) {
      history.pushState(null, '', hash); // листание стрелками клавиатуры тоже попадает в историю
    }
    if (moveFocus) {
      section.focus({ preventScroll: true });
      moveFocus = false;
    }
  });

  window.addEventListener('hashchange', () => {
    // Пустой адрес — главная; чужие якоря (например, #main у ссылки «Перейти к содержимому») не трогаем
    const index = location.hash ? indexFromHash() : 0;
    if (index < 0) return;
    const active = sections.findIndex((section) => section.classList.contains('active'));
    if (index === active) return;
    moveFocus = true;
    carousel.to(index);
  });
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
    img.alt = item.querySelector('img')?.alt || '';
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
initSections();
document.querySelectorAll('[data-before-after]').forEach(initBeforeAfter);
initLightbox();
document.querySelectorAll('[data-contact-form]').forEach(initContactForm);
document.querySelectorAll('[data-login-form]').forEach(initLoginForm);
setCurrentYear();
