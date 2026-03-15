// =========================================
//   PROTONYX — APP.JS
//   FDM 3D Print Store · Static JSON · GitHub Images
// =========================================

// ─────────────────────────────────────────
//  GITHUB REPO BASE URL
//  Set this once so you can use short paths like '/images/photo.jpg' everywhere.
//  Full URLs (starting with http/https) are always used as-is.
//  Example: 'https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main'
// ─────────────────────────────────────────
const GITHUB_REPO_BASE = ''; // e.g. 'https://raw.githubusercontent.com/user/repo/main'

// Resolve any image path to a usable URL.
// Full URLs pass through unchanged; relative paths are prefixed with the repo base.
function resolveImageUrl(path) {
  if (!path || typeof path !== 'string') return path;
  path = path.trim();
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;          // already a full URL
  if (path.startsWith('data:'))   return path;           // base64 data URL
  const base = (localStorage.getItem('protonyx_repo_base') || GITHUB_REPO_BASE).replace(/\/$/, '');
  if (!base) return path;
  return base + (path.startsWith('/') ? path : '/' + path);
}

// ─────────────────────────────────────────
//  HERO CARDS CONFIG
//  imageUrl: repo-relative path e.g. '/images/figurine.jpg'  OR  full URL
// ─────────────────────────────────────────
const HERO_CARDS_DEFAULT = [
  {
    id:       'heroCard1',
    label:    'FEATURED PRINT',
    name:     'Custom Figurine',
    meta:     'PLA · 0.2mm · 48hr',
    price:    '৳850',
    imageUrl: '', // e.g. '/images/figurine.jpg'
  },
  {
    id:       'heroCard2',
    label:    'TOP SELLER',
    name:     'Desk Organizer',
    meta:     'PETG · 0.15mm · 48hr',
    price:    '৳420',
    imageUrl: '', // e.g. '/images/organizer.jpg'
  },
];

// ─────────────────────────────────────────
//  LOGO CONFIG
//  Repo-relative path or full URL. Saved globally in localStorage like product images.
// ─────────────────────────────────────────
const LOGO_URL_DEFAULT = ''; // e.g. '/logo.png'

// ─────────────────────────────────────────
//  PRODUCTS TEMPLATE
//  Use repo-relative paths like '/images/dragon.jpg' or full URLs.
// ─────────────────────────────────────────
const PRODUCTS_TEMPLATE = [
   {
    id: 'laptop_stand1',
    name: 'Modular Desk Organizer',
    desc: 'Stackable desk organizer printed in durable PETG. Fits standard pens, rulers, and accessories.',
    price: 420,
    category: 'functional',
    emoji: '⚙️',
    images: ['/image/laptopstand1a.jpg', '/image/laptopstand1b.jpg']
  },
  {
    id: 'prod_figurines_dragon',
    name: 'Dragon Figurine',
    desc: 'Highly detailed FDM dragon sculpture with fine surface finish. Perfect for collectors, desk display, or gifting.',
    price: 850,
    category: 'figurines',
    emoji: '🐉',
    images: [
         // '/image/laptopstand1b.jpg',
      // '/images/dragon-2.jpg',
    ]
  },
  {
    id: 'prod_functional_organizer',
    name: 'Modular Desk Organizer',
    desc: 'Stackable desk organizer printed in durable PETG. Fits standard pens, rulers, and accessories.',
    price: 420,
    category: 'functional',
    emoji: '⚙️',
    images: []
  },
  {
    id: 'prod_jewelry_geo_pendant',
    name: 'Geometric Pendant',
    desc: 'Modern geometric jewelry pendant, lightweight and stylish. Available in multiple vibrant color options.',
    price: 380,
    category: 'jewelry',
    emoji: '💍',
    images: []
  },
  {
    id: 'prod_architectural_miniature',
    name: 'Architectural Scale Model',
    desc: 'Precision-printed architectural scale model. Ideal for presentations, portfolios, or interior decor.',
    price: 1200,
    category: 'architectural',
    emoji: '🏛️',
    images: []
  },
  {
    id: 'prod_custom_keycaps',
    name: 'Custom Keycap Set',
    desc: 'Fully custom mechanical keyboard keycaps. Choose your legends, layout, and colorway — printed to order.',
    price: 650,
    category: 'custom',
    emoji: '✨',
    images: []
  }
];

// ── STATE ──
let products            = [];
let cart                = JSON.parse(localStorage.getItem('forge3d_cart')     || '[]');
let config              = JSON.parse(localStorage.getItem('forge3d_config')   || '{}');
let wishlist            = JSON.parse(localStorage.getItem('forge3d_wishlist') || '[]');
let currentOrderProduct = null;
let currentFilter       = 'all';
let searchQuery         = '';
let devAuthenticated    = false;
let pgCurrentQty        = 1;
let pgImages            = [];
let pgImgIdx            = 0;

function getDevCredentials() {
  const s = localStorage.getItem('forge3d_dev_creds');
  return s ? JSON.parse(s) : { username: 'admin', password: 'forge3d' };
}

// =========================================
//   INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  updateWishlistCount();
  loadConfigUI();
  initCanvas();
  initGeoShape();
  initFilterBtns();
  initNavScroll();
  animateOnScroll();
  loadProducts();
  initRouter();
  loadLogo();
  initHeroCards();
});

// =========================================
//   ROUTER
// =========================================
function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
function handleRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/product/')) {
    const id = decodeURIComponent(hash.slice('#/product/'.length));
    const p  = products.find(x => x.id === id);
    if (p) { renderProductPage(p); return; }
    const wait = setInterval(() => {
      const pp = products.find(x => x.id === id);
      if (pp) { clearInterval(wait); renderProductPage(pp); }
    }, 200);
    setTimeout(() => clearInterval(wait), 6000);
  } else {
    showMainView();
  }
}
function navigateToProduct(id) { window.location.hash = '/product/' + encodeURIComponent(id); }
function showMainView() {
  document.getElementById('mainView').classList.remove('hidden');
  document.getElementById('productPageView').classList.add('hidden');
  document.getElementById('productPageView').innerHTML = '';
  if (window.location.hash.startsWith('#/product/')) history.replaceState(null, '', window.location.pathname);
}

// =========================================
//   PRODUCTS — STATIC JSON
// =========================================
function loadProducts() {
  const loadingEl = document.getElementById('productsLoading');
  if (loadingEl) loadingEl.style.display = 'flex';
  const saved = localStorage.getItem('protonyx_products');
  products = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(PRODUCTS_TEMPLATE));
  if (!saved) localStorage.setItem('protonyx_products', JSON.stringify(products));
  if (loadingEl) loadingEl.style.display = 'none';
  renderProducts();
  if (devAuthenticated) renderDevProductList();
}
function saveProductsToStorage() { localStorage.setItem('protonyx_products', JSON.stringify(products)); }

