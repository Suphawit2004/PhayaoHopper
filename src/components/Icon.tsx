import type { SVGProps } from "react";
const paths = {
 map: "m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
 pin: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
 phone: "M22 16.9v3a2 2 0 0 1-2.2 2 20 20 0 0 1-8.7-3.1 20 20 0 0 1-6-6 20 20 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z",
 alert: "m12 3 10 18H2L12 3Zm0 6v5m0 3h.01",
 filter: "M4 7h16M4 17h16M8 4v6m8 4v6",
 link: "m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 0 2-2a4 4 0 0 0-6-6L6 4a4 4 0 0 0 0 6",
 logout: "M9 21H3V3h6m7 14 5-5-5-5m-9 5h14",
 plus: "M12 5v14M5 12h14",
 coffee: "M3 8h14v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Zm14 1h2a3 3 0 1 1 0 6h-2M6 2v3m5-3v3"
};
export default function Icon({name,...props}:{name:keyof typeof paths}&SVGProps<SVGSVGElement>) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="inline-block align-middle shrink-0" {...props}><path d={paths[name]}/></svg>;
}
