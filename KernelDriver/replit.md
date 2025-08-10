# Overview

This is an Advanced Linux Character Device Driver Simulator - a comprehensive web-based educational platform that simulates the behavior of a Linux character device driver with enterprise-level features. The application provides an interactive interface for learning advanced kernel concepts including device operations, interrupt handling, DMA transfers, memory management, network simulation, and real-time system monitoring. Enhanced with professional-grade features like CSV export, advanced metrics visualization, memory leak simulation, and process monitoring, it serves as both an educational tool and a demonstration of kernel-level programming concepts.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a multi-file JavaScript architecture with vanilla JavaScript (no frameworks):

- **app.js**: Main application controller handling UI interactions and coordinating between components
- **kernel-simulator.js**: Core simulation engine that mimics Linux kernel behavior, including buffer management, device operations, and statistics tracking
- **monitoring-dashboard.js**: Real-time monitoring component with Chart.js integration for visualizing throughput and performance metrics
- **Bootstrap 5 + Custom CSS**: Responsive UI with terminal-style kernel log displays and professional dashboard appearance

The frontend simulates a complete enterprise-level device driver environment including:
- Device file operations (/dev/mychardev) with full read/write/ioctl support
- Advanced kernel space buffer management with dynamic resizing
- Concurrent access control with mutex simulation and wait queues  
- Real-time statistics and professional monitoring dashboards
- Hardware interrupt simulation with visual feedback
- DMA transfer simulation with progress visualization
- Network packet simulation with error injection
- Memory management with leak detection and visualization
- Process monitoring with real-time kernel thread tracking
- System load monitoring (CPU, Memory, I/O) with gradual decay
- Professional metrics export (CSV) and advanced analytics modals

## Backend Architecture
Simple Python HTTP server (server.py) that:
- Serves static web assets
- Provides REST API endpoints for device statistics and logs
- Handles health checks and monitoring data
- Uses Python's built-in http.server for lightweight operation

The architecture separates concerns between simulation logic (client-side) and basic API services (server-side), allowing the complex kernel simulation to run entirely in the browser while providing server endpoints for extended functionality.

## Data Management
All simulation data is managed in-memory on the client side:
- **ArrayBuffer**: Simulates kernel space memory with typed arrays
- **Statistics tracking**: Real-time metrics for read/write operations, error counts, and performance data
- **Logging system**: In-memory kernel log simulation with timestamp tracking
- **Configuration state**: Module loading status, buffer sizes, and operational parameters

No persistent storage is used - this is intentional for an educational simulator where each session starts fresh.

## Key Design Patterns
- **Module pattern**: Each JavaScript file encapsulates functionality in classes
- **Event-driven architecture**: UI interactions trigger kernel simulation events
- **Observer pattern**: Real-time monitoring updates based on simulation state changes
- **State machine**: Module loading/unloading and device state management

# External Dependencies

## Client-Side Libraries
- **Bootstrap 5.3.0**: UI framework for responsive design and components
- **Bootstrap Icons 1.10.0**: Icon set for device driver interface elements
- **Chart.js**: Real-time charting library for throughput and performance visualization (referenced in monitoring dashboard)

## Server Dependencies
- **Python 3**: Built-in HTTP server functionality
- **Standard Library**: Uses only Python built-in modules (http.server, socketserver, json, os, urllib)

## Development Context
Based on the attached implementation plans, this simulator is designed to teach advanced Linux character device driver concepts without requiring actual kernel development environment setup. The simulation covers real kernel concepts like:
- Character device registration and management
- File operation implementations (open, read, write, release)
- IOCTL command handling
- Buffer management and memory protection
- Concurrent access control
- Asynchronous I/O simulation
- Kernel logging and debugging

The architecture supports future extensions like interrupt handling simulation, procfs/sysfs integration, and stress testing capabilities.