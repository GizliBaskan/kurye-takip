// Firebase v9 Modular API'lerini CDN üzerinden import ediyoruz
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHBx7z13k2JiwsYYS3uqOfDWphCf9DFrM",
  authDomain: "kurye-takip-92f66.firebaseapp.com",
  databaseURL: "https://kurye-takip-92f66-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kurye-takip-92f66",
  storageBucket: "kurye-takip-92f66.firebasestorage.app",
  messagingSenderId: "700959539368",
  appId: "1:700959539368:web:a78e6e16b4ec82dcb0429d"
};

// Uygulamayı Başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let records = [];
let garageData = { vehicles: [], activeVehicleId: null, dailyGoal: 1500 };
let charts = {};

// UI Elementleri
const authScreen = document.getElementById('auth-screen');
const appContainer = document.getElementById('app-container');
const errorMsg = document.getElementById('auth-error');

function toast(msg, ok=true) {
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (ok ? ' ok' : '');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// GİRİŞ / ÇIKIŞ İŞLEMLERİ
document.getElementById('btnLogin').addEventListener('click', () => {
  const e = document.getElementById('authEmail').value.trim();
  const p = document.getElementById('authPassword').value;
  signInWithEmailAndPassword(auth, e, p).catch(err => {
    errorMsg.textContent = 'Hata: ' + err.message; errorMsg.style.display = 'block';
  });
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

// KULLANICI DURUMUNU DİNLE
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    authScreen.style.display = 'none';
    appContainer.classList.add('show');
    
    // Veritabanını Dinle
    const userRef = ref(db, 'kullanicilar/' + user.uid);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val() || {};
      records = data.kayitlar ? Object.values(data.kayitlar) : [];
      garageData = data.garaj || { vehicles: [], activeVehicleId: null, dailyGoal: 1500 };
      
      // Arayüzü Güncelle (Burada eski render fonksiyonlarını çağırıyoruz)
      // renderDash(); vb...
      console.log("Veri yüklendi:", records.length, "kayıt.");
      handleShortcuts(); // Kısayol kontrolü
    });
  } else {
    currentUser = null;
    authScreen.style.display = 'flex';
    appContainer.classList.remove('show');
  }
});

// YENİ ÖZELLİK: LIGHT / DARK MODE (GÖZ YORGUNLUĞU İÇİN)
const btnThemeToggle = document.getElementById('btnThemeToggle');
let isLight = localStorage.getItem('theme') === 'light';
if (isLight) {
  document.documentElement.setAttribute('data-theme', 'light');
  btnThemeToggle.textContent = '🌙 Karanlık Mod';
}

btnThemeToggle.addEventListener('click', () => {
  isLight = !isLight;
  if (isLight) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    btnThemeToggle.textContent = '🌙 Karanlık Mod';
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', 'dark');
    btnThemeToggle.textContent = '☀️ Aydınlık Mod';
  }
  // Grafikleri yeni renklere göre yeniden çizmek gerekebilir.
  // renderDash(); 
});

// YENİ ÖZELLİK: DASHBOARD TABLARI (BİLİŞSEL YÜKÜ AZALTMA)
document.querySelectorAll('.dash-tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-tab-pane').forEach(p => p.classList.remove('active'));
    
    e.target.classList.add('active');
    document.getElementById('tab-' + e.target.dataset.tab).classList.add('active');
  });
});

// YENİ ÖZELLİK: MANİFEST KISAYOLLARINI YAKALAMA
function handleShortcuts() {
  const params = new URLSearchParams(location.search);
  const action = params.get('action');
  if (action) {
    history.replaceState(null, '', location.pathname); // URL'yi temizle
    setTimeout(() => {
      if (action === 'add') {
        // Yeni Kayıt Butonuna Tıklat
        const btnAdd = document.getElementById('btnAdd');
        if(btnAdd) btnAdd.click();
      } else if (action === 'dashboard') {
        document.querySelector('[data-page="dashboard"]').click();
      } else if (action === 'garage') {
        document.querySelector('[data-page="garage"]').click();
      }
    }, 300);
  }
}

// SOL MENÜ GEZİNTİSİ
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const pageId = 'page-' + btn.dataset.page;
    const page = document.getElementById(pageId);
    if(page) page.classList.add('active');
  });
});

// Chart.js Temaya Duyarlı Ayarlar (Karanlık/Aydınlık mod geçişinde ızgara renkleri otomatik uyum sağlar)
function chartOpts() {
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || 'rgba(30,42,58,.6)';
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#94a3b8';
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: textColor } } },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } }
    }
  }
}
