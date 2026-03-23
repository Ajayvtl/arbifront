"use client";

import React from "react";

export default function DocumentationPage() {
    return (
        <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">System Integration Guide</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                Complete procedure for configuring the SaaS System, from foundational data to product packages.
            </p>

            <div className="flex gap-8">
                {/* Navigation Sidebar */}
                <div className="w-64 shrink-0 hidden lg:block">
                    <div className="sticky top-8 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                        <h3 className="font-bold text-xs uppercase text-gray-500 mb-3 tracking-wider">Procedure</h3>
                        <nav className="space-y-1">
                            {[
                                { id: "step-1", label: "1. Authentication" },
                                { id: "step-2", label: "2. Locations" },
                                { id: "step-3", label: "3. Categories" },
                                { id: "step-4", label: "4. Modules & Scopes" },
                                { id: "step-5", label: "5. Product Roles" },
                                { id: "step-6", label: "6. Packages" },
                                { id: "step-7", label: "7. HR Architecture" },
                                { id: "step-8", label: "8. Extending HR Modules" },
                            ].map(item => (
                                <a
                                    key={item.id}
                                    href={`#${item.id}`}
                                    className="block px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                                >
                                    {item.label}
                                </a>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 space-y-12 pb-20">

                    {/* Step 1: Authentication */}
                    <section id="step-1" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">1</span>
                            <h2 className="text-2xl font-bold">Authentication</h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                            <p className="mb-4">All requests must include your API Key in the Authorization header.</p>
                            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-200 overflow-x-auto">
                                Authorization: Bearer &lt;YOUR_API_KEY&gt;
                            </div>
                        </div>
                    </section>

                    {/* Step 2: Locations */}
                    <section id="step-2" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">2</span>
                            <h2 className="text-2xl font-bold">Define Locations</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p>First, define the geographical scope for your system. This allows for location-specific pricing and packages.</p>

                            <h4 className="font-bold mt-4 mb-2">Create Country</h4>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm border border-gray-200 dark:border-slate-700">
                                <span className="text-indigo-600 font-bold">POST</span> /api/v1/dev/locations/countries
                                <pre className="mt-2 text-xs text-slate-500">{JSON.stringify({
                                    name: "India",
                                    iso_code: "IN",
                                    phone_code: "+91",
                                    currency_code: "INR",
                                    currency_symbol: "₹"
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </section>

                    {/* Step 3: Categories */}
                    <section id="step-3" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">3</span>
                            <h2 className="text-2xl font-bold">Create Categories</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p>Organize your products into logical Groups (e.g. "Hospitality", "Healthcare").</p>

                            <h4 className="font-bold mt-4 mb-2">Create Category</h4>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm border border-gray-200 dark:border-slate-700">
                                <span className="text-indigo-600 font-bold">POST</span> /api/v1/dev/categories
                                <pre className="mt-2 text-xs text-slate-500">{JSON.stringify({
                                    name: "Hospitality",
                                    description: "Hotel and Resort Management Solutions"
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </section>

                    {/* Step 4: Modules */}
                    <section id="step-4" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">4</span>
                            <h2 className="text-2xl font-bold">Define Modules & Scopes</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p><strong>Crucial Step:</strong> Define the actual features (Modules) and granular permissions (Scopes) that users can have.</p>

                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <h4 className="font-bold text-sm uppercase text-gray-500 mb-2">1. Create Module</h4>
                                    <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-xs border border-gray-200 dark:border-slate-700">
                                        <div className="mb-2"><span className="text-indigo-600 font-bold">POST</span> /modules</div>
                                        <pre>{JSON.stringify({
                                            name: "Front Desk",
                                            slug: "front_desk",
                                            description: "Reception Operations"
                                        }, null, 2)}</pre>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm uppercase text-gray-500 mb-2">2. Add Scope (Permission)</h4>
                                    <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-xs border border-gray-200 dark:border-slate-700">
                                        <div className="mb-2"><span className="text-indigo-600 font-bold">POST</span> /modules/:id/scopes</div>
                                        <pre>{JSON.stringify({
                                            name: "Check In",
                                            slug: "front_desk.check_in",
                                            description: "Allow guest check-in"
                                        }, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Step 5: Roles */}
                    <section id="step-5" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">5</span>
                            <h2 className="text-2xl font-bold">Create Product Roles</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p>Combine the Scopes you just created into a Role. This Role will be assigned to a User or Package Template.</p>

                            <h4 className="font-bold mt-4 mb-2">Create Role with Permissions</h4>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm border border-gray-200 dark:border-slate-700">
                                <span className="text-indigo-600 font-bold">POST</span> /api/v1/dev/roles
                                <pre className="mt-2 text-xs text-slate-500">{JSON.stringify({
                                    name: "Front Desk Manager",
                                    category_id: 1,
                                    permission_ids: [101, 102] // IDs returned from Step 4
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </section>

                    {/* Step 6: Packages */}
                    <section id="step-6" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">6</span>
                            <h2 className="text-2xl font-bold">Create Packages</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p>Finally, bundle Modules into a sellable Package (Plan).</p>

                            <h4 className="font-bold mt-4 mb-2">Create Package</h4>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm border border-gray-200 dark:border-slate-700">
                                <span className="text-indigo-600 font-bold">POST</span> /api/v1/dev/packages
                                <pre className="mt-2 text-xs text-slate-500">{JSON.stringify({
                                    name: "Gold Plan (India)",
                                    slug: "gold_in",
                                    country_id: 1,
                                    category_id: 1,
                                    price_monthly: 4999.00,
                                    currency: "INR",
                                    module_ids: [10, 11] // Modules included in this plan
                                }, null, 2)}</pre>
                            </div>
                        </div>
                    </section>

                    {/* Step 7: HR Architecture */}
                    <section id="step-7" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">7</span>
                            <h2 className="text-2xl font-bold">HR Architecture Pipeline</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p>The system uses a highly structured, scalable Job Position-based Hierarchical Engine (similar to Odoo / SuccessFactors) for provisioning Tenant users.</p>

                            <ol className="list-decimal list-outside ml-4 mt-2 mb-4 space-y-2">
                                <li><strong>Departments:</strong> Tenants map out hierarchical branches (e.g., 'Operations' -{'>'} 'Front Office').</li>
                                <li><strong>Job Positions:</strong> Form the junction linking Departments, functional Roles/Permissions, default shifts, and the 'Reports To' chain. By assigning a Role to a Job Position, any user holding that position automatically inherits those functional permissions.</li>
                                <li><strong>Employee Contracts:</strong> This represents the stateful association linking a User to a Job Position. It maintains historical logs (hides/archives powers when a contract is 'terminated'). <strong>Never assign raw roles directly to a user. Always provision them via an Employee Contract to a specific Job Position.</strong></li>
                            </ol>

                            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800/30">
                                <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-2">Technical DB Entity Mapping:</h4>
                                <ul className="text-sm font-mono space-y-1 text-slate-700 dark:text-slate-300">
                                    <li>users -{'>'} hr_employee_contracts</li>
                                    <li>hr_employee_contracts -{'>'} hr_job_positions</li>
                                    <li>hr_job_positions -{'>'} departments, hr_shift_templates</li>
                                    <li>hr_job_positions (M:M) hr_job_position_roles -{'>'} roles -{'>'} role_permissions</li>
                                </ul>
                            </div>
                        </div>
                    </section>
                    
                    {/* Step 8: Extending HR Modules */}
                    <section id="step-8" className="scroll-mt-8">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">8</span>
                            <h2 className="text-2xl font-bold">Developing Custom SaaS HR Modules</h2>
                        </div>
                        <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                            <p>To expose custom HR functionality exclusively for subscribed Tenants without breaking the global schema footprint:</p>

                            <h4 className="font-bold mt-4 mb-2">1. Register The New Module Feature Key</h4>
                            <p className="text-sm mt-1 mb-3">SaaS packaging controls access. You must create a unique feature flag identifying your custom HR plugin (e.g., <code>hr.advanced_analytics</code>).</p>
                            
                            <h4 className="font-bold mt-4 mb-2">2. Secure Backend Routes via Entitlements</h4>
                            <p className="text-sm mt-1 mb-2">Wrap your Express controllers natively with the <code>requireTenantEntitlement</code> guard. This strictly validates if the active Tenant context is currently subscribed to a Package supporting your required feature.</p>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-xs border border-gray-200 dark:border-slate-700">
                                router.get(<br/>
                                &nbsp;&nbsp;&nbsp;'/hr/custom-reports',<br/>
                                &nbsp;&nbsp;&nbsp;verifyToken, <br/>
                                &nbsp;&nbsp;&nbsp;resolveHrContext,<br/>
                                &nbsp;&nbsp;&nbsp;<span className="text-emerald-600">requireTenantEntitlement({'{'} featureKey: 'hr.advanced_analytics' {'}'})</span>,<br/>
                                &nbsp;&nbsp;&nbsp;HrController.getCustomReports<br/>
                                );
                            </div>

                            <h4 className="font-bold mt-4 mb-2">3. Propagate to Template DB</h4>
                            <p className="text-sm mt-1 mb-2">If your module demands custom persistent storage (e.g., <code>hr_performance_reviews</code>), ensure you execute the synchronization command to mirror your new schema to all standalone SaaS Databases:</p>
                            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-emerald-400 overflow-x-auto">
                                cd rms-server && npm run arch:sync-phase1-foundation-template-schema -- --tables=hr_performance_reviews --apply
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}
