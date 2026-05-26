

const Charts = {
  
    colors: {
        primary: '#8B0000',
        primaryLight: 'rgba(139, 0, 0, 0.05)',
        grid: '#e2e8f0',
        text: '#64748b'
    },

    updateLineChart(id, labels, data, label) {
        if (appState.charts[id]) appState.charts[id].destroy();

        const ctx = document.getElementById(id).getContext('2d');
        appState.charts[id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label,
                    data,
                    borderColor: this.colors.primary,
                    backgroundColor: this.colors.primaryLight,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: this.colors.text } },
                    y: { grid: { color: this.colors.grid }, ticks: { color: this.colors.text } }
                }
            }
        });
    },


    updateBarChart(id, labels, data) {
        if (appState.charts[id]) appState.charts[id].destroy();

        const ctx = document.getElementById(id).getContext('2d');
        appState.charts[id] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: this.colors.primary,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: false, ticks: { color: this.colors.text } },
                    x: { ticks: { color: this.colors.text } }
                }
            }
        });
    },

    updateScatter(id, pts, xLabel) {
        if (appState.charts[id]) appState.charts[id].destroy();

        const ctx = document.getElementById(id).getContext('2d');
        appState.charts[id] = new Chart(ctx, {
            data: {
                datasets: [
                    {
                        type: 'scatter',
                        data: pts,
                        backgroundColor: this.colors.primary,
                        pointRadius: 4
                    },
                    {
                        type: 'line',
                        data: Utils.getRegLine(pts),
                        borderColor: '#333',
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { 
                        title: { display: true, text: xLabel, color: this.colors.text },
                        ticks: { color: this.colors.text }
                    },
                    y: { ticks: { color: this.colors.text } }
                }
            }
        });
    }
};