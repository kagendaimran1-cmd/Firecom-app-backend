const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const statusBox = document.getElementById("status");

chooseBtn.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  dropzone.classList.add("hover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("hover");
});

dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("hover");

  const file = e.dataTransfer.files[0];
  handleFile(file);
});

fileInput.addEventListener("change", () => {
  handleFile(fileInput.files[0]);
});

function handleFile(file) {
  if (!file) return;

  if (!file.name.endsWith(".zip")) {
    status("❌ Only ZIP files are allowed");
    return;
  }

  status(`📦 "${file.name}" selected`);

  const formData = new FormData();
  formData.append("file", file);

  // Also append saved project settings from project.html
  const project = JSON.parse(localStorage.getItem("firecom_project") || "{}");
  if (project.appName) formData.append("appName", project.appName);
  if (project.packageName) formData.append("packageName", project.packageName);
  if (project.version) formData.append("version", project.version);
  if (project.targetUrl) formData.append("targetUrl", project.targetUrl);
  if (project.icon) {
    // convert Base64 back to blob
    const blob = dataURLtoBlob(project.icon);
    formData.append("icon", blob, "icon.png");
  }

  // Send to backend
  fetch("/upload", {
    method: "POST",
    body: formData
  })
    .then(res => res.text())
    .then(msg => status(msg, true))
    .catch(err => status("❌ " + err));
}

function status(msg, success = false) {
  statusBox.style.color = success ? "#b6ffb6" : "#ffd6d6";
  statusBox.innerText = msg;
}

// Helper: convert Base64 icon to Blob
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], {type:mime});
}

/*************************************************
 * SOCKET.IO (if backend exists)
 *************************************************/
try {
  const socket = io();

  socket.on("apk_ready", data => {
    alert("✅ APK is ready!");
    window.location.href = data.url;
  });
} catch (e) {
  console.warn("Socket.IO backend not connected");
}