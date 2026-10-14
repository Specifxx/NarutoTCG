-- Market schema for the price compare app: sets, printings, current vendor quotes and
-- listings, daily vendor history, the daily cross-vendor market price, and the
-- card_market_summary view that the directory reads.
--
-- Idempotent: every statement is safe to run again. Object names are unqualified, so the
-- objects land in the first schema of the search_path (public on Supabase).
-- Enumerations are text + CHECK rather than PG enums so values can evolve with a constraint swap.
-- The pricing rules mirror lib/market/analytics.ts; the Postgres integration test asserts parity.

-- Set codes are upper-case: URLs, facets and card references all compare them that way.
create table if not exists market_sets (
  code        text primary key check (code <> '' and code = upper(code)),
  name        text not null check (name <> ''),
  released_on date not null
);

create table if not exists market_cards (
  id         text primary key check (id <> ''),
  name       text not null check (name <> ''),
  character  text not null,
  set_code   text not null references market_sets (code),
  number     text not null,
  type       text not null check (type in ('character', 'jutsu', 'mission', 'item', 'event')),
  rarity     text not null check (rarity in ('common', 'uncommon', 'rare', 'super-rare', 'secret-rare', 'parallel', 'promo')),
  finish     text not null check (finish in ('non-foil', 'foil', 'textured-foil')),
  village    text,
  cost       integer check (cost >= 0),
  power      integer check (power >= 0),
  text       text,
  image_url  text,
  created_at timestamptz not null default now()
);

-- Card references resolve ids case-insensitively, so ids must stay unique ignoring case.
create unique index if not exists market_cards_id_lower_key on market_cards (lower(id));
create index if not exists market_cards_set_code_idx on market_cards (set_code);
create index if not exists market_cards_rarity_idx on market_cards (rarity);
create index if not exists market_cards_finish_idx on market_cards (finish);
create index if not exists market_cards_character_idx on market_cards (character);

