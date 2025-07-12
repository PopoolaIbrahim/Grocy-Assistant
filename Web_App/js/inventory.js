// Inventory Manager Class
class InventoryManager {
    constructor() {
        this.filteredProducts = [];
        this.currentFilter = '';
        this.currentSort = 'name';
        this.currentSortDirection = 'asc';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.refreshInventory();
        console.log('Inventory Manager initialized');
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.currentFilter = e.target.value.toLowerCase();
            this.filterProducts();
        });

        // CSV Import/Export
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('import-csv').addEventListener('click', () => {
            document.getElementById('csv-file-input').click();
        });

        document.getElementById('csv-file-input').addEventListener('change', (e) => {
            this.importCSV(e.target.files[0]);
        });

        // Sort functionality
        this.setupSortHandlers();
    }

    setupSortHandlers() {
        // Add sort buttons to inventory header
        const inventoryHeader = document.querySelector('.inventory-header h2');
        if (inventoryHeader) {
            const sortContainer = document.createElement('div');
            sortContainer.className = 'sort-container';
            sortContainer.innerHTML = `
                <label for="sort-select">Sort by:</label>
                <select id="sort-select">
                    <option value="name">Name</option>
                    <option value="category">Category</option>
                    <option value="price">Price</option>
                    <option value="quantity">Quantity</option>
                    <option value="dateAdded">Date Added</option>
                </select>
                <button id="sort-direction" class="btn btn-sm btn-secondary">
                    <i data-feather="arrow-up"></i>
                </button>
            `;
            inventoryHeader.parentNode.insertBefore(sortContainer, inventoryHeader.nextSibling);

            // Event listeners for sorting
            document.getElementById('sort-select').addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortProducts();
            });

            document.getElementById('sort-direction').addEventListener('click', () => {
                this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                this.updateSortDirectionIcon();
                this.sortProducts();
            });
        }
    }

    updateSortDirectionIcon() {
        const sortBtn = document.getElementById('sort-direction');
        const icon = sortBtn.querySelector('i');
        icon.setAttribute('data-feather', this.currentSortDirection === 'asc' ? 'arrow-up' : 'arrow-down');
        feather.replace();
    }

    refreshInventory() {
        const app = window.grocyApp;
        if (app && app.products) {
            this.filteredProducts = [...app.products];
            this.filterProducts();
            this.sortProducts();
            this.updateStats();
            this.renderProducts();
        }
    }

    filterProducts() {
        const app = window.grocyApp;
        if (!app || !app.products) return;
        
        if (!this.currentFilter) {
            this.filteredProducts = [...app.products];
        } else {
            this.filteredProducts = app.products.filter(product => 
                product.name.toLowerCase().includes(this.currentFilter) ||
                product.category.toLowerCase().includes(this.currentFilter) ||
                product.barcode.toLowerCase().includes(this.currentFilter) ||
                (product.description && product.description.toLowerCase().includes(this.currentFilter))
            );
        }
        this.renderProducts();
    }

    sortProducts() {
        this.filteredProducts.sort((a, b) => {
            let aValue = a[this.currentSort];
            let bValue = b[this.currentSort];

            // Handle different data types
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (typeof aValue === 'number') {
                return this.currentSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            if (aValue < bValue) {
                return this.currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        this.renderProducts();
    }

    updateStats() {
        const app = window.grocyApp;
        if (!app || !app.products) return;
        
        const totalProducts = app.products.length;
        const totalValue = app.products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
        const lowStock = app.products.filter(product => product.quantity <= app.settings.lowStockThreshold).length;

        const totalProductsEl = document.getElementById('total-products');
        const totalValueEl = document.getElementById('total-value');
        const lowStockEl = document.getElementById('low-stock');
        
        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalValueEl) totalValueEl.textContent = app.formatPrice(totalValue);
        if (lowStockEl) lowStockEl.textContent = lowStock;
    }

    renderProducts() {
        const productGrid = document.getElementById('product-grid');
        
        if (this.filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="empty-state">
                    <i data-feather="package" style="font-size: 48px; color: #ccc;"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your search terms or add some products to get started.</p>
                </div>
            `;
            feather.replace();
            return;
        }

        productGrid.innerHTML = this.filteredProducts.map(product => 
            this.createProductCard(product)
        ).join('');

        // Re-initialize feather icons
        feather.replace();
    }

    createProductCard(product) {
        const app = window.grocyApp;
        if (!app) return '';
        const isLowStock = product.quantity <= app.settings.lowStockThreshold;
        const stockStatus = isLowStock ? 'low-stock' : 'normal-stock';
        
        return `
            <div class="product-card ${stockStatus}" data-product-id="${product.id}">
                <div class="product-header">
                    <h3>${product.name}</h3>
                    <span class="product-category">${product.category}</span>
                </div>
                
                <div class="product-details">
                    ${product.barcode ? `<p><strong>Barcode:</strong> ${product.barcode}</p>` : ''}
                    <p><strong>Price:</strong> ${app.formatPrice(product.price)}</p>
                    <p><strong>Quantity:</strong> 
                        <span class="quantity-badge ${isLowStock ? 'low' : 'normal'}">
                            ${product.quantity}
                        </span>
                    </p>
                    ${product.description ? `<p><strong>Description:</strong> ${product.description}</p>` : ''}
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-sm btn-primary" onclick="inventoryManager.addToBill('${product.id}')">
                        <i data-feather="plus"></i>
                        Add to Bill
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="inventoryManager.editProduct('${product.id}')">
                        <i data-feather="edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="inventoryManager.deleteProduct('${product.id}')">
                        <i data-feather="trash-2"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    addToBill(productId) {
        const product = window.grocyApp ? window.grocyApp.products.find(p => p.id === productId) : null;
        if (product) {
            if (product.quantity > 0) {
                window.grocyApp.addToBill(product);
                window.grocyApp.showNotification(`Added ${product.name} to bill`, 'success');
                
                // Update quantity in inventory
                product.quantity--;
                window.grocyApp.saveProducts();
                this.refreshInventory();
            } else {
                window.grocyApp.showNotification('Product out of stock', 'warning');
            }
        }
    }

    editProduct(productId) {
        const product = window.grocyApp.products.find(p => p.id === productId);
        if (product) {
            // Switch to add product view and populate form
            window.grocyApp.switchView('add-product');
            this.populateEditForm(product);
        }
    }

    populateEditForm(product) {
        document.getElementById('product-barcode').value = product.barcode || '';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-quantity').value = product.quantity;
        document.getElementById('product-description').value = product.description || '';
        
        // Change form to edit mode
        const form = document.getElementById('add-product-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i data-feather="save"></i> Update Product';
        
        // Store the product ID for updating
        form.dataset.editId = product.id;
        
        // Update form header
        document.querySelector('.form-header h2').textContent = 'Edit Product';
        document.querySelector('.form-header p').textContent = 'Update product details below';
        
        feather.replace();
    }

    deleteProduct(productId) {
        const product = window.grocyApp.products.find(p => p.id === productId);
        if (product && confirm(`Are you sure you want to delete "${product.name}"?`)) {
            window.grocyApp.products = window.grocyApp.products.filter(p => p.id !== productId);
            window.grocyApp.saveProducts();
            this.refreshInventory();
            window.grocyApp.showNotification('Product deleted successfully', 'success');
        }
    }

    exportCSV() {
        if (window.grocyApp.products.length === 0) {
            window.grocyApp.showNotification('No products to export', 'warning');
            return;
        }

        const csvData = window.grocyApp.products.map(product => ({
            barcode: product.barcode || '',
            name: product.name,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            description: product.description || ''
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'add_products.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        window.grocyApp.showNotification('Products exported successfully', 'success');
    }

    importCSV(file) {
        if (!file) {
            window.grocyApp.showNotification('Please select a CSV file', 'error');
            return;
        }

        Papa.parse(file, {
            header: true,
            complete: (results) => {
                try {
                    const importedProducts = results.data.filter(row => 
                        row.name && row.category && row.price && row.quantity
                    ).map(row => ({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        barcode: row.barcode || '',
                        name: row.name.trim(),
                        category: row.category.trim(),
                        price: parseFloat(row.price),
                        quantity: parseInt(row.quantity),
                        description: row.description || '',
                        dateAdded: new Date().toISOString()
                    }));

                    if (importedProducts.length > 0) {
                        // Ask user whether to replace or append
                        const replace = confirm(`Import ${importedProducts.length} products. Click OK to replace existing products, or Cancel to add to existing products.`);
                        
                        if (replace) {
                            window.grocyApp.products = importedProducts;
                        } else {
                            window.grocyApp.products.push(...importedProducts);
                        }
                        
                        window.grocyApp.saveProducts();
                        this.refreshInventory();
                        window.grocyApp.showNotification(`${importedProducts.length} products imported successfully`, 'success');
                    } else {
                        window.grocyApp.showNotification('No valid products found in CSV file', 'error');
                    }
                } catch (error) {
                    console.error('CSV import error:', error);
                    window.grocyApp.showNotification('Error importing CSV file', 'error');
                }
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                window.grocyApp.showNotification('Error parsing CSV file', 'error');
            }
        });
    }

    // Bulk operations
    bulkDelete(productIds) {
        if (confirm(`Are you sure you want to delete ${productIds.length} products?`)) {
            window.grocyApp.products = window.grocyApp.products.filter(p => !productIds.includes(p.id));
            window.grocyApp.saveProducts();
            this.refreshInventory();
            window.grocyApp.showNotification(`${productIds.length} products deleted`, 'success');
        }
    }

    bulkUpdatePrice(productIds, newPrice) {
        productIds.forEach(id => {
            const product = window.grocyApp.products.find(p => p.id === id);
            if (product) {
                product.price = newPrice;
            }
        });
        window.grocyApp.saveProducts();
        this.refreshInventory();
        window.grocyApp.showNotification(`${productIds.length} products updated`, 'success');
    }

    // Advanced filtering
    filterByCategory(category) {
        this.filteredProducts = window.grocyApp.products.filter(product => 
            product.category === category
        );
        this.renderProducts();
    }

    filterByStock(stockLevel) {
        switch (stockLevel) {
            case 'low':
                this.filteredProducts = window.grocyApp.products.filter(product => 
                    product.quantity <= window.grocyApp.settings.lowStockThreshold
                );
                break;
            case 'out':
                this.filteredProducts = window.grocyApp.products.filter(product => 
                    product.quantity === 0
                );
                break;
            case 'normal':
                this.filteredProducts = window.grocyApp.products.filter(product => 
                    product.quantity > window.grocyApp.settings.lowStockThreshold
                );
                break;
            default:
                this.filteredProducts = [...window.grocyApp.products];
        }
        this.renderProducts();
    }

    // Search suggestions
    getSearchSuggestions(query) {
        const suggestions = new Set();
        const lowerQuery = query.toLowerCase();
        
        window.grocyApp.products.forEach(product => {
            if (product.name.toLowerCase().includes(lowerQuery)) {
                suggestions.add(product.name);
            }
            if (product.category.toLowerCase().includes(lowerQuery)) {
                suggestions.add(product.category);
            }
            if (product.barcode.toLowerCase().includes(lowerQuery)) {
                suggestions.add(product.barcode);
            }
        });
        
        return Array.from(suggestions).slice(0, 5);
    }
}

// Add inventory-specific styles
const inventoryStyles = document.createElement('style');
inventoryStyles.textContent = `
    .sort-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
        font-size: 14px;
    }

    .sort-container select {
        padding: 5px 10px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        background: white;
    }

    .product-card.low-stock {
        border-left: 4px solid var(--warning-color);
    }

    .product-card.normal-stock {
        border-left: 4px solid var(--success-color);
    }

    .product-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
    }

    .product-category {
        background: var(--light-color);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        color: var(--dark-color);
    }

    .quantity-badge {
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 12px;
    }

    .quantity-badge.low {
        background: var(--warning-color);
        color: white;
    }

    .quantity-badge.normal {
        background: var(--success-color);
        color: white;
    }

    .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }

    .empty-state i {
        display: block;
        margin: 0 auto 20px;
    }

    .empty-state h3 {
        margin-bottom: 10px;
        color: var(--dark-color);
    }

    .product-actions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
    }

    .product-actions .btn {
        flex: 1;
        min-width: 80px;
    }

    @media (max-width: 768px) {
        .sort-container {
            flex-direction: column;
            align-items: stretch;
        }
        
        .product-actions {
            flex-direction: column;
        }
        
        .product-header {
            flex-direction: column;
            gap: 5px;
        }
    }
`;
document.head.appendChild(inventoryStyles);

// Initialize inventory manager globally
let inventoryManager;
document.addEventListener('DOMContentLoaded', () => {
    inventoryManager = new InventoryManager();
});
