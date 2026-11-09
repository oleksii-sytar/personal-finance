const invisible = /\p{Default_Ignorable_Code_Point}/gu
export const hasVisibleText = (s:string) => s.replace(invisible, '').trim().length > 0
/** Identity comparison only: retain the original visible spelling for presentation. */
export const labelKey = (s:string) => s.normalize('NFKC').replace(invisible, '').trim().replace(/\s+/g, ' ').toLowerCase()
export const labelText = (s:string) => s.normalize('NFKC').trim().replace(/\s+/g, ' ')
