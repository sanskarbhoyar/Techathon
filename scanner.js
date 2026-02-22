/* ============================================================
   WasteWise – scanner.js  (v2 — MobileNet Vision Edition)
   
   Uses TensorFlow.js + MobileNet to ACTUALLY look at the photo
   and classify the object into a waste bin category.

   Flow:
     1. Load MobileNet model on page load (background)
     2. User opens camera or uploads a photo
     3. Capture frame → run MobileNet inference on the image
     4. Map top-1 ImageNet label → waste bin (Wet/Dry/Haz/E-Waste)
     5. Render colour-coded result card with why + tip
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   BIN METADATA
───────────────────────────────────────────────────────────── */
const BIN_META = {
  wet: { label: 'Wet / Organic Bin', emoji: '🟢', badgeText: 'WET', cssClass: 'bin-wet' },
  dry: { label: 'Dry / Recyclable Bin', emoji: '🔵', badgeText: 'DRY', cssClass: 'bin-dry' },
  haz: { label: 'Hazardous Bin', emoji: '🔴', badgeText: 'HAZARDOUS', cssClass: 'bin-haz' },
  ewaste: { label: 'E-Waste Bin', emoji: '🟡', badgeText: 'E-WASTE', cssClass: 'bin-ewaste' },
};

/* ─────────────────────────────────────────────────────────────
   IMAGENET LABEL → WASTE BIN MAPPING
   MobileNet returns ImageNet class labels. We map them here.
   Priority order: ewaste > haz > wet > dry (most specific first)
───────────────────────────────────────────────────────────── */
const BIN_RULES = [

  /* ── E-WASTE ── (Electronics, gadgets, batteries, wiring) */
  {
    bin: 'ewaste', keywords: [
      'laptop', 'notebook', 'computer', 'desktop', 'mac', 'macbook', 'pc',
      'monitor', 'screen', 'television', 'tv', 'display', 'projector',
      'keyboard', 'mouse', 'trackpad',
      'mobile', 'cell phone', 'smartphone', 'iphone', 'android', 'phone', 'telephone',
      'tablet', 'ipad',
      'headphone', 'earphone', 'earbud', 'airpod', 'speaker', 'loudspeaker',
      'camera', 'digital camera', 'camcorder', 'webcam',
      'printer', 'scanner', 'copier', 'fax',
      'charger', 'adapter', 'cable', 'wire', 'cord', 'plug',
      'remote', 'controller', 'joystick', 'gamepad',
      'microphone', 'mixer', 'amplifier', 'radio', 'cassette', 'cd player', 'dvd',
      'circuit board', 'motherboard', 'chip', 'processor', 'hard drive', 'disk',
      'router', 'modem', 'switch', 'hub',
      'electric fan', 'hair dryer', 'iron', 'toaster', 'kettle', 'microwave',
      'refrigerator', 'fridge', 'washing machine', 'dishwasher', 'air conditioner',
      'vacuum cleaner', 'blender', 'drill', 'saw', 'power tool',
      'electric toothbrush', 'shaver', 'clipper',
      'bulb', 'led', 'fluorescent', 'lamp', 'lantern', 'torch', 'flashlight',
    ]
  },

  /* ── HAZARDOUS ── (Chemicals, medicines, flammables, toxics) */
  {
    bin: 'haz', keywords: [
      'syringe', 'needle', 'injection', 'medical', 'medicine', 'pill', 'capsule', 'tablet',
      'pharmacy', 'prescription', 'drug', 'narcotic',
      'bandage', 'gauze', 'cotton swab', 'cotton ball',
      'paint', 'paint can', 'spray can', 'aerosol', 'bleach', 'detergent', 'chemical',
      'acid', 'solvent', 'alcohol', 'ethanol', 'methanol',
      'pesticide', 'insecticide', 'herbicide', 'fertilizer',
      'lighter', 'match', 'matchstick', 'firework', 'explosive',
      'motor oil', 'engine oil', 'lubricant', 'gasoline', 'petrol', 'diesel', 'fuel',
      'thermometer', 'mercury', 'barometer',
      'nail polish', 'nail polish remover', 'acetone', 'varnish', 'lacquer',
      'fire extinguisher', 'gas cylinder', 'propane',
      'cleaning product', 'toilet cleaner', 'drain cleaner',
      'swimming pool chemical', 'chlorine',
      'ink cartridge', 'toner cartridge',
    ]
  },

  /* ── WET / ORGANIC ── (Food, plants, biodegradables) */
  {
    bin: 'wet', keywords: [
      'banana', 'banana peel', 'orange', 'apple', 'lemon', 'lime', 'mango', 'pear', 'peach',
      'grape', 'strawberry', 'blueberry', 'raspberry', 'cherry', 'watermelon', 'melon',
      'pineapple', 'coconut', 'fig', 'date', 'apricot', 'plum', 'pomegranate', 'kiwi',
      'vegetable', 'spinach', 'broccoli', 'cauliflower', 'cabbage', 'lettuce', 'salad',
      'carrot', 'potato', 'tomato', 'onion', 'garlic', 'ginger', 'pepper', 'cucumber',
      'zucchini', 'eggplant', 'pumpkin', 'corn', 'mushroom', 'radish', 'beet', 'turnip',
      'bread', 'bakery', 'bun', 'roll', 'baguette', 'croissant', 'cake', 'cookie', 'pastry',
      'pizza', 'pasta', 'noodle', 'spaghetti', 'rice', 'grain', 'cereal',
      'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'shrimp', 'egg',
      'milk', 'yogurt', 'cheese', 'butter', 'cream', 'dairy',
      'food', 'meal', 'dish', 'plate', 'soup', 'stew', 'curry', 'salsa', 'sauce',
      'leaf', 'leaves', 'flower', 'petal', 'plant', 'herb', 'grass', 'garden waste',
      'wood', 'bark', 'branch', 'twig', 'log', 'sawdust',
      'paper towel', 'tissue', 'napkin', 'cardboard sleeve', 'organic',
      'coffee', 'coffee grounds', 'tea', 'tea bag',
      'nut', 'almond', 'walnut', 'peanut', 'cashew', 'pistachio',
      'jellyfish', 'starfish', 'sea anemone', 'coral', 'sponge',
      'worm', 'caterpillar', 'insect', 'larva',
    ]
  },

  /* ── DRY / RECYCLABLE ── (Paper, plastic, metal, glass, fabric) */
  {
    bin: 'dry', keywords: [
      'plastic', 'plastic bottle', 'water bottle', 'bottle', 'container', 'jug',
      'bag', 'plastic bag', 'shopping bag', 'garbage bag',
      'paper', 'newspaper', 'magazine', 'book', 'cardboard', 'carton', 'box',
      'glass', 'jar', 'wine glass', 'bottle', 'cup', 'tumbler',
      'tin', 'tin can', 'aluminium can', 'soda can', 'beer can', 'soda', 'cola',
      'metal', 'steel', 'iron', 'copper', 'aluminium', 'foil',
      'clothes', 'shirt', 't-shirt', 'jeans', 'pants', 'jacket', 'coat', 'dress', 'sock',
      'shoe', 'boot', 'sandal', 'sneaker', 'footwear',
      'bag', 'purse', 'backpack', 'wallet', 'handbag', 'luggage', 'suitcase',
      'toy', 'lego', 'doll', 'ball', 'frisbee',
      'cup', 'mug', 'plate', 'bowl', 'utensil', 'fork', 'spoon', 'knife',
      'furniture', 'chair', 'table', 'desk', 'shelf',
      'candle', 'pen', 'pencil', 'ruler', 'scissors', 'tape', 'stapler',
      'envelope', 'folder', 'document', 'label', 'sticker',
    ]
  },
];