// =========================================
//   LOGO
// =========================================
function loadLogo() {
  const url = localStorage.getItem('protonyx_logo_url') || LOGO_URL_DEFAULT;
  if (url) applyLogo(url);
}
function applyLogo(url) {
  const img = document.getElementById('navLogoImg');
  if (img) { img.src = url; img.classList.remove('hidden'); }
  const input = document.getElementById('configLogoUrl');
  if (input) input.value = url;
}
function saveLogoUrl() {
  const url = document.getElementById('configLogoUrl')?.value.trim();
  if (!url) { showToast('Paste a GitHub raw URL first', 'error'); return; }
  localStorage.setItem('protonyx_logo_url', url);
  applyLogo(url);
  showToast('Logo applied!', 'success');
}
function removeLogo() {
  localStorage.removeItem('protonyx_logo_url');
  const img = document.getElementById('navLogoImg');
  if (img) { img.src = ''; img.classList.add('hidden'); }
  const input = document.getElementById('configLogoUrl');
  if (input) input.value = '';
  showToast('Logo removed', 'info');
}

// =========================================
//   HERO CARDS
// =========================================
function initHeroCards() {
  const saved = JSON.parse(localStorage.getItem('protonyx_hero_cards') || 'null');
  const cards = saved || HERO_CARDS_DEFAULT;
  cards.forEach(card => _applyHeroCard(card));
}

