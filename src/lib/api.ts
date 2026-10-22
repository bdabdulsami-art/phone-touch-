import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  DELIVERY_FEE,
  DISCOUNTS,
  areaByName,
  isSafeImage,
  num,
  techMoves,
  type OrderKind,
  type OrderView,
  type Product,
  type Profile,
  type Review,
  type ServiceType,
  type Shop,
} from "@/lib/domain";

function text(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function asRecord(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") throw new Error("بيانات ناقصة");
  return v as Record<string, unknown>;
}

function phoneOf(v: unknown) {
  const raw = text(v, 20);
  let n = raw.replace(/[^\d+]/g, "");
  if (n.startsWith("+20")) n = `0${n.slice(3)}`;
  else if (n.startsWith("20") && n.length === 12) n = `0${n.slice(2)}`;
  if (!/^01[0125]\d{8}$/.test(n)) throw new Error("اكتب رقم موبايل مصري صحيح");
  return n;
}

function areaOf(v: unknown) {
  const area = areaByName(text(v, 40));
  if (!area) throw new Error("اختار منطقة من القائمة");
  return area;
}

function discountOf(v: unknown) {
  const n = num(v);
  if (!(DISCOUNTS as readonly number[]).includes(n)) throw new Error("الخصم ١٠ أو ١٥ أو ٢٠ أو ٢٥ بالمية");
  return n;
}

function imageOf(v: unknown, required: boolean) {
  if (typeof v !== "string" || !v) {
    if (required) throw new Error("صورة الجهاز مطلوبة");
    return null;
  }
  if (!isSafeImage(v) || v.length > 480_000) throw new Error("الصورة غير مقبولة");
  return v;
}

type ShopSql = {
  id: number;
  shop_name: string;
  area: string;
  address: string;
  phone: string;
  discount_percentage: number | string;
  lat: number | string;
  lng: number | string;
  is_demo: boolean;
  about: string;
  review_count: number | string;
  rating: number | string | null;
};

function mapShop(row: ShopSql): Shop {
  const reviewCount = num(row.review_count);
  return {
    id: num(row.id),
    shopName: row.shop_name,
    area: row.area,
    address: row.address,
    phone: row.phone,
    discount: num(row.discount_percentage),
    lat: num(row.lat),
    lng: num(row.lng),
    isDemo: Boolean(row.is_demo),
    about: row.about,
    reviewCount,
    rating: reviewCount === 0 || row.rating == null ? null : num(row.rating),
  };
}

type ProductSql = {
  id: number;
  shop_id: number;
  name: string;
  price_egp: number | string;
  discount_price_egp: number | string;
  image_url: string;
};

function mapProduct(row: ProductSql): Product {
  return {
    id: num(row.id),
    shopId: num(row.shop_id),
    name: row.name,
    price: num(row.price_egp),
    discountPrice: num(row.discount_price_egp),
    imageUrl: row.image_url,
  };
}

type OrderSql = {
  id: number;
  shop_id: number;
  shop_name: string;
  area: string;
  is_demo: boolean;
  discount_percentage: number | string;
  kind: OrderKind;
  product_name: string | null;
  price_egp: number | string | null;
  problem_description: string;
  service_type: ServiceType;
  delivery_cost_client: number | string;
  delivery_cost_tech: number | string;
  status: string;
  created_at: string;
  device_image: string | null;
  client_name: string | null;
  owner_user_id: string | null;
  review_stars: number | null;
  review_comment: string | null;
};

function mapOrder(row: OrderSql, userId: string, withImage: boolean): OrderView {
  return {
    id: num(row.id),
    shopId: num(row.shop_id),
    shopName: row.shop_name,
    area: row.area,
    isDemo: Boolean(row.is_demo),
    discount: num(row.discount_percentage),
    kind: row.kind,
    productName: row.product_name,
    price: row.price_egp == null ? null : num(row.price_egp),
    problem: row.problem_description,
    serviceType: row.service_type,
    deliveryClient: num(row.delivery_cost_client),
    deliveryTech: num(row.delivery_cost_tech),
    status: row.status,
    createdAt: row.created_at,
    deviceImage: withImage ? row.device_image : null,
    clientName: row.client_name ?? "عميل",
    ownedShop: row.owner_user_id === userId,
    review:
      row.review_stars == null
        ? null
        : { stars: num(row.review_stars), comment: row.review_comment ?? "" },
  };
}

export const getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Profile | null> => {
    const sql = await getSql();
    const rows = await sql<{
      name: string;
      phone: string;
      address: string;
      area: string;
      role: "client" | "technician";
      shop_id: number | null;
      shop_name: string | null;
      shop_area: string | null;
      shop_address: string | null;
      shop_phone: string | null;
      discount_percentage: number | null;
      shop_about: string | null;
    }>`
      select p.name, p.phone, p.address, p.area, p.role,
        s.id as shop_id, s.shop_name, s.area as shop_area, s.address as shop_address,
        s.phone as shop_phone, s.discount_percentage, s.about as shop_about
      from profiles p
      left join shops s on s.owner_user_id = p.user_id
      where p.user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      name: row.name,
      phone: row.phone,
      address: row.address,
      area: row.area,
      role: row.role,
      shop: row.shop_id
        ? {
            id: num(row.shop_id),
            shopName: row.shop_name ?? "",
            area: row.shop_area ?? "",
            address: row.shop_address ?? "",
            phone: row.shop_phone ?? "",
            discount: num(row.discount_percentage),
            about: row.shop_about ?? "",
          }
        : null,
    };
  });

export const createProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const body = asRecord(input);
    const role = body.role === "technician" ? "technician" : body.role === "client" ? "client" : null;
    if (!role) throw new Error("اختار نوع الحساب");
    const name = text(body.name, 60);
    if (name.length < 2) throw new Error("اكتب الاسم");
    const phone = phoneOf(body.phone);
    const address = text(body.address, 160);
    if (address.length < 6) throw new Error("اكتب العنوان بالتفصيل");
    const area = areaOf(body.area);
    const shopName = text(body.shopName, 60);
    const discount = role === "technician" ? discountOf(body.discount ?? 15) : 15;
    if (role === "technician" && shopName.length < 2) throw new Error("اكتب اسم المحل");
    return { role, name, phone, address, area, shopName, discount };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const existing = await sql`select user_id from profiles where user_id = ${context.userId}`;
    if (existing.length) throw new Error("الحساب متسجل بالفعل");
    await sql`
      insert into profiles (user_id, name, phone, address, area, role)
      values (${context.userId}, ${data.name}, ${data.phone}, ${data.address}, ${data.area.name}, ${data.role})
    `;
    if (data.role === "technician") {
      await sql`
        insert into shops (
          owner_user_id, shop_name, area, address, phone, discount_percentage, lat, lng, is_demo, about
        ) values (
          ${context.userId}, ${data.shopName}, ${data.area.name}, ${data.address}, ${data.phone},
          ${data.discount}, ${data.area.lat}, ${data.area.lng}, false, ''
        )
      `;
    }
    return { ok: true };
  });

export const updateProfile = createServerFn({ method: "POST" })
 .validator((input: unknown) => {
    const body = asRecord(input);
    const name = text(body.name, 60);
    if (name.length < 2) throw new Error("اكتب الاسم");
    const address = text(body.address, 160);
    if (address.length < 6) throw new Error("اكتب العنوان بالتفصيل");
    return { name, phone: phoneOf(body.phone), address, area: areaOf(body.area) };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      update profiles
      set name = ${data.name}, phone = ${data.phone}, address = ${data.address}, area = ${data.area.name}
      where user_id = ${context.userId}
      returning user_id
    `;
    if (!rows.length) throw new Error("كمّل بيانات الحساب الأول");
    return { ok: true };
  });

