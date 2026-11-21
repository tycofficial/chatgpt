export const __rspack_esm_ids=[652164];export const __webpack_modules__={Ovip(a,b,c){let d="var(--color-surface)",e=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 94%,
  var(--color-surface)
)`,f=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 94%,
  var(--color-text-info)
)`,g=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 92%,
  var(--color-surface)
)`,h=`color-mix(
  in lab,
  var(--codex-diffs-surface) 98.5%,
  var(--diffs-mixer)
)`,i=`light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-addition-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-addition-base))
)`,j=`light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-deletion-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-deletion-base))
)`,k=`light-dark(
  color-mix(
    in lab,
    var(--diffs-light-bg, #fff) 80%,
    var(--diffs-addition-base)
  ),
  color-mix(
    in lab,
    var(--diffs-dark-bg, #000) 70%,
    var(--diffs-addition-base)
  )
)`,l=`light-dark(
  color-mix(
    in lab,
    var(--diffs-light-bg, #fff) 80%,
    var(--diffs-deletion-base)
  ),
  color-mix(
    in lab,
    var(--diffs-dark-bg, #000) 75%,
    var(--diffs-deletion-base)
  )
)`,m=`
  --codex-diffs-surface: ${d};
  --codex-diffs-context-surface: ${e};
  --codex-diffs-separator-surface: ${f};
  --codex-diffs-hover-surface: ${g};
  --codex-diffs-header-surface: var(--codex-diffs-surface);
  --codex-diffs-context-number: ${h};
  --codex-diffs-addition-number: ${i};
  --codex-diffs-deletion-number: ${j};
  --codex-diffs-addition-hover: ${k};
  --codex-diffs-deletion-hover: ${l};
  /* Keep unhighlighted lines readable while syntax tokens are pending. */
  --diffs-dark: var(--color-text);
  --diffs-light: var(--color-text);
  --diffs-bg-context-override: var(--codex-diffs-context-surface);
  --diffs-bg-separator-override: var(--codex-diffs-separator-surface);
  --diffs-bg-hover-override: var(--codex-diffs-hover-surface);
`;c.d(b,{},{a:function(a,b){return a?"diff"===b?"var(--color-codex-diff-surface)":d:"var(--color-surface-secondary)"},b:function(a){let{alignCommentGutter:b=!1,includeDiffHeader:c,includeSimpleLineSeparators:d,rootSelector:e,surface:f,useReviewLineInfoSeparators:g=!1}=a,h=c?`[data-diffs-header],
  ${e}`:e,i=d?`
  :host(.composer-diff-simple-line) [data-separator]:empty {
    background-color: transparent;
  }

  :host(.composer-diff-simple-line) [data-separator]:empty::after {
    content: "";
    grid-column: 2 / 3;
    align-self: center;
    margin-inline: 1ch;
    border-top: 1px solid color-mix(in srgb, var(--diffs-fg) 18%, transparent);
  }
`:"",j=b?`
  ${e} [data-column-number] {
    padding-inline-start: calc(var(--spacing) * 10);
  }
`:"",k=g?`
  ${e} [data-column-number] {
    padding-inline: 1.5ch;
    text-align: center;
  }

  ${e} [data-separator='line-info'] :is([data-separator-wrapper], [data-expand-button], [data-separator-content]) {
    border-radius: 0;
  }

  ${e} [data-separator='line-info'] [data-separator-wrapper] {
    padding: 0;
  }

  ${e} [data-unified] [data-separator='line-info'] [data-separator-wrapper] {
    grid-template-columns: var(--diffs-column-number-width) minmax(0, 1fr);
  }

  ${e} [data-unified] [data-separator='line-info'] [data-expand-button] {
    min-width: 0;
  }

  /* Pierre duplicates split separators into each gutter and content cell. */
  ${e} [data-deletions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    background-color: var(--diffs-bg);
    grid-template-columns: minmax(0, 1fr);
  }

  ${e} [data-deletions] [data-gutter] [data-separator='line-info'] [data-separator-content],
  ${e} [data-deletions] [data-content] [data-separator='line-info'] [data-expand-button] {
    display: none;
  }

  ${e} [data-deletions] [data-content] [data-separator='line-info'] [data-separator-wrapper] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  ${e} [data-deletions] [data-content] [data-separator='line-info'] [data-separator-content] {
    grid-column: 1;
  }

  ${e} [data-additions] [data-gutter] [data-separator='line-info'],
  ${e} [data-additions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    background-color: var(--diffs-bg-separator);
  }

  ${e}[data-overflow='scroll'] [data-additions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    width: 100cqi;
  }

  ${e} [data-additions] [data-content] [data-separator='line-info'] [data-separator-wrapper] {
    margin-inline-end: 0;
  }
`:"",l=`
  /* Preserve the pre-beta split-column width instead of reserving a scrollbar gutter in every pane. */
  ${e} [data-code] {
    scrollbar-gutter: auto;
  }

  ${e} [data-line-type='change-addition']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-addition);
  }

  ${e} [data-line-type='change-addition']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--codex-diffs-addition-number);
  }

  ${e} [data-line-type='change-deletion']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-deletion);
  }

  ${e} [data-line-type='change-deletion']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--codex-diffs-deletion-number);
  }

  ${e} [data-line-type='change-addition'][data-hovered]:not([data-selected-line]) {
    --diffs-computed-hovered-line-bg: var(--codex-diffs-addition-hover);
  }

  ${e} [data-line-type='change-deletion'][data-hovered]:not([data-selected-line]) {
    --diffs-computed-hovered-line-bg: var(--codex-diffs-deletion-hover);
  }
`;return`
  [data-unmodified-lines][hidden] { display: none !important; }
  [data-expand-index] [data-separator-content]:hover {
    text-decoration: none;
    & > :not([data-context-message="loading"]) {
      text-decoration: underline;
    }
  }
  [data-context-pending] > svg { visibility: hidden; }
  [data-context-pending] {
    position: relative;
    color: var(--diffs-fg-number);
  }
  [data-context-pending]::after, [data-context-label-pending]::before {
    content: "";
    position: absolute;
    inset: 0;
    margin: auto;
    width: 11px;
    height: 11px;
    box-sizing: border-box;
    border: 1.5px solid currentColor;
    border-inline-end-color: transparent;
    border-radius: 50%;
    animation: codex-context-loading .8s linear infinite;
    animation-play-state: var(--decorative-animation-play-state, running);
  }
  [data-context-label-pending]::before {
    position: static;
    display: inline-block;
    margin-inline-end: .5em;
    vertical-align: middle;
  }
  @keyframes codex-context-loading { to { transform: rotate(1turn); } }
  @media (prefers-reduced-motion: reduce) { [data-context-pending]::after, [data-context-label-pending]::before { animation: none; } }
  [data-context-message="error"] { color: var(--diffs-fg); }
  [data-context-retry] {
    font: inherit;
    color: inherit;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: var(--cursor-interaction);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  ${h} {
    ${m}
    --diffs-bg: ${f} !important;
    background-color: ${f} !important;
  }

  ${e} [data-language-symbol-highlight] {
    background-color: var(--color-background-secondary-ghost-hover) !important;
  }

  ${e} [data-language-symbol-link] {
    text-decoration: underline;
    cursor: var(--cursor-interaction);
  }

  ${e} [data-utility-button] {
    background-color: var(--color-text);
    color: var(--color-surface-secondary);
    border: none;
    border-radius: 4px;
    margin-right: 0;
  }

  ${e} [data-utility-button]:hover {
    background-color: color-mix(
      in srgb,
      var(--color-text) 88%,
      var(--color-surface-secondary)
    );
  }

  ${e} [data-selected-line][data-line-annotation] {
    background-color: var(--diffs-bg);
  }

  [data-placeholder][data-loading] {
    --codex-diffs-placeholder-base: color-mix(
      in srgb,
      var(--color-codex-description) 10%,
      transparent
    );
    --codex-diffs-placeholder-highlight: color-mix(
      in srgb,
      var(--color-codex-description) 16%,
      transparent
    );
    position: relative;
    overflow: hidden;
    background-image: linear-gradient(
      to right,
      var(--codex-diffs-placeholder-base) 0 82%,
      transparent 82%
    );
    background-position: 12px 8px;
    background-size: calc(100% - 24px) 22px;
    background-repeat: repeat-y;
  }

  [data-placeholder][data-loading]::before {
    content: "";
    position: absolute;
    inset: 8px 12px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--codex-diffs-placeholder-highlight) 50%,
      transparent 100%
    );
    transform: translateX(-100%);
    animation: codex-diffs-placeholder-shimmer 3000ms linear infinite;
    mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 14px,
      transparent 14px 22px
    );
  }

  @media (prefers-reduced-motion: reduce) {
    [data-placeholder][data-loading]::before {
      animation: none;
    }
  }

  @keyframes codex-diffs-placeholder-shimmer {
    to {
      transform: translateX(100%);
    }
  }

