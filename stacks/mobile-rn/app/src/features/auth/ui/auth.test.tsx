import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils";
import { useAuth } from "../state/session";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";
import { SignInScreen } from "./SignInScreen";
import { SignUpScreen } from "./SignUpScreen";

jest.mock("../state/session", () => ({ useAuth: jest.fn() }));
const mocked = useAuth as jest.MockedFunction<typeof useAuth>;
const auth = { signIn: jest.fn(), signUp: jest.fn(), requestPasswordReset: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.mockReturnValue(auth as unknown as ReturnType<typeof useAuth>);
});

describe("SignInScreen", () => {
  it("validates before calling the server", async () => {
    await renderWithProviders(<SignInScreen onSignUp={() => {}} onForgotPassword={() => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Enter your password.")).toBeTruthy();
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it("signs in and shows a server error in words", async () => {
    auth.signIn.mockRejectedValueOnce(new Error("Invalid email or password"));
    await renderWithProviders(<SignInScreen onSignUp={() => {}} onForgotPassword={() => {}} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), " me@example.com ");
    await fireEvent.changeText(screen.getByLabelText("Password"), "secret123");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Invalid email or password");
    expect(auth.signIn).toHaveBeenCalledWith("me@example.com", "secret123");
  });
});

describe("SignUpScreen", () => {
  it("requires a name, an email and an 8 character password", async () => {
    await renderWithProviders(<SignUpScreen onSignIn={() => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Enter your name.")).toBeTruthy();
    expect(screen.getByText("Use at least 8 characters.", { exact: false })).toBeTruthy();
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe("ForgotPasswordScreen", () => {
  it("confirms once the link was requested", async () => {
    auth.requestPasswordReset.mockResolvedValue(undefined);
    await renderWithProviders(<ForgotPasswordScreen onBack={() => {}} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "me@example.com");
    await fireEvent.press(screen.getByRole("button", { name: "Send reset link" }));
    await waitFor(() => expect(screen.getByText("Check your inbox")).toBeTruthy());
  });
});
