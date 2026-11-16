-- PostgreSQL schema for the ledger. The database enforces the same rules as ledger.ts, because two app instances can
-- post at once and a bug in application code must not be able to corrupt the books.
--   * entries are positive integer minor units (bigint), one currency per transaction;
--   * every transaction balances (debits = credits), checked at COMMIT;
--   * ledger rows and the audit log are append-only (UPDATE, DELETE, TRUNCATE raise);
--   * the idempotency key is unique, a transaction can be reversed once.
-- Production hardening you must do yourself: the application role gets INSERT and SELECT only on these tables (no
-- table ownership), migrations run as a different role, backups are tested, and the latest audit hash is anchored
-- outside the database. Review with a DBA or an accountant before moving real money.

create table ledger_accounts (
  id text primary key,
  currency char(3) not null,
  normal text not null check (normal in ('debit', 'credit')),
  no_overdraft boolean not null default false
);

create table ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  idempotency_key text not null unique check (length(idempotency_key) >= 8),
  content_hash text not null,
  description text not null,
  ref text,
  reverses uuid unique references ledger_transactions (id),
  posted_at timestamptz not null default now()
);

create table ledger_entries (
  id bigint generated always as identity primary key,
  tx_id uuid not null references ledger_transactions (id),
  account_id text not null references ledger_accounts (id),
  direction text not null check (direction in ('debit', 'credit')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null
);
create index ledger_entries_account on ledger_entries (account_id, id);
create index ledger_entries_tx on ledger_entries (tx_id);

create table ledger_audit (
  seq bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor text not null check (actor <> ''),
  action text not null,
  subject text not null,
  data jsonb not null,
  prev_hash text not null,
  hash text not null
);

-- Balanced and single-currency, checked when the transaction commits (so lines can be inserted one by one).
create function ledger_check_balanced() returns trigger language plpgsql as $$
declare s bigint; n int; c int;
begin
  select coalesce(sum(case direction when 'debit' then amount_minor else -amount_minor end), 0),
         count(*), count(distinct currency)
    into s, n, c from ledger_entries where tx_id = new.tx_id;
  if n < 2 then raise exception 'transaction % needs at least two entries', new.tx_id; end if;
  if c <> 1 then raise exception 'transaction % mixes currencies', new.tx_id; end if;
  if s <> 0 then raise exception 'transaction % is not balanced (off by %)', new.tx_id, s; end if;
  return null;
end $$;

create constraint trigger ledger_entries_balanced after insert on ledger_entries
  deferrable initially deferred for each row execute function ledger_check_balanced();

create function ledger_append_only() returns trigger language plpgsql as $$
begin raise exception '% is append-only: post a reversal instead', tg_table_name; end $$;

create trigger ledger_entries_immutable before update or delete on ledger_entries
  for each row execute function ledger_append_only();
create trigger ledger_transactions_immutable before update or delete on ledger_transactions
  for each row execute function ledger_append_only();
create trigger ledger_audit_immutable before update or delete on ledger_audit
  for each row execute function ledger_append_only();
create trigger ledger_entries_no_truncate before truncate on ledger_entries
  for each statement execute function ledger_append_only();
create trigger ledger_transactions_no_truncate before truncate on ledger_transactions
  for each statement execute function ledger_append_only();
create trigger ledger_audit_no_truncate before truncate on ledger_audit
  for each statement execute function ledger_append_only();

-- Balance per account in debit-positive minor units. Show credit-normal accounts as the negative of this.
create view ledger_balances as
  select account_id,
         sum(case direction when 'debit' then amount_minor else -amount_minor end) as signed_minor
    from ledger_entries group by account_id;
