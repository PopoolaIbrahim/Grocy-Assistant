// Barcode Scanner Controller
class BarcodeScanner {
    constructor() {
        this.html5QrCode = null;
        this.isScanning = false;
        this.config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };
        
        this.init();
    }

    init() {
        this.setupScannerControls();
    }

    setupScannerControls() {
        const startBtn = document.getElementById('start-scanner');
        const stopBtn = document.getElementById('stop-scanner');

        startBtn.addEventListener('click', () => {
            this.startScanner();
        });

        stopBtn.addEventListener('click', () => {
            this.stopScanner();
        });
    }

    async startScanner() {
        try {
            const startBtn = document.getElementById('start-scanner');
            const stopBtn = document.getElementById('stop-scanner');
            const resultDiv = document.getElementById('scan-result');

            // Hide previous results
            resultDiv.style.display = 'none';

            // Check if camera is available
            const cameras = await Html5Qrcode.getCameras();
            if (cameras.length === 0) {
                this.showError('No cameras found on this device');
                return;
            }

            // Initialize scanner if not already done
            if (!this.html5QrCode) {
                this.html5QrCode = new Html5Qrcode("qr-reader");
            }

            // Start scanning
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Use rear camera if available
                this.config,
                (decodedText, decodedResult) => {
                    this.onScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    // Handle scan errors (usually just "not found" which is normal)
                    this.onScanError(errorMessage);
                }
            );

            this.isScanning = true;
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-flex';

            this.showSuccess('Scanner started. Point camera at barcode.');

        } catch (error) {
            console.error('Scanner start error:', error);
            this.showError(this.getErrorMessage(error));
        }
    }

    async stopScanner() {
        try {
            if (this.html5QrCode && this.isScanning) {
                await this.html5QrCode.stop();
            }

            this.isScanning = false;
            
            const startBtn = document.getElementById('start-scanner');
            const stopBtn = document.getElementById('stop-scanner');
            
            startBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';

            this.showInfo('Scanner stopped.');

        } catch (error) {
            console.error('Scanner stop error:', error);
            this.showError('Error stopping scanner');
        }
    }

    onScanSuccess(decodedText, decodedResult) {
        console.log('Scan successful:', decodedText);
        
        // Play beep sound if enabled
        if (window.groceryApp && window.groceryApp.settings.enableBeep) {
            window.groceryApp.playBeep();
        }
        
        // Handle the scanned barcode
        if (window.groceryApp) {
            window.groceryApp.handleScannedBarcode(decodedText);
            
            // Check if camera should stay on after scanning
            if (!window.groceryApp.settings.keepCameraOn) {
                this.stopScanner();
            }
        } else {
            // Fallback: stop scanner if app not available
            this.stopScanner();
        }
        
        this.showSuccess(`Barcode scanned: ${decodedText}`);
    }

    onScanError(errorMessage) {
        // Most scan errors are just "not found" which is normal during scanning
        // Only log actual errors, not the constant "not found" messages
        if (!errorMessage.includes('No MultiFormat Readers were able to detect the code')) {
            console.warn('Scan error:', errorMessage);
        }
    }

    getErrorMessage(error) {
        if (error.name === 'NotAllowedError') {
            return 'Camera permission denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError') {
            return 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            return 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            return 'Camera constraints could not be satisfied.';
        } else if (error.name === 'SecurityError') {
            return 'Camera access is only allowed over HTTPS or localhost.';
        } else if (error.message && error.message.includes('Permission denied')) {
            return 'Camera permission denied. Please allow camera access in your browser settings.';
        } else {
            return `Scanner error: ${error.message || 'Unknown error occurred'}`;
        }
    }

    showSuccess(message) {
        if (window.groceryApp) {
            window.groceryApp.showToast(message, 'success');
        }
    }

    showError(message) {
        if (window.groceryApp) {
            window.groceryApp.showToast(message, 'error');
        }
    }

    showInfo(message) {
        if (window.groceryApp) {
            window.groceryApp.showToast(message, 'info');
        }
    }

    // Cleanup method
    destroy() {
        if (this.html5QrCode && this.isScanning) {
            this.stopScanner();
        }
    }
}

// Handle page visibility changes to manage scanner lifecycle
document.addEventListener('visibilitychange', () => {
    if (window.groceryApp && window.groceryApp.scanner) {
        if (document.hidden && window.groceryApp.scanner.isScanning) {
            // Pause scanner when page is hidden
            window.groceryApp.scanner.stopScanner();
        }
    }
});

// Handle beforeunload to cleanup scanner
window.addEventListener('beforeunload', () => {
    if (window.groceryApp && window.groceryApp.scanner) {
        window.groceryApp.scanner.destroy();
    }
});
