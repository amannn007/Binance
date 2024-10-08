import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, TimeScale, Title, Tooltip, Legend } from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import { Chart } from 'react-chartjs-2';
import moment from 'moment';
import 'chartjs-adapter-moment'; // Import the date adapter
import './App.css'; // Import the CSS file for styling

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, TimeScale, Title, Tooltip, Legend, CandlestickController, CandlestickElement);

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('ethusdt');
  const [interval, setInterval] = useState('1m');
  const [candlestickData, setCandlestickData] = useState({
    ethusdt: [],
    bnbusdt: [],
    dotusdt: [],
  });

  // Load data from localStorage when the app loads
  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem('candlestickData'));
    if (savedData) {
      setCandlestickData(savedData);
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${selectedSymbol}@kline_${interval}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const kline = message.k; // Kline data

      const newCandle = {
        x: moment(kline.t).toDate(), // Time of the kline
        o: parseFloat(kline.o), // Open price
        h: parseFloat(kline.h), // High price
        l: parseFloat(kline.l), // Low price
        c: parseFloat(kline.c), // Close price
      };

      setCandlestickData((prevData) => {
        const updatedData = { ...prevData };

        if (!updatedData[selectedSymbol]) {
          updatedData[selectedSymbol] = [];
        }

        // Limit the chart to a certain number of data points (e.g., 50 candles)
        if (updatedData[selectedSymbol].length >= 50) {
          updatedData[selectedSymbol].shift(); // Remove the oldest data point
        }

        updatedData[selectedSymbol].push(newCandle);

        // Persist updated data to localStorage
        localStorage.setItem('candlestickData', JSON.stringify(updatedData));

        return updatedData;
      });
    };

    return () => {
      ws.close(); // Clean up the WebSocket connection when toggling
    };
  }, [selectedSymbol, interval]);

  const handleCoinChange = (e) => {
    const newSymbol = e.target.value;
    setSelectedSymbol(newSymbol);
    
    // Load previously stored data for the selected coin
    const savedData = JSON.parse(localStorage.getItem('candlestickData'));
    if (savedData && savedData[newSymbol]) {
      setCandlestickData((prevData) => ({
        ...prevData,
        [newSymbol]: savedData[newSymbol], // Restore previous data
      }));
    } else {
      // Reset data if no previous data exists
      setCandlestickData((prevData) => ({
        ...prevData,
        [newSymbol]: [], // Reset to empty array
      }));
    }
  };

  const handleIntervalChange = (e) => {
    setInterval(e.target.value);
  };

  const candlestickChartData = {
    datasets: [
      {
        label: `${selectedSymbol.toUpperCase()} Candlestick`,
        data: candlestickData[selectedSymbol],
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
      },
    ],
  };

  const chartOptions = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
        },
        ticks: {
          source: 'auto',
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price (USDT)',
        },
      },
    },
  };

  return (
    <div className="App">
      <h1>Binance WebSocket - Live Market Data (Candlestick)</h1>

      <div className="controls">
        <div className="control-group">
          <label>Select Coin: </label>
          <select value={selectedSymbol} onChange={handleCoinChange}>
            <option value="ethusdt">ETH/USDT</option>
            <option value="bnbusdt">BNB/USDT</option>
            <option value="dotusdt">DOT/USDT</option>
          </select>
        </div>

        <div className="control-group">
          <label>Select Timeframe: </label>
          <select value={interval} onChange={handleIntervalChange}>
            <option value="1m">1 Minute</option>
            <option value="3m">3 Minutes</option>
            <option value="5m">5 Minutes</option>
          </select>
        </div>
      </div>

      <div className="chart-container">
        <h3>{selectedSymbol.toUpperCase()} Candlestick Chart ({interval} timeframe)</h3>
        <Chart type="candlestick" data={candlestickChartData} options={chartOptions} />
      </div>
    </div>
  );
}

export default App;
