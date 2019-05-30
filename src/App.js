import React from "react";
import "./App.css";
import axios from "axios";
import { fixer_access_key } from "./config";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
const apiUrl = "http://data.fixer.io/api/";
class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currencies: ["EUR"],
      rates: {},
      baseCurrency: "EUR",
      toCurrency: "SEK",
      baseValue: 0,
      toValue: 0,
      historicalData: [],
      percentChange: 0,
      chartDateFrom: this.getDateDaysAgo(30), // this is to "in a version 2" be able to select a daterange
      chartDateTo: this.getDateDaysAgo(0) // this is to "in a version 2" be able to select a daterange
    };
    this.getCurrencies();
    this.getSymbols();
  }

  async fetchFromFixer(url) {
    return await axios.get(apiUrl + url + "?access_key=" + fixer_access_key);
  }

  async getSymbols() {
    const results = await this.fetchFromFixer("symbols");
    if (results.data.success) {
      this.setState({ symbols: results.data.symbols });
    }
  }
  getDateDaysAgo(days) {
    // Returns what date it was x days ago
    const daysAgo = days * 1000;
    return new Date(Date.now() - 24 * 3600 * daysAgo)
      .toISOString()
      .substr(0, 10);
  }

  calculateHistoricalData() {
    const { baseCurrency, toCurrency, historicalData } = this.state;
    const historicalDataArray = Object.entries(historicalData);

    const historical = historicalDataArray.map(date => {
      return {
        date: date[0],
        rate: date[1][toCurrency] / date[1][baseCurrency]
      };
    });

    const endValue =
      historicalDataArray[historicalDataArray.length - 1][1][toCurrency] /
      historicalDataArray[historicalDataArray.length - 1][1][baseCurrency];
    const startValue =
      historicalDataArray[0][1][toCurrency] /
      historicalDataArray[0][1][baseCurrency];

    this.setState({
      historicalGraph: historical,
      percentChange: ((endValue - startValue) / startValue) * 100
    });
  }

  async getHistoricalData() {
    const { chartDateFrom, chartDateTo } = this.state;
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds

    const dayFrom = new Date(chartDateFrom);
    const dayTo = new Date(chartDateTo);

    // how many days ago from now we should start looking
    const startLoop = Math.round(
      Math.abs((dayFrom - new Date().getTime()) / oneDay)
    );

    // how many days ago from now we should stop looking
    const endLoop = Math.round(
      Math.abs((dayTo - new Date().getTime()) / oneDay)
    );

    // make loop from "start" days ago to "days between start and to"
    const historicalData = {};
    for (let a = startLoop; a >= endLoop; a--) {
      // personally dont like this apporach, but couldnt figure out any better way to do it RN.

      const results = await this.fetchFromFixer(this.getDateDaysAgo(a));

      if (results.data.success) {
        historicalData[this.getDateDaysAgo(a)] = results.data.rates;
      }
    }

    this.setState({
      historicalData
    });

    this.calculateHistoricalData();
  }

  calculateToValue(value) {
    // Calculating the "conversion" between the currencies
    const { rates, toCurrency, baseCurrency } = this.state;
    const diff = rates[toCurrency] / rates[baseCurrency];
    this.setState({
      baseValue: value,
      toValue: value * diff
    });
  }

  changeCurrency(curr, value) {
    this.setState({ [curr]: value }, () => {
      this.calculateToValue(this.state.baseValue);
      this.calculateHistoricalData();
    });
  }

  async getCurrencies() {
    const { data } = await this.fetchFromFixer("latest");

    if (data.success) {
      this.setState(
        {
          currencies: Object.keys(data.rates),
          rates: data.rates
        },
        () => this.getHistoricalData()
      );
    }
  }

  renderCurrencies() {
    const { currencies, symbols } = this.state;
    console.log("symbols", symbols);
    return currencies.map(currency => (
      <option key={currency} value={currency}>
        {currency} - {symbols && symbols[currency]}
      </option>
    ));
  }

  render() {
    const {
      rates,
      toCurrency,
      baseCurrency,
      percentChange,
      baseValue,
      toValue,
      historicalGraph
    } = this.state;
    return (
      <div className="App">
        <h2>Convert currencies</h2>

        <div className="currencyWrapper">
          <div className="flexcolumn">
            <label className="selectLabel">FROM</label>
            <div className="selectWrapper">
              <select
                className="select"
                onChange={e =>
                  this.changeCurrency("baseCurrency", e.target.value)
                }
              >
                {this.renderCurrencies()}
              </select>
            </div>
            <input
              className="input"
              value={baseValue}
              type="text"
              onChange={e => this.calculateToValue(e.target.value)}
            />
          </div>

          <div className="flexcolumn">
            <label className="selectLabel">TO</label>
            <div className="selectWrapper">
              <select
                className="select"
                value={toCurrency}
                onChange={e =>
                  this.changeCurrency("toCurrency", e.target.value)
                }
              >
                {this.renderCurrencies()}
              </select>
            </div>

            <input
              className="input"
              type="text"
              onChange={() => {}}
              value={toValue.toFixed(2)}
            />
            <div className="smallInfoWrapper">
              <div className="currentRate">
                <p className="labelText">Current rate</p>
                <p className="labelText">30 days change (%)</p>
              </div>
              <div className="currentRate">
                <p className="flexOne">
                  {rates
                    ? (rates[toCurrency] / rates[baseCurrency]).toFixed(2)
                    : 0}
                </p>
                <div className="flexOne">
                  <p>{percentChange.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="graph">
          <ResponsiveContainer>
            <AreaChart data={historicalGraph}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                width={0}
                allowDecimals={false}
                domain={["dataMin", "dataMax"]}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#8884d8"
                fill="#8884d8"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
}

export default App;