function _applyHeroCard(card) {
  const setTxt = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  const sfx = card.id === 'heroCard1' ? '1' : '2';
  setTxt(`hc${sfx}-label`, card.label);
  setTxt(`hc${sfx}-name`,  card.name);
  setTxt(`hc${sfx}-meta`,  card.meta);
  setTxt(`hc${sfx}-price`, card.price ? (card.price.includes('৳') ? card.price : `৳${card.price}`) : '');

  if (card.imageUrl) {
    const resolved = resolveImageUrl(card.imageUrl);
    const wrap = document.getElementById(`hc${sfx}-img`);
    if (wrap && resolved) wrap.innerHTML = `<img src="${resolved}" alt="${card.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
  }
}

function saveHeroCards() {
  const cards = [
    {
      id:       'heroCard1',
      label:    document.getElementById('heroCard1Label')?.value.trim() || 'FEATURED PRINT',
      name:     document.getElementById('heroCard1Name')?.value.trim()  || 'Custom Figurine',
      meta:     document.getElementById('heroCard1Meta')?.value.trim()  || 'PLA · 0.2mm · 48hr',
      price:    document.getElementById('heroCard1Price')?.value.trim() || '850',
      imageUrl: document.getElementById('heroCard1Img')?.value.trim()  || '',
    },
    {
      id:       'heroCard2',
      label:    document.getElementById('heroCard2Label')?.value.trim() || 'TOP SELLER',
      name:     document.getElementById('heroCard2Name')?.value.trim()  || 'Desk Organizer',
      meta:     document.getElementById('heroCard2Meta')?.value.trim()  || 'PETG · 0.15mm · 48hr',
      price:    document.getElementById('heroCard2Price')?.value.trim() || '420',
      imageUrl: document.getElementById('heroCard2Img')?.value.trim()  || '',
    },
  ];
  localStorage.setItem('protonyx_hero_cards', JSON.stringify(cards));
  cards.forEach(card => _applyHeroCard(card));
  showToast('Hero cards updated!', 'success');
}

function saveRepoBase() {
  const base = document.getElementById('configRepoBase')?.value.trim().replace(/\/$/, '') || '';
  localStorage.setItem('protonyx_repo_base', base);
  showToast('Repo base saved — reload to refresh all images', 'success');
}

function _populateHeroCardInputs() {
  const saved = JSON.parse(localStorage.getItem('protonyx_hero_cards') || 'null');
  const cards = saved || HERO_CARDS_DEFAULT;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  const c1 = cards[0], c2 = cards[1];
  set('heroCard1Label', c1.label); set('heroCard1Name', c1.name);
  set('heroCard1Meta',  c1.meta);  set('heroCard1Price', c1.price);
  set('heroCard1Img',   c1.imageUrl);
  set('heroCard2Label', c2.label); set('heroCard2Name', c2.name);
  set('heroCard2Meta',  c2.meta);  set('heroCard2Price', c2.price);
  set('heroCard2Img',   c2.imageUrl);
  // also populate repo base & logo
  const repoBase = localStorage.getItem('protonyx_repo_base') || GITHUB_REPO_BASE;
  set('configRepoBase', repoBase);
  const logoRaw = localStorage.getItem('protonyx_logo_url') || LOGO_URL_DEFAULT;
  set('configLogoUrl', logoRaw);
}

// =========================================
//   PARTICLE CANVAS (background)
// =========================================
function initCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * canvas.width, y: Math.random() * canvas.height,
    r: Math.random() * 2 + 0.5,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    opacity: Math.random() * 0.6 + 0.2
  }));
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;  if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,0,30,${p.opacity})`; ctx.fill();
    });
    particles.forEach((p1, i) => particles.slice(i + 1).forEach(p2 => {
      const dx = p1.x - p2.x, dy = p1.y - p2.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 120) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(232,0,30,${0.15 * (1 - d / 120)})`;
        ctx.lineWidth = 0.5;
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      }
    }));
    requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
}

// =========================================
//   3D CRYSTAL GEM (hero right panel)
// =========================================
function initGeoShape() {
  const canvas = document.getElementById('geoCanvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  function resize() {
    const wrap = canvas.parentElement;
    const s = Math.min(wrap.offsetWidth, wrap.offsetHeight);
    canvas.width  = s * dpr;
    canvas.height = s * dpr;
    canvas.style.width  = s + 'px';
    canvas.style.height = s + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  const ctx = canvas.getContext('2d');

  // ── Build a brilliant-cut gem / crystal shape ──
  // Structure: top apex → top crown ring → girdle ring → pavilion ring → culet apex
  const N = 8; // facet count per ring

  function ringVerts(y, r, offset = 0) {
    return Array.from({ length: N }, (_, i) => {
      const a = (i / N) * Math.PI * 2 + offset;
      return [r * Math.cos(a), y, r * Math.sin(a)];
    });
  }

  const apex    = [[0, -1.05, 0]];
  const crown   = ringVerts(-0.5,  0.55, 0);
  const girdle  = ringVerts( 0.0,  1.0,  Math.PI / N);
  const pavil   = ringVerts( 0.55, 0.55, 0);
  const culet   = [[0, 1.05, 0]];

  const verts = [...apex, ...crown, ...girdle, ...pavil, ...culet];
  // Index helpers
  const iA = 0;
  const iCrown  = i => 1 + i;
  const iGird   = i => 1 + N + i;
  const iPav    = i => 1 + 2 * N + i;
  const iCulet  = 1 + 3 * N;

  const edges = [];
  const addEdge = (a, b) => edges.push([a, b]);

  // Apex → crown
  for (let i = 0; i < N; i++) addEdge(iA, iCrown(i));
  // Crown ring
  for (let i = 0; i < N; i++) addEdge(iCrown(i), iCrown((i + 1) % N));
  // Crown → girdle (each crown point connects to two girdle points)
  for (let i = 0; i < N; i++) {
    addEdge(iCrown(i), iGird(i));
    addEdge(iCrown(i), iGird((i + 1) % N));
  }
  // Girdle ring
  for (let i = 0; i < N; i++) addEdge(iGird(i), iGird((i + 1) % N));
  // Girdle → pavilion
  for (let i = 0; i < N; i++) {
    addEdge(iGird(i), iPav(i));
    addEdge(iGird(i), iPav((i - 1 + N) % N));
  }
  // Pavilion ring
  for (let i = 0; i < N; i++) addEdge(iPav(i), iPav((i + 1) % N));
  // Pavilion → culet
  for (let i = 0; i < N; i++) addEdge(iPav(i), iCulet);

  let rotX = 0, rotY = 0, mx = 0, my = 0;

  document.getElementById('heroGeo')?.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mx = (e.clientX - r.left - r.width  / 2) / r.width;
    my = (e.clientY - r.top  - r.height / 2) / r.height;
  });

  function rotate(v, rx, ry) {
    let [x, y, z] = v;
    // Y-axis rotation
    const x1 = x * Math.cos(ry) + z * Math.sin(ry);
    const z1 = -x * Math.sin(ry) + z * Math.cos(ry);
    // X-axis rotation
    const y2 = y * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
    return [x1, y2, z2];
  }

  function project(v, size) {
    const fov = 3.2;
    const z   = v[2] + fov;
    const sc  = (size / 2) * 0.62 * (fov / z);
    return [size / 2 + v[0] * sc, size / 2 + v[1] * sc, v[2]];
  }

  let frame = 0;

  function draw() {
    frame++;
    const size = canvas.width / dpr;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    rotX += (my * 0.45 - rotX * 0.01) * 0.016;
    rotY += (mx * 0.45 - rotY * 0.01) * 0.016;

    const t  = frame * 0.005;
    const rx = rotX + t * 0.28;
    const ry = rotY + t * 0.42;

    const proj = verts.map(v => project(rotate(v, rx, ry), size));

    const cx = canvas.width / 2, cy = canvas.height / 2;

    // ── Orbital rings ──
    for (let ri = 0; ri < 3; ri++) {
      const baseR   = (size * (0.46 + ri * 0.07)) * dpr;
      const tiltAng = [0.35, -0.28, 0.18][ri] + rx * 0.25;
      const spinDir = ri % 2 === 0 ? 1 : -1;
      const spinSpd = [0.22, 0.18, 0.14][ri];
      const alpha   = [0.10, 0.07, 0.05][ri] + 0.03 * Math.sin(t * 1.8 + ri);
      const segs    = 72;

      ctx.beginPath();
      for (let si = 0; si <= segs; si++) {
        const a  = (si / segs) * Math.PI * 2 + t * spinSpd * spinDir;
        const ex = Math.cos(a) * baseR;
        const ey = Math.sin(a) * baseR * Math.cos(tiltAng + ry * 0.15);
        const px = cx + ex;
        const py = cy + ey;
        si === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = `rgba(232,0,30,${alpha})`;
      ctx.lineWidth   = 1.2 * dpr;
      ctx.setLineDash([5 * dpr, 10 * dpr]);
      ctx.lineDashOffset = -t * 28 * spinDir;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Core glow ──
    const gR = size * 0.28 * dpr;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, gR);
    glow.addColorStop(0, `rgba(232,0,30,${0.06 + 0.025 * Math.sin(t * 2.2)})`);
    glow.addColorStop(1, 'rgba(232,0,30,0)');
    ctx.beginPath(); ctx.arc(cx, cy, gR, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();

    // ── Sort edges by depth ──
    const sortedEdges = edges
      .map(([a, b]) => ({ a, b, z: (proj[a][2] + proj[b][2]) / 2 }))
      .sort((e1, e2) => e1.z - e2.z);

    // ── Draw edges ──
    sortedEdges.forEach(({ a, b, z }) => {
      const pa    = proj[a], pb = proj[b];
      const depth = Math.max(0.08, Math.min(1.0, (z + 1.6) / 3.2));
      const alpha = depth * 0.9;
      const lw    = Math.max(0.5, 1.8 * depth) * dpr;

      const grd = ctx.createLinearGradient(pa[0] * dpr, pa[1] * dpr, pb[0] * dpr, pb[1] * dpr);
      grd.addColorStop(0,   `rgba(255,50,70,${alpha * 0.85})`);
      grd.addColorStop(0.5, `rgba(255,90,90,${alpha})`);
      grd.addColorStop(1,   `rgba(210,0,30,${alpha * 0.75})`);

      ctx.beginPath();
      ctx.moveTo(pa[0] * dpr, pa[1] * dpr);
      ctx.lineTo(pb[0] * dpr, pb[1] * dpr);
      ctx.strokeStyle = grd;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      ctx.stroke();
    });

    // ── Vertices as glowing nodes ──
    proj.forEach(([px, py, pz]) => {
      const depth = Math.max(0.08, Math.min(1.0, (pz + 1.6) / 3.2));
      const r     = Math.max(1.5, 3.8 * depth) * dpr;

      // outer glow halo
      const halo = ctx.createRadialGradient(px * dpr, py * dpr, 0, px * dpr, py * dpr, r * 3.5);
      halo.addColorStop(0, `rgba(255,80,80,${depth * 0.28})`);
      halo.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.beginPath(); ctx.arc(px * dpr, py * dpr, r * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // solid core dot
      ctx.beginPath(); ctx.arc(px * dpr, py * dpr, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,80,80,${depth * 0.95})`; ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  draw();
}

// =========================================
//   NAV
// =========================================
function initNavScroll() {
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    nav.style.background = window.scrollY > 50 ? 'rgba(10,10,11,0.95)' : 'rgba(10,10,11,0.7)';
  });
}

