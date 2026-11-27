-- Shop pin is explicit. Client coordinates live on the order and are cleared later.

alter table shops add column if not exists location_set boolean not null default false;

alter table orders add column if not exists client_lat double precision;
alter table orders add column if not exists client_lng double precision;
alter table orders add column if not exists closed_at timestamptz;
