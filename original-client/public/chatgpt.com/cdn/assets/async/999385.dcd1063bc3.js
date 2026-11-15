export const __rspack_esm_ids=[999385];export const __webpack_modules__={wwds(e,t,a){var s=a("zd8w");a.d(t,{},{a:function(){let[e,t]=(0,s.useState)(null),[a,n]=(0,s.useState)({canPrevious:!1,canNext:!1});(0,s.useLayoutEffect)(()=>{if(!e)return;let t=()=>{let t=Math.max(0,e.scrollWidth-e.clientWidth),a=Math.min(t,Math.abs(e.scrollLeft)),s=a>1,r=a<t-1;n(e=>e.canPrevious===s&&e.canNext===r?e:{canPrevious:s,canNext:r})};t(),e.addEventListener("scroll",t,{passive:!0});let a=new ResizeObserver(t),s=()=>{for(let t of(a.disconnect(),a.observe(e),e.children))a.observe(t);t()},r=new MutationObserver(s);return r.observe(e,{childList:!0}),s(),()=>{e.removeEventListener("scroll",t),a.disconnect(),r.disconnect()}},[e]);let r=(0,s.useCallback)(t=>{if(!e)return;let a=e.ownerDocument.defaultView,s=a?.getComputedStyle(e).direction==="rtl";e.scrollBy({left:t*(s?-1:1)*e.clientWidth*.85,behavior:a?.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})},[e]);return{model:a,actions:{viewportRef:t,previous:()=>r(-1),next:()=>r(1)}}}})},RiLA(e,t,a){let s=(0,a("Qgfj").f)({title:{id:"tortilla.gallery.title",defaultMessage:"Templates"},close:{id:"tortilla.gallery.close.button.label",defaultMessage:"Close templates"},createTemplate:{id:"tortilla.gallery.create.button.label.compact",defaultMessage:"Create"},createTemplateAccessible:{id:"tortilla.gallery.create.button.label",defaultMessage:"Create template"},tabAll:{id:"tortilla.gallery.filter.all.label",defaultMessage:"All"},expandSection:{id:"tortilla.gallery.section.expand.aria_label",defaultMessage:"Show all {category} templates"},previousTemplates:{id:"tortilla.gallery.section.previous.aria_label",defaultMessage:"Previous {category} templates"},nextTemplates:{id:"tortilla.gallery.section.next.aria_label",defaultMessage:"Next {category} templates"},loading:{id:"tortilla.gallery.loading.label",defaultMessage:"Loading templates"},empty:{id:"tortilla.gallery.empty.title",defaultMessage:"No templates yet"},emptyDescription:{id:"tortilla.gallery.empty.description",defaultMessage:"Create a template to see it here."},error:{id:"tortilla.gallery.error.title",defaultMessage:"Templates couldn't load"},retry:{id:"tortilla.gallery.error.retry.button.label",defaultMessage:"Try again"},back:{id:"tortilla.gallery.detail.back.label",defaultMessage:"Back to templates"},actionError:{id:"tortilla.gallery.action.error",defaultMessage:"That action couldn't be completed. Please try again."},pending:{id:"tortilla.gallery.action.pending",defaultMessage:"Working…"}});a.d(t,{},{a:s})},RB8A(e,t,a){a.d(t,{a:()=>c,b:()=>p,c:()=>k,d:()=>f});var s=a("ABep"),n=a("zd8w"),r=a("e7LJ"),i=a("RiLA"),o=a("on57"),l=a("SIrB"),d=a("wwds");function c(e){let{model:t,actions:a,card:l,nodeBeforeGroupTemplates:d,renderGroup:c,inset:p=!0}=e,h=(0,r.b)(),g=null===t.selectedGroupId?t.groups:t.groups.filter(e=>e.id===t.selectedGroupId),f=new Map(g.map(e=>[e.id,c?.(e)])),k=[...f.values()].some(e=>null!=e),w=g.some(e=>"loading"===e.templates.status),v=g.some(e=>"error"===e.templates.status),y=!g.some(e=>"ready"===e.templates.status&&e.templates.data.length>0);return(0,s.jsxs)("div",{className:"flex min-h-full flex-col",children:[w&&(0,s.jsx)("output",{className:"sr-only",children:h(i.a.loading)}),(0,s.jsxs)("div",{className:(0,o.b)("tortilla-gallery-card-groups min-h-0 shrink-0 grow",p&&"p-6 [@media(max-width:48rem)]:px-4"),children:[!w&&v&&(0,s.jsx)(u,{loading:!1,model:t,actions:a}),!w&&!v&&y&&!k&&(0,s.jsxs)("div",{className:"tortilla-gallery-status flex min-h-56 flex-col items-center justify-center gap-3 text-center",children:[(0,s.jsx)("output",{children:h(i.a.empty)}),t.canCreateTemplate&&(0,s.jsx)("p",{className:"m-0",children:h(i.a.emptyDescription)})]}),(w||!v&&!y||d||k)&&(0,s.jsx)("div",{className:"tortilla-gallery-groups flex min-w-0 flex-col gap-9","aria-busy":w||void 0,children:g.map(e=>(0,s.jsx)(n.Fragment,{children:f.get(e.id)??(0,s.jsx)(m,{group:e,model:t,card:l,nodeBeforeTemplates:d?.(e),showTemplates:w||!v&&!y})},e.id))})]})]})}function p(e){let{model:t,actions:a}=e,{Tabs:n}=(0,r.c)(),o=(0,r.b)(),l=[{key:"all",name:o(i.a.tabAll)},...t.groups.map(e=>({key:`gallery:${e.id}`,name:e.label}))],d=null===t.selectedGroupId?"all":`gallery:${t.selectedGroupId}`;return(0,s.jsx)("fieldset",{className:"m-0 min-w-0 flex-1 border-0 p-0","aria-label":o(i.a.title),children:(0,s.jsx)(n,{className:"tortilla-gallery-filters scrollbar-none [&::-webkit-scrollbar]:hidden",variant:"browse",scrollable:!0,tabs:l,selectedKey:d,onSelect:e=>{a.selectGallery("all"===e?null:e.slice(8))},ariaLabel:o(i.a.title)})})}function m(e){let t,{group:a,model:c,card:p,nodeBeforeTemplates:m,showTemplates:u}=e,{Button:h,Skeleton:g,icons:f}=(0,r.c)(),k=(0,r.b)(),w=(0,n.useId)(),v=(0,d.a)(),y=f["chevron-left"],b=f["chevron-right"],P=(0,l.e)(a.templateTypes),M=null!=m,x=c.selectedGroupId===a.id,T=u&&"ready"===a.templates.status?a.templates.data:[];if(!M&&(!u||"loading"!==a.templates.status)&&0===T.length)return null;let j=!x;return t=x?P?"grid grid-cols-5 overflow-visible [@media(30rem<width<=48rem)]:grid-cols-3 [@media(max-width:30rem)]:grid-cols-2 *:min-w-0":"grid grid-cols-4 overflow-visible [@media(30rem<width<=48rem)]:grid-cols-2 [@media(max-width:30rem)]:grid-cols-1 *:min-w-0":P?"horizontal-scroll-fade-mask horizontal-scroll-fade-mask-eased flex overflow-x-auto overscroll-x-contain scrollbar-none *:min-w-36 *:flex-[0_0_calc((100%-3rem)/5)] [&::-webkit-scrollbar]:hidden":"horizontal-scroll-fade-mask horizontal-scroll-fade-mask-eased flex overflow-x-auto overscroll-x-contain scrollbar-none *:min-w-48 *:flex-[0_0_calc((100%-2.25rem)/4)] [&::-webkit-scrollbar]:hidden",(0,s.jsxs)("section",{"aria-label":j?void 0:a.label,"aria-labelledby":j?w:void 0,children:[j&&(0,s.jsxs)("div",{className:"mb-3 flex items-center justify-between gap-2",children:[(0,s.jsx)("h3",{id:w,className:"tortilla-gallery-group-heading body-md m-0 font-semibold",children:a.label}),(v.model.canPrevious||v.model.canNext)&&(0,s.jsxs)("div",{className:"flex shrink-0 items-center gap-1",children:[(0,s.jsx)(h,{type:"button",color:"ghostActive",size:"toolbar",uniform:!0,"aria-label":k(i.a.previousTemplates,{category:a.label}),disabled:!v.model.canPrevious,onClick:v.actions.previous,children:(0,s.jsx)(y,{"aria-hidden":!0,className:"rtl:rotate-180"})}),(0,s.jsx)(h,{type:"button",color:"ghostActive",size:"toolbar",uniform:!0,"aria-label":k(i.a.nextTemplates,{category:a.label}),disabled:!v.model.canNext,onClick:v.actions.next,children:(0,s.jsx)(b,{"aria-hidden":!0,className:"rtl:rotate-180"})})]})]}),(0,s.jsxs)("div",{ref:x?void 0:v.actions.viewportRef,className:["tortilla-gallery-tiles -m-2 min-w-0 gap-3 p-3",t].join(" "),"data-expanded":x,"data-portrait":P,children:[m,u&&"loading"===a.templates.status?Array.from({length:(P?5:4)-!!M},(e,t)=>(0,s.jsx)(g,{className:(0,o.b)("overflow-hidden rounded-xl",P?"aspect-179/204":"aspect-video")},t)):T.map((e,t)=>(0,s.jsx)(n.Fragment,{children:p(e)},`${e.id}:${t}`))]})]})}function u(e){let{loading:t,model:a,actions:n}=e,{Button:o}=(0,r.c)(),l=(0,r.b)();return(0,s.jsxs)("div",{className:"tortilla-gallery-status flex min-h-56 flex-col items-center justify-center gap-3 text-center",children:[(0,s.jsx)("output",{children:l(t?i.a.loading:i.a.error)}),!t&&a.canRetryLoadTemplates&&(0,s.jsx)(o,{size:"medium",type:"button",color:"secondary",disabled:a.isActionPending,onClick:()=>{n.retryLoadTemplates(a.groups.find(e=>e.id===a.selectedGroupId)??null)},children:l(i.a.retry)})]})}function h(e,t){return"function"==typeof e?e(t):e??{}}function g(e,t,a){return 1===e.length?e[0]?.id??null:null!==a&&t.has(a)?a:null}function f(e){let{config:t,initialGroupId:a=null,selectedGroupId:s,initialTemplateId:r=null}=e,[i,o]=(0,n.useState)((1===t.groups.length?t.groups[0]?.id:a)??null),[d,c]=(0,n.useState)("idle"),[p,m]=(0,n.useState)(r),u=(0,n.useRef)({mounted:!1,closed:!1,inFlight:!1,navigationVersion:0});(0,n.useLayoutEffect)(()=>{let e=u.current;return e.mounted=!0,()=>{e.mounted=!1}},[]);let f=new Map,k=t.groups.map(e=>{if(f.has(e.id))throw Error("Template gallery group IDs must be unique.");return f.set(e.id,e),"ready"===e.templates.status?{...e,templates:{status:"ready",data:(0,l.a)(e.templates.data,e.templateTypes)}}:e}),w=k.flatMap(e=>"ready"===e.templates.status?e.templates.data:[]),v=g(k,f,void 0===s?i:s),y=(null===v?null:f.get(v))??null,b=h(t.callbacks,y);function P(){return u.current.mounted&&!u.current.closed}function M(){P()&&(u.current.closed=!0,t.onClose())}async function x(e,a){if(!P()||u.current.inFlight)return;let s=(void 0===a?v:a?.id)??null,n=null===s?null:f.get(s);if(void 0===n)return;let r=h(t.callbacks,n)[e];if(!r)return;u.current.inFlight=!0;let i=u.current.navigationVersion;c("pending");try{await r(n)==="close"&&u.current.navigationVersion===i&&M(),P()&&u.current.navigationVersion===i&&c("idle")}catch{P()&&u.current.navigationVersion===i&&c("error")}finally{u.current.inFlight=!1}}return{model:{groups:k,selectedGroupId:v,selectedTemplate:w.find(e=>e.id===p)??null,canCreateTemplate:void 0!==b.onCreateTemplate,canRetryLoadTemplates:void 0!==b.onRetryLoadTemplates,isActionPending:"pending"===d,hasActionError:"error"===d},actions:{viewTemplate:e=>{if(!P())return;let t=w.find(t=>t.id===e.id);t&&(u.current.navigationVersion++,m(t.id),c("idle"))},back:()=>{P()&&(u.current.navigationVersion++,m(null),c("idle"))},selectGallery:e=>{if(P()){let a=g(k,f,e);(a!==v||null!==p)&&(u.current.navigationVersion++,m(null),c("idle"),a!==v&&(void 0===s&&o(a),t.onGalleryGroupSelect?.((null===a?null:f.get(a))??null)))}},createTemplate:e=>x("onCreateTemplate",e),retryLoadTemplates:e=>x("onRetryLoadTemplates",e),close:M}}}function k(e){let{open:t,contentProps:a,model:o,actions:l,card:d,detail:m,nodeBeforeTemplateList:u,nodeBeforeGroupTemplates:h,renderGroup:g,className:f}=e,{Button:k,Dialog:w,icons:v}=(0,r.c)(),y=v["chevron-left"],b=v.close,P=(0,r.b)(),M=(0,n.useRef)(null),x=(0,n.useRef)(null),T=(0,n.useRef)(null),[j,I]=(0,n.useState)(!1),A=(0,n.useRef)(null),q=(0,n.useRef)(null),S=null!==o.selectedTemplate&&void 0!==m,N=o.groups.length>1,C=(0,n.useCallback)(e=>{let t=N?Math.min(Math.max(e,0),68):0;M.current?.style.setProperty("--gallery-header-collapse",`${t}px`),I(e>0)},[N]);if((0,n.useLayoutEffect)(()=>{if(S){let e=x.current?.ownerDocument.activeElement;e instanceof(x.current?.ownerDocument.defaultView?.HTMLElement??HTMLElement)&&x.current?.contains(e)&&!e.closest('[role="menu"]')&&(q.current=e),T.current?.focus()}else if(q.current){let e=q.current;q.current=null,(e.isConnected?e:x.current)?.focus({preventScroll:!0})}},[S]),(0,n.useLayoutEffect)(()=>{x.current&&(x.current.scrollTop=Math.min(A.current??x.current.scrollTop,68*!!N),C(x.current.scrollTop)),A.current=null},[N,o.selectedGroupId,C]),!t)return null;let R=P(i.a.title),U=(0,s.jsxs)("header",{className:["tortilla-gallery-header z-10 flex shrink-0 border-b bg-surface-elevated-secondary motion-safe:transition-colors motion-safe:duration-basic motion-safe:ease-out",S||j||!N?"border-default":"border-transparent"].join(" "),children:[(0,s.jsxs)("div",{className:"min-w-0 flex-1",children:[(0,s.jsx)("div",{className:["tortilla-gallery-title flex h-17 min-w-0 items-center overflow-hidden border-b ps-6 motion-safe:transition-colors motion-safe:duration-basic motion-safe:ease-out",!S&&N&&!j?"border-default":"border-transparent"].join(" "),style:!S&&N?{height:"calc(4.25rem - var(--gallery-header-collapse, 0px))"}:void 0,children:S?(0,s.jsxs)(k,{size:"dialogGhost",type:"button",color:"ghostActive",onClick:l.back,children:[(0,s.jsx)(y,{className:"rtl:rotate-180","aria-hidden":!0}),P(i.a.back)]}):(0,s.jsx)("h2",{className:"m-0 text-lg font-normal",children:R})}),!S&&N&&(0,s.jsx)("div",{className:"tortilla-gallery-toolbar flex h-17 min-w-0 items-center ps-6",children:(0,s.jsx)(p,{model:o,actions:{...l,selectGallery:e=>{e!==o.selectedGroupId&&x.current&&(A.current=x.current.scrollTop),l.selectGallery(e)}}})})]}),(0,s.jsxs)("div",{className:["tortilla-gallery-header-actions flex h-17 shrink-0 items-center gap-2 self-start border-b bg-surface-elevated-secondary px-6 motion-safe:transition-colors motion-safe:duration-basic motion-safe:ease-out",!S&&N&&!j?"border-default":"border-transparent"].join(" "),children:[!S&&o.canCreateTemplate&&(0,s.jsx)(k,{type:"button",color:"outlineGhost",size:"dialog",className:"tortilla-gallery-create shrink-0","aria-label":P(i.a.createTemplateAccessible),disabled:o.isActionPending,onClick:()=>{l.createTemplate()},children:P(i.a.createTemplate)}),(0,s.jsx)(k,{type:"button",color:"ghostActive",size:"entityHeader",className:"tortilla-gallery-close","aria-label":P(i.a.close),onClick:l.close,children:(0,s.jsx)(b,{"aria-hidden":!0})})]})]});return(0,s.jsx)(w,{open:t,contentProps:a,title:R,size:"xxxwideTall",contentOverflow:"hidden",showDialogClose:!1,onOpenChange:e=>{e||l.close()},children:(0,s.jsxs)("div",{ref:M,className:["tortilla-gallery flex size-full min-h-0 min-w-0 flex-col overflow-hidden bg-surface-elevated-secondary text-(--color-text)",f].filter(Boolean).join(" "),children:[o.hasActionError&&(0,s.jsx)("p",{className:"tortilla-gallery-feedback m-0 px-4 py-3",role:"alert",children:P(i.a.actionError)}),o.isActionPending&&(0,s.jsx)("output",{className:"sr-only",children:P(i.a.pending)}),U,(0,s.jsx)("section",{ref:x,hidden:S,className:"tortilla-gallery-browse min-h-0 flex-1 overflow-y-auto overscroll-y-none","data-has-filters":o.groups.length>1,"aria-label":P(i.a.title),tabIndex:-1,onScroll:e=>{C(e.currentTarget.scrollTop)},onFocusCapture:e=>{e.target.closest('[role="menu"]')||(q.current=e.target)},children:(0,s.jsxs)("div",{className:"box-content min-h-full",style:N?{paddingTop:"var(--gallery-header-collapse, 0px)"}:void 0,children:[u,(0,s.jsx)(c,{model:o,actions:l,card:d,nodeBeforeGroupTemplates:h,renderGroup:g})]})}),S&&o.selectedTemplate&&m&&(0,s.jsx)("section",{ref:T,tabIndex:-1,"aria-label":o.selectedTemplate.name,className:"tortilla-gallery-detail min-h-0 flex-1 overflow-y-auto",children:(0,s.jsx)("div",{className:"tortilla-gallery-detail-body p-6",children:m(o.selectedTemplate)},o.selectedTemplate.id)})]})})}},jG6n(e,t,a){var s=a("BolX"),n=a("ASxG"),r=a("rHrT"),i=a("fXhT"),o=a("OWtl"),l=a("J9bg"),d=a("Kw4a");let c=["to-do-list","project-tracker"],p=(0,s.c)(o.a,e=>{let{get:t}=e;return t(d.e)?t(l.a,"4051280260"):void 0}),m=(0,s.c)(o.a,e=>{let{get:t}=e;return t(d.a)?t(l.a,"4051280260"):void 0}),u=(0,s.c)(o.a,e=>{let{get:t}=e;return t(d.c)?t(l.b,"4051280260"):void 0}),h=n.object({submitLabel:n.string().trim().min(1).optional(),preparingLabel:n.string().trim().min(1).optional(),freeformPlaceholder:n.string().trim().min(1).optional(),questions:n.array(n.object({question:n.string().trim().min(1),answerLabel:n.string().trim().min(1),isOther:n.boolean().optional(),options:n.array(n.object({id:n.string().trim().min(1),value:n.string().trim().min(1)})).refine(e=>new Set(e.map(e=>{let{id:t}=e;return t})).size===e.length,"Each option ID in a question must be unique")})).min(1)}),g=n.object({id:n.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:n.string().trim().min(1),prompt:n.string().trim().min(1),prefillPrompt:n.string().trim().min(1),previewMarkdown:n.string().trim().min(1).optional(),previewDocument:n.array(n.object({kind:n.literal("markdown"),markdown:n.string().trim().min(1),layout:i.b.optional()})).min(1).optional(),setupQuestion:n.string().trim().min(1).nullish(),followUp:h.nullish()}),f=n.array(g.partial({title:!0,prompt:!0,prefillPrompt:!0,previewMarkdown:!0})),k=n.array(n.string()).min(4).max(10).refine(e=>new Set(e).size===e.length&&c.every(t=>e.includes(t))),w=n.object({templates:f.optional(),templatesByLocale:n.record(n.string().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/),f).optional()});a.d(t,{},{a:m,b:function(e,t){let a=w.safeParse(t);if(!a.success)return;if(a.data.templates?.length===0)return[];let s=(0,r.h)(e)??"en",n=s.split("-")[0],i=a.data.templatesByLocale?.[s]??a.data.templatesByLocale?.[n]??("en"===n?a.data.templates:void 0);if(null!=i&&new Set(i.map(e=>{let{id:t}=e;return t})).size===i.length)return i},c:u,d:p,e:k,f:g,g:f})},U6Ok(e,t,a){a.d(t,{a:()=>o});var s=a("hCnj"),n=a("Qgfj"),r=a("jG6n");let i=r.f.required({previewDocument:!0}).array();function o(e,t){let a=(0,r.b)(e.locale,t);if(a?.length===0)return[];let s={kind:"icon",value:"book",color:"black"},n=[{id:"to-do-list",symbol:{kind:"icon",value:"logs",color:"green"},title:e.formatMessage(d.todo),prompt:e.formatMessage(d.todoPrompt),prefillPrompt:e.formatMessage(d.todoPrefillPrompt),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.todo.preview",defaultMessage:`## Today

### Top priorities

- [ ] Run propulsion test

- [ ] Verify course calculations

- [ ] Inspect fuel tanks

### If time allows

- [ ] Inspect radiation shields

- [ ] Test communication systems

- [ ] Write status report`})}]},{id:"project-tracker",symbol:{kind:"icon",value:"bar-chart",color:"blue"},title:e.formatMessage(d.projectTracker),prompt:e.formatMessage(d.projectTrackerPrompt),prefillPrompt:e.formatMessage(d.projectTrackerPrefillPrompt),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.projectTracker.preview.attentionHeading",defaultMessage:"## 🔴 Needs immediate attention"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.projectTracker.preview.attention",defaultMessage:"- Communication systems test for launch"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.projectTracker.preview.milestonesHeading",defaultMessage:"## ⛰️ Milestones"})},{kind:"markdown",layout:"flexible",markdown:e.formatMessage({id:"space.pageTemplates.projectTracker.preview.milestonesCheckboxes",defaultMessage:`| Milestone | Status |
| - | - |
| '<ul><li data-checked="false"><p>'Project brief'</p></li></ul>' | Complete |
| '<ul><li data-checked="false"><p>'Prototype review'</p></li></ul>' | In progress |
| '<ul><li data-checked="false"><p>'Launch readiness'</p></li></ul>' | Upcoming |`},{})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.projectTracker.preview.tasksHeading",defaultMessage:"## ✅ Tasks"})},{kind:"markdown",layout:"flexible",markdown:e.formatMessage({id:"space.pageTemplates.projectTracker.preview.tasksCheckboxes",defaultMessage:`| Task | Owner | Status |
| - | - | - |
| '<ul><li data-checked="false"><p>'Confirm scope'</p></li></ul>' | Product | Done |
| '<ul><li data-checked="false"><p>'Review designs'</p></li></ul>' | Design | In progress |
| '<ul><li data-checked="false"><p>'Test the core flow'</p></li></ul>' | Engineering | Next |
| '<ul><li data-checked="false"><p>'Prepare launch notes'</p></li></ul>' | Marketing | Next |`},{})}]},{id:"weekly-update",symbol:{kind:"icon",value:"writing",color:"pink"},title:e.formatMessage(d.weeklyUpdate),prompt:e.formatMessage(d.weeklyUpdatePrompt),prefillPrompt:e.formatMessage(d.weeklyUpdatePrefillPrompt),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.weeklyUpdate.preview",defaultMessage:`## ✨ Highlights

- Progress made

## ☝️ Needs attention

- Blockers and decisions needing input

## ▶️ Next week

- Upcoming milestones and confirmed commitments

## 🔗 Sources

- Links to sources`})}]},{id:"feedback-tracker",symbol:{kind:"icon",value:"edit",color:"red"},title:e.formatMessage(d.feedback),prompt:e.formatMessage(d.feedbackPrompt),prefillPrompt:e.formatMessage(d.feedbackPrefillPrompt),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.themesHeading",defaultMessage:"## 🔎 Top themes"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.onboardingTheme",defaultMessage:"1. Make onboarding easier to follow"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.navigationTheme",defaultMessage:"2. Help people find the right resource"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.sharingTheme",defaultMessage:"3. Clarify what happens after sharing"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.registerHeading",defaultMessage:"## 🗂️ Feedback register"})},{kind:"markdown",layout:"flexible",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.register",defaultMessage:`| Theme | Source | Next step |
| - | - | - |
| Onboarding | Research notes | Review the first-run flow |
| Navigation | Team channel | Group related resources |
| Sharing | Support email | Clarify confirmation copy |`})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.summaryHeading",defaultMessage:"## 📝 Summary"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.summary",defaultMessage:"People need clearer guidance at key moments. Start with onboarding, then review navigation and sharing."})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.followupsHeading",defaultMessage:"## ▶️ Follow-ups"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feedback.preview.followups",defaultMessage:"- Schedule user interviews for next week"})}]},{id:"release-notes",symbol:s,title:e.formatMessage(d.releaseNotes),prompt:e.formatMessage(d.releaseNotesPrompt),prefillPrompt:e.formatMessage(d.releaseNotesPrefillPrompt),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.releaseNotes.preview",defaultMessage:`## 🆕 New

- New capabilities and who can use them

## 🏆 Improvements

- Changes to existing workflows

## 🛠️ Fixes

- Resolved issues and their impact

## 🌐 Availability

- Supported platforms, rollout status, and known limitations.

## 🔗 Sources

- Links to sources`})}]},{id:"project-home",symbol:s,title:e.formatMessage(d.projectHome),prompt:e.formatMessage(d.projectHomePrompt),prefillPrompt:e.formatMessage(d.projectHomePrefillPrompt),setupQuestion:e.formatMessage({id:"space.pageTemplates.projectHome.question",defaultMessage:"Which project is this for, and which sources should I use?"}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.projectHome.preview.intro",defaultMessage:`One place for the team, the plan, and what comes next.

## Overview
Make the next product launch simple, coordinated, and easy to follow.

## Team`})},{kind:"markdown",layout:"flexible",markdown:e.formatMessage({id:"space.pageTemplates.projectHome.preview.team",defaultMessage:`| Responsibility | Team |
| --- | --- |
| Project lead | Product |
| Experience | Design |
| Delivery | Engineering |`})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.projectHome.preview.ending",defaultMessage:`## Milestones
- Align on the plan
- Review the first prototype
- Prepare the launch

## Key resources
- Project brief and goals
- Decisions from the team channel
- Research notes and launch checklist

## Latest update
The brief is ready for review. Next up: confirm owners and milestones.`})}]},{id:"faq",symbol:s,title:e.formatMessage(d.faq),prompt:e.formatMessage(d.faqPrompt),prefillPrompt:e.formatMessage(d.faqPrefillPrompt),setupQuestion:e.formatMessage({id:"space.pageTemplates.faq.question",defaultMessage:"What topic and audience is this FAQ for, and which sources should I use?"}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.faq.preview",defaultMessage:`Shared answers, grounded in the team's knowledge.

## Getting started
### Where should I start?
Read the project brief for goals, scope, and the people involved.

### Where can I find the latest plan?
The Project Home brings together milestones, resources, and recent decisions.

## Working together
### How do I share feedback?
Add the source discussion and a clear next step to the feedback tracker.

### How are decisions recorded?
Keep the decision, its owner, and supporting context together.

## Open questions
- Who owns the next review?
- Which resources need an update?

## Sources
Project notes, team discussions, and approved guidance.`})}]}],o=()=>n.filter(e=>{let{id:t}=e;return"project-home"!==t&&"faq"!==t}).map(e=>({...e,...l(e.previewDocument)}));if(null==a)return o();let c=i.safeParse(a.map(t=>{let a=n.find(e=>{let{id:a}=e;return a===t.id})??function(e,t){switch(t){case"feature-backlog":return{id:t,title:e.formatMessage({id:"space.pageTemplates.feature-backlog.title",defaultMessage:"Feature backlog"}),prompt:e.formatMessage({id:"space.pageTemplates.feature-backlog.prompt",defaultMessage:"Turn ideas and requests for my product into a feature backlog. Group similar requests, describe the user need, link supporting feedback, and suggest priorities and next decisions. Ask which product if it’s unclear; a few ideas are enough to start. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Update this Page and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.feature-backlog.prefillPrompt",defaultMessage:"Organize a feature backlog for my product, grouping requests by user need and suggesting priorities and next decisions. Use details I’ve shared and relevant conversations and connected apps you can access; ask for what’s missing after checking them. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.feature-backlog.preview.1",defaultMessage:`## Ideas and requests
| Idea | User problem | Evidence | Next decision |
| --- | --- | --- | --- |

## Priorities to discuss
Compare impact, effort, and dependencies where known.

## Open questions
Track what needs research or a product decision.`})}]};case"learning-plan":return{id:t,title:e.formatMessage({id:"space.pageTemplates.learning-plan.title",defaultMessage:"Learning plan"}),prompt:e.formatMessage({id:"space.pageTemplates.learning-plan.prompt",defaultMessage:"Help me make a plan for something I want to learn. Start with what I already know and what I want to be able to do. Break it into manageable steps with useful resources, practice, and a weekly routine. Include space for notes and progress checks. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.learning-plan.prefillPrompt",defaultMessage:"Make a learning plan with a clear goal, useful resources, practice, and a weekly routine. Use details I’ve shared and relevant conversations and connected apps you can access; ask for what’s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.learning-plan.preview.overview",defaultMessage:`**Time:** Two 30-minute sessions a week

## 🎯 Outcome

Locate five major lunar features on a map and explain the difference between a crater and a dark plain in ordinary language.

## 🧩 Starting point

I can recognize the Moon’s broad light and dark areas. I want to connect those patterns with named places.

## 🗺️ Learning path`})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.learning-plan.preview.7",defaultMessage:`| Step | Resource | Practice |
| --- | --- | --- |
| Get oriented | NASA Moon overview | Label five features on a sketch |
| Look closely | A library lunar atlas | Compare two images of one region |
| Explain it | My own notes | Write a 100-word visitor caption |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.learning-plan.preview.practiceAndReview",defaultMessage:`## 📅 Weekly rhythm

- [ ] Tuesday: read one short section and draw a sketch.

- [ ] Sunday: revisit the sketch without looking at the labels.

- [ ] Explain one feature to a friend.

## 📝 Notebook

**Observation:** The same region can look quite different as shadows change.

**Question:** Which lighting makes a crater’s shape easiest to see?

## 🔁 Progress check

I can locate three of the five features without the atlas. Compare those three under different lighting, then add two more and repeat the unlabeled sketch.

## 🔗 Start here

[NASA Moon overview](https://science.nasa.gov/moon/)`})}]};case"weekly-planner":return{id:t,title:e.formatMessage({id:"space.pageTemplates.weekly-planner.title",defaultMessage:"Weekly planner"}),prompt:e.formatMessage({id:"space.pageTemplates.weekly-planner.prompt",defaultMessage:"Plan my week around the priorities and commitments I’ve shared. Create a short priority list and a realistic day-by-day plan with suggested focus time and room for rest. Ask what matters most this week if you need a starting point. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.weekly-planner.prefillPrompt",defaultMessage:"Make a realistic weekly plan around my priorities and commitments, with suggested focus time and room for rest. Use details I’ve shared and relevant conversations and connected apps you can access; ask for what’s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.weekly-planner.preview.priorities",defaultMessage:`## 🎯 Priorities

- [ ] Finish the lunar exhibit captions.

- [ ] Confirm volunteer roles for Friday.

- [ ] Leave one evening free of commitments.

## 🗓️ Week at a glance`})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.weekly-planner.preview.6",defaultMessage:`| Day | Main focus | Commitment |
| --- | --- | --- |
| Monday | Caption edits | Review with Leo, 14:00 |
| Tuesday | Final captions and handout draft | Approve the full print set |
| Wednesday | Send approved files to the print shop | Volunteer call, 18:00 |
| Thursday | Collect prints and check the room | Free evening |
| Friday | Open house | Arrive at 17:15 |
| Weekend | Rest and a short walk | Sunday journal time |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.weekly-planner.preview.lifeAndReview",defaultMessage:`## 🏡 Everyday life

- [ ] Pick up groceries on the way home.

- [ ] Return the library book.

- [ ] Call a friend over the weekend.

## 📌 Can wait

The archive’s video section and the future talk schedule.

## ✨ Weekend review

**What helped:** Did the shared caption review resolve questions before printing?

**What to change:** Note any last-minute printing or role changes to allow for in the next event plan.`})}]};case"trip-planner":return{id:t,title:e.formatMessage({id:"space.pageTemplates.trip-planner.title",defaultMessage:"Trip planner"}),prompt:e.formatMessage({id:"space.pageTemplates.trip-planner.prompt",defaultMessage:"Make a flexible itinerary and planning checklist using the trip details I’ve shared. Include ideas for activities, transport, and accommodation, keeping confirmed bookings easy to identify. Ask where I’d like to go if needed, or help me choose a destination. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.trip-planner.prefillPrompt",defaultMessage:"Make a flexible trip itinerary and planning checklist, including activities, transport, and accommodation. Help me choose a destination if needed. Use details I’ve shared and relevant conversations and connected apps you can access; ask for what’s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.trip-planner.preview.overview",defaultMessage:"**Travelers:** Maya and Sam  \n**Pace:** One main activity a day\n\n## 🧭 The plan\n\nPlan two nights near a mountain observatory. The visitor tour is the main activity; confirm its availability before choosing transport and accommodation.\n\n## 🚆 Travel and stay"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.trip-planner.preview.5",defaultMessage:`| Item | Plan | Status |
| --- | --- | --- |
| Outbound | Friday afternoon train, then local shuttle | Compare departure times |
| Accommodation | Two nights in the village | Choose a flexible booking |
| Return | Sunday afternoon train | Leave time for lunch |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.trip-planner.preview.6",defaultMessage:"## 🗓️ Daily outline"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.trip-planner.preview.7",defaultMessage:`| Day | Main plan | Flexible alternative |
| --- | --- | --- |
| Friday | Arrive and settle in | Short village walk |
| Saturday | Observatory visitor tour | Science museum if tours change |
| Sunday | Easy morning walk | Caf\xe9 and photo journal |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.trip-planner.preview.packingAndNextSteps",defaultMessage:`## 🎒 Before leaving

- [ ] Check the visitor schedule, reserve the tour if required, and review the weather before departure.

- [ ] Confirm transport and accommodation.

- [ ] Save tickets and maps offline.

- [ ] Pack warm layers, walking shoes, and a notebook.

## 💡 Useful notes

Use a $450 planning allowance for two people: $300 for two nights, $120 for meals, and $30 for local transport. Intercity tickets and any tour fees are additional; confirm actual prices before booking. Keep skywatching optional.`})}]};case"budget-tracker":return{id:t,title:e.formatMessage({id:"space.pageTemplates.budget-tracker.title",defaultMessage:"Budget tracker"}),prompt:e.formatMessage({id:"space.pageTemplates.budget-tracker.prompt",defaultMessage:"Use relevant financial information from connected apps you can access to build my budget tracker. Organize income and spending, show how they compare, and help me track progress toward my goals. Use the currency shown in my accounts and start with this month unless I specify otherwise. Keep totals for different currencies separate. Use the details I’ve already shared, and ask for missing essentials only after checking the available information. If no financial information is available, start with an editable budget and ask what I’d like to add. Update this Page and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.budget-tracker.prefillPrompt",defaultMessage:"Use financial information from connected apps you can access and details I’ve shared to make a budget tracker for this month. Organize income and spending and track my savings goals, using my accounts’ currencies and keeping their totals separate. If no figures are available, help me start an editable budget. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.budget-tracker.preview.1",defaultMessage:`## Budget period
Add the time period and currency.

## Planned and actual spending
| Category | Planned | Actual | Remaining |
| --- | --- | --- | --- |
| Housing | | | |
| Food | | | |
| Transport | | | |

## Transactions
Add income and expenses with dates and sources.

## Review
Note missing figures and changes for next period.`})}]};case"apartment-hunter":return{id:t,title:e.formatMessage({id:"space.pageTemplates.apartment-hunter.title",defaultMessage:"Apartment hunter"}),prompt:e.formatMessage({id:"space.pageTemplates.apartment-hunter.prompt",defaultMessage:"Organize my apartment search around my location and rent budget. Compare available listings by rent, fees, availability, and my preferences, with links and next steps. If I haven’t added listings yet, start with search criteria and a comparison table. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Update this Page and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.apartment-hunter.prefillPrompt",defaultMessage:"Help me compare apartments by rent, fees, availability, and my preferences, with listing links and next steps. Use details I’ve shared and relevant conversations and connected apps you can access; ask for what’s missing after checking them. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.apartment-hunter.preview.1",defaultMessage:`## Search criteria
Add location, budget, move-in timing, and must-haves.

## Shortlist
| Listing | Rent and fees | Availability | Notes |
| --- | --- | --- | --- |

## Next steps
- [ ] Save listings to compare
- [ ] Prepare questions for a viewing

## Viewing notes
Record observations and questions for each apartment.`})}]};case"event-plan":return{id:t,title:e.formatMessage({id:"space.pageTemplates.event-plan.title",defaultMessage:"Event Plan"}),prompt:e.formatMessage({id:"space.pageTemplates.event-plan.prompt",defaultMessage:"Make a plan for my event with its purpose, key details, schedule, people involved, and preparation checklist. Include a backup plan and follow-up tasks where useful. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.event-plan.prefillPrompt",defaultMessage:"Help me plan my event, including the schedule, people involved, preparation, and follow-up. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.event-plan.preview.overview",defaultMessage:"**Time:** 18:00–20:00 local time  \n**Place:** Northfield Observatory visitor hall  \n**Lead:** Sam Rivera\n\n## 🌙 Purpose\n\nAn informal evening of lunar images, short talks, and questions for first-time visitors.\n\n## 📋 Essentials"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.event-plan.preview.5",defaultMessage:`| Item | Plan |
| --- | --- |
| Capacity | 40 visitors |
| Planning budget | $300 total: $100 printing and $200 refreshments |
| Access | Step-free entrance, seating, large-print handouts |
| Main contact | Sam at the welcome desk |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.event-plan.preview.6",defaultMessage:"## 🕰️ Run of show"})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.event-plan.preview.7",defaultMessage:`| Time | Activity | Lead |
| --- | --- | --- |
| 17:15 | Set up and volunteer briefing | Sam |
| 18:00 | Welcome and image gallery | Maya |
| 18:30 | A short tour of the lunar landscape | Priya |
| 19:00 | Indoor questions; outdoor viewing if conditions allow | Priya |
| 20:00 | Close and reset the room | Team |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.event-plan.preview.preparation",defaultMessage:`## ✅ Preparation

- [ ] Sam: confirm the room layout and step-free visitor route.

- [ ] Maya: print 50 handouts and the caption cards before the room check.

- [ ] Priya: confirm the observing setup and brief volunteers on the indoor alternative.

## ☁️ If plans change

At 16:00, Sam confirms whether outdoor viewing will run. The indoor event goes ahead either way. Sam updates the welcome desk and guest message; if viewing is cancelled, Priya extends the indoor questions and image discussion.

## 📝 Afterwards

- [ ] Gather short visitor comments.

- [ ] Record useful changes for the next event.`})}]};case"personal-goals":return{id:t,title:e.formatMessage({id:"space.pageTemplates.personal-goals.title",defaultMessage:"Personal goals"}),prompt:e.formatMessage({id:"space.pageTemplates.personal-goals.prompt",defaultMessage:"Help me turn the goals I care about into a practical plan. Capture why each goal matters, what progress would look like, and a few steps I can take this week. Suggest ways to make time for them and include a short review section. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:e.formatMessage({id:"space.pageTemplates.personal-goals.prefillPrompt",defaultMessage:"Help me make a plan for my personal goals, with signs of progress, a few steps for this week, and time to review how it’s going. Use the details I’ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.personal-goals.preview.overview",defaultMessage:`**Review:** Last Sunday of each month

## 🧭 What matters

Over the next twelve weeks, learn a few lunar features, finish a photo journal, and keep one evening a week free.

## 🎯 Goals`})},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.personal-goals.preview.5",defaultMessage:`| Goal | Why | A useful sign of progress |
| --- | --- | --- |
| Learn the lunar landscape | Make skywatching more rewarding | Recognize five named features |
| Make a small photo journal | Finish something tangible | Twelve images with captions |
| Protect unplanned time | Leave room to rest | One free evening each week |`}),layout:"normal"},{kind:"markdown",markdown:e.formatMessage({id:"space.pageTemplates.personal-goals.preview.rhythmAndReview",defaultMessage:`## 👣 This week

- [ ] Borrow a Moon guide from the library.

- [ ] Choose the first three journal images.

- [ ] Keep Thursday evening free.

## 🗓️ Make room

Reserve half an hour on Sunday for the journal. Join one astronomy-club evening each month. Pause the second online course until the next review.

## 🔁 Monthly review

**Progress:** The journal theme is chosen and twelve images are shortlisted.

**Lesson:** Short sessions are easier to keep than a whole afternoon.

**Adjustment:** Finish one caption each week so all twelve images are ready by the end of this plan.`})}]};default:return}}(e,t.id),s=null==t.prompt?a?.setupQuestion:void 0,r=t.prefillPrompt??(null==t.prompt?a?.prefillPrompt:void 0)??e.formatMessage(d.customPrefillPrompt);return{...a,...t,prefillPrompt:r,previewDocument:t.previewDocument??(null==t.previewMarkdown?a?.previewDocument:[{kind:"markdown",markdown:t.previewMarkdown}]),setupQuestion:void 0!==t.setupQuestion?t.setupQuestion:s}}));return c.success?c.data.map(e=>({...e,symbol:n.find(t=>{let{id:a}=t;return a===e.id})?.symbol??s,...l(e.previewDocument)})):o()}function l(e){let t=e.flatMap(e=>(0,s.cc)(e.markdown).map(t=>({...e,markdown:t})));return{previewMarkdown:t.map(e=>{let{markdown:t}=e;return t}).join("\n\n"),previewDocument:t}}let d=(0,n.f)({todoPrefillPrompt:{id:"space.pageTemplates.todo.prefill.sourceAware",defaultMessage:"Help me turn this Page into my to-do list. Check relevant conversations and connected apps you can access for things I need to do. If you can’t find enough, ask me what to add. Replace the sample tasks, keep the checkboxes and any edits I’ve made, and don’t invent tasks or deadlines."},projectTrackerPrefillPrompt:{id:"space.pageTemplates.projectTracker.prefill.sourceAware",defaultMessage:"Help me make this Page a tracker for my project. Use relevant conversations and connected apps you can access to find milestones and tasks, and ask me for anything missing. Replace the examples, keep my edits, and don’t guess at owners, dates, or statuses."},weeklyUpdatePrefillPrompt:{id:"space.pageTemplates.weeklyUpdate.prefill.sourceAware",defaultMessage:"Help me write this week’s update on this Page. Look for progress, blockers, and next steps in relevant conversations and connected apps you can access. Ask which project or week I mean if it’s unclear, and don’t make up accomplishments."},feedbackPrefillPrompt:{id:"space.pageTemplates.feedback.prefill.sourceAware",defaultMessage:"Help me organize feedback on this Page. Use relevant conversations and connected apps you can access to find feedback. Ask what product or topic to focus on if it’s unclear, replace the examples with what you find, and don’t invent feedback."},releaseNotesPrefillPrompt:{id:"space.pageTemplates.releaseNotes.prefill.sourceAware",defaultMessage:"Help me write release notes on this Page. Check relevant conversations and connected apps you can access for confirmed changes and limitations. Ask which release I mean if it’s unclear, and don’t add unconfirmed details or publish anything."},projectHomePrefillPrompt:{id:"space.pageTemplates.projectHome.prefill.sourceAware",defaultMessage:"Help me set up this Project Home Page. Use relevant conversations and connected apps you can access for the project’s goals, team, milestones, and links. Ask me for anything missing, keep my edits, and don’t make up owners or dates."},faqPrefillPrompt:{id:"space.pageTemplates.faq.prefill.sourceAware",defaultMessage:"Help me make an FAQ on this Page. Look for trusted answers in relevant conversations and connected apps you can access. Ask who it’s for and what it’s about if unclear, and leave anything unverified as an open question."},customPrefillPrompt:{id:"space.pageTemplates.custom.prefill.sourceAware",defaultMessage:"Help me make this Page my own. Use relevant conversations and connected apps you can access, and ask me what I want to add if it’s unclear. Keep my edits and don’t fill in details you can’t verify."},weeklyUpdate:{id:"space.pageTemplates.weeklyUpdate.title",defaultMessage:"Weekly update"},weeklyUpdatePrompt:{id:"space.pageTemplates.weeklyUpdate.setup",defaultMessage:`Check my relevant connected apps and create a weekly update suitable for sharing with cross-functional partners, stakeholders, and executives.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},releaseNotes:{id:"space.pageTemplates.releaseNotes.title",defaultMessage:"Release notes"},releaseNotesPrompt:{id:"space.pageTemplates.releaseNotes.setup",defaultMessage:`Check my relevant connected apps and create release notes. Ask which project I would like to create release notes for.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},projectHome:{id:"space.pageTemplates.projectHome.title",defaultMessage:"Project Home"},projectHomePrompt:{id:"space.pageTemplates.projectHome.setup",defaultMessage:`Help me make this Project Home my own. Start working directly in the Page without a setup interview or waiting for confirmation. Choose a project from available context and begin filling it in; the user can redirect you afterward.

If the Page has an Instructions section, collapse it before adding content so it does not push the useful content below the chat, and keep it collapsed when you finish. If that section exists but the available controls cannot change its collapsed state, say so briefly; do not claim it is collapsed. If there is no Instructions section, continue without creating one or mentioning its absence.

Make sure the Page has a title. If it is untitled, use “Project Home” initially. Preserve an existing title and any user edits.

Before searching connected sources, add an editable starting structure with two sections: Project overview and Essential resources. Include supported details already available in context. Keep this first version compact and useful, without a wall of empty headings or repeated placeholders. Send this brief chat message: “I’m filling in your Project Home. You can edit any section while I work.”

Choose the most relevant project using your best judgment. Prioritize context attached to this Page or its current Space, then recent conversations and project activity. If several projects are plausible, pick the strongest candidate and treat it as a working assumption. Do not stop to ask which project to use or wait for approval before filling in supported details. Choose a real project supported by context; do not invent one. If the initial context provides no candidate, search recent connected sources for one.

Leave one comment explaining the choice: “I picked [project] based on [context] and started filling in this Page. If you’d like a different project, reply here with its name or a source and I’ll switch.”

Prefer anchoring this comment to the Page title. If title comments are unsupported, use the first existing content section outside Instructions. If supported, open and focus the comment so it is visible above the chat. Do not claim it is open or focused unless verified. Do not create body content solely to anchor the comment, and do not repeat the project-selection question in the body.

Continue working immediately after leaving the comment. Use the project’s Slack channel, relevant emails, project notes, and links to fill in the Page incrementally. Write useful findings as you find them instead of waiting until all research is complete. Add short, scannable sections as evidence becomes available:

- Project overview: what we’re building, who it’s for, and why it matters
- Team and responsibilities
- Essential resources
- Recent updates
- Upcoming milestones
- Decisions and open questions
- A short guide for someone joining

Cite sources near the claims they support. Prioritize recent sources for status and milestones, and include relevant dates. Distinguish confirmed decisions from proposals, and commitments from completed work. Flag conflicting information rather than silently choosing one version. Do not invent facts or sample records. Keep detailed tasks in a linked tracker if one exists.

Use Open questions only for substantive project unknowns. Label these “Needs input” or “Not yet found” where useful. Do not create an Open questions section to ask which project to use. If no real project can be found after a reasonable search, preserve the starting structure and explain the missing context in the single comment rather than fabricating a project.

Use Page comments for focused questions and assumptions. Prefer the title, or the first existing content section outside Instructions if title comments are unsupported. Refer to the relevant section in the comment instead of anchoring questions farther down the Page. Ask only what is needed to move forward, and continue supported work while awaiting answers. If a relevant app isn’t connected, offer to connect it and continue with available sources.

When input would help, add one brief, contextual invitation in comments or chat: “Add a project brief here with @, or type @ChatGPT, select it from the Page’s mention menu, and ask me to use a different project. Use / to add content to the Page.” Adapt the example to the actual gap. Do not repeat this guidance in the Page body.

Write using native Page blocks. Check current content before replacing anything, and preserve edits the user makes while you work. When the user names a different project or provides new context, update the relevant sections, revise the choice comment, and remove obsolete content, resolved questions, and unnecessary hints.

Keep chat replies brief and focused on the next step. Do not repeat Page content in chat. Do not imply that the Page is being monitored or updated continuously. Do not send messages or configure recurring updates without asking first.`},projectTracker:{id:"space.pageTemplates.projectTracker.title",defaultMessage:"Project tracker"},projectTrackerPrompt:{id:"space.pageTemplates.projectTracker.setup",defaultMessage:`Check my relevant connected apps and create a project tracker. Automatically update every morning at 6am in my browser time zone.

Include checkboxes to the left of the milestones and tasks in the table. This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},todo:{id:"space.pageTemplates.todo.title",defaultMessage:"To-do list"},todoPrompt:{id:"space.pageTemplates.todo.setup",defaultMessage:`Check my relevant connected apps and create a to-do checklist. Automatically update every morning at 6am in my browser time zone: check off completed tasks for me, and carry forward incomplete tasks to the next day.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. Do not add introductory paragraphs, conclusions, coverage summaries, methodology, scheduling details, or explanations of how you maintain the checklist. Avoid boilerplate. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},feedback:{id:"space.pageTemplates.feedback.title",defaultMessage:"Feedback tracker"},feedbackPrompt:{id:"space.pageTemplates.feedback.setup",defaultMessage:`Check my relevant connected apps and create a feedback tracker. Ask which project I would like to track feedback for. Automatically update every morning at 6am in my browser time zone.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},faq:{id:"space.pageTemplates.faq.title",defaultMessage:"FAQ"},faqPrompt:{id:"space.pageTemplates.faq.setup",defaultMessage:"Help me make this FAQ my own. Ask for the topic, audience and trusted source notes or links, including relevant Slack discussions and approved guidance. Offer to connect relevant apps when needed. Build the most useful questions with concise supported answers and source links. Combine equivalent questions, keep unanswered or disputed questions visible with an owner or next decision, and keep material freshness qualifiers beside the answers they affect. Link a separate feedback tracker if I have one. Write directly into this Page using native Page blocks, preserving its title and my edits. Do not invent answers or treat unconfirmed replies as authoritative guidance. Keep source-channel replies unsent and automatic updates unconfigured unless I ask to set them up. Ask only the setup questions needed to proceed. Keep chat replies brief and focused on the next step. Organize the Page into short, scannable sections with actionable details. Don't repeat Page content in chat."}})},o72y(e,t,a){var s=a("BolX"),n=a("I07G"),r=a("Cslg"),i=a("OFP1"),o=a("Kwur"),l=a("e1xH"),d=a("mpAT"),c=a("OWtl"),p=a("JYRT");let m=(0,s.c)(c.a,e=>{let{get:t}=e;return t(l.pagesEnabled$)&&"allowed"===t(i.v).status}),u=(0,s.r)(c.a,e=>{let{get:t,scope:a}=e,s=t(d.spaceAccountId$),i=t(r.k);return{queryKey:["space","personalized-pages",s,i],enabled:t(m)&&null!=s&&null!=i,staleTime:6e4,gcTime:0,retry:!1,queryFn:async e=>{let{signal:t}=e;if(null==s||null==i)throw Error("space_account_unavailable");let r=(0,d.watchSpaceAccount)(a,s,i),l=AbortSignal.any([t,r.signal]);try{let e=await o.Request.safeGet("/pages/suggestions",{additionalHeaders:{"ChatGPT-Account-ID":s,[n.bc]:s},signal:l});return l.throwIfAborted(),e}finally{r.stop()}}}}),h=(0,s.i)(c.a,e=>Date.parse(e)>Date.now(),(e,t)=>{let a,{set:s}=t,n=()=>{let t=Date.parse(e)-Date.now();s(t>0),t>0&&(a=setTimeout(n,Math.min(t,0x7fffffff)))};return n(),()=>clearTimeout(a)},{autoDispose:!0}),g=(0,s.d)(c.a,(e,t)=>{let{get:a}=t;if(!a(m))return;let s=a(p.a,"3798925676");if(s?.value["getting-started"===e?"show_in_getting_started":"show_in_template_modal"]!==!0)return;let n=a(u);return n.isSuccess?n.data.suggestions.filter(e=>a(h,e.expires_at)).slice(0,3):void 0}),f=(0,s.c)(c.a,e=>{let{get:t}=e;return t(m)&&t(p.a,"3798925676")?.value.show_in_template_modal===!0&&t(u).isLoading});a.d(t,{},{a:g,b:f,c:u,d:m})}};