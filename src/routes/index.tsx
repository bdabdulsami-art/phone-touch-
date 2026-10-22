import { createFileRoute } from "@tanstack/react-router";
import { ClientHome } from "@/components/client-home";
import { Gate, Shell, usePhone } from "@/components/phone";
import { TechHome } from "@/components/tech-home";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <Gate>
      <Shell>
        <HomeBody />
      </Shell>
    </Gate>
  );
}

function HomeBody() {
  const { mode } = usePhone();
  return mode === "tech" ? <TechHome /> : <ClientHome />;
}
