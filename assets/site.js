/* NADO-design — static site script.
   No bundler, no npm at runtime — uses GSAP / Lenis / SplitType from CDN
   (loaded as globals via <script> tags before this file).
   ROOT is set inline on each page: "" at site root, "../" one level deep,
   "../../" two levels deep — every link/asset path is built from it so
   the site works from file://, from a GitHub Pages subpath, or from a
   custom domain root without any changes. */

(function () {
  var ROOT = window.__ROOT__ || '';
  var LANG = window.__LANG__ === 'ro' ? 'ro' : 'ru';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lenisInstance = null;
  var cosmicSphere = null; // элемент со звёздами фона — если есть орбитальная
  // карусель на странице, она сама крутит эту сферу вместо автовращения
  var cosmicAutoRotate = true;

  /* Единственный источник переведённых строк общей "обвязки" (nav/hero-тикер) —
     контент самих страниц переводится в разметке каждой ro/-страницы отдельно. */
  var I18N = {
    ru: {
      menu: 'Меню',
      menuAria: 'Открыть меню',
      langLabel: 'RO',
      home: 'Главная',
      navItems: [
        { slug: 'web-design', label: 'Веб-дизайн' },
        { slug: 'brand-identity', label: 'Айдентика и брендинг' },
        { slug: 'presentations', label: 'КП и презентации' },
        { slug: 'print-prepress', label: 'Полиграфия и препресс' },
        { slug: 'works', label: 'Работы' },
        { slug: 'blog', label: 'Блог' },
        { slug: 'contact', label: 'Заказать' }
      ],
      heroServices: [
        { slug: 'web-design', title: 'Веб-дизайн', cta: 'Узнать больше →' },
        { slug: 'brand-identity', title: 'Айдентика', cta: 'Узнать больше →' },
        { slug: 'presentations', title: 'Презентации', cta: 'Узнать больше →' },
        { slug: 'print-prepress', title: 'Полиграфия', cta: 'Узнать больше →' },
        { slug: 'works', title: 'Работы', cta: 'Узнать больше →' },
        { slug: 'blog', title: 'Блог', cta: 'Узнать больше →' },
        { slug: 'contact', title: 'Заказать', cta: 'Оставить заявку →', isOrder: true }
      ]
    },
    ro: {
      menu: 'Meniu',
      menuAria: 'Deschide meniul',
      langLabel: 'RU',
      home: 'Acasă',
      navItems: [
        { slug: 'web-design', label: 'Design web' },
        { slug: 'brand-identity', label: 'Identitate și branding' },
        { slug: 'presentations', label: 'Oferte și prezentări' },
        { slug: 'print-prepress', label: 'Poligrafie și prepress' },
        { slug: 'works', label: 'Portofoliu' },
        { slug: 'blog', label: 'Blog' },
        { slug: 'contact', label: 'Comandă' }
      ],
      heroServices: [
        { slug: 'web-design', title: 'Design web', cta: 'Află mai multe →' },
        { slug: 'brand-identity', title: 'Identitate', cta: 'Află mai multe →' },
        { slug: 'presentations', title: 'Prezentări', cta: 'Află mai multe →' },
        { slug: 'print-prepress', title: 'Poligrafie', cta: 'Află mai multe →' },
        { slug: 'works', title: 'Portofoliu', cta: 'Află mai multe →' },
        { slug: 'blog', title: 'Blog', cta: 'Află mai multe →' },
        { slug: 'contact', title: 'Comandă', cta: 'Trimite o cerere →', isOrder: true }
      ]
    }
  };
  var t = I18N[LANG];

  var NAV_ITEMS = t.navItems.map(function (item) {
    return { slug: item.slug, label: item.label, href: ROOT + 'pages/' + item.slug + '.html' };
  });

  /* Ссылка на "зеркальную" страницу на другом языке — считается из window.__ROOT__
     и текущего пути, без ручной правки каждой страницы: ru/pages/works/x.html
     и ro/pages/works/x.html лежат по одинаковой относительной структуре,
     просто ro/ на один уровень глубже. */
  function computeLangSwitchUrl() {
    // window.__ROOT__ у ro/-страниц указывает на корень ПОДДЕРЕВА ro/ (совпадает
    // по виду с ru-версией на той же вложенности), а не на настоящий корень сайта —
    // поэтому для ro считаем на 1 уровень глубже настоящей вложенности.
    var subDepth = (ROOT.match(/\.\.\//g) || []).length;
    var trueDepth = LANG === 'ro' ? subDepth + 1 : subDepth;
    var segments = location.pathname.split('/').filter(Boolean);
    if (segments.length < trueDepth + 1) return null;
    var relSegments = segments.slice(segments.length - (trueDepth + 1));
    var upFromRoot = new Array(trueDepth + 1).join('../');
    if (relSegments[0] === 'ro') {
      return upFromRoot + relSegments.slice(1).join('/');
    }
    return upFromRoot + 'ro/' + relSegments.join('/');
  }

  function renderNav(currentSlug, opts) {
    opts = opts || {};
    var mount = document.querySelector('[data-nav]');
    if (!mount) return;

    var links = NAV_ITEMS.map(function (item) {
      var cur = item.slug === currentSlug ? ' is-current' : '';
      return '<li><a class="nav__panel-link' + cur + '" href="' + item.href + '">' + item.label + '</a></li>';
    }).join('');

    var langUrl = computeLangSwitchUrl();
    var langLink = langUrl ? '<a class="nav__lang" href="' + langUrl + '">' + t.langLabel + '</a>' : '';

    mount.innerHTML =
      '<nav class="nav" data-nav-root>' +
      '<a class="nav__logo" href="' + ROOT + 'index.html" style="' + (opts.hideLogo ? 'opacity:0;pointer-events:none;' : '') + '">NADO</a>' +
      '<div class="nav__right">' +
      langLink +
      '<button class="nav__toggle" type="button" data-nav-toggle aria-expanded="false" aria-label="' + t.menuAria + '">' +
      '<span>' + t.menu + '</span><span class="nav__toggle-lines"><span></span><span></span></span>' +
      '</button>' +
      '</div>' +
      '<div class="nav__panel" data-nav-panel>' +
      '<ul class="nav__panel-list">' + links + '</ul>' +
      '<div class="nav__panel-meta"><span>Chișinău, MD</span><span>hello@nado.studio</span></div>' +
      '</div></nav>';

    var root = mount.querySelector('[data-nav-root]');
    var toggle = mount.querySelector('[data-nav-toggle]');
    toggle.addEventListener('click', function () {
      var isOpen = root.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    mount.querySelectorAll('.nav__panel-link').forEach(function (link) {
      link.addEventListener('click', function () {
        root.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function renderFooter() {
    var mount = document.querySelector('[data-footer]');
    if (!mount) return;
    mount.innerHTML =
      '<footer class="footer"><div class="container">' +
      '<div class="footer__top">' +
      '<a class="footer__logo" href="' + ROOT + 'index.html">NADO</a>' +
      '<ul class="footer__contacts">' +
      '<li><a href="nadodesignmd@gmail.com">nadodesignmd@gmail.com</a></li>' +
      '<li><a href="tel:+37379502527">+373 7 950 25 27</a></li>' +
      '<li><a href="https://t.me/nadodesigncom" target="_blank" rel="noopener">Telegram</a></li>' +
      '<li><a href="https://wa.me/37379502527" target="_blank" rel="noopener">WhatsApp</a></li>' +
      '</ul></div>' +
      '<div class="footer__bottom"><span>© ' + new Date().getFullYear() + ' NADO-design</span><span>Chișinău, Moldova</span></div>' +
      '</div></footer>';
  }

  /* Хлебные крошки строятся из data-page-slug + положения текущего файла
     относительно pages/works/ и pages/blog/ (у карточек кейсов и статей
     data-page-slug совпадает с хабом — "works"/"blog", — поэтому подстраницу
     от самого хаба отличаем по наличию "/works/" или "/blog/" в пути). */
  function initBreadcrumbs() {
    var mount = document.querySelector('[data-breadcrumbs]');
    if (!mount) return;
    var slug = document.body.dataset.pageSlug || '';
    if (slug === 'home') return;

    var crumbs = [{ label: t.home, href: ROOT + 'index.html' }];

    var navItem = NAV_ITEMS.filter(function (item) { return item.slug === slug; })[0];
    if (navItem) {
      var isSubPage =
        (slug === 'works' && location.pathname.indexOf('/works/') !== -1) ||
        (slug === 'blog' && location.pathname.indexOf('/blog/') !== -1);

      if (isSubPage) {
        crumbs.push({ label: navItem.label, href: navItem.href });
        crumbs.push({ label: document.title.split(' — ')[0], href: null });
      } else {
        crumbs.push({ label: navItem.label, href: null });
      }
    }

    var items = crumbs.map(function (c) {
      if (c.href) {
        return '<li class="breadcrumbs__item"><a href="' + c.href + '">' + c.label + '</a></li>';
      }
      return '<li class="breadcrumbs__item is-current" aria-current="page">' + c.label + '</li>';
    }).join('<li class="breadcrumbs__sep" aria-hidden="true">/</li>');

    mount.innerHTML = '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol class="breadcrumbs__list">' + items + '</ol></nav>';
  }

  function initSmoothScroll() {
    if (reduceMotion || typeof Lenis === 'undefined') return null;
    var lenis = new Lenis({ duration: 1.1, smoothWheel: true, touchMultiplier: 1.5 });
    lenisInstance = lenis;
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }
    return lenis;
  }

  function initTextReveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    targets.forEach(function (el) {
      if (reduceMotion || typeof SplitType === 'undefined') {
        el.style.opacity = '1';
        return;
      }
      var split = new SplitType(el, { types: 'words' });
      split.words.forEach(function (word) {
        var wrapper = document.createElement('span');
        wrapper.className = 'reveal-word';
        word.parentNode.insertBefore(wrapper, word);
        wrapper.appendChild(word);
      });
      gsap.set(split.words, { y: '110%' });
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: function () {
          gsap.to(split.words, { y: '0%', duration: 0.9, ease: 'power3.out', stagger: 0.03 });
        }
      });
    });
  }

  function initImageReveal() {
    var targets = document.querySelectorAll('[data-reveal-image]');
    targets.forEach(function (el, i) {
      if (reduceMotion || typeof ScrollTrigger === 'undefined') return;
      gsap.set(el, { clipPath: 'inset(100% 0 0 0)' });
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.1, delay: i * 0.05, ease: 'power4.out' });
        }
      });
    });
  }

  function initTagListReveal() {
    document.querySelectorAll('.tag-list').forEach(function (list) {
      var items = list.querySelectorAll('li');
      if (!items.length || reduceMotion || typeof ScrollTrigger === 'undefined') return;
      gsap.set(items, {
        // сдвигаем так, чтобы за экран уезжал ПРАВЫЙ край пункта (минус его же ширина) —
        // иначе широкие теги («Цветовая система» и т.п.) вылезали ещё на всю свою ширину
        // правее общей линии и раздували реальный viewport мобильного браузера
        x: function (i, target) {
          var rect = target.getBoundingClientRect();
          return window.innerWidth - rect.left + 40 - rect.width;
        },
        opacity: 0
      });
      ScrollTrigger.create({
        trigger: list, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(items, { x: 0, opacity: 1, duration: 1, delay: 2,  ease: 'power4.out', stagger: 0.09 });
        }
      });
    });
  }

  function initCaseReveal() {
    var frame = document.querySelector('[data-case-reveal-frame]');
    if (!frame || reduceMotion || typeof ScrollTrigger === 'undefined') return;
    var pieces = frame.querySelectorAll('[data-case-piece]');
    var image = frame.querySelector('[data-case-reveal-image]');

    gsap.set(pieces, { transformPerspective: 1500, z: -120 });

    var EDGE_BUFFER = 100;
    function computeOffsets() {
      var frameRect = frame.getBoundingClientRect();
      var fcx = frameRect.left + frameRect.width / 2;
      var fcy = frameRect.top + frameRect.height / 2;

      return Array.prototype.map.call(pieces, function (target) {
        var r = target.getBoundingClientRect();
        var px = r.left + r.width / 2;
        var py = r.top + r.height / 2;
        var dx = px - fcx;
        var dy = py - fcy;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / len;
        var uy = dy / len;

        var tx = Infinity;
        var ty = Infinity;
        if (ux > 0.01) tx = (window.innerWidth - px) / ux;
        else if (ux < -0.01) tx = (0 - px) / ux;
        if (uy > 0.01) ty = (window.innerHeight - py) / uy;
        else if (uy < -0.01) ty = (0 - py) / uy;

        var t = Math.min(tx, ty);
        if (!isFinite(t) || t < 0) t = 320;
        t += EDGE_BUFFER;

        return { x: ux * t, y: uy * t };
      });
    }

    ScrollTrigger.create({
      trigger: frame, start: 'top 100%', once: true,
      onEnter: function () {
        var offsets = computeOffsets();
        gsap.set(pieces, {
          x: function (i) { return offsets[i].x; },
          y: function (i) { return offsets[i].y; }
        });

        var tl = gsap.timeline({ delay: 0.2 });
        tl.to(pieces, { x: 0, y: 0, z: 0, duration: 0.8, ease: 'power4.out', stagger: 0.09 })
          .to(image, { '--reveal': '114%', duration: 1, ease: 'power2.out' }, '-=0.75');
      }
    });
  }

  function initPreloader() {
    var preloader = document.querySelector('[data-preloader]');
    if (!preloader) return;
    var logo = preloader.querySelector('[data-preloader-logo]'); // есть только на главной
    var bars = preloader.querySelectorAll('.preloader__bar');

    // сшиваем одну картинку вручную: сдвигаем фон каждой полосы влево
    // на её собственный отступ от левого края — без background-attachment:fixed,
    // который не работает вместе с transform на том же элементе
    var posY = window.innerWidth <= 768 ? '45%' : '65%'; // на мобилке кадр уже,
    // поэтому картинку поднимаем выше — меньше Y = виднее верх фото
    bars.forEach(function (bar) {
      var left = bar.getBoundingClientRect().left;
      bar.style.backgroundPosition = (-left) + 'px ' + posY;
    });

    if (reduceMotion || typeof gsap === 'undefined') {
      preloader.remove();
      return;
    }

    document.documentElement.classList.add('is-preloading');

    var tl = gsap.timeline({
      onComplete: function () {
        document.documentElement.classList.remove('is-preloading');
        preloader.remove();
      }
    });
    var UP_BAR_INDEXES = [1, 3, 7, 9, 11, 13, 15]; // 2-я и 4-я полосы (с 0) растут снизу вверх, остальные — сверху вниз

    if (logo) {
      // главная: сначала светлый экран с логотипом, потом полосы поверх него
      tl.to(logo, { opacity: 1, duration: 0., ease: 'power2.out' })
        .to({}, { duration: 0.3 }); // держим логотип на экране, чтобы его успели прочитать
    }

    tl.to(bars, {
        scaleY: 1,
        transformOrigin: function (i) { return UP_BAR_INDEXES.includes(i) ? 'bottom' : 'top'; },
        duration: 0.5, ease: 'power2.inOut', stagger: 0.18
      });

    if (logo) {
      // экран уже полностью закрыт полосами — можно незаметно убрать светлый фон
      // и логотип, чтобы при уходе полос открылась настоящая страница, а не он снова
      tl.set(preloader, { background: 'transparent' })
        .set(logo, { opacity: 0 });
    }

    tl.to(bars, {
        scaleY: 0,
        transformOrigin: function (i) { return UP_BAR_INDEXES.includes(i) ? 'top' : 'bottom'; },
        duration: 0.6, ease: 'power3.inOut', stagger: 0.16
      }, '+=0.2');
  }

  function initCursor() {
    var supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsHover || reduceMotion) return;

    document.body.classList.add('has-custom-cursor');

    var el = document.createElement('div');
    el.className = 'cursor';
    el.innerHTML = '<span class="cursor__ring"></span><span class="cursor__dot"></span>';
    document.body.appendChild(el);

    gsap.set(el, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    var quickX = gsap.quickTo(el, 'x', { duration: 0.3, ease: 'power3.out' });
    var quickY = gsap.quickTo(el, 'y', { duration: 0.3, ease: 'power3.out' });

    window.addEventListener('mousemove', function (e) {
      quickX(e.clientX);
      quickY(e.clientY);
    });

    document.addEventListener('mouseover', function (e) {
      var target = e.target.closest('a, button, [data-magnetic]');
      el.classList.toggle('is-active', !!target);
    });

    document.addEventListener('mouseleave', function () { el.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { el.classList.remove('is-hidden'); });
  }

  function initScrollProgressBar() {
    if (reduceMotion) return;
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, progress)) + ')';
    }

    if (lenisInstance) {
      lenisInstance.on('scroll', update);
    } else {
      window.addEventListener('scroll', update, { passive: true });
    }
    update();
  }

  function initSectionFlash() {
    if (reduceMotion || typeof ScrollTrigger === 'undefined') return;
    document.querySelectorAll('.section').forEach(function (section) {
      ScrollTrigger.create({
        trigger: section, start: 'top 90%', once: true,
        onEnter: function () {
          // hex values mirror --accent / --line in site.css
          gsap.fromTo(section, { borderTopColor: '#33E6FF' }, { borderTopColor: '#2A2A2F', duration: 1.1, ease: 'power2.out' });
        }
      });
    });
  }

  function initMagneticButtons() {
    var supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsHover || reduceMotion) return;
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var relX = e.clientX - rect.left - rect.width / 2;
        var relY = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, { x: relX * 0.35, y: relY * 0.35, duration: 0.4, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  function initTimeline() {
    document.querySelectorAll('[data-timeline]').forEach(function (timeline) {
      var track = timeline.querySelector('[data-timeline-items]');
      var fill = timeline.querySelector('[data-timeline-fill]');
      var items = Array.prototype.slice.call(timeline.querySelectorAll('.timeline__item'));
      if (!track || !fill || items.length === 0) return;

      if (reduceMotion) {
        gsap.set(fill, { scaleY: 1 });
        items.forEach(function (item) { item.classList.add('is-active'); });
        return;
      }

      ScrollTrigger.create({
        trigger: track, start: 'top 50%', end: 'bottom 60%', scrub: 0.4,
        onUpdate: function (self) { gsap.set(fill, { scaleY: self.progress }); }
      });

      items.forEach(function (item) {
        ScrollTrigger.create({
          trigger: item, start: 'top 50%', end: 'bottom 55%',
          onEnter: function () { item.classList.add('is-active'); },
          onEnterBack: function () { item.classList.add('is-active'); },
          onLeave: function () { item.classList.remove('is-active'); },
          onLeaveBack: function () { item.classList.remove('is-active'); }
        });
      });
    });
  }

  function initCaseAccordion() {
    var supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.querySelectorAll('[data-case-accordion]').forEach(function (accordion) {
      var items = Array.prototype.slice.call(accordion.querySelectorAll('[data-case-accordion-item]'));
      if (!items.length) return;

      function setActive(target) {
        items.forEach(function (item) { item.classList.toggle('is-active', item === target); });
      }

      if (supportsHover) {
        items.forEach(function (item) {
          item.addEventListener('mouseenter', function () { setActive(item); });
        });
      } else {
        // На тач-устройствах первый тап по свёрнутому пункту раскрывает его,
        // а не сразу уводит по ссылке — иначе почти всегда промах случайным нажатием.
        items.forEach(function (item) {
          item.addEventListener('click', function (e) {
            if (!item.classList.contains('is-active')) {
              e.preventDefault();
              setActive(item);
            }
          });
        });
      }
    });
  }

  /* Форма заявки шлёт JSON на тот же Cloudflare Worker, что и форма на webonix.md —
     общий Telegram-бот принимает лиды с обоих сайтов, поэтому эндпоинт/формат
     payload должны совпадать в точности. */
  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var status = form.querySelector('[data-form-status]');
    var FORM_ENDPOINT = 'https://webonix-form.igorok7312.workers.dev';
    var MESSAGES = {
      ru: {
        sending: 'Отправка... ',
        done: 'Заявка отправлена. Ответим в ближайшее время.',
        error: 'Ошибка отправки. Попробуйте ещё раз или напишите в Telegram.'
      },
      ro: {
        sending: 'Se trimite... ',
        done: 'Cererea a fost trimisă. Răspundem în curând.',
        error: 'Eroare la trimitere. Încercați din nou sau scrieți pe Telegram.'
      }
    };
    var msg = MESSAGES[LANG] || MESSAGES.ru;
    var frames = ['█░░░░░░░░░', '███░░░░░░░', '█████░░░░░', '███████░░░', '██████████'];

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var payload = {
        name: data.get('name') || '',
        phone: data.get('phone') || '',
        message: data.get('message') || '',
        messenger: data.get('messenger') || '',
        page: document.title
      };

      var frame = 0;
      status.textContent = msg.sending + frames[0];
      var iv = setInterval(function () {
        frame++;
        if (frame < frames.length) status.textContent = msg.sending + frames[frame];
      }, 220);

      fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        clearInterval(iv);
        status.textContent = res.ok ? msg.done : msg.error;
        if (res.ok) form.reset();
      }).catch(function () {
        clearInterval(iv);
        status.textContent = msg.error;
      });
    });
  }

  /* 3D-карусель работ: элементы разложены по кругу через rotateY+translateZ
     внутри контейнера с preserve-3d — перетаскивание крутит кольцо, автовращение
     работает в простое, фильтр пересобирает круг только из подходящих карточек. */
  /* Фон "космос" — вращающаяся сфера точек на весь экран, независимая от
     орбитальной карусели works.html (та же визуальная логика: точки раскиданы
     по сфере через азимут/широту/радиус, но крутится сама по себе, без драга,
     и сидит фиксированным слоем позади всего контента). Только на главной и works. */
  function initCosmicBackground() {
    var STAR_COUNT = window.matchMedia('(min-width: 768px)').matches ? 280 : 120;
    var bg = document.createElement('div');
    bg.className = 'cosmic-bg';
    bg.setAttribute('aria-hidden', 'true');
    var sphere = document.createElement('div');
    sphere.className = 'cosmic-bg__sphere';
    bg.appendChild(sphere);
    document.body.insertBefore(bg, document.body.firstChild);
    cosmicSphere = sphere;

    var stars = [];
    for (var si = 0; si < STAR_COUNT; si++) {
      var star = document.createElement('span');
      star.className = 'cosmic-bg__star';
      var isAccent = Math.random() < 0.18;
      var size = (Math.random() * 2.2 + 1.2).toFixed(1);
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.background = isAccent ? 'var(--accent)' : '#fff';
      star.style.boxShadow = '0 0 ' + (isAccent ? '6px 1px var(--accent-glow)' : '4px 1px rgba(255,255,255,0.55)');
      star.style.setProperty('--star-op', (Math.random() * 0.5 + 0.5).toFixed(2));
      star.style.animationDuration = (2 + Math.random() * 3.5).toFixed(2) + 's';
      star.style.animationDelay = '-' + (Math.random() * 4).toFixed(2) + 's';
      sphere.appendChild(star);
      stars.push({
        el: star,
        azimuth: Math.random() * 360,
        elevation: (Math.random() - 0.5) * 160,
        radiusFactor: 0.4 + Math.random() * 1.3
      });
    }

    var radius = 0;
    function layout() {
      radius = Math.min(window.innerWidth, window.innerHeight) * 0.55;
      stars.forEach(function (s) {
        var r = radius * s.radiusFactor;
        var az = s.azimuth * Math.PI / 180;
        var el = s.elevation * Math.PI / 180;
        var x = r * Math.cos(el) * Math.sin(az);
        var y = r * Math.sin(el);
        var z = r * Math.cos(el) * Math.cos(az);
        s.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px)';
      });
    }
    layout();

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    });

    if (reduceMotion) {
      sphere.style.transform = 'rotateX(-14deg)';
      return;
    }

    var spinY = 0;
    var tiltX = -14;
    function spin() {
      // На странице с каруселью initOrbitGallery() сам крутит sphere вслед
      // за кольцом (драг/наклон/автовращение) — этот цикл тогда просто
      // ничего не делает, кроме как ждёт на случай если карусель исчезнет.
      if (cosmicAutoRotate) {
        spinY += 0.015;
        sphere.style.transform = 'rotateX(' + tiltX + 'deg) rotateY(' + spinY.toFixed(2) + 'deg)';
      }
      requestAnimationFrame(spin);
    }
    requestAnimationFrame(spin);
  }

  function initOrbitGallery() {
    var gallery = document.querySelector('[data-orbit-gallery]');
    if (!gallery) return;
    var ring = gallery.querySelector('[data-orbit-ring]');
    var allItems = Array.prototype.slice.call(ring.querySelectorAll('[data-orbit-item]'));
    var bar = document.querySelector('[data-filter-bar]');

    // На маленьких экранах 3D-кольцо не строим вообще — драг для вращения
    // конфликтует со скроллом страницы и жестами тач-устройств. Вместо этого
    // просто горизонтальная лента со scroll-snap (.orbit-gallery--flat в CSS),
    // а фильтр — тот же плоский show/hide, что и на blog.html.
    var isDesktopCarousel = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktopCarousel) {
      gallery.classList.add('orbit-gallery--flat');
      if (bar) {
        bar.addEventListener('click', function (e) {
          var btn = e.target.closest('button[data-filter]');
          if (!btn) return;
          bar.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          var filter = btn.dataset.filter;
          allItems.forEach(function (item) {
            item.style.display = (filter === 'all' || item.dataset.category === filter) ? '' : 'none';
          });
        });
      }
      return;
    }

    // Карусель есть на странице — забираем управление вращением фона у него
    // самого: дальше sphere крутится строго вместе с кольцом (см. paint()).
    cosmicAutoRotate = false;

    var visibleItems = allItems;
    var ringAngle = 0; // вращение кольца вокруг вертикальной оси (спин влево/вправо)
    var tiltAngle = -4; // наклон всего кольца вокруг горизонтальной оси (заглянуть сверху/снизу)
    var TILT_MIN = -60;
    var TILT_MAX = 60;
    var radius = 0;

    function computeRadius() {
      // Радиус фиксирован по контейнеру и НЕ зависит от количества карточек —
      // при фильтрации круг больше не "сжимается". Под число элементов
      // подстраивается размер самих карточек (computeItemSize).
      radius = gallery.clientWidth * 0.5 * 0.8;
    }

    function computeItemSize() {
      // Обратная формула к "натуральному" радиусу правильного n-угольника:
      // при фиксированном радиусе карточки должны быть шире, если их мало,
      // и уже, если их много, чтобы кольцо не выглядело ни дырявым, ни слипшимся.
      var n = visibleItems.length || 1;
      var w = n > 1 ? (radius * 2 * Math.tan(Math.PI / n)) / 1.15 : radius * 0.8;
      w = Math.max(100, Math.min(400, w));
      gallery.style.setProperty('--orbit-item-w', w.toFixed(0) + 'px');
    }

    function paint() {
      // Каждая карточка развёрнута рёбром наружу (rotateY на себе) и стоит
      // на общем кольце — целиком видно всё кольцо, а не только "фасад".
      // Кольцо целиком крутится по Y (спин) и наклоняется по X (взгляд
      // сверху/снизу), чтобы ощущалось настоящее 3D-пространство.
      visibleItems.forEach(function (item) {
        var base = parseFloat(item.dataset.baseAngle || '0');
        var total = ((base + ringAngle) % 360 + 360) % 360;
        var rad = (total > 180 ? total - 360 : total) * Math.PI / 180;
        var factor = (Math.cos(rad) + 1) / 2;
        item.style.transform = 'translate(-50%,-50%) rotateY(' + base + 'deg) translateZ(' + radius.toFixed(1) + 'px)';
        item.style.opacity = (0.6 + 0.4 * factor).toFixed(2);
        item.style.pointerEvents = factor < 0.1 ? 'none' : '';
      });
      var ringTransform = 'rotateX(' + tiltAngle.toFixed(1) + 'deg) rotateY(' + ringAngle.toFixed(1) + 'deg)';
      ring.style.transform = ringTransform;
      if (cosmicSphere) cosmicSphere.style.transform = ringTransform;
    }

    function applyRing() {
      paint();
    }

    function layout() {
      computeRadius();
      computeItemSize();
      var n = visibleItems.length;
      visibleItems.forEach(function (item, i) {
        item.dataset.baseAngle = (360 / n) * i;
      });
      applyRing();
    }

    function applyFilter(filter) {
      visibleItems = allItems.filter(function (item) {
        return filter === 'all' || item.dataset.category === filter;
      });
      allItems.forEach(function (item) {
        item.style.display = visibleItems.indexOf(item) === -1 ? 'none' : '';
      });
      ringAngle = 0;
      layout();
    }

    if (bar) {
      bar.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-filter]');
        if (!btn) return;
        bar.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        applyFilter(btn.dataset.filter);
      });
    }

    if (reduceMotion) {
      layout();
      return;
    }

    var isDragging = false;
    var startX = 0;
    var startY = 0;
    var lastX = 0;
    var startAngle = 0;
    var startTilt = 0;
    var velocity = 0;
    var totalMove = 0;
    var idleTimer = null;
    var autoRotateActive = false;
    var autoRotateRAF = null;

    function stopAutoRotate() {
      autoRotateActive = false;
      if (autoRotateRAF) cancelAnimationFrame(autoRotateRAF);
    }

    function autoRotateStep() {
      if (!autoRotateActive) return;
      ringAngle += 0.03;
      applyRing();
      autoRotateRAF = requestAnimationFrame(autoRotateStep);
    }

    function scheduleAutoRotate() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        autoRotateActive = true;
        autoRotateRAF = requestAnimationFrame(autoRotateStep);
      }, 1200);
    }

    function inertiaStep() {
      if (Math.abs(velocity) < 0.05) { scheduleAutoRotate(); return; }
      ringAngle += velocity * 0.3;
      velocity *= 0.92;
      applyRing();
      requestAnimationFrame(inertiaStep);
    }

    // Указатель "захватываем" (setPointerCapture) НЕ сразу на pointerdown,
    // а только когда движение реально превысило порог — иначе браузер начинает
    // маршрутизировать через захвативший элемент события на карточках,
    // и переход по ссылке-карточке перестаёт срабатывать даже при обычном клике.
    var pendingPointerId = null;
    var captured = false;

    function releaseCaptureIfAny() {
      if (captured && pendingPointerId !== null) {
        try { gallery.releasePointerCapture(pendingPointerId); } catch (err) {}
      }
      captured = false;
      pendingPointerId = null;
    }

    gallery.addEventListener('pointerdown', function (e) {
      isDragging = true;
      totalMove = 0;
      velocity = 0;
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      startAngle = ringAngle;
      startTilt = tiltAngle;
      pendingPointerId = e.pointerId;
      stopAutoRotate();
      clearTimeout(idleTimer);
    });

    gallery.addEventListener('pointermove', function (e) {
      if (!isDragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      velocity = e.clientX - lastX;
      lastX = e.clientX;
      totalMove = Math.max(totalMove, Math.abs(dx), Math.abs(dy));

      if (!captured && totalMove > 6) {
        captured = true;
        gallery.classList.add('is-dragging');
        try { gallery.setPointerCapture(e.pointerId); } catch (err) {}
      }
      if (!captured) return; // пока не решили, что это драг, — кольцо не крутим

      ringAngle = startAngle + dx * 0.3;
      // Тащим вниз — верх кольца наклоняется к нам (заглядываем сверху),
      // тащим вверх — наоборот, заглядываем снизу.
      tiltAngle = Math.max(TILT_MIN, Math.min(TILT_MAX, startTilt + dy * 0.25));
      applyRing();
    });

    function endDrag() {
      if (!isDragging) return;
      isDragging = false;
      gallery.classList.remove('is-dragging');
      releaseCaptureIfAny();
      if (Math.abs(velocity) > 0.5) {
        requestAnimationFrame(inertiaStep);
      } else {
        scheduleAutoRotate();
      }
    }

    gallery.addEventListener('pointerup', endDrag);
    gallery.addEventListener('pointercancel', endDrag);

    gallery.addEventListener('click', function (e) {
      if (totalMove > 6) { e.preventDefault(); }
    });

    gallery.addEventListener('mouseenter', function () { clearTimeout(idleTimer); stopAutoRotate(); });
    gallery.addEventListener('mouseleave', function () { if (!isDragging) scheduleAutoRotate(); });

    layout();
    scheduleAutoRotate();

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    });
  }

  function initFilter() {
    var bar = document.querySelector('[data-filter-bar]');
    var grid = document.querySelector('[data-works-grid]');
    if (!bar || !grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-category]'));
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      bar.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      var filter = btn.dataset.filter;
      cards.forEach(function (card) {
        card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
      });
    });
  }

  /* ---- Hero (homepage only) ---- */
  var HERO_SERVICES = t.heroServices.map(function (service) {
    return { title: service.title, cta: service.cta, link: ROOT + 'pages/' + service.slug + '.html', isOrder: !!service.isOrder };
  });

  function initHero() {
    var hero = document.querySelector('[data-hero]');
    if (!hero) return;

    var logo = hero.querySelector('[data-hero-logo]');
    var eyebrow = hero.querySelector('[data-hero-eyebrow]');
    var scrollHint = hero.querySelector('[data-hero-scroll-hint]');
    var viewport = hero.querySelector('[data-hero-list]');
    var track = hero.querySelector('[data-hero-list-track]');

    gsap.set(logo, { y: reduceMotion ? 0 : 200, opacity: reduceMotion ? 1 : 0 });

    var introTl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(logo, { y: 0, opacity: 1, duration: reduceMotion ? 0.01 : 1.1 });
    if (eyebrow) introTl.to(eyebrow, { opacity: 1, duration: reduceMotion ? 0.01 : 0.6 }, reduceMotion ? 0 : 0.3);
    if (scrollHint) introTl.to(scrollHint, { opacity: 1, duration: reduceMotion ? 0.01 : 0.6 }, reduceMotion ? 0 : 0.5);

    if (!viewport || !track) return;

    var itemEls = HERO_SERVICES.map(function (service, i) {
      var link = document.createElement('a');
      link.className = 'hero__list-item' + (service.isOrder ? ' is-order' : '');
      link.href = service.link;
      link.style.setProperty('--item-hue', ((360 / HERO_SERVICES.length) * i).toFixed(1));
      var title = document.createElement('span');
      title.className = 'hero__list-item-title';
      title.textContent = service.title.replace(/\n/g, ' ');
      var cta = document.createElement('span');
      cta.className = 'hero__list-item-cta';
      cta.textContent = service.cta;
      link.appendChild(title);
      link.appendChild(cta);
      track.appendChild(link);
      return link;
    });

    if (reduceMotion || typeof ScrollTrigger === 'undefined') {
      itemEls.forEach(function (el) { el.classList.add('is-current'); });
      return;
    }

    var steps = itemEls.length - 1;
    var rowHeight = itemEls[0].getBoundingClientRect().height;

    function centerY(floatIndex) {
      return viewport.clientHeight / 2 - (floatIndex * rowHeight + rowHeight / 2);
    }

    function paint(floatIndex) {
      itemEls.forEach(function (el, i) {
        var norm = Math.min(1, Math.abs(i - floatIndex));
        el.style.opacity = 1 - norm * 0.85;
        el.style.setProperty('--item-chroma', (Math.max(0, 1 - norm * 1.3) * 0.16).toFixed(3));
        el.classList.toggle('is-current', norm < 0.4);
      });
    }

    var settleTimer = null;

    var st = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: function () { return '+=' + (steps * window.innerHeight * 0.4); },
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.4,
      onUpdate: function (self) {
        var floatIndex = self.progress * steps;
        gsap.set(track, { y: centerY(floatIndex) });
        paint(floatIndex);

        clearTimeout(settleTimer);
        settleTimer = setTimeout(function () {
          var nearest = Math.round(floatIndex);
          var targetY = self.start + (nearest / steps) * (self.end - self.start);
          if (lenisInstance) {
            lenisInstance.scrollTo(targetY, { duration: 0.6, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
          }
        }, 120);
      }
    });

    // Первое позиционирование — через rAF, чтобы к моменту замера высот
    // css уже точно применился (иначе на некоторых брейкпоинтах ловим
    // устаревшую высоту .hero__list и трек уезжает не туда).
    requestAnimationFrame(function () {
      rowHeight = itemEls[0].getBoundingClientRect().height;
      gsap.set(track, { y: centerY(0) });
      paint(0);
    });

    // Пересчёт при ресайзе/повороте экрана — переход через брейкпоинт
    // меняет высоту строки и .hero__list, трек должен встать заново.
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        rowHeight = itemEls[0].getBoundingClientRect().height;
        var floatIndex = st.progress * steps;
        gsap.set(track, { y: centerY(floatIndex) });
        paint(floatIndex);
      }, 150);
    });
  }

  /* ---- Boot ---- */
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    var slug = document.body.dataset.pageSlug || '';
    var isHome = document.body.dataset.pageSlug === 'home';

    initPreloader();
    initCosmicBackground();
    renderNav(slug, { hideLogo: isHome });
    renderFooter();
    initBreadcrumbs();
    initSmoothScroll();
    initTextReveal();
    initImageReveal();
    initTagListReveal();
    initCaseReveal();
    initCursor();
    initScrollProgressBar();
    initSectionFlash();
    initMagneticButtons();
    initTimeline();
    initFilter();
    initOrbitGallery();
    initCaseAccordion();
    initContactForm();

    if (isHome) initHero();
  });
})();
