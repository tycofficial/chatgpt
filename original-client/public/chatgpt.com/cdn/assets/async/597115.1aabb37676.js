export const __rspack_esm_ids=[597115];export const __webpack_modules__={jtwM(a,b,c){function d(a,b){a.accDescr&&b.setAccDescription?.(a.accDescr),a.accTitle&&b.setAccTitle?.(a.accTitle),a.title&&b.setDiagramTitle?.(a.title)}(0,c("xXFi").b)(d,"populateCommonDb"),c.d(b,{},{a:d})},Fiqa(a,b,c){var d=c("jtwM"),e=c("FdcH"),f=c("siJ7"),g=c("Z9t6"),h=c("doxX"),i=c("xXFi"),j=c("wG3j"),k=g.l.packet,l=class{constructor(){this.packet=[],this.setAccTitle=g.Q,this.getAccTitle=g.s,this.setDiagramTitle=g.T,this.getDiagramTitle=g.x,this.getAccDescription=g.r,this.setAccDescription=g.P}static #a=(0,i.b)(this,"PacketDB");getConfig(){let a=(0,f.e)({...k,...(0,g.t)().packet});return a.showBits&&(a.paddingY+=10),a}getPacket(){return this.packet}pushWord(a){a.length>0&&this.packet.push(a)}clear(){(0,g.e)(),this.packet=[]}},m=(0,i.b)((a,b)=>{(0,d.a)(a,b);let c=-1,e=[],f=1,{bitsPerRow:g}=b.getConfig();for(let{start:d,end:i,bits:j,label:k}of a.blocks){if(void 0!==d&&void 0!==i&&i<d)throw Error(`Packet block ${d} - ${i} is invalid. End must be greater than start.`);if((d??=c+1)!==c+1)throw Error(`Packet block ${d} - ${i??d} is not contiguous. It should start from ${c+1}.`);if(0===j)throw Error(`Packet block ${d} is invalid. Cannot have a zero bit field.`);for(i??=d+(j??1)-1,j??=i-d+1,c=i,h.a.debug(`Packet block ${d} - ${c} with label ${k}`);e.length<=g+1&&b.getPacket().length<1e4;){let[a,c]=n({start:d,end:i,bits:j,label:k},f,g);if(e.push(a),a.end+1===f*g&&(b.pushWord(e),e=[],f++),!c)break;({start:d,end:i,bits:j,label:k}=c)}}b.pushWord(e)},"populate"),n=(0,i.b)((a,b,c)=>{if(void 0===a.start)throw Error("start should have been set during first phase");if(void 0===a.end)throw Error("end should have been set during first phase");if(a.start>a.end)throw Error(`Block start ${a.start} is greater than block end ${a.end}.`);if(a.end+1<=b*c)return[a,void 0];let d=b*c-1,e=b*c;return[{start:a.start,end:d,label:a.label,bits:d-a.start},{start:e,end:a.end,label:a.label,bits:a.end-e}]},"getNextFittingBlock"),o={parser:{yy:void 0},parse:(0,i.b)(async a=>{let b=await (0,j.g)("packet",a),c=o.parser?.yy;if(!(c instanceof l))throw Error("parser.parser?.yy was not a PacketDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues.");h.a.debug(b),m(b,c)},"parse")},p=(0,i.b)((a,b,c,d)=>{let f=d.db,h=f.getConfig(),{rowHeight:i,paddingY:j,bitWidth:k,bitsPerRow:l}=h,m=f.getPacket(),n=f.getDiagramTitle(),o=i+j,p=o*(m.length+1)-(n?0:i),r=k*l+2,s=(0,e.a)(b);for(let[a,b]of(s.attr("viewBox",`0 0 ${r} ${p}`),(0,g.h)(s,p,r,h.useMaxWidth),m.entries()))q(s,b,a,h);s.append("text").text(n).attr("x",r/2).attr("y",p-o/2).attr("dominant-baseline","middle").attr("text-anchor","middle").attr("class","packetTitle")},"draw"),q=(0,i.b)((a,b,c,d)=>{let{rowHeight:e,paddingX:f,paddingY:g,bitWidth:h,bitsPerRow:i,showBits:j}=d,k=a.append("g"),l=c*(e+g)+g;for(let a of b){let b=a.start%i*h+1,c=(a.end-a.start+1)*h-f;if(k.append("rect").attr("x",b).attr("y",l).attr("width",c).attr("height",e).attr("class","packetBlock"),k.append("text").attr("x",b+c/2).attr("y",l+e/2).attr("class","packetLabel").attr("dominant-baseline","middle").attr("text-anchor","middle").text(a.label),!j)continue;let d=a.end===a.start,g=l-2;k.append("text").attr("x",b+(d?c/2:0)).attr("y",g).attr("class","packetByte start").attr("dominant-baseline","auto").attr("text-anchor",d?"middle":"start").text(a.start),d||k.append("text").attr("x",b+c).attr("y",g).attr("class","packetByte end").attr("dominant-baseline","auto").attr("text-anchor","end").text(a.end)}},"drawWord"),r={byteFontSize:"10px",startByteColor:"black",endByteColor:"black",labelColor:"black",labelFontSize:"12px",titleColor:"black",titleFontSize:"14px",blockStrokeColor:"black",blockStrokeWidth:"1",blockFillColor:"#efefef"},s=(0,i.b)(function(){let{packet:a}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},b=(0,f.e)(r,a);return`
	.packetByte {
		font-size: ${b.byteFontSize};
	}
	.packetByte.start {
		fill: ${b.startByteColor};
	}
	.packetByte.end {
		fill: ${b.endByteColor};
	}
	.packetLabel {
		fill: ${b.labelColor};
		font-size: ${b.labelFontSize};
	}
	.packetTitle {
		fill: ${b.titleColor};
		font-size: ${b.titleFontSize};
	}
	.packetBlock {
		stroke: ${b.blockStrokeColor};
		stroke-width: ${b.blockStrokeWidth};
		fill: ${b.blockFillColor};
	}
	`},"styles");c.d(b,{},{diagram:{parser:o,get db(){return new l},renderer:{draw:p},styles:s}})}};