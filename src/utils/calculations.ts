import type { Equipment, ProjectGroup, ProjectItem, ProjectTotals } from '../types/domain';

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

export function calculateTotals(groups: ProjectGroup[], items: ProjectItem[], catalog: Equipment[]): ProjectTotals {
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  let totalWeightKg = 0;
  let aerialWeightKg = 0;
  let floorWeightKg = 0;
  let totalPowerW = 0;
  let dmxChannels = 0;
  let audioInputs = 0;
  let itemCount = 0;

  for (const item of items) {
    const equipment = equipmentForItem(item, catalog);
    const weight = itemWeightKg(item, equipment);
    const power = itemPowerW(item, equipment);
    const group = groupMap.get(item.group_id);
    totalWeightKg += weight;
    totalPowerW += power;
    dmxChannels += (equipment?.dmx_channels ?? 0) * Math.max(0, item.quantity);
    audioInputs += (equipment?.audio_inputs ?? 0) * Math.max(0, item.quantity);
    itemCount += Math.max(0, item.quantity);

    if (group?.mount_type === 'aerial') aerialWeightKg += weight;
    else if (group?.mount_type === 'floor') floorWeightKg += weight;
    else {
      aerialWeightKg += weight / 2;
      floorWeightKg += weight / 2;
    }
  }

  return { totalWeightKg, aerialWeightKg, floorWeightKg, totalPowerW, dmxChannels, audioInputs, itemCount };
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
