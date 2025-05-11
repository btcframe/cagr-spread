let priceChart = null;
let performanceChart = null;

document.addEventListener('DOMContentLoaded', function() {
    const periodSelect = document.getElementById('period-select');
    
    periodSelect.addEventListener('change', function() {
        const customDateControls = document.getElementById('custom-date-controls');
        const customDateControlsEnd = document.getElementById('custom-date-controls-end');
        
        if (this.value === 'custom') {
            customDateControls.style.display = 'block';
            customDateControlsEnd.style.display = 'block';
            
            // Set default dates (today and 1 year ago)
            const today = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            document.getElementById('end-date-input').valueAsDate = today;
            document.getElementById('start-date-input').valueAsDate = oneYearAgo;
        } else {
            customDateControls.style.display = 'none';
            customDateControlsEnd.style.display = 'none';
        }
        
        updateDashboard();
    });
    
    document.getElementById('amount-input').addEventListener('change', updateDashboard);
    document.getElementById('frequency-select').addEventListener('change', updateDashboard);
    document.getElementById('start-date-input').addEventListener('change', updateDashboard);
    document.getElementById('end-date-input').addEventListener('change', updateDashboard);
    
    updateDashboard();
});

async function updateDashboard() {
    try {
        document.getElementById('loading').style.display = 'flex';
        
        const periodSelect = document.getElementById('period-select');
        const amountInput = document.getElementById('amount-input');
        const frequencySelect = document.getElementById('frequency-select');
        
        if (!periodSelect || !amountInput || !frequencySelect) {
            throw new Error('Required input elements not found');
        }
        
        const periodValue = periodSelect.value;
        const amount = parseFloat(amountInput.value);
        const frequency = frequencySelect.value;
        
        if (isNaN(amount)) {
            throw new Error('Invalid input values');
        }
        
        let data;
        
        if (periodValue === 'custom') {
            const startDateInput = document.getElementById('start-date-input');
            const endDateInput = document.getElementById('end-date-input');
            
            if (!startDateInput || !endDateInput) {
                throw new Error('Date input elements not found');
            }
            
            const startDate = new Date(startDateInput.value);
            const endDate = new Date(endDateInput.value);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new Error('Invalid date values');
            }
            
            if (startDate >= endDate) {
                throw new Error('Start date must be before end date');
            }
            
            data = await fetchBitcoinDataCustomRange(startDate, endDate);
        } else {
            const years = parseInt(periodValue);
            
            if (isNaN(years)) {
                throw new Error('Invalid period value');
            }
            
            data = await fetchBitcoinData(years);
        }
        
        if (!data || data.length === 0) {
            throw new Error('No price data available');
        }
        
        const performance = calculatePerformance(data, amount, frequency);
        
        if (!performance) {
            throw new Error('Failed to calculate performance metrics');
        }
        
        updateUI(data, performance);
        
        createCharts(performance);
        
        document.getElementById('loading').style.display = 'none';
    } catch (error) {
        console.error('Dashboard update error:', error);
        document.getElementById('loading').style.display = 'none';
        alert('Error: ' + error.message);
    }
}

async function fetchBitcoinData(years) {
    try {
        const dataPoints = [];
        const today = new Date();
        const startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - years);
        
        return await fetchBitcoinDataCustomRange(startDate, today);
    } catch (error) {
        console.error('Error fetching Bitcoin price data:', error);
        throw new Error(`Failed to load price data: ${error.message}`);
    }
}

