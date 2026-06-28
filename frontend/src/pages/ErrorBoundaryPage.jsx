import React from 'react';
import { ui } from '../i18n/publicUi';

export class ErrorBoundaryPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production, send error to logging service
    // For now, errors are silently caught to avoid exposing sensitive info
    // TODO: Integrate with error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      // language hook cannot be used in class components; fall back to default language provided by props
      const language = this.props.languageOverride || 'en';

      return (
        <main className="public-content">
          <section className="page-wrap">
            <div className="hero-content">
              <h1>{ui('errors', 'errorBoundaryTitle', language)}</h1>
              <p>{ui('errors', 'errorBoundaryMessage', language)}</p>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.6rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  {ui('errors', 'reload', language)}
                </button>

                <a href="/" className="btn btn-ghost">
                  {ui('errors', 'goHome', language)}
                </a>
              </div>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundaryPage;
