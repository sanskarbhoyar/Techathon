/* ============================================================
   WasteWise v2 – script.js  (No-AI Build)

   FEATURES:
   1. PHOTO + TEXT CLASSIFIER
      - Open live camera OR upload image from gallery
      - Animated scan-frame viewfinder with laser line
      - User sees their photo, then types the item name
      - Classified instantly from local WASTE_DB — no API needed
      - Returns: bin type, reason, tip — earn 15 XP on confirm

   2. GPS AUTO-TAG & REVERSE GEOCODING
      - navigator.geolocation grabs lat/lon (no typing needed)
      - OpenStreetMap Nominatim converts coords → readable address
      - Auto-triggers after result appears
      - Also used in pickup request form — one click fills address
      - Shows coords, accuracy, and "Open in Maps" link
      - Geo-tagged confirmations earn the "Location Hero" badge
   ============================================================ */

// ─────────────────────────────────────────────────────────────
// SECTION 1: WASTE DATABASE
// ─────────────────────────────────────────────────────────────
const WASTE_DB = {
  // ── WET / ORGANIC ──
  "banana peel":        { bin:"wet",    icon:"🍌", why:"Banana peels are organic matter that break down quickly in composting.", tip:"Put directly in the green/wet bin. Even better — compost at home!", co2:12 },
  "vegetable peelings": { bin:"wet",    icon:"🥕", why:"All vegetable scraps are biodegradable organic waste.", tip:"Collect in a small kitchen bin and empty daily.", co2:10 },
  "leftover food":      { bin:"wet",    icon:"🍛", why:"Food waste is organic — compost it, don't landfill it.", tip:"Drain excess liquid before putting in wet bin.", co2:18 },
  "tea leaves":         { bin:"wet",    icon:"🍵", why:"Tea leaves and coffee grounds are excellent compost material.", tip:"Remove staples from tea bags first.", co2:8 },
  "coffee grounds":     { bin:"wet",    icon:"☕", why:"Coffee grounds are rich in nitrogen — great for compost.", tip:"Add to wet bin or sprinkle on plants.", co2:8 },
  "egg shells":         { bin:"wet",    icon:"🥚", why:"Egg shells are organic and add calcium to compost.", tip:"Rinse and crush before adding.", co2:6 },
  "garden waste":       { bin:"wet",    icon:"🌿", why:"Leaves, grass, and plant trimmings are organic matter.", tip:"Use for mulching or compost pile.", co2:20 },
  "fruit peels":        { bin:"wet",    icon:"🍊", why:"Fruit peels decompose naturally and enrich compost.", tip:"Great for home composting.", co2:10 },
  "flowers":            { bin:"wet",    icon:"🌸", why:"Wilted flowers and plant matter are biodegradable.", tip:"Remove wire or tape decorations first.", co2:5 },
  "hair":               { bin:"wet",    icon:"💇", why:"Human and pet hair is organic and biodegradable.", tip:"Can be added to compost — adds nitrogen.", co2:2 },
  // ── DRY / RECYCLABLE ──
  "plastic bottle":     { bin:"dry",    icon:"🥤", why:"PET plastic bottles are highly recyclable if clean.", tip:"Rinse, remove cap, and crush to save space.", co2:30 },
  "newspaper":          { bin:"dry",    icon:"📰", why:"Newspaper is recyclable paper — keep it dry.", tip:"Wet or oily paper is not recyclable.", co2:15 },
  "cardboard":          { bin:"dry",    icon:"📦", why:"Cardboard is one of the most recyclable materials.", tip:"Flatten the box to save space.", co2:22 },
  "glass bottle":       { bin:"dry",    icon:"🍾", why:"Glass is 100% recyclable without quality loss.", tip:"Rinse it out before recycling.", co2:40 },
  "tin can":            { bin:"dry",    icon:"🥫", why:"Steel/tin cans are easily recyclable metals.", tip:"Rinse, remove lid carefully.", co2:35 },
  "aluminium can":      { bin:"dry",    icon:"🥤", why:"Aluminium recycling saves 95% energy vs making new.", tip:"Rinse and crush. Still recyclable!", co2:50 },
  "paper":              { bin:"dry",    icon:"📄", why:"Clean paper is recyclable. Keep dry and grease-free.", tip:"Avoid shredded paper — harder to recycle.", co2:12 },
  "clothes":            { bin:"dry",    icon:"👕", why:"Old clothes can be donated or given to textile recyclers.", tip:"Donate if wearable. Recycle only if damaged.", co2:20 },
  "book":               { bin:"dry",    icon:"📚", why:"Books can be donated, sold, or recycled as paper.", tip:"Recycle only if too damaged to read.", co2:14 },
  "milk carton":        { bin:"dry",    icon:"🥛", why:"Tetra Pak cartons are recyclable in many cities.", tip:"Rinse, flatten, and keep lid on.", co2:18 },
  "plastic bag":        { bin:"dry",    icon:"🛍️", why:"Many plastic bags are recyclable at collection points.", tip:"Take to supermarket drop-off — not kerbside.", co2:8 },
  // ── HAZARDOUS ──
  "battery":            { bin:"haz",    icon:"🔋", why:"Batteries contain toxic lead, cadmium, lithium that leach into soil.", tip:"Take to battery drop-off at supermarket or electronics store. Never bin!", co2:0 },
  "medicine bottle":    { bin:"haz",    icon:"💊", why:"Old medicines pollute water — never flush them.", tip:"Return to pharmacy — many have take-back programs.", co2:0 },
  "paint can":          { bin:"haz",    icon:"🎨", why:"Paint contains volatile organic compounds (VOCs).", tip:"Let latex paint dry out first. Drop oil-based at hazmat sites.", co2:0 },
  "insecticide":        { bin:"haz",    icon:"🐛", why:"Pesticides and insecticides are toxic chemicals.", tip:"Take to a local hazardous waste facility.", co2:0 },
  "bleach":             { bin:"haz",    icon:"🧴", why:"Bleach is corrosive and harmful to waterways.", tip:"Use fully, rinse, dispose at hazmat collection.", co2:0 },
  "motor oil":          { bin:"haz",    icon:"⛽", why:"Used motor oil pollutes groundwater severely.", tip:"Take to auto parts store or recycling centre.", co2:0 },
  "thermometer":        { bin:"haz",    icon:"🌡️", why:"Mercury thermometers are extremely toxic.", tip:"Wrap carefully and take to hazardous waste drop-off.", co2:0 },
  "fluorescent bulb":   { bin:"haz",    icon:"💡", why:"Fluorescent bulbs contain mercury vapour.", tip:"Take to hardware store or lighting retailer.", co2:0 },
  "nail polish":        { bin:"haz",    icon:"💅", why:"Nail polish contains flammable solvents.", tip:"Let it dry completely before hazmat disposal.", co2:0 },
  // ── E-WASTE ──
  "old phone":          { bin:"ewaste", icon:"📱", why:"Phones contain gold, silver, and toxic metals needing special recycling.", tip:"Remove data first. Take to e-waste collection or manufacturer take-back.", co2:0 },
  "laptop":             { bin:"ewaste", icon:"💻", why:"Laptops have circuit boards with toxic and valuable metals.", tip:"Remove personal data. Take to certified e-waste recycler.", co2:0 },
  "charger":            { bin:"ewaste", icon:"🔌", why:"Chargers and cables contain copper and plastics needing e-waste processing.", tip:"Collect and donate to e-waste drives.", co2:0 },
  "headphones":         { bin:"ewaste", icon:"🎧", why:"Headphones contain small circuits and magnets — classified e-waste.", tip:"Take to electronics recycling drop box.", co2:0 },
  "printer":            { bin:"ewaste", icon:"🖨️", why:"Printers contain toxic ink, circuit boards, and mixed plastics.", tip:"Contact manufacturer for take-back or local e-waste camp.", co2:0 },
  "keyboard":           { bin:"ewaste", icon:"⌨️", why:"Keyboards are electronic peripherals classified as e-waste.", tip:"Donate if functional. Otherwise e-waste drop-off.", co2:0 },
  "television":         { bin:"ewaste", icon:"📺", why:"TVs contain lead, mercury, and rare earth metals.", tip:"Never landfill. Find a certified e-waste recycler.", co2:0 },
  "refrigerator":       { bin:"ewaste", icon:"🧊", why:"Refrigerators use refrigerants harmful to the ozone layer.", tip:"Contact your municipality for large appliance pickup.", co2:0 },
  "camera":             { bin:"ewaste", icon:"📷", why:"Digital cameras contain batteries and circuit boards — e-waste.", tip:"Donate if working, or take to e-waste collection camp.", co2:0 },
};

