export const __rspack_esm_ids=[102488];export const __webpack_modules__={Ovip(e,t,n){let i="var(--color-surface)",a=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 94%,
  var(--color-surface)
)`,r=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 94%,
  var(--color-text-info)
)`,o=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 92%,
  var(--color-surface)
)`,l=`color-mix(
  in lab,
  var(--codex-diffs-surface) 98.5%,
  var(--diffs-mixer)
)`,d=`light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-addition-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-addition-base))
)`,s=`light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-deletion-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-deletion-base))
)`,u=`light-dark(
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
)`,f=`light-dark(
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
)`,c=`
  --codex-diffs-surface: ${i};
  --codex-diffs-context-surface: ${a};
  --codex-diffs-separator-surface: ${r};
  --codex-diffs-hover-surface: ${o};
  --codex-diffs-header-surface: var(--codex-diffs-surface);
  --codex-diffs-context-number: ${l};
  --codex-diffs-addition-number: ${d};
  --codex-diffs-deletion-number: ${s};
  --codex-diffs-addition-hover: ${u};
  --codex-diffs-deletion-hover: ${f};
  /* Keep unhighlighted lines readable while syntax tokens are pending. */
  --diffs-dark: var(--color-text);
  --diffs-light: var(--color-text);
  --diffs-bg-context-override: var(--codex-diffs-context-surface);
  --diffs-bg-separator-override: var(--codex-diffs-separator-surface);
  --diffs-bg-hover-override: var(--codex-diffs-hover-surface);
`;n.d(t,{},{a:function(e,t){return e?"diff"===t?"var(--color-codex-diff-surface)":i:"var(--color-surface-secondary)"},b:function(e){let{alignCommentGutter:t=!1,includeDiffHeader:n,includeSimpleLineSeparators:i,rootSelector:a,surface:r,useReviewLineInfoSeparators:o=!1}=e,l=n?`[data-diffs-header],
  ${a}`:a,d=i?`
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
`:"",s=t?`
  ${a} [data-column-number] {
    padding-inline-start: calc(var(--spacing) * 10);
  }
`:"",u=o?`
  ${a} [data-column-number] {
    padding-inline: 1.5ch;
    text-align: center;
  }

  ${a} [data-separator='line-info'] :is([data-separator-wrapper], [data-expand-button], [data-separator-content]) {
    border-radius: 0;
  }

  ${a} [data-separator='line-info'] [data-separator-wrapper] {
    padding: 0;
  }

  ${a} [data-unified] [data-separator='line-info'] [data-separator-wrapper] {
    grid-template-columns: var(--diffs-column-number-width) minmax(0, 1fr);
  }

  ${a} [data-unified] [data-separator='line-info'] [data-expand-button] {
    min-width: 0;
  }

  /* Pierre duplicates split separators into each gutter and content cell. */
  ${a} [data-deletions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    background-color: var(--diffs-bg);
    grid-template-columns: minmax(0, 1fr);
  }

  ${a} [data-deletions] [data-gutter] [data-separator='line-info'] [data-separator-content],
  ${a} [data-deletions] [data-content] [data-separator='line-info'] [data-expand-button] {
    display: none;
  }

  ${a} [data-deletions] [data-content] [data-separator='line-info'] [data-separator-wrapper] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  ${a} [data-deletions] [data-content] [data-separator='line-info'] [data-separator-content] {
    grid-column: 1;
  }

  ${a} [data-additions] [data-gutter] [data-separator='line-info'],
  ${a} [data-additions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    background-color: var(--diffs-bg-separator);
  }

  ${a}[data-overflow='scroll'] [data-additions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    width: 100cqi;
  }

  ${a} [data-additions] [data-content] [data-separator='line-info'] [data-separator-wrapper] {
    margin-inline-end: 0;
  }
