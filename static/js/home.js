// Enhanced Dashboard JavaScript for Smart Beehive Monitoring System
class BeehiveDashboard {
    constructor() {
        this.isOnline = navigator.onLine;
        this.refreshInterval = null;
        this.refreshRate = 5000; // 5 seconds
        this.errorCount = 0;
        this.maxErrors = 3;
        
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupRefreshButton();
        this.setupConnectionMonitoring();
        this.setupScrollToData();
        this.setupErrorToast();
        this.startDataRefresh();
        
        // Initial data fetch
        this.fetchAllData();
    }

    // Theme Management - keeping original functionality
    setupThemeToggle() {
        const themeBtn = document.getElementById('theme-toggle');
        
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
        
        themeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Add ripple effect
            this.createRippleEffect(themeBtn);
        });
    }

    // Refresh Button
    setupRefreshButton() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.manualRefresh();
        });
    }

    manualRefresh() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.classList.add('rotating');
        
        this.fetchAllData().finally(() => {
            setTimeout(() => {
                refreshBtn.classList.remove('rotating');
            }, 1000);
        });
    }

    // Connection Monitoring
    setupConnectionMonitoring() {
        const statusElement = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-text');
        
        const updateConnectionStatus = (online) => {
            this.isOnline = online;
            statusElement.classList.toggle('offline', !online);
            statusElement.classList.remove('hidden');
            statusText.textContent = online ? 'Connected' : 'Offline';
            
            if (online && this.errorCount > 0) {
                this.errorCount = 0;
                this.fetchAllData();
            }
            
            // Hide status after 3 seconds if connected
            if (online) {
                setTimeout(() => {
                    statusElement.classList.add('hidden');
                }, 3000);
            }
        };

        window.addEventListener('online', () => updateConnectionStatus(true));
        window.addEventListener('offline', () => updateConnectionStatus(false));
        
        // Initial check
        updateConnectionStatus(this.isOnline);
    }

    // Scroll to Data Section
    setupScrollToData() {
        const monitorBtn = document.getElementById('monitor-btn');
        const dataSection = document.getElementById('data-section');
        
        monitorBtn.addEventListener('click', () => {
            dataSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        });
    }

    // Error Toast Management
    setupErrorToast() {
        const closeBtn = document.getElementById('close-error');
        closeBtn.addEventListener('click', () => {
            this.hideErrorToast();
        });
    }

    showErrorToast(message) {
        const toast = document.getElementById('error-toast');
        const messageElement = document.getElementById('error-message');
        
        messageElement.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideErrorToast();
        }, 5000);
    }

    hideErrorToast() {
        const toast = document.getElementById('error-toast');
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }

    // Data Fetching - keeping original API calls
    async fetchAllData() {
        if (!this.isOnline) return;
        
        const promises = [
            this.fetchGasData(),
            this.fetchWeightData()
        ];
        
        try {
            await Promise.allSettled(promises);
            this.updateLastUpdateTime();
            this.errorCount = 0;
        } catch (error) {
            console.error('Error fetching data:', error);
            this.handleFetchError();
        }
    }

    async fetchGasData() {
        const loadingElement = document.getElementById('gas-loading');
        const valueElement = document.getElementById('gas-value');
        const timeElement = document.getElementById('gas-time');
        const statusElement = document.getElementById('gas-status');
        
        try {
            loadingElement.classList.add('show');
            
            const response = await fetch('/api/gas/last/1');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const gasData = data[0];
                const value = gasData.value;
                
                // Animate value change
                this.animateValueChange(valueElement, value);
                timeElement.textContent = `Timestamp: ${gasData.timestamp}`;
                
                // Update status
                this.updateGasStatus(value, statusElement);
            }
        } catch (error) {
            console.error('Gas data fetch error:', error);
            valueElement.textContent = '--';
            timeElement.textContent = 'Failed to fetch data';
            statusElement.textContent = '';
            statusElement.className = 'sensor-status';
            throw error;
        } finally {
            loadingElement.classList.remove('show');
        }
    }

    async fetchWeightData() {
        const loadingElement = document.getElementById('weight-loading');
        const valueElement = document.getElementById('weight-value');
        const timeElement = document.getElementById('weight-time');
        const alertElement = document.getElementById('weight-alert');
        const progressElement = document.getElementById('weight-progress');
        
        try {
            loadingElement.classList.add('show');
            
            const response = await fetch('/api/weight/last/1');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const weightData = data[0];
                const weight = weightData.weight;
                
                // Animate value change
                this.animateValueChange(valueElement, weight);
                timeElement.textContent = `Timestamp: ${new Date(weightData.timestamp).toLocaleString()}`;
                
                // Update progress bar
                this.updateWeightProgress(weight, progressElement);
                
                // Update alert - keeping original logic
                this.updateWeightAlert(weight, alertElement);
            }
        } catch (error) {
            console.error('Weight data fetch error:', error);
            valueElement.textContent = '--';
            timeElement.textContent = 'Failed to fetch data';
            alertElement.textContent = '';
            alertElement.className = 'alert-message';
            progressElement.style.width = '0%';
            throw error;
        } finally {
            loadingElement.classList.remove('show');
        }
    }

    // Animation and UI Updates
    animateValueChange(element, newValue) {
        element.style.transform = 'scale(1.1)';
        element.style.color = 'var(--color-honey)';
        
        setTimeout(() => {
            element.textContent = newValue;
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 150);
    }

    updateGasStatus(value, statusElement) {
        let status = '';
        let className = 'sensor-status';
        
        if (value < 400) {
            status = 'Normal';
            className += ' normal';
        } else if (value < 1000) {
            status = 'Elevated';
            className += ' warning';
        } else {
            status = 'High';
            className += ' danger';
        }
        
        statusElement.textContent = status;
        statusElement.className = className;
    }

    updateWeightProgress(weight, progressElement) {
        const maxWeight = 500; // Maximum threshold weight
        const percentage = Math.min((weight / maxWeight) * 100, 100);
        progressElement.style.width = `${percentage}%`;
    }

    updateWeightAlert(weight, alertElement) {
        // Keep original alert logic
        alertElement.classList.remove('show', 'semi-alert', 'alert');
        
        if (weight > 200 && weight <= 500) {
            alertElement.textContent = "⚠️ The weight of the beehive crossed semi-threshold. Once check the beehive.";
            alertElement.classList.add('semi-alert');
        } else if (weight > 500) {
            alertElement.textContent = "🚨 The weight crossed full threshold! Check for honey.";
            alertElement.classList.add('alert');
        } else {
            alertElement.textContent = "";
            return;
        }
        
        // Animate alert appearance
        setTimeout(() => {
            alertElement.classList.add('show');
        }, 100);
    }

    updateLastUpdateTime() {
        const timeElement = document.getElementById('last-update-time');
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        timeElement.textContent = timeString;
    }

    // Error Handling
    handleFetchError() {
        this.errorCount++;
        
        if (this.errorCount >= this.maxErrors) {
            this.showErrorToast('Multiple connection failures. Please check your network.');
            this.stopDataRefresh();
            
            // Retry after 30 seconds
            setTimeout(() => {
                if (this.isOnline) {
                    this.startDataRefresh();
                    this.errorCount = 0;
                }
            }, 30000);
        } else {
            this.showErrorToast(`Connection error (${this.errorCount}/${this.maxErrors}). Retrying...`);
        }
    }

    // Data Refresh Management
    startDataRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.fetchAllData();
        }, this.refreshRate);
    }

    stopDataRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Utility Functions
    createRippleEffect(element) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = '50%';
        ripple.style.top = '50%';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        ripple.style.pointerEvents = 'none';
        ripple.style.animation = 'ripple 0.6s ease-out';
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
}

// Add ripple animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new BeehiveDashboard();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (window.dashboard) {
        if (document.hidden) {
            window.dashboard.stopDataRefresh();
        } else {
            window.dashboard.startDataRefresh();
            window.dashboard.fetchAllData();
        }
    }
});