// ------------------------------
// Firebase imports
// ------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ------------------------------
// Firebase config 
// ------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyB9Vi7Qwm9_COJBSO6i2Gi78lxGB87zPRQ",
  authDomain: "greater-guitar.firebaseapp.com",
  projectId: "greater-guitar",
  storageBucket: "greater-guitar.firebasestorage.app",
  messagingSenderId: "704579637904",
  appId: "1:704579637904:web:164fcc0299e40208693e15",
  measurementId: "G-3LFV1JHX38"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const bunsCol = collection(db, "buns");

// ------------------------------
// DOM elements
// ------------------------------
const adminShield = document.getElementById("adminShield");
const adminLoginCard = document.getElementById("adminLoginCard");

const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");

const toggleAdminBtn = document.getElementById("toggleAdminBtn");
const adminSection = document.getElementById("adminSection");
const bunForm = document.getElementById("bunForm");

const leaderboardEl = document.getElementById("leaderboard");
const emptyStateEl = document.getElementById("emptyState");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalTitle = document.getElementById("modalTitle");
const modalTotal = document.getElementById("modalTotal");
const modalTaste = document.getElementById("modalTaste");
const modalTexture = document.getElementById("modalTexture");
const modalCross = document.getElementById("modalCross");
const modalFruit = document.getElementById("modalFruit");
const modalPriceBun = document.getElementById("modalPriceBun");
const modalPack = document.getElementById("modalPack");
const modalShareBtn = document.getElementById("modalShareBtn");

let currentBuns = [];
let currentModalBun = null;
let adminVisible = false;

// ------------------------------
// Helpers
// ------------------------------
function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function bunIdFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function bunShareUrl(id) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#hcb=${encodeURIComponent(id)}`;
}

// ------------------------------
// Floating shield toggles login
// ------------------------------
adminShield.addEventListener("click", () => {
  adminLoginCard.style.display =
    adminLoginCard.style.display === "block" ? "none" : "block";
});

// ------------------------------
// Admin login
// ------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  loginStatus.textContent = "Signing in…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginStatus.textContent = "Signed in. Checking admin access…";
  } catch (err) {
    loginStatus.textContent = "Login failed: " + err.message;
  }
});

// ------------------------------
// Check admin UID from Firestore
// ------------------------------
async function checkAdmin(uid) {
  const adminDoc = await getDoc(doc(db, "config", "admins"));
  if (!adminDoc.exists()) return false;

  const data = adminDoc.data();
  return Array.isArray(data.uids) && data.uids.includes(uid);
}

// ------------------------------
// Auth state listener
// ------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    toggleAdminBtn.style.display = "none";
    adminSection.style.display = "none";
    adminVisible = false;
    loginStatus.textContent = "Not signed in.";
    return;
  }

  const isAdmin = await checkAdmin(user.uid);

  if (isAdmin) {
    toggleAdminBtn.style.display = "inline-flex";
    loginStatus.textContent = "Admin access granted.";
  } else {
    toggleAdminBtn.style.display = "none";
    adminSection.style.display = "none";
    adminVisible = false;
    loginStatus.textContent = "Signed in, but not an admin.";
  }
});

// ------------------------------
// Admin panel toggle
// ------------------------------
toggleAdminBtn.addEventListener("click", () => {
  adminVisible = !adminVisible;
  adminSection.style.display = adminVisible ? "block" : "none";
});

// ------------------------------
// Save / update bun
// ------------------------------
bunForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const taste = num(document.getElementById("taste").value);
  const texture = num(document.getElementById("texture").value);
  const crossNeatness = num(document.getElementById("crossNeatness").value);
  const fruitContent = num(document.getElementById("fruitContent").value);
  const pricePerBun = num(document.getElementById("pricePerBun").value);
  const packSize = num(document.getElementById("packSize").value);
  const pricePerPack = num(document.getElementById("pricePerPack").value);

  if (!name) {
    alert("Please enter a bun name.");
    return;
  }

  const id = bunIdFromName(name);
  const totalScore = taste + texture + crossNeatness + fruitContent;

  await setDoc(doc(bunsCol, id), {
    id,
    name,
    taste,
    texture,
    crossNeatness,
    fruitContent,
    totalScore,
    pricePerBun: pricePerBun || null,
    packSize: packSize || null,
    pricePerPack: pricePerPack || null,
    updatedAt: Date.now()
  });

  bunForm.reset();
});

