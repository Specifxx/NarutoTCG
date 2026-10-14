import { DojoHub } from "@/components/hub/dojo-hub";
import { buildHubData } from "@/components/hub/hub-data";

/** The Dojo: landing page of the Learn portal. */
export default function DojoPage() {
  const data = buildHubData();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <DojoHub data={data} />
    </div>
  );
}
