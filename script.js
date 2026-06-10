// ==========================================================================
// STATE MANAGEMENT & CONSTANTS
// ==========================================================================
let unitSystem = 'metric'; // 'metric' or 'us'
let history = [];

// DOM Element references
const ageInput = document.getElementById('age');
const ageSlider = document.getElementById('age-slider');

const heightMetricInput = document.getElementById('height-metric');
const heightMetricSlider = document.getElementById('height-slider-metric');

const heightFeetInput = document.getElementById('height-feet');
const heightInchesInput = document.getElementById('height-inches');

const weightMetricInput = document.getElementById('weight-metric');
const weightMetricSlider = document.getElementById('weight-slider-metric');

const weightUsInput = document.getElementById('weight-us');
const weightUsSlider = document.getElementById('weight-slider-us');

const activitySelect = document.getElementById('activity');
const needle = document.getElementById('needle');

// ==========================================================================
// DUAL BINDING (Sliders <--> Number inputs)
// ==========================================================================
function setupSliderSync(numberInput, sliderInput) {
  numberInput.addEventListener('input', () => {
    let val = parseFloat(numberInput.value);
    if (isNaN(val)) return;
    
    const min = parseFloat(numberInput.min);
    const max = parseFloat(numberInput.max);
    const clamped = Math.max(min, Math.min(max, val));
    
    sliderInput.value = clamped;
    calculateBMI();
  });

  numberInput.addEventListener('blur', () => {
    let val = parseFloat(numberInput.value);
    if (isNaN(val)) return;
    
    const min = parseFloat(numberInput.min);
    const max = parseFloat(numberInput.max);
    const clamped = Math.max(min, Math.min(max, val));
    
    numberInput.value = clamped;
    calculateBMI();
  });

  sliderInput.addEventListener('input', () => {
    numberInput.value = sliderInput.value;
    calculateBMI();
  });
}

// Bind all metric / age components if they exist on the page
if (ageInput) {
  setupSliderSync(ageInput, ageSlider);
  setupSliderSync(heightMetricInput, heightMetricSlider);
  setupSliderSync(weightMetricInput, weightMetricSlider);
  setupSliderSync(weightUsInput, weightUsSlider);

  // Bind custom events for feet/inches
  heightFeetInput.addEventListener('input', calculateBMI);
  heightInchesInput.addEventListener('input', calculateBMI);
  activitySelect.addEventListener('change', calculateBMI);
  document.querySelectorAll('input[name="gender"]').forEach(radio => {
    radio.addEventListener('change', calculateBMI);
  });
}

