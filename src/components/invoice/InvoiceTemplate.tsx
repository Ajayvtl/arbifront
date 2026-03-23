import React from 'react';
import { format } from 'date-fns';

interface InvoiceDetails {
    invoice_number: string;
    hotel_name?: string;
    guest_name?: string;
    created_at: string;
    items?: any[];
    amount: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    status: string;
    biller_name: string;
    biller_address: string;
    biller_tax_id?: string;
    billing_address?: string;
}

interface TemplateLayout {
    components: any[];
}

export default function InvoiceTemplate({ invoice, template }: { invoice: InvoiceDetails, template?: TemplateLayout }) {
    // Default fallback layout if no template provided
    const layout = template?.components || [
        { id: 'header', type: 'header', data: { width: '100%' } },
        { id: 'details', type: 'details', data: { width: '100%' } },
        { id: 'billTo', type: 'billTo', data: { width: '100%' } },
        { id: 'items', type: 'items', data: { width: '100%' } },
        { id: 'totals', type: 'totals', data: { width: '100%' } },
        { id: 'footer', type: 'footer', data: { width: '100%' } }
    ];

    const widthClass: any = {
        '100%': 'w-full',
        '66%': 'w-2/3',
        '50%': 'w-1/2',
        '33%': 'w-1/3',
        '25%': 'w-1/4'
    };

    const renderComponent = (component: any) => {
        const wClass = widthClass[component.data?.width] || 'w-full';

        switch (component.type) {
            case 'logo':
                return (
                    <div className="h-16 flex items-center mb-4">
                        <div className="bg-gray-100 px-4 py-2 rounded text-gray-500 text-sm font-bold border border-gray-300">LOGO</div>
                    </div>
                );
            case 'header':
                return (
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-black">{component.data?.title || 'INVOICE'}</h1>
                        <p className="text-gray-700 mt-1 whitespace-pre-line font-medium">{invoice.biller_name}</p>
                        <p className="text-gray-600 text-sm">{invoice.biller_address}</p>
                        {invoice.biller_tax_id && <p className="text-sm text-gray-600">Tax ID: {invoice.biller_tax_id}</p>}
                    </div>
                );
            case 'details':
                return (
                    <div className="mb-6 p-4 border border-gray-300 rounded-sm bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 text-sm text-black">
                            <div>
                                <span className="block font-bold text-gray-500 text-xs uppercase">Invoice #</span>
                                {invoice.invoice_number}
                            </div>
                            <div>
                                <span className="block font-bold text-gray-500 text-xs uppercase">Date</span>
                                {invoice.created_at ? format(new Date(invoice.created_at), 'MMMM do, yyyy') : 'N/A'}
                            </div>
                            <div>
                                <span className="block font-bold text-gray-500 text-xs uppercase">Status</span>
                                <span className="inline-block px-2 py-0.5 rounded textxs font-bold uppercase border border-gray-300 bg-white">
                                    {invoice.status}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            case 'billTo':
                return (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">Bill To</h3>
                        <p className="text-lg font-medium text-black">
                            {invoice.hotel_name || invoice.guest_name || 'N/A'}
                        </p>
                        {invoice.billing_address && (
                            <p className="text-gray-700 whitespace-pre-line mt-1 text-sm">{invoice.billing_address}</p>
                        )}
                    </div>
                );
            case 'items':
                return (
                    <table className="w-full mb-6 text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border border-black">
                                <th className="p-2 text-left font-bold text-black uppercase border-r border-black">Description</th>
                                <th className="p-2 text-right font-bold text-black uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {invoice.items && invoice.items.length > 0 ? (
                                invoice.items.map((item, index) => (
                                    <tr key={index} className="border border-black">
                                        <td className="p-2 border-r border-black">{item.description || item.item_name || 'Service Charge'}</td>
                                        <td className="p-2 text-right font-mono">
                                            {invoice.currency} {parseFloat(item.amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr className="border border-black">
                                    <td className="p-2 border-r border-black">Consolidated Charge</td>
                                    <td className="p-2 text-right font-mono">
                                        {invoice.currency} {parseFloat(invoice.amount.toString()).toFixed(2)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                );
            case 'payment':
            case 'totals': // Fallback or explicit component
                return (
                    <div className="flex justify-end mb-6">
                        <div className="w-full max-w-xs border border-black p-4 bg-gray-50">
                            <div className="flex justify-between py-1 text-gray-700 text-sm">
                                <span>Subtotal</span>
                                <span className="font-mono">{invoice.currency} {parseFloat(invoice.amount.toString()).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 text-gray-700 border-b border-gray-300 text-sm mb-2">
                                <span>Tax</span>
                                <span className="font-mono">{invoice.currency} {parseFloat(invoice.tax_amount.toString()).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-black font-bold text-base">
                                <span>Total Due</span>
                                <span>{invoice.currency} {parseFloat(invoice.total_amount.toString()).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'spacer':
                return <div className="h-8"></div>;
            case 'divider':
                return <hr className="border-black my-4" />;
            case 'footer':
                return (
                    <div className="mt-8 pt-4 border-t-2 border-black text-center text-gray-600 text-xs">
                        <p>Thank you for your business.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-invoice-container, #printable-invoice-container * {
                        visibility: visible;
                    }
                    #printable-invoice-container {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0;
                        padding: 10mm;
                        background: white;
                        z-index: 9999;
                    }
                }
            `}</style>

            {/* Review Container: Force A4 Look on Screen */}
            <div id="printable-invoice-container" className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-[10mm] shadow-2xl border border-gray-200">
                <div className="flex flex-wrap content-start h-full relative">
                    {/* Watermark/Background if needed */}
                    {layout.map((comp: any) => (
                        <div key={comp.id} className={`${widthClass[comp.data?.width] || 'w-full'} px-2`}>
                            {renderComponent(comp)}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
