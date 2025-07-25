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
        this.loadCurrentBill();
        this.setupEventListeners();
        
        this.scanner = new BarcodeScanner();
        this.inventory = new InventoryManager();
        this.chat = new ChatAssistant();
        
        await this.inventory.fetchInventory(); 
        
        this.updateUI();
        this.updateCurrencySymbols();
        
        console.log('Grocy App initialized');
    }

    setupEventListeners() {
        document.getElementById('menu-toggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebar-close').addEventListener('click', () => this.closeSidebar());
        document.getElementById('sidebar-overlay').addEventListener('click', () => this.closeSidebar());

        document.querySelectorAll('.sidebar-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.switchView(view);
                this.closeSidebar();
            });
        });

        document.getElementById('quick-scan').addEventListener('click', () => {
            this.switchView('scanner');
            this.scanner.startScanning();
        });

        document.getElementById('manual-add-product').addEventListener('click', () => this.showManualProductSelector());
        document.getElementById('add-product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addProduct();
        });
        document.getElementById('clear-form').addEventListener('click', () => this.clearForm());
        document.getElementById('process-sale').addEventListener('click', () => this.processSale());
        document.getElementById('print-receipt').addEventListener('click', () => this.printReceipt());
        document.getElementById('reset-scan').addEventListener('click', () => this.resetBill());
        document.getElementById('backup-data').addEventListener('click', () => this.backupData());
        document.getElementById('restore-data').addEventListener('click', () => this.restoreData());
        document.getElementById('clear-data').addEventListener('click', () => this.clearData());
        document.getElementById('save-settings').addEventListener('click', () => this.saveAllSettings());

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
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
        }

        document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
        const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        this.onViewChange(viewName);
    }

    onViewChange(viewName) {
        switch (viewName) {
            case 'inventory':
                if (this.inventory) this.inventory.refreshInventory();
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

        if (!product.name || !product.category || isNaN(product.price) || isNaN(product.quantity)) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            if (editId) {
                // Update existing product
                const existingIndex = this.products.findIndex(p => p.id === editId);
                if (existingIndex !== -1) {
                    this.products[existingIndex] = product;
                }
            } else {
                // Add new product
                if (product.barcode && this.products.some(p => p.barcode === product.barcode)) {
                    this.showNotification('A product with this barcode already exists', 'error');
                    return;
                }
                this.products.push(product);
            }

            // Save to server
            await this.inventory.saveInventoryToCSV();
            await this.inventory.fetchInventory();
            
            this.clearForm();
            this.resetAddProductForm();
            this.showNotification(editId ? 'Product updated successfully' : 'Product added successfully', 'success');
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
        const formHeader = document.querySelector('.form-header h2');
        const formSubHeader = document.querySelector('.form-header p');
        
        // Reset form to add mode
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-feather="plus"></i> Add Product';
        }
        if (formHeader) formHeader.textContent = 'Add Product';
        if (formSubHeader) formSubHeader.textContent = 'Fill in the product details below';
        
        // Remove edit ID
        delete form.dataset.editId;
        
        feather.replace();
    }

    addToBill(product, quantity = 1) {
        const inventoryProduct = this.products.find(p => p.id === product.id);

        if (!inventoryProduct || parseInt(inventoryProduct.quantity) < quantity) {
            this.showNotification('Product out of stock!', 'error');
            return;
        }

        const existingItem = this.currentBill.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.currentBill.push({ ...product, quantity: quantity });
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

        billItemsContainer.innerHTML = '';
        let total = 0;

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

        totalBillElement.textContent = this.formatPrice(total);
        feather.replace();
    }

    async processSale() {
        if (this.currentBill.length === 0) {
            this.showNotification('No items in bill to process', 'warning');
            return;
        }

        try {
            const total = this.currentBill.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            const saleData = {
                items: this.currentBill,
                total: total,
                saleDate: new Date().toISOString()
            };

            const response = await fetch('/process-sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saleData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Refresh inventory and reset bill
            await this.inventory.fetchInventory();
            this.resetBill();
            this.showNotification('Sale processed successfully', 'success');
        } catch (error) {
            console.error('Error processing sale:', error);
            this.showNotification('Failed to process sale', 'error');
        }
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
        let receiptHTML = `...`; 
        return receiptHTML;
    }

    formatPrice(price) {
        const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£' };
        return `${symbols[this.settings.currency] || '$'}${price.toFixed(2)}`;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `...`; 
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 5000);
        notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    }

    loadSettings() {
        const stored = localStorage.getItem('grocy-settings');
        if (stored) this.settings = { ...this.settings, ...JSON.parse(stored) };
    }

    saveSettings() {
        localStorage.setItem('grocy-settings', JSON.stringify(this.settings));
        this.updateCurrencyDisplay();
    }

    saveAllSettings() {
        this.saveSettings();
        this.showNotification('Settings saved successfully!', 'success');
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

    backupData() { /* ... */ }
    restoreData() { /* ... */ }
    clearData() { /* ... */ }
    updateUI() {
        this.loadCurrentBill();
        this.loadSettingsToForm();
        this.updateCurrencyDisplay();
    }
    updateCurrencyDisplay() {
        this.updateBillDisplay();
        if (this.inventory) {
            this.inventory.updateStats();
            this.inventory.renderProducts();
        }
        this.updateCurrencySymbols();
    }
    updateCurrencySymbols() {
        const currencySymbols = document.querySelectorAll('.currency-symbol');
        const symbols = { 
            'USD': '$', 
            'EUR': '€', 
            'GBP': '£',
            'AED': 'د.إ',
            'AFN': '؋',
            'ALL': 'L',
            'AMD': '֏',
            'ANG': 'ƒ',
            'AOA': 'Kz',
            'ARS': '$',
            'AUD': 'A$',
            'AWG': 'ƒ',
            'AZN': '₼',
            'BAM': 'KM',
            'BBD': 'Bds$',
            'BDT': '৳',
            'BGN': 'лв',
            'BHD': '.د.ب',
            'BIF': 'FBu',
            'BMD': '$',
            'BND': 'B$',
            'BOB': 'Bs.',
            'BRL': 'R$',
            'BSD': 'B$',
            'BTN': 'Nu.',
            'BWP': 'P',
            'BYN': 'Br',
            'BZD': 'BZ$',
            'CAD': 'C$',
            'CDF': 'FC',
            'CHF': 'CHF',
            'CLP': 'CL$',
            'CNY': '¥',
            'COP': 'COL$',
            'CRC': '₡',
            'CUP': '₱',
            'CVE': '$',
            'CZK': 'Kč',
            'DJF': 'Fdj',
            'DKK': 'kr',
            'DOP': 'RD$',
            'DZD': 'دج',
            'EGP': 'E£',
            'ERN': 'Nfk',
            'ETB': 'Br',
            'FJD': 'FJ$',
            'FKP': '£',
            'FOK': 'kr',
            'GEL': '₾',
            'GGP': '£',
            'GHS': '₵',
            'GIP': '£',
            'GMD': 'D',
            'GNF': 'FG',
            'GTQ': 'Q',
            'GYD': 'G$',
            'HKD': 'HK$',
            'HNL': 'L',
            'HRK': 'kn',
            'HTG': 'G',
            'HUF': 'Ft',
            'IDR': 'Rp',
            'ILS': '₪',
            'IMP': '£',
            'INR': '₹',
            'IQD': 'ع.د',
            'IRR': '﷼',
            'ISK': 'kr',
            'JEP': '£',
            'JMD': 'J$',
            'JOD': 'JD',
            'JPY': '¥',
            'KES': 'KSh',
            'KGS': 'с',
            'KHR': '៛',
            'KID': '$',
            'KMF': 'CF',
            'KRW': '₩',
            'KWD': 'KD',
            'KYD': 'CI$',
            'KZT': '₸',
            'LAK': '₭',
            'LBP': 'ل.ل',
            'LKR': 'Rs',
            'LRD': 'L$',
            'LSL': 'L',
            'LYD': 'LD',
            'MAD': 'د.م.',
            'MDL': 'L',
            'MGA': 'Ar',
            'MKD': 'ден',
            'MMK': 'K',
            'MNT': '₮',
            'MOP': 'MOP$',
            'MRU': 'UM',
            'MUR': '₨',
            'MVR': 'Rf',
            'MWK': 'MK',
            'MXN': 'MX$',
            'MYR': 'RM',
            'MZN': 'MT',
            'NAD': 'N$',
            'NGN': '₦',
            'NIO': 'C$',
            'NOK': 'kr',
            'NPR': '₨',
            'NZD': 'NZ$',
            'OMR': '﷼',
            'PAB': 'B/.',
            'PEN': 'S/.',
            'PGK': 'K',
            'PHP': '₱',
            'PKR': '₨',
            'PLN': 'zł',
            'PYG': '₲',
            'QAR': '﷼',
            'RON': 'lei',
            'RSD': 'дин',
            'RUB': '₽',
            'RWF': 'FRw',
            'SAR': '﷼',
            'SBD': 'SI$',
            'SCR': '₨',
            'SDG': 'ج.س.',
            'SEK': 'kr',
            'SGD': 'S$',
            'SHP': '£',
            'SLL': 'Le',
            'SOS': 'Sh',
            'SRD': '$',
            'SSP': '£',
            'STN': 'Db',
            'SYP': '£S',
            'SZL': 'L',
            'THB': '฿',
            'TJS': 'ЅМ',
            'TMT': 'm',
            'TND': 'د.ت',
            'TOP': 'T$',
            'TRY': '₺',
            'TTD': 'TT$',
            'TVD': '$',
            'TWD': 'NT$',
            'TZS': 'TSh',
            'UAH': '₴',
            'UGX': 'USh',
            'UYU': '$U',
            'UZS': 'so\'m',
            'VES': 'Bs.S',
            'VND': '₫',
            'VUV': 'VT',
            'WST': 'T',
            'XAF': 'FCFA',
            'XCD': 'EC$',
            'XOF': 'CFA',
            'XPF': '₣',
            'YER': '﷼',
            'ZAR': 'R',
            'ZMW': 'ZK',
            'ZWL': 'Z$'
        };
        
        currencySymbols.forEach(symbol => {
            symbol.textContent = symbols[this.settings.currency] || '$';
        });
        
        // Update price input placeholders
        const priceInput = document.getElementById('product-price');
        if (priceInput) {
            priceInput.placeholder = `Enter price in ${this.settings.currency}`;
        }
    }
    
    showManualProductSelector() {
        console.log('showManualProductSelector called. Products available:', this.products.length);

        const modal = document.createElement('div');
        modal.className = 'manual-product-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add Product to Bill</h3>
                    <button class="modal-close"><i data-feather="x"></i></button>
                </div>
                <div class="modal-body">
                    <div class="search-container">
                        <input type="text" id="product-search" placeholder="Search by name, category, or barcode...">
                        <i data-feather="search"></i>
                    </div>
                    <div class="product-list" id="manual-product-list"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        feather.replace();

        const productList = modal.querySelector('#manual-product-list');
        const searchInput = modal.querySelector('#product-search');
        const closeModal = modal.querySelector('.modal-close');

        const renderManualProducts = (productsToRender) => {
            if (!productsToRender || productsToRender.length === 0) {
                productList.innerHTML = '<p class="no-products">No products found.</p>';
                return;
            }
            productList.innerHTML = productsToRender.map(product => `
                <div class="manual-product-item" data-product-id="${product.id}">
                    <div class="product-info">
                        <h4>${product.name}</h4>
                        <p>Category: ${product.category} | Stock: ${product.quantity}</p>
                        <p>Price: ${this.formatPrice(product.price)}</p>
                    </div>
                    <button class="btn btn-sm btn-primary">
                        <i data-feather="plus"></i>
                        Add
                    </button>
                </div>
            `).join('');
            feather.replace();
            
            // Re-attach event listeners after rendering
            productList.querySelectorAll('.manual-product-item').forEach(item => {
                item.addEventListener('click', () => {
                    this.addProductToBillFromModal(item.dataset.productId);
                });
            });
        };

        renderManualProducts(this.products);

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            console.log("Searching for:", query); // Debug log
            const filtered = this.products.filter(product =>
                product.name.toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query) ||
                (product.barcode && product.barcode.toLowerCase().includes(query))
            );
            console.log("Filtered results:", filtered.length); // Debug log
            renderManualProducts(filtered);
        });

        closeModal.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    addProductToBillFromModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.addToBill(product);
            const modal = document.querySelector('.manual-product-modal');
            if (modal) modal.remove();
        }
    }
}