async function fetchBitcoinDataCustomRange(startDate, endDate) {
    try {
        const dataPoints = [];
        
        const MEMPOOL_API = 'https://mempool.btcframe.com/api/v1/historical-price?currency=USD';
        const FALLBACK_API = 'https://mempool.space/api/v1/historical-price?currency=USD';
        
        setDataSourceDisplay('Loading price data...');
        
        let data;
        try {
            const response = await fetch(MEMPOOL_API);
            if (!response.ok) {
                throw new Error(`Primary API error: ${response.status}`);
            }
            data = await response.json();
        } catch (primaryError) {
            console.warn('Primary API failed, trying fallback:', primaryError);
            
            const fallbackResponse = await fetch(FALLBACK_API);
            if (!fallbackResponse.ok) {
                throw new Error(`Fallback API error: ${fallbackResponse.status}`);
            }
            data = await fallbackResponse.json();
        }
        
        if (!data || !data.prices || data.prices.length === 0) {
            throw new Error('No price data available from API');
        }
        
        data.prices.forEach(entry => {
            const date = new Date(entry.time * 1000);
            
            if (date >= startDate && date <= endDate) {
                dataPoints.push({
                    date: date,
                    price: entry.USD
                });
            }
        });
        
        dataPoints.sort((a, b) => a.date - b.date);
        
        if (dataPoints.length < 2) {
            throw new Error('Not enough price data available for the selected time period.');
        }
        
        const dateRangeYears = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
        
        console.log(`Filtered data points: ${dataPoints.length} for ${dateRangeYears.toFixed(1)} year period`);
        console.log(`Date range: ${dataPoints[0].date.toISOString()} to ${dataPoints[dataPoints.length-1].date.toISOString()}`);
        
        setDataSourceDisplay('');
        
        return dataPoints;
    } catch (error) {
        console.error('Error fetching Bitcoin price data for custom range:', error);
        throw new Error(`Failed to load price data: ${error.message}`);
    }
}

function calculatePerformance(data, amount, frequency) {
    if (!data || data.length < 2) {
        return null;
    }
    
    const result = {
        dates: [],
        prices: [],
        dcaValues: [],
        lumpSumValues: []
    };
    
    const startPrice = data[0].price;
    const endPrice = data[data.length - 1].price;
    
    const lumpSumBTC = amount / startPrice;
    
    let interval;
    switch (frequency) {
        case 'daily': interval = 1; break;
        case 'weekly': interval = 7; break;
        case 'monthly': 
        default: interval = 30; break;
    }
    
    const totalDays = Math.floor((data[data.length - 1].date - data[0].date) / (1000 * 60 * 60 * 24));
    const totalInvestments = Math.max(1, Math.floor(totalDays / interval));
    const amountPerInvestment = amount / totalInvestments;
    
    let dcaBTC = 0;
    let dcaInvested = 0;
    let lastInvestmentDay = 0;
    
    let sampleInterval = 1;
    sampleInterval = 1;
    
    for (let i = 0; i < data.length; i++) {
        const currentDate = data[i].date;
        const currentPrice = data[i].price;
        
        const daysSinceStart = Math.floor((currentDate - data[0].date) / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart >= lastInvestmentDay + interval && dcaInvested < amount) {
            const btcBought = amountPerInvestment / currentPrice;
            dcaBTC += btcBought;
            dcaInvested += amountPerInvestment;
            lastInvestmentDay = daysSinceStart;
        }
        
        if (i % sampleInterval === 0 || i === 0 || i === data.length - 1) {
            result.dates.push(currentDate);
            result.prices.push(currentPrice);
            result.dcaValues.push(dcaBTC * currentPrice);
            result.lumpSumValues.push(lumpSumBTC * currentPrice);
        }
    }
    
    const yearsPassed = totalDays / 365;
    
    const finalDCAValue = dcaBTC * endPrice;
    const finalLumpSumValue = lumpSumBTC * endPrice;
    
    // CAGR = (FV/PV)^(1/n) - 1
    let dcaCagr = 0;
    let lumpSumCagr = 0;
    
    if (amount > 0 && yearsPassed > 0) {
        dcaCagr = Math.pow(finalDCAValue / amount, 1 / yearsPassed) - 1;
        lumpSumCagr = Math.pow(finalLumpSumValue / amount, 1 / yearsPassed) - 1;
    }
    
    result.dcaCagr = dcaCagr;
    result.lumpSumCagr = lumpSumCagr;
    result.cagrSpread = dcaCagr - lumpSumCagr;
    result.finalDCAValue = finalDCAValue;
    result.finalLumpSumValue = finalLumpSumValue;
    
    console.log(`Performance calculation complete. Data points: ${result.dates.length}`);
    console.log(`Date range in result: ${result.dates[0].toISOString()} to ${result.dates[result.dates.length-1].toISOString()}`);
    
    return result;
}

