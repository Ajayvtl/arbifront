"use client";

import React, { useEffect, useRef, useState, memo } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries } from "lightweight-charts";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";

interface CryptoChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
}

const CryptoChart: React.FC<CryptoChartProps> = ({ symbol = "ARBUSDT", interval = "15m", height = 400 }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [hoveredCandle, setHoveredCandle] = useState<CandlestickData | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: "solid" as any, color: "transparent" },
        textColor: "#848e9c",
      },
      grid: {
        vertLines: { color: "#1e2329" },
        horzLines: { color: "#1e2329" },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: { color: "#848e9c", labelBackgroundColor: "#1e2329" },
        horzLine: { color: "#848e9c", labelBackgroundColor: "#1e2329" },
      },
      timeScale: {
        borderColor: "#1e2329",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1e2329",
      },
      autoSize: true,
    } as any);
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      borderVisible: false,
      wickUpColor: "#0ecb81",
      wickDownColor: "#f6465d",
    });
    seriesRef.current = candleSeries;

    // 1.5 Handle Mobile Responsiveness via ResizeObserver
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    // 1.6 Handle Hover/Crosshair for Tick Data
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setHoveredCandle(null);
      } else {
        const data = param.seriesData.get(candleSeries) as CandlestickData;
        if (data) setHoveredCandle(data);
      }
    });

    // 2. Fetch Initial Historical Data (REST)
    const timezoneOffset = new Date().getTimezoneOffset() * 60;

    const fetchHistory = async () => {
      try {
        const response = await fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1000`);
        const data = await response.json();
        
        const formattedData: CandlestickData[] = data.map((d: any) => ({
          time: (d[0] / 1000 - timezoneOffset) as any, // Shift UTC to Local Timezone
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
        }));

        candleSeries.setData(formattedData);
        if (formattedData.length > 0) {
          setPrice(formattedData[formattedData.length - 1].close);
        }

        // Fetch Initial 24h Ticker to avoid 0%
        const tickerResponse = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`);
        const tickerData = await tickerResponse.json();
        if (tickerData && tickerData.priceChangePercent) {
          setChangePercent(parseFloat(tickerData.priceChangePercent));
        }
      } catch (error) {
        console.error("Failed to fetch historical klines or ticker", error);
      } finally {
        setLoading(false);
      }
    };

    // 3. Connect to Binance Futures WebSocket
    let ws: WebSocket;
    const connectWs = () => {
      const streamUrl = `wss://fstream.binance.com/stream?streams=${symbol.toLowerCase()}@kline_${interval}/${symbol.toLowerCase()}@ticker`;
      ws = new WebSocket(streamUrl);

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        if (!message || !message.stream || !message.data) return;

        // Handle Kline updates
        if (message.stream.includes("@kline")) {
          const kline = message.data.k;
          const updatedCandle: CandlestickData = {
            time: (kline.t / 1000 - timezoneOffset) as any, // Shift UTC to Local Timezone
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          };
          seriesRef.current?.update(updatedCandle);
        }

        // Handle Ticker updates (24h change & live price)
        if (message.stream.includes("@ticker")) {
          setPrice(parseFloat(message.data.c));
          setChangePercent(parseFloat(message.data.P)); // 24h price change percent
        }
      };

      ws.onclose = () => {
        console.log("Binance WS closed. Reconnecting...");
        setTimeout(connectWs, 3000);
      };
    };

    fetchHistory().then(() => {
      connectWs();
    });

    // Cleanup on unmount
    return () => {
      if (ws) ws.close();
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol, interval]);

  // Format Helpers
  const isPositive = changePercent >= 0;
  const priceColor = isPositive ? "text-[#0ecb81]" : "text-[#f6465d]";
  
  return (
    <div className="flex flex-col rounded-2xl border border-[#1e2329] bg-[#161a20] shadow-sm w-full relative overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e2329] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111a28] shadow-inner">
            {symbol.startsWith("ARB") ? (
              <img src="https://cryptologos.cc/logos/arbitrum-arb-logo.png?v=035" alt="ARB" className="h-6 w-6 object-contain" />
            ) : symbol.startsWith("BTC") ? (
              <img src="https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=035" alt="BTC" className="h-6 w-6 object-contain" />
            ) : (
              <span className="text-[#5bbcff] font-bold text-xs">{symbol.replace("USDT", "")}</span>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#f5f5f5] tracking-wide flex items-center gap-2">
              {symbol.replace("USDT", "/USDT")}
            </h3>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-xl font-bold ${priceColor}`}>
                {price > 0 ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "---"}
              </span>
              <span className={`flex items-center text-sm font-semibold ${priceColor}`}>
                {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                {changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Simple Legend / Status / Hover Info */}
        <div className="flex flex-col items-end gap-1 text-xs text-[#848e9c]">
          {hoveredCandle ? (
            <div className="flex gap-2 font-mono text-[10px] md:text-xs">
              <span className="text-[#848e9c]">O: <span className={hoveredCandle.open > hoveredCandle.close ? "text-[#f6465d]" : "text-[#0ecb81]"}>{hoveredCandle.open}</span></span>
              <span className="text-[#848e9c]">H: <span className={hoveredCandle.open > hoveredCandle.close ? "text-[#f6465d]" : "text-[#0ecb81]"}>{hoveredCandle.high}</span></span>
              <span className="text-[#848e9c]">L: <span className={hoveredCandle.open > hoveredCandle.close ? "text-[#f6465d]" : "text-[#0ecb81]"}>{hoveredCandle.low}</span></span>
              <span className="text-[#848e9c]">C: <span className={hoveredCandle.open > hoveredCandle.close ? "text-[#f6465d]" : "text-[#0ecb81]"}>{hoveredCandle.close}</span></span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative w-full h-[250px] sm:h-[300px] md:h-[350px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#161a20]/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-[#f0b90b]" />
          </div>
        )}
        <style dangerouslySetInnerHTML={{ __html: `
          #tv-attr-logo { display: none !important; }
          a[href*="tradingview.com"] { display: none !important; }
        `}} />
        <div ref={chartContainerRef} className="w-full h-full [&_a]:hidden" />
      </div>
    </div>
  );
};

export default memo(CryptoChart);