-- Current snapshot per card and vendor. Native prices are in `currency`; *_usd were
-- converted with the FX rate in force at capture time.
create table if not exists vendor_quotes (
  card_id        text not null references market_cards (id) on delete cascade,
  vendor         text not null check (vendor in ('tcgplayer', 'ebay', 'cardmarket')),
  currency       text not null check (currency in ('USD', 'EUR')),
  low            numeric(12, 2) check (low >= 0),
  mid            numeric(12, 2) check (mid >= 0),
  high           numeric(12, 2) check (high >= 0),
  market         numeric(12, 2) check (market >= 0),
  low_usd        numeric(12, 2) check (low_usd >= 0),
  mid_usd        numeric(12, 2) check (mid_usd >= 0),
  high_usd       numeric(12, 2) check (high_usd >= 0),
  market_usd     numeric(12, 2) check (market_usd >= 0),
  listings_count integer not null default 0 check (listings_count >= 0),
  -- Product page; null when unknown (readers fall back to the vendor's search page).
  url            text,
  updated_at     timestamptz not null,
  primary key (card_id, vendor)
);

-- Live offers behind a quote; replaced as a set whenever a newer snapshot carries listings.
create table if not exists vendor_listings (
  id           text primary key,
  card_id      text not null,
  vendor       text not null check (vendor in ('tcgplayer', 'ebay', 'cardmarket')),
  seller       text not null,
  condition    text not null check (condition in ('NM', 'LP', 'MP', 'HP', 'DMG')),
  quantity     integer not null check (quantity >= 1),
  currency     text not null check (currency in ('USD', 'EUR')),
  price        numeric(12, 2) not null check (price >= 0),
  shipping     numeric(12, 2) check (shipping >= 0),
  price_usd    numeric(12, 2) not null check (price_usd >= 0),
  shipping_usd numeric(12, 2) check (shipping_usd >= 0),
  total_usd    numeric(12, 2) not null check (total_usd >= 0),
  url          text,
  updated_at   timestamptz not null,
  foreign key (card_id, vendor) references vendor_quotes (card_id, vendor) on delete cascade
);

create index if not exists vendor_listings_card_idx on vendor_listings (card_id, vendor);

-- One row per card, vendor and UTC day; a later write for the same day overwrites it.
create table if not exists price_history (
  card_id        text not null references market_cards (id) on delete cascade,
  vendor         text not null check (vendor in ('tcgplayer', 'ebay', 'cardmarket')),
  day            date not null,
  currency       text not null check (currency in ('USD', 'EUR')),
  low            numeric(12, 2) check (low >= 0),
  mid            numeric(12, 2) check (mid >= 0),
  high           numeric(12, 2) check (high >= 0),
  market         numeric(12, 2) check (market >= 0),
  low_usd        numeric(12, 2) check (low_usd >= 0),
  mid_usd        numeric(12, 2) check (mid_usd >= 0),
  high_usd       numeric(12, 2) check (high_usd >= 0),
  market_usd     numeric(12, 2) check (market_usd >= 0),
  listings_count integer not null default 0 check (listings_count >= 0),
  captured_at    timestamptz not null,
  primary key (card_id, vendor, day)
);

create index if not exists price_history_day_idx on price_history (day);

-- Cross-vendor aggregate (median of the day's vendor market prices). Written by the
-- application with analytics.aggregateMarket, never computed in SQL, so both back ends agree.
create table if not exists market_price_daily (
  card_id      text not null references market_cards (id) on delete cascade,
  day          date not null,
  market_usd   numeric(12, 2) check (market_usd >= 0),
  vendor_count integer not null default 0 check (vendor_count >= 0),
  primary key (card_id, day)
);

create index if not exists market_price_daily_priced_idx
  on market_price_daily (card_id, day desc) include (market_usd)
  where market_usd is not null;

-- The catalog's latest market day, which decides which cards are current enough to rank as movers.
create index if not exists market_price_daily_day_idx on market_price_daily (day) where market_usd is not null;

-- Facts about the stored data itself. 'demo_data' = 'true' marks the simulated db:seed dataset,
-- so the UI keeps labelling it as demo data in Postgres mode.
create table if not exists market_meta (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- One directory row per card, reproducing analytics.buildSummary:
-- as_of = latest day with a market price; base_Nd = latest market price on or before
-- as_of - N days; change_Nd_pct = (market - base) / base * 100 in float8, the same IEEE
-- operations as JavaScript, so sorting and ties match the in-memory back end exactly;
-- lowest = min positive vendor low, ties in vendor display order; sparkline = market prices
-- in (as_of - 30, as_of]. Lowest, vendor/listing counts and updated_at use current quotes only:
-- captured on or after as_of - 7 days (UTC midnight), all quotes when the card was never priced.
-- Window lengths mirror CHANGE_WINDOW_DAYS / SPARKLINE_DAYS / CARRY_FORWARD_MAX_DAYS in constants.ts.
create or replace view card_market_summary
with (security_invoker = true) as
select
  c.id as card_id,
  latest.day as as_of,
  latest.market_usd as market_price,
  base_7d.market_usd as base_7d,
  base_30d.market_usd as base_30d,
  base_90d.market_usd as base_90d,
  case when base_7d.market_usd > 0
    then (latest.market_usd::float8 - base_7d.market_usd::float8) / base_7d.market_usd::float8 * 100
  end as change_7d_pct,
  case when base_30d.market_usd > 0
    then (latest.market_usd::float8 - base_30d.market_usd::float8) / base_30d.market_usd::float8 * 100
  end as change_30d_pct,
  case when base_90d.market_usd > 0
    then (latest.market_usd::float8 - base_90d.market_usd::float8) / base_90d.market_usd::float8 * 100
  end as change_90d_pct,
  lowest.low_usd as lowest_price,
  lowest.vendor as lowest_vendor,
  quotes.vendor_count,
  quotes.listings_count,
  quotes.updated_at,
  coalesce(spark.prices, '{}'::numeric[]) as sparkline
from market_cards c
left join lateral (
  select d.day, d.market_usd
  from market_price_daily d
  where d.card_id = c.id and d.market_usd is not null
  order by d.day desc
  limit 1
) latest on true
left join lateral (
  select d.market_usd
  from market_price_daily d
  where d.card_id = c.id and d.market_usd is not null and d.day <= latest.day - 7
  order by d.day desc
  limit 1
) base_7d on true
left join lateral (
  select d.market_usd
  from market_price_daily d
  where d.card_id = c.id and d.market_usd is not null and d.day <= latest.day - 30
  order by d.day desc
  limit 1
) base_30d on true
left join lateral (
  select d.market_usd
  from market_price_daily d
  where d.card_id = c.id and d.market_usd is not null and d.day <= latest.day - 90
  order by d.day desc
  limit 1
) base_90d on true
left join lateral (
  select q.vendor, q.low_usd
  from vendor_quotes q
  where q.card_id = c.id and q.low_usd > 0
    and (latest.day is null or q.updated_at >= (latest.day - 7)::timestamp at time zone 'UTC')
  order by q.low_usd, array_position(array['tcgplayer', 'ebay', 'cardmarket']::text[], q.vendor)
  limit 1
) lowest on true
cross join lateral (
  select
    count(*)::integer as vendor_count,
    coalesce(sum(q.listings_count), 0)::integer as listings_count,
    max(q.updated_at) as updated_at
  from vendor_quotes q
  where q.card_id = c.id
    and (latest.day is null or q.updated_at >= (latest.day - 7)::timestamp at time zone 'UTC')
) quotes
left join lateral (
  select array_agg(d.market_usd order by d.day) as prices
  from market_price_daily d
  where d.card_id = c.id and d.market_usd is not null
    and d.day > latest.day - 30 and d.day <= latest.day
) spark on true;

-- Supabase hardening: RLS everywhere. The app writes over the direct / service-role
-- connection (table owner, bypasses RLS); the public API roles may only read. The role
-- grants and policies are skipped on plain PostgreSQL, where those roles do not exist.
alter table market_sets enable row level security;
alter table market_cards enable row level security;
alter table vendor_quotes enable row level security;
alter table vendor_listings enable row level security;
alter table price_history enable row level security;
alter table market_price_daily enable row level security;
-- No policy: only the owner connection reads or writes it.
alter table market_meta enable row level security;

do $$
declare
  readers text;
  market_table text;
begin
  select string_agg(quote_ident(rolname), ', ' order by rolname)
    into readers
    from pg_roles
   where rolname in ('anon', 'authenticated');
  if readers is null then
    return;
  end if;

  foreach market_table in array array[
    'market_sets', 'market_cards', 'vendor_quotes', 'vendor_listings', 'price_history', 'market_price_daily'
  ] loop
    -- TRUNCATE ignores RLS, so write privileges are revoked outright as well.
    execute format('revoke insert, update, delete, truncate on %I from %s', market_table, readers);
    execute format('grant select on %I to %s', market_table, readers);
    if not exists (
      select 1 from pg_policies
       where schemaname = current_schema() and tablename = market_table and policyname = 'market_public_read'
    ) then
      execute format('create policy market_public_read on %I for select to %s using (true)', market_table, readers);
    end if;
  end loop;
  execute format('grant select on card_market_summary to %s', readers);
end
$$;
