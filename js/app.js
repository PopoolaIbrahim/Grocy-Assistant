// Main Application Class
class GrocyApp {
    constructor() {
        this.currentView = 'scanner';
        this.currentBill = [];
        this.products = [];
        this.settings = {
            currency: 'USD',
            lowStockThreshold: 10,
            autoAddToBill: true,
            soundOnScan: true
        };

        this.init();
    }

    async init() {
        this.loadSettings();
        this.loadProducts();
        await this.loadProductsFromServer(); // Load from server on startup
        this.loadCurrentBill();
        this.setupEventListeners();
        this.updateUI();
        this.updateCurrencySymbols();

        // Initialize components
        this.scanner = new BarcodeScanner();
        // Inventory manager is initialized globally in inventory.js
        this.chat = new ChatAssistant();

        console.log('Grocy App initialized');
    }

    setupEventListeners() {
        // Sidebar navigation
        document.getElementById('menu-toggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        document.getElementById('sidebar-close').addEventListener('click', () => {
            this.closeSidebar();
        });

        document.getElementById('sidebar-overlay').addEventListener('click', () => {
            this.closeSidebar();
        });

        // Navigation items
        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
                this.closeSidebar();
            });
        });

        // Quick scan button
        document.getElementById('quick-scan').addEventListener('click', () => {
            this.switchView('scanner');
            this.scanner.startScanning();
        });

        // Manual add product button - search inventory first
        document.getElementById('manual-add-product').addEventListener('click', () => {
            this.showProductSearchDialog();
        });

        // Add product form
        document.getElementById('add-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProduct();
        });

        document.getElementById('clear-form').addEventListener('click', () => {
            this.clearForm();
        });

        // Bill management
        document.getElementById('print-receipt').addEventListener('click', () => {
            this.printReceipt();
        });

        document.getElementById('reset-scan').addEventListener('click', () => {
            this.resetBill();
        });

        // Settings
        document.getElementById('backup-data').addEventListener('click', () => {
            this.backupData();
        });

        document.getElementById('restore-data').addEventListener('click', () => {
            this.restoreData();
        });

        document.getElementById('clear-data').addEventListener('click', () => {
            this.clearData();
        });

        // Settings inputs
        document.getElementById('currency-select').addEventListener('change', (e) => {
            this.settings.currency = e.target.value;
            this.saveSettings();
            this.updateCurrencyDisplay();
        });

        document.getElementById('low-stock-threshold').addEventListener('change', (e) => {
            this.settings.lowStockThreshold = parseInt(e.target.value);
            this.saveSettings();
        });

        document.getElementById('auto-add-to-bill').addEventListener('change', (e) => {
            this.settings.autoAddToBill = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('sound-on-scan').addEventListener('change', (e) => {
            this.settings.soundOnScan = e.target.checked;
            this.saveSettings();
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }

        // Update navigation
        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Trigger view-specific actions
        this.onViewChange(viewName);
    }

    onViewChange(viewName) {
        switch (viewName) {
            case 'inventory':
                if (window.inventoryManager) window.inventoryManager.fetchInventoryFromServer();
                break;
            case 'chat':
                if (this.chat) this.chat.focusInput();
                break;
            case 'settings':
                this.loadSettingsToForm();
                break;
        }
    }

    async addProduct() {
        const form = document.getElementById('add-product-form');
        const formData = new FormData(form);

        // Check if we're editing an existing product
        const editId = form.dataset.editId;

        const product = {
            id: editId || Date.now().toString() + Math.random().toString(36).substr(2, 9),
            barcode: formData.get('barcode') || '',
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            quantity: parseInt(formData.get('quantity')),
            description: formData.get('description') || '',
            dateAdded: new Date().toISOString()
        };

        // Validate required fields
        if (!product.name || !product.category || isNaN(product.price) || isNaN(product.quantity)) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Check for duplicate barcode
        if (product.barcode && this.products.some(p => p.barcode === product.barcode && p.id !== editId)) {
            this.showNotification('A product with this barcode already exists', 'error');
            return;
        }

        try {
            // Send product to server
            const response = await fetch('/add-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(product)
            });

            if (response.ok) {
                // Update local products array
                if (editId) {
                    const existingIndex = this.products.findIndex(p => p.id === editId);
                    if (existingIndex !== -1) {
                        this.products[existingIndex] = product;
                    }
                } else {
                    this.products.push(product);
                }

                this.saveProducts();
                this.clearForm();
                this.resetAddProductForm();
                this.showNotification(editId ? 'Product updated successfully' : 'Product added successfully', 'success');

                // Reload products from server to sync with CSV
                await this.loadProductsFromServer();

                // Refresh inventory if it exists
                if (window.inventoryManager) {
                    window.inventoryManager.fetchInventory();
                }
            } else {
                throw new Error('Failed to save product to server');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            this.showNotification('Failed to save product', 'error');
        }
    }

    clearForm() {
        document.getElementById('add-product-form').reset();
    }

    resetAddProductForm() {
        const form = document.getElementById('add-product-form');
        const submitBtn = form.querySelector('button[type="submit"]');

        // Reset form mode
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-feather="plus"></i> Add Product';
        }

        // Remove edit ID
        delete form.dataset.editId;

        // Update form header
        const formHeader = document.querySelector('.form-header h2');
        const formSubHeader = document.querySelector('.form-header p');
        if (formHeader) formHeader.textContent = 'Add New Product';
        if (formSubHeader) formSubHeader.textContent = 'Fill in product details below';

        feather.replace();
    }

    addToBill(product) {
        const existingItem = this.currentBill.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.currentBill.push({
                ...product,
                quantity: 1
            });
        }

        this.updateBillDisplay();
        this.saveCurrentBill();
    }

    removeFromBill(productId) {
        this.currentBill = this.currentBill.filter(item => item.id !== productId);
        this.updateBillDisplay();
        this.saveCurrentBill();
    }

    updateBillDisplay() {
        const billItemsContainer = document.getElementById('bill-items');
        const totalBillElement = document.getElementById('total-bill');

        if (!billItemsContainer || !totalBillElement) return;

        // Clear existing items
        billItemsContainer.innerHTML = '';

        let total = 0;

        // Add bill items
        this.currentBill.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const billItem = document.createElement('div');
            billItem.className = 'bill-item';
            billItem.innerHTML = `
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">x${item.quantity}</span>
                </div>
                <div class="item-total">
                    ${this.formatPrice(itemTotal)}
                    <button class="btn btn-sm btn-danger" onclick="grocyApp.removeFromBill('${item.id}')">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            `;
            billItemsContainer.appendChild(billItem);
        });

        // Update total
        totalBillElement.textContent = this.formatPrice(total);

        // Re-initialize feather icons
        feather.replace();
    }

    resetBill() {
        this.currentBill = [];
        this.updateBillDisplay();
        this.saveCurrentBill();
        this.showNotification('Bill reset successfully', 'success');
    }

    printReceipt() {
        if (this.currentBill.length === 0) {
            this.showNotification('No items in bill to print', 'warning');
            return;
        }

        const receipt = this.generateReceipt();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(receipt);
        printWindow.document.close();
        printWindow.print();

        this.showNotification('Receipt sent to printer', 'success');
    }

    generateReceipt() {
        const now = new Date();
        let total = 0;

        let receiptHTML = `
            <html>
            <head>
                <title>Grocy Receipt</title>
                <style>
                    body { font-family: monospace; width: 300px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 5px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>GROCY STORE</h2>
                    <p>Receipt #${Date.now()}</p>
                    <p>${now.toLocaleString()}</p>
                </div>
                <div class="items">
        `;

        this.currentBill.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            receiptHTML += `
                <div class="item">
                    <span>${item.name} x${item.quantity}</span>
                    <span>${this.formatPrice(itemTotal)}</span>
                </div>
            `;
        });

        receiptHTML += `
                </div>
                <div class="total">
                    <div class="item">
                        <span>TOTAL</span>
                        <span>${this.formatPrice(total)}</span>
                    </div>
                </div>
                <div class="footer">
                    <p>Thank you for shopping with Grocy!</p>
                    <p>Powered by Grocy AI Assistant</p>
                </div>
            </body>
            </html>
        `;

        return receiptHTML;
    }

    formatPrice(price) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };
        return `${symbols[this.settings.currency] || '$'}${price.toFixed(2)}`;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 300px;
                    padding: 15px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: slideIn 0.3s ease;
                }
                .notification-info { background: #2196F3; color: white; }
                .notification-success { background: #4CAF50; color: white; }
                .notification-warning { background: #FF9800; color: white; }
                .notification-error { background: #F44336; color: white; }
                .notification-content { display: flex; justify-content: space-between; align-items: center; }
                .notification-close { background: none; border: none; color: inherit; font-size: 20px; cursor: pointer; }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `;
            document.head.appendChild(styles);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    loadProducts() {
        const stored = localStorage.getItem('grocy-products');
        if (stored) {
            this.products = JSON.parse(stored);
        }
    }

    async loadProductsFromServer() {
        try {
            const response = await fetch('/inventory');
            if (response.ok) {
                const inventoryData = await response.json();
                this.products = inventoryData;
                this.saveProducts(); // Update localStorage
            }
        } catch (error) {
            console.error('Error loading products from server:', error);
        }
    }

    saveProducts() {
        localStorage.setItem('grocy-products', JSON.stringify(this.products));
        // Refresh inventory if it exists
        if (window.inventoryManager) {
            window.inventoryManager.refreshInventory();
        }
    }

    loadSettings() {
        const stored = localStorage.getItem('grocy-settings');
        if (stored) {
            this.settings = { ...this.settings, ...JSON.parse(stored) };
        }
    }

    saveSettings() {
        localStorage.setItem('grocy-settings', JSON.stringify(this.settings));
        // Update currency display across all components
        this.updateCurrencyDisplay();
    }

    loadSettingsToForm() {
        document.getElementById('currency-select').value = this.settings.currency;
        document.getElementById('low-stock-threshold').value = this.settings.lowStockThreshold;
        document.getElementById('auto-add-to-bill').checked = this.settings.autoAddToBill;
        document.getElementById('sound-on-scan').checked = this.settings.soundOnScan;
    }

    saveCurrentBill() {
        localStorage.setItem('grocy-current-bill', JSON.stringify(this.currentBill));
    }

    loadCurrentBill() {
        const stored = localStorage.getItem('grocy-current-bill');
        if (stored) {
            this.currentBill = JSON.parse(stored);
            this.updateBillDisplay();
        }
    }



    backupData() {
        const backupData = {
            products: this.products,
            settings: this.settings,
            timestamp: new Date().toISOString()
        };

        const json = JSON.stringify(backupData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `grocy-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.showNotification('Data backup downloaded', 'success');
    }

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const backupData = JSON.parse(e.target.result);
                        this.products = backupData.products || [];
                        this.settings = { ...this.settings, ...backupData.settings };

                        this.saveProducts();
                        this.saveSettings();
                        this.updateUI();

                        this.showNotification('Data restored successfully', 'success');
                    } catch (error) {
                        this.showNotification('Invalid backup file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            this.products = [];
            this.currentBill = [];
            this.settings = {
                currency: 'USD',
                lowStockThreshold: 10,
                autoAddToBill: true,
                soundOnScan: true
            };

            localStorage.removeItem('grocy-products');
            localStorage.removeItem('grocy-current-bill');
            localStorage.removeItem('grocy-settings');

            this.updateUI();
            this.showNotification('All data cleared', 'success');
        }
    }

    updateUI() {
        this.loadCurrentBill();
        this.loadSettingsToForm();
        this.updateCurrencyDisplay();
        if (this.inventory) {
            this.inventory.refreshInventory();
        }
    }

    updateCurrencyDisplay() {
        // Update all currency displays across the application
        this.updateBillDisplay();
        if (this.inventory) {
            this.inventory.updateStats();
            this.inventory.renderProducts();
        }

        // Update currency symbols on forms
        this.updateCurrencySymbols();
    }

    updateCurrencySymbols() {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        };

        const currentSymbol = symbols[this.settings.currency] || '$';

        // Update price labels in add product form
        const priceLabels = document.querySelectorAll('.price-label, .currency-symbol');
        priceLabels.forEach(label => {
            if (label.classList.contains('currency-symbol')) {
                label.textContent = currentSymbol;
            }
        });

        // Update placeholder text
        const priceInput = document.getElementById('product-price');
        if (priceInput) {
            priceInput.placeholder = `Enter price in ${this.settings.currency}`;
        }
    }

    showManualProductSelector() {
        // Create a modal to select products manually
        const modal = document.createElement('div');
        modal.className = 'manual-product-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Product to Bill</h3>
                    <button class="modal-close" onclick="this.closest('.manual-product-modal').remove()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="search-container">
                        <input type="text" id="product-search" placeholder="Search products...">
                        <i data-feather="search"></i>
                    </div>
                    <div class="product-list" id="manual-product-list">
                        ${this.renderManualProductList()}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('#product-search').addEventListener('input', (e) => {
            this.filterManualProducts(e.target.value);
        });

        feather.replace();
    }

    renderManualProductList() {
        if (this.products.length === 0) {
            return '<p class="no-products">No products available. Add products first!</p>';
        }

        return this.products.map(product => `
            <div class="manual-product-item" onclick="grocyApp.addProductToBillFromModal('${product.id}')">
                <div class="product-info">
                    <h4>${product.name}</h4>
                    <p>Category: ${product.category}</p>
                    <p>Price: ${this.formatPrice(product.price)}</p>
                    <p>Stock: ${product.quantity}</p>
                </div>
                <button class="btn btn-sm btn-primary">
                    <i data-feather="plus"></i>
                    Add
                </button>
            </div>
        `).join('');
    }

    filterManualProducts(query) {
        const productList = document.getElementById('manual-product-list');
        const filteredProducts = this.products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.category.toLowerCase().includes(query.toLowerCase())
        );

        if (filteredProducts.length === 0) {
            productList.innerHTML = '<p class="no-products">No products match your search.</p>';
        } else {
            productList.innerHTML = filteredProducts.map(product => `
                <div class="manual-product-item" onclick="grocyApp.addProductToBillFromModal('${product.id}')">
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p>Category: ${product.category}</p>
                        <p>Price: ${this.formatPrice(product.price)}</p>
                        <p>Stock: ${product.quantity}</p>
                    </div>
                    <button class="btn btn-sm btn-primary">
                        <i data-feather="plus"></i>
                        Add
                    </button>
                </div>
            `).join('');
        }
        feather.replace();
    }

    addProductToBillFromModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            if (product.quantity > 0) {
                this.addToBill(product);
                this.showNotification(`Added ${product.name} to bill`, 'success');

                // Update quantity in inventory
                product.quantity--;
                this.saveProducts();

                // Close modal
                const modal = document.querySelector('.manual-product-modal');
                if (modal) {
                    modal.remove();
                }
            } else {
                this.showNotification('Product out of stock', 'warning');
            }
        }
    }

    showProductSearchDialog() {
        const searchTerm = prompt('Enter product name or barcode to search:');
        if (searchTerm) {
            this.searchProductInInventory(searchTerm);
        }
    }

    async searchProductInInventory(searchTerm) {
        try {
            const response = await fetch('/search-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ searchTerm: searchTerm })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.product) {
                    const addToCart = confirm(`Found: ${result.product.name} - $${result.product.price}\nStock: ${result.product.quantity}\n\nAdd to bill?`);
                    if (addToCart) {
                        this.addToBill(result.product);
                    }
                } else {
                    const createNew = confirm('Product not found in inventory. Would you like to add a new product?');
                    if (createNew) {
                        this.switchView('add-product');
                        document.getElementById('product-name').value = searchTerm;
                    }
                }
            }
        } catch (error) {
            console.error('Error searching product:', error);
            this.showNotification('Error searching product', 'error');
        }
    }

    async printReceipt() {
        if (this.currentBill.length === 0) {
            this.showNotification('No items in bill to print', 'warning');
            return;
        }

        try {
            // Send sale data to server
            const saleData = {
                items: this.currentBill,
                total: this.currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                saleDate: new Date().toISOString()
            };

            const response = await fetch('/process-sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            });

            if (response.ok) {
                // Create and print receipt
                this.generateReceipt();
                this.showNotification('Receipt printed and inventory updated', 'success');
                this.resetBill();
            } else {
                throw new Error('Failed to process sale');
            }
        } catch (error) {
            console.error('Error processing sale:', error);
            this.showNotification('Error processing sale', 'error');
        }
    }

    generateReceipt() {
        const receiptWindow = window.open('', '_blank');
        const total = this.currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        receiptWindow.document.write(`
            <html>
                <head>
                    <title>Receipt</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .receipt { max-width: 400px; margin: 0 auto; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                        .item { display: flex; justify-content: space-between; margin: 5px 0; }
                        .total { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <div class="header">
                            <h2>Grocy Store</h2>
                            <p>Date: ${new Date().toLocaleDateString()}</p>
                            <p>Time: ${new Date().toLocaleTimeString()}</p>
                        </div>
                        <div class="items">
                            ${this.currentBill.map(item => `
                                <div class="item">
                                    <span>${item.name} x${item.quantity}</span>
                                    <span>${this.formatPrice(item.price * item.quantity)}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="total">
                            <div class="item">
                                <span>TOTAL:</span>
                                <span>${this.formatPrice(total)}</span>
                            </div>
                        </div>
                        <div style="text-align: center; margin-top: 20px;">
                            <p>Thank you for shopping with us!</p>
                        </div>
                    </div>
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
    }

    resetBill() {
        this.currentBill = [];
        this.updateBillDisplay();
        this.showNotification('Bill reset', 'info');
    }
}