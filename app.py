import os
import shutil
import uuid
import subprocess

from flask import (
    Flask,
    render_template,
    request,
    send_from_directory,
    jsonify
)
from flask_socketio import SocketIO

# =========================
# APP CONFIG
# =========================
app = Flask(__name__)
app.config['SECRET_KEY'] = "web2apk-secret"

socketio = SocketIO(app, cors_allowed_origins="*")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =========================
# FOLDERS
# =========================
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
BUILD_FOLDER = os.path.join(BASE_DIR, 'builds')
TMP_FOLDER = os.path.join(BASE_DIR, 'tmp')

ANDROID_TEMPLATE = os.path.join(
    BASE_DIR,
    'engine/android-template/app'
)

WEBSITE_FOLDER = os.path.join(BASE_DIR, 'website')

for folder in [UPLOAD_FOLDER, BUILD_FOLDER, TMP_FOLDER, WEBSITE_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# =========================
# APK BUILD FUNCTION
# =========================
def build_apk(zip_path, project_settings, project_id=None):
    if project_id is None:
        project_id = str(uuid.uuid4())

    dst_path = ANDROID_TEMPLATE
    build_dir = os.path.join(BUILD_FOLDER, project_id)
    temp_dir = os.path.join(TMP_FOLDER, project_id)

    # Clean previous template
    if os.path.exists(dst_path):
        shutil.rmtree(dst_path)
    os.makedirs(dst_path, exist_ok=True)

    # Prepare temp folder
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    # Extract ZIP
    print(f"[INFO] Extracting ZIP: {zip_path}")
    shutil.unpack_archive(zip_path, temp_dir)

    # Copy extracted files into Android template
    for item in os.listdir(temp_dir):
        s = os.path.join(temp_dir, item)
        d = os.path.join(dst_path, item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
        print(f"[INFO] Copied: {item}")

    # Apply project settings
    # e.g., replace app name, package, version in build.gradle or AndroidManifest.xml
    manifest_path = os.path.join(dst_path, 'src/main/AndroidManifest.xml')
    gradle_path = os.path.join(dst_path, '../../build.gradle')
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('com.example.app', project_settings.get('packageName', 'com.example.app'))
        content = content.replace('APP_NAME', project_settings.get('appName', 'MyApp'))
        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(content)

    if os.path.exists(gradle_path):
        with open(gradle_path, 'r', encoding='utf-8') as f:
            content = f.read()
        content = content.replace('1.0.0', project_settings.get('version', '1.0.0'))
        with open(gradle_path, 'w', encoding='utf-8') as f:
            f.write(content)

    # Save app icon if provided
    icon_path = os.path.join(dst_path, 'src/main/res/mipmap-xxxhdpi/ic_launcher.png')
    if project_settings.get('icon_path') and os.path.exists(project_settings['icon_path']):
        shutil.copy2(project_settings['icon_path'], icon_path)
        print("[INFO] App icon applied")

    os.makedirs(build_dir, exist_ok=True)

    # Run Gradle build
    print("[INFO] Running Gradle build...")
    subprocess.run(
        ['./gradlew', 'assembleDebug'],
        cwd=os.path.join(BASE_DIR, 'engine/android-template'),
        check=False
    )

    # Notify client
    socketio.emit(
        'apk_ready',
        {'url': f'/download/{project_id}'}
    )

    print(f"[INFO] APK ready: /download/{project_id}")
    return project_id

# =========================
# ROUTES (WEBSITE)
# =========================

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/app')
def app_page():
    return render_template('app.html')


@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(WEBSITE_FOLDER, filename)

# =========================
# RECEIVE PROJECT SETTINGS (icon, metadata)
# =========================
@app.route('/upload_project', methods=['POST'])
def upload_project():
    try:
        project_id = str(uuid.uuid4())
        project_settings = {
            'appName': request.form.get('appName'),
            'packageName': request.form.get('packageName'),
            'version': request.form.get('version'),
            'targetUrl': request.form.get('targetUrl')
        }

        # Save icon if uploaded
        if 'icon' in request.files:
            icon_file = request.files['icon']
            icon_path = os.path.join(TMP_FOLDER, f"{project_id}_icon.png")
            icon_file.save(icon_path)
            project_settings['icon_path'] = icon_path

        # Save to temporary storage
        tmp_path = os.path.join(TMP_FOLDER, f"{project_id}.json")
        import json
        with open(tmp_path, 'w') as f:
            json.dump(project_settings, f)

        return jsonify({'success': True, 'project_id': project_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

# =========================
# UPLOAD ZIP + BUILD
# =========================
@app.route('/upload', methods=['POST'])
def upload_zip():
    if 'file' not in request.files:
        return "No file part", 400

    file = request.files['file']
    if file.filename == '':
        return "No selected file", 400
    if not file.filename.endswith('.zip'):
        return "Invalid file type", 400

    project_id = str(uuid.uuid4())
    zip_path = os.path.join(UPLOAD_FOLDER, f"{project_id}.zip")
    file.save(zip_path)

    # Retrieve project settings from frontend
    project_settings = {
        'appName': request.form.get('appName'),
        'packageName': request.form.get('packageName'),
        'version': request.form.get('version')
    }

    if 'icon' in request.files:
        icon_file = request.files['icon']
        icon_path = os.path.join(TMP_FOLDER, f"{project_id}_icon.png")
        icon_file.save(icon_path)
        project_settings['icon_path'] = icon_path

    try:
        build_apk(zip_path, project_settings, project_id)
        return "Build started!", 200
    except Exception as e:
        return f"Build failed: {e}", 500

# =========================
# DOWNLOAD APK
# =========================
@app.route('/download/<project_id>')
def download_apk(project_id):
    apk_folder = os.path.join(BUILD_FOLDER, project_id)
    apk_file = 'app-debug.apk'
    return send_from_directory(apk_folder, apk_file, as_attachment=True)

# =========================
# SERVER START
# =========================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8000))
    socketio.run(app, host='0.0.0.0', port=port)
