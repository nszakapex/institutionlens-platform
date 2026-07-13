import { Checkbox } from "@/components/ui/Checkbox";

type Option = {
  value: string;
  label: string;
};

type Props = {
  legend: string;
  name: string;
  options: readonly Option[];
  selected: readonly string[];
};

/**
 * Accessible multi-select via native checkboxes.
 * Works without JavaScript — repeated GET params are submitted for checked boxes.
 */
export function CheckboxFilterGroup({ legend, name, options, selected }: Props) {
  const selectedSet = new Set(selected);
  return (
    <fieldset className="il-checkbox-group">
      <legend className="il-checkbox-group-legend">{legend}</legend>
      <div className="il-checkbox-group-options">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            id={`${name}-${option.value}`}
            name={name}
            value={option.value}
            label={option.label}
            defaultChecked={selectedSet.has(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
