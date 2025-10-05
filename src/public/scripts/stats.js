// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const dashboard = document.getElementById('dashboard');
    const tokenForm = document.getElementById('tokenForm');
    const tokenInput = document.getElementById('tokenInput');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    
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
        const submitButton = tokenForm.querySelector('button[type="submit"]');
        
        if (!token) {
            showError('Inserisci un token valido');
            return;
        }

        // Show loading state on button
        setButtonLoading(submitButton, true);
        
        try {
            await validateToken(token);
        } finally {
            // Reset button state
            setButtonLoading(submitButton, false);
        }
    });

    // Handle logout
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('statsToken');
        stopUpdateTimer();
        showLoginForm();
    });

    async function validateToken(token) {
        try {
            // Use dedicated lightweight token validation endpoint
            const response = await fetch(`/api/validate-token?token=${encodeURIComponent(token)}`);
            
            if (response.ok) {
                localStorage.setItem('statsToken', token);
                // Show dashboard immediately with loading state
                showDashboard();
                showLoadingState();
                
                // Load stats data in background (non-blocking)
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
        }
    }

    function showLoginForm() {
        loginForm.style.display = 'block';
        dashboard.style.display = 'none';
        tokenInput.value = ''; // Clear token input
        tokenInput.placeholder = 'Inserisci il token'; // Reset placeholder
        loginError.style.display = 'none'; // Hide any previous errors
        
        // Reset button state in case it was in loading state
        const submitButton = tokenForm.querySelector('button[type="submit"]');
        if (submitButton) {
            setButtonLoading(submitButton, false);
        }
    }

    function showDashboard() {
        loginForm.style.display = 'none';
        dashboard.style.display = 'block';
    }

    function showLoadingState() {
        // Show loading indicators for all charts
        const charts = ['requestsChart', 'enrollmentsChart', 'activeUsersChart', 'devicesChart', 'urlGenerationChart'];
        charts.forEach(chartId => {
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Get colors that adapt to dark mode
                const bgColor = getComputedStyle(document.body).getPropertyValue('--bs-body-bg') || '#ffffff';
                const textColor = getComputedStyle(document.body).getPropertyValue('--bs-body-color') || '#212529';
                
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = textColor;
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

    function setButtonLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Caricamento...';
            button.classList.add('btn-secondary');
            button.classList.remove('btn-primary');
        } else {
            button.disabled = false;
            button.innerHTML = 'Accedi';
            button.classList.add('btn-primary');
            button.classList.remove('btn-secondary');
        }
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
                () => updateUrlGenerationChart(data.urlGenerationData, data.courseData)
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


    function updateUrlGenerationChart(data, courseData) {
        const canvas = document.getElementById('urlGenerationChart');
        if (!canvas) {
            console.error('Canvas element urlGenerationChart not found!');
            return;
        }
        const ctx = canvas.getContext('2d');
        
        if (window.urlGenerationChart && typeof window.urlGenerationChart.destroy === 'function') {
            window.urlGenerationChart.destroy();
        }
        
        if (!data || !data.courses || data.courses.length === 0) {
            // Show empty state
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bs-body-bg') || '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bs-body-color') || '#212529';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Nessun dato disponibile', canvas.width / 2, canvas.height / 2);
            return;
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
        
        // Create a map of course names to enrollment counts
        const enrollmentMap = {};
        if (courseData && courseData.x && courseData.y) {
            courseData.x.forEach((courseName, index) => {
                enrollmentMap[courseName] = courseData.y[index];
            });
        }
        
        // Generate colors for each course
        const colors = [
            'rgb(54, 162, 235)',
            'rgb(255, 99, 132)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)',
            'rgb(199, 199, 199)',
            'rgb(83, 102, 255)',
            'rgb(255, 234, 99)',
            'rgb(255, 132, 99)',
            'rgb(99, 255, 132)',
            'rgb(132, 99, 255)',
            'rgb(255, 99, 255)',
            'rgb(99, 255, 255)',
            'rgb(255, 255, 99)',
            'rgb(99, 132, 255)',
            'rgb(255, 99, 99)',
            'rgb(99, 255, 99)',
            'rgb(255, 132, 132)',
            'rgb(132, 255, 132)'
        ];
        
        // Prepare datasets for each course
        const datasets = data.courses.map((course, index) => {
            const courseData = data.data[course] || [];
            const enrollmentCount = enrollmentMap[course] || 0;
            const formattedCourseName = formatCourseName(course);
            
            return {
                label: `${formattedCourseName} (${enrollmentCount.toLocaleString()} iscritti)`,
                data: courseData.map(item => {
                    // Create a consistent date from the day number
                    // day number represents days since Unix epoch
                    const date = new Date(item.day * 86400000);
                    return { x: date, y: item.y };
                }),
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length],
                fill: false,
                tension: 0.4,
                pointRadius: 2,
                pointHoverRadius: 4
            };
        });
        
        // Get all unique dates for labels
        const allDates = new Set();
        data.courses.forEach(course => {
            const courseData = data.data[course] || [];
            courseData.forEach(item => {
                // Create consistent date from day number
                const date = new Date(item.day * 86400000);
                allDates.add(date.getTime());
            });
        });
        
        const sortedDates = Array.from(allDates).sort();
        const labels = sortedDates.map(date => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
        
        window.urlGenerationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'URL Generate'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 11
                            },
                            boxWidth: 12,
                            boxHeight: 12
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                // Get the actual date from the first dataset's data point
                                const dataIndex = context[0].dataIndex;
                                const firstDataset = context[0].chart.data.datasets[0];
                                const actualDate = firstDataset.data[dataIndex].x;
                                
                                return actualDate.toLocaleDateString('it-IT', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                });
                            }
                        }
                    }
                }
            }
        });
    }
});