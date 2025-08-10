/**
 * Linux Character Device Driver Kernel Simulator
 * Simulates kernel-space operations and device driver behavior
 */

class KernelSimulator {
    constructor() {
        this.moduleLoaded = true;
        this.deviceBuffer = new ArrayBuffer(1024);
        this.bufferView = new Uint8Array(this.deviceBuffer);
        this.bufferSize = 1024;
        this.bufferUsed = 0;
        this.bufferPosition = 0;
        
        // Statistics
        this.stats = {
            bytesRead: 0,
            bytesWritten: 0,
            openCount: 0,
            ioctlCount: 0,
            errorCount: 0,
            startTime: Date.now()
        };
        
        // Concurrent access tracking
        this.activeReaders = 0;
        this.activeWriters = 0;
        this.waitQueue = [];
        this.mutex = false;
        
        // Configuration
        this.config = {
            loggingEnabled: true,
            maxBufferSize: 8192,
            asyncMode: false,
            interruptEnabled: true,
            dmaEnabled: true,
            networkSimEnabled: false
        };
        
        // Advanced features
        this.interrupts = {
            count: 0,
            lastTime: 0,
            handlers: new Map()
        };
        
        this.dma = {
            channels: 4,
            activeTransfers: 0,
            totalTransferred: 0,
            errors: 0
        };
        
        this.networkSim = {
            packetsRx: 0,
            packetsTx: 0,
            errors: 0,
            bandwidth: 1000000, // 1Mbps
            active: false
        };
        
        this.systemLoad = {
            cpu: 0,
            memory: 0,
            io: 0
        };
        
        this.processes = new Map();
        this.memoryMap = {
            kernel: 0x100000,    // 1MB
            buffer: 0x10000,     // 64KB  
            stack: 0x20000,      // 128KB
            heap: 0x80000,       // 512KB
            free: 0x200000       // 2MB
        };
        
        // Initialize kernel logging
        this.initKernelLogging();
        
        // Start periodic updates
        this.startPeriodicUpdates();
    }
    
    initKernelLogging() {
        this.kernelLogs = [];
        this.logKernel('INFO', 'Character device driver module loaded');
        this.logKernel('INFO', `Buffer allocated: ${this.bufferSize} bytes`);
        this.logKernel('INFO', 'Device /dev/mychardev created successfully');
    }
    
    logKernel(level, message) {
        const timestamp = new Date().toISOString().slice(11, 23);
        const logEntry = {
            timestamp,
            level,
            message,
            pid: Math.floor(Math.random() * 9999) + 1000
        };
        
        this.kernelLogs.push(logEntry);
        
        // Keep only last 100 log entries
        if (this.kernelLogs.length > 100) {
            this.kernelLogs.shift();
        }
        
        // Update UI
        this.updateKernelLogsUI();
    }
    
