import { FiEye, FiEyeOff } from "react-icons/fi";

function RoutineActionToggle({ visible, onToggle }) {
  const Icon = visible ? FiEyeOff : FiEye;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      title={visible ? "Hide add and delete buttons" : "Show add and delete buttons"}
      className="btn-secondary px-3"
    >
      <Icon aria-hidden="true" />
      <span className="hidden sm:inline">{visible ? "Hide buttons" : "Show buttons"}</span>
    </button>
  );
}

export default RoutineActionToggle;
