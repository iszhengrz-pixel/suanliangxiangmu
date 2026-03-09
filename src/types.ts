export interface DxfFile {
  id: string;
  name: string;
  date: string;
  status: 'READY' | 'PROCESSING' | 'FAILED';
  progress?: number;
}

export interface Project {
  id: string;
  number: string;
  type: '电气' | '景观' | '结构';
  createdAt: string;
  dxfCount: number;
  buildingCount: number;
  image: string;
  files: DxfFile[];
  buildings: string[];
}
