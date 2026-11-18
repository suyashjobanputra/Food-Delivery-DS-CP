/**
 * FoodPulse AI — Frontend Client Application Logic
 * Integrates live ML prediction API, EDA explorer, and interactive simulator.
 */

// State Management
const state = {
  currentTab: 'simulator',
  datasetPage: 1,
  datasetPageSize: 15,
  totalOrders: 12000,
  traffic: 'Medium',
  weather: 'Clear',
  metricsData: null,
  debounceTimer: null
};

// Preset Scenarios
const PRESETS = {
  standard: {
    distance: 5.5,
    prepTime: 20,
    estDelivery: 45,
    traffic: 'Medium',
    weather: 'Clear',
    hour: 14,
    items: 2,
    orderValue: 380,
    courierRating: 4.6,
    restRating: 4.3
  },
  monsoon: {
    distance: 10.5,
    prepTime: 32,
    estDelivery: 50,
    traffic: 'High',
    weather: 'Rain',
    hour: 20,
    items: 4,
    orderValue: 680,
    courierRating: 4.0,
    restRating: 3.5
  },
  express: {
    distance: 1.5,
    prepTime: 10,
    estDelivery: 25,
    traffic: 'Low',
    weather: 'Clear',
    hour: 12,
    items: 1,
    orderValue: 180,
    courierRating: 4.9,
    restRating: 4.8
  },
  feast: {
    distance: 8.0,
    prepTime: 35,
    estDelivery: 60,
    traffic: 'Medium',
    weather: 'Cloudy',
    hour: 21,
    items: 7,
    orderValue: 820,
    courierRating: 4.4,
    restRating: 4.5
  }
};

// DOM Elements
const elements = {
  // Navigation
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),

  // Presets
  presetButtons: document.querySelectorAll('.preset-pill'),

  // Inputs
  inputDistance: document.getElementById('inputDistance'),
  valDistance: document.getElementById('valDistance'),
  inputPrepTime: document.getElementById('inputPrepTime'),
  valPrepTime: document.getElementById('valPrepTime'),
  inputEstDelivery: document.getElementById('inputEstDelivery'),
  valEstDelivery: document.getElementById('valEstDelivery'),
  trafficSelector: document.getElementById('trafficSelector'),
  weatherSelector: document.getElementById('weatherSelector'),
  inputHour: document.getElementById('inputHour'),
  valHour: document.getElementById('valHour'),
  inputItems: document.getElementById('inputItems'),
  valItems: document.getElementById('valItems'),
  inputOrderValue: document.getElementById('inputOrderValue'),
  valOrderValue: document.getElementById('valOrderValue'),
  inputCourierRating: document.getElementById('inputCourierRating'),
  valCourierRating: document.getElementById('valCourierRating'),
  inputRestRating: document.getElementById('inputRestRating'),
  valRestRating: document.getElementById('valRestRating'),
  btnRunPrediction: document.getElementById('btnRunPrediction'),

  // Output Telemetry
  resDeliveryTime: document.getElementById('resDeliveryTime'),
  resConfidenceRange: document.getElementById('resConfidenceRange'),
  resPlatformEta: document.getElementById('resPlatformEta'),
  resDelayStatus: document.getElementById('resDelayStatus'),
  resDeltaValue: document.getElementById('resDeltaValue'),
  resDelayBar: document.getElementById('resDelayBar'),
  satGaugeCircle: document.getElementById('satGaugeCircle'),
  resSatProb: document.getElementById('resSatProb'),
  resSatisfaction: document.getElementById('resSatisfaction'),
  resRiskLevel: document.getElementById('resRiskLevel'),
  resSatExplanation: document.getElementById('resSatExplanation'),
  recoList: document.getElementById('recoList'),

  // Dataset Explorer
  datasetSearchInput: document.getElementById('datasetSearchInput'),
  filterSatisfaction: document.getElementById('filterSatisfaction'),
  filterTraffic: document.getElementById('filterTraffic'),
  filterWeather: document.getElementById('filterWeather'),
  btnResetFilters: document.getElementById('btnResetFilters'),
  ordersTableBody: document.getElementById('ordersTableBody'),
  datasetCountInfo: document.getElementById('datasetCountInfo'),
  btnPrevPage: document.getElementById('btnPrevPage'),
  btnNextPage: document.getElementById('btnNextPage'),
  pageIndicator: document.getElementById('pageIndicator'),

  // Model Diagnostics
  importanceContainer: document.getElementById('importanceContainer')
};

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initPresets();
  initInputListeners();
  initDatasetExplorer();
  fetchMetrics();
  executePrediction();
});

