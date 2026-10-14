import type { GeoPoint } from "@naruto-tcg/types";
import { Info, LoaderCircle, LocateFixed, MapPin, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GoogleMapEmbed } from "@/components/google-map-embed";
import { cx } from "@/lib/format";
import { geocode, GeocodeError } from "@/lib/geocode-client";
import { isValidPoint } from "@/lib/geo";
import type { ResolvedPlace } from "@/lib/places";
import { button } from "@/lib/styles";
import { cleanLine, venueCountry, type FieldErrors, type SubmissionDraft } from "@/lib/submission";
import { TextField } from "./fields";

type LocateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; label: string; approximate: boolean }
  | { status: "error"; message: string };

const round = (n: number) => Math.round(n * 1e5) / 1e5;

function parsePoint(lat: string, lng: string): GeoPoint | null {
  if (!lat.trim() || !lng.trim()) return null;
  const point = { lat: Number(lat), lng: Number(lng) };
  return isValidPoint(point) ? point : null;
}

/** The point to preview, settled for a moment so typing doesn't reload the map on every keystroke. */
function useSettledPoint(lat: string, lng: string, delayMs = 700): GeoPoint | null {
  const [point, setPoint] = useState<GeoPoint | null>(() => parsePoint(lat, lng));
  useEffect(() => {
    const id = window.setTimeout(() => setPoint(parsePoint(lat, lng)), delayMs);
    return () => window.clearTimeout(id);
  }, [lat, lng, delayMs]);
  return point;
}

/**
 * Optional map pin for a new venue: latitude/longitude inputs, a "Locate" button
 * that geocodes the typed address via /api/geocode (falling back to the town),
 * and a map preview of the result.
 */
export function VenueCoordinates({
  venue,
  errors,
  onChange,
}: {
  venue: SubmissionDraft["venue"];
  errors: FieldErrors;
  onChange: (value: { lat: string; lng: string }) => void;
}) {
  const [state, setState] = useState<LocateState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const point = useSettledPoint(venue.lat, venue.lng);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function locate() {
    const city = cleanLine(venue.city);
    const country = venueCountry(venue.country);
    if (!city || !country) {
      setState({ status: "error", message: "Enter the town or city and choose the country first." });
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading" });

    const fullAddress = [venue.line1, city, venue.region, venue.postalCode, country.name]
      .map(cleanLine)
      .filter(Boolean)
      .join(", ")
      .slice(0, 100);
    try {
      let place: ResolvedPlace;
      try {
        place = await geocode(fullAddress, controller.signal);
      } catch (error) {
        if (controller.signal.aborted || !(error instanceof GeocodeError)) throw error;
        place = await geocode(`${city}, ${country.code}`, controller.signal);
      }
      onChange({ lat: String(round(place.lat)), lng: String(round(place.lng)) });
      setState({ status: "done", label: place.label, approximate: place.source === "gazetteer" });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({
        status: "error",
        message:
          error instanceof GeocodeError
            ? `${error.message} You can type the coordinates yourself, or leave them for our moderators.`
            : "The location lookup didn't respond. Try again, or leave the coordinates for our moderators.",
      });
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-shadow-700 bg-shadow-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ash-200">
            <MapPin className="h-4 w-4 text-chakra-400" aria-hidden="true" />
            Map pin
          </p>
          <p className="mt-1 text-xs text-ash-400">
            Optional. Places the event on the map: locate it from the address, or leave it blank and we&apos;ll add it during review.
          </p>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={state.status === "loading"}
          className={cx(button.secondary, "shrink-0")}
        >
          {state.status === "loading" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
          )}
          {state.status === "loading" ? "Locating…" : "Locate"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          path="venue.lat"
          label="Latitude"
          optional
          inputMode="decimal"
          autoComplete="off"
          placeholder="51.5079"
          value={venue.lat}
          error={errors["venue.lat"]}
          onChange={(e) => onChange({ lat: e.target.value, lng: venue.lng })}
          inputClassName="tabular-nums"
        />
        <TextField
          path="venue.lng"
          label="Longitude"
          optional
          inputMode="decimal"
          autoComplete="off"
          placeholder="-0.0877"
          value={venue.lng}
          error={errors["venue.lng"]}
          onChange={(e) => onChange({ lat: venue.lat, lng: e.target.value })}
          inputClassName="tabular-nums"
        />
      </div>

      <div aria-live="polite" className="text-xs">
        {state.status === "done" && (
          <p className="flex items-start gap-1.5 text-emerald-300">
            <MapPin className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Pinned to {state.label}.
              {state.approximate && (
                <span className="text-ash-400">
                  {" "}
                  That&apos;s the town centre rather than the street address. Adjust the coordinates if you know them.
                </span>
              )}
            </span>
          </p>
        )}
        {state.status === "error" && (
          <p className="flex items-start gap-1.5 text-amber-300">
            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{state.message}</span>
          </p>
        )}
      </div>

      {point ? (
        <GoogleMapEmbed
          location={point}
          zoom={state.status === "done" && state.approximate ? 12 : 16}
          title={`Map preview of ${cleanLine(venue.name) || "the venue"}`}
          className="max-w-xl"
        />
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-ash-400">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          A map preview appears here once the pin is set.
        </p>
      )}
    </div>
  );
}
