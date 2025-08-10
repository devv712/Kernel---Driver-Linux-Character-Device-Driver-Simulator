/**
 * Main Application Controller for Character Device Driver Simulator
 * Handles user interactions and coordinates between UI and kernel simulator
 */

class DeviceDriverApp {
    constructor() {
        this.initializeEventHandlers();
        this.updateModuleStatus();
    }
    
    initializeEventHandlers() {
        // Device operation event handlers are set up via onclick attributes
        // Additional event handlers can be added here
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'r') {
                event.preventDefault();
                this.readFromDevice();
            } else if (event.ctrlKey && event.key === 'w') {
                event.preventDefault();
                document.getElementById('writeData').focus();
            }
        });
        
        // Auto-resize text areas
        document.addEventListener('input', (event) => {
            if (event.target.tagName.toLowerCase() === 'textarea') {
                this.autoResizeTextarea(event.target);
            }
        });
    }
    
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    
    updateModuleStatus() {
        const statusElement = document.getElementById('module-status');
        if (!statusElement) return;
        
        if (window.kernelSimulator && window.kernelSimulator.moduleLoaded) {
            statusElement.textContent = 'Module Loaded';
            statusElement.className = 'badge bg-success me-2';
        } else {
            statusElement.textContent = 'Module Unloaded';
            statusElement.className = 'badge bg-danger me-2 module-unloaded';
        }
    }
    
    async writeToDevice() {
        const writeDataInput = document.getElementById('writeData');
        const data = writeDataInput.value.trim();
        
        if (!data) {
            this.showToast('Please enter data to write', 'warning');
            return;
        }
        
        if (!window.kernelSimulator) {
            this.showToast('Kernel simulator not initialized', 'error');
            return;
        }
        
        try {
            // Show loading state
            const writeButton = event.target;
            const originalText = writeButton.innerHTML;
            writeButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Writing...';
            writeButton.disabled = true;
            
            // Perform write operation
            const result = await window.kernelSimulator.deviceWrite(data);
            
            // Clear input on success
            writeDataInput.value = '';
            this.showToast(result.message, 'success');
            
        } catch (error) {
            this.showToast('Write failed: ' + error.message, 'error');
        } finally {
            // Restore button state
            const writeButton = document.querySelector('button[onclick="writeToDevice()"]');
            if (writeButton) {
                writeButton.innerHTML = '<i class="bi bi-arrow-down-circle"></i> Write';
                writeButton.disabled = false;
            }
        }
    }
    
    async readFromDevice() {
        const readSizeInput = document.getElementById('readSize');
        const readOutput = document.getElementById('readOutput');
        const size = parseInt(readSizeInput.value) || 1024;
        
        if (!window.kernelSimulator) {
            this.showToast('Kernel simulator not initialized', 'error');
            return;
        }
        
        try {
            // Show loading state
            const readButton = event.target;
            const originalText = readButton.innerHTML;
            readButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Reading...';
            readButton.disabled = true;
            
            // Perform read operation
            const result = await window.kernelSimulator.deviceRead(size);
            
            // Display read data
            if (result.bytesRead > 0) {
                readOutput.value = result.data;
                this.showToast(`Read ${result.bytesRead} bytes successfully`, 'success');
            } else {
                readOutput.value = '';
                this.showToast('No data available to read', 'info');
            }
            
        } catch (error) {
            readOutput.value = '';
            this.showToast('Read failed: ' + error.message, 'error');
        } finally {
            // Restore button state
            const readButton = document.querySelector('button[onclick="readFromDevice()"]');
            if (readButton) {
                readButton.innerHTML = '<i class="bi bi-arrow-up-circle"></i> Read';
                readButton.disabled = false;
            }
        }
    }
    
    async ioctlCommand(command) {
        if (!window.kernelSimulator) {
            this.showToast('Kernel simulator not initialized', 'error');
            return;
        }
        
        try {
            let arg = null;
            
            // Handle commands that need arguments
            if (command === 'SET_BUFFER_SIZE') {
                arg = prompt('Enter new buffer size (bytes):', '2048');
                if (arg === null) return; // User cancelled
                arg = parseInt(arg);
                if (isNaN(arg) || arg <= 0) {
                    this.showToast('Invalid buffer size', 'error');
                    return;
                }
            }
            
            // Execute IOCTL command
            const result = await window.kernelSimulator.deviceIoctl(command, arg);
            this.showToast(result.message, 'success');
            
        } catch (error) {
            this.showToast('IOCTL failed: ' + error.message, 'error');
        }
    }
    
    toggleModule() {
        if (!window.kernelSimulator) {
            this.showToast('Kernel simulator not initialized', 'error');
            return;
        }
        
        if (window.kernelSimulator.moduleLoaded) {
            window.kernelSimulator.unloadModule();
            this.showToast('Module unloaded', 'warning');
        } else {
            window.kernelSimulator.loadModule();
            this.showToast('Module loaded', 'success');
        }
        
        this.updateModuleStatus();
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
    
    // Performance monitoring helpers
    measureLatency(operation) {
        const startTime = performance.now();
        return operation().then(result => {
            const endTime = performance.now();
            const latency = endTime - startTime;
            console.log(`Operation latency: ${latency.toFixed(2)}ms`);
            return { ...result, latency };
        });
    }
    
    // Utility functions for testing
    generateRandomData(size = 100) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < size; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    async runBenchmark(iterations = 100) {
        if (!window.kernelSimulator) {
            this.showToast('Kernel simulator not initialized', 'error');
            return;
        }
        
        const results = {
            writeLatencies: [],
            readLatencies: [],
            totalTime: 0
        };
        
        const startTime = performance.now();
        
        for (let i = 0; i < iterations; i++) {
            try {
                // Write benchmark
                const writeData = this.generateRandomData(50);
                const writeStart = performance.now();
                await window.kernelSimulator.deviceWrite(writeData);
                const writeEnd = performance.now();
                results.writeLatencies.push(writeEnd - writeStart);
                
                // Read benchmark
                const readStart = performance.now();
                await window.kernelSimulator.deviceRead(50);
                const readEnd = performance.now();
                results.readLatencies.push(readEnd - readStart);
                
            } catch (error) {
                console.warn(`Benchmark iteration ${i} failed:`, error.message);
            }
        }
        
        results.totalTime = performance.now() - startTime;
        
        // Calculate statistics
        const avgWriteLatency = results.writeLatencies.reduce((a, b) => a + b, 0) / results.writeLatencies.length;
        const avgReadLatency = results.readLatencies.reduce((a, b) => a + b, 0) / results.readLatencies.length;
        
        console.log('Benchmark Results:', {
            iterations,
            avgWriteLatency: avgWriteLatency.toFixed(2) + 'ms',
            avgReadLatency: avgReadLatency.toFixed(2) + 'ms',
            totalTime: results.totalTime.toFixed(2) + 'ms',
            throughput: (iterations * 2 / (results.totalTime / 1000)).toFixed(2) + ' ops/sec'
        });
        
        this.showToast(`Benchmark completed: ${iterations} iterations`, 'success');
        
        return results;
    }
}

