import { Component, type ReactNode } from 'react';

/**
 * Keeps a failure inside one study section. Without it, a section that fails to load or render unmounts
 * the whole app and leaves a blank page. A reload is the only retry that works for code that failed to
 * download, because React remembers a failed lazy import for the life of the page.
 */
type Props = { children: ReactNode };

export default class SectionErrorBoundary extends Component<Props, { failed: boolean }> {
  // The project has no React type definitions, so the members this class uses are declared here.
  declare props: Props;
  state = { failed: false };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Study section failed', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="section-error" role="alert">
        <h2>This section didn't load</h2>
        <p>Check your connection, then reload the page. Your saved progress is not affected.</p>
        <button type="button" className="primary-button" onClick={() => window.location.reload()}>Reload the page</button>
      </div>
    );
  }
}
