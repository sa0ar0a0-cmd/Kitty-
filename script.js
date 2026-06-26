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
let editMode = null; // 'img' | 'desc'
let pendingImgDataUrl = null;
let pendingImgForNewCard = null;
let fabOpen = false;
let currentPage = 'gallery';

// ===== STORAGE KEYS =====
const STORAGE_KEY = 'kitty_private_photos';

// ===== LOAD FROM STORAGE =====
function loadPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      photos = JSON.parse(raw);
    } else {
      // Load default photos from embedded data
      if (typeof PHOTOS !== 'undefined' && PHOTOS.length > 0) {
        photos = PHOTOS.map((p, i) => ({
          id: p.id,
          src: p.src,
          desc: getDefaultDesc(i),
          date: p.date || formatDate(new Date()),
        }));
        savePhotos();
      }
    }
  } catch (e) {
    photos = [];
  }
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
  return descs[i] || '💖 لحظه‌ای خاص از سویتا خانوم';
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

  if (photos.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">🌸</div>
        <p>هنوز عکسی اضافه نشده<br>با دکمه + عکس اضافه کنید</p>
      </div>`;
    return;
  }

  photos.forEach((photo, idx) => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.style.animationDelay = `${idx * 0.06}s`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${photo.src}" alt="عکس سویتا" loading="lazy">
        <span class="card-date-badge">${photo.date}</span>
      </div>
      <div class="card-body">
        <div class="card-desc ${photo.desc ? '' : 'empty'}">
          ${photo.desc || 'توضیحی ندارد'}
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

// ===== MODAL LOGIC =====
function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
  editMode = null;
  pendingImgDataUrl = null;
}

// ===== EDIT IMAGE =====
function openEditImg(id) {
  editingId = id;
  editMode = 'img';
  const p = photos.find(x => x.id === id);
  document.getElementById('modalTitle').textContent = '🖼️ ویرایش عکس';
  document.getElementById('modalContent').innerHTML = `
    <img id="editImgPreview" class="modal-img-preview" src="${p.src}" style="display:block;">
    <label style="display:block; text-align:center; margin:8px 0;">
      <button class="btn-primary" onclick="document.getElementById('fileInput').click()" style="width:100%;">
        📷 انتخاب عکس جدید
      </button>
    </label>
  `;
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

// ===== EDIT DESC =====
function openEditDesc(id) {
  editingId = id;
  editMode = 'desc';
  const p = photos.find(x => x.id === id);
  document.getElementById('modalTitle').textContent = '✏️ ویرایش توضیح';
  document.getElementById('modalContent').innerHTML = `
    <textarea id="editDescInput" class="modal-textarea" placeholder="توضیح خود را بنویسید...">${p.desc || ''}</textarea>
  `;
  document.getElementById('modalOverlay').classList.add('open');
}

// ===== MODAL SAVE =====
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
    const newId = Date.now();
    photos.unshift({ id: newId, src: pendingImgForNewCard, desc: descEl ? descEl.value.trim() : '', date: formatDate(new Date()) });
    savePhotos();
    renderGallery();
    showToast('🌸 عکس جدید اضافه شد');
  } else if (editMode === 'add-desc') {
    const inp = document.getElementById('newDescInput');
    if (!inp || !inp.value.trim()) { showToast('⚠️ توضیح نمی‌تواند خالی باشد'); return; }
    if (photos.length === 0) { showToast('⚠️ ابتدا یک عکس اضافه کنید'); return; }
    photos[0].desc = inp.value.trim();
    savePhotos();
    renderGallery();
    showToast('✅ توضیح اضافه شد');
  }
  closeModal();
}

// ===== FAB MENU =====
function toggleFab() {
  fabOpen = !fabOpen;
  document.getElementById('fab').classList.toggle('open', fabOpen);
  document.getElementById('fabMenu').classList.toggle('open', fabOpen);
  document.getElementById('fabOverlay').classList.toggle('open', fabOpen);
}

function closeFab() {
  fabOpen = false;
  document.getElementById('fab').classList.remove('open');
  document.getElementById('fabMenu').classList.remove('open');
  document.getElementById('fabOverlay').classList.remove('open');
}

function fabAddPhoto() {
  closeFab();
  editMode = 'add-photo';
  pendingImgForNewCard = null;
  document.getElementById('modalTitle').textContent = '📷 افزودن عکس جدید';
  document.getElementById('modalContent').innerHTML = `
    <label style="display:block; text-align:center; margin-bottom:10px;">
      <button class="btn-secondary" onclick="document.getElementById('fileInput').click()" style="width:100%;">
        🖼️ انتخاب از گالری
      </button>
    </label>
    <img id="newImgPreview" class="modal-img-preview">
    <textarea id="newPhotoDesc" class="modal-textarea" placeholder="توضیح (اختیاری)..."></textarea>
  `;
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
    <p style="font-size:0.85rem; color:var(--text-soft); margin-bottom:10px; direction:rtl;">توضیح برای اولین عکس اضافه می‌شود</p>
    <textarea id="newDescInput" class="modal-textarea" placeholder="توضیح خود را بنویسید..."></textarea>
  `;
  document.getElementById('modalOverlay').classList.add('open');
}

