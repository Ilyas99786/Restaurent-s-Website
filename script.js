document.addEventListener("DOMContentLoaded", () => {

    let users = JSON.parse(localStorage.getItem("users")) || [];
    let items = JSON.parse(localStorage.getItem("items")) || [];
    let orders = JSON.parse(localStorage.getItem("orders")) || [];
    let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;

    const UPI_ID = "forfoodies@upi";
    const ESTIMATED_DELIVERY_MINUTES = 30;

    // DOM
    const roleSelection = document.getElementById("role-selection");
    const authForms = document.getElementById("auth-forms");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    const mainHeader = document.getElementById("main-header");
    const cartBtn = document.getElementById("cart-btn");
    const cartCount = document.getElementById("cart-count");
    const logoutBtn = document.getElementById("logout-btn");

    const customerPage = document.getElementById("customer-page");
    const supplierDashboard = document.getElementById("supplier-dashboard");

    const menuItems = document.getElementById("menu-items");
    const orderHistory = document.getElementById("order-history");

    const searchInput = document.getElementById("search-input");

    // Supplier
    const addItemForm = document.getElementById("add-item-form");
    const itemsList = document.getElementById("items-list");
    const ordersList = document.getElementById("orders-list");

    // Analytics
    const statTotalOrders = document.getElementById("stat-total-orders");
    const statRevenue = document.getElementById("stat-revenue");
    const statDelivered = document.getElementById("stat-delivered");
    const statCancelled = document.getElementById("stat-cancelled");

    // Modals
    const orderModal = document.getElementById("order-modal");
    const cartModal = document.getElementById("cart-modal");

    const closeOrderModalBtn = document.getElementById("close-order-modal");
    const closeCartBtn = document.getElementById("close-cart");

    // Order modal
    const selectedItemName = document.getElementById("selected-item-name");
    const selectedItemPrice = document.getElementById("selected-item-price");

    const orderForm = document.getElementById("order-form");
    const orderQuantity = document.getElementById("order-quantity");
    const orderContact = document.getElementById("order-contact");
    const orderAltContact = document.getElementById("order-alt-contact");
    const orderAddress = document.getElementById("order-address");
    const orderPayment = document.getElementById("order-payment");

    // Online payment
    const qrBox = document.getElementById("qr-box");
    const upiIdText = document.getElementById("upi-id-text");
    const upiAmountText = document.getElementById("upi-amount-text");
    const paidConfirm = document.getElementById("paid-confirm");
    const paymentProof = document.getElementById("payment-proof");

    // Cart
    const cartOrders = document.getElementById("cart-orders");

    // Popups
    const successPopup = document.getElementById("success-popup");
    const errorPopup = document.getElementById("error-popup");

    let currentOrderItem = null;

    // -------------------------------
    // HELPERS
    // -------------------------------
    function saveUsers() { localStorage.setItem("users", JSON.stringify(users)); }
    function saveItems() { localStorage.setItem("items", JSON.stringify(items)); }
    function saveOrders() { localStorage.setItem("orders", JSON.stringify(orders)); }

    function formatMoney(amount) {
        return `₹${Number(amount).toFixed(2).replace(/\.00$/, "")}`;
    }

    function showPopup(el, text) {
        el.querySelector("p").textContent = text;
        el.style.display = "block";
        setTimeout(() => el.style.display = "none", 2200);
    }

    function getOrderStatusBadge(order) {
        const s = (order.status || "pending").toLowerCase();

        if (s === "cancelled") return `<span class="badge cancelled">Cancelled</span>`;
        if (s === "payment_pending") return `<span class="badge pending">Payment Pending</span>`;
        if (s === "payment_declined") return `<span class="badge cancelled">Payment Declined</span>`;
        if (s === "preparing") return `<span class="badge pending">Preparing</span>`;
        if (s === "delivered") return `<span class="badge pending">Delivered</span>`;
        return `<span class="badge pending">Pending</span>`;
    }

    function getTimelineHTML(order) {
        const s = (order.status || "pending").toLowerCase();

        if (s === "cancelled" || s === "payment_declined") {
            return `
                <div class="timeline">
                    <span class="step cancelled">Cancelled</span>
                </div>
            `;
        }

        if (s === "payment_pending") {
            return `
                <div class="timeline">
                    <span class="step active">Payment Pending</span>
                    <span class="step">Pending</span>
                    <span class="step">Preparing</span>
                    <span class="step">Delivered</span>
                </div>
                <p style="text-align:center; margin-top:8px; color:rgba(255,255,255,0.7);">
                    Waiting for supplier approval...
                </p>
            `;
        }

        const pendingClass = (s === "pending") ? "active" : "done";
        const preparingClass = (s === "preparing") ? "active" : (s === "delivered" ? "done" : "");
        const deliveredClass = (s === "delivered") ? "done" : "";

        let deliveryInfo = "";

        if (s === "pending") {
            deliveryInfo = `<p style="text-align:center; margin-top:8px; color:rgba(255,255,255,0.7);">
                Estimated Delivery: ${ESTIMATED_DELIVERY_MINUTES} mins
            </p>`;
        }

        if (s === "preparing") {
            deliveryInfo = `<p style="text-align:center; margin-top:8px; color:rgba(255,255,255,0.7);">
                Estimated Delivery: ${Math.max(10, ESTIMATED_DELIVERY_MINUTES - 10)} mins
            </p>`;
        }

        if (s === "delivered") {
            const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : "N/A";
            deliveryInfo = `<p style="text-align:center; margin-top:8px; color:#7dffbf;">
                Delivered at: ${deliveredAt}
            </p>`;
        }

        return `
            <div class="timeline">
                <span class="step ${pendingClass}">Pending</span>
                <span class="step ${preparingClass}">Preparing</span>
                <span class="step ${deliveredClass}">Delivered</span>
            </div>
            ${deliveryInfo}
        `;
    }

    function getInvoiceHTML(order) {
        const pay = order.paymentMethod === "online" ? "Online (UPI)" : order.paymentMethod;

        return `
            <div class="invoice">
                <h4>Invoice Receipt</h4>
                <div class="invoice-row"><span>Item</span><b>${order.itemName}</b></div>
                <div class="invoice-row"><span>Quantity</span><b>${order.quantity}</b></div>
                <div class="invoice-row"><span>Total</span><b>${formatMoney(order.total)}</b></div>
                <div class="invoice-row"><span>Payment</span><b>${pay}</b></div>
                ${order.paymentMethod === "online"
                    ? `<div class="invoice-row"><span>UPI ID</span><b>${order.upiId || UPI_ID}</b></div>`
                    : ""
                }
            </div>
        `;
    }

    function updateCartCount() {
        if (!currentUser || currentUser.role !== "customer") {
            cartCount.textContent = "0";
            return;
        }

        const myOrders = orders.filter(o => o.customerName === currentUser.name);
        const active = myOrders.filter(o =>
            o.status === "payment_pending" ||
            o.status === "pending" ||
            o.status === "preparing"
        );

        cartCount.textContent = String(active.length);
    }

    // Convert file to Base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // -------------------------------
    // RESET UI
    // -------------------------------
    function resetToRolePage() {
        roleSelection.style.display = "block";
        authForms.style.display = "none";
        mainHeader.style.display = "none";
        customerPage.style.display = "none";
        supplierDashboard.style.display = "none";
        cartModal.style.display = "none";
        orderModal.style.display = "none";
        cartBtn.style.display = "none";
    }

    resetToRolePage();

    // Role buttons
    document.getElementById("customer-btn").addEventListener("click", () => showAuth("customer"));
    document.getElementById("supplier-btn").addEventListener("click", () => showAuth("supplier"));

    function showAuth(role) {
        roleSelection.style.display = "none";
        authForms.style.display = "block";
        loginForm.style.display = "block";
        signupForm.style.display = "none";
        signupForm.dataset.role = role;

        document.getElementById("signup-title").textContent =
            `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`;
    }

    document.getElementById("show-signup").addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.style.display = "none";
        signupForm.style.display = "block";
    });

    document.getElementById("show-login").addEventListener("click", (e) => {
        e.preventDefault();
        signupForm.style.display = "none";
        loginForm.style.display = "block";
    });

    // Signup
    document.getElementById("signup").addEventListener("submit", (e) => {
        e.preventDefault();

        const role = signupForm.dataset.role;
        const name = document.getElementById("signup-name").value.trim();
        const contact = document.getElementById("signup-contact").value.trim();
        const password = document.getElementById("signup-password").value.trim();
        const confirmPassword = document.getElementById("signup-confirm-password").value.trim();
        const location = document.getElementById("signup-location").value.trim();

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        const exists = users.find(u => u.name === name && u.role === role);
        if (exists) {
            alert("User already exists!");
            return;
        }

        users.push({ name, contact, password, location, role });
        saveUsers();

        alert("Sign up successful! Please login.");
        signupForm.reset();
        signupForm.style.display = "none";
        loginForm.style.display = "block";
    });

    // Login
    document.getElementById("login").addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("login-name").value.trim();
        const password = document.getElementById("login-password").value.trim();

        const user = users.find(u => u.name === name && u.password === password);

        if (!user) {
            alert("Invalid login!");
            return;
        }

        currentUser = user;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        showDashboard();
    });

    function showDashboard() {
        authForms.style.display = "none";
        roleSelection.style.display = "none";
        mainHeader.style.display = "flex";

        if (currentUser.role === "customer") {
            cartBtn.style.display = "inline-block";
            customerPage.style.display = "block";
            supplierDashboard.style.display = "none";
            loadCustomerMenu();
            renderCustomerHistory();
            updateCartCount();
        } else {
            cartBtn.style.display = "none";
            customerPage.style.display = "none";
            supplierDashboard.style.display = "block";
            loadSupplierDashboard();
            updateAnalytics();
        }
    }

    if (currentUser) showDashboard();

    logoutBtn.addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem("currentUser");
        resetToRolePage();
    });

    // Search
    if (searchInput) {
        searchInput.addEventListener("input", () => loadCustomerMenu(searchInput.value));
    }

    // -------------------------------
    // CUSTOMER MENU
    // -------------------------------
    function loadCustomerMenu(searchTerm = "") {
        menuItems.innerHTML = "";

        let filtered = items;
        if (searchTerm.trim() !== "") {
            filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (filtered.length === 0) {
            menuItems.innerHTML = `<p style="color: rgba(255,255,255,0.7); text-align:center;">No items found.</p>`;
            return;
        }

        filtered.forEach(item => {
            const div = document.createElement("div");
            div.className = "menu-item";

            div.innerHTML = `
                <h3>${item.name}</h3>
                <p>${formatMoney(item.price)}</p>
                <button class="btn btn-primary">Order Now</button>
            `;

            div.querySelector("button").addEventListener("click", () => openOrderModal(item));
            menuItems.appendChild(div);
        });
    }

    // -------------------------------
    // ORDER MODAL
    // -------------------------------
    function openOrderModal(item) {
        currentOrderItem = item;

        selectedItemName.textContent = item.name;
        selectedItemPrice.textContent = formatMoney(item.price);

        orderForm.reset();
        orderQuantity.value = 1;

        orderPayment.value = "";
        qrBox.style.display = "none";
        paidConfirm.checked = false;

        if (paymentProof) paymentProof.value = "";

        upiIdText.textContent = UPI_ID;
        upiAmountText.textContent = formatMoney(item.price);

        orderModal.style.display = "block";
    }

    function updateOnlineAmount() {
        if (!currentOrderItem) return;
        const qty = parseInt(orderQuantity.value) || 1;
        const total = currentOrderItem.price * qty;
        upiAmountText.textContent = formatMoney(total);
    }

    orderQuantity.addEventListener("input", updateOnlineAmount);

    orderPayment.addEventListener("change", () => {
        if (orderPayment.value === "online") {
            qrBox.style.display = "block";
            updateOnlineAmount();
        } else {
            qrBox.style.display = "none";
            paidConfirm.checked = false;
            if (paymentProof) paymentProof.value = "";
        }
    });

    closeOrderModalBtn.addEventListener("click", () => orderModal.style.display = "none");
    closeCartBtn.addEventListener("click", () => cartModal.style.display = "none");

    // Submit order
    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const qty = parseInt(orderQuantity.value);
        const contact = orderContact.value.trim();
        const altContact = orderAltContact.value.trim();
        const address = orderAddress.value.trim();
        const payment = orderPayment.value;

        if (!qty || qty < 1 || !contact || !address || !payment) {
            showPopup(errorPopup, "❌ Fill all required fields.");
            return;
        }

        // ONLINE PAYMENT VALIDATION
        let proofBase64 = null;

        if (payment === "online") {
            if (!paidConfirm.checked) {
                alert("Please confirm: I have paid successfully");
                return;
            }

            if (!paymentProof || !paymentProof.files || paymentProof.files.length === 0) {
                alert("Please upload payment screenshot proof!");
                return;
            }

            const file = paymentProof.files[0];

            if (!file.type.startsWith("image/")) {
                alert("Only image files allowed!");
                return;
            }

            // Convert image to Base64 for localStorage
            proofBase64 = await fileToBase64(file);
        }

        const total = currentOrderItem.price * qty;

        const order = {
            id: Date.now(),
            itemId: currentOrderItem.id,
            itemName: currentOrderItem.name,
            quantity: qty,
            total: total,

            customerName: currentUser.name,
            customerContact: contact,
            customerAltContact: altContact,
            customerAddress: address,

            paymentMethod: payment,
            paymentConfirmed: payment === "online",
            upiId: payment === "online" ? UPI_ID : null,

            paymentProof: payment === "online" ? proofBase64 : null,
            paymentApproval: payment === "online" ? "pending" : "not_required",

            // IMPORTANT:
            // Online payment order must wait for approval
            status: payment === "online" ? "payment_pending" : "pending",

            createdAt: new Date().toISOString(),
            deliveredAt: null
        };

        orders.push(order);
        saveOrders();

        orderModal.style.display = "none";
        showPopup(successPopup, "✅ Order placed successfully!");

        updateCartCount();
        renderCartOrders();
        renderCustomerHistory();
        loadSupplierDashboard();
        updateAnalytics();
    });

    // -------------------------------
    // CART
    // -------------------------------
    cartBtn.addEventListener("click", () => {
        renderCartOrders();
        cartModal.style.display = "block";
    });

    function renderCartOrders() {
        cartOrders.innerHTML = "";

        const myOrders = orders
            .filter(o => o.customerName === currentUser.name)
            .sort((a, b) => b.id - a.id);

        const activeOrders = myOrders.filter(o =>
            o.status === "payment_pending" ||
            o.status === "pending" ||
            o.status === "preparing"
        );

        if (activeOrders.length === 0) {
            cartOrders.innerHTML = `<p style="color: rgba(255,255,255,0.7)">No active orders.</p>`;
            return;
        }

        activeOrders.forEach(order => {
            const div = document.createElement("div");
            div.className = "order";

            div.innerHTML = `
                <strong>Order ID: ${order.id}</strong> ${getOrderStatusBadge(order)}<br>
                Item: ${order.itemName}<br>
                Quantity: ${order.quantity}<br>
                Total: ${formatMoney(order.total)}<br>

                ${getTimelineHTML(order)}
                ${getInvoiceHTML(order)}

                <div class="actions">
                    ${order.status === "pending"
                        ? `<button class="btn btn-danger" onclick="cancelOrder(${order.id}, 'customer')">Cancel Order</button>`
                        : ""
                    }
                </div>
            `;

            cartOrders.appendChild(div);
        });
    }

    // -------------------------------
    // CUSTOMER HISTORY
    // -------------------------------
    function renderCustomerHistory() {
        orderHistory.innerHTML = "";

        const myOrders = orders
            .filter(o => o.customerName === currentUser.name)
            .sort((a, b) => b.id - a.id);

        const historyOrders = myOrders.filter(o =>
            o.status === "delivered" ||
            o.status === "cancelled" ||
            o.status === "payment_declined"
        );

        if (historyOrders.length === 0) {
            orderHistory.innerHTML = `<p style="color: rgba(255,255,255,0.7); text-align:center;">No history yet.</p>`;
            return;
        }

        historyOrders.forEach(order => {
            const div = document.createElement("div");
            div.className = "order";

            div.innerHTML = `
                <strong>Order ID: ${order.id}</strong> ${getOrderStatusBadge(order)}<br>
                Item: ${order.itemName}<br>
                Quantity: ${order.quantity}<br>
                Total: ${formatMoney(order.total)}<br>

                ${getTimelineHTML(order)}
                ${getInvoiceHTML(order)}
            `;

            orderHistory.appendChild(div);
        });
    }

    // -------------------------------
    // SUPPLIER DASHBOARD
    // -------------------------------
    function loadSupplierDashboard() {
        itemsList.innerHTML = "";
        ordersList.innerHTML = "";

        // Items
        items.forEach(item => {
            const li = document.createElement("li");
            li.className = "item";

            li.innerHTML = `
                <b>${item.name}</b> - ${formatMoney(item.price)}
                <div class="actions">
                    <button class="btn btn-secondary" onclick="editItemPrice(${item.id})">Edit Price</button>
                    <button class="btn btn-danger" onclick="deleteItem(${item.id})">Delete</button>
                </div>
            `;

            itemsList.appendChild(li);
        });

        // Orders
        const sortedOrders = [...orders].sort((a, b) => b.id - a.id);

        sortedOrders.forEach(order => {
            const li = document.createElement("li");
            li.className = "order";

            const proofHTML =
                (order.paymentMethod === "online" && order.paymentProof)
                    ? `
                        <div style="margin-top: 10px;">
                            <b style="color: #ffcc66;">Payment Proof Screenshot:</b><br>
                            <img src="${order.paymentProof}" class="proof-img" alt="Payment Proof">
                        </div>
                      `
                    : "";

            li.innerHTML = `
                <strong>Order ID: ${order.id}</strong> ${getOrderStatusBadge(order)}<br>
                Item: ${order.itemName}<br>
                Customer: ${order.customerName}<br>
                Contact: ${order.customerContact}<br>
                Address: ${order.customerAddress}<br>
                Quantity: ${order.quantity}<br>
                Total: ${formatMoney(order.total)}<br>
                Payment: ${order.paymentMethod === "online" ? "Online (UPI)" : order.paymentMethod}<br>

                ${getTimelineHTML(order)}
                ${proofHTML}

                <div class="actions">
                    ${order.status === "payment_pending"
                        ? `
                            <button class="btn btn-primary" onclick="approvePayment(${order.id})">Approve Payment</button>
                            <button class="btn btn-danger" onclick="declinePayment(${order.id})">Decline Payment</button>
                          `
                        : ""
                    }

                    ${order.status === "pending"
                        ? `
                            <button class="btn btn-secondary" onclick="setOrderStatus(${order.id}, 'preparing')">Mark Preparing</button>
                            <button class="btn btn-danger" onclick="cancelOrder(${order.id}, 'supplier')">Cancel</button>
                          `
                        : ""
                    }

                    ${order.status === "preparing"
                        ? `<button class="btn btn-primary" onclick="setOrderStatus(${order.id}, 'delivered')">Mark Delivered</button>`
                        : ""
                    }
                </div>
            `;

            ordersList.appendChild(li);
        });
    }

    // -------------------------------
    // SUPPLIER ACTIONS
    // -------------------------------
    window.approvePayment = function(orderId) {
        orders = orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    paymentApproval: "approved",
                    status: "pending",
                    paymentApprovedAt: new Date().toISOString()
                };
            }
            return o;
        });

        saveOrders();
        loadSupplierDashboard();
        renderCartOrders();
        renderCustomerHistory();
        updateCartCount();
        updateAnalytics();

        alert("Payment approved. Order moved to Pending.");
    };

    window.declinePayment = function(orderId) {
        const reason = prompt("Reason for decline (optional):") || "Payment declined";

        orders = orders.map(o => {
            if (o.id === orderId) {
                return {
                    ...o,
                    paymentApproval: "declined",
                    status: "payment_declined",
                    cancelledBy: "supplier",
                    cancelledReason: reason,
                    cancelledAt: new Date().toISOString()
                };
            }
            return o;
        });

        saveOrders();
        loadSupplierDashboard();
        renderCartOrders();
        renderCustomerHistory();
        updateCartCount();
        updateAnalytics();

        alert("Payment declined and order cancelled.");
    };

    // Add item
    addItemForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("item-name").value.trim();
        const price = parseFloat(document.getElementById("item-price").value);

        if (!name || !price || price <= 0) return;

        items.push({ id: Date.now(), name, price });
        saveItems();

        addItemForm.reset();
        loadSupplierDashboard();
        loadCustomerMenu(searchInput ? searchInput.value : "");
    });

    // Edit price
    window.editItemPrice = function(itemId) {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const newPrice = prompt(`Enter new price for "${item.name}" (₹):`, item.price);
        if (newPrice === null) return;

        const priceNum = parseFloat(newPrice);
        if (!priceNum || priceNum <= 0) {
            alert("Invalid price!");
            return;
        }

        item.price = priceNum;
        saveItems();

        loadSupplierDashboard();
        loadCustomerMenu(searchInput ? searchInput.value : "");
        alert("Price updated successfully!");
    };

    // Delete item
    window.deleteItem = function(itemId) {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const ok = confirm(`Delete "${item.name}" from menu?`);
        if (!ok) return;

        items = items.filter(i => i.id !== itemId);
        saveItems();

        // cancel orders
        orders = orders.map(o => {
            if (o.itemId === itemId && (
                o.status === "payment_pending" ||
                o.status === "pending" ||
                o.status === "preparing"
            )) {
                return {
                    ...o,
                    status: "cancelled",
                    cancelledBy: "supplier",
                    cancelledReason: "Item out of stock",
                    cancelledAt: new Date().toISOString()
                };
            }
            return o;
        });

        saveOrders();

        loadSupplierDashboard();
        loadCustomerMenu(searchInput ? searchInput.value : "");
        renderCartOrders();
        renderCustomerHistory();
        updateCartCount();
        updateAnalytics();
    };

    // Set status
    window.setOrderStatus = function(orderId, newStatus) {
        orders = orders.map(o => {
            if (o.id === orderId) {
                if (newStatus === "delivered") {
                    return { ...o, status: "delivered", deliveredAt: new Date().toISOString() };
                }
                return { ...o, status: newStatus };
            }
            return o;
        });

        saveOrders();
        loadSupplierDashboard();
        renderCartOrders();
        renderCustomerHistory();
        updateCartCount();
        updateAnalytics();
    };

    // Cancel order
    window.cancelOrder = function(orderId, byRole) {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Customer can cancel only pending
        if (byRole === "customer" && order.status !== "pending") {
            alert("Customer can cancel only while Pending.");
            return;
        }

        // Supplier can cancel pending/preparing
        if (byRole === "supplier" && !(order.status === "pending" || order.status === "preparing")) {
            alert("Supplier cannot cancel now.");
            return;
        }

        const ok = confirm("Are you sure to cancel?");
        if (!ok) return;

        orders = orders.map(o => {
            if (o.id === orderId) {
                return { ...o, status: "cancelled", cancelledBy: byRole };
            }
            return o;
        });

        saveOrders();
        loadSupplierDashboard();
        renderCartOrders();
        renderCustomerHistory();
        updateCartCount();
        updateAnalytics();
    };

    // Analytics
    function updateAnalytics() {
        if (!currentUser || currentUser.role !== "supplier") return;

        statTotalOrders.textContent = orders.length;

        const delivered = orders.filter(o => o.status === "delivered");
        statDelivered.textContent = delivered.length;

        const cancelled = orders.filter(o => o.status === "cancelled" || o.status === "payment_declined").length;
        statCancelled.textContent = cancelled;

        const revenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);
        statRevenue.textContent = formatMoney(revenue);
    }

});
