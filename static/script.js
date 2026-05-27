// Global Application State
let chart = null;
let currentTicker = '';
let currentData = null;
let currentPeriod = '1y'; // Default to all data (2 years)

// DOM Elements
let tickerInput, daysSelect, errorDiv, loadingDiv, resultsDiv;

// Initialize DOM Elements
function initElements() {
    tickerInput = document.getElementById('ticker');
    daysSelect = document.getElementById('days');
    errorDiv = document.getElementById('error');
    loadingDiv = document.getElementById('loading');
    resultsDiv = document.getElementById('results');
}

// Format Currency Utility
function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Format Large Numbers (e.g. Volume)
function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
}

// Show/Hide Loading Overlay
function showLoading(show) {
    if (!loadingDiv) initElements();
    if (show) {
        loadingDiv.classList.remove('hidden');
        loadingDiv.classList.add('flex');
        document.body.style.cursor = 'wait';
    } else {
        loadingDiv.classList.remove('flex');
        loadingDiv.classList.add('hidden');
        document.body.style.cursor = 'default';
    }
}

// Show Error Message
function showError(message) {
    if (!errorDiv) initElements();
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// Hide Error Message
function hideError() {
    if (!errorDiv) initElements();
    errorDiv.textContent = '';
    errorDiv.classList.add('hidden');
}

// Set Stock Ticker from Quick links
function setTicker(ticker) {
    if (!tickerInput) initElements();
    tickerInput.value = ticker.toUpperCase();
    tickerInput.focus();
}

// Fetch and Run Prediction
async function predict() {
    if (!tickerInput) initElements();
    
    const ticker = tickerInput.value.trim().toUpperCase();
    const days = parseInt(daysSelect.value) || 7;

    if (!ticker) {
        showError('Please enter a stock symbol (e.g., AAPL).');
        return;
    }

    showLoading(true);
    hideError();
    resultsDiv.classList.add('hidden');

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ticker, days })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch stock prediction data.');
        }

        // Store standard query state
        currentTicker = ticker;
        currentData = data;
        currentPeriod = '1y'; // Reset period selector to Max (1Y/2Y view)

        // Reset period buttons styling
        resetPeriodButtons();

        // Update all segments of the UI
        updateStockInfo(data);
        renderChart(data, currentPeriod);
        updateModelMetrics(data);
        updatePredictionSummary(data);

        // Transition results in smoothly
        resultsDiv.classList.remove('hidden');
        resultsDiv.classList.add('fade-in');

    } catch (error) {
        showError(error.message || 'An error occurred while communicating with the prediction engine.');
        console.error('Prediction Engine error:', error);
    } finally {
        showLoading(false);
    }
}

// Helper to filter historical data on the client side
function filterDataByPeriod(historical, period) {
    const dates = historical.dates;
    const prices = historical.prices;
    const sma5 = historical.sma_5;
    const sma20 = historical.sma_20;
    
    let sliceCount = dates.length; // Default to full dataset (~2 years, 504 rows)
    
    if (period === '1mo') {
        sliceCount = Math.min(21, dates.length); // ~21 trading days in a month
    } else if (period === '3mo') {
        sliceCount = Math.min(63, dates.length); // ~63 trading days in 3 months
    } else if (period === '1y') {
        sliceCount = Math.min(252, dates.length); // ~252 trading days in 1 year
    }
    
    return {
        dates: dates.slice(-sliceCount),
        prices: prices.slice(-sliceCount),
        sma_5: sma5 ? sma5.slice(-sliceCount) : null,
        sma_20: sma20 ? sma20.slice(-sliceCount) : null
    };
}

// Reset period toggle buttons styling
function resetPeriodButtons() {
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        btn.classList.remove('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50');
        btn.classList.add('bg-white/5', 'text-slate-400', 'border-white/10');
    });
    
    // Set 1Y (All) active by default
    const maxBtn = document.getElementById('btn-5y');
    if (maxBtn) {
        maxBtn.classList.remove('bg-white/5', 'text-slate-400', 'border-white/10');
        maxBtn.classList.add('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50');
    }
}

