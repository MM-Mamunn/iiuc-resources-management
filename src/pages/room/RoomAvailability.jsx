import { useState } from "react";
import { FiGrid, FiSearch } from "react-icons/fi";
import api from "../../api";
import Header from "../components/Header";
import {
  EmptyState,
  FormField,
  MetricCard,
  Notice,
  PageShell,
  SectionHeading,
} from "../components/ui";

const days = [
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

const buildings = ["C", "CX", "CXB", "None"];

/**
 * Room availability lookup for a day, slot, and optional building.
 */
const RoomAvailability = () => {
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [rooms, setRooms] = useState([]);
  const [building, setBuilding] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (day === "" || slot === "") return;

    setLoading(true);
    setNotice(null);
    setHasSearched(true);
    try {
      const buildingPath = building && building !== "None" ? `/${building}` : "";
      const response = await api.get(`/api/room/available/${day}/${slot}${buildingPath}`);
      setRooms(response.data || []);
    } catch {
      setRooms([]);
      setNotice({
        type: "error",
        text: "Could not load available rooms. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Rooms"
            title="Room Availability"
            description="Find available rooms by day, slot, and building with a clean result grid."
          />

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-4 md:items-end">
            <FormField id="day" label="Day">
              <select
                id="day"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="form-field"
              >
                <option value="" disabled>
                  Select day
                </option>
                {days.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="slot" label="Slot">
              <select
                id="slot"
                value={slot}
                onChange={(event) => setSlot(event.target.value)}
                className="form-field"
              >
                <option value="" disabled>
                  Select slot
                </option>
                {[1, 2, 3, 4, 5, 6].map((slotNumber) => (
                  <option key={slotNumber} value={slotNumber}>
                    Slot {slotNumber}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="building" label="Building">
              <select
                id="building"
                value={building}
                onChange={(event) => setBuilding(event.target.value)}
                className="form-field"
              >
                <option value="">Any building</option>
                {buildings.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>

            <button type="submit" disabled={loading || day === "" || slot === ""} className="btn-primary">
              <FiSearch aria-hidden="true" />
              {loading ? "Searching..." : "Find rooms"}
            </button>
          </form>
        </section>

        {notice && (
          <div className="mt-6">
            <Notice type={notice.type} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Notice>
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiGrid className="h-5 w-5" aria-hidden="true" />}
            label="Available rooms"
            value={rooms.length}
            tone="violet"
          />
          <MetricCard
            icon={<FiSearch className="h-5 w-5" aria-hidden="true" />}
            label="Selected slot"
            value={slot ? `Slot ${slot}` : "None"}
            tone="green"
          />
          <MetricCard
            icon={<FiGrid className="h-5 w-5" aria-hidden="true" />}
            label="Building"
            value={building || "Any"}
            tone="amber"
          />
        </section>

        <section className="mt-8">
          {rooms.length > 0 ? (
            <div className="surface-card p-5">
              <SectionHeading kicker="Results" title="Available Rooms" />
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {rooms.map((roomItem, index) => (
                  <div
                    key={`${roomItem.room}-${index}`}
                    className="rounded-lg border border-slate-200 bg-white p-4 text-center font-bold text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {roomItem.room}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            hasSearched &&
            !loading && (
              <div className="table-shell">
                <EmptyState
                  icon={<FiGrid className="h-7 w-7" aria-hidden="true" />}
                  title="No rooms found"
                  description="Try another day, slot, or building."
                />
              </div>
            )
          )}
        </section>
      </PageShell>
    </div>
  );
};

export default RoomAvailability;
