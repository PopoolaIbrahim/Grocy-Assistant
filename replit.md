# Grocy - AI Grocery Store Manager

## Overview

Grocy is a web-based grocery store management application that provides barcode scanning, inventory management, and AI-powered assistance. It's designed as a Progressive Web App (PWA) with a mobile-first approach, featuring real-time barcode scanning, inventory tracking, and an intelligent chat assistant.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 12, 2025
- **Folder Structure Reorganization**: Moved from `static/` folder to proper `css/` and `js/` folders for better organization
- **JavaScript Initialization Fix**: Fixed component initialization errors and undefined reference issues
- **CSV Data Storage**: Implemented automatic CSV file updates when products are added or modified
- **Currency Display System**: Added comprehensive currency display updates across all pages (inventory, add product, settings)
- **Component Communication**: Fixed sidebar navigation closing and component refresh issues
- **Safe Reference Patterns**: Implemented proper error handling for component references to prevent JavaScript errors

## System Architecture

### Frontend Architecture
- **Single Page Application (SPA)**: Built with vanilla JavaScript using a component-based architecture
- **Mobile-First Design**: Responsive layout with sidebar navigation optimized for mobile devices
- **Progressive Web App**: Designed to work offline and provide native app-like experience
- **Component Structure**: Modular JavaScript classes for different features (Scanner, Inventory, Chat, Main App)

### Client-Side Technologies
- **HTML5**: Modern semantic markup with viewport optimization
- **CSS3**: Custom properties (CSS variables) for consistent theming and responsive design
- **Vanilla JavaScript**: ES6+ classes and modules for component organization
- **External Libraries**:
  - html5-qrcode: Barcode scanning functionality
  - papaparse: CSV import/export capabilities
  - feather-icons: Icon library for consistent UI elements

### Data Storage
- **Client-Side Storage**: Browser's local storage for persistent data
- **In-Memory State**: JavaScript objects for current session data
- **CSV Support**: Import/export functionality for data portability

## Key Components

### 1. Barcode Scanner (`scanner.js`)
- **Purpose**: Handles barcode scanning using device camera
- **Features**: Real-time barcode detection, product lookup, and inventory updates
- **Integration**: Uses html5-qrcode library for cross-platform camera access

### 2. Inventory Manager (`inventory.js`)
- **Purpose**: Manages product inventory and stock levels
- **Features**: Product search, filtering, sorting, and CSV import/export
- **Data Management**: Maintains product database with stock tracking

### 3. Chat Assistant (`chat.js`)
- **Purpose**: Provides AI-powered assistance and recommendations
- **Features**: Natural language processing, inventory insights, and shopping recommendations
- **Architecture**: Rule-based system with expandable knowledge base

### 4. Main Application (`app.js`)
- **Purpose**: Central coordinator for all components
- **Features**: Navigation management, settings persistence, and component initialization
- **Pattern**: Singleton pattern for global state management

## Data Flow

1. **User Interaction**: User interacts with sidebar navigation or main content
2. **View Management**: Main app switches between different views (scanner, inventory, chat, settings)
3. **Component Communication**: Components communicate through the main app instance
4. **Data Persistence**: Settings and product data stored in browser's local storage
5. **Real-time Updates**: Scanner updates inventory immediately upon successful scan

## External Dependencies

### CDN-Hosted Libraries
- **html5-qrcode@2.3.8**: Camera-based barcode scanning
- **papaparse@5.4.1**: CSV parsing and generation
- **feather-icons@4.29.0**: Icon library and sprite system

### Rationale for External Dependencies
- **html5-qrcode**: Chosen for its cross-platform compatibility and comprehensive barcode format support
- **papaparse**: Industry standard for CSV handling with robust parsing capabilities
- **feather-icons**: Lightweight, consistent icon set with good mobile rendering

## Deployment Strategy

### Static Web Application
- **Architecture**: Client-side only application requiring no server infrastructure
- **Hosting**: Can be deployed on any static hosting service (GitHub Pages, Netlify, Vercel)
- **Assets**: All dependencies loaded from CDN for reduced bundle size
- **Offline Capability**: Designed to work offline once loaded (PWA features)

### Progressive Web App Features
- **Responsive Design**: Mobile-first approach with sidebar navigation
- **Offline Support**: Local storage ensures data persistence without server
- **App-like Experience**: Full-screen mobile interface with native-like interactions

### Scalability Considerations
- **Client-Side Limitations**: Current architecture limited by browser storage capacity
- **Future Enhancements**: Architecture allows for easy integration of backend services
- **Data Export**: CSV functionality provides migration path for scaling

## Technical Decisions

### Why Vanilla JavaScript?
- **Simplicity**: Reduces complexity and dependencies
- **Performance**: Faster load times without framework overhead
- **Flexibility**: Easier to integrate with various backend solutions later

### Why Client-Side Storage?
- **Offline Capability**: Works without internet connection
- **Privacy**: No data sent to external servers
- **Simplicity**: No database setup or management required

### Why Component-Based Architecture?
- **Maintainability**: Clear separation of concerns
- **Reusability**: Components can be easily modified or extended
- **Testability**: Individual components can be tested in isolation