// Nombramos y asignamos las variables de los inputs y otros elementos del main
let data = [];
let currentSample = [];

const universeTbody = document.querySelector('#universeTable tbody');
const sampleTbody   = document.querySelector('#sampleTable tbody');
const sizeSlider    = document.getElementById('sampleSize');
const sizeLabel     = document.getElementById('sampleSizeLabel');
const methodSelect  = document.getElementById('samplingMethod');
const sampleBtn     = document.getElementById('sampleBtn');
const prefSectorSel = document.getElementById('prefSector');
const prefForm      = document.getElementById('prefForm');
const prefSalaryInp = document.getElementById('prefSalary');
const recomDiv      = document.getElementById('recommendation');
const chartCtx      = document.getElementById('salaryChart').getContext('2d');
let chart;

// Llamamos a la base de datos
sizeSlider.addEventListener('input', e => sizeLabel.textContent = e.target.value);

fetch('dataset.json')
  .then(r => r.json())
  .then(json => {
    data = json;
    renderUniverse();
    populateSectorOptions();
    generateSample();
  });

// Funciones de renderizado
function rowHtml(d) {
  return `<tr><td class="px-2">${d.profession}</td><td class="px-2">${d.sector}</td><td class="px-2 text-right">${d.avg_salary}</td><td class="px-2 text-center">${d.years_study}</td></tr>`;
}

function renderUniverse() {
  universeTbody.innerHTML = data.map(rowHtml).join('');
}

function renderSample() {
  sampleTbody.innerHTML = currentSample.map(rowHtml).join('');
}

function populateSectorOptions() {
  const sectors = [...new Set(data.map(d => d.sector))];
  sectors.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    prefSectorSel.appendChild(opt);
  });
}

// Funciones correspondientes a los tipos de muestreo
sampleBtn.addEventListener('click', generateSample);

function generateSample() {
  const n = parseInt(sizeSlider.value);
  currentSample = methodSelect.value === 'stratified' ? stratifiedSample(data, n) : simpleSample(data, n);
  renderSample();
  updateChart();
}

function simpleSample(arr, n) {
  return shuffle([...arr]).slice(0, n);
}

function stratifiedSample(arr, n) {
  const groups = {};
  arr.forEach(d => {
    (groups[d.sector] = groups[d.sector] || []).push(d);
  });
  const sectors = Object.keys(groups);
  const base = Math.floor(n / sectors.length);
  let remainder = n % sectors.length;
  const out = [];
  sectors.forEach(s => {
    const k = base + (remainder-- > 0 ? 1 : 0);
    out.push(...shuffle(groups[s]).slice(0, k));
  });
  return out;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Grafico referencial
function updateChart() {
  const popMean = data.reduce((s, d) => s + d.avg_salary, 0) / data.length;
  const sampMean = currentSample.reduce((s, d) => s + d.avg_salary, 0) / currentSample.length;
  const cfg = {
    type: 'bar',
    data: {
      labels: ['Población', 'Muestra'],
      datasets: [{ data: [popMean, sampMean], backgroundColor: ['#60a5fa', '#fbbf24'] }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  };
  if (chart) chart.destroy();
  chart = new Chart(chartCtx, cfg);
}

// Funciones para personalizar preferencia y dar las reecomendaciones al usuario
prefForm.addEventListener('submit', e => { e.preventDefault(); recommend(); });

function recommend() {
  const sector = prefSectorSel.value;
  const target = parseInt(prefSalaryInp.value);
  const popTop   = topMatches(data, sector, target);
  const sampTop  = topMatches(currentSample, sector, target);
  recomDiv.innerHTML = renderRecTable(popTop, 'Población') + renderRecTable(sampTop, 'Muestra');
}

function topMatches(arr, sector, target) {
  let list = sector ? arr.filter(d => d.sector === sector) : [...arr];
  if (!isNaN(target)) list.sort((a, b) => Math.abs(a.avg_salary - target) - Math.abs(b.avg_salary - target)); // Si no se encuentra exactamente el salario esperado se obtiene un intervalo aproximando la diferencia entre los extremos y el salario esperado
  return list.slice(0, 5);
}

function renderRecTable(arr, title) {
  if (!arr.length) return `<p class="text-sm text-gray-500">No hay coincidencias en ${title.toLowerCase()}.</p>`;
  const rows = arr.map(d => `<tr><td class="px-2">${d.profession}</td><td class="px-2 text-right">${d.avg_salary}</td><td class="px-2 text-center">${d.years_study}</td></tr>`).join('');
  return `<div class="mt-4"><h3 class="font-semibold mb-1">${title}</h3><table class="min-w-full text-sm"><thead class="bg-gray-100"><tr><th class="px-2">Profesión</th><th class="px-2">Salario</th><th class="px-2">Años</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
