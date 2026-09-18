import type { Equipment, ProjectGroup, ProjectItem, ProjectTotals } from '../types/domain';

/**
 * Referências trazidas do protótipo legado apenas para pré-preenchimento.
 * Até homologação do inventário/ficha técnica, estes valores não devem ser
 * tratados como especificação de engenharia.
 */
export const LEGACY_TRUSS_REFERENCE_KG_M: Record<string, number> = {
  Q15: 2.5,
  Q20: 4,
  Q25: 6,
  Q30: 8,
};

export const NETWORK_PIXEL_LIMIT = 655_360;
export const POWER_FEED_LIMIT_W = 1_980;

export function equipmentForItem(item: ProjectItem, catalog: Equipment[]): Equipment | undefined {
  return catalog.find((equipment) => equipment.id === item.equipment_id);
}

export function itemWeightKg(item: ProjectItem, equipment?: Equipment): number {
  const unit = item.override_weight_kg ?? equipment?.weight_kg ?? 0;
  return Math.max(0, unit) * Math.max(0, item.quantity);
}

export function itemPowerW(item: ProjectItem, equipment?: Equipment): number {
  const unit = item.override_power_w ?? equipment?.power_w ?? 0;
  return Math.max(0, unit) * Math.max(0, item.quantity);
}

