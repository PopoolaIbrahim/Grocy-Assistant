// Chat Assistant Class
class ChatAssistant {
    constructor() {
        this.chatHistory = [];
        this.isTyping = false;
        this.knowledgeBase = this.buildKnowledgeBase();

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        console.log('Chat Assistant initialized');
    }

    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message');

        // Send message on button click
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Send message on Enter key
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize chat input
        chatInput.addEventListener('input', () => {
            this.autoResizeInput(chatInput);
        });
    }

    autoResizeInput(input) {
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
    }

    sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Process and respond
        this.processMessage(message);
    }

    addMessage(content, sender = 'grocy') {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (sender === 'grocy') {
            avatar.innerHTML = '<img src="grocy-icon.png" alt="Grocy">';
        } else {
            avatar.textContent = 'U';
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.formatMessage(content);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Save to history
        this.chatHistory.push({
            content,
            sender,
            timestamp: new Date().toISOString()
        });
        this.saveChatHistory();
    }

    formatMessage(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    processMessage(message) {
        this.isTyping = true;
        this.showTypingIndicator();

        // Simulate processing delay
        setTimeout(() => {
            const response = this.generateResponse(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'grocy');
            this.isTyping = false;
        }, 1000 + Math.random() * 2000);
    }

    generateResponse(message) {
        const lowerMessage = message.toLowerCase();

        // Check for specific keywords and generate appropriate responses
        if (this.containsKeywords(lowerMessage, ['hello', 'hi', 'hey', 'greetings'])) {
            return this.getRandomResponse([
                "Hello! I'm Grocy, your AI grocery assistant. How can I help you today?",
                "Hi there! Ready to manage your grocery store efficiently?",
                "Hey! I'm here to help you with your grocery store management needs."
            ]);
        }

        if (this.containsKeywords(lowerMessage, ['help', 'what can you do', 'features'])) {
            return `I can help you with many things! Here are my key features:

**📱 Barcode Scanning**: Scan products to add them to your inventory or bill
**📦 Inventory Management**: Track stock levels, add/edit products, and get low stock alerts
**🧾 Billing**: Create bills, add products, and print receipts
**📊 Analytics**: View sales stats and inventory insights
**📁 Data Management**: Import/export CSV files, backup your data

What would you like to know more about?`;
        }

        if (this.containsKeywords(lowerMessage, ['scan', 'barcode', 'camera'])) {
            return `To scan barcodes:

1. **Go to Scanner tab** - Click the scanner icon in the sidebar
2. **Start scanning** - Click "Start Scanner" button
3. **Point camera** - Aim your camera at the barcode
4. **Auto-detection** - The app will automatically detect and process the barcode

**Tips:**
- Ensure good lighting for better scanning
- Hold steady and keep the barcode centered
- Use the back camera for better results
- You can also drag and drop barcode images!`;
        }

        if (this.containsKeywords(lowerMessage, ['add product', 'new product', 'inventory'])) {
            return `To add new products:

1. **Go to Add Product tab** - Click the plus icon in the sidebar
2. **Fill in details**:
   - Product name (required)
   - Category (required)
   - Price (required)
   - Quantity (required)
   - Barcode (optional - you can scan it!)
   - Description (optional)

3. **Save** - Click "Add Product" to save to your inventory

**Pro tip**: Use the scan button next to barcode field to quickly scan product barcodes!`;
        }

        if (this.containsKeywords(lowerMessage, ['bill', 'checkout', 'receipt'])) {
            return `Managing bills and checkout:

**Adding to Bill:**
- Scan products to automatically add them
- Or click "Add to Bill" from inventory
- View current bill in the Scanner tab

**Checkout Process:**
1. Review items in current bill
2. Check total amount
3. Click "Print Receipt" to generate receipt
4. Click "Reset Scan" to start fresh

**Receipt includes:**
- Store name and timestamp
- Itemized list with quantities
- Total amount
- Thank you message`;
        }

        if (this.containsKeywords(lowerMessage, ['stock', 'low stock', 'inventory levels'])) {
            const lowStockProducts = window.grocyApp.products.filter(p => p.quantity <= window.grocyApp.settings.lowStockThreshold);
            const totalProducts = window.grocyApp.products.length;
            const totalValue = window.grocyApp.products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

            let response = `**📊 Current Inventory Status:**

**Total Products:** ${totalProducts}
**Total Value:** ${window.grocyApp.formatPrice(totalValue)}
**Low Stock Items:** ${lowStockProducts.length}

`;

            if (lowStockProducts.length > 0) {
                response += `**⚠️ Low Stock Alert:**\n`;
                lowStockProducts.slice(0, 5).forEach(product => {
                    response += `• ${product.name} - Only ${product.quantity} left\n`;
                });
                if (lowStockProducts.length > 5) {
                    response += `• And ${lowStockProducts.length - 5} more items...\n`;
                }
                response += `\n**Recommendation:** Restock these items soon!`;
            } else {
                response += `✅ **All items are well-stocked!**`;
            }

            return response;
        }

        if (this.containsKeywords(lowerMessage, ['csv', 'import', 'export', 'backup'])) {
            return `**📁 Data Management Options:**

**CSV Export:**
- Go to Inventory tab
- Click "Export CSV" to download current inventory
- File saved as "add_products.csv"

**CSV Import:**
- Click "Import CSV" in Inventory tab
- Select your CSV file
- Choose to replace or append to existing data

**Backup & Restore:**
- Go to Settings tab
- Use "Backup Data" to save complete data
- Use "Restore Data" to load saved backup
- Use "Clear All Data" to reset everything

**CSV Format:**
barcode, name, category, price, quantity, description`;
        }

        if (this.containsKeywords(lowerMessage, ['price', 'pricing', 'cost'])) {
            return `**💰 Pricing Management:**

**Setting Prices:**
- Add price when creating new products
- Edit prices by clicking "Edit" on product cards
- Prices support decimal values (e.g., 12.99)

**Currency Settings:**
- Go to Settings tab
- Choose from USD ($), EUR (€), or GBP (£)
- All prices will display in selected currency

**Pricing Tips:**
- Use consistent pricing strategy
- Consider competitor pricing
- Update prices regularly
- Track price changes over time`;
        }

        if (this.containsKeywords(lowerMessage, ['categories', 'category', 'organize'])) {
            return `**📂 Product Categories:**

Available categories include:
• Fruits & Vegetables
• Dairy & Eggs
• Meat & Seafood
• Bakery
• Beverages
• Snacks
• Frozen Foods
• Pantry
• Personal Care
• Household
• And many more!

**Organization Tips:**
- Use specific categories for easier searching
- Group similar items together
- Filter inventory by category
- Maintain consistent categorization`;
        }

        if (this.containsKeywords(lowerMessage, ['settings', 'configure', 'preferences'])) {
            return `**⚙️ Settings & Configuration:**

**General Settings:**
- Currency selection (USD, EUR, GBP)
- Low stock threshold (default: 10)

**Scanner Settings:**
- Auto-add scanned products to bill
- Play sound on successful scan

**Data Management:**
- Backup your data regularly
- Restore from previous backups
- Clear all data (use with caution!)

**Pro Tips:**
- Set appropriate low stock threshold
- Enable scan sounds for better feedback
- Regular backups prevent data loss`;
        }

        // Check for product-specific questions
        if (this.containsKeywords(lowerMessage, ['find', 'search', 'product'])) {
            return `**🔍 Finding Products:**

**Search Methods:**
- Use search bar in Inventory tab
- Search by product name, category, or barcode
- Filter by stock levels (low, normal, out)
- Sort by name, price, quantity, or date

**Quick Access:**
- Recently scanned products shown in Scanner tab
- Low stock items highlighted in red
- Use barcode scanner to quickly find specific items

**Search Tips:**
- Use partial names for broader results
- Try category names for group searches
- Clear search to see all products`;
        }

        // Analyze message for business insights
        if (this.containsKeywords(lowerMessage, ['sales', 'analytics', 'insights', 'report'])) {
            return this.generateBusinessInsight();
        }

        // Default response with helpful suggestions
        return this.getRandomResponse([
            "I'm here to help with your grocery store management! Try asking about:\n\n• Barcode scanning\n• Adding products\n• Managing inventory\n• Creating bills\n• Importing/exporting data\n• Settings and preferences\n\nWhat would you like to know?",
            "I can assist you with many grocery store tasks! Some things I can help with:\n\n• How to scan barcodes\n• Managing your product inventory\n• Processing sales and receipts\n• Data backup and imports\n• Store analytics and insights\n\nWhat specific help do you need?",
            "As your grocery store assistant, I can help you with:\n\n• **Scanning** - Barcode scanning and product lookup\n• **Inventory** - Stock management and organization\n• **Sales** - Bill creation and checkout process\n• **Data** - CSV imports, exports, and backups\n• **Analytics** - Store insights and reports\n\nWhat would you like to learn about?"
        ]);
    }

    containsKeywords(message, keywords) {
        return keywords.some(keyword => message.includes(keyword));
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    generateBusinessInsight() {
        const products = window.grocyApp.products;
        if (products.length === 0) {
            return "No products in inventory yet. Add some products to get business insights!";
        }

        const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / products.length;
        const categories = [...new Set(products.map(p => p.category))];
        const mostStockedCategory = this.getMostStockedCategory(products);
        const lowStockCount = products.filter(p => p.quantity <= window.grocyApp.settings.lowStockThreshold).length;

        return `**📊 Business Insights:**

**Inventory Overview:**
• Total Products: ${products.length}
• Total Inventory Value: ${window.grocyApp.formatPrice(totalValue)}
• Average Product Price: ${window.grocyApp.formatPrice(avgPrice)}
• Categories: ${categories.length}

**Category Analysis:**
• Most Stocked Category: ${mostStockedCategory}
• Category Distribution: ${categories.join(', ')}

**Stock Status:**
• Low Stock Items: ${lowStockCount}
• Stock Health: ${lowStockCount === 0 ? 'Excellent' : lowStockCount < 5 ? 'Good' : 'Needs Attention'}

**Recommendations:**
${this.getBusinessRecommendations(products, lowStockCount)}`;
    }

    getMostStockedCategory(products) {
        const categoryTotals = products.reduce((acc, product) => {
            acc[product.category] = (acc[product.category] || 0) + product.quantity;
            return acc;
        }, {});

        return Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    }

    getBusinessRecommendations(products, lowStockCount) {
        const recommendations = [];

        if (lowStockCount > 0) {
            recommendations.push('• Restock low inventory items');
        }

        if (products.length < 10) {
            recommendations.push('• Consider expanding product range');
        }

        const avgQuantity = products.reduce((sum, p) => sum + p.quantity, 0) / products.length;
        if (avgQuantity < 5) {
            recommendations.push('• Consider increasing minimum stock levels');
        }

        recommendations.push('• Regular inventory audits recommended');
        recommendations.push('• Monitor sales patterns for optimization');

        return recommendations.join('\n');
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message grocy-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <img src="grocy-icon.png" alt="Grocy">
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    buildKnowledgeBase() {
        return {
            features: [
                'Barcode scanning with camera',
                'Product inventory management',
                'CSV import and export',
                'Bill creation and receipt printing',
                'Low stock alerts',
                'Product categorization',
                'Data backup and restore',
                'Mobile-responsive design'
            ],
            categories: [
                'Fruits & Vegetables', 'Dairy & Eggs', 'Meat & Seafood',
                'Bakery', 'Beverages', 'Snacks', 'Frozen Foods',
                'Pantry', 'Personal Care', 'Household', 'Cleaning Supplies'
            ],
            currencies: ['USD', 'EUR', 'GBP']
        };
    }

    focusInput() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.focus();
        }
    }

    saveChatHistory() {
        localStorage.setItem('grocy-chat-history', JSON.stringify(this.chatHistory));
    }

    loadChatHistory() {
        const stored = localStorage.getItem('grocy-chat-history');
        if (stored) {
            this.chatHistory = JSON.parse(stored);
            this.restoreChatMessages();
        }
    }

    restoreChatMessages() {
        const chatMessages = document.getElementById('chat-messages');

        // Clear existing messages except welcome message
        const welcomeMessage = chatMessages.querySelector('.grocy-message');
        chatMessages.innerHTML = '';
        if (welcomeMessage) {
            chatMessages.appendChild(welcomeMessage);
        }

        // Restore chat history
        this.chatHistory.forEach(message => {
            this.addMessageToDOM(message.content, message.sender, false);
        });
    }

    addMessageToDOM(content, sender, saveToHistory = true) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (sender === 'grocy') {
            avatar.innerHTML = '<img src="grocy-icon.png" alt="Grocy">';
        } else {
            avatar.textContent = 'U';
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = this.formatMessage(content);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (saveToHistory) {
            this.chatHistory.push({
                content,
                sender,
                timestamp: new Date().toISOString()
            });
            this.saveChatHistory();
        }
    }

    clearChat() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="message grocy-message">
                <div class="message-avatar">
                    <img src="grocy-icon.png" alt="Grocy">
                </div>
                <div class="message-content">
                    <p>Hi! I'm Grocy, your AI grocery store assistant. How can I help you today?</p>
                </div>
            </div>
        `;
        this.chatHistory = [];
        this.saveChatHistory();
    }
}

// Add chat-specific styles
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    .typing-indicator .message-content {
        padding: 10px 15px;
    }

    .typing-dots {
        display: flex;
        gap: 4px;
        align-items: center;
    }

    .typing-dots span {
        width: 8px;
        height: 8px;
        background: #666;
        border-radius: 50%;
        animation: typing 1.4s infinite;
    }

    .typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
    }

    .typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
    }

    @keyframes typing {
        0%, 60%, 100% {
            transform: scale(1);
            opacity: 0.5;
        }
        30% {
            transform: scale(1.2);
            opacity: 1;
        }
    }

    .chat-input-container textarea {
        resize: none;
        max-height: 120px;
        overflow-y: auto;
    }

    .message-content code {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.9em;
    }

    .message-content strong {
        font-weight: 600;
    }

    .message-content em {
        font-style: italic;
    }

    .chat-messages {
        scrollbar-width: thin;
        scrollbar-color: #ccc transparent;
    }

    .chat-messages::-webkit-scrollbar {
        width: 6px;
    }

    .chat-messages::-webkit-scrollbar-track {
        background: transparent;
    }

    .chat-messages::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;
    }

    .chat-messages::-webkit-scrollbar-thumb:hover {
        background: #999;
    }
`;
document.head.appendChild(chatStyles);