// Barcode Scanner Class
class BarcodeScanner {
    constructor() {
        this.html5QrcodeScanner = null;
        this.isScanning = false;
        this.lastScannedCode = null;
        this.lastScannedProduct = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('start-scanner').addEventListener('click', () => this.startScanning());
        document.getElementById('stop-scanner').addEventListener('click', () => this.stopScanning());
        // The event listener for 'manual-add-product' is correctly handled in app.js, so it's removed from here.

        // Scan result actions
        document.getElementById('add-to-bill').addEventListener('click', () => this.addToBill());
        document.getElementById('add-new-product').addEventListener('click', () => this.addNewProduct());
        document.getElementById('scan-again').addEventListener('click', () => this.scanAgain());

        const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
        if (scanBarcodeBtn) {
            scanBarcodeBtn.addEventListener('click', () => this.scanForForm());
        }
    }

    startScanning() {
        if (this.isScanning) return;

        if (!this.html5QrcodeScanner) {
            this.html5QrcodeScanner = new Html5Qrcode("qr-reader");
        }

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 }
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
            })
            .catch(err => {
                console.error("Unable to start scanning", err);
                window.grocyApp.showNotification('Could not start the camera. Please check permissions.', 'error');
            });
    }

    onScanSuccess(decodedText, decodedResult) {
        if (this.isScanning) { 
            this.stopScanning();

            if (window.grocyApp.settings.soundOnScan) {
                this.playBeepSound();
            }
            
            this.lastScannedCode = decodedText;
            const product = window.grocyApp.products.find(p => p.barcode === decodedText);
            this.lastScannedProduct = product;

            this.updateLastScannedDisplay(product);

            const qrReader = document.getElementById('qr-reader');
            qrReader.classList.add('scan-success');
            setTimeout(() => qrReader.classList.remove('scan-success'), 1500);

            if (product) {
                window.grocyApp.showNotification('Successful Scan', 'success');
                if (window.grocyApp.settings.autoAddToBill) {
                    this.addToBill();
                    return; 
                }
            } else {
                window.grocyApp.showNotification('Product Not in inventory', 'warning');
            }
            
            this.updateScanResultUI(product);
        }
    }
    
    updateLastScannedDisplay(product) {
        const barcodeEl = document.getElementById('last-barcode');
        const nameEl = document.getElementById('last-name');
        const priceEl = document.getElementById('last-price');

        if (product) {
            barcodeEl.textContent = product.barcode;
            nameEl.textContent = product.name;
            priceEl.textContent = window.grocyApp.formatPrice(product.price);
        } else {
            barcodeEl.textContent = this.lastScannedCode;
            nameEl.textContent = 'N/A';
            priceEl.textContent = 'N/A';
        }
    }

    stopScanning() {
        if (!this.html5QrcodeScanner.isScanning) return;
        
        this.html5QrcodeScanner.stop()
            .then(() => {
                this.isScanning = false;
                document.getElementById('start-scanner').style.display = 'inline-flex';
                document.getElementById('stop-scanner').style.display = 'none';
                document.getElementById('qr-reader').classList.remove('scanning');
            })
            .catch(err => {});
    }

    updateScanResultUI(product) {
        const scanResultDiv = document.getElementById('scan-result');
        const productInfoDiv = document.getElementById('product-info');
        document.getElementById('scanned-barcode').textContent = this.lastScannedCode;

        if (product) {
            productInfoDiv.innerHTML = `
                <div class="product-found">
                    <h4>${product.name}</h4>
                    <p><strong>Price:</strong> ${window.grocyApp.formatPrice(product.price)}</p>
                    <p><strong>Stock:</strong> ${product.quantity}</p>
                </div>
            `;
            document.getElementById('add-to-bill').style.display = 'inline-flex';
            document.getElementById('add-new-product').style.display = 'none';
        } else {
            productInfoDiv.innerHTML = `
                <div class="product-not-found">
                    <p>Product not found in inventory.</p>
                </div>
            `;
            document.getElementById('add-to-bill').style.display = 'none';
            document.getElementById('add-new-product').style.display = 'inline-flex';
        }

        scanResultDiv.style.display = 'block';
    }

    addToBill() {
        if (this.lastScannedProduct) {
            window.grocyApp.addToBill(this.lastScannedProduct);
            setTimeout(() => this.scanAgain(), 500);
        }
    }

    addNewProduct() {
        window.grocyApp.switchView('add-product');
        document.getElementById('product-barcode').value = this.lastScannedCode;
    }

    scanAgain() {
        document.getElementById('scan-result').style.display = 'none';
        this.lastScannedCode = null;
        this.lastScannedProduct = null;
        this.startScanning();
    }

    playBeepSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800; 
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Could not play beep sound:', error);
        }
    }
}