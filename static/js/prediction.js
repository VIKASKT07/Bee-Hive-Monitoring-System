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

// Prediction Functionality
async function fetchPrediction() {
  try {
    const response = await fetch('/api/gas/predict');
    if (!response.ok) {
      throw new Error('Failed to fetch prediction data');
    }
    
    const data = await response.json();
    updatePredictionDisplay(data);
    populatePredictionList(data);
  } catch (error) {
    console.error('Error fetching prediction:', error);
    document.getElementById('eta-value').textContent = 'It is the predicted time in which gas leakage may happen';
    document.getElementById('expected-value').textContent = 'It is the predicted value of the gas Leakage';
  }
}

function updatePredictionDisplay(data) {
  const { eta_hours, expected_value } = data;
  
  // Update ETA
  const etaElement = document.getElementById('eta-value');
  if (eta_hours !== null) {
    const etaFormatted = eta_hours.toFixed(1);
    etaElement.textContent = `${etaFormatted} hours`;
    
    // Add color coding based on urgency
    if (eta_hours < 3) {
      etaElement.classList.add('status-alert');
    } else if (eta_hours < 12) {
      etaElement.classList.add('status-warning');
    } else {
      etaElement.classList.add('status-ok');
    }
  } else {
    etaElement.textContent = '—';
  }
  
  // Update expected value
  const valueElement = document.getElementById('expected-value');
  if (expected_value !== null) {
    const valueFormatted = expected_value.toFixed(0);
    valueElement.textContent = `${valueFormatted} ppm`;
    
    // Add color coding based on value
    if (expected_value > 1000) {
      valueElement.classList.add('status-alert');
    } else if (expected_value > 800) {
      valueElement.classList.add('status-warning');
    } else {
      valueElement.classList.add('status-ok');
    }
  } else {
    valueElement.textContent = '—';
  }
}

function populatePredictionList(data) {
  // This function is a placeholder for showing prediction details
  // In a real implementation, this would show more detailed prediction information
  const predictionList = document.getElementById('prediction-list');
  predictionList.innerHTML = '';
  
  // Create some sample prediction items based on the data
  const items = [
    {
      message: `Based on current trends, gas levels are ${data.eta_hours < 10 ? 'rapidly' : 'gradually'} increasing.`,
      importance: data.eta_hours < 5 ? 'high' : 'medium'
    },
    {
      message: `Predicted to reach alert threshold (1000 ppm) in approximately ${data.eta_hours ? data.eta_hours.toFixed(1) : '?'} hours.`,
      importance: data.eta_hours < 3 ? 'high' : 'medium'
    },
    {
      message: `Expected maximum value: ${data.expected_value ? data.expected_value.toFixed(0) : '?'} ppm.`,
      importance: data.expected_value > 1000 ? 'high' : 'medium'
    },
    {
      message: 'Regular monitoring is recommended. Check readings at least once every hour.',
      importance: 'low'
    }
  ];
  
  // Add each prediction item with a slight delay for animation
  items.forEach((item, index) => {
    setTimeout(() => {
      const itemElement = document.createElement('div');
      itemElement.className = `prediction-item importance-${item.importance}`;
      itemElement.textContent = item.message;
      predictionList.appendChild(itemElement);
    }, index * 100);
  });
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  fetchPrediction(); // Initial fetch
  
  // Set up polling
  setInterval(fetchPrediction, 5000);
  
  // Add animation classes to safety cards
  const safetyCards = document.querySelectorAll('.safety-card');
  safetyCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 50);
    }, index * 150);
  });
});