"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, Image as ImageIcon, ZoomIn, Save, Loader2, X, Sliders, Eye, Layout } from "lucide-react";
import Cropper from "react-easy-crop";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function GalleryPage() {
    const [activeTab, setActiveTab] = useState<'hero' | 'gallery'>('hero');

    // Hero State
    const [currentHero, setCurrentHero] = useState<string | null>(null);
    const [uploadedHero, setUploadedHero] = useState<string | null>(null);
    const [heroFile, setHeroFile] = useState<File | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });

    useEffect(() => {
        fetchHero();
    }, []);

    const fetchHero = async () => {
        try {
            const res = await api.get('/gallery/hero');
            if (res.data.data.heroImage) {
                if (res.data.data.heroImage) {
                    // Prepend API URL if relative path
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
                    const baseUrl = apiUrl.replace('/api/v1', '');

                    const url = res.data.data.heroImage.startsWith('http')
                        ? res.data.data.heroImage
                        : `${baseUrl}${res.data.data.heroImage}`;
                    setCurrentHero(url);
                }
            }
        } catch (error) {
            console.error("Failed to fetch hero");
        }
    };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleHeroUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setHeroFile(file);
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setUploadedHero(reader.result as string);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSaveHero = async () => {
        if (!heroFile) return;
        setLoading(true);
        try {
            // In a real production app, we would crop the image on client (canvas) or server.
            // For now, we upload the original file. 
            // To support cropping, we'd need to send crop coordinates or a cropped blob.
            // Let's send the file for now to prove backend integration.

            const formData = new FormData();
            formData.append('image', heroFile);

            const res = await api.post('/gallery/hero', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
            const baseUrl = apiUrl.replace('/api/v1', '');

            const url = res.data.data.url.startsWith('http')
                ? res.data.data.url
                : `${baseUrl}${res.data.data.url}`;

            setCurrentHero(url);
            setUploadedHero(null);
            setHeroFile(null);
            toast.success("Hero image updated successfully");
        } catch (error) {
            toast.error("Failed to update hero image");
        } finally {
            setLoading(false);
        }
    };

    const handleEditCurrent = () => {
        if (currentHero) {
            setUploadedHero(currentHero);
            // Note: We can't easily convert a URL back to a File object for re-upload without fetching it as blob.
            // For simple "edit settings" (filters), it's fine visually, but saving would require re-fetching blob.
            // For this demo, we'll just allow visual editing.
            toast("Editing current image. Note: Re-upload required to save changes permanently in this version.", { icon: 'ℹ️' });
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gallery & Hero</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage website visuals</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('hero')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'hero' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <Layout size={16} /> Hero Section
                    </button>
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        <ImageIcon size={16} /> Gallery
                    </button>
                </div>
            </div>

            {activeTab === 'hero' && (
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                    {/* Left: Editor */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <Sliders size={20} className="text-emerald-600" />
                                Editor
                            </h2>
                            {uploadedHero && (
                                <button onClick={() => { setUploadedHero(null); setHeroFile(null); }} className="text-slate-400 hover:text-red-500">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 bg-slate-900 rounded-lg overflow-hidden relative min-h-[400px]">
                            {uploadedHero ? (
                                <Cropper
                                    image={uploadedHero}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={16 / 9}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    style={{
                                        containerStyle: { filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)` }
                                    }}
                                />
                            ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors">
                                    <Upload size={48} className="text-slate-600 mb-4" />
                                    <span className="text-slate-400 font-medium">Click to upload new image</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleHeroUpload} />
                                </label>
                            )}
                        </div>

                        {uploadedHero && (
                            <div className="mt-6 space-y-6">
                                {/* Controls */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                                                Zoom <span>{zoom.toFixed(1)}x</span>
                                            </label>
                                            <input
                                                type="range"
                                                min={1}
                                                max={3}
                                                step={0.1}
                                                value={zoom}
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                                                Brightness <span>{filters.brightness}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min={50}
                                                max={150}
                                                value={filters.brightness}
                                                onChange={(e) => setFilters({ ...filters, brightness: Number(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                                                Contrast <span>{filters.contrast}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min={50}
                                                max={150}
                                                value={filters.contrast}
                                                onChange={(e) => setFilters({ ...filters, contrast: Number(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-slate-500 uppercase flex justify-between">
                                                Saturation <span>{filters.saturation}%</span>
                                            </label>
                                            <input
                                                type="range"
                                                min={0}
                                                max={200}
                                                value={filters.saturation}
                                                onChange={(e) => setFilters({ ...filters, saturation: Number(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveHero}
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                    Save & Publish
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Preview */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col">
                        <h2 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Eye size={20} className="text-emerald-600" />
                            Live Preview
                        </h2>

                        <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                            {/* Mock Website Header */}
                            <div className="absolute top-0 left-0 right-0 h-16 bg-white/10 backdrop-blur-md z-10 flex items-center px-6 justify-between border-b border-white/10">
                                <div className="w-24 h-6 bg-white/20 rounded"></div>
                                <div className="flex gap-4">
                                    <div className="w-16 h-4 bg-white/20 rounded"></div>
                                    <div className="w-16 h-4 bg-white/20 rounded"></div>
                                    <div className="w-16 h-4 bg-white/20 rounded"></div>
                                </div>
                            </div>

                            {/* Hero Content Mock */}
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                <div className="text-center space-y-4">
                                    <div className="h-12 w-64 bg-white/20 backdrop-blur-sm rounded-lg mx-auto"></div>
                                    <div className="h-4 w-96 bg-white/10 backdrop-blur-sm rounded mx-auto"></div>
                                </div>
                            </div>

                            {/* Image */}
                            <div
                                className="w-full h-full bg-cover bg-center transition-all duration-300"
                                style={{
                                    backgroundImage: `url(${uploadedHero || currentHero || ''})`,
                                    filter: uploadedHero ? `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)` : 'none'
                                }}
                            >
                                {!uploadedHero && !currentHero && (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                                        No Image Set
                                    </div>
                                )}
                            </div>
                        </div>

                        {currentHero && !uploadedHero && (
                            <div className="mt-6">
                                <button
                                    onClick={handleEditCurrent}
                                    className="w-full py-3 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Sliders size={16} />
                                    Edit Current Image
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'gallery' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-8 text-center">
                    <ImageIcon size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-800 dark:text-white">Gallery Management</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Upload and manage images for the gallery section.</p>
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors">
                        Upload Images
                    </button>
                    {/* Gallery Grid would go here */}
                </div>
            )}
        </div>
    );
}
