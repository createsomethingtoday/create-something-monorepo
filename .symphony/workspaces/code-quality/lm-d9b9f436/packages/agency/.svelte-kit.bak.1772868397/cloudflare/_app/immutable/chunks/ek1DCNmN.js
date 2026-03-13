import"./DsnmJJEf.js";import{j as v,d as f,a2 as u,a5 as g,an as _,a6 as b,D as h,ab as p}from"./tsl3k0Gx.js";import{s as y}from"./jQ8LPxYY.js";import{a as x,d as A}from"./o49wPE4K.js";import{p as a}from"./DqXJRMKf.js";var O=u("<div><!></div>");function q(s,e){let t=a(e,"radius",3,80),i=a(e,"duration",3,20),d=a(e,"delay",3,0),l=a(e,"reverse",3,!1),n=a(e,"startAngle",3,0),o=a(e,"class",3,"");const m=p(()=>l()?"reverse":"normal");var r=O(),c=g(r);y(c,()=>e.children??_),b(r),v(()=>{x(r,1,`orbiting-circle ${o()??""}`,"svelte-1kebh65"),A(r,`
		--radius: ${t()??""}px;
		--duration: ${i()??""}s;
		--delay: ${d()??""}s;
		--direction: ${h(m)??""};
		--start-angle: ${n()??""}deg;
	`)}),f(s,r)}export{q as O};
