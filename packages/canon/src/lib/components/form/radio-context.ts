/** Internal relationship shared by canonical RadioGroup and Radio. */
export const RADIO_GROUP = Symbol('Canon RadioGroup');
export interface RadioGroupContext { readonly value:string; readonly name:string; readonly disabled:boolean; readonly size:'sm'|'md'|'lg'; }
