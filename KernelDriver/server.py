#!/usr/bin/env python3
"""
Simple HTTP Server for Character Device Driver Simulator
Serves the web application files and provides basic API endpoints
"""

import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse, parse_qs
from datetime import datetime

class DeviceDriverHandler(http.server.SimpleHTTPRequestHandler):
    """
    Custom HTTP handler that serves static files and provides API endpoints
    for the character device driver simulator
    """
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        # API endpoints
        if parsed_path.path.startswith('/api/'):
            self.handle_api_request(parsed_path)
        else:
            # Serve static files
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests for API endpoints"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/'):
            self.handle_api_request(parsed_path, method='POST')
        else:
            self.send_error(404, "Not Found")
    
    def handle_api_request(self, parsed_path, method='GET'):
        """Handle API requests for device driver simulation"""
        try:
            if parsed_path.path == '/api/stats':
                self.send_stats()
            elif parsed_path.path == '/api/logs':
                self.send_logs()
            elif parsed_path.path == '/api/health':
                self.send_health()
            else:
                self.send_error(404, "API endpoint not found")
        except Exception as e:
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def send_stats(self):
        """Send simulated device statistics"""
        stats = {
            'timestamp': datetime.now().isoformat(),
            'uptime': 3600,  # 1 hour uptime
            'module_loaded': True,
            'device_name': '/dev/mychardev',
            'major_number': 250,
            'minor_number': 0,
            'buffer_size': 1024,
            'buffer_used': 0,
            'operations': {
                'read_count': 0,
                'write_count': 0,
                'ioctl_count': 0,
                'open_count': 0
            },
            'performance': {
                'avg_read_latency_ms': 0.5,
                'avg_write_latency_ms': 0.3,
                'throughput_bps': 0
            }
        }
        
        self.send_json_response(stats)
    
    def send_logs(self):
        """Send simulated kernel logs"""
        logs = [
            {
                'timestamp': datetime.now().isoformat(),
                'level': 'INFO',
                'message': 'Character device driver module loaded successfully'
            },
            {
                'timestamp': datetime.now().isoformat(),
                'level': 'DEBUG',
                'message': 'Device /dev/mychardev registered with major number 250'
            }
        ]
        
        self.send_json_response(logs)
    
    def send_health(self):
        """Send health check response"""
        health = {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'simulator': 'active'
        }
        
        self.send_json_response(health)
    
    def send_json_response(self, data):
        """Send JSON response"""
        json_data = json.dumps(data, indent=2)
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(json_data)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        self.wfile.write(json_data.encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to customize logging"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        message = format % args
        print(f"[{timestamp}] {self.address_string()} - {message}")

def main():
    """Main function to start the HTTP server"""
    PORT = 5000
    HOST = "0.0.0.0"
    
    # Change to the directory containing the web files
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Create HTTP server
    with socketserver.TCPServer((HOST, PORT), DeviceDriverHandler) as httpd:
        print(f"Character Device Driver Simulator Server")
        print(f"Serving at http://{HOST}:{PORT}/")
        print(f"Started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        print("Available endpoints:")
        print("  Main Application: http://localhost:5000/")
        print("  Statistics API:   http://localhost:5000/api/stats")
        print("  Kernel Logs API:  http://localhost:5000/api/logs")
        print("  Health Check:     http://localhost:5000/api/health")
        print()
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
            httpd.shutdown()
            print("Server stopped.")

if __name__ == "__main__":
    main()