// ===================================================================
// TAB NAVIGATION
// ===================================================================
function initTabs() {
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (state.currentTab === targetTab) return;

      elements.tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      elements.tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById(`tab-${targetTab}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      state.currentTab = targetTab;

      if (targetTab === 'dataset') {
        fetchDataset();
      }
    });
  });
}

// ===================================================================
// PRESET SCENARIO HANDLER
// ===================================================================
function initPresets() {
  elements.presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.getAttribute('data-preset');
      const p = PRESETS[presetKey];
      if (!p) return;

      elements.inputDistance.value = p.distance;
      elements.inputPrepTime.value = p.prepTime;
      elements.inputEstDelivery.value = p.estDelivery;
      elements.inputHour.value = p.hour;
      elements.inputItems.value = p.items;
      elements.inputOrderValue.value = p.orderValue;
      elements.inputCourierRating.value = p.courierRating;
      elements.inputRestRating.value = p.restRating;

      // Update segmented controls
      setSegmentValue(elements.trafficSelector, p.traffic);
      state.traffic = p.traffic;

      setSegmentValue(elements.weatherSelector, p.weather);
      state.weather = p.weather;

      updateSliderLabels();
      executePrediction();
    });
  });
}

function setSegmentValue(container, value) {
  const buttons = container.querySelectorAll('.segment-btn');
  buttons.forEach(b => {
    if (b.getAttribute('data-value') === value) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });
}

// ===================================================================
// INPUT CONTROLS & EVENT LISTENERS
// ===================================================================
function initInputListeners() {
  const sliders = [
    elements.inputDistance,
    elements.inputPrepTime,
    elements.inputEstDelivery,
    elements.inputHour,
    elements.inputItems,
    elements.inputOrderValue,
    elements.inputCourierRating,
    elements.inputRestRating
  ];

  sliders.forEach(slider => {
    slider.addEventListener('input', () => {
      updateSliderLabels();
      triggerDebouncedPrediction();
    });
  });

  // Traffic segmented control
  elements.trafficSelector.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.trafficSelector.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.traffic = btn.getAttribute('data-value');
      triggerDebouncedPrediction();
    });
  });

  // Weather segmented control
  elements.weatherSelector.querySelectorAll('.segment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.weatherSelector.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.weather = btn.getAttribute('data-value');
      triggerDebouncedPrediction();
    });
  });

  // Action Button
  elements.btnRunPrediction.addEventListener('click', () => {
    executePrediction();
  });
}

function updateSliderLabels() {
  elements.valDistance.textContent = `${parseFloat(elements.inputDistance.value).toFixed(1)} km`;
  elements.valPrepTime.textContent = `${elements.inputPrepTime.value} min`;
  elements.valEstDelivery.textContent = `${elements.inputEstDelivery.value} min`;

  const hr = parseInt(elements.inputHour.value, 10);
  let hrTag = 'Day';
  if (hr >= 12 && hr <= 15) hrTag = 'Lunch';
  else if (hr >= 19 && hr <= 22) hrTag = 'Dinner';
  else if (hr >= 23 || hr <= 5) hrTag = 'Night';
  elements.valHour.textContent = `${hr.toString().padStart(2, '0')}:00 (${hrTag})`;

  elements.valItems.textContent = `${elements.inputItems.value} items`;
  elements.valOrderValue.textContent = `₹ ${elements.inputOrderValue.value}`;
  elements.valCourierRating.textContent = `${parseFloat(elements.inputCourierRating.value).toFixed(1)} ★`;
  elements.valRestRating.textContent = `${parseFloat(elements.inputRestRating.value).toFixed(1)} ★`;
}

function triggerDebouncedPrediction() {
  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    executePrediction();
  }, 220);
}

// ===================================================================
// INFERENCE ENGINE & PREDICTION API
// ===================================================================
async function executePrediction() {
  const payload = {
    distance_km: parseFloat(elements.inputDistance.value),
    preparation_time_min: parseFloat(elements.inputPrepTime.value),
    traffic: state.traffic,
    weather: state.weather,
    hour: parseInt(elements.inputHour.value, 10),
    number_of_items: parseInt(elements.inputItems.value, 10),
    order_value: parseFloat(elements.inputOrderValue.value),
    restaurant_rating: parseFloat(elements.inputRestRating.value),
    courier_rating: parseFloat(elements.inputCourierRating.value),
    estimated_delivery_min: parseFloat(elements.inputEstDelivery.value)
  };

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('Prediction API failed');
    const data = await res.json();
    renderPredictionResults(data);
  } catch (err) {
    console.error('Error invoking prediction API:', err);
  }
}

function renderPredictionResults(data) {
  // 1. Delivery Duration
  elements.resDeliveryTime.textContent = data.predicted_delivery_min.toFixed(1);
  elements.resConfidenceRange.innerHTML = `Confidence Interval: <strong>${data.confidence_interval.low} – ${data.confidence_interval.high} min</strong> (MAE ±3.32m)`;

  // 2. Schedule & Delay Status
  elements.resPlatformEta.textContent = `${data.estimated_delivery_min} min`;
  const delta = data.delay_min;
  elements.resDeltaValue.textContent = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} min`;

  // Status Badge classes
  elements.resDelayStatus.className = 'status-badge';
  let barWidth = 50;

  if (data.delay_severity === 'danger') {
    elements.resDelayStatus.classList.add('status-danger');
    elements.resDelayStatus.textContent = `Critical Delay Alert (+${delta.toFixed(1)} min)`;
    barWidth = 92;
  } else if (data.delay_severity === 'warning') {
    elements.resDelayStatus.classList.add('status-warning');
    elements.resDelayStatus.textContent = `Moderate Delay (+${delta.toFixed(1)} min)`;
    barWidth = 72;
  } else if (data.delay_severity === 'success') {
    elements.resDelayStatus.classList.add('status-success');
    elements.resDelayStatus.textContent = `Ahead of Schedule (${delta.toFixed(1)} min)`;
    barWidth = 28;
  } else {
    elements.resDelayStatus.classList.add('status-info');
    elements.resDelayStatus.textContent = `On Schedule (±0 min)`;
    barWidth = 50;
  }
  elements.resDelayBar.style.width = `${barWidth}%`;

  // 3. Customer Satisfaction Radial Gauge
  const satProb = data.satisfaction_probability;
  elements.resSatProb.textContent = `${Math.round(satProb)}%`;

  // Circumference = 2 * PI * 42 = 263.89
  const circumference = 264;
  const offset = circumference - (circumference * (satProb / 100));
  elements.satGaugeCircle.style.strokeDashoffset = offset;

  // Change gauge color based on probability
  if (satProb >= 70) {
    elements.satGaugeCircle.style.stroke = 'var(--accent-green)';
  } else if (satProb >= 45) {
    elements.satGaugeCircle.style.stroke = 'var(--accent-amber)';
  } else {
    elements.satGaugeCircle.style.stroke = 'var(--accent-red)';
  }

  // Satisfaction outcome pill
  if (data.satisfaction === 'Satisfied') {
    elements.resSatisfaction.className = 'outcome-pill outcome-satisfied';
    elements.resSatisfaction.textContent = 'Satisfied (Rating ≥ 4.0)';
  } else {
    elements.resSatisfaction.className = 'outcome-pill outcome-dissatisfied';
    elements.resSatisfaction.textContent = 'Dissatisfied Risk (Rating < 4.0)';
  }

  // Risk Badge
  elements.resRiskLevel.className = 'risk-badge';
  if (data.risk_level === 'Low Risk') {
    elements.resRiskLevel.classList.add('risk-low');
    elements.resRiskLevel.textContent = 'Low Churn Risk';
  } else if (data.risk_level === 'Medium Risk') {
    elements.resRiskLevel.classList.add('risk-med');
    elements.resRiskLevel.textContent = 'Moderate Churn Risk';
  } else {
    elements.resRiskLevel.classList.add('risk-high');
    elements.resRiskLevel.textContent = 'High Churn Alert';
  }

  // Explanation text
  if (satProb >= 70) {
    elements.resSatExplanation.textContent =
      'High probability of customer satisfaction. Delivery time is tightly contained and partner ratings are strong.';
  } else if (satProb >= 45) {
    elements.resSatExplanation.textContent =
      'Borderline customer experience. Increased delivery friction from traffic or prep duration introduces churn vulnerability.';
  } else {
    elements.resSatExplanation.textContent =
      'Severe dissatisfaction risk detected! Extended delivery delay and adverse ambient conditions jeopardize customer retention.';
  }

  // 4. Actionable Recommendations
  elements.recoList.innerHTML = '';
  data.recommendations.forEach(r => {
    const li = document.createElement('li');
    li.textContent = r;
    elements.recoList.appendChild(li);
  });
}

// ===================================================================
// DATASET EXPLORER & PAGINATION
// ===================================================================
function initDatasetExplorer() {
  elements.btnPrevPage.addEventListener('click', () => {
    if (state.datasetPage > 1) {
      state.datasetPage--;
      fetchDataset();
    }
  });

  elements.btnNextPage.addEventListener('click', () => {
    state.datasetPage++;
    fetchDataset();
  });

  elements.datasetSearchInput.addEventListener('input', () => {
    state.datasetPage = 1;
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(fetchDataset, 300);
  });

  elements.filterSatisfaction.addEventListener('change', () => {
    state.datasetPage = 1;
    fetchDataset();
  });

  elements.filterTraffic.addEventListener('change', () => {
    state.datasetPage = 1;
    fetchDataset();
  });

  elements.filterWeather.addEventListener('change', () => {
    state.datasetPage = 1;
    fetchDataset();
  });

  elements.btnResetFilters.addEventListener('click', () => {
    elements.datasetSearchInput.value = '';
    elements.filterSatisfaction.value = '';
    elements.filterTraffic.value = '';
    elements.filterWeather.value = '';
    state.datasetPage = 1;
    fetchDataset();
  });
}

async function fetchDataset() {
  const query = new URLSearchParams({
    page: state.datasetPage,
    page_size: state.datasetPageSize,
    satisfaction: elements.filterSatisfaction.value,
    traffic: elements.filterTraffic.value,
    weather: elements.filterWeather.value,
    search: elements.datasetSearchInput.value
  });

  elements.ordersTableBody.innerHTML = `
    <tr><td colspan="14" class="loading-cell">Fetching order records...</td></tr>
  `;

  try {
    const res = await fetch(`/api/dataset?${query.toString()}`);
    if (!res.ok) throw new Error('Dataset fetch error');
    const data = await res.json();
    renderDatasetTable(data);
  } catch (err) {
    console.error('Failed to load dataset:', err);
    elements.ordersTableBody.innerHTML = `
      <tr><td colspan="14" class="loading-cell" style="color: var(--accent-red);">Failed to retrieve records.</td></tr>
    `;
  }
}

function renderDatasetTable(data) {
  const tbody = elements.ordersTableBody;
  tbody.innerHTML = '';

  if (!data.records || data.records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="14" class="loading-cell">No matching orders found.</td></tr>`;
    elements.datasetCountInfo.textContent = 'Showing 0 of 0 orders';
    elements.btnPrevPage.disabled = true;
    elements.btnNextPage.disabled = true;
    return;
  }

  const start = (data.page - 1) * data.page_size + 1;
  const end = Math.min(start + data.records.length - 1, data.total);
  elements.datasetCountInfo.textContent = `Showing ${start}–${end} of ${data.total.toLocaleString()} cleaned orders`;
  elements.pageIndicator.textContent = `Page ${data.page}`;
  elements.btnPrevPage.disabled = data.page <= 1;
  elements.btnNextPage.disabled = end >= data.total;

  data.records.forEach(row => {
    const tr = document.createElement('tr');

    const satClass = row.satisfaction === 'Satisfied' ? 'sat-yes' : 'sat-no';
    const custRatingDisplay = row.customer_rating !== 'N/A' && row.customer_rating !== null
      ? `${parseFloat(row.customer_rating).toFixed(1)} ★`
      : 'Unrated';

    tr.innerHTML = `
      <td class="order-id-cell">${row.order_id}</td>
      <td>${parseFloat(row.distance_km).toFixed(1)}</td>
      <td>${Math.round(row.preparation_time_min)}</td>
      <td>${row.traffic}</td>
      <td>${row.weather}</td>
      <td>${row.hour}:00</td>
      <td>${row.number_of_items}</td>
      <td>₹${Math.round(row.order_value)}</td>
      <td>${parseFloat(row.restaurant_rating).toFixed(1)} ★</td>
      <td>${parseFloat(row.courier_rating).toFixed(1)} ★</td>
      <td>${Math.round(row.estimated_delivery_min)}m</td>
      <td><strong>${parseFloat(row.actual_delivery_min).toFixed(1)}m</strong></td>
      <td>${custRatingDisplay}</td>
      <td><span class="sat-badge-sm ${satClass}">${row.satisfaction}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ===================================================================
// METRICS & FEATURE IMPORTANCES
// ===================================================================
async function fetchMetrics() {
  try {
    const res = await fetch('/api/metrics');
    if (!res.ok) return;
    const data = await res.json();
    state.metricsData = data;
    renderModelDiagnostics(data);
  } catch (err) {
    console.error('Error fetching project metrics:', err);
  }
}

function renderModelDiagnostics(data) {
  if (!data.feature_importances) return;

  const container = elements.importanceContainer;
  container.innerHTML = '';

  const top10 = data.feature_importances.slice(0, 10);
  const maxImp = Math.max(...top10.map(item => item.importance));

  top10.forEach(item => {
    const row = document.createElement('div');
    row.className = 'imp-row';

    const barPct = (item.importance / maxImp) * 100;
    row.innerHTML = `
      <span class="imp-name" title="${item.feature}">${item.feature}</span>
      <span class="imp-bar-wrap">
        <span class="imp-bar" style="width: ${barPct}%;"></span>
      </span>
      <span class="imp-value">${item.importance.toFixed(1)}%</span>
    `;
    container.appendChild(row);
  });
}
