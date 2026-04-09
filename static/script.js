// DOM Elements
let tickerInput, daysSelect, errorDiv, loadingDiv, resultsDiv;

// Chart variables
let chart = null;
let currentTicker = '';
let currentData = null;

// Initialize DOM elements
function initElements() {
    tickerInput = document.getElementById('ticker');
    daysSelect = document.getElementById('days');
    errorDiv = document.getElementById('error');
    loadingDiv = document.getElementById('loading');
    resultsDiv = document.getElementById('results');
}

// Initialize event listeners
function initEventListeners() {
    // Add event listener for Enter key in ticker input
    tickerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            predict();
        }
    });

    // Add event listeners for time period buttons
    const addButtonListener = (id, period) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => updateChartTimeRange(period));
        }
    };
    
    addButtonListener('btn-1m', '1mo');
    addButtonListener('btn-3m', '3mo');
    addButtonListener('btn-1y', '1y');
    addButtonListener('btn-5y', '5y');
}

// Initialize the application
function init() {
    initElements();
    initEventListeners();
    console.log('Stock Predictor initialized');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Set ticker from quick links
function setTicker(ticker) {
    if (!tickerInput) initElements();
    tickerInput.value = ticker.toUpperCase();
    tickerInput.focus();
}

// Show/hide loading indicator
function showLoading(show) {
    if (!loadingDiv) initElements();
    loadingDiv.classList.toggle('hidden', !show);
}

// Show error message
function showError(message) {
    if (!errorDiv) initElements();
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Hide error message
function hideError() {
    if (!errorDiv) initElements();
    errorDiv.classList.add('hidden');
}

// Format currency
function formatCurrency(value) {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Main prediction function
async function predict() {
    if (!tickerInput) initElements(); // Ensure elements are initialized
    const ticker = tickerInput.value.trim().toUpperCase();
    const days = parseInt(daysSelect.value);

    // Validate input
    if (ticker) {
        // Show loading state
        showLoading(true);
        hideError();
        resultsDiv.classList.add('hidden');

        try {
            // Fetch prediction data
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticker: ticker,
                    days: days
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch prediction data');
            }

            // Store current data
            currentTicker = ticker;
            currentData = data;

            // Update UI with new data
            updateStockInfo(data);
            renderChart(data);
            updateModelMetrics(data);
            updatePredictionSummary(data);

            // Show results
            resultsDiv.classList.remove('hidden');
            resultsDiv.classList.add('fade-in');

        } catch (error) {
            showError(error.message || 'An error occurred while processing your request');
            console.error('Prediction error:', error);
        } finally {
            showLoading(false);
        }
    }
}

// Update stock information in the UI
function updateStockInfo(data) {
    document.getElementById('stock-symbol').textContent = data.ticker;
    document.getElementById('current-price').textContent = formatCurrency(data.current_price);
    document.getElementById('prediction-confidence').innerHTML = `Confidence: <span class="font-medium">${data.prediction_confidence}%</span>`;
    
    // Additional stock info (you can enhance this with more data from yfinance)
    document.getElementById('day-change').textContent = 'N/A';
    document.getElementById('year-high').textContent = 'N/A';
    document.getElementById('year-low').textContent = 'N/A';
    document.getElementById('volume').textContent = 'N/A';
}

// Render the stock price chart
function renderChart(data) {
    const historicalData = data.historical;
    const predictionData = data.predictions;

    // Prepare historical trace
    const historicalTrace = {
        x: historicalData.dates,
        y: historicalData.prices,
        type: 'scatter',
        mode: 'lines',
        name: 'Historical Price',
        line: { 
            color: '#3b82f6',
            width: 2
        }
    };

    // Prepare prediction trace
    const predictionTrace = {
        x: predictionData.dates,
        y: predictionData.prices,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Predicted Price',
        line: { 
            color: '#ef4444',
            dash: 'dash',
            width: 2
        },
        marker: {
            size: 6,
            color: '#ef4444'
        }
    };

    // Add SMA lines if available
    const traces = [historicalTrace, predictionTrace];
    
    if (historicalData.sma_5) {
        traces.push({
            x: historicalData.dates,
            y: historicalData.sma_5,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 5',
            line: {
                color: '#10b981',
                width: 1,
                dash: 'dot'
            }
        });
    }

    if (historicalData.sma_20) {
        traces.push({
            x: historicalData.dates,
            y: historicalData.sma_20,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 20',
            line: {
                color: '#8b5cf6',
                width: 1,
                dash: 'dot'
            }
        });
    }

    // Layout configuration
    const layout = {
        title: {
            text: `${data.ticker} Stock Price Prediction`,
            font: {
                size: 18,
                color: '#1f2937'
            }
        },
        xaxis: {
            title: 'Date',
            type: 'date',
            gridcolor: '#e5e7eb',
            showline: true,
            linecolor: '#e5e7eb'
        },
        yaxis: {
            title: 'Price (USD)',
            gridcolor: '#e5e7eb',
            showline: true,
            linecolor: '#e5e7eb',
            tickprefix: '$',
            tickformat: ',.2f'
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white',
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        hovermode: 'closest',
        margin: { t: 40, l: 60, r: 40, b: 60 },
        transition: {
            duration: 500,
            easing: 'cubic-in-out'
        }
    };

    // Configuration options
    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
        displayModeBar: true
    };

    // Create or update the chart
    const chartDiv = document.getElementById('chart');
    if (chart) {
        Plotly.react(chartDiv, traces, layout, config);
    } else {
        chart = Plotly.newPlot(chartDiv, traces, layout, config);
    }
}

// Update model metrics in the UI
function updateModelMetrics(data) {
    const metrics = data.metrics;
    document.getElementById('r2-score').textContent = metrics.r2.toFixed(4);
    document.getElementById('rmse').textContent = metrics.rmse.toFixed(2);
    document.getElementById('mse').textContent = metrics.mse.toFixed(2);
}

// Update prediction summary in the UI
function updatePredictionSummary(data) {
    const predictions = data.predictions;
    const summaryDiv = document.getElementById('prediction-summary');
    
    if (!predictions || predictions.prices.length === 0) {
        summaryDiv.innerHTML = '<p class="text-gray-500">No prediction data available</p>';
        return;
    }

    const currentPrice = data.current_price;
    const lastPrediction = predictions.prices[predictions.prices.length - 1];
    const priceChange = lastPrediction - currentPrice;
    const percentChange = (priceChange / currentPrice) * 100;
    const isPositive = priceChange >= 0;

    const predictionText = `
        <div class="space-y-3">
            <div>
                <p class="text-sm text-gray-500">Current Price</p>
                <p class="text-lg font-semibold">${formatCurrency(currentPrice)}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">Predicted Price (${predictions.dates[predictions.dates.length - 1]})</p>
                <p class="text-lg font-semibold">${formatCurrency(lastPrediction)}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">Expected Change</p>
                <p class="text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}">
                    ${isPositive ? '+' : ''}${formatCurrency(priceChange)} (${isPositive ? '+' : ''}${percentChange.toFixed(2)}%)
                </p>
            </div>
            <div class="pt-2 border-t border-gray-100">
                <p class="text-xs text-gray-500">Prediction confidence: <span class="font-medium">${data.prediction_confidence}%</span></p>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${data.prediction_confidence}%"></div>
                </div>
            </div>
        </div>
    `;

    summaryDiv.innerHTML = predictionText;
}

// Update chart time range
async function updateChartTimeRange(period) {
    if (!currentTicker) return;
    
    // Update active button
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        btn.classList.remove('bg-blue-100', 'text-blue-800');
        btn.classList.add('bg-gray-100', 'text-gray-800');
    });
    event.target.classList.remove('bg-gray-100', 'text-gray-800');
    event.target.classList.add('bg-blue-100', 'text-blue-800');
    
    // Show loading
    showLoading(true);
    
    try {
        // In a real app, you would fetch new data for the selected time range
        // For now, we'll just simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update the chart with the same data but different time range
        if (currentData) {
            renderChart(currentData);
        }
    } catch (error) {
        console.error('Error updating chart time range:', error);
        showError('Failed to update chart time range');
    } finally {
        showLoading(false);
    }
}

// Helper function to format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Show/hide loading indicator
function showLoading(show) {
    loadingDiv.style.display = show ? 'flex' : 'none';
    document.body.style.cursor = show ? 'wait' : 'default';
}

// Show error message
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
}

// Initialize the application
function init() {
    // Add any initialization code here
    console.log('Stock Predictor initialized');
}

// Start the application
init();
