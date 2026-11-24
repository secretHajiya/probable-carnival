import { useEffect, useMemo } from "react";
import { getDirection, normalizeLocale, translate, type MemberLocale, type MessageKey } from "./index";
export function useI18n(localeValue:string) {
 const locale:MemberLocale=useMemo(()=>normalizeLocale(localeValue),[localeValue]);
 useEffect(()=>{ document.documentElement.lang=locale; document.documentElement.dir=getDirection(locale); document.documentElement.dataset.locale=locale; },[locale]);
 return { locale, direction:getDirection(locale), t:(key:MessageKey,params?:Record<string,string|number>)=>translate(locale,key,params) };
}