// Keyword aliases for fuzzy matching
const KEYWORD_MAP = {
  "peel":"banana peel","roti":"leftover food","sabji":"vegetable peelings",
  "rice":"leftover food","dal":"leftover food","food":"leftover food",
  "tea bag":"tea leaves","coffee":"coffee grounds","egg":"egg shells",
  "grass":"garden waste","leaves":"garden waste","pet":"plastic bottle",
  "pepsi":"plastic bottle","cola":"plastic bottle","water bottle":"plastic bottle",
  "paper bag":"paper","notebook":"paper","box":"cardboard","carton":"milk carton",
  "tetra":"milk carton","tin":"tin can","soda can":"aluminium can",
  "beer can":"aluminium can","jar":"glass bottle","t-shirt":"clothes",
  "jeans":"clothes","shirt":"clothes","cell":"old phone","mobile":"old phone",
  "phone":"old phone","cable":"charger","wire":"charger","usb":"charger",
  "earphone":"headphones","earbud":"headphones","aaa":"battery","aa":"battery",
  "lithium":"battery","tablet":"laptop","ipad":"laptop","medicine":"medicine bottle",
  "pills":"medicine bottle","drugs":"medicine bottle","paint":"paint can",
  "bulb":"fluorescent bulb","cfl":"fluorescent bulb","mercury":"thermometer",
  "polish":"nail polish","insect":"insecticide","spray":"insecticide",
  "oil":"motor oil","fridge":"refrigerator","ac":"refrigerator","tv":"television",
};

