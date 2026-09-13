import { ReturnToActionBanner } from "@/components/auth/ReturnToActionBanner";
import { MyTripsBoard } from "@/components/trip/MyTripsBoard";
import { AttendanceConfirm } from "@/components/trips/AttendanceConfirm";
import { getSession } from "@/lib/auth/get-session";
import { ROUTES } from "@/lib/routes";

export default async function TripSayaPage() {
  const session = await getSession();
  if (!session) {
    return (
      <div className="mx-auto max-w-[560px] px-margin py-12">
        <ReturnToActionBanner
          nextPath={ROUTES.tripSaya}
          actionLabel="Masuk dulu untuk melihat trip yang kamu buat, ikuti, atau ajukan."
        />
      </div>
    );
  }
  return (
    <>
      <MyTripsBoard />
      <div className="mx-auto max-w-[1440px] px-margin pb-8 md:px-margin-desktop">
        <AttendanceConfirm />
      </div>
    </>
  );
}