/* ─────────────────────────────────────────────────────────────
   DETAILED WASTE INFO DATABASE
   Provides why/tip text for display. Keyed by bin type and
   some common object names.
───────────────────────────────────────────────────────────── */
const DETAILS_DB = {
  ewaste: {
    headphone: { why: 'Headphones and earphones contain circuit boards, magnets, and copper wire that require e-waste processing.', tip: 'Take to an electronics store drop-off or certified e-waste collection camp.' },
    phone: { why: 'Mobile phones contain gold, silver, lithium, and toxic metals. They must never go in general waste.', tip: 'Remove personal data first. Return to manufacturer or find a certified e-waste recycler.' },
    laptop: { why: 'Laptops have circuit boards with toxic and valuable metals that need specialized recycling.', tip: 'Remove personal data. Take to certified e-waste recycler or a brand take-back program.' },
    battery: { why: 'Batteries contain lithium, lead, or cadmium that leach into soil and water — extremely toxic.', tip: 'Drop off at battery collection bins in supermarkets or electronics stores. Never bin!' },
    charger: { why: 'Chargers and cables contain copper wiring and electronic components that are classified as e-waste.', tip: 'Collect a bundle and donate to e-waste collection drives.' },
    television: { why: 'TVs contain lead, mercury, and rare earth metals that need certified disposal.', tip: 'Contact your municipality for large appliance e-waste pickup.' },
    camera: { why: 'Digital cameras contain batteries, circuit boards, and lenses that are classified as e-waste.', tip: 'Donate if working. Otherwise take to an e-waste collection camp.' },
    default: { why: 'Electronic items contain hazardous metals and toxic components that require specialized e-waste recycling.', tip: 'Take to the nearest certified e-waste collection center or manufacturer take-back program.' },
  },
  haz: {
    medicine: { why: 'Old medicines pollute water sources if flushed or binned — very environmentally harmful.', tip: 'Return to a pharmacy — many run medicine take-back programs.' },
    paint: { why: 'Paint contains volatile organic compounds (VOCs) that are harmful to the environment.', tip: 'Let latex paint dry out completely first. Take oil-based paint to a hazmat facility.' },
    lighter: { why: 'Lighters and aerosols are flammable and pressurized — they can explode in landfills.', tip: 'Fully exhaust contents before disposal. Take to a hazardous waste facility.' },
    default: { why: 'This item contains hazardous chemicals or materials that are harmful to people, animals, and the environment.', tip: 'Take to your local hazardous waste facility. Never pour chemicals down the drain or bin them.' },
  },
  wet: {
    banana: { why: 'Banana peels are organic matter that compost quickly and enrich garden soil.', tip: 'Put directly in the green/wet bin. Or start a home compost pit!' },
    fruit: { why: 'Fruit and vegetable waste is 100% biodegradable and ideal for composting.', tip: 'Great for home composting — it produces rich compost within a few weeks.' },
    food: { why: 'Food waste is organic and compostable — composting diverts it from landfill.', tip: 'Drain excess liquid before putting in wet bin to avoid odour.' },
    leaf: { why: 'Leaves, flowers, and garden waste are organic and break down naturally.', tip: 'Use as mulch for your garden or add to a compost pile.' },
    default: { why: 'This is organic waste that biodegrades naturally and is perfect for composting.', tip: 'Place in the green/wet bin. Use kitchen composters for food waste to make your own fertiliser.' },
  },
  dry: {
    plastic: { why: 'PET plastic is recyclable if clean and dry. Always rinse containers before recycling.', tip: 'Remove caps, rinse, and crush to save space in the dry bin.' },
    paper: { why: 'Clean, dry paper is recyclable. Wet or greasy paper cannot be recycled.', tip: 'Keep paper dry. Flatten cardboard boxes to save bin space.' },
    glass: { why: 'Glass is 100% recyclable indefinitely without any quality loss.', tip: 'Rinse before recycling. Broken glass should be wrapped safely in newspaper before binning.' },
    tin: { why: 'Tin and aluminium cans are highly recyclable metals with a huge energy savings benefit.', tip: 'Rinse cans before recycling. Aluminium recycling saves 95% of the energy needed to make new aluminium.' },
    clothes: { why: 'Old clothes can be donated to charity or recycled by textile recyclers.', tip: 'Donate wearable items. Only recycle as textiles if too damaged to wear.' },
    default: { why: 'This item is recyclable waste that can be processed and reused to make new products.', tip: 'Place in the dry/recyclable bin. Make sure items are clean and dry for best recycling outcomes.' },
  },
};

