import type { Edit, Snapshot } from './pendingEdits';
import type { GameRow } from './gameCatalog';
import { opticIds, controllerNumericOpticIds, controllerAdvancedOpticIds, controllerAlcRows } from './settings.ts';

export function rowSettingIds(row: GameRow, includeChildren = false): string[] {
  const own = row.id ? [row.id] : [];
  if (row.control === 'resolution') return ['width','height'];
  if (row.control === 'display') return ['fullscreen','borderless'];
  if (row.control === 'reflex') return ['reflex_enabled','reflex_boost'];
  if (row.control === 'spot-shadow') return ['spot_detail_observed','spot_shadow_upres','shadows'];
  if (row.control === 'impact-marks') return ['impact_marks','impact_marks_models'];
  if (row.control === 'adaptive-fps') return ['adaptive_resolution','adaptive_fps_min','adaptive_fps_max'];
  if (row.control === 'color') return row.id === 'laser_customized' ? ['laser_customized','laser_color'] : ['reticle_color'];
  if (!includeChildren) return own;
  if (row.control === 'optic') return [...own,...opticIds];
  if (row.control === 'controller-optic') return [...own,...controllerNumericOpticIds];
  if (row.control === 'controller-alc') return [...own,...controllerAlcRows.map(row=>row.id),...controllerAdvancedOpticIds,'controller_alc_per_optic','controller_alc_target_compensation','controller_alc_melee_compensation'];
  if (row.control === 'audio-details') return ['audio_dialogue','audio_music_game','audio_music_lobby','audio_sfx','audio_focus','audio_reduced_music','voice_enabled'];
  return own;
}

export function editsForAction(edits: Edit[], snapshot: Snapshot | null, action: string): Edit[] {
  return edits.filter(edit => 'key' in edit && (
    edit.kind === 'bind' && edit.action === action ||
    snapshot?.binds.some(bind => bind.key.toUpperCase() === edit.key.toUpperCase() && bind.action === action)
  ));
}

export function groupEdits(rows: GameRow[], edits: Edit[], snapshot: Snapshot | null): Edit[] {
  const ids = new Set(rows.flatMap(row=>rowSettingIds(row,true)));
  const actionEdits = new Set(rows.filter(row=>row.control==='bind'&&row.id).flatMap(row=>editsForAction(edits,snapshot,row.id!)));
  return edits.filter(edit=>edit.kind==='setting' && ids.has(edit.id) || actionEdits.has(edit));
}
