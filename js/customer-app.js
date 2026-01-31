// App Code with FIXED card click behavior
const productGrid = document.getElementById('productGrid');
const categoryButtons = document.querySelectorAll('.category-btn');
const orderBtn = document.getElementById('orderBtn');
const orderContainer = document.getElementById('orderContainer');
const itemCount = document.getElementById('itemCount');
const confirmationModal = document.getElementById('confirmationModal');
const orderCodeDisplay = document.getElementById('orderCodeDisplay');
const orderSummaryDisplay = document.getElementById('orderSummaryDisplay');
const closeModal = document.getElementById('closeModal');
const header = document.querySelector('header');
const logo = document.querySelector('.logo');

let products = [];
let selectedProducts = []; // Array of {id, code, name, price, quantity}
let currentCategory = 'sandwiches'; // Changed from 'all' to 'sandwiches' as default

async function init() {
    await loadProducts();
    setupEventListeners();
    renderProducts();
    setupScrollHandler(); // Add scroll detection
}

// Add scroll detection for header
function setupScrollHandler() {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

async function loadProducts() {
    try {
        const querySnapshot = await db.collection("products").get();
        products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        console.log('Loaded products:', products);
    } catch (error) {
        console.error('Error loading products:', error);
        productGrid.innerHTML = '<div class="error">Failed to load menu. Please refresh.</div>';
    }
}

function setupEventListeners() {
    // Category filter buttons
    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentCategory = button.dataset.category;
            renderProducts();
        });
    });

    // Order button
    orderBtn.addEventListener('click', placeOrder);

    // Modal close button
    closeModal.addEventListener('click', () => {
        confirmationModal.classList.remove('active');
        // Don't reset immediately - user might close accidentally
        setTimeout(() => {
            selectedProducts = [];
            updateOrderButton();
            renderProducts();
        }, 3000);
    });
}

function renderProducts() {
    // Filter by category (no more 'all' category)
    const filteredProducts = products.filter(product => 
        product.category === currentCategory
    );

    // Generate HTML
    productGrid.innerHTML = filteredProducts.map(product => {
        const selectedItem = selectedProducts.find(p => p.id === product.id);
        const quantity = selectedItem ? selectedItem.quantity : 0;
        const isSelected = quantity > 0;
        
        return `
        <div class="product-card ${isSelected ? 'selected' : ''}" 
             data-id="${product.id}">
            
            ${quantity > 0 ? `<div class="quantity-badge">${quantity}</div>` : ''}
            
            <img src="${product.imageUrl || 'https://via.placeholder.com/400x300'}" 
                 alt="${product.name}" 
                 class="product-image">
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">${product.price} AED</div>
                </div>
                <div class="product-code">${product.code}</div>
                <p class="product-ingredients">${product.ingredients || ''}</p>
                
                <!-- Quantity Selector (Hidden until card is selected) -->
                <div class="quantity-selector" 
                     style="${isSelected ? 'opacity: 1; height: auto; margin-top: 15px;' : 'opacity: 0; height: 0; margin-top: 0;'}">
                    <span class="quantity-label">Quantity:</span>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" 
                                data-id="${product.id}"
                                ${quantity <= 1 ? 'disabled' : ''}>−</button>
                        <input type="number" 
                               class="quantity-input" 
                               data-id="${product.id}"
                               value="${quantity}"
                               min="1" 
                               max="99"
                               readonly>
                        <button class="quantity-btn plus" 
                                data-id="${product.id}">+</button>
                    </div>
                </div>
                
                ${isSelected ? `
                <div class="selected-info">
                    <small style="color: #27ae60; font-weight: 500;">
                        <i class="fas fa-check"></i> Selected (${quantity})
                    </small>
                </div>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
    
    // Add click listeners to product cards
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', handleCardClick);
    });
    
    // Add click listeners to quantity buttons (separate from card clicks)
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', handleQuantityButtonClick);
    });
    
    // Add change listeners to quantity inputs
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', handleQuantityInputChange);
    });
}

// Handle card click - toggle selection with quantity 1
function handleCardClick(event) {
    // Check if the click was on a quantity button - if yes, ignore
    if (event.target.closest('.quantity-controls') || 
        event.target.classList.contains('quantity-btn') ||
        event.target.classList.contains('quantity-input')) {
        return; // Let quantity button handler deal with it
    }
    
    const card = event.currentTarget;
    const productId = card.dataset.id;
    const product = products.find(p => p.id === productId);
    const existingIndex = selectedProducts.findIndex(p => p.id === productId);
    
    if (existingIndex > -1) {
        // Product already selected - remove it completely
        selectedProducts.splice(existingIndex, 1);
    } else {
        // New selection - add with quantity 1
        selectedProducts.push({
            id: productId,
            code: product.code,
            name: product.name,
            price: product.price,
            quantity: 1  // DEFAULT TO 1 ON CARD CLICK!
        });
    }
    
    updateOrderButton();
    updateSingleProductCard(productId); // Only update the clicked card
}

