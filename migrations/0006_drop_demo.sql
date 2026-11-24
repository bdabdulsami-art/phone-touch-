-- Remove demo shops once. Profiles and auth users stay.
-- شاشه / شاشة stay even if they have no merchant link.

create table if not exists _cleanup_blobs (
  url text primary key
);

create temporary table demo_shops on commit drop as
select id, shop_name, area, image_url
from shops
where btrim(shop_name) not in ('شاشه', 'شاشة')
  and (
    is_demo
    or btrim(shop_name) in (
      'دكتور موبايل',
      'لمسة الموبايل',
      'ورشة الشاشة',
      'دلتا موبايل',
      'فون فيكس',
      'لمسة أسبوع',
      'لمسة برو',
      'آي ريبير',
      'لمسة أسيوط'
    )
    or about like '%محل تجريبي%'
    or (
      owner_user_id is null
      and coalesce(btrim(merchant_email), '') = ''
    )
  );

insert into _cleanup_blobs (url)
select image_url from demo_shops
where image_url like '%blob.vercel-storage.com%'
on conflict do nothing;

insert into _cleanup_blobs (url)
select o.device_image from orders o
join demo_shops d on d.id = o.shop_id
where o.device_image like '%blob.vercel-storage.com%'
on conflict do nothing;

do $$
declare
  r record;
begin
  for r in
    select d.id, d.shop_name, d.area,
      (select count(*) from products p where p.shop_id = d.id) as products,
      (select count(*) from reviews v where v.shop_id = d.id) as reviews,
      (select count(*) from orders o where o.shop_id = d.id) as orders
    from demo_shops d
    order by d.id
  loop
    raise notice 'delete shop id=% name=% area=% products=% reviews=% orders=%',
      r.id, r.shop_name, r.area, r.products, r.reviews, r.orders;
  end loop;
end $$;

delete from orders where shop_id in (select id from demo_shops);
delete from shops where id in (select id from demo_shops);

update shops
set area = 'أسيوط', lat = 27.1809, lng = 31.1837
where area is distinct from 'أسيوط'
  and btrim(shop_name) not in ('شاشه', 'شاشة');

do $$
declare
  r record;
begin
  for r in select id, shop_name, area from shops order by id loop
    raise notice 'kept shop id=% name=% area=%', r.id, r.shop_name, r.area;
  end loop;
end $$;

select setval('shops_id_seq', (select coalesce(max(id), 1) from shops));
select setval('products_id_seq', (select coalesce(max(id), 1) from products));
