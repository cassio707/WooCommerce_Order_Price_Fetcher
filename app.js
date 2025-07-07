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
    orderStatus: document.getElementById('orderStatus'),
    cityFilter: document.getElementById('cityFilter'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),
    progressPercent: document.getElementById('progressPercent'),
    totalOrders: document.getElementById('totalOrders'),
    ordersList: document.getElementById('ordersList')
};

// Store all orders for client-side filtering
let allOrdersData = [];

// Event Listeners
document.getElementById('fetchOrders').addEventListener('click', fetchOrders);
document.getElementById('exportJSON').addEventListener('click', exportToJSON);
document.getElementById('exportExcel').addEventListener('click', exportToExcel);
document.getElementById('toggleTheme').addEventListener('click', toggleTheme);
document.getElementById('clearFilters').addEventListener('click', clearFilters);

// Add real-time filtering
elements.cityFilter.addEventListener('input', debounce(applyFilters, 300));
elements.amountFilter.addEventListener('change', applyFilters);
elements.amountValue.addEventListener('input', debounce(applyFilters, 300));
elements.orderStatus.addEventListener('change', applyFilters);
elements.dateFilter.addEventListener('change', applyFilters);

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
}

function clearFilters() {
    elements.cityFilter.value = '';
    elements.amountFilter.value = 'all';
    elements.amountValue.value = '';
    elements.orderStatus.value = '';
    elements.dateFilter.value = '12';
    applyFilters();
}

function updateProgress(current, total) {
    elements.progressContainer.classList.remove('hidden');

    if (total > 0) {
        const percentage = Math.round((current / total) * 100);
        elements.progressBar.style.width = `${percentage}%`;
        elements.progressText.textContent = `Processing: ${current} of ${total} orders`;
        elements.progressPercent.textContent = `${percentage}%`;
    } else {
        elements.progressText.textContent = `Retrieved: ${current} orders`;
        elements.progressPercent.textContent = '0%';
    }
}

// Optimized API fetching with proper error handling
async function getAllOrders() {
    const { siteUrl, consumerKey, consumerSecret, dateFilter } = elements;

    if (!siteUrl.value || !consumerKey.value || !consumerSecret.value) {
        throw new Error('Please fill in all API credentials');
    }

    const API_URL = `${siteUrl.value.replace(/\/$/, '')}/wp-json/wc/v3/orders`;
    const PER_PAGE = 50; // Reduced for better performance
    let page = 1;
    let allOrders = [];
    let hasMore = true;

    // Calculate date filter for API
    const dateAfter = new Date();
    dateAfter.setMonth(dateAfter.getMonth() - parseInt(dateFilter.value));

    try {
        while (hasMore) {
            const params = new URLSearchParams({
                consumer_key: consumerKey.value,
                consumer_secret: consumerSecret.value,
                per_page: PER_PAGE,
                page: page,
                after: dateAfter.toISOString(),
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
                allOrders = [...allOrders, ...orders];
                updateProgress(allOrders.length, null);
                page++;

                // Rate limiting
                await sleep(100);
            }

            // Safety check to prevent infinite loops
            if (page > 100) {
                console.warn('Too many pages, stopping fetch');
                break;
            }
        }

        return allOrders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
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

function filterOrdersByDate(orders, monthsAgo) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);

    return orders.filter(order => {
        const orderDate = new Date(order.date_created);
        return orderDate >= cutoffDate;
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
    filteredOrders = filterOrdersByDate(filteredOrders, parseInt(elements.dateFilter.value));
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

    orderDiv.innerHTML = `
                <div class="text-gray-800 dark:text-gray-200">
                    <div class="flex justify-between items-start mb-2">
                        <p class="font-bold text-lg">Name: ${order.billing?.first_name || ''} ${order.billing?.last_name || ''}</p>
                        <span class="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">Order #${order.id}</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <p><span class="font-medium">Amount:</span> $${parseFloat(order.total).toFixed(2)}</p>
                        <p><span class="font-medium">Phone:</span> ${order.billing?.phone || 'Not provided'}</p>
                        <p><span class="font-medium">City:</span> ${order.billing?.city || 'Not provided'}</p>
                        <p><span class="font-medium">State:</span> ${order.billing?.state || 'Not provided'}</p>
                        <p><span class="font-medium">Date:</span> ${orderDate}</p>
                        <p><span class="font-medium">Status:</span> ${statusText}</p>
                    </div>
                    ${order.billing?.address_1 ? `<p class="mt-2 text-sm"><span class="font-medium">Address:</span> ${order.billing.address_1}</p>` : ''}
                </div>
            `;
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
        const textElements = Array.from(div.querySelectorAll('p')).slice(1); // Skip the name element

        const name = nameElement.textContent.replace('Name: ', '');
        const orderId = orderIdElement.textContent.replace('Order #', '');

        const amount = textElements[0].textContent.replace('Amount: $', '');
        const phone = textElements[1].textContent.replace('Phone: ', '');
        const city = textElements[2].textContent.replace('City: ', '');
        const state = textElements[3].textContent.replace('State: ', '');
        const date = textElements[4].textContent.replace('Date: ', '');
        const status = textElements[5].textContent.replace('Status: ', '');

        return {
            orderId,
            name,
            amount: parseFloat(amount) || 0,
            phone,
            city,
            state,
            date,
            status
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

    const ws = XLSX.utils.json_to_sheet(orders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    XLSX.writeFile(wb, 'woocommerce_orders.xlsx');
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
