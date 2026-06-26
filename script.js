// ===== KITTY PRIVATE — SCRIPT.JS =====

'use strict';

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// ===== STATE =====
let photos = [];
let editingId = null;
let editMode = null;
let pendingImgDataUrl = null;
let pendingImgForNewCard = null;
let fabOpen = false;

// ===== STORAGE KEY =====
const STORAGE_KEY = 'kitty_private_v2';

// ===== LOAD PHOTOS =====
function loadPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        photos = parsed;
        return;
      }
    }
  } catch (e) { /* ignore */ }

  // Load from embedded PHOTOS data
  try {
    if (typeof PHOTOS !== 'undefined' && Array.isArray(PHOTOS) && PHOTOS.length > 0) {
      photos = PHOTOS.map((p, i) => ({
        id: p.id,
        src: p.src,
        desc: getDefaultDesc(i),
        date: p.date || formatDate(new Date()),
      }));
      savePhotos();
      return;
    }
  } catch (e) { /* ignore */ }

  photos = [];
}

function getDefaultDesc(i) {
  const descs = [
    '🌸 یه لحظه ناب از سویتا خانوم',
    '✨ همیشه زیبا و دوست‌داشتنی',
    '💕 لبخندی که دل می‌بره',
    '🌷 مثل یه گل تازه شکفته',
    '💖 چشماش مثل ستاره می‌درخشه',
    '🌟 روزی که همه چیز خوب بود',
    '🎀 سویتا جان، همیشه شاد باش',
    '💝 لحظه‌ای که فراموش نمیشه',
    '🌺 خاص و منحصربه‌فرد',
    '💗 دختر گلم، افتخارمی',
    '🌸 همیشه توی قلبمه',
    '✨ یه خاطره شیرین',
    '💕 زیباتر از هر تصویری',
    '🎀 عزیزترین آدم دنیام',
  ];
  return descs[i % descs.length];
}

function savePhotos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
  } catch (e) {
    showToast('⚠️ فضای ذخیره‌سازی پر است');
  }
}

