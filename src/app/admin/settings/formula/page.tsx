"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Edge,
  Node,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './components/NodeTypes';
import DeletableEdge from './components/CustomEdge';
import { Toolbox } from './components/Toolbox';
import { Terminal } from './components/Terminal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/context/AuthContext';
import { hasDeveloperScope } from '@/lib/companyRoleScope';
import { 
  Play, Save, FilePlus, Settings, 
  User as UserIcon, Activity, Zap, Info, X,
  FolderOpen, ChevronRight, FileCode, Download, Upload,
  Cpu, Layout, Trash2, Plus, Minus, Lock, Unlock, Route, Palette, MessageSquare, Ungroup, Link2, Calculator, Package, Clock,
  Target, TrendingUp, Wallet, Layers, Repeat, Database, EyeOff
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: { label: 'Manual Trigger', event: 'ON_MANUAL' },
  },
];

import { SimulationContext } from './components/SimulationContext';

const initialEdges: Edge[] = [];

const SUGGESTED_VARIABLES = [
    { id: 'DIRECT_COUNT', label: 'Active Directs', color: 'text-indigo-400', desc: 'Total active direct referrals' },
    { id: 'TEAM_VOLUME', label: 'Team Volume ($)', color: 'text-emerald-400', desc: 'Total downline paid volume' },
    { id: 'ORDER_AMOUNT', label: 'Order Amt ($)', color: 'text-orange-400', desc: 'Amount of triggering/last order' },
    { id: 'MEMBER_RANK', label: 'User Rank', color: 'text-cyan-400', desc: 'Current rank name of user' },
    { id: 'PLAN_ID', label: 'Plan ID', color: 'text-amber-400', desc: 'ID of the selected/trigger plan' },
];

const VariableSuggestions = ({ onSelect }: { onSelect: (val: string) => void }) => (
    <div className="space-y-2 mt-4 bg-black/40 p-3 rounded-2xl border border-slate-800/50">
        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
            <Activity className="w-2.5 h-2.5" /> Simulation Suggestions
        </label>
        <div className="flex flex-wrap gap-1.5 mt-2">
            {SUGGESTED_VARIABLES.map(v => (
                <button
                    key={v.id}
                    onClick={() => onSelect(v.id)}
                    title={v.desc}
                    className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-400 hover:border-emerald-500/50 hover:text-white transition-all flex items-center gap-1.5"
                >
                    <span className={v.color}>${v.id}</span>
                </button>
            ))}
        </div>
    </div>
);

const edgeTypes = {
    default: DeletableEdge,
};

