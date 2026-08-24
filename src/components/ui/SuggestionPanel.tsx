import type { DictionarySuggestion } from "../../suggestionDictionary";

export function SuggestionPanel({
  title,
  suggestions,
  emptyLabel,
  onPick,
}: {
  title: string;
  suggestions: DictionarySuggestion[];
  emptyLabel: string;
  onPick: (suggestion: DictionarySuggestion) => void;
}) {
  return (
    <div className="dictionary-suggestions" role="listbox" aria-label={title}>
      <strong>{title}</strong>
      {suggestions.length > 0 ? (
        <div className="dictionary-suggestion-list">
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(suggestion)}>
              <b>{suggestion.label}</b>
            </button>
          ))}
        </div>
      ) : (
        <p className="helper-text">{emptyLabel}</p>
      )}
    </div>
  );
}
