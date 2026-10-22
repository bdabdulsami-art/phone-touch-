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

insert into shops (id, owner_user_id, shop_name, area, address, phone, discount_percentage, lat, lng, is_demo, about)
values
  (1, null, 'لمسة الموبايل', 'مدينة نصر', 'عباس العقاد، مدينة نصر', '01010000001', 15, 30.0626, 31.3301, true, 'تغيير شاشات وبطاريات في نفس اليوم لمعظم الموديلات.'),
  (2, null, 'ورشة الشاشة', 'مصر الجديدة', 'شارع الحجاز، مصر الجديدة', '01010000002', 25, 30.0911, 31.3225, true, 'متخصصين شاشات. الخصم يتطبق على أجرة الإصلاح بعد الفحص.'),
  (3, null, 'فون فيكس', 'المعادي', 'شارع 9، المعادي', '01010000003', 10, 29.9603, 31.2569, true, 'صيانة سريعة وإكسسوارات متاحة للاستلام من المحل.'),
  (4, null, 'لمسة برو', 'التجمع الخامس', 'التسعين الشمالي، التجمع الخامس', '01010000004', 20, 30.0074, 31.4913, true, 'محلات التجمع. دليفري داخل القاهرة الجديدة.'),
  (5, null, 'دكتور موبايل', 'الدقي', 'شارع التحرير، الدقي', '01010000005', 15, 30.0385, 31.2120, true, 'بطاريات، سوفت وير، ومشاكل شحن.'),
  (6, null, 'آي ريبير', 'الشيخ زايد', 'الحي السادس عشر، الشيخ زايد', '01010000006', 20, 30.0305, 30.9765, true, 'استلام من البيت أو زيارة المحل، الاختيار لك.')
on conflict (id) do nothing;

insert into products (id, shop_id, name, price_egp, discount_price_egp, image_url)
values
  (1, 1, 'جراب سيليكون مطفي', 350, 280, '/catalog/case.jpg'),
  (2, 1, 'سماعة لاسلكية', 890, 750, '/catalog/buds.jpg'),
  (3, 2, 'واقي شاشة زجاج', 180, 120, '/catalog/glass.jpg'),
  (4, 2, 'كابل شحن مضفر', 220, 160, '/catalog/cable.jpg'),
  (5, 3, 'جراب شفاف', 320, 250, '/catalog/case.jpg'),
  (6, 3, 'سماعة لاسلكية', 760, 640, '/catalog/buds.jpg'),
  (7, 4, 'واقي شاشة', 240, 180, '/catalog/glass.jpg'),
  (8, 4, 'كابل شحن', 200, 150, '/catalog/cable.jpg'),
  (9, 5, 'جراب سيليكون', 390, 300, '/catalog/case.jpg'),
  (10, 5, 'كابل شحن سريع', 260, 190, '/catalog/cable.jpg'),
  (11, 6, 'سماعة لاسلكية', 980, 820, '/catalog/buds.jpg'),
  (12, 6, 'واقي شاشة', 170, 130, '/catalog/glass.jpg')
on conflict (id) do nothing;

insert into reviews (shop_id, client_id, author_name, stars, comment, created_at)
select * from (values
  (1, 'seed', 'منى عادل', 5, 'الشاشة اتغيرت في نفس اليوم، والخصم كان مكتوب من الأول.', now() - interval '2 days'),
  (1, 'seed', 'كريم حسن', 4, 'الدليفري جه في معاد كويس. الجهاز رجع شغال.', now() - interval '6 days'),
  (2, 'seed', 'سارة محمود', 5, 'خصم ٢٥٪ اتطبق فعلاً على تغيير الشاشة. شغل نضيف.', now() - interval '1 day'),
  (2, 'seed', 'يوسف فتحي', 5, 'شرحو العطل قبل الإصلاح، ومفيش مفاجآت في الحساب.', now() - interval '9 days'),
  (3, 'seed', 'هدى سمير', 4, 'الجراب كويس والسعر بعد الخصم مناسب.', now() - interval '4 days'),
  (3, 'seed', 'عمر شريف', 4, 'روحت المحل بنفسي، الاستلام كان سريع.', now() - interval '11 days'),
  (4, 'seed', 'ليلى ناصر', 5, 'واضحين في التكلفة. البطارية الجديدة تمام.', now() - interval '3 days'),
  (4, 'seed', 'تامر جمال', 4, 'الدليفري اتأخر نص ساعة، بس الجهاز رجع مظبوط.', now() - interval '8 days'),
  (5, 'seed', 'نورا فؤاد', 5, 'مشكلة الشحن خلصت من أول زيارة.', now() - interval '5 days'),
  (5, 'seed', 'أحمد زكي', 4, 'المحل مرتب والرد على الطلب كان سريع.', now() - interval '12 days'),
  (6, 'seed', 'دينا هشام', 4, 'جربة واقي الشاشة كويسة ومفيش فقاعات.', now() - interval '7 days'),
  (6, 'seed', 'حسام علي', 5, 'استلموا الجهاز من زايد ورجعوه في نفس اليوم.', now() - interval '2 days')
) as seed(shop_id, client_id, author_name, stars, comment, created_at)
where not exists (select 1 from reviews limit 1);

select setval('shops_id_seq', (select coalesce(max(id), 1) from shops));
select setval('products_id_seq', (select coalesce(max(id), 1) from products));
