import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { saveShop, updateProfile, uploadShopImage } from "@/lib/api";
import { Gate, Shell, leaveIfBlocked, usePhone } from "@/components/phone";
import { Alert, AreaSelect, Button, Field, ShopPhoto, TextInput } from "@/components/ui";
import { areaChoices, errMsg, formatMoney } from "@/lib/domain";
import { compressShopPhoto } from "@/lib/image";

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
  const [inviteCode, setInviteCode] = useState("");
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
            .catch(async (err) => {
              if (await leaveIfBlocked(err)) return;
              setError(errMsg(err));
            })
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
            {areaChoices(area).map((item) => (
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
        {!profile.shop ? (
          <>
            <p className="text-sm text-muted">لو عندك محل، سجّله بكود الدعوة. يظهر للعملاء بعد المراجعة.</p>
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
                    discount: 15,
                    inviteCode,
                  },
                })
                  .then(() => refresh())
                  .then(() => {
                    setMode("tech");
                    setNote("طلبك قيد المراجعة");
                  })
                  .catch(async (err) => {
                    if (await leaveIfBlocked(err)) return;
                    setError(errMsg(err));
                  })
                  .finally(() => setBusy(false));
              }}
            >
              <Field label="كود الدعوة">
                <TextInput value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} autoComplete="off" />
              </Field>
              <Field label="اسم المحل">
                <TextInput value={shopName} onChange={(e) => setShopName(e.target.value)} />
              </Field>
              <Field label="تليفون المحل">
                <TextInput value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} inputMode="tel" />
              </Field>
              <Field label="منطقة المحل">
                <AreaSelect value={shopArea} onChange={(e) => setShopArea(e.target.value)}>
                  {areaChoices(shopArea).map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </AreaSelect>
              </Field>
              <Field label="عنوان المحل">
                <TextInput value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
              </Field>
              <Button type="submit" disabled={busy}>
                فتح المحل
              </Button>
            </form>
          </>
        ) : profile.shop.merchantStatus === "pending" ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">طلبك قيد المراجعة</p>
            <ShopImageForm imageUrl={profile.shop.imageUrl} onSaved={refresh} />
          </div>
        ) : profile.shop.merchantStatus === "suspended" ? (
          <div className="space-y-1 text-sm">
            <p>المحل موقوف. تقدر تشوف المستحقات فقط.</p>
            <p className="font-medium">
              {profile.shop.dues == null ? "المستحقات غير متاحة حالياً" : `المستحقات: ${formatMoney(profile.shop.dues)}`}
            </p>
          </div>
        ) : profile.shop.merchantStatus === "active" ? (
          <>
            <p className="text-sm text-muted">تقدر تبدّل بين واجهة العميل وواجهة المحل من أعلى الشاشة.</p>
            <ShopImageForm imageUrl={profile.shop.imageUrl} onSaved={refresh} />
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
                    discount: profile.shop?.discount ?? 15,
                  },
                })
                  .then(() => refresh())
                  .then(() => setNote("اتحفظت بيانات المحل"))
                  .catch(async (err) => {
                    if (await leaveIfBlocked(err)) return;
                    setError(errMsg(err));
                  })
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
                  {areaChoices(shopArea).map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </AreaSelect>
              </Field>
              <Field label="عنوان المحل">
                <TextInput value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} />
              </Field>
              <Button type="submit" disabled={busy}>
                تحديث المحل
              </Button>
            </form>
          </>
        ) : null}
      </section>
      {note ? <p className="text-sm text-pine">{note}</p> : null}
      <Alert>{error}</Alert>
      <UserButton />
    </div>
  );
}

function ShopImageForm({ imageUrl, onSaved }: { imageUrl: string | null; onSaved: () => Promise<unknown> }) {
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <ShopPhoto src={imageUrl} alt="صورة المحل" className="h-36 w-full rounded-lg object-cover" />
      <label
        className={`flex h-11 cursor-pointer items-center justify-center rounded-md border border-line text-sm font-medium ${busy ? "opacity-50" : ""}`}
      >
        {busy ? "بنرفع الصورة..." : "صورة المحل من الكاميرا أو المعرض"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setError("");
            setNote("");
            void compressShopPhoto(file)
              .then((data) => uploadShopImage({ data: { data } }))
              .then(() => onSaved())
              .then(() => setNote("اتحفظت صورة المحل"))
              .catch(async (err) => {
                if (await leaveIfBlocked(err)) return;
                setError(errMsg(err));
              })
              .finally(() => setBusy(false));
          }}
        />
      </label>
      {note ? <p className="text-sm text-pine">{note}</p> : null}
      <Alert>{error}</Alert>
    </div>
  );
}