export const saveShop = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const body = asRecord(input);
    const shopName = text(body.shopName, 60);
    if (shopName.length < 2) throw new Error("اكتب اسم المحل");
    const address = text(body.address, 160);
    if (address.length < 6) throw new Error("اكتب عنوان المحل");
    return {
      shopName,
      phone: phoneOf(body.phone),
      address,
      area: areaOf(body.area),
      discount: discountOf(body.discount ?? 15),
    };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await sql`select user_id from profiles where user_id = ${context.userId}`;
    if (!profile.length) throw new Error("كمّل بيانات الحساب الأول");
    const owned = await sql<{ id: number }>`select id from shops where owner_user_id = ${context.userId}`;
    if (owned[0]) {
      await sql`
        update shops
        set shop_name = ${data.shopName}, area = ${data.area.name}, address = ${data.address},
            phone = ${data.phone}, lat = ${data.area.lat}, lng = ${data.area.lng}
        where owner_user_id = ${context.userId}
      `;
    } else {
      await sql`
        insert into shops (
          owner_user_id, shop_name, area, address, phone, discount_percentage, lat, lng, is_demo, about
        ) values (
          ${context.userId}, ${data.shopName}, ${data.area.name}, ${data.address}, ${data.phone},
          ${data.discount}, ${data.area.lat}, ${data.area.lng}, false, ''
        )
      `;
    }
    await sql`update profiles set role = 'technician' where user_id = ${context.userId}`;
    return { ok: true };
  });

