const entry = new URL('../', import.meta.url);
const previous = new URL(location.href);
const conversation = previous.searchParams.get('c') ?? previous.pathname.match(/\/c\/([^/]+)\/?$/)?.[1];
if (conversation) entry.searchParams.set('c', conversation);
entry.searchParams.set('desk', '1');
if (previous.href !== entry.href) location.replace(entry);
