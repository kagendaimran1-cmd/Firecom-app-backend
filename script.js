/*************************************************
 * SPLASH → LOGIN TRANSITION
 *************************************************/
window.addEventListener("load", () => {
  const splash = document.getElementById("splash");
  const loginCard = document.getElementById("loginCard");

  // Show splash for 2 seconds
  setTimeout(() => {
    splash.style.opacity = "0";

    setTimeout(() => {
      splash.style.display = "none";
      loginCard.classList.remove("hidden");
    }, 1000); // fade-out duration
  }, 2000); // visible duration
});

/*************************************************
 * PASSWORD VISIBILITY
 *************************************************/
const toggle = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

toggle.addEventListener("click", () => {
  passwordInput.type =
    passwordInput.type === "password" ? "text" : "password";
});

/*************************************************
 * STATUS MESSAGE
 *************************************************/
function showStatus(msg, success = false) {
  const status = document.getElementById("status");
  status.style.color = success ? "#4caf50" : "#ff6b6b";
  status.innerText = msg;
}

/*************************************************
 * INTERNET CHECK
 *************************************************/
function hasInternet() {
  if (!navigator.onLine) {
    showStatus("⚠ No internet connection");
    return false;
  }
  return true;
}

window.addEventListener("offline", () => {
  showStatus("⚠ You are offline");
});

/*************************************************
 * FIREBASE SETUP
 *************************************************/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyACTaLUXLjWC9iyUEpGYhJXLjNnu9wN4Cw",
  authDomain: "fire-com-app-73985183-a0016.firebaseapp.com",
  projectId: "fire-com-app-73985183-a0016",
  storageBucket: "fire-com-app-73985183-a0016.firebasestorage.app",
  messagingSenderId: "909518482191",
  appId: "1:909518482191:web:59f358ea86bbc586522c7a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/*************************************************
 * LOGIN LOGIC
 *************************************************/
document.getElementById("loginBtn").addEventListener("click", async () => {
  if (!hasInternet()) return;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const remember = document.getElementById("remember").checked;

  if (!email || !password) {
    showStatus("Please enter email and password");
    return;
  }

  showStatus("Signing in...", true);

  try {
    await signInWithEmailAndPassword(auth, email, password);

    if (remember) {
      localStorage.setItem("firecom_user", email);
    }

    showStatus("Login successful!", true);

    // Go to PROJECT SETTINGS (not app.html)
    setTimeout(() => {
      window.location.href = "project.html";
    }, 800);

  } catch (err) {
    showStatus("❌ " + err.message);
  }
});