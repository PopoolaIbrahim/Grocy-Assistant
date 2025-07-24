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

    async sendMessage() { // Made async
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Process and respond using the model
        this.isTyping = true; // Set typing before sending request
        this.showTypingIndicator();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            this.hideTypingIndicator();
            this.addMessage(data.response, 'grocy');
        } catch (error) {
            console.error('Error sending message to chatbot backend:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I am having trouble connecting to the AI. Please try again later.', 'grocy');
        } finally {
            this.isTyping = false; // Unset typing after response
        }
    }

    addMessage(content, sender = 'grocy') {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (sender === 'grocy') {
            avatar.innerHTML = '<img src="icon.jpg" alt="Grocy">';
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
            .replace(/**(.*?)**/g, '<strong>$1</strong>')
            .replace(/*(.*?)*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/
/g, '<br>');
    }

    // Removed the old processMessage and generateResponse functions

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
        const categories = [...new Set(products.map(p => p.category))]
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

        return recommendations.join('
');
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message grocy-message typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <img src="icon.jpg" alt="Grocy">
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
            avatar.innerHTML = '<img src="icon.svg" alt="Grocy">';
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
                    <img src="icon.jpg" alt="Grocy">
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
