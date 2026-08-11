/**
 * Reusable grouped <select> for categories with parent/child hierarchy.
 *
 * Callers are responsible for filtering categories to the relevant type
 * (income / expense) before passing them in.
 *
 * Used by: transaction-list, quick-add-fab, budget-list
 */

export interface CategoryOption {
  id: string
  name: string
  icon: string | null
  parent_id: string | null
}

interface Placeholder {
  value: string
  label: string
  /** When true renders as <option disabled hidden> — acts as a prompt only */
  hidden?: boolean
}

interface Props {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Pre-filtered category list (type filtering done by caller) */
  categories: CategoryOption[]
  placeholder?: Placeholder
  className?: string
  disabled?: boolean
}

export function CategoryGroupedSelect({
  id,
  value,
  onChange,
  categories,
  placeholder,
  className,
  disabled,
}: Props) {
  const parents  = categories.filter(c => !c.parent_id)
  const children = categories.filter(c =>  c.parent_id)

  const label = (c: CategoryOption) =>
    c.icon ? `${c.icon} ${c.name}` : c.name

  return (
    <select
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className}
      disabled={disabled}
    >
      {placeholder && (
        <option
          value={placeholder.value}
          disabled={placeholder.hidden}
          hidden={placeholder.hidden}
        >
          {placeholder.label}
        </option>
      )}

      {parents.map(parent => {
        const kids = children.filter(c => c.parent_id === parent.id)

        if (kids.length === 0) {
          // Leaf parent — directly selectable
          return (
            <option key={parent.id} value={parent.id}>
              {label(parent)}
            </option>
          )
        }

        // Parent with children — render as optgroup
        return (
          <optgroup key={parent.id} label={label(parent)}>
            {kids.map(child => (
              <option key={child.id} value={child.id}>
                {label(child)}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
