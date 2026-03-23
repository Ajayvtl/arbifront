"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Loader2, Save, BarChart3, PieChart, LineChart, AreaChart, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
// import { Card, CardContent } from "@/components/ui/Card"; 
import ChartComponent from "@/components/analytics/ChartComponent";
import { useSettings } from "@/context/SettingsContext";

export default function ReportBuilderPage() {
    const [datasets, setDatasets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [queryLoading, setQueryLoading] = useState(false);
    const { formatCurrency } = useSettings();

    // Configuration State
    const [config, setConfig] = useState({
        datasetId: "",
        dimension: "",
        metric: "",
        chartType: "bar" as 'bar' | 'line' | 'pie' | 'area',
        title: "New Report"
    });

    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        fetchDatasets();
    }, []);

    const fetchDatasets = async () => {
        try {
            const res = await api.get('/analytics/datasets');
            setDatasets(res.data.data);
            if (res.data.data.length > 0) {
                setConfig(prev => ({ ...prev, datasetId: res.data.data[0].id }));
            }
        } catch (error) {
            console.error("Failed to load datasets", error);
        } finally {
            setLoading(false);
        }
    };

    const runQuery = async () => {
        if (!config.datasetId || !config.dimension || !config.metric) return;

        setQueryLoading(true);
        try {
            const res = await api.post('/analytics/query', {
                dataset: config.datasetId,
                dimensions: [config.dimension],
                metrics: [config.metric],
                filters: {} // TODO: Add filter builder later
            });
            setReportData(res.data.data);
        } catch (error) {
            console.error("Query failed", error);
        } finally {
            setQueryLoading(false);
        }
    };

    const selectedDatasetDef = datasets.find(d => d.id === config.datasetId);

    // Helper to format metric values based on name
    const formatValue = (val: number, metric: string) => {
        if (metric.includes('amount') || metric.includes('price')) return formatCurrency(val);
        return val;
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Report Builder</h1>
                    <p className="text-slate-500 text-sm">Create custom visualizations from system data</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" disabled={!reportData.length}>
                        <Save size={16} className="mr-2" /> Save Report
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                {/* Configuration Panel */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-y-auto">
                    <h3 className="font-bold text-slate-700 dark:text-gray-200 mb-4 px-1 uppercase text-xs tracking-wider">Configuration</h3>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Data Source</label>
                            <Select
                                value={config.datasetId}
                                onChange={(e) => setConfig(prev => ({ ...prev, datasetId: e.target.value, dimension: '', metric: '' }))}
                                options={datasets.map(d => ({ value: d.id, label: d.id.toUpperCase() }))}
                                className="w-full"
                            />
                        </div>

                        {selectedDatasetDef && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">X-Axis (Dimension)</label>
                                    <Select
                                        value={config.dimension}
                                        onChange={(e) => setConfig(prev => ({ ...prev, dimension: e.target.value }))}
                                        options={selectedDatasetDef.dimensions.map((d: string) => ({ value: d, label: d.replace(/_/g, ' ') }))}
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Y-Axis (Metric)</label>
                                    <Select
                                        value={config.metric}
                                        onChange={(e) => setConfig(prev => ({ ...prev, metric: e.target.value }))}
                                        options={selectedDatasetDef.metrics.map((m: string) => ({ value: m, label: m.replace(/_/g, ' ') }))}
                                        className="w-full"
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Visualization</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'bar', icon: <BarChart3 size={18} /> },
                                    { id: 'line', icon: <LineChart size={18} /> },
                                    { id: 'area', icon: <AreaChart size={18} /> },
                                    { id: 'pie', icon: <PieChart size={18} /> }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => setConfig(prev => ({ ...prev, chartType: type.id as any }))}
                                        className={`p-2 rounded-lg border flex justify-center items-center transition-all ${config.chartType === type.id
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {type.icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full mt-4"
                            onClick={runQuery}
                            disabled={queryLoading || !config.datasetId || !config.dimension || !config.metric}
                        >
                            {queryLoading ? <Loader2 className="animate-spin" /> : <><Play size={16} className="mr-2" /> Generate Report</>}
                        </Button>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-3 flex flex-col gap-6 h-full min-h-[500px]">
                    {reportData.length > 0 ? (
                        <ChartComponent
                            type={config.chartType}
                            data={reportData}
                            xAxisKey={config.dimension}
                            metrics={[{ key: config.metric, name: config.metric.replace(/_/g, ' '), color: '#10b981' }]}
                            title={config.title}
                            description={`Showing ${config.metric} by ${config.dimension}`}
                            height={500}
                        />
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center h-full text-slate-400">
                            <BarChart3 size={48} className="mb-4 opacity-50" />
                            <p>Select data source and click "Generate" to view report</p>
                        </div>
                    )}

                    {/* Data Table Preview */}
                    {reportData.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden flex-1">
                            <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-700 font-bold text-sm text-slate-700">Data Preview</div>
                            <div className="overflow-auto max-h-[300px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                                        <tr>
                                            <th className="px-6 py-3 font-medium capitalize">{config.dimension.replace(/_/g, ' ')}</th>
                                            <th className="px-6 py-3 font-medium capitalize text-right">{config.metric.replace(/_/g, ' ')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {reportData.map((row, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-6 py-3">{row[config.dimension]}</td>
                                                <td className="px-6 py-3 text-right font-mono">{formatValue(row[config.metric], config.metric)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
