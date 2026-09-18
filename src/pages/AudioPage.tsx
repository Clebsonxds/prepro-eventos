import { GroupAreaPage } from '../components/GroupAreaPage';
export function AudioPage() {
  return <GroupAreaPage area="audio" eyebrow="Áudio" title="Sistema de sonorização" description="Organize PA, subs, delays, monitores e infraestrutura por posição de instalação." groupExamples="Ex.: PA principal L, Subs, Delay 01" allowedCategories={['audio_console','audio_box','audio_stagebox','other']} />;
}