// =========================================
//   SCROLL ANIMATIONS
// =========================================
function animateOnScroll() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity   = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.step-card, .spec-card, .product-card').forEach(el => {
    el.style.opacity   = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    obs.observe(el);
  });
}

// =========================================
//   FILTER & SEARCH
// =========================================
function initFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderProducts();
    });
  });
}
function filterProducts() {
  searchQuery = (document.getElementById('productSearch')?.value || '').toLowerCase().trim();
  renderProducts();
}

// =========================================
//   RENDER PRODUCTS GRID
// =========================================
function buildProductCard(p) {
  const img      = getProductImages(p)[0];
  const isWished = wishlist.includes(p.id);
  return `
    <div class="product-card" onclick="navigateToProduct('${p.id}')">
      ${img
        ? `<img class="product-img" src="${img}" alt="${p.name}" loading="lazy">`
        : `<div class="product-img-placeholder">${p.emoji || '🖨️'}</div>`
      }
      <button class="product-wish-btn ${isWished ? 'wishlisted' : ''}"
        onclick="event.stopPropagation();toggleWishlistItem('${p.id}', this)"
        title="${isWished ? 'Remove from wishlist' : 'Add to wishlist'}">
        ${isWished ? '♥' : '♡'}
      </button>
      <div class="product-body">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc || ''}</div>
        <div class="product-footer">
          <div class="product-price">৳${p.price.toLocaleString()}</div>
          <button class="product-order-btn" onclick="event.stopPropagation();openOrderModal('${p.id}')">ORDER</button>
        </div>
      </div>
    </div>`;
}

function renderProducts() {
  const grid  = document.getElementById('productsGrid');
  const empty = document.getElementById('emptyState');
  const load  = document.getElementById('productsLoading');
  if (!grid) return;
  if (load) load.style.display = 'none';
  let filtered = currentFilter === 'all' ? products : products.filter(p => p.category === currentFilter);
  if (searchQuery) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchQuery) ||
      (p.desc && p.desc.toLowerCase().includes(searchQuery)) ||
      p.category.toLowerCase().includes(searchQuery)
    );
  }
  if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(buildProductCard).join('');
  setTimeout(animateOnScroll, 50);
}

function getProductImages(p) {
  const raw = (p.images && p.images.length > 0) ? p.images : (p.imageData ? [p.imageData] : []);
  return raw.map(resolveImageUrl).filter(Boolean);
}

// =========================================
//   LOGO  — saved globally in localStorage like product images
// =========================================
function loadLogo() {
  const saved = localStorage.getItem('protonyx_logo_url') || LOGO_URL_DEFAULT;
  if (saved) applyLogo(saved);
}
function applyLogo(rawUrl) {
  const url = resolveImageUrl(rawUrl);
  const img   = document.getElementById('navLogoImg');
  if (img && url) { img.src = url; img.classList.remove('hidden'); }
  // keep input in sync if panel is open
  const input = document.getElementById('configLogoUrl');
  if (input) input.value = rawUrl || '';
}
function saveLogoUrl() {
  const raw = document.getElementById('configLogoUrl')?.value.trim();
  if (!raw) { showToast('Enter a path or URL first', 'error'); return; }
  localStorage.setItem('protonyx_logo_url', raw);   // save raw path, resolve on load
  applyLogo(raw);
  showToast('Logo saved!', 'success');
}
function removeLogo() {
  localStorage.removeItem('protonyx_logo_url');
  const img   = document.getElementById('navLogoImg');
  if (img) { img.src = ''; img.classList.add('hidden'); }
  const input = document.getElementById('configLogoUrl');
  if (input) input.value = '';
  showToast('Logo removed', 'info');
}
function renderProductPage(p) {
  const imgs     = getProductImages(p);
  const isWished = wishlist.includes(p.id);
  const related  = products.filter(x => x.id !== p.id && x.category === p.category).slice(0, 4);
  pgImages = imgs; pgImgIdx = 0; pgCurrentQty = 1;
  window._pgProductPrice = p.price; // for running total preview

  document.getElementById('mainView').classList.add('hidden');
  const pv = document.getElementById('productPageView');
  pv.classList.remove('hidden');

  pv.innerHTML = `
    <div class="pg-breadcrumb">
      <a href="#" onclick="event.preventDefault();showMainView()">HOME</a>
      <span class="sep">/</span>
      <a href="#" onclick="event.preventDefault();showMainView();setTimeout(()=>document.getElementById('products').scrollIntoView({behavior:'smooth'}),80)">PRODUCTS</a>
      <span class="sep">/</span>
      <span class="current">${p.name.toUpperCase()}</span>
    </div>
    <div class="pg-body">
      <div class="pg-gallery">
        <div class="pg-main-img-wrap" id="pgMainWrap">
          ${imgs.length > 0
            ? `<img id="pgMainImg" src="${imgs[0]}" alt="${p.name}">`
            : `<div class="pg-placeholder-big">${p.emoji || '🖨️'}</div>`}
          ${imgs.length > 1 ? `
            <button class="pg-nav-btn pg-prev" onclick="pgPrev()">&#8592;</button>
            <button class="pg-nav-btn pg-next" onclick="pgNext()">&#8594;</button>
            <div class="pg-counter" id="pgCounter">1 / ${imgs.length}</div>` : ''}
        </div>
        ${imgs.length > 1 ? `
          <div class="pg-thumbs" id="pgThumbs">
            ${imgs.map((img, i) => `
              <div class="pg-thumb ${i === 0 ? 'active' : ''}" onclick="pgSetImg(${i})">
                <img src="${img}" alt="View ${i+1}">
              </div>`).join('')}
          </div>` : ''}
      </div>
      <div class="pg-info">
        <div class="pg-category">${p.category.toUpperCase()}</div>
        <h1 class="pg-name">${p.name}</h1>
        <div class="pg-price">৳${p.price.toLocaleString()}</div>
        <div class="pg-stock"><span class="pg-stock-dot"></span> IN STOCK · FDM</div>
        <p class="pg-desc">${p.desc || 'High-quality FDM 3D printed product. Inspected before dispatch.'}</p>
        <div class="pg-divider"></div>
        <div class="pg-form-row">
          <label>FDM Material</label>
          <select id="pgMaterial" class="form-input">
            <option value="PLA">PLA (Standard)</option><option value="PETG">PETG (Durable)</option>
            <option value="ABS">ABS (Heat-resistant)</option><option value="TPU">TPU (Flexible)</option>
            <option value="ASA">ASA (UV-resistant)</option>
          </select>
        </div>
        <div class="pg-form-row"><label>Color Preference</label>
          <input type="text" id="pgColor" class="form-input" placeholder="e.g. Red, Black, White"></div>
        <div class="pg-form-row"><label>Quantity</label>
          <div class="pg-qty-row">
            <button onclick="pgQty(-1)">−</button>
            <span id="pgQtyDisplay">1</span>
            <button onclick="pgQty(1)">+</button>
          </div>
          <div class="pg-total-preview" id="pgTotalPreview">Price: <strong>৳${p.price.toLocaleString()}</strong></div>
        </div>
        <div class="pg-divider"></div>
        <div class="pg-cod-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          Cash on Delivery — Pay when you receive
        </div>
        <div class="pg-actions">
          <div class="pg-actions-row">
            <button class="btn-primary" style="flex:1;justify-content:center" onclick="pgOrderNow('${p.id}')">ORDER NOW</button>
            <button class="pg-wish-btn ${isWished ? 'wishlisted' : ''}" id="pgWishBtn" onclick="toggleWishlistItem('${p.id}', this, true)">${isWished ? '♥' : '♡'}</button>
          </div>
          <button class="btn-glass w-full" style="justify-content:center" onclick="addToCart('${p.id}')">ADD TO CART</button>
        </div>
        <button class="pg-share-btn" onclick="sharePgProduct('${p.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          SHARE PRODUCT
        </button>
      </div>
    </div>
    ${related.length > 0 ? `
      <div class="pg-related">
        <h2>RELATED PRODUCTS</h2>
        <div class="products-grid">${related.map(rp => buildProductCard(rp)).join('')}</div>
      </div>` : ''}
    <div class="pg-footer-wrap">
      <footer class="footer">
        <div class="footer-top">
          <div class="footer-logo">PROTO<span>NYX</span></div>
          <div class="footer-links">
            <a href="#" onclick="showMainView()">Home</a>
            <a href="#" onclick="showMainView();setTimeout(()=>document.getElementById('contact').scrollIntoView({behavior:'smooth'}),80)">Contact</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2025 Protonyx. All rights reserved.</span>
          <span>FDM · COD · Made with precision 🔴</span>
        </div>
      </footer>
    </div>`;

  window.scrollTo(0, 0);
  setTimeout(animateOnScroll, 50);
}

