// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const dashboard = document.getElementById('dashboard');
    const tokenForm = document.getElementById('tokenForm');
    const tokenInput = document.getElementById('tokenInput');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    
    let isLoading = false;

    // Temporary: Clear localStorage on page load to fix the issue
    console.log('Clearing localStorage to fix login issue');
    localStorage.removeItem('statsToken');
    
    // Test Chart.js availability
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    if (typeof Chart !== 'undefined') {
        console.log('Chart.js version:', Chart.version);
        
        // Test if we can create a simple chart
        setTimeout(() => {
            const testCanvas = document.getElementById('requestsChart');
            if (testCanvas) {
                console.log('Test canvas found, trying to create test chart...');
                try {
                    const testCtx = testCanvas.getContext('2d');
                    const testChart = new Chart(testCtx, {
                        type: 'line',
                        data: {
                            labels: ['Test 1', 'Test 2', 'Test 3'],
                            datasets: [{
                                label: 'Test Data',
                                data: [1, 2, 3],
                                borderColor: 'rgb(255, 99, 132)',
                                backgroundColor: 'rgba(255, 99, 132, 0.1)'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false
                        }
                    });
                    console.log('Test chart created successfully!');
                } catch (error) {
                    console.error('Test chart creation failed:', error);
                }
            }
        }, 1000);
    }

    // Check if user is already logged in
    const savedToken = localStorage.getItem('statsToken');
    console.log('Saved token found:', savedToken ? 'Yes' : 'No');
    if (savedToken) {
        console.log('Token value:', savedToken);
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
        console.log('Logging out, clearing localStorage');
        localStorage.removeItem('statsToken');
        showLoginForm();
    });

    async function validateToken(token) {
        console.log('Validating token:', token);
        if (isLoading) return;
        isLoading = true;
        
        try {
            const response = await fetch(`/api/stats/summary?token=${encodeURIComponent(token)}`);
            console.log('Token validation response status:', response.status);
            
            if (response.ok) {
                console.log('Token is valid, showing dashboard');
                localStorage.setItem('statsToken', token);
                showDashboard();
                loadStatsData(token);
            } else {
                console.log('Token is invalid, showing login form');
                // Clear invalid token
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
        tokenInput.value = '';
        loginError.style.display = 'none';
    }

    function showDashboard() {
        loginForm.style.display = 'none';
        dashboard.style.display = 'block';
    }

    function showError(message) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }

    async function loadStatsData(token) {
        if (isLoading) return;
        isLoading = true;
        
        try {
            const response = await fetch(`/api/stats/summary?token=${encodeURIComponent(token)}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch stats data');
            }
            
            const data = await response.json();
            console.log('Stats data loaded:', data);
            
            // Update summary cards
            updateSummaryCards(data);
            
            // Update charts
            updateRequestsChart(data.requestsDayByDay);
            updateEnrollmentsChart(data.enrollmentsDayByDay);
            updateActiveUsersChart(data.activeUsersDayByDay);
            updateDevicesChart(data.deviceData);
            updateCoursesChart(data.courseData);
            
            // Update last updated time
            document.getElementById('lastUpdated').textContent = new Date().toLocaleString('it-IT');
            
        } catch (error) {
            console.error('Error loading stats data:', error);
            showError('Errore nel caricamento dei dati: ' + error.message);
        } finally {
            isLoading = false;
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

    function updateRequestsChart(data) {
        console.log('Creating requests chart with data:', data);
        console.log('Chart.js available:', typeof Chart !== 'undefined');
        
        const canvas = document.getElementById('requestsChart');
        console.log('Canvas element found:', canvas ? 'Yes' : 'No');
        if (!canvas) {
            console.error('Canvas element requestsChart not found!');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        if (window.requestsChart) {
            window.requestsChart.destroy();
        }
        
        try {
            console.log('Chart data prepared:', {
                labels: data.map(item => new Date(item.x)),
                datasets: [{
                    label: 'Richieste',
                    data: data.map(item => item.y),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            });
            
            // Simple test chart first
            window.requestsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.map(item => new Date(item.x).toLocaleDateString()),
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
        const ctx = document.getElementById('enrollmentsChart').getContext('2d');
        
        if (window.enrollmentsChart) {
            window.enrollmentsChart.destroy();
        }
        
        window.enrollmentsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => new Date(item.x)),
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
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].label).toLocaleDateString('it-IT');
                            },
                            label: function(context) {
                                return `Iscrizioni: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'dd MMM yyyy',
                            displayFormats: {
                                day: 'dd MMM'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Numero Iscrizioni'
                        }
                    }
                }
            }
        });
    }

    function updateActiveUsersChart(data) {
        const ctx = document.getElementById('activeUsersChart').getContext('2d');
        
        if (window.activeUsersChart) {
            window.activeUsersChart.destroy();
        }
        
        window.activeUsersChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => new Date(item.x)),
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
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].label).toLocaleDateString('it-IT');
                            },
                            label: function(context) {
                                return `Utenti Attivi: ${context.parsed.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            tooltipFormat: 'dd MMM yyyy',
                            displayFormats: {
                                day: 'dd MMM'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Data'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Numero Utenti'
                        }
                    }
                }
            }
        });
    }

    function updateDevicesChart(data) {
        const ctx = document.getElementById('devicesChart').getContext('2d');
        
        if (window.devicesChart) {
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
        const ctx = document.getElementById('coursesChart').getContext('2d');
        
        if (window.coursesChart) {
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
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)',
            'rgba(255, 132, 99, 0.8)',
            'rgba(132, 99, 255, 0.8)',
            'rgba(99, 255, 255, 0.8)',
            'rgba(255, 255, 99, 0.8)',
            'rgba(99, 132, 255, 0.8)',
            'rgba(255, 99, 99, 0.8)',
            'rgba(99, 255, 99, 0.8)',
            'rgba(255, 132, 255, 0.8)',
            'rgba(132, 255, 99, 0.8)',
            'rgba(99, 99, 255, 0.8)'
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
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Numero Utenti'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Corsi'
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