function fabChooseGallery() {
  closeFab();
  editMode = 'add-photo';
  pendingImgForNewCard = null;
  document.getElementById('fileInput').onchange = handleNewPhotoFile;
  document.getElementById('fileInput').click();
  // After selection show modal
  setTimeout(() => {
    if (pendingImgForNewCard) {
      document.getElementById('modalTitle').textContent = '📷 افزودن عکس جدید';
      document.getElementById('modalContent').innerHTML = `
        <img id="newImgPreview" class="modal-img-preview" src="${pendingImgForNewCard}" style="display:block;">
        <textarea id="newPhotoDesc" class="modal-textarea" placeholder="توضیح (اختیاری)..."></textarea>
      `;
      document.getElementById('modalOverlay').classList.add('open');
    }
  }, 500);
}

// ===== PAGE NAVIGATION =====
function showPage(name) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const pg = document.getElementById('page-' + name);
  const btn = document.getElementById('nav-' + name);
  if (pg) pg.classList.add('active');
  if (btn) btn.classList.add('active');
  // Show/hide FAB
  document.getElementById('fab').style.display = name === 'gallery' ? 'flex' : 'none';
  document.getElementById('fabMenu').style.display = name === 'gallery' ? 'flex' : 'none';
  closeFab();
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== SPLASH SCREEN =====
function startSplash() {
  const titleEl = document.getElementById('splashTitle');
  const text = 'Kitty Sevita';
  let i = 0;
  titleEl.innerHTML = '<span class="splash-cursor">|</span>';

  function typeNext() {
    if (i < text.length) {
      titleEl.innerHTML = text.slice(0, i + 1) + '<span class="splash-cursor">|</span>';
      i++;
      setTimeout(typeNext, 110);
    } else {
      setTimeout(hideSplash, 1200);
    }
  }

  // Float hearts on splash
  createSplashHearts();
  setTimeout(typeNext, 700);
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
  splash.classList.add('fade-out');
  app.classList.add('visible');
  setTimeout(() => { splash.classList.add('hidden'); }, 900);
}

// ===== DECO HEARTS =====
function createDecoHearts() {
  const container = document.querySelector('.deco-hearts');
  if (!container) return;
  const emojis = ['❤', '♡', '✿', '✦'];
  for (let i = 0; i < 10; i++) {
    const h = document.createElement('span');
    h.className = 'deco-heart';
    h.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    h.style.left = Math.random() * 100 + '%';
    h.style.animationDuration = (10 + Math.random() * 20) + 's';
    h.style.animationDelay = Math.random() * 15 + 's';
    h.style.fontSize = (0.6 + Math.random() * 0.7) + 'rem';
    container.appendChild(h);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadPhotos();
  renderGallery();
  startSplash();
  createDecoHearts();
  showPage('gallery');

  // Modal close on overlay click
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
});
