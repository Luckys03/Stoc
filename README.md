# Stock Price Prediction Web Application

A sophisticated web application that leverages machine learning to predict stock prices using Random Forest regression and provides interactive visualizations for financial data analysis.

## 🚀 Features

- **Real-time Stock Data**: Fetches live and historical stock data using Yahoo Finance API (yfinance)
- **Machine Learning Predictions**: Uses Random Forest regression model with technical indicators for accurate price predictions
- **Interactive Visualizations**: Dynamic charts using Plotly with historical prices, moving averages, and prediction trends
- **Technical Analysis**: Calculates and displays SMA (Simple Moving Average), volatility, and returns
- **Data Caching**: Implements intelligent caching to reduce API calls and improve performance
- **User-friendly Interface**: Clean, responsive web design with intuitive stock selection
- **Performance Metrics**: Provides model accuracy metrics including R², MSE, and RMSE
- **Flexible Prediction Period**: Supports predictions from 1 to 30 days

## 📊 How It Works

1. **Data Collection**: Fetches 2 years of historical stock data for comprehensive analysis
2. **Feature Engineering**: Creates technical indicators including:
   - Daily returns
   - 5-day and 20-day Simple Moving Averages (SMA)
   - 20-day volatility (annualized)
3. **Model Training**: Uses Random Forest regression with 100 estimators and optimized hyperparameters
4. **Prediction**: Generates future price predictions based on learned patterns
5. **Visualization**: Displays historical data alongside predicted trends with confidence metrics

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd stock
   ```

2. **Create and activate virtual environment** (recommended):
   ```bash
   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   
   # macOS/Linux
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration** (optional):
   Create a `.env` file in the root directory:
   ```
   FLASK_SECRET_KEY=your_secret_key_here
   FLASK_DEBUG=True
   PORT=5000
   ```

5. **Run the application**:
   ```bash
   python app.py
   ```

6. **Access the application**:
   Open your web browser and navigate to `http://localhost:5000`

## 📁 Project Structure

```
stock/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── .env                  # Environment variables (create this)
├── static/
│   └── script.js         # Frontend JavaScript functionality
├── templates/
│   ├── index.html        # Main application page
│   └── about.html        # About page
└── README.md            # This file
```

## 🔧 Technologies Used

### Backend
- **Flask 2.3.3**: Web framework for Python
- **scikit-learn 1.3.0**: Machine learning library for Random Forest regression
- **yfinance 0.2.28**: Yahoo Finance API for stock data
- **pandas 2.1.0**: Data manipulation and analysis
- **numpy 1.26.0**: Numerical computing
- **python-dotenv 1.0.0**: Environment variable management

### Frontend
- **Plotly 5.17.0**: Interactive data visualization
- **HTML5/CSS3/JavaScript**: Modern web technologies
- **Bootstrap**: Responsive design framework

### Deployment
- **gunicorn 21.2.0**: WSGI HTTP Server for production deployment

## 📈 Usage Guide

1. **Select a Stock**: Choose from default tickers (AAPL, MSFT, GOOGL, AMZN, TSLA) or enter any valid stock symbol
2. **Set Prediction Period**: Specify the number of days (1-30) for future predictions
3. **View Results**: 
   - Historical price chart with SMAs
   - Prediction visualization with confidence metrics
   - Model performance statistics
4. **Analyze**: Review technical indicators and prediction confidence

## 🎯 Model Performance

The application uses a Random Forest regression model with the following specifications:
- **Estimators**: 100 decision trees
- **Max Depth**: 10 levels to prevent overfitting
- **Features**: Close price, returns, SMA_5, SMA_20, volatility
- **Training Split**: 80% training, 20% testing
- **Evaluation Metrics**: R² score, MSE, RMSE

## ⚠️ Important Notes

- **Educational Purpose**: This application is for educational and demonstration purposes only
- **Not Financial Advice**: Predictions should not be used for actual trading decisions
- **Market Volatility**: Stock markets are inherently unpredictable and subject to various external factors
- **Data Limitations**: Historical performance does not guarantee future results

## 🐛 Troubleshooting

### Common Issues

1. **Module Not Found Error**:
   - Ensure virtual environment is activated
   - Run `pip install -r requirements.txt` again

2. **Stock Data Not Loading**:
   - Check internet connection
   - Verify stock symbol is valid
   - Some stocks may be delisted or have restricted data

3. **Application Won't Start**:
   - Check if port 5000 is already in use
   - Try running on a different port: `set PORT=5001 && python app.py`

4. **Poor Prediction Accuracy**:
   - Some stocks may have unpredictable patterns
   - Try longer historical periods or different features
   - Consider market conditions and news events

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Additional Resources

- [Yahoo Finance](https://finance.yahoo.com/) - Real-time stock data
- [Plotly Documentation](https://plotly.com/python/) - Interactive visualizations
- [scikit-learn Documentation](https://scikit-learn.org/) - Machine learning library
- [Flask Documentation](https://flask.palletsprojects.com/) - Web framework