// Bin metadata
const BIN_META = {
  wet:    { label:"Wet / Organic Bin 🟢",    badgeClass:"badge-wet",    badgeText:"WET"       },
  dry:    { label:"Dry / Recyclable Bin 🔵", badgeClass:"badge-dry",    badgeText:"DRY"       },
  haz:    { label:"Hazardous Bin 🔴",        badgeClass:"badge-haz",    badgeText:"HAZARDOUS" },
  ewaste: { label:"E-Waste Bin 🟡",          badgeClass:"badge-ewaste", badgeText:"E-WASTE"   },
};

// ─────────────────────────────────────────────────────────────
// SECTION 2: GAME STATE (persisted in localStorage)
// ─────────────────────────────────────────────────────────────
let state = JSON.parse(localStorage.getItem("ww_state_v2") || "null") || {
  xp:          0,
  streak:      1,
  items:       0,
  co2:         0,
  todayCount:  0,
  lastDate:    new Date().toDateString(),
  bins:        { wet:0, dry:0, haz:0, ewaste:0 },
  badges:      [],
  photoScans:  0,   // counts photo-scan confirmations
  geoReports:  0,   // counts GPS-tagged confirmations
};
function saveState() { localStorage.setItem("ww_state_v2", JSON.stringify(state)); }

// ─────────────────────────────────────────────────────────────
// SECTION 3: LEVELS
// ─────────────────────────────────────────────────────────────
const LEVELS = [
  { name:"🌱 Beginner",       min:0   },
  { name:"🌿 Eco Starter",    min:50  },
  { name:"⚔️ Green Warrior",  min:150 },
  { name:"♻️ Recycler Pro",   min:300 },
  { name:"🏆 Waste Champion", min:500 },
  { name:"🌍 Planet Hero",    min:800 },
];

function getLevel(xp) { return LEVELS.filter(l => xp >= l.min).pop(); }

function getLevelProgress(xp) {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (xp >= LEVELS[i].min && xp < LEVELS[i+1].min) {
      return ((xp - LEVELS[i].min) / (LEVELS[i+1].min - LEVELS[i].min)) * 100;
    }
  }
  return 100;
}

// ─────────────────────────────────────────────────────────────
// SECTION 4: BADGES
// ─────────────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id:"first",    icon:"🌱", name:"First Step",      check: s => s.items >= 1       },
  { id:"eco10",    icon:"⚔️", name:"Eco Warrior",     check: s => s.items >= 10      },
  { id:"streak7",  icon:"👑", name:"Streak King",     check: s => s.streak >= 7      },
  { id:"recycle5", icon:"♻️", name:"Recycler",        check: s => s.bins.dry >= 5    },
  { id:"compost5", icon:"🌿", name:"Composter",       check: s => s.bins.wet >= 5    },
  { id:"xp500",    icon:"🏆", name:"Top Contributor", check: s => s.xp >= 500        },
  { id:"photo5",   icon:"📸", name:"Photo Scanner",   check: s => s.photoScans >= 5  },
  { id:"geo3",     icon:"📍", name:"Location Hero",   check: s => s.geoReports >= 3  },
];

function checkBadges() {
  let newBadge = null;
  for (let def of BADGE_DEFS) {
    if (!state.badges.includes(def.id) && def.check(state)) {
      state.badges.push(def.id);
      newBadge = def;
    }
  }
  renderBadges();
  if (newBadge) showBadgePopup(newBadge);
}

