import"./DsnmJJEf.js";import{o as y}from"./ygKXnOhL.js";import{Z as _,j as w,d as V,_ as x,a2 as M,G as l,a5 as O,an as B,a6 as I,D as j,a9 as D}from"./tsl3k0Gx.js";import{s as E}from"./jQ8LPxYY.js";import{a as F,d as G}from"./o49wPE4K.js";import{b as N}from"./D4PzaJZq.js";import{p as t}from"./DqXJRMKf.js";var Z=M("<div><!></div>");function K(d,e){_(e,!0);let f=t(e,"class",3,""),m=t(e,"duration",3,.4),u=t(e,"delay",3,0),c=t(e,"yOffset",3,6),b=t(e,"blur",3,"6px"),v=t(e,"inView",3,!0),h=t(e,"inViewMargin",3,"-50px"),r,i=D(!1);y(()=>{if(!v()){l(i,!0);return}const a=new IntersectionObserver(g=>{g.forEach(o=>{o.isIntersecting&&(l(i,!0),a.unobserve(o.target))})},{rootMargin:h(),threshold:.1});return a.observe(r),()=>a.disconnect()});var s=Z();let n;var p=O(s);E(p,()=>e.children??B),I(s),N(s,a=>r=a,()=>r),w(()=>{n=F(s,1,`blur-fade ${f()??""}`,"svelte-10637sd",n,{visible:j(i)}),G(s,`
		--duration: ${m()??""}s;
		--delay: ${.04+u()}s;
		--y-offset: ${c()??""}px;
		--blur: ${b()??""};
	`)}),V(d,s),x()}export{K as B};