// Update time-range selection
async function updateChartTimeRange(period, event) {
    if (!currentTicker || !currentData) return;
    
    currentPeriod = period;
    
    // Update button states
    document.querySelectorAll('[id^="btn-"]').forEach(btn => {
        btn.classList.remove('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50');
        btn.classList.add('bg-white/5', 'text-slate-400', 'border-white/10');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.remove('bg-white/5', 'text-slate-400', 'border-white/10');
        event.currentTarget.classList.add('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/50');
    }
    
    showLoading(true);
    
    // Smooth delay for visual responsiveness
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
        renderChart(currentData, period);
    } catch (err) {
        console.error('Error slicing chart period data:', err);
    } finally {
        showLoading(false);
    }
}

// Update Top level Stock Stats Cards
function updateStockInfo(data) {
    document.getElementById('stock-symbol').textContent = data.ticker;
    document.getElementById('current-price').textContent = formatCurrency(data.current_price);
    document.getElementById('prediction-confidence').innerHTML = `Confidence Score: <span class="text-cyan-600 font-semibold">${data.prediction_confidence}%</span>`;

    // Map calculated live stats from backend
    const change = data.day_change;
    const changePct = data.day_change_percent;
    const isPositive = change >= 0;

    const changeEl = document.getElementById('day-change');
    if (changeEl) {
        changeEl.className = `text-lg font-bold flex items-center gap-1.5 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`;
        changeEl.innerHTML = `
            <i class="fa-solid ${isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            <span>${isPositive ? '+' : ''}${formatCurrency(change)} (${isPositive ? '+' : ''}${changePct.toFixed(2)}%)</span>
        `;
    }

    document.getElementById('year-high').textContent = formatCurrency(data.fifty_two_week_high);
    document.getElementById('year-low').textContent = formatCurrency(data.fifty_two_week_low);
    document.getElementById('volume').textContent = formatNumber(data.volume);
}

// Render Premium Plotly Chart
function renderChart(data, period) {
    const filteredHist = filterDataByPeriod(data.historical, period);
    const predictions = data.predictions;

    // 1. Historical Data Trace (Glowing Sky Blue area)
    const historicalTrace = {
        x: filteredHist.dates,
        y: filteredHist.prices,
        type: 'scatter',
        mode: 'lines',
        name: 'Historical Price',
        fill: 'tozeroy',
        fillcolor: 'rgba(2, 132, 199, 0.04)', // Super soft translucent sky-600
        line: {
            color: '#0284C7', // Tailwind sky-600
            width: 2.5,
            shape: 'spline'
        },
        hovertemplate: '<b>Date</b>: %{x}<br><b>Price</b>: %{y:$$.2f}<extra></extra>'
    };

    // 2. Prediction Data Trace (Neon Fuchsia dashed line with glowing markers)
    const lastHistDate = filteredHist.dates[filteredHist.dates.length - 1];
    const lastHistPrice = filteredHist.prices[filteredHist.prices.length - 1];
    
    const predDates = [lastHistDate, ...predictions.dates];
    const predPrices = [lastHistPrice, ...predictions.prices];

    const predictionTrace = {
        x: predDates,
        y: predPrices,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Model Forecast',
        line: {
            color: '#DB2777', // Tailwind pink-600
            dash: 'dash',
            width: 2.5
        },
        marker: {
            size: 6,
            color: '#DB2777',
            bordercolor: '#FFFFFF',
            borderwidth: 1.5
        },
        hovertemplate: '<b>Forecast Date</b>: %{x}<br><b>Price</b>: %{y:$$.2f}<extra></extra>'
    };

    const traces = [historicalTrace, predictionTrace];

    // 3. Optional SMA 5 overlay
    if (filteredHist.sma_5) {
        traces.push({
            x: filteredHist.dates,
            y: filteredHist.sma_5,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 5 (Short term)',
            visible: 'legendonly',
            line: {
                color: '#10B981', // Tailwind emerald-500
                width: 1.5,
                dash: 'dot'
            }
        });
    }

    // 4. Optional SMA 20 overlay
    if (filteredHist.sma_20) {
        traces.push({
            x: filteredHist.dates,
            y: filteredHist.sma_20,
            type: 'scatter',
            mode: 'lines',
            name: 'SMA 20 (Trend)',
            visible: 'legendonly',
            line: {
                color: '#4F46E5', // Tailwind indigo-600
                width: 1.5,
                dash: 'dot'
            }
        });
    }

    // Modern Light Theme Layout
    const layout = {
        xaxis: {
            type: 'date',
            gridcolor: 'rgba(203, 213, 225, 0.4)', // Soft slate-200 grids
            showline: true,
            linecolor: 'rgba(15, 23, 42, 0.1)',
            tickfont: { color: '#475569' } // Slate-600
        },
        yaxis: {
            gridcolor: 'rgba(203, 213, 225, 0.4)',
            showline: true,
            linecolor: 'rgba(15, 23, 42, 0.1)',
            tickprefix: '$',
            tickformat: ',.2f',
            tickfont: { color: '#475569' }
        },
        plot_bgcolor: 'rgba(0,0,0,0)',
        paper_bgcolor: 'rgba(0,0,0,0)',
        showlegend: true,
        legend: {
            orientation: 'h',
            y: 1.15,
            x: 0,
            font: { color: '#1E293B' } // Slate-800
        },
        hovermode: 'x unified',
        hoverlabel: {
            bgcolor: '#FFFFFF',
            font: { color: '#0F172A', size: 13 },
            bordercolor: '#CBD5E1'
        },
        margin: { t: 20, l: 45, r: 15, b: 35 },
        transition: {
            duration: 400,
            easing: 'cubic-in-out'
        }
    };

    const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'zoomIn2d', 'zoomOut2d', 'pan2d'],
        displayModeBar: false // Keep chart completely clean
    };

    const chartDiv = document.getElementById('chart');
    Plotly.react(chartDiv, traces, layout, config);
}