function renderBadges() {
  const els = document.querySelectorAll(".badge");
  BADGE_DEFS.forEach((def, i) => {
    if (!els[i]) return;
    const unlocked = state.badges.includes(def.id);
    els[i].classList.toggle("unlocked", unlocked);
    els[i].classList.toggle("locked",   !unlocked);
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION 5: DASHBOARD + XP
// ─────────────────────────────────────────────────────────────
function updateDashboard() {
  document.getElementById("dashXP").textContent     = state.xp;
  document.getElementById("dashStreak").textContent = state.streak;
  document.getElementById("dashItems").textContent  = state.items;
  document.getElementById("dashCO2").textContent    = state.co2 > 1000
    ? (state.co2/1000).toFixed(1) + " kg"
    : state.co2 + " g";
  document.getElementById("headerXP").textContent   = "⚡ " + state.xp + " XP";
  document.getElementById("dashLevel").textContent  = getLevel(state.xp).name;
  document.getElementById("levelBar").style.width   = getLevelProgress(state.xp) + "%";

  const bins   = state.bins;
  const maxBin = Math.max(1, bins.wet, bins.dry, bins.haz, bins.ewaste);
  const h      = v => (v / maxBin * 80) + "px";
  document.getElementById("barWet").style.height = h(bins.wet);
  document.getElementById("barDry").style.height = h(bins.dry);
  document.getElementById("barHaz").style.height = h(bins.haz);
  document.getElementById("barEW").style.height  = h(bins.ewaste);
}

function updateChallenge() {
  const count = Math.min(state.todayCount, 5);
  document.getElementById("challengeBar").style.width      = (count / 5 * 100) + "%";
  document.getElementById("challengeProgress").textContent = count + " / 5 completed";
}

function addXP(amount, msg) {
  state.xp += amount;
  showToast("+" + amount + " XP — " + msg);
  updateDashboard();
  saveState();
}

// Called whenever user confirms disposal (text or photo scan)
function logDisposal(bin, co2, isPhoto = false) {
  state.items++;
  state.bins[bin] = (state.bins[bin] || 0) + 1;
  state.co2 += co2;

  const today = new Date().toDateString();
  if (state.lastDate !== today) {
    state.lastDate   = today;
    state.todayCount = 0;
    state.streak++;
  }
  state.todayCount++;

  if (isPhoto) state.photoScans++;

  const baseXP = isPhoto ? 15 : 10;
  addXP(baseXP + (state.streak > 1 ? 5 : 0), isPhoto ? "Photo scan confirmed! 📸" : "Great disposal! 🌿");

  if (state.todayCount === 5) addXP(50, "Daily challenge complete! 🏆");

  updateChallenge();
  checkBadges();
  renderLeaderboard("individual");
  saveState();
}

// ─────────────────────────────────────────────────────────────
// SECTION 6: CLASSIFIER (shared by text section + photo section)
// ─────────────────────────────────────────────────────────────
function classifyItem(inputRaw) {
  const input = inputRaw.trim().toLowerCase();
  if (!input) return null;

  // 1. Exact match
  let result = WASTE_DB[input] || null;

  // 2. Keyword alias map
  if (!result) {
    for (let kw in KEYWORD_MAP) {
      if (input.includes(kw)) { result = WASTE_DB[KEYWORD_MAP[kw]]; break; }
    }
  }

  // 3. Partial match
  if (!result) {
    for (let key in WASTE_DB) {
      if (key.includes(input) || input.includes(key)) { result = WASTE_DB[key]; break; }
    }
  }

  return result;
}

// ── Text section classify ──
function classify(inputRaw) {
  if (!inputRaw.trim()) { showToast("⚠️ Please enter a waste item!"); return; }

  const result      = classifyItem(inputRaw);
  const resultCard  = document.getElementById("resultCard");
  const unknownCard = document.getElementById("unknownCard");

  if (result) {
    unknownCard.classList.add("hidden");
    resultCard.classList.remove("hidden");
    const meta = BIN_META[result.bin];
    document.getElementById("resultIcon").textContent     = result.icon;
    document.getElementById("resultItemName").textContent = capitalize(inputRaw.trim());
    document.getElementById("resultBinLabel").textContent = "Goes in: " + meta.label;
    document.getElementById("resultWhy").textContent      = result.why;
    document.getElementById("resultTip").textContent      = "💡 Tip: " + result.tip;
    const badge = document.getElementById("resultBadge");
    badge.textContent = meta.badgeText;
    badge.className   = "result-badge " + meta.badgeClass;
    resultCard.dataset.bin = result.bin;
    resultCard.dataset.co2 = result.co2;
  } else {
    resultCard.classList.add("hidden");
    unknownCard.classList.remove("hidden");
    document.getElementById("voteThanks").classList.add("hidden");
    document.querySelectorAll(".bin-vote").forEach(b => b.disabled = false);
  }
}

document.getElementById("classifyBtn").addEventListener("click", () => {
  classify(document.getElementById("wasteInput").value);
});
document.getElementById("wasteInput").addEventListener("keydown", e => {
  if (e.key === "Enter") classify(e.target.value);
});
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.getElementById("wasteInput").value = chip.dataset.item;
    classify(chip.dataset.item);
  });
});
document.getElementById("confirmBtn").addEventListener("click", () => {
  const rc = document.getElementById("resultCard");
  logDisposal(rc.dataset.bin, parseInt(rc.dataset.co2 || 0), false);
});
document.getElementById("reportBtn").addEventListener("click", () => {
  addXP(2, "Thanks for reporting! 🚩");
});
document.querySelectorAll(".bin-vote").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("voteThanks").classList.remove("hidden");
    addXP(5, "Thanks for contributing to the database!");
    document.querySelectorAll(".bin-vote").forEach(b => b.disabled = true);
  });
});

