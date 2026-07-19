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
        {/* The clip wrapper is the animated grid row. Padding lives on the
            inner element so the row can collapse to a true zero height —
            padding on the row itself keeps it propped open a few pixels. */}
        <div className="collapsible-clip">
          <div className="collapsible-inner">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
