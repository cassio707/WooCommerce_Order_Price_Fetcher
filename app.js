// App.js

// Add these utility functions at the top
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const chunks = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

// Event Listeners
document.getElementById('fetchOrders').addEventListener('click', fetchOrders);
document.getElementById('exportJSON').addEventListener('click', exportToJSON);
document.getElementById('exportExcel').addEventListener('click', exportToExcel);
document.getElementById('toggleTheme').addEventListener('click', toggleTheme);

// Add the date filter function
function filterOrdersByDate(orders, monthsAgo) {
    const today = new Date();
    const cutoffDate = new Date(today.setMonth(today.getMonth() - monthsAgo));

    return orders.filter(order => {
        const orderDate = new Date(order.date_created);
        return orderDate >= cutoffDate;
    });
}

function toggleTheme() {
    document.documentElement.classList.toggle('dark');
}

async function getAllOrders() {
    const siteUrl = document.getElementById('siteUrl').value;
    const consumer_key = document.getElementById('consumerKey').value;
    const consumer_secret = document.getElementById('consumerSecret').value;
    const amountFilter = document.getElementById('amountFilter').value;
    const amountValue = parseFloat(document.getElementById('amountValue').value);
    const dateFilterValue = parseInt(document.getElementById('dateFilter').value); // Get the date filter value

    if (!siteUrl || !consumer_key || !consumer_secret) {
        throw new Error('Please fill in all API credentials');
    }

    const API_URL = `${siteUrl}/wp-json/wc/v3/orders`;
    const BATCH_SIZE = 10;
    const PER_PAGE = 100;
    let allOrders = [];

    try {
        const countResponse = await fetch(`${API_URL}?consumer_key=${consumer_key}&consumer_secret=${consumer_secret}`);
        const totalOrders = parseInt(countResponse.headers.get('X-WP-Total')) || 0;
        const totalPages = Math.ceil(totalOrders / PER_PAGE);
        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
        const pageChunks = chunks(pageNumbers, BATCH_SIZE);

        updateProgress(0, totalOrders);

        for (const chunk of pageChunks) {
            const promises = chunk.map(page => 
                fetch(`${API_URL}?consumer_key=${consumer_key}&consumer_secret=${consumer_secret}&page=${page}&per_page=${PER_PAGE}`)
                    .then(response => response.json())
            );

            const results = await Promise.all(promises);
            const newOrders = results.flat().filter(order => 
                filterOrderByAmount(order, amountFilter, amountValue)
            );
            
            // Apply the date filter
            const filteredOrders = filterOrdersByDate(newOrders, dateFilterValue);
            allOrders = [...allOrders, ...filteredOrders];
            
            updateProgress(allOrders.length, totalOrders);
            await sleep(100);
        }

        return allOrders;
    } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
    }
}

function filterOrderByAmount(order, filterType, value) {
    const orderTotal = parseFloat(order.total);
    switch(filterType) {
        case 'equals': return orderTotal === value;
        case 'greater': return orderTotal > value;
        case 'less': return orderTotal < value;
        default: return true;
    }
}

function updateProgress(current, total) {
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressContainer.classList.remove('hidden');
    
    if (total) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `Processing: ${current}/${total} orders`;
    } else {
        progressText.textContent = `Retrieved: ${current} orders`;
    }
}

async function fetchOrders() {
    const progressContainer = document.getElementById('progressContainer');
    const totalOrdersElement = document.getElementById('totalOrders');
    const ordersListElement = document.getElementById('ordersList');

    try {
        progressContainer.classList.remove('hidden');
        ordersListElement.innerHTML = '';
        totalOrdersElement.innerHTML = 'Fetching orders...';

        const allOrders = await getAllOrders();

        totalOrdersElement.textContent = `Total Orders: ${allOrders.length}`;

        allOrders.forEach(order => {
            const orderDiv = document.createElement('div');
            orderDiv.className = 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow';
            orderDiv.innerHTML = `
                <div class="text-gray-800 dark:text-gray-200">
                    <p class="font-bold">Name: ${order.billing.first_name} ${order.billing.last_name}</p>
                    <p class="mt-2">Amount: $${order.total}</p>
                    <p class="mt-2">Phone: ${order.billing.phone}</p>
                </div>
            `;
            ordersListElement.appendChild(orderDiv);
        });
    } catch (error) {
        totalOrdersElement.innerHTML = `Error: ${error.message}`;
        console.error('Error:', error);
    } finally {
        progressContainer.classList.add('hidden');
    }
}

// فیلتر بر اساس وضعیت سفارش
function filterOrdersByStatus(orders, selectedStatus) {
    if (!selectedStatus) return orders;
    return orders.filter(order => order.status === selectedStatus);
}


// Replace the export functions
function getOrdersData() {
    const orders = Array.from(document.getElementById('ordersList').children).map(div => {
        const nameElem = div.querySelector('.text-gray-800.dark\\:text-gray-200 p.font-bold');
        const amountElem = div.querySelector('.text-gray-800.dark\\:text-gray-200 p:nth-child(2)');
        const phoneElem = div.querySelector('.text-gray-800.dark\\:text-gray-200 p:nth-child(3)');

        const orderDate = new Date().toISOString().split('T')[0]; // Adding current date to each order
        
        return {
            name: nameElem ? nameElem.textContent.replace('Name: ', '') : '',
            amount: amountElem ? parseFloat(amountElem.textContent.replace('Amount: $', '')) : 0,
            phone: phoneElem ? phoneElem.textContent.replace('Phone: ', '') : '',
            date: orderDate // Include the date field
        };
    });
    return orders;
}

function exportToJSON() {
    const orders = getOrdersData();
    if (orders.length === 0) {
        alert('No orders to export');
        return;
    }

    const jsonString = JSON.stringify(orders, null, 2);
    downloadFile(jsonString, 'application/json', 'woocommerce_orders.json');
}

function exportToExcel() {
    const orders = getOrdersData();
    if (orders.length === 0) {
        alert('No orders to export');
        return;
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(orders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    
    // Save file
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
