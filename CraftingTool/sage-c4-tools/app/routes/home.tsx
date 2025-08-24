import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Navigation } from "../components/Navigation";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "SAGE C4 Tools - Star Atlas" },
    { name: "description", content: "Master the C4 system with integrated tools for Claim Stakes, Crafting Habs, and Recipe Analysis" },
  ];
}

export default function Home() {
  return (
    <div className="app">
      <Navigation />

      <main className="container" style={{ paddingTop: '2rem' }}>
        <header className="text-center" style={{ marginBottom: '3rem' }}>
          <h1 className="heading-primary" style={{ color: 'var(--primary-orange)', marginBottom: '1rem' }}>
            SAGE C4 TOOLS
          </h1>
          <p className="body-text text-secondary" style={{ fontSize: '1.25rem' }}>
            Master the Claim, Craft, Combat, Conquer system
          </p>
        </header>

        <div className="grid grid-cols-3 gap-lg" style={{ marginBottom: '3rem' }}>
          <Link to="/claim-stakes" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏭</div>
              <h2 className="heading-secondary" style={{ marginBottom: '0.5rem' }}>Claim Stakes</h2>
              <p className="body-text text-secondary">
                Design and optimize resource extraction on planets
              </p>
            </div>
          </Link>

          <Link to="/crafting-hab" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
              <h2 className="heading-secondary" style={{ marginBottom: '0.5rem' }}>Crafting Hab</h2>
              <p className="body-text text-secondary">
                Manage starbase crafting operations
              </p>
            </div>
          </Link>

          <Link to="/recipes" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="text-center">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <h2 className="heading-secondary" style={{ marginBottom: '0.5rem' }}>Recipe Analysis</h2>
              <p className="body-text text-secondary">
                Visualize and optimize crafting paths
              </p>
            </div>
          </Link>
        </div>

        <section className="panel" style={{ marginBottom: '2rem' }}>
          <h3 className="heading-secondary" style={{ marginBottom: '1rem' }}>Features</h3>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <h4 style={{ color: 'var(--primary-orange)', marginBottom: '0.5rem' }}>🎮 Gamified Experience</h4>
              <p className="text-secondary">Tutorial system, achievements, and visual feedback</p>
            </div>
            <div>
              <h4 style={{ color: 'var(--primary-orange)', marginBottom: '0.5rem' }}>🔄 Integrated Tools</h4>
              <p className="text-secondary">Seamless resource flow between all three tools</p>
            </div>
            <div>
              <h4 style={{ color: 'var(--primary-orange)', marginBottom: '0.5rem' }}>💾 Save System</h4>
              <p className="text-secondary">Auto-save and manual save/load functionality</p>
            </div>
            <div>
              <h4 style={{ color: 'var(--primary-orange)', marginBottom: '0.5rem' }}>📊 Analytics</h4>
              <p className="text-secondary">Efficiency metrics and optimization suggestions</p>
            </div>
          </div>
        </section>

        <section className="text-center">
          <Link to="/claim-stakes" className="btn btn-primary" style={{ marginRight: '1rem' }}>
            Get Started
          </Link>
          <button className="btn btn-secondary">
            Load Saved Game
          </button>
        </section>
      </main>
    </div>
  );
}
