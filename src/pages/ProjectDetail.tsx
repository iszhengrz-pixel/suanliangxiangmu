import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Code2, 
  Download, 
  Menu, 
  Layers, 
  Box, 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  ChevronUp,
  Plus, 
  Edit2, 
  Trash2, 
  Link as LinkIcon, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  X,
  Settings,
  Building2,
  FileText,
  Eye,
  UploadCloud,
  MoreHorizontal,
  Check,
  Sparkles,
  MapPin,
  AlertTriangle,
  Scissors,
  Copy,
  CheckSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import AIRecognitionModal from '../components/AIRecognitionModal';
import PlanContourModal from '../components/PlanContourModal';

// --- Types ---
interface ConcreteGrade {
  id: string;
  component: string;
  grade: string;
}

interface FloorDetails {
  sortOrder?: string;
  height?: string;
  elevation?: string;
  slabThickness?: string;
  concreteGrades?: ConcreteGrade[];
}

interface TreeNodeData {
  id: string;
  type: 'building' | 'floor' | 'component' | 'drawing';
  name: string;
  desc?: string;
  expanded?: boolean;
  active?: boolean;
  badge?: string;
  status?: string;
  floorDetails?: FloorDetails;
  children?: TreeNodeData[];
}

// --- Mock Data ---
const initialTreeData: TreeNodeData[] = [
  {
    id: 'b1',
    type: 'building',
    name: '1#楼',
    desc: '楼层 2 层',
    expanded: true,
    children: [
      {
        id: 'f1',
        type: 'floor',
        name: '屋面层',
        desc: '屋面层 · 1 图纸',
        expanded: true,
        children: [
          {
            id: 'c1',
            type: 'component',
            name: '梁',
            desc: '1 图纸 · 1 说明',
            expanded: true,
            active: true,
            children: [
              { id: 'd1', type: 'drawing', name: '1#楼屋面层梁配筋图', badge: 'PLAN', status: '自动' },
              { id: 'd2', type: 'drawing', name: '1#楼屋面层梁配筋说明', badge: 'DESC', status: '自动' },
            ]
          }
        ]
      },
      {
        id: 'f2',
        type: 'floor',
        name: 'L18',
        desc: 'L18 · 1 图纸',
        expanded: false,
        children: []
      }
    ]
  }
];

type LayerConfig = {
  id: string;
  label: string;
  value: string;
  multi?: boolean;
  visible: boolean;
  expanded: boolean;
};

const defaultLayerConfigs: LayerConfig[] = [
  { id: 'axis', label: '轴网图层', value: 'AXIS', visible: true, expanded: true },
  { id: 'axis_other', label: '其他轴网图层', value: 'AXIS_TEXT, AXIS_NUM, AXIS_DIM', multi: true, visible: true, expanded: true },
  { id: 'column', label: '柱图层', value: 'COLU', visible: true, expanded: true },
  { id: 'wall', label: '墙体图层', value: 'WALL', visible: true, expanded: true },
  { id: 'beam', label: '梁图层', value: 'BEAM, BEAM_CON', multi: true, visible: true, expanded: true },
  { id: 'beam_main', label: '梁标注图层', value: '', visible: true, expanded: true },
];

// --- Components ---

