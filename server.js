import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { execSync } from 'child_process';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

// NAS root - symlinks to all mounted shares
const NAS_ROOT = path.join(process.env.HOME || '/Users/icanacademy', 'FileBrowser', 'NAS_Root');

// Junk files/folders to hide
const JUNK_NAMES = new Set([
  '$RECYCLE.BIN', 'Thumbs.db', '.DS_Store', '.Trashes',
  'Network Trashes Folder', 'desktop.ini', '.Spotlight-V100',
  '.fseventsd', '.TemporaryItems', '@eaDir', '#recycle',
]);

function isJunk(name) {
  if (JUNK_NAMES.has(name)) return true;
  if (name.startsWith('~$')) return true;
  if (name.startsWith('._')) return true;
  if (name.startsWith('.ip')) return true;
  if (name.endsWith('.exe') || name.endsWith('.lnk')) return true;
  return false;
}

function getFileType(name) {
  const ext = path.extname(name).toLowerCase();
  const typeMap = {
    '.pdf': 'pdf',
    '.doc': 'doc', '.docx': 'doc', '.rtf': 'doc', '.txt': 'doc', '.odt': 'doc',
    '.xls': 'spreadsheet', '.xlsx': 'spreadsheet', '.csv': 'spreadsheet', '.ods': 'spreadsheet',
    '.ppt': 'presentation', '.pptx': 'presentation', '.odp': 'presentation',
    '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image',
    '.bmp': 'image', '.svg': 'image', '.webp': 'image', '.ico': 'image',
    '.mp4': 'video', '.avi': 'video', '.mov': 'video', '.mkv': 'video',
    '.wmv': 'video', '.flv': 'video', '.webm': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.flac': 'audio', '.aac': 'audio',
    '.ogg': 'audio', '.wma': 'audio', '.m4a': 'audio',
    '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive',
    '.gz': 'archive',
  };
  return typeMap[ext] || 'file';
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
}

// Volume/HDD detection from NAS mounts
let volumeMap = {};

function buildVolumeMap() {
  try {
    const output = execSync('df -k 2>/dev/null').toString();
    const lines = output.trim().split('\n').slice(1);
    const sizeGroups = {}; // group mount points by total size

    for (const line of lines) {
      if (!line.includes('192.168.68.142')) continue;
      const parts = line.split(/\s+/);
      const totalKB = parseInt(parts[1]);
      const mountPoint = parts[parts.length - 1]; // e.g. /Volumes/ICAN-MATERIALS

      // Group by total size (same physical volume = same total size)
      if (!sizeGroups[totalKB]) sizeGroups[totalKB] = [];
      sizeGroups[totalKB].push(mountPoint);
    }

    // Sort groups by size descending, assign HDD 1 = largest, HDD 2 = next
    const sizes = Object.keys(sizeGroups).map(Number).sort((a, b) => b - a);
    sizes.forEach((size, i) => {
      const hddLabel = `HDD ${i + 1}`;
      const totalGB = (size / 1024 / 1024).toFixed(1);
      for (const mp of sizeGroups[size]) {
        volumeMap[mp] = { hdd: hddLabel, totalGB: `${totalGB} GB` };
      }
    });

    console.log('Volume map:', volumeMap);
  } catch (err) {
    console.error('Could not build volume map:', err.message);
  }
}

buildVolumeMap();

function getVolumeForPath(realPath) {
  // Find which mount point this path falls under
  let bestMatch = null;
  let bestLen = 0;
  for (const mp of Object.keys(volumeMap)) {
    if (realPath.startsWith(mp) && mp.length > bestLen) {
      bestMatch = mp;
      bestLen = mp.length;
    }
  }
  return bestMatch ? volumeMap[bestMatch] : null;
}

// ============ Admin Auth ============
const ADMIN_PIN = 'wecaninican';
const adminTokens = new Set();
let failedAttempts = 0;
let lockoutUntil = 0;

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
}

// Top-level shares that cannot be deleted
const PROTECTED_ROOTS = new Set();
try {
  const rootEntries = fs.readdirSync(NAS_ROOT, { withFileTypes: true });
  for (const e of rootEntries) {
    if (!isJunk(e.name)) PROTECTED_ROOTS.add('/' + e.name);
  }
} catch {}

function isProtectedRoot(reqPath) {
  const normalized = reqPath.startsWith('/') ? reqPath : '/' + reqPath;
  // Check if this is a top-level share (e.g. /ICAN-MATERIALS, /Data)
  const parts = normalized.split('/').filter(Boolean);
  return parts.length === 1 && PROTECTED_ROOTS.has('/' + parts[0]);
}

