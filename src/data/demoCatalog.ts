import { legacySeed } from './legacySeed';
import type { Equipment } from '../types/domain';

const now = new Date().toISOString();

const companyExamples: Equipment[] = [
  {
    id:'company-rcf-j8', name:'RCF J8 · ESTOQUE EXEMPLO', category:'audio_box', manufacturer:'RCF', model:'J8',
    weight_kg:0, power_w:0, max_power_w:0, dmx_channels:0, audio_inputs:0, case_capacity:1,
    module_width_m:null, module_height_m:null, pixels_w:null, pixels_h:null, pitch_mm:null, panel_type:null,
    output_ports:null, max_pixels:null, kg_per_m:null, stock_total:8, maintenance_qty:0, verification_status:'pending',
    notes:'Quantidade de estoque inserida apenas para demonstrar a reserva. Peso e consumo precisam ser homologados antes do uso técnico.', active:true, created_at:now, updated_at:now,
  },
];

export const demoCatalog: Equipment[] = [...companyExamples, ...legacySeed];
