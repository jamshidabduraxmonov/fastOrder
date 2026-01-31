// Admin App - Food Order Admin Panel

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const adminPassword = document.getElementById('adminPassword');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const ordersContainer = document.getElementById('ordersContainer');
const productList = document.getElementById('productList');
const totalOrdersEl = document.getElementById('totalOrders');
const activeProductsEl = document.getElementById('activeProducts');
const pendingOrdersEl = document.getElementById('pendingOrders');

// Product Form Elements
const productName = document.getElementById('productName');
const productCode = document.getElementById('productCode');
const productPrice = document.getElementById('productPrice');
const productCategory = document.getElementById('productCategory');
const productIngredients = document.getElementById('productIngredients');
const productImage = document.getElementById('productImage');
const addProductBtn = document.getElementById('addProductBtn');


// Admin Password (Change this to your own!)
const ADMIN_PASSWORD = "admin123"; // TODO: Change this!

// State
let allOrders = [];
let allProducts = [];
let ordersListener = null;
let productsListener = null;

// Initialize
function init() {
    setupEventListeners();
    checkAuth();
}

// Setup event listeners
function setupEventListeners() {
    // Login
    loginBtn.addEventListener('click', handleLogin);
    adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Add Product
    addProductBtn.addEventListener('click', handleAddProduct);

    // Auto-focus password field
    adminPassword.focus();
}

// Check if already authenticated
function checkAuth() {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
        showAdminPanel();
    }
}

// Handle login
function handleLogin() {
    const password = adminPassword.value.trim();
    
    if (password === ADMIN_PASSWORD) {
        localStorage.setItem('adminAuthenticated', 'true');
        showAdminPanel();
    } else {
        alert('Incorrect password!');
        adminPassword.value = '';
        adminPassword.focus();
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('adminAuthenticated');
    hideAdminPanel();
    
    // Clean up Firebase listeners
    if (ordersListener) {
        ordersListener();
        ordersListener = null;
    }
    if (productsListener) {
        productsListener();
        productsListener = null;
    }
    
    // Reset state
    allOrders = [];
    allProducts = [];
    
    // Show login screen
    loginScreen.style.display = 'flex';
    adminPassword.value = '';
    adminPassword.focus();
}

// Show admin panel
function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
    
    // Start listening to data
    startListeningToOrders();
    startListeningToProducts();
}

// Hide admin panel
function hideAdminPanel() {
    loginScreen.style.display = 'flex';
    adminPanel.style.display = 'none';
}

// Start listening to orders in real-time
function startListeningToOrders() {
    console.log('📡 Listening to orders...');
    
    ordersListener = db.collection("orders")
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            allOrders = [];
            snapshot.forEach((doc) => {
                allOrders.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            updateOrdersDisplay();
            updateStats();
        }, (error) => {
            console.error('Error listening to orders:', error);
        });
}

