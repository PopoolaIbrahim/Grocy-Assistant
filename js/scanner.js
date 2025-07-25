// Barcode Scanner Class
class BarcodeScanner {
    constructor() {
        this.html5QrcodeScanner = null;
        this.isScanning = false;
        this.lastScannedCode = null;
        this.lastScannedProduct = null;
        this.returnToAddProduct = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('Barcode Scanner initialized');
    }

    setupEventListeners() {
        // Main scanner controls
        document.getElementById('start-scanner').addEventListener('click', () => {
            this.startScanning();
        });

        document.getElementById('stop-scanner').addEventListener('click', () => {
            this.stopScanning();
        });

        // Scan result actions
        document.getElementById('add-to-bill').addEventListener('click', () => {
            this.addToBill();
        });

        document.getElementById('add-new-product').addEventListener('click', () => {
            this.addNewProduct();
        });

        document.getElementById('scan-again').addEventListener('click', () => {
            this.scanAgain();
        });

        // Barcode input in add product form
        document.getElementById('scan-barcode-btn').addEventListener('click', () => {
            this.scanForForm();
        });
    }

    startScanning() {
        if (this.isScanning) return;

        if (!this.html5QrcodeScanner) {
            this.html5QrcodeScanner = new Html5Qrcode("qr-reader");
        }

        const config = {
            fps: 10,
            qrbox: { 
                width: 300, 
                height: 300,
                colorCodeHex: "#4CAF50"
            },
            aspectRatio: 1.0,
            disableFlip: false,
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        const onScanSuccess = (decodedText, decodedResult) => {
            this.onScanSuccess(decodedText, decodedResult);
        };

        const onScanError = (errorMessage) => {};

        this.html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
            .then(() => {
                this.isScanning = true;
                document.getElementById('start-scanner').style.display = 'none';
                document.getElementById('stop-scanner').style.display = 'inline-flex';
                document.getElementById('qr-reader').classList.add('scanning');

                // Add boundary box styling
                const qrReader = document.getElementById('qr-reader');
                qrReader.style.border = '3px solid #4CAF50';
                qrReader.style.borderRadius = '12px';
                qrReader.style.position = 'relative';
                qrReader.style.overflow = 'hidden';
            })
            .catch(err => {
                console.error("Unable to start scanning", err);
                window.grocyApp.showNotification('Could not start the camera. Please check permissions.', 'error');
            });
    }

    stopScanning() {
        if (!this.isScanning || !this.html5QrcodeScanner) {
            return;
        }

        this.html5QrcodeScanner.stop().then(() => {
            this.isScanning = false;
            document.getElementById('start-scanner').style.display = 'inline-flex';
            document.getElementById('stop-scanner').style.display = 'none';
            window.grocyApp.showNotification('Scanner stopped', 'info');
        }).catch(err => {
            console.error('Failed to stop scanner:', err);
        });
    }

    onScanSuccess(decodedText, decodedResult) {
        if (this.isScanning) { 
            // Check if we're scanning for the add product form
            if (this.returnToAddProduct) {
                this.onScanSuccessForForm(decodedText, decodedResult);
                return;
            }

            this.stopScanning();

            if (window.grocyApp.settings.soundOnScan) {
                this.playBeepSound();
            }

            this.lastScannedCode = decodedText;

            // Search for product in inventory
            this.searchProductInInventory(decodedText).then(product => {
                this.lastScannedProduct = product;
                this.updateLastScannedDisplay(product);

                const qrReader = document.getElementById('qr-reader');
                qrReader.classList.add('scan-success');
                setTimeout(() => qrReader.classList.remove('scan-success'), 1500);

                if (product) {
                    window.grocyApp.showNotification('Successful Scan - Product Found!', 'success');

                    // Add to current bill automatically
                    this.addToBill();

                    if (!window.grocyApp.settings.autoAddToBill) {
                        this.updateScanResultUI(product);
                    }
                } else {
                    window.grocyApp.showNotification('Product not found in inventory', 'warning');
                    this.updateScanResultUI(null);
                }
            });
        }
    }

    async searchProductInInventory(barcode) {
        try {
            const response = await fetch('/search-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ barcode: barcode })
            });

            if (response.ok) {
                const result = await response.json();
                return result.product || null;
            }
            return null;
        } catch (error) {
            console.error('Error searching product:', error);
            return null;
        }
    }

    findProductByBarcode(barcode) {
        return window.grocyApp.products.find(product => product.barcode === barcode);
    }

    updateLastScannedDisplay(product) {
        document.getElementById('last-barcode').textContent = product.barcode || 'N/A';
        document.getElementById('last-name').textContent = product.name || 'N/A';
        document.getElementById('last-price').textContent = product.price ? window.grocyApp.formatPrice(product.price) : 'N/A';
    }

