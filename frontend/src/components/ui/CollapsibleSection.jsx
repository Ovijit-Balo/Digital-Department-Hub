import { useState } from 'react';

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <div className="collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>{title}</h3>
        <span className={`collapsible-toggle${isOpen ? ' is-open' : ''}`}>
          ▼
        </span>
      </div>
      <div className={`collapsible-content${isOpen ? ' is-open' : ''}`}>
        <div className="collapsible-inner">{children}</div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
