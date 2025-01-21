# WooCommerce Order Phone Number Fetcher

A simple web application that allows you to fetch WooCommerce orders and their associated phone numbers based on order amounts.

## Features

- 🔍 Filter orders by exact amount, greater than, or less than
- 🌐 Works with any WooCommerce site
- 📱 Displays customer phone numbers for matching orders
- 💾 Export results to JSON or Excel
- 🌙 Dark/Light theme toggle
- 📊 Progress indicator for large order sets

## Setup

1. Clone this repository
2. Open `index.html` in your web browser
3. Enter your WooCommerce site details:
   - Site URL
   - Consumer Key
   - Consumer Secret

## How to Get WooCommerce API Keys

1. Go to your WordPress admin panel
2. Navigate to WooCommerce > Settings > Advanced > REST API
3. Click "Add Key"
4. Give it a description
5. Set permissions to "Read"
6. Generate API keys

## Usage

1. Enter your site URL and API credentials
2. Select the filter type (equals, greater than, less than)
3. Enter the amount to filter by
4. Click "Fetch Orders" to retrieve matching orders
5. Use export buttons to download results in JSON or Excel format

## Security Note

Keep your API credentials secure and never share them publicly.

## Technologies Used

- HTML5
- Tailwind CSS
- JavaScript
- SheetJS (for Excel export)
- WooCommerce REST API

## License

MIT License

## Contributing

Feel free to open issues or submit pull requests to improve the application.