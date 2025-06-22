// Main application controller
class GroceryApp {
    constructor() {
        this.currentView = 'scanner';
        this.products = [];
        this.csvManager = new CSVManager();
        this.scanner = new BarcodeScanner();
        this.editingProduct = null;
        this.currentBill = [];
        this.lastScannedProduct = null;
        this.scanningForAddProduct = false;
        this.settings = this.loadSettings();
        this.audioContext = null;
        
        this.init();
        console.log('GroceryApp initialized', this);
    }

    init() {
        this.loadProducts();
        this.setupNavigation();
        this.setupForms();
        this.setupInventory();
        this.setupModal();
        this.setupScannerModal();
        this.setupBilling();
        this.setupSettings();
        this.initializeFeatherIcons();
        this.initializeAudio();
        
        // Show initial view
        this.showView('scanner');
        this.updateBillDisplay();
    }

    initializeFeatherIcons() {
        // Initialize Feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    loadProducts() {
        this.products = this.csvManager.loadProducts();
        this.updateInventoryView();
        this.updateStats();
    }

    setupNavigation() {
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                this.showView(view);
                
                // Update active tab
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    }

    showView(viewName) {
        const views = document.querySelectorAll('.view');
        views.forEach(view => view.classList.remove('active'));
        
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Refresh Feather icons for the active view
            setTimeout(() => {
                if (typeof feather !== 'undefined') {
                    feather.replace();
                }
            }, 100);
        }
    }

    setupForms() {
        // Add product form
        const addForm = document.getElementById('add-product-form');
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddProduct(new FormData(addForm));
        });

        // Clear form button
        const clearBtn = document.getElementById('clear-form');
        clearBtn.addEventListener('click', () => {
            addForm.reset();
            this.showToast('Form cleared', 'info');
        });

        // Edit product form
        const editForm = document.getElementById('edit-product-form');
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleEditProduct(new FormData(editForm));
        });

        // Delete product button
        const deleteBtn = document.getElementById('delete-product');
        deleteBtn.addEventListener('click', () => {
            if (this.editingProduct && confirm('Are you sure you want to delete this product?')) {
                this.handleDeleteProduct(this.editingProduct.barcode);
            }
        });

        // Barcode scan button in Add Product form
        const scanBarcodeBtn = document.getElementById('scan-barcode-btn');
        scanBarcodeBtn.addEventListener('click', () => {
            this.startBarcodeCapture();
        });
    }

    setupBilling() {
        // Add to bill button
        const addToBillBtn = document.getElementById('add-to-bill');
        addToBillBtn.addEventListener('click', () => {
            if (this.lastScannedProduct) {
                this.addToBill(this.lastScannedProduct);
            }
        });

        // Print receipt button
        const printReceiptBtn = document.getElementById('print-receipt');
        printReceiptBtn.addEventListener('click', () => {
            this.printReceipt();
        });

        // Reset scan button
        const resetScanBtn = document.getElementById('reset-scan');
        resetScanBtn.addEventListener('click', () => {
            this.resetBill();
        });

        // Scan again button
        const scanAgainBtn = document.getElementById('scan-again');
        scanAgainBtn.addEventListener('click', () => {
            this.hideScanResult();
            if (this.scanner) {
                this.scanner.startScanner();
            }
        });
    }

    setupScannerModal() {
        const modal = document.getElementById('scanner-modal');
        const closeBtn = document.getElementById('close-scanner-modal');
        const startBtn = document.getElementById('modal-start-scanner');
        const stopBtn = document.getElementById('modal-stop-scanner');

        closeBtn.addEventListener('click', () => {
            this.closeScannerModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeScannerModal();
            }
        });

        startBtn.addEventListener('click', () => {
            this.startModalScanner();
        });

        stopBtn.addEventListener('click', () => {
            this.stopModalScanner();
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeScannerModal();
            }
        });
    }

    setupSettings() {
        // Currency selection
        const currencySelect = document.getElementById('currency-select');
        currencySelect.value = this.settings.currency;
        currencySelect.addEventListener('change', () => {
            this.updateCurrencyPreview();
        });

        // Scanner settings
        document.getElementById('keep-camera-on').checked = this.settings.keepCameraOn;
        document.getElementById('enable-beep').checked = this.settings.enableBeep;

        // Settings buttons
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('reset-settings').addEventListener('click', () => {
            this.resetSettings();
        });

        document.getElementById('backup-data').addEventListener('click', () => {
            this.backupAllData();
        });

        document.getElementById('clear-all-data').addEventListener('click', () => {
            this.clearAllData();
        });

        this.updateCurrencyPreview();
    }

    setupInventory() {
        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });

        // Export CSV
        const exportBtn = document.getElementById('export-csv');
        exportBtn.addEventListener('click', () => {
            this.csvManager.exportCSV(this.products);
            this.showToast('CSV exported successfully', 'success');
        });

        // Import CSV
        const importBtn = document.getElementById('import-csv');
        const fileInput = document.getElementById('csv-file-input');
        
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleCSVImport(file);
            }
        });
    }

    setupModal() {
        const modal = document.getElementById('edit-modal');
        const closeBtn = document.getElementById('close-modal');

        closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    handleAddProduct(formData) {
        const productData = {
            barcode: formData.get('barcode').trim(),
            name: formData.get('name').trim(),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            quantity: parseInt(formData.get('quantity')),
            description: formData.get('description').trim(),
            dateAdded: new Date().toISOString()
        };

        // Validate required fields
        if (!productData.barcode || !productData.name || !productData.category || 
            isNaN(productData.price) || isNaN(productData.quantity)) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        // Check if product already exists
        const existingProduct = this.products.find(p => p.barcode === productData.barcode);
        if (existingProduct) {
            this.showToast('Product with this barcode already exists', 'error');
            return;
        }

        // Add product
        this.products.push(productData);
        this.csvManager.saveProducts(this.products);
        
        // Reset form and update UI
        document.getElementById('add-product-form').reset();
        this.updateInventoryView();
        this.updateStats();
        
        this.showToast(`Product "${productData.name}" added successfully`, 'success');
    }

    handleEditProduct(formData) {
        if (!this.editingProduct) return;

        const productData = {
            barcode: this.editingProduct.barcode, // Keep original barcode
            name: formData.get('name').trim(),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            quantity: parseInt(formData.get('quantity')),
            description: formData.get('description').trim(),
            dateAdded: this.editingProduct.dateAdded,
            lastModified: new Date().toISOString()
        };

        // Validate required fields
        if (!productData.name || !productData.category || 
            isNaN(productData.price) || isNaN(productData.quantity)) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        // Update product in array
        const index = this.products.findIndex(p => p.barcode === this.editingProduct.barcode);
        if (index !== -1) {
            this.products[index] = productData;
            this.csvManager.saveProducts(this.products);
            
            this.updateInventoryView();
            this.updateStats();
            this.closeModal();
            
            this.showToast(`Product "${productData.name}" updated successfully`, 'success');
        }
    }

    handleDeleteProduct(barcode) {
        const index = this.products.findIndex(p => p.barcode === barcode);
        if (index !== -1) {
            const productName = this.products[index].name;
            this.products.splice(index, 1);
            this.csvManager.saveProducts(this.products);
            
            this.updateInventoryView();
            this.updateStats();
            this.closeModal();
            
            this.showToast(`Product "${productName}" deleted successfully`, 'success');
        }
    }

    handleCSVImport(file) {
        this.csvManager.importCSV(file)
            .then(importedProducts => {
                if (importedProducts.length > 0) {
                    // Merge with existing products, avoiding duplicates
                    let addedCount = 0;
                    let updatedCount = 0;

                    importedProducts.forEach(importedProduct => {
                        const existingIndex = this.products.findIndex(p => p.barcode === importedProduct.barcode);
                        
                        if (existingIndex !== -1) {
                            // Update existing product
                            this.products[existingIndex] = {
                                ...importedProduct,
                                lastModified: new Date().toISOString()
                            };
                            updatedCount++;
                        } else {
                            // Add new product
                            this.products.push({
                                ...importedProduct,
                                dateAdded: new Date().toISOString()
                            });
                            addedCount++;
                        }
                    });

                    this.csvManager.saveProducts(this.products);
                    this.updateInventoryView();
                    this.updateStats();
                    
                    this.showToast(`Import completed: ${addedCount} added, ${updatedCount} updated`, 'success');
                } else {
                    this.showToast('No valid products found in CSV file', 'warning');
                }
            })
            .catch(error => {
                console.error('CSV import error:', error);
                this.showToast('Error importing CSV file', 'error');
            });
    }

    updateInventoryView() {
        const grid = document.getElementById('product-grid');
        const emptyState = document.getElementById('empty-state');

        if (this.products.length === 0) {
            grid.innerHTML = '';
            grid.appendChild(emptyState);
            return;
        }

        // Remove empty state
        if (emptyState.parentNode) {
            emptyState.remove();
        }

        // Generate product cards
        grid.innerHTML = this.products.map(product => this.createProductCard(product)).join('');

        // Add event listeners to edit buttons
        this.setupProductCardEvents();

        // Refresh Feather icons
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 100);
    }

    createProductCard(product) {
        const stockStatus = this.getStockStatus(product.quantity);
        const totalValue = product.price * product.quantity;

        return `
            <div class="product-card">
                <div class="product-header">
                    <div>
                        <div class="product-name">${this.escapeHtml(product.name)}</div>
                        <div class="product-category">${this.escapeHtml(product.category)}</div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-secondary edit-product" data-barcode="${product.barcode}">
                            <i data-feather="edit-2"></i>
                        </button>
                    </div>
                </div>
                
                <div class="product-info">
                    <div class="info-item">
                        <div class="info-label">Price</div>
                        <div class="info-value">${this.formatPrice(product.price)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Quantity</div>
                        <div class="info-value">${product.quantity}</div>
                    </div>
                </div>
                
                <div class="product-info">
                    <div class="info-item">
                        <div class="info-label">Total Value</div>
                        <div class="info-value">${this.formatPrice(totalValue)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">
                            <span class="stock-status ${stockStatus.class}">${stockStatus.text}</span>
                        </div>
                    </div>
                </div>
                
                ${product.description ? `
                    <div class="product-description">
                        ${this.escapeHtml(product.description)}
                    </div>
                ` : ''}
                
                <div class="product-info" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid hsl(var(--border));">
                    <div class="info-item">
                        <div class="info-label">Barcode</div>
                        <div class="info-value" style="font-family: monospace; font-size: 0.75rem;">${product.barcode}</div>
                    </div>
                </div>
            </div>
        `;
    }

    setupProductCardEvents() {
        const editButtons = document.querySelectorAll('.edit-product');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const barcode = button.dataset.barcode;
                this.openEditModal(barcode);
            });
        });
    }

    openEditModal(barcode) {
        const product = this.products.find(p => p.barcode === barcode);
        if (!product) return;

        this.editingProduct = product;

        // Populate form
        document.getElementById('edit-product-barcode').value = product.barcode;
        document.getElementById('edit-product-name').value = product.name;
        document.getElementById('edit-product-category').value = product.category;
        document.getElementById('edit-product-price').value = product.price;
        document.getElementById('edit-product-quantity').value = product.quantity;
        document.getElementById('edit-product-description').value = product.description || '';

        // Show modal
        const modal = document.getElementById('edit-modal');
        modal.classList.add('active');

        // Refresh Feather icons
        setTimeout(() => {
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }, 100);
    }

    closeModal() {
        const modal = document.getElementById('edit-modal');
        modal.classList.remove('active');
        this.editingProduct = null;
    }

    filterProducts(searchTerm) {
        const cards = document.querySelectorAll('.product-card');
        const term = searchTerm.toLowerCase();

        cards.forEach(card => {
            const name = card.querySelector('.product-name').textContent.toLowerCase();
            const category = card.querySelector('.product-category').textContent.toLowerCase();
            const barcode = card.querySelector('.info-value[style*="monospace"]').textContent.toLowerCase();

            const matches = name.includes(term) || category.includes(term) || barcode.includes(term);
            card.style.display = matches ? 'block' : 'none';
        });
    }

    updateStats() {
        const totalProducts = this.products.length;
        const totalValue = this.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
        const lowStock = this.products.filter(product => product.quantity <= 5).length;

        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('total-value').textContent = this.formatPrice(totalValue);
        document.getElementById('low-stock').textContent = lowStock;
    }

    getStockStatus(quantity) {
        if (quantity === 0) {
            return { class: 'out-of-stock', text: 'Out of Stock' };
        } else if (quantity <= 5) {
            return { class: 'low-stock', text: 'Low Stock' };
        } else {
            return { class: 'in-stock', text: 'In Stock' };
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        toast.innerHTML = `
            <i data-feather="${iconMap[type]}" class="toast-icon"></i>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
        `;

        container.appendChild(toast);

        // Replace Feather icons
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Method to handle scanned barcode from scanner
    handleScannedBarcode(barcode) {
        if (this.scanningForAddProduct) {
            // Fill barcode in Add Product form
            document.getElementById('product-barcode').value = barcode;
            this.scanningForAddProduct = false;
            this.showToast('Barcode captured successfully', 'success');
            // Close the scanner modal
            this.closeScannerModal();
            return;
        }

        const existingProduct = this.products.find(p => p.barcode === barcode);
        
        if (existingProduct) {
            // Update last scanned product
            this.lastScannedProduct = existingProduct;
            this.updateLastScannedDisplay();
            // Show existing product info
            this.displayScanResult(barcode, existingProduct);
        } else {
            // Show option to add new product
            this.displayScanResult(barcode, null);
        }
    }

    displayScanResult(barcode, product) {
        const resultDiv = document.getElementById('scan-result');
        const barcodeSpan = document.getElementById('scanned-barcode');
        const productInfoDiv = document.getElementById('product-info');
        const addButton = document.getElementById('add-new-product');

        barcodeSpan.textContent = barcode;

        if (product) {
            productInfoDiv.innerHTML = `
                <div style="background-color: hsl(var(--success) / 0.1); padding: 1rem; border-radius: var(--radius); margin-top: 1rem;">
                    <h4 style="color: hsl(var(--success)); margin-bottom: 0.5rem;">Product Found</h4>
                    <p><strong>Name:</strong> ${this.escapeHtml(product.name)}</p>
                    <p><strong>Category:</strong> ${this.escapeHtml(product.category)}</p>
                    <p><strong>Price:</strong> ${this.formatPrice(product.price)}</p>
                    <p><strong>Quantity:</strong> ${product.quantity}</p>
                    ${product.description ? `<p><strong>Description:</strong> ${this.escapeHtml(product.description)}</p>` : ''}
                </div>
            `;
            addButton.textContent = 'Edit Product';
            addButton.onclick = () => this.openEditModal(barcode);
        } else {
            productInfoDiv.innerHTML = `
                <div style="background-color: hsl(var(--warning) / 0.1); padding: 1rem; border-radius: var(--radius); margin-top: 1rem;">
                    <h4 style="color: hsl(var(--warning)); margin-bottom: 0.5rem;">Product Not Found</h4>
                    <p>This barcode is not in your inventory. Would you like to add it?</p>
                </div>
            `;
            addButton.textContent = 'Add New Product';
            addButton.onclick = () => {
                document.getElementById('product-barcode').value = barcode;
                this.showView('add-product');
                // Update nav tab
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                document.querySelector('[data-view="add-product"]').classList.add('active');
            };
        }

        resultDiv.style.display = 'block';

        // Setup scan again button
        document.getElementById('scan-again').onclick = () => {
            resultDiv.style.display = 'none';
            this.scanner.startScanner();
        };
    }

    // Billing functionality methods
    startBarcodeCapture() {
        this.scanningForAddProduct = true;
        this.openScannerModal();
    }

    updateLastScannedDisplay() {
        if (this.lastScannedProduct) {
            document.getElementById('last-barcode').textContent = this.lastScannedProduct.barcode;
            document.getElementById('last-name').textContent = this.lastScannedProduct.name;
            document.getElementById('last-price').textContent = this.formatPrice(this.lastScannedProduct.price);
        } else {
            document.getElementById('last-barcode').textContent = 'N/A';
            document.getElementById('last-name').textContent = 'N/A';
            document.getElementById('last-price').textContent = 'N/A';
        }
    }

    addToBill(product) {
        // Check if product already exists in bill
        const existingItem = this.currentBill.find(item => item.barcode === product.barcode);
        
        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.total = existingItem.quantity * existingItem.price;
        } else {
            this.currentBill.push({
                barcode: product.barcode,
                name: product.name,
                price: product.price,
                quantity: 1,
                total: product.price
            });
        }
        
        this.updateBillDisplay();
        this.hideScanResult();
        this.showToast(`Added ${product.name} to bill`, 'success');
    }

    updateBillDisplay() {
        const billItemsContainer = document.getElementById('bill-items');
        const totalBillElement = document.getElementById('total-bill');
        
        if (this.currentBill.length === 0) {
            billItemsContainer.innerHTML = '<div class="empty-bill">No items in bill</div>';
            totalBillElement.textContent = this.formatPrice(0);
            return;
        }
        
        // Generate bill items HTML
        billItemsContainer.innerHTML = this.currentBill.map(item => `
            <div class="bill-item">
                <div class="bill-item-name">
                    ${this.escapeHtml(item.name)}
                    <span class="bill-item-qty">x${item.quantity}</span>
                </div>
                <div class="bill-item-price">${this.formatPrice(item.total)}</div>
            </div>
        `).join('');
        
        // Calculate and display total
        const total = this.currentBill.reduce((sum, item) => sum + item.total, 0);
        totalBillElement.textContent = this.formatPrice(total);
    }

    hideScanResult() {
        document.getElementById('scan-result').style.display = 'none';
    }

    resetBill() {
        if (this.currentBill.length === 0) {
            this.showToast('Bill is already empty', 'info');
            return;
        }
        
        if (confirm('Are you sure you want to reset the current bill?')) {
            this.currentBill = [];
            this.lastScannedProduct = null;
            this.updateBillDisplay();
            this.updateLastScannedDisplay();
            this.hideScanResult();
            this.showToast('Bill reset successfully', 'success');
        }
    }

    printReceipt() {
        if (this.currentBill.length === 0) {
            this.showToast('No items in bill to print', 'warning');
            return;
        }
        
        // Create receipt content
        const total = this.currentBill.reduce((sum, item) => sum + item.total, 0);
        const date = new Date().toLocaleString();
        
        let receiptContent = `
            <div style="font-family: monospace; max-width: 400px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin: 0;">GroceryPro</h2>
                    <p style="margin: 5px 0;">Store Receipt</p>
                    <p style="margin: 5px 0; font-size: 12px;">${date}</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    ${this.currentBill.map(item => `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>${item.name} x${item.quantity}</span>
                            <span>${this.formatPrice(item.total)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-top: 2px solid #000; padding-top: 10px; text-align: right;">
                    <div style="font-size: 18px; font-weight: bold;">
                        TOTAL: ${this.formatPrice(total)}
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px;">
                    <p>Thank you for shopping with us!</p>
                    <p>Items: ${this.currentBill.length} | Qty: ${this.currentBill.reduce((sum, item) => sum + item.quantity, 0)}</p>
                </div>
            </div>
        `;
        
        // Create new window for printing
        const printWindow = window.open('', '', 'width=600,height=800');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - GroceryPro</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: monospace; }
                    @media print {
                        body { margin: 0; }
                    }
                </style>
            </head>
            <body>
                ${receiptContent}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        
        this.showToast('Receipt sent to printer', 'success');
    }

    // Settings management methods
    loadSettings() {
        try {
            const stored = localStorage.getItem('groceryapp_settings');
            if (stored) {
                return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        return this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            currency: 'USD',
            keepCameraOn: true,
            enableBeep: true
        };
    }

    saveSettings() {
        const settings = {
            currency: document.getElementById('currency-select').value,
            keepCameraOn: document.getElementById('keep-camera-on').checked,
            enableBeep: document.getElementById('enable-beep').checked
        };

        try {
            localStorage.setItem('groceryapp_settings', JSON.stringify(settings));
            this.settings = settings;
            this.updateCurrencyPreview();
            this.updateAllPrices();
            this.showToast('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.settings = this.getDefaultSettings();
            document.getElementById('currency-select').value = this.settings.currency;
            document.getElementById('keep-camera-on').checked = this.settings.keepCameraOn;
            document.getElementById('enable-beep').checked = this.settings.enableBeep;
            this.updateCurrencyPreview();
            this.showToast('Settings reset to defaults', 'success');
        }
    }

    updateCurrencyPreview() {
        const currency = document.getElementById('currency-select').value;
        const preview = document.getElementById('currency-preview');
        const samplePrice = 99.99;
        preview.textContent = this.formatPrice(samplePrice, currency);
    }

    formatPrice(amount, currency = null) {
        const curr = currency || this.settings.currency;
        const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CAD': 'C$',
            'AUD': 'A$',
            'CHF': 'CHF ',
            'CNY': '¥',
            'INR': '₹',
            'KRW': '₩',
            'BRL': 'R$',
            'MXN': 'MX$'
        };

        const symbol = currencySymbols[curr] || '$';
        
        // Handle currencies without decimal places
        if (curr === 'JPY' || curr === 'KRW') {
            return `${symbol}${Math.round(amount)}`;
        }
        
        return `${symbol}${amount.toFixed(2)}`;
    }

    updateAllPrices() {
        // Update all displayed prices with new currency format
        this.updateInventoryView();
        this.updateBillDisplay();
        this.updateLastScannedDisplay();
        this.updateStats();
    }

    backupAllData() {
        try {
            this.csvManager.createBackup();
            this.showToast('Data backup created successfully', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            this.showToast('Error creating backup', 'error');
        }
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            if (confirm('This will delete all products, bills, and settings. Are you absolutely sure?')) {
                try {
                    this.csvManager.clearAllData();
                    localStorage.removeItem('groceryapp_settings');
                    this.currentBill = [];
                    this.lastScannedProduct = null;
                    this.settings = this.getDefaultSettings();
                    this.loadProducts();
                    this.updateBillDisplay();
                    this.updateLastScannedDisplay();
                    this.showToast('All data cleared successfully', 'success');
                } catch (error) {
                    console.error('Error clearing data:', error);
                    this.showToast('Error clearing data', 'error');
                }
            }
        }
    }

    // Audio management for beep sounds
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext
