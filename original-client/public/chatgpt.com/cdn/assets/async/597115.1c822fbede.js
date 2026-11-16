export const __rspack_esm_ids=[597115];export const __webpack_modules__={jtwM(t,e,a){function r(t,e){t.accDescr&&e.setAccDescription?.(t.accDescr),t.accTitle&&e.setAccTitle?.(t.accTitle),t.title&&e.setDiagramTitle?.(t.title)}(0,a("xXFi").b)(r,"populateCommonDb"),a.d(e,{},{a:r})},Fiqa(t,e,a){var r=a("jtwM"),i=a("FdcH"),o=a("siJ7"),l=a("Z9t6"),s=a("doxX"),c=a("xXFi"),n=a("wG3j"),d=l.l.packet,p=class{constructor(){this.packet=[],this.setAccTitle=l.Q,this.getAccTitle=l.s,this.setDiagramTitle=l.T,this.getDiagramTitle=l.x,this.getAccDescription=l.r,this.setAccDescription=l.P}static #t=(0,c.b)(this,"PacketDB");getConfig(){let t=(0,o.e)({...d,...(0,l.t)().packet});return t.showBits&&(t.paddingY+=10),t}getPacket(){return this.packet}pushWord(t){t.length>0&&this.packet.push(t)}clear(){(0,l.e)(),this.packet=[]}},b=(0,c.b)((t,e)=>{(0,r.a)(t,e);let a=-1,i=[],o=1,{bitsPerRow:l}=e.getConfig();for(let{start:r,end:c,bits:n,label:d}of t.blocks){if(void 0!==r&&void 0!==c&&c<r)throw Error(`Packet block ${r} - ${c} is invalid. End must be greater than start.`);if((r??=a+1)!==a+1)throw Error(`Packet block ${r} - ${c??r} is not contiguous. It should start from ${a+1}.`);if(0===n)throw Error(`Packet block ${r} is invalid. Cannot have a zero bit field.`);for(c??=r+(n??1)-1,n??=c-r+1,a=c,s.a.debug(`Packet block ${r} - ${a} with label ${d}`);i.length<=l+1&&e.getPacket().length<1e4;){let[t,a]=h({start:r,end:c,bits:n,label:d},o,l);if(i.push(t),t.end+1===o*l&&(e.pushWord(i),i=[],o++),!a)break;({start:r,end:c,bits:n,label:d}=a)}}e.pushWord(i)},"populate"),h=(0,c.b)((t,e,a)=>{if(void 0===t.start)throw Error("start should have been set during first phase");if(void 0===t.end)throw Error("end should have been set during first phase");if(t.start>t.end)throw Error(`Block start ${t.start} is greater than block end ${t.end}.`);if(t.end+1<=e*a)return[t,void 0];let r=e*a-1,i=e*a;return[{start:t.start,end:r,label:t.label,bits:r-t.start},{start:i,end:t.end,label:t.label,bits:t.end-i}]},"getNextFittingBlock"),k={parser:{yy:void 0},parse:(0,c.b)(async t=>{let e=await (0,n.g)("packet",t),a=k.parser?.yy;if(!(a instanceof p))throw Error("parser.parser?.yy was not a PacketDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues.");s.a.debug(e),b(e,a)},"parse")},g=(0,c.b)((t,e,a,r)=>{let o=r.db,s=o.getConfig(),{rowHeight:c,paddingY:n,bitWidth:d,bitsPerRow:p}=s,b=o.getPacket(),h=o.getDiagramTitle(),k=c+n,g=k*(b.length+1)-(h?0:c),u=d*p+2,x=(0,i.a)(e);for(let[t,e]of(x.attr("viewBox",`0 0 ${u} ${g}`),(0,l.h)(x,g,u,s.useMaxWidth),b.entries()))f(x,e,t,s);x.append("text").text(h).attr("x",u/2).attr("y",g-k/2).attr("dominant-baseline","middle").attr("text-anchor","middle").attr("class","packetTitle")},"draw"),f=(0,c.b)((t,e,a,r)=>{let{rowHeight:i,paddingX:o,paddingY:l,bitWidth:s,bitsPerRow:c,showBits:n}=r,d=t.append("g"),p=a*(i+l)+l;for(let t of e){let e=t.start%c*s+1,a=(t.end-t.start+1)*s-o;if(d.append("rect").attr("x",e).attr("y",p).attr("width",a).attr("height",i).attr("class","packetBlock"),d.append("text").attr("x",e+a/2).attr("y",p+i/2).attr("class","packetLabel").attr("dominant-baseline","middle").attr("text-anchor","middle").text(t.label),!n)continue;let r=t.end===t.start,l=p-2;d.append("text").attr("x",e+(r?a/2:0)).attr("y",l).attr("class","packetByte start").attr("dominant-baseline","auto").attr("text-anchor",r?"middle":"start").text(t.start),r||d.append("text").attr("x",e+a).attr("y",l).attr("class","packetByte end").attr("dominant-baseline","auto").attr("text-anchor","end").text(t.end)}},"drawWord"),u={byteFontSize:"10px",startByteColor:"black",endByteColor:"black",labelColor:"black",labelFontSize:"12px",titleColor:"black",titleFontSize:"14px",blockStrokeColor:"black",blockStrokeWidth:"1",blockFillColor:"#efefef"},x=(0,c.b)(function(){let{packet:t}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},e=(0,o.e)(u,t);return`
	.packetByte {
		font-size: ${e.byteFontSize};
	}
	.packetByte.start {
		fill: ${e.startByteColor};
	}
	.packetByte.end {
		fill: ${e.endByteColor};
	}
	.packetLabel {
		fill: ${e.labelColor};
		font-size: ${e.labelFontSize};
	}
	.packetTitle {
		fill: ${e.titleColor};
		font-size: ${e.titleFontSize};
	}
	.packetBlock {
		stroke: ${e.blockStrokeColor};
		stroke-width: ${e.blockStrokeWidth};
		fill: ${e.blockFillColor};
	}
	`},"styles");a.d(e,{},{diagram:{parser:k,get db(){return new p},renderer:{draw:g},styles:x}})}};