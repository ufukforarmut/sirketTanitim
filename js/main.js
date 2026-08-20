/* ==========================================================================
   Meridyen Mimarlık — main.js
   Bölümler:
   01. Yapılandırma
   02. Yardımcı fonksiyonlar
   03. Toast bildirim sistemi
   04. Header: kaydırma durumu ve aktif menü bağlantısı
   05. Mobil menü
   06. Kaydırma ile beliren içerik
   07. İletişim formu: doğrulama ve gönderim
   08. Footer yılı
   ========================================================================== */

(function () {
  'use strict';

  /* ========================================================================
     01. YAPILANDIRMA
     ========================================================================
     BACKEND ENTEGRASYONU
     --------------------
     Form şu anda demo modunda çalışır: gerçek bir istek atılmaz, başarılı
     gönderim simüle edilir. Sunucu tarafı hazır olduğunda tek yapılması
     gereken, aşağıdaki ENDPOINT değerine mail gönderen servisin adresini
     yazmaktır (örn. '/api/contact' veya 'https://api.meridyenmimarlik.com/iletisim').
     Adres tanımlandığı anda kod otomatik olarak gerçek POST isteğine geçer;
     form verisi JSON olarak gönderilir.
     ======================================================================== */
  var CONFIG = {
    ENDPOINT: '',              // Boş bırakılırsa demo modu devrededir.
    DEMO_DELAY: 1100,          // Demo modunda sahte ağ gecikmesi (ms)
    TOAST_DURATION: 6000,      // Bildirimin ekranda kalma süresi (ms)
    MOBILE_BREAKPOINT: 900     // style.css ile aynı kırılım noktası
  };

  var MESSAGES = {
    success: {
      title: 'Talebiniz alındı',
      text: 'Mesajınız başarıyla iletildi, ekibimiz sizinle iletişime geçecektir.'
    },
    error: {
      title: 'Gönderim başarısız',
      text: 'Talebiniz iletilemedi. Lütfen tekrar deneyin veya info@meridyenmimarlik.com adresine yazın.'
    },
    invalid: {
      title: 'Eksik bilgi',
      text: 'Lütfen işaretli alanları kontrol edip tekrar gönderin.'
    }
  };

  /* ========================================================================
     02. YARDIMCI FONKSİYONLAR
     ======================================================================== */
  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* Kaydırma/yeniden boyutlandırma olaylarını tarayıcı çizim döngüsüne bağlar */
  function throttleToFrame(callback) {
    var scheduled = false;
    return function () {
      if (scheduled) { return; }
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        callback();
      });
    };
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ========================================================================
     03. TOAST BİLDİRİM SİSTEMİ
     ======================================================================== */
  var Toast = (function () {
    var region = qs('#toastRegion');

    var ICONS = {
      success: '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
               '<path d="m4.6 10.3 3.2 3.2 7.6-7.6" stroke="currentColor" stroke-width="2.4" ' +
               'stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error:   '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' +
               '<path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2.4" ' +
               'stroke-linecap="round"/></svg>'
    };

    function dismiss(toast) {
      if (!toast || toast.dataset.closing === 'true') { return; }
      toast.dataset.closing = 'true';
      toast.classList.remove('is-visible');
      window.setTimeout(function () {
        if (toast.parentNode) { toast.parentNode.removeChild(toast); }
      }, 320);
    }

    /**
     * Ekranın sağ alt köşesinde bildirim gösterir.
     * @param {'success'|'error'} type
     * @param {{title: string, text: string}} content
     */
    function show(type, content) {
      if (!region) { return; }

      var toast = document.createElement('div');
      toast.className = 'toast' + (type === 'error' ? ' toast--error' : '');

      var icon = document.createElement('span');
      icon.className = 'toast__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = ICONS[type] || ICONS.success;

      var body = document.createElement('div');
      body.className = 'toast__body';

      var title = document.createElement('p');
      title.className = 'toast__title';
      title.textContent = content.title;

      var text = document.createElement('p');
      text.className = 'toast__text';
      text.textContent = content.text;

      body.appendChild(title);
      body.appendChild(text);

      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'toast__close';
      close.setAttribute('aria-label', 'Bildirimi kapat');
      close.innerHTML = '&times;';
      close.addEventListener('click', function () { dismiss(toast); });

      toast.appendChild(icon);
      toast.appendChild(body);
      toast.appendChild(close);
      region.appendChild(toast);

      /* Giriş animasyonunu tetiklemek için bir sonraki çizim karesini bekle */
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          toast.classList.add('is-visible');
        });
      });

      window.setTimeout(function () { dismiss(toast); }, CONFIG.TOAST_DURATION);
    }

    return { show: show };
  })();

  /* ========================================================================
     04. HEADER: KAYDIRMA DURUMU VE AKTİF MENÜ BAĞLANTISI
     ======================================================================== */
  function initHeader() {
    var header = qs('#siteHeader');
    if (!header) { return; }

    var onScroll = throttleToFrame(function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    });

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Görünen bölüme göre menüdeki bağlantıyı vurgular */
  function initActiveNavLink() {
    var links = qsa('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) { return; }

    var linkById = {};
    var sections = [];

    links.forEach(function (link) {
      var id = (link.getAttribute('href') || '').replace('#', '');
      var section = id ? document.getElementById(id) : null;
      if (section) {
        linkById[id] = link;
        sections.push(section);
      }
    });

    function setActive(id) {
      links.forEach(function (link) {
        link.classList.toggle('is-active', link === linkById[id]);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      /* Görünür bölümler arasında ekranda en çok yer kaplayanı seç */
      var best = null;
      entries.forEach(function (entry) {
        if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
          best = entry;
        }
      });
      if (best) { setActive(best.target.id); }
    }, {
      rootMargin: '-45% 0px -45% 0px',
      threshold: [0, 0.15, 0.35]
    });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ========================================================================
     05. MOBİL MENÜ
     ======================================================================== */
  function initMobileNav() {
    var toggle = qs('#navToggle');
    var nav = qs('#primaryNav');
    if (!toggle || !nav) { return; }

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      document.body.classList.toggle('is-locked', open);
    }

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    toggle.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    /* Bir bağlantıya tıklandığında menü kapansın */
    qsa('a', nav).forEach(function (link) {
      link.addEventListener('click', function () {
        if (isOpen()) { setOpen(false); }
      });
    });

    /* Escape tuşu menüyü kapatır ve odağı butona geri verir */
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Menü dışına tıklama */
    document.addEventListener('click', function (event) {
      if (!isOpen()) { return; }
      if (!nav.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });

    /* Masaüstü genişliğine geçildiğinde açık kalmış menüyü sıfırla */
    window.addEventListener('resize', throttleToFrame(function () {
      if (window.innerWidth > CONFIG.MOBILE_BREAKPOINT && isOpen()) {
        setOpen(false);
      }
    }));
  }

  /* ========================================================================
     06. KAYDIRMA İLE BELİREN İÇERİK
     ======================================================================== */
  function initReveal() {
    var items = qsa('.reveal');
    if (!items.length) { return; }

    /* Hareket azaltma tercihi veya eski tarayıcı: içerik doğrudan görünsün */
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach(function (item) { item.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target); /* Bir kez göster, tekrar izleme */
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.12
    });

    items.forEach(function (item) { observer.observe(item); });
  }

  /* ========================================================================
     07. İLETİŞİM FORMU
     ======================================================================== */
  function initContactForm() {
    var form = qs('#contact-form');
    if (!form) { return; }

    var submitBtn = qs('#submitBtn', form);
    var statusEl = qs('#formStatus', form);

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    /* Rakam, boşluk, +, -, parantez kabul edilir; en az 10 rakam beklenir */
    var PHONE_PATTERN = /^[0-9\s()+-]{10,20}$/;

    /* Alan bazlı doğrulama kuralları */
    var RULES = {
      fullName: function (value) {
        if (!value) { return 'Ad soyad alanı zorunludur.'; }
        if (value.length < 3) { return 'Lütfen adınızı ve soyadınızı eksiksiz girin.'; }
        return '';
      },
      email: function (value) {
        if (!value) { return 'E-posta adresi zorunludur.'; }
        if (!EMAIL_PATTERN.test(value)) { return 'Geçerli bir e-posta adresi girin (ör. ad@ornek.com).'; }
        return '';
      },
      phone: function (value) {
        if (!value) { return ''; } /* Telefon isteğe bağlıdır */
        if (!PHONE_PATTERN.test(value)) { return 'Telefon numarasını kontrol edin (ör. +90 532 000 00 00).'; }
        return '';
      },
      subject: function (value) {
        if (!value) { return 'Lütfen bir konu seçin.'; }
        return '';
      },
      message: function (value) {
        if (!value) { return 'Mesaj alanı zorunludur.'; }
        if (value.length < 20) { return 'Talebinizi daha iyi değerlendirebilmemiz için en az 20 karakter yazın.'; }
        return '';
      },
      consent: function (value, field) {
        if (!field.checked) { return 'Devam etmek için aydınlatma metnini onaylamanız gerekir.'; }
        return '';
      }
    };

    function fieldValue(field) {
      return field.type === 'checkbox' ? String(field.checked) : field.value.trim();
    }

    function setFieldError(field, message) {
      var errorEl = document.getElementById(field.id + 'Error');

      if (message) {
        field.classList.add('is-invalid');
        field.setAttribute('aria-invalid', 'true');
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        }
      } else {
        field.classList.remove('is-invalid');
        field.removeAttribute('aria-invalid');
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.hidden = true;
        }
      }
    }

    function validateField(field) {
      var rule = RULES[field.name];
      if (!rule) { return true; }

      var message = rule(fieldValue(field), field);
      setFieldError(field, message);
      return message === '';
    }

    var fields = Object.keys(RULES)
      .map(function (name) { return form.elements[name]; })
      .filter(Boolean);

    /* Alandan çıkışta doğrula; hatalı alan düzeltilirken anlık geri bildirim ver */
    fields.forEach(function (field) {
      var eventName = (field.type === 'checkbox' || field.tagName === 'SELECT') ? 'change' : 'blur';

      field.addEventListener(eventName, function () { validateField(field); });

      field.addEventListener('input', function () {
        if (field.classList.contains('is-invalid')) { validateField(field); }
      });
    });

    function validateForm() {
      var firstInvalid = null;

      fields.forEach(function (field) {
        var valid = validateField(field);
        if (!valid && !firstInvalid) { firstInvalid = field; }
      });

      return firstInvalid;
    }

    function setLoading(loading) {
      if (!submitBtn) { return; }
      submitBtn.classList.toggle('is-loading', loading);
      submitBtn.disabled = loading;
      var label = qs('.btn__label', submitBtn);
      if (label) { label.textContent = loading ? 'Gönderiliyor…' : 'Talebi Gönder'; }
    }

    function announce(text) {
      if (statusEl) { statusEl.textContent = text; }
    }

    /**
     * Form verisini sunucuya iletir.
     * CONFIG.ENDPOINT tanımlıysa gerçek POST isteği atılır;
     * tanımlı değilse demo modunda başarılı yanıt simüle edilir.
     * @param {Object} payload
     * @returns {Promise}
     */
    function sendRequest(payload) {
      if (!CONFIG.ENDPOINT) {
        /* --- DEMO MODU --- */
        return new Promise(function (resolve) {
          window.setTimeout(function () {
            /* Backend bağlandığında bu blok devre dışı kalır */
            if (window.console && console.info) {
              console.info('[Meridyen] Demo modu — sunucuya gönderilecek veri:', payload);
            }
            resolve({ ok: true, demo: true });
          }, CONFIG.DEMO_DELAY);
        });
      }

      /* --- GERÇEK GÖNDERİM --- */
      return fetch(CONFIG.ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('Sunucu ' + response.status + ' durum kodu döndürdü.');
        }
        return response.json().catch(function () { return { ok: true }; });
      });
    }

    form.addEventListener('submit', function (event) {
      /* Sayfa yenilenmeden gönderim (AJAX) */
      event.preventDefault();

      var firstInvalid = validateForm();

      if (firstInvalid) {
        Toast.show('error', MESSAGES.invalid);
        announce(MESSAGES.invalid.text);
        firstInvalid.focus();
        return;
      }

      var payload = {
        fullName: form.elements.fullName.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        subject: form.elements.subject.value,
        subjectLabel: form.elements.subject.options[form.elements.subject.selectedIndex].text,
        message: form.elements.message.value.trim(),
        consent: form.elements.consent.checked,
        submittedAt: new Date().toISOString()
      };

      setLoading(true);
      announce('Talebiniz gönderiliyor.');

      sendRequest(payload)
        .then(function () {
          form.reset();
          fields.forEach(function (field) { setFieldError(field, ''); });
          Toast.show('success', MESSAGES.success);
          announce(MESSAGES.success.text);
        })
        .catch(function (error) {
          if (window.console && console.error) {
            console.error('[Meridyen] Form gönderim hatası:', error);
          }
          Toast.show('error', MESSAGES.error);
          announce(MESSAGES.error.text);
        })
        .then(function () {
          setLoading(false);
        });
    });
  }

  /* ========================================================================
     08. FOOTER YILI
     ======================================================================== */
  function initFooterYear() {
    var el = qs('#currentYear');
    if (el) { el.textContent = String(new Date().getFullYear()); }
  }

  /* ========================================================================
     BAŞLATMA
     ======================================================================== */
  function init() {
    initHeader();
    initActiveNavLink();
    initMobileNav();
    initReveal();
    initContactForm();
    initFooterYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