`:"",f=`
  /* Preserve the pre-beta split-column width instead of reserving a scrollbar gutter in every pane. */
  ${a} [data-code] {
    scrollbar-gutter: auto;
  }

  ${a} [data-line-type='change-addition']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-addition);
  }

  ${a} [data-line-type='change-addition']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--codex-diffs-addition-number);
  }

  ${a} [data-line-type='change-deletion']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-deletion);
  }

  ${a} [data-line-type='change-deletion']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--codex-diffs-deletion-number);
  }

  ${a} [data-line-type='change-addition'][data-hovered]:not([data-selected-line]) {
    --diffs-computed-hovered-line-bg: var(--codex-diffs-addition-hover);
  }

  ${a} [data-line-type='change-deletion'][data-hovered]:not([data-selected-line]) {
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
  ${l} {
    ${c}
    --diffs-bg: ${r} !important;
    background-color: ${r} !important;
  }

  ${a} [data-language-symbol-highlight] {
    background-color: var(--color-background-secondary-ghost-hover) !important;
  }

  ${a} [data-language-symbol-link] {
    text-decoration: underline;
    cursor: var(--cursor-interaction);
  }

  ${a} [data-utility-button] {
    background-color: var(--color-text);
    color: var(--color-surface-secondary);
    border: none;
    border-radius: 4px;
    margin-right: 0;
  }

  ${a} [data-utility-button]:hover {
    background-color: color-mix(
      in srgb,
      var(--color-text) 88%,
      var(--color-surface-secondary)
    );
  }

  ${a} [data-selected-line][data-line-annotation] {
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

${f}

  ${a} [data-line-type="change-deletion"][data-column-number]::before {
    background-color: var(--diffs-deletion-base);
    background-image: none;
  }

  /* Cover fractional-pixel gaps between consecutive solid change markers. */
  ${a} [data-line-type="change-addition"][data-column-number]
    + [data-line-type="change-addition"][data-column-number]::before,
  ${a} [data-line-type="change-deletion"][data-column-number]
    + [data-line-type="change-deletion"][data-column-number]::before {
    contain: none;
    top: -1px;
    height: calc(100% + 1px);
  }

${u}

${s}

${d}`}})},Y0Ea(e,t,n){n.d(t,{FileDiffPresentation:()=>$});var i=n("ABep"),a=n("QosV"),r=n("weNR"),o=n("D7Ms"),l=n("BolX"),d=n("zd8w"),s=n("F5N3"),u=n("TwSq"),f=n("Ovip"),c=n("NxNN"),p=n("uNhY"),h=n("OWtl"),g=n("tSEg"),m=n("hZax"),b=n("R9dK"),x=n.n(b);function v(e,t,n){let i=new Set,a=function(e){let t=[0];for(let n of e)t.push(t[t.length-1]+n.length);return t}(e);return a[a.length-1]>1e6||t.parse(e.join("")).iterate({enter(t){let{node:r}=t;if(r.parent?.parent!=null||!function(e,t){switch(e){case"javascript":case"typescript":case"tsx":case"java":return"ImportDeclaration"===t.name;case"python":return"ImportStatement"===t.name;case"rust":return null==t.getChild("Vis")&&("UseDeclaration"===t.name||"ExternCrateDeclaration"===t.name);case"go":return"ImportDecl"===t.name}}(n,r))return;let o=x()(a,r.from)-1,l=x()(a,r.to-1)-1,d=r.to;for(let t=r.nextSibling;null!=t&&!(t.from>=a[l+1])&&!(t.to>a[l+1])&&["LineComment","BlockComment","Comment"].includes(t.name)&&""===e[l].slice(d-a[l],t.from-a[l]).trim();t=t.nextSibling)d=t.to;if(""!==e[o].slice(0,r.from-a[o]).trim()||""!==e[l].slice(d-a[l]).trim())return!1;let s=!1;if(r.toTree().iterate({enter(e){let{type:t}=e;t.isError&&(s=!0)}}),s)return!1;for(let e=o;e<=l;e+=1)i.add(e);return!1}}),i}var k=n("hTLy"),y=n.n(k);let L=new Set(["Body","Block","ClassBody","EnumBody","ConstructorBody","InterfaceBody","AnnotationTypeBody","ModuleBody","DeclarationList","FieldDeclarationList","OrderedFieldDeclarationList","EnumVariantList","MatchBlock","FieldInitializerList","StructBody","SwitchBlock","SelectBlock","LiteralValue"]),w=new Set(["ObjectExpression","ArrayExpression","ArrayInitializer","TypeLiteral","DictionaryExpression","SetExpression","TupleExpression","ArrowFunction","ParenthesizedExpression","JSXElement"]);function D(e,t){if(null==t)return e;let n=C(e,"additions",t),i=C(e,"deletions",t);if(0===n.size&&0===i.size)return e;let a=[],r=0,o=0,l=0,d=0;for(let t=0;t<=e.hunks.length;t+=1){let s=e.hunks[t],u=s?.collapsedBefore??e.additionLines.length-r,f=0;for(let t=0;t<u;t+=1){if(!n.has(r+t)&&!i.has(o+t))continue;let s=t;for(;t+1<u&&(n.has(r+t+1)||i.has(o+t+1));)t+=1;let c=t-s+1,p=r+s,h=o+s;a.push({collapsedBefore:s-f,additionStart:p+1,deletionStart:h+1,additionLineIndex:p,deletionLineIndex:h,additionCount:c,deletionCount:c,additionLines:0,deletionLines:0,hunkContent:[{type:"context",lines:c,additionLineIndex:p,deletionLineIndex:h}],splitLineStart:l+s,unifiedLineStart:d+s,splitLineCount:c,unifiedLineCount:c,noEOFCRAdditions:p+c===e.additionLines.length&&!e.additionLines.at(-1)?.endsWith("\n"),noEOFCRDeletions:h+c===e.deletionLines.length&&!e.deletionLines.at(-1)?.endsWith("\n")}),f=t+1}null!=s&&(a.push(0===f?s:{...s,collapsedBefore:u-f}),r=s.additionLineIndex+s.additionCount,o=s.deletionLineIndex+s.deletionCount,l=s.splitLineStart+s.splitLineCount,d=s.unifiedLineStart+s.unifiedLineCount)}return a.length===e.hunks.length?e:{...e,hunks:a,cacheKey:`${e.cacheKey??e.name}:structural-context`}}function C(e,t,n){let i="additions"===t?e.additionLines:e.deletionLines,a=new Set,r=[0];for(let e of i)r.push(r[r.length-1]+e.length);if(r[r.length-1]>1e6)return a;let o=[],l=[];for(let n of e.hunks)for(let e of n.hunkContent){if("change"!==e.type||0===e[t])continue;let n="additions"===t?e.additionLineIndex:e.deletionLineIndex;o.push(r[n]),l.push(r[n+e[t]])}return 0===o.length||n.parse(i.join("")).iterate({enter(e){let{node:t}=e,n=y()(l,t.from+1);if(n===l.length||o[n]>=t.to)return!1;if(!L.has(t.name)&&!w.has(t.name))return;let i="ArrowFunction"===t.name?t.getChild("Arrow"):t.firstChild,d=t.lastChild;if(null==i||null==d||i.type.isError||d.type.isError)return;let s=t.from;if(L.has(t.name)){let e=t.parent;s=null==e||L.has(e.name)?t.from:e.from;for(let e=t.prevSibling;null!=e;e=e.prevSibling)if("Body"===e.name||"Block"===e.name){s=e.nextSibling?.from??t.from;break}}let u=x()(r,s)-1,f=x()(r,i.to-1)-1;if(u!==x()(r,t.to-1)-1){a.add(u);for(let e=Math.max(u+1,f-8+2);e<=f;e+=1)a.add(e)}}}),a}function S(e){switch(e.name.split(".").at(-1)?.toLowerCase()){case"ts":case"mts":case"cts":return"typescript";case"tsx":return"tsx";case"js":case"jsx":case"mjs":case"cjs":return"javascript";case"py":case"pyi":return"python";case"rs":return"rust";case"go":return"go";case"java":return"java";default:return}}n("SV8P");let I=(0,l.d)(g.a,(e,t)=>{let{get:n}=t;if(!n(c.d))return!1;let i=n(u.g)?.location;return i?.domain!=="diff"||i.path!==e||"path"===i.hunkId}),E=(0,l.q)(h.a,e=>({queryKey:["diff-context-parser",e],queryFn:null==e?o.u:()=>(async function(e){switch(e){case"javascript":case"typescript":case"tsx":{let{parser:t}=await Promise.all([n.e(652500),n.e(877652)]).then(n.bind(n,"a6Ic"));return t.configure({dialect:{typescript:"ts",tsx:"ts jsx",javascript:"jsx"}[e]})}case"python":return(await Promise.all([n.e(652500),n.e(255674)]).then(n.bind(n,"sDAw"))).parser;case"rust":return(await Promise.all([n.e(652500),n.e(644049)]).then(n.bind(n,"YrxW"))).parser;case"go":return(await Promise.all([n.e(652500),n.e(715154)]).then(n.bind(n,"UOgE"))).parser;case"java":return(await Promise.all([n.e(652500),n.e(652809)]).then(n.bind(n,"fD4l"))).parser}})(e),staleTime:1/0}));function $(e){let t,n=(0,a.c)(2);return n[0]!==e?(t=null==e.reviewPath?(0,i.jsx)(O,{...e}):(0,i.jsx)(j,{...e,reviewPath:e.reviewPath}),n[0]=e,n[1]=t):t=n[1],t}function A(e){return(e.hunkSeparators??"line-info")!=="line-info"||e.expandUnchanged||null!=e.loadDiffFiles?void 0:function(e){let t=e.hunks.at(-1);if(!(e.isPartial||null==t||"new"===e.type||"deleted"===e.type||t.additionLineIndex+t.additionCount===e.additionLines.length&&e.hunks.every(e=>0===e.collapsedBefore)))return S(e)}(e.fileDiff)}function j(e){let t,n,r,o,d,s,u=(0,a.c)(22),f=(0,l.x)(I,e.reviewPath);u[0]!==e?(t=A(e),u[0]=e,u[1]=t):t=u[1];let c=t;u[2]!==c||u[3]!==f||u[4]!==e.fileDiff?(n=c??(f&&!e.fileDiff.isPartial&&"new"!==e.fileDiff.type&&"deleted"!==e.fileDiff.type?S(e.fileDiff):void 0),u[2]=c,u[3]=f,u[4]=e.fileDiff,u[5]=n):n=u[5];let p=n,h=(0,m.f)(null!=c&&"1894478438"),g=h||f;u[6]!==g?(r={enabled:g},u[6]=g,u[7]=r):r=u[7];let{data:b}=(0,l.x)(E,p,r);u[8]!==b||u[9]!==e.fileDiff||u[10]!==h?(o=h?D(e.fileDiff,b):e.fileDiff,u[8]=b,u[9]=e.fileDiff,u[10]=h,u[11]=o):o=u[11];let x=o;u[12]!==x||u[13]!==f||u[14]!==p||u[15]!==b||u[16]!==e.lineAnnotations?(d=f?function(e,t,n,i){if(null==t||null==n||e.isPartial||"new"===e.type||"deleted"===e.type)return e;let a=v(e.additionLines,t,n),r=v(e.deletionLines,t,n),o=e.hunks.filter(t=>i?.some(e=>{let{side:n,lineNumber:i}=e,a="additions"===n?t.additionStart:t.deletionStart,r="additions"===n?t.additionCount:t.deletionCount;return i>=a&&i<a+r})||!function(e,t,n,i){let a=!1;for(let r of t.hunkContent)if("context"!==r.type){for(let t=r.additionLineIndex;t<r.additionLineIndex+r.additions;t+=1)if(n.has(t))a=!0;else if(e.additionLines[t]?.trim()!=="")return!1;for(let t=r.deletionLineIndex;t<r.deletionLineIndex+r.deletions;t+=1)if(i.has(t))a=!0;else if(e.deletionLines[t]?.trim()!=="")return!1}return a}(e,t,a,r));return o.length===e.hunks.length?e:function(e,t){let n=[],i=[],a=[],r=0,o=0,l=0;for(let d of t){let t=n.length,s=i.length,u=d.hunkContent.map(t=>{let a={...t,additionLineIndex:n.length,deletionLineIndex:i.length};return"context"===t.type?(n.push(...e.additionLines.slice(t.additionLineIndex,t.additionLineIndex+t.lines)),i.push(...e.deletionLines.slice(t.deletionLineIndex,t.deletionLineIndex+t.lines))):(n.push(...e.additionLines.slice(t.additionLineIndex,t.additionLineIndex+t.additions)),i.push(...e.deletionLines.slice(t.deletionLineIndex,t.deletionLineIndex+t.deletions))),a}),f=d.additionStart-(0!==d.additionCount),c=Math.max(f-r,0);a.push({...d,additionLineIndex:t,deletionLineIndex:s,hunkContent:u,collapsedBefore:c,splitLineStart:o+c,unifiedLineStart:l+c}),r=f+d.additionCount,o+=c+d.splitLineCount,l+=c+d.unifiedLineCount}return{...e,additionLines:n,deletionLines:i,hunks:a,isPartial:!0,splitLineCount:o,unifiedLineCount:l,cacheKey:`${e.cacheKey??e.name}:hide-imports:${t.map(e=>e.additionStart).join(",")}`}}(e,o)}(x,b,p,e.lineAnnotations):x,u[12]=x,u[13]=f,u[14]=p,u[15]=b,u[16]=e.lineAnnotations,u[17]=d):d=u[17];let k=d,y=x!==e.fileDiff?3:void 0;return u[18]!==k||u[19]!==e||u[20]!==y?(s=(0,i.jsx)(F,{...e,fileDiff:k,collapsedContextThreshold:y}),u[18]=k,u[19]=e,u[20]=y,u[21]=s):s=u[21],s}function O(e){let t,n,r=(0,a.c)(5);r[0]!==e?(t=A(e),r[0]=e,r[1]=t):t=r[1];let o=t;return r[2]!==o||r[3]!==e?(n=null==o?(0,i.jsx)(F,{...e}):(0,i.jsx)(B,{...e,language:o}),r[2]=o,r[3]=e,r[4]=n):n=r[4],n}function B(e){let t,n,r,o,d,s=(0,a.c)(13);s[0]!==e?({language:t,...n}=e,s[0]=e,s[1]=t,s[2]=n):(t=s[1],n=s[2]);let u=(0,m.f)("1894478438");s[3]!==u?(r={enabled:u},s[3]=u,s[4]=r):r=s[4];let{data:f}=(0,l.x)(E,t,r);s[5]!==f||s[6]!==n.fileDiff||s[7]!==u?(o=u?D(n.fileDiff,f):n.fileDiff,s[5]=f,s[6]=n.fileDiff,s[7]=u,s[8]=o):o=s[8];let c=o,p=c!==n.fileDiff?3:void 0;return s[9]!==c||s[10]!==n||s[11]!==p?(d=(0,i.jsx)(F,{...n,fileDiff:c,collapsedContextThreshold:p}),s[9]=c,s[10]=n,s[11]=p,s[12]=d):d=s[12],d}function F(e){let t,n,o,l,u,c,h,g,m,b,x,v,k,y,L,w,D,C,S,I,E,$,A,j,O,B,F=(0,a.c)(53);if(F[0]!==e){let{alignCommentGutter:i,className:a,fileDiff:r,diffIndicators:d,hunkSeparators:s,reviewPath:f,lineAnnotations:p,lineDiffType:I,metrics:E,onGutterUtilityClick:$,onPostRender:A,onPostRenderInstance:j,renderAnnotation:O,selectedLines:B,overflow:R,theme:P,themeType:N,useReviewLineInfoSeparators:z,collapsedContextThreshold:T,..._}=e;k=i,t=a,o=r,y=d,L=s,l=p,u=I,c=E,h=$,g=A,m=j,b=O,v=B,w=R,S=P,D=N,C=z,n=T,x=_,F[0]=e,F[1]=t,F[2]=n,F[3]=o,F[4]=l,F[5]=u,F[6]=c,F[7]=h,F[8]=g,F[9]=m,F[10]=b,F[11]=x,F[12]=v,F[13]=k,F[14]=y,F[15]=L,F[16]=w,F[17]=D,F[18]=C,F[19]=S}else t=F[1],n=F[2],o=F[3],l=F[4],u=F[5],c=F[6],h=F[7],g=F[8],m=F[9],b=F[10],x=F[11],v=F[12],k=F[13],y=F[14],L=F[15],w=F[16],D=F[17],C=F[18],S=F[19];let R=void 0!==k&&k,P=void 0===y?"bars":y,N=void 0===L?"line-info":L,z=void 0===w?"scroll":w,T=void 0===D?"system":D,_=void 0!==C&&C,G=(0,d.useContext)(s.a);F[20]!==G?(I=null==G?void 0:e=>(0,s.c)(G,e),F[20]=G,F[21]=I):I=F[21],F[22]===Symbol.for("react.memo_cache_sentinel")?(E=(0,p.a)(),F[22]=E):E=F[22];let U=null!=h;return F[23]!==g||F[24]!==m?($=(e,t,n)=>{m?.(e,t,n),"unmount"!==n&&g?.(e)},F[23]=g,F[24]=m,F[25]=$):$=F[25],F[26]!==R||F[27]!==_?(A=(0,f.b)({alignCommentGutter:R,includeDiffHeader:!0,includeSimpleLineSeparators:!0,rootSelector:":is([data-diff], [data-file])",surface:"var(--codex-diffs-surface)",useReviewLineInfoSeparators:_}),F[26]=R,F[27]=_,F[28]=A):A=F[28],F[29]!==n||F[30]!==P||F[31]!==N||F[32]!==u||F[33]!==h||F[34]!==z||F[35]!==x||F[36]!==$||F[37]!==A||F[38]!==U||F[39]!==S||F[40]!==T?(j={overflow:z,hunkSeparators:N,collapsedContextThreshold:n,themeType:T,theme:S,preferredHighlighter:E,disableFileHeader:!0,diffIndicators:P,enableGutterUtility:U,lineDiffType:u,onGutterUtilityClick:h,onPostRender:$,unsafeCSS:A,...x},F[29]=n,F[30]=P,F[31]=N,F[32]=u,F[33]=h,F[34]=z,F[35]=x,F[36]=$,F[37]=A,F[38]=U,F[39]=S,F[40]=T,F[41]=j):j=F[41],F[42]!==o||F[43]!==l||F[44]!==c||F[45]!==b||F[46]!==v||F[47]!==j||F[48]!==I?(O=(0,i.jsx)(r.a,{deferCleanup:I,fileDiff:o,lineAnnotations:l,metrics:c,renderAnnotation:b,selectedLines:v,options:j}),F[42]=o,F[43]=l,F[44]=c,F[45]=b,F[46]=v,F[47]=j,F[48]=I,F[49]=O):O=F[49],F[50]!==t||F[51]!==O?(B=(0,i.jsx)("div",{className:t,children:O}),F[50]=t,F[51]=O,F[52]=B):B=F[52],B}},uNhY(e,t,n){n.d(t,{},{a:function(){}})},SV8P(e,t,n){var i=n("HlFQ"),a=n("kkEw");let r={comment:["comment"],string:["string"],"string.escape":["constant.character.escape"],"string.regex":["string.regexp"],"text.literal":["markup.inline.raw"],keyword:["keyword","storage.type","storage.modifier"],operator:["keyword.operator"],preproc:["keyword.control.directive"],boolean:["constant.language.boolean","constant.language"],number:["constant.numeric"],constant:["constant"],variable:["variable"],"variable.special":["variable.language"],"variable.parameter":["variable.parameter"],property:["variable.other.property","support.type.property-name"],"property.json_key":["support.type.property-name.json"],function:["entity.name.function","support.function"],constructor:["entity.name.type.class"],type:["entity.name.type","support.type"],attribute:["entity.other.attribute-name"],tag:["entity.name.tag"],punctuation:["punctuation"],link_text:["markup.underline.link"],link_uri:["markup.underline.link","string.other.link"],"diff.plus":["markup.inserted"],"diff.minus":["markup.deleted"],emphasis:["markup.italic"],"emphasis.strong":["markup.bold"],title:["markup.heading"]};for(let e of(0,a.c)())(0,i.a)(e.name,async()=>(function(e,t){let n=t.tokenColors??t.settings??[],i=n.find(e=>null==e.scope)?.settings,a="light"===t.type?"light":"dark",o=t.fg??t.colors?.["editor.foreground"]??i?.foreground??("light"===a?"#333333":"#bbbbbb"),l=t.bg??t.colors?.["editor.background"]??i?.background??("light"===a?"#ffffff":"#1e1e1e"),d={};for(let[e,t]of Object.entries(r)){let i={},a=-1,r=-1;for(let e of n)for(let n of"string"==typeof e.scope?e.scope.split(","):e.scope??[]){let o=n.trim();o&&t.some(e=>e===o||e.startsWith(`${o}.`))&&(null!=e.settings.foreground&&o.length>=a&&(i.color=e.settings.foreground,a=o.length),null!=e.settings.fontStyle&&o.length>=r&&(i.font_style=e.settings.fontStyle.includes("italic")?"italic":"normal",i.font_weight=e.settings.fontStyle.includes("bold")?700:400,r=o.length))}d[e]=i}return{name:e,type:a,fg:o,bg:l,colors:{...t.colors,"editor.foreground":o,"editor.background":l},textmate:{...t,name:e,type:a,fg:o,bg:l,settings:n},zed:{name:e,appearance:a,style:{"editor.foreground":o,"editor.background":l,syntax:d}}}})(e.name,await e.load()),"diffs")},kkEw(e,t,n){n.d(t,{a:()=>i.lg,b:()=>d,c:()=>l});var i=n("I07G"),a=n("SMzt");let r={"ayu-dark":()=>n.e(33247).then(n.bind(n,"eNz5")),"catppuccin-latte":()=>n.e(571858).then(n.bind(n,"R3uT")),"catppuccin-mocha":()=>n.e(402734).then(n.bind(n,"ed7L")),"dark-plus":()=>n.e(574308).then(n.bind(n,"Ql0N")),dracula:()=>n.e(21885).then(n.bind(n,"FUKF")),"everforest-dark":()=>n.e(773959).then(n.bind(n,"dzPG")),"everforest-light":()=>n.e(818495).then(n.bind(n,"UQgL")),"github-dark-default":()=>n.e(370905).then(n.bind(n,"dOHO")),"github-light-default":()=>n.e(722017).then(n.bind(n,"vosZ")),"gruvbox-dark-medium":()=>n.e(631953).then(n.bind(n,"J8sX")),"gruvbox-light-medium":()=>n.e(416361).then(n.bind(n,"Vizg")),"light-plus":()=>n.e(442836).then(n.bind(n,"Vs6L")),"material-theme-darker":()=>n.e(939684).then(n.bind(n,"rhk3")),monokai:()=>n.e(53709).then(n.bind(n,"GBId")),"night-owl":()=>n.e(100450).then(n.bind(n,"DOYB")),nord:()=>n.e(301746).then(n.bind(n,"zkIA")),"one-dark-pro":()=>n.e(391298).then(n.bind(n,"jIEz")),"one-light":()=>n.e(225750).then(n.bind(n,"EiaD")),"rose-pine-dawn":()=>n.e(327938).then(n.bind(n,"iUJo")),"rose-pine-moon":()=>n.e(757265).then(n.bind(n,"MRBZ")),"solarized-dark":()=>n.e(854189).then(n.bind(n,"YQJc")),"solarized-light":()=>n.e(899573).then(n.bind(n,"JJ80")),"tokyo-night":()=>n.e(110734).then(n.bind(n,"QD5o"))},o=[s(a.a.AYU,{dark:"ayu-dark"}),s(a.a.CATPPUCCIN,{dark:"catppuccin-mocha",light:"catppuccin-latte"}),u(a.a.ABSOLUTELY,{dark:{load:()=>n.e(220243).then(n.t.bind(n,"L0sD",19)),name:"Absolutely Dark"},light:{load:()=>n.e(607291).then(n.t.bind(n,"i0wK",19)),name:"Absolutely Light"}}),u(a.a.CODEX,{dark:{load:()=>n.e(366084).then(n.t.bind(n,"i4nh",19)),name:"Codex Dark"},light:{load:()=>n.e(61942).then(n.t.bind(n,"sEmq",19)),name:"Codex Light"}}),s(a.a.DRACULA,{dark:"dracula"}),s(a.a.EVERFOREST,{dark:"everforest-dark",light:"everforest-light"}),s(a.a.GITHUB,{dark:"github-dark-default",light:"github-light-default"}),s(a.a.GRUVBOX,{dark:"gruvbox-dark-medium",light:"gruvbox-light-medium"}),u(a.a.LINEAR,{dark:{load:()=>n.e(101912).then(n.t.bind(n,"Aup8",19)),name:"Linear Dark"},light:{load:()=>n.e(583762).then(n.t.bind(n,"Zmpt",19)),name:"Linear Light"}}),u(a.a.LOBSTER,{dark:{load:()=>n.e(233122).then(n.t.bind(n,"Ouzr",19)),name:"Lobster Dark"}}),s(a.a.MATERIAL,{dark:"material-theme-darker"}),u(a.a.MATRIX,{dark:{load:()=>n.e(894220).then(n.t.bind(n,"t8qm",19)),name:"Matrix Dark"}}),s(a.a.MONOKAI,{dark:"monokai"}),s(a.a.NIGHT_OWL,{dark:"night-owl"}),s(a.a.NORD,{dark:"nord"}),u(a.a.NOTION,{dark:{load:()=>n.e(1444).then(n.t.bind(n,"PNJE",19)),name:"Notion Dark"},light:{load:()=>n.e(802582).then(n.t.bind(n,"GQSi",19)),name:"Notion Light"}}),u(a.a.OG,{dark:{load:()=>n.e(797075).then(n.t.bind(n,"CABk",19)),name:"OG Dark"}}),u(a.a.OSCURANGE,{dark:{load:()=>n.e(660933).then(n.t.bind(n,"xrtt",19)),name:"Oscurange"}}),s(a.a.ONE,{dark:"one-dark-pro",light:"one-light"}),u(a.a.PROOF,{light:{load:()=>n.e(848341).then(n.t.bind(n,"l9FY",19)),name:"Proof Light"}}),u(a.a.RAYCAST,{dark:{load:()=>n.e(720712).then(n.t.bind(n,"NRWZ",19)),name:"Raycast Dark"},light:{load:()=>n.e(323106).then(n.t.bind(n,"Aa5z",19)),name:"Raycast Light"}}),s(a.a.ROSE_PINE,{dark:"rose-pine-moon",light:"rose-pine-dawn"}),u(a.a.SENTRY,{dark:{load:()=>n.e(929734).then(n.t.bind(n,"ddRp",19)),name:"Sentry Dark"}}),s(a.a.SOLARIZED,{dark:"solarized-dark",light:"solarized-light"}),s(a.a.TOKYO_NIGHT,{dark:"tokyo-night"}),u(a.a.TEMPLE,{dark:{load:()=>n.e(872908).then(n.t.bind(n,"bzAW",19)),name:"Temple Dark"}}),u(a.a.VERCEL,{dark:{load:()=>n.e(820950).then(n.t.bind(n,"aE4H",19)),name:"Vercel Dark"},light:{load:()=>n.e(3528).then(n.t.bind(n,"wyj1",19)),name:"Vercel Light"}}),s(a.a.VSCODE_PLUS,{dark:"dark-plus",light:"light-plus"}),u(a.a.XCODE,{dark:{load:()=>n.e(617562).then(n.t.bind(n,"nao7",19)),name:"Xcode Dark"},light:{load:()=>n.e(600788).then(n.t.bind(n,"W6Nn",19)),name:"Xcode Light"}})];function l(){return o.flatMap(e=>Object.values(e.registrationByVariant)).filter(e=>null!=e)}function d(e,t){let{id:n}=(0,a.d)(e,t),i=o.find(e=>e.id===n)?.registrationByVariant[t];if(null==i)throw Error(`Missing ${t} code theme registration`);return i}function s(e,t){let n=t.dark,i=t.light;return u(e,{dark:null==n?void 0:{load:()=>r[n](),name:n},light:null==i?void 0:{load:()=>r[i](),name:i}})}function u(e,t){let n={},i=t.dark,a=t.light;return null!=i&&(n.dark=f(i.name,i.load)),null!=a&&(n.light=f(a.name,a.load)),{id:e,registrationByVariant:n}}function f(e,t){let n=null;return{load:async()=>(null==n&&(n=t().then(e=>"object"==typeof e&&null!=e&&"default"in e?e.default:e).catch(e=>{throw n=null,e})),n),name:e}}},HlFQ(e,t,n){var i=n("QGZE");n.d(t,{},{a:function(e,t,n="textmate"){let a=i.b.get(e)??{};null!=a[n]?console.error("SharedHighlight.registerCustomTheme: theme name and type already registered",e,n):(a[n]=t,i.b.set(e,a))}})},PZKB(e,t,n){var i=n("HqzJ"),a=n("zd8w"),r=n("ABep");let o=(0,a.createContext)(void 0);n.d(t,{},{a:function({children:e,createEditor:t}){let n=(0,i.a)((e,n,i)=>t(e,n,i));return(0,r.jsx)(o.Provider,{value:n,children:e})},b:function(){return(0,a.useContext)(o)}})},weNR(e,t,n){n.d(t,{a:()=>w});var i=n("kkpv"),a=n("GkUg"),r=n("IrFP"),o=n("NJmY"),l=n("zvlR"),d=n("uYgy"),s=n("GNGu"),u=n("am05"),f=n("SCll"),c=n("nyfN"),p=n("HqzJ"),h=n("PZKB"),g=n("BfcI"),m=n("ydlG"),b=n("FaFd"),x=n("zd8w");let v="u"<typeof window?x.useEffect:x.useLayoutEffect;function k(e,t,n){return(0,l.a)(e??void 0,n.oldFile??void 0)&&(0,l.a)(t??void 0,n.newFile??void 0)}function y({options:e,controlledSelection:t,hasCustomHeader:n,hasGutterRenderUtility:i,onEditChange:a,onEditComplete:r}){return t||i||n||null!=a||null!=r?{...e,controlledSelection:t,renderCustomHeader:n?g.c:e?.renderCustomHeader,renderGutterUtility:i?g.c:e?.renderGutterUtility,onEditChange:a,onEditComplete:r}:e}var L=n("ABep");function w({fileDiff:e,options:t,editorOptions:n,editStateKey:l,metrics:g,deferCleanup:D,lineAnnotations:C,selectedLines:S,className:I,style:E,prerenderedHTML:$,renderAnnotation:A,renderCustomHeader:j,renderHeaderPrefix:O,renderHeaderFilenameSuffix:B,renderHeaderMetadata:F,renderGutterUtility:R,disableWorkerPool:P=!1,edit:N=!1,onEditChange:z,onEditComplete:T}){let{ref:_,getHoveredLine:G,getAnnotationSlotName:U}=function({fileDiff:e,oldFile:t,newFile:n,options:i,editorOptions:a,editStateKey:r,lineAnnotations:l,selectedLines:g,prerenderedHTML:L,metrics:w,deferCleanup:D,hasGutterRenderUtility:C,hasCustomHeader:S,disableWorkerPool:I,edit:E,onEditChange:$,onEditComplete:A}){let j=(0,b.b)(),O=void 0!==g,B=(0,x.useContext)(m.a),F=(0,h.b)(),[R,P]=(0,x.useState)(),N=(0,p.a)(e=>$?.(e)),z=null!=$?N:void 0,T=(0,x.useRef)(null),_=(0,p.a)(i=>{let a=A?.(i)??"reject";return"accept"===a&&(T.current={fileDiff:{installed:i.fileDiff,stale:i.originalFileDiff},filePair:null==e?{fileDiff:i.fileDiff,installed:{oldFile:i.oldFile,newFile:i.newFile},stale:{oldFile:t??null,newFile:n??null}}:null,annotations:{installed:i.lineAnnotations,stale:i.originalLineAnnotations}}),a}),G=null!=A?_:void 0,U=function({acceptedCache:e,fileDiff:t,newFile:n,oldFile:i,parseDiffOptions:a}){return(0,x.useMemo)(()=>{if(null!=t)return t;let{current:r}=e,o=r?.filePair;if(null!=r&&null!=o){if(k(i,n,o.stale)||k(i,n,o.installed))return o.fileDiff;r.filePair=null}return(0,u.a)(i??null,n??null,a)},[e,t,i,n,a])}({acceptedCache:T,fileDiff:e,newFile:n,oldFile:t,parseDiffOptions:i?.parseDiffOptions}),H=(0,x.useRef)(null),M=(0,x.useRef)(null),V=(0,x.useRef)(null),K=(0,x.useRef)(null),Y=(0,x.useRef)(null),J=(0,p.a)(()=>{if(null==F)throw Error("FileDiff: EditContext is not attached");return F("file-diff",a??{},r)}),X=(0,p.a)(e=>{if(V.current?.(),V.current=null,null!=e){let t=M.current;if(null!=H.current){if(t?.fileContainer===e&&t.simpleVirtualizer===j&&t.poolManager===B)return void H.current.resume();H.current.cleanUp(),K.current=null}M.current={fileContainer:e,simpleVirtualizer:j,poolManager:B},null!=j?H.current=new c.a(y({controlledSelection:O,hasCustomHeader:S,hasGutterRenderUtility:C,onEditChange:z,onEditComplete:G,options:i}),j,w,!I?B:void 0,!0):H.current=new f.a(y({controlledSelection:O,hasCustomHeader:S,hasGutterRenderUtility:C,onEditChange:z,onEditComplete:G,options:i}),!I?B:void 0,!0),H.current.hydrate({fileDiff:U,fileContainer:e,lineAnnotations:l,prerenderedHTML:L})}else{if(null==H.current)throw Error("useFileDiffInstance: A FileDiff instance should exist when unmounting");Y.current=null;let e=H.current,t=()=>{e.cleanUp(),H.current=null,M.current=null,K.current=null};null==D||E||null!=K.current?t():(e.suspend(),V.current=D(t))}});v(()=>{let{current:e}=H;if(null==e)return;let t=y({controlledSelection:O,hasCustomHeader:S,hasGutterRenderUtility:C,onEditChange:z,onEditComplete:G,options:i}),n=void 0!==t&&!(0,o.a)(e.options,t);if(e.setOptions(t),!E&&(Y.current=null,null!=K.current)){let{current:e}=K;K.current=null,e()}let a=function(e,t,n){let{current:i}=n;if(null==i)return{fileDiff:e,lineAnnotations:t};let{fileDiff:a,annotations:r}=i,o=e;null!=a&&((0,s.a)(e,a.stale)?o=a.installed:i.fileDiff=null);let l=t;return null!=r&&(t===r.stale?l=r.installed:i.annotations=null),null==i.fileDiff&&null==i.annotations&&null==i.filePair&&(n.current=null),{fileDiff:o,lineAnnotations:l}}(U,l,T);if(e.render({forceRender:n,fileDiff:a.fileDiff,lineAnnotations:a.lineAnnotations}),void 0!==g&&e.setSelectedLines(g),!E||null!=K.current)return;if(null==F)throw Error("FileDiff: EditContext is not attached");let r=()=>{H.current===e&&null==K.current&&e.__canAttachEditor()&&(K.current=function(e,t){let n=t();try{return n.edit(e)}catch(e){throw n.cleanUp(),e}}(e,J))};if(e.__canAttachEditor()){Y.current=null,r();return}let d=e.__prepareForEditing();if(null==d){Y.current=null;return}if(Y.current?.promise===d)return;let u={promise:d};Y.current=u,d.then(()=>{Y.current===u&&(r(),Y.current=null)}).catch(e=>{Y.current===u&&(Y.current=null,P(e))})});let Z=(0,x.useCallback)(()=>H.current?.getHoveredLine(),[]),q=(0,x.useCallback)(e=>H.current?.getAnnotationSlotName(e)??(0,d.a)(e),[]);if(null!=R)throw R;return{fileDiff:U,ref:X,getHoveredLine:Z,getAnnotationSlotName:q}}({fileDiff:e,options:t,editorOptions:n,editStateKey:l,metrics:g,deferCleanup:D,lineAnnotations:C,selectedLines:S,prerenderedHTML:$,hasGutterRenderUtility:null!=R,hasCustomHeader:null!=j,disableWorkerPool:P,edit:N,onEditChange:z,onEditComplete:T}),H=(0,a.a)({fileDiff:e,renderCustomHeader:j,renderHeaderPrefix:O,renderHeaderFilenameSuffix:B,renderHeaderMetadata:F,renderAnnotation:A,renderGutterUtility:R,lineAnnotations:C,getHoveredLine:G,getAnnotationSlotName:U});return(0,L.jsx)(i.o,{ref:_,className:I,style:E,children:(0,r.a)(H,$)})}},FaFd(e,t,n){var i=n("zd8w");n("ABep");let a=(0,i.createContext)(void 0);n.d(t,{},{a:a,b:function(){return(0,i.useContext)(a)}})},ydlG(e,t,n){var i=n("zd8w");n("ABep");let a=(0,i.createContext)(void 0);n.d(t,{},{a:a,b:function(){return(0,i.useContext)(a)}})},BfcI(e,t,n){n.d(t,{},{a:{position:"absolute",top:0,bottom:0,textAlign:"center",whiteSpace:"normal",touchAction:"none"},b:{display:"contents"},c:function(){return null}})},GkUg(e,t,n){n.d(t,{a:()=>l});var i=n("kkpv"),a=n("uYgy"),r=n("BfcI"),o=n("ABep");function l({fileDiff:e,actions:t,renderCustomHeader:n,renderHeaderPrefix:d,renderHeaderFilenameSuffix:s,renderHeaderMetadata:u,renderAnnotation:f,renderGutterUtility:c,renderMergeConflictUtility:p,lineAnnotations:h,getHoveredLine:g,getInstance:m,getAnnotationSlotName:b=a.a}){let x=n?.(e),v=d?.(e),k=s?.(e),y=u?.(e);return(0,o.jsxs)(o.Fragment,{children:[null!=x?(0,o.jsx)("div",{slot:i.d,children:x}):(0,o.jsxs)(o.Fragment,{children:[null!=v&&(0,o.jsx)("div",{slot:"header-prefix",children:v}),null!=k&&(0,o.jsx)("div",{slot:"header-filename-suffix",children:k}),null!=y&&(0,o.jsx)("div",{slot:"header-metadata",children:y})]}),null!=f&&h?.map((e,t)=>(0,o.jsx)("div",{slot:b(e),children:f(e)},t)),null!=t&&null!=p&&null!=m&&t.map(t=>{var n;let i;if(null==t)return;let a=null!=(i=function(e,t){let n=t.hunks[e.hunkIndex];if(null!=n)return{hunkIndex:e.hunkIndex,lineIndex:function(e,t){let n=e.unifiedLineStart;for(let i=0;i<t;i++){let t=e.hunkContent[i];n+="context"===t.type?t.lines:t.deletions+t.additions}return n}(n,e.startContentIndex)}}(n=t,e))?function({hunkIndex:e,lineIndex:t,conflictIndex:n}){return`merge-conflict-action-${e}-${t}-${n}`}({hunkIndex:i.hunkIndex,lineIndex:i.lineIndex,conflictIndex:n.conflictIndex}):void 0;return(0,o.jsx)("div",{slot:a,style:r.b,children:p(t,m)},a)}),null!=c&&(0,o.jsx)("div",{slot:"gutter-utility-slot",style:r.a,children:c(g)})]})}},IrFP(e,t,n){var i=n("ABep");n.d(t,{},{a:function(e,t){return"u"<typeof window&&null!=t?(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)("template",{shadowrootmode:"open",dangerouslySetInnerHTML:{__html:t}}),e]}):(0,i.jsx)(i.Fragment,{children:e})}})},HqzJ(e,t,n){var i=n("zd8w");n.d(t,{},{a:function(e){let t=(0,i.useRef)(e);return(0,i.useInsertionEffect)(()=>void(t.current=e)),(0,i.useCallback)((...e)=>t.current(...e),[])}})},zvlR(e,t,n){n.d(t,{},{a:function(e,t){return e?.cacheKey!=null||t?.cacheKey!=null?e?.cacheKey===t?.cacheKey:e?.contents===t?.contents&&e?.name===t?.name&&e?.lang===t?.lang}})},abZZ(e,t,n){n.d(t,{},{a:function(e){let t=[],n=String(e||""),i=n.indexOf(","),a=0,r=!1;for(;!r;){-1===i&&(i=n.length,r=!0);let e=n.slice(a,i).trim();(e||!r)&&t.push(e),a=i+1,i=n.indexOf(",",a)}return t},b:function(e,t){let n=t||{};return(""===e[e.length-1]?[...e,""]:e).join((n.padRight?" ":"")+","+(!1===n.padLeft?"":" ")).trim()}})},N3yO(e,t,n){let i=/[ \t\n\f\r]/g;function a(e){return""===e.replace(i,"")}n.d(t,{},{a:function(e){return"object"==typeof e?"text"===e.type&&a(e.value):a(e)}})},gMH0(e,t,n){n.d(t,{},{a:function(e){let t=String(e||"").trim();return t?t.split(/[ \t\n\r\f]+/g):[]},b:function(e){return e.join(" ").trim()}})}};