export const __rspack_esm_ids=[939415];export const __webpack_modules__={jtwM(t,e,a){function n(t,e){t.accDescr&&e.setAccDescription?.(t.accDescr),t.accTitle&&e.setAccTitle?.(t.accTitle),t.title&&e.setDiagramTitle?.(t.title)}(0,a("xXFi").b)(n,"populateCommonDb"),a.d(e,{},{a:n})},Nebi(t,e,a){var n=a("jtwM"),r=a("FdcH"),i=a("siJ7"),o=a("Z9t6"),l=a("doxX"),c=a("xXFi"),s=a("wG3j"),d=(0,c.b)(()=>({domains:new Map,transitions:[]}),"createDefaultData"),f=d(),p=(0,c.b)(()=>f.domains,"getDomains"),y=(0,c.b)(()=>f.transitions,"getTransitions"),m={getDomains:p,getTransitions:y,setDomains:(0,c.b)(t=>{if(t)for(let e of t){let t=e.domain,a=(e.items??[]).map(t=>({label:t.label}));f.domains.set(t,{name:t,items:a})}},"setDomains"),setTransitions:(0,c.b)(t=>{t&&(f.transitions=t.filter(t=>t.from!==t.to||(l.a.warn(`Cynefin: self-loop transition on domain "${t.from}" is not meaningful and will be skipped.`),!1)).map(t=>({from:t.from,to:t.to,label:t.label||void 0})))},"setTransitions"),getConfig:(0,c.b)(()=>(0,i.e)({...o.l.cynefin,...(0,o.t)().cynefin}),"getConfig"),clear:(0,c.b)(()=>{(0,o.e)(),f=d()},"clear"),setAccTitle:o.Q,getAccTitle:o.s,setDiagramTitle:o.T,getDiagramTitle:o.x,getAccDescription:o.r,setAccDescription:o.P},x=(0,c.b)(t=>{(0,n.a)(t,m),m.setDomains(t.domains),m.setTransitions(t.transitions)},"populate"),h={parse:(0,c.b)(async t=>{let e=await (0,s.g)("cynefin",t);l.a.debug(e),x(e)},"parse")};function $(t){let e=t+0x6d2b79f5|0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}function g(t){let e=0;for(let a=0;a<t.length;a++)e=(e<<5)-e+t.charCodeAt(a)|0;return e}function b(t,e){return"number"==typeof t&&Number.isFinite(t)&&0!==t?t:g(e)}function u(t,e,a,n){let r=t/2,i=n??.015*t,o=e/7,l=[];for(let t=0;t<=7;t++){let e=$(a+17*t)*i*2-i;l.push({x:r+e,y:t*o})}let c=`M${l[0].x},${l[0].y}`;for(let t=0;t<l.length-1;t++){let e=l[t],n=l[t+1],r=(e.y+n.y)/2,o=1.5*i*(t%2==0?1:-1)*$(a+31*t+7),s=e.x+o,d=n.x-o;c+=` C${s},${r} ${d},${r} ${n.x},${n.y}`}return c}function w(t,e,a,n){let r=e/2,i=n??.015*e,o=t/7,l=[];for(let t=0;t<=7;t++){let e=$(a+23*t)*i*2-i;l.push({x:t*o,y:r+e})}let c=`M${l[0].x},${l[0].y}`;for(let t=0;t<l.length-1;t++){let e=l[t],n=l[t+1],r=(e.x+n.x)/2,o=1.5*i*(t%2==0?1:-1)*$(a+37*t+11),s=e.y+o,d=n.y-o;c+=` C${r},${s} ${r},${d} ${n.x},${n.y}`}return c}function C(t,e){let a=t/2,n=.5*e,r=.03*t;return`M${a},${n} C${a+r},${n+(e-n)*.2} ${a-1.5*r},${n+(e-n)*.55} ${a+.5*r},${n+(e-n)*.75} C${a-r},${n+(e-n)*.85} ${a+.3*r},${n+(e-n)*.95} ${a},${e}`}function D(t,e,a,n){return`M${t-a},${e} A${a},${n} 0 1,1 ${t+a},${e} A${a},${n} 0 1,1 ${t-a},${e} Z`}(0,c.b)($,"seededRandom"),(0,c.b)(g,"hashString"),(0,c.b)(b,"resolveSeed"),(0,c.b)(u,"generateFoldPath"),(0,c.b)(w,"generateHorizontalBoundary"),(0,c.b)(C,"generateCliffPath"),(0,c.b)(D,"generateConfusionPath");var k={complex:{model:"Probe → Sense → Respond",practice:"Emergent Practices"},complicated:{model:"Sense → Analyse → Respond",practice:"Good Practices"},clear:{model:"Sense → Categorise → Respond",practice:"Best Practices"},chaotic:{model:"Act → Sense → Respond",practice:"Novel Practices"},confusion:{model:"",practice:"Disorder"}},A=(0,c.b)((t,e)=>{let a=t/2,n=e/2;return{complex:{cx:a/2,cy:n/2,x:0,y:0,w:a,h:n},complicated:{cx:a+a/2,cy:n/2,x:a,y:0,w:a,h:n},chaotic:{cx:a/2,cy:n+n/2,x:0,y:n,w:a,h:n},clear:{cx:a+a/2,cy:n+n/2,x:a,y:n,w:a,h:n},confusion:{cx:a,cy:n,x:.7*a,y:.7*n,w:.6*a,h:.6*n}}},"getDomainLayouts"),T=(0,c.b)(()=>{let t=(0,o.A)(),e=(0,o.t)();return(0,i.e)(t,e.themeVariables).cynefin},"getCynefinDomainColors"),B=(0,c.b)((t,e,a,n)=>{let i=n.db,c=i.getDomains(),s=i.getTransitions(),d=i.getDiagramTitle(),f=i.getAccTitle(),p=i.getAccDescription(),y=i.getConfig(),m=T();l.a.debug("Rendering Cynefin diagram");let x=y.width,h=y.height,$=y.padding,g=y.showDomainDescriptions,B=y.boundaryAmplitude,S=x+2*$,M=h+2*$,z={complex:m.complexBg,complicated:m.complicatedBg,clear:m.clearBg,chaotic:m.chaoticBg,confusion:m.confusionBg},v=(0,r.a)(e);(0,o.h)(v,M,S,y.useMaxWidth??!0),v.attr("viewBox",`0 0 ${S} ${M}`),f&&v.append("title").text(f),p&&v.append("desc").text(p);let F=v.append("g").attr("transform",`translate(${$}, ${$})`),L=A(x,h),P=b(y.seed,e),_=F.append("g").attr("class","cynefin-backgrounds"),I=["complex","complicated","chaotic","clear"];for(let t of I){let e=L[t];_.append("rect").attr("class","cynefinDomain").attr("x",e.x).attr("y",e.y).attr("width",e.w).attr("height",e.h).attr("fill",z[t]).attr("fill-opacity",.4).attr("stroke","none")}let R=F.append("g").attr("class","cynefin-boundaries");R.append("path").attr("class","cynefinBoundary").attr("d",u(x,h,P,B)).attr("fill","none"),R.append("path").attr("class","cynefinBoundary").attr("d",w(x,h,P+100,B)).attr("fill","none"),R.append("path").attr("class","cynefinCliff").attr("d",C(x,h)).attr("fill","none");let H=.15*x,W=.15*h;F.append("path").attr("class","cynefinConfusion").attr("d",D(x/2,h/2,H,W)).attr("fill",z.confusion).attr("fill-opacity",.5);let X=F.append("g").attr("class","cynefin-labels");for(let t of I){let e=L[t];X.append("text").attr("class","cynefinDomainLabel").attr("x",e.cx).attr("y",g?e.cy-30:e.cy).attr("text-anchor","middle").attr("dominant-baseline","middle").text(t.charAt(0).toUpperCase()+t.slice(1))}if(X.append("text").attr("class","cynefinDomainLabel").attr("x",x/2).attr("y",g?h/2-10:h/2).attr("text-anchor","middle").attr("dominant-baseline","middle").text("Confusion"),g){let t=F.append("g").attr("class","cynefin-subtitles");for(let e of I){let a=L[e],n=k[e];t.append("text").attr("class","cynefinSubtitle").attr("x",a.cx).attr("y",a.cy-10).attr("text-anchor","middle").attr("dominant-baseline","middle").text(n.model),t.append("text").attr("class","cynefinSubtitle").attr("x",a.cx).attr("y",a.cy+5).attr("text-anchor","middle").attr("dominant-baseline","middle").text(n.practice)}t.append("text").attr("class","cynefinSubtitle").attr("x",x/2).attr("y",h/2+8).attr("text-anchor","middle").attr("dominant-baseline","middle").text(k.confusion.practice)}let j=F.append("g").attr("class","cynefin-items");for(let t of["complex","complicated","chaotic","clear","confusion"]){let e,a=c.get(t);if(!a||0===a.items.length)continue;let n=L[t],r="confusion"===t,i=a.items,o=0;if(r&&a.items.length>3&&(o=a.items.length-3,i=a.items.slice(0,3)),r){let t=g?22:14;e=n.cy+t}else e=n.cy+(g?25:15);if([...i].forEach((a,r)=>{let i=e+30*r,o=j.append("g"),l=o.append("text").attr("class","cynefinItemText").attr("x",0).attr("y",13).attr("text-anchor","middle").attr("dominant-baseline","central").text(a.label),c=7*a.label.length,s=l.node();if(s&&"function"==typeof s.getBBox){let t=s.getBBox();t.width>0&&(c=t.width)}let d=c+20,f=n.cx-d/2;o.attr("transform",`translate(${f}, ${i})`),o.insert("rect","text").attr("class","cynefinItem").attr("x",0).attr("y",0).attr("width",d).attr("height",26).attr("rx",4).attr("ry",4).attr("fill",z[t]).attr("fill-opacity",.95),l.attr("x",d/2).attr("y",13)}),o>0){let a=e+30*i.length,r=`+${o} more`,l=j.append("g"),c=l.append("text").attr("class","cynefinItemText").attr("x",0).attr("y",13).attr("text-anchor","middle").attr("dominant-baseline","central").text(r),s=7*r.length,d=c.node();if(d&&"function"==typeof d.getBBox){let t=d.getBBox();t.width>0&&(s=t.width)}let f=s+20,p=n.cx-f/2;l.attr("transform",`translate(${p}, ${a})`),l.insert("rect","text").attr("class","cynefinItemOverflow").attr("x",0).attr("y",0).attr("width",f).attr("height",26).attr("rx",4).attr("ry",4).attr("fill",z[t]).attr("fill-opacity",.6),c.attr("x",f/2).attr("y",13)}}if(s.length>0){let t=v.select("defs").empty()?v.append("defs"):v.select("defs"),a=`cynefin-arrow-${e}`;t.append("marker").attr("id",a).attr("viewBox","0 0 10 10").attr("refX",9).attr("refY",5).attr("markerWidth",6).attr("markerHeight",6).attr("orient","auto-start-reverse").append("path").attr("d","M 0 0 L 10 5 L 0 10 z").attr("class","cynefinArrowHead");let n=F.append("g").attr("class","cynefin-arrows");s.forEach(t=>{let e=L[t.from],r=L[t.to];if(!e||!r)return;if(t.from===t.to)return void l.a.warn(`Cynefin renderer: skipping self-loop on domain "${t.from}"`);let i=e.cx,o=e.cy,c=r.cx,s=r.cy,d=c-i,f=s-o,p=Math.sqrt(d*d+f*f),y=.15*p,m=(i+c)/2+-f/p*y,x=(o+s)/2+d/p*y;n.append("path").attr("class","cynefinArrowLine").attr("d",`M${i},${o} Q${m},${x} ${c},${s}`).attr("fill","none").attr("marker-end",`url(#${a})`),t.label&&n.append("text").attr("class","cynefinArrowLabel").attr("x",m).attr("y",x-6).attr("text-anchor","middle").attr("dominant-baseline","auto").text(t.label)})}d&&F.append("text").attr("class","cynefinTitle").attr("x",x/2).attr("y",-$/2).attr("text-anchor","middle").attr("dominant-baseline","middle").text(d)},"draw"),S=(0,c.b)(()=>{let t=(0,o.A)(),e=(0,o.t)();return(0,i.e)(t,e.themeVariables).cynefin},"getCynefinTheme"),M=(0,c.b)(()=>{let t=S();return`
	.cynefinDomain {
		stroke: none;
	}
	.cynefinDomainLabel {
		font-size: ${t.domainFontSize}px;
		font-weight: bold;
		fill: ${t.labelColor};
	}
	.cynefinSubtitle {
		font-size: ${t.itemFontSize-1}px;
		fill: ${t.textColor};
		font-style: italic;
	}
	.cynefinItem {
		fill-opacity: 0.95;
		stroke: ${t.boundaryColor};
		stroke-width: 1;
	}
	.cynefinItemText {
		font-size: ${t.itemFontSize}px;
		fill: ${t.textColor};
	}
	.cynefinItemOverflow {
		fill-opacity: 0.6;
		stroke: ${t.boundaryColor};
		stroke-width: 1;
		stroke-dasharray: 3 2;
	}
	.cynefinBoundary {
		stroke: ${t.boundaryColor};
		stroke-width: ${t.boundaryWidth};
		stroke-dasharray: 6 3;
	}
	.cynefinCliff {
		stroke: ${t.cliffColor};
		stroke-width: ${t.cliffWidth};
	}
	.cynefinConfusion {
		stroke: ${t.boundaryColor};
		stroke-width: 1.5;
		stroke-dasharray: 4 2;
	}
	.cynefinArrowLine {
		stroke: ${t.arrowColor};
		stroke-width: ${t.arrowWidth};
		fill: none;
	}
	.cynefinArrowHead {
		fill: ${t.arrowColor};
		stroke: none;
	}
	.cynefinArrowLabel {
		font-size: ${t.itemFontSize-1}px;
		fill: ${t.textColor};
	}
	.cynefinTitle {
		font-size: ${t.domainFontSize+2}px;
		font-weight: bold;
		fill: ${t.labelColor};
	}
	`},"styles");a.d(e,{},{diagram:{parser:h,db:m,renderer:{draw:B},styles:M}})}};