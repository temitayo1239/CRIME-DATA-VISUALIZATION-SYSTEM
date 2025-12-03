// Crime Data Store
let crimes = [
  { type: "Theft", location: "Market", date: "2025-12-02", status: "Logged", lat: 40.7128, lng: -74.0060 },
  { type: "Assault", location: "Main Rd", date: "2025-12-01", status: "Under Review", lat: 40.7489, lng: -73.9680 },
  { type: "Robbery", location: "Junction", date: "2025-11-30", status: "Confirmed", lat: 40.7282, lng: -73.9942 },
  { type: "Burglary", location: "Downtown", date: "2025-11-28", status: "Logged", lat: 40.7614, lng: -73.9776 },
  { type: "Vandalism", location: "Park", date: "2025-12-03", status: "Confirmed", lat: 40.7827, lng: -73.9654 }
];

// Initialize Leaflet Map
const map = L.map('map').setView([40.74, -73.98], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Charts
let trendChart, typeChart;

// Update Map Markers
function updateMap() {
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });
  crimes.forEach(crime => {
    if (crime.lat && crime.lng) {
      L.marker([crime.lat, crime.lng])
        .addTo(map)
        .bindPopup(`<b>${crime.type}</b><br>${crime.location}<br>${crime.date}`);
    }
  });
}

// Update Charts
function updateCharts() {
  // Monthly Trend + Forecast
  const monthly = {};
  crimes.forEach(c => {
    const month = c.date.substring(0, 7);
    monthly[month] = (monthly[month] || 0) + 1;
  });
  const labels = Object.keys(monthly).sort();
  const data = labels.map(m => monthly[m]);

  // Simple Linear Forecast (next 3 months)
  const lastValues = data.slice(-3);
  const trend = lastValues.reduce((a, b, i, arr) => a + (b - (arr[i-1] || b)), 0) / (lastValues.length - 1 || 1);
  const lastMonth = labels[labels.length - 1] || "2025-12";
  const forecastLabels = [];
  const forecastData = [];
  for (let i = 1; i <= 3; i++) {
    const [y, m] = lastMonth.split('-').map(Number);
    const next = new Date(y, m + i - 1);
    const label = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    forecastLabels.push(label);
    forecastData.push(Math.max(0, data[data.length - 1] + trend * i));
  }

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: {
      labels: [...labels, ...forecastLabels],
      datasets: [
        { label: 'Actual Crimes', data: [...data, ...Array(3).fill(null)], borderColor: '#1a2a44', tension: 0.4, fill: false },
        { label: 'Forecast', data: [null, null, null, ...forecastData], borderColor: '#ff6b6b', borderDash: [6, 6], tension: 0.4 }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });

  // Crime Type Distribution
  const typeCount = {};
  crimes.forEach(c => typeCount[c.type] = (typeCount[c.type] || 0) + 1);

  if (typeChart) typeChart.destroy();
  typeChart = new Chart(document.getElementById('typeChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(typeCount),
      datasets: [{
        data: Object.values(typeCount),
        backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe']
      }]
    },
    options: { responsive: true }
  });
}

// Update Table & Stats
function updateTable() {
  const tbody = document.querySelector('#crimeTable tbody');
  tbody.innerHTML = '';
  crimes.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.type}</td><td>${c.location}</td><td>${c.date}</td><td>${c.status}</td>`;
    tbody.appendChild(tr);
  });

  // Update Stats
  document.getElementById('totalCrimes').textContent = crimes.length;
  document.getElementById('crimeTypes').textContent = new Set(crimes.map(c => c.type)).size;
  const currentMonth = new Date().toISOString().slice(0, 7);
  document.getElementById('thisMonth').textContent = crimes.filter(c => c.date.startsWith(currentMonth)).length;

  // Populate Type Filter
  const types = [...new Set(crimes.map(c => c.type))].sort();
  const select = document.getElementById('typeFilter');
  select.innerHTML = '<option value="">All Types</option>';
  types.forEach(t => {
    const opt = new Option(t, t);
    select.appendChild(opt);
  });
}

// Filter Table
function filterTable() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type = document.getElementById('typeFilter').value;
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;

  const filtered = crimes.filter(c => {
    const matchesSearch = c.type.toLowerCase().includes(search) || c.location.toLowerCase().includes(search);
    const matchesType = !type || c.type === type;
    const matchesFrom = !from || c.date >= from;
    const matchesTo = !to || c.date <= to;
    return matchesSearch && matchesType && matchesFrom && matchesTo;
  });

  const tbody = document.querySelector('#crimeTable tbody');
  tbody.innerHTML = '';
  filtered.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.type}</td><td>${c.location}</td><td>${c.date}</td><td>${c.status}</td>`;
    tbody.appendChild(tr);
  });
}

// Export to CSV
function exportTable() {
  let csv = "Crime Type,Location,Date,Status\n";
  crimes.forEach(c => {
    csv += `"${c.type}","${c.location}","${c.date}","${c.status}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = "crime_records.csv";
  a.click();
}

// Handle CSV Upload
document.getElementById('upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const text = ev.target.result;
    const lines = text.trim().split('\n');
    lines.slice(1).forEach(line => {
      const [type, location, date, status] = line.split(',').map(s => s.replace(/^"|"$/g, '').trim());
      if (type && date) {
        crimes.push({
          type,
          location: location || "Unknown",
          date,
          status: status || "Logged",
          lat: 40.71 + Math.random() * 0.1,
          lng: -74.01 + Math.random() * 0.1
        });
      }
    });
    initDashboard();
    alert("CSV data uploaded successfully!");
  };
  reader.readAsText(file);
});

// Attach filter events
document.getElementById('searchInput').addEventListener('keyup', filterTable);
document.getElementById('typeFilter').addEventListener('change', filterTable);
document.getElementById('dateFrom').addEventListener('change', filterTable);
document.getElementById('dateTo').addEventListener('change', filterTable);

// Initialize Dashboard
function initDashboard() {
  updateMap();
  updateCharts();
  updateTable();
}

// Start the app
initDashboard();