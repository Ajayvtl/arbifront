"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { User as UserIcon, Mail, Phone, Shield, Camera, Save, Loader2, X, ZoomIn } from "lucide-react";
import Cropper from "react-easy-crop";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function ProfilePage() {
    const { user, login } = useAuth(); // login used to update user context
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Avatar State
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [uploadedAvatar, setUploadedAvatar] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.addEventListener("load", () => {
                setUploadedAvatar(reader.result as string);
                setShowAvatarModal(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const handleSaveAvatar = async () => {
        if (!avatarFile) return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', avatarFile);

            // In a real app, we'd send crop data too
            const res = await api.post('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newAvatarUrl = res.data.data.url;

            // Update local user context
            if (user) {
                // We need a way to update the user context without full re-login.
                // For now, we can manually update the stored user object if AuthContext supports it,
                // or just rely on the fact that the backend is updated.
                // A full refresh would show it, or we can hack it by calling login with same token but new user obj.
                // Assuming login(token, user) updates state.
                const token = localStorage.getItem('token');
                if (token) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    login(token, { ...user, avatar: newAvatarUrl });
                }
            }

            toast.success("Profile picture updated");
            setShowAvatarModal(false);
            setUploadedAvatar(null);
            setAvatarFile(null);
        } catch (error) {
            toast.error("Failed to update profile picture");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">My Profile</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage your account settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-emerald-500 to-teal-600"></div>

                        <div className="relative mt-8 mb-4 group">
                            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-4xl font-bold text-slate-300">{user?.name?.charAt(0)}</span>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-emerald-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-colors">
                                <Camera size={18} />
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>

                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{user?.name}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{user?.email}</p>

                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wide">
                            <Shield size={12} />
                            {user?.role_name}
                        </div>
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Personal Information</h3>
                            <button className="text-emerald-600 text-sm font-medium hover:underline">Edit Details</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    <UserIcon size={18} className="text-slate-400" />
                                    {user?.name}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    <Mail size={18} className="text-slate-400" />
                                    {user?.email}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Phone Number</label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    <Phone size={18} className="text-slate-400" />
                                    {user?.phone || 'Not set'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Role</label>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                    <Shield size={18} className="text-slate-400" />
                                    {user?.role_name}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Avatar Crop Modal */}
            {showAvatarModal && uploadedAvatar && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white">Adjust Profile Picture</h3>
                            <button onClick={() => setShowAvatarModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="relative h-80 bg-slate-900">
                            <Cropper
                                image={uploadedAvatar}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                cropShape="round"
                            />
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <ZoomIn size={20} className="text-slate-400" />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAvatarModal(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAvatar}
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2 font-medium"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Save Picture
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