function getDetails(bin, itemName) {
  const binDB = DETAILS_DB[bin] || DETAILS_DB.dry;
  const name = (itemName || '').toLowerCase();
  for (const key of Object.keys(binDB)) {
    if (key !== 'default' && name.includes(key)) return binDB[key];
  }
  return binDB.default;
}

/* ─────────────────────────────────────────────────────────────
   CLASSIFY IMAGENET LABEL → WASTE BIN
───────────────────────────────────────────────────────────── */
function mapLabelToBin(label) {
  const l = label.toLowerCase();
  for (const rule of BIN_RULES) {
    for (const kw of rule.keywords) {
      if (l.includes(kw)) return rule.bin;
    }
  }
  return 'dry'; // default fallback for unrecognized objects
}

/* ─────────────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────────────── */
let mobileNetModel = null;  // loaded once on startup
let videoStream = null;
let capturedB64 = '';

/* ─────────────────────────────────────────────────────────────
   DOM REFS
───────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const UI = {
  permission: $('statePermission'),
  denied: $('stateDenied'),
  viewfinder: $('stateViewfinder'),
  analyzing: $('stateAnalyzing'),
  result: $('stateResult'),
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function showState(name) {
  Object.entries(UI).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(window._toast);
  window._toast = setTimeout(() => t.classList.add('hidden'), 3000);
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* ─────────────────────────────────────────────────────────────
   LOAD MOBILENET
───────────────────────────────────────────────────────────── */
async function loadModel() {
  const statusEl = $('modelStatus');
  try {
    statusEl.textContent = '🧠 Loading AI model…';
    mobileNetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
    statusEl.textContent = '✅ AI model ready — tap Start Camera!';
    statusEl.style.color = 'var(--accent)';
    $('startCameraBtn').disabled = false;
  } catch (err) {
    console.warn('MobileNet load failed:', err);
    statusEl.textContent = '⚠️ AI model unavailable — using keyword fallback.';
    statusEl.style.color = 'var(--ewaste)';
    $('startCameraBtn').disabled = false; // still allow usage
  }
}

