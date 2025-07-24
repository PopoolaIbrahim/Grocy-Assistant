const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const multer = require('multer');

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, '/')));
app.use(express.json());
app.use(express.text({ type: 'text/csv' })); // Enable raw text body parsing for CSV

// GET /inventory: Read inventory.csv and return as JSON
app.get('/inventory', (req, res) => {
  const results = [];
  fs.createReadStream(path.join(__dirname, 'inventory.csv'))
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      res.json(results);
    })
    .on('error', (err) => {
      console.error('Error reading inventory.csv:', err);
      // If file does not exist, return empty array instead of 500 error
      if (err.code === 'ENOENT') {
        res.status(404).json([]); // Return empty array if file not found
      } else {
        res.status(500).send('Error reading inventory data');
      }
    });
});

// POST /inventory: Add a new product to inventory.csv (for single product add)
app.post('/inventory', (req, res) => {
  const newProduct = req.body;

  if (!newProduct || !newProduct.id || !newProduct.barcode || !newProduct.name || !newProduct.category || !newProduct.price || !newProduct.quantity || !newProduct.description || !newProduct.dateAdded) {
    return res.status(400).send('Missing required product data');
  }

  const csvWriter = createCsvWriter({
    path: path.join(__dirname, 'inventory.csv'),
    header: [
      { id: 'id', title: 'id' }, { id: 'barcode', title: 'barcode' }, { id: 'name', title: 'name' }, { id: 'category', title: 'category' }, { id: 'price', title: 'price' }, { id: 'quantity', title: 'quantity' }, { id: 'description', title: 'description' }, { id: 'dateAdded', title: 'dateAdded' }
    ],
    append: true
  });

  csvWriter.writeRecords([newProduct])
    .then(() => res.status(201).send('Product added successfully'))
    .catch((err) => {
      console.error('Error writing to inventory.csv:', err);
      res.status(500).send('Error adding product');
    });
});

// POST /save-inventory: Save the entire inventory to inventory.csv
app.post('/save-inventory', (req, res) => {
  const csvContent = req.body; // Raw CSV content

  if (!csvContent) {
    return res.status(400).send('No CSV content provided');
  }

  fs.writeFile(path.join(__dirname, 'inventory.csv'), csvContent, 'utf8', (err) => {
    if (err) {
      console.error('Error writing inventory.csv:', err);
      return res.status(500).send('Error saving inventory data');
    }
    res.status(200).send('Inventory saved successfully');
  });
});

// Configure multer for file uploads
const upload = multer({ dest: '/tmp/csvuploads/' });

// POST /inventory/import: Import data from a CSV file
app.post('/inventory/import', upload.single('csvFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const csvWriter = createCsvWriter({
        path: path.join(__dirname, 'inventory.csv'),
        header: Object.keys(results[0]).map(key => ({ id: key, title: key }))
      });

      csvWriter.writeRecords(results)
        .then(() => res.status(200).send('Inventory imported successfully.'))
        .catch((err) => {
          console.error('Error writing imported data to inventory.csv:', err);
          res.status(500).send('Error importing inventory data.');
        });
    })
    .on('error', (err) => {
      console.error('Error reading uploaded CSV file:', err);
      res.status(500).send('Error processing uploaded file.');
    });
});

// PUT /inventory/:id: Update a product by ID
app.put('/inventory/:id', (req, res) => {
  const salesData = req.body.salesData;
  const productId = req.params.id;
  const updatedProductData = req.body;

  const inventoryPath = path.join(__dirname, 'inventory.csv');
  const results = [];
  fs.createReadStream(inventoryPath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const productIndex = results.findIndex(product => product.id === productId);

      if (productIndex === -1) {
        return res.status(404).send('Product not found.');
      }

      if (salesData) {
        const saleId = generateUniqueId();
        const saleDate = new Date().toISOString();

        const salesRecord = {
          saleId: saleId,
          productId: productId,
          quantitySold: salesData.quantitySold,
          saleDate: saleDate,
          totalPrice: salesData.totalPrice,
          id: results[productIndex].id,
          barcode: results[productIndex].barcode,
          name: results[productIndex].name,
          category: results[productIndex].category,
          price: results[productIndex].price,
          quantity: results[productIndex].quantity,
          description: results[productIndex].description,
        };
        appendSalesRecord(salesRecord);
      }

      results[productIndex] = { ...results[productIndex], ...updatedProductData };

      const csvWriter = createCsvWriter({
        path: inventoryPath,
        header: Object.keys(results[0]).map(key => ({ id: key, title: key })),
      });

      csvWriter.writeRecords(results)
        .then(() => res.status(200).send('Product updated successfully.'))
        .catch((err) => {
          console.error('Error writing updated data to inventory.csv:', err);
          res.status(500).send('Error updating product data.');
        });
    });
});

function appendSalesRecord(record) {
  const salesPath = path.join(__dirname, 'sales.csv');
  const csvWriter = createCsvWriter({
    path: salesPath,
    header: [
      { id: 'saleId', title: 'saleId' }, { id: 'productId', title: 'productId' }, { id: 'quantitySold', title: 'quantitySold' }, { id: 'saleDate', title: 'saleDate' }, { id: 'totalPrice', title: 'totalPrice' }, { id: 'id', title: 'id' }, { id: 'barcode', title: 'barcode' }, { id: 'name', title: 'name' }, { id: 'category', title: 'category' }, { id: 'price', title: 'price' }, { id: 'quantity', title: 'quantity' }, { id: 'description', title: 'description' }
    ],
    append: true
  });

  csvWriter.writeRecords([record])
    .catch((err) => {
      console.error('Error writing to sales.csv:', err);
    });
}

function generateUniqueId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
