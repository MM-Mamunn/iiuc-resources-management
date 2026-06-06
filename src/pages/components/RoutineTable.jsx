import { FiCalendar, FiCoffee, FiClock } from "react-icons/fi";
import { EmptyState, cx } from "./ui";

/**
 * Displays routine rows in a consistent, responsive timetable.
 */
function RoutineTable({
  title,
  subtitle,
  timeSlots,
  displayDays,
  getItemsForDay,
  actions,
  renderCourseActions,
  renderEmptyActions,
  onCellClick,
  getDayMeta = () => ({}),
  getCellMeta = () => ({}),
  emptyTitle = "No routine found",
  emptyDescription = "Try a different section, session, or refresh the data.",
}) {
  return (
    <section className="table-shell animate-enter">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="max-w-3xl">
          <p className="section-kicker">Routine</p>
          <h2 className="display-heading heading-gradient-text mt-3 text-2xl">
            {title}
          </h2>
          <div className="heading-accent-line" aria-hidden="true" />
          {subtitle && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3 sm:justify-end">{actions}</div>}
      </div>

      {!displayDays.length ? (
        <EmptyState
          icon={<FiCalendar className="h-7 w-7" aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                <th scope="col" className="w-32 px-4 py-4 font-bold">
                  Day
                </th>
                {timeSlots.map((slot) => (
                  <th key={slot} scope="col" className="px-4 py-4 text-center font-bold">
                    <span className="inline-flex items-center justify-center gap-2">
                      {slot.toLowerCase() === "break" ? (
                        <FiCoffee className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                      ) : (
                        <FiClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      )}
                      {slot}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayDays.map((day) => {
                const dayMeta = getDayMeta(day);
                const dayItems = getItemsForDay(day);

                return (
                  <tr
                    key={day}
                    className={cx(
                      "border-b border-slate-100 transition last:border-b-0 hover:bg-violet-50/50 dark:border-slate-800 dark:hover:bg-slate-900",
                      dayMeta.active &&
                        "bg-green-50/60 dark:bg-green-500/10"
                    )}
                  >
                    <th
                      scope="row"
                      className="px-4 py-4 text-left align-top text-base font-bold capitalize text-slate-950 dark:text-white"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cx(
                            "h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600",
                            dayMeta.active &&
                              "animate-soft-pulse bg-green-500 dark:bg-green-300"
                          )}
                        />
                        {day}
                      </span>
                      {dayMeta.label && (
                        <span className="mt-2 inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-200">
                          {dayMeta.label}
                        </span>
                      )}
                    </th>
                    {dayItems.map((item, index) => {
                      const cellMeta = getCellMeta(day, item, index);
                      const hasCourse = item.subject && item.subject !== "-";
                      const canOpenDetails = hasCourse && !item.isBreak && onCellClick;
                      const openCellDetails = (event) => {
                        if (!canOpenDetails) return;

                        const interactiveTarget = event.target.closest?.(
                          "a,button,input,select,textarea,label",
                        );

                        if (interactiveTarget) return;

                        onCellClick({
                          ...item,
                          dayLabel: day,
                          timeSlot: timeSlots[index],
                        });
                      };
                      const handleCellKeyDown = (event) => {
                        if (!canOpenDetails || !["Enter", " "].includes(event.key)) return;
                        event.preventDefault();
                        onCellClick({
                          ...item,
                          dayLabel: day,
                          timeSlot: timeSlots[index],
                        });
                      };

                      return (
                        <td
                          key={`${day}-${index}-${item.subject}`}
                          colSpan={item.colspan}
                          role={canOpenDetails ? "button" : undefined}
                          tabIndex={canOpenDetails ? 0 : undefined}
                          onClick={openCellDetails}
                          onKeyDown={handleCellKeyDown}
                          title={canOpenDetails ? "View class details" : undefined}
                          className={cx(
                            "min-w-32 border-l border-slate-100 px-4 py-4 text-center align-top dark:border-slate-800",
                            item.isBreak &&
                              "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
                            hasCourse &&
                              !item.isBreak &&
                              "bg-white dark:bg-slate-950",
                            canOpenDetails &&
                              "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
                            cellMeta.active &&
                              "bg-emerald-50 ring-2 ring-inset ring-emerald-400/70 dark:bg-emerald-500/10"
                          )}
                        >
                          {item.isBreak ? (
                            <div className="flex h-full min-h-20 flex-col items-center justify-center gap-2 font-bold">
                              <FiCoffee className="h-5 w-5" aria-hidden="true" />
                              Break
                            </div>
                          ) : hasCourse ? (
                            <div className="relative flex min-h-24 flex-col justify-between gap-3">
                              {cellMeta.active && (
                                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              )}
                              <div className="space-y-1">
                                <p className="safe-text text-sm font-bold text-violet-700 dark:text-violet-300">
                                  {item.subject}
                                </p>
                                {item.title && (
                                  <p className="safe-text text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {item.title}
                                  </p>
                                )}
                                {item.room && (
                                  <p className="safe-text text-xs text-slate-500 dark:text-slate-400">
                                    Room {item.room}
                                  </p>
                                )}
                                {item.faculty && (
                                  <p className="safe-text text-xs text-slate-500 dark:text-slate-400">
                                    {item.faculty}
                                  </p>
                                )}
                              </div>
                              {renderCourseActions && (
                                <div className="flex justify-center gap-2">
                                  {renderCourseActions(item)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex min-h-20 flex-col items-center justify-center gap-3">
                              <span className="text-xl text-slate-300 dark:text-slate-700">
                                -
                              </span>
                              {renderEmptyActions && renderEmptyActions(item)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RoutineTable;
