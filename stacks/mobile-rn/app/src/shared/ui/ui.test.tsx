import { fireEvent, screen } from "@testing-library/react-native";
import { Plus } from "lucide-react-native";
import { renderWithProviders } from "@/test-utils";
import { Button, Dialog, EmptyState, ErrorState, IconButton, Input, ListRow, Select, Switch, Tabs } from "./index";

describe("Button", () => {
  it("fires onPress and exposes its label", async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores presses while loading and says it is busy", async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Save" loading onPress={onPress} />);
    const button = screen.getByRole("button", { name: "Save" });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  });
});

describe("IconButton", () => {
  it("is reachable by its required label", async () => {
    await renderWithProviders(<IconButton icon={Plus} label="Add note" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Add note" })).toBeTruthy();
  });
});

describe("Input", () => {
  it("shows the error text and the label", async () => {
    await renderWithProviders(<Input label="Email" value="" onChangeText={() => {}} error="Enter a valid email address." />);
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
  });
});

describe("Select", () => {
  it("opens the sheet and reports the chosen option", async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <Select label="Sort" value="newest" onChange={onChange} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }]} />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Sort: Newest" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Oldest" }));
    expect(onChange).toHaveBeenCalledWith("oldest");
  });
});

describe("Switch and Tabs", () => {
  it("toggles and switches tabs", async () => {
    const onToggle = jest.fn();
    const onTab = jest.fn();
    await renderWithProviders(
      <>
        <Switch label="Reminders" value={false} onValueChange={onToggle} />
        <Tabs items={[{ value: "a", label: "All" }, { value: "b", label: "Today" }]} value="a" onChange={onTab} />
      </>,
    );
    await fireEvent(screen.getByLabelText("Reminders"), "valueChange", true);
    await fireEvent.press(screen.getByLabelText("Today"));
    expect(onTab).toHaveBeenCalledWith("b");
  });
});

describe("ListRow, EmptyState, ErrorState", () => {
  it("renders a pressable row and calls back", async () => {
    const onPress = jest.fn();
    await renderWithProviders(<ListRow title="Buy milk" subtitle="Today" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Buy milk, Today" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("offers the next step when empty and a retry when failed", async () => {
    const onAction = jest.fn();
    const onRetry = jest.fn();
    await renderWithProviders(
      <>
        <EmptyState title="No notes yet" actionLabel="New note" onAction={onAction} />
        <ErrorState message="Offline" actionLabel="Try again" onAction={onRetry} />
      </>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "New note" }));
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onAction).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});

describe("Dialog", () => {
  it("confirms and cancels", async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    await renderWithProviders(<Dialog visible title="Delete?" message="Cannot be undone." confirmLabel="Delete" destructive onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByText("Delete?")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
