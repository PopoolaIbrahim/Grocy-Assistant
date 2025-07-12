// Global initialization and component registration
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the main app first
    window.grocyApp = new GrocyApp();
    
    // Initialize Feather icons
    feather.replace();
    
    console.log('Grocy application initialized successfully');
});