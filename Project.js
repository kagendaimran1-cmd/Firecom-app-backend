const iconInput = document.getElementById("iconInput");
const iconPreview = document.getElementById("iconPreview");

function saveProject() {
  const appName = document.getElementById("appName").value.trim();
  const packageName = document.getElementById("packageName").value.trim();
  const version = document.getElementById("version").value.trim();
  const targetUrl = document.getElementById("targetUrl").value.trim();

  if (!appName || !packageName || !version || !targetUrl) {
    alert("❌ Please fill all fields");
    return;
  }

  const formData = new FormData();
  formData.append("appName", appName);
  formData.append("packageName", packageName);
  formData.append("version", version);
  formData.append("targetUrl", targetUrl);

  if (iconInput.files.length > 0) {
    formData.append("icon", iconInput.files[0]);
  }

  // Send to backend
  fetch("/upload_project", {
    method: "POST",
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("✅ Project saved! APK build started");
        // Redirect to app page
        window.location.href = "app.html";
      } else {
        alert("❌ Error: " + data.message);
      }
    })
    .catch(err => alert("❌ Network error: " + err));
}

// Preview icon
iconInput.addEventListener("change", () => {
  const file = iconInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    iconPreview.src = reader.result;
    iconPreview.style.display = "block";
  };
  reader.readAsDataURL(file);
});