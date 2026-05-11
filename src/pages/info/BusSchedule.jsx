"use client";

import { useMemo, useState } from "react";
import { FiDownload, FiMap, FiSearch, FiTruck } from "react-icons/fi";
import Header from "../components/Header";
import {
  EmptyState,
  FormField,
  MetricCard,
  PageShell,
  SectionHeading,
  cx,
} from "../components/ui";

const regularToUniversity = [
  {
    sl: 1,
    time: "6:40 a.m.",
    startingPoint: "1. Baroyarhat",
    route: "1. Baroyarhat - Mirsharai - Borodarghaiat - Sitakunda - IIUC",
    remarks: "For Female Students",
  },
  {
    sl: 2,
    time: "6:45 a.m.",
    startingPoint: "2. Hathazari College\n3. Didar Market",
    route:
      "2. Hathazari College - Borodighirpar - Baizid Link Road - IIUC\n3. Didar Market - Kotowali - Kadamtali - Dewan Hat - IIUC",
    remarks: "For Female Students",
  },
  {
    sl: 3,
    time: "6:50 a.m.",
    startingPoint: "4. Miler matha\n5. Navy Hospital Gate",
    route:
      "4. Miler matha - Port Market - Toll Road - Founder Hat - IIUC\n5. Navy Hospital Gate - Sea beach - Jele para - Akmol Ali Ghat - IIUC",
    remarks: "For Female Students",
  },
  {
    sl: 4,
    time: "7:00 a.m.",
    startingPoint:
      "6. BOT\n7. Shah Amanath\n8. Chatteswari\n9. Kotowali\n10. Lucky Plaza\n11. Kaptai Rastar\n12. GEC circle",
    route:
      "6. BOT - Muradpur - 2 no gate - Baizid Link Road - IIUC\n7. Shah Amanath Bridge - Bohoddarhat Flyover - Shulokbohor - Baizid Link Road - IIUC\n8. Chatteswari Road - GEC - 2 no gate - Baizid Link Road - IIUC\n9. Kotowali - Kadamtali - Dewan Hat - Alanker - IIUC\n10. Agrabad - Boropol - Noyabazar - AK Khan - IIUC\n11. Kaptai Rastar Matha - BOT - 2 no gate - Baizid Link Road - IIUC\n12. GEC circle - Wireless - Foy's lake - AK Khan - IIUC",
    remarks: "For Female Students",
  },
  {
    sl: 5,
    time: "7:10 a.m.",
    startingPoint: "13. Oxygen Moor",
    route: "13. Oxygen - Baizid Link Road - IIUC",
    remarks: "For Female Students",
  },
  {
    sl: 6,
    time: "7:25 a.m.",
    startingPoint: "14. KoibolyoDham",
    route: "14. KoibolyoDham - IIUC",
    remarks: "For Female Students",
  },
  {
    sl: 7,
    time: "8:30 a.m.",
    startingPoint: "1. CUET",
    route: "1. CUET Gate - Kuwaish - Oxygen - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 8,
    time: "9:00 a.m.",
    startingPoint: "2. Hathazari College\n3. Navy Hospital Gate\n4. Miler matha",
    route:
      "2. Hathazari College - Borodighirpar - Baizid Link Road - IIUC\n3. Navy Hospital Gate - Sea beach - Jele para - Akmol Ali Ghat - IIUC\n4. Miler matha - Port Market - Toll Road - Founder Hat - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 9,
    time: "9:05 a.m.",
    startingPoint:
      "5. BaroyarHat\n6. Shah Amanath\n7. BOT\n8. Chatteswari\n9. Kotowali\n10. Lucky Plaza\n11. Kaptai Rastar\n12. GEC circle",
    route:
      "5. BaroyarHat - Mirsharai - Borodarghaiat - Sitakunda - IIUC\n6. Shah Amanath Bridge - Bohoddarhat Flyover - Shulokbohor - Baizid Link Road - IIUC\n7. BOT - Muradpur - 2 no gate - Baizid Link Road - IIUC\n8. Chatteswari Road - GEC - 2 no gate - Baizid Link Road - IIUC\n9. Kotowali - Kadamtali - Dewan Hat - Alanker - IIUC\n10. Agrabad - Boropol - Noyabazar - AK Khan - IIUC\n11. Kaptai Rastar Matha - BOT - 2 no gate - Baizid Link Road - IIUC\n12. GEC circle - Wireless - Foy's lake - AK Khan - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 10,
    time: "9:25 a.m.",
    startingPoint: "13. Oxygen Moor",
    route: "13. Oxygen - Baizid Link Road - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 11,
    time: "9:45 a.m.",
    startingPoint: "14. Sitakunda",
    route: "14. Sitakunda - Barobkunda - Kumira - Joramtol - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 12,
    time: "9:35 a.m.",
    startingPoint: "15. KoibolyoDham",
    route: "15. KoibolyoDham - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 13,
    time: "11:50 a.m.",
    startingPoint: "1. Mayor goli\n2. Boropul",
    route:
      "1. Mayor goli - Baizid Link Road - Fouzdarhat - IIUC\n2. Boropul - Noyabazar - IIUC",
    remarks: "For Male Students",
  },
  {
    sl: 14,
    time: "12:45 p.m.",
    startingPoint: "1. Mayor goli\n2. KoibolyoDham",
    route:
      "1. Mayor goli - Baizid Link Road - Fouzdarhat - IIUC\n2. KoibolyoDham - IIUC",
    remarks: "For Male Students",
  },
];

