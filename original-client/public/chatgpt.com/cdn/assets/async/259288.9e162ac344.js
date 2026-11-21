export const __rspack_esm_ids=[259288];export const __webpack_modules__={l4HN(a,b,c){c.d(b,{a:()=>l});var d=c("ABep"),e=c("Me4D"),f=c("X09v"),g=c("Y8kU"),h=c("zd8w"),i="Hint-A29dc9",j="Feedback-gTEVao",k=c("FIwD");function l(a){let{activeKey:b,ariaLabel:c,backFace:f,children:i,disabled:l=!1,dismissDirection:q,faceBackground:r,flipped:s=!1,hint:t,isMobile:u=!1,onboardingStep:v,onInteractionChange:w,onSwipeProgress:x,onSwipeLeft:y,onSwipeRight:z,reducedMotion:A=!1,restoreDirection:B,shuffleKey:C,swipeLeftColor:D="#ee7c37",swipeRightColor:E="#53b559"}=a,F=h.Children.toArray(i),G=(0,h.useContext)(e.k),H=(0,h.useRef)(null),I=(0,h.useRef)(null),J=(0,h.useRef)(null),K=(0,h.useRef)(!1),L=(0,h.useRef)(0),M=(0,h.useRef)(null),N=(0,h.useRef)(C),O=(0,h.useRef)({activeKey:b,flipped:s}),P=(0,h.useRef)(null),Q=(0,h.useRef)(null),R=(0,h.useRef)({drag:!1,motion:!1,flip:!1}),[S,T]=(0,h.useState)(null),U=S?.kind==="outgoing"?S:null,[V,W]=(0,h.useState)(!1),X=(0,g.a)(w),Y=(0,g.a)(x),Z=(0,h.useRef)(0),$=(0,e.B)(),_=(0,h.useCallback)((a,b)=>{if(R.current[a]===b)return;let c=Object.values(R.current).some(Boolean);R.current[a]=b,"flip"===a&&W(b);let d=Object.values(R.current).some(Boolean);c!==d&&I.current&&X.current?.(d)},[X]),aa=(0,h.useCallback)(a=>{Z.current!==a&&(Z.current=a,I.current&&Y.current?.(a))},[Y]),ab=(0,h.useCallback)(()=>{J.current=null,I.current?.removeAttribute("data-d-dragging"),I.current?.removeAttribute("data-d-swipe-direction"),I.current?.style.removeProperty("--swipe-progress"),H.current?.style.removeProperty("transform"),aa(0)},[aa]);(0,h.useLayoutEffect)(()=>{let a=M.current,c=N.current;if(N.current=C,M.current={key:b,front:F[0],backFace:f,flipped:s,hint:t},!a||a.key===b)return;null!==P.current&&clearTimeout(P.current);let d=A||p(),e=void 0!==C&&void 0!==c&&C!==c&&F.length>1,g=e?"shuffle":q;if((B||g)&&!d){let b=((B??g)==="left"?-1:1)*(o(I.current)?-1:1);B?T({kind:"restoring",exitSign:b}):g&&T({...a,kind:"outgoing",direction:g,exitSign:b,x:J.current?.x??0,rotation:J.current?.rotation??0,progress:J.current?.progress??0}),_("motion",!0),P.current=setTimeout(()=>{P.current=null,K.current=!1,T(null),_("motion",!1)},e||B?300:240)}else T(null),K.current=!1,_("motion",!1);_("drag",!1),ab()},[b,f,F,q,s,t,A,B,C,ab,_]),(0,h.useLayoutEffect)(()=>{let a=O.current;if(O.current={activeKey:b,flipped:s},a.activeKey!==b||a.flipped!==s||A){if(null!==Q.current&&clearTimeout(Q.current),a.activeKey!==b||A||p())return void _("flip",!1);_("flip",!0),Q.current=setTimeout(()=>{Q.current=null,_("flip",!1)},300)}},[b,s,A,_]),(0,h.useEffect)(()=>()=>{null!==P.current&&clearTimeout(P.current),null!==Q.current&&clearTimeout(Q.current)},[]),(0,h.useEffect)(()=>{let a=H.current;if(!a||l)return;let b=a=>{a.cancelable&&J.current&&a.preventDefault()};return a.addEventListener("touchmove",b,{passive:!1}),()=>a.removeEventListener("touchmove",b)},[l]);let ac={key:b,front:F[0],backFace:f,flipped:s,hint:t};return(0,d.jsxs)("div",{"aria-label":c,className:"Stack-zOo8Ew","data-d-component":"swipe-stack","data-scroll-anchor-boundary":"","data-d-disabled":l?"":void 0,"data-d-dismissing":U&&"shuffle"!==U.direction?"":void 0,"data-d-flipping":V?"":void 0,"data-d-mobile":u?"":void 0,"data-d-onboarding-step":l||s||null!==S||V?void 0:v,"data-d-reduced-motion":A?"":void 0,"data-d-restoring":S?.kind==="restoring"?"":void 0,"data-d-shuffling":U?.direction==="shuffle"?"":void 0,onClickCapture:a=>{0===a.detail||Date.now()>=L.current||(a.preventDefault(),a.stopPropagation())},ref:I,role:c?"group":void 0,style:{"--swipe-card-background":(0,k.j)(G,r),"--swipe-left-color":(0,k.c)((0,k.j)(G,D),G),"--swipe-right-color":(0,k.c)((0,k.j)(G,E),G),"--swipe-release-progress":U?.progress??0,"--swipe-exit-sign":S?.exitSign},children:[(0,d.jsx)(m,{options:{disabled:l||null!==S||V,enabled:!!(y||z),interactive:!0,targetRef:H,onDragStart:()=>{K.current||(I.current?.setAttribute("data-d-dragging",""),_("drag",!0))},onDragMove:a=>{if(K.current)return;J.current=a;let b=o(I.current)?"left"===a.direction?"right":"left":a.direction;if(I.current?.setAttribute("data-d-swipe-direction",b),I.current?.style.setProperty("--swipe-progress",String(a.progress)),aa(("left"===b?-1:1)*Math.round(16*a.progress)),H.current){let b=A||p()?0:a.rotation;H.current.style.transform=`translateX(${a.x}px) rotate(${b}deg)`}},onDragEnd:()=>{L.current=Date.now()+350,K.current||(ab(),_("drag",!1))},onSwipe:a=>{if(K.current)return;let b=o(I.current)?1!==a:1===a,c=b?y:z;c&&(K.current=!0,P.current=setTimeout(()=>{P.current=null,K.current=!1,ab(),_("drag",!1)},240),$({target:"swipe_stack",value:b?"left":"right"},(0,e.q)(c)))}}},b),F.slice(1,3).map((a,b)=>(0,d.jsx)("div",{"aria-hidden":!0,className:"Upcoming-KxQyqU","data-d-stack-depth":b+1,inert:!0,style:{"--stack-depth":b+1},children:a},b)),(0,d.jsxs)("div",{className:"Active-EPqlrj",inert:l||null!==S,ref:H,children:[(0,d.jsx)(n,{card:ac},b),(0,d.jsx)("div",{"aria-hidden":!0,className:j})]}),U&&(0,d.jsxs)("div",{"aria-hidden":!0,className:"Outgoing-dE535Z","data-d-swipe-direction":U.direction,inert:!0,style:{"--swipe-from-x":`${U.x}px`,"--swipe-from-rotation":`${U.rotation}deg`},children:[(0,d.jsx)(n,{card:U}),(0,d.jsx)("div",{className:j})]},U.key)]})}function m(a){let{options:b}=a;return(0,f.a)(b),null}function n(a){let{card:b}=a;return(0,d.jsx)("div",{className:"Perspective-qPcV_U",children:(0,d.jsx)("div",{className:"Lift-T0dpn8",children:(0,d.jsxs)("div",{className:"Flipper-vwLguv","data-d-flipped":b.flipped?"":void 0,children:[(0,d.jsxs)("div",{"aria-hidden":b.flipped,className:"Front-mxzZaf",inert:b.flipped,children:[b.front,!b.flipped&&b.hint&&(0,d.jsx)("div",{className:i,children:b.hint})]}),b.backFace&&(0,d.jsxs)("div",{"aria-hidden":!b.flipped,className:"Back-F0cksA",inert:!b.flipped,children:[b.backFace,b.flipped&&b.hint&&(0,d.jsx)("div",{className:i,children:b.hint})]})]})})})}function o(a){return null!==a&&"rtl"===window.getComputedStyle(a).direction}function p(){return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===!0}},TZvG(a,b,c){let d;c.d(b,{a:()=>ah.a,b:()=>ce,c:()=>at.a,d:()=>aA.a,e:()=>a7,f:()=>bs,g:()=>bD.a,h:()=>w,i:()=>cd.b});var e=c("ABep"),f=c("Me4D"),g=c("Exc7"),h=c("IFpk"),i=c("zd8w");function j(a){return{dimension:a.dimension,enter:k(a.enter),exit:k(a.exit),forceCompositeLayer:a.forceCompositeLayer,hideOverflow:a.hideOverflow,initial:k(a.initial),insertMethod:a.insertMethod,itemAnchor:a.itemAnchor,layoutEnter:a.layoutEnter,layoutExit:a.layoutExit,layoutMove:a.layoutMove,preventInitialTransition:a.preventInitialTransition}}function k(a){if(!a)return;let{translateX:b,translateY:c,...d}=a;return{...d,x:b,y:c}}var l=c("SRgp"),m=c("FIwD");function n(a){let{children:b,color:c,label:d,maxWidth:g,onHover:h,padding:j,pill:k=!0,size:n,variant:o,weight:p="medium"}=a,q=(0,i.useContext)(f.k),r=function(a){switch(a){case"secondary":return"secondary";case"success":return"success";case"danger":return"danger";case"warning":return"warning";case"info":return"info";case"discovery":return"discovery";default:return}}(c),s=null==r?c:void 0,t="number"==typeof j||"string"==typeof j||j?.bottom!=null||j?.top!=null||j?.y!=null,u={className:"Badge-v4RzAb",color:r,"data-d-component":"badge","data-d-hoverable":h?"":void 0,"data-d-weight":p,pill:k,size:n,style:{...(0,m.g)(j),maxWidth:g,...null==s?{}:{backgroundColor:(0,m.c)((0,m.j)(q,s),q)},...t?{height:"auto"}:{}},variant:o,...null==h?{}:{onMouseEnter:()=>h(!0),onMouseLeave:()=>h(!1)}},v=l.a;return(0,e.jsx)(v,{className:u.className,color:u.color,"data-d-component":u["data-d-component"],"data-d-hoverable":u["data-d-hoverable"],"data-d-weight":u["data-d-weight"],onMouseEnter:u.onMouseEnter,onMouseLeave:u.onMouseLeave,pill:u.pill,size:u.size,style:u.style,variant:u.variant,children:b??d??null})}var o=c("afoa"),p=c("MBDE"),q=c("zsAy"),r=c("BnEr"),s=c("BNR2"),t=c("ZpWd");let u=(0,i.createContext)(void 0),v=(0,i.createContext)(function(a){let{children:b,content:c}=a;return(0,e.jsx)(t.a,{compact:!0,content:c,children:b})});function w(a){let{children:b,component:c}=a;return(0,e.jsx)(v.Provider,{value:c,children:b})}function x(a){let{children:b,content:c,disabled:d,theme:g}=a,h=(0,i.useContext)(u),j=(0,i.useContext)(f.k),k=(0,i.useContext)(v),l=c??(d?void 0:h);return(0,e.jsx)(u.Provider,{value:void 0,children:l?(0,e.jsx)(k,{content:l,theme:g??j,children:b}):b})}var y=c("InHZ");function z(a){let{block:b,children:c,color:d="primary",disabled:g,label:h,loading:i,onClick:j,pill:k=!0,size:l="lg",submit:m,uniform:n,variant:o="solid"}=a,p=(0,f.B)(),q=(0,e.jsx)(s.a,{"aria-label":null!=c?h:void 0,block:b,color:d,className:"Button-MC8eGf",disabled:g,loading:i,onClick:a=>{a.stopPropagation(),p(y.a.button,(0,f.q)(j))},pill:k,size:l,type:m?"submit":"button",uniform:n,variant:o,"data-d-component":"button","data-d-block":b?"":void 0,children:c??h});return(0,e.jsx)(x,{disabled:g,children:q})}var A=c("kpww"),B=c("LpLF"),C=c("y1Va"),D=c("McuO"),E=c("on57"),F=c("eZy0"),G="ScrollControl-YDDGoO",H="ScrollControlLeft-elEPbh",I="ScrollControlRight-qWugKc";let J=["class","style","dir","data-d-column-sizing","data-d-direction","data-d-scrollable"];function K(a){let{viewportRef:b}=a,[c,d]=(0,i.useState)();return(0,i.useEffect)(()=>{let a=b.current;if(null==a)return;let c=()=>{let b=getComputedStyle(a),c="auto"===b.overflowX||"scroll"===b.overflowX,e=Math.max(0,a.scrollWidth-a.clientWidth),f="rtl"===b.direction,g=Math.min(e,Math.max(0,f?-a.scrollLeft:a.scrollLeft)),h=c&&g>1,i=c&&e-g>1,j={left:f?i:h,right:f?h:i,x:a.offsetLeft+a.clientLeft,y:a.offsetTop+a.clientTop,width:a.clientWidth,height:a.clientHeight};d(a=>a?.left===j.left&&a.right===j.right&&a.x===j.x&&a.y===j.y&&a.width===j.width&&a.height===j.height?a:j)},e="u"<typeof ResizeObserver?null:new ResizeObserver(c),f=()=>{e?.disconnect(),e?.observe(a),Array.from(a.children).forEach(a=>e?.observe(a))},g="u"<typeof ResizeObserver?null:new ResizeObserver(c);g?.observe(a,{box:"border-box"});let h="u"<typeof MutationObserver?null:new MutationObserver(()=>{f(),c()});h?.observe(a,{attributes:!0,attributeFilter:J,childList:!0,characterData:!0,subtree:!0});for(let b=a.parentElement;null!=b;b=b.parentElement)h?.observe(b,{attributes:!0,attributeFilter:J});return f(),c(),a.addEventListener("scroll",c,{passive:!0}),a.addEventListener("load",c,!0),window.addEventListener("resize",c),()=>{e?.disconnect(),g?.disconnect(),h?.disconnect(),a.removeEventListener("scroll",c),a.removeEventListener("load",c,!0),window.removeEventListener("resize",c)}},[b]),(0,e.jsx)("div",{"aria-hidden":"true",className:"Edges-nCUHEi","data-d-overflow-left":c?.left?"":void 0,"data-d-overflow-right":c?.right?"":void 0,style:null==c?void 0:{left:c.x,top:c.y,width:c.width,height:c.height}})}let L={lg:"220px",sm:"140px"},M=(0,i.createContext)({});function N(a){let{aspectRatio:b,background:c,border:d,children:f,component:g,gap:h,height:j,maxHeight:k,maxWidth:l,minHeight:m,minWidth:n,padding:o,radius:p,variant:q="none",width:r}=a,{itemWidth:s,snapAlign:t="start"}=(0,i.useContext)(M),u="outline"===q||"elevated"===q,v=r??s,w=n??v;return(0,e.jsx)(F.a,{aspectRatio:b,as:"div",background:c??("soft"===q?"surface-elevated-secondary":"elevated"===q?"surface":void 0),border:d??(u?{color:"default",size:1}:void 0),className:"Item-NS27Bq",clip:"none"!==q,component:g,flex:"0 0 auto",gap:h,height:j,maxHeight:k,maxWidth:l,minHeight:m,minWidth:w,padding:o??("none"===q?void 0:4),radius:p??("none"===q?void 0:"xl"),role:"listitem",snapAlign:t,variant:q,width:v,children:f})}function O(a){return Array.from(a.children).filter(a=>a instanceof HTMLElement)}function P(a,b,c){return"rtl"===c?b.right-a.right:a.left-b.left}function Q(a){let b=Number.parseFloat(a);return Number.isFinite(b)?b:0}function R(a){return{textDirection:"rtl"===getComputedStyle(a).direction?"rtl":"ltr",carouselRect:a.getBoundingClientRect(),alignedInlineStart:Q(getComputedStyle(a).scrollPaddingInlineStart),items:O(a)}}function S(a){let b=R(a),c=b.items.at(0);if(null==c)return{...b,currentOffset:0,itemOffsets:[],maxScrollOffset:0};let d=P(c.getBoundingClientRect(),b.carouselRect,b.textDirection),e=b.items.map(a=>Math.abs(P(a.getBoundingClientRect(),b.carouselRect,b.textDirection)-d));return{...b,currentOffset:b.alignedInlineStart-d,itemOffsets:e,maxScrollOffset:Math.max(0,a.scrollWidth-a.clientWidth)}}function T(a,b){let c,d=1/0;return a.forEach((a,e)=>{let f=Math.abs(a-b);f<d&&(c=e,d=f)}),c}function U(){return"u">typeof window&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches===!0}var V=c("TxZP"),W=c("f8Zl"),X=c("TE73"),Y=c("mQlD"),Z=c("GdAf"),$="Image-S6ohsd";function _(a){let{alt:b,frame:c=!1,inline:d=!1,size:g,url:h}=a,j=(0,i.useContext)(f.d),k=(0,X.b)(h??"",32),l=g??(d?"1em":12);return k?(0,e.jsxs)(F.a,{as:"div",className:"FaviconBox-doeXm2",component:"favicon",height:l,inline:d,role:"presentation",width:l,children:[j?(0,e.jsx)(Y.default,{"aria-hidden":!b||void 0,"aria-label":b,className:$,role:b?"img":void 0,style:{color:"var(--color-text-secondary)"}}):(0,e.jsx)(Z.a,{alt:b,className:$,forceRenderAfterLoadFail:!0,src:k}),c?(0,e.jsx)("div",{"aria-hidden":"true",className:"Frame-cpg5w_"}):null]}):null}var aa=c("gcGr");let ab=l.a,ac=[{left:83,top:6.7,color:"blue-400",size:7,vx:-138.7,vy:-234.1,ax:85.9,ay:376.3,flip:5.1,phase:0,life:3.9},{left:129.4,top:7.2,color:"blue-400",size:8,vx:78.3,vy:-363.2,ax:-60.4,ay:431.9,flip:7.4,phase:.71,life:3.55},{left:123.6,top:27.9,color:"blue-400",size:7,vx:-175.6,vy:-173,ax:137.5,ay:346.5,flip:6.2,phase:1.42,life:3.65},{left:138,top:38.7,color:"blue-400",size:6,vx:80.9,vy:-183.2,ax:-38.7,ay:347.2,flip:8.5,phase:2.13,life:3.4},{left:103.3,top:46.4,color:"blue-400",size:8,vx:27,vy:-301.7,ax:-27.9,ay:422.8,flip:4.8,phase:2.84,life:3.75},{left:100.8,top:52.6,color:"blue-400",size:7,vx:141.9,vy:-302.1,ax:-100.4,ay:349.2,flip:7.8,phase:3.55,life:3.95},{left:78.1,top:58.5,color:"blue-400",size:6,vx:29.1,vy:-302.5,ax:-44.6,ay:400.4,flip:9.1,phase:4.26,life:3.35},{left:120.6,top:60.3,color:"blue-400",size:8,vx:-70.8,vy:-286.8,ax:57.6,ay:412.7,flip:5.5,phase:4.97,life:3.8},{left:92.5,top:66.3,color:"blue-400",size:6,vx:-139.9,vy:-295,ax:102,ay:371.9,flip:8.8,phase:5.68,life:3.6},{left:93.2,top:-4.3,color:"pink-400",size:6,vx:79.3,vy:-246.3,ax:-38.9,ay:393.3,flip:6.6,phase:.11,life:3.5},{left:110.1,top:13.1,color:"pink-400",size:7,vx:-59.8,vy:-270.3,ax:64.8,ay:404.3,flip:7.2,phase:.82,life:3.7},{left:75.3,top:14.5,color:"pink-400",size:6,vx:143.3,vy:-228,ax:-110.8,ay:377.5,flip:8.1,phase:1.53,life:3.85},{left:88.5,top:25.9,color:"pink-400",size:7,vx:58.1,vy:-251.3,ax:-50,ay:395.6,flip:5.9,phase:2.24,life:3.45},{left:92.4,top:48.9,color:"pink-400",size:8,vx:150.1,vy:-330.9,ax:-91.5,ay:406.9,flip:9,phase:2.95,life:4},{left:93.2,top:73.6,color:"pink-400",size:7,vx:203.1,vy:-122.5,ax:-133.9,ay:171.6,flip:4.7,phase:3.66,life:3.65},{left:115.1,top:-13,color:"yellow-400",size:6,vx:-187.1,vy:-234.5,ax:130.9,ay:323.5,flip:7.6,phase:4.37,life:3.75},{left:81.8,top:-9.8,color:"yellow-400",size:6,vx:-39.2,vy:-290.4,ax:-1.6,ay:415.9,flip:6,phase:5.08,life:3.55},{left:142.3,top:-7.4,color:"yellow-400",size:8,vx:192.5,vy:-338,ax:-123.6,ay:446.3,flip:8.7,phase:5.79,life:3.85},{left:121.9,top:7.2,color:"yellow-400",size:7,vx:21.9,vy:-203.2,ax:-22.1,ay:268.8,flip:5.3,phase:.21,life:3.95},{left:69.7,top:26,color:"yellow-400",size:8,vx:-152.3,vy:-231.4,ax:82.9,ay:383.3,flip:9.3,phase:.92,life:3.4},{left:102.4,top:34.1,color:"yellow-400",size:6,vx:-1.3,vy:-254.7,ax:-.5,ay:378.9,flip:6.8,phase:1.63,life:3.65},{left:80.1,top:47.2,color:"yellow-400",size:8,vx:-53.7,vy:-248.9,ax:33.9,ay:387.6,flip:7,phase:2.34,life:3.9},{left:71.9,top:54.1,color:"yellow-400",size:7,vx:-77.3,vy:-272.5,ax:24.3,ay:394.1,flip:8.3,phase:3.05,life:3.5},{left:111.2,top:66.2,color:"yellow-400",size:7,vx:-23.2,vy:-217.5,ax:15.9,ay:375.6,flip:5.7,phase:3.76,life:4}],ad={0:{start:.58,end:2.45,top:-1,gravity:260},1:{start:.82,end:2.65,top:-9,gravity:245},9:{start:.6,end:2.8,top:-9,gravity:240},12:{start:.48,end:2.55,top:-9,gravity:250},15:{start:.76,end:2.95,top:-9,gravity:235},17:{start:.77,end:3.1,top:-9,gravity:230}};function ae(){let[a,b]=(0,i.useState)(0);return((0,i.useEffect)(()=>{let a=window.matchMedia("(prefers-reduced-motion: reduce)");if(a.matches)return;let c=Date.now(),d=window.setInterval(()=>{let a=Date.now()-c;b(a),a>=5200&&window.clearInterval(d)},50),e=()=>{a.matches&&(window.clearInterval(d),b(5200))};return a.addEventListener("change",e),()=>{window.clearInterval(d),a.removeEventListener("change",e)}},[]),a<160||a>=5200)?null:(0,e.jsx)("div",{className:"Overlay-v38rbC","aria-hidden":"true","data-celebration-confetti":"true",children:ac.map((b,c)=>{let d,f,g,h,i,j,k,l,m,n;return(0,e.jsx)("span",{className:"Particle-xcMzYe","data-celebration-piece":"true",style:(d=ac[c],g=(f=(a-160)/1e3)<=1?f:1+(f-1)*.6,j=(i=(h=ad[c])&&f>=h.start?f<h.end?h.start:f-(h.end-h.start):f)<=1?i:1+(i-1)/(1+4*(i-1)),k=1.5*(d.left-106+d.vx*j+d.ax*j*j),l=h&&f>=h.start?f<h.end?h.top:h.top+h.gravity*(f-h.end)**2:-38+1.25*(d.top+d.vy*g+d.ay*g*g)+(g>.25&&g<1?42*Math.sin((g-.25)*4.18879):0),m=Math.abs(Math.cos(i*d.flip+d.phase)),n=f<=d.life-.55?1:f>=d.life?0:(d.life-f)/.55,{width:d.size,height:d.size,background:`var(--${d.color})`,left:`calc(50% + ${k}px)`,top:l,transform:`translate(-50%, -50%) rotate(${57.2958*d.phase+i*d.flip*18}deg) ${c%2==0?"scaleX":"scaleY"}(${.12+.88*m})`,opacity:(.65+.35*m)*n})},c)})})}var af=c("Vc7o"),ag=c("Ymsa"),ah=c("Ufhb"),ai=c("TiFH"),aj=c("a0Bm"),ak=c("Y8kU"),al=c("l4HN");let am={light:"var(--color-surface, #fff)",dark:"var(--color-surface, #212121)"};var an=c("xUWq"),ao=c("GQ93"),ap="Root-cIEClf",aq="Frame-WHuLyM";class ar{options;isChildReady=!1;isListening=!1;pendingRequests=new Map;queuedMessages=[];teardownTimer;unregisterTransport;constructor(a){this.options=a}matches(a){return this.options.channelId===a.channelId&&this.options.iframe===a.iframe&&this.options.srcDoc===a.srcDoc&&this.options.token===a.token}updateOptions(a){this.options=a}listen(){this.teardownTimer&&(clearTimeout(this.teardownTimer),this.teardownTimer=void 0),this.isListening||(window.addEventListener("message",this.handleMessage),this.unregisterTransport=this.options.messenger?.registerTransport({command:this.sendCommand,event:this.emitEvent}),this.isListening=!0)}teardown=()=>{this.isListening&&(window.removeEventListener("message",this.handleMessage),this.unregisterTransport?.(),this.unregisterTransport=void 0,this.isListening=!1,this.teardownTimer=setTimeout(()=>{this.teardownTimer=void 0,this.queuedMessages.length=0,this.rejectPending(Error("DIL html-view was unmounted"))},0))};sendToFrame=a=>this.isChildReady?this.postToFrame(a):(this.queuedMessages.push(a),!0);postToFrame(a){let b=this.options.iframe.contentWindow;return!!b&&(b.postMessage({__dilHtmlView:"dil-html-view",channelId:this.options.channelId,token:this.options.token,...a},"*"),!0)}sendCommand=(a,b)=>{let c=as();return new Promise((d,e)=>{this.pendingRequests.set(c,{reject:e,resolve:d}),this.sendToFrame({data:b,id:c,kind:"command",type:a})||(this.pendingRequests.delete(c),e(Error("DIL html-view is not ready")))})};emitEvent=(a,b)=>{this.sendToFrame({data:b,kind:"event",type:a})};handleMessage=a=>{if(a.source!==this.options.iframe.contentWindow)return;let b=a.data;if("dil-html-view"===b.__dilHtmlView&&b.channelId===this.options.channelId&&b.token===this.options.token)switch(b.kind){case"response":this.markChildReady(),function(a,b){if(!a.id)return;let c=b.get(a.id);if(c){if(b.delete(a.id),a.error)return c.reject(Error(a.error.message??"DIL command failed"));c.resolve(a.result)}}(b,this.pendingRequests);return;case"command":this.markChildReady(),async function(a,b,c){if(!a.id||"string"!=typeof a.type)return;let d=b?.commands[a.type];if(!d)return void c({error:{message:`Unknown DILMessenger command "${a.type}"`},id:a.id,kind:"response"});try{let b=await d(a.data);c({id:a.id,kind:"response",result:b})}catch(b){c({error:{message:b instanceof Error?b.message:String(b)},id:a.id,kind:"response"})}}(b,this.options.messenger,this.sendToFrame);return;case"event":this.markChildReady(),"string"==typeof b.type&&this.options.messenger?.onEvent(b.type,b.data);return;case"bridge-ready":this.markChildReady();return;case void 0:return;default:throw Error(`Unknown DIL html-view message kind "${String(b.kind)}"`)}};markChildReady(){this.isChildReady||(this.isChildReady=!0,this.flushQueuedMessages())}flushQueuedMessages(){for(;this.queuedMessages.length>0;){let a=this.queuedMessages.shift();if(!a)return;if(!this.postToFrame(a))return void this.queuedMessages.unshift(a)}}rejectPending(a){for(let b of this.pendingRequests.values())b.reject(a);this.pendingRequests.clear()}}function as(){return globalThis.crypto?.randomUUID?.()??Math.random().toString(36).slice(2)}var at=c("en2n"),au=c("cO2G"),av="Image-BcA3fI",aw="OverlayBox-yeaWuk",ax="LoadingFrame-ljDyDD",ay="Overlay-Ira_zu";function az(a){let{background:b="surface-tertiary",children:c,duration:d=1500,label:f,reducedMotion:g=!1,...h}=a;return(0,e.jsx)(F.a,{as:"div",ariaLabel:f,className:(0,E.b)("LoadingBlock-B3O2RR",null!=c&&"WithContent-UXHFcz",g&&"ReducedMotion-H_W0Iu"),component:"loading-block",layout:{...h,background:null==c?b:void 0,children:null==c?c:(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(F.a,{as:"div",ariaHidden:!0,className:"Background-ENb3Oy",layout:{background:b}}),c]})},role:f?"status":void 0,style:(0,X.g)({"loading-block-duration":(0,X.i)(d)})})}var aA=c("qKzV");let aB=(0,i.createContext)(!1),aC=(0,i.forwardRef)(function(a,b){let{layout:c,...d}=a;return(0,e.jsx)(F.a,{ariaLabel:d.ariaLabel,as:"button",boxRef:b,className:d.className,component:"pressable",gap:d.gap,hostProps:d,inline:d.inline,layout:c,style:d.style})}),aD=(0,i.forwardRef)(function(a,b){let{layout:c,...d}=a;return(0,e.jsx)(F.a,{ariaLabel:d.ariaLabel,as:"span",boxRef:b,className:d.className,component:"pressable",gap:d.gap,hostProps:d,inline:d.inline,layout:c,role:d.role,style:d.style})});function aE(a){let{ariaLabel:b,ariaPressed:c,capture:d=!1,disabled:g,dimWhenDisabled:h,focusStyle:j,gap:k,hoverBackground:l,inline:n=!1,insetBorder:o=!1,variant:p,onClick:q,onHover:r,revealOnHover:s=!1,tooltip:t,...u}=a,v=(0,f.B)(),w=(0,i.useContext)(aB),z=(0,i.useContext)(f.k),A=u.theme??z;if(w){let a=(0,e.jsx)(F.a,{as:"span",component:"pressable",gap:n?k??0:k,inline:n,layout:u,role:void 0,style:n?{display:"inline"}:void 0});return n?(0,e.jsx)(aA.a.Provider,{value:!0,children:a}):a}let B=()=>v(y.a.pressable,(0,f.q)(q)),C=a=>{a.stopPropagation(),d&&a.preventDefault(),g||B()},D=a=>{("Enter"===a.key||" "===a.key&&"link"!==u.role)&&(a.target===a.currentTarget||d)&&(!g||d)&&(a.preventDefault(),a.stopPropagation(),g||B())},G=d?{...u,children:(0,e.jsx)(aB.Provider,{value:!0,children:u.children})}:u,H="link"===u.role,I=n||H,J=(0,e.jsx)(I?aD:aC,{ariaLabel:b,"aria-pressed":c,className:(0,E.b)("Pressable-QEXFz7",s&&"RevealOnHover-k7I1ur","ghost"===p&&"Ghost-xEEOGK","inset"===j&&"InsetFocus-bnOhkk",!1===h&&"PreserveOpacity-Z4s8VH"),disabled:g,gap:n?k??0:k,inline:n,layout:G,onClick:d?void 0:C,onClickCapture:d?C:void 0,onKeyDown:I&&!d?D:void 0,onKeyDownCapture:I&&d?D:void 0,onMouseEnter:g?void 0:()=>r?.(!0),onMouseLeave:()=>r?.(!1),style:{...(0,X.g)({"pressable-hover-background":(0,m.c)((0,m.j)(A,l),A)}),...n?{display:"inline"}:{},...o?{boxShadow:"inset 0 0 0 1px currentColor"}:{}},role:u.role??(n?"button":void 0),tabIndex:I&&!g?0:void 0,type:"button"}),K=(0,e.jsx)(x,{content:t,disabled:g,theme:u.theme,children:J});return n?(0,e.jsx)(aA.a.Provider,{value:!0,children:K}):K}function aF(a){let{actionOverlay:b,alt:c,aspectRatio:d,background:g,bitmapBlendMode:h,children:j,containOutsideAspectRatio:k,contentCrop:l,contentCropFit:n,fallback:o,fit:p,frame:q,height:r,hideOnFailure:s=!1,hoverZoom:t,maxHeight:u,maxWidth:v,minHeight:w,minWidth:x,onImageError:y,onImageLoad:z,imageRef:A,imageFrameRef:B,imageFrameComponent:C,imageContentComponent:D,loadedOverlay:E,position:F,radius:G,secondaryAction:H,size:I,src:J,width:K}=a,L=(0,i.useContext)(f.i),M=(0,i.useContext)(f.k),N=(0,i.useContext)(aB),[O]=(0,i.useState)(L),[P,Q]=(0,i.useState)(null),[R,S]=(0,i.useState)(),T=(0,i.useRef)(void 0),U=null!=E,V=R?.src===J?R?.aspectRatio:void 0,W=k&&void 0!==V&&(V<=k.min||V>=k.max)?"contain":p,X=t&&C&&D,Y=X?D:null,$=(0,i.useRef)(null),[_,aa]=(0,i.useState)(),ab=function(a,b){let c=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"contain";if(!a)return;let d=a.aspect_ratio,e=a.placement,f=b??d;if(!Number.isFinite(d)||d<=0||!Number.isFinite(f)||f<=0||!e||!Number.isFinite(e.left)||!Number.isFinite(e.top)||!Number.isFinite(e.width)||e.width<=0||!Number.isFinite(e.height)||e.height<=0)return;let g="cover"===c?Math.max:Math.min,h=100*g(1,d/f),i=100*g(1,f/d);return{viewport:{left:(100-h)/2,top:(100-i)/2,width:h,height:i},image:e}}(l,_,n),ac=null!=ab,ad=(0,i.useCallback)(a=>{if($.current=a,"function"==typeof B)return B(a);B&&(B.current=a)},[B]);(0,i.useLayoutEffect)(()=>{let a=$.current;if(!ac||!a)return;let b=()=>{let b=a.getBoundingClientRect();b.width>0&&b.height>0&&aa(b.width/b.height)};if(b(),"u"<typeof ResizeObserver)return;let c=new ResizeObserver(b);return c.observe(a),()=>c.disconnect()},[ac,J,P]);let ae=r??I,af=K??I,ag={...(0,m.f)(G),aspectRatio:(0,m.b)(d)??(ac?l?.aspect_ratio:void 0),height:ae,maxHeight:u,maxWidth:v,minHeight:w,minWidth:x,width:af},ah=(0,au.a)((0,m.c)((0,m.j)(M,g),M)),ai={...ag,...ah,overflow:"hidden"};if((0,i.useEffect)(()=>{Q(null)},[J]),(0,i.useEffect)(()=>{(k||H||b||U)&&T.current?.src===J&&S(T.current)},[b,k,H,U,J]),P===J&&null!=o)return(0,e.jsxs)("div",{ref:ad,className:`${av} ${aw} Fallback-fiDrou`,"data-d-component":"image","data-d-image-fallback":"","data-d-frame":q?"":void 0,style:ai,children:[o,null==j?null:(0,e.jsx)("div",{className:ay,children:j})]});if(P===J&&s)return null;let aj=J?(0,e.jsx)(Z.a,{ref:A,alt:c,className:`${av} LoadingImage-GUJwJt`,forceRenderAfterLoadFail:!s&&null==o,onError:a=>{Q(J),y?.(a)},onLoad:a=>{Q(null);let c=a.currentTarget;if(c.getAttribute("src")===J&&Number.isFinite(c.naturalWidth)&&Number.isFinite(c.naturalHeight)&&c.naturalWidth>0&&c.naturalHeight>0){let a={aspectRatio:c.naturalWidth/c.naturalHeight,src:J};T.current=a,(k||H||b||U)&&S(a)}z?.(a)},referrerPolicy:"no-referrer",src:J,style:{...ag,mixBlendMode:h,objectFit:W,objectPosition:F,...X&&!ab?{width:null!=af?"100%":void 0,height:null!=ae?"100%":void 0,maxWidth:"none",maxHeight:"none",minWidth:0,minHeight:0}:{},...ab?{position:"absolute",left:`${ab.image.left}%`,top:`${ab.image.top}%`,width:`${ab.image.width}%`,height:`${ab.image.height}%`,aspectRatio:void 0,maxWidth:"none",maxHeight:"none",minWidth:0,minHeight:0,objectFit:"fill"}:{}}},J):null,ak=Y?(0,e.jsx)(Y,{className:"HoverContent-tzdYPR",style:h?ah:void 0,children:aj}):aj,al=!N&&null!=R&&R.src===J&&null!=b;return(0,e.jsxs)(X?C:"div",{ref:ad,className:`${av} ${aw} ${ax}${b?" group/search-image":""}`,"data-d-component":"image","data-d-stream-media":O?"":void 0,"data-d-frame":q?"":void 0,"data-d-hover-zoom":t&&!X?"":void 0,"data-d-host-hover":X?"":void 0,style:ai,children:[ab?(0,e.jsx)("div",{className:"Crop-pc1qo_","data-d-image-crop":"",style:{left:`${ab.viewport.left}%`,top:`${ab.viewport.top}%`,width:`${ab.viewport.width}%`,height:`${ab.viewport.height}%`},children:ak}):ak,(0,e.jsx)("div",{className:"LoadingSurface-OjqK7X","data-d-image-loading":"",children:(0,e.jsx)(az,{background:"light-dark(var(--dil-image-loading-light-bg, var(--theme-user-msg-bg, var(--color-background-info-surface))), var(--theme-user-msg-bg, var(--color-background-info-surface)))",duration:1e3,height:"100%",width:"100%"})}),null==j?null:(0,e.jsx)("div",{className:ay,children:j}),H&&R?.src===J?(0,e.jsx)("div",{className:"SecondaryAction-E0EAcW",children:(0,e.jsx)(aE,{ariaLabel:H.label,onClick:H.onClick,children:H.icon?(0,e.jsx)(at.a,{inline:!0,name:H.icon,size:"sm"}):H.label})}):null,al?(0,e.jsx)(aG,{children:b}):null,q?(0,e.jsx)("div",{"aria-hidden":"true",className:"Frame-UCrMGp"}):null,R?.src===J&&P!==J&&U?E:null]})}function aG(a){let{children:b}=a;return(0,e.jsx)("div",{className:"ActionOverlayContainer-A1skHN",children:(0,e.jsx)("div",{className:"ActionOverlay-e4zhB5",children:b})})}var aH=c("Z8P7"),aI=c("sCki"),aJ=c("H9jZ"),aK=c("f9K9"),aL=c("urXC"),aM=c("qF9g");let aN=(0,i.createContext)("none"),aO=(0,i.createContext)({inheritedMarker:"none",nativeMarker:null}),aP=["md","lg","xl"],aQ=(0,i.createContext)({maxMarkerSize:"md",reserveMarkerLane:!1});function aR(a){var b,c;let{children:d,description:f,disabled:g,label:h,marker:j,markerSize:k}=a,l=(0,i.useContext)(aN),m=(0,i.useContext)(aO),n=j??m.inheritedMarker??"none",o=null==j&&n===m.nativeMarker,p=(0,i.useContext)(aQ),r=(b=aT(k,p.maxMarkerSize),c=p.maxMarkerSize,aP[Math.min(aP.indexOf(b),aP.indexOf(c))]),s="string"!=typeof n,t=s?"rich":n,u=aU(l,n),v=(0,i.useContext)(aM.a),w=u&&!v;return(0,e.jsxs)("li",{className:aL.a.Item,"data-d-component":"list-item","data-d-connector":"solid"===l?l:void 0,"data-d-marker":"solid"===l?t:void 0,"data-d-marker-layout":o?"native":"custom","data-d-rich-marker-size":s?r:void 0,"data-d-rich-marker-lane":s&&p.reserveMarkerLane?p.maxMarkerSize:void 0,children:[o?null:(0,e.jsx)(aS,{marker:n,markerSize:r,maxMarkerSize:p.maxMarkerSize,reserveMarkerLane:p.reserveMarkerLane}),(0,e.jsxs)("div",{className:aL.a.Content,children:[(0,e.jsx)("div",{className:aL.a.Label,"data-d-disabled":g?"":void 0,"data-d-list-item-content":w?"connected":u?void 0:"",children:(0,q.a)(d??h,{markInlineText:w})}),f?(0,e.jsx)("div",{className:aL.a.Description,children:(0,q.a)(f)}):null]})]})}function aS(a){let{marker:b,markerSize:c,maxMarkerSize:d,reserveMarkerLane:f}=a;return"none"===b?null:"string"!=typeof b?(0,e.jsx)("span",{"aria-hidden":"true",inert:!0,className:aL.a.Marker,"data-d-marker":"rich","data-d-max-marker-size":f?d:void 0,children:(0,e.jsx)("span",{className:aL.a.RichMarker,"data-d-marker-size":c,children:b})}):(0,e.jsx)("span",{"aria-hidden":"true",className:aL.a.Marker,"data-d-marker":b})}function aT(a,b){return aP.find(b=>b===a)??b}function aU(a,b){return"solid"===a&&(aV(b)||"string"!=typeof b)}function aV(a){return"bullet"===a||"number"===a}var aW=c("AxvA");let aX={sm:16,md:20,lg:24};var aY=c("wKck");function aZ(a){let{advanceRate:b=0,animationEndTime:c=0,animationStartTime:d=0,currentTime:f=0,data:g,fit:h="contain",loop:j=!1,player:k}=a,l=(0,i.useRef)(null),[m,n]=(0,i.useState)();(0,i.useEffect)(()=>{let a,b=l.current;if(!b)return;let c=!0,d=b=>{c&&(console.warn("Failed to load Lottie animation",b),c=!1,a?.destroy(),n(void 0))};try{k.setIDPrefix("dil-");let e=a=k.loadAnimation({autoloadSegments:!1,autoplay:!1,container:b,loop:!1,renderer:"svg",rendererSettings:{preserveAspectRatio:"xMidYMid meet",runExpressions:!1}});e.addEventListener("DOMLoaded",()=>{c&&n(e)}),e.addEventListener("data_failed",d),e.addEventListener("error",d),e.setupAnimation(structuredClone(g))}catch(a){d(a)}return()=>{c&&(c=!1,a?.destroy())}},[g,k]);let o=m?.frameRate??0,p="number"==typeof g?.ip?g.ip:0,q="number"==typeof g?.op&&o>0?Math.max(0,(g.op-p)/o):0,r=Math.max(0,Math.min(d,q)),s=Math.max(r,Math.min(c>0?c:q,q)),t=s-r;(0,i.useEffect)(()=>{m?.setLoop(j)},[m,j]),(0,i.useEffect)(()=>{q>0&&m?.setSegment(p+(t>0?r*o:0),p+(t>0?s:q)*o)},[m,q,s,o,p,r,t]),(0,i.useEffect)(()=>{if(!m||q<=0)return;let a=t<=0?Math.max(0,Math.min(r*o,q*o-1)):m.loop?(f%t+t)%t*o:Math.max(0,Math.min(f*o,t*o-1));m.goToAndStop(a,!0)},[m,f,q,o,r,t]),(0,i.useEffect)(()=>{m&&(0===b||t*o<=1?m.pause():(m.setSpeed(b),m.play()))},[b,m,f,o,j,r,t]),(0,i.useEffect)(()=>{let a=l.current?.querySelector("svg");a&&a.setAttribute("preserveAspectRatio","fill"===h?"none":"cover"===h?"xMidYMid slice":"xMidYMid meet")},[m,h]);let u="number"==typeof g?.w&&g.w>0?g.w:void 0,v="number"==typeof g?.h&&g.h>0?g.h:void 0,w="none"===h&&null!=u&&null!=v;return(0,e.jsx)("div",{"aria-hidden":"true",ref:l,style:w?{height:v,left:"50%",position:"absolute",top:"50%",transform:"translate(-50%, -50%)",width:u}:{height:"100%",width:"100%"}})}let a$=/^data:image\/(?:avif|jpeg|png|webp);base64,/i,a_=/^[^?#]*\.(?:apng|avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:[?#].*)?$/i;function a0(a){return/^data:application\/(?:json|[^;,]+\+json|octet-stream)(?:[;,]|$)/i.test(a)}function a1(a){return"string"==typeof a&&a.length<=2097152&&a$.test(a)}function a2(a){return"object"==typeof a&&null!==a&&!Array.isArray(a)}function a3(a){let b,{advanceRate:d,alt:g,animationEndTime:h,animationStartTime:j,aspectRatio:k,assetUrlGate:l,currentTime:n,fit:o="contain",height:p,loop:q,maxHeight:r,maxWidth:s,minHeight:t,minWidth:u,radius:v,source:w,width:x}=a,y=(0,i.useContext)(f.d),z=(0,i.useMemo)(()=>JSON.stringify(w),[w]),A="string"==typeof w&&(/^data:/i.test(w)?!a0(w):a_.test(w)),B="string"==typeof w&&(/^data:/i.test(w)?!a0(w)&&!a1(w):y),[C,D]=(0,i.useState)(),E=B||C?.serializedSource!==z?void 0:C;(0,i.useEffect)(()=>{if(D(void 0),B||A)return;let a=new AbortController;return(async()=>{let b=JSON.parse(z),[d,e]=await Promise.all([async function(a,b){if("string"!=typeof a)return a;let c=await fetch(a,{redirect:"error",referrerPolicy:"no-referrer",signal:b});if(!c.ok)throw Error(`Animation request failed with ${c.status}`);return c.json()}(b,a.signal),c.e(747352).then(c.t.bind(c,"nWIu",23))]);a.signal.aborted||D({...function(a,b){if(!a2(a)||!Array.isArray(a.layers))throw Error("Invalid Lottie animation data");if(null!=a.segments&&(!Array.isArray(a.segments)||a.segments.length>0))throw Error("External Lottie animation segments are not supported");if(null!=a.slots&&(!a2(a.slots)||Object.keys(a.slots).length>0))throw Error("Lottie asset slots are not supported");if(null!=a.assets&&!Array.isArray(a.assets))throw Error("Invalid Lottie assets");let c="string"!=typeof b||a0(b)?document.baseURI:new URL(b,document.baseURI).href,d=new Set,e=a.assets?.map(a=>{if(!a2(a))throw Error("Invalid Lottie asset");if(Array.isArray(a.layers)&&null==a.p&&null==a.u&&null==a.sid)return a;if("string"!=typeof a.p||null!=a.u&&"string"!=typeof a.u||null!=a.sid)throw Error("Invalid Lottie image source");let b=a.e?a.p:`${a.u??""}${a.p}`,e=b;if(!a1(b)){let a=new URL(b,c);if("https:"!==a.protocol&&"http:"!==a.protocol)throw Error("Unsupported Lottie image URL protocol");e=a.href,d.add(e)}return{...a,e:1,p:e,u:""}});if(null!=a.fonts&&(!a2(a.fonts)||null!=a.fonts.list&&!Array.isArray(a.fonts.list)||!(a.fonts.list??[]).every(a=>a2(a)&&(null==a.fPath||""===a.fPath))))throw Error("External or invalid Lottie fonts are not supported");return{data:void 0===e?a:{...a,assets:e},imageUrls:[...d]}}(d,b),player:e.default,serializedSource:z})})().catch(b=>{a.signal.aborted||console.warn("Failed to load Lottie animation",b)}),()=>a.abort()},[B,A,z]);let F=function(a,b){let{width:c,height:d,aspectRatio:e}=a,f={width:c,height:d,aspectRatio:(0,m.b)(e)};if(void 0!==c&&void 0!==d||(void 0!==c||void 0!==d)&&void 0!==f.aspectRatio)return f;let g=b?.w,h=b?.h;return"number"!=typeof g||!Number.isFinite(g)||g<=0||"number"!=typeof h||!Number.isFinite(h)||h<=0||(void 0!==c||void 0!==d?f.aspectRatio=g/h:(f.width=g,void 0===f.aspectRatio&&(f.height=h))),f}({width:x,height:p,aspectRatio:k},"string"==typeof w?E?.data:w);return A&&"string"==typeof w&&!B?b=(0,e.jsx)("img",{alt:"","aria-hidden":"true",referrerPolicy:"no-referrer",src:w,style:{height:"100%",objectFit:o,width:"100%"}}):E&&!(y&&E.imageUrls.length>0)&&(b=(0,e.jsx)(aZ,{advanceRate:d,animationEndTime:h,animationStartTime:j,currentTime:n,data:E.data,fit:o,loop:q,player:E.player}),l&&E.imageUrls.length>0&&(b=(0,e.jsx)(l,{urls:E.imageUrls,children:b}))),(0,e.jsx)("div",{"aria-label":g,"data-d-component":"lottie",role:g?"img":void 0,style:{...(0,m.f)(v),...F,maxHeight:r,maxWidth:s,minHeight:t,minWidth:u,overflow:"hidden",position:"relative"},children:b})}var a4=c("geVp"),a5=c("D5Ha"),a6=c("SEkw");function a7(a){let{align:b,children:c,side:d,sideOffset:f,width:g}=a;return(0,e.jsx)(a6.a.Content,{align:b,"data-d-component":"popover-content",minWidth:"auto",side:d,sideOffset:f,width:g,children:c})}var a8=c("Y75p"),a9="Reveal-gjV40U",ba="Content-qGIRDv",bb=c("Q6bS");function bc(a){let{"aria-label":b,children:c,disabled:d,id:f,hideIndicator:g,required:h,value:i}=a;return(0,e.jsx)(bb.a.Item,{"aria-label":b,"data-d-component":"radio",disabled:d,id:f,hideIndicator:g,required:h,value:i,children:c})}function bd(a){let b,c=!(arguments.length>1)||void 0===arguments[1]||arguments[1],d=a.target;if(a.defaultPrevented||!(d instanceof HTMLButtonElement)||"radio"!==d.getAttribute("role")||d.disabled||a.altKey||a.ctrlKey||a.metaKey||a.shiftKey)return;let e=d.closest('[data-d-component="radio-group"], [data-d-component="segmented-control"]');if(e!==a.currentTarget||e.closest('[role="toolbar"]'))return;let f=e.matches('[role="radiogroup"]')?e:e.querySelector('[role="radiogroup"], [role="group"]');if(!f)return;let g="rtl"===getComputedStyle(f).direction;switch(a.key){case"ArrowLeft":b=g?1:-1;break;case"ArrowRight":b=g?-1:1;break;case"ArrowUp":b=-1;break;case"ArrowDown":b=1;break;default:return}let h=Array.from(f.querySelectorAll('button[role="radio"]:not([disabled])')).filter(a=>a.closest('[data-d-component="radio-group"], [data-d-component="segmented-control"]')===e),i=h.indexOf(d)+b,j=h[c?(i+h.length)%h.length:i];a.preventDefault(),a.stopPropagation(),j&&(j.focus(),"true"!==j.getAttribute("aria-checked")&&j.click())}var be=c("BJV4");let bf="'sha256-0qPQ8TbRMhIKuxrQHW6yy8DsXNh2it03McoHfWW1F7w='",bg="'sha256-imuDaJTFRRz5n5LmzTCR6fKNDVbyBMuRlkVtFY4dBK8='",bh=a=>a.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;"),bi=a=>a.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"),bj=function(a,b){let c=arguments.length>2&&void 0!==arguments[2]?arguments[2]:[],d=arguments.length>3&&void 0!==arguments[3]&&arguments[3],e=d?c:[],f=JSON.stringify(e);return`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${bh(["default-src 'none'","base-uri 'none'","form-action 'none'","object-src 'none'","frame-src 'none'","child-src 'none'","connect-src 'none'","font-src 'none'",0===e.length?"img-src 'none'":"img-src https:","media-src 'none'","worker-src 'none'","manifest-src 'none'",`script-src ${bf}`,`script-src-elem ${bf}`,"script-src-attr 'none'",`style-src ${bg}`,`style-src-elem ${bg}`,"style-src-attr 'unsafe-inline'"].join("; "))}"><meta name="referrer" content="no-referrer"><meta name="oai-email-html-channel-token" content="${bh(a)}"><style>html{color-scheme:light dark}body{margin:0;padding:0;overflow-wrap:anywhere;font:14px/1.5 ui-sans-serif,system-ui,sans-serif}a[data-oai-link-token]{cursor:pointer;text-decoration:underline;text-underline-offset:2px}</style></head><body><template id="email-html-source">${bi(b)}</template><template id="email-html-images">${bi(f)}</template><div id="email-html-content"></div><script>// @ts-check

(() => {
  "use strict";
  const maxFragmentBytes = 256 * 1024;
  const maxDomNodes = 5000;
  const maxDomDepth = 128;
  const maxImages = 256;
  const version = 1;
  const metadata = document.querySelector(
    'meta[name="oai-email-html-channel-token"]',
  );
  const channelToken =
    metadata instanceof HTMLMetaElement ? metadata.content : undefined;
  if (!channelToken) return;
  const source = document.getElementById("email-html-source");
  const content = document.getElementById("email-html-content");
  if (!(source instanceof HTMLTemplateElement) || !content) return;
  const fragmentSource = source.content.textContent || "";
  const imageSource = document.getElementById("email-html-images");
  /** @type {Map<string, string>} */
  const imagesByToken = new Map();
  if (imageSource instanceof HTMLTemplateElement) {
    try {
      const imageEntries = JSON.parse(imageSource.content.textContent || "[]");
      if (Array.isArray(imageEntries) && imageEntries.length <= maxImages) {
        imageEntries.forEach((entry, index) => {
          if (
            !entry ||
            typeof entry !== "object" ||
            Object.keys(entry).length !== 2 ||
            entry.token !== \`i$\{index}\` ||
            typeof entry.url !== "string"
          ) {
            return;
          }
          try {
            const url = new URL(entry.url);
            if (url.protocol === "https:" && !url.username && !url.password) {
              imagesByToken.set(entry.token, entry.url);
            }
          } catch {}
        });
      }
    } catch {}
  }
  source.remove();
  imageSource?.remove();
  content.replaceChildren();
  if (new TextEncoder().encode(fragmentSource).byteLength > maxFragmentBytes)
    return;
  const allowedTags = new Set([
    "a",
    "abbr",
    "acronym",
    "address",
    "article",
    "aside",
    "b",
    "bdi",
    "bdo",
    "blockquote",
    "br",
    "caption",
    "center",
    "cite",
    "code",
    "col",
    "colgroup",
    "data",
    "dd",
    "del",
    "details",
    "dfn",
    "div",
    "dl",
    "dt",
    "em",
    "figcaption",
    "figure",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "header",
    "hgroup",
    "hr",
    "i",
    "img",
    "ins",
    "kbd",
    "li",
    "main",
    "mark",
    "nav",
    "ol",
    "p",
    "pre",
    "q",
    "rp",
    "rt",
    "rtc",
    "ruby",
    "s",
    "samp",
    "section",
    "small",
    "span",
    "strike",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "td",
    "tfoot",
    "th",
    "thead",
    "time",
    "tr",
    "tt",
    "u",
    "ul",
    "var",
    "wbr",
  ]);
  const dropSubtreeTags = new Set([
    "frame",
    "frameset",
    "head",
    "iframe",
    "math",
    "noscript",
    "script",
    "style",
    "svg",
    "template",
    "title",
  ]);
  const allowedAttributes = new Set([
    "style",
    "lang",
    "dir",
    "data-oai-link-token",
    "data-oai-image-token",
    "data-oai-image-fallback-token",
    "alt",
    "colspan",
    "rowspan",
    "scope",
    "align",
    "valign",
    "width",
    "height",
    "cellpadding",
    "cellspacing",
    "border",
    "bgcolor",
    "role",
    "hidden",
    "open",
  ]);
  const allowedCssProperties = new Set([
    "background",
    "background-color",
    "border",
    "border-bottom",
    "border-bottom-color",
    "border-bottom-style",
    "border-bottom-width",
    "border-collapse",
    "border-color",
    "border-left",
    "border-left-color",
    "border-left-style",
    "border-left-width",
    "border-radius",
    "border-right",
    "border-right-color",
    "border-right-style",
    "border-right-width",
    "border-spacing",
    "border-style",
    "border-top",
    "border-top-color",
    "border-top-style",
    "border-top-width",
    "border-width",
    "box-shadow",
    "box-sizing",
    "color",
    "display",
    "font",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "height",
    "letter-spacing",
    "line-height",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "max-height",
    "max-width",
    "min-height",
    "min-width",
    "opacity",
    "padding",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "padding-top",
    "overflow-wrap",
    "table-layout",
    "text-align",
    "text-decoration",
    "text-indent",
    "text-transform",
    "vertical-align",
    "visibility",
    "white-space",
    "width",
    "word-break",
    "word-spacing",
    "word-wrap",
  ]);
  const allowedCssFunctions = new Set(["rgb", "rgba", "hsl", "hsla"]);
  const allowedCssDimensionUnits = new Set([
    "deg",
    "grad",
    "px",
    "rad",
    "turn",
  ]);
  const allowedDisplayValues = new Set([
    "block",
    "inline",
    "inline-block",
    "table",
    "table-row",
    "table-cell",
    "table-column",
    "table-column-group",
    "table-header-group",
    "table-footer-group",
    "table-row-group",
    "flex",
    "inline-flex",
    "grid",
    "list-item",
    "none",
  ]);
  const allowedAlignValues = new Set(["left", "right", "center", "justify"]);
  const allowedValignValues = new Set(["top", "middle", "bottom", "baseline"]);
  const allowedRoleValues = new Set(["presentation", "none"]);
  const allowedVisibilityValues = new Set(["visible", "hidden", "collapse"]);
  const tableLayoutTags = new Set([
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
  ]);
  const dimensionAttributeTags = new Set([
    "table",
    "td",
    "th",
    "tr",
    "col",
    "colgroup",
    "img",
  ]);
  /** @param {string} value */
  const containsUnsafeStyleFunction = (value) => {
    const compact = [...value]
      .filter((character) => character.trim())
      .join("")
      .toLowerCase();
    for (const match of compact.matchAll(/([a-z0-9_-]+)\\(/g)) {
      const functionName = match[1];
      if (!allowedCssFunctions.has(functionName)) return true;
    }
    return false;
  };
  /** @param {string | undefined} character */
  const isCssDigit = (character) =>
    character !== undefined && character >= "0" && character <= "9";
  /** @param {string | undefined} character */
  const isCssHexDigit = (character) =>
    isCssDigit(character) ||
    (character !== undefined &&
      ((character >= "a" && character <= "f") ||
        (character >= "A" && character <= "F")));
  /** @param {string | undefined} character */
  const isCssNameStart = (character) =>
    character !== undefined &&
    ((character >= "a" && character <= "z") ||
      (character >= "A" && character <= "Z") ||
      character === "_" ||
      character.charCodeAt(0) >= 0x80);
  /** @param {string | undefined} character */
  const isCssName = (character) =>
    isCssNameStart(character) || isCssDigit(character) || character === "-";
  /** @param {string} value @param {number} index */
  const isValidCssEscape = (value, index) =>
    value[index] === "\\\\" &&
    index + 1 < value.length &&
    !["\\n", "\\r", "\\f"].includes(value[index + 1]);
  /** @param {string} value @param {number} index */
  const cssIdentifierStartsAt = (value, index) => {
    if (isCssNameStart(value[index])) return true;
    if (value[index] === "-") {
      return (
        isCssNameStart(value[index + 1]) ||
        value[index + 1] === "-" ||
        isValidCssEscape(value, index + 1)
      );
    }
    return isValidCssEscape(value, index);
  };
  /** @param {string} value @param {number} index */
  const consumeCssEscape = (value, index) => {
    let nextIndex = index + 1;
    if (!isCssHexDigit(value[nextIndex])) return nextIndex + 1;
    let hexDigits = 0;
    while (hexDigits < 6 && isCssHexDigit(value[nextIndex])) {
      nextIndex += 1;
      hexDigits += 1;
    }
    if (/\\s/.test(value[nextIndex] || "")) nextIndex += 1;
    return nextIndex;
  };
  /** @param {string} value @param {number} index */
  const consumeCssName = (value, index) => {
    let nextIndex = index;
    while (nextIndex < value.length) {
      if (isCssName(value[nextIndex])) {
        nextIndex += 1;
      } else if (isValidCssEscape(value, nextIndex)) {
        nextIndex = consumeCssEscape(value, nextIndex);
      } else {
        break;
      }
    }
    return nextIndex;
  };
  /** @param {string} value @param {number} index */
  const cssNumberStartsAt = (value, index) => {
    const first = value[index];
    const second = value[index + 1];
    const third = value[index + 2];
    return (
      isCssDigit(first) ||
      (first === "." && isCssDigit(second)) ||
      ((first === "+" || first === "-") &&
        (isCssDigit(second) || (second === "." && isCssDigit(third))))
    );
  };
  /** @param {string} value @param {number} index */
  const consumeCssNumber = (value, index) => {
    let nextIndex = index;
    if (value[nextIndex] === "+" || value[nextIndex] === "-") nextIndex += 1;
    while (isCssDigit(value[nextIndex])) nextIndex += 1;
    if (value[nextIndex] === "." && isCssDigit(value[nextIndex + 1])) {
      nextIndex += 1;
      while (isCssDigit(value[nextIndex])) nextIndex += 1;
    }
    if (
      (value[nextIndex] === "e" || value[nextIndex] === "E") &&
      (isCssDigit(value[nextIndex + 1]) ||
        ((value[nextIndex + 1] === "+" || value[nextIndex + 1] === "-") &&
          isCssDigit(value[nextIndex + 2])))
    ) {
      nextIndex += 1;
      if (value[nextIndex] === "+" || value[nextIndex] === "-") nextIndex += 1;
      while (isCssDigit(value[nextIndex])) nextIndex += 1;
    }
    return nextIndex;
  };
  /** @param {string} value */
  const sanitizeStyle = (value) => {
    const probe = document.createElement("div");
    value.split(";").forEach((declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex < 0) return;
      const property = declaration.slice(0, separatorIndex).trim();
      const rawPropertyValue = declaration.slice(separatorIndex + 1).trim();
      const importantMatch = rawPropertyValue.match(/!\\s*important\\s*$/i);
      const propertyValue = importantMatch
        ? rawPropertyValue.slice(0, importantMatch.index).trim()
        : rawPropertyValue;
      /** @type {[string, string][]} */
      const existingImportantDeclarations = [];
      if (!importantMatch) {
        Array.from({ length: probe.style.length }, (_, index) =>
          probe.style.item(index),
        ).forEach((existingProperty) => {
          if (
            probe.style.getPropertyPriority(existingProperty) === "important"
          ) {
            existingImportantDeclarations.push([
              existingProperty,
              probe.style.getPropertyValue(existingProperty),
            ]);
          }
        });
      }
      probe.style.setProperty(
        property,
        propertyValue,
        importantMatch ? "important" : "",
      );
      existingImportantDeclarations.forEach(
        ([importantProperty, importantValue]) =>
          probe.style.setProperty(
            importantProperty,
            importantValue,
            "important",
          ),
      );
    });
    /** @type {string[]} */
    const sanitizedNormalDeclarations = [];
    /** @type {string[]} */
    const sanitizedImportantDeclarations = [];
    Array.from({ length: probe.style.length }, (_, index) =>
      probe.style.item(index),
    ).forEach((property) => {
      const normalizedProperty = property.toLowerCase();
      const propertyValue = probe.style.getPropertyValue(property);
      const propertyPriority = probe.style.getPropertyPriority(property);
      if (!allowedCssProperties.has(normalizedProperty)) return;
      if (
        normalizedProperty === "display" &&
        !allowedDisplayValues.has(propertyValue.trim().toLowerCase())
      ) {
        return;
      }
      if (
        normalizedProperty === "opacity" &&
        !opacityValueIsSafe(propertyValue)
      )
        return;
      if (
        normalizedProperty === "visibility" &&
        !allowedVisibilityValues.has(propertyValue.trim().toLowerCase())
      ) {
        return;
      }
      if (containsUnsafeStyleFunction(propertyValue)) return;
      if (!cssNumericValuesAreSafe(propertyValue)) return;
      const serializedDeclaration = \`$\{normalizedProperty}: $\{propertyValue}$\{propertyPriority ? " !important" : ""}\`;
      const declarations = propertyPriority
        ? sanitizedImportantDeclarations
        : sanitizedNormalDeclarations;
      declarations.push(serializedDeclaration);
    });
    return sanitizedNormalDeclarations
      .concat(sanitizedImportantDeclarations)
      .join("; ");
  };
  /** @param {string} value */
  const opacityValueIsSafe = (value) => {
    const trimmed = value.trim().toLowerCase();
    const percentage = trimmed.match(/^(\\d+(?:\\.\\d+)?|\\.\\d+)%$/);
    if (percentage) {
      return Number(percentage[1]) <= 100;
    }
    if (!/^(\\d+(?:\\.\\d+)?|\\.\\d+)$/.test(trimmed)) return false;
    return Number(trimmed) <= 1;
  };
  /** @param {string} value */
  const cssNumericValuesAreSafe = (value) => {
    // Walk CSS tokens so digits in strings, hashes, and identifiers are not
    // mistaken for numeric values with layout-affecting bounds.
    let index = 0;
    while (index < value.length) {
      if (value[index] === '"' || value[index] === "'") {
        const quote = value[index];
        index += 1;
        while (index < value.length && value[index] !== quote) {
          index += value[index] === "\\\\" ? 2 : 1;
        }
        index += 1;
        continue;
      }
      if (value[index] === "#" && isCssName(value[index + 1])) {
        index = consumeCssName(value, index + 1);
        continue;
      }
      if (cssIdentifierStartsAt(value, index)) {
        index = consumeCssName(value, index);
        continue;
      }
      if (!cssNumberStartsAt(value, index)) {
        index += 1;
        continue;
      }
      const numberEnd = consumeCssNumber(value, index);
      const numeric = Number(value.slice(index, numberEnd));
      index = numberEnd;
      let unit;
      if (value[index] === "%") {
        unit = "%";
        index += 1;
      } else if (cssIdentifierStartsAt(value, index)) {
        const unitEnd = consumeCssName(value, index);
        unit = value.slice(index, unitEnd).toLowerCase();
        index = unitEnd;
      }
      if (!Number.isFinite(numeric) || numeric < 0) return false;
      if (unit === "%") {
        if (numeric > 100) return false;
      } else if (
        (unit && !allowedCssDimensionUnits.has(unit)) ||
        numeric > 2000
      ) {
        return false;
      }
    }
    return true;
  };
  /** @param {string} value @param {number} maximum */
  const integerAttributeIsSafe = (value, maximum) => {
    const trimmed = value.trim();
    if (!/^\\d+$/.test(trimmed)) return false;
    return Number(trimmed) <= maximum;
  };
  /** @param {string} value @param {number} maximum */
  const positiveIntegerAttributeIsSafe = (value, maximum) => {
    return integerAttributeIsSafe(value, maximum) && Number(value.trim()) > 0;
  };
  /** @param {string} value */
  const dimensionAttributeIsSafe = (value) => {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      const percentage = trimmed.slice(0, -1);
      return /^\\d+$/.test(percentage) && Number(percentage) <= 100;
    }
    return integerAttributeIsSafe(trimmed, 2000);
  };
  /** @param {string} value */
  const colorAttributeIsSafe = (value) => {
    if (containsUnsafeStyleFunction(value)) return false;
    const probe = document.createElement("div");
    probe.style.color = value.trim();
    return probe.style.color !== "";
  };
  /** @param {Element} element @param {string} name @param {string} value */
  const attributeIsAllowed = (element, name, value) => {
    if (!allowedAttributes.has(name)) return false;
    if (name === "data-oai-link-token") return element.localName === "a";
    if (name === "data-oai-image-token" || name === "alt") {
      return element.localName === "img";
    }
    if (name === "data-oai-image-fallback-token") {
      return element.localName === "span";
    }
    if (name === "style") return sanitizeStyle(value) !== "";
    if (name === "hidden") return true;
    if (name === "open") return element.localName === "details";
    if (name === "align")
      return allowedAlignValues.has(value.trim().toLowerCase());
    if (name === "role") {
      return (
        element.localName === "table" &&
        allowedRoleValues.has(value.trim().toLowerCase())
      );
    }
    if (name === "valign") {
      return (
        tableLayoutTags.has(element.localName) &&
        allowedValignValues.has(value.trim().toLowerCase())
      );
    }
    if (name === "bgcolor") {
      return (
        tableLayoutTags.has(element.localName) && colorAttributeIsSafe(value)
      );
    }
    if (name === "width" || name === "height") {
      return (
        dimensionAttributeTags.has(element.localName) &&
        dimensionAttributeIsSafe(value)
      );
    }
    if (name === "cellpadding" || name === "cellspacing" || name === "border") {
      return (
        element.localName === "table" && integerAttributeIsSafe(value, 1000)
      );
    }
    if (name === "colspan" || name === "rowspan") {
      return (
        (element.localName === "td" || element.localName === "th") &&
        positiveIntegerAttributeIsSafe(value, 1000)
      );
    }
    if (name === "scope") {
      return (
        (element.localName === "td" || element.localName === "th") &&
        ["col", "colgroup", "row", "rowgroup"].includes(value)
      );
    }
    return true;
  };
  /** @param {string} name @param {string} value */
  const canonicalAttributeValue = (name, value) => {
    if (name === "hidden") {
      return value.trim().toLowerCase() === "until-found" ? "until-found" : "";
    }
    if (name === "open") return "";
    if (name === "style") return sanitizeStyle(value);
    return value;
  };
  /** @param {HTMLImageElement} image */
  const replaceImageWithFallback = (image) => {
    const fallback = document.createElement("span");
    const hidden = image.getAttribute("hidden");
    const style = image.getAttribute("style");
    if (hidden != null) fallback.setAttribute("hidden", hidden);
    if (style != null) fallback.setAttribute("style", style);
    fallback.textContent = image.getAttribute("alt") || "";
    image.replaceWith(fallback);
  };
  /** @param {Element} element */
  const unwrapElement = (element) => {
    const parent = element.parentNode;
    if (!parent) {
      element.remove();
      return;
    }
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    element.remove();
  };
  /** @param {DocumentFragment} root */
  const enforceDomLimits = (root) => {
    let nodeCount = 0;
    /** @type {{ node: Node; depth: number }[]} */
    const stack = [{ node: root, depth: 0 }];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) break;
      nodeCount += 1;
      if (nodeCount > maxDomNodes || current.depth > maxDomDepth) return false;
      for (
        let index = current.node.childNodes.length - 1;
        index >= 0;
        index -= 1
      ) {
        const child = current.node.childNodes.item(index);
        if (child) stack.push({ node: child, depth: current.depth + 1 });
      }
    }
    return true;
  };
  /** @param {string} fragment */
  const sanitizeFragment = (fragment) => {
    const template = document.createElement("template");
    template.innerHTML = fragment;
    if (!enforceDomLimits(template.content)) return null;
    template.content.querySelectorAll("*").forEach((element) => {
      if (dropSubtreeTags.has(element.localName)) {
        element.remove();
        return;
      }
      if (!allowedTags.has(element.localName)) {
        unwrapElement(element);
        return;
      }
      [...element.attributes].forEach(({ name, value }) => {
        const normalizedName = name.toLowerCase();
        if (!attributeIsAllowed(element, normalizedName, value)) {
          element.removeAttribute(name);
          return;
        }
        element.setAttribute(
          name,
          canonicalAttributeValue(normalizedName, value),
        );
      });
    });
    return template.content;
  };
  let sanitizedFragment;
  try {
    sanitizedFragment = sanitizeFragment(fragmentSource);
  } catch {
    return;
  }
  if (!sanitizedFragment) return;
  content.replaceChildren(sanitizedFragment);
  content.querySelectorAll("img").forEach((image) => {
    const token = image.getAttribute("data-oai-image-token");
    const fallback = image.nextSibling;
    if (
      !token ||
      !(fallback instanceof HTMLSpanElement) ||
      fallback.getAttribute("data-oai-image-fallback-token") !== token
    ) {
      replaceImageWithFallback(image);
      return;
    }
    const url = imagesByToken.get(token);
    if (!url) {
      image.remove();
      return;
    }
    image.setAttribute("referrerpolicy", "no-referrer");
    image.setAttribute("src", url);
    fallback.remove();
  });
  /** @type {string | null} */
  let suppressedKeyboardToken = null;
  content.querySelectorAll("a[data-oai-link-token]").forEach((link) => {
    link.setAttribute("role", "link");
    link.setAttribute("tabindex", "0");
  });
  /** @param {Event} event */
  const getLink = (event) =>
    event.target instanceof Element
      ? event.target.closest("a[data-oai-link-token]")
      : null;
  /** @param {Event} event @param {Element | null} link */
  const activateLink = (event, link) => {
    const token = link?.getAttribute("data-oai-link-token");
    if (!token) return;
    event.preventDefault();
    window.parent.postMessage(
      { type: "link.activate", version, channelToken, token },
      "*",
    );
  };
  document.addEventListener("click", (event) => {
    const link = getLink(event);
    const token = link?.getAttribute("data-oai-link-token");
    if (token && token === suppressedKeyboardToken && event.detail === 0) {
      suppressedKeyboardToken = null;
      event.preventDefault();
      return;
    }
    suppressedKeyboardToken = null;
    activateLink(event, link);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.repeat) return;
    const link = getLink(event);
    suppressedKeyboardToken = link?.getAttribute("data-oai-link-token") ?? null;
    queueMicrotask(() => {
      suppressedKeyboardToken = null;
    });
    activateLink(event, link);
  });
})();
<\/script></body></html>`},bk=/^https?:\/\/([^/?#]+)/i,bl=/\s/;function bm(a){return null!=a&&"object"==typeof a}function bn(a,b){return Object.keys(a).length===b.length&&b.every(b=>Object.prototype.hasOwnProperty.call(a,b))}function bo(a,b){if("string"!=typeof a||!br(a,2048))return!1;let c=bk.exec(a);if(function(a){if(bl.test(a))return!0;for(let b=0;b<a.length;b+=1){let c=a.charCodeAt(b);if(c<=31||c>=127&&c<=159)return!0}return!1}(a)||null==c||c[1].includes("@"))return!1;try{let c=new URL(a);return b.has(c.protocol)&&0===c.username.length&&0===c.password.length}catch{return!1}}let bp=new Set(["http:","https:"]),bq=new Set(["https:"]);function br(a,b){return a.length<=b&&function(a){if("u">typeof TextEncoder)return new TextEncoder().encode(a).byteLength;let b=0;for(let c=0;c<a.length;c+=1){let d=a.charCodeAt(c);if(d<128)b+=1;else if(d<2048)b+=2;else if(d>=55296&&d<=56319){let d=a.charCodeAt(c+1);d>=56320&&d<=57343?(b+=4,c+=1):b+=3}else b+=3}return b}(a)<=b}function bs(a){let{preview:b,labels:c,...d}=a,f=(0,i.useMemo)(()=>(function(a){try{if(!bm(a)||!bn(a,["fragment","links"])&&!bn(a,["fragment","links","images"])||"string"!=typeof a.fragment||!br(a.fragment,262144)||0===a.fragment.trim().length||!Array.isArray(a.links)||a.links.length>256||Object.hasOwn(a,"images")&&(!Array.isArray(a.images)||a.images.length>256))return;let b=[];for(let[c,d]of a.links.entries()){if(!bm(d)||!bn(d,["token","url"])||d.token!==`l${c}`||!bo(d.url,bp))return;b.push({token:d.token,url:d.url})}if(!function(a,b){if("u"<typeof document)return!1;try{let c=document.createElement("template");c.innerHTML=a;let d=c.content.querySelectorAll("[data-oai-link-token]");return d.length===b.length&&b.every((a,b)=>{let c=d.item(b);return c?.localName==="a"&&c.getAttribute("data-oai-link-token")===a.token})}catch{return!1}}(a.fragment,b))return;let c=[];for(let[b,d]of(Array.isArray(a.images)?a.images:[]).entries()){if(!bm(d)||!bn(d,["token","url"])||d.token!==`i${b}`||!bo(d.url,bq))return;c.push({token:d.token,url:d.url})}let d={fragment:a.fragment,links:b,images:c};return!function(a){try{return br(JSON.stringify(a),786432)}catch{return!1}}(a)?void 0:d}catch{return}})(b),[b]);return f?(0,e.jsx)(bt,{viewProps:{...d,labels:c,preview:f}}):(0,e.jsx)(aa.a,{color:"secondary",children:void 0===b?c.loading:c.unavailable})}function bt(a){let{viewProps:b}=a,{preview:c,labels:d,onOpenLink:f,contentScale:g=1,title:h="HTML preview",height:j=360,width:k="100%",...l}=b,m=(0,i.useRef)(null),[n,o]=(0,i.useState)(!1),p=Number.isFinite(g)&&g>0?g:1;return(0,i.useLayoutEffect)(()=>{let a=m.current;if(!a)return;let b=crypto.randomUUID(),d=new AbortController;if(f&&c.links.length>0){let e=new Map(c.links.map(a=>{let{token:b,url:c}=a;return[b,c]}));window.addEventListener("message",c=>{if(c.source!==a.contentWindow||"null"!==c.origin)return;let g=c.data;if(null==g||"object"!=typeof g||"link.activate"!==g.type||1!==g.version||g.channelToken!==b||"string"!=typeof g.token)return;let h=e.get(g.token);null!=h&&f(h,d.signal)},{signal:d.signal})}return a.srcdoc=bj(b,c.fragment,c.images,n),()=>{d.abort(),a.removeAttribute("srcdoc")}},[n,f,c]),(0,e.jsxs)(ag.a,{gap:2,width:k,children:[c.images.length>0&&!n&&(0,e.jsx)(be.a,{justify:"center",children:(0,e.jsx)(z,{size:"sm",color:"secondary",variant:"outline",onClick:()=>o(!0),children:d.showImages})}),(0,e.jsx)(F.a,{as:"div",className:ap,component:"read-only-html-view",height:j,width:"100%",layout:l,children:(0,e.jsx)("iframe",{ref:m,title:h,className:aq,sandbox:"allow-scripts",referrerPolicy:"no-referrer",style:{width:`${100/p}%`,maxWidth:"none",height:`${100/p}%`,transform:`scale(${p})`,transformOrigin:"top left"}})})]})}var bu=c("RdWu"),bv="Full-vcwMsm";let bw={};function bx(a){let{actionOverlay:b,alt:c,aspectRatio:d,background:f,bitmapBlendMode:g,children:h,containOutsideAspectRatio:j,contentCropFit:k,fallback:l,fit:m="cover",frame:n,height:o,hideOnFailure:p,hoverZoom:q,maxHeight:r,maxWidth:s,minHeight:t,minWidth:u,onLoad:v,onError:w,onImageLoad:x,onImageError:y,onImageFallback:z,imageFrameRef:A,imageFrameComponent:B,imageContentComponent:C,loadedOverlay:D,position:E,radius:F,searchImage:G,sourcePending:H=!1,sourceIdentity:I,secondaryAction:J,width:K}=a,L=null!=G&&"object"==typeof G,M=L?G:bw,N=M.content_url??"",O=M.thumbnail_url??"",P=N||O,Q=N&&O&&N!==O?O:"",[R,S]=(0,i.useState)(),T=P===R&&Q?Q:P,U=(0,i.useRef)(null),V=(0,i.useRef)(!0),W=(0,i.useRef)(null),X=(0,i.useRef)(null),Y=I??JSON.stringify([P,Q]);(0,i.useLayoutEffect)(()=>(V.current=!0,()=>{V.current=!1}),[]),(0,i.useLayoutEffect)(()=>{X.current!==Y&&(X.current=Y,W.current=null)},[Y]);let Z=(0,bu.a)(a=>{V.current&&null==W.current&&(W.current=a,"loaded"===a?v?.():w?.())});(0,i.useEffect)(()=>{!L||H||P&&(R!==P||Q)||Z("error")},[R,Q,L,P,Z,Y,H]),(0,i.useEffect)(()=>{S(void 0)},[P]);let $=(0,i.useMemo)(()=>(function(a){if("number"==typeof a)return Number.isFinite(a)&&a>0?{height:1,width:a}:void 0;if("string"!=typeof a)return;let b=a.trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*[:/]\s*([0-9]+(?:\.[0-9]+)?)$/);if(!b)return;let c=Number(b[1]),d=Number(b[2]);return bA(c)&&bA(d)?{height:d,width:c}:void 0})(d),[d]),[_,aa]=(0,i.useState)(),[ab,ac]=(0,i.useState)(null);(0,i.useEffect)(()=>{let a=U.current;a?.getAttribute("src")===T&&a.complete&&a.naturalWidth>0&&Z("loaded")},[T,Z,Y]),(0,i.useLayoutEffect)(()=>{let a=U.current;if("cover"!==m||$||!a||a.getAttribute("src")!==T)return void aa(void 0);let b=()=>{var b;let c,d=(b=a,(c=b?.getBoundingClientRect())&&bA(c.width)&&bA(c.height)?{height:c.height,width:c.width}:void 0);aa(a=>a?.width===d?.width&&a?.height===d?.height?a:d)};if(b(),"u"<typeof ResizeObserver)return;let c=new ResizeObserver(b);return c.observe(a),()=>{c.disconnect()}},[$,m,ab,T]);let ad=(0,i.useCallback)(a=>{if(V.current&&a.currentTarget.getAttribute("src")===T){if(T===P&&(S(P),Q))return void z?.();T===P&&H||Z("error"),y?.(a)}},[Q,z,y,P,Z,H,T]),ae=M.thumbnail_size??M.content_size,af=E??("cover"===m?function(a,b,c){if(!a||!b||!c||!bA(b.width)||!bA(b.height)||!bA(c.width)||!bA(c.height)||!Number.isFinite(a.center_x_percent)||!Number.isFinite(a.center_y_percent))return;let d=b.width/b.height,e=c.width/c.height;if(1e-6>Math.abs(d-e))return;let f=bB(a.center_x_percent),g=bB(a.center_y_percent),h=50,i=50;if(d>e)h=bC((f*d-e/2)/(d-e)*100,0,100);else{let a=1/d,b=1/e;i=bC((g*a-b/2)/(a-b)*100,0,100)}return`${h.toFixed(1)}% ${i.toFixed(1)}%`}(M.thumbnail_crop_info,ae,$??_):void 0);return(0,e.jsx)(aF,{actionOverlay:"function"==typeof b?b(T):b,imageFrameComponent:B,imageContentComponent:C,alt:c??M.title??"",aspectRatio:d,background:f,bitmapBlendMode:g,containOutsideAspectRatio:j,contentCropFit:k,contentCrop:(T===N?M.content_presentation:M.thumbnail_presentation)??void 0,fallback:l,fit:m,frame:n,height:o,hideOnFailure:p,hoverZoom:q,maxHeight:r,maxWidth:s,minHeight:t,minWidth:u,imageFrameRef:A,loadedOverlay:D,imageRef:U,onImageError:ad,onImageLoad:a=>{V.current&&a.currentTarget.getAttribute("src")===T&&(ac(a.currentTarget),Z("loaded"),x?.(a))},position:af,radius:F,src:T,secondaryAction:J,width:K,children:h})}function by(a){let{sourceIdentity:b,children:c,imageFrameRef:d,...g}=a,h=(0,i.useContext)(f.d),j=(0,i.useContext)(aB),k=g.searchImage,l=b??JSON.stringify([k?.content_url,k?.thumbnail_url]),n=g.hoverZoom&&g.imageFrameComponent&&g.imageContentComponent,o=n?g.imageFrameComponent:"div";return h?null==c?null:(0,e.jsx)(r.a,{height:g.height,width:g.width,minHeight:g.minHeight,minWidth:g.minWidth,maxHeight:g.maxHeight,maxWidth:g.maxWidth,aspectRatio:g.aspectRatio,radius:g.radius,background:g.background,children:c}):(0,e.jsxs)(o,{ref:d,className:`${av} ${ax} Frame-ezNDuW${g.actionOverlay?" group/search-image":""}`,"data-d-component":"image","data-d-frame":g.frame?"":void 0,"data-d-hover-zoom":g.hoverZoom&&!n?"":void 0,"data-d-host-hover":n?"":void 0,style:{...(0,m.f)(g.radius),aspectRatio:(0,m.b)(g.aspectRatio),width:g.width,height:g.height,minWidth:g.minWidth,minHeight:g.minHeight,maxWidth:g.maxWidth,maxHeight:g.maxHeight},children:[(0,e.jsx)("div",{className:"Loading-JQ1C0R",children:(0,e.jsx)(az,{height:"100%",width:"100%"})}),(0,e.jsx)(bz,{actionOverlay:j?void 0:g.actionOverlay,alt:g.alt,aspectRatio:g.aspectRatio,background:g.background,bitmapBlendMode:g.bitmapBlendMode,containOutsideAspectRatio:g.containOutsideAspectRatio,contentCropFit:g.contentCropFit,fallback:g.fallback,fit:g.fit,frame:g.frame,height:g.height,hideOnFailure:g.hideOnFailure,maxHeight:g.maxHeight,maxWidth:g.maxWidth,minHeight:g.minHeight,minWidth:g.minWidth,onLoad:g.onLoad,onError:g.onError,onImageLoad:g.onImageLoad,onImageError:g.onImageError,onImageFallback:g.onImageFallback,loadedOverlay:g.loadedOverlay,imageContentComponent:n?g.imageContentComponent:void 0,position:g.position,radius:g.radius,searchImage:g.searchImage,secondaryAction:g.secondaryAction,width:g.width,sourcePending:g.sourcePending,children:c},l)]})}function bz(a){let{actionOverlay:b,children:c,searchImage:d,loadedOverlay:f,imageContentComponent:g,fallback:h,sourcePending:j,onLoad:k,onError:l,onImageLoad:m,onImageError:n,onImageFallback:o,...p}=a,q=null!=d&&"object"==typeof d,r=q?d:void 0,s=r?.thumbnail_url||"",t=r?.content_url||"",u=s||t,[v,w]=(0,i.useState)(),[x,y]=(0,i.useState)(),z=v?.src===u?v.state:"pending",A=x?.src===t?x.state:"pending",B=(0,i.useRef)(!0),C=(0,i.useRef)(null),D=(0,i.useRef)(!1),E=(0,i.useRef)(void 0),F=!!(s&&t&&t!==s),G=q&&(!u||"failed"===z)&&!j&&(!F||"failed"===A);(0,i.useLayoutEffect)(()=>(B.current=!0,()=>{B.current=!1}),[]);let H=(0,bu.a)(a=>{B.current&&null==C.current&&(C.current=a,"loaded"===a?k?.():l?.())});function I(a){D.current||(D.current=!0,m?.(a))}(0,i.useEffect)(()=>{G&&(H("error"),E.current&&!D.current&&"loaded"!==C.current&&(D.current=!0,n?.(E.current)))},[G,n,H]);let J={...p,frame:!1,height:"100%",width:"100%",minHeight:0,minWidth:0,maxHeight:void 0,maxWidth:void 0,radius:"none",hideOnFailure:!G||null!=h||p.hideOnFailure};return(0,e.jsxs)(e.Fragment,{children:[(0,e.jsxs)(g??"div",{className:"Bitmaps-MXF1L4",children:[(0,e.jsx)("div",{className:"Layer-vBnEbD","aria-hidden":"loaded"===A||G||void 0,"data-d-progressive-settled":"loaded"===z||"loaded"===A||G?"":void 0,style:{visibility:"loaded"===A?"hidden":void 0},children:(0,e.jsx)(bx,{alt:J.alt,aspectRatio:J.aspectRatio,background:J.background,bitmapBlendMode:J.bitmapBlendMode,containOutsideAspectRatio:J.containOutsideAspectRatio,contentCropFit:J.contentCropFit,fit:J.fit,frame:J.frame,height:J.height,hideOnFailure:J.hideOnFailure,maxHeight:J.maxHeight,maxWidth:J.maxWidth,minHeight:J.minHeight,minWidth:J.minWidth,position:J.position,radius:J.radius,secondaryAction:J.secondaryAction,width:J.width,searchImage:{...r,content_url:u,content_presentation:s?r?.thumbnail_presentation:r?.content_presentation,thumbnail_url:""},onLoad:()=>{B.current&&(w({src:u,state:"loaded"}),H("loaded"))},onError:()=>{B.current&&w({src:u,state:"failed"})},onImageLoad:a=>{B.current&&I(a)},onImageError:a=>{B.current&&(E.current={...a,currentTarget:a.currentTarget},(F||j)&&o?.())}},u)}),F&&"pending"!==z?(0,e.jsx)("div",{className:bv,"data-d-progressive-full":"",style:{opacity:+("loaded"===A)},"aria-hidden":"loaded"!==A||void 0,children:(0,e.jsx)(bx,{alt:J.alt,aspectRatio:J.aspectRatio,background:J.background,bitmapBlendMode:J.bitmapBlendMode,containOutsideAspectRatio:J.containOutsideAspectRatio,contentCropFit:J.contentCropFit,fit:J.fit,frame:J.frame,height:J.height,hideOnFailure:J.hideOnFailure,maxHeight:J.maxHeight,maxWidth:J.maxWidth,minHeight:J.minHeight,minWidth:J.minWidth,position:J.position,radius:J.radius,secondaryAction:J.secondaryAction,width:J.width,searchImage:{...r,content_url:t,thumbnail_url:""},onLoad:()=>{B.current&&(y({src:t,state:"loaded"}),H("loaded"))},onError:()=>{B.current&&y({src:t,state:"failed"})},onImageLoad:a=>{B.current&&I(a)},onImageError:a=>{B.current&&(E.current={...a,currentTarget:a.currentTarget})}},t)}):null]}),G&&null!=h?(0,e.jsx)("div",{className:bv,children:h}):null,null!=f&&("loaded"===z||"loaded"===A)?f:null,null==c?null:(0,e.jsx)("div",{className:ay,children:c}),null!=b&&("loaded"===A||"loaded"===z)?(0,e.jsx)(aG,{children:"function"==typeof b?b("loaded"===A?t:u):b}):null]})}function bA(a){return Number.isFinite(a)&&a>0}function bB(a){return bC(a>1?a/100:a,0,1)}function bC(a,b,c){return Math.min(Math.max(a,b),c)}var bD=c("fZ05"),bE=c("O9zu"),bF=c("gWf7"),bG=c("XvPX");let bH="http://www.w3.org/2000/svg",bI=new Set(["animate","animateMotion","animateTransform","set"]),bJ={alignmentBaseline:"alignment-baseline",className:"class",clipPath:"clip-path",clipRule:"clip-rule",colorInterpolation:"color-interpolation",colorInterpolationFilters:"color-interpolation-filters",dominantBaseline:"dominant-baseline",fillOpacity:"fill-opacity",fillRule:"fill-rule",floodColor:"flood-color",floodOpacity:"flood-opacity",fontFamily:"font-family",fontSize:"font-size",fontStyle:"font-style",fontWeight:"font-weight",letterSpacing:"letter-spacing",lightingColor:"lighting-color",markerEnd:"marker-end",markerMid:"marker-mid",markerStart:"marker-start",pointerEvents:"pointer-events",stopColor:"stop-color",stopOpacity:"stop-opacity",strokeDasharray:"stroke-dasharray",strokeDashoffset:"stroke-dashoffset",strokeLinecap:"stroke-linecap",strokeLinejoin:"stroke-linejoin",strokeMiterlimit:"stroke-miterlimit",strokeOpacity:"stroke-opacity",strokeWidth:"stroke-width",textAnchor:"text-anchor",vectorEffect:"vector-effect",wordSpacing:"word-spacing",xlinkHref:"xlink:href"};function bK(a){let b=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,c=arguments.length>2?arguments[2]:void 0,d=arguments.length>3?arguments[3]:void 0,e=arguments.length>4?arguments[4]:void 0,f=document.implementation.createHTMLDocument("").createElementNS(bH,"svg"),g=a.props;return f.setAttribute("font-family",c?.fontFamily||"sans-serif"),f.setAttribute("font-weight",c?.fontWeight||"normal"),bO(f,g,b,c?.color),function a(b,c,d,e){let f=arguments.length>4&&void 0!==arguments[4]?arguments[4]:"",g=0;bM(c,c=>{let h,j,k,l,m=g++;if("string"==typeof c||"number"==typeof c)return void b.append(b.ownerDocument.createTextNode(String(c)));if(bN(c))h=c.type,j=c.props,k=c.children,l=c.key;else{if(!(0,i.isValidElement)(c)||"string"!=typeof c.type)return;h=c.type,k=(j=c.props).children,l=c.key}let n=b.ownerDocument.createElementNS(bH,h),o=`${f}/${JSON.stringify([h,null!=l?["key",l]:null!=j.id?["id",j.id]:m])}`;bO(n,j,d),a(n,k,d,e?.visitChildren(h)?e:void 0,o),e?.visit(n,o),b.append(n)})}(f,g.children,b,d),d?.finish(f),e?.finish(f),new XMLSerializer().serializeToString(f)}function bL(a){let b="";return bM(a,a=>{"string"==typeof a||"number"==typeof a?b+=String(a):bN(a)?b+=bL(a.children):(0,i.isValidElement)(a)&&(b+=bL(a.props.children))}),b}function bM(a,b){if(Array.isArray(a)){for(let c of a)bM(c,b);return}(0,i.isValidElement)(a)&&a.type===i.Fragment?bM(a.props.children,b):null!=a&&"boolean"!=typeof a&&b(a)}function bN(a){return!(null==a||"object"!=typeof a||Array.isArray(a))&&"string"==typeof a.type&&null!=a.props&&"object"==typeof a.props&&!Array.isArray(a.props)&&Array.isArray(a.children)}function bO(a,b,c,d){for(let[e,f]of Object.entries(b)){if("children"===e||"dangerouslySetInnerHTML"===e||"ref"===e||e.startsWith("on")||null==f||!1===f)continue;if("style"===e&&"object"==typeof f){let b=Object.entries(f).filter(a=>{let[,b]=a;return"number"==typeof b||"string"==typeof b}).map(a=>{let[b,c]=a,e=b.replace(/[A-Z]/g,a=>`-${a.toLowerCase()}`),f="color"===b&&d?d:String(c);return`${e}:${f}`});b.length&&a.setAttribute("style",b.join(";"));continue}if("boolean"!=typeof f&&"number"!=typeof f&&"string"!=typeof f)continue;let b=bJ[e]??e;if("xlink:href"===b){a.setAttributeNS("http://www.w3.org/1999/xlink",b,String(f));continue}if("begin"===e&&bI.has(a.localName)){a.setAttribute(b,function(a,b){return String(a).split(";").map(a=>{let c=a.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(ms|s)?$/);if(!c)return a;let d=Number(c[1])/("ms"===c[2]?1e3:1);return`${d-b}s`}).join(";")}(f,c));continue}a.setAttribute(b,String(f))}c>0&&bI.has(a.localName)&&!a.hasAttribute("begin")&&a.setAttribute("begin",`${-c}s`)}let bP=new Set(["circle","ellipse","foreignObject","image","line","path","polygon","polyline","rect","text","use"]),bQ=new Set(["clipPath","defs","desc","filter","linearGradient","marker","mask","pattern","radialGradient","script","style","symbol","title"]);class bR{previous;animateNewElements;now;mode;starts=new Map;newKeys=new Set;hasReveals=!1;constructor(a,b,c,d="active"){this.previous=a,this.animateNewElements=b,this.now=c,this.mode=d}visit(a,b){if(!bP.has(a.localName)||"text"===a.localName&&!a.textContent?.trim()||"path"===a.localName&&!a.getAttribute("d")?.trim())return;let c=this.previous.has(b),d="disabled"===this.mode?null:c?this.previous.get(b):this.animateNewElements?this.now:null;this.starts.set(b,d),c||null===d||this.newKeys.add(b),null===d||this.now-d>=250||(this.hasReveals=!0,a.setAttribute("data-d-svg-reveal",""),a.style.setProperty("--d-svg-reveal-delay",`${-Math.max(0,this.now-d)}ms`))}visitChildren(a){return!bQ.has(a)&&!bP.has(a)}finish(a){if(!this.hasReveals||"active"!==this.mode)return;let b=a.ownerDocument.createElementNS(a.namespaceURI,"style");b.textContent=`
@keyframes d-svg-enter { from { opacity: 0; } }
:where([data-d-svg-reveal]) {
  animation: d-svg-enter 250ms ease-out var(--d-svg-reveal-delay) backwards;
}`,a.prepend(b)}commit(a){for(let b of this.newKeys)this.starts.set(b,a);return this.starts}}let bS=/^translate\(\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(?:[,\s]\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?))?\s*\)$/i;class bT{previous;active;positions=new Map;hasChanges=!1;constructor(a,b){this.previous=a,this.active=b}finish(a){let b=a.querySelectorAll("g[id][transform]"),c=new Set,d=new Set;for(let a of b)c.has(a.id)&&d.add(a.id),c.add(a.id);for(let c of b){if(d.has(c.id))continue;let b=bS.exec(c.getAttribute("transform")??"");if(!b||c.querySelector("animateTransform"))continue;let e=Number(b[1]),f=Number(b[2]??0);if(!Number.isFinite(e)||!Number.isFinite(f))continue;let g=`${e} ${f}`;this.positions.set(c.id,g);let h=this.previous.get(c.id);if(null==h||h===g||(this.hasChanges=!0,!this.active))continue;let i=a.ownerDocument.createElementNS(a.namespaceURI,"animateTransform");i.setAttribute("attributeName","transform"),i.setAttribute("type","translate"),i.setAttribute("from",h),i.setAttribute("to",g),i.setAttribute("dur","0.22s"),i.setAttribute("calcMode","spline"),i.setAttribute("keyTimes","0;1"),i.setAttribute("keySplines","0.42 0 0.58 1"),i.setAttribute("fill","freeze"),c.append(i)}}}function bU(a){let{svg:b}=a,c=(0,i.useContext)(f.i),d=(0,i.useContext)(f.l),g=(0,i.useRef)(new Map),h=(0,i.useSyncExternalStore)(bZ,b$,()=>!0),[j]=(0,i.useState)(c),k=(0,i.useRef)(new Map),l=(0,i.useRef)(null),m=(0,i.useRef)(null),n=(0,i.useRef)(!0),o=(0,i.useRef)(null),p=(0,i.useRef)(null),[q,r]=(0,i.useState)(()=>bV(b));(0,i.useEffect)(()=>(n.current=!0,()=>{n.current=!1,p.current=null,o.current=null}),[]);let s=(0,i.useCallback)(function a(){if(!n.current||o.current||!p.current)return;let{svg:b,animateNewElements:c}=p.current;p.current=null;let e=null===l.current?0:(performance.now()-l.current)/1e3,f=m.current?getComputedStyle(m.current):void 0,h=new bR(k.current,c,performance.now(),b$()?"disabled":"preload"),i=d?new bT(g.current,!1):void 0,j=bX(bK(b,e,f,h,i)),q=new Image;o.current=q,q.decoding="async",q.src=j,("function"==typeof q.decode?q.decode():Promise.resolve()).then(()=>{if(!n.current||o.current!==q)return;o.current=null;let d=performance.now(),e=j;(h.hasReveals||i?.hasChanges&&!b$())&&(h=new bR(k.current,c,d,b$()?"disabled":"active"),e=bX(bK(b,null===l.current?0:(d-l.current)/1e3,f,h,i?new bT(g.current,!b$()):void 0))),i?g.current=i.positions:g.current.clear(),l.current??=d,k.current=h.commit(d),r(bV(b,e)),a()},()=>{o.current===q&&(o.current=null,a())})},[d]);(0,i.useEffect)(()=>{p.current={svg:b,animateNewElements:!h&&(c||p.current?.animateNewElements===!0||j&&null===l.current)},s()},[c,s,h,b,j]);let t=b.props,{source:u,aspectRatio:v,width:w,height:x,alt:y}=q,z=null==w||"auto"===w,A=null==x||"auto"===x;return(0,e.jsx)("img",{ref:m,alt:y,"data-d-component":"svg",decoding:"async",src:u,style:{aspectRatio:v?`auto ${v}`:void 0,color:t.style?.color,height:x,width:v&&z&&A?"100%":w}})}function bV(a,b){let{viewBox:c,width:d,height:e}=a.props;return{source:b,width:d,height:e,aspectRatio:function(a){if("string"!=typeof a)return;let b=a.replace(/^[\t\n\r ]+|[\t\n\r ]+$/g,"").split(/[\t\n\r ]*,[\t\n\r ]*|[\t\n\r ]+/);if(4!==b.length||!b.every(a=>bW.test(a)))return;let c=b.map(Number),[,,d,e]=c;if(c.every(Number.isFinite)&&!(d<=0)&&!(e<=0))return`${d} / ${e}`}(c),alt:function(a){let b=a.props;if(!0===b["aria-hidden"]||"true"===b["aria-hidden"]||"presentation"===b.role||"none"===b.role)return"";if("string"==typeof b["aria-label"])return b["aria-label"];let c="";return bM(b.children,a=>{!c&&(bN(a)&&"title"===a.type?c=bL(a.children):(0,i.isValidElement)(a)&&"title"===a.type&&(c=bL(a.props.children)))}),c}(a)}}let bW=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;function bX(a){return`data:image/svg+xml;charset=utf-8,${encodeURIComponent(a)}`}let bY="(prefers-reduced-motion: reduce), (forced-colors: active)";function bZ(a){let b=window.matchMedia?.(bY);return b?.addEventListener("change",a),()=>b?.removeEventListener("change",a)}function b$(){return window.matchMedia?.(bY).matches===!0}function b_(a){let{children:b,color:c="prose",fill:d="currentColor",height:g,preserveAspectRatio:h,size:j,stroke:k,strokeLinecap:l,strokeLinejoin:n,strokeWidth:o,viewBox:p,width:q}=a,r=(0,i.useContext)(f.k),s=(0,m.i)((0,m.j)(r,c));return(0,e.jsx)(bU,{svg:(0,e.jsx)("svg",{"data-d-component":"svg",fill:d,height:g??j,preserveAspectRatio:h,stroke:k,strokeLinecap:l,strokeLinejoin:n,strokeWidth:o,style:{color:s},viewBox:p,width:q??j,xmlns:"http://www.w3.org/2000/svg",children:b})})}b_.childHandling="opaque";var b0=c("WTLH");let b1=(0,i.createContext)(!1),b2=/\S{25,}/u;function b3(a){let{children:b,header:c=!1,rowDivider:d}=a,g=(0,i.useContext)(f.k);return(0,e.jsx)(c?"thead":"tbody",{"data-d-component":"table-section","data-d-row-divider":null==d?void 0:"",style:null==d?void 0:(0,X.g)({"table-section-row-divider":(0,m.d)(g,d).border}),children:b})}function b4(a){let{align:b,children:c,colSpan:d,header:f=!1,padding:g,rowSpan:h,vAlign:j="start",width:k}=a,l=(0,i.useContext)(b1),n=f||l,o=!n&&b5(c);return(0,e.jsx)(n?"th":"td",{"data-d-align":b,"data-d-break-long-token":o?"":void 0,"data-d-component":"table-cell","data-d-has-width":null!=k?"":void 0,"data-d-valign":j,colSpan:d,rowSpan:h,scope:n?"col":void 0,style:{...(0,m.g)(g),width:k},children:c})}function b5(a){for(let b of i.Children.toArray(a))if(("string"==typeof b||"number"==typeof b)&&b2.test(String(b))||(0,i.isValidElement)(b)&&b5(b.props.children))return!0;return!1}function b6(a){return(0,f.v)(a)?.type===b3}var b7=c("kBis"),b8=c("vZCo"),b9=c("YWbN");let ca="https://www.youtube.com/iframe_api";function cb(a){return"object"==typeof a&&null!==a&&"Player"in a&&"function"==typeof a.Player}function cc(a){let{hoverToPlay:b,onHover:c,onPlayerError:f,onThumbnailError:g,scriptNonce:h,showDurationBadge:j,showThumbnail:k,title:l,videoId:m}=a,[o,p]=(0,i.useState)(()=>"u">typeof window&&(!window.matchMedia("(hover: hover) and (pointer: fine)").matches||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>1));(0,i.useEffect)(()=>{let a=window.matchMedia("(hover: hover) and (pointer: fine)"),b=()=>{p(!a.matches||"MacIntel"===navigator.platform&&navigator.maxTouchPoints>1)};return b(),a.addEventListener("change",b),()=>a.removeEventListener("change",b)},[]);let q=b&&!o,r=k||b,s=(0,i.useRef)(null),t=(0,i.useRef)(null),u=(0,i.useRef)(!1),[v,w]=(0,i.useState)(!1),[x,y]=(0,i.useState)(!0),[z,A]=(0,i.useState)(null),[B,C]=(0,i.useState)("maxresdefault"),[D,E]=(0,i.useState)(!1),F=(0,bu.a)(a=>f?.(a)),G=(0,bu.a)(a=>{a.title=l,r&&(a.tabIndex=-1),a.referrerPolicy="strict-origin-when-cross-origin"}),H=(0,bu.a)(()=>{u.current=!1,t.current?.pauseVideo(),w(!1)});(0,i.useEffect)(()=>{let a,b,c,e,f=s.current;if(!f)return;w(!1);let g=!1,i=!1,k=!1,l=()=>{window.clearInterval(b),window.clearTimeout(c)},n=a=>{if(!j)return!0;let b=a.getDuration();return!!Number.isFinite(b)&&!(b<=0)&&(A(Math.round(b)),l(),!0)},o=document.createElement("iframe"),p=new URLSearchParams({autoplay:"0",controls:q?"0":"1",enablejsapi:"1",playsinline:"1",origin:window.location.origin});q&&p.set("mute","1"),o.src=`https://www.youtube.com/embed/${m}?${p}`,o.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",o.allowFullscreen=!0,G(o),f.appendChild(o),(cb((e=window).YT)?Promise.resolve(e.YT):d||(d=new Promise((a,b)=>{let c=document.querySelector(`script[src="${ca}"]`),d=c??document.createElement("script"),f=e.onYouTubeIframeAPIReady,g=()=>{window.clearTimeout(k),d.removeEventListener("error",i),e.onYouTubeIframeAPIReady===j&&(e.onYouTubeIframeAPIReady=f)},i=()=>{g(),c||d.remove(),b(Error("YouTube IFrame Player API could not load"))},j=()=>{try{f?.()}finally{cb(e.YT)&&(g(),a(e.YT))}},k=window.setTimeout(i,15e3);e.onYouTubeIframeAPIReady=j,d.addEventListener("error",i,{once:!0}),c||(d.src=ca,d.async=!0,h&&(d.nonce=h),document.head.appendChild(d))}).catch(a=>{throw d=void 0,a}))).then(d=>{g||(j&&(c=window.setTimeout(()=>{k=!0,l(),y(!1)},1e4)),G((a=new d.Player(o,{videoId:m,width:"100%",height:"100%",playerVars:{autoplay:0,controls:+!q,playsinline:1,origin:window.location.origin},events:{onReady:a=>{let{target:c}=a;g||i||t.current||(t.current=c,q&&c.mute(),n(c)||k||(b=window.setInterval(()=>{n(c)},250)),q&&u.current&&c.playVideo())},onStateChange:a=>{let{target:b,data:c}=a;g||i||(n(b),q&&(1!==c||u.current||b.pauseVideo(),w(1===c&&u.current)))},onError:a=>{let{data:b}=a;g||i||(i=!0,l(),y(!1),q&&H(),F(b))},onAutoplayBlocked:()=>{!g&&q&&H()}}})).getIframe()))}).catch(()=>{g||(l(),y(!1))});let r=()=>{"hidden"===document.visibilityState&&H()};return q&&(document.addEventListener("visibilitychange",r),window.addEventListener("blur",H)),()=>{g=!0,l(),document.removeEventListener("visibilitychange",r),window.removeEventListener("blur",H),u.current=!1,t.current=null,a?.destroy(),f.replaceChildren()}},[q,H,G,F,h,j,m]),(0,i.useEffect)(()=>{let a=s.current?.querySelector("iframe");a&&(a.title=l)},[l]);let I=a=>{let b=a.currentTarget;if("error"===a.type||120===b.naturalWidth&&90===b.naturalHeight){if("maxresdefault"===B)return void C("hqdefault");C(null),g?.()}E(!0)},J=null===z?null:`${Math.floor(z/60)}:${String(z%60).padStart(2,"0")}`;return(0,e.jsxs)("div",{className:"EnhancedYouTubeEmbed-yJZhII","aria-label":r?l:void 0,role:r?"img":void 0,"data-d-click-through":r?"":void 0,"data-d-compact":o?"":void 0,onClickCapture:q?H:void 0,onPointerEnter:q||c?a=>{"touch"===a.pointerType||(c?.(),q&&(u.current=!0,t.current?.mute(),t.current?.playVideo()))}:void 0,onPointerLeave:q?H:void 0,children:[(0,e.jsx)("div",{"aria-hidden":r||void 0,className:"Player-FGyoMQ",ref:s}),k&&(0,e.jsxs)("div",{"aria-hidden":!0,className:"Preview-CGGqG8",hidden:v,children:[B&&(0,e.jsx)("img",{alt:"",className:"Thumbnail-SmBGDH",draggable:!1,onError:I,onLoad:I,referrerPolicy:"no-referrer",src:`https://img.youtube.com/vi/${m}/${B}.jpg`}),!o&&!D&&(0,e.jsx)("div",{className:"Loading-EwiAvK",children:(0,e.jsx)(az,{width:"100%",height:"100%",duration:1e3})})]}),j&&(0,e.jsx)("div",{"aria-hidden":!0,className:"ProviderBadge-uaAC63",hidden:v,children:(0,e.jsxs)(n,{color:"secondary",variant:"solid",size:o?"sm":"lg",children:[(0,e.jsx)(b9.default,{className:"ProviderIcon-ck53xJ"}),(0,e.jsx)("span",{className:"Duration-AAbEFe",children:J?(0,e.jsx)("span",{children:J}):x?(0,e.jsx)("span",{className:"DurationLoading-Es3Yie"}):null})]})})]})}var cd=c("vCpP");let ce={...{animate:function(a){let{children:b}=a;return(0,e.jsx)(g.a,{...j(a),children:b})},"animate-group":function(a){let{children:b}=a;return(0,e.jsx)(h.a,{...j(a),children:b})},"animate-item":function(a){let{children:b}=a;return(0,e.jsx)(f.e,{children:b})},badge:n,bento:function(a){let{children:b,overflow:c="hidden"}=a,d=function a(b){return i.Children.toArray(i.Children.map(b,b=>(0,i.isValidElement)(b)&&b.type===i.Fragment?a(b.props.children):b))}(b),f="scroll"===c,{ref:g,bleed:h}=function(a){let b=(0,i.useRef)(null),[c,d]=(0,i.useState)(null);return(0,i.useLayoutEffect)(()=>{let c=b.current;if(!a||!c)return;let e=c.closest('[data-d-direction="col"]:not([data-d-component])');if(!e)return;let f=[];for(let a=c.parentElement;a&&(f.push(a),a!==e);a=a.parentElement);let g=()=>{let a=c.getBoundingClientRect();if(!a.width||!c.offsetWidth)return;let b=a.width/c.offsetWidth,g=c;for(let a of f){let c=getComputedStyle(a);if("contents"===c.display)continue;let f=a.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight);if(Math.abs(g.getBoundingClientRect().width/b-f)>1||a!==e&&"visible"!==c.overflowX)return void d(null);g=a}let h=e.getBoundingClientRect(),i=Math.max(0,(a.left-h.left)/b),j=Math.max(0,(h.right-a.right)/b);d(a=>a?.left===i&&a.right===j?a:{left:i,right:j})};g();let h="u"<typeof ResizeObserver?null:new ResizeObserver(g);return h?.observe(c),f.forEach(a=>h?.observe(a)),()=>h?.disconnect()},[a]),{ref:b,bleed:a?c:null}}(f&&d.length>0);if(!d.length)return null;let j=f?d:d.slice(0,3),k=d.length-j.length;return(0,e.jsxs)("div",{ref:g,className:"Bento-SMr1Fv","data-d-component":"bento","data-d-full-width":null!==h||void 0,style:h?{"--bento-bleed-left":`${h.left}px`,"--bento-bleed-right":`${h.right}px`}:void 0,children:[(0,e.jsx)("div",{className:"Items-mrC_Bs","data-d-overflow":c,"data-d-count":j.length,role:"region","aria-label":"Bento",tabIndex:f&&d.length>3?0:void 0,children:j.map((a,b)=>(0,e.jsx)("div",{className:"Tile-SnqTaU",children:a},(0,i.isValidElement)(a)?a.key??b:b))}),k>0&&(0,e.jsxs)("span",{className:"Count-uytyty",children:[(0,e.jsx)(o.default,{"aria-hidden":!0,width:16,height:16}),`+${k}`]})]})},blockquote:function(a){let{children:b}=a;return(0,e.jsx)("blockquote",{className:p.a.Blockquote,"data-d-component":"blockquote",children:(0,q.a)(b)})},bold:aj.a,box:r.a,button:z,card:B.a,carousel:function(a){var b;let{activeIndex:c,ariaLabel:d="Carousel",children:f,flush:g=!1,gap:h=2,onChange:j,previousLabel:k="Previous carousel items",nextLabel:l="Next carousel items",showArrows:n=!0,snap:o="proximity",snapAlign:p="start",visibleItems:q}=a,r=(0,i.useId)(),t=(0,i.useRef)(null),u=(0,i.useRef)(void 0),v=(0,i.useRef)(void 0),w=(0,i.useRef)(void 0),x=(0,i.useRef)(void 0),y=(0,i.useRef)(!1),z=(0,i.useRef)(!1),A="number"==typeof(b=c)&&Number.isInteger(b)?b:void 0;z.current=void 0!==A;let B=void 0!==c||void 0!==j,F=B?"start":p,J=function(a){if(null!=a&&Number.isFinite(a)&&!(a<1))return Math.floor(a)}(q),[L,N]=(0,i.useState)(),[V,W]=(0,i.useState)(0),[X,Y]=(0,i.useState)("ltr"),[Z,$]=(0,i.useState)({previous:!1,next:!1}),_=(0,i.useCallback)(()=>{let a=t.current;if(null==a)return;let{textDirection:b,carouselRect:c,alignedInlineStart:d,items:e}=R(a),f=e.at(0),g=e.at(-1);if(Y(b),null==f||null==g)return void $({previous:!1,next:!1});let h=P(f.getBoundingClientRect(),c,b),i=g.getBoundingClientRect();$({previous:h<d-1,next:P(i,c,b)+i.width>a.clientWidth+1})},[]),aa=(0,i.useCallback)(()=>{let a=t.current;null!=a&&N(function(a,b){if(null==b)return;let c=getComputedStyle(a),d=a.clientWidth-Q(c.paddingInlineStart)-Q(c.paddingInlineEnd),e=Q(c.columnGap),f=Number(c.getPropertyValue("--carousel-continuation-cue-ratio")),g=O(a).length>b&&f>0;return Math.max(0,Math.round(1e3*((d-e*(g?b:b-1)-(g?d*f:0))/b))/1e3)}(a,J))},[J]),ab=(0,i.useCallback)(()=>{let a=t.current;if(!B||null==a||void 0!==v.current)return;let{currentOffset:b,itemOffsets:c}=S(a);v.current=T(c,b)},[B]),ac=(0,i.useCallback)(()=>{let a=t.current;if(null==a)return;let{currentOffset:b,itemOffsets:c}=S(a),d=T(c,b);if(void 0===d)return;let e=w.current;w.current=void 0,void 0!==e&&1>=Math.abs(b-e)||d!==v.current&&(v.current=d,d!==A&&j?.(d))},[A,j]),ad=(0,i.useCallback)(()=>{void 0!==u.current&&window.clearTimeout(u.current),u.current=window.setTimeout(()=>{u.current=void 0,ac()},120)},[ac]);(0,i.useEffect)(()=>{let a=t.current;if(null==a)return;let b=()=>{aa(),_(),ab(),z.current&&W(a=>a+1)},c="u"<typeof ResizeObserver?null:new ResizeObserver(b),d=()=>{O(a).forEach(a=>c?.observe(a))};b(),a.addEventListener("scroll",_,{passive:!0}),c?.observe(a),d();let e="u"<typeof MutationObserver?null:new MutationObserver(()=>{d(),b()});return e?.observe(a,{childList:!0}),()=>{a.removeEventListener("scroll",_),e?.disconnect(),c?.disconnect()}},[g,h,ab,aa,_]),(0,i.useEffect)(()=>()=>{void 0!==u.current&&(window.clearTimeout(u.current),u.current=void 0)},[]),(0,i.useEffect)(()=>{aa(),_()},[f,aa,_]),(0,i.useEffect)(()=>{_()},[L,_]);let ae=(0,i.useCallback)(a=>{let b=t.current;if(null==b||void 0===A)return;let{currentOffset:c,itemOffsets:d,items:e,maxScrollOffset:f}=S(b),g=d[A],h=e[A];if(void 0===g||null==h){w.current=void 0;return}let i=Math.min(g,f);if(v.current=A,1>=Math.abs(c-i)){let a=w.current;void 0!==a&&Math.abs(a-i)>1&&(w.current=void 0);return}w.current=i,h.scrollIntoView({behavior:a&&!U()?"smooth":"instant",block:"nearest",inline:"start"})},[A]);(0,i.useEffect)(()=>{let a=y.current&&x.current!==A;x.current=A,y.current=!0,ae(a)},[A,V,ae]),(0,i.useEffect)(()=>{void 0!==L&&ae(!1)},[L,ae]),(0,i.useEffect)(()=>{let a=t.current,b=a?.closest("[dir]");if(null==b||"u"<typeof MutationObserver)return;let c=new MutationObserver(_);return c.observe(b,{attributes:!0,attributeFilter:["dir"]}),()=>c.disconnect()},[_]);let af=a=>{let b=t.current;if(null==b)return;let{textDirection:c,carouselRect:d,alignedInlineStart:e,items:f}=R(b),g=("previous"===a?f.slice().reverse():f).find(b=>{let f=P(b.getBoundingClientRect(),d,c);return"previous"===a?f<e-1:f>e+1});g?.scrollIntoView({behavior:U()?"auto":"smooth",block:"nearest",inline:"start"})},ag=Z.previous||Z.next,ah=(0,E.b)(G,"rtl"===X?I:H),ai=(0,E.b)(G,"rtl"===X?H:I),aj="rtl"===X?(0,e.jsx)(D.default,{height:16,width:16}):(0,e.jsx)(C.default,{height:16,width:16}),ak="rtl"===X?(0,e.jsx)(C.default,{height:16,width:16}):(0,e.jsx)(D.default,{height:16,width:16});return(0,e.jsxs)("div",{className:"Frame-YuKWAu",children:[(0,e.jsx)("div",{"aria-label":d,className:"Carousel-Ccokaj","data-d-component":"carousel","data-d-flush":g?"":void 0,"data-d-snap":o,id:r,onScroll:B?ad:void 0,ref:t,role:"list",style:{gap:(0,m.h)(h)},tabIndex:ag?0:void 0,children:(0,e.jsx)(M.Provider,{value:{itemWidth:L,snapAlign:F},children:f})}),(0,e.jsx)(K,{viewportRef:t}),n&&ag?(0,e.jsx)("div",{className:ah,children:(0,e.jsx)(s.a,{"aria-controls":r,"aria-disabled":!Z.previous,"aria-label":k,color:"secondary",onClick:()=>{Z.previous&&af("previous")},tabIndex:Z.previous?0:-1,pill:!0,size:"sm",uniform:!0,variant:"outline",children:aj})}):null,n&&ag?(0,e.jsx)("div",{className:ai,children:(0,e.jsx)(s.a,{"aria-controls":r,"aria-disabled":!Z.next,"aria-label":l,color:"secondary",onClick:()=>{Z.next&&af("next")},tabIndex:Z.next?0:-1,pill:!0,size:"sm",uniform:!0,variant:"outline",children:ak})}):null]})},"carousel-item":function(a){let{aspectRatio:b,background:c,border:d,children:f,gap:g,height:h,maxHeight:i,maxWidth:j,minHeight:k,minWidth:l,padding:m,radius:n,variant:o,width:p}=a;return(0,e.jsx)(N,{aspectRatio:b,background:c,border:d,component:"carousel-item",gap:g,height:h,maxHeight:i,maxWidth:j,minHeight:k,minWidth:l,padding:m,radius:n,variant:o,width:p,children:f})},"carousel-media-item":function(a){let{aspectRatio:b,background:c,border:d,children:g,gap:h,height:j,maxHeight:k,maxWidth:l,media:m,minHeight:n,minWidth:o,padding:p,radius:q,size:r="sm",variant:s,width:t}=a,{itemWidth:u}=(0,i.useContext)(M),v=t??(null==u&&null==o?"min-content":void 0),w=null!=u||null!=v||null!=o,x=(0,f.v)(m),y=null!=x&&null!=x.props.radius;return(0,e.jsxs)(N,{aspectRatio:b,background:c,border:d,component:"carousel-media-item",gap:h,height:j,maxHeight:k,maxWidth:l,minHeight:n,minWidth:o,padding:p,radius:q,variant:s,width:v,children:[(0,e.jsx)(F.a,{align:"stretch",as:"div",className:"MediaFrame-oaVCCW",clip:!0,direction:"row",height:L[r],radius:y?void 0:"xl",width:w?"100%":"fit-content",children:m}),(0,e.jsx)(F.a,{as:"div",gap:h??1,padding:{x:1},width:"100%",children:g})]})},caption:A.a,checkbox:function(a){let{checked:b,children:c,defaultChecked:d=!1,disabled:g,label:h,lineThrough:j=!1,name:k,onChange:l,required:m,shape:n="round",value:o="on"}=a,p=(0,f.B)(),[r,s]=(0,i.useState)(d),t=null!=b,u=t?b:r,v=c??h;return(0,e.jsx)(V.a,{checked:u,className:"round"===n?"Round-hHfb6x":void 0,"data-d-component":"checkbox",disabled:g,label:null==v?void 0:(0,e.jsx)("span",{children:(0,q.a)(v)}),labelClassName:(0,E.b)("round"===n&&"RoundLabel-zdjApa",u&&j&&"CheckedLabel-aYji5o"),name:k,onCheckedChange:a=>{t||s(a),p({...y.a.checkbox,value:a?"checked":"unchecked"},(0,f.q)(l,a))},required:m,value:o})},"chip-input":W.a,code:function(a){let{children:b=""}=a,c=(0,i.useContext)(f.j);return(0,e.jsx)("code",{className:af.a.Code,"data-d-component":"code",children:(0,e.jsx)(f.j.Provider,{value:{...c,bold:!1},children:(0,q.a)(b,{reveal:"string"==typeof b||"number"==typeof b})})})},col:ag.a,"date-picker":ah.a,divider:ai.a,favicon:_,flow:an.a,"flow-item":an.b,form:function(a){let{onSubmit:b,...c}=a;return(0,e.jsx)(F.a,{as:"form",component:"form",hostProps:{onSubmit(a){a.preventDefault(),a.stopPropagation(),b?.()}},layout:c})},grid:ao.a,"grid-item":ao.b,"html-view":function(a){let{height:b=360,html:c,messenger:d,title:f="DIL HTML view",width:g="100%",...h}=a,j=(0,i.useRef)(null),k=(0,i.useRef)(null),l=(0,i.useRef)(null);null===l.current&&(l.current=as());let m=d?.channelId??"html-view",n=l.current,[o,p]=(0,i.useState)(void 0),[q,r]=(0,i.useState)(void 0),s=function(a){let b,{channelId:c,html:d,token:e}=a;return`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="${"default-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://cdn.skypack.dev https://cdnjs.cloudflare.com https://cdn.tailwindcss.com; style-src 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://fonts.googleapis.com; img-src data: blob: https:; font-src data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src https://cdn.jsdelivr.net https://unpkg.com https://esm.sh https://cdn.skypack.dev https://cdnjs.cloudflare.com; media-src data: blob: https:; worker-src blob:".replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}" />
    <script>
      ${b=JSON.stringify({channelId:c,token:e}).replace(/</g,"\\u003c"),String.raw`
(() => {
  const PROTOCOL = "dil-html-view";
  const { channelId, token } = ${b};
  let messenger = null;
  const pendingRequests = Object.create(null);
  const queuedCommands = [];
  const queuedEvents = [];

  const randomId = () =>
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  const post = (message) => {
    globalThis.parent.postMessage(
      {
        __dilHtmlView: PROTOCOL,
        channelId,
        token,
        ...message,
      },
      "*",
    );
  };

  const isMessageForThisView = (event) => {
    const { data } = event;
    return Boolean(
      data &&
        data.__dilHtmlView === PROTOCOL &&
        data.channelId === channelId &&
        data.token === token,
    );
  };

  const requestCommand = (type, data) => {
    const id = randomId();

    return new Promise((resolve, reject) => {
      pendingRequests[id] = {
        reject,
        resolve,
      };

      post({
        data,
        id,
        kind: "command",
        type,
      });
    });
  };

  const respondToCommand = (id, result, error) => {
    post({
      error,
      id,
      kind: "response",
      result,
    });
  };

  const runCommand = (message) => {
    if (!messenger) {
      queuedCommands.push(message);
      return;
    }

    const handler = messenger._commands[message.type];
    if (typeof handler !== "function") {
      respondToCommand(message.id, undefined, {
        message: 'Unknown DILMessenger command "' + message.type + '"',
      });
      return;
    }

    Promise.resolve()
      .then(() => handler(message.data))
      .then(
        (result) => {
          respondToCommand(message.id, result, undefined);
        },
        (error) => {
          respondToCommand(message.id, undefined, {
            message: error && error.message ? String(error.message) : String(error),
          });
        },
      );
  };

  const emitEvent = (message) => {
    if (!messenger) {
      queuedEvents.push(message);
      return;
    }

    const handlers = messenger._eventHandlers[message.type] ?? [];
    handlers.slice().forEach((handler) => handler(message.data));
  };

  const handleResponse = (message) => {
    const pending = pendingRequests[message.id];
    if (!pending) {
      return;
    }

    delete pendingRequests[message.id];

    if (message.error) {
      pending.reject(new Error(message.error.message || "DIL command failed"));
      return;
    }

    pending.resolve(message.result);
  };

  const handleMessage = (event) => {
    if (!isMessageForThisView(event)) {
      return;
    }

    const { data: message } = event;
    switch (message.kind) {
      case "command":
        runCommand(message);
        return;
      case "event":
        emitEvent(message);
        return;
      case "response":
        handleResponse(message);
        return;
      default:
        return;
    }
  };

  const createCommandsProxy = () =>
    new Proxy(Object.create(null), {
      get(_target, property) {
        if (typeof property !== "string" || property === "then") {
          return undefined;
        }

        return (data) => requestCommand(property, data);
      },
    });

  class DILMessenger {
    constructor(options) {
      this._commands = options?.commands ?? {};
      this._eventHandlers = Object.create(null);
      this.commands = createCommandsProxy();
      messenger = this;

      while (queuedCommands.length > 0) {
        runCommand(queuedCommands.shift());
      }

      Promise.resolve().then(() => {
        while (queuedEvents.length > 0) {
          emitEvent(queuedEvents.shift());
        }
      });
    }

    emit(type, data) {
      post({
        data,
        kind: "event",
        type,
      });
    }

    on(type, handler) {
      const handlers = this._eventHandlers[type] ?? [];
      handlers.push(handler);
      this._eventHandlers[type] = handlers;

      return () => {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      };
    }
  }

  globalThis.addEventListener("message", handleMessage);
  globalThis.DILMessenger = DILMessenger;
  post({ kind: "bridge-ready" });
})();
`}
    <\/script>
  </head>
  <body>
${d}
  </body>
</html>`}({channelId:m,html:c,token:n});return(0,i.useLayoutEffect)(()=>{let a=j.current;if(!a)return;let b={channelId:m,iframe:a,messenger:d,srcDoc:s,token:n},c=k.current;return c?.matches(b)?c.updateOptions(b):k.current=c=new ar(b),c.listen(),p(a=>a===s?a:s),c.teardown},[m,d,s,n]),(0,e.jsx)(F.a,{as:"div",className:ap,component:"html-view",height:b,layout:h,width:g,children:(0,e.jsx)("iframe",{ref:j,className:aq,"data-loaded":o&&q===o?"":void 0,onLoad:()=>r(o),sandbox:"allow-scripts",srcDoc:o,title:f})})},icon:at.a,image:aF,input:aH.a,label:aI.a,link:function(a){let{children:b,href:c,onClick:d,onVisible:g,onVisibleWhen:h,onVisibleKey:j,title:k,anchorComponent:l}=a,m=l??"a",n=(0,f.B)(),o=function(a){let b=a.trim();if(!b)return null;if(!/^[a-z][a-z\d+.-]*:/i.test(b)){if(b.startsWith("//")||!b.includes("."))return null;b=`https://${b}`}try{let a=new URL(b);if("http:"!==a.protocol&&"https:"!==a.protocol)return null}catch{return null}return b}(c),p=(0,aJ.a)({onVisible:g,onVisibleKey:j,onVisibleWhen:!1!==h&&null!==o},m);if(!o)return(0,e.jsx)(f.e,{children:b});let r=i.Children.toArray(b),s=r.some(a=>"string"!=typeof a||a.trim())?r:[k?.trim()||new URL(o).hostname],t=s.pop(),u=0===s.length&&"string"==typeof t&&!/\s/u.test(t.trim());if("string"==typeof t){let a=t.trimEnd();s.push(a),t=t.slice(a.length)}return(0,e.jsx)(m,{ref:p,className:u?aK.a.NoWrap:void 0,"data-d-component":"link",href:o,onClick:d?a=>{a.defaultPrevented||0!==a.button||a.metaKey||a.ctrlKey||a.shiftKey||a.altKey||(a.preventDefault(),a.stopPropagation(),n(y.a.link,(0,f.q)(d)))}:void 0,rel:"noopener noreferrer",target:"_blank",title:k,children:(0,e.jsxs)(aa.a,{color:"inherit",inline:!0,underline:"dotted",children:[s,(0,e.jsxs)("span",{className:aK.a.Tail,children:[(0,q.a)(t),(0,e.jsx)("span",{"aria-hidden":"true",children:(0,e.jsx)(at.a,{inline:!0,name:"arrow-up-right-link"})})]})]})})},list:function(a){var b;let c,d,{children:g,connector:h="none",gap:j,items:k,marker:l="bullet",maxMarkerSize:n,start:o}=a,p=aT(n,"md"),q="none"===h&&"md"===p&&aV(l)?l:null,r="number"===l?"ol":"ul",s="number"===l&&null!=o&&Number.isFinite(o)?o:void 0,t="md"!==p||aU(h,l??"none")?4:0,u=(0,m.h)(j??t);return(0,e.jsx)(aN.Provider,{value:h,children:(0,e.jsx)(aO.Provider,{value:{inheritedMarker:l,nativeMarker:q},children:(0,e.jsx)(aQ.Provider,{value:{maxMarkerSize:p,reserveMarkerLane:"md"!==p},children:(0,e.jsxs)(r,{className:aL.a.List,"data-d-component":"list","data-d-connector":"solid"===h?h:void 0,"data-d-marker":"string"==typeof l?l:"rich","data-d-marker-layout":null==q?"custom":"native",start:s,style:{"--d-list-row-gap":u.includes("(")?u:u.split(/\s+/)[0],counterReset:null==s?void 0:"d-list-item "+(s-1),gap:u},children:[(k??[]).map((a,b)=>(0,e.jsx)(aR,{disabled:"string"==typeof a?void 0:a.disabled,label:"string"==typeof a?a:a.label,description:"string"==typeof a?void 0:a.description,children:"string"==typeof a?a:a.children},b)),(b=g,c=[],(d=a=>{i.Children.forEach(a,a=>{(0,i.isValidElement)(a)&&a.type===i.Fragment?d(a.props.children):c.push(a)})})(b),c.map((a,b)=>(0,i.isValidElement)(a)&&null==a.key?(0,i.cloneElement)(a,{key:b}):a)).map((a,b)=>{var c;return(c=a,(0,f.v)(c)?.type===aR)?a:(0,e.jsx)(aR,{children:a},b)})]})})})})},"list-item":aR,loading:function(a){let{label:b="Loading",size:c="md"}=a;return(0,e.jsx)("div",{"aria-label":b,className:"Loading-lQpe5a","data-d-component":"loading",role:"status",children:(0,e.jsx)(aW.a,{size:aX[c]})})},"loading-indicator":function(a){let{color:b="prose",size:c="md"}=a,d=(0,i.useContext)(f.k);return(0,e.jsx)(aY.a,{className:(0,E.b)("LoadingIndicator-wKSQOE",{"text-xs":"xs"===c,"text-sm":"sm"===c,"text-base":"md"===c,"text-lg":"lg"===c,"text-xl":"xl"===c,"text-2xl":"2xl"===c,"text-3xl":"3xl"===c}),"data-d-component":"loading-indicator",name:"empty-circle",style:{color:(0,m.i)((0,m.j)(d,b))}})},lottie:function(a){let{sourceUrlGate:b,src:c,...d}=a,g=(0,i.useContext)(f.k),h="string"!=typeof c&&!("layers"in c&&Array.isArray(c.layers))&&"light"in c&&"dark"in c?c[g]:c,j=(0,e.jsx)(a3,{advanceRate:d.advanceRate,alt:d.alt,animationEndTime:d.animationEndTime,animationStartTime:d.animationStartTime,aspectRatio:d.aspectRatio,assetUrlGate:d.assetUrlGate,currentTime:d.currentTime,fit:d.fit,height:d.height,loop:d.loop,maxHeight:d.maxHeight,maxWidth:d.maxWidth,minHeight:d.minHeight,minWidth:d.minWidth,radius:d.radius,source:h,width:d.width});return b&&"string"==typeof h&&!/^data:/i.test(h)?(0,e.jsx)(b,{url:h,children:j}):j},italic:aj.b,markdown:function(a){let{children:b,streaming:c=!1}=a;return(0,e.jsx)("div",{"data-d-component":"markdown",children:(0,e.jsx)(a4.a,{animateHeight:!0,includeMath:!0,streaming:c,children:b??""})})},math:function(a){let{block:b=!1,value:c}=a;return(0,e.jsx)(a5.a,{block:b,className:"Math-c_BmHA","data-d-block":b?"":void 0,"data-d-component":"math",value:c})},popover:function(a){let{children:b,hoverOpenDelay:c,open:d,showOnHover:f}=a;return(0,e.jsx)(a6.a,{hoverOpenDelay:c,open:d,showOnHover:f,children:b})},"popover-content":a7,"popover-trigger":function(a){let{block:b=!1,children:c,onClick:d,role:g="button"}=a,h=(0,f.B)(),j=(0,i.useContext)(aA.a);return(0,e.jsx)(a6.a.Trigger,{children:(0,e.jsx)(b?"div":"span",{className:(0,E.b)("Trigger-y4ejT1",b&&"TriggerBlock-VOSjY9"),"data-d-component":"popover-trigger","data-d-inline":b?void 0:"","data-d-inline-text":!b&&j?"":void 0,onClick:a=>{a.stopPropagation(),h(y.a["popover-trigger"],(0,f.q)(d))},onKeyDown:"presentation"===g?void 0:a=>{("Enter"===a.key||" "===a.key)&&(a.preventDefault(),a.stopPropagation(),a.currentTarget.click())},role:g,tabIndex:"presentation"===g?void 0:0,children:c})})},"pulse-indicator":function(a){let{color:b,duration:c,endScale:d,pulseColor:g,size:h=12,startOpacity:j}=a,k=(0,i.useContext)(f.k);return(0,e.jsx)("span",{className:"PulseIndicator-hg0Z4u","data-d-component":"pulse-indicator",style:(0,X.g)({"pulse-color":(0,m.i)((0,m.j)(k,b)),"pulse-duration":c?`${c}ms`:void 0,"pulse-end-scale":d?String(d):void 0,"pulse-size":h,"pulse-start-opacity":null==j?void 0:String(j),"pulse-wave-color":(0,m.i)((0,m.j)(k,g??b))})})},pressable:aE,reveal:function(a){let b,c,d,{children:f,targetId:g}=a;return(0,e.jsxs)("div",{className:a9,"data-d-reveal-for":g,children:[f,(0,a8.k)(g)&&!g.includes("\0")&&(0,e.jsx)("style",{children:(b=g.replace(/[^a-zA-Z0-9_-]/gu,a=>`\\${a.codePointAt(0).toString(16)} `),c=`[data-id~="${b}"]:not(template, :scope [data-dil-response] *)`,d=`.${a9}[data-d-reveal-for="${b}"]:not(:hover, :focus-within)`,`
    @media (hover: hover) and (pointer: fine) {
      @scope ([data-dil-response]) to ([data-dil-response]) {
        :scope:has(${c}):not(:has(${c}:is(:hover, :focus-within))) {
          ${d} {
            opacity: 0;
            pointer-events: none;
          }
          .${ba}:has(> ${d}) {
            pointer-events: none;
          }
        }
      }
    }
  `)})]})},radio:bc,"read-only-html-view":bs,"radio-group":function(a){var b;let{captureInteraction:c,runInteraction:d}=(0,f.z)(),[g,h]=(0,i.useState)(null),[j,k]=(0,i.useState)("ltr");(0,i.useLayoutEffect)(()=>{let a=g?.parentElement;if(!a)return;let b=()=>{k("rtl"===getComputedStyle(a).direction?"rtl":"ltr")};b();let c=new MutationObserver(b);return c.observe(a.closest("[dir]")??a,{attributes:!0,attributeFilter:["dir"],characterData:!0,childList:!0,subtree:!0}),()=>c.disconnect()},[g]);let{children:l,defaultValue:m,disabled:n,direction:o="row",label:p,name:q,onChange:r,options:s,required:t,spacing:u,value:v}=a,w=m??("defaultValue"in a?void 0:s?.[0]?.value??""),x="vertical"===(b=o)||"col"===b?"col":"row";return(0,e.jsx)(bb.a,{ref:h,"aria-label":p??q??"Options",asChild:!0,className:"RadioGroup-nex2Ya","data-d-component":"radio-group",defaultValue:null==v?w:void 0,disabled:n,dir:j,direction:x,name:q,onChange:a=>d({...y.a["radio-group"],value:a},(0,f.q)(r,a)),onClickCapture:a=>{n||(0,f.w)(a)||c({...y.a["radio-group"],value:(0,f.t)(a,s)??v??m})},required:t,spacing:u,value:v,children:(0,e.jsx)("div",{dir:void 0,onKeyDownCapture:bd,children:s?.map(a=>(0,e.jsx)(bc,{disabled:a.disabled,value:a.value,children:a.description?(0,e.jsxs)("span",{children:[(0,e.jsx)("span",{children:a.label}),(0,e.jsx)(A.a,{color:"secondary",size:"sm",children:a.description})]}):a.label},a.value))??l})})},row:be.a,stack:function(a){let{block:b,children:c}=a;return(0,e.jsx)("div",{className:"Root-brnxnH","data-d-component":"stack","data-block":b||void 0,children:c})},"stack-item":function(a){let{children:b,placement:c="center-center",inset:d=0,decorative:f=!1}=a,[g,h]=c.split("-");return(0,e.jsx)("div",{"aria-hidden":f||void 0,className:"Item-FkqXW9","data-d-component":"stack-item","data-horizontal":h,"data-vertical":g,inert:f||void 0,style:{inset:(0,m.h)(Number.isFinite(Number(d))?Number(d):d)},children:(0,e.jsx)("div",{className:ba,children:b})})},"search-image":function(a){let{upgradeToFullRes:b=!1,sourceIdentity:c,sourcePending:d,...f}=a;return b?(0,e.jsx)(by,{actionOverlay:f.actionOverlay,imageFrameComponent:f.imageFrameComponent,imageContentComponent:f.imageContentComponent,alt:f.alt,aspectRatio:f.aspectRatio,background:f.background,bitmapBlendMode:f.bitmapBlendMode,containOutsideAspectRatio:f.containOutsideAspectRatio,contentCropFit:f.contentCropFit,fallback:f.fallback,fit:f.fit,frame:f.frame,height:f.height,hideOnFailure:f.hideOnFailure,hoverZoom:f.hoverZoom,maxHeight:f.maxHeight,maxWidth:f.maxWidth,minHeight:f.minHeight,minWidth:f.minWidth,onLoad:f.onLoad,onError:f.onError,onImageLoad:f.onImageLoad,onImageError:f.onImageError,onImageFallback:f.onImageFallback,imageFrameRef:f.imageFrameRef,loadedOverlay:f.loadedOverlay,position:f.position,radius:f.radius,searchImage:f.searchImage,secondaryAction:f.secondaryAction,width:f.width,sourceIdentity:c,sourcePending:d,children:f.children}):(0,e.jsx)(bx,{actionOverlay:f.actionOverlay,imageFrameComponent:f.imageFrameComponent,imageContentComponent:f.imageContentComponent,alt:f.alt,aspectRatio:f.aspectRatio,background:f.background,bitmapBlendMode:f.bitmapBlendMode,containOutsideAspectRatio:f.containOutsideAspectRatio,contentCropFit:f.contentCropFit,fallback:f.fallback,fit:f.fit,frame:f.frame,height:f.height,hideOnFailure:f.hideOnFailure,hoverZoom:f.hoverZoom,maxHeight:f.maxHeight,maxWidth:f.maxWidth,minHeight:f.minHeight,minWidth:f.minWidth,onLoad:f.onLoad,onError:f.onError,onImageLoad:f.onImageLoad,onImageError:f.onImageError,onImageFallback:f.onImageFallback,imageFrameRef:f.imageFrameRef,loadedOverlay:f.loadedOverlay,position:f.position,radius:f.radius,searchImage:f.searchImage,sourceIdentity:c,sourcePending:d,secondaryAction:f.secondaryAction,width:f.width,children:f.children})},select:bD.a,"segmented-control":function(a){let{block:b,defaultValue:c,disabled:d,label:g,onChange:h,options:j,pill:k=!0,size:l="lg",value:m,variant:n="ghost"}=a,{captureInteraction:o,runInteraction:p}=(0,f.z)(),q=c??j[0]?.value??"",[r,s]=(0,i.useState)(q),t=null!=m,u=t?m:r;return(0,e.jsx)("div",{className:"SegmentedControl-QNgUzh","data-d-component":"segmented-control",onKeyDownCapture:a=>bd(a,!1),onClickCapture:a=>{d||(0,f.w)(a)||o({...y.a["segmented-control"],value:(0,f.t)(a,j)??m??c})},children:(0,e.jsx)(bE.a,{"aria-label":g??"Options",block:b,disabled:d,onChange:a=>{t||s(a),p({...y.a["segmented-control"],value:a},(0,f.q)(h,a))},pill:k,size:l,value:u,variant:n,children:j.map(a=>(0,e.jsx)(bE.a.Option,{"aria-label":a.label,disabled:a.disabled,value:a.value,children:a.label},a.value))})})},"shimmer-text":function(a){let{children:b,color:c,italic:d,lineThrough:f,maxLines:g,minLines:h,size:i="md",tabularNums:j,textAlign:k,truncate:l,weight:m,width:n}=a;return(0,e.jsx)(bF.a,{as:"span",className:"Shimmer-tjrk87",color:c,"data-d-component":"shimmer-text",fontStyle:d?"italic":void 0,maxLines:g,minLines:h,size:i,tabularNums:j,textAlign:k,textDecoration:f?"line-through":void 0,truncate:l,weight:m,width:n,children:b})},slider:bG.a,spacer:function(a){let{minSize:b}=a;return(0,e.jsx)("div",{className:"Spacer-wealNO","data-d-component":"spacer",style:(0,X.g)({"w-spacer-min-size":b})})},strikethrough:aj.c,svg:b_,table:function(a){let{columnSizing:b="auto",columns:c=[],children:d,dividers:f=!0,emptyLabel:g="No rows",rows:h=[],stickyHeader:j=!1}=a,k=i.Children.count(d)>0,l=(0,i.useRef)(null);return(0,e.jsxs)("div",{className:b0.a.TableFrame,"data-d-column-sizing":b,"data-d-component":"table",children:[(0,e.jsx)("div",{className:b0.a.TableViewport,"data-d-table-viewport":!0,ref:l,children:(0,e.jsx)("table",{className:b0.a.Table,"data-d-column-sizing":b,"data-d-dividers":f?"":void 0,"data-d-sticky-header":j?"":void 0,style:{tableLayout:"equal"===b?"fixed":"auto"},children:k?function(a){let b=i.Children.toArray(a);if(b.some(b6)){let a=[],c=[],d=()=>{0!==c.length&&(a.push((0,e.jsx)("tbody",{children:c},`loose-rows-${a.length}`)),c=[])};return b.forEach(b=>{if(b6(b)){d(),a.push(b);return}c.push(b)}),d(),a}return(0,e.jsx)("tbody",{children:a})}(d):(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)("thead",{children:(0,e.jsx)("tr",{children:c.map(a=>(0,e.jsx)("th",{"data-d-align":a.align,"data-d-component":"table-cell","data-d-has-width":null!=a.width?"":void 0,scope:"col",style:{width:a.width},children:a.label},a.key))})}),(0,e.jsx)("tbody",{children:0===h.length?(0,e.jsx)("tr",{children:(0,e.jsx)("td",{className:b0.a.EmptyCell,colSpan:c.length||1,children:g})}):h.map((a,b)=>(0,e.jsx)("tr",{children:c.map(b=>{var c;let d=null==(c=a[b.key])?"":"boolean"==typeof c?c?"Yes":"No":String(c);return(0,e.jsx)("td",{"data-d-align":b.align,"data-d-break-long-token":b5(d)?"":void 0,"data-d-component":"table-cell",children:d},b.key)})},b))})]})})}),(0,e.jsx)(K,{viewportRef:l})]})},"table-cell":b4,"table-row":function(a){let{children:b,header:c=!1,label:d,labelColSpan:g}=a,h=(0,i.useContext)(b1),j=(0,e.jsx)(b1.Provider,{value:c||h,children:(0,e.jsx)("tr",{className:b0.a.Row,"data-d-component":"table-row",children:b})});if(!d)return j;let k=g??function(a){let b=0;for(let c of i.Children.toArray(a)){let a=(0,f.v)(c);(0,i.isValidElement)(a)&&a.type===b4&&(b+=function(a){let b=Number(a??1);return Number.isFinite(b)&&b>0?b:1}(a.props.colSpan))}return Math.max(b,1)}(b);return(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)("tr",{className:b0.a.Row,"data-d-component":"table-row-label",children:(0,e.jsx)("td",{className:b0.a.RowLabelCell,colSpan:k,children:(0,e.jsx)("div",{className:b0.a.RowLabelContent,children:(0,e.jsx)("span",{className:b0.a.RowLabelText,children:d})})})}),j]})},"table-section":b3,text:aa.a,textarea:b7.a,title:b8.a,tooltip:function(a){let{content:b,children:c}=a;return(0,e.jsx)(u.Provider,{value:b,children:(0,e.jsx)(f.e,{children:c})})},transition:function(a){let{children:b}=a,c=(0,i.useMemo)(()=>"string"==typeof b||"number"==typeof b?(0,e.jsx)(i.Fragment,{children:b},"transition-child"):(0,i.isValidElement)(b)?null==b.key?(0,i.cloneElement)(b,{key:"transition-child"}):b:i.Children.toArray(b),[b]);return(0,e.jsx)(g.a,{...j(a),children:c})},underline:aj.d},celebration:function(a){let{trigger:b,children:c}=a;return(0,e.jsxs)("div",{className:"Frame-DHyihX","data-d-component":"celebration",children:[c,null!=b&&(0,e.jsx)(ae,{},b)]})},"citation-pill":function(a){let{color:b,count:c,label:d,onHover:g,url:h}=a,j=(0,i.useContext)(f.k);return(0,e.jsxs)(ab,{className:"Pill-vMH1qo",color:"secondary","data-d-component":"badge","data-d-hoverable":g?"":void 0,onMouseEnter:g?()=>g(!0):void 0,onMouseLeave:g?()=>g(!1):void 0,pill:!0,size:"sm",style:{background:(0,m.c)((0,m.j)(j,b),j)},variant:"soft",children:[h?(0,e.jsx)("span",{className:"Favicon-gpdrW0",children:(0,e.jsx)(_,{size:12,url:h})}):null,(0,e.jsx)("span",{className:"Label-f1ZlTd",children:(0,e.jsx)(aa.a,{color:"secondary",inline:!0,maxLines:1,size:"3xs",truncate:!0,children:d})}),c>1?(0,e.jsx)("span",{className:"Count-sWqf87",children:(0,e.jsxs)(aa.a,{color:"tertiary",inline:!0,size:"3xs",children:["+",c-1]})}):null]})},"flashcard-flip":function(a){let{children:b,faceBackground:c,onLoad:d,...e}=a,f=(0,ak.a)(d);(0,i.useLayoutEffect)(()=>{f.current?.()},[f]);let[g,h,...j]=i.Children.toArray(b);if(void 0===g||void 0===h)throw Error("DIL flashcard-flip requires question and answer children.");return(0,i.createElement)(al.a,{...e,backFace:h,faceBackground:c??am},[g,...j])},"loading-block":az,youtube:function(a){let{aspectRatio:b="16 / 9",hoverToPlay:c=!1,maxWidth:d="100%",onHover:g,onPlayerError:h,onThumbnailError:j,scriptNonce:k,showDurationBadge:l=!1,showThumbnail:m=!1,title:n="YouTube video player",videoId:o,width:p="100%"}=a,q=(0,i.useContext)(f.d),[r,s]=(0,i.useState)(null);return"string"==typeof o&&/^[A-Za-z0-9_-]{11}$/.test(o)?(0,e.jsx)("div",{className:"YouTubeEmbed-anNc3l","data-d-component":"youtube",style:{aspectRatio:b,maxWidth:d,width:p},children:q?(0,e.jsx)("div",{"aria-label":n,role:"img",style:{alignItems:"center",backgroundColor:"var(--color-surface-secondary)",color:"var(--color-text-secondary)",display:"flex",height:"100%",justifyContent:"center",width:"100%"},children:(0,e.jsx)("span",{"aria-hidden":"true",style:{fontSize:"2.5rem"},children:"\u25B6"})}):m||l||c||g||h?(0,e.jsx)(cc,{hoverToPlay:c,onHover:g,onPlayerError:h,onThumbnailError:j,scriptNonce:k,showDurationBadge:l,showThumbnail:m,title:n,videoId:o},`${o}:${m}:${l}:${c}`):(0,e.jsx)("iframe",{className:"Iframe-lhSyVM","data-loaded":r===o?"":void 0,onLoad:()=>s(o),allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",allowFullScreen:!0,referrerPolicy:"strict-origin-when-cross-origin",src:`https://www.youtube.com/embed/${o}`,title:n})}):null}}},K2hS(a,b,c){c.d(b,{a:()=>C,b:()=>t});var d=c("zd8w"),e=c("zWxU"),f=c("Fc3g"),g=c("XDr4"),h=c("kUVq"),i=c("Hj0L"),j=c("ABep"),k=Object.defineProperty,l=d.forwardRef(k(function(a,b){let{pressed:c,defaultPressed:d,onPressedChange:e,...g}=a,[k,l]=(0,i.a)({prop:c,onChange:e,defaultProp:d??!1,caller:"Toggle"});return(0,j.jsx)(f.a.button,{type:"button","aria-pressed":k,"data-state":k?"on":"off","data-disabled":a.disabled?"":void 0,...g,ref:b,onClick:(0,h.a)(a.onClick,()=>{a.disabled||l(!k)})})},"name",{value:"Toggle",configurable:!0})),m=c("k5JT"),n=Object.defineProperty,o=(a,b)=>n(a,"name",{value:b,configurable:!0}),p="ToggleGroup",[q,r]=(0,e.a)(p,[g.c]),s=(0,g.c)(),t=d.forwardRef(o(function(a,b){let{type:c,...d}=a;if("single"===c)return(0,j.jsx)(w,{role:"radiogroup",...d,ref:b});if("multiple"===c)return(0,j.jsx)(x,{role:"toolbar",...d,ref:b});throw Error(`Missing prop \`type\` expected on \`${p}\``)},"ToggleGroup")),[u,v]=q(p),w=d.forwardRef(o(function(a,b){let{value:c,defaultValue:e,onValueChange:f=o(()=>{},"onValueChange"),...g}=a,[h,k]=(0,i.a)({prop:c,defaultProp:e??"",onChange:f,caller:p});return(0,j.jsx)(u,{scope:a.__scopeToggleGroup,type:"single",value:d.useMemo(()=>h?[h]:[],[h]),onItemActivate:k,onItemDeactivate:d.useCallback(()=>k(""),[k]),children:(0,j.jsx)(A,{...g,ref:b})})},"ToggleGroupImplSingle")),x=d.forwardRef(o(function(a,b){let{value:c,defaultValue:e,onValueChange:f=o(()=>{},"onValueChange"),...g}=a,[h,k]=(0,i.a)({prop:c,defaultProp:e??[],onChange:f,caller:p}),l=d.useCallback(a=>k((b=[])=>[...b,a]),[k]),m=d.useCallback(a=>k((b=[])=>b.filter(b=>b!==a)),[k]);return(0,j.jsx)(u,{scope:a.__scopeToggleGroup,type:"multiple",value:h,onItemActivate:l,onItemDeactivate:m,children:(0,j.jsx)(A,{...g,ref:b})})},"ToggleGroupImplMultiple")),[y,z]=q(p),A=d.forwardRef(o(function(a,b){let{__scopeToggleGroup:c,disabled:d=!1,rovingFocus:e=!0,orientation:h,dir:i,loop:k=!0,...l}=a,n=s(c),o=(0,m.useDirection)(i),p={dir:o,...l};return(0,j.jsx)(y,{scope:c,rovingFocus:e,disabled:d,children:e?(0,j.jsx)(g.b,{asChild:!0,...n,orientation:h,dir:o,loop:k,children:(0,j.jsx)(f.a.div,{...p,ref:b})}):(0,j.jsx)(f.a.div,{...p,ref:b})})},"ToggleGroupImpl")),B="ToggleGroupItem",C=d.forwardRef(o(function(a,b){let c=v(B,a.__scopeToggleGroup),e=z(B,a.__scopeToggleGroup),f=s(a.__scopeToggleGroup),h=c.value.includes(a.value),i=e.disabled||a.disabled,k={...a,pressed:h,disabled:i},l=d.useRef(null);return e.rovingFocus?(0,j.jsx)(g.a,{asChild:!0,...f,focusable:!i,active:h,ref:l,children:(0,j.jsx)(D,{...k,ref:b})}):(0,j.jsx)(D,{...k,ref:b})},"ToggleGroupItem")),D=d.forwardRef(o(function(a,b){let{__scopeToggleGroup:c,value:d,...e}=a,f=v(B,c),g={role:"radio","aria-checked":a.pressed,"aria-pressed":void 0},h="single"===f.type?g:void 0;return(0,j.jsx)(l,{...h,...e,ref:b,onPressedChange:a=>{a?f.onItemActivate(d):f.onItemDeactivate(d)}})},"ToggleGroupItemImpl"))},jqtP(a,b,c){var d=c("pJUL");c.d(b,{},{a:function(a,b){return a&&"run"in a?async function(c,e){let f=(0,d.a)(c,{file:e,...b});await a.run(f,e)}:function(c,e){return(0,d.a)(c,{file:e,...a||b})}}})}};