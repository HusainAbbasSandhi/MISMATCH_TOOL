:root {
  --cream: #fbf6ef;
  --paper: #fffdf9;
  --ink: #2b2420;
  --muted: #8a7e6d;
  --line: #e6dbc9;
  --forest: #2f6f5e;
  --forest-dark: #234f43;
  --forest-soft: #e5efec;
  --gold: #c98a2b;
  --gold-soft: #f6e9d3;
  --red: #b1493a;
  --red-soft: #f7e6e2;
  --shadow: 0 1px 2px rgba(43, 36, 32, 0.04), 0 8px 24px -12px rgba(43, 36, 32, 0.12);
}

* {
  box-sizing: border-box;
}

html,
body {
  padding: 0;
  margin: 0;
  background: var(--cream);
  color: var(--ink);
  font-family: "Inter", sans-serif;
}

h1,
h2,
h3,
.font-display {
  font-family: "Sora", sans-serif;
}

a {
  color: inherit;
}

.orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(60px);
  z-index: 0;
  pointer-events: none;
}
.orb1 {
  width: 420px;
  height: 420px;
  background: var(--forest);
  top: -140px;
  left: -120px;
  opacity: 0.14;
}
.orb2 {
  width: 360px;
  height: 360px;
  background: var(--gold);
  bottom: -120px;
  right: -100px;
  opacity: 0.16;
}

.wrap {
  position: relative;
  z-index: 1;
  max-width: 980px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: "Sora", sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--forest);
  background: var(--forest-soft);
  padding: 6px 12px;
  border-radius: 999px;
  margin-bottom: 16px;
}

.panel {
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  padding: 24px;
  margin-bottom: 24px;
}

.panel-label {
  font-family: "Sora", sans-serif;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--ink);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  font-family: "Sora", sans-serif;
  font-weight: 700;
  font-size: 14px;
  border: none;
  border-radius: 11px;
  padding: 12px 22px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}
.btn:active {
  transform: translateY(1px);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--forest);
  color: #fff;
  box-shadow: 0 4px 14px -4px rgba(47, 111, 94, 0.45);
}
.btn-primary:hover:not(:disabled) {
  background: var(--forest-dark);
}
.btn-ghost {
  background: transparent;
  color: var(--forest);
  border: 1.5px solid var(--forest);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--forest-soft);
}

input[type="text"],
input[type="tel"],
input[type="date"],
input[type="password"],
select {
  font-family: "Inter", sans-serif;
  font-size: 15px;
  padding: 11px 14px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  outline: none;
  width: 100%;
}
input:focus,
select:focus {
  border-color: var(--forest);
  box-shadow: 0 0 0 3px var(--forest-soft);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  display: inline-block;
}
.tag-forest {
  background: var(--forest-soft);
  color: var(--forest);
}
.tag-gold {
  background: var(--gold-soft);
  color: #8a5c17;
}
.tag-red {
  background: var(--red-soft);
  color: var(--red);
}

.rail {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 32px;
}
.rail-step {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.rail-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Sora", sans-serif;
  font-weight: 700;
  font-size: 13px;
  background: var(--paper);
  border: 2px solid var(--line);
  color: var(--muted);
  flex-shrink: 0;
}
.rail-dot.done {
  background: var(--forest);
  border-color: var(--forest);
  color: #fff;
}
.rail-dot.active {
  border-color: var(--forest);
  color: var(--forest);
}
.rail-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}
.rail-label.active {
  color: var(--ink);
}
.rail-line {
  flex: 1;
  height: 2px;
  background: var(--line);
}
.rail-line.done {
  background: var(--forest);
}

.choice-card {
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 18px;
  cursor: pointer;
  background: #fff;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
  text-align: left;
}
.choice-card:hover {
  border-color: var(--forest);
}
.choice-card.selected {
  border-color: var(--forest);
  box-shadow: 0 0 0 3px var(--forest-soft);
}
.choice-card .title {
  font-family: "Sora", sans-serif;
  font-weight: 700;
  font-size: 15px;
  margin-bottom: 4px;
}
.choice-card .desc {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  background: #f1ece1;
  padding: 3px 9px;
  border-radius: 999px;
}
