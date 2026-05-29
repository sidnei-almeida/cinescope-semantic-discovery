import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

export default function SortSelect({
  value,
  options,
  onChange,
  ariaLabel = "Sort",
  className,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div className={clsx("sort-select", className)} ref={rootRef}>
      <button
        type="button"
        className={clsx("sort-select__trigger", open && "sort-select__trigger--open")}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="sort-select__value">{selected?.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="sort-select__chevron"
          aria-hidden
        />
      </button>

      <ul
        className={clsx("sort-select__menu", open && "sort-select__menu--open")}
        role="listbox"
        aria-label={ariaLabel}
        hidden={!open}
      >
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <li key={option.value} role="none">
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                className={clsx("sort-select__option", isActive && "sort-select__option--active")}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
