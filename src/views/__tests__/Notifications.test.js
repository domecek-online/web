import React from "react";
import { NotificationsComponent } from "../Notifications";
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved, act } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import userEvent from '@testing-library/user-event'
import { useAuth0 } from "@auth0/auth0-react";
import { getConfig } from "../../config";
import { MemoryRouter, Route } from "react-router-dom";

jest.mock("../../config");
jest.mock("@auth0/auth0-react");


const homes_api_one = JSON.stringify({
  "id":1,
  "name":"Test",
  "username":"auth0|66533a6f3d0a9374995ce094",
  "bucket_id":"14f9621d6fa489cc",
  "bucket_token":"test",
  "bucket_auth_id":"0d1f423fe0c51000",
  "loxone_token":"FwpPnq9pVnw5ZQ",
  "grafana_org_id":"2",
  "grafana_user_id":"2"
});

const api_empty = JSON.stringify([]);

const notifications_api = JSON.stringify([
  {"id":1,
    "grafana_org_id":"2",
    "type":"email",
    "value":"foo@bar.cz",
    "message_types":["alerts","reports"]
  },
  {"id":2,
    "grafana_org_id":"2",
    "type":"sms",
    "value":"+420123456789",
    "message_types":["alerts"]
  }
])

const notifications_api_one = JSON.stringify([
  {"id":2,
    "grafana_org_id":"2",
    "type":"sms",
    "value":"+420123456789",
    "message_types":["alerts"]
  }
])

const notifications_api_ok = JSON.stringify({
  "msg": ""
});

const notifications_api_error = JSON.stringify({
  "msg": "Nastala chyba."
});

describe("The Notifications component", () => {
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

  it("loads notifications from API on load", async () => {
    fetch.once(homes_api_one).once(notifications_api);
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Konfigurace notifikací pro dům: Test"));

    expect(screen.getByText("sms")).toBeInTheDocument();
    expect(screen.getByText("+420123456789")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("foo@bar.cz")).toBeInTheDocument();
  });

  it("loads notifications from API on load - home not found", async () => {
    fetch.mockResponseOnce(api_empty, { status: 404}).once(api_empty)
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
        <Route path='/homes'>
          <div>Homes Redirect</div>
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Homes Redirect"));
  });

  it("loads notifications from API on load - no homeId", async () => {
    fetch.once(api_empty).once(api_empty)
    render(
      <MemoryRouter initialEntries={['notifications']}>
        <Route path='notifications'>
          <NotificationsComponent />
        </Route>
        <Route path='/homes'>
          <div>Homes Redirect</div>
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Homes Redirect"));
  });

  it.each([
    [["alerts", "reports"], "Vypnout zasílání Upozornění", ["reports"]],
    [["reports"], "Zapnout zasílání Upozornění", ["reports", "alerts"]],
    [["alerts", "reports"], "Vypnout zasílání Denních Hlášení", ["alerts"]],
    [["alerts"], "Zapnout zasílání Denních Hlášení", ["alerts", "reports"]]
  ])("disables/enables notifications - %p", async (message_types, button_text, expected_message_types) => {
    const api = JSON.stringify([
      {"id":1,
        "grafana_org_id":"2",
        "type":"email",
        "value":"foo@bar.cz",
        "message_types":message_types
      }
    ])
    const new_api = JSON.stringify([
      {"id":1,
        "grafana_org_id":"2",
        "type":"email",
        "value":"foo@bar.cz",
        "message_types":expected_message_types
      }
    ])
    fetch.once(homes_api_one).once(api).once(notifications_api_ok).once(new_api);
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Konfigurace notifikací pro dům: Test"));

    var button = screen.getByRole('button', { name: button_text });
    act(() => {
      fireEvent.click(button);
    });

    var wait_text = button_text.replace("Vypnout", "Zapnout");
    if (button_text.startsWith("Zapnout")) {
      wait_text = button_text.replace("Zapnout", "Vypnout");
    }

    await waitFor(() => screen.getByText(wait_text));

    expect(fetch.mock.calls[2][1]["method"]).toEqual('PATCH');
    expect(fetch.mock.calls[2][0]).toEqual('http://localhost:3001/api/1/homes/1/notifications/1');
    expect(JSON.parse(fetch.mock.calls[2][1]["body"])).toEqual({
      "message_types": expected_message_types,
    });
  });

  it("removes notification when user clicks the remove button", async () => {
    fetch.once(homes_api_one).once(notifications_api).once(notifications_api_ok).once(notifications_api_one);
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Konfigurace notifikací pro dům: Test"));

    var buttons = screen.getAllByRole('button', { name: "Odstranit" });
    act(() => {
      fireEvent.click(buttons[0]);
    });

    await waitFor(() => screen.getByText("sms"));

    expect(fetch.mock.calls[2][0]).toEqual('http://localhost:3001/api/1/homes/1/notifications/1');
    expect(fetch.mock.calls[2][1]["method"]).toEqual('DELETE');

    expect(screen.queryByText("email")).not.toBeInTheDocument();
  });

  it.each([
    ["sms"],
    ["email"]
  ])("adds new notification - %p", async (notification_type) => {
    fetch.once(homes_api_one).once(api_empty).once(notifications_api_ok).once(notifications_api_one);
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Nemáte nastavená žádná upozornění."));


    var t = screen.getByTestId("notification_type");
    await act(async () => {
      fireEvent.change(t, { target: { value: notification_type } })
    });

    var value = screen.getByTestId(notification_type);
    await act(async () => {
      await userEvent.type(value, "some value");
    });

    var button = screen.getByRole('button', { name: "Přidat nový typ upozornění" });
    act(() => {
      fireEvent.click(button);
    });

    await waitFor(() => screen.getByText("+420123456789"));

    expect(fetch.mock.calls[2][0]).toEqual('http://localhost:3001/api/1/homes/1/notifications');
    expect(fetch.mock.calls[2][1]["method"]).toEqual('POST');
    expect(JSON.parse(fetch.mock.calls[2][1]["body"])).toEqual({
      "type": notification_type,
      "value": "some value",
    });
  });

  it("email field hides if sms is selected", async () => {
    fetch.once(homes_api_one).once(api_empty)
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Nemáte nastavená žádná upozornění."));


    var t = screen.getByTestId("notification_type");
    await act(async () => {
      fireEvent.change(t, { target: { value: "sms" } })
    });

    expect(screen.queryByText("email")).not.toBeInTheDocument();
  });

  it("adds new notification - error message", async () => {
    fetch.once(homes_api_one).once(api_empty).once(notifications_api_error).once(notifications_api_one);
    render(
      <MemoryRouter initialEntries={['notifications/1']}>
        <Route path='notifications/:homeId'>
          <NotificationsComponent />
        </Route>
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText("Nemáte nastavená žádná upozornění."));


    var t = screen.getByTestId("notification_type");
    await act(async () => {
      fireEvent.change(t, { target: { value: "sms" } })
    });

    var value = screen.getByTestId("sms");
    await act(async () => {
      await userEvent.type(value, "some value");
    });

    var button = screen.getByRole('button', { name: "Přidat nový typ upozornění" });
    act(() => {
      fireEvent.click(button);
    });

    await waitFor(() => screen.getByText("Nastala chyba."));
  });

});
