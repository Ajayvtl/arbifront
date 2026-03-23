"use client";

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

interface ChartProps {
    type: 'bar' | 'line' | 'pie' | 'area';
    data: any[];
    xAxisKey: string;
    metrics: { key: string, name?: string, color?: string }[];
    height?: number;
    title?: string;
    description?: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ChartComponent({ type, data, xAxisKey, metrics, height = 350, title, description }: ChartProps) {

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#f1f5f9' }}
                        />
                        <Legend />
                        {metrics.map((metric, index) => (
                            <Bar
                                key={metric.key}
                                dataKey={metric.key}
                                name={metric.name || metric.key}
                                fill={metric.color || COLORS[index % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                            />
                        ))}
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        {metrics.map((metric, index) => (
                            <Line
                                key={metric.key}
                                type="monotone"
                                dataKey={metric.key}
                                name={metric.name || metric.key}
                                stroke={metric.color || COLORS[index % COLORS.length]}
                                strokeWidth={2}
                                dot={{ fill: 'white', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            {metrics.map((metric, index) => (
                                <linearGradient key={metric.key} id={`color${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={metric.color || COLORS[index % COLORS.length]} stopOpacity={0.1} />
                                    <stop offset="95%" stopColor={metric.color || COLORS[index % COLORS.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey={xAxisKey} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        {metrics.map((metric, index) => (
                            <Area
                                key={metric.key}
                                type="monotone"
                                dataKey={metric.key}
                                name={metric.name || metric.key}
                                stroke={metric.color || COLORS[index % COLORS.length]}
                                fill={`url(#color${metric.key})`}
                                fillOpacity={1}
                            />
                        ))}
                    </AreaChart>
                );
            case 'pie':
                // Pie chart usually takes single metric for segmentation
                const metric = metrics[0];
                return (
                    <PieChart>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey={metric.key}
                            nameKey={xAxisKey}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
            {(title || description) && (
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                    {title && <h3 className="font-bold text-slate-800 dark:text-white">{title}</h3>}
                    {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
                </div>
            )}
            <div className="p-4 flex-1 min-h-[300px]" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
