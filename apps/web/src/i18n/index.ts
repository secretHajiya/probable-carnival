import messages from "./messages.json";
export const MEMBER_LOCALES = [
 { code:"en",label:"English",direction:"ltr" }, { code:"ar",label:"العربية",direction:"rtl" },
 { code:"fr",label:"Français",direction:"ltr" }, { code:"es",label:"Español",direction:"ltr" },
 { code:"pt",label:"Português",direction:"ltr" }, { code:"de",label:"Deutsch",direction:"ltr" },
 { code:"tr",label:"Türkçe",direction:"ltr" }, { code:"hi",label:"हिन्दी",direction:"ltr" },
 { code:"zh",label:"中文",direction:"ltr" }
] as const;
export type MemberLocale=(typeof MEMBER_LOCALES)[number]["code"];
export type MessageKey=keyof typeof messages.en;
export function normalizeLocale(value:unknown):MemberLocale {
 const code=String(value??"en").toLowerCase().split("-")[0];
 return MEMBER_LOCALES.some(x=>x.code===code)?code as MemberLocale:"en";
}
export function getDirection(locale:MemberLocale):"ltr"|"rtl" { return locale==="ar"?"rtl":"ltr"; }
export function translate(localeValue:MemberLocale|string,key:MessageKey,params:Record<string,string|number>={}):string {
 const locale=normalizeLocale(localeValue); let value=(messages[locale] as Record<string,string>)[key]??messages.en[key]??String(key);
 for(const [name,replacement] of Object.entries(params)) value=value.replaceAll(`{{${name}}}`,String(replacement));
 return value;
}
export { messages };
