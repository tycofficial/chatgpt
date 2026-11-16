export const __rspack_esm_ids=[381691];export const __webpack_modules__={gtZG(e,a,t){var r=t("ABep"),n=t("QosV"),i=t("jYfd"),o=t("eAMG"),d=t("PZKB"),l=t("NaqA"),s=t("I07G"),c=t("zd8w"),f=t("Wf1j"),u=t("Ovip"),g=t("uNhY");t("SV8P");var p=t("ADAj"),m=t("kkEw"),b=t("a6Zv"),h=t("bIvi");function k(e){return e.focus({preventScroll:!0})}function v(e,a,t){return new o.a(e,a,t)}(0,i.a)("mermaid-source",async()=>{let{default:e}=await t.e(106779).then(t.bind(t,"L2Bi"));return{default:e.map(e=>({...e,name:"mermaid-source",scopeName:"source.mermaid",aliases:[],injectionSelector:void 0,patterns:[{include:"#mermaid"}]}))}}),t.d(a,{},{MermaidCodeEditor:function(e){let a,t,i,o,x,y,$,w,E,O,S,L,A,_=(0,n.c)(30),{initialCode:C,editStateKey:N,onChange:D,onBlur:R}=e,T=(0,f.a)(),I=(0,b.a)()?"dark":"light",z=(0,p.l)("dark"===I?s.Sd.darkCodeThemeId:s.Sd.lightCodeThemeId);_[0]!==D?(a=e=>D?.(e.contents),_[0]=D,_[1]=a):a=_[1];let B=(0,h.a)(a),P=(0,c.useEffectEvent)(R);_[2]!==P?(t=()=>()=>P(),_[2]=P,_[3]=t):t=_[3],_[4]===Symbol.for("react.memo_cache_sentinel")?(i=[],_[4]=i):i=_[4],(0,c.useEffect)(t,i);let G=null!=D;_[5]===Symbol.for("react.memo_cache_sentinel")?(o={"mermaid-source":{lineComment:"%%"}},_[5]=o):o=_[5],_[6]!==B?(x={languageCommentConfig:o,onAttach:k,onChange:e=>{let{file:a}=e;return B(a)}},_[6]=B,_[7]=x):x=_[7],_[8]!==T?(y=T.formatMessage({id:"chatgpt.codeBlocks.editor.ariaLabel",defaultMessage:"Edit code"}),_[8]=T,_[9]=y):y=_[9],_[10]!==C||_[11]!==y?($={name:y,contents:C,lang:"mermaid-source",cacheKey:"mermaid-source"},_[10]=C,_[11]=y,_[12]=$):$=_[12],_[13]===Symbol.for("react.memo_cache_sentinel")?(w=(0,g.a)(),_[13]=w):w=_[13],_[14]!==z||_[15]!==I?(E=(0,m.b)(z,I),_[14]=z,_[15]=I,_[16]=E):E=_[16];let j=E.name;return _[17]===Symbol.for("react.memo_cache_sentinel")?(O=(0,u.b)({includeDiffHeader:!1,includeSimpleLineSeparators:!1,rootSelector:"[data-file]",surface:"var(--color-surface)"}),_[17]=O):O=_[17],_[18]!==E.name||_[19]!==I?(S={preferredHighlighter:w,disableFileHeader:!0,overflow:"wrap",theme:j,themeType:I,useTokenTransformer:!0,unsafeCSS:O},_[18]=E.name,_[19]=I,_[20]=S):S=_[20],_[21]!==N||_[22]!==S||_[23]!==G||_[24]!==x||_[25]!==$?(L=(0,r.jsx)(d.a,{createEditor:v,children:(0,r.jsx)(l.a,{className:"[--diffs-editor-selection-bg:var(--color-background-text-selection)] [--diffs-min-number-column-width:1ch]",disableWorkerPool:!0,edit:G,editStateKey:N,editorOptions:x,file:$,options:S})}),_[21]=N,_[22]=S,_[23]=G,_[24]=x,_[25]=$,_[26]=L):L=_[26],_[27]!==R||_[28]!==L?(A=(0,r.jsx)("div",{className:"h-full overflow-auto pe-4",onBlur:R,children:L}),_[27]=R,_[28]=L,_[29]=A):A=_[29],A}})},Ovip(e,a,t){let r="var(--color-surface)",n=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 94%,
  var(--color-surface)
)`,i=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 94%,
  var(--color-text-info)
)`,o=`color-mix(
  in srgb,
  var(--codex-diffs-surface) 92%,
  var(--color-surface)
)`,d=`color-mix(
  in lab,
  var(--codex-diffs-surface) 98.5%,
  var(--diffs-mixer)
)`,l=`light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-addition-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-addition-base))
)`,s=`light-dark(
  color-mix(in lab, var(--diffs-light-bg, #fff) 91%, var(--diffs-deletion-base)),
  color-mix(in lab, var(--diffs-dark-bg, #000) 85%, var(--diffs-deletion-base))
)`,c=`light-dark(
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
)`,u=`
  --codex-diffs-surface: ${r};
  --codex-diffs-context-surface: ${n};
  --codex-diffs-separator-surface: ${i};
  --codex-diffs-hover-surface: ${o};
  --codex-diffs-header-surface: var(--codex-diffs-surface);
  --codex-diffs-context-number: ${d};
  --codex-diffs-addition-number: ${l};
  --codex-diffs-deletion-number: ${s};
  --codex-diffs-addition-hover: ${c};
  --codex-diffs-deletion-hover: ${f};
  /* Keep unhighlighted lines readable while syntax tokens are pending. */
  --diffs-dark: var(--color-text);
  --diffs-light: var(--color-text);
  --diffs-bg-context-override: var(--codex-diffs-context-surface);
  --diffs-bg-separator-override: var(--codex-diffs-separator-surface);
  --diffs-bg-hover-override: var(--codex-diffs-hover-surface);
`;t.d(a,{},{a:function(e,a){return e?"diff"===a?"var(--color-codex-diff-surface)":r:"var(--color-surface-secondary)"},b:function(e){let{alignCommentGutter:a=!1,includeDiffHeader:t,includeSimpleLineSeparators:r,rootSelector:n,surface:i,useReviewLineInfoSeparators:o=!1}=e,d=t?`[data-diffs-header],
  ${n}`:n,l=r?`
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
`:"",s=a?`
  ${n} [data-column-number] {
    padding-inline-start: calc(var(--spacing) * 10);
  }
`:"",c=o?`
  ${n} [data-column-number] {
    padding-inline: 1.5ch;
    text-align: center;
  }

  ${n} [data-separator='line-info'] :is([data-separator-wrapper], [data-expand-button], [data-separator-content]) {
    border-radius: 0;
  }

  ${n} [data-separator='line-info'] [data-separator-wrapper] {
    padding: 0;
  }

  ${n} [data-unified] [data-separator='line-info'] [data-separator-wrapper] {
    grid-template-columns: var(--diffs-column-number-width) minmax(0, 1fr);
  }

  ${n} [data-unified] [data-separator='line-info'] [data-expand-button] {
    min-width: 0;
  }

  /* Pierre duplicates split separators into each gutter and content cell. */
  ${n} [data-deletions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    background-color: var(--diffs-bg);
    grid-template-columns: minmax(0, 1fr);
  }

  ${n} [data-deletions] [data-gutter] [data-separator='line-info'] [data-separator-content],
  ${n} [data-deletions] [data-content] [data-separator='line-info'] [data-expand-button] {
    display: none;
  }

  ${n} [data-deletions] [data-content] [data-separator='line-info'] [data-separator-wrapper] {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  ${n} [data-deletions] [data-content] [data-separator='line-info'] [data-separator-content] {
    grid-column: 1;
  }

  ${n} [data-additions] [data-gutter] [data-separator='line-info'],
  ${n} [data-additions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    background-color: var(--diffs-bg-separator);
  }

  ${n}[data-overflow='scroll'] [data-additions] [data-gutter] [data-separator='line-info'] [data-separator-wrapper] {
    width: 100cqi;
  }

  ${n} [data-additions] [data-content] [data-separator='line-info'] [data-separator-wrapper] {
    margin-inline-end: 0;
  }
`:"",f=`
  /* Preserve the pre-beta split-column width instead of reserving a scrollbar gutter in every pane. */
  ${n} [data-code] {
    scrollbar-gutter: auto;
  }

  ${n} [data-line-type='change-addition']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-addition);
  }

  ${n} [data-line-type='change-addition']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--codex-diffs-addition-number);
  }

  ${n} [data-line-type='change-deletion']:is([data-line], [data-no-newline]) {
    --diffs-computed-diff-line-bg: var(--diffs-bg-deletion);
  }

  ${n} [data-line-type='change-deletion']:is([data-column-number], [data-gutter-buffer]) {
    --diffs-computed-diff-line-bg: var(--codex-diffs-deletion-number);
  }

  ${n} [data-line-type='change-addition'][data-hovered]:not([data-selected-line]) {
    --diffs-computed-hovered-line-bg: var(--codex-diffs-addition-hover);
  }

  ${n} [data-line-type='change-deletion'][data-hovered]:not([data-selected-line]) {
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
  ${d} {
    ${u}
    --diffs-bg: ${i} !important;
    background-color: ${i} !important;
  }

  ${n} [data-language-symbol-highlight] {
    background-color: var(--color-background-secondary-ghost-hover) !important;
  }

  ${n} [data-language-symbol-link] {
    text-decoration: underline;
    cursor: var(--cursor-interaction);
  }

  ${n} [data-utility-button] {
    background-color: var(--color-text);
    color: var(--color-surface-secondary);
    border: none;
    border-radius: 4px;
    margin-right: 0;
  }

  ${n} [data-utility-button]:hover {
    background-color: color-mix(
      in srgb,
      var(--color-text) 88%,
      var(--color-surface-secondary)
    );
  }

  ${n} [data-selected-line][data-line-annotation] {
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

  ${n} [data-line-type="change-deletion"][data-column-number]::before {
    background-color: var(--diffs-deletion-base);
    background-image: none;
  }

  /* Cover fractional-pixel gaps between consecutive solid change markers. */
  ${n} [data-line-type="change-addition"][data-column-number]
    + [data-line-type="change-addition"][data-column-number]::before,
  ${n} [data-line-type="change-deletion"][data-column-number]
    + [data-line-type="change-deletion"][data-column-number]::before {
    contain: none;
    top: -1px;
    height: calc(100% + 1px);
  }

${c}

${s}

${l}`}})},uNhY(e,a,t){t.d(a,{},{a:function(){}})},SV8P(e,a,t){var r=t("HlFQ"),n=t("kkEw");let i={comment:["comment"],string:["string"],"string.escape":["constant.character.escape"],"string.regex":["string.regexp"],"text.literal":["markup.inline.raw"],keyword:["keyword","storage.type","storage.modifier"],operator:["keyword.operator"],preproc:["keyword.control.directive"],boolean:["constant.language.boolean","constant.language"],number:["constant.numeric"],constant:["constant"],variable:["variable"],"variable.special":["variable.language"],"variable.parameter":["variable.parameter"],property:["variable.other.property","support.type.property-name"],"property.json_key":["support.type.property-name.json"],function:["entity.name.function","support.function"],constructor:["entity.name.type.class"],type:["entity.name.type","support.type"],attribute:["entity.other.attribute-name"],tag:["entity.name.tag"],punctuation:["punctuation"],link_text:["markup.underline.link"],link_uri:["markup.underline.link","string.other.link"],"diff.plus":["markup.inserted"],"diff.minus":["markup.deleted"],emphasis:["markup.italic"],"emphasis.strong":["markup.bold"],title:["markup.heading"]};for(let e of(0,n.c)())(0,r.a)(e.name,async()=>(function(e,a){let t=a.tokenColors??a.settings??[],r=t.find(e=>null==e.scope)?.settings,n="light"===a.type?"light":"dark",o=a.fg??a.colors?.["editor.foreground"]??r?.foreground??("light"===n?"#333333":"#bbbbbb"),d=a.bg??a.colors?.["editor.background"]??r?.background??("light"===n?"#ffffff":"#1e1e1e"),l={};for(let[e,a]of Object.entries(i)){let r={},n=-1,i=-1;for(let e of t)for(let t of"string"==typeof e.scope?e.scope.split(","):e.scope??[]){let o=t.trim();o&&a.some(e=>e===o||e.startsWith(`${o}.`))&&(null!=e.settings.foreground&&o.length>=n&&(r.color=e.settings.foreground,n=o.length),null!=e.settings.fontStyle&&o.length>=i&&(r.font_style=e.settings.fontStyle.includes("italic")?"italic":"normal",r.font_weight=e.settings.fontStyle.includes("bold")?700:400,i=o.length))}l[e]=r}return{name:e,type:n,fg:o,bg:d,colors:{...a.colors,"editor.foreground":o,"editor.background":d},textmate:{...a,name:e,type:n,fg:o,bg:d,settings:t},zed:{name:e,appearance:n,style:{"editor.foreground":o,"editor.background":d,syntax:l}}}})(e.name,await e.load()),"diffs")},kkEw(e,a,t){t.d(a,{a:()=>r.lg,b:()=>l,c:()=>d});var r=t("I07G"),n=t("SMzt");let i={"ayu-dark":()=>t.e(33247).then(t.bind(t,"eNz5")),"catppuccin-latte":()=>t.e(571858).then(t.bind(t,"R3uT")),"catppuccin-mocha":()=>t.e(402734).then(t.bind(t,"ed7L")),"dark-plus":()=>t.e(574308).then(t.bind(t,"Ql0N")),dracula:()=>t.e(21885).then(t.bind(t,"FUKF")),"everforest-dark":()=>t.e(773959).then(t.bind(t,"dzPG")),"everforest-light":()=>t.e(818495).then(t.bind(t,"UQgL")),"github-dark-default":()=>t.e(370905).then(t.bind(t,"dOHO")),"github-light-default":()=>t.e(722017).then(t.bind(t,"vosZ")),"gruvbox-dark-medium":()=>t.e(631953).then(t.bind(t,"J8sX")),"gruvbox-light-medium":()=>t.e(416361).then(t.bind(t,"Vizg")),"light-plus":()=>t.e(442836).then(t.bind(t,"Vs6L")),"material-theme-darker":()=>t.e(939684).then(t.bind(t,"rhk3")),monokai:()=>t.e(53709).then(t.bind(t,"GBId")),"night-owl":()=>t.e(100450).then(t.bind(t,"DOYB")),nord:()=>t.e(301746).then(t.bind(t,"zkIA")),"one-dark-pro":()=>t.e(391298).then(t.bind(t,"jIEz")),"one-light":()=>t.e(225750).then(t.bind(t,"EiaD")),"rose-pine-dawn":()=>t.e(327938).then(t.bind(t,"iUJo")),"rose-pine-moon":()=>t.e(757265).then(t.bind(t,"MRBZ")),"solarized-dark":()=>t.e(854189).then(t.bind(t,"YQJc")),"solarized-light":()=>t.e(899573).then(t.bind(t,"JJ80")),"tokyo-night":()=>t.e(110734).then(t.bind(t,"QD5o"))},o=[s(n.a.AYU,{dark:"ayu-dark"}),s(n.a.CATPPUCCIN,{dark:"catppuccin-mocha",light:"catppuccin-latte"}),c(n.a.ABSOLUTELY,{dark:{load:()=>t.e(220243).then(t.t.bind(t,"L0sD",19)),name:"Absolutely Dark"},light:{load:()=>t.e(607291).then(t.t.bind(t,"i0wK",19)),name:"Absolutely Light"}}),c(n.a.CODEX,{dark:{load:()=>t.e(366084).then(t.t.bind(t,"i4nh",19)),name:"Codex Dark"},light:{load:()=>t.e(61942).then(t.t.bind(t,"sEmq",19)),name:"Codex Light"}}),s(n.a.DRACULA,{dark:"dracula"}),s(n.a.EVERFOREST,{dark:"everforest-dark",light:"everforest-light"}),s(n.a.GITHUB,{dark:"github-dark-default",light:"github-light-default"}),s(n.a.GRUVBOX,{dark:"gruvbox-dark-medium",light:"gruvbox-light-medium"}),c(n.a.LINEAR,{dark:{load:()=>t.e(101912).then(t.t.bind(t,"Aup8",19)),name:"Linear Dark"},light:{load:()=>t.e(583762).then(t.t.bind(t,"Zmpt",19)),name:"Linear Light"}}),c(n.a.LOBSTER,{dark:{load:()=>t.e(233122).then(t.t.bind(t,"Ouzr",19)),name:"Lobster Dark"}}),s(n.a.MATERIAL,{dark:"material-theme-darker"}),c(n.a.MATRIX,{dark:{load:()=>t.e(894220).then(t.t.bind(t,"t8qm",19)),name:"Matrix Dark"}}),s(n.a.MONOKAI,{dark:"monokai"}),s(n.a.NIGHT_OWL,{dark:"night-owl"}),s(n.a.NORD,{dark:"nord"}),c(n.a.NOTION,{dark:{load:()=>t.e(1444).then(t.t.bind(t,"PNJE",19)),name:"Notion Dark"},light:{load:()=>t.e(802582).then(t.t.bind(t,"GQSi",19)),name:"Notion Light"}}),c(n.a.OG,{dark:{load:()=>t.e(797075).then(t.t.bind(t,"CABk",19)),name:"OG Dark"}}),c(n.a.OSCURANGE,{dark:{load:()=>t.e(660933).then(t.t.bind(t,"xrtt",19)),name:"Oscurange"}}),s(n.a.ONE,{dark:"one-dark-pro",light:"one-light"}),c(n.a.PROOF,{light:{load:()=>t.e(848341).then(t.t.bind(t,"l9FY",19)),name:"Proof Light"}}),c(n.a.RAYCAST,{dark:{load:()=>t.e(720712).then(t.t.bind(t,"NRWZ",19)),name:"Raycast Dark"},light:{load:()=>t.e(323106).then(t.t.bind(t,"Aa5z",19)),name:"Raycast Light"}}),s(n.a.ROSE_PINE,{dark:"rose-pine-moon",light:"rose-pine-dawn"}),c(n.a.SENTRY,{dark:{load:()=>t.e(929734).then(t.t.bind(t,"ddRp",19)),name:"Sentry Dark"}}),s(n.a.SOLARIZED,{dark:"solarized-dark",light:"solarized-light"}),s(n.a.TOKYO_NIGHT,{dark:"tokyo-night"}),c(n.a.TEMPLE,{dark:{load:()=>t.e(872908).then(t.t.bind(t,"bzAW",19)),name:"Temple Dark"}}),c(n.a.VERCEL,{dark:{load:()=>t.e(820950).then(t.t.bind(t,"aE4H",19)),name:"Vercel Dark"},light:{load:()=>t.e(3528).then(t.t.bind(t,"wyj1",19)),name:"Vercel Light"}}),s(n.a.VSCODE_PLUS,{dark:"dark-plus",light:"light-plus"}),c(n.a.XCODE,{dark:{load:()=>t.e(617562).then(t.t.bind(t,"nao7",19)),name:"Xcode Dark"},light:{load:()=>t.e(600788).then(t.t.bind(t,"W6Nn",19)),name:"Xcode Light"}})];function d(){return o.flatMap(e=>Object.values(e.registrationByVariant)).filter(e=>null!=e)}function l(e,a){let{id:t}=(0,n.d)(e,a),r=o.find(e=>e.id===t)?.registrationByVariant[a];if(null==r)throw Error(`Missing ${a} code theme registration`);return r}function s(e,a){let t=a.dark,r=a.light;return c(e,{dark:null==t?void 0:{load:()=>i[t](),name:t},light:null==r?void 0:{load:()=>i[r](),name:r}})}function c(e,a){let t={},r=a.dark,n=a.light;return null!=r&&(t.dark=f(r.name,r.load)),null!=n&&(t.light=f(n.name,n.load)),{id:e,registrationByVariant:t}}function f(e,a){let t=null;return{load:async()=>(null==t&&(t=a().then(e=>"object"==typeof e&&null!=e&&"default"in e?e.default:e).catch(e=>{throw t=null,e})),t),name:e}}}};