// ==========================================================================
// UNIT SWITCHING & VALUE RETENTION LOGIC
// ==========================================================================
function setUnitSystem(system) {
  if (unitSystem === system) return;
  unitSystem = system;

  // Toggle active button UI
  document.getElementById('btn-metric').classList.toggle('active', system === 'metric');
  document.getElementById('btn-us').classList.toggle('active', system === 'us');

  // Toggle visible form fields
  document.getElementById('height-group-metric').classList.toggle('hidden', system === 'us');
  document.getElementById('weight-group-metric').classList.toggle('hidden', system === 'us');
  document.getElementById('height-group-us').classList.toggle('hidden', system === 'metric');
  document.getElementById('weight-group-us').classList.toggle('hidden', system === 'metric');

  // Retain values across unit switch (seamless conversion!)
  if (system === 'us') {
    // Metric -> US Conversion
    const cm = parseFloat(heightMetricInput.value);
    if (!isNaN(cm)) {
      const totalInches = Math.round(cm / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      heightFeetInput.value = feet;
      heightInchesInput.value = inches;
    }

    const kg = parseFloat(weightMetricInput.value);
    if (!isNaN(kg)) {
      const lbs = (kg * 2.20462262).toFixed(1);
      weightUsInput.value = lbs;
      weightUsSlider.value = lbs;
    }
  } else {
    // US -> Metric Conversion
    const feet = parseFloat(heightFeetInput.value) || 0;
    const inches = parseFloat(heightInchesInput.value) || 0;
    const totalInches = (feet * 12) + inches;
    if (totalInches > 0) {
      const cm = Math.round(totalInches * 2.54);
      heightMetricInput.value = cm;
      heightMetricSlider.value = cm;
    }

    const lbs = parseFloat(weightUsInput.value);
    if (!isNaN(lbs)) {
      const kg = (lbs / 2.20462262).toFixed(1);
      weightMetricInput.value = kg;
      weightMetricSlider.value = kg;
    }
  }

  calculateBMI();
}

// ==========================================================================
// CALCULATION CORE ENGINE
// ==========================================================================
function calculateBMI() {
  let heightM = 0;
  let weightKg = 0;

  // Retrieve inputs based on unit system
  if (unitSystem === 'metric') {
    let cm = parseFloat(heightMetricInput.value);
    let kg = parseFloat(weightMetricInput.value);
    if (isNaN(cm) || isNaN(kg)) return;
    
    // Clamp for metric calculation safety boundaries
    cm = Math.max(50, Math.min(250, cm));
    kg = Math.max(10, Math.min(300, kg));
    
    heightM = cm / 100;
    weightKg = kg;
  } else {
    let feet = parseFloat(heightFeetInput.value);
    let inches = parseFloat(heightInchesInput.value);
    let lbs = parseFloat(weightUsInput.value);
    
    if (isNaN(feet)) feet = 0;
    if (isNaN(inches)) inches = 0;
    if (isNaN(lbs)) return;
    
    // Clamp for US calculation safety boundaries
    feet = Math.max(1, Math.min(8, feet));
    inches = Math.max(0, Math.min(11, inches));
    lbs = Math.max(20, Math.min(650, lbs));
    
    heightM = ((feet * 12) + inches) * 0.0254; // convert inches to meters
    weightKg = lbs * 0.45359237; // convert lbs to kg
  }

  // Guard against invalid/empty parameters
  if (heightM <= 0 || weightKg <= 0) {
    return;
  }

  const bmi = weightKg / (heightM * heightM);
  const bmiPrime = bmi / 25;
  const ponderalIndex = weightKg / Math.pow(heightM, 3);

  // Compute Categories & Highlights (Vercel sentence-case styling)
  const category = getBmiCategory(bmi);
  
  // Calculate Ideal Weight limits (WHO Range 18.5 - 24.9)
  const minWeightKg = 18.5 * (heightM * heightM);
  const maxWeightKg = 24.9 * (heightM * heightM);

  // Update DOM Display
  displayResults(bmi, category, minWeightKg, maxWeightKg, bmiPrime, ponderalIndex, weightKg);
  updateGauge(bmi, category);
  highlightTableCategory(category.id);
}

// Categorization logic based on WHO adult guidelines (sentence-case)
function getBmiCategory(bmi) {
  if (bmi < 16) return { id: 'under', label: 'Severe thinness', pill: 'under' };
  if (bmi < 17) return { id: 'under', label: 'Moderate thinness', pill: 'under' };
  if (bmi < 18.5) return { id: 'under', label: 'Mild thinness', pill: 'under' };
  if (bmi < 25) return { id: 'normal', label: 'Healthy weight', pill: 'normal' };
  if (bmi < 30) return { id: 'over', label: 'Overweight', pill: 'over' };
  if (bmi < 35) return { id: 'obese1', label: 'Obese class I', pill: 'obese' };
  if (bmi < 40) return { id: 'obese2', label: 'Obese class II', pill: 'obese' };
  return { id: 'obese3', label: 'Obese class III', pill: 'obese' };
}

// ==========================================================================
// RENDER & SCREEN UPDATE LOGIC
// ==========================================================================
function displayResults(bmi, category, minW, maxW, prime, ponderal, actualW) {
  // BMI values
  document.getElementById('res-bmi').innerHTML = `${bmi.toFixed(1)} <span class="unit-text font-mono">kg/m²</span>`;
  
  // Category Pill
  const catPill = document.getElementById('res-cat');
  catPill.textContent = category.label;
  catPill.className = `metric-val status-pill ${category.pill} font-mono`;

  // Formatting units for ranges (repurposed for Vercel semantic CSS stops)
  if (unitSystem === 'metric') {
    document.getElementById('res-ideal').textContent = `${minW.toFixed(1)} kg – ${maxW.toFixed(1)} kg`;
    
    // Weight target message
    const targetElement = document.getElementById('res-target');
    if (actualW < minW) {
      const diff = minW - actualW;
      targetElement.innerHTML = `Gain <strong style="color: var(--color-under); font-weight: 500;">${diff.toFixed(1)} kg</strong> to reach a healthy weight (BMI 18.5).`;
    } else if (actualW > maxW) {
      const diff = actualW - maxW;
      targetElement.innerHTML = `Lose <strong style="color: var(--color-obese); font-weight: 500;">${diff.toFixed(1)} kg</strong> to reach a healthy weight (BMI 24.9).`;
    } else {
      targetElement.innerHTML = `<span style="color: var(--color-normal)">Your weight is in the healthy range. Maintain your weight.</span>`;
    }
  } else {
    // US Format: convert kg to lbs for display
    const minLbs = minW * 2.20462262;
    const maxLbs = maxW * 2.20462262;
    const actualLbs = actualW * 2.20462262;
    
    document.getElementById('res-ideal').textContent = `${minLbs.toFixed(1)} lbs – ${maxLbs.toFixed(1)} lbs`;
    
    const targetElement = document.getElementById('res-target');
    if (actualLbs < minLbs) {
      const diff = minLbs - actualLbs;
      targetElement.innerHTML = `Gain <strong style="color: var(--color-under); font-weight: 500;">${diff.toFixed(1)} lbs</strong> to reach a healthy weight (BMI 18.5).`;
    } else if (actualLbs > maxLbs) {
      const diff = actualLbs - maxLbs;
      targetElement.innerHTML = `Lose <strong style="color: var(--color-obese); font-weight: 500;">${diff.toFixed(1)} lbs</strong> to reach a healthy weight (BMI 24.9).`;
    } else {
      targetElement.innerHTML = `<span style="color: var(--color-normal)">Your weight is in the healthy range. Maintain your weight.</span>`;
    }
  }

  // Advanced panel
  document.getElementById('res-prime').textContent = prime.toFixed(2);
  document.getElementById('res-ponderal').innerHTML = `${ponderal.toFixed(1)} <span class="unit font-mono">kg/m³</span>`;
}

// Updates the gauge pointer and text content
function updateGauge(bmi, category) {
  // Semicircle: -90deg is far left, 0deg is straight up, 90deg is far right.
  // Mapping BMI [15 to 40] to angles [-90 to 90] piecewise
  let angle = -90;
  
  if (bmi <= 15) {
    angle = -90;
  } else if (bmi <= 18.5) {
    // 15 -> -90, 18.5 -> -45
    angle = -90 + ((bmi - 15) / 3.5) * 45;
  } else if (bmi <= 25) {
    // 18.5 -> -45, 25 -> 0
    angle = -45 + ((bmi - 18.5) / 6.5) * 45;
  } else if (bmi <= 30) {
    // 25 -> 0, 30 -> 45
    angle = ((bmi - 25) / 5) * 45;
  } else if (bmi <= 40) {
    // 30 -> 45, 40 -> 90
    angle = 45 + ((bmi - 30) / 10) * 45;
  } else {
    angle = 90;
  }

  // Needle transition rotation
  needle.style.transform = `rotate(${angle}deg)`;

  // Inner text
  document.getElementById('gauge-bmi-val').textContent = bmi.toFixed(1);
  
  // Custom simple category name inside gauge
  let shortCat = 'Normal';
  if (category.id === 'under') shortCat = 'Underweight';
  if (category.id === 'over') shortCat = 'Overweight';
  if (category.id.startsWith('obese')) shortCat = 'Obese';
  document.getElementById('gauge-bmi-cat').textContent = shortCat;
}

// Highlight matching row in the HTML comparison table
function highlightTableCategory(catId) {
  const rows = document.querySelectorAll('#bmi-table tbody tr');
  rows.forEach(row => {
    if (row.getAttribute('data-range') === catId) {
      row.classList.add('active');
    } else {
      row.classList.remove('active');
    }
  });
}

// Reset Form to initial values
function resetForm() {
  document.getElementById('bmi-form').reset();
  
  // Set defaults
  ageInput.value = 25;
  ageSlider.value = 25;
  
  heightMetricInput.value = 175;
  heightMetricSlider.value = 175;
  
  weightMetricInput.value = 70;
  weightMetricSlider.value = 70;

  heightFeetInput.value = 5;
  heightInchesInput.value = 9;
  
  weightUsInput.value = 154;
  weightUsSlider.value = 154;

  calculateBMI();
}

// ==========================================================================
// CALCULATION LOG HISTORY (Local Storage)
// ==========================================================================
const bmiForm = document.getElementById('bmi-form');
if (bmiForm) {
  bmiForm.addEventListener('submit', (e) => {
    e.preventDefault();
  
  let heightM = 0;
  let weightKg = 0;
  const age = parseInt(ageInput.value);
  const gender = document.querySelector('input[name="gender"]:checked').value;

  if (unitSystem === 'metric') {
    heightM = parseFloat(heightMetricInput.value) / 100;
    weightKg = parseFloat(weightMetricInput.value);
  } else {
    const feet = parseFloat(heightFeetInput.value) || 0;
    const inches = parseFloat(heightInchesInput.value) || 0;
    heightM = ((feet * 12) + inches) * 0.0254;
    weightKg = parseFloat(weightUsInput.value) * 0.45359237;
  }

  const bmi = weightKg / (heightM * heightM);
  const category = getBmiCategory(bmi);

  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    age,
    gender: gender.charAt(0).toUpperCase() + gender.slice(1),
    weight: unitSystem === 'metric' ? `${weightKg.toFixed(1)} kg` : `${parseFloat(weightUsInput.value).toFixed(1)} lbs`,
    bmi: bmi.toFixed(1),
    classification: category.label,
    pill: category.pill
  };

  saveToHistory(entry);
  });
}

