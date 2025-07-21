// Theme Toggle Functionality
function initializeTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    document.body.classList.add('dark-theme');
    updateThemeIcon(true);
  } else {
    updateThemeIcon(false);
  }
  
  // Toggle theme on button click
  themeToggle.addEventListener('click', () => {
    const isDarkTheme = document.body.classList.toggle('dark-theme');
    updateThemeIcon(isDarkTheme);
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    
    // Update chart theme if it exists
    if (window.gasChart) {
      updateChartTheme(window.gasChart, isDarkTheme);
      window.gasChart.update();
    }
  });
}

function updateThemeIcon(isDarkTheme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (isDarkTheme) {
    themeToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`;
  } else {
    themeToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;
  }
}

// Table Sorting Functionality
function initializeTableSorting() {
  const table = document.getElementById('gasTable');
  const headers = table.querySelectorAll('th.sortable');
  
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const sortField = header.getAttribute('data-sort');
      const currentDirection = header.classList.contains('asc') ? 'desc' : 'asc';
      
      // Reset all headers
      headers.forEach(h => {
        h.classList.remove('asc', 'desc');
      });
      
      // Set current header
      header.classList.add(currentDirection);
      
      // Re-sort and render data
      sortAndRenderData(sortField, currentDirection);
    });
  });
}

function sortAndRenderData(field, direction) {
  // First get existing data
  const rows = Array.from(document.querySelectorAll('#gasTable tbody tr'))
    .map(row => {
      const cells = row.querySelectorAll('td');
      return {
        id: parseInt(cells[0].textContent, 10),
        value: parseInt(cells[1].textContent, 10),
        timestamp: cells[2].textContent
      };
    });
  
  // Sort data
  rows.sort((a, b) => {
    let comparison = 0;
    
    if (field === 'id') {
      comparison = a.id - b.id;
    } else if (field === 'value') {
      comparison = a.value - b.value;
    } else if (field === 'timestamp') {
      comparison = new Date(a.timestamp) - new Date(b.timestamp);
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  // Render sorted data
  renderTable(rows, false);
}

// Gas Data Handling
let chartData = {
  timestamps: [],
  values: []
};

let previousData = [];

async function fetchData() {
  const loadingIndicator = document.getElementById('loading-indicator');
  loadingIndicator.classList.add('active');
  
  try {
    const response = await fetch('/api/gas/last/30');
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    
    const data = await response.json();
    
    // Check if new data is different from previous data
    const isNewData = JSON.stringify(data) !== JSON.stringify(previousData);
    previousData = [...data];
    
    if (isNewData) {
      updateStatistics(data);
      renderTable(data, true);
      updateChartData(data);
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  } finally {
    setTimeout(() => {
      loadingIndicator.classList.remove('active');
    }, 500);
  }
}

function updateStatistics(data) {
  if (data.length === 0) return;
  
  // Update latest reading
  const latestReading = document.getElementById('latest-reading');
  const latestValue = data[0].value;
  latestReading.querySelector('.stat-value').textContent = latestValue + ' ppm';
  latestReading.querySelector('.stat-value').className = 'stat-value ' + 
    (latestValue > 1000 ? 'status-alert' : 'status-ok');
  
  // Count alerts
  const alertCount = document.getElementById('alert-count');
  const alerts = data.filter(reading => reading.value > 1000).length;
  alertCount.querySelector('.stat-value').textContent = alerts;
}

function renderTable(data, animateNewRows) {
  const tbody = document.querySelector('#gasTable tbody');
  
  // Get sorting info to maintain sort state
  const sortField = document.querySelector('th.sortable.asc, th.sortable.desc');
  const sortDirection = sortField?.classList.contains('asc') ? 'asc' : 'desc';
  
  // Clear table
  tbody.innerHTML = '';
  
  // Add data
  data.forEach((reading, index) => {
    const row = document.createElement('tr');
    if (animateNewRows && index === 0) {
      row.classList.add('row-new');
    }
    
    const statusClass = reading.value > 1000 ? 'status-alert' : 'status-ok';
    
    row.innerHTML = `
      <td>${reading.id}</td>
      <td class="${statusClass}">${reading.value}</td>
      <td>${new Date(reading.timestamp).toLocaleString()}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // If we had a sort active, re-apply it
  if (sortField) {
    const field = sortField.getAttribute('data-sort');
    sortAndRenderData(field, sortDirection);
  }
}

// Chart functionality
function initializeChart() {
  const ctx = document.getElementById('gasChart').getContext('2d');
  const isDarkTheme = document.body.classList.contains('dark-theme');
  
  window.gasChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Gas Level (ppm)',
        data: [],
        borderColor: '#0A84FF',
        backgroundColor: 'rgba(10, 132, 255, 0.1)',
        borderWidth: 2,
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: isDarkTheme ? '#3A3A3C' : 'rgba(255, 255, 255, 0.9)',
          titleColor: isDarkTheme ? '#FFFFFF' : '#212529',
          bodyColor: isDarkTheme ? '#ABABAB' : '#495057',
          borderColor: isDarkTheme ? '#3A3A3C' : '#DEE2E6',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `${context.parsed.y} ppm`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: isDarkTheme ? '#ABABAB' : '#495057',
            maxRotation: 0,
            callback: function(value, index, values) {
              const label = this.getLabelForValue(value);
              return new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: isDarkTheme ? '#ABABAB' : '#495057'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      animation: {
        duration: 1000
      }
    }
  });
}

function updateChartTheme(chart, isDarkTheme) {
  chart.options.plugins.tooltip.backgroundColor = isDarkTheme ? '#3A3A3C' : 'rgba(255, 255, 255, 0.9)';
  chart.options.plugins.tooltip.titleColor = isDarkTheme ? '#FFFFFF' : '#212529';
  chart.options.plugins.tooltip.bodyColor = isDarkTheme ? '#ABABAB' : '#495057';
  chart.options.plugins.tooltip.borderColor = isDarkTheme ? '#3A3A3C' : '#DEE2E6';
  
  chart.options.scales.x.grid.color = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  chart.options.scales.x.ticks.color = isDarkTheme ? '#ABABAB' : '#495057';
  
  chart.options.scales.y.grid.color = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  chart.options.scales.y.ticks.color = isDarkTheme ? '#ABABAB' : '#495057';
}

function updateChartData(data) {
  if (!window.gasChart || data.length === 0) return;
  
  // Prepare data for chart (reverse to show chronological order)
  const reversed = [...data].reverse();
  
  chartData.timestamps = reversed.map(reading => reading.timestamp);
  chartData.values = reversed.map(reading => reading.value);
  
  // Update chart
  window.gasChart.data.labels = chartData.timestamps;
  window.gasChart.data.datasets[0].data = chartData.values;
  
  // Add danger threshold line if any value is close to 1000
  const maxValue = Math.max(...chartData.values);
  if (maxValue > 800) {
    if (!window.gasChart.data.datasets[1]) {
      window.gasChart.data.datasets.push({
        label: 'Alert Threshold',
        data: Array(chartData.timestamps.length).fill(1000),
        borderColor: '#FF453A',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    } else {
      window.gasChart.data.datasets[1].data = Array(chartData.timestamps.length).fill(1000);
    }
  }
  
  window.gasChart.update();
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeTableSorting();
  initializeChart();
  fetchData(); // Initial fetch
  
  // Set up polling
  setInterval(fetchData, 3000);
});