function pgQty(delta) {
  pgCurrentQty = Math.max(1, pgCurrentQty + delta);
  const el = document.getElementById('pgQtyDisplay');
  if (el) el.textContent = pgCurrentQty;
  // update running total preview
  const preview = document.getElementById('pgTotalPreview');
  if (preview && window._pgProductPrice) {
    const total = pgCurrentQty * window._pgProductPrice;
    preview.innerHTML = pgCurrentQty > 1
      ? `Total: <strong>৳${total.toLocaleString()}</strong> <small>(${pgCurrentQty} × ৳${window._pgProductPrice.toLocaleString()})</small>`
      : `Price: <strong>৳${total.toLocaleString()}</strong>`;
  }
}
function pgOrderNow(id) {
  const material = document.getElementById('pgMaterial')?.value || 'PLA';
  const color    = document.getElementById('pgColor')?.value    || '';
  openOrderModal(id);
  // openOrderModal resets qty to 1 and fires updateOrderPricePreview at t=20ms.
  // We override qty at t=40ms then immediately refresh the preview with the real quantity.
  setTimeout(() => {
    if (document.getElementById('orderMaterial')) document.getElementById('orderMaterial').value = material;
    if (document.getElementById('orderColor'))    document.getElementById('orderColor').value    = color;
    if (document.getElementById('orderQty'))      document.getElementById('orderQty').value      = pgCurrentQty;
    updateOrderPricePreview(); // re-run now that qty is correct
  }, 40);
}
function pgSetImg(idx) {
  pgImgIdx = idx;
  const img = document.getElementById('pgMainImg');
  if (img && pgImages[idx]) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = pgImages[idx]; img.style.opacity = '1'; }, 150);
  }
  const ctr = document.getElementById('pgCounter');
  if (ctr) ctr.textContent = `${idx + 1} / ${pgImages.length}`;
  document.querySelectorAll('.pg-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}
function pgPrev() { pgSetImg((pgImgIdx - 1 + pgImages.length) % pgImages.length); }
function pgNext() { pgSetImg((pgImgIdx + 1) % pgImages.length); }
function sharePgProduct(id) {
  const url = location.origin + location.pathname + '#/product/' + encodeURIComponent(id);
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => showToast('Link copied!', 'success'));
  else showToast(url, 'info');
}