// ═══════════════════════════════════════════════════════════════
//   FEATURE 1: PHOTO SCANNER
//   Flow: choose source → camera/upload → preview → type item
//         name → classify from WASTE_DB → result card
//   No external API required.
// ═══════════════════════════════════════════════════════════════

let videoStream    = null;
let capturedBase64 = "";

function showStep(n) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById("camStep" + i).classList.toggle("hidden", i !== n);
  }
}

// STEP 1 → 2: Open live camera
document.getElementById("openCameraBtn").addEventListener("click", async () => {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width:  { ideal: 1280 },
        height: { ideal: 720 },
      }
    });
    document.getElementById("cameraVideo").srcObject = videoStream;
    showStep(2);
  } catch (err) {
    console.error("Camera error:", err);
    showToast("📷 Camera denied. Please allow access or upload an image instead.");
  }
});

// STEP 2 → 1: Cancel camera
document.getElementById("closeCameraBtn").addEventListener("click", () => {
  stopCamera();
  showStep(1);
});

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(t => t.stop());
    videoStream = null;
  }
}

// STEP 2 → 3: Snap photo
document.getElementById("snapBtn").addEventListener("click", () => {
  const video  = document.getElementById("cameraVideo");
  const canvas = document.getElementById("snapCanvas");
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0);
  capturedBase64 = canvas.toDataURL("image/jpeg", 0.85);
  document.getElementById("previewImg").src = capturedBase64;
  stopCamera();
  showStep(3);
});

// STEP 1 → 3: Upload image
document.getElementById("fileUploadInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    capturedBase64 = ev.target.result;
    document.getElementById("previewImg").src = capturedBase64;
    showStep(3);
  };
  reader.readAsDataURL(file);
});

// STEP 3 → 1: Retake
document.getElementById("retakeBtn").addEventListener("click", () => {
  capturedBase64 = "";
  document.getElementById("fileUploadInput").value = "";
  const inp = document.getElementById("photoItemInput");
  if (inp) inp.value = "";
  showStep(1);
});

// STEP 3 → 4: Classify from typed item name
document.getElementById("analyzeBtn").addEventListener("click", () => {
  if (!capturedBase64) { showToast("⚠️ No image captured!"); return; }

  const input = (document.getElementById("photoItemInput").value || "").trim();
  if (!input) {
    showToast("⚠️ Please type the item name to classify.");
    document.getElementById("photoItemInput").focus();
    return;
  }

  const result = classifyItem(input);

  if (result) {
    displayPhotoResult(input, result);
  } else {
    displayPhotoUnknown(input);
  }

  showStep(4);
  detectGPS();
});

// ── Display known result in step 4 ──
function displayPhotoResult(inputText, result) {
  const meta = BIN_META[result.bin] || BIN_META.dry;

  document.getElementById("aiThumb").src            = capturedBase64;
  document.getElementById("aiItemName").textContent  = capitalize(inputText);
  document.getElementById("aiBinTag").textContent    = result.icon + " " + meta.label;

  const confPill = document.getElementById("aiConfidencePill");
  confPill.textContent = "● Database Match";
  confPill.style.color = "#4caf7d";

  const badgeEl = document.getElementById("aiResultBadge");
  badgeEl.textContent = meta.badgeText;
  badgeEl.className   = "result-badge ai-result-badge " + meta.badgeClass;

  document.getElementById("aiDescription").textContent = result.why;
  document.getElementById("aiTipBox").textContent      = "💡 Tip: " + result.tip;

  const confirmBtn       = document.getElementById("aiConfirmBtn");
  confirmBtn.dataset.bin = result.bin;
  confirmBtn.dataset.co2 = result.co2;
  confirmBtn.classList.remove("hidden");

  const unknownBlock = document.getElementById("photoUnknownBlock");
  if (unknownBlock) unknownBlock.classList.add("hidden");
}

