import React, { memo, useContext, useMemo, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { SimulationContext } from './SimulationContext';
import {
    Zap, Split, Wallet, Calculator, Repeat,
    Database, UserCheck, Package, TrendingUp, Users, Info, Code, Layers, Activity, Layout, MessageSquare, Eye, EyeOff, X, ChevronRight, Link2, Clock,
    Rocket, Target, Plus, Minus, Bell, ShieldCheck
} from 'lucide-react';

type FormulaNodeProps = Omit<NodeProps, 'data'> & { data: Record<string, any> };

const NodeHeader = ({ type, label, icon: Icon }: { type: string, label: string, icon: any }) => {
    const colors = {
        trigger: 'bg-purple-600 shadow-purple-900/40',
        condition: 'bg-amber-600 shadow-amber-900/40',
        action: 'bg-orange-600 shadow-orange-900/40',
        math: 'bg-emerald-600 shadow-emerald-900/40',
        loop: 'bg-teal-600 shadow-teal-900/40',
        context: 'bg-cyan-600 shadow-cyan-900/40',
        script: 'bg-blue-600 shadow-blue-900/40',
        booster_slab: 'bg-indigo-600 shadow-indigo-900/40',
        level_income: 'bg-pink-600 shadow-pink-900/40',
        fast_start: 'bg-red-600 shadow-red-900/40',
        wallet_bucket: 'bg-fuchsia-600 shadow-fuchsia-900/40',
        plan_context: 'bg-sky-600 shadow-sky-900/40',
        plan_catalog: 'bg-violet-700 shadow-violet-900/40',
        wallet_watcher: 'bg-rose-700 shadow-rose-900/40',
        sub_flow: 'bg-gray-700 shadow-gray-900/40',
        logic_gate: 'bg-amber-700 shadow-amber-900/40',
        switch: 'bg-teal-700 shadow-teal-900/40',
        activate_member_test: 'bg-emerald-700 shadow-emerald-900/40',
        member_registration_test: 'bg-blue-700 shadow-blue-900/40',
        group: 'bg-emerald-700 shadow-emerald-900/40',
        comment: 'bg-slate-700 shadow-slate-900/40',
        webhook: 'bg-slate-800 shadow-slate-900/40',
        order_hub: 'bg-emerald-600 shadow-emerald-900/40',
        user_hub: 'bg-indigo-600 shadow-indigo-900/40',
        fast_track_action: 'bg-rose-600 shadow-rose-900/40',
        db_fetch: 'bg-blue-600 shadow-blue-900/40',
        db_update: 'bg-indigo-700 shadow-indigo-900/40',
    };

    // Safety: If Icon is an object (from JSON serialization) or undefined, fallback to a default
    const ValidIcon = (typeof Icon === 'function' || (Icon && Icon.$$typeof)) ? Icon : (colors[type as keyof typeof colors] ? Database : Activity);

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-[10px] font-bold text-white uppercase tracking-wider ${colors[type as keyof typeof colors] || 'bg-slate-600'}`}>
            <ValidIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{label}</span>
        </div>
    );
};

const NODE_DESCRIPTION_BY_TYPE: Record<string, string> = {
    trigger: 'Starts workflow execution when a selected event fires.',
    condition: 'Branches flow by evaluating a variable against an operator and value.',
    action: 'Executes a mutation step like wallet credit, status update, or subscription progress.',
    math: 'Performs math between two values and stores output in a variable.',
    loop: 'Traverses upline or downline paths and runs linked logic for each entity.',
    context: 'Fetches runtime context from DB and exposes it as a variable.',
    script: 'Runs custom JavaScript with access to flow variables.',
    booster_slab: 'Applies configured booster slab rules and qualifying thresholds.',
    level_income: 'Calculates level income for a generation and routes payout wallet.',
    fast_start: 'Evaluates fast-start eligibility using configured limits and criteria.',
    wallet_bucket: 'Routes incoming values to target wallet buckets by rule.',
    plan_context: 'Injects package context to drive simulation and payout calculations.',
    plan_catalog: 'Selects a plan from catalog or by amount and outputs all plan variables.',
    wallet_watcher: 'Logs wallet snapshots during execution for diagnostics.',
    sub_flow: 'Triggers another flow by key for modular composition.',
    logic_gate: 'Combines multiple conditions with AND/OR before routing.',
    switch: 'Routes execution based on case values and default path.',
    activate_member_test: 'Simulation helper to force member activation state.',
    member_registration_test: 'Simulation helper to create a registration event context.',
    group: 'Visual frame to organize nodes, annotate, and move logic blocks together.',
    comment: 'Sticky note for documentation and collaboration notes on canvas.',
    order_hub: 'Fetches real-time package order data (amount, currency, status) for payouts.',
    user_hub: 'Fetches member eligibility (Is Active?, Join Date, Referral Count) for commission gating.',
    fast_track_action: 'Forces member activation and records the corresponding Fast Start bonus event.',
    db_fetch: 'Fetches a specific column value from the database (Users/Wallets) for a member.',
    db_update: 'Updates a specific database column with a new value for a targeted member.',
};

const TypedHandle = ({ type, position, id, dataType, color, className = "", style = {} }: any) => {
    const isString = dataType === 'string';
    const shapeStyle = isString
        ? { clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", borderRadius: '0%' }
        : { borderRadius: '50%' };

    return (
        <Handle
            type={type}
            position={position}
            id={id}
            className={`!w-3 !h-3 !border-slate-950 transition-all hover:scale-125 z-10 shadow-[0_0_8px_rgba(0,0,0,0.5)] ${color} ${className}`}
            style={{ ...shapeStyle, ...style }}
        />
    );
};

/** Inline input port â€” renders a labeled row with a left-edge handle inside the node */
const InputPort = ({ id, label, color = 'bg-blue-500', dataType = 'number', isConnectable = true }: { id: string; label: string; color?: string; dataType?: string; isConnectable?: boolean }) => {
    const isString = dataType === 'string';
    const textColor = color.replace('bg-', 'text-');
    return (
        <div className="relative flex items-center h-8 pl-5 pr-3 group/ip hover:bg-white/[0.025] transition-colors">
            <Handle
                type="target"
                position={Position.Left}
                id={id}
                isConnectable={isConnectable}
                className={`!w-3 !h-3 ${color} !border-slate-950 z-10 shadow-[0_0_6px_rgba(0,0,0,0.6)] hover:!scale-125 transition-transform`}
                style={{
                    position: 'absolute',
                    left: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    ...(isString ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', borderRadius: 0 } : { borderRadius: '50%' }),
                }}
            />
            <span className={`text-[9px] font-bold uppercase tracking-tight ${textColor} group-hover/ip:brightness-125 transition-all`}>{label}</span>
        </div>
    );
};

/** Inline output port â€” renders a labeled row with a right-edge handle inside the node */
const OutputPort = ({ id, label, color = 'bg-emerald-500', dataType = 'number' }: { id: string; label: string; color?: string; dataType?: string }) => {
    const isString = dataType === 'string';
    const textColor = color.replace('bg-', 'text-');
    return (
        <div className="relative flex items-center justify-end h-8 pl-3 pr-5 group/op hover:bg-white/[0.025] transition-colors">
            <span className={`text-[9px] font-bold uppercase tracking-tight ${textColor} group-hover/op:brightness-125 transition-all`}>{label}</span>
            <Handle
                type="source"
                position={Position.Right}
                id={id}
                className={`!w-3 !h-3 ${color} !border-slate-950 z-10 shadow-[0_0_6px_rgba(0,0,0,0.6)] hover:!scale-125 transition-transform`}
                style={{
                    position: 'absolute',
                    right: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    ...(isString ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', borderRadius: 0 } : { borderRadius: '50%' }),
                }}
            />
        </div>
    );
};

/** Section header inside port rails */
const PortSectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="px-3 pt-2 pb-1">
        <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-600">{children}</span>
    </div>
);

/** Divider between port rail and body */
const PortDivider = () => <div className="w-px bg-slate-800/60 self-stretch" />;

/** Simple flex wrapper for the 3-column NÃ—N node layout */
const NodeLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-stretch divide-x divide-slate-800/50">{children}</div>
);

const BaseNode = ({ data, selected, children, type, icon: Icon }: any) => {
    const lastResult = data.lastResult;
    const produced = lastResult?.produced || {};
    const hasProduced = Object.keys(produced).length > 0;
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const description = useMemo(
        () => String(data.description || NODE_DESCRIPTION_BY_TYPE[type] || 'No description available.'),
        [data.description, type]
    );

    return (
        <div className={`relative min-w-[200px] bg-[#111827] rounded-xl border-2 transition-all shadow-2xl flex flex-col ${selected ? 'border-emerald-500 ring-4 ring-emerald-500/20' : 'border-slate-800'
            }`}>
            <NodeResizer
                isVisible={selected}
                minWidth={200}
                minHeight={100}
                handleClassName="bg-emerald-500 border-none rounded-full"
            />
            <div className="relative">
                <NodeHeader type={type} label={data.label || type} icon={Icon} />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsInfoOpen(true);
                    }}
                    title="View node description"
                    className="absolute right-2 top-1.5 rounded-md border border-white/20 bg-black/25 p-1 text-white/90 transition hover:bg-black/45"
                >
                    <Eye className="h-3 w-3" />
                </button>
            </div>

            <div className="flex-1">
                {children}
            </div>

            {/* --- Live Result Tray --- */}
            {lastResult && (
                <div className={`mt-auto p-2.5 rounded-b-xl border-t bg-black/40 text-[9px] font-mono flex flex-col gap-1.5 ${lastResult.status === 'success' ? 'border-emerald-500/30' : 'border-rose-500/30'
                    }`}>
                    <div className="flex items-center justify-between">
                        <span className={`font-black uppercase tracking-tighter ${lastResult.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {lastResult.status === 'success' ? '✔ Executed' : '✖ Failed'}
                        </span>
                        <span className="text-slate-500 italic text-[8px]">{new Date(lastResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>

                    <p className="text-slate-400 leading-tight italic break-words">{lastResult.message || 'Node processed.'}</p>

                    {hasProduced && (
                        <div className="pt-1.5 border-t border-slate-800 flex flex-wrap gap-1">
                            {Object.entries(produced).map(([k, v]: [string, any]) => (
                                <span key={k} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <span className="font-bold opacity-70">${k}:</span>
                                    <span className="font-black font-mono">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Standard Target Handle (Left) */}
            {type !== 'trigger' && !data.hideTargetHandle && (
                <TypedHandle
                    type="target"
                    position={Position.Left}
                    dataType="string"
                    color="bg-slate-700"
                    className="!-left-[10px]"
                />
            )}

            {/* Standard Source Handle (Right) */}
            {type !== 'switch' && type !== 'condition' && type !== 'plan_catalog' && !data.hideSourceHandle && (
                <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-600 border-2 border-[#111827] -right-[7px] hover:bg-emerald-400 transition-colors" />
            )}
            {isInfoOpen && (
                <div
                    className="absolute inset-0 z-30 flex items-start justify-center rounded-xl bg-black/75 p-3"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsInfoOpen(false);
                    }}
                >
                    <div
                        className="w-full rounded-lg border border-slate-700 bg-[#0b1320] p-3 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                                Node Description
                            </div>
                            <button
                                type="button"
                                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                                onClick={() => setIsInfoOpen(false)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="text-[11px] leading-5 text-slate-200">{description}</div>
                    </div>
                </div>
            )}
        </div>
    );
};


const TriggerNode = (props: FormulaNodeProps) => {
    const enabledPorts = Array.isArray(props.data.enabledPorts) ? props.data.enabledPorts : ['ORDER_AMOUNT'];
    const event = typeof props.data.event === 'string' ? props.data.event : 'ON_ACTIVATION';

    const portManger = [
        { id: 'ORDER_AMOUNT', label: 'Amount', color: 'bg-emerald-500' },
        { id: 'USER_ID', label: 'User ID', color: 'bg-indigo-500' },
        { id: 'PLAN_ID', label: 'Plan ID', color: 'bg-amber-500' },
        { id: 'REFERRER_ID', label: 'Referrer', color: 'bg-rose-500' },
    ];

    return (
        <BaseNode {...props} type="trigger" icon={Zap} data={{ ...props.data, hideSourceHandle: true, hideTargetHandle: true }}>
            <NodeLayout>
                {/* CENTER BODY */}
                <div className="flex-1 p-3 space-y-3 min-w-[200px]">
                    <div className="space-y-1">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-70">Event Context</div>
                        <div className="text-xs font-black text-white bg-purple-500/10 border border-purple-500/20 px-2 py-1.5 rounded-lg flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5 text-purple-400" />
                            {event}
                        </div>
                    </div>
                    <div className="space-y-1.5 pt-1">
                        <div className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1 px-1 opacity-60">
                            <div className="w-1 h-1 rounded-full bg-purple-500 animate-pulse" />
                            {event === 'ON_DASHBOARD_LOAD' ? 'DApp Live Refresh' : 'Flow Execution Start'}
                        </div>
                        <div className="bg-purple-500/5 rounded-lg border border-purple-500/10 p-2 text-[9px] text-slate-400 leading-relaxed italic">
                            {event === 'ON_DASHBOARD_LOAD'
                                ? 'Runs every time the user refreshes or opens their DApp dashboard.'
                                : 'Incoming triggers automatically populate relevant context like Member ID and Order Amount.'}
                        </div>
                    </div>
                </div>

                {/* OUTPUT RAIL */}
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[120px]">
                    <PortSectionLabel>Produced Vars</PortSectionLabel>
                    {portManger.filter(p => enabledPorts.includes(p.id)).map(port => (
                        <OutputPort key={port.id} id={port.id} label={port.label} color={port.color} dataType={port.id === 'USER_ID' ? 'string' : 'number'} />
                    ))}
                    <div className="mt-auto pt-2 border-t border-slate-800/50">
                        <OutputPort id="success" label="EXECUTE" color="bg-purple-500" />
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const ContextNode = (props: FormulaNodeProps) => {
    const data = props.data as Record<string, any>;
    const { variable = 'VAR' } = data;
    const produced = data.lastResult?.produced || {};
    const val = produced[variable] !== undefined ? produced[variable] : '---';

    return (
        <BaseNode {...props} type="context" icon={props.data.icon || Database}>
            <NodeLayout>
                <div className="flex-1 p-4 space-y-3 min-w-[200px]">
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
                        <Database className="w-3.5 h-3.5" /> Context Fetcher
                    </div>

                    <div className="bg-cyan-500/5 rounded-xl border border-cyan-500/10 p-3 space-y-1">
                        <div className="text-[8px] text-slate-500 font-black uppercase">Output Variable</div>
                        <div className="text-sm font-mono text-white font-black">${variable}</div>
                    </div>

                    <div className="text-[8px] text-slate-500 italic uppercase leading-tight">
                        This node pulls live data from the database and injects it into your flow.
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Produced</PortSectionLabel>
                    <OutputPort id={variable} label={variable.replace('_', ' ')} color="bg-cyan-500" />
                    <div className="mt-auto">
                        <OutputPort id="success" label="FLOW" color="bg-slate-500" />
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const ConditionNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const data = props.data as Record<string, any>;
    const branches = Array.isArray(data.branches) ? data.branches : [];
    const nodeVariable = typeof data.variable === 'string' ? data.variable : '';

    const handleNodeChange = (e: any) => updateNodeData(props.id, { [e.target.name]: e.target.value });

    return (
        <BaseNode {...props} type="condition" icon={Split} data={{ ...props.data, hideTargetHandle: false, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Comparison</PortSectionLabel>
                    <InputPort id="inputA" label="Value A" color="bg-blue-500" />
                    <InputPort id="inputB" label="Value B (Opt)" color="bg-cyan-500" />
                </div>

                <div className="flex-1 p-4 space-y-4 min-w-[240px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Split className="w-3.5 h-3.5" /> If-Else Hub
                        </div>
                        <div className={`text-[8px] font-black px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-sm`}>
                            {branches.length} BRANCHES
                        </div>
                    </div>

                    <div className="space-y-3">
                        {!branches.length ? (
                            <div className="bg-amber-500/5 rounded-xl border border-amber-500/10 p-3 space-y-3">
                                <div className="flex gap-2 items-center">
                                    <select name="operator" value={typeof data.operator === 'string' ? data.operator : '>='} onChange={handleNodeChange} className="w-16 bg-slate-900 border border-slate-800 rounded p-1 text-[10px] text-amber-400 font-black nodrag">
                                        <option value=">=">{'>='}</option>
                                        <option value=">">{'>'}</option>
                                        <option value="<=">{'<='}</option>
                                        <option value="<">{'<'}</option>
                                        <option value="==">{'=='}</option>
                                        <option value="!=">{'!='}</option>
                                    </select>
                                    <input name="value" type="text" value={typeof data.value === 'string' ? data.value : ''} onChange={handleNodeChange}
                                        className="flex-1 bg-black/40 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-white placeholder-slate-600 focus:border-amber-500/30 nodrag"
                                        placeholder="Target Value" />
                                </div>
                                <p className="text-[8px] text-slate-500 italic uppercase font-black text-center tracking-tighter">Legacy Single-Branch Mode</p>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {branches.map((b: any, idx: number) => (
                                    <div key={b.id || idx} className="bg-black/40 border border-slate-800 rounded-lg p-2 flex items-center justify-between group/branch shadow-sm hover:border-slate-700 transition-all">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[9px] font-black text-white uppercase">{b.label || `If Path ${idx + 1}`}</span>
                                        </div>
                                        <div className="text-[8px] text-slate-500 font-mono tracking-tighter italic">
                                            {b.operator} {b.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-slate-900/50 rounded-lg border border-slate-800/80 p-2.5 text-[8px] text-slate-500 leading-relaxed italic text-center">
                            Evaluate in sequence. Branch out in <b>Node Setup</b> sidebar.
                        </div>
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Flow Paths</PortSectionLabel>
                    <div className="space-y-1">
                        {!branches.length ? (
                            <>
                                <OutputPort id="true" label="TRUE" color="bg-emerald-500" dataType="boolean" />
                                <OutputPort id="false" label="FALSE" color="bg-rose-500" dataType="boolean" />
                            </>
                        ) : (
                            <>
                                {branches.map((b: any) => (
                                    <OutputPort key={b.id} id={b.id} label={b.label || 'MATCH'} color="bg-amber-400 font-bold" dataType="boolean" />
                                ))}
                                <div className="mt-auto pt-2 border-t border-slate-800/50">
                                    <OutputPort id="else" label="ELSE" color="bg-slate-500" dataType="boolean" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const ActionNode = (props: FormulaNodeProps) => {
    const data = props.data as Record<string, any>;
    return (
        <BaseNode {...props} type="action" icon={Zap}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Inputs</PortSectionLabel>
                    <InputPort id="amount" label={typeof data.amountVar === 'string' ? data.amountVar : 'Amount'} color="bg-blue-500" dataType="number" />
                    <InputPort id="userId" label="Member ID" color="bg-purple-500" dataType="string" />
                </div>

                <div className="flex-1 p-3 space-y-2 min-w-[180px]">
                    <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest border-b border-slate-800 pb-1 mb-1 tracking-widest">System Action</div>
                    <div className="bg-rose-500/5 px-2.5 py-4 rounded-xl border border-rose-500/10 flex flex-col items-center justify-center gap-1.5 shadow-inner">
                        <Activity className="w-5 h-5 text-rose-400 opacity-60" />
                        <div className="text-[10px] font-black text-white px-2 py-0.5 rounded-full border border-rose-500/20 bg-rose-500/10 uppercase tracking-tight">
                            {typeof data.actionType === 'string' ? data.actionType : 'CREDIT_WALLET'}
                        </div>
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">
                            Target: {String(data.wallet || 'EARNING').replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[90px]">
                    <PortSectionLabel>Status</PortSectionLabel>
                    <OutputPort id="true" label="DONE" color="bg-emerald-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const AccountExecutiveNode = (props: FormulaNodeProps) => {
    const data = props.data as Record<string, any>;
    const actionType = typeof data.actionType === 'string' ? data.actionType : "STOP_ROI";
    return (
        <BaseNode {...props} type="action" icon={ShieldCheck}>
            <NodeLayout>
                <div className="flex-1 p-3 space-y-2 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                        <div className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none">Executive Control</div>
                        <span className="text-[8px] font-bold text-slate-100 bg-rose-600 border border-rose-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">System Override</span>
                    </div>

                    <div className="space-y-1 py-1">
                        <div className="text-[12px] font-black text-white px-2 py-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                            {actionType.replace('_', ' ')}
                        </div>
                    </div>

                    <div className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter leading-relaxed max-w-[150px]">
                        DANGEROUS: This node will bypass normal checks and force data state changes.
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[80px]">
                    <PortSectionLabel>Target</PortSectionLabel>
                    <InputPort id="userId" label="Member" color="bg-purple-500" />
                    <div className="mt-auto">
                        <PortSectionLabel>Result</PortSectionLabel>
                        <OutputPort id="true" label="DONE" color="bg-emerald-500" />
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const NotificationNode = (props: FormulaNodeProps) => {
    const data = props.data as Record<string, any>;
    const title = typeof data.title === 'string' ? data.title : "Alert";
    const message = typeof data.message === 'string' ? data.message : "Enter description...";
    const notificationType = typeof data.notificationType === 'string'
        ? data.notificationType
        : (typeof data.type === 'string' ? data.type : "SYSTEM");
    return (
        <BaseNode {...props} type="action" icon={Bell}>
            <NodeLayout>
                <div className="flex-1 p-3 space-y-2 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                        <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Dispatcher</div>
                        <span className="text-[8px] font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded uppercase tracking-tighter">{notificationType}</span>
                    </div>

                    <div className="space-y-1">
                        <div className="text-[11px] font-black text-white truncate">{title}</div>
                        <div className="text-[9px] text-slate-500 line-clamp-2 leading-relaxed italic bg-black/40 p-2 rounded-lg border border-slate-800/40">
                            {message}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 text-[8px] text-slate-600 font-bold uppercase tracking-tighter opacity-60">
                        <Info className="w-2.5 h-2.5" /> Use {"{{VAR}}"} for dynamics
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[80px]">
                    <PortSectionLabel>Flow</PortSectionLabel>
                    <OutputPort id="true" label="SENT" color="bg-emerald-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const LoopNode = (props: FormulaNodeProps) => {
    return (
        <BaseNode {...props} type="loop" icon={Repeat} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex-1 p-4 min-w-[180px]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shadow-inner">
                            <Repeat className="w-5 h-5 text-teal-400 animate-spin-slow" />
                        </div>
                        <div>
                            <div className="text-[11px] font-black text-white uppercase tracking-tight">
                                {props.data.traversalType === 'UPLINE_CHAIN' ? 'Matrix Upline' : 'Tree Downline'}
                            </div>
                            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest opacity-60">Recursive Iterator</div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Pulse Out</PortSectionLabel>
                    <OutputPort id="loop_body" label="Each Item" color="bg-teal-500" />
                    <OutputPort id="complete" label="Completed" color="bg-emerald-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const MathNode = (props: FormulaNodeProps) => {
    const updateNodeInternals = useUpdateNodeInternals();
    const data = props.data as Record<string, any>;
    const inputs = Array.isArray(data.inputs) ? data.inputs : [{ id: 'input1', label: 'Value A' }, { id: 'input2', label: 'Value B' }];
    const operation = typeof data.operation === 'string' ? data.operation : 'ADD';
    const outputVar = typeof data.outputVar === 'string' ? data.outputVar : 'math_result';

    React.useEffect(() => {
        updateNodeInternals(props.id);
    }, [inputs.length, updateNodeInternals, props.id]);

    const opSymbols: Record<string, string> = {
        ADD: '+', SUBTRACT: '-', MULTIPLY: '×', DIVIDE: '÷',
        PERCENT: '%', MAX: 'MAX', MIN: 'MIN', ROUND: 'RND'
    };

    return (
        <BaseNode {...props} type="math" icon={Calculator} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                {/* INPUT RAIL */}
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Flow Inputs</PortSectionLabel>
                    {inputs.map((input: any) => (
                        <InputPort key={input.id} id={input.id} label={input.label} color="bg-sky-500" dataType="number" isConnectable={props.isConnectable} />
                    ))}
                </div>

                {/* CENTER BODY */}
                <div className="flex-1 p-3 space-y-3 min-w-[180px]">
                    <div className="flex flex-col items-center justify-center gap-2 py-5 bg-slate-950/40 rounded-[2rem] border border-slate-800/60 shadow-inner group/math relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent pointer-events-none" />
                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover/math:opacity-10 transition-opacity">
                            <Calculator className="w-16 h-16 text-sky-500" />
                        </div>

                        <div className="flex items-center gap-2 relative z-10">
                            <div className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full text-[9px] font-black text-sky-400 uppercase tracking-widest shadow-sm">
                                {operation}
                            </div>
                        </div>

                        <div className="text-3xl font-black text-white flex items-center gap-2 relative z-10">
                            <span className="opacity-20 text-[10px] font-mono whitespace-nowrap">res =</span>
                            <span className="bg-gradient-to-br from-white via-white to-slate-500 bg-clip-text text-transparent">
                                {data.lastResult?.produced?.[outputVar] !== undefined
                                    ? Number(data.lastResult.produced[outputVar]).toFixed(2)
                                    : opSymbols[operation] || '+'}
                            </span>
                        </div>
                    </div>

                    <div className="px-1 text-center">
                        <div className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/5 py-1.5 rounded-lg border border-emerald-500/10">
                            ${outputVar || 'RESULT'}
                        </div>
                    </div>
                </div>

                {/* OUTPUT RAIL */}
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Produced</PortSectionLabel>
                    <OutputPort id={outputVar || 'math_result'} label="RESULT" color="bg-emerald-500" dataType="number" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const ScriptNode = (props: FormulaNodeProps) => (
    <BaseNode {...props} type="script" icon={Code}>
        <div className="p-4 space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic">Custom Logic Sandbox</div>
            <div className="text-[9px] font-mono text-blue-400 bg-black/40 p-2 rounded border border-blue-500/20 max-h-20 overflow-hidden line-clamp-3">
                {props.data.code || '// Write JS here...'}
            </div>
            <div className="flex items-center gap-1.5 text-[8px] text-slate-600 border-t border-slate-800 pt-1">
                <Info className="w-2 h-2" /> Global `variables` available
            </div>
        </div>
    </BaseNode>
);

const sharedInputStyle = "w-full bg-black/40 border border-slate-700/50 rounded p-1 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50 nodrag";
const sharedSelectStyle = "w-full bg-black/40 border border-slate-700/50 rounded p-1 text-[10px] font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50 nodrag";

const BoosterSlabNode = (props: FormulaNodeProps) => {
    const enabledPorts = props.data.enabledPorts || ['BOOSTER_ACTIVE', 'BOOSTER_EXTRA_ROI'];
    return (
        <BaseNode {...props} type="booster_slab" icon={Zap} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex-1 p-3 space-y-2 min-w-[180px]">
                    <div className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-800 pb-1 mb-1 tracking-widest">Booster Matrix Evaluator</div>
                    <div className="flex flex-col gap-1 bg-indigo-500/5 p-2.5 rounded-lg border border-indigo-500/10">
                        <span className="text-[10px] font-bold text-indigo-400">Global Engine Core</span>
                        <p className="text-[8px] text-slate-400 leading-tight italic">Iterates configured working_gain_rules tiers and applies the highest qualified Extra ROI% and Cap Multiplier.</p>
                    </div>
                </div>

                {enabledPorts.length > 0 && (
                    <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                        <PortSectionLabel>Produced</PortSectionLabel>
                        {enabledPorts.includes('BOOSTER_ACTIVE') && <OutputPort id="BOOSTER_ACTIVE" label="Active" color="bg-indigo-500" />}
                        {enabledPorts.includes('BOOSTER_EXTRA_ROI') && <OutputPort id="BOOSTER_EXTRA_ROI" label="Extra ROI" color="bg-orange-500" />}
                    </div>
                )}
            </NodeLayout>
        </BaseNode>
    );
};


const LevelIncomeNode = (props: FormulaNodeProps) => {
    const { settings = {} } = useContext(SimulationContext);
    const config = settings.level_income_config || [];
    const enabledPorts = props.data.enabledPorts || ['LEVEL_REWARD', 'LEVEL_PERCENT'];

    const targetLevel = Number(props.data.targetLevel || 1);
    const currentLevelRule = config.find((c: any) => Number(c.level) === targetLevel);

    return (
        <BaseNode {...props} type="level_income" icon={Users} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Inputs</PortSectionLabel>
                    <InputPort id="userId" label="Member ID" color="bg-purple-500" />
                    <InputPort id="input_amount" label="Basis Amt" color="bg-blue-500" />
                    <InputPort id="targetLevel" label="Level #" color="bg-amber-500" />
                </div>

                <div className="flex-1 p-3 space-y-2 min-w-[180px]">
                    <div className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-800 pb-1 mb-1 tracking-widest">Generation Payout</div>
                    {currentLevelRule && (
                        <div className="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-2 rounded h-full flex flex-col justify-center border border-indigo-500/20">
                            <span className="text-[7px] text-slate-500 uppercase">Current Tier</span>
                            Gen {targetLevel}: {currentLevelRule.percent}%
                        </div>
                    )}
                    {!currentLevelRule && (
                        <div className="py-4 text-center">
                            <span className="text-[8px] text-slate-600 font-bold uppercase italic tracking-tighter">Define Gen in Setup</span>
                        </div>
                    )}
                </div>

                {enabledPorts.length > 0 && (
                    <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[110px]">
                        <PortSectionLabel>Outputs</PortSectionLabel>
                        {enabledPorts.includes('LEVEL_REWARD') && <OutputPort id="LEVEL_REWARD" label="Reward" color="bg-emerald-500" />}
                        {enabledPorts.includes('LEVEL_PERCENT') && <OutputPort id="LEVEL_PERCENT" label="Percent" color="bg-orange-500" />}
                    </div>
                )}
            </NodeLayout>
        </BaseNode>
    );
};

const SponsorIncomeNode = (props: FormulaNodeProps) => {
    const { settings = {} } = useContext(SimulationContext);
    const rules = settings.direct_income_rules || [];
    const enabledPorts = props.data.enabledPorts || ['SPONSOR_REWARD', 'SPONSOR_PERCENT'];

    return (
        <BaseNode {...props} type="sponsor_income" icon={UserCheck} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Inputs</PortSectionLabel>
                    <InputPort id="sponsorId" label="Sponsor ID" color="bg-purple-500" />
                    <InputPort id="input_amount" label="Basis Amt" color="bg-blue-500" />
                </div>

                <div className="flex-1 p-3 space-y-2 min-w-[180px]">
                    <div className="text-[9px] font-black text-slate-500 uppercase border-b border-slate-800 pb-1 mb-1 tracking-widest">Sponsor Bonus</div>
                    <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 h-full flex flex-col justify-center items-center gap-1">
                        <Activity className="w-4 h-4 text-emerald-400 opacity-40" />
                        <span className="text-[8px] text-slate-400 font-black uppercase tracking-tight">Direct Referral Engine</span>
                    </div>
                </div>

                {enabledPorts.length > 0 && (
                    <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[110px]">
                        <PortSectionLabel>Outputs</PortSectionLabel>
                        {enabledPorts.includes('SPONSOR_REWARD') && <OutputPort id="SPONSOR_REWARD" label="Reward" color="bg-emerald-500" />}
                        {enabledPorts.includes('SPONSOR_PERCENT') && <OutputPort id="SPONSOR_PERCENT" label="Percent" color="bg-orange-500" />}
                    </div>
                )}
            </NodeLayout>
        </BaseNode>
    );
};

const ConstantInputNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const label = props.data.variableName || 'CONSTANT';
    const type = props.data.dataType || 'number';

    return (
        <BaseNode {...props} type="constant_input" icon={Layout} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex-1 p-3 space-y-2 min-w-[180px]">
                    <div className="space-y-0.5">
                        <label className="text-[7px] text-slate-500 uppercase font-black">Variable Name</label>
                        <input value={props.data.variableName || ''} onChange={(e) => updateNodeData(props.id, { variableName: e.target.value.toUpperCase() })} className={sharedInputStyle} placeholder="MY_VALUE" />
                    </div>
                    <div className="space-y-0.5">
                        <label className="text-[7px] text-emerald-500 uppercase font-black">Value</label>
                        <div className="flex gap-2">
                            <input value={props.data.value || ''} onChange={(e) => updateNodeData(props.id, { value: e.target.value })} className="flex-1 bg-[#060c14] border border-emerald-500/20 rounded p-1.5 text-[10px] font-mono text-emerald-400 focus:border-emerald-500/50 nodrag" placeholder="100.00" />
                            <select value={type} onChange={(e) => updateNodeData(props.id, { dataType: e.target.value })} className="w-12 bg-slate-800 border-none rounded text-[9px] text-white p-1 nodrag">
                                <option value="number">#</option>
                                <option value="string">T</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col py-2 min-w-[90px]">
                    <PortSectionLabel>Output</PortSectionLabel>
                    <OutputPort id={label} label={label || 'OUT'} color="bg-emerald-500" dataType={type} />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const FastStartNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const { settings = {} } = useContext(SimulationContext);
    const handleChange = (e: any) => updateNodeData(props.id, { [e.target.name]: e.target.value });

    return (
        <BaseNode {...props} type="fast_start" icon={TrendingUp} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex-1 p-3 space-y-2 min-w-[200px]">
                    <div className="text-[9px] font-bold text-slate-500 uppercase border-b border-slate-800 pb-1 mb-1">Fast Start Config</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[7px] text-slate-500 uppercase">Hours Limit</label>
                            <input name="hoursLimit" type="number" value={props.data.hoursLimit || ''} onChange={handleChange} className={sharedInputStyle} placeholder={settings.fast_start_window_hours || '72'} /></div>
                        <div><label className="text-[7px] text-slate-500 uppercase">Bonus %</label>
                            <input name="bonusValue" type="number" value={props.data.bonusValue || ''} onChange={handleChange} className={sharedInputStyle} placeholder={settings.fast_start_bonus_amount || '10'} /></div>
                        <div><label className="text-[7px] text-slate-500 uppercase">Directs Req</label>
                            <input name="directsReq" type="number" value={props.data.directsReq || ''} onChange={handleChange} className={sharedInputStyle} placeholder={settings.fast_start_direct_referrals || '3'} /></div>
                        <div><label className="text-[7px] text-slate-500 uppercase">Vol Req ($)</label>
                            <input name="volReq" type="number" value={props.data.volReq || ''} onChange={handleChange} className={sharedInputStyle} placeholder={settings.fast_start_min_total_volume || '300'} /></div>
                    </div>
                </div>
                <div className="flex flex-col py-2 min-w-[110px]">
                    <PortSectionLabel>Outputs</PortSectionLabel>
                    <OutputPort id="FAST_START_QUALIFIED" label="Qualified" color="bg-red-500" />
                    <OutputPort id="FAST_START_BONUS" label="Bonus" color="bg-orange-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const WalletSplitterNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const { wallets = {} } = useContext(SimulationContext);
    const handleChange = (e: any) => updateNodeData(props.id, { [e.target.name]: e.target.value });
    const ratio = Number(props.data.payoutRatio || 80);

    return (
        <BaseNode {...props} type="wallet_splitter" icon={Split} data={{ ...props.data, hideTargetHandle: false }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[70px]">
                    <PortSectionLabel>Input</PortSectionLabel>
                    <InputPort id="amount" label="IN ($)" color="bg-indigo-500" dataType="number" />
                </div>

                <div className="flex-1 p-4 space-y-4 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calculator className="w-3.5 h-3.5" /> Financial Splitter
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Payout Ratio</span>
                            <span className="text-[10px] font-black text-emerald-500">{ratio}%</span>
                        </div>
                        <input
                            type="range"
                            name="payoutRatio"
                            min="0"
                            max="100"
                            step="5"
                            value={ratio}
                            onChange={handleChange}
                            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[7px] text-slate-600 font-black uppercase">
                            <span>Repurchase ({100 - ratio}%)</span>
                            <span>Payout ({ratio}%)</span>
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/10 p-2 text-[8px] text-slate-400 leading-relaxed italic">
                        Splits incoming amount. Redirect {100 - ratio}% to the repurchase wallet automatically.
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[120px]">
                    <PortSectionLabel>Segments</PortSectionLabel>
                    <div className="space-y-1">
                        <OutputPort id="PAYOUT_AMOUNT" label="Payout Part" color="bg-emerald-400" />
                        <OutputPort id="SAVINGS_AMOUNT" label="Repurchase Part" color="bg-indigo-400" />
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <OutputPort id="OUT" label="NEXT" color="bg-slate-100" />
                        </div>
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const PlanContextNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const handleChange = (e: any) => updateNodeData(props.id, { [e.target.name]: e.target.value });

    return (
        <BaseNode {...props} type="plan_context" icon={Package}>
            <div className="space-y-2 min-w-[200px] relative">
                <div className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 pb-1 mb-2">Inject Plan Context</div>
                <div className="flex flex-col gap-1">
                    <label className="text-[8px] text-amber-500 uppercase font-black">Simulated Amount ($)</label>
                    <input
                        name="simulationAmount"
                        type="number"
                        value={props.data.simulationAmount || ''}
                        onChange={handleChange}
                        className={sharedInputStyle}
                        placeholder="Fallback: User DB Amount"
                    />
                </div>
                <div className="text-[9px] text-slate-500 pt-1 leading-tight">Fetches live package data from DB (roi_percent, daily, multiplier)</div>
                {/* Output handles */}
                <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                    <span className="text-[8px] text-slate-500 uppercase font-black block mb-1.5">Outputs</span>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-orange-400 font-mono">$PLAN_DAILY_PERCENT</span>
                            <TypedHandle type="source" position={Position.Right} id="PLAN_DAILY_PERCENT" dataType="number" color="bg-orange-500" className="!static !translate-x-0 !translate-y-0" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-blue-400 font-mono">$PLAN_CAP_X</span>
                            <TypedHandle type="source" position={Position.Right} id="PLAN_CAP_X" dataType="number" color="bg-blue-500" className="!static !translate-x-0 !translate-y-0" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-teal-400 font-mono">$INVESTED_AMOUNT</span>
                            <TypedHandle type="source" position={Position.Right} id="INVESTED_AMOUNT" dataType="number" color="bg-teal-500" className="!static !translate-x-0 !translate-y-0" />
                        </div>
                    </div>
                </div>
            </div>
        </BaseNode>
    );
};







const SubFlowNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const handleChange = (e: any) => updateNodeData(props.id, { [e.target.name]: e.target.value });

    return (
        <BaseNode {...props} type="sub_flow" icon={Repeat}>
            <div className="p-4 space-y-2 min-w-[150px]">
                <div className="text-[9px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-1 mb-1">Trigger Sub-Flow</div>
                <div className="flex flex-col gap-1">
                    <label className="text-[7px] text-slate-500 uppercase">Target Flow Key</label>
                    <input name="flowKey" type="text" value={props.data.flowKey || ''} onChange={handleChange} className={sharedInputStyle} placeholder="e.g. DAILY_ROI" />
                </div>
            </div>
        </BaseNode>
    );
};

const LogicGateNode = (props: FormulaNodeProps) => {
    const { conditions = [], combineMode = 'AND' } = props.data;

    return (
        <BaseNode {...props} type="logic_gate" icon={Zap} data={{ ...props.data, hideSourceHandle: true, hideTargetHandle: true }}>
            <NodeLayout>
                {/* INPUT RAIL */}
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Rule Inputs</PortSectionLabel>
                    {conditions.map((c: any, index: number) => (
                        <InputPort key={index} id={`var_${c.variable}`} label={`$${c.variable}`} color="bg-amber-500" />
                    ))}
                    {conditions.length === 0 && <div className="px-3 py-1 text-[8px] text-slate-600 italic">No inputs</div>}
                </div>

                {/* CENTER BODY */}
                <div className="flex-1 p-3 space-y-2 min-w-[180px]">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1 mb-2">
                        <span>Logical Gate</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${combineMode === 'AND' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'}`}>
                            {combineMode}
                        </span>
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {conditions.length > 0 ? (
                            conditions.map((c: any, index: number) => (
                                <div key={index} className="text-[9px] font-mono bg-black/40 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-1 shadow-sm">
                                    <span className="text-amber-500 font-bold">${c.variable}</span>
                                    <span className="text-slate-600 font-black px-1.5 py-0.5 bg-slate-800 rounded">{c.operator}</span>
                                    <span className="text-white font-black truncate max-w-[50px]">{c.value}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-[8px] text-slate-600 italic py-4 text-center bg-slate-900/40 rounded-lg border border-dashed border-slate-800">
                                Connect inputs in Node Setup
                            </div>
                        )}
                    </div>
                </div>

                {/* OUTPUT RAIL */}
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[90px]">
                    <PortSectionLabel>Decision</PortSectionLabel>
                    <OutputPort id="true" label="TRUE" color="bg-emerald-500" />
                    <OutputPort id="false" label="FAIL" color="bg-rose-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const SwitchNode = (props: FormulaNodeProps) => {
    const { variable, cases = [] } = props.data;

    return (
        <BaseNode {...props} type="switch" icon={Split} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                {/* INPUT RAIL */}
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Inbound Var</PortSectionLabel>
                    <InputPort id="switch_var" label={`$${variable || 'VAR'}`} color="bg-blue-500" dataType="string" />
                </div>

                {/* CENTER BODY */}
                <div className="flex-1 p-3 space-y-3 min-w-[180px]">
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1.5 mb-1">Execution Switch</div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                        {cases.length > 0 ? (
                            cases.map((c: any, index: number) => (
                                <div key={index} className="flex flex-col gap-1 bg-black/40 border border-slate-800 rounded-lg p-2 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[7px] text-slate-500 uppercase font-black">Case Match</span>
                                        <span className="text-[7px] text-sky-400 font-mono font-bold">ID: {c.id || index}</span>
                                    </div>
                                    <div className="text-[10px] text-white font-black truncate flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                        {c.value}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[8px] text-slate-600 italic py-4 text-center bg-slate-900/40 rounded-lg border border-dashed border-slate-800 uppercase tracking-tighter">
                                Add cases in Node Setup
                            </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-slate-800/50 flex flex-col gap-1">
                            <span className="text-[7px] text-slate-600 uppercase font-bold italic">Default fallback</span>
                        </div>
                    </div>
                </div>

                {/* OUTPUT RAIL */}
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Paths</PortSectionLabel>
                    {cases.map((c: any, index: number) => (
                        <OutputPort key={index} id={c.id || c.value} label={c.label || String(c.value)} color="bg-sky-500" />
                    ))}
                    <div className="mt-auto pt-2 border-t border-slate-800/50">
                        <OutputPort id="default" label="DEFAULT" color="bg-slate-700" />
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const MemberRegistrationTestNode = (props: FormulaNodeProps) => (
    <BaseNode {...props} type="member_registration_test" icon={Users}>
        <div className="space-y-1">
            <div className="text-[10px] font-bold text-blue-400 uppercase">Simulate Event</div>
            <p className="text-[9px] text-slate-500 leading-tight italic">Mocks the creation of a new user account (Status: PENDING).</p>
        </div>
    </BaseNode>
);

const ActivateMemberTestNode = (props: FormulaNodeProps) => (
    <BaseNode {...props} type="activate_member_test" icon={UserCheck}>
        <div className="space-y-1">
            <div className="text-[10px] font-bold text-emerald-500 uppercase">Simulate Event</div>
            <p className="text-[9px] text-slate-500 leading-tight italic">Forces member status to 'ACTIVE' for testing logic branches.</p>
        </div>
    </BaseNode>
);

const GroupNode = (props: FormulaNodeProps) => {
    const color = String(props.data.color || '#10b981');
    const comment = String(props.data.comment || '');
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const description = String(props.data.description || NODE_DESCRIPTION_BY_TYPE.group);
    return (
        <div
            className={`relative min-w-[300px] min-h-[220px] rounded-xl border-2 bg-transparent ${props.selected ? 'ring-2 ring-emerald-400/40' : ''}`}
            style={{ borderColor: color }}
        >
            <NodeResizer
                isVisible={props.selected}
                minWidth={260}
                minHeight={180}
                handleClassName="bg-emerald-500 border-none rounded-full"
            />
            <div className="flex items-center justify-between rounded-t-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: color }}>
                <span className="flex items-center gap-1.5 truncate"><Layout className="w-3 h-3" />{props.data.label || 'Group'}</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsInfoOpen(true);
                    }}
                    title="View node description"
                    className="rounded-md border border-white/25 bg-black/20 p-1 text-white/90 transition hover:bg-black/45"
                >
                    <Eye className="h-3 w-3" />
                </button>
            </div>
            {comment ? (
                <div className="px-3 py-2 text-[10px] text-emerald-100/90">
                    {comment}
                </div>
            ) : null}
            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-slate-600 border-2 border-[#111827] -left-[7px]" />
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-slate-600 border-2 border-[#111827] -right-[7px]" />
            {isInfoOpen && (
                <div className="absolute inset-0 z-30 flex items-start justify-center rounded-xl bg-black/75 p-3" onClick={() => setIsInfoOpen(false)}>
                    <div className="w-full rounded-lg border border-slate-700 bg-[#0b1320] p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Node Description</div>
                            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => setIsInfoOpen(false)}>
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="text-[11px] leading-5 text-slate-200">{description}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CommentNode = (props: FormulaNodeProps) => {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const description = String(props.data.description || NODE_DESCRIPTION_BY_TYPE.comment);
    return (
        <div className={`relative min-w-[220px] rounded-xl border border-slate-700 bg-[#111827] p-3 shadow-2xl ${props.selected ? 'ring-2 ring-sky-400/30' : ''}`}>
            <NodeResizer
                isVisible={props.selected}
                minWidth={180}
                minHeight={100}
                handleClassName="bg-sky-500 border-none rounded-full"
            />
            <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2">
                    <MessageSquare className="w-3 h-3 text-sky-400" />
                    {props.data.label || 'Comment'}
                </span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsInfoOpen(true);
                    }}
                    title="View node description"
                    className="rounded-md border border-slate-600 bg-slate-800/40 p-1 text-slate-300 transition hover:bg-slate-700/60 hover:text-white"
                >
                    <Eye className="h-3 w-3" />
                </button>
            </div>
            <p className="text-[11px] leading-5 text-slate-300 whitespace-pre-wrap">{props.data.comment || 'Add notes...'}</p>
            {isInfoOpen && (
                <div className="absolute inset-0 z-30 flex items-start justify-center rounded-xl bg-black/75 p-3" onClick={() => setIsInfoOpen(false)}>
                    <div className="w-full rounded-lg border border-slate-700 bg-[#0b1320] p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Node Description</div>
                            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => setIsInfoOpen(false)}>
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="text-[11px] leading-5 text-slate-200">{description}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UniversalDisplayNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const lastResult = props.data.lastResult;
    const monitorVar = props.data.monitorVariable;
    const isAuto = !monitorVar;

    // Smart value extraction: try DISPLAY_VALUE, then any single result, then fallback
    const getDisplayValue = () => {
        const produced = lastResult?.produced || {};
        const data = lastResult?.data || {};

        // 1. Check EXACT match in produced for monitored variable
        if (monitorVar && produced[monitorVar] !== undefined) return produced[monitorVar];
        if (monitorVar && data[monitorVar] !== undefined) return data[monitorVar];

        // 2. Check DISPLAY_VALUE (The standard engine output for display nodes)
        if (produced?.DISPLAY_VALUE !== undefined) return produced.DISPLAY_VALUE;
        if (data?.DISPLAY_VALUE !== undefined) return data.DISPLAY_VALUE;

        // 3. Auto-sense: If we only have ONE value produced, show it
        const keys = Object.keys(produced).filter(k => k !== 'DISPLAY_VALUE');
        if (keys.length === 1) return produced[keys[0]];

        // 4. Last resort: parse value from message string e.g. "Monitoring PLAN_NAME: Starter"
        const msg = lastResult?.message || '';
        const msgMatch = msg.match(/Monitoring\s+.+?:\s*(.+)$/i);
        if (msgMatch) return msgMatch[1].trim();

        return keys.length > 1 ? keys.map(k => `${k}: ${produced[k]}`).join(' | ') : '---';
    };

    const value = getDisplayValue();

    return (
        <BaseNode {...props} type="display" icon={Activity}>
            <div className="space-y-3 min-w-[200px]">
                <div className="flex flex-col items-center justify-center p-5 bg-black/40 rounded-xl border border-slate-800 shadow-inner group/display hover:bg-black/60 transition-all relative overflow-hidden">
                    {isAuto && (
                        <div className="absolute top-0 left-0 right-0 py-0.5 bg-sky-500/10 text-sky-400 text-[6px] font-black uppercase tracking-[0.2em] text-center border-b border-sky-500/20">
                            Auto-Sensing Mode
                        </div>
                    )}
                    <span className="text-[9px] text-slate-500 font-black uppercase mb-2 tracking-widest text-center opacity-70">Live Readout</span>
                    <div className="text-3xl font-mono font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)] truncate w-full text-center">
                        {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2 }) : String(value)}
                    </div>
                </div>
                <div className="px-1">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[8px] text-slate-500 uppercase font-black">Source Variable</label>
                        <div className={`w-1.5 h-1.5 rounded-full ${isAuto ? 'bg-sky-500 animate-pulse' : 'bg-amber-500 shadow-[0_0_5px_currentColor]'}`} />
                    </div>
                    <input
                        type="text"
                        value={monitorVar || ''}
                        placeholder="Connect wire to Auto-Sensing"
                        onChange={(e) => updateNodeData(props.id, { monitorVariable: e.target.value })}
                        className={`w-full bg-[#060c14] border rounded-lg px-2.5 py-2 text-[10px] font-mono focus:outline-none transition-all placeholder:text-slate-700 placeholder:italic shadow-sm ${isAuto ? 'border-slate-800 text-sky-400/50 italic' : 'border-amber-500/30 text-amber-400'
                            }`}
                    />
                    <TypedHandle type="target" position={Position.Left} id="monitor" dataType="number" color="bg-emerald-500" className="!bottom-6 !-left-[11px]" />
                </div>
            </div>
        </BaseNode>
    );
};

const WalletsNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const sim = useContext(SimulationContext);
    const lastResult = props.data.lastResult;
    const balances = lastResult?.data?.balances || lastResult?.produced || sim?.user?.balances || {};
    const { wallets: walletLabels = {} } = sim;

    const walletDisplayList = [
        { key: 'main_balance', label: walletLabels.main_balance || 'Main Balance', color: 'bg-blue-500' },
        { key: 'earning_balance', label: walletLabels.earning_balance || 'Earning Balance', color: 'bg-emerald-500' },
        { key: 'roi_balance', label: walletLabels.roi_balance || 'ROI Balance', color: 'bg-amber-500' },
        { key: 'direct_balance', label: walletLabels.direct_balance || 'Direct Balance', color: 'bg-rose-500' },
        { key: 'level_balance', label: walletLabels.level_balance || 'Level Balance', color: 'bg-purple-500' },
        { key: 'reward_balance', label: walletLabels.reward_balance || 'Reward Balance', color: 'bg-yellow-500' },
        { key: 'booster_amount', label: walletLabels.booster_amount || 'Booster Amount', color: 'bg-indigo-500' },
        { key: 'withdrawable_balance', label: walletLabels.withdrawable_balance || 'Withdrawable', color: 'bg-sky-500' },
        { key: 'locked_balance', label: walletLabels.locked_balance || 'Locked Balance', color: 'bg-slate-500' },
    ];

    return (
        <BaseNode {...props} type="wallets" icon={Wallet} data={{ ...props.data, hideSourceHandle: true, hideTargetHandle: true }}>
            <NodeLayout>
                {/* INPUT RAIL */}
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Inbound</PortSectionLabel>
                    <InputPort id="userId" label="Member ID" color="bg-purple-500" dataType="string" />
                </div>

                {/* CENTER BODY */}
                <div className="flex-1 p-3 space-y-2 min-w-[220px]">
                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span>Portfolio Sync</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                        </div>
                        <div className="flex items-center gap-1.5 bg-black/40 border border-slate-800 rounded px-1.5 py-0.5">
                            <span className="text-[6px] font-black text-slate-500 uppercase">Gate</span>
                            <button
                                onClick={() => updateNodeData(props.id, { useGate: !props.data.useGate })}
                                className={`w-5 h-2.5 rounded-full relative transition-colors ${props.data.useGate ? 'bg-amber-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all ${props.data.useGate ? 'left-3' : 'left-0.5'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                        {walletDisplayList.map((w) => (
                            <div key={w.key} className="group/wallet bg-black/40 border border-slate-800 hover:border-slate-700 rounded-lg p-2 transition-all flex items-center justify-between shadow-sm">
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[7px] text-slate-500 font-black uppercase truncate leading-none mb-1 group-hover/wallet:text-slate-400">{w.label}</span>
                                    <span className="text-[11px] font-mono font-bold text-white leading-none">
                                        ${Number(balances[w.key] || balances[w.key.toUpperCase()] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className={`w-1.5 h-6 rounded-full ${w.color} opacity-40 group-hover/wallet:opacity-100 transition-opacity`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* OUTPUT RAIL */}
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Balance Vars</PortSectionLabel>
                    {walletDisplayList.map((w) => (
                        <OutputPort key={w.key} id={w.key.toUpperCase()} label={w.label.toUpperCase().replace(/ BALANCE| AMOUNT/g, '')} color={w.color} />
                    ))}
                    {props.data.useGate && (
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <InputPort id="gate_input" label="GATE" color="bg-amber-500" dataType="boolean" />
                        </div>
                    )}
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const TotalInvestmentNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const sim = useContext(SimulationContext);
    const produced = props.data.lastResult?.produced || props.data.produced || {};

    const total = produced.TOTAL_INVESTED ?? sim?.user?.totalInvested ?? 0;
    const count = produced.ACTIVE_PACKAGES_COUNT ?? sim?.user?.packages?.length ?? 0;

    return (
        <BaseNode {...props} type="total_investment" icon={TrendingUp} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Member</PortSectionLabel>
                    <InputPort id="userId" label="Member ID" color="bg-purple-500" dataType="string" />
                </div>
                <div className="flex-1 p-4 space-y-3 min-w-[180px]">
                    <div className="flex flex-col items-center justify-center py-4 bg-blue-500/5 rounded-2xl border border-blue-500/20 shadow-inner group/invest relative">
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 border border-slate-800 rounded px-1.5 py-0.5">
                            <span className="text-[6px] font-black text-slate-500 uppercase">Gate</span>
                            <button
                                onClick={() => updateNodeData(props.id, { useGate: !props.data.useGate })}
                                className={`w-5 h-2.5 rounded-full relative transition-colors ${props.data.useGate ? 'bg-amber-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 w-1.5 h-1.5 rounded-full bg-white transition-all ${props.data.useGate ? 'left-3' : 'left-0.5'}`} />
                            </button>
                        </div>
                        <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 opacity-50">Total Capital</div>
                        <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform duration-500">
                            ${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <span className="text-[8px] font-bold text-blue-300 uppercase italic">
                                {count} ACTIVE PACKAGES
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Capital Out</PortSectionLabel>
                    <OutputPort id="TOTAL_INVESTED" label="CAPITAL $" color="bg-blue-500" />
                    <OutputPort id="ACTIVE_PACKAGES_COUNT" label="COUNT" color="bg-cyan-500" />
                    {props.data.useGate && (
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <InputPort id="gate_input" label="GATE" color="bg-amber-500" dataType="boolean" />
                        </div>
                    )}
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const WebhookNode = (props: FormulaNodeProps) => {
    return (
        <BaseNode {...props} type="webhook" icon={Link2} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Integration</PortSectionLabel>
                    <InputPort id="payload" label="Payload" color="bg-sky-500" dataType="object" />
                    <InputPort id="url" label="API Endpoint" color="bg-slate-500" dataType="string" />
                </div>
                <div className="flex-1 p-4 space-y-3 min-w-[200px]">
                    <div className="text-[10px] font-black text-sky-400 uppercase tracking-widest">External Webhook (cURL)</div>
                    <div className="bg-black/40 border border-slate-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_5px_rgba(14,165,233,0.5)]" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">POST REQUEST</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate italic">
                            {props.data.url || 'https://api.your-system.com/webhook'}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Response</PortSectionLabel>
                    <OutputPort id="SUCCESS" label="SUCCESS" color="bg-emerald-500" />
                    <OutputPort id="RAW_RESPONSE" label="RAW DATA" color="bg-slate-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const TimeSchedulerNode = (props: FormulaNodeProps) => {
    const { targetTime = "00:00", timezone = "UTC" } = props.data;

    return (
        <BaseNode {...props} type="scheduler" icon={Clock} data={{ ...props.data, hideTargetHandle: true, hideSourceHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Controls</PortSectionLabel>
                    <InputPort id="TRIGGER" label="CHECK TIME" color="bg-indigo-500" />
                </div>
                <div className="flex-1 p-4 space-y-3 min-w-[200px]">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Execution Timer
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 border border-slate-800 rounded-lg p-2">
                            <div className="text-[8px] font-bold text-slate-500 uppercase">Target</div>
                            <div className="text-xs font-black text-white">{targetTime}</div>
                        </div>
                        <div className="bg-black/40 border border-slate-800 rounded-lg p-2">
                            <div className="text-[8px] font-bold text-slate-500 uppercase">Zone</div>
                            <div className="text-xs font-black text-white">{timezone}</div>
                        </div>
                    </div>
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-indigo-300 italic">Production Status</span>
                        <span className="text-[10px] font-black text-emerald-400 font-mono">ACTIVE-CALC</span>
                    </div>
                </div>
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[110px]">
                    <PortSectionLabel>Evaluated</PortSectionLabel>
                    <OutputPort id="IS_READY" label="IS READY" color="bg-emerald-500" />
                    <OutputPort id="REMAINING_MINS" label="REMAINING" color="bg-amber-500" />
                    <OutputPort id="NEXT_RUN_ISO" label="NEXT RUN" color="bg-slate-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const DashboardCardNode = (props: FormulaNodeProps) => {
    const { updateNodeData } = useReactFlow();
    const { label = "Display Card", isVisible = true, customLabel = "", overrideValue = "", cardKey = "GENERIC", useGate = false } = props.data;

    return (
        <BaseNode {...props} type="dashboard_config" icon={Layout} data={{ ...props.data }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>UX CONFIG</PortSectionLabel>
                    <InputPort id="IN" label="ENABLE" color="bg-emerald-500" />
                    {useGate && (
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <InputPort id="gate_input" label="GATE" color="bg-amber-500" dataType="boolean" />
                        </div>
                    )}
                </div>
                <div className="flex-1 p-4 space-y-4 min-w-[240px]">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{cardKey}</div>
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1.5 bg-black/40 border border-slate-800 rounded-lg px-2 py-1">
                                <span className="text-[7px] font-black text-slate-500 uppercase">Gate</span>
                                <button
                                    onClick={() => updateNodeData(props.id, { useGate: !useGate })}
                                    className={`w-6 h-3 rounded-full relative transition-colors ${useGate ? 'bg-amber-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${useGate ? 'left-3.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                            <button
                                onClick={() => updateNodeData(props.id, { isVisible: !isVisible })}
                                className={`p-1.5 rounded-lg border transition-all ${isVisible ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-slate-800/40 border-slate-700 text-slate-500'}`}
                            >
                                {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                        </div>
                    </div>

                    {props.data.lastResult && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-inner animate-pulse-slow">
                            <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">Live Calculation</span>
                            <div className="text-xl font-black text-white font-mono tracking-tighter">
                                {props.data.lastResult.produced && Object.values(props.data.lastResult.produced)[0] !== undefined
                                    ? String(Object.values(props.data.lastResult.produced)[0])
                                    : '---'}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Rename Label</label>
                            <input
                                type="text"
                                value={customLabel}
                                onChange={(e) => updateNodeData(props.id, { customLabel: e.target.value })}
                                placeholder={label}
                                className="w-full bg-black/40 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-bold text-white placeholder:text-slate-700"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[8px] font-bold text-slate-500 uppercase ml-1">Value Override (Optional)</label>
                            <input
                                type="text"
                                value={overrideValue}
                                onChange={(e) => updateNodeData(props.id, { overrideValue: e.target.value })}
                                placeholder="Auto-calculated"
                                className="w-full bg-black/40 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-mono text-emerald-400 placeholder:text-slate-700"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[80px]">
                    <PortSectionLabel>Flow</PortSectionLabel>
                    <OutputPort id="OUT" label="NEXT" color="bg-slate-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const PlanCatalogNode = (props: FormulaNodeProps) => {
    const {
        sourceMode = 'CATALOG',
        isAggregated = false,
        visiblePorts = {
            PLAN_ID: true,
            PLAN_NAME: true,
            INVESTED_AMOUNT: true,
            TOTAL_ROI_CREDITED: true,
            PLAN_REMAINING_ROI: true,
            GRAND_TOTAL_ROI: false,
            GRAND_TOTAL_REMAINING: false
        }
    } = props.data;

    const togglePort = (port: string) => {
        const newPorts = { ...visiblePorts, [port]: !visiblePorts[port] };
        (props as any).onNodeDataChange?.(props.id, { visiblePorts: newPorts });
    };

    return (
        <BaseNode {...props} type="context" icon={Package} data={{ ...props.data, hideTargetHandle: sourceMode === 'CATALOG' }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[70px]">
                    <PortSectionLabel>Input</PortSectionLabel>
                    <InputPort id="amount_input" label="AMOUNT" color="bg-orange-500" />
                </div>

                <div className="flex-1 p-4 space-y-4 min-w-[260px]">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Plan Intelligence</div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={() => (props as any).onNodeDataChange?.(props.id, { sourceMode: 'CATALOG' })}
                                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tight transition-all ${sourceMode === 'CATALOG' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-100'}`}
                            >Catalog</button>
                            <button
                                onClick={() => (props as any).onNodeDataChange?.(props.id, { sourceMode: 'MEMBER_DATA' })}
                                className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-tight transition-all ${sourceMode === 'MEMBER_DATA' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:text-slate-100'}`}
                            >Member</button>
                        </div>
                    </div>

                    {sourceMode === 'MEMBER_DATA' && (
                        <div className="flex items-center justify-between p-3 bg-black/40 border border-slate-800 rounded-xl">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Aggregated (Total Sums)</span>
                            <button
                                onClick={() => (props as any).onNodeDataChange?.(props.id, { isAggregated: !isAggregated })}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAggregated ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            >
                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isAggregated ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/10">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest">Active Handles</p>
                        <div className="flex flex-wrap gap-1.5">
                            {Object.entries(visiblePorts).map(([key, isVisible]) => (
                                <button
                                    key={key}
                                    onClick={() => togglePort(key)}
                                    className={`px-2 py-1 rounded-md text-[8px] font-bold border transition-all ${isVisible ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}
                                >
                                    {key.replace('PLAN_', '').replace('TOTAL_', '')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[120px]">
                    <PortSectionLabel>Context Data</PortSectionLabel>
                    <div className="space-y-1">
                        {visiblePorts.PLAN_ID && <OutputPort id="PLAN_ID" label="ID" color="bg-slate-500" />}
                        {visiblePorts.PLAN_NAME && <OutputPort id="PLAN_NAME" label="NAME" color="bg-blue-400" />}
                        {visiblePorts.INVESTED_AMOUNT && <OutputPort id="INVESTED_AMOUNT" label="INVESTED ($)" color="bg-emerald-400" />}
                        {visiblePorts.TOTAL_ROI_CREDITED && <OutputPort id="TOTAL_ROI_CREDITED" label="REC. ROI ($)" color="bg-orange-400" />}
                        {visiblePorts.PLAN_REMAINING_ROI && <OutputPort id="PLAN_REMAINING_ROI" label="REM. ROI ($)" color="bg-rose-400" />}
                        {isAggregated && visiblePorts.GRAND_TOTAL_ROI && <OutputPort id="GRAND_TOTAL_ROI" label="GRAND REC. ROI" color="bg-orange-600 font-black" />}
                        {isAggregated && visiblePorts.GRAND_TOTAL_REMAINING && <OutputPort id="GRAND_TOTAL_REMAINING" label="GRAND REM. ROI" color="bg-rose-600 font-black" />}
                        <OutputPort id="OUT" label="FLOW" color="bg-slate-100" />
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const PackageOrderNode = (props: FormulaNodeProps) => {
    const {
        enabledPorts = ['TOTAL_ROI_PAID', 'ROI_REMAINING', 'ROI_CAP_LIMIT', 'DAILY_ROI_PERCENT', 'IS_BOOSTED', 'AMOUNT', 'CURRENCY']
    } = props.data;

    return (
        <BaseNode {...props} type="order_hub" icon={Package} data={{ ...props.data, hideTargetHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[70px]">
                    <PortSectionLabel>Input</PortSectionLabel>
                    <InputPort id="orderId" label="ORDER ID" color="bg-emerald-500" dataType="string" />
                </div>

                <div className="flex-1 p-4 space-y-4 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" /> Order Hub
                        </div>
                    </div>

                    <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/10 p-3 text-[9px] text-slate-400 leading-relaxed italic">
                        Provides real-time ROI tracking for a specific order. Configure output ports in the <b>Node Setup</b> window.
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[130px]">
                    <PortSectionLabel>Metrics</PortSectionLabel>
                    <div className="space-y-1">
                        {enabledPorts.includes('TOTAL_ROI_PAID') && <OutputPort id="TOTAL_ROI_PAID" label="Total Paid" color="bg-emerald-500" />}
                        {enabledPorts.includes('ROI_REMAINING') && <OutputPort id="ROI_REMAINING" label="Remaining" color="bg-rose-500" />}
                        {enabledPorts.includes('ROI_CAP_LIMIT') && <OutputPort id="ROI_CAP_LIMIT" label="Cap Limit" color="bg-slate-500" />}
                        {enabledPorts.includes('DAILY_ROI_PERCENT') && <OutputPort id="DAILY_ROI_PERCENT" label="Daily %" color="bg-indigo-400" />}
                        <div className="h-px bg-slate-800/50 my-1 font-black" />
                        {enabledPorts.includes('IS_BOOSTED') && <OutputPort id="IS_BOOSTED" label="is Boosted?" color="bg-cyan-400" />}
                        {enabledPorts.includes('AMOUNT') && <OutputPort id="AMOUNT" label="Amt ($)" color="bg-orange-400" />}
                        {enabledPorts.includes('CURRENCY') && <OutputPort id="CURRENCY" label="Coin" color="bg-slate-500" dataType="string" />}
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <OutputPort id="OUT" label="NEXT" color="bg-slate-100" />
                        </div>
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const UserHubNode = (props: FormulaNodeProps) => {
    const {
        enabledPorts = ['IS_ACTIVE', 'JOIN_DATE', 'SPONSOR_ID', 'REF_COUNT', 'ACTIVATED_BY', 'LATEST_ORDER_ID', 'TOTAL_ACTIVE_INVESTMENT', 'TOTAL_COLLECTED_ROI', 'TOTAL_REMAINING_ROI', 'ESTIMATED_DAILY_ROI']
    } = props.data;

    return (
        <BaseNode {...props} type="context" icon={Users} data={{ ...props.data, hideTargetHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[70px]">
                    <PortSectionLabel>Input</PortSectionLabel>
                    <InputPort id="userId" label="MEMBER ID" color="bg-indigo-500" dataType="string" />
                </div>

                <div className="flex-1 p-4 space-y-4 min-w-[260px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Member Hub
                        </div>
                    </div>

                    <div className="bg-indigo-500/5 rounded-lg border border-indigo-500/10 p-3 text-[9px] text-slate-400 leading-relaxed italic">
                        Real-time member intelligence. Manage identity and portfolio ports in the <b>Node Setup</b> window.
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[130px]">
                    <PortSectionLabel>Portfolio Totals</PortSectionLabel>
                    <div className="space-y-1">
                        {enabledPorts.includes('TOTAL_ACTIVE_INVESTMENT') && <OutputPort id="TOTAL_ACTIVE_INVESTMENT" label="Active Inv ($)" color="bg-indigo-500 font-black" />}
                        {enabledPorts.includes('ESTIMATED_DAILY_ROI') && <OutputPort id="ESTIMATED_DAILY_ROI" label="Est. Daily ($)" color="bg-emerald-500" />}
                        {enabledPorts.includes('TOTAL_COLLECTED_ROI') && <OutputPort id="TOTAL_COLLECTED_ROI" label="Total Rec." color="bg-orange-500" />}
                        {enabledPorts.includes('TOTAL_REMAINING_ROI') && <OutputPort id="TOTAL_REMAINING_ROI" label="Total Rem." color="bg-rose-500" />}
                        <div className="h-px bg-slate-800/50 my-1 font-black" />
                        {enabledPorts.includes('IS_ACTIVE') && <OutputPort id="IS_ACTIVE" label="is Active?" color="bg-emerald-500" />}
                        {enabledPorts.includes('LATEST_ORDER_ID') && <OutputPort id="LATEST_ORDER_ID" label="Latest Order" color="bg-orange-600" dataType="string" />}
                        {enabledPorts.includes('REF_COUNT') && <OutputPort id="REF_COUNT" label="Direct count" color="bg-blue-400" />}
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <OutputPort id="OUT" label="NEXT" color="bg-slate-100" />
                        </div>
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const FastStartActionNode = (props: FormulaNodeProps) => {
    return (
        <BaseNode {...props} type="action" icon={Rocket} data={{ ...props.data, hideTargetHandle: true }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[70px]">
                    <PortSectionLabel>Input</PortSectionLabel>
                    <InputPort id="userId" label="TARGET ID" color="bg-indigo-500" dataType="string" />
                </div>

                <div className="flex-1 p-4 space-y-3 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                            <Zap className="w-3 h-3" /> Fast-Track Action
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase font-black px-1">Reward Configuration</p>
                    <div className="grid grid-cols-1 gap-2">
                        <div className="bg-black/40 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-600">FORCE ACTIVATION</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Flow</PortSectionLabel>
                    <OutputPort id="OUT" label="NEXT" color="bg-slate-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const SubscriptionListNode = (props: FormulaNodeProps) => {
    const {
        enabledPorts = ['ORDER_IDS', 'ORDER_COUNT']
    } = props.data;

    return (
        <BaseNode {...props} type="subscription_list" icon={Layers} data={{ ...props.data, hideTargetHandle: false }}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[70px]">
                    <PortSectionLabel>Member</PortSectionLabel>
                    <InputPort id="userId" label="MEMBER ID" color="bg-indigo-500" dataType="string" />
                </div>

                <div className="flex-1 p-4 space-y-4 min-w-[200px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" /> Subscription Hub
                        </div>
                    </div>
                    <div className="bg-orange-500/5 rounded-lg border border-orange-500/10 p-3 text-[9px] text-slate-400 leading-relaxed italic">
                        Scans the database for ALL active subscriptions. Configure handles in the <b>Node Setup</b> window.
                    </div>
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[120px]">
                    <PortSectionLabel>Collection</PortSectionLabel>
                    <div className="space-y-1">
                        {enabledPorts.includes('ORDER_IDS') && <OutputPort id="ORDER_IDS" label="Order List" color="bg-orange-500" dataType="array" />}
                        {enabledPorts.includes('ORDER_COUNT') && <OutputPort id="ORDER_COUNT" label="Active Count" color="bg-slate-400" />}
                        <div className="mt-auto pt-2 border-t border-slate-800/50">
                            <OutputPort id="OUT" label="NEXT" color="bg-slate-100" />
                        </div>
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const DbFetchNode = (props: FormulaNodeProps) => {
    const { table = 'users', column = 'status', useGate = false } = props.data;
    return (
        <BaseNode {...props} type="db_fetch" icon={Database}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[90px]">
                    <PortSectionLabel>Inputs</PortSectionLabel>
                    <InputPort id="user_id" label="Member ID" color="bg-indigo-500" dataType="string" />
                    {useGate && <InputPort id="gate_input" label="GATE" color="bg-amber-500" dataType="boolean" />}
                </div>

                <div className="flex-1 p-3 space-y-3 min-w-[200px]">
                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-1 mb-1">Direct DB Fetch</div>
                    <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-500">TABLE</span>
                            <span className="text-[10px] font-black text-white uppercase">{table}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-500">COLUMN</span>
                            <span className="text-[10px] font-black text-white uppercase">{column}</span>
                        </div>
                    </div>
                    {useGate && (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[8px] font-black text-amber-500 uppercase">Gated Execution Active</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[100px]">
                    <PortSectionLabel>Output</PortSectionLabel>
                    <OutputPort id="RESULT" label="VALUE" color="bg-blue-500" />
                    <div className="mt-auto">
                        <OutputPort id="success" label="FLOW" color="bg-slate-500" />
                    </div>
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

const DbUpdateNode = (props: FormulaNodeProps) => {
    const { table = 'users', column = 'status', useGate = false } = props.data;
    return (
        <BaseNode {...props} type="db_update" icon={Database}>
            <NodeLayout>
                <div className="flex flex-col py-2 border-r border-slate-800/60 min-w-[90px]">
                    <PortSectionLabel>Inputs</PortSectionLabel>
                    <InputPort id="user_id" label="Member ID" color="bg-indigo-500" dataType="string" />
                    <InputPort id="value" label="New Value" color="bg-emerald-500" />
                    {useGate && <InputPort id="gate_input" label="GATE" color="bg-amber-500" dataType="boolean" />}
                </div>

                <div className="flex-1 p-3 space-y-3 min-w-[200px]">
                    <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-1 mb-1">Direct DB Update</div>
                    <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-500">TARGET TABLE</span>
                            <span className="text-[10px] font-black text-white uppercase">{table}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold text-slate-500">TARGET COL</span>
                            <span className="text-[10px] font-black text-white uppercase">{column}</span>
                        </div>
                    </div>
                    {useGate && (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span className="text-[8px] font-black text-amber-500 uppercase">Gated Execution Active</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col py-2 border-l border-slate-800/60 min-w-[90px]">
                    <PortSectionLabel>Flow</PortSectionLabel>
                    <OutputPort id="success" label="DONE" color="bg-emerald-500" />
                </div>
            </NodeLayout>
        </BaseNode>
    );
};

export const nodeTypes = {
    trigger: memo(TriggerNode),
    condition: memo(ConditionNode),
    action: memo(ActionNode),
    math: memo(MathNode),
    loop: memo(LoopNode),
    context: memo(ContextNode),
    script: memo(ScriptNode),
    booster_slab: memo(BoosterSlabNode),
    level_income: memo(LevelIncomeNode),
    fast_start: memo(FastStartNode),
    wallet_bucket: memo(WalletSplitterNode),
    plan_context: memo(PlanContextNode),
    plan_catalog: memo(PlanCatalogNode),
    order_hub: memo(PackageOrderNode),
    user_hub: memo(UserHubNode),
    subscription_list: memo(SubscriptionListNode),
    fast_track_action: memo(FastStartActionNode),
    wallet_splitter: memo(WalletSplitterNode),
    sub_flow: memo(SubFlowNode),
    logic_gate: memo(LogicGateNode),
    switch: memo(SwitchNode),
    activate_member_test: memo(ActivateMemberTestNode),
    member_registration_test: memo(MemberRegistrationTestNode),
    group: memo(GroupNode),
    comment: memo(CommentNode),
    display: memo(UniversalDisplayNode),
    sponsor_income: memo(SponsorIncomeNode),
    constant_input: memo(ConstantInputNode),
    wallets: memo(WalletsNode),
    total_investment: memo(TotalInvestmentNode),
    webhook: memo(WebhookNode),
    scheduler: memo(TimeSchedulerNode),
    dashboard_card: memo(DashboardCardNode),
    send_notification: memo(NotificationNode),
    account_executive: memo(AccountExecutiveNode),
    db_fetch: memo(DbFetchNode),
    db_update: memo(DbUpdateNode),
};