export function metadataNumber(group: ProjectGroup, key: string, fallback = 0): number {
  const value = group.metadata?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function metadataString(group: ProjectGroup, key: string, fallback = ''): string {
  const value = group.metadata?.[key];
  return typeof value === 'string' ? value : fallback;
}

export function metadataBoolean(group: ProjectGroup, key: string, fallback = false): boolean {
  const value = group.metadata?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

export function groupOwnWeightKg(group: ProjectGroup): number {
  if (group.area !== 'structure') return 0;
  const kgPerM = metadataNumber(group, 'kg_per_m', LEGACY_TRUSS_REFERENCE_KG_M[group.structure_type.toUpperCase()] ?? 0);
  const trussWeight = Math.max(0, group.length_m) * Math.max(0, kgPerM);
  const usesHoist = metadataBoolean(group, 'uses_hoist');
  const hoistQty = metadataNumber(group, 'hoist_qty');
  const hoistLength = metadataNumber(group, 'hoist_length_m');
  const hoistBodyKg = metadataNumber(group, 'hoist_body_kg', 8);
  const chainKgM = metadataNumber(group, 'chain_kg_m', 1);
  const hoistWeight = usesHoist
    ? Math.max(0, hoistQty) * (Math.max(0, hoistBodyKg) + Math.max(0, hoistLength) * Math.max(0, chainKgM))
    : 0;
  return trussWeight + hoistWeight;
}

/** Peso de componentes derivados de um sistema de LED (mãos francesas,
 * contrapesos, bumpers etc). Talhas do sistema suspenso NÃO entram aqui:
 * as talhas reais devem ser cadastradas na estrutura compartilhada para não
 * haver dupla contagem.
 */
export function videoDerivedSupportWeightKg(group: ProjectGroup): number {
  if (group.area !== 'video') return 0;
  return Math.max(0, metadataNumber(group, 'derived_structure_weight_kg'));
}

export function videoSupportWeightForStructure(structureId: string, groups: ProjectGroup[]): number {
  return groups
    .filter((group) => group.area === 'video' && metadataString(group, 'structure_id') === structureId)
    .reduce((sum, group) => sum + videoDerivedSupportWeightKg(group), 0);
}

export function structureLoadKg(group: ProjectGroup, items: ProjectItem[], catalog: Equipment[], groups: ProjectGroup[] = []): number {
  const itemWeight = items
    .filter((i) => i.group_id === group.id)
    .reduce((sum, item) => sum + itemWeightKg(item, equipmentForItem(item, catalog)), 0);
  const linkedVideoSupport = videoSupportWeightForStructure(group.id, groups);
  return itemWeight + groupOwnWeightKg(group) + linkedVideoSupport;
}

export function calculateTotals(groups: ProjectGroup[], items: ProjectItem[], catalog: Equipment[]): ProjectTotals {
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  let totalWeightKg = 0;
  let aerialWeightKg = 0;
  let floorWeightKg = 0;
  let totalPowerW = 0;
  let dmxChannels = 0;
  let audioInputs = 0;
  let itemCount = 0;
  let structureWeightKg = 0;

  for (const group of groups.filter((g) => g.area === 'structure')) {
    const own = groupOwnWeightKg(group);
    structureWeightKg += own;
    totalWeightKg += own;
    if (group.mount_type === 'aerial') aerialWeightKg += own;
    else if (group.mount_type === 'mixed') { aerialWeightKg += own / 2; floorWeightKg += own / 2; }
    else floorWeightKg += own;
  }

  for (const item of items) {
    const equipment = equipmentForItem(item, catalog);
    const weight = itemWeightKg(item, equipment);
    const power = itemPowerW(item, equipment);
    const group = item.group_id ? groupMap.get(item.group_id) : undefined;
    totalWeightKg += weight;
    totalPowerW += power;
    dmxChannels += (equipment?.dmx_channels ?? 0) * Math.max(0, item.quantity);
    audioInputs += (equipment?.audio_inputs ?? 0) * Math.max(0, item.quantity);
    itemCount += Math.max(0, item.quantity);

    if (group?.mount_type === 'aerial') aerialWeightKg += weight;
    else if (group?.mount_type === 'mixed') { aerialWeightKg += weight / 2; floorWeightKg += weight / 2; }
    else floorWeightKg += weight;
  }

  // Componentes calculados pelo módulo de vídeo que não existem fisicamente no
  // catálogo ainda (mãos francesas, contrapesos e bumpers). Entram no resumo e
  // nos memoriais sem criar produtos artificiais no estoque.
  for (const video of groups.filter((g) => g.area === 'video')) {
    const derived = videoDerivedSupportWeightKg(video);
    if (!derived) continue;
    totalWeightKg += derived;
    structureWeightKg += derived;
    if (video.mount_type === 'aerial') aerialWeightKg += derived;
    else floorWeightKg += derived;
  }

  return { totalWeightKg, aerialWeightKg, floorWeightKg, totalPowerW, dmxChannels, audioInputs, itemCount, structureWeightKg };
}

export function estimateElectrical(totalPowerW: number, voltage: number, phases: number, powerFactor: number, reservePct: number) {
  const pf = Math.min(1, Math.max(0.1, powerFactor));
  const reserve = 1 + Math.max(0, reservePct) / 100;
  const kw = totalPowerW / 1000;
  const kva = (kw * reserve) / pf;
  const v = Math.max(1, voltage);
  const p = phases === 3 ? 3 : 1;
  const currentA = p === 3 ? (kva * 1000) / (Math.sqrt(3) * v) : (kva * 1000) / v;
  return { kw, kva, currentA };
}

export interface LedCalculation {
  columns: number;
  rows: number;
  moduleCount: number;
  effectiveWidthM: number;
  effectiveHeightM: number;
  totalPixels: number;
  resolutionW: number;
  resolutionH: number;
  networkPorts: number;
  powerFeeds: number;
  signalJumps: number;
  powerJumps: number;
  frontFrenchHands: number;
  rearFrenchHands: number;
  lateralFrenchHands: number;
  totalFrenchHands: number;
  bumpers: number;
  suggestedHoists: number;
  panelWeightKg: number;
  typicalPowerW: number;
  maxPowerW: number;
}

export function calculateLedSystem(panel: Equipment | undefined, widthM: number, heightM: number, installMode: string): LedCalculation {
  const moduleW = Math.max(0, panel?.module_width_m ?? 0);
  const moduleH = Math.max(0, panel?.module_height_m ?? 0);
  const columns = moduleW > 0 && widthM > 0 ? Math.ceil(widthM / moduleW) : 0;
  const rows = moduleH > 0 && heightM > 0 ? Math.ceil(heightM / moduleH) : 0;
  const moduleCount = columns * rows;
  const effectiveWidthM = columns * moduleW;
  const effectiveHeightM = rows * moduleH;
  const pxW = Math.max(0, panel?.pixels_w ?? 0);
  const pxH = Math.max(0, panel?.pixels_h ?? 0);
  const pixelsPerModule = pxW * pxH;
  const totalPixels = pixelsPerModule * moduleCount;
  const resolutionW = pxW * columns;
  const resolutionH = pxH * rows;
  const modulesPerNetworkPort = pixelsPerModule > 0 ? Math.max(1, Math.floor(NETWORK_PIXEL_LIMIT / pixelsPerModule)) : 0;
  const networkPorts = moduleCount > 0
    ? (modulesPerNetworkPort > 0 ? Math.ceil(moduleCount / modulesPerNetworkPort) : Math.ceil(totalPixels / NETWORK_PIXEL_LIMIT))
    : 0;
  const typicalUnitW = Math.max(0, panel?.power_w ?? 0);
  const maxUnitW = Math.max(typicalUnitW, panel?.max_power_w ?? typicalUnitW);
  const typicalPowerW = moduleCount * typicalUnitW;
  const maxPowerW = moduleCount * maxUnitW;
  const modulesPerPowerFeed = typicalUnitW > 0 ? Math.max(1, Math.floor(POWER_FEED_LIMIT_W / typicalUnitW)) : 0;
  const powerFeeds = moduleCount > 0 ? (modulesPerPowerFeed > 0 ? Math.ceil(moduleCount / modulesPerPowerFeed) : 0) : 0;
  const signalJumps = Math.max(0, moduleCount - networkPorts);
  const powerJumps = Math.max(0, moduleCount - powerFeeds);
  const panelWeightKg = moduleCount * Math.max(0, panel?.weight_kg ?? 0);

  // Regra de referência herdada do protótipo: uma mão a cada duas colunas,
  // mais duas laterais de acabamento. Deve ser homologada pela engenharia.
  const supportBase = columns > 0 ? Math.ceil(columns / 2) : 0;
  const frontFrenchHands = installMode === 'ground_simple' || installMode === 'ground_double' || installMode === 'elevation_bar' ? supportBase : 0;
  const rearFrenchHands = installMode === 'ground_double' || installMode === 'elevation_bar' ? supportBase : 0;
  const lateralFrenchHands = frontFrenchHands > 0 ? 2 : 0;
  const totalFrenchHands = frontFrenchHands + rearFrenchHands + lateralFrenchHands;
  const bumpers = installMode === 'suspended' ? columns : 0;
  const suspendedWeight = panelWeightKg + bumpers * 3;
  const suggestedHoists = installMode === 'suspended' && suspendedWeight > 0 ? Math.ceil(suspendedWeight / 500) : 0;
  return { columns, rows, moduleCount, effectiveWidthM, effectiveHeightM, totalPixels, resolutionW, resolutionH, networkPorts, powerFeeds, signalJumps, powerJumps, frontFrenchHands, rearFrenchHands, lateralFrenchHands, totalFrenchHands, bumpers, suggestedHoists, panelWeightKg, typicalPowerW, maxPowerW };
}
