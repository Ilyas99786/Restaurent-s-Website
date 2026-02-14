document.addEventListener('DOMContentLoaded', () => {

    // Data storage using localStorage
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let items = JSON.parse(localStorage.getItem('items')) || [];
    let orders = JSON.parse(localStorage.getItem('orders')) || [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // DOM elements
    const roleSelection = document.getElementById('role-selection');
    const authForms = document.getElementById('auth-forms');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const supplierDashboard = document.getElementById('supplier-dashboard');
    const mainHeader = document.getElementById('main-header');
    const mainContent = document.getElementById('main-content');

    const orderModal = document.getElementById('order-modal');
    const orderForm = document.getElementById('order-form');
    const successPopup = document.getElementById('success-popup');
    const errorPopup = document.getElementById('error-popup');
    const closeModal = document.querySelector('.close');

    // Cart
    const cartBtn = document.getElementById('cart-btn');
    const cartCount = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const cartOrdersContainer = document.getElementById('cart-orders');
    const closeCart = document.getElementById('close-cart');

    // Payment QR
    const paymentSelect = document.getElementById('order-payment');
    const qrBox = document.getElementById('qr-box');
    const paidConfirm = document.getElementById('paid-confirm');
    const upiAmountText = document.getElementById('upi-amount-text');

    // Set your UPI ID here
    const UPI_ID = "forfoodies@upi";

    let currentOrderItem = null;

    // ---------- Helpers ----------
    function saveItems() {
        localStorage.setItem('items', JSON.stringify(items));
    }

    function saveOrders() {
        localStorage.setItem('orders', JSON.stringify(orders));
    }

    // INR currency
    function formatMoney(amount) {
        return `₹${Number(amount).toFixed(2).replace(/\.00$/, '')}`;
    }

    function getOrderStatusBadge(status) {
        const s = (status || 'pending').toLowerCase();

        if (s === 'cancelled') return '<span class="badge cancelled">Cancelled</span>';
        if (s === 'preparing') return '<span class="badge pending">Preparing</span>';
        if (s === 'delivered') return '<span class="badge pending">Delivered</span>';

        return '<span class="badge pending">Pending</span>';
    }

    function updateCartCount() {
        if (!cartCount) return;
        if (!currentUser || currentUser.role !== 'customer') {
            cartCount.textContent = '0';
            return;
        }

        const myOrders = orders.filter(o => o.customerName === currentUser.name);
        const active = myOrders.filter(o => (o.status || 'pending') === 'pending' || (o.status || 'pending') === 'preparing');
        cartCount.textContent = String(active.length);
    }

    function getTimelineHTML(status) {
        const s = (status || "pending").toLowerCase();

        if (s === "cancelled") {
            return `
                <div class="timeline">
                    <span class="step cancelled">Cancelled</span>
                </div>
            `;
        }

        const pendingClass = (s === "pending") ? "active" : "done";
        const preparingClass = (s === "preparing") ? "active" : (s === "delivered" ? "done" : "");
        const deliveredClass = (s === "delivered") ? "done" : "";

        return `
            <div class="timeline">
                <span class="step ${pendingClass}">Pending</span>
                <span class="step ${preparingClass}">Preparing</span>
                <span class="step ${deliveredClass}">Delivered</span>
            </div>
        `;
    }

    function getInvoiceHTML(order) {
        const payment = order.paymentMethod === "online" ? "Online (UPI)" : order.paymentMethod;

        return `
            <div class="invoice">
                <h4>Invoice Receipt</h4>

                <div class="invoice-row">
                    <span>Item</span>
                    <b>${order.itemName}</b>
                </div>

                <div class="invoice-row">
                    <span>Quantity</span>
                    <b>${order.quantity}</b>
                </div>

                <div class="invoice-row">
                    <span>Total</span>
                    <b>${formatMoney(order.total)}</b>
                </div>

                <div class="invoice-row">
                    <span>Payment</span>
                    <b>${payment}</b>
                </div>

                <div class="invoice-row">
                    <span>Customer</span>
                    <b>${order.customerName}</b>
                </div>

                <div class="invoice-row">
                    <span>Contact</span>
                    <b>${order.customerContact}</b>
                </div>

                <div class="invoice-row">
                    <span>Address</span>
                    <b>${order.customerAddress}</b>
                </div>
            </div>
        `;
    }

    // ---------- Role selection ----------
    document.getElementById('supplier-btn').addEventListener('click', () => {
        showAuthForms('supplier');
    });

    document.getElementById('customer-btn').addEventListener('click', () => {
        showAuthForms('customer');
    });

    function showAuthForms(role) {
        roleSelection.style.display = 'none';
        authForms.style.display = 'block';

        document.getElementById('signup-title').textContent =
            `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`;

        signupForm.dataset.role = role;
    }

    // Toggle between login and signup
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Signup
    document.getElementById('signup').addEventListener('submit', (e) => {
        e.preventDefault();

        const role = signupForm.dataset.role;
        const name = document.getElementById('signup-name').value;
        const contact = document.getElementById('signup-contact').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const location = document.getElementById('signup-location').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (users.find(user => user.name === name && user.role === role)) {
            alert('User already exists');
            return;
        }

        const user = { name, contact, password, location, role };
        users.push(user);

        localStorage.setItem('users', JSON.stringify(users));

        alert('Sign up successful! Please login.');
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Login
    document.getElementById('login').addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('login-name').value;
        const password = document.getElementById('login-password').value;

        const user = users.find(u => u.name === name && u.password === password);

        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard(user.role);
            updateCartCount();
        } else {
            alert('Invalid credentials');
        }
    });

    // Show dashboard
    function showDashboard(role) {
        authForms.style.display = 'none';
        roleSelection.style.display = 'none';

        mainHeader.style.display = 'flex';
        if (cartBtn) cartBtn.style.display = (role === 'customer') ? 'inline-block' : 'none';

        if (role === 'supplier') {
            supplierDashboard.style.display = 'block';
            mainContent.style.display = 'none';
            loadSupplierDashboard();
        } else {
            mainContent.style.display = 'block';
            supplierDashboard.style.display = 'none';
            loadCustomerDashboard();
        }
    }

    // ---------- Supplier dashboard ----------
    function loadSupplierDashboard() {
        const itemsList = document.getElementById('items-list');
        itemsList.innerHTML = '';

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'item';

            li.innerHTML = `
                <div><strong>${item.name}</strong> - ${formatMoney(item.price)}</div>
                <div class="actions">
                    <button class="btn btn-danger" onclick="deleteItem(${item.id})">
                        Delete (Out of Stock)
                    </button>
                </div>
            `;

            itemsList.appendChild(li);
        });

        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = '';

        orders.forEach(order => {
            const li = document.createElement('li');
            li.className = 'order';

            const status = order.status || 'pending';

            li.innerHTML = `
                <strong>Order ID: ${order.id}</strong> ${getOrderStatusBadge(status)}<br>
                Item: ${order.itemName}<br>
                Customer: ${order.customerName}<br>
                Contact: ${order.customerContact}<br>
                Address: ${order.customerAddress}<br>
                Payment: ${order.paymentMethod === "online" ? "Online (UPI)" : order.paymentMethod}<br>
                Quantity: ${order.quantity}<br>
                Total: ${formatMoney(order.total)}<br>

                ${status === 'cancelled'
                    ? `<small><b>Cancelled by:</b> ${order.cancelledBy || 'N/A'}<br>
                       <b>Reason:</b> ${order.cancelledReason || 'N/A'}</small>`
                    : ''
                }

                <div class="actions">
                    ${status === 'pending'
                        ? `
                            <button class="btn btn-secondary" onclick="setOrderStatus(${order.id}, 'preparing')">
                                Mark Preparing
                            </button>

                            <button class="btn btn-danger" onclick="cancelOrder(${order.id}, 'supplier')">
                                Cancel Order
                            </button>
                          `
                        : ''
                    }

                    ${status === 'preparing'
                        ? `
                            <button class="btn btn-primary" onclick="setOrderStatus(${order.id}, 'delivered')">
                                Mark Delivered
                            </button>
                          `
                        : ''
                    }
                </div>
            `;

            ordersList.appendChild(li);
        });
    }

    // Supplier add item
    document.getElementById('add-item-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('item-name').value;
        const price = parseFloat(document.getElementById('item-price').value);

        const item = { id: Date.now(), name, price };
        items.push(item);
        saveItems();

        loadSupplierDashboard();
        loadCustomerDashboard();

        document.getElementById('add-item-form').reset();
    });

    // Supplier delete item
    window.deleteItem = function(itemId) {
        if (!currentUser || currentUser.role !== 'supplier') return;

        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const ok = confirm(`Mark "${item.name}" as Out of Stock and remove it from menu?`);
        if (!ok) return;

        items = items.filter(i => i.id !== itemId);
        saveItems();

        // cancel pending orders for this item
        orders = orders.map(o => {
            const status = o.status || 'pending';
            if (o.itemId === itemId && (status === 'pending' || status === 'preparing')) {
                return {
                    ...o,
                    status: 'cancelled',
                    cancelledBy: 'supplier',
                    cancelledReason: 'Item out of stock',
                    cancelledAt: new Date().toISOString()
                };
            }
            return o;
        });

        saveOrders();

        loadSupplierDashboard();
        loadCustomerDashboard();
        updateCartCount();

        alert('Item removed. Pending orders for this item were cancelled.');
    };

    // Supplier set order status
    window.setOrderStatus = function(orderId, newStatus) {
        if (!currentUser || currentUser.role !== 'supplier') {
            alert("Only supplier can update status.");
            return;
        }

        orders = orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                };
            }
            return o;
        });

        saveOrders();
        loadSupplierDashboard();
        renderCartOrders();
        updateCartCount();

        alert(`Order status updated to: ${newStatus.toUpperCase()}`);
    };

    // ---------- Customer dashboard ----------
    function loadCustomerDashboard() {
        const menuItems = document.getElementById('menu-items');
        menuItems.innerHTML = '';

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'menu-item';

            div.innerHTML = `
                <h3>${item.name}</h3>
                <p>${formatMoney(item.price)}</p>
                <button class="btn btn-primary" onclick="openOrderModal(${item.id}, '${item.name}', ${item.price})">
                    Order Now
                </button>
            `;

            menuItems.appendChild(div);
        });

        updateCartCount();
    }

    // Open order modal
    window.openOrderModal = function(itemId, itemName, itemPrice) {
        currentOrderItem = { id: itemId, name: itemName, price: itemPrice };
        orderModal.style.display = 'block';
        orderForm.reset();

        document.getElementById('order-quantity').value = 1;

        // reset payment UI
        if (qrBox) qrBox.style.display = "none";
        if (paidConfirm) paidConfirm.checked = false;
        if (upiAmountText) upiAmountText.textContent = "₹0";
    };

    // Payment dropdown show QR
    if (paymentSelect && qrBox) {
        paymentSelect.addEventListener('change', () => {
            const quantity = parseInt(document.getElementById('order-quantity').value) || 1;
            const totalAmount = currentOrderItem ? currentOrderItem.price * quantity : 0;

            if (paymentSelect.value === "online") {
                qrBox.style.display = "block";
                upiAmountText.textContent = formatMoney(totalAmount);
            } else {
                qrBox.style.display = "none";
                if (paidConfirm) paidConfirm.checked = false;
            }
        });
    }

    // Update amount when quantity changes
    document.getElementById('order-quantity').addEventListener('input', () => {
        if (!currentOrderItem) return;

        const qty = parseInt(document.getElementById('order-quantity').value) || 1;
        const totalAmount = currentOrderItem.price * qty;

        if (paymentSelect.value === "online") {
            upiAmountText.textContent = formatMoney(totalAmount);
        }
    });

    // Close order modal
    closeModal.addEventListener('click', () => {
        orderModal.style.display = 'none';
    });

    // Close modals by clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === orderModal) orderModal.style.display = 'none';
        if (cartModal && event.target === cartModal) cartModal.style.display = 'none';
    });

    // Submit order
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const quantity = parseInt(document.getElementById('order-quantity').value);
        const contact = document.getElementById('order-contact').value;
        const altContact = document.getElementById('order-alt-contact').value;
        const address = document.getElementById('order-address').value;
        const payment = document.getElementById('order-payment').value;

        if (!quantity || quantity < 1 || !contact || !address || !payment) {
            showErrorPopup('Please fill in all required fields properly.');
            return;
        }

        // If online payment, checkbox must be checked
        if (payment === "online" && !paidConfirm.checked) {
            alert("Please confirm payment by checking: I have paid successfully.");
            return;
        }

        const totalAmount = currentOrderItem.price * quantity;

        const order = {
            id: Date.now(),
            itemId: currentOrderItem.id,
            itemName: currentOrderItem.name,
            quantity: quantity,
            total: totalAmount,
            customerName: currentUser.name,
            customerContact: contact,
            customerAltContact: altContact,
            customerAddress: address,
            paymentMethod: payment,
            customerLocation: currentUser.location,
            status: 'pending',
            createdAt: new Date().toISOString(),

            // store payment confirmation
            paymentConfirmed: payment === "online" ? true : false,
            upiId: payment === "online" ? UPI_ID : null
        };

        orders.push(order);
        saveOrders();

        orderModal.style.display = 'none';
        showSuccessPopup();

        updateCartCount();
        loadSupplierDashboard();
    });

    function showSuccessPopup() {
        successPopup.style.display = 'block';
        setTimeout(() => {
            successPopup.style.display = 'none';
        }, 2500);
    }

    function showErrorPopup(message) {
        errorPopup.textContent = message;
        errorPopup.style.display = 'block';
        setTimeout(() => {
            errorPopup.style.display = 'none';
        }, 2500);
    }

    // ---------- Cancel Order ----------
    window.cancelOrder = function(orderId, byRole) {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const status = order.status || 'pending';

        // only pending/preparing can be cancelled
        if (status !== 'pending' && status !== 'preparing') {
            alert('This order cannot be cancelled now.');
            return;
        }

        if (byRole === 'customer') {
            if (!currentUser || currentUser.role !== 'customer' || order.customerName !== currentUser.name) {
                alert('You can only cancel your own orders.');
                return;
            }
        }

        if (byRole === 'supplier') {
            if (!currentUser || currentUser.role !== 'supplier') {
                alert('Only supplier can cancel from supplier dashboard.');
                return;
            }
        }

        const reason = prompt('Reason for cancellation (optional):') || '';
        const ok = confirm('Are you sure you want to cancel this order?');
        if (!ok) return;

        orders = orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    status: 'cancelled',
                    cancelledBy: byRole,
                    cancelledReason: reason,
                    cancelledAt: new Date().toISOString()
                };
            }
            return o;
        });

        saveOrders();
        loadSupplierDashboard();
        renderCartOrders();
        updateCartCount();

        alert('Order cancelled.');
    };

    // ---------- Cart ----------
    function renderCartOrders() {
        if (!cartOrdersContainer) return;

        if (!currentUser || currentUser.role !== 'customer') {
            cartOrdersContainer.innerHTML = '<p>Please login as customer.</p>';
            return;
        }

        const myOrders = orders
            .filter(o => o.customerName === currentUser.name)
            .sort((a, b) => b.id - a.id);

        if (myOrders.length === 0) {
            cartOrdersContainer.innerHTML = '<p style="color: rgba(255,255,255,0.7)">No orders yet.</p>';
            return;
        }

        cartOrdersContainer.innerHTML = '';

        myOrders.forEach(order => {
            const div = document.createElement('div');
            div.className = 'order';

            const status = order.status || 'pending';

            div.innerHTML = `
                <strong>Order ID: ${order.id}</strong> ${getOrderStatusBadge(status)}<br>
                Item: ${order.itemName}<br>
                Quantity: ${order.quantity}<br>
                Total: ${formatMoney(order.total)}<br>
                Payment: ${order.paymentMethod === "online" ? "Online (UPI)" : order.paymentMethod}<br>

                ${order.paymentMethod === "online"
                    ? `<small><b>UPI ID:</b> ${order.upiId || UPI_ID}<br>
                       <b>Payment Confirmed:</b> ${order.paymentConfirmed ? "YES" : "NO"}</small><br>`
                    : ''
                }

                ${getTimelineHTML(status)}

                ${getInvoiceHTML(order)}

                ${status === 'cancelled'
                    ? `<small><b>Cancelled by:</b> ${order.cancelledBy || 'N/A'}<br>
                       <b>Reason:</b> ${order.cancelledReason || 'N/A'}</small>`
                    : ''
                }

                <div class="actions">
                    ${(status === 'pending')
                        ? `<button class="btn btn-danger" onclick="cancelOrder(${order.id}, 'customer')">
                            Cancel Order
                           </button>`
                        : ''
                    }
                </div>
            `;

            cartOrdersContainer.appendChild(div);
        });
    }

    // Open cart
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            if (!currentUser || currentUser.role !== 'customer') return;
            renderCartOrders();
            cartModal.style.display = 'block';
        });
    }

    // Close cart
    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartModal.style.display = 'none';
        });
    }

    // ---------- Logout ----------
    function logout() {
        currentUser = null;
        localStorage.removeItem('currentUser');

        mainHeader.style.display = 'none';
        supplierDashboard.style.display = 'none';
        mainContent.style.display = 'none';

        if (cartBtn) cartBtn.style.display = 'none';
        if (cartModal) cartModal.style.display = 'none';

        // show role selection on logout
        roleSelection.style.display = 'block';

        authForms.style.display = 'none';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    }

    // Logout buttons
    const logoutButtons = document.querySelectorAll('#logout-btn, #logout-supplier, #logout-customer');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logout);
    });

    // ---------- DEFAULT PAGE ON LOAD ----------
    roleSelection.style.display = 'block';
    authForms.style.display = 'none';
    mainHeader.style.display = 'none';
    supplierDashboard.style.display = 'none';
    mainContent.style.display = 'none';

    // Auto login
    if (currentUser) {
        showDashboard(currentUser.role);
        updateCartCount();
    }
});