const regularFromUniversity = [
  {
    sl: 1,
    time: "11:00 a.m.",
    description: "Shuttle bus for Female students",
    route:
      "1. IIUC - KoibolyoDham - Noyabazar - Boropul\n2. IIUC - Baizid Link Road - SherShah - Mayor Goli",
    endPoint: "Boropul\nMayor Goli\nNoyaBazar",
  },
  {
    sl: 2,
    time: "11:45 a.m.",
    description: "Shuttle bus for Female students",
    route:
      "1. IIUC - KoibolyoDham - Noyabazar\n2. IIUC - Sitakundo - Borodarghaiat - Mirshorai\n3. IIUC - Baizid Link Road - SherShah - Mayor Goli",
    endPoint: "Mirshorai\nMayor Goli\nSagorika",
  },
  {
    sl: 3,
    time: "12:15 p.m.",
    description: "Shuttle bus for Male students",
    route: "1. IIUC - Baizid Link Road - Mayor Goli",
    endPoint: "Mayor Goli",
  },
  {
    sl: 4,
    time: "1:30 p.m.",
    description: "For Female Students",
    route: "All approved Routes",
    endPoint: "All points",
  },
  {
    sl: 5,
    time: "1:40 p.m.",
    description: "For Male students",
    route: "All approved Routes (except CUET gate)",
    endPoint: "All points",
  },
  {
    sl: 6,
    time: "2:55 p.m.",
    description: "Shuttle bus for Male students",
    route:
      "1. IIUC - KoibolyoDham - Noyabazar\n2. IIUC - Baizid Link Road - SherShah - Mayor Goli",
    endPoint: "Nayabazar\nMayor Goli",
  },
  {
    sl: 7,
    time: "4:35 p.m.",
    description: "For Male Students",
    route: "All approved Routes",
    endPoint: "All points",
  },
];