// Global functions for onclick handlers
function writeToDevice() {
    if (window.deviceDriverApp) {
        window.deviceDriverApp.writeToDevice();
    }
}

function readFromDevice() {
    if (window.deviceDriverApp) {
        window.deviceDriverApp.readFromDevice();
    }
}

function ioctlCommand(command) {
    if (window.deviceDriverApp) {
        window.deviceDriverApp.ioctlCommand(command);
    }
}

function toggleModule() {
    if (window.deviceDriverApp) {
        window.deviceDriverApp.toggleModule();
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.deviceDriverApp = new DeviceDriverApp();
    
    // Show welcome message
    setTimeout(() => {
        if (window.deviceDriverApp) {
            window.deviceDriverApp.showToast('Character device driver simulator initialized', 'success');
        }
    }, 1000);
});

// Export utility functions for console access
window.runBenchmark = function(iterations) {
    if (window.deviceDriverApp) {
        return window.deviceDriverApp.runBenchmark(iterations);
    }
};

window.generateTestData = function(size) {
    if (window.deviceDriverApp) {
        return window.deviceDriverApp.generateRandomData(size);
    }
};

// Debug helpers
window.getKernelStats = function() {
    return window.kernelSimulator ? window.kernelSimulator.getStats() : null;
};

window.getKernelLogs = function(count = 10) {
    if (!window.kernelSimulator) return [];
    return window.kernelSimulator.kernelLogs.slice(-count);
};

// Advanced Features Global Functions
window.simulateInterrupt = async function() {
    if (!window.kernelSimulator) return;
    
    try {
        const result = await window.kernelSimulator.simulateInterrupt();
        if (window.deviceDriverApp) {
            window.deviceDriverApp.showToast(result.message, result.success ? 'success' : 'error');
        }
        return result;
    } catch (error) {
        if (window.deviceDriverApp) {
            window.deviceDriverApp.showToast('Interrupt simulation failed: ' + error.message, 'error');
        }
    }
};

window.simulateDMA = async function() {
    if (!window.kernelSimulator) return;
    
    try {
        const result = await window.kernelSimulator.simulateDMA();
        if (window.deviceDriverApp) {
            window.deviceDriverApp.showToast(result.message, result.success ? 'success' : 'error');
        }
        return result;
    } catch (error) {
        if (window.deviceDriverApp) {
            window.deviceDriverApp.showToast('DMA simulation failed: ' + error.message, 'error');
        }
    }
};

window.startNetworkSim = function() {
    if (!window.kernelSimulator) return;
    
    window.kernelSimulator.startNetworkSimulation();
    if (window.deviceDriverApp) {
        window.deviceDriverApp.showToast('Network simulation started', 'info');
    }
};

