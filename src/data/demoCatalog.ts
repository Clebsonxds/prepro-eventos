import type { Equipment } from '../types/domain';

const now = new Date().toISOString();

export const demoCatalog: Equipment[] = [
  {
    id: 'demo-beam-9r', name: 'Moving Beam 9R · DEMO', category: 'lighting_fixture', manufacturer: 'Genérico', model: 'Beam 9R',
    weight_kg: 17, power_w: 260, dmx_channels: 16, audio_inputs: 0, case_capacity: 2,
    module_width_m: null, module_height_m: null, pixels_w: null, pixels_h: null,
    notes: 'Valores apenas para demonstração da interface. Validar antes de uso técnico.', active: true, created_at: now, updated_at: now,
  },
  {
    id: 'demo-dm3', name: 'Mesa digital compacta · DEMO', category: 'audio_console', manufacturer: 'Demo', model: 'Console 01',
    weight_kg: 6.5, power_w: 85, dmx_channels: 0, audio_inputs: 16, case_capacity: 1,
    module_width_m: null, module_height_m: null, pixels_w: null, pixels_h: null,
    notes: 'Item de demonstração.', active: true, created_at: now, updated_at: now,
  },
  {
    id: 'demo-line-array', name: 'Caixa Line Array · DEMO', category: 'audio_box', manufacturer: 'Demo', model: 'LA-12',
    weight_kg: 31, power_w: 900, dmx_channels: 0, audio_inputs: 0, case_capacity: 2,
    module_width_m: null, module_height_m: null, pixels_w: null, pixels_h: null,
    notes: 'Item de demonstração.', active: true, created_at: now, updated_at: now,
  },
  {
    id: 'demo-sub', name: 'Subwoofer · DEMO', category: 'audio_box', manufacturer: 'Demo', model: 'SUB-18',
    weight_kg: 48, power_w: 1200, dmx_channels: 0, audio_inputs: 0, case_capacity: 1,
    module_width_m: null, module_height_m: null, pixels_w: null, pixels_h: null,
    notes: 'Item de demonstração.', active: true, created_at: now, updated_at: now,
  },
  {
    id: 'demo-led', name: 'Painel LED 50×50 · DEMO', category: 'video_panel', manufacturer: 'Demo', model: 'P2.9',
    weight_kg: 7.5, power_w: 150, dmx_channels: 0, audio_inputs: 0, case_capacity: 8,
    module_width_m: 0.5, module_height_m: 0.5, pixels_w: 168, pixels_h: 168,
    notes: 'Valores por módulo apenas para demonstração. Substituir pelo catálogo homologado.', active: true, created_at: now, updated_at: now,
  },
  {
    id: 'demo-processor', name: 'Processadora de LED · DEMO', category: 'video_processor', manufacturer: 'Demo', model: 'Processor 4K',
    weight_kg: 4, power_w: 60, dmx_channels: 0, audio_inputs: 0, case_capacity: 1,
    module_width_m: null, module_height_m: null, pixels_w: null, pixels_h: null,
    notes: 'Item de demonstração.', active: true, created_at: now, updated_at: now,
  },
];
