import React from "react";
import { HomesComponent } from "../Homes";
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import userEvent from '@testing-library/user-event'
import { useAuth0 } from "@auth0/auth0-react";
import { getConfig } from "../../config";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../config");
jest.mock("@auth0/auth0-react");


const homes_api = JSON.stringify({
  "data": [
    {
      "id":1,
      "name":"Test",
      "username":"auth0|66533a6f3d0a9374995ce094",
      "bucket_id":"14f9621d6fa489cc",
      "bucket_token":"test",
      "bucket_auth_id":"0d1f423fe0c51000",
      "loxone_token":"FwpPnq9pVnw5ZQ",
      "grafana_org_id":"2",
      "grafana_user_id":"2"
    },
    {
      "id":2,
      "name":"Test4",
      "username":"auth0|66533a6f3d0a9374995ce094",
      "bucket_id":"f36056c3925b45a3",
      "bucket_token":"test2",
      "bucket_auth_id":"0d1f64e3acc51000",
      "loxone_token":"poKOF2L5nwciBA",
      "grafana_org_id":"6",
      "grafana_user_id":"5"
    }
  ]
});

const homes_api_one = JSON.stringify({
  "data": [
    {
      "id":1,
      "name":"Test",
      "username":"auth0|66533a6f3d0a9374995ce094",
      "bucket_id":"14f9621d6fa489cc",
      "bucket_token":"test",
      "bucket_auth_id":"0d1f423fe0c51000",
      "loxone_token":"FwpPnq9pVnw5ZQ",
      "grafana_org_id":"2",
      "grafana_user_id":"2"
    },
  ]
});

const internal_server_error = JSON.stringify(
  {
    "error": "Internal Server Error",
    "data": []
  }
);

const homes_api_empty = JSON.stringify(
  {
    "data": []
  }
);

const homes_api_delete = JSON.stringify(
  {
    "msg": "Home removed."
  }
);

const homes_api_add = JSON.stringify(
  {
    "msg": ""
  }
);

const homes_api_failure = JSON.stringify(
  {
    "msg": "There was a failure adding your home."
  }
);

describe("The Homes component", () => {
  beforeEach(() => {
    fetch.resetMocks();

    getConfig.mockReturnValue({
      domain: "test-domain.com",
      clientId: "123",
      apiOrigin: "http://localhost:3001",
      audience: "test-audience",
    });

    useAuth0.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      getAccessTokenSilently: jest.fn(() => Promise.resolve("access-token")),
      withAuthenticationRequired: jest.fn(),
      user: {sub: "auth0|66533a6f3d0a9374995ce094"}
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("loads homes from API on load", async () => {
    fetch.once(homes_api);
    render(<MemoryRouter><HomesComponent /></MemoryRouter>);

    await waitFor(() => screen.getByTestId("list-of-homes"));

    expect(
      await screen.getByRole("button", {name: "Přidat nový dům"})
    ).toBeInTheDocument();

    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Test4")).toBeInTheDocument();

    var links = screen.getAllByRole('link', { name: 'Konfigurace Loxone' });
    expect(links[0]).toHaveAttribute('href', '/loxone/1');
    expect(links[1]).toHaveAttribute('href', '/loxone/2');

    var links = screen.getAllByRole('link', { name: 'Konfigurace Notifikací' });
    expect(links[0]).toHaveAttribute('href', '/notifications/1');
    expect(links[1]).toHaveAttribute('href', '/notifications/2');

    var links = screen.getAllByRole('link', { name: 'Otevřít Grafanu' });
    expect(links[0]).toHaveAttribute('href', 'https://grafana.domecek.online/?orgId=2');
    expect(links[1]).toHaveAttribute('href', 'https://grafana.domecek.online/?orgId=6');
  });

  it("loads homes from API on load - no homes", async () => {
    fetch.once(homes_api_empty);
    render(<MemoryRouter><HomesComponent /></MemoryRouter>);

    await waitFor(() => screen.getByText("Nemáte vytvořené žádné domy."));

    expect(
      await screen.getByRole("button", {name: "Přidat nový dům"})
    ).toBeInTheDocument();
  });

  it("loads homes from API on load - Internal Server Error", async () => {
    fetch.once(internal_server_error);
    render(<MemoryRouter><HomesComponent /></MemoryRouter>);

    await waitFor(() => screen.getByText("Internal Server Error"));

    expect(
      await screen.getByRole("button", {name: "Přidat nový dům"})
    ).toBeInTheDocument();
  });

  it("removes homes after clicking on the remove button", async () => {
    fetch.once(homes_api).once(homes_api_delete).once(homes_api_one);
    render(<MemoryRouter><HomesComponent /></MemoryRouter>);

    await waitFor(() => screen.getByTestId("list-of-homes"));

    var buttons = screen.getAllByRole('button', { name: "Odstranit" });
    act(() => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => screen.getByTestId("list-of-homes"));

    expect(fetch.mock.calls[1][0]).toEqual('http://localhost:3001/api/1/homes/Test');
    expect(fetch.mock.calls[1][1]["method"]).toEqual('DELETE');

    expect(screen.queryByText("Test")).toBeInTheDocument();
    expect(screen.queryByText("Test4")).not.toBeInTheDocument();
  });

  it("adds new home", async () => {
    fetch.once(homes_api_empty).once(homes_api_add).once(homes_api_one);
    render(<MemoryRouter><HomesComponent /></MemoryRouter>);

    await waitFor(() => screen.getByText("Nemáte vytvořené žádné domy."));

    var home_name = screen.getByTestId("home-name");
    await act(async () => {
      await userEvent.type(home_name, "Test");
    });

    var user_name = screen.getByTestId('user-name');
    await act(async () => {
      await userEvent.type(user_name, "grafana_username");
    });

    var password = screen.getByTestId('password');
    await act(async () => {
      await userEvent.type(password, "pass123");
    });
  
    var button = screen.getByRole('button', { name: "Přidat nový dům" });
    act(() => {
      fireEvent.click(button);
    });

    await waitFor(() => screen.getByTestId("list-of-homes"));

    expect(fetch.mock.calls[1][0]).toEqual('http://localhost:3001/api/1/homes');
    expect(fetch.mock.calls[1][1]["method"]).toEqual('POST');
    expect(JSON.parse(fetch.mock.calls[1][1]["body"])).toEqual({
      "grafana_password": "pass123",
      "grafana_username": "grafana_username",
      "name": "Test",
    });
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("adds new home - failed and shows error", async () => {
    fetch.once(homes_api_empty).once(homes_api_failure).once(homes_api_one);
    render(<MemoryRouter><HomesComponent /></MemoryRouter>);

    await waitFor(() => screen.getByText("Nemáte vytvořené žádné domy."));

    var button = screen.getByRole('button', { name: "Přidat nový dům" });
    act(() => {
      fireEvent.click(button);
    });

    await waitFor(() => screen.getByTestId("add_home_alert"));

    expect(fetch.mock.calls[1][0]).toEqual('http://localhost:3001/api/1/homes');
    expect(fetch.mock.calls[1][1]["method"]).toEqual('POST');
    expect(screen.getByText("There was a failure adding your home.")).toBeInTheDocument();
  });
});
