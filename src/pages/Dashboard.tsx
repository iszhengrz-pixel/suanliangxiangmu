import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  FileText, 
  Upload, 
  Trash2,
  Building2,
  FileCode2,
  LayoutGrid,
  Database,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Edit3,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Project, DxfFile } from '../types';

const platformLogoUrl = '/platform-logo.png';

const StatCard = ({ title, value, subtitle, icon: Icon }: { title: string, value: string, subtitle: string, icon: any }) => (
  <div className="unt-card p-6 flex items-center gap-4 flex-1 min-w-[280px]">
    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 border border-brand-100 shrink-0">
      <Icon size={24} />
    </div>
    <div className="space-y-0.5">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</span>
        <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
      </div>
    </div>
  </div>
);

const ProjectListItem: React.FC<{ 
  project: Project; 
  index: number;
  onDxfClick: (p: Project) => void;
  onBuildingsClick: (p: Project) => void;
  onEditClick: (p: Project) => void;
}> = ({ project, index, onDxfClick, onBuildingsClick, onEditClick }) => {
  const typeColors = {
    '电气': 'bg-orange-50 text-orange-700 border-orange-200',
    '景观': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '结构': 'bg-brand-50 text-brand-700 border-brand-200',
  };

  const maxTags = 3;
  const displayedBuildings = project.buildings.slice(0, maxTags);
  const remainingCount = project.buildings.length - maxTags;

  return (
    <div className={cn(
      "w-full border-b border-gray-200 transition-all duration-200 hover:bg-gray-50 group",
      "bg-white"
    )}>
      <div className="px-8 py-4 grid grid-cols-[280px_120px_120px_1fr_180px_160px] gap-6 items-center">
        {/* Project Info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 group/title cursor-pointer" onClick={() => onEditClick(project)}>
            <span className="text-sm font-semibold text-gray-900 group-hover/title:text-brand-700 transition-colors">
              项目 {project.number}
            </span>
            <ChevronRight size={14} className="text-gray-400 opacity-0 group-hover/title:opacity-100 transition-all -translate-x-1 group-hover/title:translate-x-0" />
          </div>
          <span className="text-xs font-medium text-gray-500 font-mono">
            ID: {project.id}
          </span>
        </div>

        {/* Type */}
        <div className="flex items-center">
          <span className={cn("unt-badge", typeColors[project.type])}>
            {project.type}
          </span>
        </div>

        {/* DXF Files Count */}
        <div 
          onClick={() => onDxfClick(project)}
          className="text-sm text-gray-600 font-medium cursor-pointer hover:text-brand-700 hover:underline underline-offset-4 transition-colors"
        >
          {project.files.length} 个文件
        </div>

        {/* Buildings Tags */}
        <div 
          onClick={() => onBuildingsClick(project)}
          className="flex items-center gap-2 overflow-hidden cursor-pointer group/tags"
        >
          {project.buildings.length > 0 ? (
            <>
              {displayedBuildings.map((b, i) => (
                <span 
                  key={i} 
                  className="unt-badge bg-brand-50 text-brand-700 border-brand-200 whitespace-nowrap group-hover/tags:border-brand-300 transition-colors"
                >
                  {b}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="unt-badge bg-gray-100 text-gray-600 border-transparent px-2.5 group-hover/tags:bg-gray-200 transition-colors">
                  +{remainingCount}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400 italic group-hover/tags:text-gray-500 transition-colors">暂无信息</span>
          )}
        </div>

        {/* Created At */}
        <div className="text-sm text-gray-500 font-medium">
          {project.createdAt}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => onEditClick(project)}
            className="p-2 text-gray-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-all" 
            title="编辑项目"
          >
            <Edit3 size={18} />
          </button>
          <button className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="删除">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部类型');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedProjectForDxf, setSelectedProjectForDxf] = useState<Project | null>(null);
  const [selectedProjectForBuildings, setSelectedProjectForBuildings] = useState<Project | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState('结构');
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allProjects: Project[] = [
    {
      id: '3',
      number: '3',
      type: '电气',
      createdAt: '2026/2/24 05:58:57',
      dxfCount: 0,
      buildingCount: 0,
      image: 'https://picsum.photos/seed/elec/800/400',
      files: [],
      buildings: []
    },
    {
      id: '2',
      number: '2',
      type: '景观',
      createdAt: '2026/2/24 05:58:49',
      dxfCount: 0,
      buildingCount: 0,
      image: 'https://picsum.photos/seed/land/800/400',
      files: [],
      buildings: []
    },
    {
      id: '1',
      number: '1',
      type: '结构',
      createdAt: '2026/2/24 05:54:58',
      dxfCount: 2,
      buildingCount: 5,
      image: 'https://picsum.photos/seed/struc/800/400',
      files: [
        { id: 'F001', name: '配筋简图_修改.dxf', date: '2026/2/24 06:09:41', status: 'READY' },
        { id: 'F002', name: '底层平面图_初稿.dxf', date: '2026/2/25 00:05:12', status: 'PROCESSING', progress: 45 }
      ],
      buildings: ['1', '3', '1#楼', '2#楼', '5#楼']
    }
  ];

  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      const matchesSearch = p.number.includes(searchQuery) || p.id.includes(searchQuery);
      const matchesType = typeFilter === '全部类型' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = () => {
    console.log('新建项目:', { name: newProjectName, type: newProjectType });
    setIsCreateModalOpen(false);
    setNewProjectName('');
  };

  const handleEditProject = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: '#F9FAFD',
        backgroundImage: 'url(/home-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Header */}
      <header className="h-18 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-white flex items-center justify-center px-1">
            <img src={platformLogoUrl} alt="AI算量系统" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 tracking-tight">AI算量系统</span>
            <span className="text-xs text-gray-500 font-medium">建筑数字化后台</span>
          </div>
        </div>

        <div className="flex items-center gap-3 relative" ref={userMenuRef}>
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 p-1 pr-3 hover:bg-gray-50 rounded-lg transition-all border border-transparent hover:border-gray-200"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 border border-brand-200">
              <User size={18} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold text-gray-900">Admin User</span>
              <span className="text-[10px] text-gray-500 font-medium">ID: 882910</span>
            </div>
            <ChevronDown size={14} className={cn("text-gray-400 transition-transform", isUserMenuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden"
              >
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                    <User size={16} />
                    个人资料
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={16} />
                    退出登录
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-8 max-w-[1440px] mx-auto w-full space-y-8">
        {/* Stats Row */}
        <div className="flex flex-wrap gap-6">
          <StatCard title="活跃项目" value="3" subtitle="本月新增 1 个" icon={LayoutGrid} />
          <StatCard title="DXF 文件" value="1" subtitle="总文件数" icon={FileCode2} />
          <StatCard title="解析队列" value="-" subtitle="暂无进行中任务" icon={RefreshCw} />
          <StatCard title="存储空间" value="--" subtitle="后端未返回容量" icon={Database} />
        </div>

        {/* Table Section */}
        <div className="unt-card overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-200 bg-white flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">项目列表</h2>
                <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-2xl border border-brand-200">
                  {filteredProjects.length} 个项目
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm group">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="搜索项目名称或ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="unt-input pl-10 py-2 text-sm w-full"
                  />
                </div>

                <div className="relative w-40">
                  <select 
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="unt-input py-2 text-sm w-full appearance-none pr-9 cursor-pointer font-medium text-gray-700"
                  >
                    <option value="全部类型">全部类型</option>
                    <option value="电气">电气</option>
                    <option value="景观">景观</option>
                    <option value="结构">结构</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <button 
                onClick={handleCreateProject}
                className="unt-button-primary py-2 px-3.5 text-sm flex items-center gap-2"
              >
                <Plus size={18} />
                新建项目
              </button>
            </div>
          </div>

          <div className="unt-table-container">
            <div className="min-w-[1000px]">
              {/* Table Header */}
              <div className="px-8 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-[280px_120px_120px_1fr_180px_160px] gap-6">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">项目名称/编号</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">项目类型</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">DXF 文件</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">楼栋与楼层</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">创建时间</span>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">操作</div>
              </div>

              {/* Table Body */}
              <div className="flex flex-col min-h-[200px]">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((project, index) => (
                    <ProjectListItem 
                      key={project.id} 
                      project={project} 
                      index={index}
                      onDxfClick={setSelectedProjectForDxf}
                      onBuildingsClick={setSelectedProjectForBuildings}
                      onEditClick={handleEditProject}
                    />
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-500">
                    <Search size={40} className="text-gray-200 mb-3" />
                    <p className="text-sm font-medium">未找到匹配的项目</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table Pagination */}
          <div className="px-8 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
            <button className="unt-button-secondary py-2 text-sm">上一页</button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, '...', 8, 9, 10].map((page, i) => (
                <button 
                  key={i}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-semibold transition-all",
                    page === 1 ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button className="unt-button-secondary py-2 text-sm">下一页</button>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">新建项目</h3>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-normal text-gray-700">项目名称</label>
                  <input 
                    type="text" 
                    placeholder="请输入项目名称"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="unt-input w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-normal text-gray-700">项目类型</label>
                  <div className="relative">
                    <select 
                      value={newProjectType}
                      onChange={(e) => setNewProjectType(e.target.value as any)}
                      className="unt-input w-full appearance-none pr-10 cursor-pointer font-medium text-gray-700"
                    >
                      <option value="结构">结构</option>
                      <option value="景观">景观</option>
                      <option value="电气">电气</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="unt-button-secondary px-4 py-2 font-normal text-sm"
                >
                  取消
                </button>
                <button 
                  onClick={handleConfirmCreate}
                  className="unt-button-primary px-4 py-2 font-normal text-sm"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DXF Files Modal */}
      <AnimatePresence>
        {selectedProjectForDxf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProjectForDxf(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">DXF 文件</h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    项目 {selectedProjectForDxf.number}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedProjectForDxf(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {selectedProjectForDxf.files.length > 0 ? (
                  <div className="space-y-4">
                    {selectedProjectForDxf.files.map((file) => (
                      <div key={file.id} className="unt-card p-4 flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                              file.status === 'READY' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-brand-50 text-brand-600 border-brand-100"
                            )}>
                              {file.status === 'READY' ? <FileText size={20} /> : <RefreshCw size={20} className="animate-spin" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900">{file.name}</span>
                              <span className="text-xs text-gray-500 font-mono">ID: {file.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-gray-500 font-medium">{file.date}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                {file.status === 'READY' ? (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                    <CheckCircle2 size={10} />
                                    已就绪
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                                    <Clock size={10} />
                                    处理中
                                  </span>
                                )}
                              </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        {file.status === 'PROCESSING' && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              <span>解析进度</span>
                              <span>{file.progress}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                className="h-full bg-brand-600 rounded-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                    <FileCode2 size={48} className="text-gray-200 mb-3" />
                    <p className="text-sm font-medium">暂无 DXF 文件</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button 
                  className="unt-button-secondary px-4 py-2 font-normal text-sm flex items-center gap-2"
                >
                  <Upload size={16} />
                  上传 CAD
                </button>
                <button 
                  onClick={() => setSelectedProjectForDxf(null)}
                  className="unt-button-primary px-6 py-2 font-normal text-sm"
                >
                  完成
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Buildings Modal */}
      <AnimatePresence>
        {selectedProjectForBuildings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProjectForBuildings(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">楼栋与楼层</h3>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    项目 {selectedProjectForBuildings.number}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedProjectForBuildings(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                {selectedProjectForBuildings.buildings.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedProjectForBuildings.buildings.map((building, i) => (
                      <span 
                        key={i} 
                        className="unt-badge bg-brand-50 text-brand-700 border-brand-200 px-3 py-1 text-sm"
                      >
                        {building}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-500">
                    <Building2 size={48} className="text-gray-200 mb-3" />
                    <p className="text-sm font-medium">暂无楼栋与楼层信息</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 flex items-center justify-end">
                <button 
                  onClick={() => setSelectedProjectForBuildings(null)}
                  className="unt-button-primary px-6 py-2 font-normal text-sm"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