// Handle quantity button clicks
function handleQuantityButtonClick(event) {
    event.stopPropagation(); // Prevent card click from firing
    
    const button = event.currentTarget;
    const productId = button.dataset.id;
    const isPlus = button.classList.contains('plus');
    const isMinus = button.classList.contains('minus');
    
    const existingIndex = selectedProducts.findIndex(p => p.id === productId);
    
    if (existingIndex > -1) {
        if (isPlus) {
            selectedProducts[existingIndex].quantity += 1;
        } else if (isMinus) {
            if (selectedProducts[existingIndex].quantity > 1) {
                selectedProducts[existingIndex].quantity -= 1;
            } else {
                // If quantity is 1 and user clicks minus, remove from selection
                selectedProducts.splice(existingIndex, 1);
            }
        }
    } else if (isPlus) {
        // If clicking plus on unselected product, add it with quantity 1
        const product = products.find(p => p.id === productId);
        selectedProducts.push({
            id: productId,
            code: product.code,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateOrderButton();
    updateSingleProductCard(productId); // Only update the clicked card
}

// Handle quantity input changes
function handleQuantityInputChange(event) {
    event.stopPropagation(); // Prevent card click from firing
    
    const input = event.currentTarget;
    const productId = input.dataset.id;
    const quantity = parseInt(input.value) || 1;
    
    const existingIndex = selectedProducts.findIndex(p => p.id === productId);
    
    if (quantity > 0) {
        if (existingIndex > -1) {
            selectedProducts[existingIndex].quantity = quantity;
        } else if (quantity > 0) {
            // If setting quantity on unselected product, add it
            const product = products.find(p => p.id === productId);
            selectedProducts.push({
                id: productId,
                code: product.code,
                name: product.name,
                price: product.price,
                quantity: quantity
            });
        }
    } else {
        // Remove if quantity is 0 or less
        if (existingIndex > -1) {
            selectedProducts.splice(existingIndex, 1);
        }
    }
    
    updateOrderButton();
    updateSingleProductCard(productId); // Only update the clicked card
}

// Update only a single product card (instead of re-rendering all)
function updateSingleProductCard(productId) {
    const selectedItem = selectedProducts.find(p => p.id === productId);
    const quantity = selectedItem ? selectedItem.quantity : 0;
    const isSelected = quantity > 0;
    
    // Find the existing card element
    const cardElement = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (!cardElement) return;
    
    // Get the current scroll position before updating
    const scrollTopBefore = window.scrollY;
    
    // Update quantity badge
    let quantityBadge = cardElement.querySelector('.quantity-badge');
    if (quantity > 0) {
        if (!quantityBadge) {
            quantityBadge = document.createElement('div');
            quantityBadge.className = 'quantity-badge';
            cardElement.insertBefore(quantityBadge, cardElement.firstChild);
        }
        quantityBadge.textContent = quantity;
        quantityBadge.style.display = 'flex';
    } else if (quantityBadge) {
        quantityBadge.style.display = 'none';
    }
    
    // Update card selected state
    cardElement.classList.toggle('selected', isSelected);
    
    // Update quantity selector
    const quantitySelector = cardElement.querySelector('.quantity-selector');
    const quantityInput = cardElement.querySelector('.quantity-input');
    const minusButton = cardElement.querySelector('.quantity-btn.minus');
    
    if (isSelected) {
        quantitySelector.style.opacity = '1';
        quantitySelector.style.height = 'auto';
        quantitySelector.style.marginTop = '15px';
        
        if (quantityInput) quantityInput.value = quantity;
        if (minusButton) minusButton.disabled = quantity <= 1;
        
        // Update or create selected info
        let selectedInfo = cardElement.querySelector('.selected-info');
        if (selectedInfo) {
            selectedInfo.innerHTML = `
                <small style="color: #27ae60; font-weight: 500;">
                    <i class="fas fa-check"></i> Selected (${quantity})
                </small>
            `;
        } else {
            selectedInfo = document.createElement('div');
            selectedInfo.className = 'selected-info';
            selectedInfo.innerHTML = `
                <small style="color: #27ae60; font-weight: 500;">
                    <i class="fas fa-check"></i> Selected (${quantity})
                </small>
            `;
            quantitySelector.insertAdjacentElement('afterend', selectedInfo);
        }
    } else {
        quantitySelector.style.opacity = '0';
        quantitySelector.style.height = '0';
        quantitySelector.style.marginTop = '0';
        
        if (quantityInput) quantityInput.value = '0';
        if (minusButton) minusButton.disabled = true;
        
        // Remove selected info
        const selectedInfo = cardElement.querySelector('.selected-info');
        if (selectedInfo) selectedInfo.remove();
    }
    
    // Restore scroll position to prevent jumping
    window.scrollTo(0, scrollTopBefore);
}

// Update order button with count and total price
function updateOrderButton() {
    const totalItems = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = selectedProducts.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
    
    itemCount.textContent = totalItems;
    
    // Update or create price display
    let priceDisplay = document.querySelector('.order-price');
    if (!priceDisplay) {
        priceDisplay = document.createElement('div');
        priceDisplay.className = 'order-price';
        orderBtn.appendChild(priceDisplay);
    }
    priceDisplay.textContent = `${totalPrice.toFixed(2)} AED`;
    
    // Show/hide order button
    orderContainer.classList.toggle('visible', totalItems > 0);
}

// Place order
async function placeOrder() {
    if (selectedProducts.length === 0) return;


        // Add confirmation check
    const confirmed = window.confirm(`Place order for ${selectedProducts.reduce((sum, item) => sum + item.quantity, 0)} items? Total: ${selectedProducts.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2)} AED`);
    
    if (!confirmed) {
        return; // User cancelled
    }



    // Create order object
    const orderItems = selectedProducts.map(item => ({
        code: item.code,
        name: item.name,
        quantity: item.quantity,
        price: item.price
    }));

    const order = {
        items: orderItems,
        productCodes: orderItems.map(item => 
            item.quantity > 1 ? `${item.code} (${item.quantity})` : item.code
        ),
        totalPrice: selectedProducts.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0),
        createdAt: new Date().toISOString(),
        status: 'pending'
    };

    try {
        // Save to Firestore
        await db.collection("orders").add(order);
        
        // Show confirmation
        showOrderConfirmation(order);
        
        console.log('Order placed:', order);
    } catch (error) {
        console.error('Error placing order:', error);
        alert('Failed to place order. Please try again.');
    }
}

// Show order confirmation with details
function showOrderConfirmation(order) {
    // Generate product codes array with quantities
    const productCodes = order.productCodes;
    const itemCount = productCodes.length;
    
    // Create HTML for each code on its own line
    const codesHTML = productCodes.map(code => 
        `<div class="order-code-item">${code}</div>`
    ).join('');
    
    // Set the HTML with proper class for font sizing
    orderCodeDisplay.innerHTML = codesHTML;
    
    // Add class based on number of items for dynamic font sizing
    orderCodeDisplay.classList.remove(
        'one-item', 'two-items', 'three-items', 'four-items', 'five-items',
        'six-items', 'seven-items', 'eight-items', 'nine-items', 'ten-plus-items'
    );
    
    if (itemCount === 1) {
        orderCodeDisplay.classList.add('one-item');
    } else if (itemCount === 2) {
        orderCodeDisplay.classList.add('two-items');
    } else if (itemCount === 3) {
        orderCodeDisplay.classList.add('three-items');
    } else if (itemCount === 4) {
        orderCodeDisplay.classList.add('four-items');
    } else if (itemCount === 5) {
        orderCodeDisplay.classList.add('five-items');
    } else if (itemCount === 6) {
        orderCodeDisplay.classList.add('six-items');
    } else if (itemCount === 7) {
        orderCodeDisplay.classList.add('seven-items');
    } else if (itemCount === 8) {
        orderCodeDisplay.classList.add('eight-items');
    } else if (itemCount === 9) {
        orderCodeDisplay.classList.add('nine-items');
    } else {
        orderCodeDisplay.classList.add('ten-plus-items');
    }
    
    // Generate order summary HTML
    const summaryHTML = order.items.map(item => `
        <div class="order-item">
            <div class="order-item-name">${item.name}</div>
            <div style="display: flex; align-items: center;">
                <span class="order-item-quantity">${item.quantity}x</span>
                <span class="order-item-code">${item.code}</span>
            </div>
            <div class="order-item-price">${(item.price * item.quantity).toFixed(2)} AED</div>
        </div>
    `).join('');
    
    // Add total row
    const totalHTML = `
        <div class="order-item" style="border-top: 2px solid #ddd; margin-top: 10px; padding-top: 15px; font-weight: 700;">
            <div>TOTAL</div>
            <div></div>
            <div class="order-item-price">${order.totalPrice.toFixed(2)} AED</div>
        </div>
    `;
    
    if (orderSummaryDisplay) {
        orderSummaryDisplay.innerHTML = summaryHTML + totalHTML;
    }
    
    confirmationModal.classList.add('active');
    
    // Reset selection after order
    setTimeout(() => {
        selectedProducts = [];
        updateOrderButton();
        renderProducts(); // Need full re-render here to reset everything
    }, 100);
}

document.addEventListener('DOMContentLoaded', init);