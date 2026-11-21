/** Public metadata only; no captured account data or third-party credentials. */
export const PUBLIC_PLUGIN_CATALOG_PROVENANCE = Object.freeze({
  "source": "https://github.com/openai/plugins/blob/d420d13051bffe4543ed39e30fa46b87148e47dd/.agents/plugins/marketplace.json",
  "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
  "generatedAt": "2026-11-16T13:28:58.840Z",
  "marketplaceName": "openai-curated",
  "marketplaceDisplayName": "Codex official",
  "rows": 62,
  "totalMarketplaceEntries": 65,
  "unmaterialized": [
    {
      "name": "crowdstrike-falcon-foundry",
      "source": {
        "source": "url",
        "url": "https://github.com/CrowdStrike/foundry-skills.git"
      }
    },
    {
      "name": "crowdstrike-falcon-fusion",
      "source": {
        "source": "url",
        "url": "https://github.com/CrowdStrike/fusion-skills.git"
      }
    },
    {
      "name": "qodo",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/qodo-ai/qodo-skills.git",
        "path": "codex-packages/qodo"
      }
    }
  ],
  "installationScope": "site-local-public-manifest-registry",
  "externalAccountAuthenticated": false
});
export const PUBLIC_PLUGIN_CATALOG = [
  {
    "id": "plugin_local_20cbb2e260a55e60bf0bbc1e7381abc01b291801",
    "name": "linear",
    "version": "5.0.1",
    "displayName": "Linear",
    "description": "Search, create and update Linear issues, projects, and initiatives. Draft PRDs, write updates, analyze customer requests, and keep plans up to date — all from within ChatGPT",
    "shortDescription": "Plan and build products",
    "longDescription": "Manage issues, projects, and team workflows in Linear from Codex.",
    "developerName": "Linear Orbit, Inc",
    "category": "Productivity",
    "capabilities": [],
    "keywords": [],
    "license": "MIT",
    "websiteURL": "https://linear.app/",
    "privacyPolicyURL": "https://linear.app/privacy",
    "termsOfServiceURL": "https://linear.app/terms",
    "assets": {
      "logo": "./plugin-assets/b39ea6b1db591c86d065265138e473dfb839605a.png",
      "composerIcon": "./plugin-assets/e1849a742fb264ab866e5fbf079f6e30f7e2efaa.svg"
    },
    "appIds": [
      "asdk_app_69a089a326dc8191b32a3f2553f5be2c"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/linear/.codex-plugin/plugin.json",
      "manifestBlobSha": "20cbb2e260a55e60bf0bbc1e7381abc01b291801",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/linear/.codex-plugin/plugin.json",
      "pluginPath": "plugins/linear",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_d4984c67bdf2f0c45bc09ff0d0eccee54181ff24",
    "name": "atlassian-rovo",
    "version": "1.0.6",
    "displayName": "Atlassian Rovo",
    "description": "Manage Jira and Confluence fast",
    "shortDescription": "Manage Jira and Confluence",
    "longDescription": "Manage Jira and Confluence fast",
    "developerName": "Atlassian",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "atlassian",
      "rovo",
      "jira",
      "confluence",
      "issue tracking",
      "project management",
      "knowledge base"
    ],
    "license": "MIT",
    "websiteURL": "https://www.atlassian.com",
    "privacyPolicyURL": "https://www.atlassian.com/legal/privacy-policy",
    "termsOfServiceURL": "https://www.atlassian.com/legal/cloud-terms-of-service",
    "assets": {
      "logo": "./plugin-assets/8cacea98a9d20a2f7cc64d9922c2a89445de82a4.png",
      "logoDark": "./plugin-assets/467e0dd63ed38eb762113b95c0c759bcbe694174.png",
      "composerIcon": "./plugin-assets/859036a677a8e063384221858403663f75f7f8e5.png"
    },
    "appIds": [
      "connector_692de805e3ec8191834719067174a384"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/atlassian-rovo/.codex-plugin/plugin.json",
      "manifestBlobSha": "d4984c67bdf2f0c45bc09ff0d0eccee54181ff24",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/atlassian-rovo/.codex-plugin/plugin.json",
      "pluginPath": "plugins/atlassian-rovo",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_63e226a285b42334abf2df9cf8923eb31631ab49",
    "name": "google-calendar",
    "version": "1.2.6",
    "displayName": "Google Calendar",
    "description": "Connect Google Calendar for scheduling, availability, daily briefs, and event management.",
    "shortDescription": "Manage Google Calendar events",
    "longDescription": "Use Google Calendar to summarize a day, check availability, list calendars, and create, update, or delete events directly from task prompts.",
    "developerName": "OpenAI",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "google-calendar",
      "google",
      "google workspace",
      "calendar",
      "events",
      "meetings",
      "availability",
      "agenda",
      "daily-brief",
      "scheduling",
      "productivity"
    ],
    "license": "MIT",
    "websiteURL": "https://workspace.google.com/products/calendar/",
    "privacyPolicyURL": "https://policies.google.com/privacy",
    "termsOfServiceURL": "https://policies.google.com/terms",
    "assets": {
      "logo": "./plugin-assets/bff45f207803584c8de045af4325ceccd46ce1ba.png",
      "composerIcon": "./plugin-assets/6100f9103f82c64483026bee11bb4b5489a2f7b3.png"
    },
    "appIds": [
      "connector_947e0d954944416db111db556030eea6"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/google-calendar/.codex-plugin/plugin.json",
      "manifestBlobSha": "63e226a285b42334abf2df9cf8923eb31631ab49",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/google-calendar/.codex-plugin/plugin.json",
      "pluginPath": "plugins/google-calendar",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_f416d09c199b27f778109ef8d8c67d99ed56efb5",
    "name": "gmail",
    "version": "0.1.9",
    "displayName": "Gmail",
    "description": "Work with Gmail using the configured Gmail app connector.",
    "shortDescription": "Read and manage Gmail",
    "longDescription": "Use Gmail to summarize inbox activity, draft replies, and organize email threads through the connected Gmail app.",
    "developerName": "OpenAI",
    "category": "Communication",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "gmail",
      "email",
      "google",
      "google workspace",
      "mail",
      "inbox",
      "threads",
      "drafts"
    ],
    "license": "MIT",
    "websiteURL": "https://workspace.google.com/products/gmail/",
    "privacyPolicyURL": "https://policies.google.com/privacy",
    "termsOfServiceURL": "https://policies.google.com/terms",
    "assets": {
      "logo": "./plugin-assets/0dc81cb47f19092d2233d446411603771bdeddf3.png",
      "composerIcon": "./plugin-assets/0dc81cb47f19092d2233d446411603771bdeddf3.png"
    },
    "appIds": [
      "connector_2128aebfecb84f64a069897515042a44"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/gmail/.codex-plugin/plugin.json",
      "manifestBlobSha": "f416d09c199b27f778109ef8d8c67d99ed56efb5",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/gmail/.codex-plugin/plugin.json",
      "pluginPath": "plugins/gmail",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_458ebb8c321b0d7bfb8c98ccc15b71c1430dd97d",
    "name": "slack",
    "version": "0.1.7",
    "displayName": "Slack",
    "description": "Work with Slack using the configured Slack integration.",
    "shortDescription": "Read and manage Slack",
    "longDescription": "Use Slack to summarize channels, draft messages, and organize team conversations through the connected Slack integration.",
    "developerName": "Slack",
    "category": "Communication",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "slack",
      "salesforce",
      "chat",
      "collaboration",
      "messaging",
      "channels",
      "threads",
      "workplace chat"
    ],
    "license": "MIT",
    "websiteURL": "https://slack.com/",
    "privacyPolicyURL": "https://slack.com/privacy-policy",
    "termsOfServiceURL": "https://slack.com/terms-of-service/user",
    "assets": {
      "logo": "./plugin-assets/d06057d7cbe86f6811b9b2845091c5ccabd22454.png",
      "composerIcon": "./plugin-assets/d06057d7cbe86f6811b9b2845091c5ccabd22454.png"
    },
    "appIds": [
      "asdk_app_69a1d78e929881919bba0dbda1f6436d"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/slack/.codex-plugin/plugin.json",
      "manifestBlobSha": "458ebb8c321b0d7bfb8c98ccc15b71c1430dd97d",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/slack/.codex-plugin/plugin.json",
      "pluginPath": "plugins/slack",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_c57ecc83878da2d011a47d01497098eee50669aa",
    "name": "teams",
    "version": "0.1.8",
    "displayName": "Teams",
    "description": "Work with Teams using the configured Microsoft Teams app connector.",
    "shortDescription": "Summarize Teams and follow up",
    "longDescription": "Use Teams to summarize chats, extract actions, and draft channel or meeting follow-ups through the connected Microsoft Teams app.",
    "developerName": "OpenAI",
    "category": "Communication",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "teams",
      "microsoft teams",
      "chat",
      "microsoft",
      "microsoft 365",
      "office 365",
      "meetings",
      "messages",
      "channels",
      "video conferencing"
    ],
    "license": "MIT",
    "websiteURL": "https://www.microsoft.com/en-us/microsoft-teams/group-chat-software",
    "privacyPolicyURL": "https://www.microsoft.com/en-us/privacy/privacystatement",
    "termsOfServiceURL": "https://www.microsoft.com/en-us/servicesagreement/",
    "assets": {
      "logo": "./plugin-assets/3650e38931e8c104631a638bf2aae4f05bbe3c2a.png",
      "composerIcon": "./plugin-assets/3650e38931e8c104631a638bf2aae4f05bbe3c2a.png"
    },
    "appIds": [
      "connector_246af0940da3457da0e751171dc1ce60"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/teams/.codex-plugin/plugin.json",
      "manifestBlobSha": "c57ecc83878da2d011a47d01497098eee50669aa",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/teams/.codex-plugin/plugin.json",
      "pluginPath": "plugins/teams",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_13f852fd249a11368bdf0e52c9c891d38e90f37d",
    "name": "sharepoint",
    "version": "0.1.7",
    "displayName": "SharePoint",
    "description": "Work with SharePoint using the configured Microsoft SharePoint app connector.",
    "shortDescription": "Summarize SharePoint content",
    "longDescription": "Use SharePoint to summarize sites, pages, and files, extract owners and status, and plan safe content updates through the connected Microsoft SharePoint app.",
    "developerName": "OpenAI",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "sharepoint",
      "documents",
      "microsoft",
      "microsoft 365",
      "office 365",
      "onedrive",
      "files",
      "intranet",
      "collaboration"
    ],
    "license": "MIT",
    "websiteURL": "https://www.microsoft.com/en-us/microsoft-365/sharepoint/collaboration",
    "privacyPolicyURL": "https://www.microsoft.com/en-us/privacy/privacystatement",
    "termsOfServiceURL": "https://www.microsoft.com/en-us/servicesagreement/",
    "assets": {
      "logo": "./plugin-assets/816e81eb1b934f5f1ed2b60114bfe893b660e6fa.png",
      "composerIcon": "./plugin-assets/816e81eb1b934f5f1ed2b60114bfe893b660e6fa.png"
    },
    "appIds": [
      "connector_1e4f6a44acf14e3ca1d96672f8c945bc"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/sharepoint/.codex-plugin/plugin.json",
      "manifestBlobSha": "13f852fd249a11368bdf0e52c9c891d38e90f37d",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/sharepoint/.codex-plugin/plugin.json",
      "pluginPath": "plugins/sharepoint",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_bbf036f953b24c47a04e5ad6e6a8ca5b1ff4c760",
    "name": "outlook-email",
    "version": "0.1.7",
    "displayName": "Outlook Email",
    "description": "Work with Outlook Email using the configured Microsoft Outlook app connector.",
    "shortDescription": "Triage Outlook inboxes",
    "longDescription": "Use Outlook Email to triage inboxes, summarize threads, extract actions, and draft replies or forwards through the connected Microsoft Outlook app.",
    "developerName": "OpenAI",
    "category": "Communication",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "outlook-email",
      "outlook",
      "email",
      "microsoft",
      "microsoft 365",
      "office 365",
      "exchange",
      "mail",
      "inbox"
    ],
    "license": "MIT",
    "websiteURL": "https://www.microsoft.com/en-us/microsoft-365/outlook/email-and-calendar-software-microsoft-outlook",
    "privacyPolicyURL": "https://www.microsoft.com/en-us/privacy/privacystatement",
    "termsOfServiceURL": "https://www.microsoft.com/en-us/servicesagreement/",
    "assets": {
      "logo": "./plugin-assets/cd77f5a93a7b0c875bb1fb68be608cbbeac2d787.png",
      "composerIcon": "./plugin-assets/cd77f5a93a7b0c875bb1fb68be608cbbeac2d787.png"
    },
    "appIds": [
      "connector_4aaab2856305417b993eca9a216aaf6e"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/outlook-email/.codex-plugin/plugin.json",
      "manifestBlobSha": "bbf036f953b24c47a04e5ad6e6a8ca5b1ff4c760",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/outlook-email/.codex-plugin/plugin.json",
      "pluginPath": "plugins/outlook-email",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_6964db7ee34188cc5f345833cd514250731dbc93",
    "name": "outlook-calendar",
    "version": "0.1.8",
    "displayName": "Outlook Calendar",
    "description": "Connect Microsoft Outlook Calendar for scheduling, daily briefs, event prep, and safe meeting changes.",
    "shortDescription": "Manage Outlook schedules",
    "longDescription": "Use Outlook Calendar to summarize a day, compare availability, prepare for meetings, explain Outlook status semantics, and schedule, reschedule, or cancel events through the connected Microsoft Outlook app.",
    "developerName": "OpenAI",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "outlook-calendar",
      "outlook",
      "calendar",
      "microsoft",
      "microsoft 365",
      "office 365",
      "exchange",
      "events",
      "meetings",
      "availability",
      "scheduling",
      "teams",
      "daily-brief",
      "meeting-prep"
    ],
    "license": "MIT",
    "websiteURL": "https://www.microsoft.com/en-us/microsoft-365/outlook/calendar-app",
    "privacyPolicyURL": "https://www.microsoft.com/en-us/privacy/privacystatement",
    "termsOfServiceURL": "https://www.microsoft.com/en-us/servicesagreement/",
    "assets": {
      "logo": "./plugin-assets/cd77f5a93a7b0c875bb1fb68be608cbbeac2d787.png",
      "composerIcon": "./plugin-assets/cd77f5a93a7b0c875bb1fb68be608cbbeac2d787.png"
    },
    "appIds": [
      "connector_e6a7394682e24467ac68c60696f275a4"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/outlook-calendar/.codex-plugin/plugin.json",
      "manifestBlobSha": "6964db7ee34188cc5f345833cd514250731dbc93",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/outlook-calendar/.codex-plugin/plugin.json",
      "pluginPath": "plugins/outlook-calendar",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_229c7c92c05cae6ce51cb1cdc9eafc339253df9b",
    "name": "canva",
    "version": "14.0.0",
    "displayName": "Canva",
    "description": "Bring your Canva design workflow into Codex and create, refine, and review designs through natural conversation.\nAvailable skills:\nResize for social media: Adapt a design for Facebook, Instagram, and LinkedIn in one step.\nBulk create: Generate multiple designs from spreadsheet data using a brand template.\nEdit designs: Update text, media, and formatting, or reposition and resize elements.\nGet design feedback: Receive structured feedback on visual hierarchy, layout, readability, consistency, and accessibility.\nImplement feedback: Review comment threads and apply clear, actionable changes.\nBrand check: Check colors, fonts, logo usage, and copy against your Brand Kit.\nOnce installed, describe what you want in plain language or invoke Canva directly with @Canva.\nTry prompts like:\n- @Canva, resize this design for social media.\n- @Canva, create designs from this spreadsheet using my brand template.\n- @Canva, update the headline in this design.\n- @Canva, review this design’s visual hierarchy and readability.\n- @Canva, implement the feedback in the comment threads.\n- @Canva, check this design against my Brand Kit.\n\nRequirements: Connect your Canva account to use the plugin. Bulk Create requires an eligible Canva Enterprise plan.\n\nWant to take a more hands-on approach? Instantly open your design in Canva’s powerful editor for the final touches.",
    "shortDescription": "Create, review, edit designs",
    "longDescription": "Bring your Canva design workflow into Codex and create, refine, and review designs through natural conversation.\nAvailable skills:\nResize for social media: Adapt a design for Facebook, Instagram, and LinkedIn in one step.\nBulk create: Generate multiple designs from spreadsheet data using a brand template.\nEdit designs: Update text, media, and formatting, or reposition and resize elements.\nGet design feedback: Receive structured feedback on visual hierarchy, layout, readability, consistency, and accessibility.\nImplement feedback: Review comment threads and apply clear, actionable changes.\nBrand check: Check colors, fonts, logo usage, and copy against your Brand Kit.\nOnce installed, describe what you want in plain language or invoke Canva directly with @Canva.\nTry prompts like:\n- @Canva, resize this design for social media.\n- @Canva, create designs from this spreadsheet using my brand template.\n- @Canva, update the headline in this design.\n- @Canva, review this design’s visual hierarchy and readability.\n- @Canva, implement the feedback in the comment threads.\n- @Canva, check this design against my Brand Kit.\n\nRequirements: Connect your Canva account to use the plugin. Bulk Create requires an eligible Canva Enterprise plan.\n\nWant to take a more hands-on approach? Instantly open your design in Canva’s powerful editor for the final touches.",
    "developerName": "Canva Pty Ltd.",
    "category": "Creativity",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://www.canva.com",
    "privacyPolicyURL": "https://www.canva.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://www.canva.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/ba9e690d097afbf83226d8e15fdfd6acc11ccc30.png",
      "composerIcon": "./plugin-assets/0e29ead9e1e5ae8a52247bce8b0de23a1a96293e.png"
    },
    "appIds": [
      "connector_68df33b1a2d081918778431a9cfca8ba"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/canva/.codex-plugin/plugin.json",
      "manifestBlobSha": "229c7c92c05cae6ce51cb1cdc9eafc339253df9b",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/canva/.codex-plugin/plugin.json",
      "pluginPath": "plugins/canva",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_cd1940f458e9a135c1f1e81b6bcd4e6298435945",
    "name": "figma",
    "version": "2.0.20",
    "displayName": "Figma",
    "description": "Figma workflows for design implementation, Code Connect templates, and design system rule generation.",
    "shortDescription": "Figma design-to-code workflows",
    "longDescription": "Figma workflows for implementing designs in code, creating Code Connect templates for published Figma components, and generating project-specific design system rules for repeatable Figma-to-code work.",
    "developerName": "Figma",
    "category": "Creativity",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "figma",
      "design",
      "prototyping",
      "collaboration",
      "developer handoff",
      "design systems",
      "design-to-code",
      "ui-implementation",
      "code-connect",
      "design-system"
    ],
    "license": "LicenseRef-Figma-Developer-Terms",
    "websiteURL": "https://www.figma.com",
    "privacyPolicyURL": "https://www.figma.com/legal/privacy/",
    "termsOfServiceURL": "https://www.figma.com/legal/developer-terms/",
    "assets": {
      "logo": "./plugin-assets/a440869869daecb30454f9f25c8b4539b12d87b3.png",
      "logoDark": "./plugin-assets/a440869869daecb30454f9f25c8b4539b12d87b3.png",
      "composerIcon": "./plugin-assets/a440869869daecb30454f9f25c8b4539b12d87b3.png"
    },
    "appIds": [
      "connector_68df038e0ba48191908c8434991bbac2"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/figma/.codex-plugin/plugin.json",
      "manifestBlobSha": "cd1940f458e9a135c1f1e81b6bcd4e6298435945",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/figma/.codex-plugin/plugin.json",
      "pluginPath": "plugins/figma",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_94c0eb23c48489d55e512f9e2c6530b55d254b31",
    "name": "stripe",
    "version": "7.0.0",
    "displayName": "Stripe",
    "description": "Develop your payments integration faster with the ability to create products, prices, and payment links directly in ChatGPT. Run your business from ChatGPT with the ability to retrieve and manage payments, subscriptions, invoices, refunds, disputes, and customers. Build and debug your payment integration quicker than ever by searching the Stripe documentation and getting integration recommendations without needing to leave ChatGPT.",
    "shortDescription": "Accept payments. Grow revenue.",
    "longDescription": "Develop your payments integration faster with the ability to create products, prices, and payment links directly in ChatGPT. Run your business from ChatGPT with the ability to retrieve and manage payments, subscriptions, invoices, refunds, disputes, and customers. Build and debug your payment integration quicker than ever by searching the Stripe documentation and getting integration recommendations without needing to leave ChatGPT.",
    "developerName": "Stripe",
    "category": "Finance",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://stripe.com",
    "privacyPolicyURL": "https://stripe.com/privacy",
    "termsOfServiceURL": "https://stripe.com/legal/ssa",
    "assets": {
      "logo": "./plugin-assets/c905484b3ea18e631196c1b4f635b2df58233aaa.png",
      "composerIcon": "./plugin-assets/c905484b3ea18e631196c1b4f635b2df58233aaa.png"
    },
    "appIds": [
      "asdk_app_6983c208e5f8819196b7511519f97993"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/stripe/.codex-plugin/plugin.json",
      "manifestBlobSha": "94c0eb23c48489d55e512f9e2c6530b55d254b31",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/stripe/.codex-plugin/plugin.json",
      "pluginPath": "plugins/stripe",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_3a8eebb1607a487b5fbf1fd97aa03bfc6fbca858",
    "name": "vercel",
    "version": "0.21.4",
    "displayName": "Vercel",
    "description": "Build and deploy web apps and agents",
    "shortDescription": "Build and deploy web apps and agents",
    "longDescription": "Bring Vercel ecosystem guidance into Codex with curated skills and the connected Vercel app. Packages the upstream vercel/vercel-plugin skills, agents, and commands under the local `vercel` plugin identity for the Codex plugin marketplace.",
    "developerName": "Vercel Labs",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "vercel",
      "nextjs",
      "ai-sdk",
      "turborepo",
      "turbopack",
      "workflow",
      "deployment",
      "edge-functions",
      "serverless",
      "ai-gateway",
      "chat-sdk",
      "chat-bot",
      "slack-bot",
      "discord-bot"
    ],
    "license": "Apache-2.0",
    "websiteURL": "https://vercel.com/",
    "privacyPolicyURL": "https://vercel.com/legal/privacy-policy",
    "termsOfServiceURL": "https://vercel.com/legal/terms",
    "assets": {
      "logo": "./plugin-assets/afc7dae4eecc475f6f03ef854ef83664e39e2cd7.png",
      "composerIcon": "./plugin-assets/afc7dae4eecc475f6f03ef854ef83664e39e2cd7.png"
    },
    "appIds": [
      "connector_690a90ec05c881918afb6a55dc9bbaa1"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/vercel/.codex-plugin/plugin.json",
      "manifestBlobSha": "3a8eebb1607a487b5fbf1fd97aa03bfc6fbca858",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/vercel/.codex-plugin/plugin.json",
      "pluginPath": "plugins/vercel",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_5e44d10c60c6415130c5f8442e60577be257979c",
    "name": "game-studio",
    "version": "0.1.2",
    "displayName": "Game Studio",
    "description": "Design, prototype, and ship browser games with guided 2D and 3D workflows, asset pipelines, and playtesting support.",
    "shortDescription": "Design, prototype, and ship browser games",
    "longDescription": "Plan, prototype, and build browser games with guided workflows for gameplay systems, UI, asset pipelines, and playtesting across 2D and 3D projects.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "games",
      "phaser",
      "threejs",
      "react-three-fiber",
      "gltf",
      "rapier",
      "webgl",
      "sprites",
      "playtest"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/6415b68216c22c88ea1bb006e814836a6ee511c0.png",
      "composerIcon": "./plugin-assets/bb7846b910640c1ad905126a93a428075dd3b0de.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/game-studio/.codex-plugin/plugin.json",
      "manifestBlobSha": "5e44d10c60c6415130c5f8442e60577be257979c",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/game-studio/.codex-plugin/plugin.json",
      "pluginPath": "plugins/game-studio",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_688466c0ae3df4f8ea5b0dc707e37ea3501e233a",
    "name": "superpowers",
    "version": "6.3.0",
    "displayName": "Superpowers",
    "description": "An agentic skills framework & software development methodology that works: planning, TDD, debugging, and collaboration workflows.",
    "shortDescription": "Plan, develop, and debug code",
    "longDescription": "Use Superpowers to guide agent work through brainstorming, implementation planning, test-driven development, systematic debugging, parallel execution, code review, and finish-the-branch workflows.",
    "developerName": "Jesse Vincent",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "brainstorming",
      "subagent-driven-development",
      "skills",
      "planning",
      "tdd",
      "debugging",
      "code-review",
      "workflow"
    ],
    "license": "MIT",
    "websiteURL": "https://github.com/obra/superpowers",
    "privacyPolicyURL": "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
    "termsOfServiceURL": "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
    "assets": {
      "logo": "./plugin-assets/25518da4625e850d97b15a9e0a27e7115969dc0d.png",
      "composerIcon": "./plugin-assets/c514fe33a692cfaf4f6321e9e6c520df6a8d2769.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/superpowers/.codex-plugin/plugin.json",
      "manifestBlobSha": "688466c0ae3df4f8ea5b0dc707e37ea3501e233a",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/superpowers/.codex-plugin/plugin.json",
      "pluginPath": "plugins/superpowers",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_d7076e4fce7a530e2ce05167c8280a1b21af0d96",
    "name": "github",
    "version": "0.1.12",
    "displayName": "GitHub",
    "description": "Inspect repositories, triage pull requests and issues, debug CI, and publish changes through a hybrid GitHub connector and CLI workflow.",
    "shortDescription": "Triage PRs, issues, CI, and publish flows",
    "longDescription": "Use GitHub to inspect repositories, review pull requests, address feedback, debug failing Actions checks, and prepare code changes for review through a connector-first workflow with targeted CLI fallbacks.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "github",
      "microsoft",
      "git",
      "repositories",
      "source control",
      "pull requests",
      "github actions",
      "ci/cd",
      "pull-request",
      "code-review",
      "issues",
      "ci",
      "actions"
    ],
    "license": "MIT",
    "websiteURL": "https://github.com/",
    "privacyPolicyURL": "https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement",
    "termsOfServiceURL": "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
    "assets": {
      "logo": "./plugin-assets/78484912328c3f792d596c5e0ff64afdf21ddc7c.png",
      "logoDark": "./plugin-assets/be60628d18c64384609fe488c74ce955747d67f6.png",
      "composerIcon": "./plugin-assets/828e9d9d1d29e1a525a1aeee5eb1e4162249c77e.svg"
    },
    "appIds": [
      "connector_76869538009648d5b282a4bb21c3d157",
      "templated_apps_GitHubEnterprise"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/github/.codex-plugin/plugin.json",
      "manifestBlobSha": "d7076e4fce7a530e2ce05167c8280a1b21af0d96",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/github/.codex-plugin/plugin.json",
      "pluginPath": "plugins/github",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_6be0e00976d795c2bd04c8dc976c626a5ed1de44",
    "name": "circleci",
    "version": "1.0.4",
    "displayName": "CircleCI",
    "description": "Build, test, and deploy any application",
    "shortDescription": "Build, test, and deploy any application",
    "longDescription": "Bring testing, deployment, and CI best practices into Codex",
    "developerName": "CircleCI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "circleci",
      "ci/cd",
      "ci"
    ],
    "license": "MIT",
    "websiteURL": "https://circleci.com",
    "privacyPolicyURL": "https://circleci.com/legal/privacy-policy",
    "termsOfServiceURL": "https://circleci.com/legal/terms-of-service",
    "assets": {
      "logo": "./plugin-assets/98a87e9cfb910268e3e841e8cf2fe5d727415778.png",
      "logoDark": "./plugin-assets/076e9adbf5f3fbe5e66df5187a119116e58d2449.png",
      "composerIcon": "./plugin-assets/77bc0764bc114f7d600e03c7aab40cb45af32796.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/circleci/.codex-plugin/plugin.json",
      "manifestBlobSha": "6be0e00976d795c2bd04c8dc976c626a5ed1de44",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/circleci/.codex-plugin/plugin.json",
      "pluginPath": "plugins/circleci",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_455bb7fc47941844ff99ee77521758560d38a4c3",
    "name": "google-drive",
    "version": "0.1.15",
    "displayName": "Google Drive",
    "description": "Use Google Drive as the single entrypoint for Drive, Docs, Sheets, and Slides work.",
    "shortDescription": "Drive, Docs, Sheets or Slides",
    "longDescription": "Use Google Drive as one unified Google file plugin for search, file organization, sharing, and Google Docs, Google Sheets, and Google Slides workflows.",
    "developerName": "OpenAI",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "google-drive",
      "google",
      "google workspace",
      "drive",
      "docs",
      "sheets",
      "slides",
      "files",
      "google-docs",
      "google-sheets",
      "google-slides",
      "productivity"
    ],
    "license": "MIT",
    "websiteURL": "https://workspace.google.com/products/drive/",
    "privacyPolicyURL": "https://policies.google.com/privacy",
    "termsOfServiceURL": "https://policies.google.com/terms",
    "assets": {
      "logo": "./plugin-assets/bb4505e5d85cbc421c08df46f3211dd4928c009e.png",
      "composerIcon": "./plugin-assets/bb4505e5d85cbc421c08df46f3211dd4928c009e.png"
    },
    "appIds": [
      "connector_5f3c8c41a1e54ad7a76272c89e2554fa"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/google-drive/.codex-plugin/plugin.json",
      "manifestBlobSha": "455bb7fc47941844ff99ee77521758560d38a4c3",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/google-drive/.codex-plugin/plugin.json",
      "pluginPath": "plugins/google-drive",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_cd44e632db0d831ba0ec4a68d1a2687af5ac821f",
    "name": "notion",
    "version": "0.1.7",
    "displayName": "Notion",
    "description": "Notion workflows for implementation planning, research synthesis, meeting preparation, and knowledge capture.",
    "shortDescription": "Notion workflows for specs, research, meetings, and knowledge capture",
    "longDescription": "Notion workflows for turning specs into implementation plans, synthesizing research into structured documentation, preparing meeting materials with workspace context, and capturing decisions or conversations into durable knowledge pages.",
    "developerName": "Notion",
    "category": "Productivity",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "notion",
      "wiki",
      "notes",
      "docs",
      "projects",
      "databases",
      "documentation",
      "research",
      "meeting-prep",
      "knowledge-management",
      "planning"
    ],
    "license": "MIT",
    "websiteURL": "https://www.notion.so/",
    "privacyPolicyURL": "https://www.notion.com/help/privacy",
    "termsOfServiceURL": "https://www.notion.so/legal/terms-of-use",
    "assets": {
      "logo": "./plugin-assets/0df7e06ef5e50b57af4b36ecf54e3fce8ef9fd23.png",
      "logoDark": "./plugin-assets/ba627f80d898a63e2e604e8e1a2a859c7b7d4d14.png",
      "composerIcon": "./plugin-assets/213238bc03606157bceccb6508f60a00579d4c4b.svg"
    },
    "appIds": [
      "asdk_app_69c18c28f1188191bf5b8445c4ab0a2e"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/notion/.codex-plugin/plugin.json",
      "manifestBlobSha": "cd44e632db0d831ba0ec4a68d1a2687af5ac821f",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/notion/.codex-plugin/plugin.json",
      "pluginPath": "plugins/notion",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_bd6458b16d83a29231f5ef7b3f405ce090611982",
    "name": "cloudflare",
    "version": "0.1.2",
    "displayName": "Cloudflare",
    "description": "Cloudflare platform plugin with curated skills for Workers, Wrangler, and Agents SDK plus the official Cloudflare API MCP server.",
    "shortDescription": "Cloudflare platform guidance with official MCP",
    "longDescription": "Bring Cloudflare platform guidance into Codex with curated skills for the broader platform, Wrangler CLI, and the Agents SDK, plus the official Cloudflare API MCP server for authenticated access to live account data and workflows across Workers, Pages, storage, AI, networking, security, and analytics services.",
    "developerName": "Cloudflare",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "cloudflare",
      "workflow",
      "deployment",
      "edge-functions",
      "edge",
      "analytics",
      "wrangler",
      "agents-sdk",
      "serverless",
      "ai-gateway"
    ],
    "license": "MIT",
    "websiteURL": "https://workers.cloudflare.com/",
    "privacyPolicyURL": "https://www.cloudflare.com/privacypolicy/",
    "termsOfServiceURL": "https://www.cloudflare.com/website-terms/",
    "assets": {
      "logo": "./plugin-assets/cf23088bbb1fec745d4ef350b8002a9b5ae42ca8.png",
      "composerIcon": "./plugin-assets/7feedbc2b37ff9f28f81d30aff52e605090bee86.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/cloudflare/.codex-plugin/plugin.json",
      "manifestBlobSha": "bd6458b16d83a29231f5ef7b3f405ce090611982",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/cloudflare/.codex-plugin/plugin.json",
      "pluginPath": "plugins/cloudflare",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_34932f367c83808df0a8579eb88b8d6dae604315",
    "name": "sentry",
    "version": "0.1.2",
    "displayName": "Sentry",
    "description": "Inspect recent issues and events in Sentry from Codex.",
    "shortDescription": "Inspect recent Sentry issues and events",
    "longDescription": "Use Sentry skills to inspect recent issues, review events, and summarize production errors with a read-only workflow.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "sentry",
      "observability",
      "triage"
    ],
    "license": "MIT",
    "websiteURL": "https://sentry.io/",
    "privacyPolicyURL": "https://sentry.io/privacy/",
    "termsOfServiceURL": "https://sentry.io/terms/",
    "assets": {
      "logo": "./plugin-assets/9f8ddce8ec2076606540ad6c8ac1b9b1eea2924c.png",
      "composerIcon": "./plugin-assets/6b975c1266c665c73034959d00fc8881b288d931.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/sentry/.codex-plugin/plugin.json",
      "manifestBlobSha": "34932f367c83808df0a8579eb88b8d6dae604315",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/sentry/.codex-plugin/plugin.json",
      "pluginPath": "plugins/sentry",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_cea374fe5d45bf09a93826d21cce102208152fa7",
    "name": "build-ios-apps",
    "version": "0.1.2",
    "displayName": "Build iOS Apps",
    "description": "Build iOS apps with workflows for App Intents, SwiftUI UI work, Simulator mirroring in the Codex in-app browser, performance profiling, leak investigation, and simulator debugging.",
    "shortDescription": "Build, refine, and debug iOS apps with App Intents, SwiftUI, and Xcode workflows",
    "longDescription": "Use Build iOS Apps to design App Intents and App Shortcuts, build or refactor SwiftUI UI, render SwiftUI previews in the Codex in-app browser, adopt modern iOS patterns such as Liquid Glass, audit runtime performance, capture ETTrace profiles, investigate memory leaks, and debug apps on simulators with XcodeBuildMCP-backed workflows.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "ios",
      "swift",
      "swiftui",
      "app-intents",
      "shortcuts",
      "siri",
      "spotlight",
      "xcode",
      "performance",
      "debugging",
      "previews"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/d1167805cd9c63a08ec95bd9487a3a27bcb058f6.png",
      "composerIcon": "./plugin-assets/4eee97cc036e41682c1e4e3bbfa5212fd09abcc3.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/build-ios-apps/.codex-plugin/plugin.json",
      "manifestBlobSha": "cea374fe5d45bf09a93826d21cce102208152fa7",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/build-ios-apps/.codex-plugin/plugin.json",
      "pluginPath": "plugins/build-ios-apps",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_78ae3298c49b3903933000114e2019299872de2c",
    "name": "build-macos-apps",
    "version": "0.1.4",
    "displayName": "Build macOS Apps",
    "description": "Build, run, test, debug, instrument, and implement local macOS apps using Xcode, SwiftUI, AppKit interop, unified logging, and shell-first desktop workflows.",
    "shortDescription": "Build, debug, instrument, and implement macOS apps with SwiftUI and AppKit guidance",
    "longDescription": "macOS development workflows for discovering local projects, building and running desktop apps, implementing native SwiftUI scenes, bridging into AppKit when necessary, adding lightweight Logger telemetry, triaging test failures, inspecting signing and entitlements, and debugging desktop-specific build or runtime errors.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "macos",
      "swift",
      "swiftui",
      "appkit",
      "xcode",
      "swiftpm",
      "debugging",
      "codesign",
      "logging",
      "telemetry",
      "oslog"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/d1167805cd9c63a08ec95bd9487a3a27bcb058f6.png",
      "composerIcon": "./plugin-assets/2cc64d12100d47a584b9ad7abe8767b7263397bd.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/build-macos-apps/.codex-plugin/plugin.json",
      "manifestBlobSha": "78ae3298c49b3903933000114e2019299872de2c",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/build-macos-apps/.codex-plugin/plugin.json",
      "pluginPath": "plugins/build-macos-apps",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_73b8b918db5c6339172aba5994c4db669dcf4133",
    "name": "build-web-apps",
    "version": "0.1.2",
    "displayName": "Build Web Apps",
    "description": "Build web apps with frontend asset design, browser testing, UI components, payments, and database guidance.",
    "shortDescription": "Build frontend-focused web apps with generated assets, browser testing, payments, and databases",
    "longDescription": "Use Build Web Apps to create frontend application surfaces with Codex-generated visual assets, verify them with the Browser plugin and built-in app browser, compose shadcn/ui, wire Stripe payments, and design or tune Supabase/Postgres data flows.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "build-web-apps",
      "build",
      "product-apps",
      "frontend",
      "image-generation",
      "browser-testing",
      "frontend-debugging",
      "stripe",
      "supabase",
      "shadcn",
      "full-stack",
      "frontend-qa"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/7edb12f9819ae71dc55b35fa8a93f93845d084bc.png",
      "composerIcon": "./plugin-assets/019e4429fcafd993a9bd2a38ba96b7e27a44830c.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/build-web-apps/.codex-plugin/plugin.json",
      "manifestBlobSha": "73b8b918db5c6339172aba5994c4db669dcf4133",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/build-web-apps/.codex-plugin/plugin.json",
      "pluginPath": "plugins/build-web-apps",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_86b325f117e87115e44ad3311532e5a615833e57",
    "name": "build-web-data-visualization",
    "version": "0.1.21",
    "displayName": "Build Web Data Visualization",
    "description": "Design, critique, implement, test, and export web data visualizations in Codex, including charts, maps, dashboards, Gantt, UML, scrollytelling, reports, slides, mobile views, shareable state, and advanced WebGL concepts.",
    "shortDescription": "Design, build, test, and export web data visualizations",
    "longDescription": "Use Build Web Data Visualization to choose, design, implement, test, and export browser charts, dashboards, maps, WebGL/Three.js scenes, Canvas/D3 visuals, Gantt charts, UML/software diagrams, scrollytelling, reports, PDFs, and slide decks. It emphasizes source-backed data, accessible responsive layouts, URL-shareable analysis state, and concept-first design for advanced visual stories.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "build-web-data-visualization",
      "web-data-visualization",
      "data-visualization",
      "charts",
      "dashboards",
      "maps",
      "geospatial",
      "vega-lite",
      "observable-plot",
      "d3",
      "canvas",
      "webgl",
      "threejs",
      "react",
      "nextjs",
      "typescript",
      "svg",
      "accessibility",
      "testing",
      "visual-regression",
      "reports",
      "slides",
      "infographics",
      "scrollytelling",
      "parallax",
      "gantt",
      "uml",
      "software-architecture",
      "graph-layout",
      "node-link",
      "mobile",
      "responsive",
      "shareable-state",
      "visual-design",
      "visual-design-contract",
      "color-contrast",
      "uncertainty",
      "export",
      "diagrams",
      "operational-workspaces",
      "humanitarian",
      "geopolitical"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/5b975d1f20c018636f0a36d18d19ef23e356e1c0.svg",
      "composerIcon": "./plugin-assets/a3a9a14854c8c54cc1bf9fda159cb97353091fb7.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/build-web-data-visualization/.codex-plugin/plugin.json",
      "manifestBlobSha": "86b325f117e87115e44ad3311532e5a615833e57",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/build-web-data-visualization/.codex-plugin/plugin.json",
      "pluginPath": "plugins/build-web-data-visualization",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_37b05a5092a6ea69a7c4347b97e9d524dae131a0",
    "name": "test-android-apps",
    "version": "0.1.2",
    "displayName": "Test Android Apps",
    "description": "Test Android apps with emulator workflows for reproduction, screenshots, UI inspection, log capture, and performance profiling.",
    "shortDescription": "Reproduce issues, inspect UI, and capture performance evidence from Android emulators",
    "longDescription": "Use Test Android Apps to build and install app variants, drive a booted Android emulator with adb input events, inspect UI trees, capture screenshots, collect logcat output, and gather Simpleperf, Perfetto, gfxinfo, or memory/leak evidence while reproducing issues.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read"
    ],
    "keywords": [
      "android",
      "adb",
      "emulator",
      "qa",
      "logcat",
      "uiautomator",
      "performance",
      "simpleperf",
      "perfetto",
      "memory",
      "leaks",
      "heap"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/ba1297cbc5f76420725c85b718510a4ef2a84809.png",
      "composerIcon": "./plugin-assets/14c5837067505273760670bde8cd6eb9ac38c242.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/test-android-apps/.codex-plugin/plugin.json",
      "manifestBlobSha": "37b05a5092a6ea69a7c4347b97e9d524dae131a0",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/test-android-apps/.codex-plugin/plugin.json",
      "pluginPath": "plugins/test-android-apps",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_40348aa1f40668db7df46de54c9356223ffa40dd",
    "name": "life-science-research",
    "version": "1.0.3",
    "displayName": "Life Science Research",
    "description": "General life-sciences research workflows with query routing, evidence synthesis, and optional parallel subagent analysis across genetics, omics, biology, chemistry, structure, clinical evidence, and public dataset discovery.",
    "shortDescription": "General life-sciences research with routing, evidence synthesis, and optional parallel subagent analysis",
    "longDescription": "Internal life-science research workflows that help Codex interpret a user's research question, normalize the relevant entities, choose the right skills, and synthesize evidence-backed answers across public resources. The plugin spans human genetics, functional genomics, expression, pathways, protein structure, chemistry, pharmacology, literature, clinical evidence, and public study discovery, with a research-router entrypoint for broad tasks and optional subagent-assisted parallel work when evidence lanes are independent.",
    "developerName": "OpenAI",
    "category": "Education & Research",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "life-science",
      "research",
      "bioinformatics",
      "human-genetics",
      "functional-genomics",
      "transcriptomics",
      "proteomics",
      "metabolomics",
      "clinical-research",
      "drug-discovery",
      "skill-routing",
      "evidence-synthesis",
      "parallel-analysis",
      "gwas",
      "variant-interpretation",
      "pathway-biology",
      "protein-structure"
    ],
    "license": "Proprietary",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/row-privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/row-terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/a3a7ce94b70a565df5506c8db89707abdfead4d9.png",
      "composerIcon": "./plugin-assets/a3a7ce94b70a565df5506c8db89707abdfead4d9.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/life-science-research/.codex-plugin/plugin.json",
      "manifestBlobSha": "40348aa1f40668db7df46de54c9356223ffa40dd",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/life-science-research/.codex-plugin/plugin.json",
      "pluginPath": "plugins/life-science-research",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_4ee11c11e6dec7dd4743f315f1891a85af265eec",
    "name": "zotero",
    "version": "0.1.2",
    "displayName": "Zotero",
    "description": "Work with Zotero from Codex: search your library, export BibTeX, insert citations, and import references through the Zotero desktop app.",
    "shortDescription": "Find papers and add citations from Zotero",
    "longDescription": "Connect Codex to your Zotero desktop library so it can find saved papers, export BibTeX, add citation keys to drafts, read indexed attachment text when you ask, and import new reference records into Zotero with your approval.",
    "developerName": "OpenAI",
    "category": "Education & Research",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "zotero",
      "citations",
      "bibliography",
      "bibtex",
      "references",
      "research",
      "papers",
      "latex"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/c7cc5a5ce96a5ca009aba48864c98fc41f994697.png",
      "composerIcon": "./plugin-assets/c7cc5a5ce96a5ca009aba48864c98fc41f994697.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/zotero/.codex-plugin/plugin.json",
      "manifestBlobSha": "4ee11c11e6dec7dd4743f315f1891a85af265eec",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/zotero/.codex-plugin/plugin.json",
      "pluginPath": "plugins/zotero",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_f2d71cd8cbe5f6bea6bfd1543e7f3c4e22de867b",
    "name": "expo",
    "version": "1.0.2",
    "displayName": "Expo",
    "description": "Official Expo skills for building, deploying, upgrading, and debugging Expo and React Native apps.",
    "shortDescription": "Build, deploy, upgrade, and debug Expo and React Native apps",
    "longDescription": "Official Expo-authored skills for building Expo Router UI, authoring API routes, configuring data fetching and styling, writing Expo native modules, creating dev clients, upgrading Expo SDKs, wiring Codex app Run actions, and deploying Expo apps with EAS workflows, builds, hosting, TestFlight, App Store, and Play Store guidance.",
    "developerName": "Expo",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "expo",
      "react-native",
      "expo-router",
      "codex-run-actions",
      "eas",
      "mobile",
      "ios",
      "android",
      "deployment",
      "upgrades",
      "native-modules"
    ],
    "license": "MIT",
    "websiteURL": "https://expo.dev/",
    "privacyPolicyURL": "https://expo.dev/privacy",
    "termsOfServiceURL": "https://expo.dev/terms",
    "assets": {
      "logo": "./plugin-assets/e2a35b125ad215d1ae7d542dbf813fe35f4b4301.png",
      "composerIcon": "./plugin-assets/e2a35b125ad215d1ae7d542dbf813fe35f4b4301.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/expo/.codex-plugin/plugin.json",
      "manifestBlobSha": "f2d71cd8cbe5f6bea6bfd1543e7f3c4e22de867b",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/expo/.codex-plugin/plugin.json",
      "pluginPath": "plugins/expo",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_807e1e56eb5a06ac541e48bcd69f3be29ccb4b8f",
    "name": "coderabbit",
    "version": "1.1.4",
    "displayName": "CodeRabbit",
    "description": "AI-powered code review in Codex, powered by CodeRabbit.",
    "shortDescription": "Run AI-powered code review for your current changes",
    "longDescription": "Run CodeRabbit review workflows in Codex to inspect diffs, surface actionable findings, and turn review output into follow-up fixes.",
    "developerName": "CodeRabbit",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "code-review",
      "ai",
      "coderabbit",
      "codex"
    ],
    "license": "MIT",
    "websiteURL": "https://coderabbit.ai",
    "privacyPolicyURL": "https://www.coderabbit.ai/privacy-policy",
    "termsOfServiceURL": "https://www.coderabbit.ai/terms-of-service",
    "assets": {
      "logo": "./plugin-assets/78f52e6719959f6e9eef858ee5ac488b9a29de14.png",
      "logoDark": "./plugin-assets/84aee0b7bd35614cb28fa612f7a2f877b56098cf.png",
      "composerIcon": "./plugin-assets/5134ec30a380fa33393419d0c824e91aa8c29377.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/coderabbit/.codex-plugin/plugin.json",
      "manifestBlobSha": "807e1e56eb5a06ac541e48bcd69f3be29ccb4b8f",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/coderabbit/.codex-plugin/plugin.json",
      "pluginPath": "plugins/coderabbit",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_2f5a0e7d4a3bb365eef985647dabe624f5c6ab35",
    "name": "remotion",
    "version": "1.0.7",
    "displayName": "Remotion",
    "description": "Remotion video creation skills — best practices, animations, audio, captions, 3D, and more for building programmatic videos with React.",
    "shortDescription": "Make videos agentically",
    "longDescription": "Build videos programmatically with Remotion and React. Covers animations, timing, audio, captions, 3D, transitions, charts, text effects, and more.",
    "developerName": "Remotion",
    "category": "Creativity",
    "capabilities": [
      "Read",
      "Write"
    ],
    "keywords": [
      "remotion",
      "video",
      "react",
      "animation",
      "composition",
      "rendering",
      "ffmpeg",
      "captions",
      "audio"
    ],
    "license": "MIT",
    "websiteURL": "https://remotion.dev",
    "privacyPolicyURL": "https://www.remotion.dev/privacy",
    "termsOfServiceURL": "https://www.remotion.dev/terms",
    "assets": {
      "logo": "./plugin-assets/ec599a9873af0fb2f0962f868a5665a1e6510992.png",
      "logoDark": "./plugin-assets/ebab07503bfcc32a17157516e3cdd6b4282aac86.png",
      "composerIcon": "./plugin-assets/4ca8b61c1fa1c5084c32354194d87c7e944b306b.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/remotion/.codex-plugin/plugin.json",
      "manifestBlobSha": "2f5a0e7d4a3bb365eef985647dabe624f5c6ab35",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/remotion/.codex-plugin/plugin.json",
      "pluginPath": "plugins/remotion",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_b41eb1de581a8aca540f7d7c5e5fec4426fe2af6",
    "name": "plugin-eval",
    "version": "0.1.2",
    "displayName": "Plugin Eval",
    "description": "Evaluate Codex skills and plugins from chat with a beginner-friendly start command, local-first reports, token budget explanations, and guided benchmarking.",
    "shortDescription": "Start from chat, then evaluate or benchmark locally",
    "longDescription": "Ask Codex to evaluate a plugin or skill, give you a full analysis of a named plugin such as game-studio, explain why it scored that way, show what to fix first, explain its token budget, measure real token usage, benchmark a plugin, or tell you what to run next. Plugin Eval keeps the path engineer-friendly: start with a natural chat request, then use the local `plugin-eval start` entrypoint or the routed workflow command it recommends.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "codex",
      "plugin",
      "skill",
      "evaluation",
      "quality",
      "budget"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/7d8b12a9f1bbea1684b1a896f86578807bf5d940.svg",
      "composerIcon": "./plugin-assets/7d8b12a9f1bbea1684b1a896f86578807bf5d940.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/plugin-eval/.codex-plugin/plugin.json",
      "manifestBlobSha": "b41eb1de581a8aca540f7d7c5e5fec4426fe2af6",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/plugin-eval/.codex-plugin/plugin.json",
      "pluginPath": "plugins/plugin-eval",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_2ed13c04c8c86265f96b241a85dfc2b3ffc067da",
    "name": "granola",
    "version": "1.0.0",
    "displayName": "Granola",
    "description": "Granola MCP connects your meeting history to ChatGPT so your assistant can pull real context from past conversations while you work.\n\nUse MCP when you're already working on something bigger:\n\n-   Writing PRDs or proposals: Pull customer feedback, stakeholder input, and decisions from relevant meetings directly into your draft\n    \n-   Building presentations or reports: Combine insights from multiple conversations with your other research and data\n    \n-   Coding with context: Give your AI the project background, requirements, and technical decisions discussed in planning meetings\n    \n-   Strategic analysis: Merge meeting insights with documents, data, and other sources for comprehensive analysis\n    \nHow it works:\n\nYour AI assistant can search your Granola meetings by topic, person, company, or timeframe - then cite specific conversations in its responses. No more switching tabs to find \"what the customer said\" or \"when we decided that.\"\n\nThe difference:\n\nInstead of copy-pasting meeting notes into prompts, your AI pulls exactly what it needs from your meeting history automatically. You stay focused on the work, not the research or context.",
    "shortDescription": "Add your meeting context",
    "longDescription": "Granola MCP connects your meeting history to Codex so your assistant can pull real context from past conversations while you work.\n\nUse MCP when you're already working on something bigger:\n\n-   Writing PRDs or proposals: Pull customer feedback, stakeholder input, and decisions from relevant meetings directly into your draft\n    \n-   Building presentations or reports: Combine insights from multiple conversations with your other research and data\n    \n-   Coding with context: Give your AI the project background, requirements, and technical decisions discussed in planning meetings\n    \n-   Strategic analysis: Merge meeting insights with documents, data, and other sources for comprehensive analysis\n    \nHow it works:\n\nYour AI assistant can search your Granola meetings by topic, person, company, or timeframe - then cite specific conversations in its responses. No more switching tabs to find \"what the customer said\" or \"when we decided that.\"\n\nThe difference:\n\nInstead of copy-pasting meeting notes into prompts, your AI pulls exactly what it needs from your meeting history automatically. You stay focused on the work, not the research or context.",
    "developerName": "Granola",
    "category": "Productivity",
    "capabilities": [],
    "keywords": [],
    "license": "MIT",
    "websiteURL": "https://www.granola.ai",
    "privacyPolicyURL": "https://help.granola.ai/article/privacy-policy",
    "termsOfServiceURL": "https://help.granola.ai/article/platform-terms-of-service",
    "assets": {
      "logo": "./plugin-assets/4280e756d8aac4bc2d2e359f8d22946368a7c880.png",
      "composerIcon": "./plugin-assets/0e6c9d8742cafd79480bed8377847d0f90e3eda1.png"
    },
    "appIds": [
      "asdk_app_697761cab6f48191b5ed345919a3ce8b"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/granola/.codex-plugin/plugin.json",
      "manifestBlobSha": "2ed13c04c8c86265f96b241a85dfc2b3ffc067da",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/granola/.codex-plugin/plugin.json",
      "pluginPath": "plugins/granola",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_8ed57ff8038341d5092ea8d8858a57f1068addc6",
    "name": "monday-com",
    "version": "2.0.0",
    "displayName": "monday.com",
    "description": "The monday.com AI Connector brings core platform capabilities directly to agents and AI assistants. It supports searching boards, creating and updating items and columns, assigning owners, setting timelines, and posting updates — enabling a wide range of work management and CRM use cases across teams and departments.\n\nTeams of people and agents use monday.com as a task tracker and project tracking hub: planning campaigns and events, tracking milestones, dependencies, and workload, managing approval workflows and request intake, and sharing status updates across projects and portfolios — as well as a CRM for managing leads, contacts, and deals.\n\nBeyond day-to-day work management, the connector lets agents answer questions using monday.com's official knowledge base, plan and build automations and multi-step workflows, run and save reusable code actions, and configure other monday.com agents .",
    "shortDescription": "Manage projects, tasks & CRM",
    "longDescription": "The monday.com AI Connector brings core platform capabilities directly to agents and AI assistants. It supports searching boards, creating and updating items and columns, assigning owners, setting timelines, and posting updates — enabling a wide range of work management and CRM use cases across teams and departments.\n\nTeams of people and agents use monday.com as a task tracker and project tracking hub: planning campaigns and events, tracking milestones, dependencies, and workload, managing approval workflows and request intake, and sharing status updates across projects and portfolios — as well as a CRM for managing leads, contacts, and deals.\n\nBeyond day-to-day work management, the connector lets agents answer questions using monday.com's official knowledge base, plan and build automations and multi-step workflows, run and save reusable code actions, and configure other monday.com agents .",
    "developerName": "monday.com",
    "category": "Productivity",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://monday.com",
    "privacyPolicyURL": "https://monday.com/l/privacy/privacy-policy/",
    "termsOfServiceURL": "https://monday.com/terms/tos",
    "assets": {
      "logo": "./plugin-assets/dc9387a5ca4e5dbc46b5bdaafc1c3fd1b6951dc6.png",
      "composerIcon": "./plugin-assets/ec4b33e74d28fea5ede73ebce539b4c485dc6584.png"
    },
    "appIds": [
      "connector_690aabb71bf481918b8d5b614ed3fd4c"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/monday-com/.codex-plugin/plugin.json",
      "manifestBlobSha": "8ed57ff8038341d5092ea8d8858a57f1068addc6",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/monday-com/.codex-plugin/plugin.json",
      "pluginPath": "plugins/monday-com",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_71130c81a2b6c9ce7ffb432925a000a79f4da6dc",
    "name": "temporal",
    "version": "0.4.0",
    "displayName": "Temporal",
    "description": "Comprehensive skill for the entire Temporal lifecycle — developing applications, using the Temporal CLI, running and managing Temporal Server, and working with Temporal Cloud.",
    "shortDescription": "Develop with Temporal",
    "longDescription": "Comprehensive guidance for working with Temporal — developing workflows, activities, and workers across Python, TypeScript, Go, and Java SDKs; using the Temporal CLI for local development and operations; running and managing self-hosted Temporal Server; and working with Temporal Cloud for production deployments.",
    "developerName": "Temporal",
    "category": "Developer Tools",
    "capabilities": [],
    "keywords": [
      "temporal",
      "workflow",
      "durable-execution",
      "python",
      "typescript",
      "go",
      "java",
      "microservices",
      "distributed-systems"
    ],
    "license": "MIT",
    "websiteURL": "https://temporal.io/",
    "privacyPolicyURL": "https://temporal.io/global-privacy-policy",
    "termsOfServiceURL": "https://temporal.io/terms-of-service",
    "assets": {
      "logo": "./plugin-assets/0d7766458403b18f91d544b0a95a660e53824927.svg",
      "composerIcon": "./plugin-assets/0d7766458403b18f91d544b0a95a660e53824927.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/temporal/.codex-plugin/plugin.json",
      "manifestBlobSha": "71130c81a2b6c9ce7ffb432925a000a79f4da6dc",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/temporal/.codex-plugin/plugin.json",
      "pluginPath": "plugins/temporal",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_86bc19cfa74e7e5c9df265f340d40ca438ae2eb4",
    "name": "hyperframes",
    "version": "0.1.2",
    "displayName": "HyperFrames by HeyGen",
    "description": "Write HTML, render video. Compositions, GSAP animations, captions, voiceovers, audio-reactive visuals, and website-to-video capture for HyperFrames.",
    "shortDescription": "Write HTML, render video",
    "longDescription": "Build videos from HTML with HyperFrames. Author compositions with HTML + CSS + GSAP, use the CLI for init/preview/render/transcribe/tts, install reusable registry blocks and components, follow the GSAP animation reference, and turn any website into a video with the 7-step capture-to-video pipeline.",
    "developerName": "HeyGen",
    "category": "Creativity",
    "capabilities": [
      "Read",
      "Write"
    ],
    "keywords": [
      "hyperframes",
      "video",
      "html",
      "gsap",
      "animation",
      "composition",
      "rendering",
      "captions",
      "tts",
      "audio-reactive"
    ],
    "license": "Apache-2.0",
    "websiteURL": "https://hyperframes.heygen.com",
    "privacyPolicyURL": null,
    "termsOfServiceURL": null,
    "assets": {
      "logo": "./plugin-assets/6d58dd2be84b4952bfa4a1db1e56f0e9e097d9b6.png",
      "composerIcon": "./plugin-assets/8ea5284bde712b42c41fdc58a5a3875547c8fe5d.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/hyperframes/.codex-plugin/plugin.json",
      "manifestBlobSha": "86bc19cfa74e7e5c9df265f340d40ca438ae2eb4",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/hyperframes/.codex-plugin/plugin.json",
      "pluginPath": "plugins/hyperframes",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_bbae985515720a2cc55a8a53bee630233c9058fe",
    "name": "supabase",
    "version": "1.0.0",
    "displayName": "Supabase",
    "description": "Manage Supabase projects directly through ChatGPT. Execute SQL queries on PostgreSQL databases, design and modify table schemas, deploy serverless edge functions, and configure user authentication. Access real-time logs for debugging, create and apply database migrations, and manage development branches through natural language.",
    "shortDescription": "Manage and query databases",
    "longDescription": "Official Supabase plugin for Codex. Includes agent skills for Supabase development and Postgres best practices, plus MCP server integration for managing your Supabase projects directly from Codex.",
    "developerName": "Supabase",
    "category": "Developer Tools",
    "capabilities": [
      "Read",
      "Write"
    ],
    "keywords": [
      "supabase",
      "postgres",
      "database",
      "backend",
      "mcp"
    ],
    "license": "MIT",
    "websiteURL": "https://supabase.com",
    "privacyPolicyURL": "https://supabase.com/privacy",
    "termsOfServiceURL": "https://supabase.com/terms",
    "assets": {
      "logo": "./plugin-assets/1dfa720ca49ab85428ccba0936a74f440f0dd2f3.png"
    },
    "appIds": [
      "asdk_app_69d3e5ee6a708191baa733f7b8931995"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/supabase/.codex-plugin/plugin.json",
      "manifestBlobSha": "bbae985515720a2cc55a8a53bee630233c9058fe",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/supabase/.codex-plugin/plugin.json",
      "pluginPath": "plugins/supabase",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_e7e2a9e4fedf1880be0a9be489be78c3080e51b6",
    "name": "codex-security",
    "version": "0.1.32",
    "displayName": "Codex Security",
    "description": "Codex Security workflows for security scans, analysis, and investigation.",
    "shortDescription": "Security scanning for your codebase",
    "longDescription": "Codex Security packages reusable workflows for security scans, analysis, validation, and investigation across code, diffs, and related artifacts.",
    "developerName": "OpenAI",
    "category": "Security",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "security",
      "code-review",
      "diff-review",
      "appsec",
      "threat-modeling"
    ],
    "license": "Proprietary",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/row-privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/row-terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/94c85b2352cf45684630d6efa14d6f00ef4d32b7.png",
      "composerIcon": "./plugin-assets/94c85b2352cf45684630d6efa14d6f00ef4d32b7.png"
    },
    "appIds": [
      "asdk_app_69a089a326dc8191b32a3f2553f5be2c",
      "connector_76869538009648d5b282a4bb21c3d157",
      "connector_692de805e3ec8191834719067174a384"
    ],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/codex-security/.codex-plugin/plugin.json",
      "manifestBlobSha": "e7e2a9e4fedf1880be0a9be489be78c3080e51b6",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/codex-security/.codex-plugin/plugin.json",
      "pluginPath": "plugins/codex-security",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_fae7de87512cdc4a7d2cff757ac827d731876d77",
    "name": "twilio-developer-kit",
    "version": "0.2.2",
    "displayName": "Twilio Developer Kit",
    "description": "Twilio Skills provide procedural knowledge for AI coding agents — which APIs to use, in what order, and what to avoid. Covers Messaging, Voice, Verify, SendGrid, and 30+ products.",
    "shortDescription": "Twilio Skills for building, debugging, and shipping on Twilio",
    "longDescription": "Procedural knowledge that guides AI coding agents to the right Twilio APIs for any use case. Covers channel selection, production best practices, compliance requirements, and common pitfalls across Messaging, Voice, Verify, SendGrid, and 30+ products. Skills follow a progressive disclosure architecture — your agent sees lightweight metadata at startup and loads full guidance only when a task matches.",
    "developerName": "Twilio",
    "category": "Developer Tools",
    "capabilities": [
      "Read",
      "Write"
    ],
    "keywords": [
      "twilio",
      "sms",
      "voice",
      "whatsapp",
      "rcs",
      "messaging",
      "verify",
      "sendgrid",
      "email",
      "compliance",
      "conversation-relay",
      "conversation-memory",
      "conversation-intelligence",
      "conversation-orchestrator",
      "agent-connect",
      "enterprise-knowledge",
      "apple-messages-for-business",
      "api"
    ],
    "license": "MIT",
    "websiteURL": "https://www.twilio.com",
    "privacyPolicyURL": null,
    "termsOfServiceURL": null,
    "assets": {
      "logo": "./plugin-assets/3f9e2f092b4d95b0c6154ab19eb92f1305a79b90.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/twilio-developer-kit/.codex-plugin/plugin.json",
      "manifestBlobSha": "fae7de87512cdc4a7d2cff757ac827d731876d77",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/twilio-developer-kit/.codex-plugin/plugin.json",
      "pluginPath": "plugins/twilio-developer-kit",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_d5dc81b81a33b2ff8c49fd09e04d46492f3c0154",
    "name": "openai-developers",
    "version": "1.2.3",
    "displayName": "OpenAI Developers",
    "description": "Build with OpenAI APIs, Agents SDK, and ChatGPT Apps, and create and save OpenAI API keys from Codex.",
    "shortDescription": "Develop AI apps, agents, and ChatGPT Apps with OpenAI best practices",
    "longDescription": "Use OpenAI Developers in Codex to build AI applications, agents, and ChatGPT Apps with OpenAI docs, the OpenAI API, Apps SDK, and Agents SDK. Connect to the OpenAI Platform (platform.openai.com) and see your Codex-built apps work right out of the box with real OpenAI API keys. Run and locally deploy Agents SDK projects through the Deployment Manager, scaffold ChatGPT Apps, and prepare ChatGPT Apps submission artifacts.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "openai-platform",
      "api-key",
      "agents-sdk",
      "agents",
      "chatgpt-apps",
      "apps-sdk",
      "mcp",
      "submissions",
      "codex"
    ],
    "license": "Proprietary",
    "websiteURL": "https://platform.openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/row-terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/f09dbecf2c9601de38609d1c84a215d6099535d9.png",
      "composerIcon": "./plugin-assets/f09dbecf2c9601de38609d1c84a215d6099535d9.png"
    },
    "appIds": [
      "connector_2de447f3f15448ebab48783d7e4f5d81"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": [
      "CODEX"
    ],
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/openai-developers/.codex-plugin/plugin.json",
      "manifestBlobSha": "d5dc81b81a33b2ff8c49fd09e04d46492f3c0154",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/openai-developers/.codex-plugin/plugin.json",
      "pluginPath": "plugins/openai-developers",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_73ca415393e0f664958e4a47ca6085830270a963",
    "name": "datadog",
    "version": "10.0.0",
    "displayName": "Datadog (Preview)",
    "description": "Available for US1 customers only. Analyze, investigate, and act on your Datadog telemetry directly from ChatGPT using natural language. Ask questions about your production applications, identify, visualize, and remediate issues in your critical services. Run agentic loops to ensure you continue to maintain good observability and service management posture.",
    "shortDescription": "Search and act on your data",
    "longDescription": "Available for US1 customers only. Analyze, investigate, and act on your Datadog telemetry directly from ChatGPT using natural language. Ask questions about your production applications, identify, visualize, and remediate issues in your critical services. Run agentic loops to ensure you continue to maintain good observability and service management posture.",
    "developerName": "Datadog",
    "category": "Developer Tools",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://www.datadoghq.com",
    "privacyPolicyURL": "https://www.datadoghq.com/legal/privacy/",
    "termsOfServiceURL": "https://www.datadoghq.com/legal/terms/2024-10-25/",
    "assets": {
      "logo": "./plugin-assets/aa423933f06ab3405236c4e6d612f36eb7b77d6c.png",
      "composerIcon": "./plugin-assets/89e0a9ce5b1dec5348a4d325ae6d59a16092a562.png"
    },
    "appIds": [
      "asdk_app_69e8c7f174a08191a28b6da96c8062c4"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/datadog/.codex-plugin/plugin.json",
      "manifestBlobSha": "73ca415393e0f664958e4a47ca6085830270a963",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/datadog/.codex-plugin/plugin.json",
      "pluginPath": "plugins/datadog",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_35935821562bc64e4b60b59daed3c9279f9eec2e",
    "name": "zoom",
    "version": "1.0.0",
    "displayName": "Zoom",
    "description": "Smart meeting insights from Zoom",
    "shortDescription": "Smart meeting insights from Zoom",
    "longDescription": "Zoom connects Codex to Zoom meeting context through the Zoom app connector and provides developer workflows for planning, building, debugging, and reviewing Zoom integrations across APIs, SDKs, webhooks, WebSockets, bots, and automation use cases.",
    "developerName": "Zoom",
    "category": "Communication",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "zoom",
      "codex-plugin",
      "connector",
      "meetings",
      "transcripts",
      "recordings",
      "docs",
      "developers",
      "rest-api",
      "meeting-sdk",
      "video-sdk",
      "webhooks",
      "oauth"
    ],
    "license": "MIT",
    "websiteURL": "https://zoom.us",
    "privacyPolicyURL": "https://zoom.us/privacy",
    "termsOfServiceURL": "https://www.zoom.com/en/trust/terms/",
    "assets": {
      "logo": "./plugin-assets/b31bbe61fd683ae6c5c7cb71e8453706019e0ee2.jpg",
      "logoDark": "./plugin-assets/b31bbe61fd683ae6c5c7cb71e8453706019e0ee2.jpg",
      "composerIcon": "./plugin-assets/9a983167b473c10bf5aad63b8375f59ce29c0247.svg"
    },
    "appIds": [
      "asdk_app_69373a13116c819189d046aea1278836"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/zoom/.codex-plugin/plugin.json",
      "manifestBlobSha": "35935821562bc64e4b60b59daed3c9279f9eec2e",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/zoom/.codex-plugin/plugin.json",
      "pluginPath": "plugins/zoom",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_bf0fa177149a62e5186e396ac6e679150fcdf64f",
    "name": "mixpanel-headless",
    "version": "0.1.2",
    "displayName": "Mixpanel Headless",
    "description": "Analyze Mixpanel data with the mixpanel_headless Python SDK and Codex skills.",
    "shortDescription": "Analyze Mixpanel data with Python",
    "longDescription": "Use Mixpanel Headless skills to install and authenticate the mixpanel_headless Python SDK, discover Mixpanel schemas, run segmentation, funnel, retention, flow, and user-profile analyses, and build or inspect Mixpanel dashboards from Codex.",
    "developerName": "Mixpanel",
    "category": "Data & Analytics",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "mixpanel",
      "analytics",
      "product-analytics",
      "python",
      "data-science",
      "funnels",
      "retention",
      "flows",
      "dashboards"
    ],
    "license": "MIT",
    "websiteURL": "https://mixpanel.com/home",
    "privacyPolicyURL": "https://mixpanel.com/legal/privacy-policy/",
    "termsOfServiceURL": "https://mixpanel.com/legal/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/f7f6a3093f5c88f870696cc20eca116103bdfbd3.png",
      "composerIcon": "./plugin-assets/d6d477203f03aa80e7347c3f8d784a6b82002910.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/mixpanel-headless/.codex-plugin/plugin.json",
      "manifestBlobSha": "bf0fa177149a62e5186e396ac6e679150fcdf64f",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/mixpanel-headless/.codex-plugin/plugin.json",
      "pluginPath": "plugins/mixpanel-headless",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_d4fac3dfd88b24792d365fddb4661eec14f3702c",
    "name": "airtable",
    "version": "6.0.1",
    "displayName": "Airtable",
    "description": "Bring operational data and context into the flow of your ChatGPT conversations. You can ask questions, create and update records, and analyze your data—all through conversation. Use the data in Airtable as input to the work you’re doing in ChatGPT, like building a landing page using content you’ve organized in Airtable. Make quick updates to Airtable without leaving the chat. Airtable for ChatGPT is ideal anytime you need quick access to structured internal data to inform your conversation.\n\nAirtable's App connects ChatGPT directly to your Airtable bases, so you can ask questions, create and update records, and analyze your data—all through conversation",
    "shortDescription": "Add structured data to ChatGPT",
    "longDescription": "Bring operational data and context into the flow of your ChatGPT conversations. You can ask questions, create and update records, and analyze your data—all through conversation. Use the data in Airtable as input to the work you’re doing in ChatGPT, like building a landing page using content you’ve organized in Airtable. Make quick updates to Airtable without leaving the chat. Airtable for ChatGPT is ideal anytime you need quick access to structured internal data to inform your conversation.\n\nAirtable's App connects ChatGPT directly to your Airtable bases, so you can ask questions, create and update records, and analyze your data—all through conversation",
    "developerName": "Airtable",
    "category": "Productivity",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://airtable.com",
    "privacyPolicyURL": "https://www.airtable.com/company/privacy",
    "termsOfServiceURL": "https://www.airtable.com/company/tos",
    "assets": {
      "logo": "./plugin-assets/338ea6f22dc96df9306f0661de1c2a1db7c78df6.png",
      "composerIcon": "./plugin-assets/70dd0037e4d542c6cb775500fe673d06227a5fd6.svg"
    },
    "appIds": [
      "asdk_app_693ca6ce2db08191bb52d66743c65184"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/airtable/.codex-plugin/plugin.json",
      "manifestBlobSha": "d4fac3dfd88b24792d365fddb4661eec14f3702c",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/airtable/.codex-plugin/plugin.json",
      "pluginPath": "plugins/airtable",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_8d47007cbedfa7451d4916acd14d7a44dc6ce413",
    "name": "nvidia",
    "version": "1.0.4",
    "displayName": "NVIDIA",
    "description": "Skills for NVIDIAs ecosystem spans GPU acceleration, CUDA, AI agents, inference, robotics, Physical AI, Omniverse, and simulation. This plugin helps you understand the pieces, choose a path, validate your setup, and build practical NVIDIA-powered workflows.",
    "shortDescription": "Guided help for NVIDIA AI, GPU, robotics, simulation, and 3D workflows.",
    "longDescription": "NVIDIAs ecosystem spans GPU acceleration, CUDA, AI agents, inference, robotics, Physical AI, Omniverse, and simulation. This plugin helps you understand the pieces, choose a path, validate your setup, and build practical NVIDIA-powered workflows.",
    "developerName": "NVIDIA",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "nvidia",
      "gpu",
      "cuda",
      "ai-agents",
      "inference",
      "llm-serving",
      "robotics",
      "simulation",
      "omniverse",
      "openusd",
      "digital-twin",
      "physical-ai",
      "cad"
    ],
    "license": "Apache-2.0 AND CC-BY-4.0",
    "websiteURL": "https://www.nvidia.com/",
    "privacyPolicyURL": "https://www.nvidia.com/en-us/about-nvidia/privacy-policy/",
    "termsOfServiceURL": "https://www.nvidia.com/en-us/about-nvidia/terms-of-service/",
    "assets": {
      "logo": "./plugin-assets/e7165f5d1cc877f7badd2c45163d0f00b854f433.png",
      "composerIcon": "./plugin-assets/e7165f5d1cc877f7badd2c45163d0f00b854f433.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/nvidia/.codex-plugin/plugin.json",
      "manifestBlobSha": "8d47007cbedfa7451d4916acd14d7a44dc6ce413",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/nvidia/.codex-plugin/plugin.json",
      "pluginPath": "plugins/nvidia",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_79dfbfe53a1dd1731b7d3ba0bcb194cbf7a9a25b",
    "name": "posthog",
    "version": "1.0.0",
    "displayName": "PostHog",
    "description": "PostHog gives your AI agent direct access to your product analytics, feature flags, experiments, error tracking, surveys, logs, and LLM analytics. Ask questions about your data, create insights, toggle feature flags, analyze errors, search docs, and more — all from chat.",
    "shortDescription": "Analyze your product data",
    "longDescription": "PostHog gives your AI agent direct access to your product analytics, feature flags, experiments, error tracking, surveys, logs, and LLM analytics. Ask questions about your data, create insights, toggle feature flags, analyze errors, search docs, and more — all from chat.",
    "developerName": "PostHog Inc.",
    "category": "Data & Analytics",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "posthog",
      "analytics",
      "product-analytics",
      "feature-flags",
      "experiments",
      "error-tracking",
      "session-replay",
      "surveys",
      "llm-analytics",
      "hogql",
      "developer-tools"
    ],
    "license": "MIT",
    "websiteURL": "https://posthog.com",
    "privacyPolicyURL": "https://posthog.com/privacy",
    "termsOfServiceURL": "https://posthog.com/terms",
    "assets": {
      "logo": "./plugin-assets/92539482aebcd719408a4c2cd64dd759ed0d4b3a.png",
      "logoDark": "./plugin-assets/92539482aebcd719408a4c2cd64dd759ed0d4b3a.png",
      "composerIcon": "./plugin-assets/ad771162238b16d30fbc8a64ee414de3f1c40eac.png"
    },
    "appIds": [
      "asdk_app_699caef2d680819188727b0ddbb349dd"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/posthog/.codex-plugin/plugin.json",
      "manifestBlobSha": "79dfbfe53a1dd1731b7d3ba0bcb194cbf7a9a25b",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/posthog/.codex-plugin/plugin.json",
      "pluginPath": "plugins/posthog",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_91ff907ba171c8823e2e4c618539adf1a032923e",
    "name": "ngs-analysis",
    "version": "1.0.3",
    "displayName": "Life Sciences NGS Analysis",
    "description": "Guided NGS intake, local execution, and public-pipeline routing for BCL, FASTQ, DNA variant, RNA-seq, single-cell, epigenomics, amplicon, and metagenomics analyses, with deeper decision skills for high-risk assay branches.",
    "shortDescription": "Guided NGS routing and local execution for sequencing analysis",
    "longDescription": "A guided intake, routing, and execution plugin for next-generation sequencing workflows. It helps Codex inspect local sequencing inputs, ask only the missing assay-specific questions, choose public or freely accessible runtime-installable packages where possible, check existing tool availability before any install, and execute supported local workflows with validation, logs, manifests, QC reports, and artifact indexes. It includes deeper decision skills for BCL demultiplexing, FASTQ QC execution and interpretation, germline, somatic and UMI-panel DNA variants, bulk RNA-seq count generation and differential expression, ATAC-seq, ChIP-seq/CUT&RUN/CUT&Tag, and embedded post-count scRNA-seq QC.",
    "developerName": "OpenAI",
    "category": "Education & Research",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "ngs",
      "sequencing",
      "bioinformatics",
      "fastq",
      "bcl",
      "rnaseq",
      "scrnaseq",
      "variant-calling",
      "atacseq",
      "chipseq",
      "microbiome",
      "metagenomics",
      "pipeline-routing",
      "nextflow",
      "nf-core"
    ],
    "license": "MIT",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/c9fad9910b725e6c953e9a7dc67decd44c2ac325.png",
      "composerIcon": "./plugin-assets/c9fad9910b725e6c953e9a7dc67decd44c2ac325.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/ngs-analysis/.codex-plugin/plugin.json",
      "manifestBlobSha": "91ff907ba171c8823e2e4c618539adf1a032923e",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/ngs-analysis/.codex-plugin/plugin.json",
      "pluginPath": "plugins/ngs-analysis",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_786e2bb34e9d5e4a27d2ab111d9af855379bb15b",
    "name": "shopify",
    "version": "3.0.0",
    "displayName": "Shopify",
    "description": "Shopify for ChatGPT makes store building and management as easy as having a conversation. Effortlessly connect your existing store or create a new online store by describing your business. Simply chat to add products, adjust inventory across locations, create discount codes, browse recent orders, view customer details, or pull analytics on your store’s performance.",
    "shortDescription": "Build and manage your store",
    "longDescription": "Shopify for ChatGPT makes store building and management as easy as having a conversation. Effortlessly connect your existing store or create a new online store by describing your business. Simply chat to add products, adjust inventory across locations, create discount codes, browse recent orders, view customer details, or pull analytics on your store’s performance.",
    "developerName": "Shopify",
    "category": "Business & Operations",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://shopify.com",
    "privacyPolicyURL": "https://www.shopify.com/legal/privacy",
    "termsOfServiceURL": "https://www.shopify.com/legal/terms",
    "assets": {
      "logo": "./plugin-assets/4949fca9ea3f93fefaeeca99e8eaa6bba904d9fa.png",
      "composerIcon": "./plugin-assets/bca8bbd29f2c3ad58528a0fd3ce8dc2f4b882ae6.svg"
    },
    "appIds": [
      "asdk_app_69e65c430b3081919aa4d962ab5d1698"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/shopify/.codex-plugin/plugin.json",
      "manifestBlobSha": "786e2bb34e9d5e4a27d2ab111d9af855379bb15b",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/shopify/.codex-plugin/plugin.json",
      "pluginPath": "plugins/shopify",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_153597d7ea7f9b9d8289119ce65dc558540c0cb1",
    "name": "magicpath",
    "version": "0.1.2",
    "displayName": "MagicPath",
    "description": "Use MagicPath to find, inspect, install, create, and edit UI components from Codex.",
    "shortDescription": "Find, install, and author MagicPath UI components from Codex",
    "longDescription": "Use MagicPath through the magicpath-ai CLI to search UI components, inspect source, install React and TypeScript components into applications, work with team projects and themes, and create or edit canvas components from local code.",
    "developerName": "MagicPathAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "magicpath",
      "codex",
      "ui-components",
      "design",
      "react",
      "tailwind"
    ],
    "license": "UNLICENSED",
    "websiteURL": "https://www.magicpath.ai/",
    "privacyPolicyURL": "https://www.magicpath.ai/privacy",
    "termsOfServiceURL": "https://www.magicpath.ai/terms",
    "assets": {
      "logo": "./plugin-assets/b67a50127a488217fbc4bbae02e3bc827058e857.png",
      "composerIcon": "./plugin-assets/b67a50127a488217fbc4bbae02e3bc827058e857.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/magicpath/.codex-plugin/plugin.json",
      "manifestBlobSha": "153597d7ea7f9b9d8289119ce65dc558540c0cb1",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/magicpath/.codex-plugin/plugin.json",
      "pluginPath": "plugins/magicpath",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_ef9aaba745acb9ced4e2ff07d82550a74c000106",
    "name": "openai-ads-conversions",
    "version": "0.1.2",
    "displayName": "OpenAI Ads Conversions",
    "description": "Set up OpenAI Ads Measurement Pixel and optional Conversions API instrumentation.",
    "shortDescription": "Set up OpenAI Ads Pixel and CAPI tracking",
    "longDescription": "Use OpenAI Ads Conversions to guide Codex through adding or extending Measurement Pixel and optional Conversions API instrumentation in a repository, with local verification helpers and guidance for safe secret handling, deduplication, attribution context, and setup reporting.",
    "developerName": "OpenAI",
    "category": "Developer Tools",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "openai-ads",
      "ads",
      "conversions",
      "measurement-pixel",
      "capi"
    ],
    "license": "Proprietary",
    "websiteURL": "https://developers.openai.com/ads/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/row-terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/86c0ba7be1a6436fcd4861d36fcc8acb6c58fe61.svg",
      "composerIcon": "./plugin-assets/86c0ba7be1a6436fcd4861d36fcc8acb6c58fe61.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/openai-ads-conversions/.codex-plugin/plugin.json",
      "manifestBlobSha": "ef9aaba745acb9ced4e2ff07d82550a74c000106",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/openai-ads-conversions/.codex-plugin/plugin.json",
      "pluginPath": "plugins/openai-ads-conversions",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_c0f36c4052a775827a844983ba3c7ab4cb392eef",
    "name": "boltz-api-cli",
    "version": "0.1.1",
    "displayName": "Boltz",
    "description": "Predict structures, screen molecules and proteins, and design binders.",
    "shortDescription": "Predict structures, screen molecules and proteins, and design binders",
    "longDescription": "Use Boltz from Codex for biomolecular modeling workflows: predict structure and binding for protein, RNA, DNA, and ligand complexes; rank small-molecule or protein libraries against targets; and design novel small molecules, peptides, antibodies, nanobodies, or custom protein binders with structures and confidence metrics.",
    "developerName": "Boltz",
    "category": "Scientific Research",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "boltz",
      "boltz-api",
      "go-cli",
      "computational-biology",
      "protein-design",
      "protein-screening",
      "small-molecule-design",
      "virtual-screening",
      "structure-prediction",
      "molecular-modeling",
      "drug-discovery",
      "biotech"
    ],
    "license": "MIT",
    "websiteURL": "https://boltz.bio",
    "privacyPolicyURL": "https://boltz.bio/privacy",
    "termsOfServiceURL": "https://boltz.bio/terms",
    "assets": {
      "logo": "./plugin-assets/68568e0eed02503ff59af86e2d06dfd14104b0f7.png",
      "composerIcon": "./plugin-assets/68568e0eed02503ff59af86e2d06dfd14104b0f7.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/boltz-api-cli/.codex-plugin/plugin.json",
      "manifestBlobSha": "c0f36c4052a775827a844983ba3c7ab4cb392eef",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/boltz-api-cli/.codex-plugin/plugin.json",
      "pluginPath": "plugins/boltz-api-cli",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_0a15f895e06b92f73ec96d8e52dfca1a8a1eb565",
    "name": "dropbox",
    "version": "5.0.1",
    "displayName": "Dropbox",
    "description": "The Dropbox plugin for ChatGPT connects your Dropbox files directly to ChatGPT. You can access files, save ChatGPT-generated content to Dropbox, and create sharing links without switching tools. Everything respects your existing Dropbox permissions, and ChatGPT only works with files you already have access to.",
    "shortDescription": "Access, save and share files",
    "longDescription": "The Dropbox plugin for ChatGPT connects your Dropbox files directly to ChatGPT. You can access files, save ChatGPT-generated content to Dropbox, and create sharing links without switching tools. Everything respects your existing Dropbox permissions, and ChatGPT only works with files you already have access to.",
    "developerName": "Dropbox",
    "category": "Productivity",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://www.dropbox.com",
    "privacyPolicyURL": "https://www.dropbox.com/privacy",
    "termsOfServiceURL": "https://www.dropbox.com/terms",
    "assets": {
      "logo": "./plugin-assets/3972b10bd2d9d56d0a2c180b270db12d489bdb9b.png",
      "logoDark": "./plugin-assets/7aa277a35724fe0eff222c4bae420f6bdbc64eed.png"
    },
    "appIds": [
      "asdk_app_69b31dc2110c8191b8b47dc98fe5a052"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/dropbox/.codex-plugin/plugin.json",
      "manifestBlobSha": "0a15f895e06b92f73ec96d8e52dfca1a8a1eb565",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/dropbox/.codex-plugin/plugin.json",
      "pluginPath": "plugins/dropbox",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_93370dd2ca2f823ae45721c03ba4ffc06322d84c",
    "name": "product-design",
    "version": "0.1.52",
    "displayName": "Product Design",
    "description": "The Product Design plugin is built for turning early ideas into prototypes teams can review. It starts design and build work by confirming the brief, then helps teams explore product directions, audit user flows, prototype from a live URL, and make static screenshots interactive.",
    "shortDescription": "Explore and prototype ideas",
    "longDescription": "Turn early ideas into prototypes teams can review. Explore product directions, audit user flows, research user friction, prototype from a live URL, and make static screenshots interactive. Start with a written brief, URL, screenshot, or existing design, then compare visual directions before building.\n\nUse available browser, Figma, Canva, image generation, and hosting tools to gather references, create concepts, review the result, and carry the work forward with your team.",
    "developerName": "OpenAI",
    "category": "Creativity",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "prototype",
      "product design",
      "prototyping",
      "user experience",
      "wireframes",
      "design systems",
      "figma",
      "frontend",
      "ux-research",
      "ux-audit",
      "accessibility-audit",
      "research",
      "context-gathering",
      "ideation",
      "image-generation"
    ],
    "license": "Proprietary",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/e7866fe44518adc5adb0c770db4111478245bb2f.png",
      "composerIcon": "./plugin-assets/0c58a4419efe4d844845abe2cdd33549fff2d962.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/product-design/.codex-plugin/plugin.json",
      "manifestBlobSha": "93370dd2ca2f823ae45721c03ba4ffc06322d84c",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/product-design/.codex-plugin/plugin.json",
      "pluginPath": "plugins/product-design",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_05275664445dc236e21c8cf4b6428ab6c4fcb06e",
    "name": "data-analytics",
    "version": "0.2.8",
    "displayName": "Data Analytics",
    "description": "Answer product and business questions with data",
    "shortDescription": "Answer product and business questions with data",
    "longDescription": "Data Analytics helps you turn questions about your product or business into answers you can trust. Ask why a metric changed, what the data shows about where a team should focus next, how to define KPIs, whether a dataset is reliable, or how large an opportunity might be, and it can help you investigate the data and turn the findings into shareable reports, charts, dashboards, notebooks, and recommendations.\n\nStart with the data you already have: connected warehouses, BI or product analytics tools, docs, chats, spreadsheets, uploaded files, pasted results, or clearly labeled sample data. The plugin guides you through the right workflow, checks sources where possible, and keeps the evidence visible in reviewable tables, charts, dashboards, and report apps you can share.",
    "developerName": "OpenAI",
    "category": "Data & Analytics",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "data-analytics",
      "analytics",
      "business intelligence",
      "sql",
      "business-context",
      "dashboards",
      "funnel-analysis",
      "kpi-reporting",
      "market-sizing",
      "metric-diagnostics",
      "post-launch-updates",
      "product-analysis",
      "retention",
      "root-cause-analysis",
      "scorecards",
      "validation",
      "visualization",
      "jupyter-notebooks",
      "databricks",
      "bigquery",
      "snowflake",
      "deepnote",
      "mixpanel",
      "mixpanel-headless",
      "metabase",
      "thoughtspot",
      "guided-flow",
      "semantic-layer"
    ],
    "license": "Proprietary",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/fb363e981a1df0c09119a257347317e5b8b3e4ab.png",
      "composerIcon": "./plugin-assets/f741c27ce595da61f3c8a94a6d6a3958c6a5fb11.svg"
    },
    "appIds": [
      "asdk_app_69a1d78e929881919bba0dbda1f6436d",
      "connector_246af0940da3457da0e751171dc1ce60",
      "asdk_app_69c18c28f1188191bf5b8445c4ab0a2e",
      "connector_2128aebfecb84f64a069897515042a44",
      "connector_4aaab2856305417b993eca9a216aaf6e",
      "connector_e6a7394682e24467ac68c60696f275a4",
      "connector_947e0d954944416db111db556030eea6",
      "connector_5f3c8c41a1e54ad7a76272c89e2554fa",
      "templated_apps_Databricks",
      "connector_7c3f2c8cdbf64bb0b183ff52f527a06e",
      "templated_apps_69ebf5c883c881919ef2719759f226f6",
      "connector_1e4f6a44acf14e3ca1d96672f8c945bc",
      "connector_76869538009648d5b282a4bb21c3d157",
      "asdk_app_6967f065ac9481918969c660ff7686e9",
      "connector_20205bf7d4e99a89d7154bb849718324",
      "connector_690a9430a270819196671dcb4c95898e",
      "asdk_app_69fb51f9519081919c1f3e44ea9a5a05",
      "connector_690e2dabf430819196f8b3701ec838ec",
      "asdk_app_69b2e9aed45c8191b254b207dfcc2bb4",
      "asdk_app_699caef2d680819188727b0ddbb349dd",
      "asdk_app_694e8b8715108191a49fe2db4398d9e2",
      "templated_apps_6a044bbb47ec819193270b902fa5cd03",
      "asdk_app_69d8425f7a1c8191a438821b9c553b79"
    ],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/data-analytics/.codex-plugin/plugin.json",
      "manifestBlobSha": "05275664445dc236e21c8cf4b6428ab6c4fcb06e",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/data-analytics/.codex-plugin/plugin.json",
      "pluginPath": "plugins/data-analytics",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_fac51649ecc99606a162556bf7cdd13b2c86fedd",
    "name": "creative-production",
    "version": "0.1.25",
    "displayName": "Creative Production",
    "description": "Explore campaign ideas, concept images, mood boards, product placements, ad directions, listing images, social posts, and launch assets.",
    "shortDescription": "Create marketing visuals from a brief or product image.",
    "longDescription": "Creative Production helps marketers turn a brief, product image, offer, or existing asset into visual options the team can review. Use it to explore campaign ideas, concept images, mood boards, product placements, ad directions, listing images, social posts, and reusable styles. Start with a brief or image, compare the strongest options, then adapt the chosen direction for the channels you need.",
    "developerName": "OpenAI",
    "category": "Creativity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "creative-production",
      "marketing",
      "creative",
      "visuals",
      "images",
      "image-generation",
      "mood-board",
      "campaigns",
      "ads",
      "social-posts",
      "product-photos",
      "brand",
      "design",
      "marketing-assets",
      "visual-exploration",
      "asset-production"
    ],
    "license": "Proprietary",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/6f37821a0db9865acca5c7f6e4022f58b707a0a7.png",
      "composerIcon": "./plugin-assets/7a12b8ad180f22b55f96914eee81252d7c65b159.svg"
    },
    "appIds": [],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/creative-production/.codex-plugin/plugin.json",
      "manifestBlobSha": "fac51649ecc99606a162556bf7cdd13b2c86fedd",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/creative-production/.codex-plugin/plugin.json",
      "pluginPath": "plugins/creative-production",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_3f970d51d54d1e44b219b79060d72689e8c86cc8",
    "name": "public-equity-investing",
    "version": "0.1.31",
    "displayName": "Public Equity Investing",
    "description": "Public equity investing workflows for listed-company research, earnings analysis, valuation, model updates, long/short pitches, catalysts, thesis tracking, ETF/index and constituent diligence, sell-side research notes, risk sizing, hedging, dashboards, and investment memos.",
    "shortDescription": "Public equity PM research, long/short, earnings, ETF/index diligence, and memos",
    "longDescription": "Public equity investing workflows for long-only investors, long/short hedge funds, sell-side equity research teams, ETF/index and constituent diligence, event-driven equity investors, and sector/thematic listed-equity research teams. Outputs should surface what is mispriced, what is priced in, what proves or kills the thesis, what to do next, and what evidence is missing. Use Credit Markets for credit instruments, creditworthiness, restructuring, distressed, recovery, spreads, yields, covenants, and debt security analysis.",
    "developerName": "OpenAI",
    "category": "Finance",
    "capabilities": [
      "Interactive",
      "Read",
      "Write"
    ],
    "keywords": [
      "public-equity-investing",
      "factset",
      "morningstar",
      "lseg",
      "s&p global",
      "pitchbook",
      "quartr",
      "alpaca",
      "daloopa",
      "public-equity",
      "listed-equities",
      "equity-research",
      "long-only",
      "hedge-fund",
      "long-short",
      "earnings",
      "valuation",
      "catalysts",
      "investment-memo",
      "etf-index-diligence",
      "benchmark-relative-equity",
      "sell-side-research",
      "public-equity-diligence",
      "portfolio-manager"
    ],
    "license": "Proprietary",
    "websiteURL": "https://openai.com/",
    "privacyPolicyURL": "https://openai.com/policies/row-privacy-policy/",
    "termsOfServiceURL": "https://openai.com/policies/row-terms-of-use/",
    "assets": {
      "logo": "./plugin-assets/0b7b370c273668dbc9ed293fb9ad8a098af5e1d1.png",
      "composerIcon": "./plugin-assets/541917af694cd7aa4b7693a757f1bc7eb8b28bf1.svg"
    },
    "appIds": [
      "asdk_app_69a1d78e929881919bba0dbda1f6436d",
      "asdk_app_693850f6312c8191be5a026bf3538e80",
      "asdk_app_699727751b1c819193883394649579e2",
      "asdk_app_69248819fa4c81918047c4b42b1f8823",
      "asdk_app_698aec3092e48191a4484b43a3fc79b8",
      "asdk_app_6980f65d75b881918eaa6d65477d87c6",
      "asdk_app_6983505f8b9c8191a2e6f104325b1f20",
      "connector_692f6343042c8191b6617e8352444692",
      "asdk_app_69b2bc50b4c0819189d86013d62ecc71",
      "connector_691f721a77bc8191be115b65c85075c0",
      "connector_5f3c8c41a1e54ad7a76272c89e2554fa",
      "connector_2128aebfecb84f64a069897515042a44",
      "connector_4aaab2856305417b993eca9a216aaf6e",
      "connector_1e4f6a44acf14e3ca1d96672f8c945bc",
      "connector_246af0940da3457da0e751171dc1ce60"
    ],
    "authenticationPolicy": "ON_USE",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/public-equity-investing/.codex-plugin/plugin.json",
      "manifestBlobSha": "3f970d51d54d1e44b219b79060d72689e8c86cc8",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/public-equity-investing/.codex-plugin/plugin.json",
      "pluginPath": "plugins/public-equity-investing",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_31c776a3b832a1fc7de627a945987fc71ad540ac",
    "name": "adobe",
    "version": "8.0.0",
    "displayName": "Adobe",
    "description": "Adobe unlocks more ways to create and get work done from the conversation. Previously available as Photoshop, the Adobe connector now brings creativity and productivity capabilities across Creative Cloud and Acrobat. Describe what you want to make or change, and Adobe can help turn ideas, images, videos, and documents into polished outputs — from editing photos and creating PDFs to designing social assets, resizing videos, searching Creative Cloud assets, and generating data-driven documents.\nKey capabilities:\n\n* Retouch portraits or edit photos in bulk: Drop in photos and describe the look you want — adjust color, lighting, and tone; remove distractions and generate new elements; apply Lightroom presets; remove backgrounds; blur, crop, resize, and expand images.\n* Design from template: Start from an Express template, update text and colors, and then animate for social media or convert to PDF.\n* Refine video for any platform: Upload a horizontal clip and ask to reformat it for YouTube Shorts, Instagram Reels, or any platform. You can also stitch clips into a single sequence.\n* Search and organize creative work: Describe what you're looking for and surface assets from your Creative Cloud library — by subject, style, mood, or content — without browsing folders.\n* Work with PDFs and documents: Create and convert polished PDFs and documents.\n* Create data-driven documents: Describe your output and provide your data — the connector turns raw data or content into formatted, shareable PDFs, including badges, cards, catalogs, and more.\n\nYou can get started as a guest, and sign in with your Adobe account for more capabilities and tools, Creative Cloud storage, and saved work across sessions.",
    "shortDescription": "Design, combine, and edit",
    "longDescription": "Adobe unlocks more ways to create and get work done from the conversation. Previously available as Photoshop, the Adobe connector now brings creativity and productivity capabilities across Creative Cloud and Acrobat. Describe what you want to make or change, and Adobe can help turn ideas, images, videos, and documents into polished outputs — from editing photos and creating PDFs to designing social assets, resizing videos, searching Creative Cloud assets, and generating data-driven documents.\nKey capabilities:\n\n* Retouch portraits or edit photos in bulk: Drop in photos and describe the look you want — adjust color, lighting, and tone; remove distractions and generate new elements; apply Lightroom presets; remove backgrounds; blur, crop, resize, and expand images.\n* Design from template: Start from an Express template, update text and colors, and then animate for social media or convert to PDF.\n* Refine video for any platform: Upload a horizontal clip and ask to reformat it for YouTube Shorts, Instagram Reels, or any platform. You can also stitch clips into a single sequence.\n* Search and organize creative work: Describe what you're looking for and surface assets from your Creative Cloud library — by subject, style, mood, or content — without browsing folders.\n* Work with PDFs and documents: Create and convert polished PDFs and documents.\n* Create data-driven documents: Describe your output and provide your data — the connector turns raw data or content into formatted, shareable PDFs, including badges, cards, catalogs, and more.\n\nYou can get started as a guest, and sign in with your Adobe account for more capabilities and tools, Creative Cloud storage, and saved work across sessions.",
    "developerName": "Adobe Inc",
    "category": "Creativity",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://www.adobe.com",
    "privacyPolicyURL": "https://www.adobe.com/privacy/policy.html",
    "termsOfServiceURL": "https://www.adobe.com/legal/terms.html",
    "assets": {},
    "appIds": [
      "asdk_app_69312da8e4dc81919370cb86fd172b6c"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/adobe/.codex-plugin/plugin.json",
      "manifestBlobSha": "31c776a3b832a1fc7de627a945987fc71ad540ac",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/adobe/.codex-plugin/plugin.json",
      "pluginPath": "plugins/adobe",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_4f067058343aa01331a77a139a85a1b32f76942d",
    "name": "lovable",
    "version": "2.0.1",
    "displayName": "Lovable",
    "description": "Build apps and websites",
    "shortDescription": "Build apps and websites",
    "longDescription": "Build apps and websites",
    "developerName": "Lovable Labs",
    "category": "Developer Tools",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://lovable.dev/",
    "privacyPolicyURL": "https://lovable.dev/privacy",
    "termsOfServiceURL": "https://lovable.dev/terms",
    "assets": {},
    "appIds": [
      "asdk_app_693a0a79ffe48191901173077edcf914"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/lovable/.codex-plugin/plugin.json",
      "manifestBlobSha": "4f067058343aa01331a77a139a85a1b32f76942d",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/lovable/.codex-plugin/plugin.json",
      "pluginPath": "plugins/lovable",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_a35047271b5cd2b287c00a027a85f558f85a8817",
    "name": "clickup",
    "version": "1.0.3",
    "displayName": "ClickUp",
    "description": "Turn Codex into your ClickUp command center.",
    "shortDescription": "Turn Codex into your ClickUp command center.",
    "longDescription": "Turn Codex into your ClickUp command center. Ask anything, find everything, take action - without breaking your flow.\n• Deep workspace search:  Ask questions naturally, get precise answers from across all your work\n• Action in the same breath: Find, create, update, and manage work in Codex\n• Zero context switching:  Go from question to answer to action without leaving the conversation",
    "developerName": "ClickUp",
    "category": "Productivity",
    "capabilities": [],
    "keywords": [],
    "license": "MIT",
    "websiteURL": "https://clickup.com",
    "privacyPolicyURL": null,
    "termsOfServiceURL": null,
    "assets": {
      "logo": "./plugin-assets/1e52cafc1ed36d9e40f96f485c59b48c58663a56.png",
      "composerIcon": "./plugin-assets/1e52cafc1ed36d9e40f96f485c59b48c58663a56.png"
    },
    "appIds": [
      "asdk_app_69431e6d26b88191b4029488aeb42f5b"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/clickup/.codex-plugin/plugin.json",
      "manifestBlobSha": "a35047271b5cd2b287c00a027a85f558f85a8817",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/clickup/.codex-plugin/plugin.json",
      "pluginPath": "plugins/clickup",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_7746216b3ae9d0b4e9855e1595670da20f87e91d",
    "name": "consensus",
    "version": "4.0.0",
    "displayName": "Consensus",
    "description": "Consensus is the go-to MCP for academic research. Connect directly to 220M+ peer-reviewed papers to search, synthesize, and build structured research outputs from within your conversation.\n\nRun literature reviews, build boolean search strategies, generate bibliographies, identify research gaps, and draft cited content — grounded in studies from PubMed, Semantic Scholar, and ArXiv. Pre-built workflows handle complex tasks in minutes: systematic reviews, curriculum reading lists, grant research with novelty analysis, and clinical evidence synthesis.\n\nBuilt for researchers, students, faculty, and clinicians across biomedical, social science, STEM, and all academic disciplines.",
    "shortDescription": "Explore scientific research",
    "longDescription": "Consensus is the go-to MCP for academic research. Connect directly to 220M+ peer-reviewed papers to search, synthesize, and build structured research outputs from within your conversation.\n\nRun literature reviews, build boolean search strategies, generate bibliographies, identify research gaps, and draft cited content — grounded in studies from PubMed, Semantic Scholar, and ArXiv. Pre-built workflows handle complex tasks in minutes: systematic reviews, curriculum reading lists, grant research with novelty analysis, and clinical evidence synthesis.\n\nBuilt for researchers, students, faculty, and clinicians across biomedical, social science, STEM, and all academic disciplines.",
    "developerName": "Consensus",
    "category": "Education & Research",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://consensus.app",
    "privacyPolicyURL": "https://consensus.app/home/privacy-policy/",
    "termsOfServiceURL": "https://consensus.app/home/terms-of-service/",
    "assets": {},
    "appIds": [
      "asdk_app_6943e6f4a928819195962de16fb9ffe4"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/consensus/.codex-plugin/plugin.json",
      "manifestBlobSha": "7746216b3ae9d0b4e9855e1595670da20f87e91d",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/consensus/.codex-plugin/plugin.json",
      "pluginPath": "plugins/consensus",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_321ce58f8765c3f69a5798f63aad44fe9a81bef0",
    "name": "chatcut",
    "version": "1.0.4",
    "displayName": "ChatCut",
    "description": "Install, open, and connect the signed ChatCut Desktop app from Codex.",
    "shortDescription": "Install and connect ChatCut",
    "longDescription": "Download, install, open, connect, or repair the signed production ChatCut Desktop app so Codex can use its local video-editing tools and skills.",
    "developerName": "ChatCut",
    "category": "Creativity",
    "capabilities": [
      "Interactive",
      "Write"
    ],
    "keywords": [
      "chatcut",
      "desktop",
      "video",
      "video-editing",
      "codex",
      "mcp",
      "apple-silicon",
      "intel-mac",
      "windows"
    ],
    "license": "GPL-3.0-only",
    "websiteURL": "https://chatcut.io",
    "privacyPolicyURL": "https://chatcut.io/privacy",
    "termsOfServiceURL": "https://chatcut.io/terms",
    "assets": {
      "logo": "./plugin-assets/8f38e07d8e6e095d2ec66c15f39a0f54e4f48abb.png",
      "composerIcon": "./plugin-assets/8f38e07d8e6e095d2ec66c15f39a0f54e4f48abb.png"
    },
    "appIds": [],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/chatcut/.codex-plugin/plugin.json",
      "manifestBlobSha": "321ce58f8765c3f69a5798f63aad44fe9a81bef0",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/chatcut/.codex-plugin/plugin.json",
      "pluginPath": "plugins/chatcut",
      "marketplaceName": "openai-curated"
    }
  },
  {
    "id": "plugin_local_48899384045fc52942657641bf3b79e714f8aa46",
    "name": "higgsfield",
    "version": "1.2.1",
    "displayName": "Higgsfield",
    "description": "Generate images and videos from a text prompt or your own photo. Turn a product shot into a video ad, restyle a photo, animate a still, or build a two-minute narrated explainer. Every major image and video model in one place.",
    "shortDescription": "Every image and video model",
    "longDescription": "Generate images and videos from a text prompt or your own photo. Turn a product shot into a video ad, restyle a photo, animate a still, or build a two-minute narrated explainer. Every major image and video model in one place.",
    "developerName": "Higgsfield AI, Inc.",
    "category": "Creativity",
    "capabilities": [],
    "keywords": [],
    "license": null,
    "websiteURL": "https://higgsfield.ai",
    "privacyPolicyURL": "https://higgsfield.ai/privacy-policy",
    "termsOfServiceURL": "https://higgsfield.ai/terms-of-use-agreement",
    "assets": {},
    "appIds": [
      "asdk_app_6a3293e129088191abf0875820e839da"
    ],
    "authenticationPolicy": "ON_INSTALL",
    "installationPolicy": "AVAILABLE",
    "products": null,
    "source": {
      "repository": "https://github.com/openai/plugins",
      "commit": "d420d13051bffe4543ed39e30fa46b87148e47dd",
      "manifestPath": "plugins/higgsfield/.codex-plugin/plugin.json",
      "manifestBlobSha": "48899384045fc52942657641bf3b79e714f8aa46",
      "manifestUrl": "https://raw.githubusercontent.com/openai/plugins/d420d13051bffe4543ed39e30fa46b87148e47dd/plugins/higgsfield/.codex-plugin/plugin.json",
      "pluginPath": "plugins/higgsfield",
      "marketplaceName": "openai-curated"
    }
  }
];
