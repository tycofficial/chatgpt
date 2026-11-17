/** Original classic Chat REST/SSE shapes over the same real local thread engine. */
import { FRONTEND_TO_RAW_EFFORT } from './model-catalog-adapter.mjs?v=bc63582b1dbb7427';
import { turnHostCheckpoints } from './preferred-host-transport.mjs?v=bc63582b1dbb7427';

import { parseClassicInputMessages } from './classic-input-messages.mjs?v=bc63582b1dbb7427';
export { parseClassicInputMessages, CLASSIC_CONTEXT_LIMITS } from './classic-input-messages.mjs?v=bc63582b1dbb7427';
export class ClassicChatAdapter {
  constructor({ appServer, models, now = Date.now, uuid = () => crypto.randomUUID(), onConversationChange = () => {}, heartbeatMs = 10000, getPublishedFileReferences = () => [] }) { this.server = appServer; this.models = models; this.now = now; this.uuid = uuid; this.onConversationChange = onConversationChange; this.heartbeatMs = heartbeatMs; this.getPublishedFileReferences = getPublishedFileReferences; this.mutationQueue = Promise.resolve(); }
  json(body, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }); }
  summary(thread) {
    return { id: thread.id, title: thread.name || 'New chat', create_time: new Date(thread.createdAt * 1000).toISOString(), update_time: new Date(thread.updatedAt * 1000).toISOString(), conversation_origin: thread.adapterMetadata.conversationOrigin ?? null, gizmo_id: null, is_archived: !!thread.archived, is_starred: !!thread.adapterMetadata.isStarred };
  }
  message(thread, turn, item, role) {
    const original = role === 'user' ? turn.adapterMetadata?.classicUserMessage : null;
    const text = role === 'user' ? item.content.filter(part => part.type === 'text').map(part => part.text).join('\n') : item.text;
    const frontendSlug = thread.adapterMetadata?.classicModelSlugs?.[turn.id] ?? thread.adapterMetadata?.frontendModelSlug ?? turn.model;
    const done = turn.status === 'completed', terminal = ['completed', 'failed', 'interrupted'].includes(turn.status), itemDone = terminal || turn.adapterMetadata.completedItemIds?.includes(item.id);
    const lastAssistant = turn.items.findLast(value => value.type === 'agentMessage')?.id === item.id;
    let publishedReferences = [];
    if (role === 'assistant') {
      try { publishedReferences = this.getPublishedFileReferences({ thread, turn, item }); }
      catch { this.server.diagnostics?.push({ type: 'local-file-reference-projection-error' }); }
    }
    return {
      id: role === 'user' ? item.clientId ?? item.id : item.id,
      author: { role, name: null, metadata: {} },
      create_time: turn.startedAt, update_time: turn.completedAt ?? this.now() / 1000,
      content: original ? structuredClone(original.content) : { content_type: 'text', parts: [text] },
      status: role === 'user' || done || itemDone && !terminal ? 'finished_successfully' : terminal ? 'finished_partial_completion' : 'in_progress',
      end_turn: role === 'assistant' && terminal && lastAssistant && (!turn.adapterMetadata.resumable || turn.adapterMetadata.resumePolicy === 'manual'),
      weight: 1, recipient: 'all', channel: role === 'assistant' ? item.phase === 'commentary' ? 'commentary' : 'final' : null,
      metadata: { ...(original?.metadata ? structuredClone(original.metadata) : {}), model_slug: frontendSlug, thinking_effort: FRONTEND_TO_RAW_EFFORT[turn.reasoningEffort], adapter_api_model: turn.model, is_complete: role === 'user' || Boolean(itemDone), ...(done && role === 'assistant' ? { finish_details: { type: 'stop', stop_tokens: [] } } : {}), ...(Array.isArray(publishedReferences) && publishedReferences.length ? { content_references: publishedReferences } : {}), adapter_source: 'local-original-client-adapter' },
    };
  }
  originalInputMessages(thread, turn, item) {
    const records = turn.adapterMetadata?.classicInputMessages;
    if (!records) return [this.message(thread, turn, item, 'user')];
    return records.map(record => record.author.role === 'user' ? this.message(thread, turn, item, 'user') : {
      create_time: turn.startedAt, update_time: null, status: 'finished_successfully', end_turn: null, recipient: 'all', channel: null, weight: 0,
      ...structuredClone(record),
    });
  }
  projectItem(thread, turn, item) {
    if (item.type === 'userMessage') return this.originalInputMessages(thread, turn, item);
    if (item.type === 'agentMessage') return [this.message(thread, turn, item, 'assistant')];
    if (item.type !== 'mcpToolCall') return [];
    const finished = item.status !== 'inProgress', base = { create_time: turn.startedAt, update_time: this.now() / 1000, weight: 1, metadata: { model_slug: thread.adapterMetadata?.classicModelSlugs?.[turn.id] ?? thread.adapterMetadata.frontendModelSlug ?? turn.model, thinking_effort: FRONTEND_TO_RAW_EFFORT[turn.reasoningEffort], adapter_source: 'browser-workspace-mcp', mcp_tool_call: { server: item.server, tool: item.tool, status: item.status } } };
    const call = { ...base, id: item.id + '-call', author: { role: 'assistant', name: null, metadata: {} }, recipient: item.tool, channel: 'commentary', content: { content_type: 'code', language: item.tool === 'python' ? 'python' : 'json', text: item.tool === 'python' ? item.arguments.code || '' : JSON.stringify(item.arguments, null, 2) }, status: finished ? 'finished_successfully' : 'in_progress', end_turn: false };
    if (!finished) return [call];
    const output = item.result || { content: [{ type: 'text', text: item.error?.message || 'Tool execution was interrupted' }], isError: true };
    let text = output.content.filter(part => part.type === 'text').map(part => part.text).join('\n');
    const data = output.structuredContent, files = data?.files || (data?.file ? [data.file] : []);
    if (files.length) text += '\n\n' + files.map(file => '[' + file.name + '](' + file.url + ')').join('\n');
    return [call, { ...base, id: item.id + '-result', author: { role: 'tool', name: item.tool, metadata: {} }, recipient: 'all', channel: null, content: { content_type: 'text', parts: [text] }, status: output.isError ? 'finished_partial_completion' : 'finished_successfully', end_turn: false }];
  }
  detail(thread) {
    const root = thread.adapterMetadata.classicRootId ?? `local-root-${thread.id}`, mapping = { [root]: { id: root, message: null, parent: null, children: [] } };
    let parent = root;
    for (const turn of thread.turns) for (const item of turn.items) {
      for (const message of this.projectItem(thread, turn, item)) {
        mapping[message.id] = { id: message.id, message, parent, children: [] };
        mapping[parent].children.push(message.id);
        parent = message.id;
      }
    }
    return {
      title: thread.name || 'New chat', create_time: thread.createdAt, update_time: thread.updatedAt,
      mapping, moderation_results: [], current_node: parent, conversation_id: thread.id,
      is_archived: !!thread.archived, is_starred: !!thread.adapterMetadata.isStarred,
      default_model_slug: thread.adapterMetadata.frontendModelSlug ?? thread.model, gizmo_id: null, plugin_ids: null, safe_urls: [], blocked_urls: [],
      conversation_template_id: null, async_status: null,
      adapter_source: 'local-original-client-adapter',
    };
  }
  list(url) {
    let threads = [...this.server.threads.values()].filter(thread => !thread.ephemeral && !['dot', 'codex'].includes(thread.adapterMetadata.conversationOrigin) && !!thread.archived === (url.searchParams.get('is_archived') === 'true'));
    const origin = url.searchParams.get('conversation_origin'), excluded = url.searchParams.get('exclude_conversation_origin');
    if (origin) threads = threads.filter(thread => thread.adapterMetadata.conversationOrigin === origin);
    if (excluded) threads = threads.filter(thread => thread.adapterMetadata.conversationOrigin !== excluded);
    if (url.searchParams.get('is_starred') === 'true') threads = threads.filter(thread => thread.adapterMetadata.isStarred);
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0), limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 20) || 20));
    return this.json({ items: threads.slice(offset, offset + limit).map(thread => this.summary(thread)), total: threads.length, offset, limit, has_missing_conversations: false });
  }
  pinned(url) {
    const requested = url.searchParams.get('item_type');
    if (requested && requested !== 'conversation') return this.json([]);
    return this.json([...this.server.threads.values()].filter(thread => thread.adapterMetadata.pinnedAt).map(thread => ({ item_type: 'conversation', pinned_at: thread.adapterMetadata.pinnedAt, item: { conversation: this.summary(thread) } })));
  }
  /** REST bulk controls address Chat/Work records, never separate RPC/Dot storage. */
  bulkMutationTargets() {
    return [...this.server.threads.values()].filter(thread => !thread.ephemeral &&
      typeof thread.adapterMetadata?.classicRootId === 'string' && thread.adapterMetadata.classicRootId.length > 0 &&
      (thread.adapterMetadata.conversationOrigin == null || thread.adapterMetadata.conversationOrigin === 'tpp'));
  }
  async stopDeletedThreads(threads) {
    // Controller abort is real; durable host cancellation must also be confirmed.
    for (const thread of threads) if (this.server.running.has(thread.id)) this.server.interrupt(thread.id, { reason: 'user' });
    const pending = turn => turnHostCheckpoints(turn).filter(checkpoint => !['complete', 'failed', 'cancelled'].includes(checkpoint.state));
    const operations = [];
    for (const thread of threads) for (const turn of thread.turns) if (pending(turn).length) {
      if (typeof this.server.onIdleTurnInterrupt !== 'function') throw Object.assign(Error('The durable inference job cannot be cancelled by this local host; the conversation was retained.'), { status: 503, code: 'HOST_CANCELLATION_UNAVAILABLE' });
      operations.push((async () => {
        await this.server.onIdleTurnInterrupt({ threadId: thread.id, turn, reason: 'user' });
        if (pending(turn).length) throw Object.assign(Error('The host did not confirm cancellation; the conversation was retained.'), { status: 503, code: 'HOST_CANCELLATION_UNCONFIRMED' });
      })());
    }
    const outcomes = await Promise.allSettled(operations), failed = outcomes.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
  mutateConversations(ids, body) {
    const operation = this.mutationQueue.then(async () => {
      const threads = [...new Set(ids)].map(id => this.server.threads.get(id)).filter(Boolean), deleting = body.is_visible === false;
      if (deleting) await this.stopDeletedThreads(threads);
      // Preserve object identity: an archived live runner still holds this thread.
      const previous = threads.map(thread => ({ thread, name: thread.name, archived: thread.archived,
        starred: thread.adapterMetadata.isStarred, hadStarred: Object.hasOwn(thread.adapterMetadata, 'isStarred') }));
      for (const thread of threads) {
        if (typeof body.title === 'string') thread.name = body.title.trim().slice(0, 200) || thread.name;
        if (typeof body.is_archived === 'boolean') thread.archived = body.is_archived;
        if (typeof body.is_starred === 'boolean') thread.adapterMetadata.isStarred = body.is_starred;
        if (deleting) this.server.threads.delete(thread.id);
      }
      try { this.server.persist(); }
      catch (cause) {
        for (const row of previous) {
          row.thread.name = row.name; row.thread.archived = row.archived;
          if (row.hadStarred) row.thread.adapterMetadata.isStarred = row.starred; else delete row.thread.adapterMetadata.isStarred;
          if (deleting) this.server.threads.set(row.thread.id, row.thread);
        }
        try { this.server.persist(); } catch { /* Browser setItem is atomic; memory is also restored. */ }
        throw Object.assign(Error('The conversation change could not be saved. Its records were restored; any already confirmed task cancellation remains stopped.'), { status: /quota|storage.*full/i.test(cause.message) ? 507 : 503, code: 'CONVERSATION_MUTATION_NOT_SAVED', cause });
      }
      for (const row of previous) {
        const thread = row.thread;
        try {
          this.onConversationChange('conversation-history-update', { conversation_id: thread.id,
            update_type: deleting ? 'conversation-deleted' : body.is_archived === true ? 'conversation-archived' : 'local-conversation-updated' });
        } catch (error) { this.server.diagnostics?.push({ type: 'local-conversation-mutation-notification-error', message: String(error?.message ?? error) }); }
        // The native RPC manager has its own cached alias of these shared records.
        // Its source handlers consume these exact commit notifications (mg6y).
        if (deleting) this.server.notify('thread/deleted', { threadId: thread.id });
        else {
          if (row.archived !== thread.archived) this.server.notify(thread.archived ? 'thread/archived' : 'thread/unarchived', { threadId: thread.id });
          if (row.name !== thread.name) this.server.notify('thread/name/updated', { threadId: thread.id, threadName: thread.name });
        }
      }
      return threads.length;
    });
    this.mutationQueue = operation.catch(() => {}); return operation;
  }
  async mutationResponse(ids, body, { bulk = false } = {}) {
    try {
      const affected = await this.mutateConversations(ids, body);
      return this.json({ success: true, ...(bulk ? { affected_count: affected, adapter_scope: 'current-account-classic-chat-and-work' } : {}) });
    } catch (error) { return this.json({ error: { code: error.code ?? 'CONVERSATION_MUTATION_FAILED', message: error.message } }, error.status ?? 503); }
  }
  async handle(request, pathname) {
    const url = new URL(request.url), method = request.method;
    if (method === 'GET' && pathname === '/conversations') return this.list(url);
    if (method === 'PATCH' && pathname === '/conversations') {
      if (url.search) return this.json({ error: { code: 'INVALID_CONVERSATION_MUTATION', message: 'This bulk control does not accept query filters' } }, 400);
      let body; try { body = await request.json(); } catch { return this.json({ error: { code: 'INVALID_CONVERSATION_MUTATION', message: 'A valid JSON mutation body is required' } }, 400); }
      const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
      if (keys.length !== 1 || !(keys[0] === 'is_archived' && body.is_archived === true || keys[0] === 'is_visible' && body.is_visible === false)) return this.json({ error: { code: 'INVALID_CONVERSATION_MUTATION', message: 'Bulk controls support exactly archive-all or delete-all' } }, 400);
      return this.mutationResponse(this.bulkMutationTargets().map(thread => thread.id), body, { bulk: true });
    }
    if (method === 'GET' && pathname === '/pins') return this.pinned(url);
    if (method === 'GET' && pathname === '/gizmos/snorlax/sidebar') return this.json({ cursor: null, items: [] });
    if (method === 'GET' && pathname === '/gizmos/bootstrap') return this.json({ gizmos: [], cursor: null });
    if (method === 'POST' && pathname === '/conversation/init') return this.json({});
    if (method === 'POST' && pathname === '/f/conversation/prepare') return this.json({ adapter_source: 'local-preflight-no-external-conduit' });
    if (method === 'POST' && ['/sentinel/chat-requirements', '/sentinel/chat-requirements/prepare', '/sentinel/chat-requirements/finalize'].includes(pathname)) {
      return this.json({ token: 'local-prototype-requirements-not-valid-at-openai', force_login: false, proofofwork: { required: false }, turnstile: { required: false }, adapter_source: 'local-protocol-only-no-original-service-access' });
    }
    if (method === 'GET' && /^\/conversation\/[^/]+$/.test(pathname)) return this.json(this.detail(this.server.getThread(decodeURIComponent(pathname.split('/')[2]))));
    if (method === 'GET' && /^\/conversation\/[^/]+\/stream_status$/.test(pathname)) {
      const thread = this.server.getThread(decodeURIComponent(pathname.split('/')[2]));
      const last = thread.turns.at(-1);
      return this.json({ status: this.server.running.has(thread.id) ? 'IS_STREAMING' : last?.status === 'completed' ? 'COMPLETE' : last?.adapterMetadata?.resumable && last?.adapterMetadata?.resumePolicy !== 'manual' ? 'FAILURE' : 'UNAVAILABLE' });
    }
    if (method === 'PATCH' && /^\/conversation\/[^/]+$/.test(pathname)) {
      const thread = this.server.getThread(decodeURIComponent(pathname.split('/')[2]));
      let body; try { body = await request.json(); } catch { return this.json({ error: { code: 'INVALID_CONVERSATION_MUTATION', message: 'A valid JSON mutation body is required' } }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.entries(body).some(([key, value]) => !(
        key === 'title' && typeof value === 'string' || ['is_archived', 'is_starred'].includes(key) && typeof value === 'boolean' || key === 'is_visible' && value === false
      ))) return this.json({ error: { code: 'INVALID_CONVERSATION_MUTATION', message: 'This conversation mutation contains unsupported fields or values' } }, 400);
      return this.mutationResponse([thread.id], body);
    }
    if (['POST', 'DELETE'].includes(method) && /^\/pins\/conversation\/[^/]+$/.test(pathname)) {
      const thread = this.server.getThread(decodeURIComponent(pathname.split('/')[3]));
      thread.adapterMetadata.pinnedAt = method === 'POST' ? new Date(this.now()).toISOString() : null;
      this.server.persist();
      this.onConversationChange('conversation-history-update', { conversation_id: thread.id, update_type: method === 'POST' ? 'conversation-pinned' : 'conversation-unpinned' });
      return this.json({});
    }
    if (method === 'POST' && pathname === '/f/conversation/resume') {
      const body = await request.json();
      if (typeof body.conversation_id !== 'string' || body.offset != null && (!Number.isSafeInteger(body.offset) || body.offset < 0)) return this.json({ error: { code: 'INVALID_RESUME', message: 'Resume requires a conversation ID and nonnegative offset' } }, 400);
      const thread = this.server.getThread(body.conversation_id), current = this.server.running.get(thread.id)?.turn ?? thread.turns.at(-1);
      if (!current) return this.json({ error: { code: 'TURN_NOT_FOUND', message: 'No turn exists to resume' } }, 404);
      const transaction = current.status === 'completed' || this.server.running.has(thread.id) ? { result: { turn: structuredClone(current) } } : this.server.dispatch('turn/resume', { threadId: thread.id, turnId: current.id });
      return this.attachStream(request, thread, transaction);
    }
    if (method === 'POST' && pathname === '/stop_conversation') {
      const body = await request.json(); this.server.getThread(body.conversation_id); this.server.interrupt(body.conversation_id);
      return this.json({});
    }
    if (method === 'POST' && ['/f/conversation', '/conversation'].includes(pathname)) return this.stream(request, await request.json());
    return null;
  }
  stream(request, body) {
    if (body.action === 'continue') { const thread = this.server.getThread(body.conversation_id); return this.attachStream(request, thread, this.server.dispatch('turn/resume', { threadId: thread.id })); }
    if (!['next', undefined].includes(body.action)) return this.json({ error: { message: `Classic Chat action ${body.action} is not implemented`, code: 'LOCAL_ADAPTER_UNIMPLEMENTED' } }, 501);
    let parsed;
    try { parsed = parseClassicInputMessages(body.messages); }
    catch (error) { return this.json({ error: { message: error.message, code: error.code ?? 'LOCAL_INPUT_UNSUPPORTED' } }, error.status ?? 400); }
    if (typeof body.parent_message_id === 'string' && parsed.originalMessages.some(message => message.id === body.parent_message_id)) return this.json({ error: { message: 'An input message ID cannot also be its conversation parent', code: 'LOCAL_INPUT_UNSUPPORTED' } }, 400);
    const incoming = parsed.incoming, defaultModel = this.models.getRpcModelList().data.find(model => model.isDefault)?.model;
    const model = body.model === 'auto' ? defaultModel : body.model;
    const rawEffort = body.thinking_effort ?? body.reasoning_effort;
    const rawMap = { zero: 'none', min: 'low', standard: 'medium', extended: 'high', xhigh: 'xhigh', max: 'max', ultra: 'ultra' };
    const effort = rawEffort == null ? undefined : rawMap[rawEffort] ?? rawEffort;
    let thread;
    if (body.conversation_id) thread = this.server.getThread(body.conversation_id);
    else {
      const transaction = this.server.dispatch('thread/start', { model, effort, serviceTier: body.service_tier ?? body.serviceTier, ephemeral: body.history_and_training_disabled === true, selectionMode: body.selectionMode });
      thread = this.server.getThread(transaction.result.thread.id);
      thread.adapterMetadata.classicRootId = body.parent_message_id ?? this.uuid();
      thread.adapterMetadata.conversationOrigin = body.conversation_origin ?? null;
      this.server.persist();
      transaction.afterReply?.();
    }
    const transaction = this.server.dispatch('turn/start', {
      threadId: thread.id, input: incoming.content.parts.map(part => typeof part === 'string' ? { type: 'text', text: part, text_elements: [] } : { type: 'image', url: part.asset_pointer }),
      classicUserMessage: structuredClone(incoming),
      classicInputMessages: parsed.originalMessages,
      clientUserMessageId: incoming.id, model, effort, serviceTier: body.service_tier ?? body.serviceTier,
      selectionMode: body.selectionMode, systemHints: Array.isArray(body.system_hints) ? body.system_hints : [],
      responsesapiClientMetadata: { ...body.responsesapi_client_metadata, requestedModel: body.model, adapterOrigin: 'classic-chat-rest' },
    });
    const turnId = transaction.result.turn.id;
    const restricted = transaction.result.turn.adapterMetadata.executionPolicy === 'free-luna-low-or-explicit-medium';
    const frontendSlug = restricted && body.model !== 'auto' ? transaction.result.turn.model : body.model ?? thread.adapterMetadata.frontendModelSlug ?? transaction.result.turn.model;
    thread.adapterMetadata.classicModelSlugs ??= {};
    if (!Object.hasOwn(thread.adapterMetadata.classicModelSlugs, turnId)) {
      thread.adapterMetadata.classicModelSlugs[turnId] = frontendSlug;
      thread.adapterMetadata.frontendModelSlug = frontendSlug;
      this.server.persist();
    }
    return this.attachStream(request, thread, transaction);
  }
  attachStream(request, thread, transaction) {
    const turnId = transaction.result.turn.id;
    let remove = () => {}, removeAbort = () => {}, closed = false, heartbeat;
    const interruptOwn = () => { if (this.server.running.get(thread.id)?.turn.id === turnId) this.server.interrupt(thread.id); };
    const stream = new ReadableStream({
      start: controller => {
        const emit = payload => { if (!closed) controller.enqueue(new TextEncoder().encode(`data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`)); };
        heartbeat = setInterval(() => { if (!closed) controller.enqueue(new TextEncoder().encode('event: ping\ndata: {}\n\n')); }, this.heartbeatMs);
        const close = () => { if (closed) return; closed = true; clearInterval(heartbeat); remove(); removeAbort(); controller.close(); };
        // A transport disconnect detaches this reader; only the explicit stop
        // REST/RPC command cancels execution. Page lifecycle saves a checkpoint.
        const abort = () => close();
        const assistant = () => this.server.getThread(thread.id).turns.find(turn => turn.id === turnId)?.items.findLast(item => item.type === 'agentMessage');
        const finishStream = turn => {
          if (turn.status === 'completed') {
            for (const item of turn.items) for (const message of this.projectItem(thread, turn, item)) emit({ conversation_id: thread.id, message });
            emit({ type: 'message_stream_complete', conversation_id: thread.id });
            emit({ type: 'main_stream_complete', conversation_id: thread.id, turn_exchange_id: turnId });
            emit('[DONE]');
          } else emit({ error: turn.error?.message ?? 'The local turn was interrupted', error_code: turn.adapterMetadata.lastFailure?.code ?? (turn.status === 'interrupted' ? 'local_turn_interrupted' : 'local_gateway_error'), can_retry: turn.adapterMetadata.resumePolicy === 'automatic', error_reason: turn.status });
          close();
        };
        remove = this.server.subscribe(event => {
          const params = event.params;
          if (params.threadId !== thread.id || (params.turnId != null && params.turnId !== turnId) || (params.turn && params.turn.id !== turnId)) return;
          const turn = this.server.getThread(thread.id).turns.find(entry => entry.id === turnId);
          if (event.method === 'item/agentMessage/delta' || event.method === 'item/started' && params.item.type === 'agentMessage') {
            const item = assistant();
            if (item) emit({ conversation_id: thread.id, message: this.message(thread, turn, item, 'assistant') });
          }
          if (['item/started', 'item/completed'].includes(event.method) && params.item?.type === 'mcpToolCall') for (const message of this.projectItem(thread, turn, params.item)) emit({ conversation_id: thread.id, message });
          if (event.method === 'turn/completed') finishStream(params.turn);
        });
        request.signal?.addEventListener('abort', abort, { once: true });
        removeAbort = () => request.signal?.removeEventListener('abort', abort);
        const userItem = this.server.getThread(thread.id).turns.find(turn => turn.id === turnId).items.find(item => item.type === 'userMessage');
        for (const message of this.originalInputMessages(thread, transaction.result.turn, userItem)) emit(message.author.role === 'user'
          ? { type: 'input_message', conversation_id: thread.id, input_message: message }
          : { conversation_id: thread.id, message });
        const current = this.server.getThread(thread.id).turns.find(value => value.id === turnId);
        for (const item of current.items) if (item.type !== 'userMessage') for (const message of this.projectItem(thread, current, item)) emit({ conversation_id: thread.id, message });
        if (transaction.afterReply) setTimeout(transaction.afterReply, 0);
        if (request.signal?.aborted) abort();
        else if (!transaction.afterReply) {
          const existing = this.server.getThread(thread.id).turns.find(turn => turn.id === turnId);
          if (existing.status !== 'inProgress') queueMicrotask(() => finishStream(existing));
        }
      },
      cancel: () => { closed = true; clearInterval(heartbeat); remove(); removeAbort(); },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Local-Adapter': 'original-classic-chat-rest' } });
  }
}
