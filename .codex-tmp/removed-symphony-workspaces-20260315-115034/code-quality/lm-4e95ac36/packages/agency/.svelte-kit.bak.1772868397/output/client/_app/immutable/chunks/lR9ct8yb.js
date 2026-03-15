import"./DsnmJJEf.js";import{c as q,f as w,d as v,a0 as z,a5 as l,an as j,a6 as d,a3 as _,j as g,a2 as y}from"./tsl3k0Gx.js";import{d as A}from"./xPDz-uK9.js";import{s as k}from"./jQ8LPxYY.js";import{i as E}from"./D97XJfqs.js";import{s as F,a as S,d as x}from"./o49wPE4K.js";import{p as a}from"./DqXJRMKf.js";var G=y('<a><div class="spark-container svelte-4zbr7j"><div class="spark svelte-4zbr7j"><div class="spark-inner svelte-4zbr7j"></div></div></div> <span class="content svelte-4zbr7j"><!></span> <div class="highlight svelte-4zbr7j"></div> <div class="backdrop svelte-4zbr7j"></div></a>'),H=y('<button type="button"><div class="spark-container svelte-4zbr7j"><div class="spark svelte-4zbr7j"><div class="spark-inner svelte-4zbr7j"></div></div></div> <span class="content svelte-4zbr7j"><!></span> <div class="highlight svelte-4zbr7j"></div> <div class="backdrop svelte-4zbr7j"></div></button>');function Q(C,e){let c=a(e,"class",3,""),m=a(e,"shimmerColor",3,"#ffffff"),b=a(e,"shimmerSize",3,"0.05em"),f=a(e,"borderRadius",3,"10px"),h=a(e,"shimmerDuration",3,"3s"),u=a(e,"background",3,"rgba(0, 0, 0, 1)"),n=a(e,"disabled",3,!1);var p=q(),D=w(p);{var R=r=>{var s=G();let i;var t=z(l(s),2),o=l(t);k(o,()=>e.children??j),d(t),_(4),d(s),g(()=>{F(s,"href",e.href),i=S(s,1,`shimmer-button ${c()??""}`,"svelte-4zbr7j",i,{disabled:n()}),x(s,`
			--spread: 90deg;
			--shimmer-color: ${m()??""};
			--radius: ${f()??""};
			--speed: ${h()??""};
			--cut: ${b()??""};
			--bg: ${u()??""};
		`)}),v(r,s)},B=r=>{var s=H();let i;s.__click=function(...N){e.onclick?.apply(this,N)};var t=z(l(s),2),o=l(t);k(o,()=>e.children??j),d(t),_(4),d(s),g(()=>{i=S(s,1,`shimmer-button ${c()??""}`,"svelte-4zbr7j",i,{disabled:n()}),s.disabled=n(),x(s,`
			--spread: 90deg;
			--shimmer-color: ${m()??""};
			--radius: ${f()??""};
			--speed: ${h()??""};
			--cut: ${b()??""};
			--bg: ${u()??""};
		`)}),v(r,s)};E(D,r=>{e.href?r(R):r(B,!1)})}v(C,p)}A(["click"]);export{Q as S};
