/** Native classic input records. Protocol shape only; no permission grant. */
export const CLASSIC_CONTEXT_LIMITS = Object.freeze({ maxHiddenMessages: 8, maxMessageIdCharacters: 256, maxHiddenCharacters: 32768, maxTotalHiddenCharacters: 65536 });
const classicInputError = message => Object.assign(new Error(message), { status: 400, code: 'LOCAL_INPUT_UNSUPPORTED' });
const classicObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
/** Protocol admission only. Hidden content does not confer tools/account/model permissions. */
export function parseClassicInputMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 1 + CLASSIC_CONTEXT_LIMITS.maxHiddenMessages) throw classicInputError('Expected one original user message and at most 8 hidden system context messages');
  const ids = new Set(); let user, hiddenCount = 0, hiddenCharacters = 0;
  for (const message of messages) {
    if (!classicObject(message) || typeof message.id !== 'string' || !message.id.trim() || message.id.length > CLASSIC_CONTEXT_LIMITS.maxMessageIdCharacters || ids.has(message.id)) throw classicInputError('Original message IDs must be nonempty, unique and at most 256 characters');
    ids.add(message.id);
    const role = message.author?.role, content = message.content;
    if (role === 'user') {
      if (user || !['text', 'multimodal_text'].includes(content?.content_type) || !Array.isArray(content.parts) || content.parts.some(part => typeof part !== 'string' && !(part?.content_type === 'image_asset_pointer' && typeof part.asset_pointer === 'string'))) throw classicInputError('Expected exactly one original text or image user message');
      user = message;
    } else if (role === 'system') {
      if (!classicObject(message.metadata) || message.metadata.is_visually_hidden_from_conversation !== true || content?.content_type !== 'text' || !Array.isArray(content.parts) || !content.parts.length || content.parts.some(part => typeof part !== 'string') || !content.parts.some(part => part.trim())) throw classicInputError('System context must be an explicitly hidden original text record');
      const characters = content.parts.reduce((sum, part) => sum + part.length, 0);
      hiddenCharacters += characters; hiddenCount++;
      if (characters > CLASSIC_CONTEXT_LIMITS.maxHiddenCharacters || hiddenCharacters > CLASSIC_CONTEXT_LIMITS.maxTotalHiddenCharacters) throw classicInputError('Hidden system context exceeds the 32 Ki-character per-record or 64 Ki-character total limit');
    } else throw classicInputError('Only one user and explicitly hidden system text records are supported');
  }
  if (!user) throw classicInputError('Exactly one original user message is required');
  return { incoming: structuredClone(user), originalMessages: structuredClone(messages), hiddenCount, hiddenCharacters };
}