/* ─────────────────────────────────────────────────────────────
   CAMERA
───────────────────────────────────────────────────────────── */
async function startCamera() {
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    $('liveVideo').srcObject = videoStream;
    showState('viewfinder');
  } catch (err) {
    console.warn('Camera error:', err);
    stopCamera();
    showState('denied');
  }
}

function stopCamera() {
  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
}

/* ─────────────────────────────────────────────────────────────
   CAPTURE → ANALYZE
───────────────────────────────────────────────────────────── */
function captureFrame() {
  const video = $('liveVideo');
  const canvas = $('snapCanvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0);
  capturedB64 = canvas.toDataURL('image/jpeg', 0.88);
  stopCamera();

  // Flash the viewfinder
  const vf = document.querySelector('.viewfinder-wrap');
  vf.classList.add('flash');
  setTimeout(() => vf.classList.remove('flash'), 200);

  analyzeImage();
}

async function analyzeImage() {
  if (!capturedB64) return;
  $('analyzeThumb').src = capturedB64;
  showState('analyzing');

  /* ── Step 1: Try the /predict backend ── */
  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: capturedB64 }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    renderResult(data.item_name, data.bin, data.confidence, false);
    return;
  } catch (_) {
    // backend not available — fall through to MobileNet
  }

  /* ── Step 2: MobileNet local inference ── */
  if (mobileNetModel) {
    try {
      const img = new Image();
      img.src = capturedB64;
      await new Promise(r => { img.onload = r; });
      const predictions = await mobileNetModel.classify(img, 5);  // top-5 predictions
      console.log('MobileNet predictions:', predictions);

      // Pick the most confident prediction that maps to a non-default bin,
      // otherwise just use the top-1.
      let chosen = predictions[0];
      let chosenBin = mapLabelToBin(chosen.className);

      for (const pred of predictions) {
        const b = mapLabelToBin(pred.className);
        if (b !== 'dry') { // any prediction that maps to a specific bin wins
          chosen = pred;
          chosenBin = b;
          break;
        }
      }

      // Clean up the label: MobileNet returns "iPod, MP3 Player" — take the first part
      const cleanName = chosen.className.split(',')[0].trim();
      const confidence = chosen.probability;
      renderResult(cleanName, chosenBin, confidence, false);
      return;
    } catch (err) {
      console.warn('MobileNet inference failed:', err);
    }
  }

  /* ── Step 3: Ultimate keyword fallback ── */
  renderResult('Unidentified Item', 'dry', 0.5, true);
}

