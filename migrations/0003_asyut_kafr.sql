-- Demo shops so أسيوط and كفر الشيخ are not empty filters.

insert into shops (id, owner_user_id, shop_name, area, address, phone, discount_percentage, lat, lng, is_demo, about)
values
  (7, null, 'لمسة أسيوط', 'أسيوط', 'شارع الجمهورية، أسيوط', '01010000007', 15, 27.1809, 31.1837, true, 'شاشات وبطاريات في وسط أسيوط، واستلام من البيت داخل المدينة.'),
  (8, null, 'دلتا موبايل', 'كفر الشيخ', 'شارع المدارس، كفر الشيخ', '01010000008', 20, 31.1107, 30.9388, true, 'صيانة سريعة وإكسسوارات. الدليفري داخل كفر الشيخ.')
on conflict (id) do nothing;

insert into products (id, shop_id, name, price_egp, discount_price_egp, image_url)
values
  (13, 7, 'جراب سيليكون', 340, 270, '/catalog/case.jpg'),
  (14, 7, 'واقي شاشة زجاج', 160, 120, '/catalog/glass.jpg'),
  (15, 8, 'سماعة لاسلكية', 850, 690, '/catalog/buds.jpg'),
  (16, 8, 'كابل شحن', 210, 150, '/catalog/cable.jpg')
on conflict (id) do nothing;

insert into reviews (shop_id, client_id, author_name, stars, comment, created_at)
select * from (values
  (7, 'seed', 'محمود عبد الرحمن', 5, 'غيّروا الشاشة في أسيوط في نفس اليوم، والخصم كان واضح.', now() - interval '3 days'),
  (7, 'seed', 'نادية فتحي', 4, 'الدليفري استلم الجهاز من الجمهورية ورجّعه شغال.', now() - interval '8 days'),
  (8, 'seed', 'إسلام رضوان', 5, 'خصم ٢٠٪ اتطبق على البطارية. شغل نضيف.', now() - interval '2 days'),
  (8, 'seed', 'فاطمة السيد', 4, 'الجراب كويس والسعر بعد الخصم مناسب.', now() - interval '6 days')
) as seed(shop_id, client_id, author_name, stars, comment, created_at)
where not exists (
  select 1 from reviews r
  where r.shop_id = seed.shop_id and r.author_name = seed.author_name and r.client_id = 'seed'
);

select setval('shops_id_seq', (select coalesce(max(id), 1) from shops));
select setval('products_id_seq', (select coalesce(max(id), 1) from products));