// Update model evaluation stats
function updateModelMetrics(data) {
    const metrics = data.metrics;
    document.getElementById('r2-score').textContent = metrics.r2.toFixed(4);
    document.getElementById('rmse').textContent = formatCurrency(metrics.rmse);
    document.getElementById('mse').textContent = metrics.mse.toFixed(2);
}

// Update Summary Panel
function updatePredictionSummary(data) {
    const predictions = data.predictions;
    const summaryDiv = document.getElementById('prediction-summary');
    
    if (!predictions || predictions.prices.length === 0) {
        summaryDiv.innerHTML = '<p class="text-slate-400">No prediction data generated</p>';
        return;
    }

    const currentPrice = data.current_price;
    const lastPrediction = predictions.prices[predictions.prices.length - 1];
    const priceChange = lastPrediction - currentPrice;
    const percentChange = (priceChange / currentPrice) * 100;
    const isPositive = priceChange >= 0;

    const summaryHTML = `
        <div class="space-y-4">
            <div class="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                <div>
                    <p class="text-xs text-slate-400">Latest Live Price</p>
                    <p class="text-lg font-bold text-slate-200 mt-0.5">${formatCurrency(currentPrice)}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-slate-400">Forecast Price</p>
                    <p class="text-lg font-bold text-cyan-400 mt-0.5">${formatCurrency(lastPrediction)}</p>
                </div>
            </div>
            
            <div class="bg-white/5 p-3 rounded-lg border border-white/5">
                <p class="text-xs text-slate-400">Projected Move</p>
                <p class="text-xl font-bold mt-1 flex items-center gap-2 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
                    <i class="fa-solid ${isPositive ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                    <span>${isPositive ? '+' : ''}${formatCurrency(priceChange)} (${isPositive ? '+' : ''}${percentChange.toFixed(2)}%)</span>
                </p>
                <p class="text-[10px] text-slate-500 mt-1">Based on a ${predictions.prices.length}-day forward regression forecast.</p>
            </div>

            <div class="pt-2">
                <div class="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Model Confidence</span>
                    <span class="text-cyan-400 font-semibold">${data.prediction_confidence}%</span>
                </div>
                <div class="w-full bg-slate-800 rounded-full h-2">
                    <div class="bg-gradient-to-r from-cyan-500 to-indigo-500 h-2 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" style="width: ${data.prediction_confidence}%"></div>
                </div>
            </div>
        </div>
    `;

    summaryDiv.innerHTML = summaryHTML;
}

// Master Initializer
function init() {
    initElements();
    
    // Input keypress listener for "Enter" key trigger
    if (tickerInput) {
        tickerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                predict();
            }
        });
    }

    // Register active period selection buttons
    const addRangeListener = (id, period) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => updateChartTimeRange(period, e));
        }
    };
    
    addRangeListener('btn-1m', '1mo');
    addRangeListener('btn-3m', '3mo');
    addRangeListener('btn-1y', '1y');
    addRangeListener('btn-5y', '5y');

    console.log('Stock Predictor core scripting compiled successfully.');
}

// Run script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