function resolveAndValidate(reqPath) {
  const fullPath = path.join(NAS_ROOT, reqPath);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(NAS_ROOT)) return null;
  return resolved;
}

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Admin-Token');
  next();
});

// GET /api/files?path=/
app.get('/api/files', (req, res) => {
  const reqPath = req.query.path || '/';
  const fullPath = path.join(NAS_ROOT, reqPath);

  // Security: prevent directory traversal
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(NAS_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }

    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (isJunk(entry.name)) continue;

      try {
        const entryPath = path.join(resolved, entry.name);
        let isDir = entry.isDirectory();
        let size = null;
        let mtime = new Date();

        // Handle symlinks
        try {
          const realStat = fs.statSync(entryPath);
          isDir = realStat.isDirectory();
          size = realStat.size;
          mtime = realStat.mtime;
        } catch {
          // Broken symlink, skip
          continue;
        }

        // Resolve real path for volume detection
        let volume = null;
        try {
          const realPath = fs.realpathSync(entryPath);
          volume = getVolumeForPath(realPath);
        } catch {}

        files.push({
          name: entry.name,
          type: isDir ? 'folder' : getFileType(entry.name),
          size: isDir ? null : formatSize(size),
          sizeBytes: size,
          lastModified: mtime.toISOString().split('T')[0],
          path: path.join(reqPath, entry.name).replace(/\\/g, '/'),
          isDir,
          volume: volume ? volume.hdd : null,
        });
      } catch {
        // Skip entries we can't stat
        continue;
      }
    }

    // Sort: folders first, then alphabetically
    files.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    // Detect volume for current directory
    let dirVolume = null;
    try {
      const realDir = fs.realpathSync(resolved);
      const vol = getVolumeForPath(realDir);
      if (vol) dirVolume = vol.hdd;
    } catch {}

    res.json({
      path: reqPath,
      files,
      parent: reqPath === '/' ? null : path.dirname(reqPath),
      volume: dirVolume,
    });
  } catch (err) {
    console.error('Error reading directory:', err.message);
    res.status(500).json({ error: 'Failed to read directory', detail: err.message });
  }
});