const fridayToUniversity = [
  {
    sl: 1,
    time: "7:30 a.m.",
    startingPoint: "1. BOT",
    route: "1. BOT - Chatteswari - GEC - WASA - Khulshi - AK Khan - IIUC",
    remarks: "For Ministerial Staff",
  },
  {
    sl: 2,
    time: "7:45 a.m.",
    startingPoint: "1. BOT\n2. Agrabad\n3. Kotuwali\n4. Chawkbazar\n5. Baroyarhat",
    route:
      "1. BOT - Muradpur - 2 no gate - Baizid Link Road - IIUC\n2. Agrabad - Boropul - AK Khan - IIUC\n3. Kotowali - Kadamtali - Dewan Hat - Alanker - IIUC\n4. Chatteswari Road - GEC - WASA - Khulshi - AK Khan - IIUC\n5. Baroyarhat - Mirsharai - Sitakunda - IIUC",
    remarks: "For All",
  },
  {
    sl: 3,
    time: "8:00 a.m.",
    startingPoint: "1. Oxygen\n2. Chawkbazar\n3. BOT\n4. Agrabad",
    route:
      "1. Oxygen - Baizid Link Road - Kalu Shah - IIUC\n2. Keari Elysium - Chatteswari - GEC - WASA - Khulshi - AK Khan - IIUC\n3. BOT - Muradpur - 2 no gate - Baizid Link Road - IIUC\n4. Agrabad - Boropul - AK Khan - IIUC",
    remarks: "For Teachers",
  },
  {
    sl: 4,
    time: "9:30 a.m.",
    startingPoint: "1. BOT",
    route: "1. BOT - Chatteswari - GEC - WASA - Khulshi - AK Khan - IIUC",
    remarks: "For Teachers & Staff",
  },
  {
    sl: 5,
    time: "11:45 a.m.",
    startingPoint: "1. BOT",
    route: "1. BOT - Chatteswari - GEC - WASA - Khulshi - AK Khan - IIUC",
    remarks: "For Teachers, Officers & Staff",
  },
  {
    sl: 6,
    time: "10:00 p.m.",
    startingPoint: "1. Chawkbazar",
    route: "1. Chatteswari - GEC - WASA - Khulshi - AK Khan - IIUC",
    remarks: "For the residents of IIUC",
  },
];

const fridayFromUniversity = [
  {
    sl: 1,
    time: "12:10 p.m.",
    route:
      "1. IIUC - AK Khan - Khulshi - GEC - WASA - Chatteswari\n2. IIUC - Baizid Link Road - 2 no gate - Muradpur - BOT",
    endPoint: "1. Chatteswari\n2. BOT",
    description: "1. Students\n2. Students",
  },
  {
    sl: 2,
    time: "2:00 p.m.",
    route:
      "1. IIUC - AK Khan - Khulshi - GEC - WASA - Chatteswari\n2. IIUC - AK Khan - Khulshi - GEC - WASA - Chatteswari\n3. IIUC - Baizid Link Road - 2 no gate - Muradpur - BOT\n4. IIUC - AK Khan - Nayabazar - Agrabad",
    endPoint: "1. Chatteswari\n2. Chatteswari\n3. BOT\n4. Agrabad",
    description: "1. Teachers\n2. For All\n3. For All\n4. For All",
  },
  {
    sl: 3,
    time: "3:45 p.m.",
    route:
      "1. IIUC - AK Khan - Khulshi - GEC - WASA - Chatteswari - BOT\n2. IIUC - AK Khan - Khulshi - GEC - WASA - Chatteswari - BOT\n3. IIUC - AK Khan - Nayabazar - Agrabad\n4. IIUC - Sitakunda - Mirsharai - Baroyarhat",
    endPoint: "1. BOT\n2. BOT\n3. Agrabad\n4. Baroyarhat",
    description: "1. Teachers",
  },
  {
    sl: 4,
    time: "4:00 p.m.",
    route: "1. IIUC - AK Khan - Khulshi - GEC - WASA - Chatteswari",
    endPoint: "1. Chatteswari",
    description: "1. For the residents of IIUC",
  },
];

const schedules = {
  regular: {
    label: "Regular",
    effective: "Effective from 23 August 2025, Saturday to Wednesday",
    to: regularToUniversity,
    from: regularFromUniversity,
  },
  friday: {
    label: "Friday",
    effective: "Friday transport schedule",
    to: fridayToUniversity,
    from: fridayFromUniversity,
  },
};

/**
 * Printable transport schedule with search and schedule-type filtering.
 */