// Start listening to products in real-time
function startListeningToProducts() {
    console.log('📡 Listening to products...');
    
    productsListener = db.collection("products")
        .orderBy("name")
        .onSnapshot((snapshot) => {
            allProducts = [];
            snapshot.forEach((doc) => {
                allProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            updateProductsDisplay();
            updateStats();
        }, (error) => {
            console.error('Error listening to products:', error);
        });
}

    // Update orders display - FIXED VERSION
    function updateOrdersDisplay() {
        if (allOrders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-concierge-bell"></i>
                    <p>Waiting for orders...</p>
                </div>
            `;
            return;
        }
        
        // Filter out invalid orders and create HTML
        const validOrders = allOrders.filter(order => {
            // Check if order has the required properties
            return order && 
                order.items && 
                Array.isArray(order.items) && 
                order.items.length > 0;
        });
        
        // If no valid orders found
        if (validOrders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No valid orders found. Some orders may have invalid data.</p>
                    <button onclick="cleanUpInvalidOrders()" style="margin-top: 10px; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Clean Up Invalid Orders
                    </button>
                </div>
            `;
            return;
        }
        
        const ordersHTML = validOrders.map(order => {
            const orderDate = new Date(order.createdAt || new Date());
            const timeString = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = orderDate.toLocaleDateString();
            
            const statusClass = order.status || 'pending';
            const statusText = order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending';
            
            // Safely calculate total if missing
            const totalPrice = order.totalPrice || 
                (order.items ? order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) : 0);
            
            return `
                <div class="order-card ${statusClass}" data-order-id="${order.id}">
                    <div class="order-header">
                        <div class="order-time">${dateString} • ${timeString}</div>
                        <div class="order-id">${order.id.substring(0, 8)}</div>
                    </div>
                    
                    <div class="order-items">
                        ${order.items.map(item => {
                            const itemName = item.name || 'Unknown Item';
                            const itemCode = item.code || 'N/A';
                            const itemQuantity = item.quantity || 1;
                            const itemPrice = item.price || 0;
                            const itemTotal = itemPrice * itemQuantity;
                            
                            return `
                            <div class="order-item-row">
                                <div class="order-item-info">
                                    <div class="order-item-quantity-badge">${itemQuantity}</div>
                                    <div class="order-item-name">${itemName}</div>
                                    <div class="order-item-code">${itemCode}</div>
                                </div>
                                <div class="order-item-price">${itemTotal.toFixed(2)} AED</div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="order-total" style="text-align: right; margin-top: 10px;">
                        Total: ${totalPrice.toFixed(2)} AED
                    </div>
                    
                    <div class="order-actions">
                        ${order.status !== 'completed' ? `
                            <button class="action-btn complete-btn" onclick="markOrderCompleted('${order.id}')">
                                <i class="fas fa-check"></i> Mark Complete
                            </button>
                        ` : `
                            <button class="action-btn complete-btn" style="background: #95a5a6;" disabled>
                                <i class="fas fa-check"></i> Completed
                            </button>
                        `}
                        <button class="action-btn delete-btn" onclick="deleteOrder('${order.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        ordersContainer.innerHTML = ordersHTML;
    }






// Helper!!!!!

    // Clean up invalid orders (run this once to fix your database)
async function cleanUpInvalidOrders() {
    if (!confirm('This will delete all orders with invalid data. Continue?')) return;
    
    try {
        const snapshot = await db.collection("orders").get();
        let deletedCount = 0;
        
        const deletePromises = [];
        snapshot.forEach(doc => {
            const order = doc.data();
            
            // Check if order is invalid (missing items array)
            if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
                deletePromises.push(db.collection("orders").doc(doc.id).delete());
                deletedCount++;
                console.log(`🗑️ Deleting invalid order: ${doc.id}`);
            }
        });
        
        await Promise.all(deletePromises);
        alert(`✅ Deleted ${deletedCount} invalid orders.`);
        
        // Refresh the display
        startListeningToOrders();
        
    } catch (error) {
        console.error('Error cleaning up orders:', error);
        alert('Failed to clean up orders.');
    }
}

// Make it available globally
window.cleanUpInvalidOrders = cleanUpInvalidOrders;






// Update products display
function updateProductsDisplay() {
    if (allProducts.length === 0) {
        productList.innerHTML = `
            <div class="loading-products">
                <i class="fas fa-spinner fa-spin"></i>
                <p>No products found. Add your first product!</p>
            </div>
        `;
        return;
    }
    
    // Group by category
    const productsByCategory = {
        sandwiches: [],
        croissants: [],
        coffee: []
    };
    
    allProducts.forEach(product => {
        if (productsByCategory[product.category]) {
            productsByCategory[product.category].push(product);
        }
    });
    
    let productsHTML = '';
    
    // Sandwiches/Wraps
    if (productsByCategory.sandwiches.length > 0) {
        productsHTML += `<h4 style="margin: 20px 0 10px 0; color: #2c3e50;">🥪 Sandwiches/Wraps</h4>`;
        productsHTML += productsByCategory.sandwiches.map(product => createProductItemHTML(product)).join('');
    }
    
    // Croissants/Muffins
    if (productsByCategory.croissants.length > 0) {
        productsHTML += `<h4 style="margin: 20px 0 10px 0; color: #2c3e50;">🥐 Croissants/Muffins</h4>`;
        productsHTML += productsByCategory.croissants.map(product => createProductItemHTML(product)).join('');
    }
    
    // Starbucks Coffee
    if (productsByCategory.coffee.length > 0) {
        productsHTML += `<h4 style="margin: 20px 0 10px 0; color: #2c3e50;">☕ Starbucks Coffee</h4>`;
        productsHTML += productsByCategory.coffee.map(product => createProductItemHTML(product)).join('');
    }
    
    productList.innerHTML = productsHTML;
}

// Create product item HTML
function createProductItemHTML(product) {
    const categoryNames = {
        sandwiches: 'Sandwich',
        croissants: 'Pastry',
        coffee: 'Coffee'
    };
    
    return `
        <div class="product-item" data-product-id="${product.id}">
            <div class="product-info">
                <div class="product-name-row">
                    <div class="product-name">${product.name}</div>
                    <div class="product-category">${categoryNames[product.category] || product.category}</div>
                </div>
                <div class="product-details">
                    <div class="product-code-badge">${product.code}</div>
                    <div class="product-price-tag">${product.price} AED</div>
                </div>
                ${product.ingredients ? `<p style="margin-top: 8px; color: #666; font-size: 0.9rem;">${product.ingredients}</p>` : ''}
            </div>
            <div class="product-actions">
                <button class="edit-btn" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="delete-product-btn" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// Update statistics
function updateStats() {
    // Total orders (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const ordersToday = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= today;
    }).length;
    
    totalOrdersEl.textContent = ordersToday;
    
    // Active products
    activeProductsEl.textContent = allProducts.length;
    
    // Pending orders
    const pendingOrders = allOrders.filter(order => order.status !== 'completed').length;
    pendingOrdersEl.textContent = pendingOrders;
}

// Handle add product
async function handleAddProduct() {
    const name = productName.value.trim();
    const code = productCode.value.trim();
    const price = parseFloat(productPrice.value);
    const category = productCategory.value;
    const ingredients = productIngredients.value.trim();
    const imageUrl = productImage.value.trim();
    
    // Validation
    if (!name || !code || !price) {
        alert('Please fill in name, code, and price');
        return;
    }
    
    if (code.length !== 5 || !/^\d+$/.test(code)) {
        alert('Code must be exactly 5 digits');
        return;
    }
    
    if (price <= 0) {
        alert('Price must be greater than 0');
        return;
    }
    
    // Check if code already exists
    const existingProduct = allProducts.find(p => p.code === code);
    if (existingProduct) {
        alert(`Code ${code} already exists for product: ${existingProduct.name}`);
        return;
    }
    
    try {
        await db.collection("products").add({
            name,
            code,
            price,
            category,
            ingredients: ingredients || '',
            imageUrl: imageUrl || 'https://images.unsplash.com/photo-1576866209830-589e1bfbaa4d?w=400&h=300&fit=crop',
            isAvailable: true,
            createdAt: new Date().toISOString()
        });
        
        // Clear form
        productName.value = '';
        productCode.value = '';
        productPrice.value = '';
        productIngredients.value = '';
        productImage.value = '';
        
        alert('✅ Product added successfully!');
        
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product. Please try again.');
    }
}

// Mark order as completed
async function markOrderCompleted(orderId) {
    if (!confirm('Mark this order as completed?')) return;
    
    try {
        await db.collection("orders").doc(orderId).update({
            status: 'completed',
            completedAt: new Date().toISOString()
        });
        console.log('✅ Order marked as completed');
    } catch (error) {
        console.error('Error completing order:', error);
        alert('Failed to mark order as completed');
    }
}

// Delete order
async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        await db.collection("orders").doc(orderId).delete();
        console.log('🗑️ Order deleted');
    } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? It will be removed from the menu.')) return;
    
    try {
        await db.collection("products").doc(productId).delete();
        console.log('🗑️ Product deleted');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
    }
}

// Edit product (placeholder for now)
function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    // For now, just show an alert with product details
    // In a future version, you could implement a proper edit modal
    alert(`Edit Product:\n\nName: ${product.name}\nCode: ${product.code}\nPrice: ${product.price} AED\nCategory: ${product.category}\n\nEdit functionality coming soon!`);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally for HTML onclick
window.markOrderCompleted = markOrderCompleted;
window.deleteOrder = deleteOrder;
window.deleteProduct = deleteProduct;
window.editProduct = editProduct;