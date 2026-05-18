import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const routing = data?.routing || 'bezier';

  // Path helpers may return additional tuple items depending on router type/version.
  // We only rely on the first 3 entries: [edgePath, labelX, labelY].
  let pathData: [string, number, number, ...unknown[]];

  const pathParams = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  };

  switch (routing) {
    case 'smoothstep':
      pathData = getSmoothStepPath({ ...pathParams, borderRadius: 16 });
      break;
    case 'step':
      pathData = getSmoothStepPath({ ...pathParams, borderRadius: 0 });
      break;
    case 'straight':
      pathData = getStraightPath(pathParams);
      break;
    case 'bezier':
    default:
      pathData = getBezierPath(pathParams);
      break;
  }

  const [edgePath, labelX, labelY] = pathData;

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
            ...style, 
            strokeWidth: selected ? 3 : 2,
            stroke: selected ? '#10b981' : '#475569',
            opacity: selected ? 1 : 0.6
        }} 
      />
      
      {/* Edge Deletion Handle */}
      {(selected) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full border border-rose-500/50 bg-[#0f172a] text-rose-500 shadow-xl transition-all hover:scale-110 hover:bg-rose-500 hover:text-white"
              onClick={onEdgeClick}
              title="Delete Link"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
