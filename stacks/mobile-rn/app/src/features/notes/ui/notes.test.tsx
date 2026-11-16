import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { filterNotes } from "../state/filter";
import { listNotes, type Note } from "../data/notes-api";
import { NotesListScreen } from "./NotesListScreen";

jest.mock("../data/notes-api");
const list = listNotes as jest.MockedFunction<typeof listNotes>;

const now = new Date("2026-03-10T12:00:00Z");
const notes: Note[] = [
  { id: "1", text: "Buy milk", createdAt: "2026-03-10T09:00:00Z" },
  { id: "2", text: "Call the dentist", createdAt: "2026-03-05T09:00:00Z" },
  { id: "3", text: "Plan holiday", createdAt: "2026-01-01T09:00:00Z" },
];

describe("filterNotes", () => {
  it("searches, limits by range and sorts", () => {
    expect(filterNotes(notes, "milk", "all", "newest", now).map((n) => n.id)).toEqual(["1"]);
    expect(filterNotes(notes, "", "week", "newest", now).map((n) => n.id)).toEqual(["1", "2"]);
    expect(filterNotes(notes, "", "all", "oldest", now).map((n) => n.id)).toEqual(["3", "2", "1"]);
  });
});

describe("NotesListScreen states", () => {
  const props = { onOpen: jest.fn(), onCreate: jest.fn() };
  beforeEach(() => jest.clearAllMocks());

  it("shows a skeleton while loading", async () => {
    list.mockReturnValue(new Promise(() => {}));
    await renderWithProviders(<NotesListScreen {...props} />);
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });

  it("shows the empty state with a way to create", async () => {
    list.mockResolvedValue([]);
    await renderWithProviders(<NotesListScreen {...props} />);
    await screen.findByText("No notes yet");
    await fireEvent.press(screen.getAllByRole("button", { name: "New note" }).at(-1)!);
    expect(props.onCreate).toHaveBeenCalled();
  });

  it("shows the error and retries", async () => {
    list.mockRejectedValueOnce(new Error("Can't reach the server."));
    await renderWithProviders(<NotesListScreen {...props} />);
    await screen.findByText("Can't reach the server.");
    list.mockResolvedValue(notes);
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Buy milk");
  });

  it("lists notes, opens one and reports no matches for a search", async () => {
    list.mockResolvedValue(notes);
    await renderWithProviders(<NotesListScreen {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: /Buy milk/ }));
    expect(props.onOpen).toHaveBeenCalledWith("1");
    await fireEvent.changeText(screen.getByLabelText("Search"), "zzz");
    await waitFor(() => expect(screen.getByText("No matching notes")).toBeTruthy());
  });
});
