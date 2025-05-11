# Bitcoin DCA vs Lump Sum CAGR Dashboard

This is a fully interactive web-based dashboard that compares two popular Bitcoin investment strategies:  
**Dollar Cost Averaging (DCA)** vs **Lump Sum Investing**.  
It analyzes each strategy using real historical Bitcoin price data and visualizes the **Compound Annual Growth Rate (CAGR)** spread between them.

## 🔍 Features

- 📈 **Dynamic CAGR Calculations**  
  Automatically calculates CAGR for both DCA and Lump Sum strategies over selected timeframes.

- 📅 **Flexible Date Range Selection**  
  Choose from preset ranges (1–10 years) or select a custom date interval.

- 💵 **Adjustable Investment Settings**  
  Define total investment amount and DCA frequency (daily, weekly, or monthly).

- 📊 **Live Visualizations**  
  - BTC Price History chart  
  - DCA vs Lump Sum Performance chart  
  - Real-time UI updates as you change inputs

- 🎯 **Strategy Recommendation Engine**  
  Determines which strategy outperformed historically and by how much.

- 🌐 **Responsive Design**  
  Optimized for desktop and mobile with a clean dark-themed UI.

## 🖼️ Dashboard Preview

![Bitcoin CAGR Dashboard](bitcoin-cagr-spread.png)

## 🛠️ Tech Stack

- **HTML/CSS**: Custom responsive layout and styling  
- **JavaScript**: Core logic and interactivity  
- **Chart.js**: Interactive chart rendering  
- **Mempool.space API**: Historical Bitcoin price data with fallback handling

## 📂 Project Structure

/
├── index.html # Main HTML file
├── style.css # Styling for dashboard
├── main.js # JavaScript logic and API handling
├── bitcoin-cagr-spread.png # Dashboard screenshot


## ⚡ Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/cagr-spread.git
cd cagr-spread

2. Open index.html in your browser.

⚠️ No server setup required – this is a fully client-side tool.

## 🚀 Future Enhancements

- Export performance data as CSV
- Toggle fiat currency (USD, EUR, etc.)
- Deeper backtest metrics like max drawdown, volatility, etc.

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss your ideas.
