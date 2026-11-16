export const __rspack_esm_ids=[938689];export const __webpack_modules__={jtwM(e,t,a){function i(e,t){e.accDescr&&t.setAccDescription?.(e.accDescr),e.accTitle&&t.setAccTitle?.(e.accTitle),e.title&&t.setDiagramTitle?.(e.title)}(0,a("xXFi").b)(i,"populateCommonDb"),a.d(t,{},{a:i})},MooM(e,t,a){var i=a("jtwM"),l=a("FdcH"),r=a("siJ7"),n=a("Z9t6"),o=a("doxX"),s=a("xXFi"),c=a("wG3j"),d=a("vdWB"),p=n.l.pie,h={sections:new Map,showData:!1,config:p},g=h.sections,u=h.showData,f=structuredClone(p),m=(0,s.b)(()=>structuredClone(f),"getConfig"),x=(0,s.b)(()=>{g=new Map,u=h.showData,(0,n.e)()},"clear"),b=(0,s.b)(e=>{let{label:t,value:a}=e;if(a<0)throw Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);g.has(t)||(g.set(t,a),o.a.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),w=(0,s.b)(()=>g,"getSections"),$=(0,s.b)(e=>{u=e},"setShowData"),S=(0,s.b)(()=>u,"getShowData"),y={getConfig:m,clear:x,setDiagramTitle:n.T,getDiagramTitle:n.x,setAccTitle:n.Q,getAccTitle:n.s,setAccDescription:n.P,getAccDescription:n.r,addSection:b,getSections:w,setShowData:$,getShowData:S},T=(0,s.b)((e,t)=>{(0,i.a)(e,t),t.setShowData(e.showData),e.sections.map(t.addSection)},"populateDb"),v={parse:(0,s.b)(async e=>{let t=await (0,c.g)("pie",e);o.a.debug(t),T(t,y)},"parse")},D=(0,s.b)(e=>`
  .pieCircle{
    stroke: ${e.pieStrokeColor};
    stroke-width : ${e.pieStrokeWidth};
    opacity : ${e.pieOpacity};
  }
  .pieCircle.highlighted{
    scale: 1.05;
    opacity: 1;
  }
  .pieCircle.highlightedOnHover:hover{
    transition-duration: 250ms;
    scale: 1.05;
    opacity: 1;
  }
  .pieOuterCircle{
    stroke: ${e.pieOuterStrokeColor};
    stroke-width: ${e.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${e.pieTitleTextSize};
    fill: ${e.pieTitleTextColor};
    font-family: ${e.fontFamily};
  }
  .slice {
    font-family: ${e.fontFamily};
    fill: ${e.pieSectionTextColor};
    font-size:${e.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${e.pieLegendTextColor};
    font-family: ${e.fontFamily};
    font-size: ${e.pieLegendTextSize};
  }
`,"getStyles"),C=(0,s.b)(e=>{let t=[...e.values()].reduce((e,t)=>e+t,0),a=[...e.entries()].map(e=>{let[t,a]=e;return{label:t,value:a}}).filter(e=>e.value/t*100>=1);return(0,d.D)().value(e=>e.value).sort(null)(a)},"createPieArcs"),k=(0,s.b)((e,t,a,i)=>{o.a.debug("rendering pie chart\n"+e);let s=i.db,c=(0,n.u)(),p=(0,r.e)(s.getConfig(),c.pie),h=(0,l.a)(t),g=h.append("g");g.attr("transform","translate(225,225)");let{themeVariables:u}=c,[f]=(0,r.n)(u.pieOuterStrokeWidth);f??=2;let m=p.legendPosition,x=p.textPosition,b=p.donutHole>0&&p.donutHole<=.9?p.donutHole:0,w=(0,d.a)().innerRadius(185*b).outerRadius(185),$=(0,d.a)().innerRadius(185*x).outerRadius(185*x),S=g.append("g");S.append("circle").attr("cx",0).attr("cy",0).attr("r",185+f/2).attr("class","pieOuterCircle");let y=s.getSections(),T=C(y),v=[u.pie1,u.pie2,u.pie3,u.pie4,u.pie5,u.pie6,u.pie7,u.pie8,u.pie9,u.pie10,u.pie11,u.pie12],D=0;y.forEach(e=>{D+=e});let k=T.filter(e=>"0"!==(e.data.value/D*100).toFixed(0)),A=(0,d.G)(v).domain([...y.keys()]);S.selectAll("mySlices").data(k).enter().append("path").attr("d",w).attr("fill",e=>A(e.data.label)).attr("class",e=>{let t="pieCircle";return"hover"===p.highlightSlice?t+=" highlightedOnHover":p.highlightSlice===e.data.label&&(t+=" highlighted"),t}),S.selectAll("mySlices").data(k).enter().append("text").text(e=>(e.data.value/D*100).toFixed(0)+"%").attr("transform",e=>"translate("+$.centroid(e)+")").style("text-anchor","middle").attr("class","slice");let M=g.append("text").text(s.getDiagramTitle()).attr("x",0).attr("y",-200).attr("class","pieTitleText"),_=[...y.entries()].map(e=>{let[t,a]=e;return{label:t,value:a}}),F=g.selectAll(".legend").data(_).enter().append("g").attr("class","legend");F.append("rect").attr("width",18).attr("height",18).style("fill",e=>A(e.label)).style("stroke",e=>A(e.label)),F.append("text").attr("x",22).attr("y",14).text(e=>s.getShowData()?`${e.label} [${e.value}]`:e.label);let O=Math.max(...F.selectAll("text").nodes().map(e=>e?.getBoundingClientRect().width??0)),z=450,H=490,R=22*_.length;switch(m){case"center":F.attr("transform",(e,t)=>"translate("+(-O/2-22)+","+(22*t-22*_.length/2)+")");break;case"top":z+=R,F.attr("transform",(e,t)=>`translate(${-O/2-22}, ${22*t-185})`),S.attr("transform",()=>`translate(0, ${R+22})`);break;case"bottom":z+=R,F.attr("transform",(e,t)=>"translate("+(-O/2-22)+","+(22*t- -207)+")");break;case"left":H+=22+O,F.attr("transform",(e,t)=>"translate(-207,"+(22*t-22*_.length/2)+")"),S.attr("transform",()=>`translate(${O+18+4}, 0)`);break;default:H+=22+O,F.attr("transform",(e,t)=>"translate(216,"+(22*t-22*_.length/2)+")")}let W=M.node()?.getBoundingClientRect().width??0,B=Math.min(0,225-W/2),P=Math.max(H,225+W/2)-B;h.attr("viewBox",`${B} 0 ${P} ${z}`),(0,n.h)(h,z,P,p.useMaxWidth)},"draw");a.d(t,{},{diagram:{parser:v,db:y,renderer:{draw:k},styles:D}})}};