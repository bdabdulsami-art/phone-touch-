-- Demo shops for أسيوط and كفر الشيخ are not seeded.

select setval('shops_id_seq', (select coalesce(max(id), 1) from shops));
select setval('products_id_seq', (select coalesce(max(id), 1) from products));
