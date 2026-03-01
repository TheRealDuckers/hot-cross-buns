// app.js
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

// 1. Firebase config (replace with your own)
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

// 2. DOM elements
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

let adminVisible = false;
let currentBuns = [];
let currentModalBun = null;

// 3. Helpers
function num(value) {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function bunIdFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function bunShareUrl(id) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#hcb=${encodeURIComponent(id)}`;
}

// 4. Admin login
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

// 5. Check admin UID from Firestore
async function checkAdmin(uid) {
  const adminDocRef = doc(db, "config", "admins");
  const snap = await getDoc(adminDocRef);
  if (!snap.exists()) return false;
  const data = snap.data();
  return Array.isArray(data.uids) && data.uids.includes(uid);
}

// 6. Auth state listener
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    toggleAdminBtn.style.display = "none";
    adminSection.style.display = "none";
    adminVisible = false;
    loginStatus.textContent = "Not signed in.";
    return;
  }

  loginStatus.textContent = "Signed in. Checking admin access…";
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

// 7. Admin panel toggle
toggleAdminBtn.addEventListener("click", () => {
  adminVisible = !adminVisible;
  adminSection.style.display = adminVisible ? "block" : "none";
});

// 8. Save / update bun
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

  const totalScore = taste + texture + crossNeatness + fruitContent;
  const id = bunIdFromName(name);

  const bunDoc = doc(bunsCol, id);

  await setDoc(bunDoc, {
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

// 9. Live leaderboard
const q = query(bunsCol, orderBy("totalScore", "desc"), orderBy("updatedAt", "asc"));

onSnapshot(q, (snapshot) => {
  const buns = [];
  snapshot.forEach((docSnap) => buns.push({ ...docSnap.data() }));
  currentBuns = buns;
  renderLeaderboard(buns);
  checkHashForBun(); // if someone opened via share link
});

// 10. Render leaderboard
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
    left.className = "lb-left";

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
    subEl.textContent = `Taste ${bun.taste.toFixed(1)} · Texture ${bun.texture.toFixed(
      1
    )}`;

    textWrap.appendChild(nameEl);
    textWrap.appendChild(subEl);

    left.appendChild(rank);
    left.appendChild(textWrap);

    const right = document.createElement("div");
    right.className = "lb-score-wrap";

    const scoreEl = document.createElement("div");
    scoreEl.className = "lb-score";
    scoreEl.textContent = bun.totalScore.toFixed(1);

    const shareBtn = document.createElement("button");
    shareBtn.className = "btn-share";
    shareBtn.type = "button";
    shareBtn.innerHTML = `<span>📤</span><span>Share</span>`;
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

// 11. Modal logic
function openModal(bun) {
  currentModalBun = bun;
  modalTitle.textContent = bun.name;
  modalTotal.textContent = bun.totalScore.toFixed(1);
  modalTaste.textContent = bun.taste.toFixed(1);
  modalTexture.textContent = bun.texture.toFixed(1);
  modalCross.textContent = bun.crossNeatness.toFixed(1);
  modalFruit.textContent = bun.fruitContent.toFixed(1);

  modalPriceBun.textContent =
    bun.pricePerBun != null && bun.pricePerBun !== 0
      ? `£${bun.pricePerBun.toFixed(2)}`
      : "—";

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

// 12. Share logic
async function shareBun(bun) {
  const url = bunShareUrl(bun.id);
  const text = `Check out this Hot Cross Bun: ${bun.name} (score ${bun.totalScore.toFixed(
    1
  )})`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Hot Cross Bun Showdown",
        text,
        url
      });
    } catch (e) {
      // user cancelled, ignore
    }
  } else {
    try {
      await navigator.clipboard.writeText(url);
      alert("Share link copied to clipboard:\n" + url);
    } catch {
      alert("Share link:\n" + url);
    }
  }
}

modalShareBtn.addEventListener("click", () => {
  if (currentModalBun) {
    shareBun(currentModalBun);
  }
});

// 13. Handle #hcb=... links
function getHashBunId() {
  const hash = window.location.hash || "";
  const match = hash.match(/#hcb=([^&]+)/i);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function checkHashForBun() {
  const id = getHashBunId();
  if (!id || !currentBuns.length) return;
  const bun = currentBuns.find((b) => b.id === id);
  if (bun) openModal(bun);
}

window.addEventListener("hashchange", checkHashForBun);
