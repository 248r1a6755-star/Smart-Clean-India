// ----------------------
// Smart Clean India - front-end only
// ----------------------

// DOM
const startCameraBtn = document.getElementById('startCameraBtn');
const stopCameraBtn = document.getElementById('stopCameraBtn');
const captureBtn = document.getElementById('captureBtn');
const video = document.getElementById('videoPreview');
const canvas = document.getElementById('snapshotCanvas');
const photoPreview = document.getElementById('photoPreview');
const fileInput = document.getElementById('fileInput');
const locationText = document.getElementById('locationText');
const nearestBinText = document.getElementById('nearestBinText');
const shareBtn = document.getElementById('shareBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const mailtoBtn = document.getElementById('mailtoBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const binsListEl = document.getElementById('binsList');
const findNearestBtn = document.getElementById('findNearestBtn');
const reportPreview = document.getElementById('reportPreview');
const notesEl = document.getElementById('notes');

let stream = null;
let currentImageBlob = null;
let currentLat = null, currentLon = null;

// Example bins (replace with real coordinates)
const BINS = [
  { name: "Bin - MG Road", lat: 17.3850, lon: 78.4867 },
  { name: "Bin - Jubilee Hills", lat: 17.4325, lon: 78.4044 },
  { name: "Bin - Banjara Hills", lat: 17.4190, lon: 78.4280 },
  { name: "Bin - Necklace Road", lat: 17.4120, lon: 78.4730 },
  { name: "Bin - Public Park", lat: 17.3950, lon: 78.4790 }
];

// Populate bins list
for (let b of BINS) {
  const div = document.createElement('div');
  div.className = 'bin';
  div.textContent = b.name + " — " + b.lat.toFixed(5) + ", " + b.lon.toFixed(5);
  binsListEl.appendChild(div);
}

// Utility: Haversine distance (km)
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get location
async function fetchLocation() {
  if (!navigator.geolocation) {
    locationText.innerHTML = "Location: <em>Geolocation not supported</em>";
    return;
  }
  locationText.innerHTML = "Location: <em>Getting location…</em>";
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(pos => {
      currentLat = pos.coords.latitude;
      currentLon = pos.coords.longitude;
      locationText.innerHTML = `Location: ${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`;
      resolve(pos);
    }, err => {
      locationText.innerHTML = `Location: <em>Permission denied or unavailable</em>`;
      reject(err);
    }, { enableHighAccuracy: true, timeout: 10000 });
  });
}

// Find nearest bin
function findNearestBin() {
  if (currentLat == null || currentLon == null) {
    nearestBinText.textContent = "Nearest bin: (location unknown — click Find Nearest)";
    return null;
  }
  let minD = Infinity, minIdx = -1;
  for (let i=0;i<BINS.length;i++){
    const d = distanceKm(currentLat, currentLon, BINS[i].lat, BINS[i].lon);
    if (d < minD) { minD = d; minIdx = i; }
  }
  const b = BINS[minIdx];
  nearestBinText.textContent = `Nearest bin: ${b.name} — ${minD.toFixed(2)} km`;
  return { bin: b, distanceKm: minD };
}

// Prepare report text
function prepareReportText() {
  const timeStr = new Date().toLocaleString();
  const notes = notesEl.value.trim();
  const coords = (currentLat && currentLon) ? `${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}` : "Unknown";
  const nearest = findNearestBin();
  const nearestText = nearest ? `${nearest.bin.name} (${nearest.distanceKm.toFixed(2)} km)` : "Unknown";
  const msg = [
    "Smart Clean India — Garbage Report",
    `Time: ${timeStr}`,
    `Location: ${coords}`,
    `Nearest Bin: ${nearestText}`,
    notes ? `Notes: ${notes}` : "",
    "",
    "Please take necessary action. Reported via Smart Clean India app."
  ].filter(Boolean).join("\n");
  reportPreview.textContent = msg;
  return msg;
}

// Start camera
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio:false });
    video.srcObject = stream;
    video.style.display = 'block';
    photoPreview.style.display = 'none';
  } catch(err) {
    alert("Could not open camera: " + err.message + "\nIf you're on desktop, try Upload Photo or use https + allow camera permission.");
  }
}

// Stop camera
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
  }
}

// Capture from video
function capturePhotoFromVideo() {
  if (!stream) {
    alert("Camera not started. Click 'Open Camera' first or use Upload Photo.");
    return;
  }
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 960;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  canvas.toBlob(blob => {
    currentImageBlob = blob;
    const url = URL.createObjectURL(blob);
    photoPreview.src = url;
    photoPreview.style.display = 'block';
    prepareReportText();
  }, 'image/jpeg', 0.9);
}

// File upload
fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (!f) return;
  currentImageBlob = f;
  const url = URL.createObjectURL(f);
  photoPreview.src = url;
  photoPreview.style.display = 'block';
  prepareReportText();
});

// Buttons
startCameraBtn.addEventListener('click', async () => {
  await startCamera();
  fetchLocation().then(()=> prepareReportText()).catch(()=>prepareReportText());
});
stopCameraBtn.addEventListener('click', () => { stopCamera(); });
captureBtn.addEventListener('click', () => { capturePhotoFromVideo(); });

findNearestBtn.addEventListener('click', async () => {
  try {
    await fetchLocation();
    const nearest = findNearestBin();
    prepareReportText();
    if (nearest) {
      const lat = nearest.bin.lat, lon = nearest.bin.lon;
      if (confirm(`Open Google Maps for navigation to ${nearest.bin.name}?`)) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
      }
    }
  } catch(err) {
    alert("Could not get location: " + err.message);
  }
});

// Share
shareBtn.addEventListener('click', async () => {
  const text = prepareReportText();
  if (navigator.canShare && currentImageBlob && navigator.canShare({ files: [currentImageBlob] })) {
    try {
      await navigator.share({
        title: 'Garbage Report',
        text: text,
        files: [currentImageBlob]
      });
      alert('Shared successfully.');
      return;
    } catch(err) { alert('Share cancelled: ' + err.message); }
  }
  if (navigator.share) {
    try { await navigator.share({ title:'Garbage Report', text: text }); return; }
    catch(err) {}
  }
  try {
    await navigator.clipboard.writeText(text);
    alert('Report text copied. Please attach the image manually.');
  } catch (e) {
    alert('Unable to copy. Select the text manually.');
  }
});

// WhatsApp
whatsappBtn.addEventListener('click', () => {
  const text = encodeURIComponent(prepareReportText());
  window.open(`https://wa.me/?text=${text}`, '_blank');
});

// Email
mailtoBtn.addEventListener('click', () => {
  const ghmcEmail = 'ghmc@example.com'; // replace with real address
  const subj = encodeURIComponent('Garbage Report from Smart Clean India');
  const body = encodeURIComponent(prepareReportText() + '\n\n(Attach the image manually)');
  window.location.href = `mailto:${ghmcEmail}?subject=${subj}&body=${body}`;
});

// Download image
downloadBtn.addEventListener('click', () => {
  if (!currentImageBlob) { alert('No image yet.'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(currentImageBlob);
  a.download = 'garbage_report.jpg';
  a.click();
  URL.revokeObjectURL(a.href);
});

// Copy text
copyBtn.addEventListener('click', async () => {
  const txt = prepareReportText();
  try {
    await navigator.clipboard.writeText(txt);
    alert('Report copied to clipboard.');
  } catch(e) {
    alert('Copy failed. Select the text manually.');
  }
});

// Update report when notes change
notesEl.addEventListener('input', () => prepareReportText());

// Initial
prepareReportText();
window.addEventListener('beforeunload', () => { stopCamera(); });