// =========================================
//   WISHLIST
// =========================================
function toggleWishlistItem(id, btn, fromPage = false) {
  const idx = wishlist.indexOf(id);
  if (idx === -1) {
    wishlist.push(id);
    if (btn) { btn.innerHTML = '♥'; btn.classList.add('wishlisted'); }
    showToast('Added to wishlist ♥', 'success');
  } else {
    wishlist.splice(idx, 1);
    if (btn) { btn.innerHTML = '♡'; btn.classList.remove('wishlisted'); }
    showToast('Removed from wishlist', 'info');
  }
  localStorage.setItem('forge3d_wishlist', JSON.stringify(wishlist));
  updateWishlistCount();
  if (!fromPage) renderProducts();
}
function updateWishlistCount() {
  const el = document.getElementById('wishlistCount');
  if (el) el.textContent = wishlist.length;
}
function toggleWishlistSidebar() {
  const sb = document.getElementById('wishlistSidebar');
  const ov = document.getElementById('wishlistOverlay');
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open');
  ov.classList.toggle('hidden', isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
  if (!isOpen) renderWishlistSidebar();
}
function renderWishlistSidebar() {
  const el = document.getElementById('wishlistItems');
  const wp = products.filter(p => wishlist.includes(p.id));
  if (wp.length === 0) { el.innerHTML = '<div class="cart-empty">Your wishlist is empty.<br>Click ♡ on any product.</div>'; return; }
  el.innerHTML = wp.map(p => {
    const img = getProductImages(p)[0];
    return `<div class="cart-item">
      ${img ? `<img class="cart-item-img" src="${img}" alt="${p.name}">` : `<div class="cart-item-img" style="background:#1a0a0a;display:flex;align-items:center;justify-content:center;font-size:24px;">${p.emoji || '🖨️'}</div>`}
      <div class="cart-item-info"><h4>${p.name}</h4><div class="product-category">${p.category}</div><div class="cart-item-price">৳${p.price.toLocaleString()}</div></div>
      <button class="cart-item-remove" onclick="toggleWishlistItem('${p.id}');renderWishlistSidebar();">♥</button>
    </div>`;
  }).join('');
}

// =========================================
//   CART
// =========================================
function addToCart(productId) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  const ex = cart.find(x => x.id === productId);
  if (ex) ex.qty++; else cart.push({ ...p, qty: 1 });
  saveCart(); updateCartCount(); renderCartItems();
  showToast(`${p.name} added to cart`, 'success');
}
function removeFromCart(idx) { cart.splice(idx, 1); saveCart(); updateCartCount(); renderCartItems(); }
function saveCart() { localStorage.setItem('forge3d_cart', JSON.stringify(cart)); }
function updateCartCount() { document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0); }
function renderCartItems() {
  const el = document.getElementById('cartItems');
  if (!el) return;
  if (cart.length === 0) {
    el.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Browse products to add items.</div>';
    document.getElementById('cartTotal').textContent = '৳0';
    return;
  }
  el.innerHTML = cart.map((item, i) => {
    const img = getProductImages(item)[0];
    return `<div class="cart-item">
      ${img ? `<img class="cart-item-img" src="${img}" alt="${item.name}">` : `<div class="cart-item-img" style="background:#1a0a0a;display:flex;align-items:center;justify-content:center;font-size:28px;">${item.emoji||'🖨️'}</div>`}
      <div class="cart-item-info"><h4>${item.name}</h4><div class="product-category">${item.category}</div><div class="cart-item-price">৳${(item.price*item.qty).toLocaleString()} <small style="opacity:0.5">×${item.qty}</small></div></div>
      <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
    </div>`;
  }).join('');
  document.getElementById('cartTotal').textContent = `৳${cart.reduce((s,i)=>s+i.price*i.qty,0).toLocaleString()}`;
}
function toggleCart() {
  const sb = document.getElementById('cartSidebar');
  const ov = document.getElementById('cartOverlay');
  const isOpen = sb.classList.contains('open');
  sb.classList.toggle('open');
  ov.classList.toggle('hidden', isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
  if (!isOpen) renderCartItems();
}
function proceedToOrder() {
  if (cart.length === 0) { showToast('Your cart is empty', 'error'); return; }
  toggleCart(); openOrderModal(null);
}

// =========================================
//   ORDER MODAL
// =========================================
function openOrderModal(productId, isCustom = false) {
  currentOrderProduct = productId ? products.find(p => p.id === productId) : null;
  const label = document.getElementById('modalProductName');
  if (isCustom) label.textContent = '🛠 Custom Order — Upload your own design (STL / OBJ / 3MF)';
  else if (currentOrderProduct) label.textContent = `📦 ${currentOrderProduct.name} — ৳${currentOrderProduct.price.toLocaleString()} each`;
  else label.textContent = `🛒 Cart Order — ${cart.length} item(s)`;
  const s = document.getElementById('orderSummary');
  s.classList.remove('show');
  const btn = document.getElementById('submitOrderBtn');
  btn.textContent = 'SUBMIT ORDER'; btn.style.background = ''; btn.disabled = false;
  // reset qty to 1 and init price preview
  const qtyEl = document.getElementById('orderQty');
  if (qtyEl) qtyEl.value = 1;
  document.getElementById('orderModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(updateOrderPricePreview, 20); // after modal renders
}

function updateOrderPricePreview() {
  const preview = document.getElementById('orderPricePreview');
  if (!preview) return;

  const qty = parseInt(document.getElementById('orderQty')?.value) || 1;

  if (currentOrderProduct) {
    const unit  = currentOrderProduct.price;
    const total = unit * qty;
    const isMulti = qty > 1;
    preview.innerHTML = `
      <div class="opp-row">
        <span class="opp-label">Unit price</span>
        <span class="opp-unit">৳${unit.toLocaleString()}</span>
      </div>
      ${isMulti ? `
      <div class="opp-row">
        <span class="opp-label">Quantity</span>
        <span class="opp-unit">× ${qty}</span>
      </div>` : ''}
      <div class="opp-divider"></div>
      <div class="opp-row opp-total-row">
        <span class="opp-label">Total (COD)</span>
        <span class="opp-total">৳${total.toLocaleString()}</span>
      </div>`;
    preview.classList.remove('hidden');
  } else if (cart.length > 0) {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    preview.innerHTML = `
      ${cart.map(i => `<div class="opp-row"><span class="opp-label">${i.name} ×${i.qty}</span><span class="opp-unit">৳${(i.price*i.qty).toLocaleString()}</span></div>`).join('')}
      <div class="opp-divider"></div>
      <div class="opp-row opp-total-row"><span class="opp-label">Total (COD)</span><span class="opp-total">৳${total.toLocaleString()}</span></div>`;
    preview.classList.remove('hidden');
  } else {
    preview.classList.add('hidden');
  }
}
function closeOrderModal() {
  document.getElementById('orderModal').classList.add('hidden');
  document.body.style.overflow = '';
  currentOrderProduct = null;
}

// =========================================
//   SUBMIT ORDER
// =========================================
async function submitOrder() {
  const name    = document.getElementById('orderName').value.trim();
  const phone   = document.getElementById('orderPhone').value.trim();
  const email   = document.getElementById('orderEmail').value.trim();
  const address = document.getElementById('orderAddress').value.trim();
  const material= document.getElementById('orderMaterial').value;
  const color   = document.getElementById('orderColor').value.trim();
  const qty     = document.getElementById('orderQty').value;
  const notes   = document.getElementById('orderNotes').value.trim();
  if (!name || !phone || !address) { showToast('Please fill in Name, Phone & Address', 'error'); return; }

  const btn = document.getElementById('submitOrderBtn');
  btn.textContent = 'SENDING…'; btn.disabled = true;

  const productInfo = currentOrderProduct
    ? `${currentOrderProduct.name}`
    : cart.length > 0 ? cart.map(i => `${i.name} ×${i.qty}`).join(', ') : 'Custom Order';
  const unitPrice  = currentOrderProduct ? currentOrderProduct.price : 0;
  const totalPrice = currentOrderProduct
    ? unitPrice * parseInt(qty)
    : cart.reduce((s, i) => s + i.price * i.qty, 0);
  const priceDetail = currentOrderProduct
    ? (parseInt(qty) > 1 ? `৳${unitPrice.toLocaleString()} × ${qty} = ৳${totalPrice.toLocaleString()}` : `৳${totalPrice.toLocaleString()}`)
    : `৳${totalPrice.toLocaleString()}`;

  const orderData = {
    id: 'ORD-' + Date.now(),
    timestamp: new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' }),
    customer: { name, phone, email, address },
    order:    { product: productInfo, material, color, quantity: qty, notes, priceDetail },
    payment:  'Cash on Delivery',
    total:    `৳${totalPrice.toLocaleString()}`
  };

  document.getElementById('orderSummary').innerHTML = `
    <strong>📋 Order Confirmed</strong><br>
    🆔 ${orderData.id}<br>👤 ${name} · 📱 ${phone}<br>
    📦 ${productInfo}<br>🧵 ${material} · ${color || 'Any'} · Qty: ${qty}<br>
    💰 ${priceDetail}<br>
    📍 ${address}<br>💵 Payment: Cash on Delivery`;
  document.getElementById('orderSummary').classList.add('show');

  await sendNotifications(orderData);

  const orders = JSON.parse(localStorage.getItem('forge3d_orders') || '[]');
  orders.push(orderData);
  localStorage.setItem('forge3d_orders', JSON.stringify(orders));
  if (!currentOrderProduct) { cart = []; saveCart(); updateCartCount(); renderCartItems(); }

  btn.textContent = 'ORDER PLACED ✓'; btn.style.background = '#00c850';
  showToast(`Order ${orderData.id} placed!`, 'success');
  setTimeout(() => { closeOrderModal(); if (!currentOrderProduct) toggleCart(); }, 3000);
}

// =========================================
//   NOTIFICATIONS
// =========================================
async function sendNotifications(orderData) {
  const msg = formatOrderMessage(orderData);

  // 1. WhatsApp (owner)
  if (config.whatsapp) {
    window.open(`https://wa.me/${config.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // 2. Telegram (owner)
  if (config.telegramToken && config.telegramChatId) {
    try {
      await fetch(`https://api.telegram.org/bot${config.telegramToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.telegramChatId, text: msg, parse_mode: 'Markdown' })
      });
    } catch (e) { console.warn('Telegram:', e); }
  }

  // 3. EmailJS — owner notification + customer confirmation
  if (config.emailServiceId && config.emailPublicKey) {
    try {
      await loadEmailJS();
      emailjs.init(config.emailPublicKey);

      const sharedParams = {
        order_id:         orderData.id,
        customer_name:    orderData.customer.name,
        customer_phone:   orderData.customer.phone,
        customer_email:   orderData.customer.email || 'N/A',
        customer_address: orderData.customer.address,
        product:          orderData.order.product,
        material:         orderData.order.material,
        color:            orderData.order.color || 'Any',
        quantity:         orderData.order.quantity,
        notes:            orderData.order.notes || 'None',
        payment:          orderData.payment,
        total:            orderData.total,
        timestamp:        orderData.timestamp,
        order_message:    msg,
      };

      // 3a. Owner email
      if (config.emailTemplateId && config.email) {
        try {
          await emailjs.send(config.emailServiceId, config.emailTemplateId, {
            ...sharedParams,
            to_email: config.email,
          });
        } catch (e) { console.warn('Owner email failed:', e); }
      }

      // 3b. Customer confirmation email (if they provided email + a customer template is configured)
      const customerTemplate = config.customerEmailTemplateId;
      if (customerTemplate && orderData.customer.email) {
        try {
          await emailjs.send(config.emailServiceId, customerTemplate, {
            ...sharedParams,
            to_email:      orderData.customer.email,
            reply_to:      config.email || '',
            // Friendly confirmation message the customer sees
            confirm_msg:   `Hi ${orderData.customer.name}, your order has been received! We'll process it shortly and deliver to ${orderData.customer.address}. Payment is cash on delivery — ৳${orderData.total}.`,
          });
        } catch (e) { console.warn('Customer email failed:', e); }
      }

    } catch (e) { console.warn('EmailJS init failed:', e); }
  }
}
function formatOrderMessage(o) {
  return `🖨️ *NEW ORDER — Protonyx*\n\n🆔 Order ID: ${o.id}\n🕐 Time: ${o.timestamp}\n\n👤 *Customer:*\nName: ${o.customer.name}\nPhone: ${o.customer.phone}\nEmail: ${o.customer.email || 'N/A'}\nAddress: ${o.customer.address}\n\n📦 *Order:*\nProduct: ${o.order.product}\nMaterial: ${o.order.material} (FDM)\nColor: ${o.order.color || 'Any'}\nQuantity: ${o.order.quantity}\nPrice: ${o.order.priceDetail || o.total}\nNotes: ${o.order.notes || 'None'}\n\n💵 *Payment: ${o.payment}*\n💰 *Total: ${o.total}*`;
}
function loadEmailJS() {
  return new Promise(resolve => {
    if (window.emailjs) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = resolve; document.head.appendChild(s);
  });
}

