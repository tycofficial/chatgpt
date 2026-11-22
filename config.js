// Public model metadata only. Gateway credentials belong to the site service.
export const DEFAULT_SETTINGS = {
  "apiBase": "",
  "apiKey": "",
  "model": "gpt-6.1-sol",
  "theme": "system",
  "language": "zh",
  "customInstructions": "",
  "autoPython": true,
  "apiProviders": [
    {
      "id": "docode",
      "apiBase": "https://docode.cc/v1",
      "supportedModels": [
        "gpt-6-sol",
        "gpt-6-astra",
        "gpt-6.1-sol",
        "gpt-5.6-terra",
        "gpt-5.6-sol",
        "gpt-6.2-sol",
        "gpt-6.2-astra"
      ],
      "responsesModels": [
        "gpt-6.2-sol",
        "gpt-6.2-astra"
      ],
      "freeChatTransport": "chat-completions",
      "fallbackOnRejected": true,
      "standardTransport": "chat-completions",
      "browserResponses": false,
      "browserChatCompletions": false,
      "browserCapabilityCheckedAt": "2026-11-17T13:26:35.413Z",
      "proExecution": "astra-max"
    },
    {
      "id": "openclawplan",
      "apiBase": "https://api.openclawplan.com",
      "supportedModels": [
        "gpt-6-luna",
        "gpt-6.1-sol",
        "gpt-6-astra",
        "gpt-6.1-terra",
        "gpt-6-sol",
        "gpt-5.6-sol",
        "gpt-5.6-terra",
        "gpt-5.6-luna"
      ],
      "proExecution": "astra-max"
    }
  ],
  "freeChatModel": "gpt-6-sol",
  "freeChatEffort": "low",
  "freeChatModelProvenance": {
    "selection": "lowest published reference price tier with Instant support among available GPT IDs",
    "providerPricingAvailable": false,
    "pricingReference": "https://developers.openai.com/api/docs/pricing",
    "checkedAt": "2026-11-17T12:34:54.809Z"
  }
};
