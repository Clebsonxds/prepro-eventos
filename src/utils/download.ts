export function downloadCsv(filename:string, rows:(string|number)[][]){
  const escape=(value:string|number)=>{const s=String(value??'');return /[;"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};
  const csv='\uFEFF'+rows.map(row=>row.map(escape).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
