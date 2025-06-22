// CSV Manager for handling product data persistence
class CSVManager {
    constructor() {
        this.storageKey = 'groceryapp_products';
        this.csvHeaders = ['barcode', 'name', 'category', 'price', 'quantity', 'description', 'dateAdded', 'lastModified'];
    }

    // Load products from localStorage
    loadProducts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const products = JSON.parse(stored);
                return Array.isArray(products) ? products : [];
            }
        } catch (error) {
            console.error('Error loading products from localStorage:', error);
        }
        return [];
    }

    // Save products to localStorage
    saveProducts(products) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(products));
            return true;
        } catch (error) {
            console.error('Error saving products to localStorage:', error);
            return false;
        }
    }

    // Export products to CSV file
    exportCSV(products) {
        try {
            if (!products || products.length === 0) {
                throw new Error('No products to export');
            }

            // Prepare data for CSV
            const csvData = products.map(product => ({
                barcode: product.barcode || '',
                name: product.name || '',
                category: product.category || '',
                price: product.price || 0,
                quantity: product.quantity || 0,
                description: product.description || '',
                dateAdded: product.dateAdded || '',
                lastModified: product.lastModified || ''
            }));

            // Convert to CSV using Papa Parse
            const csv = Papa.unparse(csvData, {
                header: true,
                columns: this.csvHeaders
            });

            // Create and download file
            this.downloadCSV(csv, `grocery_inventory_${this.getCurrentDateString()}.csv`);
            
            return true;
        } catch (error) {
            console.error('Error exporting CSV:', error);
            throw error;
        }
    }

    // Import products from CSV file
    importCSV(file) {
        return new Promise((resolve, reject) => {
            try {
                if (!file) {
                    reject(new Error('No file provided'));
                    return;
                }

                if (!file.name.toLowerCase().endsWith('.csv')) {
                    reject(new Error('Please select a CSV file'));
                    return;
                }

                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (header) => {
                        // Normalize header names
                        return header.toLowerCase().trim();
                    },
                    complete: (results) => {
                        try {
                            if (results.errors.length > 0) {
                                console.warn('CSV parsing warnings:', results.errors);
                            }

                            const validProducts = this.validateAndProcessCSVData(results.data);
                            resolve(validProducts);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    error: (error) => {
                        reject(new Error(`CSV parsing error: ${error.message}`));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    // Validate and process CSV data
    validateAndProcessCSVData(rawData) {
        const validProducts = [];
        const errors = [];

        rawData.forEach((row, index) => {
            try {
                const product = this.validateCSVRow(row, index + 1);
                if (product) {
                    validProducts.push(product);
                }
            } catch (error) {
                errors.push(`Row ${index + 1}: ${error.message}`);
            }
        });

        if (errors.length > 0) {
            console.warn('CSV validation errors:', errors);
            // Don't throw error unless no valid products found
            if (validProducts.length === 0) {
                throw new Error(`No valid products found. Errors: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
            }
        }

        return validProducts;
    }

    // Validate individual CSV row
    validateCSVRow(row, rowNumber) {
        // Check for required fields
        if (!row.barcode || !row.name) {
            throw new Error('Missing required fields (barcode, name)');
        }

        // Clean and validate data
        const product = {
            barcode: String(row.barcode).trim(),
            name: String(row.name).trim(),
            category: String(row.category || 'Other').trim(),
            price: this.parseNumber(row.price, 0),
            quantity: this.parseInteger(row.quantity, 0),
            description: String(row.description || '').trim(),
            dateAdded: this.parseDate(row.dateadded) || new Date().toISOString(),
            lastModified: this.parseDate(row.lastmodified) || ''
        };

        // Validate barcode format (basic validation)
        if (product.barcode.length < 4) {
            throw new Error('Barcode too short');
        }

        // Validate name
        if (product.name.length < 1) {
            throw new Error('Product name is required');
        }

        // Validate price
        if (product.price < 0) {
            throw new Error('Price cannot be negative');
        }

        // Validate quantity
        if (product.quantity < 0) {
            throw new Error('Quantity cannot be negative');
        }

        return product;
    }

    // Helper method to parse numbers safely
    parseNumber(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    // Helper method to parse integers safely
    parseInteger(value, defaultValue = 0) {
        if (value === null || value === undefined || value === '') {
            return defaultValue;
        }
        
        const parsed = parseInt(value);
        return isNaN(parsed) ? defaultValue : parsed;
    }

    // Helper method to parse dates safely
    parseDate(value) {
        if (!value) return null;
        
        try {
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date.toISOString();
        } catch (error) {
            return null;
        }
    }

    // Download CSV file
    downloadCSV(csvContent, filename) {
        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } else {
                throw new Error('Browser does not support file downloads');
            }
        } catch (error) {
            console.error('Error downloading CSV:', error);
            throw error;
        }
    }

    // Get current date string for filename
    getCurrentDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}`;
    }

    // Clear all stored data (for development/testing)
    clearAllData() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    // Get storage statistics
    getStorageStats() {
        try {
            const products = this.loadProducts();
            const dataSize = new Blob([JSON.stringify(products)]).size;
            
            return {
                productCount: products.length,
                dataSizeBytes: dataSize,
                dataSizeKB: Math.round(dataSize / 1024 * 100) / 100,
                lastModified: products.length > 0 ? 
                    Math.max(...products.map(p => new Date(p.lastModified || p.dateAdded || 0).getTime())) : null
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                productCount: 0,
                dataSizeBytes: 0,
                dataSizeKB: 0,
                lastModified: null
            };
        }
    }

    // Backup products to a timestamped export
    createBackup() {
        try {
            const products = this.loadProducts();
            if (products.length > 0) {
                this.exportCSV(products);
                return true;
            } else {
                throw new Error('No products to backup');
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSVManager;
}