    updateKernelLogsUI() {
        const logsContainer = document.getElementById('kernel-logs');
        if (!logsContainer) return;
        
        const logsHtml = this.kernelLogs.slice(-20).map(log => {
            return `<div class="kernel-log-entry">
                <span class="log-timestamp">[${log.timestamp}]</span>
                <span class="log-level-${log.level.toLowerCase()}">[${log.level}]</span>
                <span>[PID:${log.pid}]</span>
                ${log.message}
            </div>`;
        }).join('');
        
        logsContainer.innerHTML = logsHtml;
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    // Device file operations simulation
    deviceOpen() {
        if (!this.moduleLoaded) {
            throw new Error('No such device (module not loaded)');
        }
        
        this.stats.openCount++;
        this.logKernel('DEBUG', `Device opened by process (PID: ${Math.floor(Math.random() * 9999) + 1000})`);
        
        return {
            success: true,
            message: 'Device opened successfully'
        };
    }
    
    deviceWrite(data) {
        return new Promise((resolve, reject) => {
            if (!this.moduleLoaded) {
                reject(new Error('No such device'));
                return;
            }
            
            // Simulate async operation
            setTimeout(() => {
                try {
                    this.acquireMutex();
                    this.activeWriters++;
                    
                    const dataBytes = new TextEncoder().encode(data);
                    const bytesToWrite = Math.min(dataBytes.length, this.bufferSize - this.bufferUsed);
                    
                    if (bytesToWrite === 0) {
                        this.logKernel('WARNING', 'Buffer full, write operation blocked');
                        reject(new Error('Buffer full'));
                        return;
                    }
                    
                    // Copy data to kernel buffer (simulates copy_from_user)
                    for (let i = 0; i < bytesToWrite; i++) {
                        this.bufferView[this.bufferPosition + i] = dataBytes[i];
                    }
                    
                    this.bufferUsed += bytesToWrite;
                    this.bufferPosition = (this.bufferPosition + bytesToWrite) % this.bufferSize;
                    this.stats.bytesWritten += bytesToWrite;
                    
                    this.logKernel('DEBUG', `Wrote ${bytesToWrite} bytes to device buffer`);
                    
                    resolve({
                        success: true,
                        bytesWritten: bytesToWrite,
                        message: `Successfully wrote ${bytesToWrite} bytes`
                    });
                    
                } catch (error) {
                    this.stats.errorCount++;
                    this.logKernel('ERROR', `Write operation failed: ${error.message}`);
                    reject(error);
                } finally {
                    this.activeWriters--;
                    this.releaseMutex();
                }
            }, Math.random() * 100 + 50); // Simulate kernel latency
        });
    }
    
    deviceRead(count) {
        return new Promise((resolve, reject) => {
            if (!this.moduleLoaded) {
                reject(new Error('No such device'));
                return;
            }
            
            setTimeout(() => {
                try {
                    this.acquireMutex();
                    this.activeReaders++;
                    
                    const bytesToRead = Math.min(count, this.bufferUsed);
                    
                    if (bytesToRead === 0) {
                        resolve({
                            success: true,
                            data: '',
                            bytesRead: 0,
                            message: 'No data available'
                        });
                        return;
                    }
                    
                    // Read data from kernel buffer (simulates copy_to_user)
                    const readBuffer = new Uint8Array(bytesToRead);
                    const startPos = Math.max(0, this.bufferPosition - this.bufferUsed);
                    
                    for (let i = 0; i < bytesToRead; i++) {
                        readBuffer[i] = this.bufferView[(startPos + i) % this.bufferSize];
                    }
                    
                    const data = new TextDecoder().decode(readBuffer);
                    this.bufferUsed -= bytesToRead;
                    this.stats.bytesRead += bytesToRead;
                    
                    this.logKernel('DEBUG', `Read ${bytesToRead} bytes from device buffer`);
                    
                    resolve({
                        success: true,
                        data: data,
                        bytesRead: bytesToRead,
                        message: `Successfully read ${bytesToRead} bytes`
                    });
                    
                } catch (error) {
                    this.stats.errorCount++;
                    this.logKernel('ERROR', `Read operation failed: ${error.message}`);
                    reject(error);
                } finally {
                    this.activeReaders--;
                    this.releaseMutex();
                }
            }, Math.random() * 100 + 50);
        });
    }
    
    deviceIoctl(cmd, arg) {
        return new Promise((resolve, reject) => {
            if (!this.moduleLoaded) {
                reject(new Error('No such device'));
                return;
            }
            
            setTimeout(() => {
                try {
                    this.stats.ioctlCount++;
                    let result = { success: true };
                    
                    switch (cmd) {
                        case 'CLEAR_BUFFER':
                            this.bufferView.fill(0);
                            this.bufferUsed = 0;
                            this.bufferPosition = 0;
                            this.logKernel('INFO', 'Buffer cleared via IOCTL command');
                            result.message = 'Buffer cleared successfully';
                            break;
                            
                        case 'SET_BUFFER_SIZE':
                            const newSize = arg || 2048;
                            if (newSize > this.config.maxBufferSize) {
                                throw new Error('Buffer size exceeds maximum allowed');
                            }
                            this.resizeBuffer(newSize);
                            this.logKernel('INFO', `Buffer size changed to ${newSize} bytes`);
                            result.message = `Buffer size set to ${newSize} bytes`;
                            break;
                            
                        case 'ENABLE_LOGGING':
                            this.config.loggingEnabled = !this.config.loggingEnabled;
                            this.logKernel('INFO', `Logging ${this.config.loggingEnabled ? 'enabled' : 'disabled'}`);
                            result.message = `Logging ${this.config.loggingEnabled ? 'enabled' : 'disabled'}`;
                            break;
                            
                        default:
                            throw new Error('Invalid IOCTL command');
                    }
                    
                    resolve(result);
                    
                } catch (error) {
                    this.stats.errorCount++;
                    this.logKernel('ERROR', `IOCTL operation failed: ${error.message}`);
                    reject(error);
                }
            }, 50);
        });
    }
    
    resizeBuffer(newSize) {
        const newBuffer = new ArrayBuffer(newSize);
        const newView = new Uint8Array(newBuffer);
        
        // Copy existing data
        const copySize = Math.min(this.bufferUsed, newSize);
        for (let i = 0; i < copySize; i++) {
            newView[i] = this.bufferView[i];
        }
        
        this.deviceBuffer = newBuffer;
        this.bufferView = newView;
        this.bufferSize = newSize;
        this.bufferUsed = Math.min(this.bufferUsed, newSize);
        this.bufferPosition = Math.min(this.bufferPosition, newSize);
    }
    
    acquireMutex() {
        // Simplified mutex simulation
        if (this.mutex) {
            this.waitQueue.push(Date.now());
            throw new Error('Resource busy');
        }
        this.mutex = true;
    }
    
    releaseMutex() {
        this.mutex = false;
        if (this.waitQueue.length > 0) {
            this.waitQueue.shift();
        }
    }
    
    // Module management
    loadModule() {
        this.moduleLoaded = true;
        this.stats = { ...this.stats, startTime: Date.now() };
        this.logKernel('INFO', 'Module loaded successfully');
    }
    
    unloadModule() {
        this.moduleLoaded = false;
        this.activeReaders = 0;
        this.activeWriters = 0;
        this.waitQueue = [];
        this.logKernel('INFO', 'Module unloaded successfully');
    }
    
    // Statistics and monitoring
    getStats() {
        const uptime = (Date.now() - this.stats.startTime) / 1000;
        return {
            ...this.stats,
            uptime,
            bufferSize: this.bufferSize,
            bufferUsed: this.bufferUsed,
            bufferFree: this.bufferSize - this.bufferUsed,
            activeReaders: this.activeReaders,
            activeWriters: this.activeWriters,
            queueLength: this.waitQueue.length,
            readRate: this.stats.bytesRead / uptime,
            writeRate: this.stats.bytesWritten / uptime
        };
    }
    
    getProcStats() {
        const stats = this.getStats();
        return `Device Statistics:
bytes_read: ${stats.bytesRead}
bytes_written: ${stats.bytesWritten}
open_count: ${stats.openCount}
ioctl_count: ${stats.ioctlCount}
error_count: ${stats.errorCount}
uptime_seconds: ${Math.floor(stats.uptime)}
buffer_size: ${stats.bufferSize}
buffer_used: ${stats.bufferUsed}
buffer_free: ${stats.bufferFree}
active_readers: ${stats.activeReaders}
active_writers: ${stats.activeWriters}
wait_queue_length: ${stats.queueLength}
read_rate_bps: ${stats.readRate.toFixed(2)}
write_rate_bps: ${stats.writeRate.toFixed(2)}
module_loaded: ${this.moduleLoaded ? 'yes' : 'no'}
logging_enabled: ${this.config.loggingEnabled ? 'yes' : 'no'}`;
    }
    
    startPeriodicUpdates() {
        setInterval(() => {
            // Update UI components periodically
            if (typeof updateMonitoringDashboard === 'function') {
                updateMonitoringDashboard();
            }
        }, 1000);
    }
    
    // Stress testing support
    simulateStressTest() {
        const operations = ['read', 'write'];
        const operation = operations[Math.floor(Math.random() * operations.length)];
        
        // Update system load
        this.systemLoad.cpu = Math.min(95, this.systemLoad.cpu + Math.random() * 10);
        this.systemLoad.io = Math.min(90, this.systemLoad.io + Math.random() * 15);
        
        if (operation === 'read') {
            this.deviceRead(Math.floor(Math.random() * 512) + 1).catch(() => {});
        } else {
            const data = 'stress_test_' + Math.random().toString(36).substring(7);
            this.deviceWrite(data).catch(() => {});
        }
        
        // Simulate processes
        this.simulateProcessActivity();
    }
    
    // Advanced Features Implementation
    simulateInterrupt() {
        return new Promise((resolve) => {
            if (!this.config.interruptEnabled) {
                resolve({ success: false, message: 'Interrupts disabled' });
                return;
            }
            
            this.interrupts.count++;
            this.interrupts.lastTime = Date.now();
            
            // Flash the UI
            document.body.classList.add('interrupt-flash');
            setTimeout(() => document.body.classList.remove('interrupt-flash'), 500);
            
            const irqNumber = Math.floor(Math.random() * 16) + 1;
            this.logKernel('INFO', `Hardware interrupt IRQ ${irqNumber} triggered`);
            this.logKernel('DEBUG', `Interrupt handler executed in ${Math.random() * 5 + 1}ms`);
            
            // Simulate interrupt processing time
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    message: `IRQ ${irqNumber} processed successfully`,
                    irq: irqNumber,
                    processingTime: Math.random() * 5 + 1
                });
            }, 100);
        });
    }
    
    simulateDMA() {
        return new Promise((resolve) => {
            if (!this.config.dmaEnabled || this.dma.activeTransfers >= this.dma.channels) {
                resolve({ success: false, message: 'DMA channels busy or disabled' });
                return;
            }
            
            this.dma.activeTransfers++;
            const transferSize = Math.floor(Math.random() * 4096) + 1024; // 1-5KB
            const transferTime = transferSize / 100; // Simulate transfer rate
            
            this.logKernel('INFO', `DMA transfer started: ${transferSize} bytes`);
            
            // Visual DMA progress
            this.showDMAProgress();
            
            setTimeout(() => {
                this.dma.activeTransfers--;
                this.dma.totalTransferred += transferSize;
                
                this.logKernel('DEBUG', `DMA transfer completed: ${transferSize} bytes in ${transferTime.toFixed(2)}ms`);
                
                resolve({
                    success: true,
                    message: `DMA transfer completed: ${transferSize} bytes`,
                    size: transferSize,
                    time: transferTime
                });
            }, transferTime * 10);
        });
    }
    
    showDMAProgress() {
        // Create visual DMA progress indicator
        const progressHTML = `
            <div class="dma-transfer">
                <div class="dma-progress" id="dma-progress"></div>
            </div>
        `;
        
        // Add to kernel logs temporarily
        const logsContainer = document.getElementById('kernel-logs');
        if (logsContainer) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = progressHTML;
            logsContainer.appendChild(tempDiv);
            
            // Animate progress
            const progressBar = document.getElementById('dma-progress');
            if (progressBar) {
                let width = 0;
                const interval = setInterval(() => {
                    width += 10;
                    progressBar.style.width = width + '%';
                    if (width >= 100) {
                        clearInterval(interval);
                        setTimeout(() => tempDiv.remove(), 1000);
                    }
                }, 50);
            }
        }
    }
    
    simulateProcessActivity() {
        const processNames = ['kworker', 'ksoftirqd', 'migration', 'rcu_gp', 'watchdog'];
        const processName = processNames[Math.floor(Math.random() * processNames.length)];
        const pid = Math.floor(Math.random() * 9999) + 1000;
        
        this.processes.set(pid, {
            name: processName,
            status: 'running',
            startTime: Date.now(),
            cpuTime: Math.random() * 100
        });
        
        // Remove process after some time
        setTimeout(() => {
            this.processes.delete(pid);
        }, Math.random() * 5000 + 2000);
    }
    
    startNetworkSimulation() {
        if (this.networkSim.active) return;
        
        this.networkSim.active = true;
        this.config.networkSimEnabled = true;
        this.logKernel('INFO', 'Network simulation started');
        
        const networkInterval = setInterval(() => {
            if (!this.networkSim.active) {
                clearInterval(networkInterval);
                return;
            }
            
            // Simulate network packets
            this.networkSim.packetsRx += Math.floor(Math.random() * 10);
            this.networkSim.packetsTx += Math.floor(Math.random() * 8);
            
            if (Math.random() < 0.02) { // 2% error rate
                this.networkSim.errors++;
                this.logKernel('WARNING', 'Network packet dropped');
            }
            
            this.systemLoad.io = Math.min(80, this.systemLoad.io + Math.random() * 5);
        }, 1000);
    }
    
    stopNetworkSimulation() {
        this.networkSim.active = false;
        this.config.networkSimEnabled = false;
        this.logKernel('INFO', 'Network simulation stopped');
    }
    
    getMemoryMap() {
        const total = Object.values(this.memoryMap).reduce((a, b) => a + b, 0);
        return {
            segments: Object.entries(this.memoryMap).map(([name, size]) => ({
                name,
                size,
                percentage: (size / total) * 100
            })),
            total
        };
    }
    
    simulateMemoryLeak() {
        const leakSize = Math.floor(Math.random() * 50000) + 10000; // 10-60KB leak
        this.memoryMap.heap += leakSize;
        this.memoryMap.free = Math.max(0, this.memoryMap.free - leakSize);
        
        this.systemLoad.memory = Math.min(95, (this.memoryMap.heap / (this.memoryMap.heap + this.memoryMap.free)) * 100);
        
        this.logKernel('WARNING', `Memory leak detected: ${leakSize} bytes not freed`);
        this.logKernel('INFO', `Available memory: ${this.formatBytes(this.memoryMap.free)}`);
        
        return {
            success: true,
            leakSize,
            availableMemory: this.memoryMap.free,
            memoryUsage: this.systemLoad.memory
        };
    }
    
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    exportToCSV() {
        const stats = this.getStats();
        const memMap = this.getMemoryMap();
        
        const csvData = [
            ['Timestamp', 'Bytes Read', 'Bytes Written', 'Open Count', 'CPU Usage', 'Memory Usage', 'IO Load', 'Interrupts', 'DMA Transfers'],
            [
                new Date().toISOString(),
                stats.bytesRead,
                stats.bytesWritten,
                stats.openCount,
                this.systemLoad.cpu.toFixed(2),
                this.systemLoad.memory.toFixed(2),
                this.systemLoad.io.toFixed(2),
                this.interrupts.count,
                this.dma.totalTransferred
            ]
        ];
        
        return csvData.map(row => row.join(',')).join('\n');
    }
    
    getAdvancedMetrics() {
        return {
            interrupts: this.interrupts,
            dma: this.dma,
            network: this.networkSim,
            systemLoad: this.systemLoad,
            processes: Array.from(this.processes.entries()).map(([pid, proc]) => ({
                pid,
                ...proc
            })),
            memoryMap: this.getMemoryMap()
        };
    }
}

// Global kernel simulator instance
let kernelSimulator;

// Initialize kernel simulator when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    kernelSimulator = new KernelSimulator();
    
    // Export to global scope for use in other files
    window.kernelSimulator = kernelSimulator;
});
