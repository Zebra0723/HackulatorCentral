import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATALOGUE } from "@/config/offer";
import { Configurator } from "../Configurator";

const props = { catalogue: DEFAULT_CATALOGUE, onlineSubmissions: false, email: "hackulator@dailyos.uk" };
const summary = () => screen.getByRole("complementary");
const subtotal = () => within(summary()).getByText(/^£\d+\.\d{2}$/, { selector: "strong" });

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("Configurator", () => {
  it("starts at £0 extras with the base price unconfirmed and no pay button", () => {
    render(<Configurator {...props} />);
    expect(subtotal()).toHaveTextContent("£0.00");
    expect(within(summary()).getByText("To be confirmed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument();
    expect(within(summary()).getByText("Snake, 2048 and Tetris")).toBeInTheDocument();
  });

  it("covers a pack's games instead of charging them twice", async () => {
    const user = userEvent.setup();
    render(<Configurator {...props} />);
    await user.click(screen.getByRole("checkbox", { name: /^Pong/ }));
    expect(subtotal()).toHaveTextContent("£2.50");
    await user.click(screen.getByRole("checkbox", { name: /^Classics Pack/ }));
    expect(subtotal()).toHaveTextContent("£5.00");
    expect(screen.getByRole("checkbox", { name: /^Pong/ })).toBeDisabled();
  });

  it("keeps cover extras when switching tiers and shows Custom UI as included on The Hacker", async () => {
    const user = userEvent.setup();
    render(<Configurator {...props} />);
    await user.click(screen.getByRole("checkbox", { name: /^Name on cover/ }));
    await user.type(screen.getByLabelText("Text for the cover"), "Sam");
    await user.click(screen.getByRole("radio", { name: /^The Gamer/ }));
    await user.click(screen.getByRole("checkbox", { name: /^Custom UI/ }));
    expect(subtotal()).toHaveTextContent("£18.00");
    await user.click(screen.getByRole("radio", { name: /^The Hacker/ }));
    expect(subtotal()).toHaveTextContent("£23.00");
    expect(screen.getByRole("checkbox", { name: /^Custom UI/ })).toBeDisabled();
    expect(within(summary()).getByText("Included in pass")).toBeInTheDocument();
    expect(screen.getByLabelText("Text for the cover")).toHaveValue("Sam");
  });

  it("does not allow the unfinished Arcade Pack to be selected", () => {
    render(<Configurator {...props} />);
    expect(screen.getByRole("checkbox", { name: /^Arcade Pack/ })).toBeDisabled();
    expect(screen.getByText(/third game to be announced/)).toBeInTheDocument();
  });

  it("shows the Custom UI choices with no extra charge", async () => {
    const user = userEvent.setup();
    render(<Configurator {...props} />);
    await user.click(screen.getByRole("checkbox", { name: /^Custom UI/ }));
    for (const name of [/^Ocean/, /^Light/, /^List/, /^Mono/]) await user.click(screen.getByRole("radio", { name }));
    await user.clear(screen.getByLabelText("Welcome text"));
    await user.type(screen.getByLabelText("Welcome text"), "Hi there");
    expect(subtotal()).toHaveTextContent("£5.00");
  });

  it("says plainly that nothing was submitted when online requests aren't set up", async () => {
    const user = userEvent.setup();
    render(<Configurator {...props} />);
    await user.click(screen.getByRole("checkbox", { name: /^Classics Pack/ }));
    await user.click(screen.getByRole("button", { name: "Send order request" }));
    const note = screen.getByText(/switched on yet/).closest("p")!;
    expect(note).toHaveTextContent(/has not been submitted/);
    const link = screen.getByRole("link", { name: "Email order", hidden: true });
    expect(link.getAttribute("href")!.startsWith("mailto:hackulator@dailyos.uk?")).toBe(true);
  });

  it("submits to the server and shows the reference only after a real response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ reference: "ENQ-0007" }), { status: 201, headers: { "Content-Type": "application/json" } }),
    );
    const user = userEvent.setup();
    const { container } = render(<Configurator {...props} onlineSubmissions />);
    await user.click(within(summary()).getByRole("button", { name: "Send order request" }));
    const dialog = within(container.querySelector("dialog")!);
    await user.type(dialog.getByLabelText("Your name", { selector: "input" }), "Sam");
    await user.type(dialog.getByLabelText("Email", { selector: "input" }), "sam@example.com");
    await user.click(dialog.getByRole("button", { name: "Send order request", hidden: true }));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toMatchObject({ kind: "order", name: "Sam", email: "sam@example.com" });
    expect(await dialog.findByText("ENQ-0007")).toBeInTheDocument();
  });

  it("blocks sending an order until the build is complete", async () => {
    const user = userEvent.setup();
    render(<Configurator {...props} />);
    await user.click(screen.getByRole("checkbox", { name: /^Icon on cover/ }));
    expect(screen.getByRole("button", { name: "Send order request" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /^Dog/ }));
    expect(screen.getByRole("button", { name: "Send order request" })).toBeEnabled();
  });

  it("saves locally and restores without sending anything", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Configurator {...props} />);
    await user.click(screen.getByRole("checkbox", { name: /^Classics Pack/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText(/Saved on this device only/)).toBeInTheDocument();
    unmount();
    render(<Configurator {...props} />);
    expect(subtotal()).toHaveTextContent("£5.00");
  });
});