// ── Display unknown item in step 4 ──
function displayPhotoUnknown(inputText) {
  document.getElementById("aiThumb").src            = capturedBase64;
  document.getElementById("aiItemName").textContent  = capitalize(inputText) + " (unknown)";
  document.getElementById("aiBinTag").textContent    = "❓ Not in database";
  document.getElementById("aiDescription").textContent =
    "We don't recognise this item yet. Help us by voting for the correct bin below!";
  document.getElementById("aiTipBox").textContent    =
    "💡 Tip: When in doubt, keep hazardous items separate and ask your local waste authority.";

  const confPill = document.getElementById("aiConfidencePill");
  confPill.textContent = "● Unknown Item";
  confPill.style.color = "#f0c040";

  document.getElementById("aiResultBadge").textContent = "?";
  document.getElementById("aiResultBadge").className   = "result-badge badge-dry ai-result-badge";

  document.getElementById("aiConfirmBtn").classList.add("hidden");

  const unknownBlock = document.getElementById("photoUnknownBlock");
  if (unknownBlock) {
    unknownBlock.classList.remove("hidden");
    document.getElementById("photoVoteThanks").classList.add("hidden");
    document.querySelectorAll(".photo-bin-vote").forEach(b => b.disabled = false);
  }
}

// Photo unknown voting
document.querySelectorAll(".photo-bin-vote").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("photoVoteThanks").classList.remove("hidden");
    addXP(5, "Thanks for contributing to the database!");
    document.querySelectorAll(".photo-bin-vote").forEach(b => b.disabled = true);
  });
});

// Photo confirm disposal
document.getElementById("aiConfirmBtn").addEventListener("click", () => {
  const btn = document.getElementById("aiConfirmBtn");
  const bin = btn.dataset.bin || "dry";
  const co2 = parseInt(btn.dataset.co2 || 0);
  if (gpsState.lat) state.geoReports++;
  logDisposal(bin, co2, true);  // isPhoto = true → 15 XP
});

document.getElementById("aiReportBtn").addEventListener("click", () => {
  addXP(2, "Thanks for reporting! 🚩");
});

// Scan another item — reset to step 1
document.getElementById("aiScanAgainBtn").addEventListener("click", () => {
  capturedBase64 = "";
  document.getElementById("fileUploadInput").value = "";
  const inp = document.getElementById("photoItemInput");
  if (inp) inp.value = "";
  gpsState = { lat: null, lon: null, address: "" };

  document.getElementById("gpsDetecting").classList.add("hidden");
  document.getElementById("gpsResult").classList.add("hidden");
  document.getElementById("gpsDenied").classList.add("hidden");
  document.getElementById("aiConfirmBtn").classList.remove("hidden");

  showStep(1);
});

// ═══════════════════════════════════════════════════════════════
//   FEATURE 2: GPS AUTO-TAG & REVERSE GEOCODING
// ═══════════════════════════════════════════════════════════════

let gpsState = { lat: null, lon: null, address: "" };

async function detectGPS(target = "ai") {
  const elDetecting = target === "ai" ? document.getElementById("gpsDetecting") : null;
  const elResult    = target === "ai" ? document.getElementById("gpsResult")    : null;
  const elDenied    = target === "ai" ? document.getElementById("gpsDenied")    : null;

  if (!navigator.geolocation) {
    if (elDenied) elDenied.classList.remove("hidden");
    showToast("⚠️ Your browser doesn't support GPS.");
    return;
  }

  if (elDetecting) elDetecting.classList.remove("hidden");
  if (elResult)    elResult.classList.add("hidden");
  if (elDenied)    elDenied.classList.add("hidden");

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const acc = Math.round(position.coords.accuracy);

      gpsState.lat = lat;
      gpsState.lon = lon;

      if (elDetecting) elDetecting.classList.add("hidden");

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
          { headers: { "Accept-Language":"en", "User-Agent":"WasteWise-HackathonApp/1.0" } }
        );
        const geo        = await res.json();
        const shortAddr  = buildReadableAddress(geo.address || {});
        const fullAddr   = geo.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        gpsState.address = shortAddr || fullAddr;

        if (target === "ai") {
          document.getElementById("gpsAddress").textContent = shortAddr || fullAddr;
          document.getElementById("gpsCoords").textContent  =
            `${lat.toFixed(5)}, ${lon.toFixed(5)}  ±${acc}m`;
          document.getElementById("gpsMapBtn").href =
            `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`;
          if (elResult) elResult.classList.remove("hidden");
        } else {
          updatePickupLocation(shortAddr || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        }
        showToast("📍 Location detected successfully!");

      } catch (geoErr) {
        console.warn("Reverse geocoding failed:", geoErr);
        const coords     = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        gpsState.address = coords;

        if (target === "ai") {
          document.getElementById("gpsAddress").textContent = "📍 " + coords;
          document.getElementById("gpsCoords").textContent  = `Accuracy: ±${acc}m`;
          document.getElementById("gpsMapBtn").href =
            `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=17`;
          if (elResult) elResult.classList.remove("hidden");
        } else {
          updatePickupLocation(coords);
        }
        showToast("📍 Location detected (coordinates only)");
      }
    },
    (err) => {
      console.warn("GPS error:", err.message);
      if (elDetecting) elDetecting.classList.add("hidden");
      if (elDenied)    elDenied.classList.remove("hidden");
      showToast("⚠️ GPS denied. Please enable Location in browser settings.");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
  );
}