// =========================================
//   INQUIRY
// =========================================
async function sendInquiry() {
  const name    = document.getElementById('inquiryName').value.trim();
  const contact = document.getElementById('inquiryContact').value.trim();
  const msg     = document.getElementById('inquiryMsg').value.trim();
  if (!name || !contact || !msg) { showToast('Please fill all fields', 'error'); return; }
  const message = `💬 *Protonyx — NEW INQUIRY*\n\n👤 ${name}\n📱 ${contact}\n\n${msg}`;
  if (config.whatsapp) window.open(`https://wa.me/${config.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`, '_blank');
  document.getElementById('inquiryName').value = '';
  document.getElementById('inquiryContact').value = '';
  document.getElementById('inquiryMsg').value = '';
  showToast('Message sent via WhatsApp!', 'success');
}

// =========================================
//   DEV PANEL
// =========================================
function toggleDevPanel() {
  if (devAuthenticated) {
    const panel = document.getElementById('devPanel');
    if (panel.classList.contains('open')) { closeDevPanel(); }
    else { renderDevProductList(); _populateHeroCardInputs(); openDevPanel(); }
  } else {
    document.getElementById('devAuthModal').classList.remove('hidden');
    document.getElementById('devAuthUser').value = '';
    document.getElementById('devAuthPass').value = '';
    document.getElementById('devAuthError').classList.add('hidden');
    setTimeout(() => document.getElementById('devAuthUser').focus(), 50);
  }
}
function openDevPanel() {
  document.getElementById('devPanel').classList.add('open');
  document.getElementById('devPanel').classList.remove('hidden');
  document.getElementById('devOverlay').classList.remove('hidden');
  document.getElementById('devOverlay').classList.add('open');
}
function closeDevPanel() {
  document.getElementById('devPanel').classList.remove('open');
  document.getElementById('devPanel').classList.add('hidden');
  document.getElementById('devOverlay').classList.remove('open');
  document.getElementById('devOverlay').classList.add('hidden');
}
function closeDevAuth() { document.getElementById('devAuthModal').classList.add('hidden'); }
function devLogin() {
  const user  = document.getElementById('devAuthUser').value.trim();
  const pass  = document.getElementById('devAuthPass').value;
  const creds = getDevCredentials();
  if (user === creds.username && pass === creds.password) {
    devAuthenticated = true;
    closeDevAuth();
    renderDevProductList();
    _populateHeroCardInputs();
    openDevPanel();
    loadConfigUI();
  } else {
    document.getElementById('devAuthError').classList.remove('hidden');
    document.getElementById('devAuthPass').value = '';
    document.getElementById('devAuthPass').focus();
    const box = document.querySelector('.dev-auth-box');
    box.style.animation = 'none'; box.offsetHeight;
    box.style.animation = 'authShake 0.4s ease';
  }
}
function devLogout() { devAuthenticated = false; closeDevPanel(); showToast('Logged out of Dev Mode', 'info'); }
function changeDevCredentials() {
  const nu = document.getElementById('newDevUser').value.trim();
  const np = document.getElementById('newDevPass').value;
  const nc = document.getElementById('newDevPassConfirm').value;
  if (!nu || !np) { showToast('Username & password required', 'error'); return; }
  if (np !== nc)  { showToast('Passwords do not match', 'error'); return; }
  localStorage.setItem('forge3d_dev_creds', JSON.stringify({ username: nu, password: np }));
  ['newDevUser','newDevPass','newDevPassConfirm'].forEach(id => { document.getElementById(id).value = ''; });
  showToast('Credentials updated!', 'success');
}

