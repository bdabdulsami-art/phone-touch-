-- Central merchant gate. Demo shops stay public. Real shops stay hidden until active.

alter table shops add column if not exists merchant_status text not null default 'active';
alter table shops add column if not exists merchant_email text;

update shops
set merchant_status = 'pending'
where is_demo = false
  and owner_user_id is not null
  and (merchant_email is null or merchant_email = '');

alter table shops drop constraint if exists shops_merchant_status_chk;
alter table shops add constraint shops_merchant_status_chk
  check (merchant_status in ('pending', 'active', 'suspended', 'banned', 'rejected'));
