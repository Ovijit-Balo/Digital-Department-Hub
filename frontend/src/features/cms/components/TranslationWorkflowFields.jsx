import { sourceLanguageOptions, translationStatusOptions } from '../../../data/cmsTranslations';

export function TranslationWorkflowFields({ value, onChange }) {
  return (
    <div className="workflow-grid">
      <label>
        Source Language
        <select
          value={value.sourceLanguage}
          onChange={(event) => onChange('sourceLanguage', event.target.value)}
        >
          {sourceLanguageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        EN Translation Status
        <select
          value={value.enStatus}
          onChange={(event) => onChange('enStatus', event.target.value)}
        >
          {translationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        BN Translation Status
        <select
          value={value.bnStatus}
          onChange={(event) => onChange('bnStatus', event.target.value)}
        >
          {translationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default TranslationWorkflowFields;
