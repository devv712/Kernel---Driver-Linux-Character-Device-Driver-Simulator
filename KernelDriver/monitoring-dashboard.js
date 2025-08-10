/**
 * Real-time Monitoring Dashboard for Character Device Driver
 * Handles live statistics, charts, and performance monitoring
 */

class MonitoringDashboard {
    constructor() {
        this.chartData = {
            labels: [],
            readData: [],
            writeData: [],
            maxPoints: 30
        };
        
        this.updateInterval = null;
        this.stressTestInterval = null;
        this.asyncReadInterval = null;
        
        this.initializeChart();
        this.startRealTimeMonitoring();
    }
    
    initializeChart() {
        const ctx = document.getElementById('throughputChart');
        if (!ctx) return;
        
        this.throughputChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.chartData.labels,
                datasets: [
                    {
                        label: 'Read Rate (bytes/s)',
                        data: this.chartData.readData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Write Rate (bytes/s)',
                        data: this.chartData.writeData,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Device I/O Throughput'
                    }
                },
                animation: {
                    duration: 750
                }
            }
        });
    }
    
    updateChart(stats) {
        const now = new Date().toLocaleTimeString();
        
        // Add new data point
        this.chartData.labels.push(now);
        this.chartData.readData.push(stats.readRate || 0);
        this.chartData.writeData.push(stats.writeRate || 0);
        
        // Remove old data points
        if (this.chartData.labels.length > this.chartData.maxPoints) {
            this.chartData.labels.shift();
            this.chartData.readData.shift();
            this.chartData.writeData.shift();
        }
        
        // Update chart
        if (this.throughputChart) {
            this.throughputChart.update('none');
        }
    }
    
    updateStatistics(stats) {
        // Update numeric statistics
        this.updateElement('bytes-read', this.formatBytes(stats.bytesRead));
        this.updateElement('bytes-written', this.formatBytes(stats.bytesWritten));
        this.updateElement('open-count', stats.openCount);
        
        // Update buffer usage
        const bufferUsagePercent = (stats.bufferUsed / stats.bufferSize) * 100;
        const bufferBar = document.getElementById('buffer-usage');
        if (bufferBar) {
            bufferBar.style.width = bufferUsagePercent + '%';
            bufferBar.setAttribute('aria-valuenow', bufferUsagePercent);
        }
        
        this.updateElement('buffer-size', this.formatBytes(stats.bufferSize));
        
        // Update concurrent access indicators
        this.updateElement('active-readers', stats.activeReaders);
        this.updateElement('active-writers', stats.activeWriters);
        this.updateElement('queue-length', stats.queueLength);
        
        // Update /proc/mychardev_stats
        this.updateElement('proc-stats', window.kernelSimulator.getProcStats());
        
        // Update advanced features
        if (window.kernelSimulator) {
            const advanced = window.kernelSimulator.getAdvancedMetrics();
            this.updateAdvancedMetrics(advanced);
        }
        
        // Add visual indicators for active operations
        this.updateConcurrentIndicators(stats);
    }
    
    updateAdvancedMetrics(metrics) {
        // Update system load
        this.updateElement('cpu-usage', Math.round(metrics.systemLoad.cpu) + '%');
        this.updateElement('memory-usage', Math.round(metrics.systemLoad.memory) + '%');
        this.updateElement('io-load', Math.round(metrics.systemLoad.io) + '%');
        
        // Update process monitor
        this.updateProcessMonitor(metrics.processes);
        
        // Gradually decrease system load when not under stress
        if (Math.random() > 0.7) {
            window.kernelSimulator.systemLoad.cpu = Math.max(0, window.kernelSimulator.systemLoad.cpu - 2);
            window.kernelSimulator.systemLoad.io = Math.max(0, window.kernelSimulator.systemLoad.io - 1);
        }
    }
    
    updateProcessMonitor(processes) {
        const monitor = document.getElementById('process-monitor');
        if (!monitor) return;
        
        if (processes.length === 0) {
            monitor.innerHTML = '<small class="text-muted">No active processes</small>';
            return;
        }
        
        const processHTML = processes.slice(0, 5).map(proc => `
            <div class="process-entry">
                <span class="process-pid">${proc.pid}</span>
                <span class="process-name">${proc.name}</span>
                <span class="process-status">${proc.status}</span>
            </div>
        `).join('');
        
        monitor.innerHTML = processHTML;
    }
    
    updateConcurrentIndicators(stats) {
        const readersElement = document.getElementById('active-readers');
        const writersElement = document.getElementById('active-writers');
        
        if (readersElement) {
            readersElement.className = stats.activeReaders > 0 ? 
                'badge bg-info operation-active' : 'badge bg-info';
        }
        
        if (writersElement) {
            writersElement.className = stats.activeWriters > 0 ? 
                'badge bg-warning operation-active' : 'badge bg-warning';
        }
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    startRealTimeMonitoring() {
        this.updateInterval = setInterval(() => {
            if (window.kernelSimulator) {
                const stats = window.kernelSimulator.getStats();
                this.updateStatistics(stats);
                this.updateChart(stats);
            }
        }, 1000);
    }
    
    stopRealTimeMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    startStressTest() {
        if (this.stressTestInterval) {
            this.stopStressTest();
        }
        
        this.showToast('Stress test started', 'success');
        window.kernelSimulator.logKernel('INFO', 'Stress test initiated');
        
        this.stressTestInterval = setInterval(() => {
            if (window.kernelSimulator) {
                // Generate multiple concurrent operations
                for (let i = 0; i < 3; i++) {
                    window.kernelSimulator.simulateStressTest();
                }
            }
        }, 200);
        
        // Auto-stop after 30 seconds
        setTimeout(() => {
            this.stopStressTest();
        }, 30000);
    }
    
    stopStressTest() {
        if (this.stressTestInterval) {
            clearInterval(this.stressTestInterval);
            this.stressTestInterval = null;
            this.showToast('Stress test stopped', 'info');
            window.kernelSimulator.logKernel('INFO', 'Stress test completed');
        }
    }
    
    startAsyncRead() {
        if (this.asyncReadInterval) {
            this.stopAsyncRead();
        }
        
        this.showToast('Asynchronous read started', 'info');
        window.kernelSimulator.logKernel('INFO', 'Async I/O monitoring started');
        
        this.asyncReadInterval = setInterval(() => {
            if (window.kernelSimulator) {
                window.kernelSimulator.deviceRead(64)
                    .then(result => {
                        if (result.bytesRead > 0) {
                            console.log('Async read:', result.data);
                        }
                    })
                    .catch(error => {
                        console.log('Async read blocked:', error.message);
                    });
            }
        }, 1500);
    }
    
    stopAsyncRead() {
        if (this.asyncReadInterval) {
            clearInterval(this.asyncReadInterval);
            this.asyncReadInterval = null;
            this.showToast('Asynchronous read stopped', 'info');
            window.kernelSimulator.logKernel('INFO', 'Async I/O monitoring stopped');
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastBody = document.getElementById('toast-body');
        
        if (toast && toastBody) {
            toastBody.textContent = message;
            toast.className = `toast toast-${type}`;
            
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    }
    
    exportStats() {
        if (!window.kernelSimulator) return;
        
        const stats = window.kernelSimulator.getStats();
        const csv = this.generateCSV(stats);
        this.downloadCSV(csv, 'device_stats.csv');
    }
    
    generateCSV(stats) {
        const headers = [
            'timestamp', 'bytes_read', 'bytes_written', 'open_count',
            'ioctl_count', 'error_count', 'buffer_used', 'buffer_size',
            'active_readers', 'active_writers', 'read_rate', 'write_rate'
        ];
        
        const row = [
            new Date().toISOString(),
            stats.bytesRead,
            stats.bytesWritten,
            stats.openCount,
            stats.ioctlCount,
            stats.errorCount,
            stats.bufferUsed,
            stats.bufferSize,
            stats.activeReaders,
            stats.activeWriters,
            stats.readRate.toFixed(2),
            stats.writeRate.toFixed(2)
        ];
        
        return headers.join(',') + '\n' + row.join(',');
    }
    
    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Global monitoring dashboard instance
let monitoringDashboard;

// Initialize monitoring dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    monitoringDashboard = new MonitoringDashboard();
    
    // Export function for kernel simulator
    window.updateMonitoringDashboard = function() {
        if (monitoringDashboard && window.kernelSimulator) {
            const stats = window.kernelSimulator.getStats();
            monitoringDashboard.updateStatistics(stats);
        }
    };
});

// Export dashboard functions globally
window.startStressTest = function() {
    if (monitoringDashboard) {
        monitoringDashboard.startStressTest();
    }
};

window.stopStressTest = function() {
    if (monitoringDashboard) {
        monitoringDashboard.stopStressTest();
    }
};

window.startAsyncRead = function() {
    if (monitoringDashboard) {
        monitoringDashboard.startAsyncRead();
    }
};

window.stopAsyncRead = function() {
    if (monitoringDashboard) {
        monitoringDashboard.stopAsyncRead();
    }
};

window.exportStats = function() {
    if (monitoringDashboard) {
        monitoringDashboard.exportStats();
    }
};
