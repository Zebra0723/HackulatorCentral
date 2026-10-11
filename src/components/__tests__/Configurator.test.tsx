import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Configurator } from "../Configurator";

const subtotal = () => within(screen.getByRole("complementary")).getByText(/^£\d+\.\d{2}$/, { selector: "strong" });

describe("Configurator", () => {
  it("starts at £0 extras with the base price unconfirmed and no pay button", () => {
    render(<Configurator />);
    expect(subtotal()).toHaveTextContent("£0.00");
    expect(within(screen.getByRole("complementary")).getByText("To be confirmed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
  });

  it("covers a pack's games instead of charging them twice", async () => {
    const user = userEvent.setup();
    render(<Configurator />);
    await user.click(screen.getByRole("checkbox", { name: /^Pong/ }));
    expect(subtotal()).toHaveTextContent("£2.50");
    await user.click(screen.getByRole("checkbox", { name: /^Classics Pack/ }));
    expect(subtotal()).toHaveTextContent("£5.00");
    expect(screen.getByRole("checkbox", { name: /^Pong/ })).toBeDisabled();
  });

  it("keeps cover extras when switching tiers and disables the separate Custom UI charge on the £20 pass", async () => {
    const user = userEvent.setup();
    render(<Configurator />);
    await user.click(screen.getByRole("checkbox", { name: /^Name on cover/ }));
    await user.type(screen.getByLabelText("Text for the cover"), "Sam");
    await user.click(screen.getByRole("radio", { name: /^The Gamer/ }));
    await user.click(screen.getByRole("checkbox", { name: /^Custom UI/ }));
    expect(subtotal()).toHaveTextContent("£18.00");
    await user.click(screen.getByRole("radio", { name: /^The Hacker/ }));
    expect(subtotal()).toHaveTextContent("£23.00");
    expect(screen.getByRole("checkbox", { name: /^Custom UI/ })).toBeDisabled();
    expect(screen.getByLabelText("Text for the cover")).toHaveValue("Sam");
  });

  it("prepares an order email to hackulator@dailyos.uk with the build summary", async () => {
    const user = userEvent.setup();
    render(<Configurator />);
    await user.click(screen.getByRole("checkbox", { name: /^Classics Pack/ }));
    await user.click(screen.getByRole("button", { name: "Send order by email" }));
    const link = screen.getByRole("link", { name: "Email order", hidden: true });
    const href = link.getAttribute("href")!;
    expect(href.startsWith("mailto:hackulator@dailyos.uk?")).toBe(true);
    expect(decodeURIComponent(href)).toContain("Hackulator order request");
    expect(decodeURIComponent(href)).toContain("Extras subtotal: £5.00");
  });

  it("blocks sending an order until the build is complete", async () => {
    const user = userEvent.setup();
    render(<Configurator />);
    await user.click(screen.getByRole("checkbox", { name: /^Icon on cover/ }));
    expect(screen.getByRole("button", { name: "Send order by email" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /^Dog/ }));
    expect(screen.getByRole("button", { name: "Send order by email" })).toBeEnabled();
  });

  it("shows font, colour and a home-screen preview for Custom UI", async () => {
    const user = userEvent.setup();
    render(<Configurator />);
    expect(screen.queryByRole("figure", { name: /home screen/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /^Custom UI/ }));
    await user.click(screen.getByRole("radio", { name: /Mono/ }));
    await user.click(screen.getByRole("radio", { name: /Ocean/ }));
    expect(screen.getByRole("figure", { name: /Mono font with Ocean colours/ })).toBeInTheDocument();
  });

  it("does not allow the unfinished Arcade Pack to be selected", () => {
    render(<Configurator />);
    expect(screen.getByRole("checkbox", { name: /^Arcade Pack/ })).toBeDisabled();
  });

  it("shows a validation error for an invalid cover name", async () => {
    const user = userEvent.setup();
    render(<Configurator />);
    await user.click(screen.getByRole("checkbox", { name: /^Name on cover/ }));
    await user.type(screen.getByLabelText("Text for the cover"), "<b>");
    expect(screen.getByLabelText("Text for the cover")).toHaveAttribute("aria-invalid", "true");
  });
});
