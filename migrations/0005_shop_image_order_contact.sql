-- Shop photo (Vercel Blob URL) and a snapshot of the client on each order.
-- Address and phone stay in the row, but the API hides them until the shop accepts.

alter table shops add column if not exists image_url text;

alter table orders add column if not exists device_brand text not null default '';
alter table orders add column if not exists device_model text not null default '';
alter table orders add column if not exists client_phone text not null default '';
alter table orders add column if not exists client_address text not null default '';
alter table orders add column if not exists client_area text not null default '';