const BusSchedule = () => {
  const [scheduleType, setScheduleType] = useState("regular");
  const [query, setQuery] = useState("");

  const activeSchedule = schedules[scheduleType];
  const filteredTo = useMemo(
    () => filterRoutes(activeSchedule.to, query),
    [activeSchedule.to, query],
  );
  const filteredFrom = useMemo(
    () => filterRoutes(activeSchedule.from, query),
    [activeSchedule.from, query],
  );

  const totalTrips = activeSchedule.to.length + activeSchedule.from.length;
  const visibleTrips = filteredTo.length + filteredFrom.length;

  return (
    <div className="min-h-screen">
      <Header />
      <PageShell className="py-10">
        <section className="surface-card p-6 sm:p-8">
          <SectionHeading
            kicker="Transport"
            title="IIUC Bus Schedule"
            description="A searchable, printable view of regular and Friday transport routes."
            actions={
              <button type="button" onClick={() => window.print()} className="btn-secondary">
                <FiDownload aria-hidden="true" />
                Print / PDF
              </button>
            }
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[auto_1fr] lg:items-end">
            <div>
              <p className="field-label">Schedule type</p>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                {Object.entries(schedules).map(([key, schedule]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setScheduleType(key)}
                    className={cx(
                      "rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      scheduleType === key
                        ? "bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-200"
                        : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
                    )}
                  >
                    {schedule.label}
                  </button>
                ))}
              </div>
            </div>

            <FormField id="route-search" label="Search routes" helper="Filter by point, route, or note.">
              <div className="relative">
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="route-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Search BOT, Oxygen, female, teachers..."
                  className="form-field pl-12"
                />
              </div>
            </FormField>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            icon={<FiTruck className="h-5 w-5" aria-hidden="true" />}
            label="Schedule"
            value={activeSchedule.label}
            tone="blue"
          />
          <MetricCard
            icon={<FiMap className="h-5 w-5" aria-hidden="true" />}
            label="Visible trips"
            value={`${visibleTrips}/${totalTrips}`}
            tone="teal"
          />
          <MetricCard
            icon={<FiDownload className="h-5 w-5" aria-hidden="true" />}
            label="Document"
            value="Printable"
            tone="amber"
          />
        </section>

        <section className="mt-8 rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
          {activeSchedule.effective}
        </section>

        <div className="mt-8 grid gap-8">
          <RouteTable
            title={`Towards University${scheduleType === "friday" ? " - Friday" : ""}`}
            rows={filteredTo}
            direction="to"
            emptyQuery={query}
          />
          <RouteTable
            title={`From University${scheduleType === "friday" ? " - Friday" : ""}`}
            rows={filteredFrom}
            direction="from"
            emptyQuery={query}
          />
        </div>

        <section className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Transport Management Division
          </p>
          <p className="mt-1">International Islamic University Chittagong</p>
        </section>
      </PageShell>
    </div>
  );
};

function RouteTable({ title, rows, direction, emptyQuery }) {
  const columns =
    direction === "to"
      ? [
          { key: "sl", label: "SL", className: "w-16 text-center" },
          { key: "time", label: "Time", className: "w-32" },
          { key: "startingPoint", label: "Starting point", className: "min-w-56" },
          { key: "route", label: "Route", className: "min-w-80" },
          { key: "remarks", label: "Remarks", className: "w-44" },
        ]
      : [
          { key: "sl", label: "SL", className: "w-16 text-center" },
          { key: "time", label: "Time", className: "w-32" },
          { key: "description", label: "Description", className: "min-w-48" },
          { key: "route", label: "Route", className: "min-w-80" },
          { key: "endPoint", label: "End point", className: "min-w-44" },
        ];

  return (
    <section className="table-shell animate-enter">
      <div className="border-b border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="section-kicker">Bus route</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cx("px-4 py-4 font-bold", column.className)}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${direction}-${row.sl}-${row.time}`}
                  className="border-b border-slate-100 transition last:border-b-0 hover:bg-blue-50/60 dark:border-slate-800 dark:hover:bg-slate-900"
                >
                  {columns.map((column) => (
                    <td
                      key={`${row.sl}-${column.key}`}
                      className={cx(
                        "whitespace-pre-line px-4 py-4 align-top text-slate-700 dark:text-slate-300",
                        column.key === "sl" && "font-bold text-slate-950 dark:text-white",
                        column.key === "time" && "font-semibold text-blue-700 dark:text-blue-300",
                        column.className,
                      )}
                    >
                      {row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<FiSearch className="h-7 w-7" aria-hidden="true" />}
          title="No routes found"
          description={`No ${title.toLowerCase()} routes match "${emptyQuery}".`}
        />
      )}
    </section>
  );
}

function filterRoutes(rows, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) =>
    Object.values(row)
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

export default BusSchedule;