function buildReadableAddress(addr) {
  const parts  = [];
  const road   = addr.road || addr.pedestrian || addr.footway || "";
  const number = addr.house_number || "";
  if (road)                                           parts.push(number ? number + " " + road : road);
  if (addr.suburb || addr.neighbourhood)              parts.push(addr.suburb || addr.neighbourhood);
  if (addr.city || addr.town || addr.village)         parts.push(addr.city || addr.town || addr.village);
  if (addr.state)                                     parts.push(addr.state);
  return parts.slice(0, 3).join(", ");
}

function updatePickupLocation(addressText) {
  document.getElementById("pickupLocText").textContent = addressText;
  document.getElementById("pickupLocDetected").classList.remove("hidden");
  document.getElementById("detectPickupLocBtn").classList.add("hidden");
}

document.getElementById("gpsRefreshBtn").addEventListener("click", () => {
  gpsState = { lat: null, lon: null, address: "" };
  document.getElementById("gpsResult").classList.add("hidden");
  document.getElementById("gpsDenied").classList.add("hidden");
  detectGPS("ai");
});

document.getElementById("gpsEnableBtn").addEventListener("click", () => {
  detectGPS("ai");
});

document.getElementById("detectPickupLocBtn").addEventListener("click", () => {
  const btn = document.getElementById("detectPickupLocBtn");
  btn.textContent = "📡 Detecting…";
  btn.disabled    = true;
  detectGPS("pickup").finally(() => {
    btn.textContent = "📍 Auto-Detect My Location";
    btn.disabled    = false;
  });
});

document.getElementById("redetectPickupBtn").addEventListener("click", () => {
  document.getElementById("pickupLocDetected").classList.add("hidden");
  document.getElementById("detectPickupLocBtn").classList.remove("hidden");
  gpsState = { lat: null, lon: null, address: "" };
  detectGPS("pickup");
});

document.getElementById("pickupSubmitBtn").addEventListener("click", () => {
  const type = document.getElementById("pickupType").value;
  if (!type) { showToast("⚠️ Please select a waste type first!"); return; }
  const hasLocation = !document.getElementById("pickupLocDetected").classList.contains("hidden");
  if (!hasLocation) { showToast("⚠️ Please detect your location before submitting!"); return; }
  document.getElementById("pickupSuccess").classList.remove("hidden");
  addXP(5, "Pickup request submitted! 🚛");
  document.getElementById("pickupType").value  = "";
  document.getElementById("pickupNotes").value = "";
});

// ─────────────────────────────────────────────────────────────
// SECTION 7: LEADERBOARD
// ─────────────────────────────────────────────────────────────
const DUMMY_INDIVIDUAL = [
  { name:"Priya Sharma", avatar:"👩", xp:820, badge:"🏆", you:false },
  { name:"Arjun Mehta",  avatar:"👦", xp:745, badge:"⚔️", you:false },
  { name:"Sneha Joshi",  avatar:"👧", xp:690, badge:"♻️", you:false },
  { name:"Rohan Patil",  avatar:"🧑", xp:610, badge:"🌿", you:false },
  { name:"You",          avatar:"🧑", xp:0,   badge:"🌱", you:true  },
  { name:"Amit Kumar",   avatar:"👨", xp:290, badge:"🌱", you:false },
  { name:"Kavya Nair",   avatar:"👩", xp:180, badge:"🌱", you:false },
];

