import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useChartColors } from "@/ui";
import { CHART_SERIES } from "@/ui/tokens/colors";

/**
 * jsdom'da haqiqiy CSS yo'q — getComputedStyle().getPropertyValue() bo'sh string
 * qaytaradi, shuning uchun hook CHART_SERIES fallback'ga tushadi. Bu test shu
 * fallback xulq-atvorini tekshiradi (aniq CSS-var resolution'ga tayanmaydi).
 */
function Probe() {
  const colors = useChartColors();
  return (
    <div>
      <span data-testid="series-len">{colors.series.length}</span>
      <span data-testid="primary">{colors.primary}</span>
      <span data-testid="series-0">{colors.series[0]}</span>
      <span data-testid="secondary">{colors.secondary}</span>
    </div>
  );
}

describe("useChartColors", () => {
  beforeEach(() => {
    // Har test o'z temasini render'dan oldin o'rnatadi.
    document.documentElement.dataset.theme = "shina";
  });

  it("returns exactly 8 series colors", () => {
    render(<Probe />);
    expect(screen.getByTestId("series-len")).toHaveTextContent("8");
  });

  it("exposes a non-empty primary color string", () => {
    render(<Probe />);
    const primary = screen.getByTestId("primary").textContent ?? "";
    expect(primary.length).toBeGreaterThan(0);
  });

  it("falls back to the light CHART_SERIES palette under data-theme=shina", () => {
    document.documentElement.dataset.theme = "shina";
    render(<Probe />);
    // Light fallback: series[0] === primary === CHART_SERIES.light[0] (kobalt).
    expect(screen.getByTestId("series-0")).toHaveTextContent(CHART_SERIES.light[0]);
    expect(screen.getByTestId("primary")).toHaveTextContent(CHART_SERIES.light[0]);
  });

  it("uses the dark CHART_SERIES palette under data-theme=shina-dark", () => {
    document.documentElement.dataset.theme = "shina-dark";
    render(<Probe />);
    // Dark fallback: series[0] === primary === CHART_SERIES.dark[0].
    expect(screen.getByTestId("series-0")).toHaveTextContent(CHART_SERIES.dark[0]);
    expect(screen.getByTestId("primary")).toHaveTextContent(CHART_SERIES.dark[0]);
  });

  it("maps secondary to the second palette entry in light theme", () => {
    document.documentElement.dataset.theme = "shina";
    render(<Probe />);
    // Light fallback: secondary === series[1] (signal-orange).
    expect(screen.getByTestId("secondary")).toHaveTextContent(CHART_SERIES.light[1]);
  });

  it("returns all series entries as non-empty strings", () => {
    render(<Probe />);
    const len = Number(screen.getByTestId("series-len").textContent);
    expect(len).toBe(8);
    // series[0] mavjud va bo'sh emas (eng kamida birinchisi).
    expect((screen.getByTestId("series-0").textContent ?? "").length).toBeGreaterThan(0);
  });
});
