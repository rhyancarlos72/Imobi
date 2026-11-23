"use client";
// Meta Pixel + PayTracking (script fornecido pelo dono do app).
// O script original dispara o PageView na primeira carga; aqui também
// disparamos PageView nas trocas de página internas (o app não recarrega a página).
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export const META_PIXEL_ID = "876826298499590";

const PIXEL_SNIPPET = `!function(w,d,P){try{if(!w.fbq){var n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!w._fbq)w._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];var t=d.createElement("script");t.async=!0;t.src="https://connect.facebook.net/en_US/fbevents.js";var f=d.getElementsByTagName("script")[0];f&&f.parentNode?f.parentNode.insertBefore(t,f):d.head.appendChild(t)}var g=w.__ptpvon=w.__ptpvon||{};if(g[P])return;g[P]=1;var c=w.crypto,i=c&&c.randomUUID?c.randomUUID():"evt_"+Date.now()+"_"+Math.random().toString(36).slice(2);var x="";try{var L=w.localStorage;x=L.getItem("pt_xid")||"";if(!x){x=c&&c.randomUUID?c.randomUUID():"xid_"+Date.now()+"_"+Math.random().toString(36).slice(2);L.setItem("pt_xid",x)}}catch(e){}w.fbq("init",P,x?{external_id:x}:{});w.fbq("trackSingle",P,"PageView",{},{eventID:i});(w.__ptpv=w.__ptpv||{})[P]=i}catch(e){}}(window,document,"876826298499590");!function(){if((window.__ptpxl=window.__ptpxl||{})["876826298499590"])return;window.__ptpxl["876826298499590"]=1;var s=document.createElement("script");s.async=true;s.crossOrigin="anonymous";s.src="https://paytracking.com.br/pixel.js";s.setAttribute("data-key","pt_px_525572aa20295dfa3168");s.setAttribute("data-pixel-id","876826298499590");s.setAttribute("data-endpoint","https://paytracking.com.br/v1/collect");s.setAttribute("data-currency","BRL");s.setAttribute("data-country","BR");s.setAttribute("data-ic-click","1");document.head.appendChild(s)}();`;

type Fbq = (...args: unknown[]) => void;

export function TrackingPixel() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    // a primeira visualização já é contada pelo script; contamos as navegações seguintes
    if (first.current) {
      first.current = false;
      return;
    }
    const fbq = (window as unknown as { fbq?: Fbq }).fbq;
    if (!fbq) return;
    const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    try {
      fbq("trackSingle", META_PIXEL_ID, "PageView", {}, { eventID: id });
    } catch {}
  }, [path]);

  return <Script id="meta-pixel-paytracking" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: PIXEL_SNIPPET }} />;
}
