export const __rspack_esm_ids=[381691];export const __webpack_modules__={gtZG(a,b,c){var d=c("ABep"),e=c("QosV"),f=c("sXTZ"),g=c("HiWP"),h=c("gz4m"),i=c("N0bB"),j=c("yZpl"),k=c("zd8w"),l=c("Wf1j"),m=c("Ovip"),n=c("uNhY");c("SV8P");var o=c("ADAj"),p=c("kkEw"),q=c("a6Zv"),r=c("bIvi");function s(a){return a.focus({preventScroll:!0})}function t(a,b,c){return new g.a(a,b,c)}(0,f.a)("mermaid-source",async()=>{let{default:a}=await c.e(106779).then(c.bind(c,"L2Bi"));return{default:a.map(a=>({...a,name:"mermaid-source",scopeName:"source.mermaid",aliases:[],injectionSelector:void 0,patterns:[{include:"#mermaid"}]}))}}),c.d(b,{},{MermaidCodeEditor:function(a){let b,c,f,g,u,v,w,x,y,z,A,B,C,D=(0,e.c)(30),{initialCode:E,editStateKey:F,onChange:G,onBlur:H}=a,I=(0,l.a)(),J=(0,q.a)()?"dark":"light",K=(0,o.l)("dark"===J?j.Vd.darkCodeThemeId:j.Vd.lightCodeThemeId);D[0]!==G?(b=a=>G?.(a.contents),D[0]=G,D[1]=b):b=D[1];let L=(0,r.a)(b),M=(0,k.useEffectEvent)(H);D[2]!==M?(c=()=>()=>M(),D[2]=M,D[3]=c):c=D[3],D[4]===Symbol.for("react.memo_cache_sentinel")?(f=[],D[4]=f):f=D[4],(0,k.useEffect)(c,f);let N=null!=G;D[5]===Symbol.for("react.memo_cache_sentinel")?(g={"mermaid-source":{lineComment:"%%"}},D[5]=g):g=D[5],D[6]!==L?(u={languageCommentConfig:g,onAttach:s,onChange:a=>{let{file:b}=a;return L(b)}},D[6]=L,D[7]=u):u=D[7],D[8]!==I?(v=I.formatMessage({id:"chatgpt.codeBlocks.editor.ariaLabel",defaultMessage:"Edit code"}),D[8]=I,D[9]=v):v=D[9],D[10]!==E||D[11]!==v?(w={name:v,contents:E,lang:"mermaid-source",cacheKey:"mermaid-source"},D[10]=E,D[11]=v,D[12]=w):w=D[12],D[13]===Symbol.for("react.memo_cache_sentinel")?(x=(0,n.a)(),D[13]=x):x=D[13],D[14]!==K||D[15]!==J?(y=(0,p.b)(K,J),D[14]=K,D[15]=J,D[16]=y):y=D[16];let O=y.name;return D[17]===Symbol.for("react.memo_cache_sentinel")?(z=(0,m.b)({includeDiffHeader:!1,includeSimpleLineSeparators:!1,rootSelector:"[data-file]",surface:"var(--color-surface)"}),D[17]=z):z=D[17],D[18]!==y.name||D[19]!==J?(A={preferredHighlighter:x,disableFileHeader:!0,overflow:"wrap",theme:O,themeType:J,useTokenTransformer:!0,unsafeCSS:z},D[18]=y.name,D[19]=J,D[20]=A):A=D[20],D[21]!==F||D[22]!==A||D[23]!==N||D[24]!==u||D[25]!==w?(B=(0,d.jsx)(h.a,{createEditor:t,children:(0,d.jsx)(i.a,{className:"[--diffs-editor-selection-bg:var(--color-background-text-selection)] [--diffs-min-number-column-width:1ch]",disableWorkerPool:!0,edit:N,editStateKey:F,editorOptions:u,file:w,options:A})}),D[21]=F,D[22]=A,D[23]=N,D[24]=u,D[25]=w,D[26]=B):B=D[26],D[27]!==H||D[28]!==B?(C=(0,d.jsx)("div",{className:"h-full overflow-auto pe-4",onBlur:H,children:B}),D[27]=H,D[28]=B,D[29]=C):C=D[29],C}})},Ovip(a,b,c){let d="var(--color-surface)",e=`color-mix(
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

${i}`}})},uNhY(a,b,c){c.d(b,{},{a:function(){}})},SV8P(a,b,c){var d=c("tPhx"),e=c("kkEw");let f={comment:["comment"],string:["string"],"string.escape":["constant.character.escape"],"string.regex":["string.regexp"],"text.literal":["markup.inline.raw"],keyword:["keyword","storage.type","storage.modifier"],operator:["keyword.operator"],preproc:["keyword.control.directive"],boolean:["constant.language.boolean","constant.language"],number:["constant.numeric"],constant:["constant"],variable:["variable"],"variable.special":["variable.language"],"variable.parameter":["variable.parameter"],property:["variable.other.property","support.type.property-name"],"property.json_key":["support.type.property-name.json"],function:["entity.name.function","support.function"],constructor:["entity.name.type.class"],type:["entity.name.type","support.type"],attribute:["entity.other.attribute-name"],tag:["entity.name.tag"],punctuation:["punctuation"],link_text:["markup.underline.link"],link_uri:["markup.underline.link","string.other.link"],"diff.plus":["markup.inserted.diff"],"diff.minus":["markup.deleted.diff"],emphasis:["markup.italic"],"emphasis.strong":["markup.bold"],title:["markup.heading"]};for(let a of(0,e.c)())(0,d.a)(a.name,async()=>(function(a,b){let c=b.tokenColors??b.settings??[],d=c.find(a=>null==a.scope)?.settings,e="light"===b.type?"light":"dark",g=b.fg??b.colors?.["editor.foreground"]??d?.foreground??("light"===e?"#333333":"#bbbbbb"),h=b.bg??b.colors?.["editor.background"]??d?.background??("light"===e?"#ffffff":"#1e1e1e"),i={};for(let[a,b]of Object.entries(f)){let d={},e=-1,f=-1;for(let a of c)for(let c of"string"==typeof a.scope?a.scope.split(","):a.scope??[]){let g=c.trim();g&&b.some(a=>a===g||a.startsWith(`${g}.`))&&(null!=a.settings.foreground&&g.length>=e&&(d.color=a.settings.foreground,e=g.length),null!=a.settings.fontStyle&&g.length>=f&&(d.font_style=a.settings.fontStyle.includes("italic")?"italic":"normal",d.font_weight=a.settings.fontStyle.includes("bold")?700:400,f=g.length))}i[a]=d}return{name:a,type:e,fg:g,bg:h,colors:{...b.colors,"editor.foreground":g,"editor.background":h},textmate:{...b,name:a,type:e,fg:g,bg:h,settings:c},zed:{name:a,appearance:e,style:{"editor.foreground":g,"editor.background":h,syntax:i}}}})(a.name,await a.load()),"diffs")},kkEw(a,b,c){c.d(b,{a:()=>d.og,b:()=>i,c:()=>h});var d=c("yZpl"),e=c("SMzt");let f={"ayu-dark":()=>c.e(33247).then(c.bind(c,"eNz5")),"catppuccin-latte":()=>c.e(571858).then(c.bind(c,"R3uT")),"catppuccin-mocha":()=>c.e(402734).then(c.bind(c,"ed7L")),"dark-plus":()=>c.e(574308).then(c.bind(c,"Ql0N")),dracula:()=>c.e(21885).then(c.bind(c,"FUKF")),"everforest-dark":()=>c.e(773959).then(c.bind(c,"dzPG")),"everforest-light":()=>c.e(818495).then(c.bind(c,"UQgL")),"github-dark-default":()=>c.e(370905).then(c.bind(c,"dOHO")),"github-light-default":()=>c.e(722017).then(c.bind(c,"vosZ")),"gruvbox-dark-medium":()=>c.e(631953).then(c.bind(c,"J8sX")),"gruvbox-light-medium":()=>c.e(416361).then(c.bind(c,"Vizg")),"light-plus":()=>c.e(442836).then(c.bind(c,"Vs6L")),"material-theme-darker":()=>c.e(939684).then(c.bind(c,"rhk3")),monokai:()=>c.e(53709).then(c.bind(c,"GBId")),"night-owl":()=>c.e(100450).then(c.bind(c,"DOYB")),nord:()=>c.e(301746).then(c.bind(c,"zkIA")),"one-dark-pro":()=>c.e(391298).then(c.bind(c,"jIEz")),"one-light":()=>c.e(225750).then(c.bind(c,"EiaD")),"rose-pine-dawn":()=>c.e(327938).then(c.bind(c,"iUJo")),"rose-pine-moon":()=>c.e(757265).then(c.bind(c,"MRBZ")),"solarized-dark":()=>c.e(854189).then(c.bind(c,"YQJc")),"solarized-light":()=>c.e(899573).then(c.bind(c,"JJ80")),"tokyo-night":()=>c.e(110734).then(c.bind(c,"QD5o"))},g=[j(e.a.AYU,{dark:"ayu-dark"}),j(e.a.CATPPUCCIN,{dark:"catppuccin-mocha",light:"catppuccin-latte"}),k(e.a.ABSOLUTELY,{dark:{load:()=>c.e(220243).then(c.t.bind(c,"L0sD",19)),name:"Absolutely Dark"},light:{load:()=>c.e(607291).then(c.t.bind(c,"i0wK",19)),name:"Absolutely Light"}}),k(e.a.CODEX,{dark:{load:()=>c.e(366084).then(c.t.bind(c,"i4nh",19)),name:"Codex Dark"},light:{load:()=>c.e(61942).then(c.t.bind(c,"sEmq",19)),name:"Codex Light"}}),j(e.a.DRACULA,{dark:"dracula"}),j(e.a.EVERFOREST,{dark:"everforest-dark",light:"everforest-light"}),j(e.a.GITHUB,{dark:"github-dark-default",light:"github-light-default"}),j(e.a.GRUVBOX,{dark:"gruvbox-dark-medium",light:"gruvbox-light-medium"}),k(e.a.LINEAR,{dark:{load:()=>c.e(101912).then(c.t.bind(c,"Aup8",19)),name:"Linear Dark"},light:{load:()=>c.e(583762).then(c.t.bind(c,"Zmpt",19)),name:"Linear Light"}}),k(e.a.LOBSTER,{dark:{load:()=>c.e(233122).then(c.t.bind(c,"Ouzr",19)),name:"Lobster Dark"}}),j(e.a.MATERIAL,{dark:"material-theme-darker"}),k(e.a.MATRIX,{dark:{load:()=>c.e(894220).then(c.t.bind(c,"t8qm",19)),name:"Matrix Dark"}}),j(e.a.MONOKAI,{dark:"monokai"}),j(e.a.NIGHT_OWL,{dark:"night-owl"}),j(e.a.NORD,{dark:"nord"}),k(e.a.NOTION,{dark:{load:()=>c.e(1444).then(c.t.bind(c,"PNJE",19)),name:"Notion Dark"},light:{load:()=>c.e(802582).then(c.t.bind(c,"GQSi",19)),name:"Notion Light"}}),k(e.a.OG,{dark:{load:()=>c.e(797075).then(c.t.bind(c,"CABk",19)),name:"OG Dark"}}),k(e.a.OSCURANGE,{dark:{load:()=>c.e(660933).then(c.t.bind(c,"xrtt",19)),name:"Oscurange"}}),j(e.a.ONE,{dark:"one-dark-pro",light:"one-light"}),k(e.a.PROOF,{light:{load:()=>c.e(848341).then(c.t.bind(c,"l9FY",19)),name:"Proof Light"}}),k(e.a.RAYCAST,{dark:{load:()=>c.e(720712).then(c.t.bind(c,"NRWZ",19)),name:"Raycast Dark"},light:{load:()=>c.e(323106).then(c.t.bind(c,"Aa5z",19)),name:"Raycast Light"}}),j(e.a.ROSE_PINE,{dark:"rose-pine-moon",light:"rose-pine-dawn"}),k(e.a.SENTRY,{dark:{load:()=>c.e(929734).then(c.t.bind(c,"ddRp",19)),name:"Sentry Dark"}}),j(e.a.SOLARIZED,{dark:"solarized-dark",light:"solarized-light"}),j(e.a.TOKYO_NIGHT,{dark:"tokyo-night"}),k(e.a.TEMPLE,{dark:{load:()=>c.e(872908).then(c.t.bind(c,"bzAW",19)),name:"Temple Dark"}}),k(e.a.VERCEL,{dark:{load:()=>c.e(820950).then(c.t.bind(c,"aE4H",19)),name:"Vercel Dark"},light:{load:()=>c.e(3528).then(c.t.bind(c,"wyj1",19)),name:"Vercel Light"}}),j(e.a.VSCODE_PLUS,{dark:"dark-plus",light:"light-plus"}),k(e.a.XCODE,{dark:{load:()=>c.e(617562).then(c.t.bind(c,"nao7",19)),name:"Xcode Dark"},light:{load:()=>c.e(600788).then(c.t.bind(c,"W6Nn",19)),name:"Xcode Light"}})];function h(){return g.flatMap(a=>Object.values(a.registrationByVariant)).filter(a=>null!=a)}function i(a,b){let{id:c}=(0,e.d)(a,b),d=g.find(a=>a.id===c)?.registrationByVariant[b];if(null==d)throw Error(`Missing ${b} code theme registration`);return d}function j(a,b){let c=b.dark,d=b.light;return k(a,{dark:null==c?void 0:{load:()=>f[c](),name:c},light:null==d?void 0:{load:()=>f[d](),name:d}})}function k(a,b){let c={},d=b.dark,e=b.light;return null!=d&&(c.dark=l(d.name,d.load)),null!=e&&(c.light=l(e.name,e.load)),{id:a,registrationByVariant:c}}function l(a,b){let c=null;return{load:async()=>(null==c&&(c=b().then(a=>"object"==typeof a&&null!=a&&"default"in a?a.default:a).catch(a=>{throw c=null,a})),c),name:a}}}};