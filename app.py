from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import yfinance as yf
import numpy as np
import pandas as pd
import plotly.graph_objs as go
import plotly.utils
import json
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev_key_for_testing_only')

# Cache for storing stock data
stock_cache = {}
CACHE_EXPIRY = 3600  # 1 hour in seconds

def get_stock_data(ticker, period='1y'):
    """Fetch stock data with caching and enhanced error handling"""
    if not ticker:
        print("Error: No ticker provided to get_stock_data")
        return None
        
    cache_key = f"{ticker}_{period}"
    current_time = datetime.now().timestamp()
    
    # Check cache first
    if cache_key in stock_cache:
        data, timestamp = stock_cache[cache_key]
        if current_time - timestamp < CACHE_EXPIRY:
            print(f"Using cached data for {ticker}")
            return data.copy()
    
    # Fetch new data if not in cache or expired
    print(f"Fetching new data for {ticker}...")
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)
        
        if df is None:
            print(f"Error: yfinance returned None for {ticker}")
            return None
            
        if df.empty:
            print(f"Error: No data returned for {ticker}")
            return None
            
        print(f"Successfully fetched {len(df)} rows for {ticker}")
        print(f"Columns: {df.columns.tolist()}")
        print(f"Latest data: {df.tail(1).to_dict(orient='records')}")
            
        # Store in cache
        stock_cache[cache_key] = (df.copy(), current_time)
        return df
        
    except Exception as e:
        print(f"Error fetching data for {ticker}: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def prepare_features(df):
    """Prepare features from stock data"""
    df = df.copy()
    
    # Basic features
    df['Returns'] = df['Close'].pct_change()
    df['SMA_5'] = df['Close'].rolling(window=5).mean()
    df['SMA_20'] = df['Close'].rolling(window=20).mean()
    df['Volatility'] = df['Returns'].rolling(window=20).std() * np.sqrt(252)
    
    # Drop NaN values
    df = df.dropna()
    
    # Create target (next day's close price)
    df['Target'] = df['Close'].shift(-1)
    df = df.dropna()
    
    return df

def train_model(X, y):
    """Train a Random Forest model"""
    # Scale features
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    return {
        'model': model,
        'scaler': scaler,
        'metrics': {
            'mse': mse,
            'r2': r2,
            'rmse': np.sqrt(mse)
        }
    }

def predict_future(model_data, last_window, days=30):
    """Predict future prices using the trained model"""
    model = model_data['model']
    scaler = model_data['scaler']
    
    predictions = []
    current_features = last_window.copy()
    
    for _ in range(days):
        # Scale features
        scaled_features = scaler.transform(current_features.reshape(1, -1))
        
        # Predict next price
        next_price = model.predict(scaled_features)[0]
        predictions.append(next_price)
        
        # Update features for next prediction
        current_features = np.roll(current_features, -1)
        current_features[-1] = next_price
    
    return predictions

@app.route('/')
def index():
    """Render the main page with the stock prediction form"""
    default_tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
    return render_template('index.html', default_tickers=default_tickers)

@app.route('/about')
def about():
    """Render the about page"""
    return render_template('about.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        print("\n=== New Prediction Request ===")
        print(f"Request content type: {request.content_type}")
        print(f"Request data: {request.data}")
        
        if not request.is_json:
            print("Error: Request is not JSON")
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.get_json()
        print(f"Parsed JSON data: {data}")
        
        ticker = data.get('ticker', '').upper()
        try:
            days = min(max(1, int(data.get('days', 7))), 30)  # Ensure days is between 1 and 30
        except (ValueError, TypeError):
            days = 7  # Default to 7 days if invalid
            
        print(f"Ticker: {ticker}, Days: {days}")
        
        if not ticker:
            print("Error: No ticker provided")
            return jsonify({'error': 'Please enter a stock symbol'}), 400
        
        # Get stock data
        print(f"Fetching data for {ticker}...")
        df = get_stock_data(ticker, '2y')  # Get 2 years of data
        
        if df is None:
            return jsonify({
                'error': f'Failed to fetch data for {ticker}. The symbol may be invalid or the service may be temporarily unavailable.'
            }), 400
            
        if df.empty:
            return jsonify({
                'error': f'No data available for {ticker}. Please check the stock symbol and try again.'
            }), 400
        
        # Prepare features
        df = prepare_features(df)
        if len(df) < 30:  # Ensure we have enough data
            return jsonify({'error': 'Not enough historical data for prediction'}), 400
        
        # Prepare features and target
        feature_cols = ['Close', 'Returns', 'SMA_5', 'SMA_20', 'Volatility']
        X = df[feature_cols].values
        y = df['Target'].values
        
        # Train model
        model_data = train_model(X, y)
        
        # Get the last window of data for prediction
        last_window = X[-1]
        
        # Make predictions
        future_prices = predict_future(model_data, last_window, days)
        
        # Prepare dates
        last_date = df.index[-1]
        prediction_dates = [last_date + timedelta(days=i) for i in range(1, days + 1)]
        
        # Prepare response
        response = {
            'ticker': ticker,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'historical': {
                'dates': df.index.strftime('%Y-%m-%d').tolist(),
                'prices': df['Close'].tolist(),
                'sma_5': df['SMA_5'].tolist(),
                'sma_20': df['SMA_20'].tolist()
            },
            'predictions': {
                'dates': [d.strftime('%Y-%m-%d') for d in prediction_dates],
                'prices': future_prices
            },
            'metrics': model_data['metrics'],
            'current_price': df['Close'].iloc[-1],
            'prediction_confidence': min(95, max(60, int(model_data['metrics']['r2'] * 100)))
        }
        
        return jsonify(response)
        
    except ValueError as ve:
        return jsonify({'error': f'Invalid input: {str(ve)}'}), 400
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'False') == 'True')
