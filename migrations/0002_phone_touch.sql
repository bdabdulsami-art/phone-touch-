-- Phone Touch marketplace: profiles, shops, repairs, accessories, reviews.

create table if not exists profiles (
  user_id text primary key,
  name text not null,
  phone text not null,
  address text not null,
  area text not null,
  role text not null check (role in ('client', 'technician')),
  created_at timestamptz not null default now()
);

create table if not exists shops (
  id serial primary key,
  owner_user_id text unique,
  shop_name text not null,
  area text not null,
  address text not null,
  phone text not null,
  discount_percentage integer not null default 15 check (discount_percentage in (10, 15, 20, 25)),
  lat double precision not null,
  lng double precision not null,
  is_demo boolean not null default false,
  about text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  shop_id integer not null references shops (id) on delete cascade,
  name text not null,
  price_egp integer not null check (price_egp > 0),
  discount_price_egp integer not null check (discount_price_egp >= 0),
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists products_shop_id_idx on products (shop_id);

create table if not exists orders (
  id serial primary key,
  client_id text not null,
  shop_id integer not null references shops (id),
  kind text not null check (kind in ('repair', 'accessory')),
  product_id integer,
  product_name text,
  price_egp integer,
  device_image text,
  problem_description text not null default '',
  service_type text not null check (service_type in ('delivery', 'walk_in')),
  delivery_cost_client integer not null default 0,
  delivery_cost_tech integer not null default 0,
  status text not null check (status in (
    'pending', 'rejected', 'cancelled', 'courier_pickup', 'accepted',
    'repairing', 'courier_return', 'ready', 'completed'
  )),
  created_at timestamptz not null default now()
);

create index if not exists orders_client_id_idx on orders (client_id);
create index if not exists orders_shop_id_idx on orders (shop_id);

create table if not exists reviews (
  id serial primary key,
  shop_id integer not null references shops (id) on delete cascade,
  order_id integer,
  client_id text not null,
  author_name text not null,
  stars integer not null check (stars between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists reviews_order_id_uq on reviews (order_id) where order_id is not null;
create index if not exists reviews_shop_id_idx on reviews (shop_id);

-- Demo shops are not seeded. Production data is created by real signups.

select setval('shops_id_seq', (select coalesce(max(id), 1) from shops));
select setval('products_id_seq', (select coalesce(max(id), 1) from products));