const DUMMY_COMMUNITY = [
  { name:"Block A – Sunshine Heights", avatar:"🏢", xp:4820, badge:"🏆", you:false },
  { name:"Hostel Block 3 – NIT",       avatar:"🏫", xp:3910, badge:"⚔️", you:false },
  { name:"Your Society – B Wing",      avatar:"🏗️", xp:0,    badge:"🌱", you:true  },
  { name:"Green Valley Apartments",    avatar:"🌳", xp:2850, badge:"♻️", you:false },
  { name:"Campus Block 7",             avatar:"🎓", xp:1760, badge:"🌿", you:false },
];

function renderLeaderboard(tab = "individual") {
  const data = (tab === "individual" ? DUMMY_INDIVIDUAL : DUMMY_COMMUNITY).map(r => ({ ...r }));
  data.forEach(r => { if (r.you) r.xp = state.xp; });
  data.sort((a, b) => b.xp - a.xp);

  const container = document.getElementById("lbTable");
  container.innerHTML = "";
  data.forEach((row, i) => {
    const rank  = i + 1;
    const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
    const div   = document.createElement("div");
    div.className = "lb-row" + (row.you ? " you" : "");
    div.innerHTML = `
      <div class="lb-rank ${rank <= 3 ? "top" : ""}">${medal}</div>
      <div class="lb-avatar">${row.avatar}</div>
      <div class="lb-name">${row.name}${row.you ? '<span class="lb-you-tag">YOU</span>' : ""}</div>
      <div class="lb-xp">${row.xp} XP</div>
      <div>${row.badge}</div>
    `;
    container.appendChild(div);
  });
}

document.querySelectorAll(".lb-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".lb-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    renderLeaderboard(tab.dataset.tab);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 8: PICKUP SCHEDULE
// ─────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const TODAY_NAME   = DAYS_OF_WEEK[new Date().getDay()];

const SCHEDULE = [
  { day:"Monday",    type:"🟢", label:"Wet / Organic",   time:"7:00 – 8:00 AM"     },
  { day:"Tuesday",   type:"🔵", label:"Dry Recyclables", time:"8:00 – 9:00 AM"     },
  { day:"Wednesday", type:"🟢", label:"Wet / Organic",   time:"7:00 – 8:00 AM"     },
  { day:"Thursday",  type:"🔵", label:"Dry Recyclables", time:"8:00 – 9:00 AM"     },
  { day:"Friday",    type:"🟢", label:"Wet / Organic",   time:"7:00 – 8:00 AM"     },
  { day:"Saturday",  type:"🟡", label:"E-Waste Drive",   time:"10:00 AM – 1:00 PM" },
  { day:"Sunday",    type:"🔴", label:"Hazardous Waste", time:"9:00 – 11:00 AM"    },
];

function renderSchedule() {
  const grid = document.getElementById("scheduleGrid");
  grid.innerHTML = "";
  SCHEDULE.forEach(s => {
    const isToday = s.day === TODAY_NAME;
    const card    = document.createElement("div");
    card.className = "schedule-card" + (isToday ? " today" : "");
    card.innerHTML = `
      ${isToday ? '<div class="today-tag">📅 TODAY</div>' : ""}
      <div class="schedule-day">${s.day}</div>
      <div class="schedule-type">${s.type}</div>
      <div class="schedule-label">${s.label}</div>
      <span class="schedule-time">🕐 ${s.time}</span>
    `;
    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION 9: TOAST & BADGE POPUP
// ─────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2800);
}

function showBadgePopup(def) {
  document.getElementById("popupIcon").textContent      = def.icon;
  document.getElementById("popupBadgeName").textContent = def.name;
  document.getElementById("badgePopup").classList.remove("hidden");
}

document.getElementById("popupClose").addEventListener("click", () => {
  document.getElementById("badgePopup").classList.add("hidden");
});

// ─────────────────────────────────────────────────────────────
// SECTION 10: HERO STAT COUNT-UP ANIMATION
// ─────────────────────────────────────────────────────────────
function animateCount(el, target, suffix = "") {
  let current = 0;
  const step  = Math.ceil(target / 60);
  const iv    = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString() + suffix;
    if (current >= target) clearInterval(iv);
  }, 25);
}

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
function init() {
  animateCount(document.getElementById("stat1"), 1248);
  animateCount(document.getElementById("stat2"), 342);
  animateCount(document.getElementById("stat3"), 94, "%");

  updateDashboard();
  updateChallenge();
  renderBadges();
  renderLeaderboard("individual");
  renderSchedule();
  showStep(1);
}

document.addEventListener("DOMContentLoaded", init);