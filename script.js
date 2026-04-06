/* ===================================================
   ForestWalker Portfolio – script.js (redesign)
   =================================================== */

// ── Cursor ─────────────────────────────────────────
// Использует transform вместо left/top → GPU compositing, нет layout thrashing
const cursor      = document.getElementById('cursor');
const cursorGlow  = document.getElementById('cursor-glow');

let mx = window.innerWidth / 2;
let my = window.innerHeight / 2;
let gx = mx, gy = my;
let cursorScale = 1;

document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cursor.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%)) scale(${cursorScale})`;
});

(function animateGlow() {
    gx += (mx - gx) * 0.14;
    gy += (my - gy) * 0.14;
    cursorGlow.style.transform = `translate(calc(${gx}px - 50%), calc(${gy}px - 50%))`;
    requestAnimationFrame(animateGlow);
})();

document.addEventListener('mousedown', () => {
    cursorScale = 0.7;
    cursor.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%)) scale(0.7)`;
});
document.addEventListener('mouseup', () => {
    cursorScale = 1;
    cursor.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%)) scale(1)`;
});

// ── Nav scroll & Mobile Menu ───────────────────────
const nav = document.getElementById('site-nav');
const hamburger = document.getElementById('hamburger-menu');
const navLinks = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

if (hamburger) {
    hamburger.addEventListener('click', () => {
        document.body.classList.toggle('menu-open');
    });
}

// Close menu when clicking a link
if (navLinks) {
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            document.body.classList.remove('menu-open');
        });
    });
}

// ── Hero parallax (rAF throttled) ──────────────────
// Без throttle: мог запускаться 100+ раз/сек при быстром скролле
const heroBgImg = document.getElementById('hero-bg-img');
let parallaxTicking = false;

window.addEventListener('scroll', () => {
    if (window.innerWidth < 600) return; // Disable on small screens for performance
    
    if (!parallaxTicking) {
        parallaxTicking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            if (heroBgImg && y < window.innerHeight) {
                heroBgImg.style.transform = `scale(1.04) translateY(${y * 0.25}px)`;
            }
            parallaxTicking = false;
        });
    }
}, { passive: true });

// ── Reveal on scroll ───────────────────────────────
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObserver.unobserve(e.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

// ── Fireflies (Canvas API) ─────────────────────────
// Вместо 40 DOM-нод — один <canvas>. 40 compositor layers → 1 layer.
// Логика анимации идентична, визуал не меняется.
const ffCanvas = document.getElementById('firefly-canvas');
const ffCtx    = ffCanvas.getContext('2d');

function resizeFireflyCanvas() {
    ffCanvas.width  = window.innerWidth;
    ffCanvas.height = window.innerHeight;
}
resizeFireflyCanvas();
window.addEventListener('resize', resizeFireflyCanvas, { passive: true });

const FF_COUNT  = 40;
const fireflies = [];

for (let i = 0; i < FF_COUNT; i++) {
    fireflies.push({
        x:           Math.random() * window.innerWidth,
        y:           Math.random() * window.innerHeight,
        targetX:     Math.random() * window.innerWidth,
        targetY:     Math.random() * window.innerHeight,
        speed:       Math.random() * 0.004 + 0.001,
        sinOffX:     Math.random() * Math.PI * 2,
        sinOffY:     Math.random() * Math.PI * 2,
        baseOpacity: Math.random() * 0.4 + 0.1,
        phase:       Math.random() * Math.PI * 2,
        size:        Math.random() * 4 + 3,
    });
}

let scrollRatio = 0;
window.addEventListener('scroll', () => {
    scrollRatio = Math.min(window.scrollY / (document.body.scrollHeight - window.innerHeight), 1);
}, { passive: true });

let ffTick = 0;
function animateFireflies() {
    ffTick += 0.012;
    const scrollBoost = 0.5 + scrollRatio * 1.8;

    ffCtx.clearRect(0, 0, ffCanvas.width, ffCanvas.height);

    fireflies.forEach(f => {
        // Движение к цели
        f.x += (f.targetX - f.x) * f.speed;
        f.y += (f.targetY - f.y) * f.speed;

        // Хаотичное синусоидальное дрейфование
        f.x += Math.sin(ffTick + f.sinOffX) * 0.55;
        f.y += Math.cos(ffTick * 0.7 + f.sinOffY) * 0.4;

        // Выбрать новую цель когда рядом
        if (Math.abs(f.targetX - f.x) < 60 && Math.abs(f.targetY - f.y) < 60) {
            f.targetX = f.x + (Math.random() - 0.5) * 1100;
            f.targetY = f.y + (Math.random() - 0.5) * 900;
            f.targetX = Math.max(-50, Math.min(ffCanvas.width  + 50, f.targetX));
            f.targetY = Math.max(-50, Math.min(ffCanvas.height + 50, f.targetY));
        }

        // Bloom-эффект привязан к скроллу (как раньше)
        const bloom          = scrollBoost * (0.7 + 0.4 * Math.sin(ffTick * 1.3 + f.phase));
        const glow           = 6 + bloom * 8;
        const opacity        = (f.baseOpacity + scrollRatio * 0.45) * (0.6 + 0.4 * Math.sin(ffTick + f.phase));
        const clampedOpacity = Math.min(opacity, 1);
        const shadowAlpha    = (0.6 + scrollRatio * 0.3).toFixed(2);

        // Рендер через Canvas2D (shadowBlur = эквивалент box-shadow)
        ffCtx.save();
        ffCtx.shadowBlur  = glow;
        ffCtx.shadowColor = `rgba(209,247,188,${shadowAlpha})`;
        ffCtx.globalAlpha = clampedOpacity;
        ffCtx.fillStyle   = '#e6faef';
        ffCtx.beginPath();
        ffCtx.arc(f.x, f.y, f.size / 2, 0, Math.PI * 2);
        ffCtx.fill();
        ffCtx.restore();
    });

    requestAnimationFrame(animateFireflies);
}
animateFireflies();

// ── Portfolio Logic (Dynamic) ──────────────────────
let portfolioItemEls = [];
let currentVisibleItems = [];
let activeFilter = 'all';
let activeSubFilter = 'all';
const ITEMS_PER_PAGE = 8;
let itemsShown = ITEMS_PER_PAGE;

function initPortfolio() {
    console.log('Initializing portfolio...');
    const portfolioGrid   = document.getElementById('portfolio-grid');
    const filtersContainer = document.getElementById('portfolio-filters');
    const showMoreBtn      = document.getElementById('show-more');

    if (!window.portfolioData || !window.portfolioCategories) {
        console.error('Portfolio data or categories not found on window object');
        return;
    }
    if (!portfolioGrid || !filtersContainer) {
        console.error('Portfolio grid or filters container not found in DOM');
        return;
    }

    // 1. Render Main Filters
    filtersContainer.innerHTML = '';
    window.portfolioCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `portfolio-filter`;
        btn.dataset.filter = cat.id;
        btn.textContent = cat.label;
        btn.addEventListener('click', () => setFilter(cat.id));
        filtersContainer.appendChild(btn);
    });

    // 2. Render Items (Initially hidden)
    portfolioGrid.innerHTML = '';
    window.portfolioData.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = `portfolio-item ${item.wide ? 'portfolio-item--wide' : ''}`;
        itemEl.dataset.category = item.category;
        itemEl.dataset.subcategory = item.subcategory || 'all';
        itemEl.dataset.src = item.src;
        itemEl.dataset.index = index;

        let thumbSrc = item.src;
        if (thumbSrc.includes('cloudinary.com/')) {
            thumbSrc = thumbSrc.replace('/upload/', '/upload/w_600,c_limit/');
        }

        itemEl.innerHTML = `
            <div class="portfolio-img-wrap">
                <img src="${thumbSrc}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/800x600/0c2020/7ab8b8?text=Image+Not+Found'" loading="lazy" decoding="async">
            </div>
            <div class="portfolio-overlay"><span>${item.title}</span></div>
        `;

        itemEl.addEventListener('click', () => openLightbox(itemEl));
        portfolioGrid.appendChild(itemEl);
    });

    portfolioItemEls = Array.from(portfolioGrid.querySelectorAll('.portfolio-item'));
    
    // 3. Show More listener
    if (showMoreBtn) {
        showMoreBtn.onclick = () => {
            itemsShown += ITEMS_PER_PAGE;
            updatePagination();
        };
    }

    // 4. Initial filter
    setFilter('all');
    console.log(`Portfolio initialized with ${portfolioItemEls.length} items.`);
}

function setFilter(filterId) {
    activeFilter = filterId;
    activeSubFilter = 'all';
    itemsShown = ITEMS_PER_PAGE;
    
    // Update main buttons
    const btns = document.querySelectorAll('#portfolio-filters .portfolio-filter');
    btns.forEach(b => b.classList.toggle('active', b.dataset.filter === filterId));
    
    // Handle Sub-filters
    renderSubFilters(filterId);
    
    applyFilters();
}

function renderSubFilters(catId) {
    const subContainer = document.getElementById('portfolio-subfilters');
    if (!subContainer) return;

    const category = window.portfolioCategories.find(c => c.id === catId);
    
    if (category && category.subcategories && category.subcategories.length > 0) {
        subContainer.innerHTML = '';
        subContainer.style.display = 'flex';
        
        category.subcategories.forEach(sub => {
            const btn = document.createElement('button');
            btn.className = `portfolio-subfilter ${sub.id === 'all' ? 'active' : ''}`;
            btn.dataset.sub = sub.id;
            btn.textContent = sub.label;
            btn.addEventListener('click', () => setSubFilter(sub.id, btn));
            subContainer.appendChild(btn);
        });
    } else {
        subContainer.innerHTML = '';
        subContainer.style.display = 'none';
    }
}

function setSubFilter(subId, clickedBtn) {
    activeSubFilter = subId;
    itemsShown = ITEMS_PER_PAGE;
    
    // Update sub buttons
    const btns = document.querySelectorAll('#portfolio-subfilters .portfolio-subfilter');
    btns.forEach(b => b.classList.remove('active'));
    if (clickedBtn) clickedBtn.classList.add('active');
    
    applyFilters();
}

function applyFilters() {
    currentVisibleItems = [];
    portfolioItemEls.forEach(item => {
        const category = item.dataset.category;
        const subcategory = item.dataset.subcategory;
        
        const matchesCat = (activeFilter === 'all' || activeFilter === category);
        const matchesSub = (activeSubFilter === 'all' || activeSubFilter === subcategory);
        
        if (matchesCat && matchesSub) {
            currentVisibleItems.push(item);
        } else {
            item.style.display = 'none';
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
        }
    });

    updatePagination();
}

function updatePagination() {
    const showMoreBtn = document.getElementById('show-more');
    
    currentVisibleItems.forEach((item, index) => {
        if (index < itemsShown) {
            item.style.display = '';
            // Delay for simple reveal effect
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            }, 50);
        } else {
            item.style.display = 'none';
        }
    });

    if (showMoreBtn) {
        showMoreBtn.style.display = (itemsShown >= currentVisibleItems.length) ? 'none' : 'inline-block';
    }
}




// ── Portfolio Lightbox ─────────────────────────────
const lightbox        = document.getElementById('lightbox');
const lightboxImg     = document.getElementById('lightbox-img');
const lightboxWrap    = document.getElementById('lightbox-img-wrap');
const lightboxClose   = document.getElementById('lightbox-close');
const lightboxPrev    = document.getElementById('lightbox-prev');
const lightboxNext    = document.getElementById('lightbox-next');
const lightboxCloseBg = document.getElementById('lightbox-close-bg');
const thumbnailsCon   = document.getElementById('lightbox-thumbnails');

let currentLightboxIndex = 0;

function populateThumbnails() {
    thumbnailsCon.innerHTML = '';
    currentVisibleItems.forEach((item, index) => {
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'lightbox-thumb';
        thumbDiv.dataset.index = index;
        
        const imgEl = document.createElement('img');
        let thumbSrc = item.dataset.src;
        if (thumbSrc.includes('cloudinary.com/')) {
            thumbSrc = thumbSrc.replace('/upload/', '/upload/w_300,c_limit/');
        }
        imgEl.src = thumbSrc;
        
        thumbDiv.appendChild(imgEl);
        
        thumbDiv.addEventListener('click', () => showImage(index));
        thumbnailsCon.appendChild(thumbDiv);
    });
}

function updateActiveThumbnail() {
    const thumbs = thumbnailsCon.querySelectorAll('.lightbox-thumb');
    thumbs.forEach(t => t.classList.remove('active'));
    
    if (thumbs[currentLightboxIndex]) {
        const activeThumb = thumbs[currentLightboxIndex];
        activeThumb.classList.add('active');
        activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function showImage(index) {
    if (currentVisibleItems.length === 0) return;
    if (index < 0) index = currentVisibleItems.length - 1;
    if (index >= currentVisibleItems.length) index = 0;
    currentLightboxIndex = index;
    
    const item = currentVisibleItems[currentLightboxIndex];
    const src = item.dataset.src;
    
    if (src) {
        lightboxImg.style.opacity = '0';
        lightboxWrap.classList.remove('loaded');
        
        setTimeout(() => {
            lightboxImg.src = src;
            lightboxImg.onload = () => {
                lightboxImg.style.opacity = '1';
                setTimeout(() => lightboxWrap.classList.add('loaded'), 50);
            };
            updateActiveThumbnail();
        }, 200);
    }
}

function openLightbox(item) {
    populateThumbnails();
    currentLightboxIndex = currentVisibleItems.indexOf(item);
    showImage(currentLightboxIndex);
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
    setTimeout(() => { 
        lightboxImg.src = ''; 
        lightboxWrap.classList.remove('loaded');
        thumbnailsCon.innerHTML = '';
    }, 400);
}

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxCloseBg) lightboxCloseBg.addEventListener('click', closeLightbox);
if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentLightboxIndex - 1); });
if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentLightboxIndex + 1); });

// Touch Swiping for Lightbox
let touchStartX = 0;
let touchEndX = 0;

lightbox.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

lightbox.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        // Swipe Left -> Next Image
        showImage(currentLightboxIndex + 1);
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        // Swipe Right -> Prev Image
        showImage(currentLightboxIndex - 1);
    }
}

document.addEventListener('keydown', e => {
    if (lightbox && !lightbox.classList.contains('hidden')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft')  showImage(currentLightboxIndex - 1);
        if (e.key === 'ArrowRight') showImage(currentLightboxIndex + 1);
    }
});

// ===== TELEGRAM CONTACT FORM =====
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('form-name').value;
        const email = document.getElementById('form-email').value;
        const contactMethod = document.getElementById('form-contact-method').value;
        const type = document.getElementById('form-type').value;
        const btn = contactForm.querySelector('button[type="submit"]');

        const botToken = '8706623916:AAGo4r6G6L6FRWfVFSijZ_CR-trqHrL34rg';
        // ВАЖНО: Это должен быть ВАШ личный Chat ID, а не ID бота.
        const chatId = '387894387'; 
        
        const text = `🌟 <b>Новая заявка с портфолио!</b>\n\n👤 <b>Имя:</b> ${name}\n✉️ <b>Email:</b> ${email}\n📱 <b>Связь:</b> ${contactMethod}\n🎨 <b>Проект:</b> ${type}`;
        
        try {
            btn.textContent = 'Отправка...';
            btn.style.opacity = '0.7';
            
            const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    parse_mode: 'HTML'
                })
            });
            
            if (response.ok) {
                btn.textContent = 'Отправлено!';
                btn.style.background = '#28a745';
                btn.style.borderColor = '#28a745';
                btn.style.color = '#fff';
                contactForm.reset();
            } else {
                throw new Error('Telegram API responded with an error');
            }
        } catch (error) {
            btn.textContent = 'Ошибка (Сверьте Chat ID)';
            btn.style.background = '#dc3545';
            btn.style.borderColor = '#dc3545';
            btn.style.color = '#fff';
            console.error('Telegram bot error:', error);
        }
        
        // Return button to normal after 4 seconds
        setTimeout(() => {
            btn.textContent = 'Отправить';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
            btn.style.opacity = '1';
        }, 4000);
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initPortfolio);