function FlowBuilderInner() {
  const { user, isLoading } = useAuth();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [mounted, setMounted] = useState(false);
  
  // Workflow State
  const [flows, setFlows] = useState<any[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | number | null>(null);
  const [flowKey, setFlowKey] = useState('UNNAMED_FLOW');
  const [flowName, setFlowName] = useState('New Simulation Flow');
  
  // Canvas State
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [edgeRoutingType, setEdgeRoutingType] = useState<'bezier' | 'straight' | 'smoothstep' | 'step'>('bezier');
  const selectedNodeData = (selectedNode?.data ?? {}) as Record<string, any>;
  
  const updateRouting = useCallback((type: 'bezier' | 'straight' | 'smoothstep' | 'step') => {
      setEdgeRoutingType(type);
      setEdges((eds) => eds.map(e => ({ 
          ...e, 
          data: { ...e.data, routing: type },
          animated: e.animated // preserve animation
      })));
      toast.success(`Routing set to ${type.toUpperCase()}`, {
          style: { background: '#0f172a', color: '#fff', border: '1px solid #1e293b' }
      });
  }, [setEdges]);
  
  // UI Panels
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  
  // Simulation & Playback State
  const [logs, setLogs] = useState<any[]>([]);
  const [testUserId, setTestUserId] = useState<string | number>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [userOptions, setUserOptions] = useState<any[]>([]);
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null);
  const [executedNodeIds, setExecutedNodeIds] = useState<Set<string>>(new Set());
  const [failedNodeIds, setFailedNodeIds] = useState<Set<string>>(new Set());
  
  // Dynamic Global Settings Context
  const [globalContext, setGlobalContext] = useState<any>({ settings: {}, wallets: {}, plans: [] });
  const [currentFlowStatus, setCurrentFlowStatus] = useState<'DRAFT' | 'ACTIVE' | 'DELETED'>('DRAFT');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState<number | null>(null);

  const areIdListsEqual = useCallback((a: string[], b: string[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }, []);

  const renderNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isExecuting: runningNodeId === n.id,
          isExecuted: executedNodeIds.has(n.id),
          isFailed: failedNodeIds.has(n.id),
        },
      })),
    [nodes, runningNodeId, executedNodeIds, failedNodeIds]
  );

  const renderEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        animated: executedNodeIds.has(e.source) && executedNodeIds.has(e.target),
        style: {
          ...e.style,
          stroke:
            executedNodeIds.has(e.source) && executedNodeIds.has(e.target)
              ? '#10b981'
              : '#1e293b',
          strokeWidth:
            executedNodeIds.has(e.source) && executedNodeIds.has(e.target) ? 3 : 2,
        },
      })),
    [edges, executedNodeIds]
  );
  
  useEffect(() => {
    setMounted(true);
    fetchUsers();
    fetchFlows();
    fetchContextData();
  }, []);

  useEffect(() => {
    if (testUserId) fetchContextData(testUserId);
  }, [testUserId]);
  
  const fetchContextData = async (uid?: string | number) => {
    try {
        const res = await api.get('/compensation/context-data', { params: { userId: uid } });
        if (res.data?.success) {
            setGlobalContext({
                settings: res.data.settings || {},
                wallets: res.data.wallets || {},
                plans: res.data.plans || [],
                user: res.data.user || { packages: [], totalInvested: 0, balances: {} }
            });
        }
    } catch (err) {
        console.error("Failed to fetch context data", err);
    }
  };

  const fetchUsers = async () => {
    try {
        const res = await api.get('/mlm/members', { params: { limit: 50 } });
        if (res.data?.data) {
            setUserOptions(res.data.data.map((u: any) => ({
                value: u.id,
                label: `User #${u.id}`,
                subLabel: u.wallet_address || 'No Wallet'
            })));
        }
    } catch (err) {
        console.error("Failed to fetch users", err);
    }
  };

  const fetchFlows = async () => {
      try {
          const res = await api.get('/compensation/flows');
          setFlows(res.data || []);
      } catch (err) {
          console.error("Failed to fetch flows", err);
      }
  };

  const loadFlow = async (id: number) => {
      try {
          const res = await api.get(`/compensation/flows/${id}`);
          const flow = res.data;
          setActiveFlowId(id);
          setFlowKey(flow.flow_key);
          setFlowName(flow.name);
          setCurrentFlowStatus(flow.status || 'DRAFT');
          const graph = flow.graph_json || flow.definition; // handle both naming conventions
          if (graph && Array.isArray(graph.nodes)) {
              const safeNodes = graph.nodes.map((n: any) => ({
                 ...n,
                 position: n.position || { x: 0, y: 0 } 
              }));
              setNodes(safeNodes);
              setEdges(Array.isArray(graph.edges) ? graph.edges : []);
              setTimeout(() => fitView(), 100);
          } else {
              setNodes(initialNodes);
              setEdges(initialEdges);
          }
          setIsDrawerOpen(false);
          toast.success(`Loaded ${flow.name} [${flow.status}]`);
      } catch (err) {
          toast.error("Failed to load flow");
      }
  };

  const createNewFlow = () => {
    setActiveFlowId(null);
    setFlowKey(`FLOW_${Date.now()}`);
    setFlowName('Untitled Flow');
    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsDrawerOpen(false);
    toast.success("Ready for new logic");
  };

  const deleteFlow = async (id: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const target = flows.find(f => String(f.id) === String(id));
      if (!target) {
          toast.error("Could not find flow metadata");
          return;
      }
      
      if (target.status === 'ACTIVE') {
          setFlowToDelete(id);
          setIsDeleteConfirmOpen(true);
          return;
      }

      if (!confirm(`Are you sure you want to permanently delete draft "${target.name || 'this flow'}"?`)) return;
      executeDelete(id);
  };

  const executeDelete = async (id: number) => {
      try {
          const t = toast.loading("Removing logic...");
          await api.delete(`/compensation/flows/${id}`);
          toast.dismiss(t);
          toast.success("Flow removed successfully");
          if (String(activeFlowId) === String(id)) createNewFlow();
          setIsDeleteConfirmOpen(false);
          setFlowToDelete(null);
          fetchFlows();
      } catch (err) {
          toast.dismiss();
          toast.error("Failed to delete flow");
      }
  };

  const publishFlow = async () => {
      if (!activeFlowId) {
          toast.error("Save the flow first before publishing");
          return;
      }
      try {
          const t = toast.loading("Promoting to ACTIVE...");
          await api.post(`/compensation/flows/publish/${activeFlowId}`);
          toast.dismiss(t);
          setCurrentFlowStatus('ACTIVE');
          fetchFlows();
          toast.success("Flow is now LIVE in the engine");
      } catch (err) {
          toast.dismiss();
          toast.error("Publishing failed");
      }
  };

  const unpublishFlow = async () => {
      if (!activeFlowId) return;
      try {
          const t = toast.loading("Suspending live flow...");
          await api.post(`/compensation/flows/unpublish/${activeFlowId}`);
          toast.dismiss(t);
          setCurrentFlowStatus('DRAFT');
          fetchFlows();
          toast.success("Flow suspended back to DRAFT");
      } catch (err) {
          toast.dismiss();
          toast.error("Suspension failed");
      }
  };

  const onNodesDelete = useCallback((deleted: Node[]) => {
    toast.success(`${deleted.length} node(s) removed`);
  }, []);

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    toast.success("Node deleted");
  };

  const deleteSelection = useCallback(() => {
    if (!selectedNodeIds.length && !selectedEdgeIds.length) return;
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !selectedEdgeIds.includes(e.id) &&
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target)
      )
    );
    setSelectedNode(null);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    toast.success("Selection deleted");
  }, [selectedNodeIds, selectedEdgeIds]);

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    if (selectedNode?.id === id) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...newData } });
    }
  };

  const lockSelectedNodes = (locked: boolean) => {
    if (!selectedNodeIds.length) return;
    setNodes((nds) =>
      nds.map((n) =>
        selectedNodeIds.includes(n.id)
          ? { ...n, data: { ...n.data, locked }, draggable: !locked }
          : n
      )
    );
    if (selectedNode && selectedNodeIds.includes(selectedNode.id)) {
      setSelectedNode({
        ...selectedNode,
        data: { ...selectedNode.data, locked },
        draggable: !locked,
      });
    }
    toast.success(locked ? "Selected nodes locked" : "Selected nodes unlocked");
  };

  const groupSelectedNodes = () => {
    if (selectedNodeIds.length < 2) {
      toast.error("Select at least 2 nodes to group");
      return;
    }
    const selected = nodes.filter((n) => selectedNodeIds.includes(n.id) && n.type !== 'group');
    if (!selected.length) return;
    const minX = Math.min(...selected.map((n) => n.position.x));
    const minY = Math.min(...selected.map((n) => n.position.y));
    const maxX = Math.max(...selected.map((n) => n.position.x + (n.width || n.measured?.width || 220)));
    const maxY = Math.max(...selected.map((n) => n.position.y + (n.height || n.measured?.height || 140)));
    const groupId = `group_${Date.now()}`;
    const padding = 40;
    const groupNode: Node = {
      id: groupId,
      type: 'group',
      position: { x: minX - padding, y: minY - padding },
      data: { label: `Group ${groupId.slice(-4)}`, color: '#10b981', comment: '' },
      style: { width: Math.max(320, maxX - minX + padding * 2), height: Math.max(220, maxY - minY + padding * 2) },
      draggable: true,
      selectable: true,
    };
    setNodes((nds) => {
      const mapped = nds.map((n) => {
        if (!selectedNodeIds.includes(n.id) || n.type === 'group') return n;
        return {
          ...n,
          parentId: groupId,
          extent: 'parent' as const,
          position: {
            x: n.position.x - groupNode.position.x,
            y: n.position.y - groupNode.position.y,
          },
        };
      });
      return [...mapped, groupNode];
    });
    setSelectedNodeIds([groupId]);
    toast.success("Nodes grouped");
  };

  const ungroupSelectedNodes = () => {
    if (!selectedNodeIds.length) return;
    const targetGroups = nodes.filter((n) => selectedNodeIds.includes(n.id) && n.type === 'group');
    if (!targetGroups.length) {
      toast.error("Select a group to ungroup");
      return;
    }
    const groupIds = new Set(targetGroups.map((g) => g.id));
    const groupPosMap = new Map(targetGroups.map((g) => [g.id, g.position]));
    setNodes((nds) =>
      nds
        .flatMap((n) => {
          if (groupIds.has(n.id)) return [];
          if (n.parentId && groupIds.has(n.parentId)) {
            const gp = groupPosMap.get(n.parentId) || { x: 0, y: 0 };
            return [{
              ...n,
              parentId: undefined,
              extent: undefined,
              position: { x: n.position.x + gp.x, y: n.position.y + gp.y },
            }];
          }
          return [n];
        })
    );
    setSelectedNode(null);
    setSelectedNodeIds([]);
    toast.success("Group removed");
  };

  const autoJoinSelectedNodes = () => {
    const selected = nodes
      .filter((n) => selectedNodeIds.includes(n.id))
      .sort((a, b) => (a.position.x - b.position.x) || (a.position.y - b.position.y));
    if (selected.length < 2) {
      toast.error("Select at least 2 nodes to join");
      return;
    }
    const newEdges: Edge[] = [];
    for (let i = 0; i < selected.length - 1; i++) {
      const source = selected[i];
      const target = selected[i + 1];
      newEdges.push({
        id: `e_auto_${source.id}_${target.id}_${Date.now()}_${i}`,
        source: source.id,
        target: target.id,
        type: edgeRoutingType,
        animated: true,
        style: { strokeWidth: 2 },
      });
    }
    setEdges((eds) => [...eds, ...newEdges]);
    toast.success("Selected nodes joined");
  };

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          { 
            ...params, 
            animated: true, 
            type: 'default', 
            data: { routing: edgeRoutingType },
            style: { strokeWidth: 2 } 
          },
          eds
        )
      ),
    [edgeRoutingType, setEdges]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
      const nextNodeIds = selNodes.map((n) => n.id);
      const nextEdgeIds = selEdges.map((e) => e.id);

      setSelectedNodeIds((prev) => (areIdListsEqual(prev, nextNodeIds) ? prev : nextNodeIds));
      setSelectedEdgeIds((prev) => (areIdListsEqual(prev, nextEdgeIds) ? prev : nextEdgeIds));

      if (selNodes.length === 1) {
        const nextNode = selNodes[0] as Node;
        setSelectedNode((prev) => (prev?.id === nextNode.id ? prev : nextNode));
      } else {
        setSelectedNode((prev) => (prev ? null : prev));
      }
    },
    [areIdListsEqual]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');
      const extraJson = event.dataTransfer.getData('application/extra');
      const extra = extraJson ? JSON.parse(extraJson) : {};
      
      if (!type) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { 
            label, 
            ...extra,
            event: type === 'trigger' ? (extra.event || 'ON_PACKAGE_PURCHASE') : extra.event,
            operator: type === 'condition' ? '>=' : extra.operator,
            value: type === 'condition' ? 0 : extra.value,
            actionType: type === 'action' ? 'CREDIT_WALLET' : extra.actionType,
            traversalType: type === 'loop' ? 'UPLINE_CHAIN' : extra.traversalType,
            code: type === 'script' ? '// variables.bonus = 100;\nreturn { success: true };' : '',
            planId: type === 'plan_catalog' ? '' : extra.planId,
            simulationAmount: type === 'plan_catalog' ? (extra.simulationAmount || '') : extra.simulationAmount,
            outputWallet: type === 'plan_catalog' ? 'roi_balance' : extra.outputWallet,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const target = event.target as HTMLElement | null;
        const tag = (target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
        event.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deleteSelection]);

  const addLog = (type: string, id: string, message: string) => {
    setLogs(prev => [{
      id,
      type,
      timestamp: new Date().toISOString(),
      message
    }, ...prev]);
  };

  const runSimulation = async () => {
    if (!testUserId) {
        toast.error("Choose a Test User first");
        return;
    }
    
    setIsSimulating(true);
    setIsTerminalOpen(true);
    setLogs([]); 
    setExecutedNodeIds(new Set());
    setFailedNodeIds(new Set());
    addLog('system', 'IDE', `Initializing trace for User #${testUserId}...`);
    
    try {
      const response = await api.post('/compensation/simulate', {
        userId: testUserId,
        flow: { nodes, edges, id: activeFlowId, key: flowKey }
      });

      if (response.data.success) {
        const trace = response.data.executionTrace || [];
        
        for (let i = 0; i < trace.length; i++) {
            const step = trace[i];
            setRunningNodeId(step.id);
            addLog(step.type, step.id, step.message);
            
            // Sync Result to Node Data
            setNodes((nds) => nds.map(n => {
                if (n.id === step.id) {
                    return { 
                        ...n, 
                        data: { 
                            ...n.data, 
                            lastResult: {
                                status: step.status,
                                message: step.message,
                                produced: step.produced,
                                timestamp: step.timestamp
                            } 
                        } 
                    };
                }
                return n;
            }));

            if (step.status === 'failure' || step.message?.toLowerCase().includes('error')) {
                setFailedNodeIds(prev => new Set(prev).add(step.id));
            } else {
                setExecutedNodeIds(prev => new Set(prev).add(step.id));
            }
            
            await new Promise(r => setTimeout(r, 150)); 
        }
        
        setRunningNodeId(null);
        addLog('system', 'IDE', 'Trace completed pulse playback.');
      } else {
          addLog('error', 'IDE', response.data.message);
      }
    } catch (err: any) {
        setRunningNodeId(null);
        addLog('error', 'SYS', `Execution Error: ${err.message}`);
        toast.error("Simulation failed");
    } finally {
        setIsSimulating(false);
    }
  };

  const saveFlow = async () => {
      try {
          const t = toast.loading("Persisting version...");
          const res = await api.post('/compensation/flows/save', {
              id: activeFlowId,
              flow_key: flowKey,
              name: flowName,
              graph_json: { nodes, edges }
          });
          toast.dismiss(t);
          setActiveFlowId(res.data.id);
          setCurrentFlowStatus('DRAFT'); // Reset to draft when saved
          fetchFlows();
          toast.success("Saved as Draft");
      } catch (err) {
          toast.dismiss(); // Clear all loading toasts
          toast.error("Failed to save flow");
      }
  };

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  useEffect(() => {
    let interval: any;
    if (autoRefreshEnabled && testUserId) {
      interval = setInterval(() => {
        fetchContextData(testUserId);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, testUserId]);

  const handleImport = () => {
      try {
          const parsed = JSON.parse(importJson);
          const graph =
            (parsed?.nodes && parsed?.edges ? parsed : null) ||
            (parsed?.graph_json?.nodes && parsed?.graph_json?.edges ? parsed.graph_json : null) ||
            (parsed?.definition?.nodes && parsed?.definition?.edges ? parsed.definition : null) ||
            (parsed?.flow?.nodes && parsed?.flow?.edges ? parsed.flow : null);

          if (!graph) {
            toast.error("Invalid JSON format");
            return;
          }

          const safeNodes = Array.isArray(graph.nodes)
            ? graph.nodes.map((n: any) => ({ ...n, position: n.position || { x: 0, y: 0 } }))
            : [];
          const safeEdges = Array.isArray(graph.edges) ? graph.edges : [];

          setNodes(safeNodes);
          setEdges(safeEdges);
          setIsImportOpen(false);
          setImportJson('');
          toast.success("Logic Imported");
      } catch (err) {
          toast.error("Invalid JSON format");
      }
  };

  const copyExportJson = async () => {
    const payload = JSON.stringify({ nodes, edges, key: flowKey, name: flowName }, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("Export JSON copied");
    } catch {
      toast.error("Clipboard copy blocked. Select and copy manually.");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#060c14]">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#060c14] text-slate-200 overflow-hidden font-sans select-none">
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[60] flex">
            <div className="absolute inset-0 bg-[#060c14]/80 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
            <div className="w-80 h-full bg-[#0d1626] border-r border-slate-800 shadow-2xl z-10 flex flex-col transform animate-in slide-in-from-left duration-300">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">Workflows</h2>
                    <button onClick={() => setIsDrawerOpen(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-4 border-b border-slate-800/50">
                    <button onClick={createNewFlow} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all">
                        <FilePlus className="w-4 h-4" /> New Compensation Version
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {flows.map(f => (
                        <div 
                            key={f.id} 
                            onClick={() => loadFlow(f.id)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${f.id === activeFlowId ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'}`}
                        >
                            <div className="flex items-center justify-between font-bold text-xs mb-1">
                                <span className="truncate max-w-[140px]">{f.name}</span>
                                <div className="flex items-center gap-1">
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border mr-1 ${
                                        f.status === 'ACTIVE' 
                                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    }`}>
                                        {f.status}
                                    </span>
                                    <button 
                                        onClick={(e) => deleteFlow(f.id, e)}
                                        title="Delete Workflow"
                                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <ChevronRight className={`w-3 h-3 group-hover:translate-x-1 transition-transform ${f.id === activeFlowId ? 'text-emerald-500' : 'text-slate-700'}`} />
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                                <Cpu className="w-2.5 h-2.5" /> {f.flow_key}
                            </div>
                        </div>
                    ))}
                    {flows.length === 0 && <p className="text-center text-[10px] text-slate-600 py-12 font-bold uppercase tracking-widest">No workflows found</p>}
                </div>
            </div>
        </div>
      )}

      <header className="h-14 border-b border-slate-800 bg-[#0d1626] flex items-center justify-between px-6 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white">
            <Layout className="w-5 h-5" />
          </button>
          
          <div className="w-[1px] h-4 bg-slate-800" />
          
          <div className="flex flex-col">
              <div className="flex items-center gap-2 group/name">
                  <input 
                      className="bg-transparent border-none text-sm font-black text-white focus:outline-none p-0 w-auto min-w-[100px] hover:bg-slate-800/30 rounded px-1 transition-all"
                      value={flowName} 
                      onChange={(e) => setFlowName(e.target.value)} 
                      placeholder="Enter Flow Name..."
                  />
                  <FileCode className="w-3 h-3 text-slate-500 group-hover/name:text-emerald-500 transition-colors" />
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black tracking-widest uppercase">V2.0</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-tighter uppercase border ${
                        currentFlowStatus === 'ACTIVE' 
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                        {currentFlowStatus}
                    </span>
                  </div>
              </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest opacity-60">
                <span className="text-emerald-500/50 px-1 border border-emerald-500/20 rounded">KEY</span> {flowKey}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={groupSelectedNodes}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors"
            title="Group selected nodes"
          >
            <Layout className="w-3.5 h-3.5" /> GROUP
          </button>
          <button
            onClick={ungroupSelectedNodes}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors"
            title="Ungroup selected group"
          >
            <Ungroup className="w-3.5 h-3.5" /> UNGROUP
          </button>
          <button
            onClick={() => lockSelectedNodes(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors"
            title="Lock selected node positions"
          >
            <Lock className="w-3.5 h-3.5" /> LOCK
          </button>
          <button
            onClick={() => lockSelectedNodes(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors"
            title="Unlock selected node positions"
          >
            <Unlock className="w-3.5 h-3.5" /> UNLOCK
          </button>
          <button
            onClick={autoJoinSelectedNodes}
            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors"
            title="Auto join selected nodes"
          >
            <Link2 className="w-3.5 h-3.5" /> JOIN
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#060c14]/50 px-2 py-1">
            <Route className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={edgeRoutingType}
              onChange={(e) => updateRouting(e.target.value as any)}
              className="bg-transparent text-[10px] font-black text-slate-300 outline-none cursor-pointer"
              title="Edge routing type"
            >
              <option value="bezier">Bezier (Curve)</option>
              <option value="smoothstep">Smooth Step (Joints)</option>
              <option value="step">Step (Sharp)</option>
              <option value="straight">Straight (Direct)</option>
            </select>
          </div>
          <button onClick={() => setIsExportOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors">
            <Download className="w-3.5 h-3.5" /> EXPORT
          </button>
          <button onClick={() => setIsImportOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black text-slate-400 hover:text-white transition-colors">
            <Upload className="w-3.5 h-3.5" /> IMPORT
          </button>
          <button 
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${
                autoRefreshEnabled 
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.2)]' 
                : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
            title="Sync live simulation context every 5s"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${autoRefreshEnabled ? 'bg-sky-400 animate-pulse' : 'bg-slate-700'}`} />
            AUTO-SYNC
          </button>
          <div className="w-[1px] h-4 bg-slate-800 mx-1" />
          <button 
            onClick={runSimulation} 
            disabled={isSimulating} 
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-pulse' : ''}`} fill="currentColor" />
            TEST SANDBOX
          </button>
          <button onClick={saveFlow} className="flex items-center gap-2 px-5 py-1.5 bg-slate-800 text-white rounded-xl text-[10px] font-black hover:bg-slate-700 transition-all border border-slate-700">
            <Save className="w-3.5 h-3.5" /> SAVE DRAFT
          </button>
          
          {currentFlowStatus === 'ACTIVE' ? (
              <button 
                onClick={unpublishFlow}
                className="flex items-center gap-2 px-6 py-1.5 bg-amber-600/10 text-amber-500 border border-amber-500/30 rounded-xl text-[10px] font-black hover:bg-amber-600 hover:text-white transition-all"
              >
                  <EyeOff className="w-3.5 h-3.5" /> SUSPEND LIVE
              </button>
          ) : (
              <button 
                onClick={publishFlow}
                disabled={!activeFlowId}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/10 disabled:opacity-50"
              >
                  <Zap className="w-3.5 h-3.5" fill="currentColor" /> GO LIVE
              </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Toolbox />

        <main className="flex-1 relative bg-[#060c14] flex flex-col overflow-hidden border-r border-slate-800">
          <div className="flex-1 relative overflow-hidden" onDrop={onDrop} onDragOver={onDragOver}>
            <SimulationContext.Provider value={globalContext}>
              <ReactFlow
              nodes={renderNodes}
              edges={renderEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={onNodesDelete}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNode(node)}
              onSelectionChange={onSelectionChange}
              onPaneClick={() => {
                  setSelectedNode(null);
                  setExecutedNodeIds(new Set());
                  setFailedNodeIds(new Set());
                  setSelectedNodeIds([]);
                  setSelectedEdgeIds([]);
              }}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionMode={ConnectionMode.Loose}
              deleteKeyCode={['Delete', 'Backspace']}
              fitView
              colorMode="dark"
            >
              <Background color="#1e293b" gap={24} size={1} />
              <Controls position="bottom-right" className="bg-[#0d1626] border-slate-800" />
              <MiniMap 
                nodeStrokeColor={(n) => n.type === 'trigger' ? '#a855f7' : n.type === 'action' ? '#f97316' : '#1e293b'} 
                nodeColor={() => '#0d1626'}
                maskColor="rgba(6, 12, 20, 0.7)"
                className="bg-[#0d1626] border-slate-800"
              />
              <Panel position="top-left" className="bg-[#111827]/80 backdrop-blur-xl p-3.5 rounded-2xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-2 w-72 mt-4 ml-4">
                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-1 tracking-widest">
                    <UserIcon className="w-3 h-3 text-emerald-500" /> Test Subject Selector
                </span>
                <SearchableSelect 
                  options={userOptions}
                  value={testUserId}
                  onChange={(val) => setTestUserId(val)}
                  placeholder="Select a test user..."
                />
              </Panel>
             </ReactFlow>
            </SimulationContext.Provider>
          </div>

          <Terminal logs={logs} onClear={() => setLogs([])} isOpen={isTerminalOpen} onToggle={() => setIsTerminalOpen(!isTerminalOpen)} />
        </main>

        <aside className={`w-80 bg-[#0d1626] transition-all duration-300 transform border-l border-slate-800 ${selectedNode ? 'translate-x-0 relative' : 'translate-x-full fixed right-0 h-full'}`}>
          {selectedNode ? (
            <div className="flex flex-col h-full overflow-hidden">
               <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#060c14]/30">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-emerald-500" /> Node Setup
                  </h3>
                  <div className="flex items-center gap-1">
                    <button 
                        onClick={deleteSelectedNode}
                        title="Delete Node Permanent"
                        className="text-slate-500 hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all group/del"
                    >
                        <Trash2 className="w-4 h-4 group-hover/del:scale-110" />
                    </button>
                    <div className="w-px h-4 bg-slate-800 mx-1" />
                    <button onClick={() => setSelectedNode(null)} title="Close Setup" className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-all">
                        <X className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0d1626]">
                  <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col gap-2 shadow-inner">
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Execution Path ID</span>
                     <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-emerald-500 font-bold uppercase">{selectedNode.id}</span>
                        <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">{selectedNode.type}</span>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Friendly Label</label>
                        <input 
                          type="text" 
                          value={selectedNodeData.label || ''} 
                          onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                          className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => updateNodeData(selectedNode.id, { locked: !Boolean(selectedNodeData.locked) })}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider border transition-all ${selectedNodeData.locked ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}
                        >
                          {selectedNodeData.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {selectedNodeData.locked ? 'Unlock Position' : 'Lock Position'}
                        </button>
                        <button
                          onClick={deleteSelection}
                          className="inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                     </div>

                     <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                          <MessageSquare className="w-3 h-3 text-sky-400" />
                          Comment
                        </label>
                        <textarea
                          value={selectedNodeData.comment || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { comment: e.target.value })}
                          placeholder="Add internal notes..."
                          rows={3}
                          className="w-full resize-y bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-300 outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                     </div>

                     {selectedNode.type === 'group' && (
                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-800/50">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                            <Palette className="w-3 h-3 text-emerald-400" />
                            Group Color
                          </label>
                          <input
                            type="color"
                            value={selectedNodeData.color || '#10b981'}
                            onChange={(e) => updateNodeData(selectedNode.id, { color: e.target.value })}
                            className="h-10 w-full rounded-xl border border-slate-800 bg-[#060c14] p-1"
                          />
                        </div>
                     )}

                     {selectedNode.type === 'trigger' && (
                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-800/50">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Event Type</label>
                            <select 
                                value={selectedNodeData.event || 'ON_PACKAGE_PURCHASE'} 
                                onChange={(e) => updateNodeData(selectedNode.id, { event: e.target.value })}
                                className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-200"
                            >
                                <option value="ON_MANUAL">Manual Launch</option>
                                <option value="ON_PACKAGE_PURCHASE">Package Activation</option>
                                <option value="ON_SUBSCRIPTION_RENEWAL">Subscription Renewal</option>
                            </select>
                        </div>
                     )}

                     {selectedNode.type === 'condition' && (
                       <div className="space-y-4 pt-4 border-t border-slate-800/50">
                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Check Property</label>
                             <input 
                                type="text"
                                placeholder="VARIABLE_NAME"
                                value={selectedNodeData.variable || ''} 
                                onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value.toUpperCase() })}
                                className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-mono text-amber-500 font-bold"
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                             <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Operator</label>
                                <select 
                                   value={selectedNodeData.operator || '>='} 
                                   onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                                   className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                >
                                   <option value=">=">&gt;=</option>
                                   <option value="==">==</option>
                                   <option value="<=">&lt;=</option>
                                </select>
                             </div>
                             <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Value</label>
                                <input 
                                   type="number" 
                                   value={selectedNodeData.value || 0} 
                                   onChange={(e) => updateNodeData(selectedNode.id, { value: Number(e.target.value) })}
                                   className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                />
                             </div>
                          </div>
                       </div>
                     )}

                      {selectedNode.type === 'logic_gate' && (
                        <div className="space-y-4 pt-4 border-t border-slate-800/50">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Combination Mode</label>
                                <select 
                                    value={selectedNodeData.combineMode || 'AND'} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { combineMode: e.target.value })}
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                >
                                    <option value="AND">Match ALL (AND)</option>
                                    <option value="OR">Match ANY (OR)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Conditions</label>
                                    <button 
                                        onClick={() => {
                                            const conditions = selectedNodeData.conditions || [];
                                            updateNodeData(selectedNode.id, { 
                                                conditions: [...conditions, { variable: 'VAR', operator: '>=', value: 0 }] 
                                            });
                                        }}
                                        className="p-1 px-2 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 text-[8px] font-black hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-2 h-2" /> ADD ROW
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(selectedNodeData.conditions || []).map((c: any, index: number) => (
                                        <div key={index} className="grid grid-cols-12 gap-1.5 items-center">
                                            <input 
                                                className="col-span-5 bg-black/40 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-amber-500"
                                                value={c.variable}
                                                onChange={(e) => {
                                                    const conditions = [...selectedNodeData.conditions];
                                                    conditions[index].variable = e.target.value.toUpperCase();
                                                    updateNodeData(selectedNode.id, { conditions });
                                                }}
                                            />
                                            <select 
                                                className="col-span-3 bg-black/40 border border-slate-800 rounded p-1.5 text-[10px] items-center"
                                                value={c.operator}
                                                onChange={(e) => {
                                                    const conditions = [...selectedNodeData.conditions];
                                                    conditions[index].operator = e.target.value;
                                                    updateNodeData(selectedNode.id, { conditions });
                                                }}
                                            >
                                                <option value=">=">&gt;=</option>
                                                <option value="==">==</option>
                                                <option value="<=">&lt;=</option>
                                                <option value="!=">!=</option>
                                            </select>
                                            <input 
                                                type="number"
                                                className="col-span-3 bg-black/40 border border-slate-800 rounded p-1.5 text-[10px]"
                                                value={c.value}
                                                onChange={(e) => {
                                                    const conditions = [...selectedNodeData.conditions];
                                                    conditions[index].value = Number(e.target.value);
                                                    updateNodeData(selectedNode.id, { conditions });
                                                }}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const conditions = selectedNodeData.conditions.filter((_: any, i: number) => i !== index);
                                                    updateNodeData(selectedNode.id, { conditions });
                                                }}
                                                className="col-span-1 text-rose-500 hover:bg-rose-500/10 p-1 rounded"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                      )}

                       {selectedNode.type === 'math' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            {/* OPERATION SELECTOR */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Calculator className="w-2.5 h-2.5 text-sky-400" /> Arithmetic System
                                </label>
                                <select 
                                    value={selectedNodeData.operation || 'ADD'} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { operation: e.target.value })}
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-sky-400"
                                >
                                    <option value="ADD">Addition (+)</option>
                                    <option value="SUBTRACT">Subtraction (-)</option>
                                    <option value="MULTIPLY">Multiplication (×)</option>
                                    <option value="DIVIDE">Division (÷)</option>
                                    <option value="PERCENT">Percentage (X% of Y)</option>
                                    <option value="MAX">Maximum Value</option>
                                    <option value="MIN">Minimum Value</option>
                                    <option value="ROUND">Round to Integer</option>
                                </select>
                            </div>

                            {/* INPUT MANAGEMENT */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Calculation Inputs</label>
                                    <button 
                                        onClick={() => {
                                            const currentInputs = selectedNodeData.inputs || [{ id: 'input1', label: 'Value A' }, { id: 'input2', label: 'Value B' }];
                                            const nextId = `input${currentInputs.length + 1}`;
                                            const nextChar = String.fromCharCode(65 + currentInputs.length);
                                            updateNodeData(selectedNode.id, { 
                                                inputs: [...currentInputs, { id: nextId, label: `Value ${nextChar}` }] 
                                            });
                                        }}
                                        className="p-1 px-2 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 text-[8px] font-black hover:bg-sky-500 hover:text-white transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-2 h-2" /> ADD OPERAND
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {(selectedNodeData.inputs || [{ id: 'input1', label: 'Value A' }, { id: 'input2', label: 'Value B' }]).map((input: any, index: number) => (
                                        <div key={input.id} className="flex items-center gap-2 p-3 bg-black/40 border border-slate-800 rounded-xl group/inp">
                                            <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover/inp:bg-sky-500 group-hover/inp:text-white transition-colors">
                                                {String.fromCharCode(65 + index)}
                                            </div>
                                            <input 
                                                className="flex-1 bg-transparent border-none text-[10px] font-bold text-slate-300 focus:ring-0 p-0"
                                                value={input.label}
                                                onChange={(e) => {
                                                    const newInputs = [...(selectedNodeData.inputs || [{ id: 'input1', label: 'Value A' }, { id: 'input2', label: 'Value B' }])];
                                                    newInputs[index].label = e.target.value;
                                                    updateNodeData(selectedNode.id, { inputs: newInputs });
                                                }}
                                            />
                                            {index > 1 && (
                                                <button 
                                                    onClick={() => {
                                                        const newInputs = selectedNodeData.inputs.filter((_: any, i: number) => i !== index);
                                                        updateNodeData(selectedNode.id, { inputs: newInputs });
                                                    }}
                                                    className="text-rose-500 opacity-0 group-hover/inp:opacity-100 transition-all hover:scale-110"
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-slate-600 italic px-1 leading-relaxed">
                                    Multiple inputs work collectively for Addition, Multiplier, and Min/Max. Division and Percentage target the first two operands.
                                </p>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'trigger' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Zap className="w-2.5 h-2.5" /> Trigger Event
                                </label>
                                <select 
                                    value={selectedNodeData.event || 'ON_ACTIVATION'} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { event: e.target.value })}
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold font-mono text-purple-400"
                                >
                                    <option value="ON_ACTIVATION">ON_ACTIVATION (Generic)</option>
                                    <option value="ON_PACKAGE_PURCHASE">ON_PACKAGE_PURCHASE (Orders)</option>
                                    <option value="ON_DASHBOARD_LOAD">ON_DASHBOARD_LOAD (Live Sync)</option>
                                    <option value="ON_MANUAL">ON_MANUAL (Test Button)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Settings className="w-2.5 h-2.5" /> Configure Event Ports
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'ORDER_AMOUNT', label: 'Order / Input Amount', color: 'text-emerald-400' },
                                        { id: 'USER_ID', label: 'Primary User ID', color: 'text-indigo-400' },
                                        { id: 'PLAN_ID', label: 'Target Plan ID', color: 'text-amber-400' },
                                        { id: 'REFERRER_ID', label: 'Referrer ID', color: 'text-rose-400' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['ORDER_AMOUNT'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[9px] text-slate-500 italic px-1">
                                    Enabling these ports allows you to route specific event data points into downstream logic nodes.
                                </p>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'action' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-rose-500 uppercase ml-1 flex items-center gap-2">
                                        <Zap className="w-3 h-3" /> System Action Type
                                    </label>
                                    <select 
                                        value={selectedNodeData.actionType || 'CREDIT_WALLET'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { actionType: e.target.value })}
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold shadow-inner"
                                    >
                                        <option value="CREDIT_WALLET">Credit User Wallet</option>
                                        <option value="UPDATE_STATUS">Update Account Status</option>
                                        <option value="QUALIFY_BOOSTER">Qualify for Booster</option>
                                        <option value="DEBIT_WALLET">Debit/Fee Deduction</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                        <Wallet className="w-3 h-3 text-emerald-400" /> Target Sub-Wallet
                                    </label>
                                    <select 
                                        value={selectedNodeData.wallet || 'earning_balance'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { wallet: e.target.value })}
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                    >
                                        <option value="main_balance">Main Balance</option>
                                        <option value="earning_balance">Earnings (Unified)</option>
                                        <option value="roi_balance">ROI Balance</option>
                                        <option value="direct_balance">Direct Referral Wallet</option>
                                        <option value="level_balance">Level Income Wallet</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                        <Calculator className="w-3 h-3 text-blue-400" /> Amount Variable
                                    </label>
                                    <input 
                                        type="text" 
                                        value={selectedNodeData.amountVar || ''} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { amountVar: e.target.value.toUpperCase() })}
                                        placeholder="e.g. REWARD_AMOUNT"
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-amber-400"
                                    />
                                    <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { amountVar: v })} />
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'wallets' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                    Syncs all sub-wallets for the connected User ID into the execution context as <span className="text-blue-400 font-bold">$BALANCE_VARS</span>.
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2 mb-3">
                                    <Settings className="w-2.5 h-2.5" /> Output Port Management
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'MAIN_BALANCE', label: 'Main Balance', color: 'text-blue-400' },
                                        { id: 'EARNING_BALANCE', label: 'Unified Earnings', color: 'text-emerald-400' },
                                        { id: 'ROI_BALANCE', label: 'ROI Wallet', color: 'text-amber-400' },
                                        { id: 'DIRECT_BALANCE', label: 'Direct Wallet', color: 'text-rose-400' },
                                        { id: 'LEVEL_BALANCE', label: 'Level Wallet', color: 'text-purple-400' },
                                        { id: 'REWARD_BALANCE', label: 'Rewards Wallet', color: 'text-yellow-400' },
                                        { id: 'WITHDRAWABLE_BALANCE', label: 'Withdrawable', color: 'text-sky-400' },
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['MAIN_BALANCE', 'EARNING_BALANCE', 'ROI_BALANCE', 'DIRECT_BALANCE', 'LEVEL_BALANCE'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'context' && !selectedNodeData.isHub && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Database className="w-3 h-3 text-cyan-400" /> Map Context Variable
                                </label>
                                <input 
                                    type="text" 
                                    value={selectedNodeData.variable || ''} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value.toUpperCase() })}
                                    placeholder="e.g. ORDER_AMOUNT"
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-cyan-400"
                                />
                                <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { variable: v })} />
                                <p className="text-[8px] text-slate-600 italic px-1">Exposes global engine state as a local node handle.</p>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'display' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Activity className="w-3 h-3 text-emerald-400" /> Monitored Variable
                                </label>
                                <input 
                                    type="text" 
                                    value={selectedNodeData.monitorVariable || ''} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { monitorVariable: e.target.value.toUpperCase() })}
                                    placeholder="AUTO-SENSE (Leave Empty)"
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-emerald-400"
                                />
                                <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { monitorVariable: v })} />
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                                    <p className="text-[8px] text-slate-500 leading-relaxed italic">
                                        <b>Tip:</b> If empty, the node will "auto-sense" the value from the connected wire's parent result.
                                    </p>
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'webhook' && (
                        <div className="space-y-6 pt-1 border-t border-slate-800/50">
                             <div className="space-y-2 pt-4">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Destination URL</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-mono text-sky-400"
                                    value={selectedNodeData.url || ''} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                                />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Request Method</label>
                                <select 
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                    value={selectedNodeData.method || 'POST'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value })}
                                >
                                    <option value="POST">HTTP POST</option>
                                    <option value="GET">HTTP GET</option>
                                    <option value="PUT">HTTP PUT</option>
                                </select>
                             </div>
                        </div>
                      )}

                      {selectedNode.type === 'scheduler' && (
                         <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Run Time</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-black text-white"
                                        value={selectedNodeData.targetTime || '00:00'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { targetTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Timezone</label>
                                    <select 
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                        value={selectedNodeData.timezone || 'UTC'}
                                        onChange={(e) => updateNodeData(selectedNode.id, { timezone: e.target.value })}
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="GMT">GMT</option>
                                        <option value="IST">IST (+5:30)</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                      )}

                      {selectedNode.type === 'total_investment' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                                <p className="text-[10px] text-slate-500 italic leading-relaxed text-center">
                                    Summarizes all active package investments for the target member.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2 mb-3">
                                    <Settings className="w-2.5 h-2.5" /> Output Handles
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'TOTAL_INVESTED', label: 'Sum of Capital ($)', color: 'text-blue-500' },
                                        { id: 'ACTIVE_PACKAGES_COUNT', label: 'Total active count', color: 'text-cyan-500' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['TOTAL_INVESTED', 'ACTIVE_PACKAGES_COUNT'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'dashboard_config' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Card Unique Key</label>
                                    <input 
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-black text-emerald-400"
                                        value={selectedNodeData.cardKey || 'GENERIC'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { cardKey: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Visible Label</label>
                                    <input 
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                        value={selectedNodeData.customLabel || ''} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { customLabel: e.target.value })}
                                        placeholder="e.g. My Referral Bonus"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3 text-amber-500" /> Value Override
                                    </label>
                                    <input 
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-amber-400"
                                        value={selectedNodeData.overrideValue || ''} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { overrideValue: e.target.value })}
                                        placeholder="$VAR_NAME"
                                    />
                                    <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { overrideValue: v })} />
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'plan_context' && (
                         <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2 mb-3">
                                    <Settings className="w-2.5 h-2.5" /> Output Port Management
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'PLAN_ID', label: 'Selected Plan ID', color: 'text-slate-400' },
                                        { id: 'PLAN_NAME', label: 'Plan Identifier', color: 'text-blue-400' },
                                        { id: 'INVESTED_AMOUNT', label: 'Purchase Amount ($)', color: 'text-emerald-400' },
                                        { id: 'TOTAL_ROI_CREDITED', label: 'Credited ROI to Date', color: 'text-orange-400' },
                                        { id: 'PLAN_REMAINING_ROI', label: 'ROI Left to Cap', color: 'text-rose-400' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['PLAN_ID', 'PLAN_NAME', 'INVESTED_AMOUNT'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                         </div>
                      )}

                      {selectedNode.type === 'math' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                        <Calculator className="w-3 h-3 text-sky-400" /> Mathematical Operation
                                    </label>
                                    <select 
                                        value={selectedNodeData.operation || 'ADD'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { operation: e.target.value })}
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                    >
                                        <option value="ADD">Add (+)</option>
                                        <option value="SUBTRACT">Subtract (-)</option>
                                        <option value="MULTIPLY">Multiply (×)</option>
                                        <option value="DIVIDE">Divide (÷)</option>
                                        <option value="PERCENT">Percentage (%)</option>
                                        <option value="ROUND">Round Value</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                        <Target className="w-3 h-3 text-emerald-400" /> Output Variable Name
                                    </label>
                                    <input 
                                        type="text" 
                                        value={selectedNodeData.outputVar || ''} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { outputVar: e.target.value.toUpperCase() })}
                                        placeholder="e.g. CALC_RESULT"
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-emerald-500"
                                    />
                                    <p className="text-[8px] text-slate-600 italic px-1">Result will be stored in $VARIABLE for downstream use.</p>
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'loop' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                        <Repeat className="w-3 h-3 text-teal-400" /> Traversal Logic
                                    </label>
                                    <select 
                                        value={selectedNodeData.traversalType || 'UPLINE_CHAIN'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { traversalType: e.target.value })}
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                    >
                                        <option value="UPLINE_CHAIN">Upline Generation Chain</option>
                                        <option value="DOWNLINE_TREE">Full Downline Sub-Tree</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
                                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                        The <span className="text-teal-400 font-bold">Each Item</span> pulse will fire for every member found in the hierarchy.
                                    </p>
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'condition' && (
                        <div className="space-y-4 pt-4 border-t border-slate-800/50">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Global Fallback Variable</label>
                                 <input 
                                    type="text" 
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-mono font-bold text-amber-400"
                                    value={selectedNodeData.variable || ''} 
                                    placeholder="e.g. ORDER_AMOUNT"
                                    onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value.toUpperCase() })}
                                />
                                <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { variable: v })} />
                                <p className="text-[8px] text-slate-600 italic px-1">Used if a branch doesn't specify its own variable.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Logical Branches</label>
                                    <button 
                                        onClick={() => {
                                            const branches = selectedNodeData.branches || [];
                                            updateNodeData(selectedNode.id, { 
                                                branches: [...branches, { 
                                                    id: `if_${Date.now()}`, 
                                                    variable: '', 
                                                    operator: '>=', 
                                                    value: '0', 
                                                    label: `Path ${branches.length + 1}` 
                                                }] 
                                            });
                                        }}
                                        className="p-1 px-2 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 text-[8px] font-black hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-2 h-2" /> ADD IF-ELSE
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(selectedNodeData.branches || []).map((b: any, index: number) => (
                                        <div key={b.id} className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-3 relative group/item">
                                            <button 
                                                onClick={() => {
                                                    const branches = selectedNodeData.branches.filter((_: any, i: number) => i !== index);
                                                    updateNodeData(selectedNode.id, { branches });
                                                }}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] text-slate-600 font-bold uppercase">If [Variable] Is</label>
                                                <input 
                                                    className="w-full bg-slate-900/50 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-white"
                                                    value={b.variable}
                                                    placeholder="Inherit Global"
                                                    onChange={(e) => {
                                                        const branches = [...selectedNodeData.branches];
                                                        branches[index].variable = e.target.value.toUpperCase();
                                                        updateNodeData(selectedNode.id, { branches });
                                                    }}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8px] text-slate-600 font-bold uppercase">Operator</label>
                                                    <select 
                                                        className="w-full bg-slate-900/50 border border-slate-800 rounded p-1.5 text-[10px] font-black text-amber-400"
                                                        value={b.operator}
                                                        onChange={(e) => {
                                                            const branches = [...selectedNodeData.branches];
                                                            branches[index].operator = e.target.value;
                                                            updateNodeData(selectedNode.id, { branches });
                                                        }}
                                                    >
                                                        <option value=">=">{'>='}</option>
                                                        <option value=">">{'>'}</option>
                                                        <option value="<=">{'<='}</option>
                                                        <option value="<">{'<'}</option>
                                                        <option value="==">{'=='}</option>
                                                        <option value="!=">{'!='}</option>
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8px] text-slate-600 font-bold uppercase">Compare To</label>
                                                    <input 
                                                        className="w-full bg-slate-900/50 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-white"
                                                        value={b.value}
                                                        onChange={(e) => {
                                                            const branches = [...selectedNodeData.branches];
                                                            branches[index].value = e.target.value;
                                                            updateNodeData(selectedNode.id, { branches });
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] text-slate-600 font-bold uppercase">Path Label</label>
                                                <input 
                                                    className="w-full bg-slate-900/50 border border-slate-800 rounded p-1.5 text-[10px] font-bold text-slate-300"
                                                    value={b.label}
                                                    onChange={(e) => {
                                                        const branches = [...selectedNodeData.branches];
                                                        branches[index].label = e.target.value;
                                                        updateNodeData(selectedNode.id, { branches });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'plan_catalog' && (
                         <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-2xl">
                                <p className="text-[10px] text-slate-500 italic leading-relaxed text-center">
                                    Allows selection of specialized packages from the <span className="text-violet-400 font-bold">Product Catalog</span>.
                                </p>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2 mb-3">
                                    <Settings className="w-2.5 h-2.5" /> Intelligence Ports
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'PLAN_ID', label: 'Unique ID', color: 'text-violet-400' },
                                        { id: 'PLAN_NAME', label: 'Catalog Name', color: 'text-blue-400' },
                                        { id: 'INVESTED_AMOUNT', label: 'Catalog Price ($)', color: 'text-emerald-400' },
                                        { id: 'DAILY_ROI_PERCENT', label: 'Base Daily %', color: 'text-amber-400' },
                                        { id: 'TOTAL_ROI_PERCENT', label: 'Target ROI %', color: 'text-rose-400' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['PLAN_ID', 'PLAN_NAME', 'INVESTED_AMOUNT'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                         </div>
                      )}

                      {selectedNode.type === 'switch' && (
                        <div className="space-y-4 pt-4 border-t border-slate-800/50">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Input Variable</label>
                                 <input 
                                    type="text" 
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-mono font-bold text-cyan-400"
                                    value={selectedNodeData.variable || ''} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { variable: e.target.value.toUpperCase() })}
                                />
                                <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { variable: v })} />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Path Cases</label>
                                    <button 
                                        onClick={() => {
                                            const cases = selectedNodeData.cases || [];
                                            updateNodeData(selectedNode.id, { 
                                                cases: [...cases, { value: 'VALUE', label: 'Path Name', id: `case_${Date.now()}` }] 
                                            });
                                        }}
                                        className="p-1 px-2 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 text-[8px] font-black hover:bg-sky-500 hover:text-white transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-2 h-2" /> ADD CASE
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(selectedNodeData.cases || []).map((c: any, index: number) => (
                                        <div key={index} className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2 relative group/item">
                                            <button 
                                                onClick={() => {
                                                    const cases = selectedNodeData.cases.filter((_: any, i: number) => i !== index);
                                                    updateNodeData(selectedNode.id, { cases });
                                                }}
                                                className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[8px] text-slate-600 font-bold uppercase">If Value Is</label>
                                                <input 
                                                    className="w-full bg-slate-900/50 border border-slate-800 rounded p-1.5 text-[10px] font-mono text-emerald-400"
                                                    value={c.value}
                                                    onChange={(e) => {
                                                        const cases = [...selectedNodeData.cases];
                                                        cases[index].value = e.target.value;
                                                        cases[index].label = e.target.value;
                                                        updateNodeData(selectedNode.id, { cases });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'plan_catalog' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            {/* Source Selection */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Data Source</label>
                                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-slate-800 shadow-inner">
                                        <button 
                                            onClick={() => updateNodeData(selectedNode.id, { sourceMode: 'CATALOG' })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${(!selectedNodeData.sourceMode || selectedNodeData.sourceMode === 'CATALOG') ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Auto-Match
                                        </button>
                                        <button 
                                            onClick={() => updateNodeData(selectedNode.id, { sourceMode: 'MEMBER_DATA' })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${(selectedNodeData.sourceMode === 'MEMBER_DATA') ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Member Subs
                                        </button>
                                    </div>
                                </div>

                                {(!selectedNodeData.sourceMode || selectedNodeData.sourceMode === 'CATALOG') && (
                                    <div className="p-4 bg-black/20 border border-slate-800 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Amount Input Strategy</label>
                                            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                                                <button 
                                                    onClick={() => updateNodeData(selectedNode.id, { amountSource: 'FIXED' })}
                                                    className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-black transition-all ${(!selectedNodeData.amountSource || selectedNodeData.amountSource === 'FIXED') ? 'bg-orange-500 text-white' : 'text-slate-500'}`}
                                                >
                                                    FIXED VALUE
                                                </button>
                                                <button 
                                                    onClick={() => updateNodeData(selectedNode.id, { amountSource: 'VARIABLE' })}
                                                    className={`flex-1 px-2 py-1.5 rounded-md text-[9px] font-black transition-all ${(selectedNodeData.amountSource === 'VARIABLE') ? 'bg-cyan-500 text-white' : 'text-slate-500'}`}
                                                >
                                                    VARIABLE
                                                </button>
                                            </div>
                                        </div>

                                        {selectedNodeData.amountSource === 'VARIABLE' ? (
                                             <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Variable Name</label>
                                                 <input 
                                                    type="text"
                                                    value={selectedNodeData.amountVar || 'ORDER_AMOUNT'}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { amountVar: e.target.value.toUpperCase() })}
                                                    placeholder="ORDER_AMOUNT"
                                                    className="w-full bg-[#060c14] border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-mono font-bold text-cyan-400"
                                                />
                                                <VariableSuggestions onSelect={(v) => updateNodeData(selectedNode.id, { amountVar: v })} />
                                                <p className="text-[8px] text-slate-600 italic">This node will dynamically fetch the amount from the chosen context variable.</p>
                                             </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Manual Amount ($)</label>
                                                <input 
                                                    type="number"
                                                    value={selectedNodeData.simulationAmount || ''}
                                                    onChange={(e) => updateNodeData(selectedNode.id, { simulationAmount: e.target.value })}
                                                    placeholder="0.00"
                                                    className="w-full bg-[#060c14] border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-mono font-bold text-orange-400"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Output Port Toggles */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Settings className="w-2.5 h-2.5" /> Output Handles
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'PLAN_DAILY_PERCENT', label: 'Daily ROI %', color: 'text-orange-400' },
                                        { id: 'PLAN_CAP_X', label: 'Earning Multiplier (Cap)', color: 'text-blue-400' },
                                        { id: 'PLAN_WALLET', label: 'Wallet Type', color: 'text-teal-400' },
                                        { id: 'PLAN_NAME', label: 'Package Name', color: 'text-purple-400' },
                                        { id: 'PLAN_ID', label: 'Plan ID', color: 'text-slate-400' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['PLAN_DAILY_PERCENT', 'PLAN_CAP_X', 'PLAN_WALLET'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all active:scale-[0.98]">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Live Simulation Trace Workspace */}
                            {selectedNodeData.lastResult && (
                                <div className="space-y-3 pt-6 border-t border-slate-800/50">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-black text-amber-500 uppercase ml-1">Live Workspace</label>
                                        <div className="text-[8px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full font-black border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                            {selectedNodeData.lastResult.data?.activePackages?.length || 0} ACTIVE ITEMS
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                                        {(selectedNodeData.lastResult.data?.activePackages || []).map((pkg: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-1 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                                    <Package className="w-8 h-8 text-slate-500" />
                                                </div>
                                                <div className="flex items-center justify-between relative z-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{pkg.PLAN_NAME}</span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${pkg.PLAN_ACTIVE ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                                            <span className={`text-[8px] font-black uppercase ${pkg.PLAN_ACTIVE ? 'text-emerald-500' : 'text-slate-600'}`}>
                                                                {pkg.PLAN_ACTIVE ? 'Active' : 'Expired'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/5 px-2 py-1 rounded-lg border border-emerald-500/10">${pkg.INVESTED_AMOUNT || pkg.ORDER_AMOUNT}</span>
                                                        <span className="text-[7px] text-slate-600 font-black mt-1 uppercase">Range: ${pkg.PLAN_MIN} - ${pkg.PLAN_MAX || '∞'}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mt-1 relative z-10">
                                                    <div className="flex flex-col gap-0.5 bg-black/40 p-2 rounded-xl border border-slate-800/50">
                                                        <span className="text-[7px] text-slate-600 uppercase font-black tracking-widest">ROI %</span>
                                                        <span className="text-[10px] text-orange-400 font-bold">{pkg.PLAN_DAILY_PERCENT}% <span className="text-[8px] text-slate-500">Daily</span></span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 bg-black/40 p-2 rounded-xl border border-slate-800/50">
                                                        <span className="text-[7px] text-slate-600 uppercase font-black tracking-widest">CAP X</span>
                                                        <span className="text-[10px] text-blue-400 font-bold">{pkg.PLAN_CAP_X}x <span className="text-[8px] text-slate-500">Mult</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!selectedNodeData.lastResult.data?.activePackages || selectedNodeData.lastResult.data?.activePackages.length === 0) && (
                                            <div className="py-10 border-2 border-dashed border-slate-800/50 rounded-[2rem] flex flex-col items-center justify-center space-y-3 grayscale opacity-30">
                                                <Ungroup className="w-8 h-8 text-slate-500" />
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No Active Sessions</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                      )}

                      {selectedNode.type === 'wallet_watcher' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Watch Mode</label>
                                    <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-slate-800 shadow-inner">
                                        <button 
                                            onClick={() => updateNodeData(selectedNode.id, { watchMode: 'ALL' })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${(!selectedNodeData.watchMode || selectedNodeData.watchMode === 'ALL') ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Full Snap
                                        </button>
                                        <button 
                                            onClick={() => updateNodeData(selectedNode.id, { watchMode: 'VARIABLE' })}
                                            className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${(selectedNodeData.watchMode === 'VARIABLE') ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Dynamic Wallet
                                        </button>
                                    </div>
                                </div>

                                {selectedNodeData.watchMode === 'VARIABLE' ? (
                                     <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl space-y-3 animate-in fade-in duration-500">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tight">Auto-Targeting Enabled</span>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Wallet Variable Name</label>
                                            <input 
                                                type="text"
                                                value={selectedNodeData.targetWallet || 'PLAN_WALLET'}
                                                onChange={(e) => updateNodeData(selectedNode.id, { targetWallet: e.target.value.toUpperCase() })}
                                                placeholder="PLAN_WALLET"
                                                className="w-full bg-[#060c14] border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-mono font-bold text-cyan-400"
                                            />
                                            <p className="text-[8px] text-slate-500 italic">
                                                This will automatically watch the wallet balance exported as $PLAN_WALLET (from a Plan Catalog node).
                                            </p>
                                        </div>
                                     </div>
                                ) : (
                                    <div className="p-4 bg-black/20 border border-slate-800 rounded-2xl space-y-3">
                                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                            <span className="text-rose-400 font-black">Full Snap Mode</span> will capture all basic balances in the execution trace.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'order_hub' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Settings className="w-2.5 h-2.5" /> ROI Output Handles
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'TOTAL_ROI_PAID', label: 'Total ROI Paid', color: 'text-emerald-400' },
                                        { id: 'ROI_REMAINING', label: 'Remaining ROI', color: 'text-rose-400' },
                                        { id: 'ROI_CAP_LIMIT', label: 'Cap Limit (3x/5x)', color: 'text-slate-400' },
                                        { id: 'DAILY_ROI_PERCENT', label: 'Daily Income %', color: 'text-indigo-400' },
                                        { id: 'IS_BOOSTED', label: 'Booster Condition', color: 'text-cyan-400' },
                                        { id: 'AMOUNT', label: 'Investment Amount', color: 'text-orange-400' },
                                        { id: 'CURRENCY', label: 'Payment Token', color: 'text-slate-500' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['TOTAL_ROI_PAID', 'ROI_REMAINING', 'ROI_CAP_LIMIT', 'DAILY_ROI_PERCENT', 'IS_BOOSTED', 'AMOUNT', 'CURRENCY'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all active:scale-[0.98]">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'user_hub' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Settings className="w-2.5 h-2.5" /> Member Data Handles
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'IS_ACTIVE', label: 'Activation Status', color: 'text-emerald-400' },
                                        { id: 'ACTIVATED_BY', label: 'Activation Type', color: 'text-amber-400' },
                                        { id: 'LATEST_ORDER_ID', label: 'Recent Order ID', color: 'text-orange-600' },
                                        { id: 'TOTAL_ACTIVE_INVESTMENT', label: 'Grand Total Inv.', color: 'text-indigo-400' },
                                        { id: 'ESTIMATED_DAILY_ROI', label: 'Est. Combined Daily', color: 'text-emerald-500' },
                                        { id: 'TOTAL_COLLECTED_ROI', label: 'Total Rec. ROI', color: 'text-orange-500' },
                                        { id: 'TOTAL_REMAINING_ROI', label: 'Total Rem. ROI', color: 'text-rose-500' },
                                        { id: 'JOIN_DATE', label: 'Registration Date', color: 'text-slate-500' },
                                        { id: 'SPONSOR_ID', label: 'Sponsor ID', color: 'text-purple-500' },
                                        { id: 'REF_COUNT', label: 'Direct Referral Count', color: 'text-blue-400' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['IS_ACTIVE', 'JOIN_DATE', 'SPONSOR_ID', 'REF_COUNT', 'ACTIVATED_BY', 'LATEST_ORDER_ID', 'TOTAL_ACTIVE_INVESTMENT', 'TOTAL_COLLECTED_ROI', 'TOTAL_REMAINING_ROI', 'ESTIMATED_DAILY_ROI'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all active:scale-[0.98]">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'rank_hub' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Settings className="w-2.5 h-2.5" /> Rank Trace Handles
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'MEMBER_ID', label: 'Member ID', color: 'text-slate-400' },
                                        { id: 'IS_ACTIVE', label: 'Activation Status', color: 'text-emerald-400' },
                                        { id: 'ACTIVATED_BY', label: 'Activation Source', color: 'text-amber-400' },
                                        { id: 'CURRENT_RANK_NAME', label: 'Current Rank Name', color: 'text-fuchsia-400' },
                                        { id: 'RANK_IS_ACTIVE', label: 'Rank Active/Inactive', color: 'text-cyan-400' },
                                        { id: 'RANK_REWARD', label: 'Rank Reward', color: 'text-orange-400' },
                                        { id: 'RANK_DAYS', label: 'Rank Days', color: 'text-blue-400' },
                                        { id: 'RANK_DIRECTS', label: 'Rank Directs Rule', color: 'text-indigo-400' },
                                        { id: 'RANK_STARTED_AT', label: 'Rank Start Timestamp', color: 'text-slate-500' },
                                        { id: 'RANK_REWARD_EARNED', label: 'Reward Earned (Ledger)', color: 'text-emerald-500' },
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['MEMBER_ID', 'IS_ACTIVE', 'ACTIVATED_BY', 'CURRENT_RANK_NAME', 'RANK_IS_ACTIVE', 'RANK_REWARD', 'RANK_DAYS', 'RANK_DIRECTS', 'RANK_STARTED_AT', 'RANK_REWARD_EARNED'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all active:scale-[0.98]">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newPorts = isActive
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Lock className="w-2.5 h-2.5" /> Activation Gate
                                </label>
                                <div className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-300">Require Active Member</span>
                                        <span className="text-[8px] text-slate-500">If ON, node fails for inactive members.</span>
                                    </div>
                                    <button
                                        onClick={() => updateNodeData(selectedNode.id, { requireActivation: !(selectedNodeData.requireActivation === true) })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${(selectedNodeData.requireActivation === true) ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                    >
                                        <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${(selectedNodeData.requireActivation === true) ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-slate-700'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'subscription_list' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50 scale-in-center">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Settings className="w-2.5 h-2.5" /> Collection Handles
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'ORDER_IDS', label: 'Order ID List (Array)', color: 'text-orange-500' },
                                        { id: 'ORDER_COUNT', label: 'Active Subscription Count', color: 'text-slate-400' }
                                    ].map(port => {
                                        const ports = selectedNodeData.enabledPorts || ['ORDER_IDS', 'ORDER_COUNT'];
                                        const isActive = ports.includes(port.id);
                                        return (
                                            <div key={port.id} className="flex items-center justify-between p-3 bg-[#060c14] border border-slate-800 rounded-xl group hover:border-slate-700 transition-all active:scale-[0.98]">
                                                <div className="flex flex-col">
                                                    <span className={`text-[10px] font-bold ${port.color}`}>{port.label}</span>
                                                    <span className="text-[8px] text-slate-500 font-mono italic tracking-tighter">${port.id}</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newPorts = isActive 
                                                            ? ports.filter((p: string) => p !== port.id)
                                                            : [...ports, port.id];
                                                        updateNodeData(selectedNode.id, { enabledPorts: newPorts });
                                                    }}
                                                    className={`w-10 h-5 rounded-full transition-all relative ${isActive ? 'bg-emerald-500/10 border border-emerald-500/40' : 'bg-slate-900 border border-slate-800'}`}
                                                >
                                                    <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${isActive ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-slate-700'}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
 )}

                      {selectedNode.type === 'dashboard_card' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50">
                            <div className="flex items-center justify-between p-4 bg-black/40 border border-slate-800 rounded-2xl">
                                <div className="space-y-0.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Display on Dashboard</label>
                                    <p className="text-[9px] text-slate-600 italic">Toggle visibility for this specific card.</p>
                                </div>
                                <button 
                                    onClick={() => updateNodeData(selectedNode.id, { isVisible: selectedNodeData.isVisible !== false ? false : true })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${selectedNodeData.isVisible !== false ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedNodeData.isVisible !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Palette className="w-3 h-3 text-indigo-400" /> Custom Label (Rename)
                                </label>
                                <input 
                                    type="text" 
                                    value={selectedNodeData.customLabel || ''} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { customLabel: e.target.value })}
                                    placeholder="e.g. My Profits"
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Calculator className="w-3 h-3 text-emerald-400" /> Hardcoded Value Override
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={selectedNodeData.overrideValue || ''} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { overrideValue: e.target.value })}
                                        placeholder="Leave empty for auto-calc"
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono font-bold text-emerald-400"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-700 uppercase">Input</div>
                                </div>
                                <p className="text-[9px] text-slate-500 mt-1 italic">
                                    Setting a value here will bypass the system's real-time calculations.
                                </p>
                            </div>
                        </div>
                      )}

                      {selectedNode.type === 'scheduler' && (
                        <div className="space-y-6 pt-4 border-t border-slate-800/50">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-indigo-400" /> Target Wall Time
                                </label>
                                <input 
                                    type="time" 
                                    value={selectedNodeData.targetTime || '00:00'} 
                                    onChange={(e) => updateNodeData(selectedNode.id, { targetTime: e.target.value })}
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white font-mono"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Timezone Context</label>
                                <select
                                    value={selectedNodeData.timezone || 'UTC'}
                                    onChange={(e) => updateNodeData(selectedNode.id, { timezone: e.target.value })}
                                    className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-300"
                                >
                                    <option value="UTC">UTC (Universal)</option>
                                    <option value="EST">EST (New York)</option>
                                    <option value="IST">IST (India)</option>
                                </select>
                            </div>
                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                    Use the <span className="text-emerald-400 font-bold">IS READY</span> output to trigger your next node (like cURL) only during the scheduled window.
                                </p>
                            </div>
                        </div>
                      )}

                     {selectedNode.type === 'action' && (
                       <div className="space-y-4 pt-4 border-t border-slate-800/50">
                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Action System</label>
                             <select 
                                value={selectedNodeData.actionType || 'CREDIT_WALLET'} 
                                onChange={(e) => updateNodeData(selectedNode.id, { actionType: e.target.value })}
                                className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                             >
                                <option value="CREDIT_WALLET">Credit Wallet</option>
                                <option value="QUALIFY_BOOSTER">Qualify Booster</option>
                                <option value="STATUS_UPDATE">Update Rank</option>
                                <option value="UPDATE_SUBSCRIPTION_PROGRESS">Update Subscription Progress</option>
                                <option value="WEBHOOK">Webhook (cURL)</option>
                             </select>
                          </div>
                          
                          {selectedNodeData.actionType === 'CREDIT_WALLET' && (
                             <>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Wallet Selection</label>
                                    <select 
                                        value={selectedNodeData.wallet || 'DIRECT_BALANCE'} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { wallet: e.target.value })}
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold"
                                    >
                                        <option value="EARNING_BALANCE">Unified Earning</option>
                                        <option value="ROI_BALANCE">Daily ROI</option>
                                        <option value="DIRECT_BALANCE">Referral Balance</option>
                                        <option value="LEVEL_BALANCE">Level Index</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Credit Amount ($)</label>
                                    <input 
                                        type="text" 
                                        value={selectedNodeData.amountVar || ''} 
                                        onChange={(e) => updateNodeData(selectedNode.id, { amountVar: e.target.value })}
                                        placeholder="e.g. bonus_result"
                                        className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-mono font-bold"
                                    />
                                </div>
                             </>
                          )}

                          {selectedNodeData.actionType === 'UPDATE_SUBSCRIPTION_PROGRESS' && (
                               <div className="flex flex-col gap-2">
                                   <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Cap Increment Variable</label>
                                   <input 
                                       type="text" 
                                       value={selectedNodeData.amountVar || ''} 
                                       onChange={(e) => updateNodeData(selectedNode.id, { amountVar: e.target.value })}
                                       placeholder="e.g. total_daily_reward"
                                       className="w-full bg-[#060c14] border border-slate-800 rounded-xl px-4 py-3 text-[11px] font-mono font-bold text-emerald-400"
                                   />
                                   <p className="text-[9px] text-slate-500 mt-1 italic">
                                       This will increment the package's total earned counter by the value in this variable.
                                   </p>
                               </div>
                           )}
                    </div>
                      )}
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-8 animate-in fade-in duration-700">
               <div className="w-24 h-24 bg-[#060c14] rounded-[2rem] flex items-center justify-center border border-slate-800 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)]">
                  <Cpu className="w-10 h-10 text-slate-700/50" />
               </div>
               <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">No Selection</p>
                    <p className="text-[11px] text-slate-700 font-bold max-w-[180px] leading-relaxed">Select a logic node to configure its parameters and behavioral patterns.</p>
               </div>
            </div>
          )}
        </aside>
      </div>

      {/* Export Modal */}
      {isExportOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
              <div className="bg-[#0d1626] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Download className="w-4 h-4 text-emerald-500" /> Export System Logic
                      </h2>
                      <button onClick={() => setIsExportOpen(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
                      <p className="text-xs text-slate-500 font-medium">Copy this JSON object to backup or share your current compensation workflow structure.</p>
                      <div className="flex items-center justify-end">
                          <button
                              onClick={copyExportJson}
                              className="px-4 py-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-xl text-[11px] font-black hover:bg-emerald-600 hover:text-white transition-all"
                          >
                              COPY JSON
                          </button>
                      </div>
                      <textarea 
                          readOnly 
                          value={JSON.stringify({ nodes, edges, key: flowKey, name: flowName }, null, 2)}
                          className="w-full h-96 bg-black border border-slate-800 rounded-2xl p-6 text-[11px] font-mono text-emerald-400 outline-none select-all custom-scrollbar"
                      />
                  </div>
              </div>
          </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
              <div className="bg-[#0d1626] border border-slate-800 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                      <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Upload className="w-4 h-4 text-emerald-500" /> Import External Logic
                      </h2>
                      <button onClick={() => setIsImportOpen(false)} className="text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-lg">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-6 space-y-4">
                      <p className="text-xs text-slate-500 font-medium italic">Warning: This will overwrite your current canvas workspace.</p>
                      <textarea 
                          value={importJson}
                          onChange={(e) => setImportJson(e.target.value)}
                          placeholder="Paste logic JSON here..."
                          className="w-full h-80 bg-black border border-slate-800 rounded-2xl p-6 text-[11px] font-mono text-blue-400 outline-none focus:border-emerald-500/30 custom-scrollbar"
                      />
                      <button 
                        onClick={handleImport}
                        className="w-full py-4 bg-emerald-600/10 border border-emerald-500/30 text-emerald-500 rounded-2xl text-xs font-black hover:bg-emerald-600 hover:text-white transition-all shadow-lg"
                      >
                        RECONSTRUCT GRAPH
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* Danger Modal */}
      {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsDeleteConfirmOpen(false)} />
              <div className="w-full max-w-md bg-[#0d1626] border border-rose-500/30 rounded-3xl shadow-[0_25px_70px_rgba(244,63,94,0.2)] overflow-hidden z-10 scale-in-center">
                  <div className="p-8 space-y-6 text-center">
                      <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                          <Trash2 className="w-10 h-10 text-rose-500 animate-pulse" />
                      </div>
                      <div className="space-y-2">
                          <h2 className="text-xl font-black text-white uppercase tracking-wider">High Risk Action</h2>
                          <p className="text-sm text-slate-400 leading-relaxed font-bold">
                              You are attempting to delete an <span className="text-emerald-400 underline underline-offset-4">ACTIVE</span> flow. 
                              This logic is currently powering the live compensation engine.
                          </p>
                      </div>
                      
                      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 text-left">
                          <p className="text-[10px] text-rose-400 leading-relaxed italic font-bold flex items-center gap-2">
                              <Info className="w-3 h-3 shrink-0" /> Proceeding will immediately SUSPEND the logic before permanent deletion.
                          </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                          <button 
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="py-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                          >
                              Cancel
                          </button>
                          <button 
                            onClick={() => executeDelete(flowToDelete!)}
                            className="py-3 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20"
                          >
                              Unpublish & Delete
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default function FormulaBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner />
    </ReactFlowProvider>
  );
}

