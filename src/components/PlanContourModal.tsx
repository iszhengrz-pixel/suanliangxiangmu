import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { cn } from '../utils';

interface PlanContourModalProps {
  isOpen: boolean;
  onClose: () => void;
  area?: string;
  volume?: string;
  scale?: string;
}

export default function PlanContourModal({
  isOpen,
  onClose,
  area = '250000 mm²',
  volume = '0.838 m³',
  scale = '1mm = 1.390px'
}: PlanContourModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--untitled-ui-bg-overlay)]/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden border border-[var(--untitled-ui-border)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--untitled-ui-border)] bg-white">
          <h3 className="text-lg font-semibold text-[var(--untitled-ui-text-primary)]">平面轮廓详情</h3>
          <button
            onClick={onClose}
            className="text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] p-2 rounded-lg hover:bg-[var(--untitled-ui-bg-secondary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Bar */}
        <div className="px-6 py-3 bg-[var(--untitled-ui-bg-secondary)] border-b border-[var(--untitled-ui-border)] flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--untitled-ui-text-secondary)]">面积:</span>
            <span className="text-sm font-medium text-[var(--untitled-ui-text-primary)] font-mono">{area}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--untitled-ui-text-secondary)]">体积:</span>
            <span className="text-sm font-medium text-[var(--untitled-ui-text-primary)] font-mono">{volume}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto border-l border-[var(--untitled-ui-border)] pl-8">
            <span className="text-sm text-[var(--untitled-ui-text-secondary)]">缩放比例:</span>
            <span className="text-sm font-medium text-[var(--untitled-ui-text-primary)] font-mono">{scale}</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[var(--untitled-ui-bg-tertiary)] relative overflow-hidden min-h-[500px] flex items-center justify-center p-8">
          
          {/* Grid Background */}
          <div 
            className="absolute inset-0 opacity-50" 
            style={{ 
              backgroundImage: 'radial-gradient(var(--untitled-ui-border) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />

          {/* Contour Visualization */}
          <div className="relative w-3/4 h-3/4 flex items-center justify-center">
            {/* Measurement Labels */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono text-[var(--untitled-ui-text-secondary)]">300 mm</div>
            <div className="absolute top-1/2 -right-8 -translate-y-1/2 text-xs font-mono text-[var(--untitled-ui-text-secondary)] vertical-rl" style={{ writingMode: 'vertical-rl' }}>8000 mm</div>

            {/* The Shape */}
            <div className="w-full h-full border-2 border-[var(--untitled-ui-brand)] bg-[var(--untitled-ui-brand-secondary)]/10 shadow-lg relative flex items-center justify-center">
                <div className="w-full h-full bg-[var(--untitled-ui-brand)]/5"></div>
                
                {/* Center Crosshair */}
                <div className="absolute w-4 h-4 border-l border-t border-[var(--untitled-ui-brand)]/30 top-0 left-0"></div>
                <div className="absolute w-4 h-4 border-r border-t border-[var(--untitled-ui-brand)]/30 top-0 right-0"></div>
                <div className="absolute w-4 h-4 border-l border-b border-[var(--untitled-ui-brand)]/30 bottom-0 left-0"></div>
                <div className="absolute w-4 h-4 border-r border-b border-[var(--untitled-ui-brand)]/30 bottom-0 right-0"></div>
            </div>
            
             {/* Dimension Lines */}
             <div className="absolute -top-2 left-0 w-full border-t border-[var(--untitled-ui-text-tertiary)]">
                <div className="absolute -top-1 left-0 h-2 border-l border-[var(--untitled-ui-text-tertiary)]"></div>
                <div className="absolute -top-1 right-0 h-2 border-l border-[var(--untitled-ui-text-tertiary)]"></div>
             </div>
             <div className="absolute top-0 -right-4 h-full border-r border-[var(--untitled-ui-text-tertiary)]">
                <div className="absolute top-0 -right-1 w-2 border-t border-[var(--untitled-ui-text-tertiary)]"></div>
                <div className="absolute bottom-0 -right-1 w-2 border-t border-[var(--untitled-ui-text-tertiary)]"></div>
             </div>
          </div>

          {/* Controls Overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border border-[var(--untitled-ui-border)] rounded-xl shadow-sm flex items-center p-1.5 gap-1">
            <button className="p-2 text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] rounded-lg transition-colors" title="移动">
              <Move size={18} />
            </button>
            <div className="w-px h-4 bg-[var(--untitled-ui-border)] mx-1" />
            <button className="p-2 text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] rounded-lg transition-colors" title="缩小">
              <ZoomOut size={18} />
            </button>
            <div className="w-px h-4 bg-[var(--untitled-ui-border)] mx-1" />
            <button className="p-2 text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] rounded-lg transition-colors" title="适应屏幕">
              <Maximize size={18} />
            </button>
            <div className="w-px h-4 bg-[var(--untitled-ui-border)] mx-1" />
            <button className="p-2 text-[var(--untitled-ui-text-secondary)] hover:text-[var(--untitled-ui-text-primary)] hover:bg-[var(--untitled-ui-bg-secondary)] rounded-lg transition-colors" title="放大">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
