import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, Save, Plus, Minus, Settings2, X } from 'lucide-react';
import { cn } from '../utils';

// Editable cell component
const EditableCell = ({ value, align = 'center', className }: { value: string, align?: 'center' | 'left' | 'right', className?: string, key?: React.Key }) => {
  const [val, setVal] = useState(value);
  return (
    <td className={cn(
      "border border-[var(--untitled-ui-border)] p-0 m-0 overflow-hidden relative",
      className
    )}>
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className={cn(
          "w-full h-full min-h-[32px] px-2 py-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500",
          align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
        )}
      />
    </td>
  );
};

const HeaderCell = ({ children, rowSpan, colSpan, className, onClick }: any) => (
  <th
    rowSpan={rowSpan}
    colSpan={colSpan}
    onClick={onClick}
    className={cn(
      "border border-[var(--untitled-ui-border)] px-2 py-2 bg-[var(--untitled-ui-bg-secondary)] font-medium text-[var(--untitled-ui-text-primary)] text-center align-middle min-w-[48px]",
      className
    )}
  >
    {children}
  </th>
);

const tabs = [
  { id: 'summary', name: '现浇混凝土构件汇总表' },
  { id: 'column', name: '钢筋混凝土柱' },
  { id: 'gz', name: '构造柱' },
  { id: 'wall', name: '地下室外墙' },
];

