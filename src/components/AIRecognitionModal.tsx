import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  Play, 
  FileCode2, 
  Layers, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MapPin,
  Search,
  Trash2,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface AIRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onLocateLayer: (layerName: string) => void;
}

type StepStatus = 'pending' | 'processing' | 'completed';

interface AnalysisResult {
  id: string;
  name: string;
  type: string; // e.g., '图框', '轴线'
  confidence: number;
  status: 'confirmed' | 'uncertain';
}

export default function AIRecognitionModal({ 
  isOpen, 
  onClose, 
  fileName,
  onLocateLayer 
}: AIRecognitionModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedUncertainItems, setSelectedUncertainItems] = useState<string[]>([]);

  const steps = [
    { label: '初始化', status: 'pending' },
    { label: '定位信息', status: 'pending' },
    { label: '结构信息', status: 'pending' },
    { label: '标注信息', status: 'pending' },
    { label: '保存', status: 'pending' },
  ];

  // Mock Analysis Process
  const startAnalysis = () => {
    setIsAnalyzing(true);
    setCurrentStep(0);
    setResults([]);
    setShowConfirmation(false);

    // Mock data queue to be streamed
    const mockDataQueue: AnalysisResult[] = [
      { id: '1', name: '图框', type: '图框', confidence: 100, status: 'confirmed' },
      { id: '2', name: 'DOTE', type: '轴线', confidence: 98, status: 'confirmed' },
      { id: '3', name: 'AXIS', type: '轴线标注', confidence: 98, status: 'confirmed' },
      { id: '4', name: 'AXIS_TEXT', type: '轴线标注', confidence: 97, status: 'confirmed' },
      { id: '5', name: 'HOLE', type: '板洞', confidence: 79, status: 'uncertain' },
      { id: '6', name: 'WALL_HATCH', type: '墙填充', confidence: 65, status: 'confirmed' },
      { id: '7', name: 'UNKNOWN_LINE', type: '未知线', confidence: 45, status: 'uncertain' },
    ];

    let step = 0;
    let dataIndex = 0;

    // Interval for updating steps and streaming data
    const interval = setInterval(() => {
      // Update step progress roughly every 800ms
      if (step < 4) {
        step += 0.25; // Slower step progression
        setCurrentStep(Math.floor(step));
      }

      // Stream data items one by one
      if (dataIndex < mockDataQueue.length) {
        const newItem = mockDataQueue[dataIndex];
        setResults(prev => [...prev, newItem]);
        dataIndex++;
        
        // Auto-locate the new item (optional feature, can be noisy)
        // onLocateLayer(newItem.name);
      }

      // Completion check
      if (step >= 4 && dataIndex >= mockDataQueue.length) {
        clearInterval(interval);
        setIsAnalyzing(false);
        // Show confirmation if there are uncertain items
        if (mockDataQueue.some(item => item.status === 'uncertain')) {
          setShowConfirmation(true);
        } else {
          setCurrentStep(5); // Go directly to save if all confirmed
        }
      }
    }, 800);
  };

  const handleConfirmUncertain = () => {
    // Confirm selected items
    setResults(prev => prev.map(item => 
      selectedUncertainItems.includes(item.id) 
        ? { ...item, status: 'confirmed' } 
        : item
    ));
    setSelectedUncertainItems([]);
    setShowConfirmation(false);
    setCurrentStep(5); // Move to 'Save' / Complete
  };

  const uncertainItems = results.filter(r => r.status === 'uncertain');
  const confirmedItems = results.filter(r => r.status === 'confirmed');
  
  // Group confirmed items by type for display
  const groupedResults = confirmedItems.reduce((acc, item) => {
    const groupName = item.type; // Or map type to display name if needed
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, AnalysisResult[]>);

  const getConfidenceStyle = (confidence: number) => {
    if (confidence >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  // Reset when closed or opened
  useEffect(() => {
    if (isOpen) {
        // Optional: Auto start or wait for user? 
        // User asked for "Start Recognition" button, so we wait.
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Use pointer-events-none on the container so clicks pass through to the canvas below
    <div className="fixed inset-0 z-50 pointer-events-none">
      <motion.div 
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95, x: 0, y: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        // Re-enable pointer events for the modal content
        className="pointer-events-auto bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] absolute top-20 right-20 cursor-move"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">AI识别</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content - stop propagation to prevent dragging when interacting with content */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 cursor-default"
          onPointerDown={(e) => e.stopPropagation()}
        >
          
          {/* Top Control Bar */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <FileCode2 size={20} />
              </div>
              <div className="font-medium text-gray-900 truncate max-w-[200px] sm:max-w-xs" title={fileName}>
                {fileName || '未选择文件'}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm",
                  isAnalyzing 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-brand-600 text-white hover:bg-brand-700 shadow-brand-200"
                )}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    识别中...
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" />
                    开始识别
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  setResults([]);
                  setCurrentStep(0);
                  setShowConfirmation(false);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="重置"
              >
                <RotateCw size={18} />
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative flex items-center justify-between px-4">
            
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              
              return (
                <div key={idx} className="flex flex-col items-center gap-2 px-2 flex-1 relative z-10">
                  {/* Progress Line to Next Step */}
                  {idx < steps.length - 1 && (
                    <div className="absolute top-4 left-[50%] w-full h-0.5 -z-10">
                      {/* Background Gray Line */}
                      <div className="absolute inset-0 bg-gray-100" />
                      
                      {/* Active Progress Line */}
                      <div 
                        className="h-full bg-brand-500 transition-all duration-500 ease-out relative z-10"
                        style={{ 
                          width: isCompleted ? '100%' : '0%' 
                        }}
                      />
                    </div>
                  )}

                  <div className="relative flex items-center justify-center bg-white">
                    {/* Outer Spinner Ring for Active Step */}
                    {isCurrent && isAnalyzing && (
                      <div className="absolute inset-0 -m-1.5 border-2 border-brand-200 border-t-brand-600 rounded-full w-11 h-11 animate-spin" />
                    )}
                    
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 z-10",
                      isCompleted ? "bg-brand-500 border-brand-500 text-white" : 
                      isCurrent ? "bg-brand-50 border-brand-500 text-brand-600" : 
                      "bg-white border-gray-200 text-gray-300"
                    )}>
                      {isCompleted ? <Check size={14} strokeWidth={3} /> : idx + 1}
                    </div>
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isCompleted || isCurrent ? "text-gray-700" : "text-gray-400"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Results / Confirmation Area */}
          <div className="space-y-6">
            <AnimatePresence>
              {showConfirmation && uncertainItems.length > 0 && (
                <motion.div 
                  key="confirmation"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border border-orange-200 rounded-xl overflow-hidden"
                >
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-orange-800">需要人工确认</h3>
                  </div>
                  
                  <div className="divide-y divide-orange-100">
                    {uncertainItems.map(item => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-4 hover:bg-orange-50/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (selectedUncertainItems.includes(item.id)) {
                            setSelectedUncertainItems(prev => prev.filter(id => id !== item.id));
                          } else {
                            setSelectedUncertainItems(prev => [...prev, item.id]);
                          }
                          onLocateLayer(item.name);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                            selectedUncertainItems.includes(item.id) 
                              ? "bg-orange-500 border-orange-500 text-white" 
                              : "border-gray-300 group-hover:border-orange-400 bg-white"
                          )}>
                            {selectedUncertainItems.includes(item.id) && <Check size={14} />}
                          </div>
                          <span className="font-mono text-sm text-gray-900">{item.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 border border-gray-200">
                            {item.type}
                          </span>
                          <span className={cn(
                            "text-[10px] px-1 py-0.5 rounded border scale-90 origin-left",
                            getConfidenceStyle(item.confidence)
                          )}>
                            置信度 {item.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3 p-4 bg-gray-50/50 border-t border-orange-100">
                    <button 
                      onClick={() => setSelectedUncertainItems([])}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      清除选择
                    </button>
                    <button 
                      onClick={handleConfirmUncertain}
                      className="px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                    >
                      确认 ({selectedUncertainItems.length})
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grouped Results Display */}
            {confirmedItems.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                   <h3 className="text-sm font-semibold text-gray-900">图层分析结果</h3>
                   <span className="text-xs text-gray-500">{confirmedItems.length} 个结果</span>
                </div>

                <div className="space-y-6">
                  {(Object.entries(groupedResults) as [string, AnalysisResult[]][]).map(([type, items]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm text-gray-500 font-medium">{type}</h4>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="text-gray-400 hover:text-gray-600"><Search size={14}/></button>
                           <button className="text-gray-400 hover:text-gray-600"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 min-h-[44px]">
                        {items.map(item => (
                          <div 
                            key={item.id}
                            className="group flex items-center gap-1.5 pl-2 pr-1.5 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700 hover:border-brand-300 transition-all cursor-pointer"
                            onClick={() => onLocateLayer(item.name)}
                          >
                            <span className="font-mono font-medium">{item.name}</span>
                            <span className={cn(
                              "text-[10px] px-1 py-0.5 rounded border scale-90 origin-left",
                              getConfidenceStyle(item.confidence)
                            )}>
                              置信度 {item.confidence}%
                            </span>
                            
                            <button 
                              className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50 ml-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete/remove logic here
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {items.length === 0 && <div className="text-xs text-gray-400 px-2 py-1">暂无图层</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