export const setDiscount = createServerFn({ method: "POST" })
  .validator((input: unknown) => discountOf(input))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      update shops set discount_percentage = ${data}
      where owner_user_id = ${context.userId}
      returning id
    `;
    if (!rows.length) throw new Error("افتح المحل الأول");
    return { ok: true };
  });

export const getCatalog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async (): Promise<{ shops: Shop[]; products: Product[] }> => {
    const sql = await getSql();
    const shops = await sql<ShopSql>`
      select s.id, s.shop_name, s.area, s.address, s.phone, s.discount_percentage,
        s.lat, s.lng, s.is_demo, s.about,
        count(r.id)::int as review_count,
        case when count(r.id) = 0 then null
             else round(avg(r.stars)::numeric, 1)::float8 end as rating
      from shops s
      left join reviews r on r.shop_id = s.id
      group by s.id
      order by s.id
    `;
    const products = await sql<ProductSql>`
      select id, shop_id, name, price_egp, discount_price_egp, image_url
      from products
      order by id
    `;
    return { shops: shops.map(mapShop), products: products.map(mapProduct) };
  });

export const getShop = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const id = num(input);
    if (!Number.isInteger(id) || id < 1) throw new Error("محل غير موجود");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ data: id }): Promise<{ shop: Shop; products: Product[]; reviews: Review[] }> => {
    const sql = await getSql();
    const shops = await sql<ShopSql>`
      select s.id, s.shop_name, s.area, s.address, s.phone, s.discount_percentage,
        s.lat, s.lng, s.is_demo, s.about,
        count(r.id)::int as review_count,
        case when count(r.id) = 0 then null
             else round(avg(r.stars)::numeric, 1)::float8 end as rating
      from shops s
      left join reviews r on r.shop_id = s.id
      where s.id = ${id}
      group by s.id
    `;
    const shop = shops[0];
    if (!shop) throw new Error("محل غير موجود");
    const products = await sql<ProductSql>`
      select id, shop_id, name, price_egp, discount_price_egp, image_url
      from products where shop_id = ${id} order by id
    `;
    const reviews = await sql<{
      id: number;
      author_name: string;
      stars: number;
      comment: string;
      created_at: string;
    }>`
      select id, author_name, stars, comment, created_at::text as created_at
      from reviews where shop_id = ${id}
      order by id desc
      limit 20
    `;
    return {
      shop: mapShop(shop),
      products: products.map(mapProduct),
      reviews: reviews.map((r) => ({
        id: num(r.id),
        authorName: r.author_name,
        stars: num(r.stars),
        comment: r.comment,
        createdAt: r.created_at,
      })),
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const body = asRecord(input);
    const shopId = num(body.shopId);
    if (!Number.isInteger(shopId) || shopId < 1) throw new Error("محل غير موجود");
    const kind: OrderKind = body.kind === "accessory" ? "accessory" : "repair";
    const serviceType: ServiceType = body.serviceType === "walk_in" ? "walk_in" : "delivery";
    const problem = text(body.problem, 500);
    const productId = body.productId == null ? null : num(body.productId);
    const deviceImage = imageOf(body.deviceImage, kind === "repair");
    if (kind === "repair" && problem.length < 8) throw new Error("اوصف العطل في جملة واضحة");
    return { shopId, kind, serviceType, problem, productId, deviceImage };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const shops = await sql<{ id: number; owner_user_id: string | null; discount_percentage: number }>`
      select id, owner_user_id, discount_percentage from shops where id = ${data.shopId}
    `;
    const shop = shops[0];
    if (!shop) throw new Error("محل غير موجود");
    if (shop.owner_user_id === context.userId) throw new Error("متقدرش تطلب من محلك");
    let productName: string | null = null;
    let price: number | null = null;
    let productId: number | null = null;
    if (data.kind === "accessory") {
      if (!data.productId) throw new Error("اختار المنتج");
      const products = await sql<ProductSql>`
        select id, shop_id, name, price_egp, discount_price_egp, image_url
        from products where id = ${data.productId} and shop_id = ${data.shopId}
      `;
      const product = products[0];
      if (!product) throw new Error("المنتج مش موجود في المحل ده");
      productName = product.name;
      price = num(product.discount_price_egp);
      productId = num(product.id);
    }
    const delivery = data.serviceType === "delivery";
    const rows = await sql<{ id: number }>`
      insert into orders (
        client_id, shop_id, kind, product_id, product_name, price_egp, device_image,
        problem_description, service_type, delivery_cost_client, delivery_cost_tech, status
      ) values (
        ${context.userId}, ${data.shopId}, ${data.kind}, ${productId}, ${productName}, ${price},
        ${data.deviceImage}, ${data.kind === "accessory" && !data.problem ? productName ?? "" : data.problem},
        ${data.serviceType}, ${delivery ? DELIVERY_FEE : 0}, ${delivery ? DELIVERY_FEE : 0}, 'pending'
      )
      returning id
    `;
    return { id: num(rows[0]?.id) };
  });

async function loadOrder(orderId: number, userId: string, withImage: boolean) {
  const sql = await getSql();
  const rows = await sql<OrderSql>`
    select o.id, o.shop_id, s.shop_name, s.area, s.is_demo, s.discount_percentage,
      o.kind, o.product_name, o.price_egp, o.problem_description, o.service_type,
      o.delivery_cost_client, o.delivery_cost_tech, o.status, o.created_at::text as created_at,
      o.device_image, p.name as client_name, s.owner_user_id,
      rv.stars as review_stars, rv.comment as review_comment,
      o.client_id
    from orders o
    join shops s on s.id = o.shop_id
    left join profiles p on p.user_id = o.client_id
    left join reviews rv on rv.order_id = o.id
    where o.id = ${orderId}
  `;
  const row = rows[0] as (OrderSql & { client_id?: string }) | undefined;
  if (!row) return null;
  if (row.client_id !== userId && row.owner_user_id !== userId) return null;
  return { order: mapOrder(row, userId, withImage), clientId: row.client_id ?? "" };
}

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OrderView[]> => {
    const sql = await getSql();
    const rows = await sql<OrderSql>`
      select o.id, o.shop_id, s.shop_name, s.area, s.is_demo, s.discount_percentage,
        o.kind, o.product_name, o.price_egp, o.problem_description, o.service_type,
        o.delivery_cost_client, o.delivery_cost_tech, o.status, o.created_at::text as created_at,
        null::text as device_image, p.name as client_name, s.owner_user_id,
        rv.stars as review_stars, rv.comment as review_comment
      from orders o
      join shops s on s.id = o.shop_id
      left join profiles p on p.user_id = o.client_id
      left join reviews rv on rv.order_id = o.id
      where o.client_id = ${context.userId}
      order by o.id desc
      limit 40
    `;
    return rows.map((row) => mapOrder(row, context.userId, false));
  });

export const getTechBoard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ orders: OrderView[]; products: Product[] }> => {
    const sql = await getSql();
    const orders = await sql<OrderSql>`
      select o.id, o.shop_id, s.shop_name, s.area, s.is_demo, s.discount_percentage,
        o.kind, o.product_name, o.price_egp, o.problem_description, o.service_type,
        o.delivery_cost_client, o.delivery_cost_tech, o.status, o.created_at::text as created_at,
        o.device_image, p.name as client_name, s.owner_user_id,
        rv.stars as review_stars, rv.comment as review_comment
      from orders o
      join shops s on s.id = o.shop_id
      left join profiles p on p.user_id = o.client_id
      left join reviews rv on rv.order_id = o.id
      where s.owner_user_id = ${context.userId}
      order by o.id desc
      limit 40
    `;
    const products = await sql<ProductSql>`
      select pr.id, pr.shop_id, pr.name, pr.price_egp, pr.discount_price_egp, pr.image_url
      from products pr
      join shops s on s.id = pr.shop_id
      where s.owner_user_id = ${context.userId}
      order by pr.id desc
    `;
    return {
      orders: orders.map((row) => mapOrder(row, context.userId, true)),
      products: products.map(mapProduct),
    };
  });

export const getOrder = createServerFn({ method: "GET" })
  .validator((input: unknown) => {
    const id = num(input);
    if (!Number.isInteger(id) || id < 1) throw new Error("طلب غير موجود");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<OrderView> => {
    const loaded = await loadOrder(data, context.userId, true);
    if (!loaded) throw new Error("الطلب غير موجود");
    return loaded.order;
  });

export const advanceOrder = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const body = asRecord(input);
    const orderId = num(body.orderId);
    const next = text(body.next, 40);
    if (!Number.isInteger(orderId) || orderId < 1 || !next) throw new Error("طلب غير صالح");
    return { orderId, next };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{
      status: string;
      service_type: ServiceType;
      client_id: string;
      owner_user_id: string | null;
      is_demo: boolean;
    }>`
      select o.status, o.service_type, o.client_id, s.owner_user_id, s.is_demo
      from orders o
      join shops s on s.id = o.shop_id
      where o.id = ${data.orderId}
    `;
    const order = rows[0];
    if (!order) throw new Error("الطلب غير موجود");
    const isOwner = order.owner_user_id === context.userId;
    const isClient = order.client_id === context.userId;
    if (!isOwner && !isClient) throw new Error("غير مسموح");
    if (data.next === "cancelled") {
      if (!isClient || order.status !== "pending") throw new Error("لا يمكن إلغاء الطلب الآن");
    } else {
      const allowed = techMoves(order.service_type, order.status);
      if (!allowed.includes(data.next)) throw new Error("الخطوة دي مش متاحة");
      if (!isOwner && !(isClient && order.is_demo)) throw new Error("استنى المحل يحدّث الحالة");
    }
    const updated = await sql`
      update orders set status = ${data.next}
      where id = ${data.orderId} and status = ${order.status}
      returning id
    `;
    if (!updated.length) throw new Error("الحالة اتغيرت. حدّث الصفحة");
    return { ok: true };
  });

export const addReview = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const body = asRecord(input);
    const orderId = num(body.orderId);
    const stars = num(body.stars);
    const comment = text(body.comment, 280);
    if (!Number.isInteger(orderId) || stars < 1 || stars > 5) throw new Error("التقييم من ١ لـ ٥");
    if (comment.length < 4) throw new Error("اكتب رأيك في جملة");
    return { orderId, stars, comment };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into reviews (shop_id, order_id, client_id, author_name, stars, comment)
      select o.shop_id, o.id, ${context.userId}, p.name, ${data.stars}, ${data.comment}
      from orders o
      join profiles p on p.user_id = ${context.userId}
      where o.id = ${data.orderId}
        and o.client_id = ${context.userId}
        and o.status = 'completed'
        and not exists (select 1 from reviews r where r.order_id = o.id)
      returning id
    `;
    if (!rows.length) throw new Error("التقييم متاح بعد التسليم، ومرة واحدة");
    return { ok: true };
  });

export const addProduct = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const body = asRecord(input);
    const name = text(body.name, 80);
    const price = Math.round(num(body.price));
    const discountPrice = Math.round(num(body.discountPrice));
    if (name.length < 2) throw new Error("اكتب اسم المنتج");
    if (price < 1 || discountPrice < 0 || discountPrice > price) {
      throw new Error("سعر الخصم لازم يكون أقل من السعر أو مساوي له");
    }
    return { name, price, discountPrice, image: imageOf(body.image, true) as string };
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into products (shop_id, name, price_egp, discount_price_egp, image_url)
      select s.id, ${data.name}, ${data.price}, ${data.discountPrice}, ${data.image}
      from shops s
      where s.owner_user_id = ${context.userId}
      returning id
    `;
    if (!rows.length) throw new Error("افتح المحل الأول");
    return { id: num(rows[0]?.id) };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const id = num(input);
    if (!Number.isInteger(id) || id < 1) throw new Error("منتج غير موجود");
    return id;
  })
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from products p
      using shops s
      where p.id = ${data} and p.shop_id = s.id and s.owner_user_id = ${context.userId}
      returning p.id
    `;
    if (!rows.length) throw new Error("المنتج مش عندك");
    return { ok: true };
  });

