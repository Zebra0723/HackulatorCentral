import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FilmStage } from "../FilmStage";

describe("FilmStage", () => {
  it("shows the poster and disabled controls when no film file is configured", () => {
    const { container } = render(<FilmStage poster="/p.webp" posterFallback="/p.jpg" width={720} height={1280} durationLabel="22 seconds" />);
    expect(screen.getByRole("img", { name: /poster/i })).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeDisabled();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("does not load the video before it is needed", () => {
    const { container } = render(<FilmStage src="/film.mp4" poster="/p.webp" posterFallback="/p.jpg" width={720} height={1280} durationLabel="22 seconds" />);
    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeEnabled();
  });
});
