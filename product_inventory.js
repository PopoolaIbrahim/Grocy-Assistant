// Product Inventory Manager Class
class InventoryManager {
    constructor() {
        this.filteredProducts = [];
        this.currentFilter = '';
        this.currentSort = 'name';
        this.currentSortDirection = 'asc'; // Initialize sort direction
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.fetchInventory(); // Load inventory on startup from the server endpoint
    }

    // Method to be called when the inventory view is activated
    handleViewActive() {
        console.log('Inventory view activated. Refreshing...');
        // Fetch and display the latest inventory data from the server
 this.fetchInventory(); // Use the new fetchInventory method
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

            this.updateSortDirectionIcon(); // Set initial icon

            // Event listeners for sorting
            document.getElementById('sort-select').addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortAndFilter();
            });

            document.getElementById('sort-direction').addEventListener('click', () => {
                this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
                this.updateSortDirectionIcon();
                this.sortAndFilter();
            });
        }
    }

    updateSortDirectionIcon() {
        const sortBtn = document.getElementById('sort-direction');
        const icon = sortBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', this.currentSortDirection === 'asc' ? 'arrow-up' : 'arrow-down');
            feather.replace();
        }
    }

    async fetchInventory() {
        try {
            const response = await fetch('/inventory'); // Fetch from the server endpoint
            if (!response.ok) {
                // If the server returns 404, it might mean inventory.csv doesn't exist yet
                if (response.status === 404) {
                    console.log('GET /inventory returned 404, likely no inventory yet.');
                    window.grocyApp.products = []; // Initialize with empty
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            } else {
                const inventoryData = await response.json();
                console.log("Fetched inventory data:", inventoryData);
                // Assign the fetched data to window.grocyApp.products
                window.grocyApp.products = inventoryData;
            }

            // Update stats and render products after fetching
            this.updateStats();
            this.renderProducts();
        } catch (error) {
            console.error('Error fetching inventory:', error);
            if (window.grocyApp) window.grocyApp.showNotification('Error loading inventory', 'error');
        }
    }

    refreshInventory() {
        this.sortAndFilter();
        this.updateStats();
        this.renderProducts();
    }

    sortAndFilter() {
        const app = window.grocyApp;
        if (!app || !app.products) {
            this.filteredProducts = [];
            return;
        }

        // 1. Filter
        let productsToRender = [...app.products];
        if (this.currentFilter && this.currentFilter !== '') {
            productsToRender = app.products.filter(product => 
                product.name.toLowerCase().includes(this.currentFilter) ||
                product.category.toLowerCase().includes(this.currentFilter) ||
                product.barcode.toLowerCase().includes(this.currentFilter) ||
                (product.description && product.description.toLowerCase().includes(this.currentFilter))
            );
        }

        // 2. Sort
        productsToRender.sort((a, b) => {
            let aValue = a[this.currentSort];
            let bValue = b[this.currentSort];

            // Handle different data types for sorting
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

             // Handle undefined/null values by treating them as less than other values
             if (aValue === undefined || aValue === null) return this.currentSortDirection === 'asc' ? -1 : 1;
             if (bValue === undefined || bValue === null) return this.currentSortDirection === 'asc' ? 1 : -1;


            if (aValue < bValue) {
                return this.currentSortDirection === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.currentSortDirection === 'asc' ? 1 : -1;
            }
            return 0; // values are equal
        });
        
        this.filteredProducts = productsToRender;
        this.renderProducts();
    }


    updateStats() {
        const app = window.grocyApp;
        if (!app || !app.products) return;
        
        const totalProducts = app.products.length;
        const totalValue = app.products.reduce((sum, product) => sum + (parseFloat(product.price) * parseInt(product.quantity)), 0);
        const lowStock = app.products.filter(product => parseInt(product.quantity) <= app.settings.lowStockThreshold).length;

        const totalProductsEl = document.getElementById('total-products');
        const totalValueEl = document.getElementById('total-value');
        const lowStockEl = document.getElementById('low-stock');
        
        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalValueEl) totalValueEl.textContent = app.formatPrice(totalValue);
        if (lowStockEl) lowStockEl.textContent = lowStock;
    }

    renderProducts() {
        const productGrid = document.getElementById('product-grid');
        
        if (!productGrid) return; // Ensure grid element exists

        if (this.filteredProducts.length === 0) {
            productGrid.innerHTML = `
                <div class="empty-state">
                    <i data-feather="package" style="font-size: 48px; color: #ccc;"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your search terms or add some products to get started.</p>
                </div>
            `;
        } else {
             productGrid.innerHTML = this.filteredProducts.map(product => 
                this.createProductCard(product)
            ).join('');
        }

        // Re-initialize feather icons
        feather.replace();
    }

    createProductCard(product) {
        const app = window.grocyApp;
        if (!app) return '';
        const quantity = parseInt(product.quantity);
        const isLowStock = quantity <= app.settings.lowStockThreshold;
        const stockStatus = isLowStock ? 'low-stock' : 'normal-stock';
        
        return `
            <div class="product-card ${stockStatus}" data-product-id="${product.id}">
                <div class="product-header">
                    <h3>${product.name}</h3>
                    <span class="product-category">${product.category}</span>
                </div>
                
                <div class="product-details">
                    ${product.barcode ? `<p><strong>Barcode:</strong> ${product.barcode}</p>` : ''}
                    <p><strong>Barcode:</strong> ${product.barcode || 'No Barcode'}</p>
                    <p><strong>Quantity:</strong> 
                        <span class="quantity-badge ${isLowStock ? 'low' : 'normal'}">
                            ${quantity}
                        </span>
                    </p>
                    ${product.description ? `<p><strong>Description:</strong> ${product.description}</p>` : ''}
                     ${product.dateAdded ? `<p><strong>Added:</strong> ${new Date(product.dateAdded).toLocaleDateString()}</p>` : ''}
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-sm btn-primary" onclick="productInventoryManager.addToBill('${product.id}')">
                        <i data-feather="plus"></i>
                        Add to Bill
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="productInventoryManager.editProduct('${product.id}')">
                        <i data-feather="edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="productInventoryManager.deleteProduct('${product.id}')">
                        <i data-feather="trash-2"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    addProduct(product) {
        if (window.grocyApp && window.grocyApp.products) {
            // Ensure product has a unique ID and dateAdded
            const newProduct = {
                id: product.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                barcode: product.barcode || '',
                name: product.name ? product.name.trim() : 'Unnamed Product',
                category: product.category ? product.category.trim() : 'Uncategorized',
                price: parseFloat(product.price),
                quantity: parseInt(product.quantity),
                description: product.description || '',
                dateAdded: product.dateAdded || new Date().toISOString() // Add date added
            };

            // Check if editing an existing product
            if (product.id) {
                 const index = window.grocyApp.products.findIndex(p => p.id === product.id);
                 if (index !== -1) {
                     window.grocyApp.products[index] = newProduct; // Replace existing product
                     window.grocyApp.showNotification(`Updated ${newProduct.name}`, 'success');
                 } else {
                      // Should not happen if editProduct is called correctly
                      window.grocyApp.showNotification('Error updating product', 'error');
                      return;
                 }
            } else {
                 // Add new product
                window.grocyApp.products.push(newProduct);
                window.grocyApp.showNotification(`Added ${newProduct.name} to inventory`, 'success');
            }
            
            this.refreshInventory();
        }
    }


    addToBill(productId) {
        const product = window.grocyApp ? window.grocyApp.products.find(p => p.id === productId) : null;
        if (product) {
            if (product.quantity > 0) {
                window.grocyApp.addToBill(product);
                window.grocyApp.showNotification(`Added ${product.name} to bill`, 'success');
                
                // Update quantity in inventory
                product.quantity--;
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
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-feather="save"></i> Update Product';
        }
        
        // Store the product ID for updating
        form.dataset.editId = product.id;
        
        // Update form header
        const formHeader = document.querySelector('.form-header h2');
        const formSubHeader = document.querySelector('.form-header p');
        if (formHeader) formHeader.textContent = 'Edit Product';
        if (formSubHeader) formSubHeader.textContent = 'Update product details below';
        
        feather.replace();
    }

    deleteProduct(productId) {
        const product = window.grocyApp.products.find(p => p.id === productId);
        if (product && confirm(`Are you sure you want to delete "${product.name}"?`)) {
            window.grocyApp.products = window.grocyApp.products.filter(p => p.id !== productId);
            this.refreshInventory();
            window.grocyApp.showNotification('Product deleted successfully', 'success');
        }
    }

    exportCSV() {
        if (!window.grocyApp || !window.grocyApp.products || window.grocyApp.products.length === 0) {
            if (window.grocyApp) window.grocyApp.showNotification('No products to export', 'warning');
            return;
        }

        const csvData = window.grocyApp.products.map(product => ({
            id: product.id,
            barcode: product.barcode || '',
            name: product.name,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            description: product.description || '',
            dateAdded: product.dateAdded || ''
        }));

        const csv = Papa.unparse(csvData, {
            header: true,
            quotes: true // Ensure all fields are quoted
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'inventory_export.csv'); // Changed export filename
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        if (window.grocyApp) window.grocyApp.showNotification('Products exported successfully', 'success');
    }

    // Save the current inventory to a CSV file on the server
    async saveInventoryToCSV(filePath) {
        if (!window.grocyApp || !window.grocyApp.products) return;

        const csvData = window.grocyApp.products.map(product => ({
            id: product.id, // Include ID for tracking
            barcode: product.barcode || '',
            name: product.name,
            category: product.category,
            price: product.price,
            quantity: product.quantity,
            description: product.description || '',
            dateAdded: product.dateAdded || new Date().toISOString() // Preserve original date if exists
        }));


        const csvContent = Papa.unparse(csvData, {
            header: true,
            quotes: true // Ensure all fields are quoted
        });

        try {
            const response = await fetch('/save-inventory', { // Assuming a server endpoint /save-inventory
                method: 'POST',
                headers: {
                    'Content-Type': 'text/csv'
                },
                body: csvContent
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.text();
            console.log('Inventory saved to CSV:', result);
            // window.grocyApp.showNotification('Inventory saved successfully', 'success'); // Optional notification on save
        } catch (error) {
            console.error('Error saving inventory to CSV:', error);
            if (window.grocyApp) window.grocyApp.showNotification('Error saving inventory', 'error');
        }
    }


    importCSV(file) {
        if (!file) {
            if (window.grocyApp) window.grocyApp.showNotification('Please select a CSV file', 'error');
            return;
        }

        Papa.parse(file, {
            header: true,
            complete: (results) => {
                console.log("Parsed CSV results for import:", results);
                try {
                    const importedProducts = results.data.filter(row => 
                        row.name && row.category && row.price !== undefined && row.quantity !== undefined // Ensure essential fields are present
                    ).map(row => ({
                        id: row.id || Date.now().toString() + Math.random().toString(36).substr(2, 9), // Use existing ID or create new
                        barcode: row.barcode || '',
                        name: row.name.trim(),
                        category: row.category ? row.category.trim() : 'Uncategorized',
                        price: parseFloat(row.price),
                        quantity: parseInt(row.quantity),
                        description: row.description || '',
                        dateAdded: row.dateAdded || new Date().toISOString() // Use date from CSV or current date
                    }));

                    if (importedProducts.length > 0) {
                        // Ask user whether to replace or append
                        const replace = confirm(`Import ${importedProducts.length} products. Click OK to replace existing products, or Cancel to add to existing products.`);
                        
                        if (replace) {
                            window.grocyApp.products = importedProducts;
                        } else {
                            window.grocyApp.products.push(...importedProducts);
                        }
                        
                        this.saveInventoryToCSV('/inventory.csv'); // Save imported products to CSV
                        this.refreshInventory();
                        if (window.grocyApp) window.grocyApp.showNotification(`${importedProducts.length} products imported successfully`, 'success');
                    } else {
                        if (window.grocyApp) window.grocyApp.showNotification('No valid products found in CSV file', 'error');
                    }
                } catch (error) {
                    console.error('CSV import error:', error);
                    if (window.grocyApp) window.grocyApp.showNotification('Error importing CSV file', 'error');
                }
            },
            error: (error) => {
                console.error('CSV parsing error during import:', error);
                if (window.grocyApp) window.grocyApp.showNotification('Error parsing CSV file', 'error');
            }
        });
    }

    // Bulk operations
    bulkDelete(productIds) {
        if (confirm(`Are you sure you want to delete ${productIds.length} products?`)) {
            window.grocyApp.products = window.grocyApp.products.filter(p => !productIds.includes(p.id));
            this.saveInventoryToCSV('/inventory.csv'); // Save changes to CSV
            this.refreshInventory();
            if (window.grocyApp) window.grocyApp.showNotification(`${productIds.length} products deleted`, 'success');
        }
    }

    bulkUpdatePrice(productIds, newPrice) {
        productIds.forEach(id => {
            const product = window.grocyApp.products.find(p => p.id === id);
            if (product) {
                product.price = parseFloat(newPrice);
            }
        });
        this.saveInventoryToCSV('/inventory.csv'); // Save changes to CSV
        if (window.grocyApp) window.grocyApp.showNotification(`${productIds.length} products updated`, 'success');
    }

    // Advanced filtering
    filterByCategory(category) {
        if (!window.grocyApp || !window.grocyApp.products) return;
         if (category === 'all') {
            this.currentFilter = ''; // Clear category filter if "all" is selected
        } else {
            // Combine text filter with category filter if text filter is active
            const tempProducts = this.currentFilter 
                ? window.grocyApp.products.filter(product => 
                    product.name.toLowerCase().includes(this.currentFilter) ||
                    product.category.toLowerCase().includes(this.currentFilter) ||
                    product.barcode.toLowerCase().includes(this.currentFilter) ||
                    (product.description && product.description.toLowerCase().includes(this.currentFilter))
                )
                : [...window.grocyApp.products];

            this.filteredProducts = tempProducts.filter(product => 
                product.category === category
            );
        }
        this.sortAndFilter(); // Re-apply sort and general filter if active
        this.renderProducts();
    }

    filterByStock(stockLevel) {
        if (!window.grocyApp || !window.grocyApp.products) return;

         // Apply stock filter after the current general filter has been applied
         let productsToFilter = this.filteredProducts;

        switch (stockLevel) {
            case 'low':
                this.filteredProducts = productsToFilter.filter(product => 
                    parseInt(product.quantity) <= window.grocyApp.settings.lowStockThreshold && parseInt(product.quantity) > 0
                );
                break;
            case 'out':
                this.filteredProducts = productsToFilter.filter(product => 
                    parseInt(product.quantity) === 0
                );
                break;
            case 'normal':
                this.filteredProducts = productsToFilter.filter(product => 
                    parseInt(product.quantity) > window.grocyApp.settings.lowStockThreshold
                );
                break;
            default:
                // Re-apply only the current general filter
                this.sortAndFilter();
                return; // Exit after re-applying
        }
        this.renderProducts(); // Render the results of the stock filter
    }

    // Search suggestions
    getSearchSuggestions(query) {
        if (!window.grocyApp || !window.grocyApp.products) return [];
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
const productInventoryStyles = document.createElement('style');
productInventoryStyles.textContent = `
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
document.head.appendChild(productInventoryStyles);

// Initialize inventory manager globally
document.addEventListener('DOMContentLoaded', () => {
    inventoryManager = new InventoryManager();
});
