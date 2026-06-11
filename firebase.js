import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvE50eHWtOS5pQwHiR3gKCRYKRtVGiQCI",
  authDomain: "mapu-53433.firebaseapp.com",
  projectId: "mapu-53433",
  storageBucket: "mapu-53433.firebasestorage.app",
  messagingSenderId: "570966584852",
  appId: "1:570966584852:web:2db2da9915f737036ac101",
  measurementId: "G-V19QPREXNN"
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);

// ── Google 登入 ──────────────────────────────
document.getElementById('google-login-btn').addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error('登入失敗', e);
  }
});

// ── 登出 ─────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

// ── 監聽登入狀態 ──────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 顯示主畫面
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';

    // 顯示使用者資訊
    document.getElementById('user-avatar').src = user.photoURL || '';
    document.getElementById('user-name').textContent = user.displayName || user.email;

    // 從 Firestore 讀取該使用者的打卡記錄
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : { collected: [] };

    // 把記錄傳給 app.js
    window._firebaseUser = user;
    window._collectedIds = new Set((data.collected || []).map(Number));

    // 等 SPOTS 資料準備好再渲染
    spotsReady.then(() => {
      window.collected = window._collectedIds;
      renderGallery();
      document.getElementById('prog-bar-aria').setAttribute('aria-valuemax', SPOTS.length);
    });
  } else {
    // 未登入，顯示登入畫面
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
  }
});

// ── 儲存打卡記錄到 Firestore ──────────────────
window.saveCollected = async function() {
  const user = window._firebaseUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  await setDoc(ref, { collected: [...window.collected] }, { merge: true });
};