function updateUI(data, performance) {
    try {

        const currentPrice = data[data.length - 1].price;
        const currentPriceEl = document.getElementById('current-price');
        if (currentPriceEl) {
            currentPriceEl.textContent = '$' + currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        const dcaCagr = document.getElementById('dca-cagr');
        if (dcaCagr) {
            dcaCagr.textContent = (performance.dcaCagr * 100).toFixed(2) + '%';
            dcaCagr.className = 'stats-value ' + (performance.dcaCagr >= 0 ? 'positive' : 'negative');
        }
        
        const lumpCagr = document.getElementById('lump-cagr');
        if (lumpCagr) {
            lumpCagr.textContent = (performance.lumpSumCagr * 100).toFixed(2) + '%';
            lumpCagr.className = 'stats-value ' + (performance.lumpSumCagr >= 0 ? 'positive' : 'negative');
        }
        
        const cagrSpread = document.getElementById('cagr-spread');
        if (cagrSpread) {
            cagrSpread.textContent = (performance.cagrSpread * 100).toFixed(2) + '%';
            cagrSpread.className = 'stats-value ' + (performance.cagrSpread >= 0 ? 'positive' : 'negative');
        }
        
        const dcaTotal = document.getElementById('dca-total');
        if (dcaTotal) {
            dcaTotal.textContent = 'Final Value: $' + performance.finalDCAValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        const lumpTotal = document.getElementById('lump-total');
        if (lumpTotal) {
            lumpTotal.textContent = 'Final Value: $' + performance.finalLumpSumValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        
        const startDate = data[0].date.toLocaleDateString();
        const endDate = data[data.length - 1].date.toLocaleDateString();
        
        const priceRange = document.getElementById('price-range');
        if (priceRange) {
            priceRange.textContent = startDate + ' - ' + endDate;
        }
        
        const performanceRange = document.getElementById('performance-range');
        if (performanceRange) {
            performanceRange.textContent = startDate + ' - ' + endDate;
        }
        
        const recommendation = document.getElementById('recommendation');
        if (recommendation) {
            if (performance.cagrSpread > 0) {
                recommendation.textContent = 'DCA strategy outperformed lump sum by ' + (performance.cagrSpread * 100).toFixed(2) + '% CAGR. Consider using DCA for this market.';
                recommendation.className = 'compare-value positive';
            } else if (performance.cagrSpread < 0) {
                recommendation.textContent = 'Lump sum strategy outperformed DCA by ' + (Math.abs(performance.cagrSpread) * 100).toFixed(2) + '% CAGR. Consider lump sum investment for this market.';
                recommendation.className = 'compare-value negative';
            } else {
                recommendation.textContent = 'Both strategies performed equally.';
                recommendation.className = 'compare-value';
            }
        }
    } catch (err) {
        console.error('Error updating UI:', err);
    }
}

function createCharts(performance) {
    try {
        const priceCanvas = document.getElementById('price-chart');
        const perfCanvas = document.getElementById('performance-chart');
        
        if (!priceCanvas || !perfCanvas) {
            console.error('Chart canvases not found');
            return;
        }
        
        if (priceChart) priceChart.destroy();
        if (performanceChart) performanceChart.destroy();

        const labels = performance.dates;

        const startDate = performance.dates[0];
        const endDate = performance.dates[performance.dates.length - 1];
        const timeDiffInYears = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);

        let xAxisUnit = 'year';
        if (timeDiffInYears <= 1) {
            xAxisUnit = 'month';
        } else if (timeDiffInYears <= 3) {
            xAxisUnit = 'quarter';
        }

        // Price Chart
        priceChart = new Chart(priceCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'BTC Price (USD)',
                    data: performance.prices,
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderColor: '#f59e0b',
                    borderWidth: 2,
                    tension: 0,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#e2e8f0'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += '$' + context.parsed.y.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: xAxisUnit,
                            tooltipFormat: 'MMM dd, yyyy'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            autoSkip: true,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#94a3b8',
                            callback: value => '$' + value.toLocaleString()
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });

        // Performance Chart
        performanceChart = new Chart(perfCanvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'DCA',
                        data: performance.dcaValues,
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#10b981',
                        borderWidth: 2,
                        tension: 0,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    },
                    {
                        label: 'Lump Sum',
                        data: performance.lumpSumValues,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        tension: 0,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#e2e8f0'
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += '$' + context.parsed.y.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: xAxisUnit,
                            tooltipFormat: 'MMM dd, yyyy'
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            autoSkip: true,
                            maxTicksLimit: 10
                        }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#94a3b8',
                            callback: value => '$' + value.toLocaleString()
                        },
                        grid: {
                            color: 'rgba(148, 163, 184, 0.1)'
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Error creating charts:', err);
    }
}

function setDataSourceDisplay(message) {
    const dataSource = document.getElementById('data-source');
    if (dataSource) {
        dataSource.textContent = message;
    }
}