const DraggableModal = ({ isOpen, onClose, title, children }: any) => {
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPos({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 200 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      setPos({
        x: e.pageX - rel.x,
        y: e.pageY - rel.y
      });
    };
    const handleMouseUp = () => {
      setDragging(false);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, rel]);

  if (!isOpen) return null;

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLButtonElement || e.target instanceof SVGElement || (e.target as Element).closest('button')) {
      return;
    }
    setDragging(true);
    setRel({
      x: e.pageX - pos.x,
      y: e.pageY - pos.y
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-transparent" onClick={(e) => { e.stopPropagation(); }} />
      <div 
        ref={modalRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-[var(--untitled-ui-border)] w-[480px] flex flex-col overflow-hidden"
        style={{ left: pos.x, top: pos.y }}
      >
        <div 
          className="bg-gray-50 px-4 py-3 border-b border-[var(--untitled-ui-border)] flex justify-between items-center cursor-move select-none"
          onMouseDown={onMouseDown}
        >
          <span className="font-medium text-sm text-[var(--untitled-ui-text-primary)]">{title}</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 transition-colors p-1 rounded-md hover:bg-gray-200">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
};

export default function ExportPreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('summary');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    column: true, column_rc: true, column_gz: true,
    wall: true, wall_bs: true, wall_rc: true,
    beam: true, beam_jc: true, beam_rc: true,
  });
  const toggleExp = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }));
  const isExp = (k: string) => expanded[k];

  const [columnExpanded, setColumnExpanded] = useState<Record<string, boolean>>({
    c30: true,
    c35: true
  });
  const toggleColumnExp = (id: string) => setColumnExpanded(p => ({ ...p, [id]: !p[id] }));

  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [colVis, setColVis] = useState<Record<string, Record<string, boolean>>>({
    column: { bldg: true, floor: true, name: true, w: true, l: true, vol: true, tmpl: true, extraTmpl: true, scaffold: true },
    gz: { bldg: true, floor: true, name: true, w: true, l: true, myc: true, vol: true, tmpl: true, extraTmpl: true, scaffold: true },
    wall: { bldg: true, floor: true, name: true, mat: true, thick: true, len: true, height: true, area: true, vol: true }
  });

  const toggleCol = (tab: string, col: string) => {
    setColVis(p => ({
      ...p,
      [tab]: { ...p[tab], [col]: !p[tab][col] }
    }));
  };

  const colDefs: Record<string, { id: string, name: string }[]> = {
    column: [
      { id: 'bldg', name: '楼栋' }, { id: 'floor', name: '楼层' }, { id: 'name', name: '名称' },
      { id: 'w', name: '宽(W)(mm)' }, { id: 'l', name: '长(L)(mm)' }, { id: 'vol', name: '体积(m³)' },
      { id: 'tmpl', name: '模板面积(m²)' }, { id: 'extraTmpl', name: '超高模板面积(m²)' }, { id: 'scaffold', name: '脚手架面积(m²)' }
    ],
    gz: [
      { id: 'bldg', name: '楼栋' }, { id: 'floor', name: '楼层' }, { id: 'name', name: '名称' },
      { id: 'w', name: '宽(W)(mm)' }, { id: 'l', name: '长(L)(mm)' }, { id: 'myc', name: '马牙槎宽度(mm)' },
      { id: 'vol', name: '体积(m³)' }, { id: 'tmpl', name: '模板面积(m²)' }, { id: 'extraTmpl', name: '超高模板面积(m²)' }, { id: 'scaffold', name: '脚手架面积(m²)' }
    ],
    wall: [
      { id: 'bldg', name: '楼栋' }, { id: 'floor', name: '楼层' }, { id: 'name', name: '名称' },
      { id: 'mat', name: '材质' }, { id: 'thick', name: '厚度' }, { id: 'len', name: '长度' },
      { id: 'height', name: '高度' }, { id: 'area', name: '面积' }, { id: 'vol', name: '体积' }
    ]
  };

  const columnData = [
    {
      id: 'c30',
      name: '钢筋混凝土柱-C30',
      vol: '335',
      buildings: [
        {
          name: '地下室',
          floors: [
            {
              name: '-1F',
              items: [
                { name: 'KZ21', w: '200', l: '350', vol: '40.00' },
                { name: 'KZ22', w: '240', l: '250', vol: '35.00' },
                { name: 'KZ32', w: '250', l: '500', vol: '30.00' },
              ]
            }
          ],
          subtotal: '105'
        },
        {
          name: '1#',
          floors: [
            {
              name: '1F',
              items: [
                { name: 'KZ1', w: '200', l: '350', vol: '40.00' },
                { name: 'KZ2', w: '240', l: '500', vol: '35.00' },
                { name: 'KZ3', w: '240', l: '500', vol: '30.00' },
              ]
            },
            {
              name: '2F',
              items: [
                { name: 'KZ5', w: '240', l: '500', vol: '25.00' },
                { name: 'KZ7', w: '240', l: '500', vol: '20.00' },
              ]
            }
          ],
          subtotal: '150'
        },
        {
          name: '2#',
          floors: [
            {
              name: '1F',
              items: [
                { name: 'KZ11', w: '500', l: '600', vol: '14.00' },
                { name: 'KZ22', w: '240', l: '400', vol: '15.00' },
                { name: 'KZ34', w: '300', l: '500', vol: '16.00' },
              ]
            },
            {
              name: '2F',
              items: [
                { name: 'KZ55', w: '250', l: '450', vol: '17.00' },
                { name: 'KZ17', w: '240', l: '500', vol: '18.00' },
              ]
            }
          ],
          subtotal: '80'
        }
      ]
    },
    {
      id: 'c35',
      name: '钢筋混凝土柱-C35',
      vol: '580',
      buildings: [
        {
          name: '地下室',
          floors: [
            {
              name: '-1F',
              items: [
                { name: 'KZ1', w: '200', l: '350', vol: '40.00' },
                { name: 'KZ2', w: '240', l: '250', vol: '35.00' },
                { name: 'KZ3', w: '250', l: '500', vol: '30.00' },
              ]
            }
          ],
          subtotal: '105'
        },
        {
          name: '1#',
          floors: [
            {
              name: '2F',
              items: [
                { name: 'KZ15', w: '200', l: '450', vol: '70.00' },
                { name: 'KZ12', w: '360', l: '500', vol: '71.00' },
                { name: 'KZ53', w: '300', l: '500', vol: '72.00' },
              ]
            },
            {
              name: '3F',
              items: [
                { name: 'KZ57', w: '240', l: '500', vol: '73.00' },
                { name: 'KZ27', w: '240', l: '550', vol: '74.00' },
              ]
            }
          ],
          subtotal: '360'
        },
        {
          name: '2#',
          floors: [
            {
              name: '4F',
              items: [
                { name: 'KZ15', w: '500', l: '600', vol: '21.00' },
                { name: 'KZ22', w: '240', l: '720', vol: '22.00' },
                { name: 'KZ34', w: '600', l: '700', vol: '23.00' },
              ]
            },
            {
              name: '5F',
              items: [
                { name: 'KZ55', w: '300', l: '455', vol: '24.00' },
                { name: 'KZ17', w: '240', l: '500', vol: '25.00' },
              ]
            }
          ],
          subtotal: '115'
        }
      ]
    }
  ];

  const CollapseIcon = ({ expanded }: { expanded: boolean }) => (
    <div className="flex items-center justify-center bg-gray-200 rounded-sm p-[1px] text-gray-600">
      {expanded ? <Minus size={12} /> : <Plus size={12} />}
    </div>
  );

    const renderSummaryTable = () => {
    const rcCols = isExp('column_rc') ? 5 : 1;
    const gzCols = isExp('column_gz') ? 5 : 1;
    const colCols = isExp('column') ? rcCols + gzCols + 4 + 1 : 1;

    const wBsCols = isExp('wall_bs') ? 5 : 1;
    const wRcCols = isExp('wall_rc') ? 5 : 1;
    const wallCols = isExp('wall') ? wBsCols + wRcCols + 4 + 1 : 1;

    const bJcCols = isExp('beam_jc') ? 5 : 1;
    const bRcCols = isExp('beam_rc') ? 5 : 1;
    const beamCols = isExp('beam') ? bJcCols + bRcCols + 4 + 1 : 1;

    const renderDetails = (isSubExp: boolean) => {
      if (!isSubExp) return <HeaderCell className="w-12 break-words">小计</HeaderCell>;
      return (
        <>
          <HeaderCell className="w-12">C30</HeaderCell>
          <HeaderCell className="w-12">C35</HeaderCell>
          <HeaderCell className="w-12">C40</HeaderCell>
          <HeaderCell className="w-12">...</HeaderCell>
          <HeaderCell className="w-12">小计</HeaderCell>
        </>
      );
    };

    const renderGroupHeaders2 = (groupExp: boolean, sub1Key: string, sub1Name: string, sub2Key: string, sub2Name: string, sub1Cols: number, sub2Cols: number) => {
      if (!groupExp) return <HeaderCell rowSpan={2} className="w-20 min-w-[80px] max-w-[80px] break-words">合计</HeaderCell>;
      return (
        <>
          <HeaderCell colSpan={sub1Cols} onClick={() => toggleExp(sub1Key)} className="cursor-pointer hover:bg-gray-200 transition-colors select-none">
            <div className="flex items-center justify-center gap-1 min-w-[72px]">
              <CollapseIcon expanded={isExp(sub1Key)} />
              <span className="line-clamp-2 break-all overflow-hidden leading-tight" style={{ WebkitBoxOrient: 'vertical', display: '-webkit-box' }}>{sub1Name}</span>
            </div>
          </HeaderCell>
          <HeaderCell colSpan={sub2Cols} onClick={() => toggleExp(sub2Key)} className="cursor-pointer hover:bg-gray-200 transition-colors select-none">
            <div className="flex items-center justify-center gap-1 min-w-[72px]">
              <CollapseIcon expanded={isExp(sub2Key)} />
              <span className="line-clamp-2 break-all overflow-hidden leading-tight" style={{ WebkitBoxOrient: 'vertical', display: '-webkit-box' }}>{sub2Name}</span>
            </div>
          </HeaderCell>
          <HeaderCell colSpan={4}>...</HeaderCell>
          <HeaderCell rowSpan={2} className="w-20 min-w-[80px] max-w-[80px]">合计</HeaderCell>
        </>
      );
    };

    const renderGroupHeaders3 = (groupExp: boolean, sub1Key: string, sub2Key: string) => {
      if (!groupExp) return null;
      return (
        <>
          {renderDetails(isExp(sub1Key))}
          {renderDetails(isExp(sub2Key))}
          <HeaderCell className="w-12">...</HeaderCell>
          <HeaderCell className="w-12">...</HeaderCell>
          <HeaderCell className="w-12">...</HeaderCell>
          <HeaderCell className="w-12">...</HeaderCell>
        </>
      );
    };

    const renderDataCells = (groupExp: boolean, sub1Exp: boolean, sub2Exp: boolean, isSubRow: boolean) => {
      const cells = [];
      const cellClass = isSubRow ? "bg-white" : "bg-white";
      const val = isSubRow ? '36' : '9';
      const valSmall = isSubRow ? '4' : '1';
      
      if (!groupExp) {
        cells.push(<EditableCell key="total" value={val} className={cellClass} />);
        return cells;
      }
      
      // sub1
      if (!sub1Exp) {
        cells.push(<EditableCell key="sub1_sub" value={val} className={cellClass} />);
      } else {
        for(let i=0; i<4; i++) cells.push(<EditableCell key={`sub1_${i}`} value={valSmall} className={cellClass} />);
        cells.push(<EditableCell key="sub1_sub" value={val} className={cellClass} />);
      }

      // sub2
      if (!sub2Exp) {
        cells.push(<EditableCell key="sub2_sub" value={val} className={cellClass} />);
      } else {
        for(let i=0; i<4; i++) cells.push(<EditableCell key={`sub2_${i}`} value={valSmall} className={cellClass} />);
        cells.push(<EditableCell key="sub2_sub" value={val} className={cellClass} />);
      }

      // ...
      for(let i=0; i<4; i++) cells.push(<EditableCell key={`rest_${i}`} value={valSmall} className={cellClass} />);
      // 合计
      cells.push(<EditableCell key="total" value={val} className={cellClass} />);

      return cells;
    };

    return (
      <div className="unt-table-container flex-1">
        <table className="w-full text-xs border-collapse min-w-max">
          <thead className="sticky top-0 z-30">
            <tr>
              <HeaderCell rowSpan={3} className="w-12 sticky left-0 z-40 bg-gray-200 outline outline-1 outline-[var(--untitled-ui-border)] -outline-offset-1">序号</HeaderCell>
              <HeaderCell rowSpan={3} className="w-20 sticky left-[48px] z-40 bg-gray-200 outline outline-1 outline-[var(--untitled-ui-border)] -outline-offset-1">单体</HeaderCell>
              <HeaderCell rowSpan={3} className="w-20 sticky left-[128px] z-40 bg-gray-200 outline outline-1 outline-[var(--untitled-ui-border)] -outline-offset-1">楼层</HeaderCell>
              <HeaderCell colSpan={colCols} onClick={() => toggleExp('column')} className="cursor-pointer hover:bg-gray-200 transition-colors select-none">
                <div className="flex items-center justify-center gap-1 min-w-[48px]">
                  <CollapseIcon expanded={isExp('column')} />
                  <span className="line-clamp-2 break-all overflow-hidden leading-tight" style={{ WebkitBoxOrient: 'vertical', display: '-webkit-box' }}>柱</span>
                </div>
              </HeaderCell>
              <HeaderCell colSpan={wallCols} onClick={() => toggleExp('wall')} className="cursor-pointer hover:bg-gray-200 transition-colors select-none">
                <div className="flex items-center justify-center gap-1 min-w-[48px]">
                  <CollapseIcon expanded={isExp('wall')} />
                  <span className="line-clamp-2 break-all overflow-hidden leading-tight" style={{ WebkitBoxOrient: 'vertical', display: '-webkit-box' }}>墙</span>
                </div>
              </HeaderCell>
              <HeaderCell colSpan={beamCols} onClick={() => toggleExp('beam')} className="cursor-pointer hover:bg-gray-200 transition-colors select-none">
                <div className="flex items-center justify-center gap-1 min-w-[48px]">
                  <CollapseIcon expanded={isExp('beam')} />
                  <span className="line-clamp-2 break-all overflow-hidden leading-tight" style={{ WebkitBoxOrient: 'vertical', display: '-webkit-box' }}>梁</span>
                </div>
              </HeaderCell>
            </tr>
            <tr>
              {renderGroupHeaders2(isExp('column'), 'column_rc', '钢筋混凝土柱', 'column_gz', '构造柱', rcCols, gzCols)}
              {renderGroupHeaders2(isExp('wall'), 'wall_bs', '地下室外墙', 'wall_rc', '钢筋混凝土墙', wBsCols, wRcCols)}
              {renderGroupHeaders2(isExp('beam'), 'beam_jc', '基础联系梁', 'beam_rc', '钢筋混凝土梁', bJcCols, bRcCols)}
            </tr>
            <tr>
              {renderGroupHeaders3(isExp('column'), 'column_rc', 'column_gz')}
              {renderGroupHeaders3(isExp('wall'), 'wall_bs', 'wall_rc')}
              {renderGroupHeaders3(isExp('beam'), 'beam_jc', 'beam_rc')}
            </tr>
          </thead>
          <tbody className="bg-white">
            {[
              { id: 1, building: '地下室', floor: '基础层' },
              { id: 2, building: '地下室', floor: '...' },
              { id: 3, building: '地下室', floor: '-2层' },
              { id: 4, building: '地下室', floor: '-1层' },
              { id: 5, building: '小计', floor: '小计', isSub: true },
              { id: 6, building: '1#楼', floor: '1层' },
              { id: 7, building: '1#楼', floor: '2层' },
              { id: 8, building: '1#楼', floor: '3层' },
            ].map((row, idx) => {
              const tdBase = "sticky z-20 outline outline-1 outline-[var(--untitled-ui-border)] -outline-offset-1 " + (row.isSub ? "bg-white" : "bg-white");
              return (
                <tr key={row.id} className={cn("hover:bg-gray-50 transition-colors", row.isSub ? "bg-gray-50" : "")}>
                  <EditableCell value={row.id.toString()} className={tdBase + " left-0"} />
                  {idx === 0 || row.isSub || (row.building !== '地下室' && idx === 5) ? (
                    <EditableCell value={row.building} className={tdBase + " left-[48px] " + (row.isSub ? "" : "align-top")} />
                  ) : (
                    <td className={tdBase + " left-[48px] border-t-0"}></td>
                  )}
                  <EditableCell value={row.floor} className={tdBase + " left-[128px]"} />
                  
                  {renderDataCells(isExp('column'), isExp('column_rc'), isExp('column_gz'), !!row.isSub)}
                  {renderDataCells(isExp('wall'), isExp('wall_bs'), isExp('wall_rc'), !!row.isSub)}
                  {renderDataCells(isExp('beam'), isExp('beam_jc'), isExp('beam_rc'), !!row.isSub)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderColumnTable = () => {
    const v = colVis.column;
    const dataColsCount = [v.w, v.l, v.vol, v.tmpl, v.extraTmpl, v.scaffold].filter(Boolean).length;
    const matColSpan = [v.bldg, v.floor, v.name, v.w, v.l].filter(Boolean).length || 1;
    const subtotalColSpan = [v.floor, v.name, v.w, v.l].filter(Boolean).length || 1;

    return (
      <div className="unt-table-container flex-1">
        <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10">
            <tr>
              {v.bldg && <HeaderCell rowSpan={2} className="w-24">楼栋</HeaderCell>}
              {v.floor && <HeaderCell rowSpan={2} className="w-20">楼层</HeaderCell>}
              {v.name && <HeaderCell rowSpan={2} className="w-24">名称</HeaderCell>}
              {dataColsCount > 0 && <HeaderCell colSpan={dataColsCount} className="py-1">工程量名称</HeaderCell>}
            </tr>
            <tr>
              {v.w && <HeaderCell className="w-24">宽(W)<br/>(mm)</HeaderCell>}
              {v.l && <HeaderCell className="w-24">长(L)<br/>(mm)</HeaderCell>}
              {v.vol && <HeaderCell className="w-24">体积(m³)</HeaderCell>}
              {v.tmpl && <HeaderCell className="w-24 text-red-600">模板面积<br/>(m²)</HeaderCell>}
              {v.extraTmpl && <HeaderCell className="w-24 text-red-600">超高模板<br/>面积(m²)</HeaderCell>}
              {v.scaffold && <HeaderCell className="w-24 text-red-600">脚手架面<br/>积(m²)</HeaderCell>}
            </tr>
          </thead>
          <tbody className="bg-white">
            {columnData.map((mat) => {
              const isExpanded = columnExpanded[mat.id];
              return (
                <React.Fragment key={mat.id}>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={matColSpan} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center relative group">
                      <div className="flex items-center justify-center">
                        <div 
                          className="flex items-center justify-center gap-1 cursor-pointer hover:bg-gray-200 transition-colors px-2 py-1 rounded"
                          onClick={() => toggleColumnExp(mat.id)}
                        >
                          <CollapseIcon expanded={isExpanded} />
                          <span>{mat.name}</span>
                        </div>
                      </div>
                    </td>
                    {v.vol && <EditableCell value={mat.vol} className="font-bold" />}
                    {v.tmpl && <EditableCell value="0" className="font-bold" />}
                    {v.extraTmpl && <EditableCell value="0" className="font-bold" />}
                    {v.scaffold && <EditableCell value="0" className="font-bold" />}
                  </tr>
                  {isExpanded && mat.buildings.map((bldg) => {
                    const bldgItemsCount = bldg.floors.reduce((acc, f) => acc + f.items.length, 0);
                    let bldgItemIndex = 0;
                    
                    return (
                      <React.Fragment key={bldg.name}>
                        {bldg.floors.map((floor, fIdx) => {
                          return floor.items.map((item, iIdx) => {
                            const isFirstOfBldg = bldgItemIndex === 0;
                            const isFirstOfFloor = iIdx === 0;
                            bldgItemIndex++;
                            
                            return (
                              <tr key={`${bldg.name}-${floor.name}-${item.name}-${iIdx}`}>
                                {v.bldg && isFirstOfBldg && (
                                  <td rowSpan={bldgItemsCount + 1} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center align-middle bg-white">
                                    {bldg.name}
                                  </td>
                                )}
                                {v.floor && isFirstOfFloor && (
                                  <td rowSpan={floor.items.length} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center align-middle bg-white">
                                    {floor.name}
                                  </td>
                                )}
                                {v.name && <EditableCell value={item.name} />}
                                {v.w && <EditableCell value={item.w} align="right" />}
                                {v.l && <EditableCell value={item.l} align="right" />}
                                {v.vol && <EditableCell value={item.vol} align="right" />}
                                {v.tmpl && <EditableCell value="..." />}
                                {v.extraTmpl && <EditableCell value="..." />}
                                {v.scaffold && <EditableCell value="..." />}
                              </tr>
                            );
                          });
                        })}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={subtotalColSpan} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center">楼栋合计</td>
                          {v.vol && <EditableCell value={bldg.subtotal} className="font-bold" />}
                          {v.tmpl && <EditableCell value="0" className="font-bold" />}
                          {v.extraTmpl && <EditableCell value="0" className="font-bold" />}
                          {v.scaffold && <EditableCell value="0" className="font-bold" />}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGzTable = () => {
    const v = colVis.gz;
    const matColSpan = [v.bldg, v.floor, v.name, v.w, v.l, v.myc].filter(Boolean).length || 1;
    const subtotalColSpan = [v.bldg, v.floor, v.name, v.w, v.l, v.myc].filter(Boolean).length || 1;

    return (
      <div className="unt-table-container flex-1">
        <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10">
            <tr>
              {v.bldg && <HeaderCell className="w-24">楼栋</HeaderCell>}
              {v.floor && <HeaderCell className="w-20">楼层</HeaderCell>}
              {v.name && <HeaderCell className="w-24">名称</HeaderCell>}
              {v.w && <HeaderCell className="w-24">宽(W)<br/>(mm)</HeaderCell>}
              {v.l && <HeaderCell className="w-24">长(L)<br/>(mm)</HeaderCell>}
              {v.myc && <HeaderCell className="w-24">马牙槎宽<br/>度(mm)</HeaderCell>}
              {v.vol && <HeaderCell className="w-24">体积(m³)</HeaderCell>}
              {v.tmpl && <HeaderCell className="w-24 text-red-600">模板面积<br/>(m²)</HeaderCell>}
              {v.extraTmpl && <HeaderCell className="w-24 text-red-600">超高模板<br/>面积(m²)</HeaderCell>}
              {v.scaffold && <HeaderCell className="w-24 text-red-600">脚手架面<br/>积(m²)</HeaderCell>}
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr className="bg-gray-50 font-bold">
              <td colSpan={matColSpan} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center">构造柱-C35</td>
              {v.vol && <EditableCell value="2060" className="font-bold" />}
              {v.tmpl && <EditableCell value="0" className="font-bold" />}
              {v.extraTmpl && <EditableCell value="0" className="font-bold" />}
              {v.scaffold && <EditableCell value="0" className="font-bold" />}
            </tr>
            <tr>
              {v.bldg && <td rowSpan={2} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center align-top bg-white">1#</td>}
              {v.floor && <td rowSpan={2} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center align-top bg-white">2F</td>}
              {v.name && <EditableCell value="GZ15" />}
              {v.w && <EditableCell value="200" align="right" />}
              {v.l && <EditableCell value="450" align="right" />}
              {v.myc && <EditableCell value="60" align="right" />}
              {v.vol && <EditableCell value="100.00" align="right" />}
              {v.tmpl && <EditableCell value="..." />}
              {v.extraTmpl && <EditableCell value="..." />}
              {v.scaffold && <EditableCell value="..." />}
            </tr>
            <tr>
              {v.name && <EditableCell value="GZ12" />}
              {v.w && <EditableCell value="360" align="right" />}
              {v.l && <EditableCell value="500" align="right" />}
              {v.myc && <EditableCell value="60" align="right" />}
              {v.vol && <EditableCell value="200.00" align="right" />}
              {v.tmpl && <EditableCell value="..." />}
              {v.extraTmpl && <EditableCell value="..." />}
              {v.scaffold && <EditableCell value="..." />}
            </tr>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={subtotalColSpan} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center">合计</td>
              {v.vol && <EditableCell value="2060" className="font-bold" />}
              {v.tmpl && <EditableCell value="0" className="font-bold" />}
              {v.extraTmpl && <EditableCell value="0" className="font-bold" />}
              {v.scaffold && <EditableCell value="0" className="font-bold" />}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderWallTable = () => {
    const v = colVis.wall;
    const matColSpan = [v.bldg, v.floor, v.name, v.mat, v.thick, v.len, v.height].filter(Boolean).length || 1;
    const subtotalColSpan = [v.bldg, v.floor, v.name, v.mat, v.thick, v.len, v.height].filter(Boolean).length || 1;

    return (
      <div className="unt-table-container flex-1">
        <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10">
            <tr>
              {v.bldg && <HeaderCell className="w-24">楼栋</HeaderCell>}
              {v.floor && <HeaderCell className="w-20">楼层</HeaderCell>}
              {v.name && <HeaderCell className="w-24">名称</HeaderCell>}
              {v.mat && <HeaderCell className="w-24">材质</HeaderCell>}
              {v.thick && <HeaderCell className="w-24">厚度</HeaderCell>}
              {v.len && <HeaderCell className="w-24">长度</HeaderCell>}
              {v.height && <HeaderCell className="w-24">高度</HeaderCell>}
              {v.area && <HeaderCell className="w-24 text-red-600">面积</HeaderCell>}
              {v.vol && <HeaderCell className="w-24 text-red-600">体积</HeaderCell>}
            </tr>
          </thead>
          <tbody className="bg-white">
            <tr className="bg-gray-50 font-bold">
              <td colSpan={matColSpan} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center">地下室外墙</td>
              {v.area && <EditableCell value="1650" className="font-bold" />}
              {v.vol && <EditableCell value="0" className="font-bold" />}
            </tr>
            <tr>
              {v.bldg && <td rowSpan={2} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center align-top bg-white">1#</td>}
              {v.floor && <td rowSpan={2} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center align-top bg-white">2F</td>}
              {v.name && <EditableCell value="WQ1" />}
              {v.mat && <EditableCell value="C30" align="center" />}
              {v.thick && <EditableCell value="200" align="right" />}
              {v.len && <EditableCell value="3500" align="right" />}
              {v.height && <EditableCell value="3000" align="right" />}
              {v.area && <EditableCell value="..." />}
              {v.vol && <EditableCell value="..." />}
            </tr>
            <tr>
              {v.name && <EditableCell value="WQ2" />}
              {v.mat && <EditableCell value="C30" align="center" />}
              {v.thick && <EditableCell value="200" align="right" />}
              {v.len && <EditableCell value="3500" align="right" />}
              {v.height && <EditableCell value="3000" align="right" />}
              {v.area && <EditableCell value="..." />}
              {v.vol && <EditableCell value="..." />}
            </tr>
            <tr className="bg-gray-50 font-bold">
              <td colSpan={subtotalColSpan} className="border border-[var(--untitled-ui-border)] px-3 py-2 text-center">合计</td>
              {v.area && <EditableCell value="1650" className="font-bold" />}
              {v.vol && <EditableCell value="0" className="font-bold" />}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'summary': return renderSummaryTable();
      case 'column': return renderColumnTable();
      case 'gz': return renderGzTable();
      case 'wall': return renderWallTable();
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
            <FileSpreadsheet size={48} className="text-gray-300" />
            <p>该表格的预览功能正在开发中...</p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white">
      {/* Header */}
      <header className="h-14 border-b border-[var(--untitled-ui-border)] bg-white flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/project/${id}`)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">项目 {id}</span>
            <span className="text-sm font-semibold text-[var(--untitled-ui-text-primary)]">导出文件预览 - 算量报表</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="unt-button-secondary px-3 py-1.5 text-sm flex items-center gap-2">
            <Save size={16} />
            保存修改
          </button>
          <button className="unt-button-primary px-3 py-1.5 text-sm flex items-center gap-2">
            <Download size={16} />
            下载 Excel
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Tabs */}
        <div className="px-4 pt-3 bg-gray-50/50 shrink-0 flex items-end border-b border-[var(--untitled-ui-border)] z-20 relative">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar mb-[-1px]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t-md transition-all whitespace-nowrap border",
                  activeTab === tab.id
                    ? "bg-white text-brand-600 border-[var(--untitled-ui-border)] border-b-white z-10 relative"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-200 border-transparent border-b-transparent"
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 bg-white min-h-0 min-w-0 flex flex-col relative z-10">
          {renderContent()}
        </div>

        {/* Floating Button */}
        {activeTab !== 'summary' && (
          <button 
            className="absolute bottom-6 right-6 z-30 bg-white border border-[var(--untitled-ui-border)] text-gray-700 hover:bg-gray-50 shadow-lg flex items-center gap-2.5 rounded-full pl-2 pr-4 py-2 transition-colors"
            onClick={() => setHeaderModalOpen(true)}
          >
            <div className="bg-brand-50 w-8 h-8 rounded-full flex items-center justify-center">
              <Settings2 size={16} className="text-brand-600" />
            </div>
            <span className="font-medium text-sm">调整表头</span>
          </button>
        )}
      </main>

      <DraggableModal 
        isOpen={headerModalOpen} 
        onClose={() => setHeaderModalOpen(false)} 
        title="调整表头显示"
      >
        <div className="grid grid-cols-3 gap-3">
          {colDefs[activeTab]?.map(col => (
            <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                checked={colVis[activeTab]?.[col.id] ?? true}
                onChange={() => toggleCol(activeTab, col.id)}
                className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 shrink-0"
              />
              <span className="text-sm text-gray-700 select-none truncate" title={col.name}>{col.name}</span>
            </label>
          ))}
        </div>
      </DraggableModal>
    </div>
  );
}
