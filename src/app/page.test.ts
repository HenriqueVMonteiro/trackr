import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
  it("renders the Trackr landing page as the public homepage", () => {
    const html = renderToStaticMarkup(React.createElement(Home));

    expect(html).toContain("Acompanhe o trabalho");
    expect(html).toContain("Sem o peso do Jira");
    expect(html).toContain('href="/login"');
  });
});