window.showNetStats = function() {
    if (!window.kernelSimulator) return;
    
    const netStats = window.kernelSimulator.networkSim;
    const statsText = `Network Statistics:
RX Packets: ${netStats.packetsRx}
TX Packets: ${netStats.packetsTx}
Errors: ${netStats.errors}
Status: ${netStats.active ? 'Active' : 'Inactive'}`;
    
    alert(statsText);
};

window.showMemoryMap = function() {
    if (!window.kernelSimulator) return;
    
    const memMap = window.kernelSimulator.getMemoryMap();
    const memoryHTML = `
        <div class="memory-map">
            ${memMap.segments.map(seg => `
                <div class="memory-segment memory-${seg.name}" 
                     style="width: ${seg.percentage}%" 
                     title="${seg.name}: ${window.kernelSimulator.formatBytes(seg.size)}">
                    ${seg.percentage > 10 ? seg.name.toUpperCase() : ''}
                </div>
            `).join('')}
        </div>
        <div class="text-center mt-2">
            <small>Total Memory: ${window.kernelSimulator.formatBytes(memMap.total)}</small>
        </div>
    `;
    
    // Create modal for memory map
    const modal = document.createElement('div');
    modal.className = 'metrics-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="metrics-content">
            <h5>Memory Map Visualization</h5>
            ${memoryHTML}
            <div class="mt-3">
                <h6>Memory Segments:</h6>
                <ul class="list-unstyled">
                    ${memMap.segments.map(seg => `
                        <li><span class="memory-segment memory-${seg.name}" style="width:20px;height:12px;display:inline-block;margin-right:8px;"></span>
                        ${seg.name}: ${window.kernelSimulator.formatBytes(seg.size)} (${seg.percentage.toFixed(1)}%)</li>
                    `).join('')}
                </ul>
            </div>
            <button class="btn btn-secondary mt-3" onclick="this.closest('.metrics-modal').remove()">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

window.simulateMemoryLeak = function() {
    if (!window.kernelSimulator) return;
    
    const result = window.kernelSimulator.simulateMemoryLeak();
    if (window.deviceDriverApp) {
        window.deviceDriverApp.showToast(
            `Memory leak simulated: ${window.kernelSimulator.formatBytes(result.leakSize)}`, 
            'warning'
        );
    }
    
    return result;
};

window.exportCSV = function() {
    if (!window.kernelSimulator) return;
    
    const csvData = window.kernelSimulator.exportToCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device_driver_stats_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    if (window.deviceDriverApp) {
        window.deviceDriverApp.showToast('CSV exported successfully', 'success');
    }
};

window.showAdvancedMetrics = function() {
    if (!window.kernelSimulator) return;
    
    const metrics = window.kernelSimulator.getAdvancedMetrics();
    const metricsHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6>Interrupt Statistics</h6>
                <ul class="list-unstyled small">
                    <li>Total Interrupts: ${metrics.interrupts.count}</li>
                    <li>Last IRQ: ${new Date(metrics.interrupts.lastTime).toLocaleTimeString()}</li>
                </ul>
                
                <h6>DMA Statistics</h6>
                <ul class="list-unstyled small">
                    <li>Active Transfers: ${metrics.dma.activeTransfers}/${metrics.dma.channels}</li>
                    <li>Total Transferred: ${window.kernelSimulator.formatBytes(metrics.dma.totalTransferred)}</li>
                    <li>Errors: ${metrics.dma.errors}</li>
                </ul>
            </div>
            <div class="col-md-6">
                <h6>Network Statistics</h6>
                <ul class="list-unstyled small">
                    <li>RX Packets: ${metrics.network.packetsRx}</li>
                    <li>TX Packets: ${metrics.network.packetsTx}</li>
                    <li>Errors: ${metrics.network.errors}</li>
                    <li>Status: ${metrics.network.active ? 'Active' : 'Inactive'}</li>
                </ul>
                
                <h6>System Load</h6>
                <ul class="list-unstyled small">
                    <li>CPU: ${metrics.systemLoad.cpu.toFixed(1)}%</li>
                    <li>Memory: ${metrics.systemLoad.memory.toFixed(1)}%</li>
                    <li>I/O: ${metrics.systemLoad.io.toFixed(1)}%</li>
                </ul>
            </div>
        </div>
        <div class="mt-3">
            <h6>Active Processes</h6>
            <div class="process-monitor">
                ${metrics.processes.length === 0 ? 'No active processes' : 
                  metrics.processes.map(p => `
                    <div class="process-entry">
                        <span class="process-pid">${p.pid}</span>
                        <span class="process-name">${p.name}</span>
                        <span class="process-status">${p.status}</span>
                    </div>
                  `).join('')}
            </div>
        </div>
    `;
    
    // Create modal for advanced metrics
    const modal = document.createElement('div');
    modal.className = 'metrics-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="metrics-content">
            <h5>Advanced System Metrics</h5>
            ${metricsHTML}
            <div class="mt-3 text-end">
                <button class="btn btn-primary me-2" onclick="window.exportCSV()">
                    <i class="bi bi-download"></i> Export CSV
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.metrics-modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};
