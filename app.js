// Utility functions
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Cache DOM elements
const elements = {
    siteUrl: document.getElementById('siteUrl'),
    consumerKey: document.getElementById('consumerKey'),
    consumerSecret: document.getElementById('consumerSecret'),
    amountFilter: document.getElementById('amountFilter'),
    amountValue: document.getElementById('amountValue'),
    dateFilter: document.getElementById('dateFilter'),
    dateFilterType: document.getElementById('dateFilterType'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    customDateRange: document.getElementById('customDateRange'),
    orderStatus: document.getElementById('orderStatus'),
    cityFilter: document.getElementById('cityFilter'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    progressPercent: document.getElementById('progressPercent'),
    totalOrders: document.getElementById('totalOrders'),
    ordersList: document.getElementById('ordersList'),
    cartModal: document.getElementById('cartModal'),
    modalTitle: document.getElementById('modalTitle'),
    cartItemsContent: document.getElementById('cartItemsContent'),
    closeModal: document.getElementById('closeModal')
};

// Store all orders for client-side filtering
let allOrdersData = [];

// Event Listeners
document.getElementById('fetchOrders').addEventListener('click', fetchOrders);
document.getElementById('exportJSON').addEventListener('click', exportToJSON);
document.getElementById('exportExcel').addEventListener('click', exportToExcel);
document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
document.getElementById('clearFilters').addEventListener('click', clearFilters);

// Modal event listeners
elements.closeModal.addEventListener('click', closeCartModal);
elements.cartModal.addEventListener('click', (e) => {
    if (e.target === elements.cartModal) {
        closeCartModal();
    }
});

// Add real-time filtering
elements.cityFilter.addEventListener('input', debounce(applyFilters, 300));
elements.amountFilter.addEventListener('change', applyFilters);
elements.amountValue.addEventListener('input', debounce(applyFilters, 300));
elements.orderStatus.addEventListener('change', applyFilters);
elements.dateFilter.addEventListener('change', applyFilters);

// New date range event listeners
elements.dateFilterType.addEventListener('change', toggleDateRangeInputs);
elements.startDate.addEventListener('change', applyFilters);
elements.endDate.addEventListener('change', applyFilters);

// Function to toggle between preset and custom date ranges
function toggleDateRangeInputs() {
    const isCustom = elements.dateFilterType.value === 'custom';
    elements.customDateRange.classList.toggle('hidden', !isCustom);
    elements.dateFilter.classList.toggle('hidden', isCustom);

    if (isCustom) {
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        elements.endDate.value = endDate.toISOString().split('T')[0];
        elements.startDate.value = startDate.toISOString().split('T')[0];
    }

    applyFilters();
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
}

function clearFilters() {
    elements.cityFilter.value = '';
    elements.amountFilter.value = 'all';
    elements.amountValue.value = '';
    elements.orderStatus.value = '';
    elements.dateFilterType.value = 'preset';
    elements.dateFilter.value = '12';
    elements.startDate.value = '';
    elements.endDate.value = '';
    elements.customDateRange.classList.add('hidden');
    elements.dateFilter.classList.remove('hidden');
    applyFilters();
}

function updateProgress(current, total, message = null) {
    elements.progressContainer.classList.remove('hidden');

    if (total > 0) {
        const percentage = Math.round((current / total) * 100);
        elements.progressBar.style.width = `${percentage}%`;
        elements.progressText.textContent = message || `Processing: ${current} of ${total} orders`;
        elements.progressPercent.textContent = `${percentage}%`;
    } else {
        elements.progressText.textContent = message || `Retrieved: ${current} orders`;
        elements.progressPercent.textContent = '0%';
    }
}

// Modal functions
function openCartModal(orderId, customerName, cartItems) {
    elements.modalTitle.textContent = `Cart Items - Order #${orderId} (${customerName})`;
    elements.cartItemsContent.innerHTML = renderCartItems(cartItems);
    elements.cartModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCartModal() {
    elements.cartModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function renderCartItems(items) {
    if (!items || items.length === 0) {
        return '<p class="text-gray-500 dark:text-gray-400 text-center py-8">No items found in this order.</p>';
    }

    return items.map(item => `
 <div class="border dark:border-gray-700 rounded-lg p-4 mb-4 bg-gray-50 dark:bg-gray-700">
 <div class="flex justify-between items-start mb-2">
 <h3 class="font-semibold text-lg text-gray-800 dark:text-gray-200">${item.name}</h3>
 <span class="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">ID: ${item.product_id}</span>
 </div>
 <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
 <div>
 <span class="font-medium text-gray-600 dark:text-gray-400">Quantity:</span>
 <span class="text-gray-800 dark:text-gray-200">${item.quantity}</span>
 </div>
 <div>
 <span class="font-medium text-gray-600 dark:text-gray-400">Unit Price:</span>
 <span class="text-gray-800 dark:text-gray-200">$${parseFloat(item.price || 0).toFixed(2)}</span>
 </div>
 <div>
 <span class="font-medium text-gray-600 dark:text-gray-400">Total:</span>
 <span class="text-gray-800 dark:text-gray-200">$${parseFloat(item.total || 0).toFixed(2)}</span>
 </div>
 ${item.sku ? `
 <div>
 <span class="font-medium text-gray-600 dark:text-gray-400">SKU:</span>
 <span class="text-gray-800 dark:text-gray-200">${item.sku}</span>
 </div>
 ` : ''}
 ${item.variation_id && item.variation_id !== 0 ? `
 <div>
 <span class="font-medium text-gray-600 dark:text-gray-400">Variation ID:</span>
 <span class="text-gray-800 dark:text-gray-200">${item.variation_id}</span>
 </div>
 ` : ''}
 </div>
 ${item.meta_data && item.meta_data.length > 0 ? `
 <div class="mt-3 pt-3 border-t dark:border-gray-600">
 <h4 class="font-medium text-gray-600 dark:text-gray-400 mb-2">Additional Information:</h4>
 <div class="space-y-1">
 ${item.meta_data.map(meta => {
        if (meta.display_key && meta.display_value) {
            return `<div class="text-sm">
 <span class="font-medium">${meta.display_key}:</span>
 <span class="text-gray-800 dark:text-gray-200">${meta.display_value}</span>
 </div>`;
        }
        return '';
    }).join('')}
 </div>
 </div>
 ` : ''}
 </div>
 `).join('');
}

// Updated API fetching with custom date range support
async function getAllOrders() {
    const { siteUrl, consumerKey, consumerSecret, dateFilterType, dateFilter, startDate, endDate } = elements;

    if (!siteUrl.value || !consumerKey.value || !consumerSecret.value) {
        throw new Error('Please fill in all API credentials');
    }

    const API_URL = `${siteUrl.value.replace(/\/$/, '')}/wp-json/wc/v3/orders`;
    const PER_PAGE = 50;
    let page = 1;
    let allOrders = [];
    let hasMore = true;

    // Calculate date filter for API
    let dateAfter, dateBefore;

    if (dateFilterType.value === 'custom') {
        if (startDate.value && endDate.value) {
            dateAfter = new Date(startDate.value);
            dateBefore = new Date(endDate.value);
            dateBefore.setHours(23, 59, 59, 999); // End of day
        } else {
            throw new Error('Please select both start and end dates for custom range');
        }
    } else {
        dateAfter = new Date();
        dateAfter.setMonth(dateAfter.getMonth() - parseInt(dateFilter.value));
        dateBefore = new Date(); // Current date
    }

    try {
        while (hasMore) {
            const params = new URLSearchParams({
                consumer_key: consumerKey.value,
                consumer_secret: consumerSecret.value,
                per_page: PER_PAGE,
                page: page,
                after: dateAfter.toISOString(),
                before: dateBefore.toISOString(),
                orderby: 'date',
                order: 'desc'
            });

            const response = await fetch(`${API_URL}?${params}`);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const orders = await response.json();

            if (orders.length === 0) {
                hasMore = false;
            } else {
                const processedOrders = await processOrdersWithItems(orders, page);
                allOrders = [...allOrders, ...processedOrders];
                updateProgress(allOrders.length, null, `Retrieved: ${allOrders.length} orders with cart items`);
                page++;
                await sleep(100);
            }
        }

        return allOrders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
}

// Process orders and add line items
async function processOrdersWithItems(orders, pageNum) {
    const processedOrders = [];

    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        updateProgress(i + 1, orders.length, `Page ${pageNum}: Processing order ${i + 1}/${orders.length}`);

        order.line_items = order.line_items || [];
        processedOrders.push(order);

        if (i % 10 === 0 && i > 0) {
            await sleep(50);
        }
    }

    return processedOrders;
}

// Optimized filtering functions
function filterOrderByAmount(order, filterType, value) {
    if (filterType === 'all' || !value) return true;

    const orderTotal = parseFloat(order.total);
    const filterValue = parseFloat(value);

    switch (filterType) {
        case 'equals': return Math.abs(orderTotal - filterValue) < 0.01;
        case 'greater': return orderTotal > filterValue;
        case 'less': return orderTotal < filterValue;
        default: return true;
    }
}

// Updated filterOrdersByDate function to handle custom date ranges
function filterOrdersByDate(orders) {
    const { dateFilterType, dateFilter, startDate, endDate } = elements;

    let startFilterDate, endFilterDate;

    if (dateFilterType.value === 'custom') {
        if (!startDate.value || !endDate.value) {
            return orders; // Return all if custom dates not set
        }
        startFilterDate = new Date(startDate.value);
        endFilterDate = new Date(endDate.value);
        endFilterDate.setHours(23, 59, 59, 999); // End of day
    } else {
        endFilterDate = new Date();
        startFilterDate = new Date();
        startFilterDate.setMonth(startFilterDate.getMonth() - parseInt(dateFilter.value));
    }

    return orders.filter(order => {
        const orderDate = new Date(order.date_created);
        return orderDate >= startFilterDate && orderDate <= endFilterDate;
    });
}

function filterOrdersByStatus(orders, selectedStatus) {
    if (!selectedStatus) return orders;
    return orders.filter(order => order.status === selectedStatus);
}

function filterOrdersByCity(orders, cityFilter) {
    if (!cityFilter) return orders;
    return orders.filter(order => {
        const city = order.billing?.city || '';
        return city.toLowerCase().includes(cityFilter.toLowerCase());
    });
}

function applyFilters() {
    if (allOrdersData.length === 0) return;

    let filteredOrders = [...allOrdersData];

    // Apply all filters
    filteredOrders = filterOrdersByCity(filteredOrders, elements.cityFilter.value);
    filteredOrders = filterOrdersByStatus(filteredOrders, elements.orderStatus.value);
    filteredOrders = filterOrdersByDate(filteredOrders);
    filteredOrders = filteredOrders.filter(order =>
        filterOrderByAmount(order, elements.amountFilter.value, elements.amountValue.value)
    );

    displayOrders(filteredOrders);
}

function displayOrders(orders) {
    elements.totalOrders.textContent = `Total Orders: ${orders.length}`;
    elements.ordersList.innerHTML = '';

    orders.forEach(order => {
        const orderDiv = createOrderElement(order);
        elements.ordersList.appendChild(orderDiv);
    });
}

function createOrderElement(order) {
    const orderDiv = document.createElement('div');
    orderDiv.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow';

    const orderDate = new Date(order.date_created).toLocaleDateString();
    const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
    const customerName = `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim();
    const itemsCount = order.line_items ? order.line_items.length : 0;

    orderDiv.innerHTML = `
 <div class="text-gray-800 dark:text-gray-200">
 <div class="flex justify-between items-start mb-2">
 <p class="font-bold text-lg">Name: ${customerName}</p>
 <span class="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Order #${order.id}</span>
 </div>
 <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
 <p><span class="font-medium">Amount:</span> $${parseFloat(order.total).toFixed(2)}</p>
 <p><span class="font-medium">Phone:</span> ${order.billing?.phone || 'Not provided'}</p>
 <p><span class="font-medium">City:</span> ${order.billing?.city || 'Not provided'}</p>
 <p><span class="font-medium">State:</span> ${order.billing?.state || 'Not provided'}</p>
 <p><span class="font-medium">Date:</span> ${orderDate}</p>
 <p><span class="font-medium">Status:</span> ${statusText}</p>
 <p><span class="font-medium">Items:</span> ${itemsCount} item${itemsCount !== 1 ? 's' : ''}</p>
 </div>
 ${order.billing?.address_1 ? `<p class="mt-2 text-sm"><span class="font-medium">Address:</span> ${order.billing.address_1}</p>` : ''}
 <div class="mt-3 pt-3 border-t dark:border-gray-600">
 <button class="view-cart-btn bg-indigo-500 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-3 rounded transition-colors" 
 data-order-id="${order.id}" 
 data-customer-name="${customerName}">
 View Cart Items (${itemsCount})
 </button>
 </div>
 </div>
 `;

    // Add event listener for cart items button
    const viewCartBtn = orderDiv.querySelector('.view-cart-btn');
    viewCartBtn.addEventListener('click', () => {
        openCartModal(order.id, customerName, order.line_items || []);
    });

    return orderDiv;
}

async function fetchOrders() {
    try {
        elements.progressContainer.classList.remove('hidden');
        elements.ordersList.innerHTML = '';
        elements.totalOrders.textContent = 'Fetching orders...';

        allOrdersData = await getAllOrders();
        applyFilters();

    } catch (error) {
        elements.totalOrders.textContent = `Error: ${error.message}`;
        console.error('Error:', error);
    } finally {
        elements.progressContainer.classList.add('hidden');
    }
}

function getDisplayedOrdersData() {
    return Array.from(elements.ordersList.children).map(div => {
        const nameElement = div.querySelector('.font-bold');
        const orderIdElement = div.querySelector('.bg-blue-100, .dark\\:bg-blue-900');
        const textElements = Array.from(div.querySelectorAll('p')).slice(1);

        const name = nameElement.textContent.replace('Name: ', '');
        const orderId = orderIdElement.textContent.replace('Order #', '');

        const amount = textElements[0].textContent.replace('Amount: $', '');
        const phone = textElements[1].textContent.replace('Phone: ', '');
        const city = textElements[2].textContent.replace('City: ', '');
        const state = textElements[3].textContent.replace('State: ', '');
        const date = textElements[4].textContent.replace('Date: ', '');
        const status = textElements[5].textContent.replace('Status: ', '');
        const items = textElements[6].textContent.replace('Items: ', '');

        const orderData = allOrdersData.find(order => order.id.toString() === orderId);

        return {
            orderId,
            name,
            amount: parseFloat(amount) || 0,
            phone,
            city,
            state,
            date,
            status,
            items,
            cartItems: orderData ? orderData.line_items : []
        };
    });
}

function exportToJSON() {
    const orders = getDisplayedOrdersData();
    if (orders.length === 0) {
        alert('No orders to export');
        return;
    }

    const jsonString = JSON.stringify(orders, null, 2);
    downloadFile(jsonString, 'application/json', 'woocommerce_orders.json');
}

function exportToExcel() {
    const orders = getDisplayedOrdersData();
    if (orders.length === 0) {
        alert('No orders to export');
        return;
    }

    const ordersData = orders.map(order => {
        let cartItemsString = '';
        if (order.cartItems && order.cartItems.length > 0) {
            cartItemsString = order.cartItems.map(item =>
                `${item.name} (${item.quantity}x)`
            ).join(' | ');
        }

        return {
            'Order ID': order.orderId,
            'Customer Name': order.name,
            'Amount': `${order.amount}`,
            'Phone': order.phone,
            'City': order.city,
            'State': order.state,
            'Date': order.date,
            'Status': order.status,
            'Items Count': order.items.replace(' items', '').replace(' item', ''),
            'Cart Items (Name & Quantity)': cartItemsString || 'No items'
        };
    });

    const cartItemsData = [];
    orders.forEach(order => {
        if (order.cartItems && order.cartItems.length > 0) {
            order.cartItems.forEach(item => {
                cartItemsData.push({
                    'Order ID': order.orderId,
                    'Customer Name': order.name,
                    'Product ID': item.product_id,
                    'Product Name': item.name,
                    'Quantity': item.quantity,
                    'Unit Price': `${parseFloat(item.price || 0).toFixed(2)}`,
                    'Total Price': `${parseFloat(item.total || 0).toFixed(2)}`,
                    'SKU': item.sku || 'N/A',
                    'Variation ID': item.variation_id && item.variation_id !== 0 ? item.variation_id : 'N/A'
                });
            });
        }
    });

    const wb = XLSX.utils.book_new();

    const ordersWS = XLSX.utils.json_to_sheet(ordersData);

    const ordersRange = XLSX.utils.decode_range(ordersWS['!ref']);
    const ordersColWidths = [];
    for (let C = ordersRange.s.c; C <= ordersRange.e.c; ++C) {
        let maxWidth = 10;
        for (let R = ordersRange.s.r; R <= ordersRange.e.r; ++R) {
            const cell = ordersWS[XLSX.utils.encode_cell({ r: R, c: C })];
            if (cell && cell.v) {
                const cellLength = cell.v.toString().length;
                maxWidth = Math.max(maxWidth, Math.min(cellLength + 2, 50));
            }
        }
        ordersColWidths.push({ wch: maxWidth });
    }
    ordersWS['!cols'] = ordersColWidths;

    XLSX.utils.book_append_sheet(wb, ordersWS, 'Orders Summary');

    if (cartItemsData.length > 0) {
        const cartItemsWS = XLSX.utils.json_to_sheet(cartItemsData);

        const cartRange = XLSX.utils.decode_range(cartItemsWS['!ref']);
        const cartColWidths = [];
        for (let C = cartRange.s.c; C <= cartRange.e.c; ++C) {
            let maxWidth = 10;
            for (let R = cartRange.s.r; R <= cartRange.e.r; ++R) {
                const cell = cartItemsWS[XLSX.utils.encode_cell({ r: R, c: C })];
                if (cell && cell.v) {
                    const cellLength = cell.v.toString().length;
                    maxWidth = Math.max(maxWidth, Math.min(cellLength + 2, 40));
                }
            }
            cartColWidths.push({ wch: maxWidth });
        }
        cartItemsWS['!cols'] = cartColWidths;

        XLSX.utils.book_append_sheet(wb, cartItemsWS, 'Detailed Cart Items');
    }

    XLSX.writeFile(wb, 'woocommerce_orders_with_items.xlsx');
}

function downloadFile(content, type, filename) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Initialize theme
if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.remove('dark');
}

// Save theme preference
document.getElementById('toggleTheme').addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.cartModal.classList.contains('hidden')) {
        closeCartModal();
    }
});