
const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get inventory from CSV
app.get('/inventory', (req, res) => {
    const inventoryPath = path.join(__dirname, 'inventory.csv');
    
    if (!fs.existsSync(inventoryPath)) {
        return res.json([]);
    }
    
    const products = [];
    fs.createReadStream(inventoryPath)
        .pipe(csv())
        .on('data', (row) => {
            if (row.name && row.name.trim()) {
                products.push({
                    id: row.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    barcode: row.barcode || '',
                    name: row.name.trim(),
                    category: row.category || 'Uncategorized',
                    price: parseFloat(row.price) || 0,
                    quantity: parseInt(row.quantity) || 0,
                    description: row.description || '',
                    dateAdded: row.dateAdded || new Date().toISOString()
                });
            }
        })
        .on('end', () => {
            res.json(products);
        })
        .on('error', (error) => {
            console.error('Error reading inventory:', error);
            res.status(500).json({ error: 'Failed to read inventory' });
        });
});

// Search for product by barcode or name
app.post('/search-product', (req, res) => {
    const { barcode, searchTerm } = req.body;
    const inventoryPath = path.join(__dirname, 'inventory.csv');
    
    if (!fs.existsSync(inventoryPath)) {
        return res.json({ product: null });
    }
    
    const products = [];
    fs.createReadStream(inventoryPath)
        .pipe(csv())
        .on('data', (row) => {
            if (row.name && row.name.trim()) {
                products.push({
                    id: row.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    barcode: row.barcode || '',
                    name: row.name.trim(),
                    category: row.category || 'Uncategorized',
                    price: parseFloat(row.price) || 0,
                    quantity: parseInt(row.quantity) || 0,
                    description: row.description || '',
                    dateAdded: row.dateAdded || new Date().toISOString()
                });
            }
        })
        .on('end', () => {
            let foundProduct = null;
            
            if (barcode) {
                foundProduct = products.find(p => p.barcode === barcode);
            } else if (searchTerm) {
                foundProduct = products.find(p => 
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.barcode === searchTerm
                );
            }
            
            res.json({ product: foundProduct });
        })
        .on('error', (error) => {
            console.error('Error searching product:', error);
            res.status(500).json({ error: 'Failed to search product' });
        });
});

// Add single product to inventory
app.post('/add-product', async (req, res) => {
    try {
        const productData = req.body;
        const inventoryPath = path.join(__dirname, 'inventory.csv');
        
        // Read current inventory
        const products = [];
        if (fs.existsSync(inventoryPath)) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(inventoryPath)
                    .pipe(csv())
                    .on('data', (row) => {
                        if (row.name && row.name.trim()) {
                            products.push({
                                id: row.id,
                                barcode: row.barcode || '',
                                name: row.name.trim(),
                                category: row.category || 'Uncategorized',
                                price: parseFloat(row.price) || 0,
                                quantity: parseInt(row.quantity) || 0,
                                description: row.description || '',
                                dateAdded: row.dateAdded || new Date().toISOString()
                            });
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        }
        
        // Check if this is an update or new product
        const existingIndex = products.findIndex(p => p.id === productData.id);
        
        if (existingIndex !== -1) {
            // Update existing product
            products[existingIndex] = productData;
        } else {
            // Add new product
            products.push(productData);
        }
        
        // Write updated inventory
        const csvWriter = createCsvWriter({
            path: inventoryPath,
            header: [
                { id: 'id', title: 'id' },
                { id: 'barcode', title: 'barcode' },
                { id: 'name', title: 'name' },
                { id: 'category', title: 'category' },
                { id: 'price', title: 'price' },
                { id: 'quantity', title: 'quantity' },
                { id: 'description', title: 'description' },
                { id: 'dateAdded', title: 'dateAdded' }
            ]
        });
        
        await csvWriter.writeRecords(products);
        res.json({ message: existingIndex !== -1 ? 'Product updated successfully' : 'Product added successfully' });
        
    } catch (error) {
        console.error('Error adding/updating product:', error);
        res.status(500).json({ error: 'Failed to add/update product' });
    }
});

// Save inventory to CSV
app.post('/save-inventory', (req, res) => {
    const inventoryPath = path.join(__dirname, 'inventory.csv');
    const csvContent = req.body;
    
    fs.writeFile(inventoryPath, csvContent, (err) => {
        if (err) {
            console.error('Error saving inventory:', err);
            res.status(500).json({ error: 'Failed to save inventory' });
        } else {
            res.json({ message: 'Inventory saved successfully' });
        }
    });
});

// Process sale - update inventory and add to sales
app.post('/process-sale', async (req, res) => {
    try {
        const { items, total, saleDate } = req.body;
        const inventoryPath = path.join(__dirname, 'inventory.csv');
        const salesPath = path.join(__dirname, 'sales.csv');
        
        // Read current inventory
        const products = [];
        if (fs.existsSync(inventoryPath)) {
            await new Promise((resolve, reject) => {
                fs.createReadStream(inventoryPath)
                    .pipe(csv())
                    .on('data', (row) => {
                        if (row.name && row.name.trim()) {
                            products.push({
                                id: row.id,
                                barcode: row.barcode || '',
                                name: row.name.trim(),
                                category: row.category || 'Uncategorized',
                                price: parseFloat(row.price) || 0,
                                quantity: parseInt(row.quantity) || 0,
                                description: row.description || '',
                                dateAdded: row.dateAdded || new Date().toISOString()
                            });
                        }
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        }
        
        // Update inventory quantities
        items.forEach(saleItem => {
            const product = products.find(p => p.id === saleItem.id);
            if (product) {
                product.quantity = Math.max(0, product.quantity - saleItem.quantity);
            }
        });
        
        // Write updated inventory
        const inventoryCsvWriter = createCsvWriter({
            path: inventoryPath,
            header: [
                { id: 'id', title: 'id' },
                { id: 'barcode', title: 'barcode' },
                { id: 'name', title: 'name' },
                { id: 'category', title: 'category' },
                { id: 'price', title: 'price' },
                { id: 'quantity', title: 'quantity' },
                { id: 'description', title: 'description' },
                { id: 'dateAdded', title: 'dateAdded' }
            ]
        });
        
        await inventoryCsvWriter.writeRecords(products);
        
        // Add to sales CSV
        const saleId = Date.now().toString();
        const salesData = items.map(item => ({
            saleId: saleId,
            productId: item.id,
            quantitySold: item.quantity,
            saleDate: saleDate,
            totalPrice: item.price * item.quantity,
            id: item.id,
            barcode: item.barcode || '',
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            description: item.description || ''
        }));
        
        const salesCsvWriter = createCsvWriter({
            path: salesPath,
            header: [
                { id: 'saleId', title: 'saleId' },
                { id: 'productId', title: 'productId' },
                { id: 'quantitySold', title: 'quantitySold' },
                { id: 'saleDate', title: 'saleDate' },
                { id: 'totalPrice', title: 'totalPrice' },
                { id: 'id', title: 'id' },
                { id: 'barcode', title: 'barcode' },
                { id: 'name', title: 'name' },
                { id: 'category', title: 'category' },
                { id: 'price', title: 'price' },
                { id: 'quantity', title: 'quantity' },
                { id: 'description', title: 'description' }
            ],
            append: fs.existsSync(salesPath)
        });
        
        await salesCsvWriter.writeRecords(salesData);
        
        res.json({ message: 'Sale processed successfully' });
    } catch (error) {
        console.error('Error processing sale:', error);
        res.status(500).json({ error: 'Failed to process sale' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