// ------------------------------
// Live leaderboard
// ------------------------------
const q = query(bunsCol, orderBy("totalScore", "desc"), orderBy("updatedAt", "asc"));

onSnapshot(q, (snapshot) => {
  const buns = [];
  snapshot.forEach((docSnap) => buns.push({ ...docSnap.data() }));
  currentBuns = buns;
  renderLeaderboard(buns);
  checkHashForBun();
});

// ------------------------------
// Render leaderboard
// ------------------------------
function renderLeaderboard(buns) {
  leaderboardEl.innerHTML = "";

  if (!buns.length) {
    emptyStateEl.style.display = "block";
    return;
  }
  emptyStateEl.style.display = "none";

  buns.forEach((bun, index) => {
    const li = document.createElement("li");
    li.className = "leaderboard-item";
    li.dataset.id = bun.id;

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";

    const rank = document.createElement("div");
    rank.className = "rank-pill";
    if (index === 0) rank.classList.add("rank-1");
    if (index === 1) rank.classList.add("rank-2");
    if (index === 2) rank.classList.add("rank-3");
    rank.textContent = index + 1;

    const textWrap = document.createElement("div");
    const nameEl = document.createElement("div");
    nameEl.className = "bun-name";
    nameEl.textContent = bun.name;

    const subEl = document.createElement("div");
    subEl.className = "bun-sub";
    subEl.textContent = `Taste ${bun.taste.toFixed(1)} · Texture ${bun.texture.toFixed(1)}`;

    textWrap.appendChild(nameEl);
    textWrap.appendChild(subEl);

    left.appendChild(rank);
    left.appendChild(textWrap);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "0.5rem";

    const scoreEl = document.createElement("div");
    scoreEl.className = "lb-score";
    scoreEl.textContent = bun.totalScore.toFixed(1);

    const shareBtn = document.createElement("button");
    shareBtn.className = "btn-share";
    shareBtn.textContent = "📤";
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      shareBun(bun);
    });

    right.appendChild(scoreEl);
    right.appendChild(shareBtn);

    li.appendChild(left);
    li.appendChild(right);

    li.addEventListener("click", () => openModal(bun));

    leaderboardEl.appendChild(li);
  });
}

// ------------------------------
// Modal
// ------------------------------
function openModal(bun) {
  currentModalBun = bun;

  modalTitle.textContent = bun.name;
  modalTotal.textContent = bun.totalScore.toFixed(1);
  modalTaste.textContent = bun.taste.toFixed(1);
  modalTexture.textContent = bun.texture.toFixed(1);
  modalCross.textContent = bun.crossNeatness.toFixed(1);
  modalFruit.textContent = bun.fruitContent.toFixed(1);

  modalPriceBun.textContent =
    bun.pricePerBun ? `£${bun.pricePerBun.toFixed(2)}` : "—";

  if (bun.packSize && bun.pricePerPack) {
    modalPack.textContent = `${bun.packSize} for £${bun.pricePerPack.toFixed(2)}`;
  } else if (bun.pricePerPack) {
    modalPack.textContent = `£${bun.pricePerPack.toFixed(2)} (pack)`;
  } else {
    modalPack.textContent = "—";
  }

  modalBackdrop.style.display = "flex";
}

function closeModal() {
  modalBackdrop.style.display = "none";
  currentModalBun = null;
}

modalCloseBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ------------------------------
// Share logic
// ------------------------------
async function shareBun(bun) {
  const url = bunShareUrl(bun.id);
  const text = `Check out this Hot Cross Bun: ${bun.name} (score ${bun.totalScore.toFixed(1)})`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Hot Cross Bun Showdown", text, url });
    } catch {}
  } else {
    await navigator.clipboard.writeText(url);
    alert("Share link copied:\n" + url);
  }
}

modalShareBtn.addEventListener("click", () => {
  if (currentModalBun) shareBun(currentModalBun);
});

// ------------------------------
// Handle share links (#hcb=...)
// ------------------------------
function getHashBunId() {
  const hash = window.location.hash;
  const match = hash.match(/#hcb=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
}

function checkHashForBun() {
  const id = getHashBunId();
  if (!id || !currentBuns.length) return;

  const bun = currentBuns.find((b) => b.id === id);
  if (bun) openModal(bun);
}

window.addEventListener("hashchange", checkHashForBun);
