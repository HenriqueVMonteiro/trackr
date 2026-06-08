/* Trackr UI primitives. Exposed on window.UI.* */
(function () {
  const React = window.React;
  const { useState, useRef, useEffect } = React;
  const Icon = window.Icon;
  const D = window.TrackrData;
  const h = React.createElement;

  // ---------- Avatar ----------
  function Avatar({ userId, size = 20, user }) {
    const u = user || D.membersById[userId];
    if (!u) return null;
    return h(
      "span",
      {
        className: "avatar",
        title: u.name,
        style: {
          width: size,
          height: size,
          background: u.color,
          fontSize: Math.round(size * 0.42),
        },
      },
      u.initials,
    );
  }

  function AvatarStack({ userIds, size = 20, max = 4 }) {
    const ids = userIds.slice(0, max);
    return h(
      "span",
      { className: "avatar-stack" },
      ids.map((id) => h(Avatar, { key: id, userId: id, size })),
    );
  }

  // ---------- Counter ----------
  function Counter({ children, primary }) {
    return h("span", { className: "counter" + (primary ? " primary" : "") }, children);
  }

  // ---------- Label ----------
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function Label({ id, name, color, small }) {
    const lab = id ? D.labelsById[id] : { name, color };
    if (!lab) return null;
    const [r, g, b] = hexToRgb(lab.color);
    // darken text for readability
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const textColor = lum > 0.5 ? `rgb(${r * 0.55 | 0},${g * 0.55 | 0},${b * 0.55 | 0})` : lab.color;
    return h(
      "span",
      {
        className: "label",
        style: {
          background: `rgba(${r},${g},${b},0.14)`,
          borderColor: `rgba(${r},${g},${b},0.35)`,
          color: textColor,
          fontSize: small ? 11 : 12,
          height: small ? 18 : 20,
        },
      },
      lab.name,
    );
  }

  // ---------- Status icon (octicon-style) ----------
  function StatusIcon({ status, size = 16 }) {
    const meta = D.STATUS_META[status];
    const IconComp = Icon[meta.icon];
    return h(IconComp, { size, color: meta.hue });
  }

  function StatusBadge({ status, lg }) {
    const meta = D.STATUS_META[status];
    return h(
      "span",
      { className: "status-badge" + (lg ? " lg" : ""), style: { background: meta.hue } },
      h("span", { className: "status-icon" }, h(StatusIcon, { status, size: lg ? 15 : 13, color: "#fff" })),
      meta.label,
    );
  }

  // Status icon rendered white (for badges)
  function StatusIconWhite({ status, size }) {
    const meta = D.STATUS_META[status];
    const IconComp = Icon[meta.icon];
    return h(IconComp, { size, color: "#fff" });
  }

  // ---------- Priority ----------
  function PriorityIcon({ priority, size = 16 }) {
    const meta = D.PRIORITY_META[priority];
    if (priority === "none") {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 16 16", style: { display: "block" } },
        h("rect", { x: 1.5, y: 7, width: 13, height: 2, rx: 1, fill: "#818b98" }),
      );
    }
    if (meta.urgent) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 16 16", style: { display: "block" } },
        h("rect", { x: 1, y: 1, width: 14, height: 14, rx: 3, fill: "#d1242f" }),
        h("rect", { x: 7, y: 4, width: 2, height: 5, rx: 1, fill: "#fff" }),
        h("rect", { x: 7, y: 10.5, width: 2, height: 2, rx: 1, fill: "#fff" }),
      );
    }
    const bars = meta.bars;
    const heights = [5, 9, 13];
    const ys = [10, 6, 2];
    return h(
      "svg",
      { width: size, height: size, viewBox: "0 0 16 16", style: { display: "block" } },
      [0, 1, 2].map((i) =>
        h("rect", {
          key: i,
          x: 1 + i * 5,
          y: ys[i],
          width: 3.4,
          height: heights[i],
          rx: 1,
          fill: i < bars ? "#59636e" : "#d0d7de",
        }),
      ),
    );
  }

  function PriorityTag({ priority }) {
    const meta = D.PRIORITY_META[priority];
    return h(
      "span",
      { className: "row gap-6", style: { fontSize: 13 } },
      h(PriorityIcon, { priority, size: 16 }),
      h("span", null, meta.label),
    );
  }

  // ---------- RelativeTime ----------
  function RelativeTime({ iso }) {
    return h("span", { title: D.formatDate(iso) }, D.relativeTime(iso));
  }

  // ---------- Dropdown ----------
  function Dropdown({ trigger, children, align = "left", width }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const onDoc = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);
    return h(
      "span",
      { className: "dd", ref },
      h("span", { onClick: () => setOpen((o) => !o), style: { display: "inline-flex" } }, trigger),
      open &&
        h(
          "div",
          {
            className: "dd-menu" + (align === "right" ? " right" : ""),
            style: width ? { minWidth: width } : null,
          },
          typeof children === "function" ? children(() => setOpen(false)) : children,
        ),
    );
  }

  function DdItem({ children, onClick, active, disabled, sub, icon }) {
    return h(
      "button",
      {
        className: "dd-item" + (disabled ? " disabled" : ""),
        onClick: disabled ? undefined : onClick,
      },
      h(
        "span",
        { className: "dd-item-check" },
        active ? h(Icon.check, { size: 16 }) : null,
      ),
      icon || null,
      h(
        "span",
        { style: { flex: 1 } },
        children,
        sub ? h("div", { className: "dd-item-sub" }, sub) : null,
      ),
    );
  }

  // ---------- Markdown-ish (paragraphs + `code`) ----------
  function renderInline(text, keyBase) {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((p, i) => {
      if (p.startsWith("`") && p.endsWith("`")) {
        return h("code", { key: keyBase + "-" + i }, p.slice(1, -1));
      }
      return p;
    });
  }
  function Markdown({ paragraphs }) {
    return (paragraphs || []).map((p, i) =>
      h("p", { key: i }, renderInline(p, "p" + i)),
    );
  }

  // ---------- Button (link-style helper) ----------
  function Btn({ children, variant, size, onClick, href, disabled, title, className, leadingIcon }) {
    const cls =
      "btn" +
      (variant ? " btn-" + variant : "") +
      (size === "sm" ? " btn-sm" : "") +
      (className ? " " + className : "");
    const content = [
      leadingIcon ? h("span", { key: "i", style: { display: "inline-flex" } }, leadingIcon) : null,
      children,
    ];
    if (href !== undefined) {
      return h("a", { className: cls, href, title, onClick }, content);
    }
    return h("button", { className: cls, onClick, disabled, title }, content);
  }

  // ---------- IssueIcon (status as the leading list icon) ----------
  function IssueLeadIcon({ status, size = 16 }) {
    return h(StatusIcon, { status, size });
  }

  window.UI = {
    Avatar, AvatarStack, Counter, Label, StatusIcon, StatusBadge, StatusIconWhite,
    PriorityIcon, PriorityTag, RelativeTime, Dropdown, DdItem, Markdown, Btn,
    IssueLeadIcon, renderInline,
  };
})();