    showScanResult(barcode, product) {
        const scanResult = document.getElementById('scan-result');
        const scannedBarcode = document.getElementById('scanned-barcode');
        const productInfo = document.getElementById('product-info');

        scannedBarcode.textContent = barcode;

        if (product) {
            productInfo.innerHTML = `
                <div class="product-found">
                    <h4>${product.name}</h4>
                    <p><strong>Category:</strong> ${product.category}</p>
                    <p><strong>Price:</strong> ${window.grocyApp.formatPrice(product.price)}</p>
                    <p><strong>Stock:</strong> ${product.quantity}</p>
                    ${product.description ? `<p><strong>Description:</strong> ${product.description}</p>` : ''}
                </div>
            `;
        } else {
            productInfo.innerHTML = `
                <div class="product-not-found">
                    <p class="text-warning">Product not found in inventory</p>
                    <p>Would you like to add this product?</p>
                </div>
            `;
        }

        scanResult.style.display = 'block';
    }

    addToBill() {
        if (this.lastScannedProduct) {
            if (this.lastScannedProduct.quantity > 0) {
                window.grocyApp.addToBill(this.lastScannedProduct);
                window.grocyApp.showNotification(`Added ${this.lastScannedProduct.name} to bill`, 'success');

                // Update the bill display
                window.grocyApp.updateBillDisplay();

                if (window.grocyApp.settings.autoAddToBill) {
                    setTimeout(() => this.scanAgain(), 1000);
                }
            } else {
                window.grocyApp.showNotification('Product out of stock', 'error');
            }
        }
    }

    addNewProduct() {
        // Switch to add product view and pre-fill barcode
        window.grocyApp.switchView('add-product');
        document.getElementById('product-barcode').value = this.lastScannedCode || '';
        this.hideScanResult();
    }

    scanAgain() {
        this.hideScanResult();
        this.startScanning();
    }

    hideScanResult() {
        document.getElementById('scan-result').style.display = 'none';
    }

    scanForForm() {
        if (this.isScanning) return;

        // Switch to scanner view temporarily for scanning
        const currentView = window.grocyApp.currentView;
        window.grocyApp.switchView('scanner');

        // Set a flag to return to add product after scan
        this.returnToAddProduct = true;

        // Start scanning
        this.startScanning();
    }

    onScanSuccessForForm(decodedText, decodedResult) {
        if (this.isScanning) {
            this.stopScanning();

            if (window.grocyApp.settings.soundOnScan) {
                this.playBeepSound();
            }

            // Return to add product view and fill barcode
            window.grocyApp.switchView('add-product');

            const barcodeInput = document.getElementById('product-barcode');
            if (barcodeInput) {
                barcodeInput.value = decodedText;
                window.grocyApp.showNotification('Barcode scanned successfully!', 'success');
            }

            this.returnToAddProduct = false;
        }
    }

    startQuickScan(callback) {
        const originalView = window.grocyApp.currentView;
        window.grocyApp.switchView('scanner');

        // Override scan success temporarily
        const originalOnScanSuccess = this.onScanSuccess;
        this.onScanSuccess = (decodedText, decodedResult) => {
            this.stopScanning();
            callback(decodedText);
            this.onScanSuccess = originalOnScanSuccess;
        };

        this.startScanning();
    }

    playBeepSound() {
        try {
            // Create a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800; // High pitched beep
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Could not play beep sound:', error);
        }
    }

    // Method to handle image-based barcode scanning
    scanImage(imageFile) {
        return new Promise((resolve, reject) => {
            const html5QrCode = new Html5Qrcode("qr-reader");

            html5QrCode.scanFile(imageFile, true)
                .then(decodedText => {
                    resolve(decodedText);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    // Method to handle drag and drop image scanning
    setupImageScanning() {
        const qrReader = document.getElementById('qr-reader');

        // Add drag and drop styling
        qrReader.addEventListener('dragover', (e) => {
            e.preventDefault();
            qrReader.classList.add('drag-over');
        });

        qrReader.addEventListener('dragleave', () => {
            qrReader.classList.remove('drag-over');
        });

        qrReader.addEventListener('drop', (e) => {
            e.preventDefault();
            qrReader.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    this.scanImage(file)
                        .then(decodedText => {
                            this.onScanSuccess(decodedText, null);
                        })
                        .catch(err => {
                            window.grocyApp.showNotification('Could not scan barcode from image', 'error');
                        });
                }
            }
        });
    }

    // Cleanup method
    destroy() {
        if (this.isScanning) {
            this.stopScanning();
        }
        this.html5QrcodeScanner = null;
    }
}

// Add CSS for drag and drop styling
const scannerStyles = document.createElement('style');
scannerStyles.textContent = `
    .qr-reader.drag-over {
        border: 2px dashed var(--primary-color);
        background-color: rgba(76, 175, 80, 0.1);
    }

    .qr-reader {
        position: relative;
        min-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f5f5f5;
        border: 2px dashed #ccc;
        border-radius: 8px;
        transition: all 0.3s ease;
    }

    .qr-reader::after {
        content: 'Drag image here or use camera';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #666;
        font-size: 14px;
        pointer-events: none;
        z-index: 1;
    }

    .qr-reader video {
        position: relative;
        z-index: 2;
    }

    .product-found {
        background-color: rgba(76, 175, 80, 0.1);
        border: 1px solid var(--primary-color);
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
    }

    .product-not-found {
        background-color: rgba(255, 152, 0, 0.1);
        border: 1px solid var(--warning-color);
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
        text-align: center;
    }

    .scan-result {
        animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(scannerStyles);