function saveToHistory(entry) {
  history.unshift(entry);
  if (history.length > 5) {
    history.pop(); // limit to 5 entries
  }
  localStorage.setItem('bmi_history', JSON.stringify(history));
  renderHistory();
}

function loadHistory() {
  const stored = localStorage.getItem('bmi_history');
  if (stored) {
    history = JSON.parse(stored);
    renderHistory();
  }
}

function clearHistory() {
  history = [];
  localStorage.removeItem('bmi_history');
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-container');
  const section = document.getElementById('history-sec');
  
  if (history.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  container.innerHTML = history.map(item => `
    <div class="history-item">
      <div class="history-details font-mono">
        <div class="hist-info">
          <span class="hist-label">Date</span>
          <span class="hist-val">${item.date}</span>
        </div>
        <div class="hist-info">
          <span class="hist-label">Age / Gender</span>
          <span class="hist-val">${item.age}y / ${item.gender}</span>
        </div>
        <div class="hist-info">
          <span class="hist-label">Weight</span>
          <span class="hist-val">${item.weight}</span>
        </div>
        <div class="hist-info">
          <span class="hist-label">BMI</span>
          <span class="hist-val" style="color: var(--text-main); font-weight: 500">${item.bmi}</span>
        </div>
      </div>
      <span class="status-pill ${item.pill} font-mono">${item.classification}</span>
    </div>
  `).join('');
}

// ==========================================================================
// DARK / LIGHT THEME TOGGLING
// ==========================================================================
const themeToggle = document.getElementById('theme-toggle');

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

function loadTheme() {
  const activeTheme = localStorage.getItem('theme');
  if (activeTheme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (!activeTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.classList.add('dark-theme');
  }
}

// ==========================================================================
// INITIALIZATION ON LOAD
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  loadHistory();
  if (document.getElementById('bmi-form')) {
    calculateBMI(); // initial calculation
  }
});
