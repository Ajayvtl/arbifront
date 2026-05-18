"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasDeveloperScope } from "@/lib/companyRoleScope";
import { PhotoIcon, BuildingOffice2Icon } from "@heroicons/react/24/solid";

type SettingsState = {
  site_name: string;
  brand_name: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  logo: string;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

function resolveLogo(pathValue: string | null | undefined): string | null {
  if (!pathValue) return null;
  if (pathValue.startsWith("http")) return pathValue;
  const base = (process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${base}${pathValue}`;
}

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const canAccess = hasDeveloperScope(user);
  const [settings, setSettings] = useState<SettingsState>({
    site_name: "",
    brand_name: "",
    contact_email: "",
    contact_phone: "",
    contact_address: "",
    logo: "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    void fetchSettings();
  }, [canAccess]);

  const fetchSettings = async (): Promise<void> => {
    try {
      const res = await api.get("/settings/general");
      if (res.data?.data) {
        const next = {
          site_name: String(res.data.data.site_name || ""),
          brand_name: String(res.data.data.brand_name || ""),
          contact_email: String(res.data.data.contact_email || ""),
          contact_phone: String(res.data.data.contact_phone || ""),
          contact_address: String(res.data.data.contact_address || ""),
          logo: String(res.data.data.logo || ""),
        };
        setSettings(next);
        setLogoPreview(resolveLogo(next.logo));
      }
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!canAccess) {
      setMessage({ type: "error", text: "Access denied." });
      return;
    }
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("site_name", settings.site_name);
      formData.append("brand_name", settings.brand_name);
      formData.append("contact_email", settings.contact_email);
      formData.append("contact_phone", settings.contact_phone);
      formData.append("contact_address", settings.contact_address);

      if (logoFile) {
        formData.append("logo", logoFile);
      }

      await api.put("/settings/general", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage({ type: "success", text: "Settings updated successfully!" });
      await fetchSettings();
      setLogoFile(null);
    } catch (error) {
      console.error("Failed to save settings", error);
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;
  if (!canAccess) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Access denied for Company Settings.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <BuildingOffice2Icon className="h-8 w-8 text-emerald-600" />
          Company Settings & Branding
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your tenant&apos;s brand identity, logo, and contact details.
        </p>
      </div>

      {message ? (
        <div className={`mb-6 rounded-lg p-4 ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div>
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Brand Identity</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company Logo</label>
              <div className="mt-2 flex items-center gap-x-8">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Company Logo"
                    className="h-24 w-auto rounded-lg border border-gray-200 bg-gray-50 p-2 object-contain"
                  />
                ) : (
                  <PhotoIcon className="h-24 w-24 text-gray-300" aria-hidden="true" />
                )}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Change Logo
                  </label>
                  <input
                    id="logo-upload"
                    name="logo"
                    type="file"
                    className="sr-only"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-gray-500">PNG, JPG, SVG, WEBP up to 2MB</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Name (Public Title)</label>
              <input
                type="text"
                name="site_name"
                value={settings.site_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="e.g. GreenCross Clinic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand Name (Short)</label>
              <input
                type="text"
                name="brand_name"
                value={settings.brand_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="e.g. GreenCross"
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <div>
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Contact Information</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Email</label>
              <input
                type="email"
                name="contact_email"
                value={settings.contact_email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Phone</label>
              <input
                type="text"
                name="contact_phone"
                value={settings.contact_phone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
              <textarea
                name="contact_address"
                rows={3}
                value={settings.contact_address}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
