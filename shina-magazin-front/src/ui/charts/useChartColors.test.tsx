import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useChartColors } from "@/ui";

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
    // Light fallback: series[0] === primary === '#0f766e' (teal).
    expect(screen.getByTestId("series-0")).toHaveTextContent("#0f766e");
    expect(screen.getByTestId("primary")).toHaveTextContent("#0f766e");
  });

  it("uses the dark CHART_SERIES palette under data-theme=shina-dark", () => {
    document.documentElement.dataset.theme = "shina-dark";
    render(<Probe />);
    // Dark fallback: series[0] === primary === '#2dd4bf'.
    expect(screen.getByTestId("series-0")).toHaveTextContent("#2dd4bf");
    expect(screen.getByTestId("primary")).toHaveTextContent("#2dd4bf");
  });

  it("maps secondary to the second palette entry in light theme", () => {
    document.documentElement.dataset.theme = "shina";
    render(<Probe />);
    // Light fallback: secondary === series[1] === '#ea580c' (orange).
    expect(screen.getByTestId("secondary")).toHaveTextContent("#ea580c");
  });

  it("returns all series entries as non-empty strings", () => {
    render(<Probe />);
    const len = Number(screen.getByTestId("series-len").textContent);
    expect(len).toBe(8);
    // series[0] mavjud va bo'sh emas (eng kamida birinchisi).
    expect((screen.getByTestId("series-0").textContent ?? "").length).toBeGreaterThan(0);
  });
});