interface TreeNodeProps {
  node: TreeNodeData;
  level?: number;
  onToggleExpand: (id: string) => void;
  onEdit: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onLink?: (node: TreeNodeData) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level = 0, onToggleExpand, onEdit, onDelete, onLink }) => {
  const [isEditing, setIsEditing] = useState(node.id.startsWith('temp-'));
  const [editName, setEditName] = useState(node.name);
  const [isHovered, setIsHovered] = useState(false);
  
  // New state for dropdown selection when creating component
  // Initialize componentType with current name if it's a known component type, otherwise default to '梁'
  const [componentType, setComponentType] = useState<'梁' | '柱' | '墙' | '板'>(
    ['梁', '柱', '墙', '板'].includes(node.name) ? node.name as any : '梁'
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(node.id.startsWith('temp-') && node.type === 'component');

  // Calculate indent: base 16px + level * 16px
  const paddingLeft = level * 16 + 12;

  const handleEditSubmit = () => {
    // If it's a component (either new or existing being edited), use dropdown value
    if (node.type === 'component') {
      onEdit(node.id, componentType);
      setIsEditing(false);
      return;
    }

    const finalName = editName.trim();
    if (finalName) {
      onEdit(node.id, finalName);
    } else {
      // Use default names if empty
      if (node.type === 'building') onEdit(node.id, '新建筑');
      else if (node.type === 'floor') onEdit(node.id, '新楼层');
      else onEdit(node.id, node.name); // Revert to old name if not building/floor
    }
    setIsEditing(false);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Prevent blur handling if clicking inside the dropdown or its toggle button
    if (
      e.relatedTarget && 
      ((e.relatedTarget as HTMLElement).closest('.component-type-dropdown') || 
       (e.relatedTarget as HTMLElement).closest('.component-type-toggle'))
    ) {
      return;
    }
    
    // Auto save on blur
    handleEditSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSubmit();
    if (e.key === 'Escape') {
      if (node.id.startsWith('temp-')) {
        onDelete(node.id); // Cancel creation
      } else {
        setEditName(node.name);
        setIsEditing(false);
      }
    }
  };

  // Focus input when editing starts
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLButtonElement>(null);
  
  React.useEffect(() => {
    if (isEditing) {
      if (node.type === 'component') {
        // Focus dropdown toggle for components (both new and existing)
        dropdownRef.current?.focus();
        // Only auto-open dropdown for new components, existing ones require explicit click
        if (node.id.startsWith('temp-')) {
          setIsDropdownOpen(true);
        }
      } else {
        // Focus input for text editing
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [isEditing, node.type, node.id]);

  const getIcon = () => {
    switch (node.type) {
      case 'building': return <Building2 size={16} className="text-brand-600" />;
      case 'floor': return <Layers size={16} className="text-blue-600" />;
      case 'component': return <Box size={16} className="text-orange-500" />;
      // case 'drawing': return <FileText size={14} className="text-gray-400" />; // Removed icon for drawing
      default: return <FileText size={14} />;
    }
  };

  return (
    <div className="select-none relative">
      <div 
        className={cn(
          "group flex items-center pr-3 cursor-pointer transition-all border-l-2 relative min-h-[36px]",
          node.active 
            ? "bg-brand-50 border-brand-500" 
            : "border-transparent hover:bg-gray-50",
          node.type === 'building' ? "py-2" : "py-1.5"
        )}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          // Prevent expanding when clicking inputs or buttons
          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
          node.children && onToggleExpand(node.id);
        }}
      >
        {/* Expand Icon / Connector - Hide for drawing type */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0 mr-1.5 text-gray-400 hover:text-gray-600 transition-colors">
          {node.type !== 'drawing' && (
            node.children && node.children.length > 0 ? (
              <motion.div
                initial={false}
                animate={{ rotate: node.expanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <ChevronRight size={14} />
              </motion.div>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            )
          )}
        </div>

        {/* Node Icon & Content */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {node.type !== 'drawing' && (
            <div className={cn(
              "p-1 rounded-md shrink-0 transition-colors",
              node.active ? "bg-white shadow-sm" : "bg-gray-50 group-hover:bg-white"
            )}>
              {getIcon()}
            </div>
          )}
          
          <div className="flex flex-col min-w-0 gap-0.5 flex-1">
            <div className="flex items-center gap-2 h-6">
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1 relative">
                  {node.type === 'component' ? (
                    // Component Type Dropdown
                    <div className="relative w-full">
                      <button
                        ref={dropdownRef}
                        className="component-type-toggle w-full text-sm px-2 py-0.5 border border-brand-300 rounded bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDropdownOpen(!isDropdownOpen);
                        }}
                        onBlur={handleBlur}
                      >
                        <span>{componentType}</span>
                        <ChevronDown size={14} className="text-gray-500" />
                      </button>
                      
                      {isDropdownOpen && (
                        // Use fixed positioning or high z-index portal-like behavior
                        <div className="component-type-dropdown fixed mt-1 w-24 bg-white border border-gray-200 rounded shadow-lg z-[9999] py-1"
                             style={{ 
                               left: dropdownRef.current?.getBoundingClientRect().left,
                               top: (dropdownRef.current?.getBoundingClientRect().bottom ?? 0) + 4
                             }}
                        >
                          {['梁', '柱', '墙', '板'].map((type) => (
                            <button
                              key={type}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-50 hover:text-brand-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setComponentType(type as any);
                                setIsDropdownOpen(false);
                                onEdit(node.id, type); // Save immediately
                                setIsEditing(false);
                              }}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Text Input for other types
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleBlur}
                      className="w-full text-sm px-1.5 py-0.5 border border-brand-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-100 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Confirm/Cancel Buttons - Only show for manual text editing if needed, but auto-save makes them redundant for quick actions. Keeping them for explicit cancel */}
                  <div className="flex items-center gap-1 ml-1">
                    <button 
                      className="p-0.5 text-green-600 hover:bg-green-50 rounded"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent blur
                        handleEditSubmit();
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button 
                      className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      onMouseDown={(e) => {
                         e.preventDefault(); // Prevent blur
                         if (node.id.startsWith('temp-')) {
                           onDelete(node.id);
                         } else {
                           setEditName(node.name);
                           setIsEditing(false);
                         }
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {node.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 rounded border leading-none py-0.5 shrink-0",
                      node.badge === 'PLAN' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      node.badge === 'DESC' ? "bg-purple-50 text-purple-600 border-purple-100" :
                      "bg-gray-50 text-gray-600 border-gray-100"
                    )}>
                      {node.badge === 'PLAN' ? '图纸' : node.badge === 'DESC' ? '说明' : node.badge}
                    </span>
                  )}
                  <span className={cn(
                    "text-sm truncate leading-tight",
                    node.active ? "font-bold text-gray-900" : "font-medium text-gray-700"
                  )}>
                    {node.name}
                  </span>
                </>
              )}
            </div>
            {node.desc && !isEditing && (
              <span className="text-[10px] text-gray-400 truncate font-medium">{node.desc}</span>
            )}
          </div>
        </div>

        {/* Status Badge (for drawings) */}
        {node.status && (
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ml-2",
            node.status === '自动' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-500 border-gray-200"
          )}>
            {node.status}
          </span>
        )}

        {/* Hover Actions */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-0.5 absolute right-2 bg-gradient-to-l from-white via-white to-transparent pl-6 py-1">
            {node.type === 'component' && (
              <>
                <button 
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all" 
                  title="编辑"
                  onClick={() => {
                    setEditName(node.name);
                    setIsEditing(true);
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-all"
                  title="关联"
                  onClick={() => onLink && onLink(node)}
                >
                  <LinkIcon size={14} />
                </button>
              </>
            )}
            
            {(node.type === 'component' || node.type === 'drawing') && (
              <button 
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" 
                title="删除"
                onClick={() => onDelete(node.id)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {node.expanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {node.children.map((child: TreeNodeData) => (
              <TreeNode 
                key={child.id} 
                node={child} 
                level={level + 1} 
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
                onLink={onLink}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SearchableSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, options, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width
          });
        }
      };
      updatePosition();
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen && 
        triggerRef.current && 
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div 
        ref={triggerRef}
        className={cn(
          "unt-input flex items-center justify-between cursor-pointer bg-white text-sm py-1.5 relative transition-all", 
          className,
          isOpen && "ring-2 ring-brand-100 border-brand-300"
        )}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
      >
        <span className={cn("truncate block flex-1", !value && "text-gray-400")}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={cn("text-gray-400 shrink-0 ml-1 transition-transform duration-200", isOpen && "rotate-180")} />
      </div>
      
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="absolute z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-60 animate-in fade-in zoom-in-95 duration-100"
          style={{ 
            top: position.top + 4, 
            left: position.left, 
            width: position.width 
          }}
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                autoFocus
                type="text"
                className="w-full text-xs pl-8 pr-2 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 placeholder:text-gray-400"
                placeholder="搜索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1 min-h-[40px]">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt}
                  className={cn(
                    "px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors flex items-center justify-between",
                    value === opt ? "bg-brand-50 text-brand-600 font-medium" : "hover:bg-gray-50 text-gray-700"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt);
                    setIsOpen(false);
                  }}
                >
                  {opt}
                  {value === opt && <Check size={12} />}
                </div>
              ))
            ) : (
              <div className="py-8 text-xs text-gray-400 text-center flex flex-col items-center gap-1">
                <Search size={16} className="opacity-50" />
                <span>无匹配项</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const BuildingSettingsModal: React.FC<{
  building: TreeNodeData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (buildingId: string, payload: { name: string; floors: { id: string; name: string; floorDetails: FloorDetails }[] }) => void;
}> = ({ building, isOpen, onClose, onSave }) => {
  const [buildingName, setBuildingName] = useState(building.name);
  const [floors, setFloors] = useState<{ id: string; name: string; floorDetails: FloorDetails }[]>([]);
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (isOpen) {
      setBuildingName(building.name);
      const nextFloors = (building.children || [])
        .filter(child => child.type === 'floor')
        .map(child => ({
          id: child.id,
          name: child.name,
          floorDetails: {
            sortOrder: child.floorDetails?.sortOrder || '',
            height: child.floorDetails?.height || '',
            elevation: child.floorDetails?.elevation || '',
            slabThickness: child.floorDetails?.slabThickness || '',
            concreteGrades: child.floorDetails?.concreteGrades || []
          }
        }));
      setFloors(nextFloors);
      setExpandedFloors(Object.fromEntries(nextFloors.map(floor => [floor.id, false])));
    }
  }, [isOpen, building]);

  if (!isOpen) return null;

  const updateFloorField = (floorId: string, field: 'name' | 'sortOrder' | 'height' | 'elevation' | 'slabThickness', value: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.id !== floorId) return floor;
      if (field === 'name') {
        return { ...floor, name: value };
      }
      return {
        ...floor,
        floorDetails: { ...floor.floorDetails, [field]: value }
      };
    }));
  };

  const componentOptions = [
    '垫层',
    '基础',
    '基础梁/承台梁',
    '柱/型钢砼柱',
    '剪力墙',
    '人防门框墙',
    '暗柱',
    '端柱',
    '墙梁',
    '框架梁',
    '非框架梁',
    '现浇板',
    '楼梯',
    '构造柱',
    '圈梁/过梁',
    '砌体墙柱',
    '叠合板(预制底板)',
    '支护桩',
    '其它'
  ];
  const gradeOptions = Array.from({ length: 15 }, (_, index) => `C${10 + index * 5}`);

  const addGrade = (floorId: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.id !== floorId) return floor;
      const nextGrades = [...(floor.floorDetails.concreteGrades || []), { id: Date.now().toString(), component: '', grade: '' }];
      return { ...floor, floorDetails: { ...floor.floorDetails, concreteGrades: nextGrades } };
    }));
  };

  const updateGrade = (floorId: string, gradeId: string, field: 'component' | 'grade', value: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.id !== floorId) return floor;
      const nextGrades = (floor.floorDetails.concreteGrades || []).map(g => g.id === gradeId ? { ...g, [field]: value } : g);
      return { ...floor, floorDetails: { ...floor.floorDetails, concreteGrades: nextGrades } };
    }));
  };

  const deleteGrade = (floorId: string, gradeId: string) => {
    setFloors(prev => prev.map(floor => {
      if (floor.id !== floorId) return floor;
      const nextGrades = (floor.floorDetails.concreteGrades || []).filter(g => g.id !== gradeId);
      return { ...floor, floorDetails: { ...floor.floorDetails, concreteGrades: nextGrades } };
    }));
  };

  const handleSave = () => {
    onSave(building.id, {
      name: buildingName.trim() || '未命名楼栋',
      floors: floors.map(floor => ({
        ...floor,
        name: floor.name.trim() || '未命名楼层'
      }))
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--untitled-ui-bg-overlay)]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border border-[var(--untitled-ui-border)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-secondary)]">
          <div className="flex items-center gap-2 text-[var(--untitled-ui-text-primary)]">
            <Settings size={16} />
            <h3 className="font-semibold text-sm">楼栋信息</h3>
          </div>
          <button onClick={onClose} className="text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] p-1 rounded hover:bg-[var(--untitled-ui-bg-primary)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--untitled-ui-text-secondary)]">楼栋名称</label>
            <input 
              type="text" 
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              className="unt-input w-full text-sm bg-white"
            />
          </div>

          <div className="space-y-4">
            {floors.length === 0 ? (
              <div className="text-sm text-[var(--untitled-ui-text-secondary)] bg-[var(--untitled-ui-bg-secondary)] rounded-lg px-4 py-3">
                当前楼栋暂无楼层
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--untitled-ui-border)] bg-white overflow-hidden">
                <div className="grid grid-cols-[minmax(160px,1fr)_80px_80px_160px] gap-2 px-3 py-2 bg-[var(--untitled-ui-bg-secondary)] text-xs font-medium text-[var(--untitled-ui-text-secondary)] border-b border-[var(--untitled-ui-border)]">
                  <div>楼层名称</div>
                  <div>层高(m)</div>
                  <div>标高(m)</div>
                  <div>混凝土等级</div>
                </div>
                <div className="divide-y divide-[var(--untitled-ui-border)]">
                  {floors.map((floor) => {
                    const isExpanded = expandedFloors[floor.id] ?? false;
                    const gradeCount = (floor.floorDetails.concreteGrades || []).length;
                    return (
                      <div key={floor.id} className="bg-white">
                        <div className="px-3 py-3 grid grid-cols-[minmax(160px,1fr)_80px_80px_160px] gap-2 items-center">
                          <input
                            type="text"
                            value={floor.name}
                            onChange={(e) => updateFloorField(floor.id, 'name', e.target.value)}
                            className="unt-input w-full text-sm bg-white"
                          />
                          <input
                            type="text"
                            value={floor.floorDetails.height || ''}
                            onChange={(e) => updateFloorField(floor.id, 'height', e.target.value)}
                            className="unt-input w-full text-sm bg-white"
                          />
                          <input
                            type="text"
                            value={floor.floorDetails.elevation || ''}
                            onChange={(e) => updateFloorField(floor.id, 'elevation', e.target.value)}
                            className="unt-input w-full text-sm bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setExpandedFloors(prev => ({ ...prev, [floor.id]: !isExpanded }))}
                            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors whitespace-nowrap"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? `收起详情(${gradeCount})` : `展开详情(${gradeCount})`}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="px-3 py-3 bg-[var(--untitled-ui-bg-secondary)] border-t border-[var(--untitled-ui-border)] space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-[var(--untitled-ui-text-secondary)]">混凝土等级</label>
                              <button
                                onClick={() => addGrade(floor.id)}
                                className="text-xs text-[var(--untitled-ui-brand)] hover:text-[var(--untitled-ui-brand-hover)] font-medium flex items-center gap-1"
                              >
                                <Plus size={12} /> 添加
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(floor.floorDetails.concreteGrades || []).map((grade) => (
                                <div key={grade.id} className="flex gap-2">
                                  <SearchableSelect
                                    value={grade.component}
                                    onChange={(val) => updateGrade(floor.id, grade.id, 'component', val)}
                                    options={componentOptions}
                                    placeholder="选择构件类型"
                                    className="flex-1 min-w-0 bg-white"
                                  />
                                  <SearchableSelect
                                    value={grade.grade}
                                    onChange={(val) => updateGrade(floor.id, grade.id, 'grade', val)}
                                    options={gradeOptions}
                                    placeholder="选择等级"
                                    className="flex-1 min-w-0 bg-white"
                                  />
                                  <button
                                    onClick={() => deleteGrade(floor.id, grade.id)}
                                    className="p-2 text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] rounded-md hover:bg-white transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                              {(floor.floorDetails.concreteGrades || []).length === 0 && (
                                <div className="text-xs text-[var(--untitled-ui-text-secondary)] bg-white/50 rounded-md px-3 py-2 border border-[var(--untitled-ui-border)] border-dashed">
                                  暂无混凝土等级
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 bg-[var(--untitled-ui-bg-secondary)] border-t border-[var(--untitled-ui-border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="unt-button-secondary px-4 py-2 text-sm"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="unt-button-primary px-4 py-2 text-sm"
          >
            保存修改
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LinkConfirmModal: React.FC<{
  isOpen: boolean;
  componentName: string;
  layerName: string;
  onChangeLayerName: (value: string) => void;
  layerType: '图纸' | '说明';
  onChangeLayerType: (value: '图纸' | '说明') => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, componentName, layerName, onChangeLayerName, layerType, onChangeLayerType, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-gray-800">
            <LinkIcon size={16} />
            <h3 className="font-semibold text-sm">关联区域</h3>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-600">
            是否将选中区域关联到 <span className="font-semibold text-gray-900">{componentName}</span>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">图层类型</label>
            <div className="relative">
              <select
                value={layerType}
                onChange={(e) => onChangeLayerType(e.target.value as '图纸' | '说明')}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 appearance-none"
              >
                <option value="图纸">图纸</option>
                <option value="说明">说明</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">图层名称</label>
            <input
              type="text"
              value={layerName}
              onChange={(e) => onChangeLayerName(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300"
            />
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
          >
            确认
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const LayerConfigItem: React.FC<{ config: LayerConfig }> = ({ config }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between h-7">
        <label className="text-xs font-medium text-gray-700 truncate mr-2 flex-1">{config.label}</label>
        
        <div className="flex items-center gap-1">
          <AnimatePresence mode="wait">
            {isSearchOpen ? (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 140 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="relative flex items-center"
              >
                <input 
                  type="text" 
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="筛选..." 
                  autoFocus
                  className="unt-input w-full text-xs py-1 pl-2 pr-6 bg-gray-50 h-7"
                />
                <button 
                  onClick={() => {
                    setSearchValue('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              </motion.div>
            ) : (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSearchOpen(true)}
                className="text-gray-400 hover:text-brand-600 transition-colors p-1"
                title="搜索图层"
              >
                <Search size={14} />
              </motion.button>
            )}
          </AnimatePresence>
          
          <div className="w-px h-3 bg-gray-200 mx-1" />
          
          <button className="text-gray-400 hover:text-red-600 transition-colors p-1" title="删除该图层配置">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {config.value ? (
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 min-h-[40px]">
          {config.value.split(',').map((val, idx) => {
            if (searchValue && !val.toLowerCase().includes(searchValue.toLowerCase())) return null;
            return (
              <span key={idx} className="group flex items-center gap-1 text-[10px] font-medium bg-white text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-brand-300 transition-colors cursor-default">
                {val.trim()}
                <button className="text-gray-400 hover:text-red-500 transition-colors" title="移除该图层">
                  <X size={10} />
                </button>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 min-h-[40px] items-center justify-center">
          <span className="text-xs text-gray-400">暂无图层</span>
        </div>
      )}
    </div>
  );
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<'structure' | 'files' | 'layers'>('structure');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isLayerConfigExpanded, setIsLayerConfigExpanded] = useState(true);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [locatedLayer, setLocatedLayer] = useState<string | null>(null);
  
  // Multi-select state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMergeLayers, setSelectedMergeLayers] = useState<string[]>([]);
  
  // Edit state
  const [isEditMode, setIsEditMode] = useState(false);

  const handleLocateLayer = (layerName: string) => {
    // Mock implementation: highlight/zoom to layer
    setSearchQuery(layerName); // Reusing search to filter content on canvas
    setLocatedLayer(layerName);
    setTimeout(() => setLocatedLayer(null), 3000); // Clear after 3s
  };
  
  const [isBuildingMenuOpen, setIsBuildingMenuOpen] = useState(false);
  const [isFloorMenuOpen, setIsFloorMenuOpen] = useState(false);
  const [isBuildingSettingsOpen, setIsBuildingSettingsOpen] = useState(false);
  const [currentBuildingNode, setCurrentBuildingNode] = useState<TreeNodeData | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [buildingDraftName, setBuildingDraftName] = useState('');
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState('');
  const [isAddingFloor, setIsAddingFloor] = useState(false);
  const [floorDraftName, setFloorDraftName] = useState('');
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingFloorName, setEditingFloorName] = useState('');
  const [isComponentTypeMenuOpen, setIsComponentTypeMenuOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<TreeNodeData | null>(null);
  const [isLinkConfirmOpen, setIsLinkConfirmOpen] = useState(false);
  const [linkLayerName, setLinkLayerName] = useState('');
  const [linkLayerType, setLinkLayerType] = useState<'图纸' | '说明'>('图纸');
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const buildingMenuRef = React.useRef<HTMLDivElement>(null);
  const floorMenuRef = React.useRef<HTMLDivElement>(null);
  const componentTypeMenuRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  
  // CAD Files Mock Data
  const [cadFiles, setCadFiles] = useState<{ id: string; name: string; uploadTime: string; status: 'ready' | 'processing' | 'error' }[]>([
    { id: 'cad1', name: '配筋简图_修改.dxf', uploadTime: '2023-10-27 10:30', status: 'ready' },
    { id: 'cad2', name: '建筑底图.dxf', uploadTime: '2023-10-27 11:15', status: 'processing' },
    { id: 'cad3', name: '结构总图.dxf', uploadTime: '2023-10-26 16:20', status: 'error' },
  ]);
  const [currentCadId, setCurrentCadId] = useState('cad1');
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);

  // Layer Management State
  const [layerConfigs, setLayerConfigs] = useState<LayerConfig[]>(defaultLayerConfigs);
  const [layerSearchQuery, setLayerSearchQuery] = useState('');
  const [isResultLayerExpanded, setIsResultLayerExpanded] = useState(false);
  const [isResultLayerSearchActive, setIsResultLayerSearchActive] = useState(false);
  const [resultLayerSearchQuery, setResultLayerSearchQuery] = useState('');
  
  // New State for Layer Extraction
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isExtractionMode, setIsExtractionMode] = useState(false);
  const [targetCategoryForExtraction, setTargetCategoryForExtraction] = useState<string>('');
  const [selectedExtractionLayers, setSelectedExtractionLayers] = useState<string[]>([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [is3DMode, setIs3DMode] = useState(false);
  const [selected3DId, setSelected3DId] = useState<string | null>(null);
  const [is3DEntryDialogOpen, setIs3DEntryDialogOpen] = useState(false);
  const [threeDTargetType, setThreeDTargetType] = useState<'building' | 'floor' | 'component'>('component');
  const [threeDBuildingId, setThreeDBuildingId] = useState('');
  const [threeDFloorId, setThreeDFloorId] = useState('');
  const [threeDComponentId, setThreeDComponentId] = useState('');
  const [isPlanContourModalOpen, setIsPlanContourModalOpen] = useState(false);
  const [is2DUnderlayVisible, setIs2DUnderlayVisible] = useState(true);
  const [isShadowVisible, setIsShadowVisible] = useState(true);
  const defaultSceneTransform = 'rotateX(60deg) rotateZ(-30deg) translateZ(-100px)';
  const [sceneTransform, setSceneTransform] = useState(defaultSceneTransform);

  const [isOriginalLayerExpanded, setIsOriginalLayerExpanded] = useState(true);

  // Mock segments for canvas interaction
  const mockSegments = [
      { id: 'seg1', type: 'line', x1: 100, y1: 100, x2: 400, y2: 100, layer: 'WALL', color: '#000000', strokeWidth: 2 },
      { id: 'seg2', type: 'line', x1: 400, y1: 100, x2: 400, y2: 400, layer: 'WALL', color: '#000000', strokeWidth: 2 },
      { id: 'seg3', type: 'line', x1: 400, y1: 400, x2: 100, y2: 400, layer: 'WALL', color: '#000000', strokeWidth: 2 },
      { id: 'seg4', type: 'line', x1: 100, y1: 400, x2: 100, y2: 100, layer: 'WALL', color: '#000000', strokeWidth: 2 },
      { id: 'seg5', type: 'line', x1: 150, y1: 150, x2: 350, y2: 350, layer: 'BEAM', color: '#0000FF', strokeWidth: 1.5 },
      { id: 'seg6', type: 'line', x1: 350, y1: 150, x2: 150, y2: 350, layer: 'BEAM', color: '#0000FF', strokeWidth: 1.5 },
      { id: 'seg7', type: 'text', x: 250, y: 90, text: 'WKL1(2)', layer: 'TEXT', color: '#FF0000', fontSize: 14 },
      { id: 'seg8', type: 'rect', x: 50, y: 50, width: 400, height: 400, layer: 'DIMENSION', color: '#888888', strokeWidth: 1, dashed: true },
  ];
  
  const [layers, setLayers] = useState([
    { id: 'l1', name: '0-水印标记', color: '#ff0000', visible: true, type: 'original' },
    { id: 'l2', name: 'TRACE', color: '#0000ff', visible: true, type: 'original' },
    { id: 'l3', name: '签名', color: '#000000', visible: true, type: 'original' },
    { id: 'l4', name: '签字', color: '#ff00ff', visible: true, type: 'original' },
    { id: 'l5', name: 'yy', color: '#000000', visible: true, type: 'original' },
    { id: 'l6', name: 'GoldSignBox', color: '#000000', visible: true, type: 'original' },
    { id: 'l7', name: '高专_图框', color: '#000000', visible: true, type: 'original' },
    { id: 'l8', name: 'JQLayer', color: '#000000', visible: true, type: 'original' },
    { id: 'l9', name: '外廓线', color: '#00ffff', visible: true, type: 'original' },
    { id: 'l10', name: '文字说明', color: '#000000', visible: true, type: 'original' },
    { id: 'l11', name: 'PUB_HATCH', color: '#808080', visible: true, type: 'original' },
    { id: 'l12', name: 'THIN', color: '#00ffff', visible: true, type: 'original' },
    { id: 'l13', name: '梁原位标注_隐藏', color: '#000000', visible: true, type: 'original' },
    { id: 'l14', name: '梁原位标注', color: '#000000', visible: true, type: 'original' },
    { id: 'l15', name: 'T图框', color: '#000000', visible: true, type: 'original' },
    { id: 'l16', name: 'win', color: '#00ff00', visible: true, type: 'original' },
    { id: 'l17', name: 'AXIS_DIM', color: '#00ff00', visible: true, type: 'original' },
  ]);

  const [resultLayers, setResultLayers] = useState<any[]>([]);

  const toggleLayerVisibility = (id: string, isResult: boolean = false) => {
    if (isResult) {
      setResultLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    } else {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    }
  };

  const toggleAllLayers = (visible: boolean, isResult: boolean = false) => {
    if (isResult) {
      setResultLayers(prev => prev.map(l => ({ ...l, visible })));
    } else {
      setLayers(prev => prev.map(l => ({ ...l, visible })));
    }
  };

  // Check visibility for group toggles
  const isOriginalLayersVisible = layers.length > 0 && layers.every(l => l.visible);
  const isResultLayersVisible = resultLayers.length > 0 && resultLayers.every(l => l.visible);
  
  // Global toggle state (true if ALL layers in BOTH groups are visible)
  const isAllLayersVisible = isOriginalLayersVisible && isResultLayersVisible;

  const currentCadFile = cadFiles.find(f => f.id === currentCadId);
  const currentComponentName = selectedComponent?.name || '1#楼-屋面层-梁';
  const isAllLayerConfigsVisible = layerConfigs.length > 0 && layerConfigs.every(config => config.visible);

  // Searchable Text Data
  const searchableTexts = [
    { id: 't1', text: '1#楼-屋面层-梁' },
    { id: 't2', text: 'WKL19(1A) 240x550' },
    { id: 't3', text: '3Φ14' },
    { id: 't4', text: '3Φ14' }, // Duplicate text, but distinct ID
    { id: 't5', text: '机房层梁配筋图' },
    { id: 't6', text: '1. 未注明定位尺寸的梁以轴线居中或与柱边平。' },
    { id: 't7', text: '2. 未注明定位的梁定位见板图;未注明梁顶标高同机房层标高 H。' },
    { id: 't8', text: '3. 主次梁相交处主梁上密箍每侧三根@50，直径及肢数同梁箍筋; 交叉梁相交处密箍每侧三根@50，直径及肢数同梁箍筋。' },
    { id: 't9', text: '4. 当框架梁一端与剪力墙或柱相连，另一端搁置在梁上或墙平面外时，仅与剪力墙或柱连接支座处设置箍筋加密区。' },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setMatchedIds([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const matches = searchableTexts
      .filter(item => item.text.toLowerCase().includes(query.toLowerCase()))
      .map(item => item.id);
    setMatchedIds(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  };

  const nextMatch = () => {
    if (matchedIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matchedIds.length);
  };

  const prevMatch = () => {
    if (matchedIds.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matchedIds.length) % matchedIds.length);
  };

  const HighlightText = ({ id, text, className }: { id: string, text: string, className?: string }) => {
    const isMatched = matchedIds.includes(id);
    const isCurrent = matchedIds[currentMatchIndex] === id;
    
    return (
      <span className={cn(
        className, 
        isMatched && "bg-yellow-500/30 text-yellow-200", 
        isCurrent && "bg-brand-500/80 text-white ring-2 ring-brand-400 px-1 rounded transition-all duration-300 shadow-lg scale-110 inline-block z-10"
      )}>
        {text}
      </span>
    );
  };

  const startResizingLeft = React.useCallback((e: React.MouseEvent) => {
    setIsResizingLeft(true);
    e.preventDefault();
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        // 48px is the width of the far left icon bar
        const newWidth = e.clientX - 48; 
        if (newWidth > 200 && newWidth < 600) {
          setLeftPanelWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
    };

    if (isResizingLeft) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft]);

  React.useEffect(() => {
    if (!isSelecting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExitSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelecting]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isBuildingMenuOpen && buildingMenuRef.current && !buildingMenuRef.current.contains(target)) {
        setIsBuildingMenuOpen(false);
      }
      if (isFloorMenuOpen && floorMenuRef.current && !floorMenuRef.current.contains(target)) {
        setIsFloorMenuOpen(false);
      }
      if (isComponentTypeMenuOpen && componentTypeMenuRef.current && !componentTypeMenuRef.current.contains(target)) {
        setIsComponentTypeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBuildingMenuOpen, isFloorMenuOpen, isComponentTypeMenuOpen]);
  
  // Tree Data State
  const [treeData, setTreeData] = useState<TreeNodeData[]>(initialTreeData);
  const buildUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const buildings = treeData.filter(node => node.type === 'building');
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId) || buildings[0] || null;
  const floors = (selectedBuilding?.children || []).filter(node => node.type === 'floor');
  const selectedFloor = floors.find(f => f.id === selectedFloorId) || floors[0] || null;
  const visibleTreeNodes = selectedFloor?.children || [];
  const componentCount = visibleTreeNodes.filter(node => node.type === 'component').length;
  const threeDBuilding = buildings.find(b => b.id === threeDBuildingId) || null;
  const threeDFloorOptions = (threeDBuilding?.children || []).filter(node => node.type === 'floor');
  const threeDFloor = threeDFloorOptions.find(f => f.id === threeDFloorId) || null;
  const threeDComponentOptions = (threeDFloor?.children || []).filter(node => node.type === 'component');
  const threeDComponent = threeDComponentOptions.find(node => node.id === threeDComponentId) || null;

  React.useEffect(() => {
    if (buildings.length === 0) {
      if (selectedBuildingId) setSelectedBuildingId('');
      if (selectedFloorId) setSelectedFloorId('');
      return;
    }
    const nextBuilding = buildings.find(b => b.id === selectedBuildingId) || buildings[0];
    if (nextBuilding.id !== selectedBuildingId) {
      setSelectedBuildingId(nextBuilding.id);
    }
    const nextFloors = (nextBuilding.children || []).filter(node => node.type === 'floor');
    const nextFloor = nextFloors.find(f => f.id === selectedFloorId) || nextFloors[0];
    if ((nextFloor?.id || '') !== selectedFloorId) {
      setSelectedFloorId(nextFloor?.id || '');
    }
  }, [buildings, selectedBuildingId, selectedFloorId]);

  // --- Tree Actions ---
  const toggleNodeExpand = (nodeId: string) => {
    const toggleNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(prev => toggleNode(prev));
  };

  const addNode = (parentId: string, type: string) => {
    const id = buildUniqueId('temp');

    // Helper to create node object
    const createNode = (nodeType: TreeNodeData['type'], name: string = '', desc: string = ''): TreeNodeData => ({
      id,
      type: nodeType,
      name,
      desc,
      expanded: true,
      children: []
    });

    setTreeData(prev => {
      if (parentId === 'root') {
        const newNode = createNode('building', '', '楼层 0 层');
        return [...prev, newNode];
      }
      const addToNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            let newNode: TreeNodeData;
            
            if (type === 'floor') {
              newNode = createNode('floor', '', '0 图纸 · 0 说明');
            } else {
              newNode = createNode('component', '梁', '0 图纸 · 0 说明'); 
            }
            
            return { 
              ...node, 
              children: [...(node.children || []), newNode],
              expanded: true 
            };
          }
          if (node.children) {
            return { ...node, children: addToNode(node.children) };
          }
          return node;
        });
      };
      return addToNode(prev);
    });
    return id;
  };

  const editNodeName = (nodeId: string, newName: string) => {
    const updateName = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          // If it was a temp node, give it a permanent ID
          const finalId = node.id.startsWith('temp-') ? node.id.replace('temp-', 'final-') : node.id;
          // Set default names if empty
          let finalName = newName;
          if (!finalName && node.type === 'building') finalName = '新建筑';
          if (!finalName && node.type === 'floor') finalName = '新楼层';
          
          return { ...node, id: finalId, name: finalName };
        }
        if (node.children) {
          return { ...node, children: updateName(node.children) };
        }
        return node;
      });
    };
    setTreeData(prev => updateName(prev));
  };

  const deleteNode = (nodeId: string) => {
    const removeNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.filter(node => node.id !== nodeId).map(node => {
        if (node.children) {
          return { ...node, children: removeNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(prev => removeNode(prev));
  };

  const findNodePath = (nodes: TreeNodeData[], targetId: string, path: TreeNodeData[] = []): TreeNodeData[] | null => {
    for (const node of nodes) {
      const nextPath = [...path, node];
      if (node.id === targetId) return nextPath;
      if (node.children) {
        const result = findNodePath(node.children, targetId, nextPath);
        if (result) return result;
      }
    }
    return null;
  };

  const buildDefaultLayerName = (componentNode: TreeNodeData) => {
    const path = findNodePath(treeData, componentNode.id) || [];
    const building = path.find(p => p.type === 'building')?.name || '';
    const floor = path.find(p => p.type === 'floor')?.name || '';
    const component = componentNode.name || '';
    const drawingsCount = componentNode.children?.filter(child => child.type === 'drawing').length || 0;
    const index = drawingsCount + 1;
    return `${building}${floor}${component}${index}`;
  };

  const calculateStats = (node: TreeNodeData): string => {
    // Recursive function to count drawings and descs
    const countDrawings = (n: TreeNodeData): { drawings: number, descs: number } => {
      let d = 0;
      let s = 0;
      
      if (n.type === 'drawing') {
        if (n.badge === 'PLAN') d++;
        if (n.badge === 'DESC') s++;
      }
      
      if (n.children) {
        n.children.forEach(child => {
          const counts = countDrawings(child);
          d += counts.drawings;
          s += counts.descs;
        });
      }
      return { drawings: d, descs: s };
    };

    const { drawings, descs } = countDrawings(node);
    return `${drawings} 图纸 · ${descs} 说明`;
  };

  const addDrawingToComponent = (componentId: string, name: string, type: '图纸' | '说明') => {
    // We need to update the entire tree recursively to recalculate stats for all ancestors
    const updateNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        // If this node is the target component, add the drawing
        if (node.id === componentId) {
          const newDrawing: TreeNodeData = {
            id: `d-${Date.now()}`,
            type: 'drawing',
            name: name,
            badge: type === '说明' ? 'DESC' : 'PLAN',
            status: '手动'
          };
          const newChildren = [...(node.children || []), newDrawing];
          
          // Recalculate stats for this component
          // Note: calculateStats expects a node, but here we construct a temp one
          const tempNode = { ...node, children: newChildren };
          const stats = calculateStats(tempNode);
          
          return { 
            ...node, 
            children: newChildren,
            desc: stats 
          };
        }
        
        // If not target, but has children, recurse
        if (node.children) {
          const updatedChildren = updateNodes(node.children);
          
          // Only if children actually changed (optimization check could go here, but for now we rebuild)
          // Actually, we must rebuild to update stats if a descendant changed
          
          // Check if any descendant was updated by comparing references or just always update stats for parents
          // Since we are mapping, we are creating new objects.
          // To update parent stats, we need to know if a child was updated.
          
          // A simpler approach: First add the drawing deep in the tree.
          // Then traverse the whole tree bottom-up (or post-order) to update stats.
          // But `map` is top-down. 
          
          // Let's stick to the current structure:
          // We return the updated node with updated children.
          // Then we re-calculate stats for the current node based on new children.
          
          const newNode = { ...node, children: updatedChildren };
          
          // Update stats for Building and Floor nodes
          if (newNode.type === 'building' || newNode.type === 'floor' || newNode.type === 'component') {
             // For component, we might have already updated it in the 'if (node.id === componentId)' block above?
             // No, because that block returns early.
             // So this part runs for ancestors of the component.
             newNode.desc = calculateStats(newNode);
          }
          
          return newNode;
        }
        
        return node;
      });
    };
    
    setTreeData(prev => updateNodes(prev));
  };

  const handleStartLinking = (node: TreeNodeData) => {
    setSelectedComponent(node);
    setIsSelecting(true);
    setIsLinkConfirmOpen(false);
    setSelectionRect(null);
    setSelectionStart(null);
    setLinkLayerName(buildDefaultLayerName(node));
    setLinkLayerType('图纸');
  };

  const handleSelectionStart = (e: React.MouseEvent) => {
    if (!isSelecting || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setSelectionStart({ x, y });
    setSelectionRect({ x, y, width: 0, height: 0 });
    setIsDraggingSelection(true);
  };

  const handleSelectionMove = (e: React.MouseEvent) => {
    if (!isDraggingSelection || !selectionStart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const x = Math.min(selectionStart.x, currentX);
    const y = Math.min(selectionStart.y, currentY);
    const width = Math.abs(selectionStart.x - currentX);
    const height = Math.abs(selectionStart.y - currentY);
    setSelectionRect({ x, y, width, height });
  };

  const handleSelectionEnd = () => {
    if (!isDraggingSelection) return;
    setIsDraggingSelection(false);
    if (!selectionRect || selectionRect.width < 5 || selectionRect.height < 5) {
      setSelectionRect(null);
      return;
    }
    // Don't open modal immediately, wait for user confirmation via buttons
  };

  const handleSelectionConfirm = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent re-triggering selection start
    setIsLinkConfirmOpen(true);
  };

  const handleSelectionCancel = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent re-triggering selection start
    setSelectionRect(null);
  };

  const handleExitSelection = () => {
    setIsSelecting(false);
    setIsLinkConfirmOpen(false);
    setSelectionRect(null);
    setSelectionStart(null);
    setSelectedComponent(null);
  };

  const handleSelectBuilding = (buildingId: string) => {
    setSelectedBuildingId(buildingId);
    const building = buildings.find(b => b.id === buildingId);
    const nextFloor = (building?.children || []).find(node => node.type === 'floor') || null;
    setSelectedFloorId(nextFloor?.id || '');
    setIsBuildingMenuOpen(false);
    setIsAddingBuilding(false);
    setBuildingDraftName('');
    setEditingBuildingId(null);
    setEditingBuildingName('');
  };

  const handleSelectFloor = (floorId: string) => {
    setSelectedFloorId(floorId);
    setIsFloorMenuOpen(false);
    setIsAddingFloor(false);
    setFloorDraftName('');
    setEditingFloorId(null);
    setEditingFloorName('');
  };

  const handleOpenBuildingSettings = () => {
    if (!selectedBuilding) return;
    setCurrentBuildingNode(null);
    setTimeout(() => {
      setCurrentBuildingNode(selectedBuilding);
      setIsBuildingSettingsOpen(true);
    }, 0);
    setIsBuildingMenuOpen(false);
  };

  const handleSaveBuildingSettings = (buildingId: string, payload: { name: string; floors: { id: string; name: string; floorDetails: FloorDetails }[] }) => {
    const updateNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.id === buildingId) {
          const updatedChildren = (node.children || []).map(child => {
            if (child.type !== 'floor') return child;
            const floorUpdate = payload.floors.find(floor => floor.id === child.id);
            if (!floorUpdate) return child;
            return { ...child, name: floorUpdate.name, floorDetails: floorUpdate.floorDetails };
          });
          return { ...node, name: payload.name, children: updatedChildren };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) };
        }
        return node;
      });
    };
    setTreeData(updateNode(treeData));
  };

  const handleConfirmLink = () => {
    if (!selectedComponent) return;
    addDrawingToComponent(
      selectedComponent.id,
      linkLayerName.trim() || buildDefaultLayerName(selectedComponent),
      linkLayerType
    );
    setIsLinkConfirmOpen(false);
    setIsSelecting(false);
    setSelectionRect(null);
    setSelectionStart(null);
    setSelectedComponent(null);
  };

  const handleCancelLink = () => {
    setIsLinkConfirmOpen(false);
    setSelectionRect(null);
    setSelectionStart(null);
  };

  // Calculate total layers
  const totalLayers = layerConfigs.reduce((acc, config) => {
    if (!config.value) return acc;
    return acc + config.value.split(',').length;
  }, 0);

  const handleExport = () => {
    // Export logic placeholder
    console.log('Exporting...');
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    setIsCalculated(false);
    // Simulate calculation
    setTimeout(() => {
      setIsCalculating(false);
      setIsCalculated(true);
      // Add a new result item
      const newResult = {
        id: buildUniqueId('result'),
        name: `计算结果_${currentComponentName}`,
        color: '#ff0000',
        visible: true,
        type: 'result'
      };
      setResultLayers(prev => [...prev, newResult]);
    }, 1500);
  };

  const handleResultLayerToggle = () => {
    setIsResultLayerExpanded(!isResultLayerExpanded);
  };
  
  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      setLayerConfigs(prev => [
        ...prev, 
        { 
          id: buildUniqueId('custom'), 
          label: newCategoryName.trim(), 
          value: '', 
          visible: true, 
          expanded: true 
        }
      ]);
      setNewCategoryName('');
      setIsAddCategoryModalOpen(false);
    }
  };

  const handleStartExtraction = (categoryId: string) => {
    setTargetCategoryForExtraction(categoryId);
    setSelectedExtractionLayers([]);
    setIsExtractionMode(true);
  };

  const handleConfirmExtraction = () => {
    if (targetCategoryForExtraction) {
        setLayerConfigs(prev => prev.map(config => {
            if (config.id === targetCategoryForExtraction) {
                const existingValues = config.value ? config.value.split(',').map(v => v.trim()) : [];
                // Add unique new layers
                const newValues = [...new Set([...existingValues, ...selectedExtractionLayers])];
                return { ...config, value: newValues.join(', ') };
            }
            return config;
        }));
    }
    handleExitExtraction();
  };

  const handleExitExtraction = () => {
    setIsExtractionMode(false);
    setTargetCategoryForExtraction('');
    setSelectedExtractionLayers([]);
    setSelectedSegmentIds([]);
    setIsExitConfirmOpen(false);
  };

  const handleRequestExitExtraction = () => {
      if (selectedExtractionLayers.length > 0) {
          setIsExitConfirmOpen(true);
      } else {
          handleExitExtraction();
      }
  };

  const handleSegmentClick = (e: React.MouseEvent, segmentId: string, layerName: string) => {
      e.stopPropagation();
      
      if (isMultiSelectMode) {
          const nextSelectedMergeLayers = selectedMergeLayers.includes(layerName)
              ? selectedMergeLayers.filter(name => name !== layerName)
              : [...selectedMergeLayers, layerName];
          setSelectedMergeLayers(nextSelectedMergeLayers);
          return;
      }
      
      if (!isExtractionMode) return;

      const isSelected = selectedSegmentIds.includes(segmentId);
      
      const nextSelectedSegmentIds = isSelected 
          ? selectedSegmentIds.filter(id => id !== segmentId) 
          : [...selectedSegmentIds, segmentId];
      
      setSelectedSegmentIds(nextSelectedSegmentIds);

      const layersFromSegments = Array.from(new Set(
          nextSelectedSegmentIds.map(id => {
              const seg = mockSegments.find(s => s.id === id);
              return seg ? seg.layer : '';
          }).filter(Boolean)
      ));
      
      setSelectedExtractionLayers(layersFromSegments);
  };

  // Handle manual tag removal
  const handleRemoveExtractionLayer = (layerToRemove: string) => {
      // Remove layer from list
      setSelectedExtractionLayers(prev => prev.filter(l => l !== layerToRemove));
      
      // Deselect all segments belonging to this layer
      const segmentsToDeselect = mockSegments.filter(s => s.layer === layerToRemove).map(s => s.id);
      setSelectedSegmentIds(prev => prev.filter(id => !segmentsToDeselect.includes(id)));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      // Prevent default mock behavior when we have specific segments
  };

  const handleOriginalLayerToggle = () => {
    setIsOriginalLayerExpanded(!isOriginalLayerExpanded);
  };

  const handleOpen3DEntryDialog = () => {
    if (!isCalculated || isCalculating) return;
    const initialBuildingId = selectedBuilding?.id || buildings[0]?.id || '';
    const initialBuilding = buildings.find(b => b.id === initialBuildingId) || null;
    const initialFloors = (initialBuilding?.children || []).filter(node => node.type === 'floor');
    const initialFloorId = selectedFloor?.id || initialFloors[0]?.id || '';
    const initialFloor = initialFloors.find(f => f.id === initialFloorId) || null;
    const initialComponents = (initialFloor?.children || []).filter(node => node.type === 'component');
    const initialComponentId = selectedComponent?.id || initialComponents[0]?.id || '';
    setThreeDTargetType('component');
    setThreeDBuildingId(initialBuildingId);
    setThreeDFloorId(initialFloorId);
    setThreeDComponentId(initialComponentId);
    setIs3DEntryDialogOpen(true);
  };

  const handleConfirmEnter3DMode = () => {
    if (threeDTargetType === 'component' && threeDComponent) {
      setSelectedComponent(threeDComponent);
      setSelected3DId('jll9');
    } else {
      setSelected3DId(null);
    }
    setIs3DMode(true);
    setIs3DEntryDialogOpen(false);
  };

  const handleExit3DMode = () => {
    setIs3DMode(false);
    setSelected3DId(null);
  };

  const handleSelect3DElement = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected3DId(id === selected3DId ? null : id);
  };

  const handleDeleteFile = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const newFiles = cadFiles.filter(f => f.id !== fileId);
    setCadFiles(newFiles);
    
    // If deleted file was selected, select the first available ready file or clear selection
    if (currentCadId === fileId) {
        const nextReady = newFiles.find(f => f.status === 'ready');
        setCurrentCadId(nextReady ? nextReady.id : '');
    }
  };

  const LayerItem = ({ layer, isResult = false }: { layer: typeof layers[0], isResult?: boolean }) => (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-800/50 rounded cursor-pointer transition-colors group">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          toggleLayerVisibility(layer.id, isResult);
        }}
        className="text-gray-400 hover:text-white"
      >
        {layer.visible ? <Eye size={14} /> : <Eye size={14} className="text-gray-600" />}
      </button>
      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
      <span className="text-xs text-gray-300 truncate flex-1">{layer.name}</span>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white text-gray-900 font-sans">
      
      {/* --- Top Header --- */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium">项目 {id}</span>
              <span className="text-sm font-semibold text-gray-900">配筋简图_修改.dxf</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="unt-button-primary px-3 py-1.5 text-sm flex items-center gap-2">
            <Download size={16} />
            导出
          </button>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Far Left Nav (Icon Bar) */}
        <div className="w-14 border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4 gap-3 shrink-0 z-10">
          <button 
            onClick={() => {
              setActivePanel('files');
              setIsLeftPanelOpen(true);
            }}
            className={cn(
              "flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all relative group w-11",
              activePanel === 'files' && isLeftPanelOpen 
                ? "text-brand-600 bg-brand-50 ring-1 ring-brand-200" 
                : "text-gray-400 hover:text-gray-900 hover:bg-gray-200"
            )}
          >
            <FileText size={18} />
            <span className="text-[10px] font-medium scale-90">图纸</span>
            {/* Tooltip removed as text is now visible */}
          </button>
          
          <button 
            onClick={() => {
              setActivePanel('structure');
              setIsLeftPanelOpen(true);
            }}
            className={cn(
              "flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all relative group w-11",
              activePanel === 'structure' && isLeftPanelOpen 
                ? "text-brand-600 bg-brand-50 ring-1 ring-brand-200" 
                : "text-gray-400 hover:text-gray-900 hover:bg-gray-200"
            )}
          >
            <Menu size={18} />
            <span className="text-[10px] font-medium scale-90">结构</span>
          </button>


        </div>

        {/* Left Panel Content */}
        <div 
          className={cn(
            "border-r border-gray-200 bg-white flex flex-col shrink-0 transition-all duration-300 ease-in-out z-10 relative",
            isLeftPanelOpen ? "" : "w-0 border-r-0 overflow-hidden"
          )}
          style={{ width: isLeftPanelOpen ? leftPanelWidth : 0 }}
        >
          {/* Resizer Handle */}
          {isLeftPanelOpen && (
            <div
              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-500 transition-colors z-20 opacity-0 hover:opacity-100"
              onMouseDown={(e) => {
                setIsResizingLeft(true);
                e.preventDefault();
              }}
            />
          )}

          {/* Panel Header */}
          <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">
              {activePanel === 'structure' && '项目结构'}
              {activePanel === 'files' && 'CAD文件列表'}
            </h2>
            <button 
              onClick={() => setIsLeftPanelOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
              title="收起面板"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
          
          {/* Structure Panel Content */}
          {activePanel === 'structure' && (
            <>
              <div className="px-3 py-3 border-b border-gray-100 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1" ref={buildingMenuRef}>
                    <button
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] text-sm text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--untitled-ui-brand)]"
                      type="button"
                      onClick={() => {
                        setIsBuildingMenuOpen(prev => !prev);
                        setIsFloorMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} />
                        <span className="truncate">{selectedBuilding?.name || '未选择楼栋'}</span>
                      </div>
                      <ChevronDown size={14} className="text-[var(--untitled-ui-text-secondary)]" />
                    </button>
                    <AnimatePresence>
                      {isBuildingMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] shadow-lg z-30 overflow-hidden"
                        >
                          <div className="p-2 border-b border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)]">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingBuilding(true);
                                setBuildingDraftName('');
                                setEditingBuildingId(null);
                                setEditingBuildingName('');
                              }}
                              className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium rounded-md border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                            >
                              <Plus size={14} />
                              新增楼栋
                            </button>
                          </div>
                          {isAddingBuilding && (
                            <div className="px-2 pt-2">
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)]">
                                <input
                                  type="text"
                                  value={buildingDraftName}
                                  onChange={(e) => setBuildingDraftName(e.target.value)}
                                  className="flex-1 text-sm bg-transparent focus:outline-none"
                                  placeholder="输入楼栋名称"
                                  autoFocus
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!buildingDraftName.trim()}
                                    onClick={() => {
                                      const name = buildingDraftName.trim();
                                      if (!name) return;
                                      const newId = addNode('root', 'building');
                                      editNodeName(newId, name);
                                      const finalId = newId.startsWith('temp-') ? newId.replace('temp-', 'final-') : newId;
                                      setSelectedBuildingId(finalId);
                                      setIsAddingBuilding(false);
                                      setBuildingDraftName('');
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-md transition-colors",
                                      buildingDraftName.trim()
                                        ? "text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)]"
                                        : "text-[var(--untitled-ui-text-secondary)] opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingBuilding(false);
                                      setBuildingDraftName('');
                                    }}
                                    className="p-1.5 rounded-md text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="p-2 max-h-56 overflow-y-auto">
                            {buildings.map(building => {
                              const isEditing = editingBuildingId === building.id;
                              return (
                                <div
                                  key={building.id}
                                  className={cn(
                                    "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                                    building.id === selectedBuilding?.id && !isEditing
                                      ? "bg-[var(--untitled-ui-bg-secondary)]"
                                      : "hover:bg-[var(--untitled-ui-bg-secondary)]"
                                  )}
                                >
                                  {isEditing ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingBuildingName}
                                        onChange={(e) => setEditingBuildingName(e.target.value)}
                                        className="flex-1 text-sm bg-transparent focus:outline-none"
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={!editingBuildingName.trim()}
                                          onClick={() => {
                                            const name = editingBuildingName.trim();
                                            if (!name) return;
                                            editNodeName(building.id, name);
                                            setEditingBuildingId(null);
                                            setEditingBuildingName('');
                                          }}
                                          className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            editingBuildingName.trim()
                                              ? "text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)]"
                                              : "text-[var(--untitled-ui-text-secondary)] opacity-50 cursor-not-allowed"
                                          )}
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingBuildingId(null);
                                            setEditingBuildingName('');
                                          }}
                                          className="p-1.5 rounded-md text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)] transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectBuilding(building.id)}
                                        className="flex-1 flex items-center gap-2 text-left text-sm text-[var(--untitled-ui-text-primary)]"
                                      >
                                        <span className="truncate">{building.name || '未命名楼栋'}</span>
                                        {building.id === selectedBuilding?.id && <Check size={14} />}
                                      </button>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={handleOpenBuildingSettings}
                                          className="p-1.5 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
                                        >
                                          <Settings size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            deleteNode(building.id);
                                            setEditingBuildingId(null);
                                            setEditingBuildingName('');
                                          }}
                                          className="p-1.5 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {buildings.length === 0 && (
                              <div className="px-2 py-2 text-sm text-[var(--untitled-ui-text-secondary)]">暂无楼栋</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button
                    onClick={handleOpenBuildingSettings}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors text-xs font-medium"
                    title="楼栋信息"
                  >
                    <Settings size={16} />
                    楼栋信息
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1" ref={floorMenuRef}>
                    <button
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] text-sm text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--untitled-ui-brand)]"
                      type="button"
                      onClick={() => {
                        setIsFloorMenuOpen(prev => !prev);
                        setIsBuildingMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Layers size={14} />
                        <span className="truncate">{selectedFloor?.name || '未选择楼层'}</span>
                      </div>
                      <ChevronDown size={14} className="text-[var(--untitled-ui-text-secondary)]" />
                    </button>
                    <AnimatePresence>
                      {isFloorMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] shadow-lg z-30 overflow-hidden"
                        >
                          <div className="p-2 border-b border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)]">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingFloor(true);
                                setFloorDraftName('');
                                setEditingFloorId(null);
                                setEditingFloorName('');
                              }}
                              className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs font-medium rounded-md border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                            >
                              <Plus size={14} />
                              新增楼层
                            </button>
                          </div>
                          {isAddingFloor && (
                            <div className="px-2 pt-2">
                              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)]">
                                <input
                                  type="text"
                                  value={floorDraftName}
                                  onChange={(e) => setFloorDraftName(e.target.value)}
                                  className="flex-1 text-sm bg-transparent focus:outline-none"
                                  placeholder="输入楼层名称"
                                  autoFocus
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!floorDraftName.trim() || !selectedBuilding}
                                    onClick={() => {
                                      if (!selectedBuilding) return;
                                      const name = floorDraftName.trim();
                                      if (!name) return;
                                      const newId = addNode(selectedBuilding.id, 'floor');
                                      editNodeName(newId, name);
                                      const finalId = newId.startsWith('temp-') ? newId.replace('temp-', 'final-') : newId;
                                      setSelectedFloorId(finalId);
                                      setIsAddingFloor(false);
                                      setFloorDraftName('');
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-md transition-colors",
                                      floorDraftName.trim() && selectedBuilding
                                        ? "text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)]"
                                        : "text-[var(--untitled-ui-text-secondary)] opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAddingFloor(false);
                                      setFloorDraftName('');
                                    }}
                                    className="p-1.5 rounded-md text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="p-2 max-h-56 overflow-y-auto">
                            {floors.map(floor => {
                              const isEditing = editingFloorId === floor.id;
                              return (
                                <div
                                  key={floor.id}
                                  className={cn(
                                    "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                                    floor.id === selectedFloor?.id && !isEditing
                                      ? "bg-[var(--untitled-ui-bg-secondary)]"
                                      : "hover:bg-[var(--untitled-ui-bg-secondary)]"
                                  )}
                                >
                                  {isEditing ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingFloorName}
                                        onChange={(e) => setEditingFloorName(e.target.value)}
                                        className="flex-1 text-sm bg-transparent focus:outline-none"
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={!editingFloorName.trim()}
                                          onClick={() => {
                                            const name = editingFloorName.trim();
                                            if (!name) return;
                                            editNodeName(floor.id, name);
                                            setEditingFloorId(null);
                                            setEditingFloorName('');
                                          }}
                                          className={cn(
                                            "p-1.5 rounded-md transition-colors",
                                            editingFloorName.trim()
                                              ? "text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)]"
                                              : "text-[var(--untitled-ui-text-secondary)] opacity-50 cursor-not-allowed"
                                          )}
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingFloorId(null);
                                            setEditingFloorName('');
                                          }}
                                          className="p-1.5 rounded-md text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)] transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectFloor(floor.id)}
                                        className="flex-1 flex items-center gap-2 text-left text-sm text-[var(--untitled-ui-text-primary)]"
                                      >
                                        <span className="truncate">{floor.name || '未命名楼层'}</span>
                                        {floor.id === selectedFloor?.id && <Check size={14} />}
                                      </button>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingFloorId(floor.id);
                                            setEditingFloorName(floor.name || '');
                                          }}
                                          className="p-1.5 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            deleteNode(floor.id);
                                            setEditingFloorId(null);
                                            setEditingFloorName('');
                                          }}
                                          className="p-1.5 bg-brand-50 text-brand-600 rounded-md hover:bg-brand-100 transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {floors.length === 0 && (
                              <div className="px-2 py-2 text-sm text-[var(--untitled-ui-text-secondary)]">暂无楼层</div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* New Component Menu */}
                  <div className="relative" ref={componentTypeMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsComponentTypeMenuOpen(prev => !prev)}
                      className="flex items-center gap-1.5 px-2 py-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors text-xs font-medium"
                      title="新建构件"
                    >
                      <Plus size={16} />
                      新建构件
                    </button>
                    <AnimatePresence>
                      {isComponentTypeMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.98 }}
                          className="absolute right-0 top-full mt-2 w-36 rounded-xl border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] shadow-lg z-30 overflow-hidden"
                          style={{ right: 0, zIndex: 50 }}
                        >
                          {['梁', '柱', '墙', '板'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                if (!selectedFloor) return;
                                const hasSameType = visibleTreeNodes.some(
                                  node => node.type === 'component' && node.name === type
                                );
                                if (hasSameType) {
                                  alert('当前楼层已存在相同类型的构建');
                                  return;
                                }
                                const newId = addNode(selectedFloor.id, 'component');
                                editNodeName(newId, type);
                                setIsComponentTypeMenuOpen(false);
                              }}
                              className="w-full px-3 py-2 text-sm text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] transition-colors text-left"
                            >
                              {type}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="px-3 py-2 border-b border-gray-100 shrink-0 bg-gray-50/50">
                  <span className="text-xs font-medium text-[var(--untitled-ui-text-secondary)]">
                    当前楼层构件（{componentCount}）
                  </span>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {visibleTreeNodes.length > 0 ? (
                  visibleTreeNodes.map(node => (
                    <TreeNode 
                      key={node.id} 
                      node={node} 
                      onToggleExpand={toggleNodeExpand}
                      onEdit={editNodeName}
                      onDelete={deleteNode}
                      onLink={handleStartLinking}
                    />
                  ))
                ) : (
                  <div className="px-4 py-6 text-xs text-[var(--untitled-ui-text-secondary)]">
                    当前楼层暂无构件
                  </div>
                )}
              </div>
            </>
          )}

          {/* Files Panel Content (Merged with Layers) */}
          {activePanel === 'files' && (
            <div className="flex-1 flex flex-col relative overflow-visible">
              {/* Top: File Selector */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0 z-20 relative">
                <button 
                  onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
                  className="w-full text-left focus:outline-none"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">当前选中</span>
                    <div className="flex items-center gap-2">
                      {currentCadFile?.status === 'ready' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">已就绪</span>
                      )}
                      <ChevronDown size={14} className={cn("text-gray-400 transition-transform", isFileDropdownOpen ? "rotate-180" : "")} />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900 truncate" title={currentCadFile?.name}>{currentCadFile?.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">ID: {currentCadFile?.id} · {currentCadFile?.uploadTime}</div>
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {isFileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-1 mx-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[300px] overflow-y-auto"
                    >
                      {cadFiles.map(file => (
                        <div
                          key={file.id}
                          onClick={() => {
                            if (file.status === 'ready') {
                                if (currentCadId === file.id) {
                                    setCurrentCadId('');
                                } else {
                                    setCurrentCadId(file.id);
                                }
                                setIsFileDropdownOpen(false);
                            }
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between group border-b border-gray-50 last:border-0",
                            currentCadId === file.id ? "bg-brand-50/50" : "",
                            file.status !== 'ready' ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                          )}
                        >
                          <div className="min-w-0 flex-1 mr-3">
                            <div className={cn(
                              "text-sm font-medium truncate",
                              currentCadId === file.id ? "text-brand-600" : "text-gray-700"
                            )}>{file.name}</div>
                            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                              <span>ID: {file.id}</span>
                              <span>{file.uploadTime}</span>
                            </div>
                            <div className="text-[10px] mt-1">
                                {file.status === 'processing' && <span className="text-orange-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-orange-500 border-t-transparent animate-spin"/> 处理中...</span>}
                                {file.status === 'error' && <span className="text-red-500">上传失败</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              currentCadId === file.id 
                                ? "bg-brand-600 border-brand-600 text-white" 
                                : "border-gray-300 bg-white group-hover:border-brand-400"
                            )}>
                              {currentCadId === file.id && <Check size={12} strokeWidth={3} />}
                            </div>
                            <button
                              onClick={(e) => handleDeleteFile(e, file.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="删除文件"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Upload CAD File Button */}
              <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0 space-y-2">
                <button 
                  onClick={() => {
                    const newFile: { id: string; name: string; uploadTime: string; status: 'ready' | 'processing' | 'error' } = { 
                      id: buildUniqueId('cad'), 
                      name: `新上传图纸_${new Date().toLocaleTimeString()}.dxf`, 
                      uploadTime: new Date().toLocaleString(), 
                      status: 'processing' 
                    };
                    setCadFiles(prev => [newFile, ...prev]);
                    
                    // Simulate processing
                    setTimeout(() => {
                        setCadFiles(prev => prev.map(f => 
                            f.id === newFile.id ? { ...f, status: 'ready' } : f
                        ));
                    }, 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 rounded-md transition-colors text-xs font-medium border border-brand-200"
                >
                  <span className="bg-brand-100 text-brand-700 px-1.5 rounded text-[10px]">第1步</span>
                  <span>上传CAD图纸</span>
                </button>

                <button 
                  onClick={() => setIsAIModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-colors text-xs font-medium border border-indigo-200"
                >
                  <span className="bg-indigo-100 text-indigo-700 px-1.5 rounded text-[10px]">第2步</span>
                  <span>AI识别分析</span>
                </button>
              </div>
              
              {/* Layer List Header */}
              {/* Removed Top Header as requested */}

              {/* Layers List Content */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
                 
                 {/* Layer Analysis Results (Moved from Right Panel) */}
                 <div className="rounded-lg p-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors group justify-between">
                        <div className="flex items-center gap-2 flex-1">
                            <button
                              onClick={() => {
                                const nextVisible = !isAllLayerConfigsVisible;
                                setLayerConfigs(prev => prev.map(config => ({ ...config, visible: nextVisible })));
                              }}
                              className="text-gray-400 hover:text-gray-600"
                              title={isAllLayerConfigsVisible ? "全部隐藏" : "全部显示"}
                            >
                              <Eye size={14} className={cn(isAllLayerConfigsVisible ? "text-brand-600" : "text-gray-400")} />
                            </button>
                            <button 
                                onClick={() => setIsLayerConfigExpanded(!isLayerConfigExpanded)}
                                className="flex items-center gap-1.5 flex-1 text-xs font-semibold text-gray-700"
                            >
                                {isLayerConfigExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                                <span>图层分析结果</span>
                                <span className="text-[10px] text-gray-400 font-normal">({layerConfigs.length})</span>
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsAddCategoryModalOpen(true)}
                            className="text-gray-400 hover:text-brand-600 p-1 rounded hover:bg-white transition-colors"
                            title="新增图层分类"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    <AnimatePresence>
                        {isLayerConfigExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pl-6 pr-1 space-y-2"
                            >
                                {layerConfigs.map((config) => (
                                  <div key={config.id} className="space-y-1 rounded-md border border-gray-100 bg-white p-2 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLayerConfigs(prev => prev.map(c => 
                                              c.id === config.id ? { ...c, visible: !c.visible } : c
                                            ));
                                          }}
                                          className="text-gray-400 hover:text-gray-600"
                                        >
                                          {config.visible ? <Eye size={14} className="text-brand-600" /> : <Eye size={14} />}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setLayerConfigs(prev => prev.map(c => 
                                              c.id === config.id ? { ...c, expanded: !c.expanded } : c
                                            ));
                                          }}
                                          className="text-gray-400 hover:text-gray-600"
                                        >
                                          {config.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <span
                                          onClick={() => handleLocateLayer(config.label)}
                                          className="text-xs font-medium text-gray-700 cursor-pointer hover:text-brand-600"
                                          title="点击定位图层"
                                        >
                                          {config.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleStartExtraction(config.id)}
                                          className="text-gray-400 hover:text-brand-600 p-1 rounded hover:bg-gray-100"
                                          title="添加图层"
                                        >
                                          <Plus size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setLayerConfigs(prev => prev.filter(c => c.id !== config.id));
                                          }}
                                          className="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-gray-100"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                    {config.expanded && (config.value ? (
                                      <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 min-h-[32px]">
                                        {config.value.split(',').map((val, idx) => (
                                          <span
                                            key={idx}
                                            onClick={() => handleLocateLayer(val.trim())}
                                            className="flex items-center gap-1 text-[10px] font-medium bg-white text-gray-700 px-2 py-1 rounded border border-gray-200 cursor-pointer hover:border-gray-300 hover:bg-gray-50"
                                            title="点击定位图层"
                                          >
                                            {val.trim()}
                                            <button
                                              onClick={() => {
                                                const nextValue = config.value
                                                  .split(',')
                                                  .map(v => v.trim())
                                                  .filter((v, i) => i !== idx)
                                                  .join(', ');
                                                setLayerConfigs(prev => prev.map(c => 
                                                  c.id === config.id ? { ...c, value: nextValue } : c
                                                ));
                                              }}
                                              className="text-gray-400 hover:text-red-500"
                                            >
                                              <X size={10} />
                                            </button>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg border border-gray-100 min-h-[32px]">
                                        <span className="text-[10px] text-gray-400">暂无图层</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>

                 {/* Original CAD Layers Group */}
                 <div className="rounded-lg p-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors group">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleAllLayers(!isOriginalLayersVisible, false);
                            }}
                            className="transition-colors"
                            title={isOriginalLayersVisible ? "隐藏该组" : "显示该组"}
                        >
                            <Eye size={14} className={cn(isOriginalLayersVisible ? "text-brand-600" : "text-gray-400")} />
                        </button>
                        <button 
                            onClick={handleOriginalLayerToggle}
                            className="flex items-center gap-1.5 flex-1 text-xs font-semibold text-gray-700"
                        >
                            {isOriginalLayerExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                            <span>原始CAD图层</span>
                            <span className="text-[10px] text-gray-400 font-normal">({layers.length})</span>
                        </button>
                    </div>
                    
                    <AnimatePresence>
                        {isOriginalLayerExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pl-6 pr-1 space-y-1"
                            >
                                <div className="px-1 py-1 mb-1">
                                  <div className="relative flex items-center">
                                    <input
                                      type="text"
                                      value={layerSearchQuery}
                                      onChange={(e) => setLayerSearchQuery(e.target.value)}
                                      placeholder="搜索原始图层..."
                                      className="unt-input w-full text-xs py-1 pl-2 pr-6 bg-gray-50 h-7"
                                    />
                                    {layerSearchQuery && (
                                      <button 
                                        onClick={() => setLayerSearchQuery('')} 
                                        className="absolute right-1.5 text-gray-400 hover:text-gray-600"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {layers
                                .filter(l => l.name.toLowerCase().includes(layerSearchQuery.toLowerCase()))
                                .map(layer => (
                                    <div 
                                      key={layer.id} 
                                      onClick={() => handleLocateLayer(layer.name)}
                                      className="flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors group hover:bg-gray-50 border border-transparent hover:border-gray-100"
                                      title="点击定位图层"
                                    >
                                    <button 
                                        onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLayerVisibility(layer.id);
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <Eye size={14} className={cn(layer.visible ? "text-brand-600" : "text-gray-300")} />
                                    </button>
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: layer.color }} />
                                    <span className={cn("text-xs truncate flex-1", layer.visible ? "text-gray-700" : "text-gray-400")}>{layer.name}</span>
                                    </div>
                                ))}
                                {layers.length === 0 && <div className="text-[10px] text-gray-400 py-2 pl-2">无图层</div>}
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative">
          {/* Tabs */}
          <div className="h-10 border-b border-gray-200 bg-white flex items-center px-2 shrink-0 gap-1 overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-900 text-sm font-medium rounded-md border border-gray-200 shrink-0">
              配筋简图_修改.dxf
              <button className="p-0.5 text-gray-400 hover:text-gray-700 rounded transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Toggle Panels Buttons (when closed) */}
          {!isLeftPanelOpen && (
            <button 
              onClick={() => setIsLeftPanelOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-l-0 border-gray-200 p-1.5 rounded-r-lg shadow-sm text-gray-500 hover:text-gray-900 z-20"
              title="展开项目结构"
            >
              <ChevronRight size={16} />
            </button>
          )}

          {!isRightPanelOpen && (
            <button 
              onClick={() => setIsRightPanelOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-r-0 border-gray-200 p-1.5 rounded-l-lg shadow-sm text-gray-500 hover:text-gray-900 z-20"
              title="展开分析面板"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          {/* Canvas Toolbar (Top Right) */}
          <div className="absolute top-14 right-4 flex items-center gap-3 z-10">
            <div className="bg-white/80 backdrop-blur border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm text-xs font-mono text-gray-600">
              X: -31023, Y: 43624
            </div>
            {is3DMode && (
              <button
                onClick={handleExit3DMode}
                className="bg-white/80 backdrop-blur border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-white transition-colors flex items-center gap-2"
              >
                <X size={16} />
                退出3D
              </button>
            )}
            {isSelecting && (
              <button
                onClick={handleExitSelection}
                className="bg-white/80 backdrop-blur border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-white transition-colors flex items-center gap-2"
              >
                <X size={16} />
                退出关联
              </button>
            )}
          </div>

          {/* Canvas Placeholder (Simulating CAD drawing) */}
          <div ref={canvasRef} className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#0a0a0a]">
            {is3DMode ? (
               <div className="absolute inset-0 bg-[var(--untitled-ui-bg-invert)] overflow-hidden flex items-center justify-center">
                  <div className="absolute top-4 left-4 z-20 rounded-lg p-3 shadow-sm min-w-[190px] border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] text-[var(--untitled-ui-text-primary)]">
                      <div className="flex items-center gap-2 mb-2 border-b border-[var(--untitled-ui-border)] pb-2">
                          <span className="text-xs font-bold">操作指南</span>
                      </div>
                      <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                              <span>平移</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--untitled-ui-bg-secondary)] text-[var(--untitled-ui-text-secondary)]">
                                中键
                              </span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span>旋转</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--untitled-ui-bg-secondary)] text-[var(--untitled-ui-text-secondary)]">
                                中键+组合键
                              </span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span>选中</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--untitled-ui-bg-secondary)] text-[var(--untitled-ui-text-secondary)]">
                                左键
                              </span>
                          </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <button
                          onClick={() => setIs2DUnderlayVisible(prev => !prev)}
                          className="w-full text-xs font-medium rounded-md px-2 py-1.5 transition-colors border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-secondary)] text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--untitled-ui-brand)]"
                        >
                          {is2DUnderlayVisible ? '隐藏2D图纸' : '显示2D图纸'}
                        </button>
                        <button
                          onClick={() => setIsShadowVisible(prev => !prev)}
                          className="w-full text-xs font-medium rounded-md px-2 py-1.5 transition-colors border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-secondary)] text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--untitled-ui-brand)]"
                        >
                          {isShadowVisible ? '隐藏阴影' : '显示阴影'}
                        </button>
                        <button
                          onClick={() => setSceneTransform(defaultSceneTransform)}
                          className="w-full text-xs font-medium rounded-md px-2 py-1.5 transition-colors border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-secondary)] text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--untitled-ui-brand)]"
                        >
                          重置视角
                        </button>
                      </div>
                  </div>

                  <div className="absolute bottom-4 right-4 z-20 rounded-lg p-3 shadow-sm min-w-[160px] border border-[var(--untitled-ui-border)] bg-[var(--untitled-ui-bg-primary)] text-[var(--untitled-ui-text-primary)]">
                      <div className="text-xs font-bold mb-2 border-b border-[var(--untitled-ui-border)] pb-2">图例</div>
                      <div className="space-y-2">
                          <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--untitled-ui-visual-1)' }}></div>
                              <span className="text-xs font-medium">柱</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--untitled-ui-visual-2)' }}></div>
                              <span className="text-xs font-medium">墙</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--untitled-ui-visual-3)' }}></div>
                              <span className="text-xs font-medium">梁</span>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--untitled-ui-visual-4)' }}></div>
                              <span className="text-xs font-medium">板</span>
                          </div>
                      </div>
                  </div>

                  <div className="relative w-full h-full flex items-center justify-center perspective-[1000px] overflow-hidden" style={{ perspective: '1200px' }}>
                      <div className="relative transform-style-3d transition-transform duration-500 ease-out" style={{ transform: sceneTransform }}>
                          <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border"
                            style={{
                              borderColor: 'var(--untitled-ui-border-subtle)',
                              backgroundImage: `linear-gradient(var(--untitled-ui-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--untitled-ui-border-subtle) 1px, transparent 1px)`,
                              backgroundSize: '40px 40px',
                              transform: 'translateZ(-50px)'
                            }}
                          />
                          
                          {is2DUnderlayVisible && (
                            <div
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] border"
                              style={{
                                borderColor: 'var(--untitled-ui-visual-2)',
                                transform: 'translateZ(0px)',
                                opacity: 0.6
                              }}
                            />
                          )}

                          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2" style={{ transformStyle: 'preserve-3d' }}>
                                <div
                                  className="absolute top-10 left-10 w-4 h-4"
                                  style={{
                                    transform: 'translateZ(20px)',
                                    background: 'var(--untitled-ui-visual-1)',
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-1)' : 'none'
                                  }}
                                ></div>
                                <div
                                  className="absolute top-10 right-10 w-4 h-4"
                                  style={{
                                    transform: 'translateZ(20px)',
                                    background: 'var(--untitled-ui-visual-1)',
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-1)' : 'none'
                                  }}
                                ></div>
                                <div
                                  className="absolute bottom-10 left-10 w-4 h-4"
                                  style={{
                                    transform: 'translateZ(20px)',
                                    background: 'var(--untitled-ui-visual-1)',
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-1)' : 'none'
                                  }}
                                ></div>
                                <div
                                  className="absolute bottom-10 right-10 w-4 h-4"
                                  style={{
                                    transform: 'translateZ(20px)',
                                    background: 'var(--untitled-ui-visual-1)',
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-1)' : 'none'
                                  }}
                                ></div>

                                <div
                                  className="absolute top-10 left-10 right-10 h-2"
                                  style={{
                                    transform: 'translateZ(40px)',
                                    background: 'var(--untitled-ui-visual-3)',
                                    opacity: 0.85,
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-3)' : 'none'
                                  }}
                                ></div>
                                <div
                                  className="absolute bottom-10 left-10 right-10 h-2"
                                  style={{
                                    transform: 'translateZ(40px)',
                                    background: 'var(--untitled-ui-visual-3)',
                                    opacity: 0.85,
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-3)' : 'none'
                                  }}
                                ></div>
                                <div
                                  className="absolute top-10 bottom-10 left-10 w-2"
                                  style={{
                                    transform: 'translateZ(40px)',
                                    background: 'var(--untitled-ui-visual-3)',
                                    opacity: 0.85,
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-3)' : 'none'
                                  }}
                                ></div>
                                <div
                                  className="absolute top-10 bottom-10 right-10 w-2"
                                  style={{
                                    transform: 'translateZ(40px)',
                                    background: 'var(--untitled-ui-visual-3)',
                                    opacity: 0.85,
                                    boxShadow: isShadowVisible ? '0 0 18px var(--untitled-ui-visual-3)' : 'none'
                                  }}
                                ></div>

                                <div 
                                    onClick={(e) => handleSelect3DElement(e, 'jll9')}
                                    className="absolute top-1/2 left-10 right-10 h-4 cursor-pointer transition-all duration-200"
                                    style={{
                                      transform: 'translateZ(40px) translateY(-50%)',
                                      background: selected3DId === 'jll9' ? 'var(--untitled-ui-brand)' : 'var(--untitled-ui-visual-3)',
                                      boxShadow: isShadowVisible ? '0 0 22px var(--untitled-ui-brand)' : 'none'
                                    }}
                                >
                                    {selected3DId === 'jll9' && (
                                        <div
                                          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap"
                                          style={{
                                            background: 'var(--untitled-ui-bg-primary)',
                                            color: 'var(--untitled-ui-text-primary)',
                                            transform: 'rotateX(-60deg)'
                                          }}
                                        >
                                          JLL9
                                        </div>
                                    )}
                                </div>
                          </div>
                      </div>
                  </div>
               </div>
            ) : (
            <>
            {/* Search Box (Top Left in Canvas) */}
            <div className="absolute top-4 left-4 z-20 w-72">
              <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm px-3 py-1.5 flex items-center gap-1">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="搜索图纸内容..." 
                    className="w-full text-sm pl-5 pr-2 bg-transparent border-none focus:outline-none text-gray-700 placeholder:text-gray-400 p-0"
                  />
                </div>
                
                {matchedIds.length > 0 && (
                  <div className="flex items-center gap-1 border-l border-gray-200 pl-2 ml-1">
                    <span className="text-xs text-gray-500 font-mono">
                      {currentMatchIndex + 1}/{matchedIds.length}
                    </span>
                    <button 
                      onClick={prevMatch}
                      className="p-0.5 hover:bg-gray-100 rounded text-gray-600"
                      title="上一个"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button 
                      onClick={nextMatch}
                      className="p-0.5 hover:bg-gray-100 rounded text-gray-600"
                      title="下一个"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Located Layer Overlay */}
            <AnimatePresence>
                {locatedLayer && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 pointer-events-none"
                    >
                        <MapPin size={16} />
                        <span className="text-sm font-medium">已定位图层: {locatedLayer}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Extraction Mode Overlay */}
            <AnimatePresence>
                {isExtractionMode && (
                    <motion.div
                        drag
                        dragConstraints={canvasRef}
                        dragElastic={0}
                        dragMomentum={false}
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="absolute top-4 left-1/2 bg-white border border-brand-200 shadow-xl rounded-lg z-50 p-3 min-w-[300px] cursor-move"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent canvas click when dragging
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-900 pointer-events-none">图层提取中...</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmExtraction();
                                    }}
                                    className="px-2 py-1 bg-brand-600 text-white text-xs rounded hover:bg-brand-700 pointer-events-auto"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    确定添加
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRequestExitExtraction();
                                    }}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 pointer-events-auto"
                                    onPointerDown={(e) => e.stopPropagation()}
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2 pointer-events-none">已选中 {selectedExtractionLayers.length} 个图层</div>
                        <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
                            {selectedExtractionLayers.map((layer, index) => (
                                <span key={`${layer}-${index}`} className="flex items-center gap-1 bg-white text-gray-700 px-1.5 py-0.5 rounded text-[10px] border border-gray-200 cursor-default">
                                    {layer}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveExtractionLayer(layer);
                                        }}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                            {selectedExtractionLayers.length === 0 && <span className="text-gray-400 text-xs italic pointer-events-none">点击画布选择图层...</span>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grid Background */}
            <div className="absolute inset-0" style={{ 
              backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} />

            {isSelecting && (
              <div
                className="absolute inset-0 z-20 cursor-crosshair"
                onMouseDown={handleSelectionStart}
                onMouseMove={handleSelectionMove}
                onMouseUp={handleSelectionEnd}
                onMouseLeave={handleSelectionEnd}
              >
                {selectionRect && (
                  <>
                    <div
                      className="absolute border border-brand-400 bg-brand-400/10"
                      style={{
                        left: selectionRect.x,
                        top: selectionRect.y,
                        width: selectionRect.width,
                        height: selectionRect.height
                      }}
                    />
                    {/* Confirmation Buttons */}
                    <div 
                      className="absolute flex gap-1"
                      style={{
                        left: selectionRect.x + selectionRect.width - 60,
                        top: selectionRect.y + selectionRect.height + 4
                      }}
                    >
                      <button
                        onMouseDown={handleSelectionConfirm}
                        className="p-1 bg-brand-600 text-white rounded shadow-sm hover:bg-brand-700 transition-colors"
                        title="确认关联"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onMouseDown={handleSelectionCancel}
                        className="p-1 bg-white text-gray-500 border border-gray-200 rounded shadow-sm hover:text-red-500 hover:border-red-200 transition-colors"
                        title="取消选区"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Mock Drawing Content */}
            <div className="relative z-0 flex flex-col items-center w-full max-w-4xl">
              <div className="w-full h-[500px] flex flex-col items-center justify-center p-8 relative">
                
                {/* SVG Layer for Segments */}
                <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    {mockSegments.map(seg => {
                        const isSelected = selectedSegmentIds.includes(seg.id) || (isMultiSelectMode && selectedMergeLayers.includes(seg.layer));
                        const strokeColor = isSelected ? '#F900F9' : seg.color;
                        
                        if (seg.type === 'line') {
                            return (
                                <line 
                                    key={seg.id}
                                    x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                                    stroke={strokeColor}
                                    strokeWidth={seg.strokeWidth}
                                    className="cursor-pointer pointer-events-auto hover:stroke-brand-400 transition-colors"
                                    onClick={(e) => handleSegmentClick(e, seg.id, seg.layer)}
                                />
                            );
                        } else if (seg.type === 'rect') {
                             return (
                                <rect 
                                    key={seg.id}
                                    x={seg.x} y={seg.y} width={seg.width} height={seg.height}
                                    stroke={strokeColor}
                                    strokeWidth={seg.strokeWidth}
                                    strokeDasharray={seg.dashed ? "4" : undefined}
                                    fill="none"
                                    className="cursor-pointer pointer-events-auto hover:stroke-brand-400 transition-colors"
                                    onClick={(e) => handleSegmentClick(e, seg.id, seg.layer)}
                                />
                            );
                        } else if (seg.type === 'text') {
                             return (
                                <text 
                                    key={seg.id}
                                    x={seg.x} y={seg.y}
                                    fill={strokeColor}
                                    fontSize={seg.fontSize}
                                    className="cursor-pointer pointer-events-auto hover:fill-brand-400 transition-colors select-none"
                                    onClick={(e) => handleSegmentClick(e, seg.id, seg.layer)}
                                >
                                    {seg.text}
                                </text>
                            );
                        }
                        return null;
                    })}
                </svg>

                <div className="absolute top-4 left-4 text-cyan-400 font-mono text-sm font-bold">
                  <HighlightText id="t1" text="1#楼-屋面层-梁" />
                </div>
                
                {/* Abstract CAD shapes */}
                <div className="w-3/4 h-3/4 border border-dashed border-emerald-400 relative">
                  <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-blue-400 flex items-center justify-center">
                    <HighlightText id="t2" text="WKL19(1A) 240x550" className="text-blue-400 font-mono text-xs" />
                  </div>
                  <div className="absolute top-1/2 left-0 w-full h-px bg-red-500/50" />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-red-500/50" />
                  
                  {/* Extra CAD details */}
                  <div className="absolute top-[10%] left-[10%] text-yellow-400 font-mono text-xs">
                    <HighlightText id="t3" text="3Φ14" />
                  </div>
                  <div className="absolute bottom-[10%] right-[10%] text-yellow-400 font-mono text-xs">
                    <HighlightText id="t4" text="3Φ14" />
                  </div>
                  <div className="absolute top-1/2 right-0 w-16 h-16 border border-emerald-500 translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <div className="w-full h-full border border-dashed border-emerald-500/50 rotate-45" />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 border border-cyan-900/50 bg-[#0a0a0a]/80 px-6 py-4 max-w-3xl w-full">
                <h3 className="text-xl font-bold text-white mb-4 font-serif text-center">
                  <HighlightText id="t5" text="机房层梁配筋图" />
                </h3>
                <ul className="text-sm text-emerald-400 text-left space-y-2 font-mono">
                  <li><HighlightText id="t6" text="1. 未注明定位尺寸的梁以轴线居中或与柱边平。" /></li>
                  <li><HighlightText id="t7" text="2. 未注明定位的梁定位见板图;未注明梁顶标高同机房层标高 H。" /></li>
                  <li><HighlightText id="t8" text="3. 主次梁相交处主梁上密箍每侧三根@50，直径及肢数同梁箍筋; 交叉梁相交处密箍每侧三根@50，直径及肢数同梁箍筋。" /></li>
                  <li><HighlightText id="t9" text="4. 当框架梁一端与剪力墙或柱相连，另一端搁置在梁上或墙平面外时，仅与剪力墙或柱连接支座处设置箍筋加密区。" /></li>
                </ul>
              </div>
            </div>
          </>
          )}

          {/* Floating Controls (Bottom Center) */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10">
            <AnimatePresence>
              {isMultiSelectMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-4 text-sm font-medium text-gray-700 h-9"
                >
                  <span className="text-xs leading-none">已选中 {selectedMergeLayers.length} 个图层</span>
                  <button 
                    onClick={() => {
                      if (selectedMergeLayers.length > 1) {
                        // Here you would implement actual merge logic
                        setSelectedMergeLayers([]);
                        setIsMultiSelectMode(false);
                      }
                    }}
                    disabled={selectedMergeLayers.length < 2}
                    className="bg-brand-600 hover:bg-brand-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 border border-transparent text-white px-2.5 py-1 rounded transition-colors text-xs flex items-center justify-center h-6"
                  >
                    合并
                  </button>
                </motion.div>
              )}
              {isEditMode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white border border-gray-200 px-2 py-1.5 rounded-lg shadow-lg flex items-center gap-1 text-sm font-medium text-gray-700 h-9"
                >
                  <button 
                    className="px-2 py-1 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors flex items-center justify-center gap-1.5 h-6"
                    title="复制"
                  >
                    <Copy size={14} />
                    <span className="text-xs leading-none">复制</span>
                  </button>
                  <div className="w-px h-3.5 bg-gray-200 mx-0.5" />
                  <button 
                    className="px-2 py-1 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors flex items-center justify-center gap-1.5 h-6"
                    title="删除"
                  >
                    <Trash2 size={14} />
                    <span className="text-xs leading-none">删除</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex items-center p-1.5 gap-1">
              <button 
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (!isEditMode) {
                    setIsMultiSelectMode(false);
                    setSelectedMergeLayers([]);
                  }
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isEditMode 
                    ? "text-brand-600 bg-brand-50 hover:bg-brand-100" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )} 
                title="编辑"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => {
                  setIsMultiSelectMode(!isMultiSelectMode);
                  if (isMultiSelectMode) {
                    setSelectedMergeLayers([]);
                  } else {
                    setIsEditMode(false);
                  }
                }}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isMultiSelectMode 
                    ? "text-brand-600 bg-brand-50 hover:bg-brand-100" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )} 
                title="多选"
              >
                <CheckSquare size={18} />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="分割">
                <Scissors size={18} />
              </button>
              
              <div className="w-px h-4 bg-gray-200 mx-1" />
              
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="缩小">
                <ZoomOut size={18} />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="适应屏幕">
                <Maximize size={18} />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="放大">
                <ZoomIn size={18} />
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Right Panel (Analysis / Properties) */}
        <div className={cn(
          "border-l border-gray-200 bg-white flex flex-col shrink-0 transition-all duration-300 ease-in-out z-10",
          isRightPanelOpen ? "w-[320px]" : "w-0 border-l-0 overflow-hidden"
        )}>
          <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">分析</h2>
            <button 
              onClick={() => setIsRightPanelOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
              title="收起面板"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">当前构件</h3>
                <button
                  onClick={handleOpen3DEntryDialog}
                  disabled={!isCalculated || isCalculating}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all border flex items-center gap-1.5 shadow-sm",
                    (!isCalculated || isCalculating)
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : is3DMode
                        ? "bg-brand-600 text-white border-brand-600 hover:bg-brand-700"
                        : "bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100"
                  )}
                >
                  <Box size={15} />
                  3D模式
                </button>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <span className="text-base font-bold text-blue-700">1#楼-屋面层-梁</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleCalculate}
                disabled={isCalculating}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  isCalculating 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                    : "bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
                )}
              >
                {isCalculating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    计算中...
                  </>
                ) : (
                  <>
                    <Code2 size={16} />
                    计算
                  </>
                )}
              </button>
              <button 
                onClick={handleExport}
                disabled={!isCalculated || isCalculating}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                  (!isCalculated || isCalculating)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                    : "bg-white text-gray-700 hover:text-brand-600 hover:bg-brand-50 border border-gray-200 shadow-sm"
                )}
              >
                <Download size={16} />
                导出
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="rounded-lg p-2 space-y-2">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white border border-gray-100">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllLayers(!isResultLayersVisible, true);
                      }}
                      className="transition-colors"
                      title={isResultLayersVisible ? "隐藏全部结果" : "显示全部结果"}
                    >
                      <Eye size={14} className={cn(isResultLayersVisible ? "text-brand-600" : "text-gray-400")} />
                    </button>
                    <h3 className="text-sm font-semibold text-gray-900">计算结果图层</h3>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 rounded">{resultLayers.length}</span>
                  </div>
                  <button 
                    onClick={() => setIsResultLayerExpanded(!isResultLayerExpanded)}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                  >
                    {isResultLayerExpanded ? (
                      <>收起 <ChevronDown size={14} /></>
                    ) : (
                      <>展开 <ChevronRight size={14} /></>
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {isResultLayerExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden px-1"
                    >
                      {resultLayers.length > 0 ? (
                        resultLayers.map((layer) => (
                        <div
                            key={layer.id}
                            onClick={() => handleLocateLayer(layer.name)}
                          className="group rounded-md border border-gray-100 bg-white px-2 py-2 cursor-pointer hover:border-gray-200 hover:bg-gray-50"
                            title="点击定位图层"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLayerVisibility(layer.id, true);
                                  }}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  {layer.visible ? <Eye size={14} className="text-brand-600" /> : <Eye size={14} />}
                                </button>
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                                <span className="text-xs font-medium text-gray-700 truncate max-w-[180px]">{layer.name}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                          <Code2 size={32} className="mb-2 opacity-20" />
                          <span className="text-xs">暂无计算结果</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {selected3DId === 'jll9' && is3DMode && (
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">JLL9</h3>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">BEAM</span>
                      <span className="px-2 py-0.5 bg-pink-100 text-pink-600 text-xs font-mono rounded">9</span>
                    </div>
                 </div>
                 
                 <div className="space-y-1 text-xs text-gray-500">
                    <div>区域: BLOCK 1</div>
                    <div>图层: BEAM_CAL</div>
                 </div>

                 <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 cursor-pointer hover:border-brand-200 transition-colors group" onClick={() => setIsPlanContourModalOpen(true)}>
                    <div className="text-xs font-medium text-gray-500 mb-2">平面轮廓</div>
                    <div className="h-24 bg-white border border-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden group-hover:shadow-md transition-shadow">
                        <div className="w-3/4 h-2 bg-brand-600 rounded-full"></div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">宽度 (W)</div>
                        <div className="text-lg font-bold text-gray-900">300 <span className="text-xs font-normal text-gray-500">mm</span></div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">长度 (L)</div>
                        <div className="text-lg font-bold text-gray-900">8000 <span className="text-xs font-normal text-gray-500">mm</span></div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">高度 (H)</div>
                        <div className="text-lg font-bold text-gray-900">600 <span className="text-xs font-normal text-gray-500">mm</span></div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">标高 (E)</div>
                        <div className="text-lg font-bold text-gray-900">-1800 <span className="text-xs font-normal text-gray-500">mm</span></div>
                    </div>
                 </div>

                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1">体积 (V)</div>
                    <div className="text-lg font-bold text-gray-900">1.440 <span className="text-xs font-normal text-gray-500">m³</span></div>
                 </div>

                 <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-xs text-gray-500 mb-1"># 构件 ID</div>
                    <div className="text-sm font-mono font-medium text-gray-900">TOPO-20</div>
                 </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Modals */}
      <AnimatePresence>
        {isBuildingSettingsOpen && currentBuildingNode && (
          <BuildingSettingsModal 
            building={currentBuildingNode}
            isOpen={isBuildingSettingsOpen}
            onClose={() => setIsBuildingSettingsOpen(false)}
            onSave={handleSaveBuildingSettings}
          />
        )}
        {isLinkConfirmOpen && selectedComponent && (
          <LinkConfirmModal
            isOpen={isLinkConfirmOpen}
            componentName={selectedComponent.name}
            layerName={linkLayerName}
            onChangeLayerName={setLinkLayerName}
            layerType={linkLayerType}
            onChangeLayerType={setLinkLayerType}
            onConfirm={handleConfirmLink}
            onCancel={handleCancelLink}
          />
        )}

        <AIRecognitionModal 
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          fileName={currentCadFile?.name || ''}
          onLocateLayer={handleLocateLayer}
        />
        
        {/* Plan Contour Modal */}
        <PlanContourModal
          isOpen={isPlanContourModalOpen}
          onClose={() => setIsPlanContourModalOpen(false)}
          area="2400000 mm²"
          volume="1.440 m³"
          scale="1mm = 1.390px"
        />

        <AnimatePresence>
          {is3DEntryDialogOpen && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-semibold text-sm text-gray-900">选择进入3D模式范围</h3>
                  <button
                    onClick={() => setIs3DEntryDialogOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'building', label: '楼栋' },
                      { key: 'floor', label: '楼层' },
                      { key: 'component', label: '构建' }
                    ].map(option => (
                      <button
                        key={option.key}
                        onClick={() => setThreeDTargetType(option.key as 'building' | 'floor' | 'component')}
                        className={cn(
                          "flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          threeDTargetType === option.key
                            ? "bg-brand-50 text-brand-700 border-brand-200"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">楼栋</label>
                      <select
                        value={threeDBuildingId}
                        onChange={(e) => {
                          const nextBuildingId = e.target.value;
                          const nextBuilding = buildings.find(b => b.id === nextBuildingId) || null;
                          const nextFloors = (nextBuilding?.children || []).filter(node => node.type === 'floor');
                          const nextFloorId = nextFloors[0]?.id || '';
                          const nextFloor = nextFloors.find(f => f.id === nextFloorId) || null;
                          const nextComponents = (nextFloor?.children || []).filter(node => node.type === 'component');
                          setThreeDBuildingId(nextBuildingId);
                          setThreeDFloorId(nextFloorId);
                          setThreeDComponentId(nextComponents[0]?.id || '');
                        }}
                        className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        {buildings.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {(threeDTargetType === 'floor' || threeDTargetType === 'component') && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">楼层</label>
                        <select
                          value={threeDFloorId}
                          onChange={(e) => {
                            const nextFloorId = e.target.value;
                            const nextFloor = threeDFloorOptions.find(f => f.id === nextFloorId) || null;
                            const nextComponents = (nextFloor?.children || []).filter(node => node.type === 'component');
                            setThreeDFloorId(nextFloorId);
                            setThreeDComponentId(nextComponents[0]?.id || '');
                          }}
                          className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                        >
                          {threeDFloorOptions.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {threeDTargetType === 'component' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">构建</label>
                        <select
                          value={threeDComponentId}
                          onChange={(e) => setThreeDComponentId(e.target.value)}
                          className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
                        >
                          {threeDComponentOptions.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setIs3DEntryDialogOpen(false)}
                      className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleConfirmEnter3DMode}
                      className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                      进入3D模式
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Category Modal */}
        <AnimatePresence>
            {isAddCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-sm text-gray-900">新增图层分类</h3>
                            <button onClick={() => setIsAddCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-700">分类名称</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="请输入名称"
                                    autoFocus
                                    className="unt-input w-full text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddCategory();
                                        if (e.key === 'Escape') setIsAddCategoryModalOpen(false);
                                    }}
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button 
                                    onClick={() => setIsAddCategoryModalOpen(false)}
                                    className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleAddCategory}
                                    disabled={!newCategoryName.trim()}
                                    className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    确定
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Exit Extraction Confirm Modal */}
        <AnimatePresence>
            {isExitConfirmOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100"
                    >
                        <div className="p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">确认退出提取？</h3>
                                <p className="text-sm text-gray-500 mt-1">当前已选中的图层将不会被保存。</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button 
                                    onClick={() => setIsExitConfirmOpen(false)}
                                    className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    继续提取
                                </button>
                                <button 
                                    onClick={handleExitExtraction}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                                >
                                    退出如果不保存
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
