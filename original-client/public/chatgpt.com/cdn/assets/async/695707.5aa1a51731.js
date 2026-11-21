export const __rspack_esm_ids=[695707];export const __webpack_modules__={L6k2(a,b,c){let d=[137,80,78,71,13,10,26,10],e="OpenAI-Presentation";function f(a){if(null==a||"object"!=typeof a)return;let{slideCount:b,backgroundColor:c}=a;if("number"==typeof b&&Number.isSafeInteger(b)&&!(b<1))return{slideCount:b,..."string"==typeof c&&c.length<=96&&/^(?:#[\da-f]{3}(?:[\da-f]{3})?|rgba?\(\s*(?:\d+(?:\.\d+)?\s*,\s*){2}\d+(?:\.\d+)?(?:\s*,\s*(?:\d+(?:\.\d+)?|\.\d+))?\s*\))$/i.test(c)?{backgroundColor:c}:{}}}function g(a){return a.length>=33&&d.every((b,c)=>a[c]===b)&&13===new DataView(a.buffer,a.byteOffset).getUint32(8)&&73===a[12]&&72===a[13]&&68===a[14]&&82===a[15]}function h(a){let b=0xffffffff;for(let c of a){b^=c;for(let a=0;a<8;a++)b=b>>>1^(1&b?0xedb88320:0)}return(0xffffffff^b)>>>0}c.d(b,{},{a:f,b:function(a){if(!g(a)||a.length<45)return;let b=Math.min(a.length,301),c=new DataView(a.buffer,a.byteOffset,b),d=45+c.getUint32(33);if(0x74455874!==c.getUint32(37)||d>b||h(a.subarray(37,d-4))!==c.getUint32(d-4))return;let i=new TextDecoder().decode(a.subarray(41,d-4));if(i.startsWith(`${e}\0`))try{return f(JSON.parse(i.slice(e.length+1)))}catch{return}},c:function(a,b){let c=f(b);if(!g(a)||null==c)throw Error("Invalid presentation preview");let d=new TextEncoder().encode(`${e}\0${JSON.stringify(c)}`);if(d.length>256)throw Error("Presentation preview metadata exceeds its limit");let i=new Uint8Array(d.length+12),j=new DataView(i.buffer);j.setUint32(0,d.length),i.set([116,69,88,116],4),i.set(d,8),j.setUint32(i.length-4,h(i.subarray(4,-4)));let k=new Uint8Array(a.length+i.length);return k.set(a.subarray(0,33)),k.set(i,33),k.set(a.subarray(33),33+i.length),k}})},Kw4a(a,b,c){var d=c("Q840"),e=c("OFP1"),f=c("QufO"),g=c("OWtl"),h=c("OMIV"),i=c("e1xH");let j=(0,d.c)(g.a,a=>{let{get:b}=a;return b(f.b)&&b(h.e,"2612111346")}),k=(0,d.d)(g.a,(a,b)=>{let{get:c}=b;return"grid"===a||"create"===a||"onboarding"===a&&c(f.b)?"template":"default"}),l=(0,d.c)(g.a,a=>{let{get:b}=a,c=b(e.w).status;return b(i.pagesEnabled$)&&("allowed"===c||"denied"===c)}),m=(0,d.c)(g.a,a=>{let{get:b}=a;return b(l)&&b(h.e,"183803860")}),n=(0,d.c)(g.a,a=>{let{get:b}=a;return b(l)&&b(h.e,"3531012613")}),o=(0,d.c)(g.a,a=>{let{get:b}=a;return b(m)||b(n)});c.d(b,{},{a:n,b:j,c:o,d:k,e:m})},jG6n(a,b,c){var d=c("Q840"),e=c("lAQI"),f=c("rHrT"),g=c("fXhT"),h=c("OWtl"),i=c("J9bg"),j=c("Kw4a");let k=["to-do-list","project-tracker"],l=(0,d.c)(h.a,a=>{let{get:b}=a;return b(j.e)?b(i.a,"4051280260"):void 0}),m=(0,d.c)(h.a,a=>{let{get:b}=a;return b(j.a)?b(i.a,"4051280260"):void 0}),n=(0,d.c)(h.a,a=>{let{get:b}=a;return b(j.c)?b(i.b,"4051280260"):void 0}),o=e.F({submitLabel:e.L().trim().min(1).optional(),preparingLabel:e.L().trim().min(1).optional(),freeformPlaceholder:e.L().trim().min(1).optional(),questions:e.g(e.F({question:e.L().trim().min(1),answerLabel:e.L().trim().min(1),isOther:e.j().optional(),options:e.g(e.F({id:e.L().trim().min(1),value:e.L().trim().min(1)})).refine(a=>new Set(a.map(a=>{let{id:b}=a;return b})).size===a.length,"Each option ID in a question must be unique")})).min(1)}),p=e.F({id:e.L().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:e.L().trim().min(1),prompt:e.L().trim().min(1),prefillPrompt:e.L().trim().min(1),gridPreviewMarkdown:e.L().trim().min(1).optional(),previewMarkdown:e.L().trim().min(1).optional(),previewDocument:e.g(e.F({kind:e.z("markdown"),markdown:e.L().trim().min(1),layout:g.c.optional()})).min(1).optional(),setupQuestion:e.L().trim().min(1).nullish(),followUp:o.nullish()}),q=e.g(p.partial({title:!0,prompt:!0,prefillPrompt:!0,previewMarkdown:!0})),r=e.g(e.L()).min(4).max(10).refine(a=>new Set(a).size===a.length&&k.every(b=>a.includes(b))),s=e.F({templates:q.optional(),templatesByLocale:e.J(e.L().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/),q).optional()});c.d(b,{},{a:m,b:function(a,b){let c=s.safeParse(b);if(!c.success)return;if(c.data.templates?.length===0)return[];let d=(0,f.h)(a)??"en",e=d.split("-")[0],g=c.data.templatesByLocale?.[d]??c.data.templatesByLocale?.[e]??("en"===e?c.data.templates:void 0);if(null!=g&&new Set(g.map(a=>{let{id:b}=a;return b})).size===g.length)return g},c:n,d:l,e:r,f:p,g:q})},U6Ok(a,b,c){c.d(b,{a:()=>h});var d=c("xWaH"),e=c("Qgfj"),f=c("jG6n");let g=f.f.required({previewDocument:!0}).array();function h(a,b){let c=(0,f.b)(a.locale,b);if(c?.length===0)return[];let d={kind:"icon",value:"book",color:"black"},e=[{id:"to-do-list",symbol:{kind:"icon",value:"logs",color:"green"},title:a.formatMessage(j.todo),prompt:a.formatMessage(j.todoPrompt),prefillPrompt:a.formatMessage(j.todoPrefillPrompt),gridPreviewMarkdown:`### ${a.formatMessage({id:"space.gettingStarted.todoPreviewToday",defaultMessage:"Today"})}

- [ ]
- [ ]
- [ ]`,previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.todo.preview",defaultMessage:`## Today

### Top priorities

- [ ] Run propulsion test

- [ ] Verify course calculations

- [ ] Inspect fuel tanks

### If time allows

- [ ] Inspect radiation shields

- [ ] Test communication systems

- [ ] Write status report`})}]},{id:"project-tracker",symbol:{kind:"icon",value:"bar-chart",color:"blue"},title:a.formatMessage(j.projectTracker),prompt:a.formatMessage(j.projectTrackerPrompt),prefillPrompt:a.formatMessage(j.projectTrackerPrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.attentionHeading",defaultMessage:"## \u{1F534} Needs immediate attention"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.attention",defaultMessage:"- Communication systems test for launch"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.milestonesHeading",defaultMessage:"## \u26F0\uFE0F Milestones"})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.milestonesCheckboxes",defaultMessage:`| Milestone | Status |
| - | - |
| '<ul><li data-checked="false"><p>'Project brief'</p></li></ul>' | Complete |
| '<ul><li data-checked="false"><p>'Prototype review'</p></li></ul>' | In progress |
| '<ul><li data-checked="false"><p>'Launch readiness'</p></li></ul>' | Upcoming |`},{})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.tasksHeading",defaultMessage:"## \u2705 Tasks"})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.projectTracker.preview.tasksCheckboxes",defaultMessage:`| Task | Owner | Status |
| - | - | - |
| '<ul><li data-checked="false"><p>'Confirm scope'</p></li></ul>' | Product | Done |
| '<ul><li data-checked="false"><p>'Review designs'</p></li></ul>' | Design | In progress |
| '<ul><li data-checked="false"><p>'Test the core flow'</p></li></ul>' | Engineering | Next |
| '<ul><li data-checked="false"><p>'Prepare launch notes'</p></li></ul>' | Marketing | Next |`},{})}]},{id:"weekly-update",symbol:{kind:"icon",value:"writing",color:"pink"},title:a.formatMessage(j.weeklyUpdate),prompt:a.formatMessage(j.weeklyUpdatePrompt),prefillPrompt:a.formatMessage(j.weeklyUpdatePrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weeklyUpdate.preview",defaultMessage:`## \u{2728} Highlights

- Progress made

## \u{261D}\u{FE0F} Needs attention

- Blockers and decisions needing input

## \u{25B6}\u{FE0F} Next week

- Upcoming milestones and confirmed commitments

## \u{1F517} Sources

- Links to sources`})}]},{id:"feedback-tracker",symbol:{kind:"icon",value:"edit",color:"red"},title:a.formatMessage(j.feedback),prompt:a.formatMessage(j.feedbackPrompt),prefillPrompt:a.formatMessage(j.feedbackPrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.themesHeading",defaultMessage:"## \u{1F50E} Top themes"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.onboardingTheme",defaultMessage:"1. Make onboarding easier to follow"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.navigationTheme",defaultMessage:"2. Help people find the right resource"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.sharingTheme",defaultMessage:"3. Clarify what happens after sharing"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.registerHeading",defaultMessage:"## \u{1F5C2}\uFE0F Feedback register"})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.register",defaultMessage:`| Theme | Source | Next step |
| - | - | - |
| Onboarding | Research notes | Review the first-run flow |
| Navigation | Team channel | Group related resources |
| Sharing | Support email | Clarify confirmation copy |`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.summaryHeading",defaultMessage:"## \u{1F4DD} Summary"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.summary",defaultMessage:"People need clearer guidance at key moments. Start with onboarding, then review navigation and sharing."})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.followupsHeading",defaultMessage:"## \u25B6\uFE0F Follow-ups"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feedback.preview.followups",defaultMessage:"- Schedule user interviews for next week"})}]},{id:"release-notes",symbol:d,title:a.formatMessage(j.releaseNotes),prompt:a.formatMessage(j.releaseNotesPrompt),prefillPrompt:a.formatMessage(j.releaseNotesPrefillPrompt),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.releaseNotes.preview",defaultMessage:`## \u{1F195} New

- New capabilities and who can use them

## \u{1F3C6} Improvements

- Changes to existing workflows

## \u{1F6E0}\u{FE0F} Fixes

- Resolved issues and their impact

## \u{1F310} Availability

- Supported platforms, rollout status, and known limitations.

## \u{1F517} Sources

- Links to sources`})}]},{id:"project-home",symbol:d,title:a.formatMessage(j.projectHome),prompt:a.formatMessage(j.projectHomePrompt),prefillPrompt:a.formatMessage(j.projectHomePrefillPrompt),setupQuestion:a.formatMessage({id:"space.pageTemplates.projectHome.question",defaultMessage:"Which project is this for, and which sources should I use?"}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectHome.preview.intro",defaultMessage:`One place for the team, the plan, and what comes next.

## Overview
Make the next product launch simple, coordinated, and easy to follow.

## Team`})},{kind:"markdown",layout:"flexible",markdown:a.formatMessage({id:"space.pageTemplates.projectHome.preview.team",defaultMessage:`| Responsibility | Team |
| --- | --- |
| Project lead | Product |
| Experience | Design |
| Delivery | Engineering |`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.projectHome.preview.ending",defaultMessage:`## Milestones
- Align on the plan
- Review the first prototype
- Prepare the launch

## Key resources
- Project brief and goals
- Decisions from the team channel
- Research notes and launch checklist

## Latest update
The brief is ready for review. Next up: confirm owners and milestones.`})}]},{id:"faq",symbol:d,title:a.formatMessage(j.faq),prompt:a.formatMessage(j.faqPrompt),prefillPrompt:a.formatMessage(j.faqPrefillPrompt),setupQuestion:a.formatMessage({id:"space.pageTemplates.faq.question",defaultMessage:"What topic and audience is this FAQ for, and which sources should I use?"}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.faq.preview",defaultMessage:`Shared answers, grounded in the team's knowledge.

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
Project notes, team discussions, and approved guidance.`})}]}],h=()=>e.filter(a=>{let{id:b}=a;return"project-home"!==b&&"faq"!==b}).map(a=>({...a,...i(a.previewDocument)}));if(null==c)return h();let k=g.safeParse(c.map(b=>{let c=e.find(a=>{let{id:c}=a;return c===b.id})??function(a,b){switch(b){case"feature-backlog":return{id:b,title:a.formatMessage({id:"space.pageTemplates.feature-backlog.title",defaultMessage:"Feature backlog"}),prompt:a.formatMessage({id:"space.pageTemplates.feature-backlog.prompt",defaultMessage:"Turn ideas and requests for my product into a feature backlog. Group similar requests, describe the user need, link supporting feedback, and suggest priorities and next decisions. Ask which product if it\u2019s unclear; a few ideas are enough to start. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Update this Page and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.feature-backlog.prefillPrompt",defaultMessage:"Organize a feature backlog for my product, grouping requests by user need and suggesting priorities and next decisions. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.feature-backlog.preview.1",defaultMessage:`## Ideas and requests
| Idea | User problem | Evidence | Next decision |
| --- | --- | --- | --- |

## Priorities to discuss
Compare impact, effort, and dependencies where known.

## Open questions
Track what needs research or a product decision.`})}]};case"learning-plan":return{id:b,title:a.formatMessage({id:"space.pageTemplates.learning-plan.title",defaultMessage:"Learning plan"}),prompt:a.formatMessage({id:"space.pageTemplates.learning-plan.prompt",defaultMessage:"Help me make a plan for something I want to learn. Start with what I already know and what I want to be able to do. Break it into manageable steps with useful resources, practice, and a weekly routine. Include space for notes and progress checks. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.learning-plan.prefillPrompt",defaultMessage:"Make a learning plan with a clear goal, useful resources, practice, and a weekly routine. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.learning-plan.preview.overview",defaultMessage:`**Time:** Two 30-minute sessions a week

## \u{1F3AF} Outcome

Locate five major lunar features on a map and explain the difference between a crater and a dark plain in ordinary language.

## \u{1F9E9} Starting point

I can recognize the Moon\u{2019}s broad light and dark areas. I want to connect those patterns with named places.

## \u{1F5FA}\u{FE0F} Learning path`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.learning-plan.preview.7",defaultMessage:`| Step | Resource | Practice |
| --- | --- | --- |
| Get oriented | NASA Moon overview | Label five features on a sketch |
| Look closely | A library lunar atlas | Compare two images of one region |
| Explain it | My own notes | Write a 100-word visitor caption |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.learning-plan.preview.practiceAndReview",defaultMessage:`## \u{1F4C5} Weekly rhythm

- [ ] Tuesday: read one short section and draw a sketch.

- [ ] Sunday: revisit the sketch without looking at the labels.

- [ ] Explain one feature to a friend.

## \u{1F4DD} Notebook

**Observation:** The same region can look quite different as shadows change.

**Question:** Which lighting makes a crater\u{2019}s shape easiest to see?

## \u{1F501} Progress check

I can locate three of the five features without the atlas. Compare those three under different lighting, then add two more and repeat the unlabeled sketch.

## \u{1F517} Start here

[NASA Moon overview](https://science.nasa.gov/moon/)`})}]};case"weekly-planner":return{id:b,title:a.formatMessage({id:"space.pageTemplates.weekly-planner.title",defaultMessage:"Weekly planner"}),prompt:a.formatMessage({id:"space.pageTemplates.weekly-planner.prompt",defaultMessage:"Plan my week around the priorities and commitments I\u2019ve shared. Create a short priority list and a realistic day-by-day plan with suggested focus time and room for rest. Ask what matters most this week if you need a starting point. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.weekly-planner.prefillPrompt",defaultMessage:"Make a realistic weekly plan around my priorities and commitments, with suggested focus time and room for rest. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weekly-planner.preview.priorities",defaultMessage:`## \u{1F3AF} Priorities

- [ ] Finish the lunar exhibit captions.

- [ ] Confirm volunteer roles for Friday.

- [ ] Leave one evening free of commitments.

## \u{1F5D3}\u{FE0F} Week at a glance`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weekly-planner.preview.6",defaultMessage:`| Day | Main focus | Commitment |
| --- | --- | --- |
| Monday | Caption edits | Review with Leo, 14:00 |
| Tuesday | Final captions and handout draft | Approve the full print set |
| Wednesday | Send approved files to the print shop | Volunteer call, 18:00 |
| Thursday | Collect prints and check the room | Free evening |
| Friday | Open house | Arrive at 17:15 |
| Weekend | Rest and a short walk | Sunday journal time |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.weekly-planner.preview.lifeAndReview",defaultMessage:`## \u{1F3E1} Everyday life

- [ ] Pick up groceries on the way home.

- [ ] Return the library book.

- [ ] Call a friend over the weekend.

## \u{1F4CC} Can wait

The archive\u{2019}s video section and the future talk schedule.

## \u{2728} Weekend review

**What helped:** Did the shared caption review resolve questions before printing?

**What to change:** Note any last-minute printing or role changes to allow for in the next event plan.`})}]};case"trip-planner":return{id:b,title:a.formatMessage({id:"space.pageTemplates.trip-planner.title",defaultMessage:"Trip planner"}),prompt:a.formatMessage({id:"space.pageTemplates.trip-planner.prompt",defaultMessage:"Make a flexible itinerary and planning checklist using the trip details I\u2019ve shared. Include ideas for activities, transport, and accommodation, keeping confirmed bookings easy to identify. Ask where I\u2019d like to go if needed, or help me choose a destination. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.trip-planner.prefillPrompt",defaultMessage:"Make a flexible trip itinerary and planning checklist, including activities, transport, and accommodation. Help me choose a destination if needed. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.overview",defaultMessage:"**Travelers:** Maya and Sam  \n**Pace:** One main activity a day\n\n## \u{1F9ED} The plan\n\nPlan two nights near a mountain observatory. The visitor tour is the main activity; confirm its availability before choosing transport and accommodation.\n\n## \u{1F686} Travel and stay"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.5",defaultMessage:`| Item | Plan | Status |
| --- | --- | --- |
| Outbound | Friday afternoon train, then local shuttle | Compare departure times |
| Accommodation | Two nights in the village | Choose a flexible booking |
| Return | Sunday afternoon train | Leave time for lunch |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.6",defaultMessage:"## \u{1F5D3}\uFE0F Daily outline"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.7",defaultMessage:`| Day | Main plan | Flexible alternative |
| --- | --- | --- |
| Friday | Arrive and settle in | Short village walk |
| Saturday | Observatory visitor tour | Science museum if tours change |
| Sunday | Easy morning walk | Caf\xe9 and photo journal |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.trip-planner.preview.packingAndNextSteps",defaultMessage:`## \u{1F392} Before leaving

- [ ] Check the visitor schedule, reserve the tour if required, and review the weather before departure.

- [ ] Confirm transport and accommodation.

- [ ] Save tickets and maps offline.

- [ ] Pack warm layers, walking shoes, and a notebook.

## \u{1F4A1} Useful notes

Use a $450 planning allowance for two people: $300 for two nights, $120 for meals, and $30 for local transport. Intercity tickets and any tour fees are additional; confirm actual prices before booking. Keep skywatching optional.`})}]};case"budget-tracker":return{id:b,title:a.formatMessage({id:"space.pageTemplates.budget-tracker.title",defaultMessage:"Budget tracker"}),prompt:a.formatMessage({id:"space.pageTemplates.budget-tracker.prompt",defaultMessage:"Use relevant financial information from connected apps you can access to build my budget tracker. Organize income and spending, show how they compare, and help me track progress toward my goals. Use the currency shown in my accounts and start with this month unless I specify otherwise. Keep totals for different currencies separate. Use the details I\u2019ve already shared, and ask for missing essentials only after checking the available information. If no financial information is available, start with an editable budget and ask what I\u2019d like to add. Update this Page and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.budget-tracker.prefillPrompt",defaultMessage:"Use financial information from connected apps you can access and details I\u2019ve shared to make a budget tracker for this month. Organize income and spending and track my savings goals, using my accounts\u2019 currencies and keeping their totals separate. If no figures are available, help me start an editable budget. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.budget-tracker.preview.1",defaultMessage:`## Budget period
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
Note missing figures and changes for next period.`})}]};case"apartment-hunter":return{id:b,title:a.formatMessage({id:"space.pageTemplates.apartment-hunter.title",defaultMessage:"Apartment hunter"}),prompt:a.formatMessage({id:"space.pageTemplates.apartment-hunter.prompt",defaultMessage:"Organize my apartment search around my location and rent budget. Compare available listings by rent, fees, availability, and my preferences, with links and next steps. If I haven\u2019t added listings yet, start with search criteria and a comparison table. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Update this Page and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.apartment-hunter.prefillPrompt",defaultMessage:"Help me compare apartments by rent, fees, availability, and my preferences, with listing links and next steps. Use details I\u2019ve shared and relevant conversations and connected apps you can access; ask for what\u2019s missing after checking them. Update this Page and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.apartment-hunter.preview.1",defaultMessage:`## Search criteria
Add location, budget, move-in timing, and must-haves.

## Shortlist
| Listing | Rent and fees | Availability | Notes |
| --- | --- | --- | --- |

## Next steps
- [ ] Save listings to compare
- [ ] Prepare questions for a viewing

## Viewing notes
Record observations and questions for each apartment.`})}]};case"event-plan":return{id:b,title:a.formatMessage({id:"space.pageTemplates.event-plan.title",defaultMessage:"Event Plan"}),prompt:a.formatMessage({id:"space.pageTemplates.event-plan.prompt",defaultMessage:"Make a plan for my event with its purpose, key details, schedule, people involved, and preparation checklist. Include a backup plan and follow-up tasks where useful. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.event-plan.prefillPrompt",defaultMessage:"Help me plan my event, including the schedule, people involved, preparation, and follow-up. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.overview",defaultMessage:"**Time:** 18:00\u201320:00 local time  \n**Place:** Northfield Observatory visitor hall  \n**Lead:** Sam Rivera\n\n## \u{1F319} Purpose\n\nAn informal evening of lunar images, short talks, and questions for first-time visitors.\n\n## \u{1F4CB} Essentials"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.5",defaultMessage:`| Item | Plan |
| --- | --- |
| Capacity | 40 visitors |
| Planning budget | $300 total: $100 printing and $200 refreshments |
| Access | Step-free entrance, seating, large-print handouts |
| Main contact | Sam at the welcome desk |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.6",defaultMessage:"## \u{1F570}\uFE0F Run of show"})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.7",defaultMessage:`| Time | Activity | Lead |
| --- | --- | --- |
| 17:15 | Set up and volunteer briefing | Sam |
| 18:00 | Welcome and image gallery | Maya |
| 18:30 | A short tour of the lunar landscape | Priya |
| 19:00 | Indoor questions; outdoor viewing if conditions allow | Priya |
| 20:00 | Close and reset the room | Team |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.event-plan.preview.preparation",defaultMessage:`## \u{2705} Preparation

- [ ] Sam: confirm the room layout and step-free visitor route.

- [ ] Maya: print 50 handouts and the caption cards before the room check.

- [ ] Priya: confirm the observing setup and brief volunteers on the indoor alternative.

## \u{2601}\u{FE0F} If plans change

At 16:00, Sam confirms whether outdoor viewing will run. The indoor event goes ahead either way. Sam updates the welcome desk and guest message; if viewing is cancelled, Priya extends the indoor questions and image discussion.

## \u{1F4DD} Afterwards

- [ ] Gather short visitor comments.

- [ ] Record useful changes for the next event.`})}]};case"personal-goals":return{id:b,title:a.formatMessage({id:"space.pageTemplates.personal-goals.title",defaultMessage:"Personal goals"}),prompt:a.formatMessage({id:"space.pageTemplates.personal-goals.prompt",defaultMessage:"Help me turn the goals I care about into a practical plan. Capture why each goal matters, what progress would look like, and a few steps I can take this week. Suggest ways to make time for them and include a short review section. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),prefillPrompt:a.formatMessage({id:"space.pageTemplates.personal-goals.prefillPrompt",defaultMessage:"Help me make a plan for my personal goals, with signs of progress, a few steps for this week, and time to review how it\u2019s going. Use the details I\u2019ve shared and relevant conversations and connected apps you can access to fill in this Page. Ask for missing essentials only after checking that context. Replace the examples with my details and preserve my edits."}),previewDocument:[{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.personal-goals.preview.overview",defaultMessage:`**Review:** Last Sunday of each month

## \u{1F9ED} What matters

Over the next twelve weeks, learn a few lunar features, finish a photo journal, and keep one evening a week free.

## \u{1F3AF} Goals`})},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.personal-goals.preview.5",defaultMessage:`| Goal | Why | A useful sign of progress |
| --- | --- | --- |
| Learn the lunar landscape | Make skywatching more rewarding | Recognize five named features |
| Make a small photo journal | Finish something tangible | Twelve images with captions |
| Protect unplanned time | Leave room to rest | One free evening each week |`}),layout:"normal"},{kind:"markdown",markdown:a.formatMessage({id:"space.pageTemplates.personal-goals.preview.rhythmAndReview",defaultMessage:`## \u{1F463} This week

- [ ] Borrow a Moon guide from the library.

- [ ] Choose the first three journal images.

- [ ] Keep Thursday evening free.

## \u{1F5D3}\u{FE0F} Make room

Reserve half an hour on Sunday for the journal. Join one astronomy-club evening each month. Pause the second online course until the next review.

## \u{1F501} Monthly review

**Progress:** The journal theme is chosen and twelve images are shortlisted.

**Lesson:** Short sessions are easier to keep than a whole afternoon.

**Adjustment:** Finish one caption each week so all twelve images are ready by the end of this plan.`})}]};default:return}}(a,b.id),d=null==b.prompt?c?.setupQuestion:void 0,f=b.prefillPrompt??(null==b.prompt?c?.prefillPrompt:void 0)??a.formatMessage(j.customPrefillPrompt);return{...c,...b,prefillPrompt:f,previewDocument:b.previewDocument??(null==b.previewMarkdown?c?.previewDocument:[{kind:"markdown",markdown:b.previewMarkdown}]),setupQuestion:void 0!==b.setupQuestion?b.setupQuestion:d}}));return k.success?k.data.map(a=>({...a,symbol:e.find(b=>{let{id:c}=b;return c===a.id})?.symbol??d,...i(a.previewDocument)})):h()}function i(a){let b=a.flatMap(a=>(0,d.oc)(a.markdown).map(b=>({...a,markdown:b})));return{previewMarkdown:b.map(a=>{let{markdown:b}=a;return b}).join("\n\n"),previewDocument:b}}let j=(0,e.f)({todoPrefillPrompt:{id:"space.pageTemplates.todo.prefill.sourceAware",defaultMessage:"Help me turn this Page into my to-do list. Check relevant conversations and connected apps you can access for things I need to do. If you can\u2019t find enough, ask me what to add. Replace the sample tasks, keep the checkboxes and any edits I\u2019ve made, and don\u2019t invent tasks or deadlines."},projectTrackerPrefillPrompt:{id:"space.pageTemplates.projectTracker.prefill.sourceAware",defaultMessage:"Help me make this Page a tracker for my project. Use relevant conversations and connected apps you can access to find milestones and tasks, and ask me for anything missing. Replace the examples, keep my edits, and don\u2019t guess at owners, dates, or statuses."},weeklyUpdatePrefillPrompt:{id:"space.pageTemplates.weeklyUpdate.prefill.sourceAware",defaultMessage:"Help me write this week\u2019s update on this Page. Look for progress, blockers, and next steps in relevant conversations and connected apps you can access. Ask which project or week I mean if it\u2019s unclear, and don\u2019t make up accomplishments."},feedbackPrefillPrompt:{id:"space.pageTemplates.feedback.prefill.sourceAware",defaultMessage:"Help me organize feedback on this Page. Use relevant conversations and connected apps you can access to find feedback. Ask what product or topic to focus on if it\u2019s unclear, replace the examples with what you find, and don\u2019t invent feedback."},releaseNotesPrefillPrompt:{id:"space.pageTemplates.releaseNotes.prefill.sourceAware",defaultMessage:"Help me write release notes on this Page. Check relevant conversations and connected apps you can access for confirmed changes and limitations. Ask which release I mean if it\u2019s unclear, and don\u2019t add unconfirmed details or publish anything."},projectHomePrefillPrompt:{id:"space.pageTemplates.projectHome.prefill.sourceAware",defaultMessage:"Help me set up this Project Home Page. Use relevant conversations and connected apps you can access for the project\u2019s goals, team, milestones, and links. Ask me for anything missing, keep my edits, and don\u2019t make up owners or dates."},faqPrefillPrompt:{id:"space.pageTemplates.faq.prefill.sourceAware",defaultMessage:"Help me make an FAQ on this Page. Look for trusted answers in relevant conversations and connected apps you can access. Ask who it\u2019s for and what it\u2019s about if unclear, and leave anything unverified as an open question."},customPrefillPrompt:{id:"space.pageTemplates.custom.prefill.sourceAware",defaultMessage:"Help me make this Page my own. Use relevant conversations and connected apps you can access, and ask me what I want to add if it\u2019s unclear. Keep my edits and don\u2019t fill in details you can\u2019t verify."},weeklyUpdate:{id:"space.pageTemplates.weeklyUpdate.title",defaultMessage:"Weekly update"},weeklyUpdatePrompt:{id:"space.pageTemplates.weeklyUpdate.setup",defaultMessage:`Check my relevant connected apps and create a weekly update suitable for sharing with cross-functional partners, stakeholders, and executives.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},releaseNotes:{id:"space.pageTemplates.releaseNotes.title",defaultMessage:"Release notes"},releaseNotesPrompt:{id:"space.pageTemplates.releaseNotes.setup",defaultMessage:`Check my relevant connected apps and create release notes. Ask which project I would like to create release notes for.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},projectHome:{id:"space.pageTemplates.projectHome.title",defaultMessage:"Project Home"},projectHomePrompt:{id:"space.pageTemplates.projectHome.setup",defaultMessage:`Help me make this Project Home my own. Start working directly in the Page without a setup interview or waiting for confirmation. Choose a project from available context and begin filling it in; the user can redirect you afterward.

If the Page has an Instructions section, collapse it before adding content so it does not push the useful content below the chat, and keep it collapsed when you finish. If that section exists but the available controls cannot change its collapsed state, say so briefly; do not claim it is collapsed. If there is no Instructions section, continue without creating one or mentioning its absence.

Make sure the Page has a title. If it is untitled, use \u{201C}Project Home\u{201D} initially. Preserve an existing title and any user edits.

Before searching connected sources, add an editable starting structure with two sections: Project overview and Essential resources. Include supported details already available in context. Keep this first version compact and useful, without a wall of empty headings or repeated placeholders. Send this brief chat message: \u{201C}I\u{2019}m filling in your Project Home. You can edit any section while I work.\u{201D}

Choose the most relevant project using your best judgment. Prioritize context attached to this Page or its current Space, then recent conversations and project activity. If several projects are plausible, pick the strongest candidate and treat it as a working assumption. Do not stop to ask which project to use or wait for approval before filling in supported details. Choose a real project supported by context; do not invent one. If the initial context provides no candidate, search recent connected sources for one.

Leave one comment explaining the choice: \u{201C}I picked [project] based on [context] and started filling in this Page. If you\u{2019}d like a different project, reply here with its name or a source and I\u{2019}ll switch.\u{201D}

Prefer anchoring this comment to the Page title. If title comments are unsupported, use the first existing content section outside Instructions. If supported, open and focus the comment so it is visible above the chat. Do not claim it is open or focused unless verified. Do not create body content solely to anchor the comment, and do not repeat the project-selection question in the body.

Continue working immediately after leaving the comment. Use the project\u{2019}s Slack channel, relevant emails, project notes, and links to fill in the Page incrementally. Write useful findings as you find them instead of waiting until all research is complete. Add short, scannable sections as evidence becomes available:

- Project overview: what we\u{2019}re building, who it\u{2019}s for, and why it matters
- Team and responsibilities
- Essential resources
- Recent updates
- Upcoming milestones
- Decisions and open questions
- A short guide for someone joining

Cite sources near the claims they support. Prioritize recent sources for status and milestones, and include relevant dates. Distinguish confirmed decisions from proposals, and commitments from completed work. Flag conflicting information rather than silently choosing one version. Do not invent facts or sample records. Keep detailed tasks in a linked tracker if one exists.

Use Open questions only for substantive project unknowns. Label these \u{201C}Needs input\u{201D} or \u{201C}Not yet found\u{201D} where useful. Do not create an Open questions section to ask which project to use. If no real project can be found after a reasonable search, preserve the starting structure and explain the missing context in the single comment rather than fabricating a project.

Use Page comments for focused questions and assumptions. Prefer the title, or the first existing content section outside Instructions if title comments are unsupported. Refer to the relevant section in the comment instead of anchoring questions farther down the Page. Ask only what is needed to move forward, and continue supported work while awaiting answers. If a relevant app isn\u{2019}t connected, offer to connect it and continue with available sources.

When input would help, add one brief, contextual invitation in comments or chat: \u{201C}Add a project brief here with @, or type @ChatGPT, select it from the Page\u{2019}s mention menu, and ask me to use a different project. Use / to add content to the Page.\u{201D} Adapt the example to the actual gap. Do not repeat this guidance in the Page body.

Write using native Page blocks. Check current content before replacing anything, and preserve edits the user makes while you work. When the user names a different project or provides new context, update the relevant sections, revise the choice comment, and remove obsolete content, resolved questions, and unnecessary hints.

Keep chat replies brief and focused on the next step. Do not repeat Page content in chat. Do not imply that the Page is being monitored or updated continuously. Do not send messages or configure recurring updates without asking first.`},projectTracker:{id:"space.pageTemplates.projectTracker.title",defaultMessage:"Project tracker"},projectTrackerPrompt:{id:"space.pageTemplates.projectTracker.setup",defaultMessage:`Check my relevant connected apps and create a project tracker. Automatically update every morning at 6am in my browser time zone.

Include checkboxes to the left of the milestones and tasks in the table. This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},todo:{id:"space.pageTemplates.todo.title",defaultMessage:"To-do list"},todoPrompt:{id:"space.pageTemplates.todo.setup",defaultMessage:`Check my relevant connected apps and create a to-do checklist. Automatically update every morning at 6am in my browser time zone: check off completed tasks for me, and carry forward incomplete tasks to the next day.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. Do not add introductory paragraphs, conclusions, coverage summaries, methodology, scheduling details, or explanations of how you maintain the checklist. Avoid boilerplate. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},feedback:{id:"space.pageTemplates.feedback.title",defaultMessage:"Feedback tracker"},feedbackPrompt:{id:"space.pageTemplates.feedback.setup",defaultMessage:`Check my relevant connected apps and create a feedback tracker. Ask which project I would like to track feedback for. Automatically update every morning at 6am in my browser time zone.

This page starts with illustrative template content, not facts about me or my work. Verify the user making this request before proceeding. Read the page before editing and preserve any user edits. Replace sample content with relevant, source-backed information; do not treat sample content as evidence. Maintain the useful structure and expand it and add items where needed. Try to finish the page without any questions, but if essential information is missing, ask a focused question rather than guessing. The page title is displayed separately; do not repeat it as a heading in the body. You may leave up to 3 more comments on the page, as appropriate, where you need my input. Don't add comments unnecessarily.`},faq:{id:"space.pageTemplates.faq.title",defaultMessage:"FAQ"},faqPrompt:{id:"space.pageTemplates.faq.setup",defaultMessage:"Help me make this FAQ my own. Ask for the topic, audience and trusted source notes or links, including relevant Slack discussions and approved guidance. Offer to connect relevant apps when needed. Build the most useful questions with concise supported answers and source links. Combine equivalent questions, keep unanswered or disputed questions visible with an owner or next decision, and keep material freshness qualifiers beside the answers they affect. Link a separate feedback tracker if I have one. Write directly into this Page using native Page blocks, preserving its title and my edits. Do not invent answers or treat unconfirmed replies as authoritative guidance. Keep source-channel replies unsent and automatic updates unconfigured unless I ask to set them up. Ask only the setup questions needed to proceed. Keep chat replies brief and focused on the next step. Organize the Page into short, scannable sections with actionable details. Don't repeat Page content in chat."}})},o72y(a,b,c){var d=c("Q840"),e=c("yZpl"),f=c("Cslg"),g=c("OFP1"),h=c("Kwur"),i=c("e1xH"),j=c("hlkZ"),k=c("OWtl"),l=c("JYRT");let m=(0,d.c)(k.a,a=>{let{get:b}=a;return b(i.pagesEnabled$)&&"allowed"===b(g.w).status}),n=(0,d.r)(k.a,a=>{let{get:b,scope:c}=a,d=b(j.spaceAccountId$),g=b(f.k);return{queryKey:["space","personalized-pages",d,g],enabled:b(m)&&null!=d&&null!=g,staleTime:6e4,gcTime:0,retry:!1,queryFn:async a=>{let{signal:b}=a;if(null==d||null==g)throw Error("space_account_unavailable");let f=(0,j.watchSpaceAccount)(c,d,g),i=AbortSignal.any([b,f.signal]);try{let a=await h.Request.safeGet("/pages/suggestions",{additionalHeaders:{"ChatGPT-Account-ID":d,[e.dc]:d},signal:i});return i.throwIfAborted(),a}finally{f.stop()}}}}),o=(0,d.i)(k.a,a=>Date.parse(a)>Date.now(),(a,b)=>{let c,{set:d}=b,e=()=>{let b=Date.parse(a)-Date.now();d(b>0),b>0&&(c=setTimeout(e,Math.min(b,0x7fffffff)))};return e(),()=>clearTimeout(c)},{autoDispose:!0}),p=(0,d.d)(k.a,(a,b)=>{let{get:c}=b;if(!c(m))return;let d=c(l.a,"3798925676");if(d?.value["getting-started"===a?"show_in_getting_started":"show_in_template_modal"]!==!0)return;let e=c(n);return e.isSuccess?e.data.suggestions.filter(a=>c(o,a.expires_at)).slice(0,3):void 0}),q=(0,d.c)(k.a,a=>{let{get:b}=a;return b(m)&&b(l.a,"3798925676")?.value.show_in_template_modal===!0&&b(n).isLoading});c.d(b,{},{a:p,b:q,c:n,d:m})},e7M0(a,b,c){var d=c("Cslg"),e=c("svjy"),f=c("kpIY"),g=c("e1xH"),h=c("QftW"),i=c("hlkZ"),j=c("vHxi"),k=c("nndI"),l=c("SCmN"),m=c("v5SL"),n=c("pyo2");function o(a,b){let c=a.get(d.k);null!=c&&!0===a.get(n.e)&&null==a.get(m.g)[JSON.stringify([b,c])]&&(0,m.e)(a,b,c)}c.d(b,{},{provisionSpaceWelcomePage:async function(a){if(!a.get(g.pagesEnabled$))return;let b=a.get(i.spaceAccountId$);null!=b&&o(a,b),await a.when(a=>{let{get:b}=a;return null!=b(i.spaceAccountId$)||!b(g.pagesEnabled$)});let c=a.get(i.spaceAccountId$);if(null==c||!a.get(g.pagesEnabled$))return;o(a,c),await a.when(a=>{let{get:b}=a;return null!=b(l.g)||b(i.spaceAccountId$)!==c||!b(g.pagesEnabled$)});let d=a.get(l.g);if(d?.accountId!==c||((0,f.t)(m.a,{entries:{[d.key]:{value:a.get(m.f)[d.key]??Date.now()}},maxEntries:100}),await a.when(a=>{let{get:b}=a;return null!=b(m.g)[d.key]||b(l.g)?.key!==d.key||!b(g.pagesEnabled$)||null!=b(n.e)}),a.get(l.g)?.key!==d.key||!a.get(g.pagesEnabled$))||(o(a,c),!a.get(n.d).includes("welcome")))return;let p=a.get(k.g)[d.key],q=await (0,j.b)(a,a.get(e.a),p??null);null!=q&&a.get(l.g)?.key===d.key&&a.get(n.d).includes("welcome")&&a.get(g.y)&&a.query.getOrFetch(h.f,q).catch(()=>{})}})},i1Zq(a,b,c){var d=c("QBk8"),e=c("Q840"),f=c("PFjh"),g=c("Kwur"),h=c("yGJW"),i=c("OWtl"),j=c("eShZ"),k=c("OoIX"),l=c("e1xH"),m=c("hlkZ"),n=c("WF9u"),o=c("nndI"),p=c("SCmN"),q=c("pyo2"),r=c("JkZJ");let s=(0,e.v)(i.a,a=>"idle");c.d(b,{},{a:async function(a,b){let c=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=arguments.length>3?arguments[3]:void 0,t=a.get(p.g);if(c&&null!=t&&("creating"===a.get(s,t.key)||a.get(p.i,t.key)))throw Error("Welcome Page is busy; retry reset after it finishes");let u=null==t?void 0:a.get(o.g)[t.key];if(null==t||!c&&!a.get(q.d).includes("welcome")||!c&&null!=u||"creating"===a.get(s,t.key))return;let v=(0,m.watchSpaceAccount)(a,t.accountId,t.userId),w=new AbortController,x=a.watch(a=>{let{get:b}=a;b(l.pagesEnabled$)||w.abort()}),y=AbortSignal.any([v.signal,w.signal]),z=a.get(f.a);z.count("codex_pages","welcome_creation",{outcome:"failed"===a.get(s,t.key)?"retry":"started"}),a.set(s,t.key,"creating"),c&&a.set(p.f,t.key,"unknown");let A=a.get(o.f)[t.key],B=i??a.get(o.e)[t.key]??A?.idempotency_key??o.d;A?.idempotency_key!==B&&(A=void 0),null==A&&null==i&&(B=(0,o.b)(B));try{(null==A||c)&&(0,k.b)(a);let f=()=>{A?.idempotency_key!==B&&((0,k.b)(a),A={idempotency_key:B,destination:"personal_file_drive",title:(0,r.b)(b),initial_blocks:(0,r.a)(b,n.j),parent_page_id:null});let f=A;return a.get(m.createSpacePageMutation$).mutateAsync({source:d.CodexSpacesSource.CODEX_SPACES_SOURCE_WELCOME,accountId:t.accountId,requestBody:f,assertRequestCurrent:()=>{y.throwIfAborted(),a.get(o.f)[t.key]?.idempotency_key!==f.idempotency_key&&(0,k.b)(a),(0,e.s)(a,a=>{a.set(o.e,a=>({...a,[t.key]:B})),a.set(o.f,a=>({...a,[t.key]:f}))})},signal:y,isExpectedError:a=>!c&&!B.startsWith("space-welcome-readable:")&&(403===a.status&&"page_read_forbidden"===a.errorCode||404===a.status&&"page_not_found"===a.errorCode)})};if(c){let b=u,c=!1;try{b=b??(await f()).metadata.page_id,y.throwIfAborted();try{await g.Request.safePost("/pages/{page_id}/delete",{parameters:{path:{page_id:b}},signal:y,isExpectedError:a=>403===a.status&&"page_write_forbidden"===a.errorCode||410===a.status&&"page_deleted"===a.errorCode}),c=!0}catch(a){y.throwIfAborted(),c=a instanceof j.FetchError&&410===a.status&&"page_deleted"===a.errorCode}}catch(a){if(!(a instanceof j.FetchError)||410!==a.status||"page_deleted"!==a.errorCode)throw a;c=!0}y.throwIfAborted(),B=o.d+":reset:"+(b??crypto.randomUUID()),(0,e.s)(a,a=>{a.set(o.e,a=>({...a,[t.key]:B})),(0,p.a)(a,t.key)}),c&&null!=b&&(0,m.evictCachedSpacePages)(a,[b],t.accountId,{unavailablePageIds:[b]})}let h=await f().catch(async b=>{if(!c&&b instanceof j.FetchError&&(403===b.status&&"page_read_forbidden"===b.errorCode||404===b.status&&"page_not_found"===b.errorCode)&&!B.startsWith("space-welcome-readable:"))return y.throwIfAborted(),B="space-welcome-readable:"+B,a.set(o.e,a=>({...a,[t.key]:B})),f();if(!c||!(b instanceof j.FetchError)||410!==b.status||"page_deleted"!==b.errorCode)throw b;return y.throwIfAborted(),B=o.d+":reset:"+crypto.randomUUID(),a.set(o.e,a=>({...a,[t.key]:B})),f()});if(y.throwIfAborted(),(0,o.a)(a,t.key,h.metadata.page_id),null==h.content)throw Error("Welcome Page content could not be read");(0,m.cacheCreatedSpacePage)(a,t.accountId,h,{background:!0}),(0,e.s)(a,a=>{a.set(p.f,t.key,"available"),a.set(o.g,a=>({...a,[t.key]:h.metadata.page_id})),a.set(s,t.key,"idle")}),z.count("codex_pages","welcome_creation",{outcome:"bound"})}catch(f){let b=!c&&!y.aborted&&f instanceof j.FetchError&&"page_deleted"===f.errorCode;b?(0,q.c)(a,"welcome"):y.aborted||(a.set(p.f,t.key,(0,p.k)(f)),(0,h.a)(a,d.CodexSpacesOnboarding,{action:d.CodexSpacesOnboardingAction.CODEX_SPACES_ONBOARDING_ACTION_WELCOME_PAGE_FAILED,item:d.CodexSpacesOnboardingItem.CODEX_SPACES_ONBOARDING_ITEM_WELCOME,pageId:a.get(o.c)[t.key],failureOperation:d.CodexSpacesOnboardingFailureOperation.CODEX_SPACES_ONBOARDING_FAILURE_OPERATION_CREATE})),a.set(s,t.key,y.aborted||b?"idle":"failed");let e=b?"deleted":"failed";if(y.aborted&&(e="cancelled"),z.count("codex_pages","welcome_creation",{outcome:e}),c)throw f}finally{x(),v.stop()}},b:s})},pyo2(a,b,c){var d=c("Q840"),e=c("TzYl"),f=c("Cslg"),g=c("svjy"),h=c("iyTF"),i=c("OWtl"),j=c("OMIV"),k=c("kpIY"),l=c("e1xH"),m=c("hlkZ"),n=c("SCmN"),o=c("Kw4a"),p=c("jG6n"),q=c("U6Ok"),r=c("o72y"),s=c("v5SL");let t=["welcome","templates"],u=(0,d.i)(i.a,a=>Date.now()>=a+12096e5,(a,b)=>{let c,{set:d}=b,e=()=>{let b=a+12096e5-Date.now();d(b<=0),b>0&&(c=setTimeout(e,Math.min(b,0x7fffffff)))};return e(),()=>clearTimeout(c)},{autoDispose:!0}),v=(0,d.c)(i.a,a=>{let{get:b}=a,c=b(n.g);if(null==c)return[];let d=b(s.b)[c.key];return b(o.b)?!d?.includes("templates")&&b(o.c)?["templates"]:[]:t.filter(a=>!d?.includes(a)&&("templates"!==a||b(o.e)&&(void 0!==b(p.d)&&(0,q.a)(b(g.a),b(p.d)?.value).length>0||b(l.e,"granola_presentation")&&(b(h.b).data?.length??0)>0)))}),w=(0,d.c)(i.a,a=>{let{get:b}=a;if(b(m.pinnedSpacePageIds$).length>0||b(m.pinnedSpaceIds$).length>0)return!0;let c=b(m.spaceAccountId$);if(!b(j.e,"1425956883")||null==c||c!==b(f.f))return!1;let d=b(e.a);if(null==d)return!1;let{data:g}=d;return null==g?void 0:g.length>0}),x=(0,d.c)(i.a,a=>{let{get:b}=a,c=b(n.g);if(null==c||!b(l.pagesEnabled$))return!1;let d=b(s.b)[c.key];if(t.every(a=>d?.includes(a)))return!1;let e=b(s.g)[c.key];if(!0===e||null==e&&!0===b(w))return!1;let f=b(s.f)[c.key];return!(null!=f&&b(u,f))&&(b(v).length>0||!b(o.b)&&(b(A)?.length??0)>0)}),y=(0,d.c)(i.a,a=>{let{get:b}=a;return b(x)?b(v):[]}),z=(0,d.d)(i.a,(a,b)=>{let{get:c}=b;return null!=a&&c(l.C)&&("pages"===a||c(l.e,"granola_presentation"))&&c(y).includes("templates")}),A=(0,d.c)(i.a,a=>{let{get:b}=a,c=b(n.g),d=null==c?void 0:b(s.d,c.key);return b(r.a,"getting-started")?.filter(a=>!d?.[`personalized:${a.id}`])});c.d(b,{},{a:z,b:function(a){let b=a.get(n.g);null!=b&&a.set(s.b,a=>({...a,[b.key]:t}))},c:function(a,b){let c=a.get(n.g);if(null!=c){if("welcome"!==b&&"templates"!==b)return void(0,k.t)((0,s.c)(c.key),{entries:{[b]:{value:!0}},maxEntries:100});a.set(s.b,a=>({...a,[c.key]:[...new Set([...a[c.key]??[],b])]}))}},d:y,e:w,f:A,g:x})},JkZJ(a,b,c){var d=c("xWaH"),e=c("WF9u");let f=["\u2063\u2063","\u2063\u2064"];c.d(b,{},{a:function(a,b){let c=a.formatMessage({id:"space.gettingStartedPages.starterBody.guide",defaultMessage:`> [!CALLOUT] \u{1F4A1}
>
> Pages are a place for you to write, build, and collaborate with ChatGPT and your teammates. Use this page as your playground to learn the basics \u{2014} and have fun!

## Getting started

- [ ] **Play with this page.** Type \`/\` to add headings, images, checklists, tables, and more. Try it out in the empty space below \u{1F447}

- [ ] **Work with ChatGPT.** Type \`@ChatGPT\`, followed by your request, and ChatGPT will jump in to help with whatever you need.

- [ ] **Get organized.** Instead of folders, organize information by nesting pages *inside of* pages. Type \`/page\` to create a page inside this one.

- [ ] When your masterpiece is ready, **share** it with your teammates (using the share button in the upper-right), **collaborate**, and fiercely debate in the **comments**.

## Imagine anything, and make it real

Create **interactive visualizations** by typing \`/visualize\` and describing your idea, whether it\u{2019}s *\u{201C}Show me how my savings could grow with an interactive calculator\u{201D}*, *\u{201C}Simulate the solar system\u{201D}*, or even *\u{201C}Create a playable mini-piano.\u{201D}*

{savings}

{solar}

{piano}

---

- [ ] Try it out yourself: In the empty space below, type \`/visualize\` and describe your idea \u{1F447}

---

## Put ChatGPT to work

You can add instructions to pages, and ChatGPT will do the work for you, like creating a self-updating to-do list or comprehensive trip planner. Here are a couple examples of pages ChatGPT can create for you.

\`\`\`codex-prompt
Create a daily list of prioritized tasks from my email, messages, and calendar, and update it every morning
\`\`\`

\`\`\`codex-prompt
Create a new trip planner page with flight details, hotel reservations, and tour info, pulled from my emails
\`\`\``},{savings:b?.savings==null?"":(0,e.b)(b.savings,a.formatMessage({id:"space.welcome.demo.savingsAlt",defaultMessage:"Savings growth calculator"})),solar:b?.solar==null?"":(0,e.b)(b.solar,a.formatMessage({id:"space.welcome.demo.solarAlt",defaultMessage:"Solar system explorer"})),piano:b?.piano==null?"":(0,e.b)(b.piano,a.formatMessage({id:"space.welcome.demo.pianoAlt",defaultMessage:"Mini Piano"}))});return(0,d.oc)(c).flatMap(a=>a.startsWith("- [ ] ")?[a,""]:[a])},b:function(a){return a.formatMessage({id:"space.gettingStartedPages.pageTitle",defaultMessage:"Your guide to pages"})},c:function(a){let b=f.find(b=>a.endsWith(b));return null==b?a:a.slice(0,-b.length)}})},vHxi(a,b,c){var d=c("QBk8"),e=c("Q840"),f=c("E8Sp"),g=c("SGsN"),h=c("e1xH"),i=c("yGJW"),j=c("WFY2"),k=c("eShZ"),l=c("hlkZ"),m=c("i1Zq"),n=c("pyo2"),o=c("nndI"),p=c("SCmN"),q=c("WP5H");async function r(a,b,c){let{showErrorToast:f=!1}=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},j=a.get(p.g);if(!a.get(h.pagesEnabled$)||null==j||a.get(p.i,j.key)||"creating"===a.get(m.b,j.key)&&(null!=c||null!=a.get(o.g)[j.key]))return null;let q=(0,l.watchSpaceAccount)(a,j.accountId,j.userId);a.set(p.i,j.key,!0);let r=a.get(p.d),s=a.get(o.g)[j.key],t=c??s??(r?.identityKey===j.key?r.pageId:null);try{if(null==t&&(await (0,m.a)(a,b),await a.when(a=>{let{get:b}=a;return b(p.g)?.key!==j.key||"creating"!==b(m.b,j.key)}),q.signal.throwIfAborted(),t=a.get(o.g)[j.key]??null,null==t))return null;(r?.identityKey!==j.key||r.pageId!==t)&&a.set(p.d,{identityKey:j.key,pageId:t,awaitingPaint:!1});try{await a.query.fetch(l.spacePageQuery$,t)}catch(f){q.signal.throwIfAborted();let c=a.get(o.e)[j.key]??a.get(o.f)[j.key]?.idempotency_key,d=c??o.d;if(!a.get(n.d).includes("welcome")||t!==s||!(f instanceof k.FetchError)||(403!==f.status||"page_read_forbidden"!==f.errorCode)&&(404!==f.status||"page_not_found"!==f.errorCode&&"page_trashed"!==f.errorCode)||404!==f.status&&d.startsWith("space-welcome-readable:"))throw f;if(404===f.status&&null==c)return(0,e.s)(a,a=>{(0,n.c)(a,"welcome"),a.set(p.f,j.key,"failed"),a.set(p.d,null)}),null;if((0,e.s)(a,a=>{404!==f.status&&a.set(o.e,a=>({...a,[j.key]:"space-welcome-readable:"+d})),(0,p.a)(a,j.key)}),await (0,m.a)(a,b,!1,404===f.status?d:void 0),q.signal.throwIfAborted(),t=a.get(o.g)[j.key]??null,null==t)return null;a.set(p.d,{identityKey:j.key,pageId:t,awaitingPaint:!1}),await a.query.fetch(l.spacePageQuery$,t)}return q.signal.throwIfAborted(),a.get(h.pagesEnabled$)&&a.get(o.g)[j.key]===t&&(0,o.a)(a,j.key,t),a.set(o.g,a=>({...a,[j.key]:t})),a.set(p.f,j.key,"available"),t}catch(c){if(!q.signal.aborted){if(c instanceof k.FetchError&&"page_deleted"===c.errorCode)return(0,n.c)(a,"welcome"),a.set(p.d,null),null;if(a.get(h.pagesEnabled$)&&(0,i.a)(a,d.CodexSpacesOnboarding,{action:d.CodexSpacesOnboardingAction.CODEX_SPACES_ONBOARDING_ACTION_WELCOME_PAGE_FAILED,item:d.CodexSpacesOnboardingItem.CODEX_SPACES_ONBOARDING_ITEM_WELCOME,pageId:t??void 0,failureOperation:d.CodexSpacesOnboardingFailureOperation.CODEX_SPACES_ONBOARDING_FAILURE_OPERATION_OPEN}),a.set(p.f,j.key,(0,p.k)(c)),!f)return null;a.get(g.f).danger(b.formatMessage({id:"space.gettingStartedPages.openError",defaultMessage:"Could not open the Getting Started Page. Try again."}),{errorAnalytics:{toastId:"space.gettingStartedPages.openError"}})}return null}finally{q.stop(),a.set(p.i,j.key,!1)}}c.d(b,{},{a:async function(a,b,c,d){let e=a.get(p.g),{pathname:g,search:h}=a.get(f.b);if(null==e)return;let i=await r(a,c,d.pageId,{showErrorToast:!0});if(null==i||a.get(p.g)?.key!==e.key||a.get(f.b).pathname!==g||a.get(f.b).search!==h||d.isCurrent?.()===!1)return;let k=a.get(p.d);null!=d.onOpenPage?d.onOpenPage(i):await b(`/space/${i}`,{state:{spaceSidebarAccountId:e.accountId}}),null!=k&&a.get(p.d)===k&&a.get(p.g)?.key===e.key&&a.set(p.d,{...k,awaitingPaint:!0}),(0,q.a)(a,i,()=>a.get(p.g)?.key===e.key&&a.get(o.g)[e.key]===i).catch(()=>{j.a.warning("Failed to save the Welcome Page's default icon")})},b:r})},SCmN(a,b,c){var d=c("QBk8"),e=c("Q840"),f=c("Cslg"),g=c("CKur"),h=c("g2p6"),i=c("e1xH"),j=c("yGJW"),k=c("OWtl"),l=c("WFY2"),m=c("kpIY"),n=c("Nwp9"),o=c("OHD8"),p=c("hlkZ"),q=c("v5SL"),r=c("nndI");let s="oai/apps/hasOpenedSpaceWelcome",t="space-welcome-dismissal-v1",u=(0,n.b)(t,{}),v=(0,e.v)(k.a,a=>!1),w=(0,e.u)(k.a,()=>null),x=(0,e.c)(k.a,a=>{let{get:b}=a,c=b(p.spaceAccountId$),d=b(f.k);return null!=c&&null!=d&&c===b(h.n)?{accountId:c,userId:d,key:JSON.stringify([c,d])}:null}),y=(0,e.d)(k.a,(a,b)=>{let{get:c}=b,d=c(x);return null!=d&&c(r.g)[d.key]===a}),z=(0,e.v)(k.a,a=>!1),A=(0,e.v)(k.a,a=>"unknown"),B=(0,e.d)(k.a,(a,b)=>{let{get:c}=b,d=c(w);return c(i.pagesEnabled$)&&d?.awaitingPaint===!0&&!c(q.h,d.identityKey)&&d.pageId===a&&d.identityKey===c(x)?.key}),C=(0,e.c)(k.a,a=>{let{get:b}=a,c=b(x);if(null==c)return;let d=b(u)[c.key];if(null!=d)return!1!==d;let e=b(h.p);if(e.isSuccess&&!e.isPlaceholderData)return Object.hasOwn(e.data.seenAnnouncements??{},s)});async function D(a){if(!a.get(i.pagesEnabled$))return;let b=a.get(x);if(null==b||a.get(q.h,b.key)||"pending"!==a.get(u)[b.key]||a.get(v,b.key))return;let c=(0,p.watchSpaceAccount)(a,b.accountId,b.userId);a.set(v,b.key,!0);try{if(await (0,g.a)(a,s,!1,c.signal),c.signal.throwIfAborted(),"pending"!==a.get(u)[b.key])return;(0,m.t)(t,{entries:{[b.key]:{value:"saved"}}}),await a.query.snapshot(h.p).invalidate()}catch{c.signal.aborted||l.a.warning("Failed to save Space welcome dismissal")}finally{c.stop(),a.set(v,b.key,!1)}}c.d(b,{},{a:function(a,b){a.set(A,b,"unknown"),a.set(r.g,a=>{let{[b]:c,...d}=a;return d}),a.set(r.c,a=>{let{[b]:c,...d}=a;return d}),a.get(w)?.identityKey===b&&a.set(w,null)},b:y,c:function(a,b){let c=a.get(w);if(c?.pageId!==b||!a.get(i.pagesEnabled$))return;let e=a.get(x);null==e||c.identityKey!==e.key||a.get(q.h,e.key)||((0,j.a)(a,d.CodexSpacesOnboarding,{action:d.CodexSpacesOnboardingAction.CODEX_SPACES_ONBOARDING_ACTION_WELCOME_PAGE_OPENED,item:d.CodexSpacesOnboardingItem.CODEX_SPACES_ONBOARDING_ITEM_WELCOME,pageId:b}),(0,m.t)(t,{entries:{[e.key]:{value:"pending"}}}),a.set(w,null),D(a))},d:w,e:D,f:A,g:x,h:C,i:z,j:B,k:function(a){return a instanceof Error&&(0,o.a)(a)?"retryable":"failed"}})},WP5H(a,b,c){var d=c("xWaH");let e={kind:"icon",value:"graduation-cap",color:"blue"};c.d(b,{},{a:async function(a,b,f){let{withPageMenuSession:g}=await Promise.all([c.e(418851),c.e(109308),c.e(399565),c.e(257798),c.e(447351),c.e(617936),c.e(807489),c.e(337882),c.e(955979),c.e(646436),c.e(7078),c.e(200429),c.e(698524),c.e(956483),c.e(87162),c.e(396705),c.e(155568),c.e(731863),c.e(767086),c.e(76629),c.e(226913),c.e(753405),c.e(970791),c.e(69819)]).then(c.bind(c,"tKju"));f()&&await g(a,b,"write",async a=>{f()&&null==a.getSymbol()&&null==(0,d.wc)(a.document.getText("title").toJSON()).emoji&&a.mutateDocument(a=>(0,d.sc)(a,e))&&await a.flush({scope:"current",timeoutMs:null})})},b:e})},iyTF(a,b,c){c.d(b,{a:()=>x,b:()=>v,c:()=>w});var d=c("Q840"),e=c("TNqT"),f=c("OWtl"),g=c("OMIV"),h=c("Cslg"),i=c("NRR1"),j=c("e1xH"),k=c("JYRT"),l=c("zgGI"),m=c("rvFo"),n=c("GDNt"),o=c("lAQI"),p=c("L6k2");let q=o.F({width:o.E().int().positive().max(65535),height:o.E().int().positive().max(65535),blurhash:o.L().max(166),blurhashAlpha:o.L().max(166).optional(),presentation:o.R().transform(p.a).optional()}),r=o.L().regex(/^[a-f0-9]{64}$/),s=o.F({id:o.L().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title:o.L().trim().min(1),thumbnailUrl:o.L(),thumbnailMetadata:q.optional().catch(void 0),publisher:o.z("openai"),revision:r,source:o.F({format:o.z("presentation-protobuf"),url:o.L(),byteLength:o.E().int().positive().max(0x6400000),sha256:r})}).refine(a=>{let b=`https://persistent.oaistatic.com/space-presentation-templates/${a.id}/${a.revision}`;return a.thumbnailUrl===`${b}/cover.png`&&a.source.url===`${b}/presentation.pb`},"Template URLs must identify the same immutable revision"),t=o.F({schemaVersion:o.z(1),templates:o.g(s).refine(a=>new Set(a.map(a=>{let{id:b}=a;return b})).size===a.length,"Template IDs must be unique")}),u=(0,d.r)(f.a,a=>{let{get:b}=a,c=b(h.f),d=b(h.j),e=b(k.a,"1122994996");return{queryKey:["default-presentation-templates",c,d,e?.value],enabled:b(j.pagesEnabled$)&&!b(g.i)&&null!=c&&null!=d&&b(i.e)===c,gcTime:0,staleTime:m.b.FIVE_MINUTES,retry:!1,queryFn:()=>(function(a){let b=t.safeParse(a);if(!b.success)throw Error("Default presentation catalog unavailable");return b.data.templates})(e?.value)}}),v=(0,d.c)(f.a,a=>{let{get:b}=a;return b(g.e,"2419050919")?b(u):b(e.b)});async function w(a){a.get(g.e,"2419050919")?await async function(a){await a.get(g.g)?.refreshValuesAsync(),await a.query.invalidate(u)}(a):await a.get(e.b).refetch()}function x(a,b,c){return"source"in b?async function(a,b,c){let d=a.get(h.f),e=a.get(h.j);if(null==d||null==e||a.get(i.e)!==d)throw Error("Template account unavailable");let f=(0,i.f)(a,d,void 0,void 0,e),g=AbortSignal.any([c,f.signal]);try{if(g.throwIfAborted(),b.source.byteLength>0x6400000)throw Error("Template exceeds download limit");let a=await n.b.getInstance().fetch(b.source.url,{signal:g});if(!a.ok)throw Error("Default presentation template unavailable");let c=await (0,l.a)(a,b.source.byteLength,g);if(c.size!==b.source.byteLength)throw Error("Template length mismatch");let d=await c.arrayBuffer(),e=await crypto.subtle.digest("SHA-256",d),f=Array.from(new Uint8Array(e),a=>a.toString(16).padStart(2,"0")).join("");if(g.throwIfAborted(),f!==b.source.sha256)throw Error("Template integrity mismatch");return new Uint8Array(d)}catch(b){throw g.aborted||a.query.invalidate(u),b}finally{f.stop()}}(a,b,c):(0,e.a)(a,b,c)}},TNqT(a,b,c){var d=c("Rxfy"),e=c("Q840"),f=c("HJEB"),g=c("ldD6"),h=c("lAQI"),i=c("OiCI"),j=c("Cslg"),k=c("Kwur"),l=c("WzdM"),m=c("OWtl"),n=c("zgGI"),o=c("rvFo"),p=c("GDNt"),q=c("ygu7"),r=c("EEop");let s="artifact-template-",t=h.F({schemaVersion:h.z(1),kind:h.z("presentation"),nativePresentation:h.F({schemaVersion:h.z(1),reference:h.L()})}),u=(0,e.r)(m.a,a=>{let{get:b,scope:c}=a,e=b(i.d),h=b(j.j);return{queryKey:["native-presentation-templates",e,h],enabled:null!=e&&null!=h,staleTime:o.b.FIVE_MINUTES,retry:!1,queryFn:async a=>{let{signal:b}=a;v(c,e,h,b);let{plugin_id:i}=await c.query.fetch(q.a,{appId:"connector_openai_default_templates",productContext:"chatgpt"});if(v(c,e,h,b),null==i)return[];let{plugin:j}=await c.queryClient.fetchQuery((0,r.e)(e,i,b,"chatgpt"));v(c,e,h,b);let{id:k,version:l}=j.release;return"ENABLED"!==j.status||null!=j.disabled_reason||null==k||null==l||!(0,g.b)(l)||0>(0,g.a)(l,"0.1.2")?[]:(j.release.skills??[]).flatMap(a=>{let b=a.interface?.icon_large_url;return a.name.startsWith(s)&&"presentation"===(0,d.d)(a.description)&&b?[{id:a.name.slice(s.length),title:a.interface?.display_name||(0,f.a)(a.name.slice(s.length)),thumbnail:b,pluginId:i,releaseId:k,skillName:a.name,skillId:a.plugin_release_skill_id}]:[]})}}});function v(a,b,c,d){if(d.throwIfAborted(),null==b||null==c||a.get(i.d)!==b||a.get(j.j)!==c)throw Error("Template account changed")}c.d(b,{},{a:async function(a,b,d){let e=a.get(i.d),f=a.get(j.j);if(null==e||null==f)throw Error("Template account unavailable");let g=await a.queryClient.fetchQuery({queryKey:["plugins","skill-download",e,f,b.skillId],staleTime:o.b.ONE_MINUTE,retry:!1,queryFn:()=>k.Request.safeGet("/ps/plugins/{plugin_id}/skills/{skill_name}",{parameters:{path:{plugin_id:b.pluginId,skill_name:b.skillName},query:{includeDownloadUrls:!0}},additionalHeaders:{...(0,l.b)("chatgpt"),"ChatGPT-Account-Id":e},signal:d,expectedErrorStatuses:[401,403,404]})});if(v(a,e,f,d),g.plugin_release_id!==b.releaseId||g.plugin_release_skill_id!==b.skillId)throw a.query.invalidate(u),Error("Template release changed");if("ENABLED"!==g.status||null==g.skill_bundle_download_url)throw Error("Template unavailable");let h=await p.b.getInstance().fetch(g.skill_bundle_download_url,{signal:d}),m=await (0,n.a)(h,0x6400000,d),q=await (0,n.a)(new Response(m.stream().pipeThrough(new DecompressionStream("gzip"))),0x6400000,d),{parseTar:r}=await c.e(13996).then(c.bind(c,"zXE4")),s=r(await q.arrayBuffer(),{filter:a=>"file"===a.type}),w=s.find(a=>"artifact-template.json"===a.name);if(null==w||w.size>65536)throw Error("Native template manifest unavailable");let{nativePresentation:x}=t.parse(JSON.parse(w.text)),y=s.find(a=>a.name===x.reference)?.data;if(v(a,e,f,d),!y?.byteLength)throw Error("Native template unavailable");return Uint8Array.from(y)},b:u})}};