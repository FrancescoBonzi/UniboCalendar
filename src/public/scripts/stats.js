// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const dashboard = document.getElementById('dashboard');
    const tokenForm = document.getElementById('tokenForm');
    const tokenInput = document.getElementById('tokenInput');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    
    let isLoading = false;
let lastUpdateTime = null;
let updateTimer = null;

    // Temporary: Clear localStorage on page load to fix the issue
    localStorage.removeItem('statsToken');
    
    // Test Chart.js availability
    if (typeof Chart !== 'undefined') {
        // Chart.js is available and working
    }

    // Check if user is already logged in
    const savedToken = localStorage.getItem('statsToken');
    if (savedToken) {
        // Validate token before showing dashboard
        validateToken(savedToken);
    }

    // Handle login form submission
    tokenForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = tokenInput.value.trim();
        
        if (!token) {
            showError('Inserisci un token valido');
            return;
        }

        await validateToken(token);
    });

    // Handle logout
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('statsToken');
        stopUpdateTimer();
        showLoginForm();
    });

    async function validateToken(token) {
        if (isLoading) {
            return;
        }
        isLoading = true;
        
        try {
            // Quick token validation - just check if it exists in DB
            const response = await fetch(`/api/stats/summary?token=${encodeURIComponent(token)}`);
            
            if (response.ok) {
                localStorage.setItem('statsToken', token);
                // Show dashboard immediately with loading state
                showDashboard();
                showLoadingState();
                
                // Load stats data in background (non-blocking)
                isLoading = false;
                loadStatsData(token);
            } else {
                localStorage.removeItem('statsToken');
                showLoginForm();
                const errorData = await response.json();
                showError(errorData.error || 'Token non valido');
            }
        } catch (error) {
            console.error('Token validation error:', error);
            localStorage.removeItem('statsToken');
            showLoginForm();
            showError('Errore di connessione. Riprova.');
        } finally {
            isLoading = false;
        }
    }

    function showLoginForm() {
        loginForm.style.display = 'block';
        dashboard.style.display = 'none';
        tokenInput.value = ''; // Clear token input
        tokenInput.placeholder = 'Inserisci il token'; // Reset placeholder
        loginError.style.display = 'none'; // Hide any previous errors
    }

    function showDashboard() {
        loginForm.style.display = 'none';
        dashboard.style.display = 'block';
    }

    function showLoadingState() {
        // Show loading indicators for all charts
        const charts = ['requestsChart', 'enrollmentsChart', 'activeUsersChart', 'devicesChart', 'coursesChart'];
        charts.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Caricamento...', canvas.width / 2, canvas.height / 2);
            }
        });
        
        // Show loading for summary cards
        document.getElementById('totalEnrollments').textContent = '...';
        document.getElementById('activeUsersToday').textContent = '...';
        document.getElementById('activeEnrollments').textContent = '...';
    }

    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }

    async function loadStatsData(token) {
        try {
            const response = await fetch(`/api/stats/summary?token=${encodeURIComponent(token)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch stats data: ${response.status} ${response.statusText}`);
            }
        
            const data = await response.json();
            
            // Update summary cards first (fastest)
            updateSummaryCards(data);

            // Update charts in parallel for better performance
            const chartUpdates = [
                () => updateRequestsChart(data.requestsDayByDay),
                () => updateEnrollmentsChart(data.enrollmentsDayByDay),
                () => updateActiveUsersChart(data.activeUsersDayByDay),
                () => updateDevicesChart(data.deviceData),
                () => updateCoursesChart(data.courseData)
            ];
            
            // Execute chart updates in parallel
            await Promise.all(chartUpdates.map(update => {
                try {
                    return update();
                } catch (error) {
                    console.error('Error updating chart:', error);
                    return Promise.resolve();
                }
            }));
            
            // Start the update timer
            startUpdateTimer();
            
        } catch (error) {
            console.error('Error loading stats data:', error);
            showError('Errore nel caricamento dei dati: ' + error.message);
        }
    }

    function updateSummaryCards(data) {
        document.getElementById('totalEnrollments').textContent = data.totalEnrollments || 0;
        document.getElementById('activeUsersToday').textContent = data.activeUsersToday || 0;
        
        // Handle activeEnrollments - it might be an array or a number
        const activeEnrollments = Array.isArray(data.activeEnrollments) 
            ? data.activeEnrollments.length 
            : data.activeEnrollments || 0;
        document.getElementById('activeEnrollments').textContent = activeEnrollments;
    }

    function startUpdateTimer() {
        // Clear existing timer
        if (updateTimer) {
            clearInterval(updateTimer);
        }
        
        // Set initial time
        lastUpdateTime = new Date();
        updateLastUpdatedDisplay();
        
        // Update every second
        updateTimer = setInterval(updateLastUpdatedDisplay, 1000);
    }

    function updateLastUpdatedDisplay() {
        if (!lastUpdateTime) return;
        
        const now = new Date();
        const diffMs = now - lastUpdateTime;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        
        let timeString;
        if (diffHours > 0) {
            timeString = `${diffHours}h ${diffMinutes % 60}m fa`;
        } else if (diffMinutes > 0) {
            timeString = `${diffMinutes}m fa`;
        } else {
            timeString = `${diffSeconds}s fa`;
        }
        
        document.getElementById('lastUpdated').textContent = timeString;
    }

    function stopUpdateTimer() {
        if (updateTimer) {
            clearInterval(updateTimer);
            updateTimer = null;
        }
    }

    function updateRequestsChart(data) {
        const canvas = document.getElementById('requestsChart');
        if (!canvas) {
            console.error('Canvas element requestsChart not found!');
        return;
    }
    
        const ctx = canvas.getContext('2d');
        
        if (window.requestsChart && typeof window.requestsChart.destroy === 'function') {
            window.requestsChart.destroy();
        }
        
        try {
            // Simple test chart first
            window.requestsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(item => new Date(item.x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
                    datasets: [{
                        label: 'Richieste',
                        data: data.map(item => item.y),
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        fill: true,
                        tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
            console.error('Error creating requests chart:', error);
        }
    }

    function updateEnrollmentsChart(data) {
        const canvas = document.getElementById('enrollmentsChart');
        if (!canvas) {
            console.error('Canvas element enrollmentsChart not found!');
        return;
        }
        const ctx = canvas.getContext('2d');
        
        if (window.enrollmentsChart && typeof window.enrollmentsChart.destroy === 'function') {
            window.enrollmentsChart.destroy();
        }
        
        window.enrollmentsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => new Date(item.x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
                datasets: [{
                    label: 'Iscrizioni',
                    data: data.map(item => item.y),
                    borderColor: 'rgb(255, 159, 64)',
                    backgroundColor: 'rgba(255, 159, 64, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateActiveUsersChart(data) {
        const canvas = document.getElementById('activeUsersChart');
        if (!canvas) {
            console.error('Canvas element activeUsersChart not found!');
        return;
    }
        const ctx = canvas.getContext('2d');
        
        if (window.activeUsersChart && typeof window.activeUsersChart.destroy === 'function') {
            window.activeUsersChart.destroy();
        }
        
        window.activeUsersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => new Date(item.x).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
                datasets: [{
                    label: 'Utenti Attivi',
                    data: data.map(item => item.y),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateDevicesChart(data) {
        const canvas = document.getElementById('devicesChart');
        if (!canvas) {
            console.error('Canvas element devicesChart not found!');
        return;
    }
        const ctx = canvas.getContext('2d');
        
        if (window.devicesChart && typeof window.devicesChart.destroy === 'function') {
            window.devicesChart.destroy();
        }
        
        // Modern color palette
        const colors = [
            'rgb(54, 162, 235)',
            'rgb(255, 99, 132)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(199, 199, 199)'
        ];
        
        window.devicesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.x,
                datasets: [{
                    data: data.y,
                    backgroundColor: colors.slice(0, data.x.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                size: 12
                            },
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateCoursesChart(data) {
        const canvas = document.getElementById('coursesChart');
        if (!canvas) {
            console.error('Canvas element coursesChart not found!');
            return;
        }
        const ctx = canvas.getContext('2d');
        
        if (window.coursesChart && typeof window.coursesChart.destroy === 'function') {
            window.coursesChart.destroy();
        }
        
        // Format course names
        function formatCourseName(name) {
            // Keep CLaBE and CTF as is
            if (name === 'CLaBE' || name === 'CTF') {
                return name;
            }
            
            // Split camel case and remove hyphens
            return name
                .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                .replace(/-/g, ' ') // Replace hyphens with spaces
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .trim();
        }
        
        const labels = data.x.slice(0, 20).map(formatCourseName);
        const values = data.y.slice(0, 20);
        
        // Define colors for the chart
        const colors = [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 234, 99, 0.8)',
            'rgba(255, 132, 99, 0.8)',
        ];
        
        window.coursesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Numero Utenti',
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Numero Utenti'
                        }
                    },
                    y: {
                        title: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            padding: 15,
                            font: {
                                size: 11
                            },
                            callback: function(value, index, values) {
                                // Ensure all labels are displayed
                                return this.getLabelForValue(value);
                            }
                        },
                        grid: {
                            display: false
                        },
                        afterFit: function(scale) {
                            // Ensure proper spacing for all labels
                            scale.height = Math.max(scale.height, labels.length * 25);
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
});