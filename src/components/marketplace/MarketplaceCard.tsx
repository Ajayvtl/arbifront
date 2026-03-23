import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface MarketplaceItem {
    id: number;
    name: string;
    short_description: string;
    icon_url: string;
    price_monthly_minor: number;
    currency: string;
    is_installed?: boolean;
}

export default function MarketplaceCard({ item }: { item: MarketplaceItem }) {
    const price = item.price_monthly_minor ? item.price_monthly_minor / 100 : 0;
    const currencySymbol = item.currency === 'INR' ? '₹' : '$';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-lg p-2 flex items-center justify-center">
                    {item.icon_url ? (
                        <img src={item.icon_url} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                        <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full" />
                    )}
                </div>
                {item.is_installed && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircleIcon className="w-3 h-3 mr-1" /> Installed
                    </span>
                )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-emerald-500 transition-colors">
                {item.name}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1 line-clamp-3">
                {item.short_description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-700">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                    {price > 0 ? `${currencySymbol}${price}/mo` : 'Free'}
                </div>

                <Link
                    href={`/admin/marketplace/${item.id}`}
                    className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                    Details <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Link>
            </div>
        </div>
    );
}
