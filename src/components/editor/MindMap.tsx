import { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  Controls,
  Background,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus } from 'lucide-react';

interface MindMapProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onUpdate?: (nodes: Node[], edges: Edge[]) => void;
}

const defaultNodes: Node[] = [
  { id: 'center', data: { label: 'Central Idea' }, position: { x: 300, y: 200 }, type: 'default' },
];

export function MindMap({ initialNodes, initialEdges, onUpdate }: MindMapProps) {
  const [nodes, setNodes] = useNodesState(initialNodes || defaultNodes);
  const [edges, setEdges] = useEdgesState(initialEdges || []);
  const [nodeCount, setNodeCount] = useState(initialNodes?.length || 1);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        onUpdate?.(nodes, newEdges);
        return newEdges;
      });
    },
    [nodes, setEdges, onUpdate]
  );

  // Persist node repositioning (on drag end) and node deletions, which
  // otherwise only update local state and are lost on reload.
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        const persist = changes.some(
          (c) => c.type === 'remove' || (c.type === 'position' && c.dragging === false)
        );
        if (persist) onUpdate?.(updated, edges);
        return updated;
      });
    },
    [edges, setNodes, onUpdate]
  );

  // Persist edge deletions.
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === 'remove')) onUpdate?.(nodes, updated);
        return updated;
      });
    },
    [nodes, setEdges, onUpdate]
  );

  const addNode = useCallback(() => {
    const newId = `node-${nodeCount + 1}`;
    const angle = (nodeCount * 72) * (Math.PI / 180);
    const radius = 150;
    const newNode: Node = {
      id: newId,
      data: { label: `Idea ${nodeCount + 1}` },
      position: {
        x: 300 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle),
      },
      type: 'default',
    };

    setNodes((nds) => {
      const updated = [...nds, newNode];
      onUpdate?.(updated, edges);
      return updated;
    });
    setNodeCount((c) => c + 1);
  }, [nodeCount, edges, setNodes, onUpdate]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const newLabel = prompt('Edit node label:', node.data.label as string);
    if (newLabel !== null) {
      setNodes((nds) => {
        const updated = nds.map((n) => (n.id === node.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
        onUpdate?.(updated, edges);
        return updated;
      });
    }
  }, [edges, setNodes, onUpdate]);

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        className="bg-surface-50 dark:bg-surface-950"
      >
        <Controls className="!bg-white dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700" />
        <Background color="#e5e5e5" gap={20} />
        <MiniMap
          className="!bg-white dark:!bg-surface-800 !border-surface-200 dark:!border-surface-700"
          nodeColor="#5c7cfa"
        />
      </ReactFlow>
      <button
        onClick={addNode}
        className="absolute top-4 right-4 flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg shadow-md hover:bg-primary-600 transition-colors"
      >
        <Plus size={16} />
        <span className="text-sm font-medium">Add Node</span>
      </button>
    </div>
  );
}