/* ─────────────────────────────────────────────────────────────
   FILE UPLOAD
───────────────────────────────────────────────────────────── */
function handleFileUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    capturedB64 = ev.target.result;
    analyzeImage();
  };
  reader.readAsDataURL(file);
}

/* ─────────────────────────────────────────────────────────────
   RENDER RESULT
───────────────────────────────────────────────────────────── */
function renderResult(itemName, bin, confidence, isUnknown) {
  const safeBin = BIN_META[bin] ? bin : 'dry';
  const meta = BIN_META[safeBin];
  const details = getDetails(safeBin, itemName);
  const confPct = Math.round((confidence || 0) * 100);

  $('resultBannerText').textContent = `${meta.emoji} ${meta.label}`;
  $('resultBinBadge').textContent = meta.badgeText;
  $('resultItemName').textContent = capitalize(itemName);
  $('resultBinLabel').textContent = `Goes in: ${meta.emoji} ${meta.label}`;
  $('resultThumb').src = capturedB64;
  $('resultWhy').textContent = details.why;
  $('resultTip').textContent = `💡 Tip: ${details.tip}`;
  $('confPct').textContent = confPct + '%';
  $('confFill').style.width = confPct + '%';

  // Show offline notice only if unknown
  $('offlineNotice').classList.toggle('hidden', !isUnknown);

  // Reset confirm button
  const confirmBtn = $('confirmDisposalBtn');
  confirmBtn.disabled = false;
  confirmBtn.textContent = '✅ I Disposed Correctly! (+15 XP)';

  // Apply bin colour class
  const resultEl = $('stateResult');
  resultEl.className = `scanner-state result-card ${meta.cssClass}`;

  showState('result');
}

/* ─────────────────────────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────────────────────────── */
// Disable start camera until model loads
$('startCameraBtn').disabled = true;
$('startCameraBtn').addEventListener('click', startCamera);

$('uploadFallbackInput').addEventListener('change', e => handleFileUpload(e.target.files[0]));
$('uploadDeniedInput').addEventListener('change', e => handleFileUpload(e.target.files[0]));

$('retryPermBtn').addEventListener('click', startCamera);

$('shutterBtn').addEventListener('click', captureFrame);

$('cancelCamBtn').addEventListener('click', () => {
  stopCamera();
  showState('permission');
});

$('scanAgainBtn').addEventListener('click', () => {
  capturedB64 = '';
  startCamera();
});

$('confirmDisposalBtn').addEventListener('click', () => {
  showToast('✅ Great disposal! You\'re helping the planet 🌿 (+15 XP)');
  $('confirmDisposalBtn').disabled = true;
  $('confirmDisposalBtn').textContent = '✅ Logged!';
});

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  showState('permission');
  loadModel(); // Load MobileNet in the background
});