// ── Add / Delete products ──
function addProduct() {
  const name     = document.getElementById('devProductName').value.trim();
  const desc     = document.getElementById('devProductDesc').value.trim();
  const price    = parseFloat(document.getElementById('devProductPrice').value);
  const category = document.getElementById('devProductCategory').value;
  const urlsRaw  = document.getElementById('devProductUrls').value.trim();
  if (!name || !price) { showToast('Product Name & Price are required', 'error'); return; }
  // Store raw paths as entered — they are resolved via resolveImageUrl() when displayed
  const images = urlsRaw ? urlsRaw.split('\n').map(u => u.trim()).filter(Boolean) : [];
  const newProduct = { id: 'prod_' + Date.now(), name, desc, price, category, images, emoji: getCategoryEmoji(category) };
  products.unshift(newProduct);
  saveProductsToStorage();
  renderProducts();
  renderDevProductList();
  ['devProductName','devProductDesc','devProductPrice','devProductUrls'].forEach(id => { document.getElementById(id).value = ''; });
  showToast(`"${name}" added!`, 'success');
}
function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  products = products.filter(p => p.id !== id);
  cart     = cart.filter(i => i.id !== id);
  wishlist = wishlist.filter(x => x !== id);
  saveProductsToStorage(); saveCart();
  localStorage.setItem('forge3d_wishlist', JSON.stringify(wishlist));
  updateCartCount(); updateWishlistCount();
  renderProducts(); renderDevProductList();
  showToast('Product deleted', 'info');
}
function renderDevProductList() {
  const container = document.getElementById('devProductList');
  if (!container) return;
  if (products.length === 0) { container.innerHTML = '<p class="dev-list-placeholder">No products yet. Add one above.</p>'; return; }
  container.innerHTML = products.map(p => {
    const img = getProductImages(p)[0];
    return `<div class="dev-product-item">
      <div class="dev-product-thumb">${img ? `<img src="${img}" alt="${p.name}">` : p.emoji || '🖨️'}</div>
      <div class="dev-product-info"><strong>${p.name}</strong><span>৳${p.price.toLocaleString()} · ${p.category}</span></div>
      <button class="dev-delete-btn" onclick="deleteProduct('${p.id}')">DEL</button>
    </div>`;
  }).join('');
}
function getCategoryEmoji(cat) {
  return { figurines:'🐉', functional:'⚙️', jewelry:'💍', custom:'✨', architectural:'🏛️' }[cat] || '🖨️';
}

// =========================================
//   CONFIG
// =========================================
function saveConfig() {
  config = {
    whatsapp:                document.getElementById('configWhatsapp').value.trim(),
    telegramToken:           document.getElementById('configTelegramToken').value.trim(),
    telegramChatId:          document.getElementById('configTelegramChatId').value.trim(),
    email:                   document.getElementById('configEmail').value.trim(),
    emailServiceId:          document.getElementById('configEmailService').value.trim(),
    emailTemplateId:         document.getElementById('configEmailTemplate').value.trim(),
    customerEmailTemplateId: document.getElementById('configCustomerEmailTemplate').value.trim(),
    emailPublicKey:          document.getElementById('configEmailPublic').value.trim(),
  };
  localStorage.setItem('forge3d_config', JSON.stringify(config));
  if (config.whatsapp) document.getElementById('displayWhatsapp').textContent = config.whatsapp;
  if (config.email)    document.getElementById('displayEmail').textContent    = config.email;
  showToast('Configuration saved!', 'success');
  closeDevPanel();
}
function loadConfigUI() {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('configWhatsapp', config.whatsapp); set('configTelegramToken', config.telegramToken);
  set('configTelegramChatId', config.telegramChatId); set('configEmail', config.email);
  set('configEmailService', config.emailServiceId); set('configEmailTemplate', config.emailTemplateId);
  set('configCustomerEmailTemplate', config.customerEmailTemplateId);
  set('configEmailPublic', config.emailPublicKey);
  if (config.whatsapp) { const el = document.getElementById('displayWhatsapp'); if (el) el.textContent = config.whatsapp; }
  if (config.email)    { const el = document.getElementById('displayEmail');    if (el) el.textContent = config.email; }
}

// =========================================
//   TOAST
// =========================================
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// =========================================
//   KEYBOARD
// =========================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeOrderModal(); closeDevPanel(); closeDevAuth();
    if (document.getElementById('cartSidebar').classList.contains('open'))     toggleCart();
    if (document.getElementById('wishlistSidebar').classList.contains('open')) toggleWishlistSidebar();
  }
  if (e.key === 'Enter' && !document.getElementById('devAuthModal').classList.contains('hidden')) devLogin();
});