${l}

  ${e} [data-line-type="change-deletion"][data-column-number]::before {
    background-color: var(--diffs-deletion-base);
    background-image: none;
  }

  /* Cover fractional-pixel gaps between consecutive solid change markers. */
  ${e} [data-line-type="change-addition"][data-column-number]
    + [data-line-type="change-addition"][data-column-number]::before,
  ${e} [data-line-type="change-deletion"][data-column-number]
    + [data-line-type="change-deletion"][data-column-number]::before {
    contain: none;
    top: -1px;
    height: calc(100% + 1px);
  }

${k}

${j}

${i}`}})},Y0Ea(a,b,c){c.d(b,{FileDiffPresentation:()=>C});var d=c("ABep"),e=c("QosV"),f=c("jy0O"),g=c("D7Ms"),h=c("Q840"),i=c("zd8w"),j=c("F5N3"),k=c("TwSq"),l=c("Ovip"),m=c("NxNN"),n=c("uNhY"),o=c("OWtl"),p=c("tSEg"),q=c("R9dK"),r=c.n(q);function s(a,b,c){let d=new Set,e=function(a){let b=[0];for(let c of a)b.push(b[b.length-1]+c.length);return b}(a);return e[e.length-1]>1e6||b.parse(a.join("")).iterate({enter(b){let{node:f}=b;if(f.parent?.parent!=null||!function(a,b){switch(a){case"javascript":case"typescript":case"tsx":case"java":return"ImportDeclaration"===b.name;case"python":return"ImportStatement"===b.name;case"rust":return null==b.getChild("Vis")&&("UseDeclaration"===b.name||"ExternCrateDeclaration"===b.name);case"go":return"ImportDecl"===b.name}}(c,f))return;let g=r()(e,f.from)-1,h=r()(e,f.to-1)-1,i=f.to;for(let b=f.nextSibling;null!=b&&!(b.from>=e[h+1])&&!(b.to>e[h+1])&&["LineComment","BlockComment","Comment"].includes(b.name)&&""===a[h].slice(i-e[h],b.from-e[h]).trim();b=b.nextSibling)i=b.to;if(""!==a[g].slice(0,f.from-e[g]).trim()||""!==a[h].slice(i-e[h]).trim())return!1;let j=!1;if(f.toTree().iterate({enter(a){let{type:b}=a;b.isError&&(j=!0)}}),j)return!1;for(let a=g;a<=h;a+=1)d.add(a);return!1}}),d}var t=c("hTLy"),u=c.n(t);let v=new Set(["Body","Block","ClassBody","EnumBody","ConstructorBody","InterfaceBody","AnnotationTypeBody","ModuleBody","DeclarationList","FieldDeclarationList","OrderedFieldDeclarationList","EnumVariantList","MatchBlock","FieldInitializerList","StructBody","SwitchBlock","SelectBlock","LiteralValue"]),w=new Set(["ObjectExpression","ArrayExpression","ArrayInitializer","TypeLiteral","DictionaryExpression","SetExpression","TupleExpression","ArrowFunction","ParenthesizedExpression","JSXElement"]);function x(a,b){if(null==b)return a;let c=y(a,"additions",b),d=y(a,"deletions",b);if(0===c.size&&0===d.size)return a;let e=[],f=0,g=0,h=0,i=0;for(let b=0;b<=a.hunks.length;b+=1){let j=a.hunks[b],k=j?.collapsedBefore??a.additionLines.length-f,l=0;for(let b=0;b<k;b+=1){if(!c.has(f+b)&&!d.has(g+b))continue;let j=b;for(;b+1<k&&(c.has(f+b+1)||d.has(g+b+1));)b+=1;let m=b-j+1,n=f+j,o=g+j;e.push({collapsedBefore:j-l,additionStart:n+1,deletionStart:o+1,additionLineIndex:n,deletionLineIndex:o,additionCount:m,deletionCount:m,additionLines:0,deletionLines:0,hunkContent:[{type:"context",lines:m,additionLineIndex:n,deletionLineIndex:o}],splitLineStart:h+j,unifiedLineStart:i+j,splitLineCount:m,unifiedLineCount:m,noEOFCRAdditions:n+m===a.additionLines.length&&!a.additionLines.at(-1)?.endsWith("\n"),noEOFCRDeletions:o+m===a.deletionLines.length&&!a.deletionLines.at(-1)?.endsWith("\n")}),l=b+1}null!=j&&(e.push(0===l?j:{...j,collapsedBefore:k-l}),f=j.additionLineIndex+j.additionCount,g=j.deletionLineIndex+j.deletionCount,h=j.splitLineStart+j.splitLineCount,i=j.unifiedLineStart+j.unifiedLineCount)}return e.length===a.hunks.length?a:{...a,hunks:e,cacheKey:`${a.cacheKey??a.name}:structural-context`}}function y(a,b,c){let d="additions"===b?a.additionLines:a.deletionLines,e=new Set,f=[0];for(let a of d)f.push(f[f.length-1]+a.length);if(f[f.length-1]>1e6)return e;let g=[],h=[];for(let c of a.hunks)for(let a of c.hunkContent){if("change"!==a.type||0===a[b])continue;let c="additions"===b?a.additionLineIndex:a.deletionLineIndex;g.push(f[c]),h.push(f[c+a[b]])}return 0===g.length||c.parse(d.join("")).iterate({enter(a){let{node:b}=a,c=u()(h,b.from+1);if(c===h.length||g[c]>=b.to)return!1;if(!v.has(b.name)&&!w.has(b.name))return;let d="ArrowFunction"===b.name?b.getChild("Arrow"):b.firstChild,i=b.lastChild;if(null==d||null==i||d.type.isError||i.type.isError)return;let j=b.from;if(v.has(b.name)){let a=b.parent;j=null==a||v.has(a.name)?b.from:a.from;for(let a=b.prevSibling;null!=a;a=a.prevSibling)if("Body"===a.name||"Block"===a.name){j=a.nextSibling?.from??b.from;break}}let k=r()(f,j)-1,l=r()(f,d.to-1)-1;if(k!==r()(f,b.to-1)-1){e.add(k);for(let a=Math.max(k+1,l-8+2);a<=l;a+=1)e.add(a)}}}),e}function z(a){switch(a.name.split(".").at(-1)?.toLowerCase()){case"ts":case"mts":case"cts":return"typescript";case"tsx":return"tsx";case"js":case"jsx":case"mjs":case"cjs":return"javascript";case"py":case"pyi":return"python";case"rs":return"rust";case"go":return"go";case"java":return"java";default:return}}c("SV8P");let A=(0,h.d)(p.a,(a,b)=>{let{get:c}=b;if(!c(m.d))return!1;let d=c(k.g)?.location;return d?.domain!=="diff"||d.path!==a||"path"===d.hunkId}),B=(0,h.q)(o.a,a=>({queryKey:["diff-context-parser",a],queryFn:null==a?g.u:()=>(async function(a){switch(a){case"javascript":case"typescript":case"tsx":{let{parser:b}=await Promise.all([c.e(652500),c.e(877652)]).then(c.bind(c,"a6Ic"));return b.configure({dialect:{typescript:"ts",tsx:"ts jsx",javascript:"jsx"}[a]})}case"python":return(await Promise.all([c.e(652500),c.e(255674)]).then(c.bind(c,"sDAw"))).parser;case"rust":return(await Promise.all([c.e(652500),c.e(644049)]).then(c.bind(c,"YrxW"))).parser;case"go":return(await Promise.all([c.e(652500),c.e(715154)]).then(c.bind(c,"UOgE"))).parser;case"java":return(await Promise.all([c.e(652500),c.e(652809)]).then(c.bind(c,"fD4l"))).parser}})(a),staleTime:1/0}));function C(a){let b,c=(0,e.c)(2);return c[0]!==a?(b=null==a.reviewPath?(0,d.jsx)(F,{...a}):(0,d.jsx)(E,{...a,reviewPath:a.reviewPath}),c[0]=a,c[1]=b):b=c[1],b}function D(a){return(a.hunkSeparators??"line-info")!=="line-info"||a.expandUnchanged||null!=a.loadDiffFiles?void 0:function(a){let b=a.hunks.at(-1);if(!(a.isPartial||null==b||"new"===a.type||"deleted"===a.type||b.additionLineIndex+b.additionCount===a.additionLines.length&&a.hunks.every(a=>0===a.collapsedBefore)))return z(a)}(a.fileDiff)}function E(a){let b,c,f,g,i,j=(0,e.c)(20),k=(0,h.x)(A,a.reviewPath);j[0]!==a?(b=D(a),j[0]=a,j[1]=b):b=j[1];let l=b;j[2]!==l||j[3]!==k||j[4]!==a.fileDiff?(c=l??(k&&!a.fileDiff.isPartial&&"new"!==a.fileDiff.type&&"deleted"!==a.fileDiff.type?z(a.fileDiff):void 0),j[2]=l,j[3]=k,j[4]=a.fileDiff,j[5]=c):c=j[5];let m=c,{data:n}=(0,h.x)(B,m);j[6]!==l||j[7]!==n||j[8]!==a.fileDiff?(f=null==l?a.fileDiff:x(a.fileDiff,n),j[6]=l,j[7]=n,j[8]=a.fileDiff,j[9]=f):f=j[9];let o=f;j[10]!==o||j[11]!==k||j[12]!==m||j[13]!==n||j[14]!==a.lineAnnotations?(g=k?function(a,b,c,d){if(null==b||null==c||a.isPartial||"new"===a.type||"deleted"===a.type)return a;let e=s(a.additionLines,b,c),f=s(a.deletionLines,b,c),g=a.hunks.filter(b=>d?.some(a=>{let{side:c,lineNumber:d}=a,e="additions"===c?b.additionStart:b.deletionStart,f="additions"===c?b.additionCount:b.deletionCount;return d>=e&&d<e+f})||!function(a,b,c,d){let e=!1;for(let f of b.hunkContent)if("context"!==f.type){for(let b=f.additionLineIndex;b<f.additionLineIndex+f.additions;b+=1)if(c.has(b))e=!0;else if(a.additionLines[b]?.trim()!=="")return!1;for(let b=f.deletionLineIndex;b<f.deletionLineIndex+f.deletions;b+=1)if(d.has(b))e=!0;else if(a.deletionLines[b]?.trim()!=="")return!1}return e}(a,b,e,f));return g.length===a.hunks.length?a:function(a,b){let c=[],d=[],e=[],f=0,g=0,h=0;for(let i of b){let b=c.length,j=d.length,k=i.hunkContent.map(b=>{let e={...b,additionLineIndex:c.length,deletionLineIndex:d.length};return"context"===b.type?(c.push(...a.additionLines.slice(b.additionLineIndex,b.additionLineIndex+b.lines)),d.push(...a.deletionLines.slice(b.deletionLineIndex,b.deletionLineIndex+b.lines))):(c.push(...a.additionLines.slice(b.additionLineIndex,b.additionLineIndex+b.additions)),d.push(...a.deletionLines.slice(b.deletionLineIndex,b.deletionLineIndex+b.deletions))),e}),l=i.additionStart-(0!==i.additionCount),m=Math.max(l-f,0);e.push({...i,additionLineIndex:b,deletionLineIndex:j,hunkContent:k,collapsedBefore:m,splitLineStart:g+m,unifiedLineStart:h+m}),f=l+i.additionCount,g+=m+i.splitLineCount,h+=m+i.unifiedLineCount}return{...a,additionLines:c,deletionLines:d,hunks:e,isPartial:!0,splitLineCount:g,unifiedLineCount:h,cacheKey:`${a.cacheKey??a.name}:hide-imports:${b.map(a=>a.additionStart).join(",")}`}}(a,g)}(o,n,m,a.lineAnnotations):o,j[10]=o,j[11]=k,j[12]=m,j[13]=n,j[14]=a.lineAnnotations,j[15]=g):g=j[15];let p=g,q=o!==a.fileDiff?3:void 0;return j[16]!==p||j[17]!==a||j[18]!==q?(i=(0,d.jsx)(H,{...a,fileDiff:p,collapsedContextThreshold:q}),j[16]=p,j[17]=a,j[18]=q,j[19]=i):i=j[19],i}function F(a){let b,c,f=(0,e.c)(5);f[0]!==a?(b=D(a),f[0]=a,f[1]=b):b=f[1];let g=b;return f[2]!==g||f[3]!==a?(c=null==g?(0,d.jsx)(H,{...a}):(0,d.jsx)(G,{...a,language:g}),f[2]=g,f[3]=a,f[4]=c):c=f[4],c}function G(a){let b,c,f,g,i=(0,e.c)(10);i[0]!==a?({language:b,...c}=a,i[0]=a,i[1]=b,i[2]=c):(b=i[1],c=i[2]);let{data:j}=(0,h.x)(B,b);i[3]!==j||i[4]!==c.fileDiff?(f=x(c.fileDiff,j),i[3]=j,i[4]=c.fileDiff,i[5]=f):f=i[5];let k=f,l=k!==c.fileDiff?3:void 0;return i[6]!==k||i[7]!==c||i[8]!==l?(g=(0,d.jsx)(H,{...c,fileDiff:k,collapsedContextThreshold:l}),i[6]=k,i[7]=c,i[8]=l,i[9]=g):g=i[9],g}function H(a){let b,c,g,h,k,m,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I=(0,e.c)(53);if(I[0]!==a){let{alignCommentGutter:d,className:e,fileDiff:f,diffIndicators:i,hunkSeparators:j,reviewPath:l,lineAnnotations:n,lineDiffType:B,metrics:C,onGutterUtilityClick:D,onPostRender:E,onPostRenderInstance:F,renderAnnotation:G,selectedLines:H,overflow:J,theme:K,themeType:L,useReviewLineInfoSeparators:M,collapsedContextThreshold:N,...O}=a;u=d,b=e,g=f,v=i,w=j,h=n,k=B,m=C,o=D,p=E,q=F,r=G,t=H,x=J,A=K,y=L,z=M,c=N,s=O,I[0]=a,I[1]=b,I[2]=c,I[3]=g,I[4]=h,I[5]=k,I[6]=m,I[7]=o,I[8]=p,I[9]=q,I[10]=r,I[11]=s,I[12]=t,I[13]=u,I[14]=v,I[15]=w,I[16]=x,I[17]=y,I[18]=z,I[19]=A}else b=I[1],c=I[2],g=I[3],h=I[4],k=I[5],m=I[6],o=I[7],p=I[8],q=I[9],r=I[10],s=I[11],t=I[12],u=I[13],v=I[14],w=I[15],x=I[16],y=I[17],z=I[18],A=I[19];let J=void 0!==u&&u,K=void 0===v?"bars":v,L=void 0===w?"line-info":w,M=void 0===x?"scroll":x,N=void 0===y?"system":y,O=void 0!==z&&z,P=(0,i.useContext)(j.a);I[20]!==P?(B=null==P?void 0:a=>(0,j.c)(P,a),I[20]=P,I[21]=B):B=I[21],I[22]===Symbol.for("react.memo_cache_sentinel")?(C=(0,n.a)(),I[22]=C):C=I[22];let Q=null!=o;return I[23]!==p||I[24]!==q?(D=(a,b,c)=>{q?.(a,b,c),"unmount"!==c&&p?.(a)},I[23]=p,I[24]=q,I[25]=D):D=I[25],I[26]!==J||I[27]!==O?(E=(0,l.b)({alignCommentGutter:J,includeDiffHeader:!0,includeSimpleLineSeparators:!0,rootSelector:":is([data-diff], [data-file])",surface:"var(--codex-diffs-surface)",useReviewLineInfoSeparators:O}),I[26]=J,I[27]=O,I[28]=E):E=I[28],I[29]!==c||I[30]!==K||I[31]!==L||I[32]!==k||I[33]!==o||I[34]!==M||I[35]!==s||I[36]!==D||I[37]!==E||I[38]!==Q||I[39]!==A||I[40]!==N?(F={overflow:M,hunkSeparators:L,collapsedContextThreshold:c,themeType:N,theme:A,preferredHighlighter:C,disableFileHeader:!0,diffIndicators:K,enableGutterUtility:Q,lineDiffType:k,onGutterUtilityClick:o,onPostRender:D,unsafeCSS:E,...s},I[29]=c,I[30]=K,I[31]=L,I[32]=k,I[33]=o,I[34]=M,I[35]=s,I[36]=D,I[37]=E,I[38]=Q,I[39]=A,I[40]=N,I[41]=F):F=I[41],I[42]!==g||I[43]!==h||I[44]!==m||I[45]!==r||I[46]!==t||I[47]!==F||I[48]!==B?(G=(0,d.jsx)(f.a,{deferCleanup:B,fileDiff:g,lineAnnotations:h,metrics:m,renderAnnotation:r,selectedLines:t,options:F}),I[42]=g,I[43]=h,I[44]=m,I[45]=r,I[46]=t,I[47]=F,I[48]=B,I[49]=G):G=I[49],I[50]!==b||I[51]!==G?(H=(0,d.jsx)("div",{className:b,children:G}),I[50]=b,I[51]=G,I[52]=H):H=I[52],H}},kPrN(a,b,c){var d=c("ABep"),e=c("QosV"),f=c("ePCn"),g=c("yZpl"),h=c("zd8w"),i=c("Y0Ea"),j=c("g0G2"),k=c("NgMj"),l=c("tgV8"),m=c("ADAj"),n=c("kkEw"),o=c("dDkj"),p=c("a6Zv");function q(a){let b,c,d=(0,e.c)(4),{lineDiffType:g}=a,i=(0,f.b)();return d[0]!==g||d[1]!==i?(b=()=>{if(null==i)return;let a=i.getDiffRenderOptions();a.lineDiffType!==g&&i.setRenderOptions({...a,lineDiffType:g})},c=[g,i],d[0]=g,d[1]=i,d[2]=b,d[3]=c):(b=d[2],c=d[3]),(0,h.useEffect)(b,c),null}c("wIFP"),c.d(b,{},{FileDiff:function(a){let b,c,f,h,r,s,t,u,v,w,x,y,z,A,B,C,D,E=(0,e.c)(45);E[0]!==a?({alignCommentGutter:h,lineDiffType:b,onPostRenderInstance:c,...f}=a,E[0]=a,E[1]=b,E[2]=c,E[3]=f,E[4]=h):(b=E[1],c=E[2],f=E[3],h=E[4]);let F=void 0!==h&&h,G=(0,o.a)(),H=(0,o.b)(G),I=(0,m.l)(g.Vd.lightCodeThemeId),J=(0,m.l)(g.Vd.darkCodeThemeId),K=(0,m.l)(g.Vd.diffMarkerStyle);(0,p.a)();let L="symbols"===K;E[5]!==H||E[6]!==J||E[7]!==I?(r="light"===H?(0,n.b)(I,"light"):(0,n.b)(J,"dark"),E[5]=H,E[6]=J,E[7]=I,E[8]=r):r=E[8];let M=r;if(E[9]!==F||E[10]!==M||E[11]!==b||E[12]!==c||E[13]!==f||E[14]!==L){let a;(0,n.a)(void 0),E[25]!==f.fileDiff?(a=(0,k.b)(f.fileDiff),E[25]=f.fileDiff,E[26]=a):a=E[26];let e=a;t=j.a,E[27]!==b?(u=null==b?null:(0,d.jsx)(q,{lineDiffType:b}),E[27]=b,E[28]=u):u=E[28],s=i.FileDiffPresentation,v=f,w=e,x=F,y=L?"classic":"bars",z=b,E[29]!==c?(A=(a,b,d)=>{(0,l.b)(a,b),c?.(a,b,d)},E[29]=c,E[30]=A):A=E[30],B=M.name,E[9]=F,E[10]=M,E[11]=b,E[12]=c,E[13]=f,E[14]=L,E[15]=s,E[16]=t,E[17]=u,E[18]=v,E[19]=w,E[20]=x,E[21]=y,E[22]=z,E[23]=A,E[24]=B}else s=E[15],t=E[16],u=E[17],v=E[18],w=E[19],x=E[20],y=E[21],z=E[22],A=E[23],B=E[24];return E[31]!==s||E[32]!==H||E[33]!==v||E[34]!==w||E[35]!==x||E[36]!==y||E[37]!==z||E[38]!==A||E[39]!==B?(C=(0,d.jsx)(s,{...v,fileDiff:w,alignCommentGutter:x,diffIndicators:y,lineDiffType:z,onPostRenderInstance:A,theme:B,themeType:H}),E[31]=s,E[32]=H,E[33]=v,E[34]=w,E[35]=x,E[36]=y,E[37]=z,E[38]=A,E[39]=B,E[40]=C):C=E[40],E[41]!==t||E[42]!==u||E[43]!==C?(D=(0,d.jsxs)(t,{children:[u,C]}),E[41]=t,E[42]=u,E[43]=C,E[44]=D):D=E[44],D}})},g0G2(a,b,c){c.d(b,{},{a:function(a){let{children:b}=a;return b}})},uNhY(a,b,c){c.d(b,{},{a:function(){}})},SV8P(a,b,c){var d=c("tPhx"),e=c("kkEw");let f={comment:["comment"],string:["string"],"string.escape":["constant.character.escape"],"string.regex":["string.regexp"],"text.literal":["markup.inline.raw"],keyword:["keyword","storage.type","storage.modifier"],operator:["keyword.operator"],preproc:["keyword.control.directive"],boolean:["constant.language.boolean","constant.language"],number:["constant.numeric"],constant:["constant"],variable:["variable"],"variable.special":["variable.language"],"variable.parameter":["variable.parameter"],property:["variable.other.property","support.type.property-name"],"property.json_key":["support.type.property-name.json"],function:["entity.name.function","support.function"],constructor:["entity.name.type.class"],type:["entity.name.type","support.type"],attribute:["entity.other.attribute-name"],tag:["entity.name.tag"],punctuation:["punctuation"],link_text:["markup.underline.link"],link_uri:["markup.underline.link","string.other.link"],"diff.plus":["markup.inserted.diff"],"diff.minus":["markup.deleted.diff"],emphasis:["markup.italic"],"emphasis.strong":["markup.bold"],title:["markup.heading"]};for(let a of(0,e.c)())(0,d.a)(a.name,async()=>(function(a,b){let c=b.tokenColors??b.settings??[],d=c.find(a=>null==a.scope)?.settings,e="light"===b.type?"light":"dark",g=b.fg??b.colors?.["editor.foreground"]??d?.foreground??("light"===e?"#333333":"#bbbbbb"),h=b.bg??b.colors?.["editor.background"]??d?.background??("light"===e?"#ffffff":"#1e1e1e"),i={};for(let[a,b]of Object.entries(f)){let d={},e=-1,f=-1;for(let a of c)for(let c of"string"==typeof a.scope?a.scope.split(","):a.scope??[]){let g=c.trim();g&&b.some(a=>a===g||a.startsWith(`${g}.`))&&(null!=a.settings.foreground&&g.length>=e&&(d.color=a.settings.foreground,e=g.length),null!=a.settings.fontStyle&&g.length>=f&&(d.font_style=a.settings.fontStyle.includes("italic")?"italic":"normal",d.font_weight=a.settings.fontStyle.includes("bold")?700:400,f=g.length))}i[a]=d}return{name:a,type:e,fg:g,bg:h,colors:{...b.colors,"editor.foreground":g,"editor.background":h},textmate:{...b,name:a,type:e,fg:g,bg:h,settings:c},zed:{name:a,appearance:e,style:{"editor.foreground":g,"editor.background":h,syntax:i}}}})(a.name,await a.load()),"diffs")},tgV8(a,b,c){var d=c("axtm"),e=c("Iv6t");let f=new WeakMap;function g(a){let b=a.querySelector(e.o);return null==b?void 0:f.get(b)}c.d(b,{},{a:function(a,b,c){let d=g(a),e=d?.getLinePosition(b,c);if(d?.top!=null&&null!=e)return{height:e.height,top:d.top+e.top}},b:function(a,b){b instanceof d.a&&f.set(a,b)},c:function(a,b){g(a)?.setSelectedLines(b,{notify:!0})}})},WvjI(a,b,c){var d=c("Q840"),e=c("tl5a"),f=c("tSEg");let g=(0,d.c)(f.a,a=>{let{get:b,scope:c}=a;if("local-thread"!==c.value.routeKind)return null;let d=b(e.db,c.value.conversationId);return null==d?null:{threadId:c.value.conversationId,turnId:d}});c.d(b,{},{a:g})},SpQB(a,b,c){c.d(b,{a:()=>u,b:()=>v,c:()=>t});var d=c("QosV"),e=c("T0Rc"),f=c("Q840");c("yZpl");var g=c("zd8w"),h=c("Wf1j"),i=c("SGsN"),j=c("A8rN"),k=c("Igf5"),l=c("WvjI"),m=c("yGJW"),n=c("tSEg"),o=c("kl6F"),p=c("rvFo"),q=c("GaA7"),r=c("q77y");function s(a,b,c,d,e){d?.aborted||a.setQueryData(b,a=>{if(null==a)return a;let b=a.targets.map(a=>a.id===c?{...a,...e}:a);return{...a,availableTargets:b.flatMap(a=>a.available?[a.target]:[]),targets:b}})}function t(a){let b,c,e,g,p,q,r=(0,d.c)(30),{turnId:s,cwd:t,deferEnrichment:u,getOpenPath:x,hostId:y,openPath:z}=a,A=void 0!==u&&u;r[0]!==t||r[1]!==A||r[2]!==x||r[3]!==y||r[4]!==z?(b={cwd:t,hostId:y,isQueryEnabled:A,getOpenPath:x,openPath:z,deferEnrichment:A},r[0]=t,r[1]=A,r[2]=x,r[3]=y,r[4]=z,r[5]=b):b=r[5];let{data:B,isFetching:C}=w(b),D=B?.targets;r[6]!==t||r[7]!==A||r[8]!==y||r[9]!==z||r[10]!==D||r[11]!==s?(c={turnId:s,cwd:t,deferEnrichment:A,hostId:y,openPath:z,targets:D},r[6]=t,r[7]=A,r[8]=y,r[9]=z,r[10]=D,r[11]=s,r[12]=c):c=r[12];let E=function(a){let b,c,e=(0,d.c)(12),{turnId:g,cwd:p,deferEnrichment:q,hostId:r,openPath:s,targets:t}=a,u=(0,f.y)(n.a),v=(0,h.a)();e[0]!==v||e[1]!==u?(b=()=>{u.get(i.f).danger(v.formatMessage({id:"localConversation.openTarget.error",defaultMessage:"Unable to open item"}),{errorAnalytics:{toastId:"localConversation.openTarget.error"}})},e[0]=v,e[1]=u,e[2]=b):b=e[2];let w=b;return e[3]!==p||e[4]!==q||e[5]!==r||e[6]!==s||e[7]!==u||e[8]!==w||e[9]!==t||e[10]!==g?(c=(a,b)=>{let{appPath:c,environmentId:d,openMode:e,persistPreferred:f,line:h,column:i,path:v}=b,x=v??s??p;if(!x)return;let y=t?.find(b=>b.target===a&&(b.appPath??null)===(c??null));if(y?.kind==="editor"&&null!=g){let b=u.get(l.a);null!=b&&u.get(m.c).submitCodexAnalyticsEvent?.({action:"open_in_ide",eventKind:"action",metadata:{target:a},threadId:b.threadId,turnId:g})}f&&p&&u.query.setData(j.a,{cwd:p,hostId:r,path:s,...q?{deferEnrichment:!0}:{}},b=>b?{...b,preferredTarget:a,targets:b.targets.map(b=>({...b,default:b.target===a||void 0}))}:b),u.get(k.a).mutate({recentFilesThreadId:u.getOwnValue(o.a).clientThreadId,path:x,conversationId:(0,n.d)(u.value)??void 0,environmentId:d,cwd:p??null,target:a,appPath:c,line:h,column:i,openMode:e,...f&&p?{persistPreferredTargetPath:p}:{},hostId:r},{onSuccess:a=>{a.success||w()},onError:w})},e[3]=p,e[4]=q,e[5]=r,e[6]=s,e[7]=u,e[8]=w,e[9]=t,e[10]=g,e[11]=c):c=e[11],c}(c);r[13]!==t||r[14]!==y||r[15]!==z?(e=v({cwd:t,hostId:y,openPath:z}),r[13]=t,r[14]=y,r[15]=z,r[16]=e):e=r[16];let F=e,G=B?.preferredTarget??null;r[17]!==B?.targets?(g=B?.targets??[],r[17]=B?.targets,r[18]=g):g=r[18],r[19]!==B?.availableTargets?(p=B?.availableTargets??[],r[19]=B?.availableTargets,r[20]=p):p=r[20];let H=B?.mode,I=null!=B;return r[21]!==F||r[22]!==C||r[23]!==E||r[24]!==I||r[25]!==G||r[26]!==g||r[27]!==p||r[28]!==H?(q={canLoadTargets:F,preferredTarget:G,targets:g,availableTargets:p,mode:H,hasLoadedTargets:I,isLoadingTargets:C,open:E},r[21]=F,r[22]=C,r[23]=E,r[24]=I,r[25]=G,r[26]=g,r[27]=p,r[28]=H,r[29]=q):q=r[29],q}function u(a){let b,c,e,f,h,i=(0,d.c)(26),{cwd:j,delayMs:k,getOpenPath:l,hostId:m,openPath:n}=a,o=void 0===k?0:k;i[0]!==j||i[1]!==m||i[2]!==n?(b=v({cwd:j,hostId:m,openPath:n}),i[0]=j,i[1]=m,i[2]=n,i[3]=b):b=i[3];let p=b,q=o<=0;i[4]!==j||i[5]!==l||i[6]!==m||i[7]!==n||i[8]!==q?(c={cwd:j,hostId:m,isQueryEnabled:q,getOpenPath:l,openPath:n},i[4]=j,i[5]=l,i[6]=m,i[7]=n,i[8]=q,i[9]=c):c=i[9];let{data:r,refetch:s}=w(c);i[10]!==s?(e=()=>{s()},i[10]=s,i[11]=e):e=i[11];let t=(0,g.useEffectEvent)(e);return i[12]!==p||i[13]!==r||i[14]!==o||i[15]!==t||i[16]!==q?(f=()=>{if(q||!p||null!=r)return;let a=window.setTimeout(t,o);return()=>{window.clearTimeout(a)}},i[12]=p,i[13]=r,i[14]=o,i[15]=t,i[16]=q,i[17]=f):f=i[17],i[18]!==p||i[19]!==j||i[20]!==r||i[21]!==o||i[22]!==m||i[23]!==n||i[24]!==q?(h=[p,j,r,o,m,n,q],i[18]=p,i[19]=j,i[20]=r,i[21]=o,i[22]=m,i[23]=n,i[24]=q,i[25]=h):h=i[25],(0,g.useEffect)(f,h),null}function v(a){let{cwd:b,hostId:c,openPath:d}=a;return!!(b??d)&&!1}function w(a){let b,c,g,h,i,k=(0,d.c)(21),{cwd:l,deferEnrichment:m,getOpenPath:o,hostId:t,isQueryEnabled:u,openPath:w}=a,x=void 0!==m&&m,y=(0,f.y)(n.a);k[0]!==l||k[1]!==x||k[2]!==t||k[3]!==w||k[4]!==y.query?(b={cwd:l,hostId:t,path:w,...x?{deferEnrichment:!0}:{}},c=y.query.getOptions(j.a,b),k[0]=l,k[1]=x,k[2]=t,k[3]=w,k[4]=y.query,k[5]=b,k[6]=c):(b=k[5],c=k[6]);let z=c;return k[7]!==o||k[8]!==b||k[9]!==z||k[10]!==y.queryClient?(g=async a=>{let{signal:c}=a;return async function(a){var b,c;let{params:d,queryClient:e,queryKey:f,signal:g}=a;if(d.deferEnrichment)return async function(a){let{params:b,queryClient:c,queryKey:d,signal:e}=a,f=q.a.openIn,g=await (0,j.c)(b,e);return e?.aborted?g:(c.setQueryData(d,g),await Promise.all(g.targets.map(async a=>{let b;try{b=(await (0,r.a)(f.detectTarget({target:a.target}),e)).available}catch{s(c,d,a.id,e,{available:!1,resolvedIcon:null});return}if(s(c,d,a.id,e,{available:b,...!b?{resolvedIcon:null}:{}}),!(!b||e?.aborted))try{let{icon:b}=await (0,r.a)(f.loadTargetIcon({target:a.target}),e);s(c,d,a.id,e,{resolvedIcon:b})}catch{s(c,d,a.id,e,{resolvedIcon:null})}})),c.getQueryData(d)??g)}({params:d,queryClient:e,queryKey:f,signal:g});(null==(b=d.hostId)||"local"===b)&&(c=d.path,0);return(0,j.c)(d,g)}({params:null==o?b:{...b,path:await o()},queryClient:y.queryClient,queryKey:z.queryKey,signal:c})},k[7]=o,k[8]=b,k[9]=z,k[10]=y.queryClient,k[11]=g):g=k[11],k[12]!==l||k[13]!==t||k[14]!==u||k[15]!==w?(h=v({cwd:l,hostId:t,openPath:w})&&u,k[12]=l,k[13]=t,k[14]=u,k[15]=w,k[16]=h):h=k[16],k[17]!==z||k[18]!==g||k[19]!==h?(i={...z,queryFn:g,enabled:h,staleTime:p.b.ONE_MINUTE},k[17]=z,k[18]=g,k[19]=h,k[20]=i):i=k[20],(0,e.a)(i)}},HWQc(a,b,c){var d=c("ABep"),e=c("QosV"),f=c("on57"),g=c("zd8w"),h=c("oyxz"),i=c("UxN3"),j=c("BhsD"),k=c("tKUf"),l=c("wKFm"),m=c("zzDS");function n(a){let b,c,k,l,n,q=(0,e.c)(13),{entries:r}=a,[s,t]=(0,g.useState)(!1),u=r.length>8;q[0]!==r||q[1]!==s||q[2]!==u?(b=u&&!s?r.slice(0,8):r,q[0]=r,q[1]=s,q[2]=u,q[3]=b):b=q[3];let v=b;return q[4]===Symbol.for("react.memo_cache_sentinel")?(c=(0,d.jsx)("div",{className:"mb-2 font-medium text-secondary",children:(0,d.jsx)(h.a,{id:"markdown.metadata.title",defaultMessage:"Metadata"})}),q[4]=c):c=q[4],q[5]!==v?(k=(0,d.jsx)(p,{entries:v}),q[5]=v,q[6]=k):k=q[6],q[7]!==s||q[8]!==u?(l=u?(0,d.jsxs)("button",{type:"button","aria-expanded":s,className:"mt-1.5 inline-flex cursor-interaction items-center gap-1 text-secondary hover:text-default",onClick:()=>{t(o)},children:[(0,d.jsx)("span",{children:s?(0,d.jsx)(h.a,{id:"markdown.metadata.showLess",defaultMessage:"Show less"}):(0,d.jsx)(h.a,{id:"markdown.metadata.showMore",defaultMessage:"Show more"})}),(0,d.jsx)(i.a,{className:(0,f.b)("transition-transform",s?"rotate-180":"rotate-0"),"aria-hidden":!1,asset16:m.a,legacyIcon:j.a,legacyClassName:"icon-2xs"})]}):null,q[7]=s,q[8]=u,q[9]=l):l=q[9],q[10]!==k||q[11]!==l?(n=(0,d.jsxs)("div",{className:"mb-3 rounded-md border border-border/60 bg-text/5 px-3 py-2 text-xs",children:[c,k,l]}),q[10]=k,q[11]=l,q[12]=n):n=q[12],n}function o(a){return!a}function p(a){let b,c,g,h=(0,e.c)(7),{className:i,entries:j}=a;return h[0]!==i?(b=(0,f.b)("grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-3 gap-y-1.5",i),h[0]=i,h[1]=b):b=h[1],h[2]!==j?(c=j.map(q),h[2]=j,h[3]=c):c=h[3],h[4]!==b||h[5]!==c?(g=(0,d.jsx)("dl",{className:b,children:c}),h[4]=b,h[5]=c,h[6]=g):g=h[6],g}function q(a,b){return(0,d.jsxs)("div",{className:"contents",children:[(0,d.jsx)("dt",{className:"truncate font-mono text-secondary",title:a.key,children:a.key}),(0,d.jsx)("dd",{className:"min-w-0 text-default",children:(0,d.jsx)(r,{value:a.value})})]},`${a.key}-${b}`)}function r(a){let b,c=(0,e.c)(6),{value:f}=a;if(Array.isArray(f)){let a,b;return c[0]!==f?(a=f.map(s),c[0]=f,c[1]=a):a=c[1],c[2]!==a?(b=(0,d.jsx)("span",{className:"flex min-w-0 flex-wrap gap-1",children:a}),c[2]=a,c[3]=b):b=c[3],b}let g=0===f.length?'""':f;return c[4]!==g?(b=(0,d.jsx)("span",{className:"font-mono break-words",children:g}),c[4]=g,c[5]=b):b=c[5],b}function s(a,b){return(0,d.jsx)("span",{className:"max-w-full rounded-sm bg-text/10 px-1.5 py-0.5 font-mono break-words",children:0===a.length?'""':a},`${a}-${b}`)}c.d(b,{},{a:n,b:function(a){let b,c,g=(0,e.c)(7),{background:h,className:i,children:j,overflow:k}=a,l="normal"===(void 0===h?"subtle":h)?"bg-surface":"bg-text/5",m="auto"===(void 0===k?"clip":k)?"overflow-auto":"overflow-clip";return g[0]!==i||g[1]!==l||g[2]!==m?(b=(0,f.b)("relative rounded-lg",l,m,i),g[0]=i,g[1]=l,g[2]=m,g[3]=b):b=g[3],g[4]!==j||g[5]!==b?(c=(0,d.jsx)("div",{className:b,children:j}),g[4]=j,g[5]=b,g[6]=c):c=g[6],c},c:function(a){let b,c,f,g,h=(0,e.c)(15),{enableMetadataPreview:i,markdown:j,conversationId:m,cwd:o,hideCodeBlocks:p,hostId:q,isStreaming:r}=a,s=void 0!==i&&i,t=void 0===m?null:m,u=void 0===o?null:o,v=void 0!==r&&r;h[0]!==s||h[1]!==j?(b=s?(0,k.a)(j):null,h[0]=s,h[1]=j,h[2]=b):b=h[2];let w=b,x=w?.body??j;return h[3]!==w?(c=null!=w&&w.entries.length>0?(0,d.jsx)(n,{entries:w.entries}):null,h[3]=w,h[4]=c):c=h[4],h[5]!==t||h[6]!==u||h[7]!==p||h[8]!==q||h[9]!==v||h[10]!==x?(f=(0,d.jsx)(l.a,{className:"text-size-chat",conversationId:t,hideCodeBlocks:p,hostId:q,isStreaming:v,cwd:u,children:x}),h[5]=t,h[6]=u,h[7]=p,h[8]=q,h[9]=v,h[10]=x,h[11]=f):f=h[11],h[12]!==c||h[13]!==f?(g=(0,d.jsxs)("div",{className:"px-4 py-3",children:[c,f]}),h[12]=c,h[13]=f,h[14]=g):g=h[14],g}})},HdSb(a,b,c){var d=c("iiZm");function e(a,b){let c=f(a.displayPath),d=f(b.displayPath);return c.fileName.localeCompare(d.fileName)||c.parentPath.localeCompare(d.parentPath)}function f(a){let b=a.lastIndexOf("/");return -1===b?{fileName:a,parentPath:""}:{fileName:a.slice(b+1),parentPath:a.slice(0,b)}}c.d(b,{},{a:function(a,b){let c=b.trim();if(0===c.length)return[...a].sort(e);let g=(0,d.a)(c);return a.map(a=>{let b=g(f(a.displayPath).fileName);return{entry:a,score:b>0?b:g(a.displayPath)}}).filter(a=>{let{score:b}=a;return b>0}).sort((a,b)=>b.score-a.score).map(a=>{let{entry:b}=a;return b})},b:f})},Qxdj(a,b,c){c.d(b,{TextFileEditorTabContent:()=>k});var d=c("ABep"),e=c("QosV"),f=c("zd8w"),g=c("gvp4"),h=c("oD95"),i=c("Wbrf"),j=c("WFY2");let k=function(a){let b,c=(0,e.c)(2);return c[0]!==a?(b=(0,d.jsx)(l,{...a},a.tabId),c[0]=a,c[1]=b):b=c[1],b};function l(a){let b,c,j,k,l,n,o=(0,e.c)(27),{fileKind:p,hostId:q,onContentChange:r,onSaveChange:s,path:t,renderSlots:u,setTabState:v,tabState:w,tabId:x}=a;o[0]!==q||o[1]!==t||o[2]!==x||o[3]!==w.lineToReveal?(b={hostId:q,line:w.lineToReveal,path:t,tabId:x},o[0]=q,o[1]=t,o[2]=x,o[3]=w.lineToReveal,o[4]=b):b=o[4];let y=(0,i.a)(b),z=(0,f.useRef)(0);o[5]!==q||o[6]!==r||o[7]!==t||o[8]!==v?(c=a=>{if(v(b=>b.draft===a?b:{...b,draft:a}),null==r)return;let b=z.current=z.current+1;null!=a?r(a.content):(0,g.readSavedPlanContent)({hostId:q,path:t}).then(a=>{z.current===b&&r(a)}).catch(m)},o[5]=q,o[6]=r,o[7]=t,o[8]=v,o[9]=c):c=o[9];let A=c;o[10]!==v?(j=a=>{v(b=>b.lineToReveal===a?{...b,lineToReveal:void 0}:b)},o[10]=v,o[11]=j):j=o[11];let B=j,C=null==w.lineToReveal?w.scrollTop:null;return o[12]!==y||o[13]!==s?(k=a=>{y.onSaveChange(a),s?.(a)},o[12]=y,o[13]=s,o[14]=k):k=o[14],o[15]!==v?(l=a=>{v(b=>b.scrollTop===a?b:{...b,scrollTop:a})},o[15]=v,o[16]=l):l=o[16],o[17]!==p||o[18]!==A||o[19]!==B||o[20]!==y||o[21]!==u||o[22]!==C||o[23]!==k||o[24]!==l||o[25]!==w.draft?(n=(0,d.jsx)(h.a,{...y,editorParentClassName:"h-full overflow-hidden",fileKind:p,initialDraft:w.draft,initialScrollTop:C,onLineRevealHandled:B,onDraftChange:A,onSaveChange:k,onScrollChange:l,renderSlots:u}),o[17]=p,o[18]=A,o[19]=B,o[20]=y,o[21]=u,o[22]=C,o[23]=k,o[24]=l,o[25]=w.draft,o[26]=n):n=o[26],n}function m(a){j.a.warning("Failed to update saved plan content",{safe:{},sensitive:{error:a}})}},kkEw(a,b,c){c.d(b,{a:()=>d.og,b:()=>i,c:()=>h});var d=c("yZpl"),e=c("SMzt");let f={"ayu-dark":()=>c.e(33247).then(c.bind(c,"eNz5")),"catppuccin-latte":()=>c.e(571858).then(c.bind(c,"R3uT")),"catppuccin-mocha":()=>c.e(402734).then(c.bind(c,"ed7L")),"dark-plus":()=>c.e(574308).then(c.bind(c,"Ql0N")),dracula:()=>c.e(21885).then(c.bind(c,"FUKF")),"everforest-dark":()=>c.e(773959).then(c.bind(c,"dzPG")),"everforest-light":()=>c.e(818495).then(c.bind(c,"UQgL")),"github-dark-default":()=>c.e(370905).then(c.bind(c,"dOHO")),"github-light-default":()=>c.e(722017).then(c.bind(c,"vosZ")),"gruvbox-dark-medium":()=>c.e(631953).then(c.bind(c,"J8sX")),"gruvbox-light-medium":()=>c.e(416361).then(c.bind(c,"Vizg")),"light-plus":()=>c.e(442836).then(c.bind(c,"Vs6L")),"material-theme-darker":()=>c.e(939684).then(c.bind(c,"rhk3")),monokai:()=>c.e(53709).then(c.bind(c,"GBId")),"night-owl":()=>c.e(100450).then(c.bind(c,"DOYB")),nord:()=>c.e(301746).then(c.bind(c,"zkIA")),"one-dark-pro":()=>c.e(391298).then(c.bind(c,"jIEz")),"one-light":()=>c.e(225750).then(c.bind(c,"EiaD")),"rose-pine-dawn":()=>c.e(327938).then(c.bind(c,"iUJo")),"rose-pine-moon":()=>c.e(757265).then(c.bind(c,"MRBZ")),"solarized-dark":()=>c.e(854189).then(c.bind(c,"YQJc")),"solarized-light":()=>c.e(899573).then(c.bind(c,"JJ80")),"tokyo-night":()=>c.e(110734).then(c.bind(c,"QD5o"))},g=[j(e.a.AYU,{dark:"ayu-dark"}),j(e.a.CATPPUCCIN,{dark:"catppuccin-mocha",light:"catppuccin-latte"}),k(e.a.ABSOLUTELY,{dark:{load:()=>c.e(220243).then(c.t.bind(c,"L0sD",19)),name:"Absolutely Dark"},light:{load:()=>c.e(607291).then(c.t.bind(c,"i0wK",19)),name:"Absolutely Light"}}),k(e.a.CODEX,{dark:{load:()=>c.e(366084).then(c.t.bind(c,"i4nh",19)),name:"Codex Dark"},light:{load:()=>c.e(61942).then(c.t.bind(c,"sEmq",19)),name:"Codex Light"}}),j(e.a.DRACULA,{dark:"dracula"}),j(e.a.EVERFOREST,{dark:"everforest-dark",light:"everforest-light"}),j(e.a.GITHUB,{dark:"github-dark-default",light:"github-light-default"}),j(e.a.GRUVBOX,{dark:"gruvbox-dark-medium",light:"gruvbox-light-medium"}),k(e.a.LINEAR,{dark:{load:()=>c.e(101912).then(c.t.bind(c,"Aup8",19)),name:"Linear Dark"},light:{load:()=>c.e(583762).then(c.t.bind(c,"Zmpt",19)),name:"Linear Light"}}),k(e.a.LOBSTER,{dark:{load:()=>c.e(233122).then(c.t.bind(c,"Ouzr",19)),name:"Lobster Dark"}}),j(e.a.MATERIAL,{dark:"material-theme-darker"}),k(e.a.MATRIX,{dark:{load:()=>c.e(894220).then(c.t.bind(c,"t8qm",19)),name:"Matrix Dark"}}),j(e.a.MONOKAI,{dark:"monokai"}),j(e.a.NIGHT_OWL,{dark:"night-owl"}),j(e.a.NORD,{dark:"nord"}),k(e.a.NOTION,{dark:{load:()=>c.e(1444).then(c.t.bind(c,"PNJE",19)),name:"Notion Dark"},light:{load:()=>c.e(802582).then(c.t.bind(c,"GQSi",19)),name:"Notion Light"}}),k(e.a.OG,{dark:{load:()=>c.e(797075).then(c.t.bind(c,"CABk",19)),name:"OG Dark"}}),k(e.a.OSCURANGE,{dark:{load:()=>c.e(660933).then(c.t.bind(c,"xrtt",19)),name:"Oscurange"}}),j(e.a.ONE,{dark:"one-dark-pro",light:"one-light"}),k(e.a.PROOF,{light:{load:()=>c.e(848341).then(c.t.bind(c,"l9FY",19)),name:"Proof Light"}}),k(e.a.RAYCAST,{dark:{load:()=>c.e(720712).then(c.t.bind(c,"NRWZ",19)),name:"Raycast Dark"},light:{load:()=>c.e(323106).then(c.t.bind(c,"Aa5z",19)),name:"Raycast Light"}}),j(e.a.ROSE_PINE,{dark:"rose-pine-moon",light:"rose-pine-dawn"}),k(e.a.SENTRY,{dark:{load:()=>c.e(929734).then(c.t.bind(c,"ddRp",19)),name:"Sentry Dark"}}),j(e.a.SOLARIZED,{dark:"solarized-dark",light:"solarized-light"}),j(e.a.TOKYO_NIGHT,{dark:"tokyo-night"}),k(e.a.TEMPLE,{dark:{load:()=>c.e(872908).then(c.t.bind(c,"bzAW",19)),name:"Temple Dark"}}),k(e.a.VERCEL,{dark:{load:()=>c.e(820950).then(c.t.bind(c,"aE4H",19)),name:"Vercel Dark"},light:{load:()=>c.e(3528).then(c.t.bind(c,"wyj1",19)),name:"Vercel Light"}}),j(e.a.VSCODE_PLUS,{dark:"dark-plus",light:"light-plus"}),k(e.a.XCODE,{dark:{load:()=>c.e(617562).then(c.t.bind(c,"nao7",19)),name:"Xcode Dark"},light:{load:()=>c.e(600788).then(c.t.bind(c,"W6Nn",19)),name:"Xcode Light"}})];function h(){return g.flatMap(a=>Object.values(a.registrationByVariant)).filter(a=>null!=a)}function i(a,b){let{id:c}=(0,e.d)(a,b),d=g.find(a=>a.id===c)?.registrationByVariant[b];if(null==d)throw Error(`Missing ${b} code theme registration`);return d}function j(a,b){let c=b.dark,d=b.light;return k(a,{dark:null==c?void 0:{load:()=>f[c](),name:c},light:null==d?void 0:{load:()=>f[d](),name:d}})}function k(a,b){let c={},d=b.dark,e=b.light;return null!=d&&(c.dark=l(d.name,d.load)),null!=e&&(c.light=l(e.name,e.load)),{id:a,registrationByVariant:c}}function l(a,b){let c=null;return{load:async()=>(null==c&&(c=b().then(a=>"object"==typeof a&&null!=a&&"default"in a?a.default:a).catch(a=>{throw c=null,a})),c),name:a}}},xzkK(a,b){b.a={kind:"sprite",name:"across-arrow-right-light-16",canvas:{width:16,height:16,viewBox:"0 0 16 16"},href:"#codex-icon-across-arrow-right-light-16",style:{},alignment:{authored:{x:0,y:0,overflows:!1},primary:{x:.002746,y:0,overflows:!1},composite:{x:.002746,y:0,overflows:!1}}}},tPhx(a,b,c){var d=c("wC4q");c.d(b,{},{a:function(a,b,c="textmate"){let e=d.b.get(a)??{};null!=e[c]?console.error("SharedHighlight.registerCustomTheme: theme name and type already registered",a,c):(e[c]=b,d.b.set(a,e))}})},gz4m(a,b,c){var d=c("vo7L"),e=c("zd8w"),f=c("ABep");let g=(0,e.createContext)(void 0);c.d(b,{},{a:function({children:a,createEditor:b}){let c=(0,d.a)((a,c,d)=>b(a,c,d));return(0,f.jsx)(g.Provider,{value:c,children:a})},b:function(){return(0,e.useContext)(g)}})},nB97(a,b,c){var d=c("zd8w");c("ABep");let e=(0,d.createContext)(void 0);c.d(b,{},{a:e,b:function(){return(0,d.useContext)(e)}})},ePCn(a,b,c){var d=c("zd8w");c("ABep");let e=(0,d.createContext)(void 0);c.d(b,{},{a:e,b:function(){return(0,d.useContext)(e)}})},bum5(a,b,c){c.d(b,{},{a:{position:"absolute",top:0,bottom:0,textAlign:"center",whiteSpace:"normal",touchAction:"none"},b:{display:"contents"},c:function(){return null}})},mseL(a,b,c){var d=c("ABep");c.d(b,{},{a:function(a,b){return"u"<typeof window&&null!=b?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("template",{shadowrootmode:"open",dangerouslySetInnerHTML:{__html:b}}),a]}):(0,d.jsx)(d.Fragment,{children:a})}})},vo7L(a,b,c){var d=c("zd8w");c.d(b,{},{a:function(a){let b=(0,d.useRef)(a);return(0,d.useInsertionEffect)(()=>void(b.current=a)),(0,d.useCallback)((...a)=>b.current(...a),[])}})},P9bP(a,b,c){c.d(b,{},{a:function(a,b){return a?.cacheKey!=null||b?.cacheKey!=null?a?.cacheKey===b?.cacheKey:a?.contents===b?.contents&&a?.name===b?.name&&a?.lang===b?.lang}})},abZZ(a,b,c){c.d(b,{},{a:function(a){let b=[],c=String(a||""),d=c.indexOf(","),e=0,f=!1;for(;!f;){-1===d&&(d=c.length,f=!0);let a=c.slice(e,d).trim();(a||!f)&&b.push(a),e=d+1,d=c.indexOf(",",e)}return b},b:function(a,b){let c=b||{};return(""===a[a.length-1]?[...a,""]:a).join((c.padRight?" ":"")+","+(!1===c.padLeft?"":" ")).trim()}})},N3yO(a,b,c){let d=/[ \t\n\f\r]/g;function e(a){return""===a.replace(d,"")}c.d(b,{},{a:function(a){return"object"==typeof a?"text"===a.type&&e(a.value):e(a)}})},gMH0(a,b,c){c.d(b,{},{a:function(a){let b=String(a||"").trim();return b?b.split(/[ \t\n\r\f]+/g):[]},b:function(a){return a.join(" ").trim()}})}};