function formatDate(d) {
  return d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ===== RENDER GALLERY =====
function renderGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!photos || photos.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🌸</div>
        <p>هنوز عکسی بارگذاری نشده<br>صبر کنید یا با + عکس اضافه کنید</p>
      </div>`;
    return;
  }

  photos.forEach((photo, idx) => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.style.animationDelay = idx * 0.06 + 's';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${photo.src}" alt="عکس سویتا" loading="lazy" decoding="async">
        <span class="card-date-badge">${photo.date}</span>
      </div>
      <div class="card-body">
        <div class="card-desc ${photo.desc ? '' : 'empty'}">
          ${photo.desc || 'بدون توضیح'}
        </div>
        <div class="card-actions">
          <button class="card-btn edit-img" onclick="openEditImg(${photo.id})">🖼️ ویرایش عکس</button>
          <button class="card-btn del-img" onclick="deletePhoto(${photo.id})">🗑️ حذف عکس</button>
          <button class="card-btn edit-desc" onclick="openEditDesc(${photo.id})">✏️ ویرایش توضیح</button>
          <button class="card-btn del-desc" onclick="deleteDesc(${photo.id})">❌ حذف توضیح</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

// ===== PHOTO ACTIONS =====
function deletePhoto(id) {
  if (!confirm('این عکس حذف شود؟')) return;
  photos = photos.filter(p => p.id !== id);
  savePhotos();
  renderGallery();
  showToast('🗑️ عکس حذف شد');
}

function deleteDesc(id) {
  const p = photos.find(x => x.id === id);
  if (!p) return;
  p.desc = '';
  savePhotos();
  renderGallery();
  showToast('❌ توضیح حذف شد');
}

// ===== MODAL =====
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
  editMode = null;
  pendingImgDataUrl = null;
}

function openEditImg(id) {
  editingId = id;
  editMode = 'img';
  const p = photos.find(x => x.id === id);
  document.getElementById('modalTitle').textContent = '🖼️ ویرایش عکس';
  document.getElementById('modalContent').innerHTML = `
    <img id="editImgPreview" class="modal-img-preview" src="${p.src}" style="display:block;">
    <button class="btn-primary" style="width:100%;margin-top:10px"
      onclick="document.getElementById('fileInput').click()">📷 انتخاب عکس جدید</button>`;
  document.getElementById('fileInput').onchange = handleEditImgFile;
  document.getElementById('modalOverlay').classList.add('open');
}

function handleEditImgFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImgDataUrl = ev.target.result;
    const preview = document.getElementById('editImgPreview');
    if (preview) { preview.src = pendingImgDataUrl; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function openEditDesc(id) {
  editingId = id;
  editMode = 'desc';
  const p = photos.find(x => x.id === id);
  document.getElementById('modalTitle').textContent = '✏️ ویرایش توضیح';
  document.getElementById('modalContent').innerHTML = `
    <textarea id="editDescInput" class="modal-textarea"
      placeholder="توضیح خود را بنویسید...">${p.desc || ''}</textarea>`;
  document.getElementById('modalOverlay').classList.add('open');
}

function saveModal() {
  if (editMode === 'img' && editingId !== null) {
    if (!pendingImgDataUrl) { closeModal(); return; }
    const p = photos.find(x => x.id === editingId);
    if (p) { p.src = pendingImgDataUrl; savePhotos(); renderGallery(); showToast('✅ عکس بروز شد'); }
  } else if (editMode === 'desc' && editingId !== null) {
    const inp = document.getElementById('editDescInput');
    const p = photos.find(x => x.id === editingId);
    if (p && inp) { p.desc = inp.value.trim(); savePhotos(); renderGallery(); showToast('✅ توضیح ذخیره شد'); }
  } else if (editMode === 'add-photo') {
    if (!pendingImgForNewCard) { showToast('⚠️ ابتدا عکس انتخاب کنید'); return; }
    const descEl = document.getElementById('newPhotoDesc');
    photos.unshift({ id: Date.now(), src: pendingImgForNewCard, desc: descEl ? descEl.value.trim() : '', date: formatDate(new Date()) });
    savePhotos(); renderGallery(); showToast('🌸 عکس جدید اضافه شد');
  } else if (editMode === 'add-desc') {
    const inp = document.getElementById('newDescInput');
    if (!inp || !inp.value.trim()) { showToast('⚠️ توضیح نمی‌تواند خالی باشد'); return; }
    if (photos.length === 0) { showToast('⚠️ ابتدا یک عکس اضافه کنید'); return; }
    photos[0].desc = inp.value.trim();
    savePhotos(); renderGallery(); showToast('✅ توضیح اضافه شد');
  }
  closeModal();
}

// ===== FAB =====
function toggleFab() {
  fabOpen = !fabOpen;
  document.getElementById('fab').classList.toggle('open', fabOpen);
  document.getElementById('fabMenu').classList.toggle('open', fabOpen);
  document.getElementById('fabOverlay').classList.toggle('open', fabOpen);
}

function closeFab() {
  fabOpen = false;
  ['fab', 'fabMenu', 'fabOverlay'].forEach(id =>
    document.getElementById(id).classList.remove('open'));
}

function fabAddPhoto() {
  closeFab();
  editMode = 'add-photo';
  pendingImgForNewCard = null;
  document.getElementById('modalTitle').textContent = '📷 افزودن عکس جدید';
  document.getElementById('modalContent').innerHTML = `
    <button class="btn-secondary" style="width:100%;margin-bottom:10px"
      onclick="document.getElementById('fileInput').click()">🖼️ انتخاب از گالری</button>
    <img id="newImgPreview" class="modal-img-preview">
    <textarea id="newPhotoDesc" class="modal-textarea" placeholder="توضیح (اختیاری)..."></textarea>`;
  document.getElementById('fileInput').onchange = handleNewPhotoFile;
  document.getElementById('modalOverlay').classList.add('open');
}

function handleNewPhotoFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImgForNewCard = ev.target.result;
    const preview = document.getElementById('newImgPreview');
    if (preview) { preview.src = pendingImgForNewCard; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function fabAddDesc() {
  closeFab();
  if (photos.length === 0) { showToast('⚠️ ابتدا یک عکس اضافه کنید'); return; }
  editMode = 'add-desc';
  document.getElementById('modalTitle').textContent = '✏️ افزودن توضیح';
  document.getElementById('modalContent').innerHTML = `
    <p style="font-size:.85rem;color:var(--text-soft);margin-bottom:10px;direction:rtl">برای اولین عکس</p>
    <textarea id="newDescInput" class="modal-textarea" placeholder="توضیح خود را بنویسید..."></textarea>`;
  document.getElementById('modalOverlay').classList.add('open');
}

function fabChooseGallery() {
  closeFab();
  fabAddPhoto();
}

// ===== PAGE NAVIGATION =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  const btn = document.getElementById('nav-' + name);
  if (pg) pg.classList.add('active');
  if (btn) btn.classList.add('active');
  const fab = document.getElementById('fab');
  const fabMenu = document.getElementById('fabMenu');
  if (fab) fab.style.display = name === 'gallery' ? 'flex' : 'none';
  if (fabMenu) fabMenu.style.display = name === 'gallery' ? 'flex' : 'none';
  closeFab();
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== SPLASH =====
function startSplash() {
  const titleEl = document.getElementById('splashTitle');
  if (!titleEl) return;
  const text = 'Kitty Sevita';
  let i = 0;
  titleEl.innerHTML = '<span class="splash-cursor">|</span>';

  const typeNext = () => {
    if (i < text.length) {
      titleEl.innerHTML = text.slice(0, i + 1) + '<span class="splash-cursor">|</span>';
      i++;
      setTimeout(typeNext, 110);
    } else {
      setTimeout(hideSplash, 1200);
    }
  };

  createSplashHearts();
  setTimeout(typeNext, 800);
}

function createSplashHearts() {
  const container = document.querySelector('.splash-hearts');
  if (!container) return;
  const emojis = ['❤️', '💕', '💗', '🌸', '💖', '✨'];
  for (let i = 0; i < 12; i++) {
    const h = document.createElement('span');
    h.className = 'splash-heart';
    h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    h.style.left = Math.random() * 100 + '%';
    h.style.animationDuration = (3 + Math.random() * 4) + 's';
    h.style.animationDelay = Math.random() * 3 + 's';
    h.style.fontSize = (0.8 + Math.random() * 0.8) + 'rem';
    container.appendChild(h);
  }
}

function hideSplash() {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  if (splash) splash.classList.add('fade-out');
  if (app) { app.classList.add('visible'); app.removeAttribute('aria-hidden'); }
  setTimeout(() => { if (splash) splash.classList.add('hidden'); }, 900);
}

function createDecoHearts() {
  const container = document.querySelector('.deco-hearts');
  if (!container) return;
  const chars = ['❤', '♡', '✿', '✦'];
  for (let i = 0; i < 10; i++) {
    const h = document.createElement('span');
    h.className = 'deco-heart';
    h.textContent = chars[Math.floor(Math.random() * chars.length)];
    h.style.left = Math.random() * 100 + '%';
    h.style.animationDuration = (10 + Math.random() * 20) + 's';
    h.style.animationDelay = Math.random() * 15 + 's';
    h.style.fontSize = (0.6 + Math.random() * 0.7) + 'rem';
    container.appendChild(h);
  }
}

// ===== INIT — use window.onload to ensure photos_data.js is fully parsed =====
window.addEventListener('load', () => {
  loadPhotos();
  renderGallery();
  startSplash();
  createDecoHearts();
  showPage('gallery');

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
});
