CREATE TABLE site_billing_customers (
  user_id TEXT NOT NULL REFERENCES users(id),
  livemode INTEGER NOT NULL CHECK (livemode IN (0, 1)),
  customer_id TEXT NOT NULL,
  PRIMARY KEY (user_id,livemode),
  UNIQUE (customer_id,livemode)
);
--> statement-breakpoint
CREATE TABLE site_billing_checkouts (
  user_id TEXT NOT NULL REFERENCES users(id),
  livemode INTEGER NOT NULL CHECK (livemode IN (0, 1)),
  attempt_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL,
  price_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  session_id TEXT UNIQUE,
  checkout_url TEXT,
  PRIMARY KEY (user_id,livemode)
);
--> statement-breakpoint
CREATE TABLE site_billing_subscriptions (
  subscription_id TEXT NOT NULL,
  livemode INTEGER NOT NULL CHECK (livemode IN (0, 1)),
  user_id TEXT NOT NULL REFERENCES users(id),
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_through INTEGER NOT NULL,
  cancel_at_period_end INTEGER NOT NULL,
  event_created INTEGER NOT NULL,
  reconciled_at INTEGER NOT NULL,
  PRIMARY KEY (subscription_id,livemode)
);
--> statement-breakpoint
CREATE INDEX site_billing_subscriptions_by_user ON site_billing_subscriptions(user_id, livemode, paid_through);
--> statement-breakpoint
CREATE TABLE site_billing_events (
  event_id TEXT NOT NULL,
  livemode INTEGER NOT NULL CHECK (livemode IN (0, 1)),
  processed_at INTEGER NOT NULL,
  PRIMARY KEY (event_id,livemode)
);
