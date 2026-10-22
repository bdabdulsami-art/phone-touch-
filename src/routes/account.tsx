import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { saveShop, updateProfile } from "@/lib/api";
import { Gate, Shell, usePhone } from "@/components/phone";
import { Alert, AreaSelect, Button, Field, TextInput } from "@/components/ui";
import { AREAS, DISCOUNTS, errMsg } from "@/lib/domain";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  return (
    <Gate>
      <Shell>
        <AccountBody />
      </Shell>
    </Gate>
  );
}

function AccountBody() {
  const { profile, refresh, setMode } = usePhone();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [area, setArea] = useState(profile.area);
  const [address, setAddress] = useState(profile.address);
  const [shopName, setShopName] = useState(profile.shop?.shopName ?? "");
  const [shopPhone, setShopPhone] = useState(profile.shop?.phone ?? profile.phone);
  const [shopArea, setShopArea] = useState(profile.shop?.area ?? profile.area);
  const [shopAddress, setShopAddress] = useState(profile.shop?.address ?? "");
  const [discount, setDiscount] = useState(profile.shop?.discount ?? 15);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rise space-y-6">
      <h1 className="text-2xl font-semibold">حسابي</h1>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setNote("");
          void updateProfile({ data: { name, phone, address, area } })
            .then(() => refresh())
            .then(() => setNote("اتحفظت بياناتك"))
            .catch((err) => setError(errMsg(err)))
            .finally(() => setBusy(false));
        }}
      >
        <Field label="الاسم">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="التليفون">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </Field>
        <Field label="المنطقة">
          <AreaSelect value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </AreaSelect>
        </Field>
        <Field label="العنوان">
          <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Button type="submit" disabled={busy}>
          حفظ البيانات
        </Button>
      </form>

      <section className="space-y-3 rounded-xl border border-line bg-bg-elev p-4">
        <h2 className="font-semibold">{profile.shop ? "بيانات المحل" : "افتح محل"}</h2>
        <p className="text-sm text-muted">
          {profile.shop
            ? "تقدر تبدّل بين واجهة العميل وواجهة المحل من أعلى الشاشة."
            : "لو عندك محل أو بتشتغل فني، سجّله هنا عشان توصلك الطلبات."}
        </p>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setNote("");
            void saveShop({
              data: {
                shopName,
                phone: shopPhone,
                address: shopAddress,
                area: shopArea,
                discount,
              },
            })
              .then(() => refresh())
              .then(() => {
                setMode("tech");
                setNote("المحل جاهز");
              })
              .catch((err) => setError(errMsg(err)))
              .finally(() => setBusy(false));
          }}
        >
          <Field label="اسم المحل">
            <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </Field>
          <Field label="تليفون المحل">
            <TextInput value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} inputMode="tel" />
          </Field>
          <Field label="منطقة المحل">
            <AreaSelect value={shopArea} onChange={(e) => setShopArea(e.target.value)}>
              {AREAS.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </AreaSelect>
          </Field>
          <Field label="عنوان المحل">
            <TextInput value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
          </Field>
          {profile.shop ? null : (
            <Field label="خصم الصيانة">
              <AreaSelect value={discount} onChange={(e) => setDiscount(Number(e.target.value))}>
                {DISCOUNTS.map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </AreaSelect>
            </Field>
          )}
          <Button type="submit" disabled={busy}>
            {profile.shop ? "تحديث المحل" : "فتح المحل"}
          </Button>
        </form>
      </section>
      {note ? <p className="text-sm text-pine">{note}</p> : null}
      <Alert>{error}</Alert>
      <UserButton />
    </div>
  );
}
