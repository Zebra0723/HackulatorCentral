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
    await user.click(screen.getByRole("radio", { name: /^All Games Forever/ }));
    await user.click(screen.getByRole("checkbox", { name: /^Custom UI/ }));
    expect(subtotal()).toHaveTextContent("£18.00");
    await user.click(screen.getByRole("radio", { name: /^All Software Forever/ }));
    expect(subtotal()).toHaveTextContent("£23.00");
    expect(screen.getByRole("checkbox", { name: /^Custom UI/ })).toBeDisabled();
    expect(screen.getByLabelText("Text for the cover")).toHaveValue("Sam");
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