// GET /api/download?path=/some/file.pdf
app.get('/api/download', (req, res) => {
  const reqPath = req.query.path;
  if (!reqPath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const fullPath = path.join(NAS_ROOT, reqPath);
  const resolved = path.resolve(fullPath);

  if (!resolved.startsWith(NAS_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download a directory' });
    }
    res.download(resolved, path.basename(resolved));
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

// JSON body parsing
app.use(express.json());

// Multer setup - temp storage, then move to target
const upload = multer({ dest: '/tmp/cosmodrive-uploads' });

// POST /api/mkdir  { path: "/Teachers/Grace/NewFolder" }
// Special case: creating a folder directly under /Teachers/ creates it on the NAS
// (inside Home.teachers share) and symlinks it, so it's not just a local folder.
app.post('/api/mkdir', (req, res) => {
  const reqPath = req.body.path;
  if (!reqPath) {
    return res.status(400).json({ error: 'Path required' });
  }

  const fullPath = path.join(NAS_ROOT, reqPath);
  const resolved = path.resolve(fullPath);

  if (!resolved.startsWith(NAS_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    if (fs.existsSync(resolved)) {
      return res.status(409).json({ error: 'Folder already exists' });
    }

    // Check if creating a folder directly under /Teachers/
    const parts = reqPath.split('/').filter(Boolean);
    if (parts.length === 2 && parts[0] === 'Teachers') {
      // Create on NAS HDD 2 (Data share) + symlink
      const folderName = parts[1];
      const nasPath = path.join('/Volumes/Data/TeacherHomes', folderName);
      if (fs.existsSync(nasPath)) {
        return res.status(409).json({ error: 'Folder already exists on NAS' });
      }
      fs.mkdirSync(nasPath, { recursive: true });
      fs.symlinkSync(nasPath, resolved);
      console.log(`Created NAS folder on HDD 2: ${nasPath} -> symlinked at ${resolved}`);
    } else {
      // Normal mkdir (path resolves through symlinks to NAS automatically)
      fs.mkdirSync(resolved, { recursive: true });
    }

    res.json({ ok: true, path: reqPath });
  } catch (err) {
    console.error('Error creating folder:', err.message);
    res.status(500).json({ error: 'Failed to create folder', detail: err.message });
  }
});

// POST /api/upload?path=/Teachers/Grace
app.post('/api/upload', upload.array('files', 20), (req, res) => {
  const reqPath = req.query.path || '/';
  const targetDir = path.join(NAS_ROOT, reqPath);
  const resolved = path.resolve(targetDir);

  if (!resolved.startsWith(NAS_ROOT)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return res.status(400).json({ error: 'Target directory does not exist' });
  }

  const uploaded = [];
  for (const file of req.files) {
    const destPath = path.join(resolved, file.originalname);
    try {
      fs.renameSync(file.path, destPath);
      uploaded.push(file.originalname);
    } catch (err) {
      // rename across devices fails, fallback to copy
      try {
        fs.copyFileSync(file.path, destPath);
        fs.unlinkSync(file.path);
        uploaded.push(file.originalname);
      } catch (copyErr) {
        console.error('Upload error:', copyErr.message);
      }
    }
  }

  res.json({ ok: true, uploaded, count: uploaded.length });
});

// GET /api/storage - NAS storage info
app.get('/api/storage', (req, res) => {
  try {
    // Count top-level items
    const entries = fs.readdirSync(NAS_ROOT, { withFileTypes: true });
    const shares = entries.filter(e => !isJunk(e.name)).length;
    res.json({ shares, nasIp: '192.168.68.142', hostname: 'ICANdrive' });
  } catch {
    res.json({ shares: 0, nasIp: '192.168.68.142', hostname: 'ICANdrive' });
  }
});

// ============ Admin Endpoints ============

// POST /api/admin/auth — PIN authentication
app.post('/api/admin/auth', (req, res) => {
  const now = Date.now();
  if (now < lockoutUntil) {
    const remaining = Math.ceil((lockoutUntil - now) / 1000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${remaining}s` });
  }

  const { pin } = req.body;
  if (pin !== ADMIN_PIN) {
    failedAttempts++;
    if (failedAttempts >= 5) {
      lockoutUntil = now + 60000;
      failedAttempts = 0;
      return res.status(429).json({ error: 'Too many attempts. Locked for 60 seconds' });
    }
    return res.status(403).json({ error: 'Invalid PIN' });
  }

  failedAttempts = 0;
  const token = crypto.randomBytes(32).toString('hex');
  adminTokens.add(token);
  console.log('Admin session started');
  res.json({ ok: true, token });
});

// POST /api/admin/logout
app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers['x-admin-token'];
  adminTokens.delete(token);
  res.json({ ok: true });
});

// POST /api/admin/delete — delete a file or folder
app.post('/api/admin/delete', requireAdmin, (req, res) => {
  const { path: reqPath } = req.body;
  if (!reqPath) return res.status(400).json({ error: 'Path required' });

  if (isProtectedRoot(reqPath)) {
    return res.status(403).json({ error: 'Cannot delete top-level shares' });
  }

  const resolved = resolveAndValidate(reqPath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });

  try {
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      fs.rmSync(resolved, { recursive: true, force: true });
    } else {
      fs.unlinkSync(resolved);
    }
    console.log(`Admin deleted: ${reqPath}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Admin delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete', detail: err.message });
  }
});

// POST /api/admin/rename — rename a file or folder
app.post('/api/admin/rename', requireAdmin, (req, res) => {
  const { path: reqPath, newName } = req.body;
  if (!reqPath || !newName) return res.status(400).json({ error: 'Path and newName required' });
  if (newName.includes('/') || newName.includes('\\')) {
    return res.status(400).json({ error: 'Invalid name' });
  }

  if (isProtectedRoot(reqPath)) {
    return res.status(403).json({ error: 'Cannot rename top-level shares' });
  }

  const resolved = resolveAndValidate(reqPath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });

  const newPath = path.join(path.dirname(resolved), newName);
  if (fs.existsSync(newPath)) {
    return res.status(409).json({ error: 'An item with that name already exists' });
  }

  try {
    fs.renameSync(resolved, newPath);
    const parentReqPath = path.dirname(reqPath);
    const newReqPath = path.join(parentReqPath, newName).replace(/\\/g, '/');
    console.log(`Admin renamed: ${reqPath} -> ${newReqPath}`);
    res.json({ ok: true, newPath: newReqPath });
  } catch (err) {
    console.error('Admin rename error:', err.message);
    res.status(500).json({ error: 'Failed to rename', detail: err.message });
  }
});

// POST /api/admin/move — move files to a destination folder
app.post('/api/admin/move', requireAdmin, (req, res) => {
  const { paths, destination } = req.body;
  if (!paths || !Array.isArray(paths) || !destination) {
    return res.status(400).json({ error: 'paths (array) and destination required' });
  }

  const destResolved = resolveAndValidate(destination);
  if (!destResolved) return res.status(403).json({ error: 'Access denied' });

  if (!fs.existsSync(destResolved) || !fs.statSync(destResolved).isDirectory()) {
    return res.status(400).json({ error: 'Destination is not a valid directory' });
  }

  const results = [];
  for (const reqPath of paths) {
    if (isProtectedRoot(reqPath)) {
      results.push({ path: reqPath, ok: false, error: 'Cannot move top-level shares' });
      continue;
    }

    const srcResolved = resolveAndValidate(reqPath);
    if (!srcResolved) {
      results.push({ path: reqPath, ok: false, error: 'Access denied' });
      continue;
    }

    const itemName = path.basename(srcResolved);
    const destItemPath = path.join(destResolved, itemName);

    if (fs.existsSync(destItemPath)) {
      results.push({ path: reqPath, ok: false, error: 'Item already exists in destination' });
      continue;
    }

    try {
      fs.renameSync(srcResolved, destItemPath);
      results.push({ path: reqPath, ok: true });
    } catch (err) {
      // Cross-device move: copy + delete fallback
      try {
        if (fs.statSync(srcResolved).isDirectory()) {
          fs.cpSync(srcResolved, destItemPath, { recursive: true });
        } else {
          fs.copyFileSync(srcResolved, destItemPath);
        }
        fs.rmSync(srcResolved, { recursive: true, force: true });
        results.push({ path: reqPath, ok: true });
      } catch (copyErr) {
        results.push({ path: reqPath, ok: false, error: copyErr.message });
      }
    }
  }

  console.log(`Admin moved ${results.filter(r => r.ok).length}/${paths.length} items to ${destination}`);
  res.json({ ok: true, results });
});

// POST /api/admin/bulk-delete — delete multiple items
app.post('/api/admin/bulk-delete', requireAdmin, (req, res) => {
  const { paths } = req.body;
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: 'paths (array) required' });
  }

  const results = [];
  for (const reqPath of paths) {
    if (isProtectedRoot(reqPath)) {
      results.push({ path: reqPath, ok: false, error: 'Cannot delete top-level shares' });
      continue;
    }

    const resolved = resolveAndValidate(reqPath);
    if (!resolved) {
      results.push({ path: reqPath, ok: false, error: 'Access denied' });
      continue;
    }

    try {
      if (!fs.existsSync(resolved)) {
        results.push({ path: reqPath, ok: false, error: 'Not found' });
        continue;
      }
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        fs.rmSync(resolved, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolved);
      }
      results.push({ path: reqPath, ok: true });
    } catch (err) {
      results.push({ path: reqPath, ok: false, error: err.message });
    }
  }

  console.log(`Admin bulk-deleted ${results.filter(r => r.ok).length}/${paths.length} items`);
  res.json({ ok: true, results });
});

// GET /api/admin/tree?path=/ — folder tree for move dialog
app.get('/api/admin/tree', requireAdmin, (req, res) => {
  const reqPath = req.query.path || '/';
  const resolved = resolveAndValidate(reqPath);
  if (!resolved) return res.status(403).json({ error: 'Access denied' });

  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const folders = [];

    for (const entry of entries) {
      if (isJunk(entry.name)) continue;
      try {
        const entryPath = path.join(resolved, entry.name);
        const realStat = fs.statSync(entryPath);
        if (realStat.isDirectory()) {
          const childPath = path.join(reqPath, entry.name).replace(/\\/g, '/');
          // Check if it has subdirectories
          let hasChildren = false;
          try {
            const children = fs.readdirSync(entryPath, { withFileTypes: true });
            hasChildren = children.some(c => {
              if (isJunk(c.name)) return false;
              try { return fs.statSync(path.join(entryPath, c.name)).isDirectory(); }
              catch { return false; }
            });
          } catch {}

          folders.push({
            name: entry.name,
            path: childPath,
            hasChildren,
          });
        }
      } catch { continue; }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    res.json({ path: reqPath, folders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read directory', detail: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CosmoDrive API server running on http://localhost:${PORT}`);
  console.log(`Serving files from: ${NAS_ROOT}`);
});
